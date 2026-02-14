import { expect, test } from '@playwright/test';
import { expectLoginPage, holdForDebug } from './helpers';

test.describe('Organizations Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /organizations hero section', async ({ page }) => {
    await page.goto('/organizations');
    const heroHeading = page.getByRole('heading', { name: 'Community spaces on Ntlango' });
    const heroSection = heroHeading.locator('xpath=..');

    await expect(heroHeading).toBeVisible({ timeout: 20_000 });
    await expect(heroSection.getByRole('link', { name: /^Browse Events$/ })).toBeVisible();
    await expect(heroSection.getByRole('link', { name: /^Create Organization$/ })).toBeVisible();
  });

  test('navigates to /events from organizations page CTA', async ({ page }) => {
    await page.goto('/organizations');
    const heroSection = page.getByRole('heading', { name: 'Community spaces on Ntlango' }).locator('xpath=..');

    await heroSection.getByRole('link', { name: /^Browse Events$/ }).click();
    await expect(page).toHaveURL(/\/events\/?$/, { timeout: 20_000 });
  });

  test('redirects unauthenticated users to /auth/login from create organization CTA', async ({ page }) => {
    await page.goto('/organizations');
    const heroSection = page.getByRole('heading', { name: 'Community spaces on Ntlango' }).locator('xpath=..');

    await heroSection.getByRole('link', { name: /^Create Organization$/ }).click();
    await expectLoginPage(page);
  });
});
