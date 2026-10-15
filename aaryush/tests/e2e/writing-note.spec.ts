import { expect, test, type Page } from '@playwright/test';

const seed = (page: Page, pieces: Record<string, number>) =>
  page.addInitScript((m) => localStorage.setItem('writing:v1', m), JSON.stringify({ v: 1, pieces: Object.fromEntries(Object.entries(pieces).map(([k, sec]) => [k, { sec, t: 1 }])) }));
const note = (page: Page) => page.locator('[data-slug="once-for-good"]');

test('the note is on the desk, and hovering opens four labelled cards', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  await expect(note(page)).toHaveAttribute('data-shape', 'note');
  await expect(note(page).locator('.card')).toHaveCount(5);
  await expect(note(page).locator('.piece-why')).toContainText('so, how do you use AI?');
  const items = note(page).locator('ol.breakdown > li');
  await expect(items).toHaveCount(4);
  await note(page).hover();
  await expect(note(page)).toHaveClass(/is-open/);
  await expect(items.first()).toHaveCSS('opacity', '1');
  await expect(items).toContainText(['One problem', 'A class of problems', 'The system', 'Everyone']);
  await expect(items.nth(1)).toContainText('the fixes start adding up');
  // the fan: cards are rotated once open, and every card ends up the same width
  await expect.poll(() => note(page).locator('.card.n3').evaluate((e) => getComputedStyle(e).transform)).not.toBe('none');
  await page.waitForTimeout(1600);
  const ws = await note(page).locator('.card:not(.n0)').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).offsetWidth)));
  expect(new Set(ws).size).toBe(1);
});

test('on a phone the first tap opens the fan and the second goes in; the stack fits 360', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await note(page).locator('.piece-link').scrollIntoViewIfNeeded();
  await note(page).locator('.piece-link').tap();
  await expect(note(page)).toHaveClass(/is-open/);
  expect(page.url()).toMatch(/\/writing\/?$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const r = await note(page).locator('.card.n4').evaluate((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right }; });
  expect(r.l).toBeGreaterThanOrEqual(0);
  expect(r.r).toBeLessThanOrEqual(360);
  await ctx.close();
});

test('the reading page has four section marks, widening, and the signature', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/writing/once-for-good');
  const marks = page.locator('.essay-body h2');
  await expect(marks).toHaveCount(4);
  const col = await page.locator('.essay-body').evaluate((e) => e.getBoundingClientRect().width);
  const ws = await marks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  [0.58, 0.7, 0.84, 1].forEach((f, i) => expect(Math.abs(ws[i] - col * f)).toBeLessThan(2));
  await expect(marks.first()).toHaveCSS('height', '26px');
  expect(await marks.first().evaluate((e) => getComputedStyle(e, '::before').color)).toBe('rgb(242, 181, 68)');
  await expect(page.locator('.signature')).toHaveCount(1);
  await expect(page.locator('.essay-body em')).toHaveCount(3);
  await expect(page.locator('.essay-head .sub')).toHaveCount(0);
});

test('memory marks: the note pulls the card reached, the paper gets a flag at its section', async ({ page }) => {
  await seed(page, { 'once-for-good': 2, 'quiet-singularity': 3 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  await expect(note(page).locator('.card.pulled')).toHaveCount(1);
  await expect(note(page).locator('.card.n3')).toHaveClass(/pulled/);
  await expect(note(page).locator('.breakdown li.pulled')).toHaveCount(1);
  // the amber edge fades in with the card's box-shadow transition, so poll for it
  await expect.poll(() => note(page).locator('.card.n3').evaluate((e) => getComputedStyle(e).boxShadow)).toContain('242, 181, 68');
  const paper = page.locator('[data-slug="quiet-singularity"]');
  await expect(paper.locator('.flag')).toHaveCount(1);
  // flag height follows the section: section 4 of 6 sits lower than section 1 would
  const fy = await paper.locator('.flag').evaluate((e) => (e as HTMLElement).style.getPropertyValue('--fy'));
  expect(Number(fy)).toBeCloseTo(3.5 / 6, 3);
  const pr = await paper.evaluate((e) => e.getBoundingClientRect().right);
  expect(await paper.locator('.flag').evaluate((e) => e.getBoundingClientRect().right)).toBeGreaterThan(pr - 4);
  await page.getByRole('button', { name: /forget/i }).click();
  await expect(page.locator('.flag, .pulled, .print')).toHaveCount(0);
});

test('the letter gets a thumbprint inside the fold reached; opened with no progress marks part one', async ({ page }) => {
  await seed(page, { 'bigger-than-electricity': 2, 'once-for-good': 0 });
  await page.goto('/writing');
  const letter = page.locator('[data-slug="bigger-than-electricity"]');
  await expect(letter.locator('.fold-3 > svg.print')).toHaveCount(1);
  await expect(letter.locator('svg.print')).toHaveCount(1);
  await expect(letter.locator('svg.print')).toHaveAttribute('aria-hidden', 'true');
  await expect(note(page).locator('.card.n1')).toHaveClass(/pulled/);
});

test('reduced motion: the note is static (no transition on its cards) and the fan shows when open', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/writing');
  expect(await note(page).locator('.card.n2').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
  await note(page).hover();
  await expect(note(page)).toHaveClass(/is-open/);
  await expect(note(page).locator('ol.breakdown > li').first()).toHaveCSS('opacity', '1');
  await ctx.close();
});

test('a note read to card 3 is offered pick up there', async ({ page }) => {
  await seed(page, { 'once-for-good': 2 });
  await page.goto('/writing/once-for-good');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toBeVisible();
  // notes count cards with an Arabic numeral; papers keep "section II" (approved copy)
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveText('Pick up where you left off — card 3');
});
