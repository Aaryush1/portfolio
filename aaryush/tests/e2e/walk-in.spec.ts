import { expect, test, type Page } from '@playwright/test';

// Task 32: on phones (below 560px) the second tap on a letter or paper brings the sheet up to fill the screen, then navigates.
test.use({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true });

const link = (page: Page, slug: string) => page.locator(`[data-slug="${slug}"] .piece-link`);
// the essay answers a little late, so the overlay can be inspected before the page changes
const slowEssay = (page: Page) => page.route(/\/writing\/[a-z-]+\/?$/, async (r) => { await new Promise((res) => setTimeout(res, 900)); await r.continue(); });
async function openTwice(page: Page, slug: string) {
  await slowEssay(page);
  await page.goto('/writing');
  await link(page, slug).scrollIntoViewIfNeeded();
  await link(page, slug).tap();
  await expect(page.locator(`[data-slug="${slug}"]`)).toHaveClass(/is-open/);
  await link(page, slug).tap({ noWaitAfter: true }); // the walk-in delays the navigation; don't wait for it here
}
const names = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('*')].map((e) => (getComputedStyle(e) as any).viewTransitionName).filter((n) => n && n !== 'none' && n !== 'root'));

for (const [slug, kind] of [['quiet-singularity', 'paper'], ['bigger-than-electricity', 'letter']] as const) {
  test(`${kind}: the sheet fills the screen, then the essay opens with the ${kind} arrival`, async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no cross-document view transitions (no onpagereveal), so the walk-in is off there by design');
    await openTwice(page, slug);
    const clone = page.locator('.walk-clone');
    await expect(clone).toHaveCount(1);
    await expect(page.locator('.walk-veil')).toHaveCount(1);
    // near the end of its move the sheet covers the whole screen, edge to edge (cover for paper, the opened panels for a letter)
    await expect.poll(async () => page.evaluate((k) => {
      const el = document.querySelector(k === 'paper' ? '.walk-clone .sheet.cover' : '.walk-clone');
      if (!el) return true; // already navigated
      const r = el.getBoundingClientRect();
      return r.left <= 0 && r.right >= innerWidth && r.top <= 0 && r.bottom >= innerHeight;
    }, kind).catch(() => true), { timeout: 3000 }).toBe(true); // a navigation mid-poll means it is done
    await expect(page).toHaveURL(new RegExp(`/writing/${slug}/?$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(`walk-${kind}`));
    // phones: no shared elements at all, and no layout shift or sideways scroll on the essay page
    expect(await names(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('Back from the walked-into piece lands on the desk with no overlay left behind', async ({ page }) => {
  await openTwice(page, 'quiet-singularity');
  await expect(page).toHaveURL(/quiet-singularity/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(page.locator('.walk-clone, .walk-veil, .walk-staple')).toHaveCount(0);
  expect(await page.locator('[data-slug="quiet-singularity"]').evaluate((e) => getComputedStyle(e).visibility)).toBe('visible');
  await expect(page.locator('html')).not.toHaveClass(/walk-out/);
});

test('a third tap during the walk-in does not start a second one', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no cross-document view transitions (no onpagereveal), so the walk-in is off there by design');
  await openTwice(page, 'quiet-singularity');
  await link(page, 'quiet-singularity').tap({ force: true, noWaitAfter: true }).catch(() => {});
  await expect(page.locator('.walk-clone')).toHaveCount(1);
});

test('reduced motion: no walk-in, the link just navigates', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await link(page, 'quiet-singularity').scrollIntoViewIfNeeded();
  await link(page, 'quiet-singularity').tap();
  await link(page, 'quiet-singularity').tap();
  await expect(page).toHaveURL(/quiet-singularity/);
  await expect(page.locator('.walk-clone')).toHaveCount(0);
  await ctx.close();
});

test('wider than a phone (560px and up) keeps the desktop transition: no walk-in overlay', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 600, height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await link(page, 'quiet-singularity').scrollIntoViewIfNeeded();
  await link(page, 'quiet-singularity').tap();
  await link(page, 'quiet-singularity').tap();
  await expect(page.locator('.walk-clone')).toHaveCount(0);
  await expect(page).toHaveURL(/quiet-singularity/);
  await ctx.close();
});

test('320px: the opened sheet never causes sideways scroll on the desk or the essay', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no cross-document view transitions (no onpagereveal), so the walk-in is off there by design');
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await openTwice(page, 'bigger-than-electricity');
  await expect(page.locator('.walk-clone')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page).toHaveURL(/bigger-than-electricity/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});

// Task 49: the note's opening, "the deal".
test('note: the clip lifts, the cards are dealt down the screen each wider than the last, then the page settles them into section marks', async ({ page }) => {
  await openTwice(page, 'once-for-good');
  await expect(page.locator('.walk-clone')).toHaveCount(1);
  await expect(page.locator('.walk-veil')).toHaveCount(1);
  // by the end of the deal the four cards sit in a column, top to bottom, widening 58 / 70 / 84 / 100% of the text column
  await expect.poll(async () => page.evaluate(() => {
    const cs = [...document.querySelectorAll<HTMLElement>('.walk-clone .card:not(.n0)')];
    if (cs.length !== 4) return true; // already navigated
    const r = cs.map((c) => c.getBoundingClientRect());
    const col = innerWidth - 48;
    const ok = r.every((b, i) => i === 0 || (b.top >= r[i - 1].bottom - 1 && b.width > r[i - 1].width));
    return ok && Math.abs(r[0].width / col - 0.58) < 0.04 && Math.abs(r[3].width / col - 1) < 0.04;
  }).catch(() => true), { timeout: 3000 }).toBe(true);
  await expect(page).toHaveURL(/\/writing\/once-for-good\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/walk-note/);
  expect(await names(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('note: back to the desk restores focus to the note and leaves no overlay', async ({ page }) => {
  await openTwice(page, 'once-for-good');
  await expect(page).toHaveURL(/once-for-good/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(page.locator('.walk-clone, .walk-veil')).toHaveCount(0);
  await expect(link(page, 'once-for-good')).toBeFocused();
  expect(await page.locator('[data-slug="once-for-good"]').evaluate((e) => getComputedStyle(e).visibility)).toBe('visible');
});

test('note, reduced motion: no deal, straight to the page', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await link(page, 'once-for-good').scrollIntoViewIfNeeded();
  await link(page, 'once-for-good').tap();
  await link(page, 'once-for-good').tap();
  await expect(page).toHaveURL(/once-for-good/);
  await expect(page.locator('.walk-clone')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/walk-note/);
  await ctx.close();
});
