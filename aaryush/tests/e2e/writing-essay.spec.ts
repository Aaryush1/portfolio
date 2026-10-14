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
  await page.addInitScript(() => {
    (window as any).__headerPlayed = false;
    new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target as Element;
        if (el.classList?.contains('is-playing') && !el.hasAttribute('data-signature')) (window as any).__headerPlayed = true;
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await page.goto('/writing/bigger-than-electricity');
  const ids = await page.locator('svg.mark-svg mask').evaluateAll((m) => m.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(2);
  await page.waitForFunction(() => (window as any).__headerPlayed === true);
});

test('the signature is still undrawn before it scrolls into view', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const off = await page.locator('svg[data-signature] .pen-a').evaluate((e) => getComputedStyle(e).strokeDashoffset);
  expect(parseFloat(off)).toBe(108);
});

test('essay:section state is readable by a late listener', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const h = page.locator('.essay-body h2:not(.references h2)').nth(2);
  await h.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(() => page.evaluate(() => JSON.parse(document.documentElement.dataset.essaySection ?? '{}').index)).toBe(2);
});

for (const size of [{ width: 1100, height: 760 }, { width: 375, height: 700 }]) {
  test(`at the very bottom the piles never touch the site footer links (${size.width}px)`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/writing/quiet-singularity');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const dock = page.locator('.pile-dock');
    if (await dock.isVisible()) {
      const d = (await dock.boundingBox())!;
      for (const box of await page.locator('footer a').evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }))) {
        const hit = box.x < d.x + d.width && box.x + box.width > d.x && box.y < d.y + d.height && box.y + box.height > d.y;
        expect(hit).toBe(false);
      }
    }
    await expect(dock).toBeHidden();
  });
}

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
