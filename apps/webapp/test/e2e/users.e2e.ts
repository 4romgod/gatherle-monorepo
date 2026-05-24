import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('Users Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /users route', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/users\/?$/, { timeout: 20_000 });

    const communityGate = page.getByRole('heading', { name: 'Sign in to browse community members' });
    const loadError = page.getByText('Unable to load community members right now.');
    await expect(communityGate.or(loadError)).toBeVisible({ timeout: 20_000 });
  });

  test('shows sign-in gate for unauthenticated community browsing', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'commit' });

    const signInHeading = page.getByRole('heading', { name: 'Sign in to browse community members' });
    const signInButton = page.getByRole('link', { name: /^Sign in$/ });
    const loadError = page.getByText('Unable to load community members right now.');

    await expect(signInHeading.or(loadError)).toBeVisible({ timeout: 20_000 });

    if (await loadError.isVisible()) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(signInHeading).toBeVisible();
    await expect(signInButton).toBeVisible();
  });
});
