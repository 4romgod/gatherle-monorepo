import { test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Admin Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('redirects unauthenticated users from /admin to /auth/login', async ({ page }) => {
    await page.goto('/admin');
    await expectLoginPage(page);
  });
});
