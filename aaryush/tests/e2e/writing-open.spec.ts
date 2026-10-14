import { expect, test, type Page } from '@playwright/test';

const open = (page: Page, slug: string) => page.locator(`[data-slug="${slug}"] .piece-link`);
const vt = (page: Page, sel: string) =>
  page.locator(sel).evaluate((e) => { const s = getComputedStyle(e) as any; return [s.viewTransitionName, s.viewTransitionClass]; });

test('opening a piece is a real navigation to its URL, and Back restores the desk with focus on that piece', async ({ page, isMobile }) => {
  await page.goto('/writing');
  if (isMobile) { await open(page, 'quiet-singularity').tap(); await open(page, 'quiet-singularity').tap(); }
  else await open(page, 'quiet-singularity').click();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity\/?$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(open(page, 'quiet-singularity')).toBeFocused();
  await expect(page.locator('[data-slug="quiet-singularity"]')).toHaveClass(/is-lit/);
});

test('each piece and its essay head share a view-transition name, and the class tracks the kind', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover');
  await page.goto('/writing');
  // only the piece being opened (hovered, open or keyboard-focused) carries its kind's class; the others are vt-rest,
  // so a neighbour that is merely fading out never plays another piece's opening
  expect(await vt(page, '[data-slug="quiet-singularity"]')).toEqual(['piece-quiet-singularity', 'vt-rest']);
  await page.locator('[data-slug="bigger-than-electricity"]').hover();
  expect(await vt(page, '[data-slug="bigger-than-electricity"]')).toEqual(['piece-bigger-than-electricity', 'vt-letter']);
  expect(await vt(page, '[data-slug="quiet-singularity"]')).toEqual(['piece-quiet-singularity', 'vt-rest']);
  await page.locator('[data-slug="quiet-singularity"]').hover();
  expect(await vt(page, '[data-slug="quiet-singularity"]')).toEqual(['piece-quiet-singularity', 'vt-paper']);
  await page.goto('/writing/quiet-singularity');
  expect(await vt(page, '.essay-head')).toEqual(['piece-quiet-singularity', 'vt-paper']);
  await page.goto('/writing/bigger-than-electricity');
  expect(await vt(page, '.essay-head')).toEqual(['piece-bigger-than-electricity', 'vt-letter']);
});

test('view-transition names are unique on each page (a duplicate would abort the transition)', async ({ page }) => {
  for (const path of ['/writing', '/writing/bigger-than-electricity']) {
    await page.goto(path);
    const names = await page.evaluate(() => [...document.querySelectorAll('*')].map((e) => (getComputedStyle(e) as any).viewTransitionName).filter((n) => n && n !== 'none'));
    expect(new Set(names).size, path).toBe(names.length);
  }
});

test('reduced motion: no view transition names, and navigation is instant', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  expect((await vt(page, '[data-slug="quiet-singularity"]'))[0]).toBe('none');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await expect(page).toHaveURL(/quiet-singularity/);
  expect((await vt(page, '.essay-head'))[0]).toBe('none');
  await ctx.close();
});

test('the kind-specific rules exist in the stylesheet (letter and paper differ)', async ({ page }) => {
  await page.goto('/writing');
  const css = await page.evaluate(() => [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n'));
  expect(css).toMatch(/view-transition-old\(\*\.vt-letter\)/);
  expect(css).toMatch(/view-transition-old\(\*\.vt-paper\)/);
  expect(css).not.toMatch(/view-transition-old\(\*\.vt-sheet\)/); // sheets keep the default cross-fade
});

test('a direct visit to an essay (no desk behind it) works', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Quiet Singularity');
});

test('Back does not start a second dust loop or leave a stale light', async ({ page, isMobile }) => {
  await page.goto('/writing');
  if (isMobile) { await open(page, 'quiet-singularity').tap(); await open(page, 'quiet-singularity').tap(); }
  else await open(page, 'quiet-singularity').click();
  await expect(page).toHaveURL(/quiet-singularity/);
  await page.goBack();
  await expect(page.locator('canvas.dust')).toHaveCount(1);
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'running');
  await expect(page.locator('[data-slug].is-lit')).toHaveCount(1);
});

test('if storage is blocked, Back still lands on the desk without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
  await page.goto('/writing');
  await open(page, 'quiet-singularity').click();
  await expect(page).toHaveURL(/quiet-singularity/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  expect(errors).toEqual([]);
});
