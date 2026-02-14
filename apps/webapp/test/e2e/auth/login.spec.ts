import { expect, test } from '@playwright/test';
import { holdForDebug } from '../helpers';

test.describe('Login Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /auth/login form fields and actions', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.locator('a[href="/auth/register"]').first()).toBeVisible();
  });

  test('navigates to /auth/forgot-password from login page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
  });

  test('toggles password visibility on login page', async ({ page }) => {
    await page.goto('/auth/login');
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'toggle password visibility' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('navigates to /auth/register from login page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('a[href="/auth/register"]').first().click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
  });
});
