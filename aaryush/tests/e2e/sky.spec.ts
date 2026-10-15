import { expect, test, type Page } from '@playwright/test';
import { encodeTile } from '../../scripts/sky-tile-encode.mjs';

test.use({ timezoneId: 'America/Chicago' }); // the time-zone guess is then Chicago, 41.9N 87.6W

// E17: the hero is the live star chart. Hidden keys: L (labels and readout), [ and ] (the rate). Shown, never explained.
const field = (page: Page) => page.locator('canvas#field');
const hero = (page: Page) => page.locator('#hero');
const readout = (page: Page) => page.locator('#hero .sky-readout');
const opacity = (page: Page) => readout(page).evaluate((e) => Number(getComputedStyle(e).opacity));
const CATALOGUE = '**/sky/s*-b*.bin';
/** A small stand-in for a star tile: 20 faint stars, in the real binary format. */
const tile = () => ({
  contentType: 'application/octet-stream',
  body: Buffer.from(encodeTile(Array.from({ length: 20 }, (_, i) => ({ ra: (i * 17.3) % 360, dec: ((i * 9) % 150) - 70, mag: 5 + (i % 12) * 0.2, bv: ((i % 14) - 2) * 0.12 })))),
});
const tileUrls = (page: Page) => {
  const urls: string[] = [];
  page.on('request', (r) => { const m = /\/sky\/s(\d)-b(\d+)\.bin$/.exec(new URL(r.url()).pathname); if (m) urls.push(`s${m[1]}-b${m[2]}`); });
  return urls;
};
const swept = (page: Page) => expect(field(page)).toHaveAttribute('data-sweep', 'done', { timeout: 20000 });
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

test('the sky makes no outside call: the star tiles come from our own site', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => { if (!/localhost/.test(r.url()) && !r.url().startsWith('data:')) calls.push(r.url()); });
  const urls = tileUrls(page);
  await onScreen(page);
  await swept(page);
  expect(calls).toEqual([]);
  expect(urls.length).toBeGreaterThan(5);
  const n = Number(await dataset(page, 'stars'));
  const phoneRun = test.info().project.name.includes('mobile');
  expect(n).toBeGreaterThan(phoneRun ? 7000 : 15000); // a real sky: thousands of stars for a phone, many more on desktop
  expect(n).toBeLessThan(26000);
});

test('bands of sky that can never be seen are never fetched (and the visible ones are)', async ({ page }) => {
  const urls = tileUrls(page);
  await onScreen(page);
  await swept(page);
  // Chicago, 41.9N: the far southern bands 0 and 1 (below -60) can never reach the frame
  expect(urls.filter((u) => /-b(0|1)$/.test(u))).toEqual([]);
  for (const b of [2, 5, 11]) expect(urls).toContain(`s0-b${b}`);
});

test('from the southern hemisphere it is the far northern bands that are skipped', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'Australia/Sydney' });
  const page = await ctx.newPage();
  const urls = tileUrls(page);
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await swept(page);
  expect(urls.filter((u) => /-b(10|11)$/.test(u))).toEqual([]);
  for (const b of [0, 4, 9]) expect(urls).toContain(`s0-b${b}`);
  await ctx.close();
});

test('the first draw comes before any tile, and the tiles then merge in', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let asked = 0;
  await page.route(CATALOGUE, async (route) => { asked++; await gate; await route.fulfill(tile()); });
  await onScreen(page);
  // up already, on the small baked set, with no tile in yet
  expect(Number(await dataset(page, 'firstDraw'))).toBeGreaterThan(0);
  expect(Number(await dataset(page, 'stars'))).toBeGreaterThan(200);
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
  expect(await dataset(page, 'catalogue')).toBe('pending');
  await expect.poll(() => asked, { timeout: 15000 }).toBeGreaterThanOrEqual(1);
  expect(await dataset(page, 'catalogue')).toBe('pending');
  const before = Number(await dataset(page, 'stars'));
  release();
  await expect(field(page)).toHaveAttribute('data-catalogue', 'loaded');
  await swept(page);
  const tiles = Number(await dataset(page, 'tiles'));
  expect(tiles).toBeGreaterThan(5);
  expect(Number(await dataset(page, 'stars'))).toBe(before + 20 * tiles);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
});

test('blocked or failed tiles leave the small sky running, with no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(CATALOGUE, (route) => route.abort());
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'failed', { timeout: 20000 });
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  const a = await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(800);
  expect(await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(a);
  expect(errors).toEqual([]);
});

test('junk or a 404 where a tile should be is treated as a failure', async ({ page }) => {
  await page.route(CATALOGUE, (route) => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'not a tile at all' }));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'failed', { timeout: 20000 });
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
});

test('Save-Data fetches no tiles at all', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }); });
  const urls = tileUrls(page);
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-catalogue', 'failed', { timeout: 20000 });
  expect(urls).toEqual([]);
  expect(Number(await dataset(page, 'stars'))).toBeLessThan(500);
});

test('phones fetch only the first two shells (to magnitude 6.5); desktop all four', async ({ page }) => {
  const urls = tileUrls(page);
  await onScreen(page);
  await swept(page);
  const shells = new Set(urls.map((u) => u.slice(0, 2)));
  if (test.info().project.name.includes('mobile')) expect([...shells].sort()).toEqual(['s0', 's1']);
  else expect([...shells].sort()).toEqual(['s0', 's1', 's2', 's3']);
});

test('a position that moves the latitude fetches the bands it newly needs', async ({ page }) => {
  const urls = tileUrls(page);
  await page.route(API, (route) => route.fulfill({ json: { lat: -60.5, lon: 20 } }));
  await onScreen(page);
  await expect.poll(() => urls.includes('s0-b0'), { timeout: 20000 }).toBe(true); // band 0 only shows from the far south
  await swept(page);
  expect(await dataset(page, 'loc')).toBe('connection');
});

test('the console says what landed, once, with the real count', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await onScreen(page);
  await swept(page);
  await expect.poll(() => logs.filter((l) => l.includes('stars · Hipparcos via d3-celestial · your sky over')).length, { timeout: 10000 }).toBe(1);
  const line = logs.find((l) => l.includes('your sky over'))!;
  const n = Number(/([\d,]+) stars/.exec(line)![1].replace(/,/g, ''));
  expect(n).toBe(Number(await dataset(page, 'stars')));
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
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
  // the late arrivals (Milky Way, catalogue) redraw the one still frame; after that it never changes
  await swept(page);
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
  await page.goto('/'); // moving between pages in the visit keeps the chosen speed
  await expect(field(page)).toHaveClass(/\bon\b/, { timeout: 15000 });
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

// ---------- where the sky is looking from: the guess, the connection, the visitor ----------
const API = '**/api/sky';
const PRECISE = JSON.stringify({ lat: 48.86, lon: 2.35 });
const CHICAGO = { lat: 41.88, lon: -87.63 }; // the time-zone table's Chicago (the readout shows 41.9°N 87.6°W)
/** Counts calls to getCurrentPosition (the prompt), before any page script runs. */
const countGeolocation = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { __geo: number }).__geo = 0;
    const g = navigator.geolocation;
    const orig = g.getCurrentPosition.bind(g);
    g.getCurrentPosition = (...a: Parameters<Geolocation['getCurrentPosition']>) => { (window as unknown as { __geo: number }).__geo++; return orig(...a); };
  });
const geoCalls = (page: Page) => page.evaluate(() => (window as unknown as { __geo: number }).__geo);
const where = async (page: Page) => ({ loc: await dataset(page, 'loc'), lat: Number(await dataset(page, 'lat')), lon: Number(await dataset(page, 'lon')) });

test('the connection moves the sky: it glides there and the readout follows', async ({ page }) => {
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  await page.route(API, async (route) => { await gate; await route.fulfill({ json: { lat: -33.9, lon: 151.2 } }); });
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.05);
  expect(await where(page)).toEqual({ loc: 'zone', ...CHICAGO });
  setTimeout(release, 300); // the answer lands just after sampling starts
  // sample the readout's latitude every frame for 4 s
  const lats = await page.evaluate(() => new Promise<number[]>((resolve) => {
    const out: number[] = [];
    const t0 = performance.now();
    const el = document.querySelector('#hero .sky-readout')!;
    const tick = () => {
      const m = /(\d+\.\d)°([NS])/.exec(el.textContent ?? '');
      if (m) out.push((m[2] === 'S' ? -1 : 1) * Number(m[1]));
      if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else resolve(out);
    };
    tick();
  }));
  expect(lats[0]).toBeCloseTo(41.9, 0);
  expect(lats.at(-1)).toBeCloseTo(-33.9, 0);
  const between = lats.filter((v) => v < 38 && v > -30);
  expect(between.length).toBeGreaterThan(test.info().project.name.includes('webkit') || test.info().project.name === 'mobile-safari' ? 2 : 5); // it travelled, it did not jump (headless WebKit paints fewer frames)
  for (let i = 1; i < lats.length; i++) expect(lats[i]).toBeLessThanOrEqual(lats[i - 1] + 0.05); // and only one way
  expect(await where(page)).toEqual({ loc: 'connection', lat: -33.9, lon: 151.2 });
  await expect.poll(async () => (await readout(page).textContent()) ?? '').toContain('33.9°S 151.2°E');
});

test('no coordinates (204), an error, or a slow answer keep the time-zone guess', async ({ page }) => {
  for (const [name, handler] of [
    ['204', (route: import('@playwright/test').Route) => route.fulfill({ status: 204 })],
    ['404', (route: import('@playwright/test').Route) => route.fulfill({ status: 404, body: 'nope' })],
    ['junk', (route: import('@playwright/test').Route) => route.fulfill({ json: { lat: 'x', lon: 500 } })],
    ['slow', async (route: import('@playwright/test').Route) => { await new Promise((r) => setTimeout(r, 4000)); await route.fulfill({ json: { lat: 10, lon: 10 } }).catch(() => {}); }],
  ] as const) {
    const ctx = await page.context().browser()!.newContext({ timezoneId: 'America/Chicago' });
    const pg = await ctx.newPage();
    const errors: string[] = [];
    pg.on('pageerror', (e) => errors.push(e.message));
    await pg.route(CATALOGUE, (route) => route.fulfill(tile()));
    await pg.route(API, handler);
    await onScreen(pg);
    await pg.waitForTimeout(name === 'slow' ? 3200 : 1800); // past the 1.5 s timeout
    expect(await where(pg), name).toEqual({ loc: 'zone', ...CHICAGO });
    await expect(field(pg)).toHaveAttribute('data-running', 'true');
    expect(errors, name).toEqual([]);
    await ctx.close();
  }
});

test('nothing asks for the location on load, and L alone does not either', async ({ page }) => {
  await countGeolocation(page);
  await page.route(API, (route) => route.fulfill({ json: { lat: 10, lon: 10 } }));
  await onScreen(page);
  await page.waitForTimeout(1500);
  expect(await geoCalls(page)).toBe(0);
  await page.keyboard.press('l');
  await page.waitForTimeout(500);
  expect(await geoCalls(page)).toBe(0);
});

test('the readout is a button only while the labels are on, with nothing said about it', async ({ page }) => {
  await onScreen(page);
  const info = () => readout(page).evaluate((e) => ({ tag: e.tagName, tab: (e as HTMLElement).tabIndex, hidden: e.getAttribute('aria-hidden'), title: e.getAttribute('title'), label: e.getAttribute('aria-label'), cursor: getComputedStyle(e).cursor, events: getComputedStyle(e).pointerEvents }));
  expect(await info()).toMatchObject({ tag: 'BUTTON', tab: -1, hidden: 'true', events: 'none' });
  await page.keyboard.press('l');
  await expect.poll(async () => (await info()).hidden).toBeNull();
  expect(await info()).toMatchObject({ tab: 0, cursor: 'pointer', events: 'auto', title: null, label: null });
  await page.keyboard.press('l');
  await expect.poll(async () => (await info()).hidden).toBe('true');
  expect(await info()).toMatchObject({ tab: -1, events: 'none' });
});

test('clicking the readout asks the browser, and an allowed position moves the sky exactly there', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: ['geolocation'], geolocation: { latitude: 48.8566, longitude: 2.3522 } });
  const page = await ctx.newPage();
  await countGeolocation(page);
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  expect(await geoCalls(page)).toBe(0);
  expect(await readout(page).textContent()).toContain('41.9°N 87.6°W'); // one decimal until they opt in
  await readout(page).click();
  expect(await geoCalls(page)).toBe(1);
  await expect(field(page)).toHaveAttribute('data-loc', 'device');
  expect(await where(page)).toEqual({ loc: 'device', lat: 48.86, lon: 2.35 });
  // the second decimal fades in: for a moment each coordinate ends in a half-faded digit, then it settles to plain text
  await expect.poll(() => readout(page).locator('span.dx').count(), { timeout: 3000 }).toBe(2);
  const op = await readout(page).locator('span.dx').first().evaluate((e) => Number(getComputedStyle(e).opacity));
  expect(op).toBeGreaterThanOrEqual(0);
  expect(op).toBeLessThanOrEqual(1);
  await expect.poll(() => readout(page).locator('span.dx').count(), { timeout: 4000 }).toBe(0);
  await expect.poll(async () => (await readout(page).textContent()) ?? '', { timeout: 6000 }).toContain('48.86°N 2.35°E');
  // remembered for the session: after a reload it starts there, with no prompt
  await page.reload();
  await expect(field(page)).toHaveClass(/\bon\b/, { timeout: 15000 });
  expect(await where(page)).toEqual({ loc: 'device', lat: 48.86, lon: 2.35 });
  await ctx.close();
});

test('under reduced motion the precise position and its second decimal swap in at once', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', reducedMotion: 'reduce', permissions: ['geolocation'], geolocation: { latitude: 48.8566, longitude: 2.3522 } });
  const page = await ctx.newPage();
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(async () => (await readout(page).textContent()) ?? '').toContain('41.9°N 87.6°W');
  await readout(page).click();
  await expect.poll(async () => (await readout(page).textContent()) ?? '', { timeout: 4000 }).toContain('48.86°N 2.35°E');
  expect(await readout(page).locator('span.dx').count()).toBe(0);
  await ctx.close();
});

test('the keyboard works too: Tab to the readout and press Enter', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: ['geolocation'], geolocation: { latitude: -37.8136, longitude: 144.9631 } });
  const page = await ctx.newPage();
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.keyboard.press('l');
  await readout(page).focus();
  await expect(readout(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(field(page)).toHaveAttribute('data-loc', 'device');
  expect(await where(page)).toEqual({ loc: 'device', lat: -37.81, lon: 144.96 });
  await ctx.close();
});

test('a declined or failed position changes nothing and says nothing', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: [] });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await countGeolocation(page);
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  const before = await readout(page).textContent();
  await readout(page).click();
  await expect.poll(() => geoCalls(page)).toBe(1);
  await page.waitForTimeout(1500);
  expect(await where(page)).toEqual({ loc: 'zone', ...CHICAGO });
  expect(await readout(page).textContent()).toContain('41.9°N 87.6°W');
  expect(before).toContain('41.9°N 87.6°W');
  await expect(field(page)).toHaveAttribute('data-running', 'true');
  expect(errors.filter((e) => !/Failed to load resource|was preloaded using link preload/.test(e))).toEqual([]); // WebKit warns about unused modulepreloads; not an error of ours
  await ctx.close();
});

test('the console line says where the position came from', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ json: { lat: 51.5, lon: -0.1 } }));
  await onScreen(page);
  await expect.poll(() => logs.find((l) => l.includes('your sky over')) ?? '', { timeout: 15000 }).toContain('51.5°N 0.1°W · from your IP');
  const line = logs.find((l) => l.includes('your sky over'))!;
  expect(logs.filter((l) => l.includes('your sky over'))).toHaveLength(1);
  expect(line).toContain('stars · Hipparcos via d3-celestial');
});

// ---------- the Vercel preview fixes: credentials, redirects, permission, reload ----------
test('the position fetch is same-origin, never follows a redirect, and is never cached', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __fetches: { url: string; init: RequestInit }[] };
    w.__fetches = [];
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => { w.__fetches.push({ url: String(input), init: init ?? {} }); return orig(input, init); };
  });
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fetches: { url: string }[] }).__fetches.some((f) => f.url === '/api/sky')), { timeout: 15000 }).toBe(true);
  const init = await page.evaluate(() => (window as unknown as { __fetches: { url: string; init: RequestInit }[] }).__fetches.find((f) => f.url === '/api/sky')!.init);
  expect(init.credentials).toBe('same-origin');
  expect(init.redirect).toBe('error');
  expect(init.cache).toBe('no-store');
});

test('a redirect to an auth page fails fast: the redirect is never followed, and the guess stands', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright cannot fulfill a route with a 302 in WebKit');
  const followed: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/sso-target')) followed.push(r.url()); });
  await page.route(API, (route) => route.fulfill({ status: 302, headers: { location: new URL('/sso-target', page.url() === 'about:blank' ? 'http://localhost:4330' : page.url()).toString() }, body: '' }));
  await onScreen(page);
  await swept(page);
  await page.waitForTimeout(1500);
  expect(followed).toEqual([]);
  expect((await where(page)).loc).toBe('zone');
  await expect(field(page)).toHaveAttribute('data-running', 'true');
});

test('a reload resets the speed; moving between pages keeps it', async ({ page }) => {
  await onScreen(page);
  const rate = () => field(page).getAttribute('data-rate');
  const first = await rate();
  await page.keyboard.press(']');
  await expect.poll(rate).not.toBe(first);
  const chosen = await rate();
  await page.reload();
  await expect(field(page)).toHaveClass(/\bon\b/, { timeout: 15000 });
  expect(await rate()).toBe(first); // a deliberate reload: back to the default
  await page.keyboard.press(']');
  await expect.poll(rate).toBe(chosen);
  await page.goto('/writing');
  await page.goto('/');
  await expect(field(page)).toHaveClass(/\bon\b/, { timeout: 15000 });
  expect(await rate()).toBe(chosen); // normal navigation: kept
});

const storePrecise = (page: Page) => page.addInitScript((v) => { try { if (!sessionStorage.getItem('sky:loc')) sessionStorage.setItem('sky:loc', v); } catch { /* */ } }, PRECISE);
const stored = (page: Page) => page.evaluate(() => sessionStorage.getItem('sky:loc'));

test('a stored precise position is dropped when the permission is no longer granted', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: [] });
  const page = await ctx.newPage();
  await storePrecise(page);
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await expect.poll(async () => (await where(page)).loc, { timeout: 5000 }).not.toBe('device');
  expect(await where(page)).toEqual({ loc: 'zone', ...CHICAGO });
  expect(await stored(page)).toBeNull();
  await page.keyboard.press('l');
  await expect.poll(async () => (await readout(page).textContent()) ?? '').toContain('41.9°N 87.6°W');
  await ctx.close();
});

test('a stored precise position is kept while the permission is still granted', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: ['geolocation'], geolocation: { latitude: 48.8566, longitude: 2.3522 } });
  const page = await ctx.newPage();
  await storePrecise(page);
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.waitForTimeout(800);
  expect(await where(page)).toEqual({ loc: 'device', lat: 48.86, lon: 2.35 });
  expect(await stored(page)).toBe(PRECISE);
  await ctx.close();
});

test('without the Permissions API a stored precise position is kept as before', async ({ browser }) => {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: [] });
  const page = await ctx.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true }); });
  await storePrecise(page);
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ status: 204 }));
  await onScreen(page);
  await page.waitForTimeout(800);
  expect(await where(page)).toEqual({ loc: 'device', lat: 48.86, lon: 2.35 });
  await ctx.close();
});

test('revoking the permission mid-session drops back to one decimal', async ({ browser, browserName }) => {
  test.skip(browserName === 'webkit', "Playwright's clearPermissions does not fire a permission change in WebKit, so the page never sees the revoke");
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', permissions: ['geolocation'], geolocation: { latitude: 48.8566, longitude: 2.3522 } });
  const page = await ctx.newPage();
  await page.route(CATALOGUE, (route) => route.fulfill(tile()));
  await page.route(API, (route) => route.fulfill({ json: { lat: 51.5, lon: -0.1 } }));
  await onScreen(page);
  await page.keyboard.press('l');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  await readout(page).click();
  await expect.poll(async () => (await readout(page).textContent()) ?? '', { timeout: 8000 }).toContain('48.86°N 2.35°E');
  await ctx.clearPermissions();
  await expect.poll(async () => (await where(page)).loc, { timeout: 8000 }).not.toBe('device');
  expect(await stored(page)).toBeNull();
  // back to the default (here the connection's answer) at one decimal
  await expect.poll(async () => (await readout(page).textContent()) ?? '', { timeout: 8000 }).toMatch(/5\d\.\d°N 0\.\d°W|41\.9°N 87\.6°W/);
  expect(await readout(page).textContent()).not.toMatch(/\d\.\d\d°/);
  await ctx.close();
});

// ---------- meteors: the hover rush and the click burst ----------
const spawned = async (page: Page) => Number((await dataset(page, 'spawned')) ?? 0);
const bursts = async (page: Page) => Number((await dataset(page, 'bursts')) ?? 0);
/** A point on the hero that is bare background: not a link, button or the readout. */
const bareSpot = (page: Page) => page.evaluate(() => {
  const hero = document.getElementById('hero')!, r = hero.getBoundingClientRect();
  for (let y = Math.max(r.top, 0) + 90; y < Math.min(r.bottom, innerHeight) - 20; y += 23) {
    for (let x = r.right - 6; x > r.left + 6; x -= 41) {
      const el = document.elementFromPoint(x, y);
      if (el && hero.contains(el) && !el.closest('a, button, input, [role="button"]') && !el.closest('.name, .rot, .lede')) return { x, y };
    }
  }
  return null;
});

test('hovering the hero starts a rush: a few meteors within the first second or two', async ({ page }) => {
  test.skip(test.info().project.name.includes('mobile'), 'the hover is a desktop thing');
  await onScreen(page, 'night');
  const base0 = await spawned(page);
  await page.waitForTimeout(1000);
  expect((await spawned(page)) - base0).toBeLessThanOrEqual(1); // an ordinary second has about none
  const before = await spawned(page);
  await page.mouse.move(900, 330);
  await page.mouse.move(930, 340);
  await page.waitForTimeout(1500);
  expect((await spawned(page)) - before).toBeGreaterThanOrEqual(2);
});

test('a click on the hero background sets off a small burst of meteors; a click on a link sets off none', async ({ page }) => {
  await onScreen(page, 'night');
  await page.waitForTimeout(300);
  const spot = (await bareSpot(page))!;
  expect(spot).not.toBeNull();
  const a = await spawned(page), ba = await bursts(page);
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(300);
  const made = (await spawned(page)) - a;
  expect(made).toBeGreaterThanOrEqual(2);
  expect((await bursts(page)) - ba).toBe(1);
  // a link: add one to the hero and click it
  await page.evaluate(() => {
    const l = document.createElement('a');
    l.id = 'probe-link'; l.href = '#probe-link'; l.textContent = 'x';
    l.style.cssText = 'position:absolute;left:10px;top:100px;z-index:5;padding:10px;color:#fff';
    document.getElementById('hero')!.appendChild(l);
  });
  await page.waitForTimeout(2500); // past the bursts and the rush
  const bb = await bursts(page);
  await page.locator('#probe-link').click();
  await page.waitForTimeout(350);
  expect((await bursts(page)) - bb).toBe(0); // (a hover can still start the ordinary rush; a link click never makes a burst)
});

test('rapid clicking cannot flood the sky', async ({ page }) => {
  await onScreen(page, 'night');
  await page.waitForTimeout(300);
  const spot = (await bareSpot(page))!;
  const a = await spawned(page);
  for (let i = 0; i < 8; i++) await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(250);
  expect((await spawned(page)) - a).toBeLessThanOrEqual(9); // one burst of up to 4, plus whatever the rush adds
});

test('under reduced motion a click sets off nothing', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await onScreen(page, 'night');
  const spot = (await bareSpot(page))!;
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(400);
  expect(await spawned(page)).toBe(0);
  await ctx.close();
});

// ---------- the trickle ----------
test('stars trickle in: small batches, continuously, starting before the downloads are done', async ({ page }) => {
  test.setTimeout(60000);
  const phoneRun = test.info().project.name.includes('mobile');
  await onScreen(page);
  const read = async () => ({ revealed: Number(await dataset(page, 'revealed')), stars: Number(await dataset(page, 'stars')), t: Date.now() });
  const series: { revealed: number; stars: number; t: number }[] = [];
  for (let k = 0; k < 200; k++) {
    const r = await read();
    series.push(r);
    if (r.revealed >= r.stars && (await dataset(page, 'sweep')) === 'done' && r.stars > 1000) break;
    await page.waitForTimeout(250);
  }
  const last = series.at(-1)!;
  expect(last.revealed).toBe(last.stars); // all of them arrive in the end
  const base = series[0].revealed;
  const growing = series.filter((r) => r.revealed > base + 50 && r.revealed < last.stars - 50);
  expect(growing.length).toBeGreaterThanOrEqual(phoneRun ? 3 : 10); // a continuous fill, sampled many times on the way
  // no big jumps: 150 to 300 stars per 80 to 120 ms is at most 3,750 a second (a whole tile at once would be far more)
  for (let i = 1; i < series.length; i++) {
    const dt = (series[i].t - series[i - 1].t) / 1000;
    expect(series[i].revealed - series[i - 1].revealed, `step ${i}`).toBeLessThanOrEqual(Math.ceil(4000 * dt) + 300);
  }
  const first = series.find((r) => r.revealed > base + 50)!;
  const seconds = (last.t - first.t) / 1000;
  expect(seconds).toBeGreaterThan(phoneRun ? 1 : 4);
  expect(seconds).toBeLessThan(phoneRun ? 9 : 16);
  // it began while tiles were still being fetched or decoded: some of the sky was waiting its turn when the sweep ended
  expect(series.some((r) => r.revealed < r.stars && r.revealed > base)).toBe(true);
});

test('under reduced motion every star is in place at once, with no trickle', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await onScreen(page);
  await swept(page);
  await page.waitForTimeout(400);
  expect(Number(await dataset(page, 'revealed'))).toBe(Number(await dataset(page, 'stars')));
  await ctx.close();
});
