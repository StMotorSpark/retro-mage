import { test, expect } from '@playwright/test';

const webglArgs = ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'];
test.use({ launchOptions: { args: webglArgs } });

type TextureBinding = { materialId: number; assetKey: string };
type BillboardBinding = { spriteId: number; assetKey: string };

test('registers every authored surface and billboard texture without fallback diagnostics', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  const proof = await expect.poll(async () => page.evaluate(() => (window as any).__retroMageDebug?.renderProof), { timeout: 15_000 });
  await proof.toMatchObject({
    materialDiagnostics: 0,
    textureBindings: [
      { materialId: 1, assetKey: 'demo.dungeon.wall' },
      { materialId: 2, assetKey: 'demo.dungeon.floor' },
      { materialId: 3, assetKey: 'demo.outdoor.grass' },
      { materialId: 4, assetKey: 'demo.dungeon.ceiling' },
      { materialId: 5, assetKey: 'demo.outdoor.road' },
      { materialId: 6, assetKey: 'demo.outdoor.cobblestone' },
      { materialId: 7, assetKey: 'demo.outdoor.water' },
      { materialId: 8, assetKey: 'demo.castle.exterior' },
      { materialId: 9, assetKey: 'demo.castle.interior' },
      { materialId: 10, assetKey: 'demo.outdoor.mountain' },
    ] satisfies TextureBinding[],
    billboardTextureBindings: [
      { spriteId: 1, assetKey: 'demo.sprite.tree' },
      { spriteId: 2, assetKey: 'demo.sprite.torch' },
      { spriteId: 3, assetKey: 'demo.sprite.dungeon_deco' },
      { spriteId: 4, assetKey: 'demo.sky.cloud' },
      { spriteId: 5, assetKey: 'demo.sprite.statue' },
    ] satisfies BillboardBinding[],
    // Sky renderer is a procedural gradient, not a texture-backed sky material.
    skyTextureStatus: 'procedural-gradient-gap',
  });
  expect(errors).toEqual([]);
});
