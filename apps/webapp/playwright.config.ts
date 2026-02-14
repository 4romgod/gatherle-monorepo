import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);

if (!baseURL) {
  throw new Error('PLAYWRIGHT_BASE_URL is required. The runner must provide the deployed webapp URL.');
}

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'test/e2e/reports/playwright-html', open: 'never' }]],
  outputDir: 'test/e2e/reports/test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    ...(slowMo > 0 ? { launchOptions: { slowMo } } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
