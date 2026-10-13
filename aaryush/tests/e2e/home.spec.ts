import { expect, test } from '@playwright/test';

test.describe('home structure', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('sections appear in order', async ({ page }) => {
    const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['hero', 'about', 'levels', 'work', 'writing']);
  });

  test('timeline lists companies newest first, with the earlier group last', async ({ page }) => {
    const ids = await page.locator('article.entry').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['co-gupta-advisory', 'co-cylerity', 'co-ready-rebound', 'co-skale', 'co-earlier']);
  });

  test('contextOS is a single line above the timeline, not a card', async ({ page }) => {
    const next = page.locator('.tl-wrap > .next');
    await expect(next).toContainText('contextOS');
    await expect(next).toContainText('Coming soon.');
    await expect(page.locator('.card', { hasText: 'contextOS' })).toHaveCount(0);
  });

  test('every system card and company inside-link points at /work/<slug>', async ({ page }) => {
    const hrefs = await page.locator('[data-popup-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.length).toBe(11);
    for (const h of hrefs) expect(h).toMatch(/^\/work\/[a-z0-9-]+$/);
    await expect(page.locator('#co-earlier a.more')).toHaveCount(0);
  });

  test('Skale shows its end date', async ({ page }) => {
    await expect(page.locator('#co-skale .date')).toHaveText('Jun 2024 – Feb 2026');
  });

  test('level chips scroll to the referenced entry and flash it', async ({ page }) => {
    await page.locator('li.level[data-level="3"] a.chip[href="#sys-ready-rebound-loop"]').click();
    const card = page.locator('#sys-ready-rebound-loop');
    await expect(card).toBeInViewport();
    await expect(card).toHaveClass(/is-target/);
  });

  test('no inside-link uses the word "More"', async ({ page }) => {
    await expect(page.locator('a.more', { hasText: /^More/ })).toHaveCount(0);
  });
});

test('level meter fills step by step on hover and drains on leave', async ({ page }) => {
  await page.goto('/');
  const level = page.locator('li.level[data-level="3"]');
  await level.scrollIntoViewIfNeeded();
  await level.hover();
  await expect(level.locator('.meter i.fill')).toHaveCount(1, { timeout: 150 });
  await expect(level.locator('.meter i.fill')).toHaveCount(3, { timeout: 1000 });
  await page.mouse.move(0, 0);
  await expect(level.locator('.meter i.fill')).toHaveCount(0, { timeout: 1500 });
});

test('level meter fills on keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('li.level[data-level="2"] a.chip').first().focus();
  await expect(page.locator('li.level[data-level="2"] .meter i.fill')).toHaveCount(2, { timeout: 1000 });
});
