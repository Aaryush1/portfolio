import { expect, test, type Page } from '@playwright/test';
import { settled } from './settle';
import path from 'node:path';

// E7 (general notes) and the calmer phone topography. Chicago time so the boundary hours are the visitor's local hours.
test.use({ timezoneId: 'America/Chicago' });
const SHOTS = path.resolve(process.cwd(), '../portfolio-explorations/shots'); // commands run from aaryush/
const note = (page: Page) => page.locator('.gen-notes');
const at = async (page: Page, iso: string) => { await page.clock.install({ time: new Date(iso) }); };
const setDaypart = (page: Page, part: string) => page.addInitScript((p) => {
  const apply = () => document.documentElement?.setAttribute('data-daypart', p);
  if (document.documentElement) apply();
  else new MutationObserver((_, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
}, part);
const box = async (page: Page, sel: string) => page.locator(sel).first().boundingBox();
type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [iso, shown] of [
  ['2026-10-14T20:59:00', false], ['2026-10-14T21:00:00', true], ['2026-10-14T23:59:00', true],
  ['2026-10-14T00:00:00', true], ['2026-10-14T06:59:00', true], ['2026-10-14T07:00:00', false],
  ['2026-10-14T13:00:00', false],
] as const) {
  test(`general notes ${shown ? 'are' : 'are not'} in the DOM at ${iso.slice(11, 16)}`, async ({ page }) => {
    await at(page, iso);
    await page.goto('/');
    await expect(note(page)).toHaveCount(shown ? 1 : 0);
  });
}

test('the served HTML never contains the notes', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toContain('past nine');
  expect(html).not.toContain('General notes');
  expect(html).not.toContain('still here');
});

test('the note is decorative, unannounced, and shows the pencil copy', async ({ page }) => {
  await at(page, '2026-10-14T23:00:00');
  await page.goto('/');
  await expect(note(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(note(page)).toContainText('General notes');
  await expect(note(page)).toContainText('It’s past nine.');
  await expect(note(page)).toContainText('You’re still here.');
  await expect(note(page)).toContainText('Good.');
  await expect(page.locator('[aria-label*="note" i], [title*="note" i], [class*="easter"]')).toHaveCount(0);
});

test('data-daypart forces the notes on and off (test hook)', async ({ page }) => {
  await at(page, '2026-10-14T13:00:00');
  await setDaypart(page, 'night');
  await page.goto('/');
  await expect(note(page)).toHaveCount(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-daypart', 'morning'));
  await expect(note(page)).toHaveCount(0);
});

test('pressing t to preview night shows the notes, and leaving the preview hides them', async ({ page }) => {
  await at(page, '2026-10-14T13:00:00');
  await page.goto('/');
  await expect(note(page)).toHaveCount(0);
  // afternoon -> morning -> afternoon -> evening -> night
  for (let i = 0; i < 4; i++) await page.keyboard.press('t');
  await expect(note(page)).toHaveCount(1);
  await page.keyboard.press('t'); // back to the clock (afternoon)
  await expect(note(page)).toHaveCount(0);
});

test('desktop: the notes sit beside the title block without overlapping anything', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'one browser is enough for geometry');
  await page.setViewportSize({ width: 1280, height: 800 });
  await setDaypart(page, 'night');
  await page.goto('/');
  await settled(page);
  const n = await box(page, '.gen-notes');
  expect(n).not.toBeNull();
  for (const sel of ['.tblock', '#hero-name', '.rot', '.lede', '[data-contact="hero"]']) {
    const b = await box(page, sel);
    expect(overlaps(n!, b!), sel).toBe(false);
  }
  expect(n!.x + n!.width).toBeLessThanOrEqual(1280);
});

test('phone: the notes sit in the hero, right under the contact buttons, without overlap', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'one browser is enough for geometry');
  await page.setViewportSize({ width: 375, height: 812 });
  await setDaypart(page, 'night');
  await page.goto('/');
  await settled(page);
  await expect(note(page)).toBeVisible();
  expect(await note(page).evaluate((el) => el.previousElementSibling?.matches('.cta') && !!el.closest('#hero'))).toBe(true);
  const n = await box(page, '.gen-notes');
  const cta = await box(page, '#hero .cta');
  expect(overlaps(n!, cta!)).toBe(false);
  expect(n!.y).toBeGreaterThan(cta!.y + cta!.height - 1);
  expect(n!.x + n!.width).toBeLessThanOrEqual(375);
});

test('reduced motion: the notes appear with no animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', timezoneId: 'America/Chicago' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-14T23:00:00') });
  await page.goto('/');
  await expect(note(page)).toHaveCount(1);
  expect(await note(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await ctx.close();
});

test('phone topography is calmer below 560px and unchanged on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-calm', 'true');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('canvas#field')).toHaveAttribute('data-calm', 'false');
});

test('phone: a soft fade sits behind the text block, and the desktop hero has none', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'one browser is enough for geometry');
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/');
  const phone = await page.locator('.hero-inner').evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
  expect(phone).toContain('radial-gradient');
  await page.setViewportSize({ width: 1280, height: 800 });
  const desk = await page.locator('.hero-inner').evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
  expect(desk).toBe('none');
});

test('screenshots for the review (T34_SHOTS=1 only)', async ({ page, browser }) => {
  test.skip(!process.env.T34_SHOTS || test.info().project.name !== 'chromium', 'manual evidence run');
  await at(page, '2026-10-14T23:00:00');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await settled(page);
  await page.screenshot({ path: path.join(SHOTS, 't34-night-note-1280.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await settled(page);
  await page.screenshot({ path: path.join(SHOTS, 't34-night-note-375.png') });
  // phone topography: afternoon and night, at 430 and 360, the hero only; one fresh context per capture
  for (const w of [430, 360]) for (const part of ['afternoon', 'night']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 860 } });
    const pg = await ctx.newPage();
    await setDaypart(pg, part);
    await pg.goto('/');
    await settled(pg);
    await pg.waitForTimeout(400);
    await pg.locator('#hero').screenshot({ path: path.join(SHOTS, `t34-hero-${w}-${part}.png`) });
    await ctx.close();
  }
});
