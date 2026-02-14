import { expect, test } from '@playwright/test';
import { holdForDebug } from './helpers';

test.describe('403 Page', () => {
  test.afterEach(async ({ page }) => {
    await holdForDebug(page);
  });

  test('renders /403 with an access denied message and home CTA', async ({ page }) => {
    await page.goto('/403');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByText('403')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  });
});
