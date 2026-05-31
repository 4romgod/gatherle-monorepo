import { test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Account Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('redirects unauthenticated users from /account to /auth/login', async ({ page }) => {
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await expectLoginPage(page);
  });

  test('redirects unauthenticated users from /account/events/create to /auth/login', async ({ page }) => {
    await page.goto('/account/events/create', { waitUntil: 'domcontentloaded' });
    await expectLoginPage(page);
  });

  test('redirects unauthenticated users from organizer session tools to /auth/login', async ({ page }) => {
    await page.goto(
      '/account/events/cape-town-wellness-immersion/sessions?occurs=2026-05-29T06%3A00%3A00.000Z&action=edit',
      {
        waitUntil: 'domcontentloaded',
      },
    );
    await expectLoginPage(page);
  });
});
