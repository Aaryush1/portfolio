import { expect, test, type Page } from '@playwright/test';
import { settled } from './settle';
import { afternoon, pinAfternoon } from './afternoon';

// Task 42: the paper's flag travels with its sheet, the letter's closing label, and the writing-room review fixes W1 to W10.
pinAfternoon();

const paper = (page: Page) => page.locator('[data-piece][data-slug="quiet-singularity"]');
const letter = (page: Page) => page.locator('[data-piece][data-slug="bigger-than-electricity"]');
const seed = (page: Page) => page.addInitScript((m) => { if (!localStorage.getItem('writing:v1')) localStorage.setItem('writing:v1', JSON.stringify(m)); }, {
  v: 1, pieces: { 'quiet-singularity': { sec: 2, t: 2 }, 'bigger-than-electricity': { sec: 1, t: 1 } }, last: 'quiet-singularity',
});
const open = (loc: ReturnType<typeof paper>) => loc.evaluate((e) => e.classList.add('is-lit', 'is-open'));
const close = (loc: ReturnType<typeof paper>) => loc.evaluate((e) => e.classList.remove('is-lit', 'is-open'));

for (const w of [1280, 430, 360]) {
  test(`the paper's flag is a child of its section's sheet and travels with it, closed and open, at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await seed(page);
    await page.goto('/writing');
    const flag = paper(page).locator('.flag');
    await expect(flag).toHaveCount(1);
    // section III (index 2) is the sheet that fans out three steps
    expect(await flag.evaluate((f) => f.parentElement?.classList.contains('sheet') && getComputedStyle(f.parentElement).getPropertyValue('--i').trim())).toBe('3');
    await paper(page).scrollIntoViewIfNeeded();
    await close(paper(page));
    await settled(page);
    const closed = await flag.boundingBox();
    const sheet = paper(page).locator('.sheet').nth(3); // children: sheets with --i 6..1, so index 3 is --i 3
    const sheetClosed = await sheet.boundingBox();
    await open(paper(page));
    await settled(page);
    const opened = await flag.boundingBox();
    const sheetOpen = await sheet.boundingBox();
    // the sheet moved down by its fan distance and the flag moved with it (no separate offset beyond its own settling on the strip)
    expect(sheetOpen!.y - sheetClosed!.y).toBeGreaterThan(100);
    expect(opened!.y - closed!.y).toBeGreaterThan(100);
    // it still sits on the sheet's right edge and inside the screen
    expect(opened!.x + opened!.width).toBeLessThanOrEqual(w);
    expect(closed!.x + closed!.width).toBeLessThanOrEqual(w);
    expect(Math.abs(opened!.x + opened!.width / 2 - (sheetOpen!.x + sheetOpen!.width))).toBeLessThan(30);
    // opened, it sits on its sheet's visible strip, level with the section's label
    const label = await paper(page).locator('.breakdown li').nth(2).boundingBox();
    expect(Math.abs(opened!.y + opened!.height / 2 - (label!.y + label!.height / 2))).toBeLessThan(24);
  });
}

for (const w of [1280, 430]) {
  test(`the letter's closing label sits where the middle folds' labels do, with the why below it, at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/writing');
    await letter(page).scrollIntoViewIfNeeded();
    await open(letter(page));
    await settled(page);
    const top = (n: number) => letter(page).locator('.breakdown li').nth(n).locator('.ph-label').evaluate((e) => {
      const li = e.closest('li') as HTMLElement;
      return e.getBoundingClientRect().top - li.getBoundingClientRect().top;
    });
    const mid = await top(2), last = await top(3);
    // both measured from the top of their own panel (the panels are foreshortened, so allow for the fold's perspective)
    expect(Math.abs(last - mid)).toBeLessThan(12);
    if (w > 600) {
      // the why's first line of text starts under the label (the box itself spans the whole closing panel)
      const whyTop = await letter(page).locator('.piece-why').evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().top; });
      const label = await letter(page).locator('.breakdown li').nth(3).locator('.ph-label').boundingBox();
      expect(label!.y + label!.height).toBeLessThanOrEqual(whyTop + 2);
    }
  });
}

test('W5: the breakdown and the desk keep list semantics', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('ol.breakdown').first()).toHaveAttribute('role', 'list');
  await expect(page.locator('ul.pieces')).toHaveAttribute('role', 'list');
});

test('W1: Back puts focus on the piece once; a later visit to the desk does not', async ({ page }) => {
  await page.goto('/writing');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await page.waitForURL(/quiet-singularity/);
  await page.goBack();
  await expect(page.locator('[data-slug="quiet-singularity"] .piece-link')).toBeFocused();
  // the marker was consumed: it is gone from this history entry
  expect(await page.evaluate(() => (history.state as { deskLast?: string } | null)?.deskLast ?? null)).toBeNull();
  // a new visit with the same remembered piece in storage restores nothing
  await page.goto('/');
  await page.goto('/writing');
  expect(await page.evaluate(() => document.activeElement?.closest('[data-piece]') !== null)).toBe(false);
});

test('W4: a mouse click on a narrow window follows the link at once; the two-step is for touch', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/writing');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity/);
});

test('W9: moving the light between pieces announces lit without an unlit in between', async ({ page }) => {
  await page.goto('/writing');
  await page.evaluate(() => {
    (window as any).__ev = [];
    for (const t of ['piece:lit', 'piece:unlit']) document.addEventListener(t, () => (window as any).__ev.push(t));
  });
  await page.keyboard.press('ArrowRight'); // from the page itself: lights the first piece (Safari's Tab skips links, so don't rely on it)
  await page.evaluate(() => { (window as any).__ev.length = 0; });
  await page.keyboard.press('ArrowRight');
  const ev = await page.evaluate(() => (window as any).__ev as string[]);
  expect(ev).toContain('piece:lit');
  expect(ev).not.toContain('piece:unlit');
});

test('W10: the drawer stays open when the window loses focus (a null focus target with no document focus)', async ({ page }) => {
  await page.goto('/writing');
  const front = page.getByRole('button', { name: 'Writing in progress' });
  await front.click();
  await expect(front).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => {
    document.hasFocus = () => false;
    (document.querySelector('.drawer-front') as HTMLElement).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  });
  await expect(front).toHaveAttribute('aria-expanded', 'true');
  // a real blur while the document has focus still closes it
  await page.evaluate(() => {
    document.hasFocus = () => true;
    (document.querySelector('.drawer-front') as HTMLElement).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
  });
  await expect(front).toHaveAttribute('aria-expanded', 'false');
});

test('W2: reduced motion removes every transition from the desk objects', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing');
  for (const sel of ['[data-slug="quiet-singularity"]', '[data-slug="quiet-singularity"] .sheet', '[data-slug="bigger-than-electricity"] .fold', '[data-slug="bigger-than-electricity"] .breakdown li', '[data-slug="once-for-good"] .card']) {
    const d = await page.locator(sel).first().evaluate((e) => getComputedStyle(e).transitionDuration.split(',').map((x) => parseFloat(x)));
    expect(d.every((x) => x === 0), sel).toBe(true);
  }
  await ctx.close();
});

test('W8: the citation sheet drops its inline width when the window narrows to a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/writing/quiet-singularity');
  const m = page.locator('button.cite').first();
  await m.scrollIntoViewIfNeeded();
  await m.click();
  expect(await page.locator('#cite-sheet').evaluate((e) => (e as HTMLElement).style.width)).not.toBe('');
  await page.setViewportSize({ width: 400, height: 800 });
  await expect.poll(() => page.locator('#cite-sheet').evaluate((e) => (e as HTMLElement).style.width)).toBe('');
});

test('A3: a note offers "card N" with an Arabic numeral; a paper keeps "section II"', async ({ page }) => {
  await page.addInitScript((m) => localStorage.setItem('writing:v1', JSON.stringify(m)), { v: 1, pieces: { 'once-for-good': { sec: 1, t: 1 }, 'quiet-singularity': { sec: 1, t: 1 } } });
  await page.goto('/writing/once-for-good');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveText('Pick up where you left off — card 2');
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveText('Pick up where you left off — section II');
});

test('the thumbprint sits mid-fold, above the fold shading, under the labels', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const print = letter(page).locator('.fold-2 > .print');
  await expect(print).toHaveCount(1);
  const { fold, pr, z } = await print.evaluate((p) => {
    const f = (p.parentElement as HTMLElement).getBoundingClientRect(); const r = p.getBoundingClientRect();
    return { fold: { t: f.top, h: f.height }, pr: { t: r.top, h: r.height }, z: getComputedStyle(p).zIndex };
  });
  expect(Math.abs(pr.t + pr.h / 2 - (fold.t + fold.h / 2))).toBeLessThan(6);
  expect(z).toBe('1');
});
