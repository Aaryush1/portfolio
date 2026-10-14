import { expect, test } from '@playwright/test';

test('a letter ends with the ag. signature, drawn once when it scrolls into view', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const sig = page.locator('svg[data-signature]');
  await expect(sig).toHaveCount(1);
  await expect(sig).not.toHaveClass(/is-playing/);
  await sig.scrollIntoViewIfNeeded();
  await expect(sig).toHaveClass(/is-playing/);
  // the logo draw-on is reused: same keyframes as the header mark
  expect(await sig.locator('.pen-a').evaluate((e) => getComputedStyle(e).animationName)).toBe('mk-draw');
});

test('only letters get a signature; papers do not', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('svg[data-signature]')).toHaveCount(0);
});

test('the header mark and the signature have different mask ids and the header still plays', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const ids = await page.locator('svg.mark-svg mask').evaluateAll((m) => m.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(2);
});

test('signature is fully drawn without JS and under reduced motion', async ({ browser }) => {
  for (const opts of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' as const }]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto('/writing/bigger-than-electricity');
    const off = await page.locator('svg[data-signature] .pen-a').evaluate((e) => getComputedStyle(e).strokeDashoffset);
    expect(parseFloat(off)).toBe(0);
    await ctx.close();
  }
});

test('a paper shows two piles, not the generic bar, and sheets move as sections pass', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('[data-reading-progress]')).toHaveCount(0);
  const piles = page.locator('[data-piles]');
  await expect(piles).toHaveCount(1);
  await expect(piles).toHaveAttribute('aria-hidden', 'true');
  const total = await piles.locator('.pile-sh').count();
  expect(total).toBe(await page.locator('.essay-body h2:not(.references h2)').count());
  const moved = () => piles.locator('.pile-sh.moved').count();
  expect(await moved()).toBe(0);
  const third = page.locator('.essay-body h2').nth(2);
  await third.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(moved).toBe(2); // sections I and II are behind us
  await expect(page.locator('.pile-label')).toHaveText('Section III of VI');
  await page.locator('.essay-body h2:not(.references h2)').last().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(moved).toBe(total - 1);
});

test('a letter keeps the generic bar and has no piles', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.locator('[data-reading-progress]')).toHaveCount(1);
  await expect(page.locator('[data-piles]')).toHaveCount(0);
});

test('the piles never cover the footer links on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/writing/quiet-singularity');
  await page.getByRole('link', { name: /All writing/ }).scrollIntoViewIfNeeded();
  const link = await page.getByRole('link', { name: /All writing/ }).boundingBox();
  const pile = await page.locator('[data-piles]').boundingBox();
  expect(link!.y + link!.height <= pile!.y || link!.y >= pile!.y + pile!.height).toBe(true);
});
