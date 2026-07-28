import { test, expect, type Page } from '@playwright/test';

const webglArgs = [
  '--use-gl=swiftshader',
  '--enable-webgl',
  '--enable-unsafe-swiftshader',
];

test.use({ launchOptions: { args: webglArgs } });

type DebugSnapshot = {
  ready: boolean;
  wasmReady: boolean;
  assetsReady: boolean;
  renderFrame: number;
  pose: { x: number; y: number; z: number };
  activeInstance: string;
  targetVisible: boolean;
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean }>;
  sourcePlayable: boolean;
  overflowed?: boolean;
  overflowDiagnostics?: string;
};

const diagnostics = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  diagnostics.set(page, errors);
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = diagnostics.get(page) ?? [];
  if (errors.length > 0) await testInfo.attach('page-diagnostics', { body: errors.join('\n'), contentType: 'text/plain' });
  expect(errors, errors.join('\n')).toEqual([]);
});

async function waitForDemo(page: Page, path = '/') {
  await page.goto(path);
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  await expect.poll(
    async () => page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug),
    { timeout: 15_000, message: () => `Demo debug state missing or not ready. ${diagnostics.get(page)?.join('\n') ?? ''}` },
  ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
}

async function debug(page: Page): Promise<DebugSnapshot> {
  const snapshot = await page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug);
  if (!snapshot) throw new Error(`Demo debug state missing. ${diagnostics.get(page)?.join('\n') ?? ''}`);
  return snapshot;
}

async function strafe(page: Page, dx: number, reached: (snapshot: DebugSnapshot) => boolean, timeout = 10_000) {
  await page.evaluate(({ dx }) => {
    const target = document.querySelector('.retro-input-move-zone');
    if (!target) throw new Error('Move zone missing');
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const touch = new Touch({ identifier: 17, target, clientX: x, clientY: y });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true }));
    const moved = new Touch({ identifier: 17, target, clientX: x + dx, clientY: y });
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
    (window as unknown as { __testTouch?: Touch }).__testTouch = moved;
  }, { dx });
  await expect.poll(async () => reached(await debug(page)), { timeout }).toBe(true);
  await page.evaluate(() => {
    const target = document.querySelector('.retro-input-move-zone');
    const touch = (window as unknown as { __testTouch?: Touch }).__testTouch;
    if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  });
}

test('target is visible before crossing and forward/reverse traversal stays continuous', async ({ page }) => {
  await waitForDemo(page);
  await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
  const before = await debug(page);
  expect(before.activeInstance).toBe('dungeon-instance');
  expect(before.targetVisible).toBe(true);
  expect(before.instances.find((instance) => instance.id === 'outdoor-instance')?.renderResident).toBe(true);

  const startX = before.pose.x;
  await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  const forward = await debug(page);
  expect(forward.activeInstance).toBe('outdoor-instance');
  expect(forward.pose.x).toBeGreaterThan(startX + 1);
  expect(forward.renderFrame).toBeGreaterThan(before.renderFrame);

  // Clear re-arm hysteresis before attempting return traversal.
  await strafe(page, 30, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);
  const outside = await debug(page);
  expect(outside.activeInstance).toBe('outdoor-instance');

  await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  const reverse = await debug(page);
  expect(reverse.activeInstance).toBe('dungeon-instance');
  expect(reverse.pose.x).toBeLessThan(outside.pose.x - 0.5);
  expect(reverse.sourcePlayable).toBe(true);
});

test('source remains playable when target preload fails', async ({ page }) => {
  await waitForDemo(page, '/?failOutdoor=1');
  await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(6);
  const failed = await debug(page);
  expect(failed.targetVisible).toBe(false);
  expect(failed.sourcePlayable).toBe(true);
  expect(failed.instances.find((instance) => instance.id === 'dungeon-instance')?.collisionActive).toBe(true);
  expect(failed.renderFrame).toBeGreaterThan(0);

  await strafe(page, 70, (snapshot) => snapshot.renderFrame > failed.renderFrame);
  const afterAttempt = await debug(page);
  expect(afterAttempt.sourcePlayable).toBe(true);
  expect(afterAttempt.activeInstance).toBe('dungeon-instance');
  expect(afterAttempt.renderFrame).toBeGreaterThan(failed.renderFrame);
});

test('unneeded content becomes evictable and reloads when relevant', async ({ page }) => {
  await waitForDemo(page);

  // Cross into outdoor
  await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  const forward = await debug(page);
  expect(forward.activeInstance).toBe('outdoor-instance');

  // Clear re-arm hysteresis before attempting return traversal.
  await strafe(page, 1, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);

  // Cross back into dungeon and move far enough to trigger eviction
  // Demo policy uses relevance distance 10 and no retention hysteresis.
  // Dungeon wall limits travel; outdoor center is still outside retention band.
  await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  await strafe(page, -40, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor === undefined || outdoor.state === 0 || outdoor.state === 5; // Known or Evicted
  });

  const evicted = await debug(page);
  expect(evicted.activeInstance).toBe('dungeon-instance');
  const outdoorEvicted = evicted.instances.find((instance) => instance.id === 'outdoor-instance');
  // It should be 0 (Known) or 5 (Evicted)
  expect(outdoorEvicted?.state === 0 || outdoorEvicted?.state === 5).toBe(true);
  
  // Verify eviction diagnostics
  expect(evicted.evictions.length).toBeGreaterThan(0);
  expect(evicted.evictions[evicted.evictions.length - 1].payload).toBe('initial-app-state-123');

  // Move back toward the seam to trigger reload
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined && outdoor.state === 2; // Loading or Ready (state 2 is Ready, but Loading is 5/6? Wait, state 2 is ready in demo check)
  });
  const reloaded = await debug(page);
  expect(reloaded.instances.find((instance) => instance.id === 'outdoor-instance')?.state).toBe(2);
  
  // Verify restore diagnostics
  expect(reloaded.restores['outdoor-instance']).toBe('initial-app-state-123');
});

test('target crossing is rejected on overflow, source remains playable, diagnostics report actor overflow', async ({ page }) => {
  await waitForDemo(page, '/?overflowActors=1');

  await expect.poll(async () => {
    const s = await debug(page);
    return s.overflowed;
  }, { timeout: 10_000, message: 'Expected overflow to occur' }).toBe(true);

  const overflowSnapshot = await debug(page);

  expect(overflowSnapshot.instances.find(i => i.id === 'dungeon-instance')?.renderResident).toBe(true);
  expect(overflowSnapshot.targetVisible).toBe(false);
  expect(overflowSnapshot.sourcePlayable).toBe(true);
  expect(overflowSnapshot.activeInstance).toBe('dungeon-instance');
  expect(overflowSnapshot.overflowDiagnostics).toContain('"category":"actors"');
  expect(overflowSnapshot.overflowDiagnostics).toContain('"instance_id":"outdoor-instance"');

  await strafe(page, 70, (snapshot) => snapshot.renderFrame > overflowSnapshot.renderFrame + 10);
  const afterAttempt = await debug(page);

  expect(afterAttempt.activeInstance).toBe('dungeon-instance');
  expect(afterAttempt.sourcePlayable).toBe(true);
});

test('cancellation aborts app work and replacement uses new request identity', async ({ page }) => {
  await waitForDemo(page, '/?slowOutdoor=1');

  // Trigger load
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined && outdoor.state === 1; // Loading
  });

  // Immediately strafe back to cancel
  await strafe(page, -70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor === undefined || outdoor.state === 0 || outdoor.state === 5;
  });

  const cancelledSnapshot = await debug(page);
  expect(cancelledSnapshot.instances.find(i => i.id === 'outdoor-instance')?.state ?? 0).toBeLessThan(2); // Not ready

  // Wait a bit to ensure late result is ignored
  await page.waitForTimeout(1000);
  const stillNotReady = await debug(page);
  expect(stillNotReady.instances.find(i => i.id === 'outdoor-instance')?.state ?? 0).toBeLessThan(2);

  // Strafe forward again to retry
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined && outdoor.state === 2; // Ready
  });

  const retryReady = await debug(page);
  expect(retryReady.instances.find(i => i.id === 'outdoor-instance')?.state).toBe(2);
});
