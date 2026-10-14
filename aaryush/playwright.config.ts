import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 4322);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  // with 8-16 workers across 4 browsers, WebKit/Firefox pages stall, time out at 30s or crash ("Page crashed", firefox axe runs)
  // in tests that pass alone; 4 workers was clean. Playwright can't set workers per project, so cap them for the whole run.
  workers: 4,
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port}`,
    url: `http://localhost:${port}`,
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
