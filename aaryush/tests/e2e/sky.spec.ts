import { expect, test, type Page } from '@playwright/test';

// E17: the hero is the live star chart. Hidden keys: L (labels and readout), [ and ] (the rate). Shown, never explained.
const field = (page: Page) => page.locator('canvas#field');
const hero = (page: Page) => page.locator('#hero');
const readout = (page: Page) => page.locator('#hero .sky-readout');
const opacity = (page: Page) => readout(page).evaluate((e) => Number(getComputedStyle(e).opacity));
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

test('the sky makes no network call of its own', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => { if (!/localhost/.test(r.url()) && !r.url().startsWith('data:')) calls.push(r.url()); });
  await onScreen(page);
  expect(calls).toEqual([]);
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
  await onScreen(page);
  await expect(field(page)).toHaveAttribute('data-running', 'false');
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

test('L toggles the labels and the readout, and nothing hints at it', async ({ page }) => {
  await onScreen(page);
  expect(await opacity(page)).toBe(0);
  await expect(hero(page)).not.toHaveClass(/sky-labels/);
  await page.keyboard.press('l');
  await expect(hero(page)).toHaveClass(/sky-labels/);
  await expect(field(page)).toHaveAttribute('data-labels', 'true');
  await expect.poll(() => opacity(page)).toBeGreaterThan(0.4);
  const text = (await readout(page).textContent()) ?? '';
  expect(text).toMatch(/^Live · \d+\.\d°[NS] \d+\.\d°[EW] · \d\d:\d\d local · T\+\d\dh\d\dm · LST \d+h\d\dm · Moon \d+% · ×\d+$/);
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

test('[ and ] change the rate, capped at 50x to 500x, and it is remembered for the session', async ({ page }) => {
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
  for (let i = 0; i < 12; i++) await page.keyboard.press(']');
  await expect(field(page)).toHaveAttribute('data-rate', '500');
  await page.keyboard.press('l');
  await expect.poll(() => readout(page).textContent()).toContain('×500');
  await page.reload();
  await expect(field(page)).toHaveAttribute('data-rate', '500');
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
