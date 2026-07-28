# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/browser-seamless.spec.ts >> unneeded content becomes evictable and reloads when relevant
- Location: tests/browser-seamless.spec.ts:119:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | const webglArgs = [
  4   |   '--use-gl=swiftshader',
  5   |   '--enable-webgl',
  6   |   '--enable-unsafe-swiftshader',
  7   | ];
  8   | 
  9   | test.use({ launchOptions: { args: webglArgs } });
  10  | 
  11  | type DebugSnapshot = {
  12  |   ready: boolean;
  13  |   wasmReady: boolean;
  14  |   assetsReady: boolean;
  15  |   renderFrame: number;
  16  |   pose: { x: number; y: number; z: number };
  17  |   activeInstance: string;
  18  |   targetVisible: boolean;
  19  |   instances: Array<{ id: string; state: number; renderResident: boolean; collisionActive: boolean }>;
  20  |   sourcePlayable: boolean;
  21  | };
  22  | 
  23  | const diagnostics = new WeakMap<Page, string[]>();
  24  | 
  25  | test.beforeEach(({ page }) => {
  26  |   const errors: string[] = [];
  27  |   diagnostics.set(page, errors);
  28  |   page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  29  |   page.on('console', (message) => {
  30  |     if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  31  |   });
  32  | });
  33  | 
  34  | test.afterEach(async ({ page }, testInfo) => {
  35  |   const errors = diagnostics.get(page) ?? [];
  36  |   if (errors.length > 0) await testInfo.attach('page-diagnostics', { body: errors.join('\n'), contentType: 'text/plain' });
  37  |   expect(errors, errors.join('\n')).toEqual([]);
  38  | });
  39  | 
  40  | async function waitForDemo(page: Page, path = '/') {
> 41  |   await page.goto(path);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42  |   await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  43  |   await expect.poll(
  44  |     async () => page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug),
  45  |     { timeout: 15_000, message: () => `Demo debug state missing or not ready. ${diagnostics.get(page)?.join('\n') ?? ''}` },
  46  |   ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
  47  | }
  48  | 
  49  | async function debug(page: Page): Promise<DebugSnapshot> {
  50  |   const snapshot = await page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug);
  51  |   if (!snapshot) throw new Error(`Demo debug state missing. ${diagnostics.get(page)?.join('\n') ?? ''}`);
  52  |   return snapshot;
  53  | }
  54  | 
  55  | async function strafe(page: Page, dx: number, reached: (snapshot: DebugSnapshot) => boolean, timeout = 10_000) {
  56  |   await page.evaluate(({ dx }) => {
  57  |     const target = document.querySelector('.retro-input-move-zone');
  58  |     if (!target) throw new Error('Move zone missing');
  59  |     const rect = target.getBoundingClientRect();
  60  |     const x = rect.left + rect.width / 2;
  61  |     const y = rect.top + rect.height / 2;
  62  |     const touch = new Touch({ identifier: 17, target, clientX: x, clientY: y });
  63  |     target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true }));
  64  |     const moved = new Touch({ identifier: 17, target, clientX: x + dx, clientY: y });
  65  |     target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
  66  |     (window as unknown as { __testTouch?: Touch }).__testTouch = moved;
  67  |   }, { dx });
  68  |   await expect.poll(async () => reached(await debug(page)), { timeout }).toBe(true);
  69  |   await page.evaluate(() => {
  70  |     const target = document.querySelector('.retro-input-move-zone');
  71  |     const touch = (window as unknown as { __testTouch?: Touch }).__testTouch;
  72  |     if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  73  |   });
  74  | }
  75  | 
  76  | test('target is visible before crossing and forward/reverse traversal stays continuous', async ({ page }) => {
  77  |   await waitForDemo(page);
  78  |   await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
  79  |   const before = await debug(page);
  80  |   expect(before.activeInstance).toBe('dungeon-instance');
  81  |   expect(before.targetVisible).toBe(true);
  82  |   expect(before.instances.find((instance) => instance.id === 'outdoor-instance')?.renderResident).toBe(true);
  83  | 
  84  |   const startX = before.pose.x;
  85  |   await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  86  |   const forward = await debug(page);
  87  |   expect(forward.activeInstance).toBe('outdoor-instance');
  88  |   expect(forward.pose.x).toBeGreaterThan(startX + 1);
  89  |   expect(forward.renderFrame).toBeGreaterThan(before.renderFrame);
  90  | 
  91  |   // Clear re-arm hysteresis before attempting return traversal.
  92  |   await strafe(page, 30, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);
  93  |   const outside = await debug(page);
  94  |   expect(outside.activeInstance).toBe('outdoor-instance');
  95  | 
  96  |   await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  97  |   const reverse = await debug(page);
  98  |   expect(reverse.activeInstance).toBe('dungeon-instance');
  99  |   expect(reverse.pose.x).toBeLessThan(outside.pose.x - 0.5);
  100 |   expect(reverse.sourcePlayable).toBe(true);
  101 | });
  102 | 
  103 | test('source remains playable when target preload fails', async ({ page }) => {
  104 |   await waitForDemo(page, '/?failOutdoor=1');
  105 |   await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(6);
  106 |   const failed = await debug(page);
  107 |   expect(failed.targetVisible).toBe(false);
  108 |   expect(failed.sourcePlayable).toBe(true);
  109 |   expect(failed.instances.find((instance) => instance.id === 'dungeon-instance')?.collisionActive).toBe(true);
  110 |   expect(failed.renderFrame).toBeGreaterThan(0);
  111 | 
  112 |   await strafe(page, 70, (snapshot) => snapshot.renderFrame > failed.renderFrame);
  113 |   const afterAttempt = await debug(page);
  114 |   expect(afterAttempt.sourcePlayable).toBe(true);
  115 |   expect(afterAttempt.activeInstance).toBe('dungeon-instance');
  116 |   expect(afterAttempt.renderFrame).toBeGreaterThan(failed.renderFrame);
  117 | });
  118 | 
  119 | test('unneeded content becomes evictable and reloads when relevant', async ({ page }) => {
  120 |   await waitForDemo(page);
  121 |   
  122 |   // Cross into outdoor
  123 |   await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  124 |   const forward = await debug(page);
  125 |   expect(forward.activeInstance).toBe('outdoor-instance');
  126 | 
  127 |   // Clear re-arm hysteresis before attempting return traversal.
  128 |   await strafe(page, 1, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);
  129 | 
  130 |   // Cross back into dungeon and move far enough to trigger eviction
  131 |   // Demo policy uses relevance distance 10 and no retention hysteresis.
  132 |   // Dungeon wall limits travel; outdoor center is still outside retention band.
  133 |   await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  134 |   await strafe(page, -40, (snapshot) => {
  135 |     const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
  136 |     return outdoor === undefined || outdoor.state === 0 || outdoor.state === 5; // Known or Evicted
  137 |   });
  138 | 
  139 |   const evicted = await debug(page);
  140 |   expect(evicted.activeInstance).toBe('dungeon-instance');
  141 |   const outdoorEvicted = evicted.instances.find((instance) => instance.id === 'outdoor-instance');
```