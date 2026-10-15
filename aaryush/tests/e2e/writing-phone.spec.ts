import { expect, test, type Page } from '@playwright/test';
import { afternoon, pinAfternoon } from './afternoon';
import { settled } from './settle';

pinAfternoon();

// Task 31: phone polish on /writing, the paper pile pill, and footnotes as a preview sheet.
const phone = { hasTouch: true, isMobile: true };

for (const w of [360, 375, 412, 430]) {
  test(`/writing at ${w}px: pieces are centred with a 16px gutter at least, even lifted`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 812 }, ...phone });
    const page = await ctx.newPage();
    await afternoon(page);
    await page.goto('/writing');
    await expect(page.locator('[data-piece].is-lit')).toHaveCount(1); // the nearest piece lights and lifts
    await settled(page);
    const rects = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; }));
    for (const r of rects) {
      expect(r.l).toBeGreaterThanOrEqual(16);
      expect(r.r).toBeLessThanOrEqual(w - 16);
      expect(Math.abs((r.l + r.r) / 2 - w / 2)).toBeLessThan(3);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });
}

for (const [w, h] of [[375, 812], [430, 932], [360, 740]]) {
  test(`/writing at ${w}x${h}: each piece gets its own screen, centred, objects at ~60% height (Task 49)`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...phone });
    const page = await ctx.newPage();
    await afternoon(page);
    await page.goto('/writing');
    const pieces = page.locator('[data-piece]');
    const n = await pieces.count();
    expect(n).toBeGreaterThan(1);
    const box = async (i: number) => (await pieces.nth(i).boundingBox())!;
    const first = await box(0);
    expect(first.height).toBeLessThan(478 * 0.7);
    // the first piece sits in the middle of the first screen, below the "Writing" heading
    expect(Math.abs(first.y + first.height / 2 - h / 2)).toBeLessThan(h * 0.14);
    expect(first.y).toBeGreaterThan((await page.locator('h1').boundingBox())!.y);
    // and the next one is a whole screen further down: never more than a sliver of it shows on the first screen
    expect((await box(1)).y).toBeGreaterThanOrEqual(h - 4);
    // every piece, scrolled to, is centred in its own screen
    for (let i = 1; i < n; i++) {
      await pieces.nth(i).evaluate((e) => e.scrollIntoView({ block: 'center' }));
      const b = await box(i);
      expect(Math.abs(b.y + b.height / 2 - (h + 60) / 2)).toBeLessThan(h * 0.14);
      expect(b.y).toBeGreaterThan(40);
      expect(b.y + b.height).toBeLessThan(h);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });
}

test('phones: the piece nearest the middle of the screen is the lit one, and the light follows as you scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...phone });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing');
  const lit = () => page.locator('[data-piece].is-lit').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
  const slugs = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
  await expect.poll(lit).toEqual([slugs[0]]);
  await page.locator('[data-piece]').nth(1).evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await expect.poll(lit).toEqual([slugs[1]]);
  // each piece carries its own pool of light
  expect(await page.locator('[data-piece]').first().evaluate((e) => getComputedStyle(e, '::after').backgroundImage)).toContain('radial-gradient');
  await ctx.close();
});

test('phones: a faint drift of dust invites a scroll, says nothing, and goes for good once you scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...phone });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing');
  const cue = page.locator('[data-scroll-cue]');
  await expect(cue).toHaveAttribute('aria-hidden', 'true');
  expect(((await cue.textContent()) ?? '').trim()).toBe('');
  await expect(cue).toHaveClass(/is-on/, { timeout: 4000 });
  expect(await cue.locator('i').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('cue-drift');
  await page.mouse.wheel(0, 400);
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(cue).toHaveClass(/is-off/);
  await expect(cue).not.toHaveClass(/is-on/);
  await expect(cue).toHaveCSS('opacity', '0');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await expect(cue).not.toHaveClass(/is-on/); // it does not come back
  await ctx.close();
});

test('reduced motion: the scroll cue is a still hint, no animation', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...phone, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const cue = page.locator('[data-scroll-cue]');
  await expect(cue).toHaveClass(/is-on/, { timeout: 4000 });
  expect(await cue.locator('i').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  expect(Number(await cue.locator('i').first().evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.2);
  await ctx.close();
});

test('desktop: no scroll cue, and the desk is unchanged (pieces side by side)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  await expect(page.locator('[data-scroll-cue]')).toBeHidden();
  const ys = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(ys.filter((y) => y < 900).length).toBeGreaterThan(1);
});

test('phones: only the first fold phrase shows at rest, the why fades when the letter opens and returns on close; taps unchanged', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, ...phone });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing');
  const letter = page.locator('[data-shape="letter"]');
  const op = (sel: string) => letter.locator(sel).first().evaluate((e) => parseFloat(getComputedStyle(e).opacity));
  const rest = await letter.locator('.breakdown li').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).opacity)));
  expect(rest.length).toBeGreaterThan(1);
  expect(rest[0]).toBe(1);
  expect(rest.slice(1).every((o) => o === 0)).toBe(true);
  await page.mouse.click(5, 5);
  await letter.locator('.piece-link').tap();
  await expect(letter).toHaveClass(/is-open/);
  await expect.poll(() => op('.piece-why')).toBeLessThan(0.05);
  await page.mouse.click(5, 300);
  await expect(letter).not.toHaveClass(/is-open/);
  await expect.poll(() => op('.piece-why')).toBeGreaterThan(0.8);
  // first tap lights and opens, second enters
  const link = page.locator('[data-shape="paper"] .piece-link');
  await link.tap();
  await expect(page.locator('[data-shape="paper"]')).toHaveClass(/is-open/);
  await expect(page).toHaveURL(/\/writing$/);
  await link.tap();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity/);
  await ctx.close();
});

test('the reading bar on a phone is the same hairline under the header, with the section gaps', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ...phone });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing/quiet-singularity');
  await page.locator('.essay-body h2').nth(2).evaluate((e) => e.scrollIntoView({ block: 'start' }));
  const bar = page.locator('[data-reading-progress]');
  await expect(page.locator('.pile-dock')).toHaveCount(0);
  const b = (await bar.boundingBox())!;
  expect(b.width).toBe(375);
  expect(b.height).toBeLessThanOrEqual(3);
  expect(await bar.locator('.tick').count()).toBeGreaterThanOrEqual(5);
  await ctx.close();
});

const cite = (page: Page, n: number) => page.locator('button.cite').filter({ hasText: `[${n}]` }).first();

test('a citation marker is a button that opens a labelled sheet with the reference text', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const m = cite(page, 7);
  await m.scrollIntoViewIfNeeded();
  await expect(m).toHaveAttribute('aria-expanded', 'false');
  await m.click();
  await expect(m).toHaveAttribute('aria-expanded', 'true');
  const sheet = page.getByRole('dialog', { name: 'Reference' });
  await expect(sheet).toBeVisible();
  const expected = (await page.locator('#ref-7').innerText()).replace(/\s+/g, ' ').trim();
  expect(expected).toContain('Fortune');
  await expect(sheet.locator('.cite-text')).toHaveText(expected);
  // same text, not copied into the markup: the sheet is built at runtime
  expect(await (await page.request.get('/writing/quiet-singularity')).text()).not.toContain('cite-sheet"');
});

test('Esc closes the sheet and focus returns to the marker; a press outside closes it too', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const m = cite(page, 3);
  await m.scrollIntoViewIfNeeded();
  await m.click();
  await expect(page.locator('#cite-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#cite-sheet')).toBeHidden();
  await expect(m).toHaveAttribute('aria-expanded', 'false');
  await expect(m).toBeFocused();
  await m.click();
  await expect(page.locator('#cite-sheet')).toBeVisible();
  await page.locator('h1').click();
  await expect(page.locator('#cite-sheet')).toBeHidden();
});

test('desktop: the sheet is a popover beside the marker', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/writing/quiet-singularity');
  const m = cite(page, 5);
  await m.scrollIntoViewIfNeeded();
  await m.click();
  const s = (await page.locator('#cite-sheet').boundingBox())!;
  const b = (await m.boundingBox())!;
  expect(s.width).toBeLessThanOrEqual(340);
  expect(Math.abs(s.y - (b.y + b.height)) < 40 || Math.abs(s.y + s.height - b.y) < 40).toBe(true);
});

test('phones: the sheet sits at the bottom with the blur style', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, ...phone });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing/quiet-singularity');
  const m = cite(page, 11);
  await m.scrollIntoViewIfNeeded();
  await m.tap();
  const sheet = page.locator('#cite-sheet');
  await expect(sheet).toBeVisible();
  const b = (await sheet.boundingBox())!;
  expect(b.y + b.height).toBeGreaterThan(932 - 2);
  expect(b.width).toBeGreaterThan(425);
  expect(await sheet.evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur');
  await ctx.close();
});

test('reduced motion: the sheet opens with no transition', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing/quiet-singularity');
  const m = cite(page, 2);
  await m.scrollIntoViewIfNeeded();
  await m.click();
  const sheet = page.locator('#cite-sheet');
  await expect(sheet).toHaveClass(/is-open/);
  expect(await sheet.evaluate((e) => parseFloat(getComputedStyle(e).transitionDuration))).toBeLessThan(0.001);
  expect(await page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect)?.target?.id === 'cite-sheet').length)).toBe(0);
  await ctx.close();
});

test('no JS: the markers are links to the references and the targets exist', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing/quiet-singularity');
  const a = page.locator('.essay-body a.cite[data-ref="ref-7"]').first();
  await expect(a).toHaveAttribute('href', '#ref-7');
  await expect(page.locator('button.cite')).toHaveCount(0);
  await a.click();
  await expect(page).toHaveURL(/#ref-7$/);
  await expect(page.locator('#ref-7')).toBeInViewport();
  await ctx.close();
});
