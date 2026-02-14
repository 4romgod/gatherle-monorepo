import { expect, test } from '@playwright/test';
import { holdForDebug } from '../helpers';

test.describe('Register Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /auth/register form fields and actions', async ({ page }) => {
    await page.goto('/auth/register');

    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByLabel('Date of Birth')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('navigates to /auth/login from register page', async ({ page }) => {
    await page.goto('/auth/register');
    await page.getByRole('link', { name: 'Log in here' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  });
});
