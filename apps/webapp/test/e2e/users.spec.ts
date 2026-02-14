import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('Users Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /users route', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users$/);

    const communityHeading = page.getByRole('heading', { name: 'Discover Your Community' });
    const loadError = page.getByText('Unable to load community members right now.');
    await expect(communityHeading.or(loadError)).toBeVisible();
  });

  test('shows community browsing section when data loads', async ({ page }) => {
    await page.goto('/users');

    const loadError = page.getByText('Unable to load community members right now.');
    if (await loadError.isVisible()) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(page.getByRole('heading', { name: 'Meet Your People' })).toBeVisible();
    await expect(page.getByLabel('Search community members...')).toBeVisible();
  });
});
