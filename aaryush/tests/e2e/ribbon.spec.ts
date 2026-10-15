import { expect, test, type Page, type Locator } from '@playwright/test';
import { settled } from './settle';
import { afternoon, pinAfternoon } from './afternoon';

pinAfternoon();

// The remembered-reading marks never touch a title: a margin ribbon on hover devices (only while the pick-up link is
// hovered or focused), a small dot beside the date on touch devices, and the desk's own tick.
const mem = JSON.stringify({ v: 1, pieces: { 'quiet-singularity': { sec: 2, t: 2 }, 'bigger-than-electricity': { sec: 1, t: 1 } }, last: 'quiet-singularity' });
const seed = (page: Page) => page.addInitScript((m) => localStorage.setItem('writing:v1', m), mem);

const rect = (l: Locator) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
type R = { l: number; t: number; r: number; b: number };
const hits = (a: R, b: R) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

for (const width of [320, 375, 430, 620, 720, 899, 900, 1100, 1280]) {
  test(`home teaser, hover device, ${width}px: ribbon is hidden at rest, appears on hover or focus, and never meets the title`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover and keyboard focus only; the touch device tests below cover phones');
    await seed(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const row = page.locator('#writing a.post[href="/writing/quiet-singularity"]');
    const ribbon = row.locator('.ribbon');
    const link = page.locator('[data-pickup-home]');
    await link.scrollIntoViewIfNeeded();
    await settled(page);
    await page.waitForTimeout(400); // scroll-reveal transitions
    await expect(ribbon).toHaveCount(1);
    await expect(ribbon).toHaveCSS('opacity', '0');
    await link.hover();
    await expect(ribbon).toHaveCSS('opacity', '1');
    const rr = await rect(ribbon);
    expect(rr.l, 'inside the viewport').toBeGreaterThanOrEqual(0);
    for (const t of await page.locator('#writing .post h3').all()) expect(hits(rr, await rect(t)), 'ribbon vs title').toBe(false);
    expect(hits(rr, await rect(row.locator('time'))), 'ribbon vs date').toBe(false);
    await page.mouse.move(0, 0);
    await expect(ribbon).toHaveCSS('opacity', '0');
    await link.focus();
    await expect(ribbon).toHaveCSS('opacity', '1');
    await link.blur();
    await expect(ribbon).toHaveCSS('opacity', '0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [320, 375, 430, 720]) {
  test(`home teaser, touch device, ${width}px: a dot beside the date, no ribbon, no overlap`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await afternoon(page);
    await seed(page);
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
    const row = page.locator('#writing a.post[href="/writing/quiet-singularity"]');
    await expect(row.locator('.ribbon')).toBeHidden();
    const dot = await row.locator('time').evaluate((t) => { const s = getComputedStyle(t, '::after'); return { c: s.content, w: s.width, bg: s.backgroundColor }; });
    expect(dot.c).toBe('""');
    expect(dot.w).toBe('6px');
    expect(dot.bg).toBe('rgb(242, 181, 68)');
    const plain = page.locator('#writing a.post').filter({ hasNot: page.locator('.ribbon') }).first();
    if (await plain.count()) expect(await plain.locator('time').evaluate((t) => getComputedStyle(t, '::after').content)).toBe('none');
    const tr = await rect(row.locator('time'));
    for (const t of await page.locator('#writing .post h3').all()) expect(hits(tr, await rect(t)), 'date+dot vs title').toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });
}

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

test('screenshots', async ({ browser }) => {
  test.skip(!process.env.T37_SHOTS, 'evidence only');
  const dir = 'C:/Users/aaryu/code/personal/portfolio-explorations/shots';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await afternoon(page);
  await seed(page);
  await page.goto('/');
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator('#writing').screenshot({ path: `${dir}/t37-teaser-1280-rest.png` });
  await page.locator('[data-pickup-home]').hover();
  await page.waitForTimeout(500);
  await page.locator('#writing').screenshot({ path: `${dir}/t37-teaser-1280-hover.png` });
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 430, height: 900 }, hasTouch: true, isMobile: true });
  const mp = await m.newPage();
  await afternoon(mp);
  await seed(mp);
  await mp.goto('/');
  await mp.locator('#writing').scrollIntoViewIfNeeded();
  await mp.waitForTimeout(1200);
  await mp.locator('#writing').screenshot({ path: `${dir}/t37-teaser-430.png` });
  await m.close();
});
