import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Venues Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /venues list actions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/venues', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('combobox', { name: 'Try a name, city, or venue type' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: 'Add Venue' })).toBeVisible();
  });

  test('redirects unauthenticated users to /auth/login from add venue CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/venues', { waitUntil: 'domcontentloaded' });

    await page.getByRole('link', { name: 'Add Venue' }).click();
    await expectLoginPage(page);
  });
});
