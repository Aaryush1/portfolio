import { expect, test } from '@playwright/test';

// Zoom eases over ~2s of frame time, with dt capped per frame, so slow headless browsers need real-time slack.
const SETTLE = 20_000;
const fig = (page: import('@playwright/test').Page) => page.locator('#lvfig');
const row = (page: import('@playwright/test').Page, n: number) => page.locator(`li.level[data-level="${n}"]`);

test('lens figure is server-rendered with four rings, hidden from assistive tech', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(fig(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(fig(page).locator('svg circle.ring')).toHaveCount(4);
  await expect(fig(page).locator('svg text')).toHaveCount(4);
  await expect(fig(page).locator('figcaption')).toContainText('Four levels. Pick one to zoom.');
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
  await expect(fig(page)).toHaveAttribute('data-zoom', '3', { timeout: SETTLE });
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
  await expect(fig(page)).toHaveAttribute('data-zoom', '3', { timeout: SETTLE });
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

test('figure shows on a 375px phone and a tap pins a level', async ({ browser }) => {
  test.slow();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await fig(page).scrollIntoViewIfNeeded();
  const box = (await fig(page).boundingBox())!;
  expect(box.width).toBeGreaterThan(150);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await expect(fig(page).locator('svg')).toBeVisible();
  await row(page, 4).locator('h3').tap();
  await expect(fig(page)).toHaveAttribute('data-level', '4');
  // the phone figure sits above the list, so it is off-screen (paused) while the row is tapped; it catches up once seen
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-zoom', '3', { timeout: SETTLE });
  await row(page, 4).locator('h3').tap();
  await fig(page).scrollIntoViewIfNeeded();
  await expect(fig(page)).toHaveAttribute('data-zoom', '0', { timeout: SETTLE });
  await context.close();
});
