import { test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Account Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('redirects unauthenticated users from /account to /auth/login', async ({ page }) => {
    await page.goto('/account');
    await expectLoginPage(page);
  });

  test('redirects unauthenticated users from /account/profile to /auth/login', async ({ page }) => {
    await page.goto('/account/profile');
    await expectLoginPage(page);
  });

  test('redirects unauthenticated users from /account/events/create to /auth/login', async ({ page }) => {
    await page.goto('/account/events/create');
    await expectLoginPage(page);
  });
});
