import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Index Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders / hero section and CTA links', async ({ page }) => {
    await page.goto('/');
    const heroSection = page.locator('#hero-section');

    await expect(page.getByRole('heading', { name: 'Where unforgettable experiences find their people.' })).toBeVisible(
      {
        timeout: 10_000,
      },
    );
    await expect(heroSection.getByRole('link', { name: 'Browse events' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'Sign up' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'Host with Gatherle' })).toBeVisible();
  });

  test('navigates to /events from the hero Browse events CTA', async ({ page }) => {
    await page.goto('/');
    const browseEventsLink = page.locator('#hero-section').getByRole('link', { name: 'Browse events', exact: true });
    await expect(browseEventsLink).toBeVisible();
    await expect(browseEventsLink).toHaveAttribute('href', '/events');
    await Promise.all([page.waitForURL(/\/events\/?$/, { timeout: 20_000 }), browseEventsLink.click()]);
  });

  test('navigates to /auth/register from the hero Sign up CTA', async ({ page }) => {
    await page.goto('/');
    const signUpLink = page.locator('#hero-section').getByRole('link', { name: 'Sign up', exact: true });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute('href', '/auth/register');
    await Promise.all([page.waitForURL(/\/auth\/register\/?$/, { timeout: 20_000 }), signUpLink.click()]);
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible({ timeout: 20_000 });
  });

  test('redirects to /auth/login when unauthenticated user clicks Host with Gatherle', async ({ page }) => {
    await page.goto('/');
    const hostLink = page.locator('#hero-section').getByRole('link', { name: 'Host with Gatherle', exact: true });
    await expect(hostLink).toBeVisible();
    await expect(hostLink).toHaveAttribute('href', '/account/events/create');
    await Promise.all([page.waitForURL(/\/auth\/login\/?(?:\?.*)?$/, { timeout: 20_000 }), hostLink.click()]);
    await expectLoginPage(page);
  });
});
