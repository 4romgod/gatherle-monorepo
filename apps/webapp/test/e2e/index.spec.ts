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
        timeout: 20_000,
      },
    );
    await expect(heroSection.getByRole('link', { name: 'Browse events' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'Sign up' })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: 'Host with Ntlango' })).toBeVisible();
  });

  test('navigates to /events from the hero Browse events CTA', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hero-section').getByRole('link', { name: 'Browse events' }).click();
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });
  });

  test('navigates to /auth/register from the hero Sign up CTA', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hero-section').getByRole('link', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/auth\/register\/?$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible({ timeout: 20_000 });
  });

  test('redirects to /auth/login when unauthenticated user clicks Host with Ntlango', async ({ page }) => {
    await page.goto('/');
    await page.locator('#hero-section').getByRole('link', { name: 'Host with Ntlango' }).click();
    await expectLoginPage(page);
  });
});
