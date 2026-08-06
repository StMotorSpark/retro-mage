import { test, expect, type Page } from '@playwright/test';

const webglArgs = ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'];
test.use({ launchOptions: { args: webglArgs } });

type Debug = {
  ready: boolean; wasmReady: boolean; assetsReady: boolean; renderFrame: number;
  pose: { x: number; y: number; z: number }; activeInstance: string; grounded: boolean;
  instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean }>;
  debugMovement: { pitch: number };
  renderProof: {
    materialIds: number[]; assetKeys: string[]; materialDiagnostics: number; translucentTileCount: number;
    waterMaterialPresent: boolean; cobblestoneMaterialPresent: boolean; castleMaterialPresent: boolean;
    streamBarrierCollisionTiles: number; cobblestonePathPassable: boolean; castleExteriorGeometry: number;
    castleInteriorGeometry: number; castleColumnGeometry: number; castleBalconyGeometry: number;
    castleLowerVisible: boolean;
  };
};

const errors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const pageErrors: string[] = [];
  errors.set(page, pageErrors);
  page.on('pageerror', error => pageErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console.error: ${message.text()}`); });
});

test.afterEach(async ({ page }, testInfo) => {
  const pageErrors = errors.get(page) ?? [];
  if (pageErrors.length) await testInfo.attach('page-diagnostics', { body: pageErrors.join('\n'), contentType: 'text/plain' });
  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});

async function debug(page: Page): Promise<Debug> {
  const state = await page.evaluate(() => (window as unknown as { __retroMageDebug?: Debug }).__retroMageDebug);
  if (!state) throw new Error('Demo debug state missing');
  return state;
}

async function move(page: Page, dx: number, dy: number, reached: (state: Debug) => boolean, timeout = 15_000): Promise<void> {
  await page.evaluate(({ dx, dy }) => {
    const target = document.querySelector('.retro-input-move-zone');
    if (!target) throw new Error('Move zone missing');
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const start = new Touch({ identifier: 113, target, clientX: x, clientY: y });
    const moved = new Touch({ identifier: 113, target, clientX: x + dx, clientY: y + dy });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [start], targetTouches: [start], changedTouches: [start], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
    (window as unknown as { __fullRouteTouch?: Touch }).__fullRouteTouch = moved;
  }, { dx, dy });
  let last: Debug | undefined;
  try {
    await expect.poll(async () => {
      last = await debug(page);
      return reached(last);
    }, { timeout, intervals: [20] }).toBe(true);
  } catch (error) {
    throw new Error(`Move predicate failed at ${JSON.stringify(last?.pose)}: ${String(error)}`);
  }
  await page.evaluate(() => {
    const target = document.querySelector('.retro-input-move-zone');
    const touch = (window as unknown as { __fullRouteTouch?: Touch }).__fullRouteTouch;
    if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  });
}

async function lookDown(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = document.querySelector('.retro-input-look-zone');
    if (!target) throw new Error('Look zone missing');
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const start = new Touch({ identifier: 114, target, clientX: x, clientY: y });
    const moved = new Touch({ identifier: 114, target, clientX: x, clientY: y + 80 });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [start], targetTouches: [start], changedTouches: [start], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [moved], bubbles: true }));
  });
}

test('production touch completes dungeon-to-throne route with collision and vertical proofs', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  await expect.poll(
    () => page.evaluate(() => (window as unknown as { __retroMageDebug?: Debug }).__retroMageDebug),
    { timeout: 15_000 },
  ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
  await expect.poll(async () => (await debug(page)).instances.find(instance => instance.id === 'outdoor-instance')?.state).toBe(2);

  const start = await debug(page);
  expect(start.activeInstance).toBe('dungeon-instance');
  expect(start.renderProof.materialDiagnostics).toBe(0);
  expect(start.renderProof.assetKeys).toEqual([
    'demo.castle.exterior', 'demo.castle.interior', 'demo.dungeon.ceiling', 'demo.dungeon.floor', 'demo.dungeon.wall',
    'demo.outdoor.cobblestone', 'demo.outdoor.grass', 'demo.outdoor.mountain', 'demo.outdoor.road', 'demo.outdoor.water',
    'demo.sky.background', 'demo.sky.cloud', 'demo.sprite.dungeon_deco', 'demo.sprite.statue', 'demo.sprite.torch', 'demo.sprite.tree',
  ]);

  // Dungeon doorway → forest. First trunk blocks straight corridor travel.
  await move(page, 70, 0, state => state.activeInstance === 'outdoor-instance' && state.pose.x >= 16);
  const trunk = await debug(page);
  expect(trunk.pose.x).toBeLessThan(17.5);
  expect(trunk.instances.find(instance => instance.id === 'outdoor-instance')?.collisionActive).toBe(true);

  // Forest detour → clearing/road. Stream bank blocks entry before cobblestone route.
  await move(page, 0, 70, state => state.pose.z >= 10 && state.pose.z < 10.5);
  await move(page, 5, 0, state => state.pose.x >= 18.6 && state.pose.x < 19);
  const bank = await debug(page);
  await move(page, 0, 70, state => state.pose.z >= 10.5 && state.pose.z < 11.5);
  const blocked = await debug(page);
  expect(blocked.pose.z - bank.pose.z).toBeLessThan(1.25);
  expect(blocked.renderProof.streamBarrierCollisionTiles).toBe(2);
  await move(page, 0, -70, state => state.pose.z < 10);
  await move(page, 5, 0, state => state.pose.x >= 21.7 && state.pose.x < 22.5);
  await move(page, 0, 70, state => state.pose.z > 12);
  const crossing = await debug(page);
  expect(crossing.grounded).toBe(true);
  expect(crossing.renderProof.streamBarrierCollisionTiles).toBe(2);
  expect(crossing.renderProof.cobblestonePathPassable).toBe(true);
  expect(crossing.renderProof.waterMaterialPresent).toBe(true);
  expect(crossing.renderProof.cobblestoneMaterialPresent).toBe(true);

  // Castle exterior/open entry → ground hall → grand stair/balcony.
  await move(page, 0, 70, state => state.pose.z >= 20);
  const entry = await debug(page);
  expect(entry.renderProof.castleExteriorGeometry).toBeGreaterThan(0);
  expect(entry.renderProof.castleMaterialPresent).toBe(true);
  expect(entry.renderProof.castleInteriorGeometry).toBeGreaterThan(0);
  expect(entry.renderProof.castleColumnGeometry).toBe(4);
  await move(page, 0, 70, state => state.pose.z >= 24 && state.pose.y >= 0.9);
  const balcony = await debug(page);
  expect(balcony.grounded).toBe(true);
  expect(balcony.renderProof.castleBalconyGeometry).toBeGreaterThan(0);

  // Balcony guard blocks lateral travel; look zone proves lower entry-hall visibility.
  const guardFrame = balcony.renderFrame;
  await move(page, 70, 0, state => state.renderFrame > guardFrame + 30);
  const guard = await debug(page);
  expect(guard.pose.x).toBeLessThan(25.5);
  await move(page, -70, 0, state => state.pose.x < 22.5);
  const pitch = (await debug(page)).debugMovement.pitch;
  await lookDown(page);
  await expect.poll(async () => (await debug(page)).debugMovement.pitch).toBeGreaterThan(pitch);
  await expect.poll(async () => (await debug(page)).renderProof.castleLowerVisible).toBe(true);

  // Second authored support ramp reaches upper throne-room approach without debug bypass.
  await move(page, 0, 70, state => state.pose.z >= 28 && state.pose.y >= 1.6);
  const throne = await debug(page);
  expect(throne.grounded).toBe(true);
  expect(throne.renderProof.materialDiagnostics).toBe(0);
  expect(throne.renderProof.translucentTileCount).toBe(0);
  expect(throne.renderFrame).toBeGreaterThan(start.renderFrame);
});
