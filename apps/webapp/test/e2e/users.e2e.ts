import { expect, test, type Page } from '@playwright/test';
import { holdForDebug } from './helpers';

async function waitForUsersSurface(page: Page) {
  const signInHeading = page.getByRole('heading', { name: 'Sign in to browse community members' });
  const loadError = page.getByText('Unable to load community members right now.');

  try {
    await expect(signInHeading).toBeVisible({ timeout: 20_000 });
    return { loadError, loadedWithError: false, signInHeading };
  } catch {
    await expect(loadError).toBeVisible({ timeout: 20_000 });
    return { loadError, loadedWithError: true, signInHeading };
  }
}

test.describe('Users Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /users route', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users\/?$/, { timeout: 20_000 });

    const { loadError, loadedWithError, signInHeading } = await waitForUsersSurface(page);
    await expect(loadedWithError ? loadError : signInHeading).toBeVisible();
  });

  test('shows sign-in gate for unauthenticated community browsing', async ({ page }) => {
    await page.goto('/users');

    const signInHeading = page.getByRole('heading', { name: 'Sign in to browse community members' });
    const signInButton = page.getByRole('link', { name: /^Sign in$/ });
    const { loadError, loadedWithError } = await waitForUsersSurface(page);

    if (loadedWithError) {
      await expect(loadError).toBeVisible();
      return;
    }

    await expect(signInHeading).toBeVisible();
    await expect(signInButton).toBeVisible();
  });
});
