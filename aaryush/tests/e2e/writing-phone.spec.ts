import { expect, test, type Page } from '@playwright/test';

// Task 31: phone polish on /writing, the paper pile pill, and footnotes as a preview sheet.
const phone = { hasTouch: true, isMobile: true };

for (const w of [360, 375, 412, 430]) {
  test(`/writing at ${w}px: pieces are centred with a 16px gutter at least, even lifted`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 812 }, ...phone });
    const page = await ctx.newPage();
    await page.goto('/writing');
    await page.waitForTimeout(1200); // the nearest piece lights and lifts
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

test('/writing at 375x812: the letter and the paper both fit on the first screen, objects at ~60% height', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ...phone });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const letter = (await page.locator('[data-shape="letter"]').boundingBox())!;
  const paper = (await page.locator('[data-shape="paper"]').boundingBox())!;
  expect(letter.height).toBeLessThan(478 * 0.7);
  expect(paper.height).toBeLessThan(290 * 0.7);
  expect(paper.y + paper.height).toBeLessThanOrEqual(812);
  // below the "Writing" heading
  expect(letter.y).toBeGreaterThan((await page.locator('h1').boundingBox())!.y);
  await ctx.close();
});

test('phones: only the first fold phrase shows at rest, the why fades when the letter opens and returns on close; taps unchanged', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, ...phone });
  const page = await ctx.newPage();
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

test('paper pile dock on a phone: a compact translucent pill in the bottom-right corner', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ...phone });
  const page = await ctx.newPage();
  await page.goto('/writing/quiet-singularity');
  await page.locator('.essay-body h2').nth(2).evaluate((e) => e.scrollIntoView({ block: 'start' }));
  const dock = page.locator('.pile-dock');
  await expect(dock).toBeVisible();
  const b = (await dock.boundingBox())!;
  expect(b.x + b.width).toBeGreaterThan(375 - 30);
  expect(b.x + b.width).toBeLessThanOrEqual(375);
  expect(b.y + b.height).toBeGreaterThan(812 - 30);
  expect(b.width).toBeLessThan(160);
  expect(await dock.evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur');
  await expect(page.locator('.pile-label')).toHaveAttribute('data-short', 'III / VI');
  // the full label still exists for assistive tech
  await expect(page.locator('.pile-label')).toHaveText('Section III of VI');
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
