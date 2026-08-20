import { test, expect, type Page } from '@playwright/test';

const webglArgs = ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'];
test.use({ launchOptions: { args: webglArgs } });

type AlphaInspection = { path: string; width: number; height: number; belowDiscard: number; opaque: number; transparentPixel: [number, number]; opaquePixel: [number, number] };

async function inspectSourceAlpha(page: Page): Promise<AlphaInspection[]> {
  return page.evaluate(async () => {
    const assets = [
      '/assets/sprite/tree.1.png', '/assets/sprite/torch.1.png', '/assets/sprite/dungeon.deco.png',
      '/assets/sprite/statue.1.png', '/assets/sky/textures/cloud.1.png',
    ];
    return Promise.all(assets.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Asset fetch failed: ${path}`);
      const bitmap = await createImageBitmap(new Blob([await response.arrayBuffer()], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error(`2D context unavailable: ${path}`);
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let belowDiscard = 0;
      let opaque = 0;
      let transparentPixel: [number, number] | undefined;
      let opaquePixel: [number, number] | undefined;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3] ?? 0;
        if (alpha < 26) { belowDiscard++; transparentPixel ??= [x, y]; }
        if (alpha === 255) { opaque++; opaquePixel ??= [x, y]; }
      }
      bitmap.close();
      if (!transparentPixel || !opaquePixel) throw new Error(`Cutout alpha missing from ${path}`);
      return { path, width: canvas.width, height: canvas.height, belowDiscard, opaque, transparentPixel, opaquePixel };
    }));
  });
}

function sourcePixelToCanvasPixel([x, y]: [number, number], source: AlphaInspection): [number, number] {
  // Production billboard spans x=84..172, y=39..217 on its deterministic 256px proof canvas.
  return [Math.round(84 + (x + 0.5) * 88 / source.width), Math.round(39 + (y + 0.5) * 178 / source.height)];
}

async function proofPixel(page: Page, x: number, y: number): Promise<[number, number, number, number]> {
  return page.evaluate(([x, y]) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#sprite-alpha-proof');
    const gl = canvas?.getContext('webgl2');
    if (!canvas || !gl) throw new Error('Sprite alpha proof canvas missing.');
    const pixel = new Uint8Array(4);
    gl.readPixels(x, canvas.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return [...pixel] as [number, number, number, number];
  }, [x, y]);
}

for (const kind of ['tree', 'torch'] as const) {
  test(`${kind} source alpha survives browser decode, GPU upload, textured billboard, and cutout pixels`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`/?spriteAlphaProof=${kind}`);
    await page.waitForSelector('#sprite-alpha-proof');
    const source = await inspectSourceAlpha(page);
    for (const asset of source) {
      expect(asset.belowDiscard, `${asset.path} must contain alpha < 0.1 source pixels`).toBeGreaterThan(0);
      expect(asset.opaque, `${asset.path} must contain visible source pixels`).toBeGreaterThan(0);
    }
    const target = source.find(asset => asset.path.endsWith(`/${kind}.1.png`));
    expect(target).toBeDefined();
    const screenshot = await page.locator('#sprite-alpha-proof').screenshot();
    expect(screenshot.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const transparent = await proofPixel(page, ...sourcePixelToCanvasPixel(target!.transparentPixel, target!));
    const opaque = await proofPixel(page, ...sourcePixelToCanvasPixel(target!.opaquePixel, target!));
    // Transparent source texel must discard to proof clear color. Opaque rectangle/fallback paints it instead.
    expect(transparent).toEqual([5, 8, 18, 255]);
    expect(opaque).not.toEqual([5, 8, 18, 255]);
    expect(errors).toEqual([]);
  });
}
