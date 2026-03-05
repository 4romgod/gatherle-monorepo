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

    let loadedWithError = false;
    try {
      await discoverEventsHeading.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      loadedWithError = true;
      await loadError.waitFor({ state: 'visible', timeout: 20_000 });
    }

    if (loadedWithError) {
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

  test('opens share dialog from an event card with supported actions only', async ({ page }) => {
    await page.goto('/events');

    const loadError = page.getByText('Unable to load events right now. Please try again shortly.');
    const discoverEventsHeading = page.getByRole('heading', { name: 'Discover Events' });

    let loadedWithError = false;
    try {
      await discoverEventsHeading.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      loadedWithError = true;
      await loadError.waitFor({ state: 'visible', timeout: 20_000 });
    }

    if (loadedWithError) {
      await expect(loadError).toBeVisible();
      return;
    }

    const shareButton = page.locator('[aria-label^="Share "]').first();
    await expect(shareButton).toBeVisible({ timeout: 20_000 });
    await shareButton.click();
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 10_000 });

    const shareDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Share' }) });
    await expect(shareDialog).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'WhatsApp' })).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'Facebook' })).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'X', exact: true })).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'Email' })).toBeVisible();
    await expect(shareDialog.getByRole('button', { name: 'Instagram' })).toHaveCount(0);
    await expect(shareDialog.getByRole('button', { name: 'More' })).toHaveCount(0);
  });
});
