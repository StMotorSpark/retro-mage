import { test, expect } from '@playwright/test';

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

async function waitForDemo(page: import('@playwright/test').Page, path = '/') {
  await page.goto(path);
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug), { timeout: 15_000 })
    .toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
}

async function debug(page: import('@playwright/test').Page): Promise<DebugSnapshot> {
  return page.evaluate(() => (window as unknown as { __retroMageDebug: DebugSnapshot }).__retroMageDebug);
}

async function strafe(page: import('@playwright/test').Page, dx: number, crossed: (pose: DebugSnapshot['pose']) => boolean) {
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
  await expect.poll(async () => crossed((await debug(page)).pose), { timeout: 10_000 }).toBe(true);
  await page.evaluate(() => {
    const target = document.querySelector('.retro-input-move-zone');
    const touch = (window as unknown as { __testTouch?: Touch }).__testTouch;
    if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  });
}

test('target is visible before crossing and forward/reverse traversal stays continuous', async ({ page }) => {
  await waitForDemo(page);
  const before = await debug(page);
  expect(before.targetVisible).toBe(true);
  expect(before.instances.find((instance) => instance.id === 'outdoor-instance')?.renderResident).toBe(true);

  const startX = before.pose.x;
  await strafe(page, 70, (pose) => pose.x >= 10);
  const forward = await debug(page);
  expect(forward.activeInstance).toBe('outdoor-instance');
  expect(forward.pose.x).toBeGreaterThan(startX + 1);
  expect(forward.renderFrame).toBeGreaterThan(before.renderFrame);

  await strafe(page, -70, (pose) => pose.x < 10);
  const reverse = await debug(page);
  expect(reverse.activeInstance).toBe('dungeon-instance');
  expect(reverse.pose.x).toBeLessThan(forward.pose.x - 1);
  expect(reverse.sourcePlayable).toBe(true);
});

test('source remains playable when target preload fails', async ({ page }) => {
  await waitForDemo(page, '/?failOutdoor=1');
  const failed = await debug(page);
  expect(failed.targetVisible).toBe(false);
  expect(failed.sourcePlayable).toBe(true);
  expect(failed.instances.find((instance) => instance.id === 'dungeon-instance')?.collisionActive).toBe(true);
  expect(failed.renderFrame).toBeGreaterThan(0);

  await strafe(page, 70, (pose) => pose.x > 1);
  const afterAttempt = await debug(page);
  expect(afterAttempt.sourcePlayable).toBe(true);
  expect(afterAttempt.activeInstance).toBe('dungeon-instance');
  expect(afterAttempt.renderFrame).toBeGreaterThan(failed.renderFrame);
});
