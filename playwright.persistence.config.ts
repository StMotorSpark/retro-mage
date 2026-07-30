import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.js';

export default defineConfig({
  ...baseConfig,
  testMatch: '**/persistence.spec.ts',
  testIgnore: [],
  workers: 1, // Bounded serial Playwright execution
  fullyParallel: false,
  webServer: {
    // Fresh Vite/Playwright server, force cache invalidate
    command: 'rm -rf examples/demo/node_modules/.vite && pnpm --dir examples/demo dev --host 127.0.0.1 --force',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false, // Prevent stale reused dev servers
    timeout: 30_000,
  },
});
