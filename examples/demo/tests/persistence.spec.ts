import { test, expect } from '@playwright/test';

test.describe('Persistence Restore Proof Harness', () => {
  test('preflight: engine-core wasm contains restore exports', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'attached', timeout: 15000 });

    const exportsExist = await page.evaluate(() => {
      try {
        const wt = (window as any).__retroMageWorldTransport;
        if (!wt) return { error: 'WorldTransport not found on window' };

        const hasBegin = typeof wt.begin_restore === 'function';
        const hasComplete = typeof wt.complete_restore === 'function';
        const hasStatus = typeof wt.instance_restore_status === 'function';
        return { hasBegin, hasComplete, hasStatus };
      } catch (err) {
        return { error: String(err) };
      }
    });

    expect(exportsExist.error).toBeUndefined();
    expect(exportsExist.hasBegin).toBe(true);
    expect(exportsExist.hasComplete).toBe(true);
    expect(exportsExist.hasStatus).toBe(true);
  });
});
