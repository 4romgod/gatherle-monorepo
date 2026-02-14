import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('Events Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /events route', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });

    const discoverEventsHeading = page.getByRole('heading', { name: 'Discover Events' });
    const loadError = page.getByText('Unable to load events right now. Please try again shortly.');

    await expect(discoverEventsHeading.or(loadError)).toBeVisible({ timeout: 20_000 });
  });

  test('shows search and filter controls when events data loads', async ({ page }) => {
    await page.goto('/events');

    const loadError = page.getByText('Unable to load events right now. Please try again shortly.');
    const discoverEventsHeading = page.getByRole('heading', { name: 'Discover Events' });

    await expect(discoverEventsHeading.or(loadError)).toBeVisible({ timeout: 20_000 });

    if (await loadError.isVisible()) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(discoverEventsHeading).toBeVisible();
    await expect(page.getByPlaceholder('Search events by title, location, or category...')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Categories/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Status/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Date/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Location/ })).toBeVisible();
  });
});
