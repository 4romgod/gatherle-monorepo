import { expect, test } from '@playwright/test';

const debugHoldMs = Number(process.env.PLAYWRIGHT_DEBUG_HOLD_MS ?? 0);

test.describe('Auth Routes', () => {
  test.afterEach(async ({ page }) => {
    if (debugHoldMs > 0) {
      await page.waitForTimeout(debugHoldMs);
    }
  });

  test('renders the login page and navigates to register', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/auth/forgot-password');

    await page.locator('a[href="/auth/register"]').first().click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
  });

  test('redirects unauthenticated users away from protected routes', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  });

  test('redirects unauthenticated users from /home to /', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/$/);
  });
});
