import { expect, test, type Page } from '@playwright/test';

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

const bar = (page: Page) => page.locator('[data-reading-progress]');
const tickFractions = (page: Page) => bar(page).locator('.tick').evaluateAll((ts) => ts.map((t) => parseFloat((t as HTMLElement).style.left) / 100));

for (const { kind, slug, sections } of [
  { kind: 'paper', slug: '/writing/quiet-singularity', sections: 6 },
  { kind: 'letter', slug: '/writing/bigger-than-electricity', sections: 4 },
  { kind: 'note', slug: '/writing/once-for-good', sections: 4 },
]) {
  test(`a ${kind} has the same reading bar, with a gap at each section break`, async ({ page }) => {
    await page.goto(slug);
    await expect(bar(page)).toHaveCount(1);
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-piles], .pile-dock')).toHaveCount(0);
    const ticks = await tickFractions(page);
    // one break between neighbouring sections (a paper may also open with a short preface, which adds one before section I)
    expect(ticks.length).toBeGreaterThanOrEqual(sections - 1);
    expect(ticks.length).toBeLessThanOrEqual(sections);
    for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    expect(ticks[0]).toBeGreaterThan(0);
    expect(ticks[ticks.length - 1]).toBeLessThan(1);
    // the line still fills as you read
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await expect.poll(() => bar(page).evaluate((e) => parseFloat(e.style.getPropertyValue('--progress')))).toBeGreaterThan(0.2);
  });
}

test('a paper breaks sit by cumulative words: a longer section takes more of the bar', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const words = await page.locator('.essay-body').evaluate((art) => {
    const out: number[] = [];
    let cur = -1;
    for (const c of Array.from(art.children)) {
      if (c.matches('.signature, .references')) continue;
      if (c.matches('h2')) { cur++; out[cur] = 0; }
      if (cur >= 0) out[cur] += (c.textContent ?? '').split(/\s+/).filter(Boolean).length;
    }
    return out;
  });
  const ticks = await tickFractions(page);
  const starts = ticks.length === words.length ? ticks : [0, ...ticks];
  const widths = starts.map((s, i) => (starts[i + 1] ?? 1) - s);
  const total = words.reduce((a, b) => a + b, 0);
  words.forEach((w, i) => expect(Math.abs(widths[i] - w / total)).toBeLessThan(0.02));
  expect(words.indexOf(Math.max(...words))).toBe(widths.indexOf(Math.max(...widths)));
});

test('the current section is the lit stretch of the line, and follows the reader', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const seg = () => bar(page).evaluate((e) => [e.style.getPropertyValue('--seg-a'), e.style.getPropertyValue('--seg-b')].map(parseFloat));
  await page.locator('.essay-body h2').nth(2).evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => (await seg())[0]).toBeGreaterThan(0);
  const ticks = await tickFractions(page);
  const [a, b] = await seg();
  const third = ticks.length === 6 ? 2 : 1; // index into the ticks of section III's start
  expect(Math.abs(a / 100 - ticks[third])).toBeLessThan(0.002);
  expect(Math.abs(b / 100 - ticks[third + 1])).toBeLessThan(0.002);
  await page.locator('.essay-body h2:not(.references h2)').last().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => Math.round((await seg())[1])).toBe(100);
});

test('a letter is split into its folds in equal parts', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const ticks = await tickFractions(page);
  expect(ticks.map((t) => Math.round(t * 100))).toEqual([25, 50, 75]);
});
