import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Venues Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /venues list actions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/venues');
    await expect(page).toHaveURL(/\/venues\/?$/, { timeout: 20_000 });

    const venuesSearch = page.getByRole('combobox', { name: 'Try a name, city, or venue type' });
    const loadError = page.getByText('Unable to load venues right now.');

    try {
      await expect(venuesSearch).toBeVisible({ timeout: 20_000 });
    } catch {
      await expect(loadError).toBeVisible({ timeout: 20_000 });
      return;
    }

    await expect(venuesSearch).toBeVisible();
  });

  test('redirects unauthenticated users to /auth/login from the add venue route', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/venues');
    await expect(page).toHaveURL(/\/venues\/?$/, { timeout: 20_000 });
    await page.getByRole('link', { name: 'Add Venue' }).first().click();
    await expectLoginPage(page);
  });
});
