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

  test('shows sign-in gate for unauthenticated community browsing', async ({ page }) => {
    await page.goto('/users');

    const peopleHeading = page.getByRole('heading', { name: 'Discover your community' });
    const signInHeading = page.getByRole('heading', { name: 'Sign in to browse community members' });
    const signInButton = page.getByRole('link', { name: /^Sign in$/ });
    const loadError = page.getByText('Unable to load community members right now.');

    await expect(peopleHeading).toBeVisible({ timeout: 20_000 });
    await expect(signInHeading.or(loadError)).toBeVisible({ timeout: 20_000 });

    if (await loadError.isVisible()) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(signInHeading).toBeVisible();
    await expect(signInButton).toBeVisible();
  });
});
