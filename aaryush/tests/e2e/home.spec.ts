import { expect, test } from '@playwright/test';

test.describe('home structure', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('sections appear in order', async ({ page }) => {
    const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['hero', 'levels', 'work', 'writing']);
  });

  test('timeline lists companies newest first, with the earlier group last', async ({ page }) => {
    const ids = await page.locator('article.entry').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['co-cylerity', 'co-ready-rebound', 'co-skale', 'co-earlier']);
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
  // Record every change of the fill count in-page (MutationObserver), so the 100ms stagger can't race the assertion.
  await level.evaluate((el) => {
    const w = window as unknown as { __fills: number[] };
    w.__fills = [];
    const record = () => {
      const n = el.querySelectorAll('.meter i.fill').length;
      if (w.__fills[w.__fills.length - 1] !== n) w.__fills.push(n);
    };
    new MutationObserver(record).observe(el, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await level.hover();
  await expect(level.locator('.meter i.fill')).toHaveCount(3, { timeout: 1000 });
  const seen = await page.evaluate(() => (window as unknown as { __fills: number[] }).__fills);
  // Filled progressively (never jumped straight 0 -> 3), and monotonically.
  expect(seen[seen.length - 1]).toBe(3);
  expect(seen, 'fills one segment at a time, in order').toEqual([1, 2, 3]);
  await page.mouse.move(0, 0);
  await expect(level.locator('.meter i.fill')).toHaveCount(0, { timeout: 1500 });
});

test('level meter fills on keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('li.level[data-level="2"] a.chip').first().focus();
  await expect(page.locator('li.level[data-level="2"] .meter i.fill')).toHaveCount(2, { timeout: 1000 });
});

test('there is no About section, and the section strips count to five', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about')).toHaveCount(0);
  const strips = await page.locator('.sec-head').evaluateAll((els) => els.map((e) => e.textContent!.replace(/s+/g, ' ').trim()));
  expect(strips.map((s) => s.slice(0, 4))).toEqual(['§ 02', '§ 03', '§ 04', '§ 05', '§ 05']);
  expect(strips.some((s) => s.includes('/ 06'))).toBe(false);
});

test('phone contact row: one big Save contact, then four icon-only 44px buttons with names', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const cta = page.locator('[data-contact="hero"]');
  const primary = await cta.locator('.btn-primary').boundingBox();
  expect(primary!.width).toBeGreaterThan(300);
  for (const name of ['Email', 'Call', 'LinkedIn', 'GitHub']) {
    const a = cta.locator(`a[aria-label="${name}"]`);
    const box = await a.boundingBox();
    expect(box!.width, name).toBeGreaterThanOrEqual(44);
    expect(box!.height, name).toBeGreaterThanOrEqual(44);
    expect(box!.y, name).toBeGreaterThan(primary!.y + primary!.height);
    expect(await a.innerText(), name).toBe('');
  }
});

test('company pop-up: systems, then facts, then the story, at both widths', async ({ page }) => {
  for (const w of [375, 1280]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/work/ready-rebound');
    const dlg = page.locator('dialog#popup');
    const sys = await dlg.locator('.v-sys').boundingBox();
    const spec = await dlg.locator('dl.spec').boundingBox();
    const story = await dlg.locator('.v-sec').first().boundingBox();
    const head = await dlg.locator('.v-head').boundingBox();
    expect(sys!.y, w + ' systems under header').toBeGreaterThanOrEqual(head!.y + head!.height - 1);
    expect(spec!.y, w + ' facts under systems').toBeGreaterThanOrEqual(sys!.y + sys!.height - 1);
    expect(story!.y, w + ' story under facts').toBeGreaterThanOrEqual(spec!.y + spec!.height - 1);
    const order = await dlg.locator('.v-sys, dl.spec, .v-sec').evaluateAll((els) => els.map((e) => e.className || e.tagName));
    expect(order[0]).toBe('v-sys');
  }
});

test('Gupta Advisory is a one-line sibling of the contextOS line, above the first company entry', async ({ page }) => {
  await page.goto('/');
  const next = await page.locator('.tl-wrap > .next').boundingBox();
  const adv = page.locator('.tl-wrap > p.adv#co-gupta-advisory');
  const first = await page.locator('article.entry').first().boundingBox();
  const box = await adv.boundingBox();
  expect(box!.y).toBeGreaterThan(next!.y);
  expect(box!.y).toBeLessThan(first!.y);
  await expect(adv).not.toContainText('2024');
  await expect(adv).toContainText('Founder');
  await expect(page.locator('article.entry#co-gupta-advisory')).toHaveCount(0);
});

test('phone system cards are compact rows: number, title, levels, arrow; no description', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const card = page.locator('#sys-cylerity-intake');
  await expect(card.locator('p').first()).toBeHidden();
  const box = await card.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeLessThan(120);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(card.locator('p').first()).toBeVisible();
});

test.describe('E8: the room remembers you on the home teaser', () => {
  const seed = (sec: number) => JSON.stringify({ v: 1, pieces: { 'quiet-singularity': { sec, t: 1 } }, last: 'quiet-singularity' });

  test('a ribbon and a pick-up link for a piece you are partway through', async ({ page }) => {
    await page.addInitScript((m) => localStorage.setItem('writing:v1', m), seed(2));
    await page.goto('/');
    const row = page.locator('#writing a.post[href="/writing/quiet-singularity"]');
    await expect(row.locator('.ribbon')).toBeVisible();
    await expect(page.locator('#writing').getByRole('link', { name: /Pick up where you left off/ })).toHaveAttribute('href', '/writing/quiet-singularity#pickup');
  });

  test('nothing when nothing is remembered, and the section does not change height when the ribbon appears', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#writing .ribbon')).toHaveCount(0);
    await expect(page.locator('#writing').getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
    const h = await page.locator('#writing').evaluate((e) => e.getBoundingClientRect().height);
    await page.evaluate((m) => localStorage.setItem('writing:v1', m), seed(2));
    await page.reload();
    await expect(page.locator('#writing .ribbon')).toBeVisible();
    expect(await page.locator('#writing').evaluate((e) => e.getBoundingClientRect().height)).toBe(h);
  });

  test('a piece read to its final section gets no ribbon and no offer', async ({ page }) => {
    await page.addInitScript((m) => localStorage.setItem('writing:v1', m), seed(5));
    await page.goto('/');
    await expect(page.locator('#writing .ribbon')).toHaveCount(0);
    await expect(page.locator('#writing').getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
  });
});
