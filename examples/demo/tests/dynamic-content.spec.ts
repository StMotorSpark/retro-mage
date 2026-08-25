import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] } });

type Snapshot = {
  ready: boolean;
  tileId: number;
  tileSolid: number;
  pose: { x: number; y: number; z: number };
  diagnostics: string;
};

test('public WorldTransport dynamic-content command atomically changes browser scene and passage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });

  await page.goto('/?dynamicContentProof=1');
  await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  await expect.poll(async () => page.evaluate(() => window.__retroMageDynamicContentProof?.snapshot()), { timeout: 15_000 })
    .toMatchObject({ ready: true, tileId: 41, tileSolid: 1 });

  const closed = await page.evaluate(() => window.__retroMageDynamicContentProof!.snapshot());
  expect(closed.pose.x).toBeLessThan(-0.5); // normal world-aware movement is blocked by the closed tile

  const accepted = await page.evaluate(() => window.__retroMageDynamicContentProof!.open());
  expect(accepted).toBe(1); // stable accepted result code
  const open = await page.evaluate(() => window.__retroMageDynamicContentProof!.snapshot());
  expect(open).toMatchObject({ tileId: 42, tileSolid: 0 });
  expect(open.pose.x).toBeGreaterThan(0.5); // same input route succeeds after the following tick_engine frame

  const rejected = await page.evaluate(() => window.__retroMageDynamicContentProof!.rejectUnknownVariant());
  expect(rejected.code).toBe(6); // unknown-variant-id
  const diagnostics = JSON.parse(rejected.diagnostics) as Array<{ code: number; reason: string; instance_id: string; content_id: string; variant_id: string }>;
  expect(diagnostics.at(-1)).toMatchObject({ code: 6, reason: 'unknown-variant-id', instance_id: 'door-instance', content_id: 'gate', variant_id: 'missing' });
  expect(errors, errors.join('\n')).toEqual([]);
});
