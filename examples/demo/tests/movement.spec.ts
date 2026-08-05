import { test, expect, chromium, Page } from '@playwright/test';

async function dispatchMove(page: Page, dx: number, dy: number) {
  await page.evaluate(({ selector, dx, dy }) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touchStart = new Touch({
      identifier: 12345,
      target,
      clientX: centerX,
      clientY: centerY,
    });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], targetTouches: [touchStart], changedTouches: [touchStart], bubbles: true }));

    const touchMove = new Touch({
      identifier: 12345,
      target,
      clientX: centerX + dx,
      clientY: centerY + dy,
    });
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], targetTouches: [touchMove], changedTouches: [touchMove], bubbles: true }));
  }, { selector: '.retro-input-move-zone', dx, dy });
}

async function stopMove(page: Page) {
  await page.evaluate(({ selector }) => {
    const target = document.querySelector(selector);
    if (!target) return;
    const touchEnd = new Touch({
      identifier: 12345,
      target,
      clientX: 0,
      clientY: 0,
    });
    target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true }));
  }, { selector: '.retro-input-move-zone' });
}

test('vertical movement demo', async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });

  const getDebug = async () => await page.evaluate(() => (window as any).__retroMageDebug);

  await expect.poll(async () => {
    const debug = await getDebug();
    return debug && debug.assetsReady && debug.pose;
  }, { timeout: 15000 }).toBeTruthy();

  let state = await getDebug();
  console.log('Initial pos:', state.pose);

  // 1. Walk +Z to get past the bottom of the ramp
  // dy > 0 means Z increases based on observation
  await dispatchMove(page, 0, 30);

  await expect.poll(async () => {
    const debug = await getDebug();
    console.log('Polled pos (moving +Z):', debug.pose);
    return debug.pose.z > 6.8;
  }, { timeout: 15000 }).toBe(true);

  await stopMove(page);

  state = await getDebug();
  console.log('Pos after moving past ramp bottom:', state.pose);
  expect(state.pose.y).toBeLessThan(0.1);
  expect(state.grounded).toBe(true);

  // 2. Walk -Z to ascend the ramp
  // Use a slower speed so we don't overshoot the platform entirely!
  await dispatchMove(page, 0, -10);

  // We need to verify we ascend.
  await expect.poll(async () => {
    const debug = await getDebug();
    console.log('Polled pos (moving -Z):', debug.pose);
    // Stop at z < 4.4 so we are fully on the top platform (z=1.5 to 4.5)
    return debug.pose.z < 4.4;
  }, { timeout: 15000 }).toBe(true);

  await stopMove(page);

  // Wait for the player to fully stop and be grounded.
  await expect.poll(async () => {
    const debug = await getDebug();
    return debug.grounded && debug.verticalVelocity === 0;
  }, { timeout: 5000 }).toBe(true);

  state = await getDebug();
  console.log('Pos after ascending ramp:', state.pose);
  expect(state.pose.y).toBeGreaterThan(0.9);
  // Balcony proof: the same production traversal reaches the authored rail; no teleport bypass.
  const balconyEntry = await getDebug();
  expect(balconyEntry.pose.y).toBeGreaterThan(0.9);
  expect(balconyEntry.grounded).toBe(true);
  // Continue along the authored balcony before testing its side guard.
  await dispatchMove(page, 0, -10);
  await expect.poll(async () => (await getDebug()).pose.z < 3.2, { timeout: 5000 }).toBe(true);
  await stopMove(page);
  await dispatchMove(page, 30, 0);
  await expect.poll(async () => (await getDebug()).renderFrame > balconyEntry.renderFrame + 10, { timeout: 5000 }).toBe(true);
  await stopMove(page);
  state = await getDebug();
  expect(state.pose.x).toBeLessThan(2.8);
  expect(state.pose.y).toBeGreaterThan(0.9);
  expect(state.grounded).toBe(true);

  // Look-down proof uses the production look touch zone and verifies lower-room geometry evidence.
  const pitchBefore = (await getDebug()).debugMovement.pitch;
  await page.evaluate(() => {
    const target = document.querySelector('.retro-input-look-zone');
    if (!target) throw new Error('Look zone missing');
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const start = new Touch({ identifier: 23456, target, clientX: x, clientY: y });
    const moved = new Touch({ identifier: 23456, target, clientX: x, clientY: y + 80 });
    target.dispatchEvent(new TouchEvent('touchstart', { touches: [start], targetTouches: [start], changedTouches: [start], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchmove', { touches: [moved], targetTouches: [moved], changedTouches: [moved], bubbles: true }));
    target.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [moved], bubbles: true }));
  });
  await expect.poll(async () => (await getDebug()).debugMovement.pitch, { timeout: 5000 }).toBeGreaterThan(pitchBefore);
  state = await getDebug();
  expect(state.renderProof.lowerRoomVisible).toBe(true);
  expect(state.renderProof.materialIds).toContain(2);
  expect(state.renderProof.litOpaqueTileCount).toBeGreaterThan(0);
  expect(state.renderProof.translucentTileCount).toBe(0);
  expect(state.renderProof.activeLightCount).toBeGreaterThan(0);
  expect(state.renderProof.lutActive).toBe(true);
  expect(state.renderProof.materialDiagnostics).toBe(0);

  // 2.1 Descend the ramp (walk +Z)
  await dispatchMove(page, 0, 10);
  await expect.poll(async () => {
    const debug = await getDebug();
    return debug.pose.z > 6.8;
  }, { timeout: 15000 }).toBe(true);

  await stopMove(page);

  await expect.poll(async () => {
    const debug = await getDebug();
    return debug.grounded && debug.verticalVelocity === 0;
  }, { timeout: 5000 }).toBe(true);

  state = await getDebug();
  console.log('Pos after descending ramp:', state.pose);
  expect(state.pose.y).toBeLessThan(0.1);

  // 2.2 Ascend again for the ledge fall
  await dispatchMove(page, 0, -10);
  await expect.poll(async () => {
    const debug = await getDebug();
    return debug.pose.z < 4.4;
  }, { timeout: 15000 }).toBe(true);

  await stopMove(page);

  await expect.poll(async () => {
    const debug = await getDebug();
    return debug.grounded && debug.verticalVelocity === 0;
  }, { timeout: 5000 }).toBe(true);

  // 3. Walk off the ledge (walk -X)
  await dispatchMove(page, -30, 0);

  // Assert falling state DURING the fall
  await expect.poll(async () => {
    const debug = await getDebug();
    // It should become ungrounded and gain negative vertical velocity
    return !debug.grounded && debug.verticalVelocity! < 0;
  }, { timeout: 15000, intervals: [50] }).toBe(true);

  // Assert landing
  await expect.poll(async () => {
    const debug = await getDebug();
    console.log('Polled pos (moving +X):', debug.pose, 'velY:', debug.verticalVelocity);
    return debug.pose.y < 0.1 && debug.grounded;
  }, { timeout: 15000 }).toBe(true);

  await stopMove(page);

  state = await getDebug();
  console.log('Pos after falling:', state.pose);
  expect(state.pose.y).toBeLessThan(0.1);
  expect(state.grounded).toBe(true);
  expect(state.verticalVelocity).toBe(0);

  // 4. Test steep ramp (blocks movement)
  // Navigate to steep ramp at x=4.5, z=6.5
  // We are currently at roughly x=5.8, z=3.1

  // 4. Test steep ramp (blocks movement)
  // Teleport directly in front of the steep ramp at x=4.5, z=6.5
  await page.evaluate(() => (window as any).__retroMageTeleport?.(4.5, 0, 6.5));
  // Wait for gravity to settle if needed
  await expect.poll(async () => (await getDebug()).grounded, { timeout: 5000 }).toBe(true);

  // Walk -Z into the steep ramp
  await dispatchMove(page, 0, -30);

  // Give it 1 second to try and climb
  let zBeforeSteep = (await getDebug()).pose.z;
  await page.waitForTimeout(1000);
  await stopMove(page);

  state = await getDebug();
  console.log('Pos after trying to climb steep ramp:', state.pose);
  // Z should not have decreased past 5.0 (it starts at 5.5)
  expect(state.pose.z).toBeGreaterThan(5.0);
  expect(state.pose.y).toBeLessThan(0.1); // Should not have ascended

  // 5. Test low ceiling
  // Teleport directly in front of the low ceiling at x=-2, z=4.5
  await page.evaluate(() => (window as any).__retroMageTeleport?.(-2.0, 0, 4.5));
  // Wait for gravity to settle if needed
  await expect.poll(async () => (await getDebug()).grounded, { timeout: 5000 }).toBe(true);

  // Walk directly into the ceiling at x=-2, z=3 (moving -Z)
  await dispatchMove(page, 0, -30);
  await page.waitForTimeout(1000);
  await stopMove(page);

  state = await getDebug();
  console.log('Pos after trying to walk under low ceiling:', state.pose);
  // We should be blocked from entering z=3 under the ceiling
  expect(state.pose.z).toBeGreaterThan(3.2);

  await browser.close();
});
