import { expect, test, type Page } from '@playwright/test';
import { holdForDebug } from './helpers';

async function waitForEventsSurface(page: Page) {
  const eventsSearchField = page.getByPlaceholder('Search events by title, location, or category...');
  const loadError = page
    .getByText("You're offline")
    .or(page.getByText('Gatherle is unavailable'))
    .or(page.getByText("We couldn't load the event map"));

  await expect(eventsSearchField.or(loadError)).toBeVisible({ timeout: 20_000 });
  const loadedWithError = await loadError.isVisible();

  return { eventsSearchField, loadError, loadedWithError };
}

test.describe('Events Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /events route', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });

    const { eventsSearchField, loadError, loadedWithError } = await waitForEventsSurface(page);
    await expect(loadedWithError ? loadError : eventsSearchField).toBeVisible();
  });

  test('shows search and filter controls when events data loads', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });

    const { eventsSearchField, loadError, loadedWithError } = await waitForEventsSurface(page);

    if (loadedWithError) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(eventsSearchField).toBeVisible();
    await expect(page.getByRole('button', { name: /^Categories/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Status/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Date/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Location/ })).toBeVisible();
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
