import { expect, test, type Page } from '@playwright/test';

// E17: the hero is the live star chart. Hidden keys: L (labels and readout), [ and ] (the rate). Shown, never explained.
const field = (page: Page) => page.locator('canvas#field');
const hero = (page: Page) => page.locator('#hero');
const readout = (page: Page) => page.locator('#hero .sky-readout');
const opacity = (page: Page) => readout(page).evaluate((e) => Number(getComputedStyle(e).opacity));
const CATALOGUE = '**/d3-celestial@0.7.35/data/stars.6.json';
/** A small stand-in for the fetched catalogue: 60 faint stars, plus rows the engine must ignore (bright, or malformed). */
const fixture = () => ({
  type: 'FeatureCollection',
  features: [
    ...Array.from({ length: 60 }, (_, i) => ({ type: 'Feature', id: 900000 + i, properties: { mag: 4.2 + (i % 18) * 0.1, bv: String(((i % 14) - 2) * 0.12) }, geometry: { type: 'Point', coordinates: [(i * 47.3) % 360 - 180, ((i * 29) % 160) - 80] } })),
    { type: 'Feature', id: 1, properties: { mag: 1.2, bv: '0.2' }, geometry: { type: 'Point', coordinates: [10, 10] } }, // already in the baked set
    { type: 'Feature', id: 2, properties: {}, geometry: { type: 'Point', coordinates: [10, 10] } }, // no magnitude
    { type: 'Feature', id: 3, properties: { mag: 5 }, geometry: {} }, // no position
  ],
});
const dataset = (page: Page, key: string) => field(page).evaluate((c: HTMLCanvasElement, k) => c.dataset[k], key);
const onScreen = async (page: Page, part = 'night') => {
  // a fixed period, so the star count doesn't depend on the clock the test runs at
  await page.addInitScript((v) => {
    const set = () => !!document.documentElement && (document.documentElement.setAttribute('data-daypart', v), true);
    if (!set()) new MutationObserver((_m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true });
  }, part);
  await page.goto('/');
  await expect(field(page)).toHaveClass(/\bon\b/, { timeout: 15000 });
};

test('it draws a populated sky and fades in after load', async ({ page }) => {
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  const stats = await field(page).evaluate((cv: HTMLCanvasElement) => {
    const { data } = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 330) bright++;
    return { bright, w: cv.width };
  });
  expect(stats.bright).toBeGreaterThan(80);
});

test('the only outside call is the star catalogue from jsDelivr', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => { if (!/localhost/.test(r.url()) && !r.url().startsWith('data:')) calls.push(r.url()); });
  await page.route(CATALOGUE, (route) => route.fulfill({ json: fixture() }));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'loaded', { timeout: 15000 });
  expect(calls).toEqual(['https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/stars.6.json']);
});

test('the first draw comes before the catalogue fetch, and the catalogue then merges in', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let asked = 0;
  await page.route(CATALOGUE, async (route) => { asked++; await gate; await route.fulfill({ json: fixture() }); });
  await onScreen(page);
  // up already, on the small baked set, with the catalogue not yet in
  expect(Number(await dataset(page, 'firstDraw'))).toBeGreaterThan(0);
  expect(Number(await dataset(page, 'stars'))).toBeGreaterThan(200);
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
  expect(await dataset(page, 'catalogue')).toBe('pending');
  await expect.poll(() => asked, { timeout: 15000 }).toBe(1);
  expect(await dataset(page, 'catalogue')).toBe('pending');
  const before = Number(await dataset(page, 'stars'));
  release();
  await expect(field(page)).toHaveAttribute('data-catalogue', 'loaded');
  expect(Number(await dataset(page, 'stars'))).toBe(before + 60);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
});

test('a blocked or failed catalogue leaves the small sky running, with no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(CATALOGUE, (route) => route.abort());
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'failed', { timeout: 15000 });
  const n = Number(await dataset(page, 'stars'));
  expect(n).toBeLessThan(500);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  const a = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(800);
  expect(await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(a);
  expect(errors).toEqual([]);
});

test('a server error or junk from the catalogue is treated as a failure', async ({ page }) => {
  await page.route(CATALOGUE, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"nope":true}' }));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'failed', { timeout: 15000 });
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
});

test('the console says what landed, once', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.route(CATALOGUE, (route) => route.fulfill({ json: fixture() }));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'loaded', { timeout: 15000 });
  await expect.poll(() => logs.filter((l) => l.includes('stars · Hipparcos via d3-celestial · your sky over')).length).toBe(1);
});

test('it pauses when scrolled away and resumes when the hero returns', async ({ page }) => {
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(field(page)).toHaveAttribute('data-running', 'true');
});

test('under reduced motion it is one still frame', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route(CATALOGUE, (route) => route.fulfill({ json: fixture() }));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  // the late arrivals (Milky Way, catalogue) redraw the one still frame; after that it never changes
  await expect(field(page)).toHaveAttribute('data-catalogue', 'loaded', { timeout: 15000 });
  await page.waitForTimeout(800);
  const a = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(1200);
  const b = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(b).toBe(a);
  await ctx.close();
});

test('while it runs, the picture moves', async ({ page }) => {
  await onScreen(page);
  const a = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(1500);
  const b = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(b).not.toBe(a);
});

const hmsToSec = (h: string, m: string, sec: string) => Number(h) * 3600 + Number(m) * 60 + Number(sec);
const parseReadout = (t: string) => {
  const tp = /T\+(\d\d)h(\d\d)m(\d\d)s/.exec(t), lst = /LST (\d+)h(\d\d)m(\d\d)s/.exec(t);
  return { t: hmsToSec(tp![1], tp![2], tp![3]), lst: hmsToSec(lst![1], lst![2], lst![3]) };
};

test('T+ and LST both follow the simulated sky, and roll by the second', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'), 'phones run 150x; the check is the same ratio');
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  const read = async () => parseReadout((await readout(page).textContent()) ?? '');
  const a = await read();
  // it rolls: the text changes within a fraction of a second
  const first = await readout(page).textContent();
  await expect.poll(async () => readout(page).textContent(), { timeout: 1000 }).not.toBe(first);
  await page.waitForTimeout(1500);
  const b = await read();
  const dT = b.t - a.t, dL = ((b.lst - a.lst) + 86400) % 86400;
  expect(dT).toBeGreaterThan(150); // 225x for more than a second of real time
  expect(dL / dT).toBeGreaterThan(0.98); // sidereal seconds per simulated second is 1.0027
  expect(dL / dT).toBeLessThan(1.03);
});

test('L toggles the labels and the readout, and nothing hints at it', async ({ page }) => {
  await onScreen(page);
  expect(await opacity(page)).toBe(0);
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
  await page.keyboard.press('l');
  await expect(hero(page)).toHaveClass(/sky-labels/);
  await expect(field(page)).toHaveAttribute('data-labels', 'true');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  const text = (await readout(page).textContent()) ?? '';
  expect(text).toMatch(/^Live · \d+\.\d°[NS] \d+\.\d°[EW] · \d\d:\d\d local · T\+\d\dh\d\dm\d\ds · LST \d+h\d\dm\d\ds · Moon \d+% · ×\d+$/);
  await page.keyboard.press('L');
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
  await expect.poll(() => opacity(page)).toBeLessThan(0.05);
  // the keyboard map never lists it
  await page.keyboard.press('?');
  const map = page.locator('#keymap');
  await expect(map).toBeVisible();
  const mapText = ((await map.textContent()) ?? '').toLowerCase();
  expect(mapText).not.toMatch(/label|readout|sky|speed|rate/);
  await page.keyboard.press('Escape');
});

test('[ and ] change the rate, capped at 50x to 1000x, and it is remembered for the session', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'), 'phones start at 150x; the ladder is the same');
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-rate', '225');
  await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '250');
  await page.keyboard.press('[');
  await page.keyboard.press('[');
  await expect(field(page)).toHaveAttribute('data-rate', '150'); // 250 -> 200 -> 150

  for (let i = 0; i < 10; i++) await page.keyboard.press('[');
  await expect(field(page)).toHaveAttribute('data-rate', '50');
  for (let i = 0; i < 7; i++) await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '500');
  await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '700');
  await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '1000');
  for (let i = 0; i < 5; i++) await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '1000');
  await page.keyboard.press('l');
  await expect.poll(() => readout(page).textContent()).toContain('×1000');
  await page.reload();
  await expect(field(page)).toHaveAttribute('data-rate', '1000');
});

test('the keys are ignored inside a text field, and g then l still goes to the levels', async ({ page }) => {
  await onScreen(page);
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = 'probe';
    document.body.appendChild(i);
    i.focus();
  });
  const rate = await field(page).getAttribute('data-rate');
  await page.keyboard.type('l[]L');
  expect(await field(page).getAttribute('data-rate')).toBe(rate);
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
  await page.evaluate(() => (document.getElementById('probe') as HTMLElement).remove());
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('g');
  await page.keyboard.press('l');
  await expect(page).toHaveURL(/#levels$/);
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
});

test('the typed words contextos and ag. do not set anything off', async ({ page }) => {
  await onScreen(page);
  await page.keyboard.type('contextos');
  await page.keyboard.type('ag.');
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
  await expect(field(page)).toHaveAttribute('data-rate', /^(150|225)$/);
});
