import { expect, test } from '@playwright/test';

test('writing index lists essays newest first', async ({ page }) => {
  await page.goto('/writing');
  const titles = await page.locator('[data-writing-list] h2').allInnerTexts();
  expect(titles).toEqual(['This Is Bigger Than Electricity', 'The Quiet Singularity']);
});

test('essay page renders the full letter with reading progress', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This Is Bigger Than Electricity');
  await expect(page.locator('article')).toContainText(/Don.t let them grow up in a world we were too quiet to shape./);
  const bar = page.locator('[data-reading-progress]');
  const start = Number(await bar.evaluate((el) => getComputedStyle(el).getPropertyValue('--progress') || '0'));
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(300);
  const later = Number(await bar.evaluate((el) => getComputedStyle(el).getPropertyValue('--progress')));
  expect(later).toBeGreaterThan(start);
});

test('paper page keeps references and the PDF download', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('.references li')).toHaveCount(16);
  const pdf = page.getByRole('link', { name: /Download PDF/ });
  await expect(pdf).toHaveAttribute('href', '/quiet-singularity.pdf');
  const res = await page.request.get('/quiet-singularity.pdf');
  expect(res.status()).toBe(200);
});

test('essay pages link back to the writing index and home', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('link', { name: /All writing/ })).toHaveAttribute('href', '/writing');
});
