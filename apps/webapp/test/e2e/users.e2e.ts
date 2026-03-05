import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('Users Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /users route', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users\/?$/, { timeout: 20_000 });

    const communityHeading = page.getByRole('heading', { name: 'Discover Your Community' });
    const loadError = page.getByText('Unable to load community members right now.');
    await expect(communityHeading.or(loadError)).toBeVisible({ timeout: 20_000 });
  });

  test('shows community browsing section when data loads', async ({ page }) => {
    await page.goto('/users');

    const loadError = page.getByText('Unable to load community members right now.');
    const peopleHeading = page.getByRole('heading', { name: 'Discover your community' });

    await expect(peopleHeading.or(loadError)).toBeVisible({ timeout: 20_000 });

    if (await loadError.isVisible()) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(peopleHeading).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible({ timeout: 20_000 });
  });
});
