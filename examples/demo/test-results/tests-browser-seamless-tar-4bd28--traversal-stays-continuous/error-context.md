# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/browser-seamless.spec.ts >> target is visible before crossing and forward/reverse traversal stays continuous
- Location: tests/browser-seamless.spec.ts:78:1

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
  21  |   overflowed?: boolean;
  22  |   overflowDiagnostics?: string;
  23  | };
  24  | 
  25  | const diagnostics = new WeakMap<Page, string[]>();
  26  | 
  27  | test.beforeEach(({ page }) => {
  28  |   const errors: string[] = [];
  29  |   diagnostics.set(page, errors);
  30  |   page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  31  |   page.on('console', (message) => {
  32  |     if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  33  |   });
  34  | });
  35  | 
  36  | test.afterEach(async ({ page }, testInfo) => {
  37  |   const errors = diagnostics.get(page) ?? [];
  38  |   if (errors.length > 0) await testInfo.attach('page-diagnostics', { body: errors.join('\n'), contentType: 'text/plain' });
  39  |   expect(errors, errors.join('\n')).toEqual([]);
  40  | });
  41  | 
  42  | async function waitForDemo(page: Page, path = '/') {
> 43  |   await page.goto(path);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  44  |   await page.waitForSelector('canvas#scene', { state: 'attached', timeout: 15_000 });
  45  |   await expect.poll(
  46  |     async () => page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug),
  47  |     { timeout: 15_000, message: () => `Demo debug state missing or not ready. ${diagnostics.get(page)?.join('\n') ?? ''}` },
  48  |   ).toMatchObject({ ready: true, wasmReady: true, assetsReady: true });
  49  | }
  50  | 
  51  | async function debug(page: Page): Promise<DebugSnapshot> {
  52  |   const snapshot = await page.evaluate(() => (window as unknown as { __retroMageDebug?: DebugSnapshot }).__retroMageDebug);
  53  |   if (!snapshot) throw new Error(`Demo debug state missing. ${diagnostics.get(page)?.join('\n') ?? ''}`);
  54  |   return snapshot;
  55  | }
  56  | 
  57  | async function strafe(page: Page, dx: number, reached: (snapshot: DebugSnapshot) => boolean, timeout = 10_000) {
  58  |   await page.evaluate(({ dx }) => {
  59  |     const target = document.querySelector('.retro-input-move-zone');
  60  |     if (!target) throw new Error('Move zone missing');
  61  |     const rect = target.getBoundingClientRect();
  62  |     const x = rect.left + rect.width / 2;
  63  |     const y = rect.top + rect.height / 2;
  64  |     const touch = new Touch({ identifier: 17, target, clientX: x, clientY: y });
  65  |     target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true }));
  66  |     const moved = new Touch({ identifier: 17, target, clientX: x + dx, clientY: y });
  67  |     target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
  68  |     (window as unknown as { __testTouch?: Touch }).__testTouch = moved;
  69  |   }, { dx });
  70  |   await expect.poll(async () => reached(await debug(page)), { timeout }).toBe(true);
  71  |   await page.evaluate(() => {
  72  |     const target = document.querySelector('.retro-input-move-zone');
  73  |     const touch = (window as unknown as { __testTouch?: Touch }).__testTouch;
  74  |     if (target && touch) target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true }));
  75  |   });
  76  | }
  77  | 
  78  | test('target is visible before crossing and forward/reverse traversal stays continuous', async ({ page }) => {
  79  |   await waitForDemo(page);
  80  |   await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(2);
  81  |   const before = await debug(page);
  82  |   expect(before.activeInstance).toBe('dungeon-instance');
  83  |   expect(before.targetVisible).toBe(true);
  84  |   expect(before.instances.find((instance) => instance.id === 'outdoor-instance')?.renderResident).toBe(true);
  85  | 
  86  |   const startX = before.pose.x;
  87  |   await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  88  |   const forward = await debug(page);
  89  |   expect(forward.activeInstance).toBe('outdoor-instance');
  90  |   expect(forward.pose.x).toBeGreaterThan(startX + 1);
  91  |   expect(forward.renderFrame).toBeGreaterThan(before.renderFrame);
  92  | 
  93  |   // Clear re-arm hysteresis before attempting return traversal.
  94  |   await strafe(page, 30, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);
  95  |   const outside = await debug(page);
  96  |   expect(outside.activeInstance).toBe('outdoor-instance');
  97  | 
  98  |   await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  99  |   const reverse = await debug(page);
  100 |   expect(reverse.activeInstance).toBe('dungeon-instance');
  101 |   expect(reverse.pose.x).toBeLessThan(outside.pose.x - 0.5);
  102 |   expect(reverse.sourcePlayable).toBe(true);
  103 | });
  104 | 
  105 | test('source remains playable when target preload fails', async ({ page }) => {
  106 |   await waitForDemo(page, '/?failOutdoor=1');
  107 |   await expect.poll(async () => (await debug(page)).instances.find((instance) => instance.id === 'outdoor-instance')?.state, { timeout: 10_000 }).toBe(6);
  108 |   const failed = await debug(page);
  109 |   expect(failed.targetVisible).toBe(false);
  110 |   expect(failed.sourcePlayable).toBe(true);
  111 |   expect(failed.instances.find((instance) => instance.id === 'dungeon-instance')?.collisionActive).toBe(true);
  112 |   expect(failed.renderFrame).toBeGreaterThan(0);
  113 | 
  114 |   await strafe(page, 70, (snapshot) => snapshot.renderFrame > failed.renderFrame);
  115 |   const afterAttempt = await debug(page);
  116 |   expect(afterAttempt.sourcePlayable).toBe(true);
  117 |   expect(afterAttempt.activeInstance).toBe('dungeon-instance');
  118 |   expect(afterAttempt.renderFrame).toBeGreaterThan(failed.renderFrame);
  119 | });
  120 | 
  121 | test('unneeded content becomes evictable and reloads when relevant', async ({ page }) => {
  122 |   await waitForDemo(page);
  123 | 
  124 |   // Cross into outdoor
  125 |   await strafe(page, 70, (snapshot) => snapshot.activeInstance === 'outdoor-instance');
  126 |   const forward = await debug(page);
  127 |   expect(forward.activeInstance).toBe('outdoor-instance');
  128 | 
  129 |   // Clear re-arm hysteresis before attempting return traversal.
  130 |   await strafe(page, 1, (snapshot) => snapshot.pose.x > forward.pose.x + 0.75);
  131 | 
  132 |   // Cross back into dungeon and move far enough to trigger eviction
  133 |   // Demo policy uses relevance distance 10 and no retention hysteresis.
  134 |   // Dungeon wall limits travel; outdoor center is still outside retention band.
  135 |   await strafe(page, -70, (snapshot) => snapshot.activeInstance === 'dungeon-instance');
  136 |   await strafe(page, -40, (snapshot) => {
  137 |     const outdoor = snapshot.instances.find(i => i.id === 'outdoor-instance');
  138 |     return outdoor === undefined || outdoor.state === 0 || outdoor.state === 5; // Known or Evicted
  139 |   });
  140 | 
  141 |   const evicted = await debug(page);
  142 |   expect(evicted.activeInstance).toBe('dungeon-instance');
  143 |   const outdoorEvicted = evicted.instances.find((instance) => instance.id === 'outdoor-instance');
```