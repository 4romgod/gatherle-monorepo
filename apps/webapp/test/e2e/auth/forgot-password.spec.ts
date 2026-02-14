import { expect, test } from '@playwright/test';
import { holdForDebug } from '../helpers';

test.describe('Forgot Password Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /auth/forgot-password form', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Password' })).toBeVisible();
  });
});
