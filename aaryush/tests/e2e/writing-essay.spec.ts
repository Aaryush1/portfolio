import { expect, test } from '@playwright/test';

// One letter and one paper: every piece ends with the signature, and each kind gets the same behaviour.
const pieces = [
  { kind: 'letter', slug: '/writing/bigger-than-electricity' },
  { kind: 'paper', slug: '/writing/quiet-singularity' },
] as const;

for (const { kind, slug } of pieces) {
  test(`a ${kind} ends with the ag. signature, drawn once when it scrolls into view`, async ({ page }) => {
    await page.goto(slug);
    const sig = page.locator('svg[data-signature]');
    await expect(sig).toHaveCount(1);
    await expect(sig).not.toHaveClass(/is-playing/);
    await sig.scrollIntoViewIfNeeded();
    await expect(sig).toHaveClass(/is-playing/);
    // the logo draw-on is reused: same keyframes as the header mark
    expect(await sig.locator('.pen-a').evaluate((e) => getComputedStyle(e).animationName)).toBe('mk-draw');
  });

  test(`a ${kind} signature is undrawn before it scrolls into view`, async ({ page }) => {
    await page.goto(slug);
    const off = await page.locator('svg[data-signature] .pen-a').evaluate((e) => getComputedStyle(e).strokeDashoffset);
    expect(parseFloat(off)).toBe(108);
  });

  test(`a ${kind}: the header mark and the signature have different mask ids and the header still plays`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__headerPlayed = false;
      new MutationObserver((muts) => {
        for (const m of muts) {
          const el = m.target as Element;
          if (el.classList?.contains('is-playing') && !el.hasAttribute('data-signature')) (window as any).__headerPlayed = true;
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    await page.goto(slug);
    const ids = await page.locator('svg.mark-svg mask').evaluateAll((m) => m.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(2);
    await page.waitForFunction(() => (window as any).__headerPlayed === true);
  });
}

test('a paper signs off after its last section and before the references', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const sig = page.locator('.signature');
  const refs = page.locator('.essay-body .references');
  await expect(refs).toHaveCount(1);
  // DOCUMENT_POSITION_FOLLOWING (4): the references come after the signature
  expect(await sig.evaluate((s, r) => !!(s.compareDocumentPosition(r) & 4), await refs.elementHandle())).toBe(true);
  const lastSection = page.locator('.essay-body h2:not(.references h2)').last();
  expect(await sig.evaluate((s, h) => !!(s.compareDocumentPosition(h) & 2), await lastSection.elementHandle())).toBe(true); // PRECEDING: the section is before the signature
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
    const dock = page.locator('.pile-dock');
    // the dock steps aside (an IntersectionObserver, then a .25s fade) once the footer is on screen; that takes longer in Firefox and WebKit,
    // so poll until it is gone or clear of every footer link, instead of sampling at a fixed 500ms
    await expect.poll(() => page.evaluate(() => {
      const dk = document.querySelector('.pile-dock') as HTMLElement;
      if (getComputedStyle(dk).visibility === 'hidden') return false;
      const d = dk.getBoundingClientRect();
      return [...document.querySelectorAll('footer a')].some((a) => { const r = a.getBoundingClientRect(); return r.x < d.x + d.width && r.x + r.width > d.x && r.y < d.y + d.height && r.y + r.height > d.y; });
    }), { timeout: 10000 }).toBe(false);
    await expect(dock).toBeHidden();
  });
}

for (const { kind, slug } of pieces) {
  test(`a ${kind} signature is fully drawn without JS and under reduced motion`, async ({ browser }) => {
    for (const opts of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' as const }]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(slug);
      const off = await page.locator('svg[data-signature] .pen-a').evaluate((e) => getComputedStyle(e).strokeDashoffset);
      expect(parseFloat(off)).toBe(0);
      await ctx.close();
    }
  });
}

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
