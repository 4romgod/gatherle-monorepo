import { expect, type Page } from '@playwright/test';

const debugHoldMs = Number(process.env.PLAYWRIGHT_DEBUG_HOLD_MS ?? 0);

export async function holdForDebug(page: Page): Promise<void> {
  if (debugHoldMs > 0) {
    await page.waitForTimeout(debugHoldMs);
  }
}

export async function expectLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/auth\/login\/?(?:\?.*)?$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible({ timeout: 20_000 });
}
