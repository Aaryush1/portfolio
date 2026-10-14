import { expect, test } from '@playwright/test';

const svg = 'header .mark-svg';
const penOffset = (page: import('@playwright/test').Page, cls: string) =>
  page.locator(`${svg} ${cls}`).evaluate((el) => getComputedStyle(el).strokeDashoffset);
const stopScale = (page: import('@playwright/test').Page) =>
  page.locator(`${svg} .stop`).evaluate((el) => getComputedStyle(el).transform);

test('mark draws on first load and ends in the drawn state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(svg)).toHaveClass(/is-playing/);
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/, { timeout: 2500 });
  await expect(page.locator('html')).not.toHaveClass(/mark-first/);
  expect(parseFloat(await penOffset(page, '.pen-a'))).toBe(0);
  expect(parseFloat(await penOffset(page, '.pen-g'))).toBe(0);
  expect(parseFloat(await penOffset(page, '.rule'))).toBe(0);
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(await stopScale(page));
});

test('mark does not replay on a second page in the same session', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/, { timeout: 2500 });
  await page.goto('/writing');
  await expect(page.locator('html')).not.toHaveClass(/mark-first/);
  await page.waitForTimeout(300);
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/);
  expect(parseFloat(await penOffset(page, '.pen-g'))).toBe(0);
});

test('mark still plays when sessionStorage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.locator(svg)).toHaveClass(/is-playing/);
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/, { timeout: 2500 });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('mark is static and fully visible immediately', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/mark-first/);
    await expect(page.locator(svg)).not.toHaveClass(/is-playing/);
    for (const c of ['.pen-a', '.pen-g', '.rule', '.stop']) {
      expect(await page.locator(`${svg} ${c}`).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    }
    expect(parseFloat(await penOffset(page, '.pen-a'))).toBe(0);
    await page.hover('header a.mark');
    await expect(page.locator(svg)).not.toHaveClass(/is-playing/);
  });
});

test.describe('no javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('mark renders fully drawn and matches the reduced-motion render', async ({ page, browser }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/mark-first/);
    expect(parseFloat(await penOffset(page, '.pen-g'))).toBe(0);
    const noJs = await page.locator(svg).screenshot();

    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const rm = await ctx.newPage();
    await rm.goto('/');
    const staticShot = await rm.locator(svg).screenshot();
    await ctx.close();
    expect(noJs.equals(staticShot)).toBe(true);
    expect(noJs.length).toBeGreaterThan(300); // not an empty crop
  });
});

test('hover replays the draw, and not while already playing', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'hover is fine-pointer only');
  await page.goto('/writing');
  await page.goto('/'); // same session: no first-load play
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/);
  await page.hover('header a.mark');
  await expect(page.locator(svg)).toHaveClass(/is-playing/);
  await expect(page.locator(svg)).not.toHaveClass(/is-playing/, { timeout: 2800 });
});
