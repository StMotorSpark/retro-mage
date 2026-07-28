# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/browser-persistence.spec.ts >> persistence restore fails on corrupt payload
- Location: tests/browser-persistence.spec.ts:78:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/?corruptRestore=1", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | const webglArgs = [
  4  |   '--use-gl=swiftshader',
  5  |   '--enable-webgl',
  6  |   '--enable-unsafe-swiftshader',
  7  | ];
  8  | 
  9  | test.use({ launchOptions: { args: webglArgs } });
  10 | 
  11 | type DebugSnapshot = {
  12 |   ready: boolean;
  13 |   wasmReady: boolean;
  14 |   assetsReady: boolean;
  15 |   renderFrame: number;
  16 |   pose: { x: number; y: number; z: number };
  17 |   activeInstance: string;
  18 |   targetVisible: boolean;
  19 |   instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean }>;
  20 |   sourcePlayable: boolean;
  21 |   evictions: Array<{ instance_id: string; eviction_reason: string; payload: string }>;
  22 |   restores: Record<string, string>;
  23 | };
  24 | 
  25 | const diagnostics = new WeakMap<Page, string[]>();
  26 | 
  27 | test.beforeEach(({ page }) => {
  28 |   const errors: string[] = [];
  29 |   diagnostics.set(page, errors);
  30 |   page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  31 |   page.on('console', (message) => {
  32 |     if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  33 |   });
  34 | });
  35 | 
  36 | test.afterEach(async ({ page }, testInfo) => {
  37 |   const errors = diagnostics.get(page) ?? [];
  38 |   if (errors.length > 0) await testInfo.attach('page-diagnostics', { body: errors.join('\n'), contentType: 'text/plain' });
  39 |   expect(errors, errors.join('\n')).toEqual([]);
  40 | });
  41 | 
  42 | async function waitForDemo(page: Page, path = '/') {
> 43 |   await page.goto(path);
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  44 |   await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  45 |   await expect.poll(
  46 |     async () => page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug),
  47 |     { timeout: 15_000, message: () => `Demo debug state missing or not ready. ${diagnostics.get(page)?.join('\n') ?? ''}` },
  48 |   ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
  49 | }
  50 | 
  51 | async function debug(page: Page): Promise<DebugSnapshot> {
  52 |   const snapshot = await page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug);
  53 |   if (!snapshot) throw new Error(`Demo debug state missing. ${diagnostics.get(page)?.join('\n') ?? ''}`);
  54 |   return snapshot;
  55 | }
  56 | 
  57 | async function strafe(page: Page, dx: number, reached: (snapshot: DebugSnapshot) => boolean, timeout = 10_000) {
  58 |   await page.evaluate(({ dx }) => {
  59 |     const target = document.querySelector('.retro-input-move-zone');
  60 |     if (!target) throw new Error('Move zone missing');
  61 |     const rect = target.getBoundingClientRect();
  62 |     const x = rect.left + rect.width / 2;
  63 |     const y = rect.top + rect.height / 2;
  64 |     const touch = new Touch({ identifier: 17, target, clientX: x, clientY: y });
  65 |     target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true }));
  66 |     const moved = new Touch({ identifier: 17, target, clientX: x + dx, clientY: y });
  67 |     target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
  68 |     (window as unknown as { __testTouch?: Touch }).__testTouch = moved;
  69 |   }, { dx });
  70 |   await expect.poll(async () => reached(await debug(page)), { timeout }).toBe(true);
  71 |   await page.evaluate(() => {
  72 |     const target = document.querySelector('.retro-input-move-zone');
  73 |     const touch = (window as unknown as { __testTouch?: Touch }).__testTouch;
  74 |     if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  75 |   });
  76 | }
  77 | 
  78 | test('persistence restore fails on corrupt payload', async ({ page }) => {
  79 |   await waitForDemo(page, '/?corruptRestore=1');
  80 | 
  81 |   // Trigger load of outdoor
  82 |   await strafe(page, 70, (snapshot) => {
  83 |     const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
  84 |     return outdoor !== undefined && outdoor.state === 2; // Resident, but not active (3)
  85 |   });
  86 | 
  87 |   const reloaded = await debug(page);
  88 |   const outdoor = reloaded.instances.find(i => i.id === 'outdoor-instance');
  89 |   expect(outdoor).toBeDefined();
  90 |   
  91 |   // Base render is resident, but collision remains inactive since restore failed
  92 |   expect(outdoor?.renderResident).toBe(true);
  93 |   expect(outdoor?.collisionActive).toBe(false);
  94 |   expect(outdoor?.state).toBe(2); // State should remain Resident or Failed, but not Active
  95 | });
  96 | 
```