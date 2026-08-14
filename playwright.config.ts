import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './examples/demo/tests',
  testIgnore: 'persistence.spec.ts',
  // SwiftShader/browser contexts are stable serially; CI keeps proof deterministic.
  // Parallel-worker hardening remains deferred until suite size justifies it.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 60_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --dir examples/demo dev --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    // Root E2E must boot current source/WASM, never attach to stale developer Vite state.
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
