import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  // 16 logical cores running 4 browsers' worth of pages starves WebKit and Firefox into 30s timeouts that pass alone
  // (page loads and in-page axe runs stall). Playwright can't set workers per project, so cap them for the whole run.
  workers: 8,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4322', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
