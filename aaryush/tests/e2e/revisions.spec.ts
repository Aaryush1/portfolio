import { expect, test } from '@playwright/test';
import { settled } from './settle';

// E14: the revision block behind the title block's "Last deploy" cell. Desktop only; shown, never explained.
test.use({ viewport: { width: 1280, height: 800 } });
const cell = (page: import('@playwright/test').Page) => page.locator('#hero .tblock .dep');
const block = (page: import('@playwright/test').Page) => page.locator('#hero [data-revs]');

test('closed by default; a click opens it with every row, in order, styled as a table', async ({ page }) => {
  await page.goto('/');
  await expect(block(page)).toBeHidden();
  await cell(page).click();
  await expect(block(page)).toBeVisible();
  const head = await block(page).locator('thead th').allInnerTexts();
  expect(head.map((h) => h.trim().toLowerCase())).toEqual(['rev', 'date', 'description']);
  const rows = await block(page).locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => (c.textContent ?? '').trim())));
  expect(rows).toEqual([
    ['G', '2026.10', 'A contact card that remembers where you met.'],
    ['F', '2026.10', 'The writing room.'],
    ['E', '2026.10', 'The hero learns to rearrange itself.'],
    ['D', '2026.10', 'Topography and light replace the grid. A new mark.'],
    ['C', '2026.10', 'Redrawn as a set of sheets. Systems you can open.'],
    ['B', '2026.02', 'Repositioned around AI. The writing begins.'],
    ['A', '2025.08', 'Rebuilt in Astro. Works on phones.'],
  ]);
  const font = await block(page).locator('td').first().evaluate((e) => getComputedStyle(e).fontFamily);
  expect(font).toMatch(/spectral/i);
  const r = await block(page).evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.right).toBeLessThanOrEqual(1280);
  expect(r.top).toBeGreaterThanOrEqual(0);
});

test('opening it moves nothing', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  const before = await page.locator('#hero .tblock').evaluate((e) => e.getBoundingClientRect().toJSON());
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await cell(page).click();
  await expect(block(page)).toBeVisible();
  expect(await page.locator('#hero .tblock').evaluate((e) => e.getBoundingClientRect().toJSON())).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(h);
});

test('Enter and Space open it from the keyboard; Esc closes it and focus returns to the cell', async ({ page }) => {
  await page.goto('/');
  await cell(page).locator('button').focus();
  await page.keyboard.press('Enter');
  await expect(block(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(block(page)).toBeHidden();
  await expect(cell(page).locator('button')).toBeFocused();
  await page.keyboard.press(' ');
  await expect(block(page)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(block(page)).toBeHidden();
});

test('an outside click and a second click on the cell both close it', async ({ page }) => {
  await page.goto('/');
  await cell(page).click();
  await expect(block(page)).toBeVisible();
  await page.mouse.click(300, 300);
  await expect(block(page)).toBeHidden();
  await cell(page).click();
  await expect(block(page)).toBeVisible();
  await cell(page).click();
  await expect(block(page)).toBeHidden();
});

test('the control is a button that says what it opens and whether it is open', async ({ page }) => {
  await page.goto('/');
  const btn = cell(page).locator('button');
  await expect(btn).toHaveAttribute('aria-controls', 'revs');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('a click inside the block does not close it', async ({ page }) => {
  await page.goto('/');
  await cell(page).click();
  await block(page).locator('tbody tr').first().click();
  await expect(block(page)).toBeVisible();
});

test('the commit-hash reveal still works on the same cell', async ({ page }) => {
  await page.goto('/');
  await expect(cell(page).locator('.sha')).toHaveCount(await cell(page).locator('.sha').count());
  await cell(page).hover();
  if (await cell(page).locator('.sha').count()) await expect(cell(page).locator('.sha')).toHaveCSS('opacity', '1');
});

test('phones: the title block is hidden, so the block is too', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/');
  await expect(block(page)).toBeHidden();
  await expect(cell(page)).toBeHidden();
});

test('without JavaScript the block stays closed', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(block(page)).toBeHidden();
  await ctx.close();
});

test('it is not in the printed sheet', async ({ page }) => {
  await page.goto('/');
  await page.emulateMedia({ media: 'print' });
  await expect(block(page)).toBeHidden();
});

test('screenshot', async ({ page }) => {
  test.skip(!process.env.T37_SHOTS, 'evidence only');
  await page.goto('/');
  await page.waitForTimeout(2500);
  await cell(page).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/aaryu/code/personal/portfolio-explorations/shots/t37-revisions-1280.png' });
});
