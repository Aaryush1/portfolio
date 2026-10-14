import { expect, test } from '@playwright/test';

for (const path of ['/work/does-not-exist', '/writing/nope', '/definitely/not/here']) {
  test(`${path} shows the designed 404`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sheet not in set.');
    await expect(page.getByRole('link', { name: 'Hero' })).toHaveAttribute('href', '/#hero');
    await expect(page.locator('dialog#popup[open]')).toHaveCount(0);
  });
}

test('/qr still works', async ({ page }) => {
  const res = await page.goto('/qr');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue to site/ })).toHaveAttribute('href', '/');
});
