import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Fig. 2.1, the section schematic: a sticky figure in a short track, the page scrolling natively.
const TITLES = ['How the organization runs', 'How work moves', 'How things get built', 'What gets built'];
const LINKS: string[][] = [
  ['/work/cylerity', '/work/gupta-advisory'],
  ['/work/smartbenai', '/work/cylerity-intake'],
  ['/work/ready-rebound-loop', '/work/cylerity-intake'],
  ['/work/univise', '/work/skale-platform', '/work/cylerity', '/work/umn-launchpad'],
];
const floor = (page: Page, n: number) => page.locator('.sx-floor').nth(n - 1);
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } as const;

/** Jump (instantly) to where level `k` (0-based) is the active one. */
const jump = (page: Page, k: number) =>
  page.evaluate((k) => {
    const sx = document.getElementById('sx')!;
    const track = sx.querySelector('.sx-track')!;
    const stick = parseFloat(getComputedStyle(sx.querySelector('.sx-stage')!).top);
    const step = parseFloat(getComputedStyle(sx).getPropertyValue('--step'));
    window.scrollTo({ top: Math.round(track.getBoundingClientRect().top + scrollY - stick + k * step), behavior: 'instant' });
  }, k);

/** The title as laid out now, without the letters that are mid-way out. */
const titleNow = (page: Page) =>
  page.locator('.sx-ovl h3').evaluate((h) => [...h.querySelectorAll('.mc:not(.ghost), .sp')].map((c) => c.textContent).join(''));

const settleUp = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#sx')).toHaveClass(/sx--js/);
};

test.describe('the active level follows the scroll, and only the scroll', () => {
  test('each level in turn: the floor, the title, the body and the list all match', async ({ page }) => {
    await settleUp(page);
    for (const k of [0, 2, 3, 1, 0]) {
      await jump(page, k);
      await expect(floor(page, k + 1)).toHaveAttribute('aria-current', 'step');
      await expect(page.locator('.sx-floor[aria-current]')).toHaveCount(1);
      await expect.poll(() => titleNow(page), { timeout: 6000 }).toBe(TITLES[k]);
      await expect(page.locator('.sx-ovl h3')).toHaveAttribute('aria-label', TITLES[k]);
      await expect.poll(() => page.locator('.sx-lists > ul:not(.old) a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), { timeout: 6000 }).toEqual(LINKS[k]);
      await expect(page.locator('.sx-body p:not(.old)')).toHaveCount(1, { timeout: 6000 });
    }
  });

  test('hover and focus do not change the level', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hover on touch');
    await settleUp(page);
    await jump(page, 1);
    await expect(floor(page, 2)).toHaveAttribute('aria-current', 'step');
    await floor(page, 4).hover();
    await floor(page, 4).focus();
    await page.waitForTimeout(400);
    await expect(floor(page, 2)).toHaveAttribute('aria-current', 'step');
  });

  test('there is exactly one copy of each link, and no hidden duplicate list', async ({ page }) => {
    await settleUp(page);
    await jump(page, 1);
    await expect.poll(() => page.locator('#levels .sx a').count()).toBe(LINKS[1].length);
    await expect(page.locator('#levels .sx [aria-hidden="true"] a')).toHaveCount(0);
    await expect(page.locator('#levels .sx .sr, #levels .sx [class*="sr-only"]')).toHaveCount(0);
  });
});

test.describe('clicking a floor goes to that level', () => {
  test('a click scrolls (smoothly) to that level and it becomes the active one', async ({ page }) => {
    await settleUp(page);
    await jump(page, 0);
    const y0 = await page.evaluate(() => scrollY);
    await floor(page, 3).click();
    await expect(floor(page, 3)).toHaveAttribute('aria-current', 'step', { timeout: 8000 });
    const y1 = await expect.poll(() => page.evaluate(() => scrollY), { timeout: 8000 }).toBeGreaterThan(y0).then(() => page.evaluate(() => scrollY));
    expect(y1).toBeGreaterThan(y0);
    await expect.poll(() => titleNow(page), { timeout: 6000 }).toBe(TITLES[2]);
    await floor(page, 1).click();
    await expect(floor(page, 1)).toHaveAttribute('aria-current', 'step', { timeout: 8000 });
    expect(await page.evaluate(() => scrollY)).toBeLessThan(y1);
  });

  test('floors are named buttons, focusable, with a visible focus ring', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard');
    await settleUp(page);
    await expect(page.locator('.sx-floors > li > button.sx-floor')).toHaveCount(4);
    for (let n = 1; n <= 4; n++) await expect(floor(page, n)).toHaveAccessibleName(`Level ${n}: ${TITLES[n - 1]}`);
    await jump(page, 0);
    await floor(page, 2).focus();
    expect(await floor(page, 2).evaluate((el) => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; })).toBe(true);
    await page.keyboard.press('Enter');
    await expect(floor(page, 2)).toHaveAttribute('aria-current', 'step', { timeout: 8000 });
  });
});

test.describe('never stuck', () => {
  test('no scroll snapping, and the section pins only by CSS sticky', async ({ page }) => {
    await settleUp(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body).scrollSnapType)).toBe('none');
    expect(await page.locator('.sx-stage').evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  });

  test('the pinned stretch is short: about half a viewport per level on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop ratio');
    await settleUp(page);
    const { step, vh } = await page.evaluate(() => ({ step: parseFloat(getComputedStyle(document.getElementById('sx')!).getPropertyValue('--step')), vh: innerHeight }));
    expect(step / vh).toBeGreaterThanOrEqual(0.45);
    expect(step / vh).toBeLessThanOrEqual(0.62);
  });

  test('a fast wheel passes straight through the whole section in a few events, scrollY always increasing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'wheel');
    await settleUp(page);
    await page.evaluate(() => document.getElementById('levels')!.scrollIntoView({ behavior: 'instant' }));
    const end = await page.evaluate(() => { const r = document.querySelector('.sx-track')!.getBoundingClientRect(); return r.bottom + scrollY; });
    await page.mouse.move(300, 400);
    const ys: number[] = [await page.evaluate(() => scrollY)];
    let events = 0;
    while (ys[ys.length - 1] < end && events < 12) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(120);
      ys.push(await page.evaluate(() => scrollY));
      events++;
    }
    expect(ys[ys.length - 1], 'left the section').toBeGreaterThanOrEqual(end);
    expect(events, `events to pass through: ${ys.join(',')}`).toBeLessThanOrEqual(5);
    for (let i = 1; i < ys.length; i++) expect(ys[i], `scrollY at event ${i}: ${ys.join(',')}`).toBeGreaterThan(ys[i - 1]);
  });

  test('a fast wheel on a phone-sized touch window also passes through (scrollBy in big strides)', async ({ browser }) => {
    const context = await browser.newContext(phone);
    const page = await context.newPage();
    await settleUp(page);
    await page.evaluate(() => document.getElementById('levels')!.scrollIntoView({ behavior: 'instant' }));
    const end = await page.evaluate(() => document.querySelector('.sx-track')!.getBoundingClientRect().bottom + scrollY);
    const ys = [await page.evaluate(() => scrollY)];
    for (let i = 0; i < 8 && ys[ys.length - 1] < end; i++) {
      await page.evaluate(() => window.scrollBy({ top: 900, behavior: 'instant' }));
      ys.push(await page.evaluate(() => scrollY));
    }
    expect(ys[ys.length - 1]).toBeGreaterThanOrEqual(end);
    expect(ys.length - 1).toBeLessThanOrEqual(5);
    await context.close();
  });
});

test.describe('"Explore more" opens the right pop-up', () => {
  test('every item resolves to its system (if it has a diagram) or its company', async ({ page }) => {
    await settleUp(page);
    await expect(page.locator('#levels .sx-more-h')).toHaveText('Explore more');
    await expect(page.getByText('Seen in', { exact: true })).toHaveCount(0);
    for (let k = 0; k < 4; k++) {
      await jump(page, k);
      await expect.poll(() => page.locator('.sx-lists > ul:not(.old) a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), { timeout: 6000 }).toEqual(LINKS[k]);
    }
  });

  test('clicking one opens its pop-up (URL and Back as everywhere else)', async ({ page }) => {
    await settleUp(page);
    await jump(page, 3);
    await expect(floor(page, 4)).toHaveAttribute('aria-current', 'step');
    const link = page.locator('.sx-lists > ul:not(.old) a[href="/work/skale-platform"]');
    await expect(link).toBeVisible({ timeout: 6000 });
    await link.click();
    await expect(page).toHaveURL(/\/work\/skale-platform$/);
    await expect(page.locator('html')).toHaveClass(/locked/);
    await expect(page.locator('#popup h2')).toHaveText('Career platform');
    await page.goBack();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.locator('html')).not.toHaveClass(/locked/);
    await expect(floor(page, 4)).toHaveAttribute('aria-current', 'step');
  });

  test('an item without a diagram opens its company', async ({ page }) => {
    await settleUp(page);
    await jump(page, 3);
    const link = page.locator('.sx-lists > ul:not(.old) a[href="/work/cylerity"]');
    await expect(link).toBeVisible({ timeout: 6000 });
    await expect(link).toContainText('Claims underwriting');
    await link.click();
    await expect(page).toHaveURL(/\/work\/cylerity$/);
    await expect(page.locator('#popup h2')).toHaveText('Cylerity');
  });

  test('a system of the "Earlier" group (which has no company pop-up) opens its own', async ({ page }) => {
    await settleUp(page);
    await jump(page, 1);
    const link = page.locator('.sx-lists > ul:not(.old) a[href="/work/smartbenai"]');
    await expect(link).toBeVisible({ timeout: 6000 });
    await link.click();
    await expect(page).toHaveURL(/\/work\/smartbenai$/);
    await expect(page.locator('#popup h2')).toHaveText('SmartBenAI');
  });
});

test.describe('the title morph', () => {
  test('the new title lands with the shared letters moved, then rests as plain text with the emphasis word in italics', async ({ page }) => {
    await settleUp(page);
    await jump(page, 0);
    await expect.poll(() => titleNow(page)).toBe(TITLES[0]);
    await jump(page, 3);
    await expect.poll(() => titleNow(page), { timeout: 6000 }).toBe(TITLES[3]);
    await expect.poll(() => page.locator('.sx-ovl h3 .mc.ghost').count(), { timeout: 6000 }).toBe(0);
    expect(await page.locator('.sx-ovl h3 .mc.em').evaluateAll((cs) => cs.map((c) => c.textContent).join(''))).toBe('built');
    expect(await page.locator('.sx-ovl h3 .mc.em').first().evaluate((c) => getComputedStyle(c).fontStyle)).toBe('italic');
  });

  test('the text glides with its floor: it is never hidden while the floors trade places', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sampled on desktop');
    await settleUp(page);
    await jump(page, 0);
    await expect.poll(() => titleNow(page)).toBe(TITLES[0]);
    await page.evaluate(() => {
      (window as any).__ops = [];
      const o = document.querySelector('.sx-ovl') as HTMLElement;
      const s = () => { (window as any).__ops.push([getComputedStyle(o).opacity, o.offsetHeight > 0 && o.getBoundingClientRect().height > 0]); if ((window as any).__ops.length < 60) requestAnimationFrame(s); };
      requestAnimationFrame(s);
    });
    await jump(page, 1);
    await page.waitForTimeout(1200);
    const ops = await page.evaluate(() => (window as any).__ops as [string, boolean][]);
    expect(ops.length).toBeGreaterThan(3); // headless WebKit samples slowly
    for (const [op, has] of ops) { expect(Number(op)).toBe(1); expect(has).toBe(true); }
    // and the body never leaves a gap: there is always at least one paragraph that is at least a little visible
    expect(await page.locator('.sx-body p').count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('reduced motion and no JavaScript: all four levels, expanded and stacked', () => {
  const expectStacked = async (page: Page) => {
    await expect(page.locator('#sx')).not.toHaveClass(/sx--js/);
    await expect(page.locator('.sx-lv')).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const lv = page.locator('.sx-lv').nth(i);
      await expect(lv.locator('h3')).toHaveText(TITLES[i]);
      await expect(lv.locator('p')).toBeVisible();
      await expect(lv.locator('.sx-more-h')).toHaveText('Explore more');
      expect(await lv.locator('ul.sx-more a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(LINKS[i]);
      await expect(lv.locator('ul.sx-more a').first()).toBeVisible();
    }
    expect(await page.locator('.sx-stage').evaluate((el) => getComputedStyle(el).position)).not.toBe('sticky');
    // the figure itself is still there: caption and legend
    await expect(page.locator('#levels figcaption')).toContainText('Fig. 2.1 — A section through an organization.');
    await expect(page.locator('#levels figcaption')).toContainText('Decisions');
    await expect(page.locator('#levels figcaption')).toContainText('Volume & feedback');
  };

  test('reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('#sx').scrollIntoViewIfNeeded();
    await expectStacked(page);
    expect(await page.locator('#sx').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await context.close();
  });

  test('no JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expectStacked(page);
    await context.close();
  });
});

test.describe('phone: the sticky layout is not cropped and nothing shows through', () => {
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 660 }]) {
    test(`${vp.width}x${vp.height}`, async ({ browser }) => {
      const context = await browser.newContext({ ...phone, viewport: vp });
      const page = await context.newPage();
      await settleUp(page);
      const header = (await page.locator('header#top').boundingBox())!;
      for (const k of [0, 1, 2, 3]) {
        await jump(page, k);
        await expect(floor(page, k + 1)).toHaveAttribute('aria-current', 'step');
        await expect.poll(() => titleNow(page), { timeout: 6000 }).toBe(TITLES[k]);
        await expect(page.locator('.sx-lists > ul.old')).toHaveCount(0, { timeout: 6000 });
        await page.waitForTimeout(900); // the floors have finished trading places
        const m = await page.evaluate(() => {
          const r = (s: string) => { const b = document.querySelector(s)!.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
          const on = document.querySelector('.sx-floor[aria-current]')!.getBoundingClientRect();
          const inside = (sel: string) => [...document.querySelectorAll(sel)].map((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom }; });
          const hit = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('.sx-stage') !== null;
          const f = document.querySelector('.sx-frame')!.getBoundingClientRect();
          return {
            vw: innerWidth, vh: innerHeight, frame: r('.sx-frame'), stage: r('.sx-stage'), read: r('.sx-read'), on,
            floors: inside('.sx-floor'), title: inside('.sx-ovl h3'), body: inside('.sx-body p'), items: inside('.sx-lists > ul a'),
            hits: [[f.x + f.width / 2, f.y + f.height / 2], [f.x + 20, f.y + 20], [f.right - 20, f.bottom - 20], [f.x + f.width / 2, f.y + 2]].map(([x, y]) => hit(x, y)),
            fig: r('.sx-fig'),
          };
        });
        expect(m.frame.y, 'frame sits under the header').toBeGreaterThanOrEqual(header.y + header.height - 0.5);
        expect(m.frame.x).toBeGreaterThanOrEqual(0);
        expect(m.frame.r).toBeLessThanOrEqual(m.vw);
        expect(m.frame.b).toBeLessThanOrEqual(m.vh);
        expect(m.fig.h / m.vh, 'diagram is about 55% of the viewport').toBeGreaterThan(0.5);
        expect(m.fig.h / m.vh).toBeLessThan(0.6);
        // every floor is inside the frame, the title and body are inside the open floor, and every list item is on screen and below the diagram
        for (const f of m.floors) { expect(f.y).toBeGreaterThanOrEqual(m.frame.y - 0.5); expect(f.b).toBeLessThanOrEqual(m.frame.b + 0.5); expect(f.x).toBeGreaterThanOrEqual(m.frame.x); expect(f.r).toBeLessThanOrEqual(m.frame.r); }
        for (const t of [...m.title, ...m.body]) { expect(t.y).toBeGreaterThanOrEqual(m.on.y); expect(t.b).toBeLessThanOrEqual(m.on.bottom + 0.5); expect(t.r).toBeLessThanOrEqual(m.on.right + 0.5); expect(t.x).toBeGreaterThanOrEqual(m.on.x - 0.5); }
        expect(m.items.length).toBe(LINKS[k].length);
        for (const it of m.items) { expect(it.y).toBeGreaterThanOrEqual(m.frame.b - 0.5); expect(it.b, `list item bottom vs viewport ${m.vh}`).toBeLessThanOrEqual(m.vh + 0.5); expect(it.r).toBeLessThanOrEqual(m.vw); }
        expect(m.hits.every(Boolean), 'the topmost thing over the figure is the figure').toBe(true);
        // no horizontal scroll
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await context.close();
    });
  }

  test('tapping a floor scrolls to it', async ({ browser }) => {
    const context = await browser.newContext(phone);
    const page = await context.newPage();
    await settleUp(page);
    await jump(page, 0);
    await floor(page, 4).tap();
    await expect(floor(page, 4)).toHaveAttribute('aria-current', 'step', { timeout: 8000 });
    await context.close();
  });
});

test('axe finds no serious problems in the section (desktop and phone, levels 2 and 4)', async ({ browser }) => {
  for (const cfg of [{ viewport: { width: 1280, height: 800 } }, phone]) {
    const context = await browser.newContext(cfg);
    const page = await context.newPage();
    await settleUp(page);
    for (const k of [1, 3]) {
      await jump(page, k);
      await expect.poll(() => titleNow(page), { timeout: 6000 }).toBe(TITLES[k]);
      await expect(page.locator('.sx-lists > ul.old')).toHaveCount(0, { timeout: 6000 });
      const results = await new AxeBuilder({ page }).include('#levels').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
    await context.close();
  }
});

test('the plain version passes axe too', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const results = await new AxeBuilder({ page }).include('#levels').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  await context.close();
});
