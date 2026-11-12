import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Assumes the backend (Sail) is already running on :8000.
 * Starts the Angular dev server on :4200 (which proxies /api + /sanctum to the backend).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
