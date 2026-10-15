import { expect, test, type Page, type Locator } from '@playwright/test';
import { afternoon, pinAfternoon } from './afternoon';

pinAfternoon();

// The home teaser remembers you in words: each started piece it lists carries "Keep reading · <place> →" on its date line (an amber dot
// leads it), and a started piece it does not list gets one named "Pick up <Title> →" link at the foot. The desk keeps its own marks.
const mem = JSON.stringify({ v: 1, pieces: { 'quiet-singularity': { sec: 2, t: 2 }, 'bigger-than-electricity': { sec: 1, t: 1 } }, last: 'quiet-singularity' });
const seed = (page: Page) => page.addInitScript((m) => localStorage.setItem('writing:v1', m), mem);

const rect = (l: Locator) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, h: r.height }; });
type R = { l: number; t: number; r: number; b: number };
const hits = (a: R, b: R) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const sectionHeight = (page: Page) => page.evaluate(async () => { await document.fonts.ready; return document.getElementById('writing')!.getBoundingClientRect().height; });

for (const width of [320, 360, 390, 412, 720, 1280]) {
  test(`home teaser, ${width}px: "Keep reading" sits on the date line, never wraps, and the section does not change height`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const before = await sectionHeight(page);
    await expect(page.locator('#writing .keep')).toHaveCount(0);
    await page.evaluate((m) => localStorage.setItem('writing:v1', m), mem);
    await page.reload();
    await expect(page.locator('#writing .keep')).toHaveCount(2);
    expect(await sectionHeight(page), 'section height with and without memory').toBe(before);

    const row = page.locator('#writing .post[data-slug="quiet-singularity"]');
    const keep = row.locator('.keep');
    await expect(keep).toHaveAttribute('href', '/writing/quiet-singularity#pickup');
    await expect(keep).toHaveAccessibleName('Keep reading The Quiet Singularity, section III');
    await expect(keep.locator('.k')).toHaveText('Keep reading');
    // paper: Roman section, letter: fold, from the same memory
    await expect(keep.locator('.k-place')).toContainText('section III');
    await expect(page.locator('#writing .post[data-slug="bigger-than-electricity"] .k-place')).toContainText('fold 2');
    // under about 400px the place drops off; wider it shows
    if (width < 400) await expect(keep.locator('.k-place')).toBeHidden(); else await expect(keep.locator('.k-place')).toBeVisible();
    // the amber dot leads the link
    expect(await keep.locator('.k').evaluate((e) => { const s = getComputedStyle(e, '::before'); return { w: s.width, bg: s.backgroundColor }; })).toEqual({ w: '6px', bg: 'rgb(242, 181, 68)' });
    // one line on phones: the whole date line is no taller than the bare date; elsewhere it stays inside the row's own height
    const when = await rect(row.locator('.when'));
    const time = await rect(row.locator('time'));
    if (width < 720) expect(when.h, 'date line is one line').toBeLessThanOrEqual(time.h + 1);
    expect(when.r, 'inside the viewport').toBeLessThanOrEqual(width);
    const kr = await rect(keep);
    expect(hits(kr, await rect(row.locator('h3'))), 'keep vs title').toBe(false);
    expect(hits(kr, await rect(row.locator('time'))), 'keep vs date').toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // the row is still one link target for the title, and no ribbon or old generic link survives
    await expect(page.locator('#writing .ribbon')).toHaveCount(0);
    await expect(page.locator('#writing').getByText('Pick up where you left off')).toHaveCount(0);
  });
}

test('home teaser: the date and the title stay a link to the piece, and Keep reading goes to the remembered place', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.locator('#writing .post[data-slug="quiet-singularity"] .post-link')).toHaveAttribute('href', '/writing/quiet-singularity');
  await page.locator('#writing .post[data-slug="quiet-singularity"] .keep').scrollIntoViewIfNeeded();
  await page.locator('#writing .post[data-slug="quiet-singularity"] .keep').click();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity#pickup$/);
  await page.waitForFunction(() => document.activeElement?.tagName === 'H2');
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim().startsWith('III.'))).toBe(true);
});

for (const width of [320, 430, 1280]) {
  test(`the desk's own marks, ${width}px, never meet a title`, async ({ page }) => {
    await seed(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/writing');
    await expect(page.locator('[data-slug="quiet-singularity"] .flag')).toBeAttached();
    await expect(page.locator('[data-piece] > .ribbon')).toHaveCount(0);
    const flag = await rect(page.locator('[data-slug="quiet-singularity"] .flag'));
    expect(hits(flag, await rect(page.locator('[data-slug="quiet-singularity"] .piece-link'))), 'flag vs title').toBe(false);
    expect(await page.locator('[data-slug="bigger-than-electricity"] .fold .print').count()).toBe(1);
  });
}

// The teaser lists three pieces and the collection has three, so "a started piece the teaser does not list" is staged with the page's own test hook
// (window.__test_teaserCount trims the listed rows before anything reads them): the remaining piece counts as off the page.
const trim = (page: Page, n: number) => page.addInitScript((c) => { (window as any).__test_teaserCount = c; }, n);

for (const width of [320, 390, 1280]) {
  test(`home teaser, ${width}px: a started piece the teaser does not list gets one named bottom link, with its height reserved before first paint`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await trim(page, 2);
    await page.goto('/');
    const before = await sectionHeight(page);
    await expect(page.locator('#writing .post')).toHaveCount(2);
    const link = page.locator('[data-pickup-home]');
    await expect(link).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-wr-off', '');
    // the teaser lists newest first (once-for-good, then the letter), so the paper is the unlisted piece
    await page.evaluate((m) => localStorage.setItem('writing:v1', m), mem);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-wr-off', '');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/writing/quiet-singularity#pickup');
    await expect(link).toHaveText('Pick up The Quiet Singularity \u2192');
    expect(await link.locator('em').evaluate((e) => getComputedStyle(e).fontStyle)).toBe('italic');
    // one line, inside the viewport, under "All writing"
    const lr = await rect(link);
    expect(lr.r).toBeLessThanOrEqual(width);
    expect(lr.h).toBeLessThan(40);
    expect(lr.t).toBeGreaterThan((await rect(page.locator('#writing .more'))).b - 1);
    expect(await sectionHeight(page) - before, 'the only growth is the reserved line').toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('home teaser: nothing shifts when the named link fills in (its line is reserved at render)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await trim(page, 2);
  await seed(page);
  await page.route('**/*.js', (r) => r.abort()); // no module scripts: only the inline first-paint script runs
  await page.goto('/');
  const reserved = await sectionHeight(page);
  await expect(page.locator('[data-pickup-home]')).toHaveText('');
  await page.unroute('**/*.js');
  await page.reload();
  await expect(page.locator('[data-pickup-home]')).toBeVisible();
  expect(await sectionHeight(page), 'height with the link filled in').toBe(reserved);
});

test('home teaser: when every started piece is listed there is no bottom link', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.locator('#writing .keep')).toHaveCount(2);
  await expect(page.locator('[data-pickup-home]')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-wr-off', '');
});

test('home teaser: with two off the page, the bottom link names the most recently read one', async ({ page }) => {
  await trim(page, 1);
  await seed(page);
  await page.goto('/');
  // both started pieces are unlisted; quiet-singularity (t=2) was read more recently than bigger-than-electricity (t=1)
  await expect(page.locator('#writing .post')).toHaveCount(1);
  await expect(page.locator('[data-pickup-home]')).toHaveAttribute('href', '/writing/quiet-singularity#pickup');
});

test('home teaser: storage that throws shows nothing and breaks nothing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.locator('#writing .post')).toHaveCount(3);
  await expect(page.locator('#writing .keep')).toHaveCount(0);
  await expect(page.locator('[data-pickup-home]')).toBeHidden();
  expect(errors).toEqual([]);
});

test('screenshots', async ({ browser }) => {
  test.skip(!process.env.T51_SHOTS, 'evidence only');
  const dir = 'C:/Users/aaryu/code/personal/portfolio-explorations/shots';
  for (const [w, name, hook] of [[1280, 't51-two-started-1280', 0], [390, 't51-two-started-390', 0], [390, 't51-off-page-390', 2]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 700, isMobile: w < 700, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await afternoon(page);
    await seed(page);
    if (hook) await trim(page, hook);
    await page.goto('/');
    await page.locator('#writing').scrollIntoViewIfNeeded();
    await page.addStyleTag({ content: '.top,.skip{display:none !important}' });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(1400);
    await page.locator('#writing').screenshot({ path: `${dir}/${name}.png` });
    await ctx.close();
  }
});
