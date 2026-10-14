import { expect, test, type Locator, type Page } from '@playwright/test';

const piece = (page: Page, slug: string) => page.locator(`[data-piece][data-slug="${slug}"]`);
const tf = (loc: Locator) => loc.evaluate((el) => getComputedStyle(el).transform);

test('there is no mug, and no lamp', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('.mug, [class*="mug"], .lamp, [class*="lamp"]')).toHaveCount(0);
});

test('objects carry no grain overlay', async ({ page }) => {
  await page.goto('/writing');
  const grainOnObjects = await page.locator('[data-piece], [data-piece] *').evaluateAll((els) =>
    els.some((e) => ['::before', '::after'].some((p) => /grain/.test(getComputedStyle(e, p).backgroundImage))
      || /grain/.test(getComputedStyle(e).backgroundImage)));
  expect(grainOnObjects).toBe(false);
});

test('the letter shows its first phrase faintly at rest', async ({ page }) => {
  await page.goto('/writing');
  const first = page.locator('[data-slug="bigger-than-electricity"] .breakdown li').first();
  await expect(first).toContainText('One app, one weekend');
  const o = Number(await first.evaluate((el) => getComputedStyle(el).opacity));
  expect(o).toBeGreaterThan(0.2);
  expect(o).toBeLessThan(0.8);
});

test('with two pieces there is no empty region larger than one object', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const boxes = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  const desk = await page.locator('.desk').evaluate((e) => e.getBoundingClientRect().toJSON());
  const maxObjW = Math.max(...boxes.map((b) => b.width)), maxObjH = Math.max(...boxes.map((b) => b.height));
  const [a, b] = [...boxes].sort((x, y) => x.left - y.left);
  expect(b.left - (a.left + a.width)).toBeLessThan(maxObjW);
  for (const bx of boxes) expect(desk.top + desk.height - (bx.top + bx.height)).toBeLessThan(maxObjH);
});

for (const slug of ['bigger-than-electricity', 'quiet-singularity']) {
  test(`hover does more: ${slug} lifts, straightens, brightens and opens its breakdown`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover is a pointer behaviour; phones tap (see the phone test)');
    await page.goto('/writing');
    const p = piece(page, slug);
    const before = { t: await tf(p), o: await p.locator('.breakdown li').last().evaluate((e) => getComputedStyle(e).opacity) };
    await p.hover();
    await expect.poll(() => tf(p)).not.toBe(before.t);
    await expect(p).toHaveClass(/is-lit/);
    await expect(p).toHaveClass(/is-open/);
    await expect.poll(async () => Number(await p.locator('.breakdown li').last().evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(Number(before.o));
    const lit = await p.evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--lit') || '0'));
    expect(lit).toBeGreaterThan(0);
  });
}

test('keyboard focus lands in visual order and shows the same state as hover', async ({ page }) => {
  await page.goto('/writing');
  const order = await page.locator('[data-piece]').evaluateAll((els) =>
    els.map((e) => ({ slug: (e as HTMLElement).dataset.slug, top: e.getBoundingClientRect().top, left: e.getBoundingClientRect().left })));
  const visual = [...order].sort((a, b) => Math.round(a.top / 40) - Math.round(b.top / 40) || a.left - b.left).map((o) => o.slug);
  expect(order.map((o) => o.slug)).toEqual(visual);
  await page.locator('[data-piece] .piece-link').first().focus();
  await expect(page.locator('[data-piece]').first()).toHaveClass(/is-lit/);
});

test('the desk renders with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/writing');
  expect(errors).toEqual([]);
});

test('a phone tap opens the breakdown first and a second tap enters the piece', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone-only');
  await page.goto('/writing');
  const p = piece(page, 'quiet-singularity');
  await p.locator('.piece-link').tap();
  await expect(p).toHaveClass(/is-open/);
  await expect(page).toHaveURL(/\/writing\/?$/);
  await p.locator('.piece-link').tap();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity/);
});

test('ctrl-click opens in a new tab and is not swallowed by the tap logic', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'no modifier keys on touch');
  await page.goto('/writing');
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-slug="quiet-singularity"] .piece-link').click({ modifiers: ['Control'] })]);
  await expect(popup).toHaveURL(/quiet-singularity/);
});
