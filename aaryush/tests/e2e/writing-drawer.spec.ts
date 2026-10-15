import { expect, test } from '@playwright/test';
import { afternoon, pinAfternoon } from './afternoon';

pinAfternoon();

// site.drawer is empty (controller ruling, 2026-10-14): the drawer holds only the contextOS folder.
// The redacted-paper rendering is covered by the fixture test in tests/unit/writing-drawer.test.ts.
const front = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Writing in progress' });

test('the drawer is closed at rest and opens on click, listing contextOS', async ({ page }) => {
  await page.goto('/writing');
  await expect(front(page)).toBeVisible();
  await expect(front(page)).toHaveAttribute('aria-expanded', 'false');
  await front(page).click();
  await expect(front(page)).toHaveAttribute('aria-expanded', 'true');
  const c = page.locator('#drawer-contents');
  await expect(c.getByText('contextOS')).toBeVisible();
  await expect(c.locator('.redacted')).toHaveCount(0);
});

test('it never shows a title or body of unpublished work', async ({ page, request }) => {
  const html = await (await request.get('/writing')).text();
  await page.goto('/writing');
  await front(page).click();
  const text = await page.locator('#drawer-contents').innerText();
  expect(text.replace(/\s+/g, ' ').trim()).toMatch(/^contextOS$/i);
  expect(html).not.toMatch(/draft: true/);
});

test('the folder is not a link', async ({ page }) => {
  await page.goto('/writing');
  await front(page).click();
  await expect(page.locator('#drawer-contents a')).toHaveCount(0);
});

test('keyboard: focus opens, Escape closes and returns focus', async ({ page }) => {
  await page.goto('/writing');
  await page.keyboard.press('Tab'); // keyboard focus, so :focus-visible applies
  let guard = 0;
  while (!(await front(page).evaluate((el) => el === document.activeElement)) && guard++ < 60) {
    await page.keyboard.press('Tab');
  }
  await expect(front(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(front(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(front(page)).toBeFocused();
});

test('click outside closes it', async ({ page }) => {
  await page.goto('/writing');
  await front(page).click();
  await expect(front(page)).toHaveAttribute('aria-expanded', 'true');
  await page.locator('h1').click();
  await expect(front(page)).toHaveAttribute('aria-expanded', 'false');
});

test('opening the drawer moves the light to it, and closing hands it back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'on phones the light follows the scroll position rather than a rest point, so there is no fixed baseline to hand back to');
  await page.goto('/writing');
  const y = () => page.locator('.room').evaluate((r) => parseFloat(getComputedStyle(r).getPropertyValue('--pool-y')));
  await expect.poll(y).toBeGreaterThan(0);
  // the pool eases to rest; wait until it has stopped before taking the baseline
  let last = -1;
  await expect.poll(async () => { const v = await y(); const same = Math.abs(v - last) < 0.5; last = v; return same; }, { timeout: 15000, intervals: [600] }).toBe(true);
  const before = await y();
  await front(page).click();
  await expect.poll(y).toBeGreaterThan(before);
  await page.locator('h1').click();
  await expect.poll(y).toBeCloseTo(before, -1);
});

test('at rest it is small and quiet, shows no visible label, and opens less than a third of the old depth', async ({ page }) => {
  await page.goto('/writing');
  await expect(front(page)).toHaveAccessibleName('Writing in progress');
  expect(((await front(page).innerText()) ?? '').trim()).toBe('');
  const box = await front(page).boundingBox();
  expect(box!.height).toBeLessThanOrEqual(30);
  expect(Number(await front(page).evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.7);
  await front(page).click();
  await expect.poll(() => page.locator('#drawer-contents').evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(260 / 3);
  expect((await page.locator('.folder').boundingBox())!.height).toBeLessThanOrEqual(70);
});

test('the stage dims while the drawer is open', async ({ page }) => {
  await page.goto('/writing');
  await front(page).click();
  await expect.poll(() => page.locator('.desk-wrap').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.3');
});

test('no-JS: the contextOS folder is a readable list and there is no front to press', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await expect(page.getByText('contextOS')).toBeVisible();
  await expect(page.getByRole('heading', { name: /writing I.m working on/i })).toBeVisible();
  await expect(page.locator('.drawer-front')).toBeHidden();
  await ctx.close();
});

test('reduced motion: opens instantly with no running transitions', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await afternoon(page);
  await page.goto('/writing');
  await front(page).click();
  await expect(front(page)).toHaveAttribute('aria-expanded', 'true');
  // the drawer itself never animates: nothing targets it, and its contents are open at once
  expect(await page.evaluate(() => {
    const drawer = document.querySelector('[data-drawer]')!;
    // reduced motion collapses every duration to 0.01ms; WebKit still lists those instant visibility transitions for a frame, so only real ones count
    return document.getAnimations().filter((a) => drawer.contains((a.effect as KeyframeEffect)?.target as Element) && (a.effect?.getComputedTiming().endTime as number) > 1).length;
  })).toBe(0);
  expect(await page.locator('#drawer-contents').evaluate((el) => getComputedStyle(el).maxHeight)).toBe('78px');
  // first-paint transitions on the desk settle on their own; afterwards nothing may loop
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((x) => x.playState === 'running').length)).toBe(0);
  await ctx.close();
});

test('drawer fits at 320 with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/writing');
  await front(page).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('hovering a piece while the drawer is open borrows the light, and unlighting gives it back to the drawer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover');
  await page.goto('/writing');
  await front(page).click();
  const room = page.locator('.room');
  await expect(room).toHaveAttribute('data-pool', 'drawer');
  await page.locator('[data-slug="quiet-singularity"]').hover();
  await expect(room).toHaveAttribute('data-pool', 'piece');
  await page.mouse.move(2, 2);
  await expect(room).toHaveAttribute('data-pool', 'drawer');
  // closing the drawer afterwards still returns the pool to rest
  await page.keyboard.press('Escape');
  await expect(room).toHaveAttribute('data-pool', 'rest');
});
