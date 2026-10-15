import { expect, test } from '@playwright/test';

test('writing index lists every published piece', async ({ page }) => {
  await page.goto('/writing');
  const titles = await page.locator('[data-writing-list] .piece-link').allInnerTexts();
  expect([...titles].sort()).toEqual(['Once, for Good', 'The Quiet Singularity', 'This Is Bigger Than Electricity']);
});

test('no-JS: every piece is listed with title, kind, minutes, why and a working link', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const items = page.locator('[data-writing-list] > li');
  await expect(items).toHaveCount(3);
  const first = page.locator('[data-slug="bigger-than-electricity"]');
  await expect(first.getByRole('link', { name: /This Is Bigger Than Electricity — letter, \d+ min read/ })).toHaveAttribute('href', '/writing/bigger-than-electricity');
  await expect(first.locator('.piece-why')).not.toBeEmpty();
  await expect(first.locator('ol.breakdown li')).toHaveCount(4);
  await ctx.close();
});

test('the list never exposes email or phone', async ({ request }) => {
  const html = await (await request.get('/writing')).text();
  expect(html).not.toMatch(/aaryush@outlook\.com|331-2850|\+1949/);
});

test('essay page renders the full letter with reading progress', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This Is Bigger Than Electricity');
  await expect(page.locator('article')).toContainText(/Don.t let them grow up in a world we were too quiet to shape./);
  const bar = page.locator('[data-reading-progress]');
  const start = Number(await bar.evaluate((el) => getComputedStyle(el).getPropertyValue('--progress') || '0'));
  await page.evaluate(() => window.scrollBy(0, 4000)); // mouse.wheel is unsupported on mobile WebKit
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
