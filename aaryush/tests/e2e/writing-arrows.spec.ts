import { expect, test, type Page } from '@playwright/test';

// E15: arrow keys walk the desk
const piece = (page: Page, slug: string) => page.locator(`[data-piece][data-slug="${slug}"]`);
const slugs = (page: Page) => page.locator('[data-piece]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug as string));
const focusedSlug = (page: Page) => page.evaluate(() => (document.activeElement?.closest('[data-piece]') as HTMLElement | null)?.dataset.slug ?? null);

test('right and left move focus and light through the pieces in visual order; Home and End jump', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const order = await slugs(page);
  expect(order.length).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBe(order[0]);
  await expect(piece(page, order[0])).toHaveClass(/is-lit/);
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBe(order[1]);
  await page.keyboard.press('ArrowLeft');
  expect(await focusedSlug(page)).toBe(order[0]);
  await page.keyboard.press('End');
  expect(await focusedSlug(page)).toBe(order[order.length - 1]);
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBe(order[order.length - 1]);
  await page.keyboard.press('Home');
  expect(await focusedSlug(page)).toBe(order[0]);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => {
    const room = document.querySelector('.room')!;
    const el = document.querySelector('[data-piece].is-open') as HTMLElement;
    const a = room.getBoundingClientRect(), b = el.getBoundingClientRect();
    const px = parseFloat(getComputedStyle(room).getPropertyValue('--pool-x'));
    const py = parseFloat(getComputedStyle(room).getPropertyValue('--pool-y'));
    return Math.hypot(px - (b.left - a.left + b.width / 2), py - (b.top - a.top + b.height / 2));
  }), { timeout: 15000 }).toBeLessThan(40);
});

test('Enter opens the lit piece', async ({ page }) => {
  await page.goto('/writing');
  const order = await slugs(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/writing/${order[0]}`));
});

test('Enter with the page focused and a piece lit by the pointer opens it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const first = page.locator('[data-piece]').first();
  const slug = await first.getAttribute('data-slug');
  await first.hover();
  await expect(first).toHaveClass(/is-open/);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/writing/${slug}`));
});

test('arrows carry on from where Tab left focus', async ({ page }) => {
  await page.goto('/writing');
  const order = await slugs(page);
  await page.evaluate(() => (document.querySelector('[data-piece] .piece-link') as HTMLElement).focus());
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBe(order[1]);
});

test('ignored while typing in a field, with a modifier, or with the keyboard map open', async ({ page }) => {
  await page.goto('/writing');
  await page.evaluate(() => { const i = document.createElement('input'); i.id = 'tmp'; document.body.append(i); i.focus(); });
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBeNull();
  await page.evaluate(() => (document.getElementById('tmp') as HTMLElement).blur());
  await page.keyboard.press('Alt+ArrowRight');
  expect(await focusedSlug(page)).toBeNull();
  await page.keyboard.press('?');
  await expect(page.locator('dialog#keymap')).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowRight');
  expect(await focusedSlug(page)).toBeNull();
});

test('reduced motion: the light jumps', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await page.keyboard.press('End');
  await expect(page.locator('[data-piece].is-open')).toHaveCount(1);
  await page.keyboard.press('Home');
  await expect(page.locator('[data-piece].is-open')).toHaveCount(1);
  await ctx.close();
});

test('screenshot', async ({ page }) => {
  test.skip(!process.env.T37_SHOTS, 'evidence only');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'C:/Users/aaryu/code/personal/portfolio-explorations/shots/t37-desk-arrows.png' });
});
