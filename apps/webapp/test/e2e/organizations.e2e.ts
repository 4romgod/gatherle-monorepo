import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Organizations Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /organizations list actions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/organizations', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('combobox', { name: 'Try a name, description, or tag' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: 'Create' })).toBeVisible();
  });

  test('redirects unauthenticated users to /auth/login from create organization CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/organizations', { waitUntil: 'domcontentloaded' });

    await page.getByRole('link', { name: 'Create' }).click();
    await expectLoginPage(page);
  });
});
