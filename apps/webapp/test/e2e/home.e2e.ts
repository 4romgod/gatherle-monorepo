import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('Home Route', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('redirects unauthenticated users from /home to /', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Where unforgettable experiences find their people.' }),
    ).toBeVisible();
  });
});
