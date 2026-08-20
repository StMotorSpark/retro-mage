import { test, expect, type Page } from '@playwright/test';

const webglArgs = ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'];
test.use({ launchOptions: { args: webglArgs } });

type Debug = {
  ready: boolean; wasmReady: boolean; assetsReady: boolean; renderFrame: number;
  pose: { x: number; y: number; z: number }; activeInstance: string; grounded: boolean;
  instances: Array<{ id: string; collisionActive: boolean }>;
  renderProof: {
    materialIds: number[]; assetKeys: string[]; materialDiagnostics: number;
    mountainMaterial: { id: string; assetKey: string; materialId: number };
    mountainGeometry: number; mountainCollisionTiles: number; mountainVisible: boolean;
    cobblestonePathPassable: boolean; cobblestoneMaterialPresent: boolean;
    roadGeometry: number; castleExteriorGeometry: number; castleMaterialPresent: boolean;
    castleSightlineVisible: boolean;
  };
};

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') messages.push(`console.error: ${message.text()}`); });
});
test.afterEach(async ({ page }, testInfo) => {
  const messages = errors.get(page) ?? [];
  if (messages.length) await testInfo.attach('page-diagnostics', { body: messages.join('\n'), contentType: 'text/plain' });
  expect(messages, messages.join('\n')).toEqual([]);
});

async function debug(page: Page): Promise<Debug> {
  const state = await page.evaluate(() => (window as unknown as { __retroMageDebug?: Debug }).__retroMageDebug);
  if (!state) throw new Error('Demo debug state missing');
  return state;
}

async function move(page: Page, dx: number, dy: number, reached: (state: Debug) => boolean): Promise<void> {
  await page.evaluate(({ dx, dy }) => {
    const target = document.querySelector('.retro-input-move-zone');
    if (!target) throw new Error('Move zone missing');
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const start = new Touch({ identifier: 118, target, clientX: x, clientY: y });
    const moved = new Touch({ identifier: 118, target, clientX: x + dx, clientY: y + dy });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [start], targetTouches: [start], changedTouches: [start], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
    (window as unknown as { __mountainTouch?: Touch }).__mountainTouch = moved;
  }, { dx, dy });
  let last: Debug | undefined;
  try {
    await expect.poll(async () => {
      last = await debug(page);
      return reached(last);
    }, { timeout: 15_000, intervals: [20] }).toBe(true);
  } catch (error) {
    throw new Error(`Move predicate failed at ${JSON.stringify(last?.pose)}: ${String(error)}`);
  } finally {
    await page.evaluate(() => {
      const target = document.querySelector('.retro-input-move-zone');
      const touch = (window as unknown as { __mountainTouch?: Touch }).__mountainTouch;
      if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
      delete (window as unknown as { __mountainTouch?: Touch }).__mountainTouch;
    });
  }
}

async function lookTowardCastle(page: Page): Promise<void> {
  for (let i = 0; i < 24; i++) {
    if ((await debug(page)).renderProof.castleSightlineVisible) return;
    const frame = (await debug(page)).renderFrame;
    await page.evaluate(() => {
      const target = document.querySelector('.retro-input-look-zone');
      if (!target) throw new Error('Look zone missing');
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const start = new Touch({ identifier: 119, target, clientX: x, clientY: y });
      const moved = new Touch({ identifier: 119, target, clientX: x + 80, clientY: y });
      target.dispatchEvent(new TouchEvent('touchstart', { touches: [start], targetTouches: [start], changedTouches: [start], bubbles: true }));
      target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
      target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [moved], bubbles: true }));
    });
    await expect.poll(async () => (await debug(page)).renderFrame).toBeGreaterThan(frame);
  }
}

test('production touch proves supplied mountain boundary and outdoor route', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  await expect.poll(
    () => page.evaluate(() => (window as unknown as { __retroMageDebug?: Debug }).__retroMageDebug),
    { timeout: 15_000 },
  ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
  await expect.poll(async () => (await debug(page)).instances.some(instance => instance.id === 'outdoor-instance')).toBe(true);

  const start = await debug(page);
  await move(page, 70, 0, state => state.activeInstance === 'outdoor-instance' && state.pose.x >= 16);
  const outdoor = await debug(page);
  expect(outdoor.pose.x).toBeGreaterThan(start.pose.x);
  expect(outdoor.instances.find(instance => instance.id === 'outdoor-instance')?.collisionActive).toBe(true);
  expect(outdoor.renderProof.mountainMaterial).toEqual({ id: 'mat_mountain_rock', assetKey: 'demo.outdoor.mountain', materialId: 10 });
  expect(outdoor.renderProof.assetKeys).toContain('demo.outdoor.mountain');
  expect(outdoor.renderProof.materialIds).toContain(10);
  expect(outdoor.renderProof.mountainGeometry).toBeGreaterThan(0);
  expect(outdoor.renderProof.mountainCollisionTiles).toBeGreaterThan(0);
  expect(outdoor.renderProof.mountainVisible).toBe(true);
  expect(outdoor.renderProof.materialDiagnostics).toBe(0);

  // South mountain boundary is global z=-5. Production touch reaches it but cannot cross.
  await move(page, 0, -70, state => state.pose.z <= -4.1 && state.pose.z > -4.5);
  const boundary = await debug(page);
  await move(page, 0, -70, state => state.renderFrame > boundary.renderFrame + 20);
  const blocked = await debug(page);
  expect(boundary.pose.z - blocked.pose.z).toBeLessThan(0.2);
  expect(blocked.pose.z).toBeGreaterThan(-4.5);
  expect(blocked.grounded).toBe(true);

  // Return to authored road/cobblestone gap and enter castle without coordinate bypass.
  await move(page, 0, 20, state => state.pose.z >= 10 && state.pose.z < 10.5);
  await move(page, 5, 0, state => state.pose.x >= 18.6 && state.pose.x < 19);
  await move(page, 0, -70, state => state.pose.z < 10);
  await move(page, 5, 0, state => state.pose.x >= 21.7 && state.pose.x < 22.4);
  await move(page, 0, 70, state => state.pose.z > 11.8);
  const crossing = await debug(page);
  expect(crossing.renderProof.roadGeometry).toBeGreaterThan(0);
  expect(crossing.renderProof.cobblestonePathPassable).toBe(true);
  expect(crossing.renderProof.cobblestoneMaterialPresent).toBe(true);
  await move(page, 0, 70, state => state.pose.z >= 20);
  const castle = await debug(page);
  expect(castle.renderProof.castleExteriorGeometry).toBeGreaterThan(0);
  expect(castle.renderProof.castleMaterialPresent).toBe(true);
  await lookTowardCastle(page);
  await expect.poll(async () => (await debug(page)).renderProof.castleSightlineVisible).toBe(true);
  expect((await debug(page)).renderProof.materialDiagnostics).toBe(0);
});
