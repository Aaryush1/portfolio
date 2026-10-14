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

test('the letter shows its first phrase faintly at rest, and every faint label still passes AA when blended', async ({ page }) => {
  await page.goto('/writing');
  const first = page.locator('[data-slug="bigger-than-electricity"] .breakdown li').first();
  const label = first.locator('.ph-label');
  await expect(label).toContainText('One app, one weekend');
  const r = await first.evaluate((li) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const fold = li.closest('[data-piece]')!.querySelector('.fold-1')!;
    const bgs = (getComputedStyle(fold).backgroundImage.match(/rgb\([^)]*\)/g) ?? []).map(rgb);
    const lab = li.querySelector('.ph-label')!;
    const liOp = Number(getComputedStyle(li).opacity);
    return {
      labelOpacity: Number(getComputedStyle(lab).opacity) * liOp,
      labelColor: rgb(getComputedStyle(lab).color),
      counterColor: rgb(getComputedStyle(li, '::before').color),
      counterOpacity: liOp,
      bgs,
    };
  });
  expect(r.labelOpacity).toBeGreaterThan(0.2);
  expect(r.labelOpacity).toBeLessThan(0.8);
  const lum = (c: number[]) => {
    const f = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const contrast = (fg: number[], op: number, bg: number[]) => {
    const mixed = fg.map((v, i) => v * op + bg[i] * (1 - op));
    const [hi, lo] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  expect(r.bgs.length).toBeGreaterThan(0);
  for (const bg of r.bgs) {
    expect(contrast(r.labelColor, r.labelOpacity, bg), 'phrase').toBeGreaterThanOrEqual(4.5);
    expect(contrast(r.counterColor, r.counterOpacity, bg), 'counter').toBeGreaterThanOrEqual(4.5);
  }
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
    const angle = (t: string) => { const n = (t.replace(/^[a-z0-9]+/, '').match(/-?[\d.e-]+/g) ?? []).map(Number); return t === 'none' ? 0 : Math.abs(Math.atan2(n[1], n[0]) * 180 / Math.PI); };
    const before = { t: await tf(p), o: await p.locator('.breakdown li').last().evaluate((e) => getComputedStyle(e).opacity) };
    await p.hover();
    await expect.poll(() => tf(p)).not.toBe(before.t);
    await expect(p).toHaveClass(/is-lit/);
    await expect(p).toHaveClass(/is-open/);
    // straighter: the tilt at rest is larger than the tilt once lit
    await expect.poll(async () => angle(await tf(p))).toBeLessThan(angle(before.t) - 0.2);
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

test('after a ctrl-click and moving away nothing stays lit, and hovering the other piece lights exactly one', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'pointer behaviour');
  await page.goto('/writing');
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-slug="quiet-singularity"] .piece-link').click({ modifiers: ['Control'] })]);
  await popup.close();
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await expect(page.locator('[data-piece].is-lit, [data-piece].is-open')).toHaveCount(0);
  await piece(page, 'bigger-than-electricity').hover();
  await expect(page.locator('[data-piece].is-lit')).toHaveCount(1);
  await expect(page.locator('[data-piece].is-open')).toHaveCount(1);
});

test('the page head is the only h1 and the link hit area matches the object, not 400px beyond it', async ({ page, isMobile }) => {
  await page.goto('/writing');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText("Pull up a chair.");
  await expect(page.locator('h1 em')).toContainText('all on the desk');
  if (isMobile) return;
  const p = piece(page, 'bigger-than-electricity');
  const extra = await p.evaluate((el) => {
    const link = el.querySelector('.piece-link')!;
    const a = getComputedStyle(link, '::after');
    const box = el.getBoundingClientRect();
    return parseFloat(a.height) - box.height;
  });
  expect(extra).toBeLessThanOrEqual(30);
});
