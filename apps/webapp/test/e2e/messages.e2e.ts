import { test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Messages Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('redirects unauthenticated users from /account/messages to /auth/login', async ({ page }) => {
    await page.goto('/account/messages');
    await expectLoginPage(page);
  });

  test('redirects unauthenticated users from /account/messages/:username to /auth/login', async ({ page }) => {
    await page.goto('/account/messages/someuser');
    await expectLoginPage(page);
  });
});
