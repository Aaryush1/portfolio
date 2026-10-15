import { expect, test } from '@playwright/test';

import { SETTLE, expectZoomAbove } from './lens-helpers';

// Zoom eases over ~2s of frame time, with dt capped per frame, so slow headless browsers need real-time slack.
const fig = (page: import('@playwright/test').Page) => page.locator('#lvfig');
const row = (page: import('@playwright/test').Page, n: number) => page.locator(`li.level[data-level="${n}"]`);

test('lens figure is server-rendered with four rings, hidden from assistive tech', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(fig(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(fig(page).locator('svg circle.ring')).toHaveCount(4);
  await expect(fig(page).locator('svg text')).toHaveCount(4);
  await expect(fig(page).locator('figcaption')).toContainText('Zoom in or out.');
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
  await context.close();
});

test('focusing a level zooms the figure to it, and blurring returns to the full picture', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'true');
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
  await row(page, 4).locator('a.chip').first().focus();
  await expect(fig(page)).toHaveAttribute('data-level', '4');
  await fig(page).scrollIntoViewIfNeeded(); // on a phone the figure sits above the row; it only animates while visible
  await expectZoomAbove(fig(page));
  await expect(fig(page).locator('circle.ring').nth(3)).toHaveCSS('stroke', /rgba?\(24\d, 1[78]\d, \d+/);
  await row(page, 4).locator('a.chip').first().blur();
  await expect(fig(page)).toHaveAttribute('data-level', '');
  await expect(fig(page)).toHaveAttribute('data-zoom', '0', { timeout: SETTLE });
});

test('hovering a row zooms; moving away returns to the full picture', async ({ page, isMobile }) => {
  test.skip(isMobile, 'touch devices have no hover; the tap test covers them');
  test.slow();
  await page.goto('/');
  await row(page, 4).scrollIntoViewIfNeeded();
  await row(page, 4).hover();
  await fig(page).scrollIntoViewIfNeeded();
  await expectZoomAbove(fig(page));
  await page.mouse.move(0, 0);
  await expect(fig(page)).toHaveAttribute('data-zoom', '0', { timeout: SETTLE });
});

test('level 1 is the full picture: highlighted, not zoomed', async ({ page }) => {
  await page.goto('/');
  await row(page, 1).scrollIntoViewIfNeeded();
  await row(page, 1).hover();
  await expect(fig(page)).toHaveAttribute('data-level', '1');
  await page.waitForTimeout(500);
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
});

test('hovering a ring lights its row without zooming', async ({ page }) => {
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  // the smallest ring (L4) sits at the centre of the figure
  const box = (await fig(page).locator('svg').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(row(page, 4)).toHaveClass(/is-lit/);
  await expect(fig(page)).toHaveAttribute('data-level', '4');
  await page.waitForTimeout(400);
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
  await page.mouse.move(0, 0);
  await expect(row(page, 4)).not.toHaveClass(/is-lit/);
});

test('figure pauses while a pop-up is open and resumes after', async ({ page }) => {
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'true');
  await page.locator('#sys-univise').evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator('html')).toHaveClass(/locked/);
  await expect(fig(page)).toHaveAttribute('data-running', 'false');
  await page.keyboard.press('Escape');
  await expect(fig(page)).toHaveAttribute('data-running', 'true');
});

test('figure pauses when scrolled away', async ({ page }) => {
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'true');
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'false');
});

test('reduced motion: still full picture, no frame loop, ring still highlights', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__raf = 0;
    window.requestAnimationFrame = (cb) => { (window as any).__raf++; return raf(cb); };
  });
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'false');
  await row(page, 3).hover();
  await expect(fig(page)).toHaveAttribute('data-level', '3');
  await expect(fig(page).locator('circle.ring').nth(2)).toHaveCSS('stroke', /rgba?\(24\d, 1[78]\d, \d+/);
  await page.waitForTimeout(600);
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
  expect(await fig(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await page.evaluate(() => (window as any).__raf)).toBe(0);
  await page.mouse.move(0, 0);
  await expect(fig(page)).toHaveAttribute('data-level', '');
  await context.close();
});

test('figure pauses when scrolled away and comes back as the full picture', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  await row(page, 4).locator('a.chip').first().focus();
  await expectZoomAbove(fig(page));
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'false');
  // state cleared while paused: the rest picture is drawn then, not animated on re-entry
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
  await expect(fig(page)).toHaveAttribute('data-level', '');
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-running', 'true');
  await expect(fig(page)).toHaveAttribute('data-zoom', '0');
});

test('mini lens stays pinned on a 375px phone and a tap zooms it', async ({ browser }) => {
  test.slow();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  const header = (await page.locator('header#top').boundingBox())!;
  const lens = fig(page);
  // scroll until L4 is in view
  await row(page, 4).scrollIntoViewIfNeeded();
  await expect(lens).toHaveAttribute('data-running', 'true');
  const box = (await lens.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height - 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(812);
  expect(box.height).toBeLessThan(140);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  // the lens does not sit on the row being tapped
  const rb = (await row(page, 4).locator('h3').boundingBox())!;
  expect(rb.y).toBeGreaterThanOrEqual(box.y + box.height);
  // and the topmost element at the lens centre is the lens, not the header
  expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('#lvfig'), [box.x + box.width / 2, box.y + box.height / 2])).toBe(true);
  await row(page, 4).locator('h3').tap();
  await expect(lens).toHaveAttribute('data-level', '4');
  await expectZoomAbove(lens);
  await row(page, 4).locator('h3').tap();
  await expect(lens).toHaveAttribute('data-zoom', '0', { timeout: SETTLE });
  await context.close();
});

test('a chip reached by keyboard on a 375px phone is not hidden under the pinned lens', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/');
  await row(page, 1).scrollIntoViewIfNeeded();
  for (const n of [3, 4]) {
    const chip = row(page, n).locator('a.chip').first();
    // park the chip behind the band's footprint (Shift+Tab from the row below lands on it from there)
    await chip.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'instant' }));
    await chip.focus(); // focus must scroll it out from under the band
    await expect.poll(async () => {
      const band = (await fig(page).boundingBox())!, box = (await chip.boundingBox())!;
      return box.y >= band.y + band.height && box.y + box.height <= 812 && band.y >= 0;
    }, { message: `L${n} chip visible below the pinned lens`, timeout: 5000 }).toBe(true);
  }
  await context.close();
});
