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
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean; restoreStatus: number; restoreAttempts: number; stateVersion: string; restoreFailureReason: string; handoffStatus: number; }>;
  sourcePlayable: boolean;
  evictions: Array<{ instance_id: string; eviction_reason: string; payload: string }>;
  restores: Record<string, string>;
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

test.describe('Persistence Restore Proof Harness', () => {
  test('restore successfully activates target collision', async ({ page }) => {
    await waitForDemo(page);
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
    const before = await debug(page);
    const outdoor = before.instances.find(i => i.id === 'outdoor-instance');
    expect(outdoor?.restoreStatus).toBe(2); // Restored
    expect(outdoor?.restoreAttempts).toBe(1);
    const duplicate = await page.evaluate(() => {
      const transport = (window as unknown as { __retroMageWorldTransport?: { complete_restore?: (id: string, attempt: number, success: boolean, version: string) => boolean } }).__retroMageWorldTransport;
      return transport?.complete_restore?.('outdoor-instance', 1, true, '1.0');
    });
    expect(duplicate).toBe(true);
    expect((await debug(page)).instances.find(i => i.id === 'outdoor-instance')?.restoreAttempts).toBe(1);
    await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
    const after = await debug(page);
    const outdoorAfter = after.instances.find(i => i.id === 'outdoor-instance');
    expect(outdoorAfter?.collisionActive).toBe(true);
  });

  test('failed handoff retains content', async ({ page }) => {
    await waitForDemo(page, '/?failAcknowledge=1');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
    await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
    await strafe(page, 180, (snapshot) => snapshot.pose.x > 20);

    await expect.poll(async () => (await debug(page)).instances.find(i => i.id === 'dungeon-instance')?.handoffStatus, { timeout: 15_000 }).toBe(3); // Failed
    const after = await debug(page);
    const dungeon = after.instances.find(i => i.id === 'dungeon-instance');
    expect(dungeon?.state).toBe(4); // Evictable; failed handoff retains content
    expect(dungeon?.renderResident).toBe(true);
    expect(dungeon?.collisionActive).toBe(false);
  });

  test('pending handoff delays eviction but retains content', async ({ page }) => {
    await waitForDemo(page, '/?delayAcknowledge=1');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
    await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
    await strafe(page, 180, (snapshot) => snapshot.pose.x > 20);

    await expect.poll(async () => (await debug(page)).instances.find(i => i.id === 'dungeon-instance')?.handoffStatus, { timeout: 15_000 }).toBe(1); // Pending
    const pending = await debug(page);
    const pendingDungeon = pending.instances.find(i => i.id === 'dungeon-instance');
    expect(pendingDungeon?.state).toBe(4);
    expect(pendingDungeon?.renderResident).toBe(true);

    await expect.poll(async () => (await debug(page)).instances.find(i => i.id === 'dungeon-instance')?.handoffStatus, { timeout: 15_000 }).toBe(2); // Acknowledged
    const after = await debug(page);
    const dAfter = after.instances.find(i => i.id === 'dungeon-instance');
    expect(dAfter?.state).toBe(5); // Evicted
    expect(dAfter?.renderResident).toBe(false);
    expect(dAfter?.collisionActive).toBe(false);
  });

  test('restore pending keeps base render but blocks activation', async ({ page }) => {
    await waitForDemo(page, '/?delayRestore=1');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.restoreStatus, { timeout: 10_000 }).toBe(1);
    const pending = await debug(page);
    const outdoor = pending.instances.find(i => i.id === 'outdoor-instance');
    expect(outdoor?.state).toBe(2);
    expect(outdoor?.renderResident).toBe(true);
    expect(outdoor?.collisionActive).toBe(false);
    expect(pending.activeInstance).toBe('dungeon-instance');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.restoreStatus, { timeout: 10_000 }).toBe(2);
    await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
    expect((await debug(page)).instances.find(i => i.id === 'outdoor-instance')?.collisionActive).toBe(true);
  });

  test('stale restore completion is ignored and retry restores once', async ({ page }) => {
    await waitForDemo(page, '/?delayRestore=1');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.restoreStatus, { timeout: 10_000 }).toBe(1);
    const stale = await page.evaluate(() => {
      const transport = (window as unknown as { __retroMageWorldTransport?: { begin_restore?: (id: string) => number; complete_restore?: (id: string, attempt: number, success: boolean, version: string) => boolean } }).__retroMageWorldTransport;
      const replacement = transport?.begin_restore?.('outdoor-instance') ?? 0;
      const oldCompletion = transport?.complete_restore?.('outdoor-instance', 1, true, '1.0') ?? false;
      return { replacement, oldCompletion };
    });
    expect(stale.replacement).toBe(2);
    expect(stale.oldCompletion).toBe(true);
    const pending = await debug(page);
    expect(pending.instances.find(i => i.id === 'outdoor-instance')?.restoreStatus).toBe(1);
    expect(pending.instances.find(i => i.id === 'outdoor-instance')?.restoreAttempts).toBe(2);
    await page.evaluate(() => {
      const transport = (window as unknown as { __retroMageWorldTransport?: { complete_restore?: (id: string, attempt: number, success: boolean, version: string) => boolean } }).__retroMageWorldTransport;
      transport?.complete_restore?.('outdoor-instance', 2, true, '1.0');
    });
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.restoreStatus, { timeout: 10_000 }).toBe(2);
    await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
    expect((await debug(page)).instances.find(i => i.id === 'outdoor-instance')?.collisionActive).toBe(true);
  });

  test('corrupt restore remains render-available but inactive', async ({ page }) => {
    await waitForDemo(page, '/?corruptRestore=1');
    await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);

    const before = await debug(page);
    const outdoor = before.instances.find(i => i.id === 'outdoor-instance');
    expect(outdoor?.restoreStatus).toBe(3); // Failed = 3
    expect(outdoor?.renderResident).toBe(true); // render available
    expect(outdoor?.collisionActive).toBe(false); // remains inactive

    // Attempt crossing by moving into it, active instance remains dungeon
    await strafe(page, 70, (snapshot) => snapshot.debugMovement !== undefined, 2000).catch(() => {});

    const after = await debug(page);
    const outdoorAfter = after.instances.find(i => i.id === 'outdoor-instance');
    expect(outdoorAfter?.collisionActive).toBe(false); // still remains inactive
    expect(after.activeInstance).toBe('dungeon-instance'); // did not cross
  });
});
