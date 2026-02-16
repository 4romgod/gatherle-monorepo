import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);
const baseUrlIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(baseURL ?? '');
const workersFromEnv = process.env.PLAYWRIGHT_WORKERS;

if (!baseURL) {
  throw new Error('PLAYWRIGHT_BASE_URL is required. The runner must provide the deployed webapp URL.');
}

/**
 * Configure Playwright workers in CI.
 *
 * By default, we use a small degree of parallelism (2 workers) in CI to keep
 * test runtime reasonable. This can be overridden via PLAYWRIGHT_CI_WORKERS.
 * Set PLAYWRIGHT_CI_WORKERS=1 if your CI environment requires strictly
 * sequential execution due to shared state or resource constraints.
 */
const ciWorkers = process.env.CI
  ? (() => {
      const fromEnv = process.env.PLAYWRIGHT_CI_WORKERS;
      if (!fromEnv) {
        return 2;
      }
      const parsed = Number(fromEnv);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
    })()
  : undefined;

const workers = (() => {
  if (workersFromEnv) {
    const parsed = Number(workersFromEnv);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (process.env.CI) {
    return ciWorkers;
  }

  // Local runs often target a dev server that compiles routes lazily.
  // Running many workers in parallel causes flaky URL/navigation assertions.
  if (baseUrlIsLocalhost) {
    return 1;
  }

  return undefined;
})();

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: process.env.CI ? true : !baseUrlIsLocalhost,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: [['list'], ['html', { outputFolder: 'test/e2e/reports/playwright-html', open: 'never' }]],
  outputDir: 'test/e2e/reports/test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...(slowMo > 0 ? { launchOptions: { slowMo } } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
