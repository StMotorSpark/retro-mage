import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.js';

export default defineConfig({
  ...baseConfig,
  testMatch: '**/dynamic-content.spec.ts',
  testIgnore: [],
  workers: 1,
  fullyParallel: false,
  webServer: {
    command: 'rm -rf examples/demo/node_modules/.vite && pnpm --dir examples/demo dev --host 127.0.0.1 --force',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
