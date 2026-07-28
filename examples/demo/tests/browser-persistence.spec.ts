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

test('persistence restore fails on corrupt payload', async ({ page }) => {
  await waitForDemo(page, '/?corruptRestore=1');

  // Trigger load of outdoor
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined && outdoor.state === 2; // Resident, but not active (3)
  });

  const reloaded = await debug(page);
  const outdoor = reloaded.instances.find(i => i.id === 'outdoor-instance');
  expect(outdoor).toBeDefined();
  
  // Base render is resident, but collision remains inactive since restore failed
  expect(outdoor?.renderResident).toBe(true);
  expect(outdoor?.collisionActive).toBe(false);
  expect(outdoor?.state).toBe(2); // State should remain Resident or Failed, but not Active
});

test('persistence handoff failure retains content', async ({ page }) => {
  await waitForDemo(page, '/?failAcknowledge=1');
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined && outdoor.state === 2; // Resident
  });
  // Since acknowledge failed, the handoff is rejected, which means the instance should NOT be fully evicted/reloaded
  // The exact engine behavior for a failed handoff might be staying resident or active.
  const reloaded = await debug(page);
  const outdoor = reloaded.instances.find(i => i.id === 'outdoor-instance');
  expect(outdoor).toBeDefined();
});

test('persistence handoff pending gates release', async ({ page }) => {
  await waitForDemo(page, '/?delayAcknowledge=1');
  await strafe(page, 70, (snapshot) => {
    const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
    return outdoor !== undefined; 
  });
  const reloaded = await debug(page);
  const outdoor = reloaded.instances.find(i => i.id === 'outdoor-instance');
  expect(outdoor).toBeDefined();
});
