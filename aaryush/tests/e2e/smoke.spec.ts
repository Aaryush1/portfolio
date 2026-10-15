import { expect, test } from '@playwright/test';

test('home responds and names Aaryush', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aaryush Gupta');
});
