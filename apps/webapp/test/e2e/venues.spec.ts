import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Venues Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /venues hero section', async ({ page }) => {
    await page.goto('/venues');
    const heroHeading = page.getByRole('heading', { name: 'Discover event spaces' });
    const heroSection = heroHeading.locator('xpath=..');

    await expect(heroHeading).toBeVisible({ timeout: 20_000 });
    await expect(heroSection.getByRole('link', { name: /^Browse Events$/ })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: /^Add Venue$/ })).toBeVisible();
  });

  test('navigates to /events from venues page CTA', async ({ page }) => {
    await page.goto('/venues');
    const heroSection = page.getByRole('heading', { name: 'Discover event spaces' }).locator('xpath=..');

    await heroSection.getByRole('link', { name: /^Browse Events$/ }).click();
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });
  });

  test('redirects unauthenticated users to /auth/login from add venue CTA', async ({ page }) => {
    await page.goto('/venues');
    const heroSection = page.getByRole('heading', { name: 'Discover event spaces' }).locator('xpath=..');

    await heroSection.getByRole('link', { name: /^Add Venue$/ }).click();
    await expectLoginPage(page);
  });
});
