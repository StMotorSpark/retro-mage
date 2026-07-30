import { test, expect, chromium } from '@playwright/test';

test('synthetic movement', async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=swiftshader',
      '--enable-webgl',
      '--enable-unsafe-swiftshader'
    ]
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("console", msg => console.log(msg.text()));

  
  await page.goto('http://localhost:5173');
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });
  
  // Wait for assets and active world
  await page.waitForFunction(() => {
    const debug = (window as any).__retroMageDebug;
    return debug && debug.assetsReady && debug.pose;
  });

  let initialPos = await page.evaluate(() => (window as any).__retroMageDebug.pose);
  console.log('Initial position:', initialPos);

  // Dispatch synthetic touch
  await page.evaluate(({ selector, dx, dy }) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touchStart = new Touch({
      identifier: Date.now(),
      target,
      clientX: centerX,
      clientY: centerY,
    });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], targetTouches: [touchStart], changedTouches: [touchStart], bubbles: true }));

    const touchMove = new Touch({
      identifier: touchStart.identifier,
      target,
      clientX: centerX + dx,
      clientY: centerY + dy,
    });
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], targetTouches: [touchMove], changedTouches: [touchMove], bubbles: true }));
  }, { selector: '.retro-input-move-zone', dx: 0, dy: -20 });

  await page.waitForTimeout(500);

  let newPos = await page.evaluate(() => (window as any).__retroMageDebug.pose);
  console.log('New position after moving forward:', newPos);

  // Wait for support/snap fix - check if y snaps to 1
  let grounded = await page.evaluate(() => (window as any).__retroMageDebug.grounded);
  console.log('Grounded:', grounded);
  
  await browser.close();
});
