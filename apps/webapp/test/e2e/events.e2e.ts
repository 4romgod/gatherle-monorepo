import { expect, test, type Page } from '@playwright/test';
import { holdForDebug } from './helpers';

async function waitForEventsSurface(page: Page) {
  const discoverEventsHeading = page.getByRole('heading', { name: 'Discover Events' });
  const loadError = page.getByText('Unable to load events right now. Please try again shortly.');

  try {
    await expect(discoverEventsHeading).toBeVisible({ timeout: 20_000 });
    return { discoverEventsHeading, loadError, loadedWithError: false };
  } catch {
    await expect(loadError).toBeVisible({ timeout: 20_000 });
    return { discoverEventsHeading, loadError, loadedWithError: true };
  }
}

test.describe('Events Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /events route', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });

    const { discoverEventsHeading, loadError, loadedWithError } = await waitForEventsSurface(page);
    await expect(loadedWithError ? loadError : discoverEventsHeading).toBeVisible();
  });

  test('shows search and filter controls when events data loads', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });

    const { discoverEventsHeading, loadError, loadedWithError } = await waitForEventsSurface(page);

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

  test('switches between list, week, and month event views', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });

    const { loadError, loadedWithError } = await waitForEventsSurface(page);

    if (loadedWithError) {
      await expect(loadError).toBeVisible();
      return;
    }

    const listTab = page.getByRole('tab', { name: 'List' });
    const weekTab = page.getByRole('tab', { name: 'Week' });
    const monthTab = page.getByRole('tab', { name: 'Month' });

    await expect(listTab).toBeVisible();
    await expect(weekTab).toBeVisible();
    await expect(monthTab).toBeVisible();

    await weekTab.click();
    await expect(page).toHaveURL(/\/events\?view=week(&date=\d{4}-\d{2}-\d{2})?/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Show previous week/i })).toBeVisible();

    await monthTab.click();
    await expect(page).toHaveURL(/\/events\?view=month(&date=\d{4}-\d{2}-\d{2})?/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Show previous month/i })).toBeVisible();

    await listTab.click();
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });
  });

  test('opens share dialog from an event card with supported actions only', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });

    const { loadError, loadedWithError } = await waitForEventsSurface(page);

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
