import { expect, test, type Locator, type Page } from '@playwright/test';
import { settled } from './settle';

const pool = (page: Page) => page.locator('.room').evaluate((r) => ({
  x: parseFloat(getComputedStyle(r).getPropertyValue('--pool-x')),
  y: parseFloat(getComputedStyle(r).getPropertyValue('--pool-y')),
  i: parseFloat(getComputedStyle(r).getPropertyValue('--pool-i')),
}));
const whyOpacity = (loc: Locator) => loc.locator('.piece-why').evaluate((e) => Number(getComputedStyle(e).opacity));
/** Resolves once the pool has stopped moving (two reads in a row agree), instead of a fixed sleep. */
const poolSettled = async (page: Page) => {
  let last = await pool(page);
  await expect.poll(async () => { const p = await pool(page); const same = p.x === last.x && p.y === last.y && p.i === last.i; last = p; return same; }, { timeout: 15000, intervals: [300] }).toBe(true);
};
/** Waits n animation frames with the browser's own rAF (kept aside before a spec counts rAF calls). */
const frames = (page: Page, n: number) => page.evaluate((k) => new Promise<void>((done) => {
  const raf = (window as any).__rafNative ?? window.requestAnimationFrame.bind(window);
  let i = 0;
  const tick = () => { if (++i >= k) done(); else raf(tick); };
  raf(tick);
}), n);

test('hover or focus measurably changes transform, pool position and why opacity', async ({ page }) => {
  await page.goto('/writing');
  const p = page.locator('[data-slug="quiet-singularity"]');
  const before = { t: await p.evaluate((e) => getComputedStyle(e).transform), pool: await pool(page), why: await whyOpacity(p) };
  await p.hover();
  await expect.poll(async () => (await pool(page)).x).not.toBe(before.pool.x);
  await expect.poll(async () => await whyOpacity(p)).toBeGreaterThan(before.why);
  expect(await p.evaluate((e) => getComputedStyle(e).transform)).not.toBe(before.t);
  await expect.poll(async () => (await pool(page)).i).toBeGreaterThan(before.pool.i);
  await expect(page.locator('.room')).toHaveAttribute('data-pool', 'piece');
});

test('keyboard focus does the same as hover', async ({ page }) => {
  await page.goto('/writing');
  const before = await pool(page);
  await page.locator('[data-slug="quiet-singularity"] .piece-link').focus();
  await expect.poll(async () => (await pool(page)).x).not.toBe(before.x);
});

test('leaving a piece returns the pool to rest', async ({ page }) => {
  await page.goto('/writing');
  await poolSettled(page);
  const rest = await pool(page);
  await page.locator('[data-slug="quiet-singularity"]').hover();
  await expect(page.locator('.room')).toHaveAttribute('data-pool', 'piece');
  await page.mouse.move(2, 2);
  await expect(page.locator('.room')).toHaveAttribute('data-pool', 'rest');
  await expect.poll(async () => Math.abs((await pool(page)).x - rest.x), { timeout: 8000 }).toBeLessThan(2);
});

test('the pool settles: after a hover the light loop stops and schedules nothing more', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__n = 0;
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafNative = raf;
    window.requestAnimationFrame = (cb) => { (window as any).__n++; return raf(cb); };
  });
  await page.goto('/writing');
  const count = () => page.evaluate(() => (window as any).__n as number);
  const before = await count();
  await page.locator('[data-slug="quiet-singularity"]').hover();
  await expect.poll(async () => (await count()) - before, { message: 'hover starts the light loop' }).toBeGreaterThan(5);
  // wait until the pool has stopped moving, then silence the dust (the only other loop)
  let last = await pool(page);
  await expect.poll(async () => { const p = await pool(page); const same = p.x === last.x && p.y === last.y && p.i === last.i; last = p; return same; }, { timeout: 15000, intervals: [600] }).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'paused');
  await frames(page, 25); // a pending frame may still land
  const n = await count();
  await frames(page, 90); // about a second and a half of frames
  expect(await count()).toBe(n); // a settled pool costs nothing
});

test('dust runs again after going to an essay and coming back', async ({ page }) => {
  await page.goto('/writing');
  const d = page.locator('canvas.dust');
  await expect(d).toHaveAttribute('data-dust', 'running');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'running');
});

test('once settled and dust paused, nothing at all schedules frames', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__n = 0;
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafNative = raf;
    window.requestAnimationFrame = (cb) => { (window as any).__n++; return raf(cb); };
  });
  await page.goto('/writing');
  let last = await pool(page); // the fade-in takes a couple of seconds; wait for it to finish
  await expect.poll(async () => { const p = await pool(page); const same = p.i === last.i; last = p; return same; }, { timeout: 15000, intervals: [600] }).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'paused');
  await page.waitForTimeout(300);
  const n = await page.evaluate(() => (window as any).__n);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__n)).toBe(n);
});

test('dust runs only while visible and pauses when the tab is hidden or offscreen', async ({ page }) => {
  await page.goto('/writing');
  const d = page.locator('canvas.dust');
  await expect(d).toHaveAttribute('data-dust', 'running');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(d).toHaveAttribute('data-dust', 'paused');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(d).toHaveAttribute('data-dust', 'running');
});

test('reduced motion: static and lit, no dust, no loop', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    (window as any).__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { (window as any).__raf++; return raf(cb); };
  });
  await page.goto('/writing');
  await page.waitForTimeout(600);
  const n = await page.evaluate(() => (window as any).__raf);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__raf)).toBe(n);
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'paused');
  expect((await pool(page)).i).toBeGreaterThan(0.8);
  expect(await page.locator('[data-piece].is-lit').count()).toBe(await page.locator('[data-piece]').count());
  await ctx.close();
});

test('dust lives only inside the pool: no mote paints far from it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const measure = () => page.evaluate(() => {
    const c = document.querySelector('canvas.dust') as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const px = (x: number, y: number, w: number, h: number) => { const d = g.getImageData(x, y, w, h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; };
    return { corner: px(0, 0, 120, 120), all: px(0, 0, c.width, c.height) };
  });
  await expect.poll(async () => (await measure()).all).toBeGreaterThan(0); // motes have started to show
  const r = await measure();
  expect(r.corner).toBe(0);
  expect(r.all).toBeGreaterThan(0); // not simply blank: motes show inside the pool
});

// addInitScript runs before <html> exists, so wait for it
const setDaypart = (page: Page, part: string) => page.addInitScript((p) => {
  const apply = () => document.documentElement?.setAttribute('data-daypart', p);
  if (document.documentElement) apply();
  else new MutationObserver((_, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
}, part);

test('the data-daypart hook drives the light: night has no window light', async ({ page }) => {
  await setDaypart(page, 'night');
  await page.goto('/writing');
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'night');
  const a = await page.locator('.room').evaluate((r) => parseFloat(getComputedStyle(r).getPropertyValue('--window-alpha')));
  expect(a).toBe(0);
});

test('afternoon is dimmer than the prototype: window light alpha is low', async ({ page }) => {
  await setDaypart(page, 'afternoon');
  await page.goto('/writing');
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'afternoon');
  const a = await page.locator('.room').evaluate((r) => parseFloat(getComputedStyle(r).getPropertyValue('--window-alpha')));
  expect(a).toBeLessThanOrEqual(0.13);
  expect(a).toBeGreaterThan(0);
});

test('no lamp; the light layer is hidden from assistive tech and the pointer', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('.lamp, [class*="lamp"]')).toHaveCount(0);
  const l = page.locator('.room > .light');
  await expect(l).toHaveAttribute('aria-hidden', 'true');
  expect(await l.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
});

test('there is no hint line explaining the interactions', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('.room-hint')).toHaveCount(0);
  await expect(page.locator('.room')).not.toContainText('The light will find it');
});

test('the why line at rest still has AA contrast on the paper', async ({ page }) => {
  await page.goto('/writing');
  const c = await page.locator('[data-slug="quiet-singularity"] .piece-why').evaluate((e) => {
    const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    return { col: rgb(getComputedStyle(e).color), op: Number(getComputedStyle(e).opacity) };
  });
  const bg = [27, 29, 36]; // lightest paper gradient stop
  const mixed = c.col.map((v, i) => v * c.op + bg[i] * (1 - c.op));
  const lum = (k: number[]) => { const f = k.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const [hi, lo] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
  expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
});

test('objects stay matte with the light layer on (pixel variance of a clean patch)', async ({ page }) => {
  await page.goto('/writing');
  await settled(page);
  await poolSettled(page);
  const shot = await page.locator('[data-slug="quiet-singularity"] .sheet.cover').screenshot();
  const sd = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    const d = g.getImageData(120, 150, 40, 40).data; const v: number[] = [];
    for (let i = 0; i < d.length; i += 4) v.push(d[i]);
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  }, shot.toString('base64'));
  expect(sd).toBeLessThan(6);
});

test('phones: scrolling lights the piece nearest the centre', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const slugs = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
  expect(slugs.length).toBeGreaterThan(1);
  const lit = () => page.locator('[data-piece].is-lit').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.slug));
  const nearest = () => page.evaluate(() => {
    const ps = [...document.querySelectorAll<HTMLElement>('[data-piece]')];
    const d = ps.map((p) => { const r = p.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - innerHeight / 2); });
    return ps[d.indexOf(Math.min(...d))].dataset.slug;
  });
  const seen = new Set<string>();
  for (const y of [0, 500, 1000, 1700, 99999]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const want = (await nearest())!;
    seen.add(want);
    await expect.poll(lit).toEqual([want]);
  }
  expect(seen.size).toBeGreaterThan(1); // the light really did move with the scroll
  await expect(page.locator('.room')).toHaveAttribute('data-pool', 'piece');
  await ctx.close();
});
