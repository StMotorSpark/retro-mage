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

async function strafe(page: Page, dx: number, reached: (snapshot: DebugSnapshot) => boolean) {
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
  await expect.poll(async () => reached(await debug(page)), { timeout: 10_000 }).toBe(true);
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

  await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  const reverse = await debug(page);
  expect(reverse.activeInstance).toBe('dungeon-instance');
  expect(reverse.pose.x).toBeGreaterThan(forward.pose.x + 1);
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
