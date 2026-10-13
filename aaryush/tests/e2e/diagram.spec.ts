import { expect, test } from '@playwright/test';

const svg = (page: import('@playwright/test').Page) => page.locator('dialog#popup svg.dg');

test('diagram draws, closes the loop, and pulses nodes as the dot passes', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await expect(svg(page)).toHaveClass(/\bclosed\b/, { timeout: 7000 });
  await expect(page.locator('dialog#popup g.node.hit').first()).toBeAttached({ timeout: 10000 });
  const pos = () => page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  const first = await pos();
  await page.waitForTimeout(400);
  expect(await pos()).not.toBe(first);
});

test('reduced motion shows the finished diagram with no movement', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/work/ready-rebound-loop');
  await expect(svg(page)).toHaveClass(/instant/);
  await expect(svg(page)).toHaveClass(/closed/);
  const before = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  await page.waitForTimeout(1200);
  const after = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  expect(after).toBe(before);
  await expect(page.locator('dialog#popup g.node.hit')).toHaveCount(0);
  await context.close();
});

test('reopening does not stack loops', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafCalls = 0;
    window.requestAnimationFrame = (cb) => { (window as any).__rafCalls++; return raf(cb); };
  });
  for (let i = 0; i < 4; i++) {
    await page.locator('#sys-cylerity-intake').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  }
  await page.locator('#sys-cylerity-intake').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { (window as any).__rafCalls = 0; });
  await page.waitForTimeout(1000);
  const calls = await page.evaluate(() => (window as any).__rafCalls as number);
  // One diagram loop ≈ 60 calls/s (the hero canvas pauses while a pop-up is open, Task 8); stacked loops would be 120+.
  expect(calls).toBeLessThan(100);
});

test('pauses when hidden', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/closed/, { timeout: 7000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await page.locator('dialog#popup .pulse').getAttribute('cy');
  await page.waitForTimeout(600);
  const b = await page.locator('dialog#popup .pulse').getAttribute('cy');
  expect(b).toBe(a);
});

test('diagram labels are at least 12px on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/work/cylerity-intake');
  const sizes = await page.locator('dialog#popup svg.dg text').evaluateAll((els) => els.map((t) => (t as SVGTextElement).getBoundingClientRect().height));
  for (const h of sizes) expect(h).toBeGreaterThanOrEqual(11.5);
});
