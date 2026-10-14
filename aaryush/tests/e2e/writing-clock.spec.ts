import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });
const at = async (page: Page, iso: string) => { await page.clock.install({ time: new Date(iso) }); };
// addInitScript runs before <html> exists, so wait for it (same helper as writing-light.spec.ts)
const setDaypart = (page: Page, part: string) => page.addInitScript((p) => {
  const apply = () => document.documentElement?.setAttribute('data-daypart', p);
  if (document.documentElement) apply();
  else new MutationObserver((_, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
}, part);

for (const [iso, shown] of [
  ['2026-10-14T20:59:00', false], ['2026-10-14T21:00:00', true], ['2026-10-14T23:59:00', true],
  ['2026-10-14T00:00:00', true], ['2026-10-14T06:59:00', true], ['2026-10-14T07:00:00', false],
  ['2026-10-14T13:00:00', false],
] as const) {
  test(`night note ${shown ? 'is' : 'is not'} in the DOM at ${iso.slice(11, 16)}`, async ({ page }) => {
    await at(page, iso);
    await page.goto('/writing');
    await expect(page.locator('.night-note')).toHaveCount(shown ? 1 : 0);
  });
}

test('the served HTML never contains the note; the note is hidden from assistive tech and unlabelled', async ({ page, request }) => {
  expect(await (await request.get('/writing')).text()).not.toContain('up late');
  await at(page, '2026-10-14T23:00:00');
  await page.goto('/writing');
  const n = page.locator('.night-note');
  await expect(n).toHaveAttribute('aria-hidden', 'true');
  await expect(n).toHaveText(/you.re up late too\./);
  await expect(page.locator('[class*="easter"], [aria-label*="late"]')).toHaveCount(0);
});

test('a tab left open across 21:00 gets the note without a reload, and loses it at 07:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T20:58:00') });
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(0);
  await page.clock.fastForward('03:00');
  await expect(page.locator('.night-note')).toHaveCount(1);
  await page.clock.fastForward('10:00:00');
  await expect(page.locator('.night-note')).toHaveCount(0);
});

test('data-daypart forces a period in tests, both ways', async ({ page }) => {
  await at(page, '2026-10-14T13:00:00');
  await setDaypart(page, 'night');
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-daypart', 'morning'));
  await expect(page.locator('.night-note')).toHaveCount(0);
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'morning');
});

test('the note catches the light when the pool moves to the piece nearest it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer');
  await setDaypart(page, 'night');
  await page.goto('/writing');
  const near = () => page.locator('.night-note').evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--near')));
  const before = await near();
  const nearestSlug = await page.evaluate(() => {
    const note = document.querySelector('.night-note')!.getBoundingClientRect();
    const cx = note.left + note.width / 2, cy = note.top + note.height / 2;
    let best = ''; let bd = Infinity;
    document.querySelectorAll<HTMLElement>('[data-piece]').forEach((p) => {
      const r = p.getBoundingClientRect();
      const d = (r.left + r.width / 2 - cx) ** 2 + (r.top + r.height / 2 - cy) ** 2;
      if (d < bd) { bd = d; best = p.dataset.slug!; }
    });
    return best;
  });
  await page.locator(`[data-slug="${nearestSlug}"]`).hover();
  await expect.poll(near).toBeGreaterThan(before);
});

test('reduced motion: the note is absent by day, present by night, and nothing animates', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', timezoneId: 'America/Chicago' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-14T23:00:00') });
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(1);
  // first-paint transitions settle at once under reduced motion; afterwards nothing may be running (no loop)
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((x) => x.playState === 'running').length)).toBe(0);
  await ctx.close();
});

test('the shared t preview: home sets night, /writing loads night with the note, auto returns to the clock on both', async ({ page }) => {
  await at(page, '2026-10-14T13:00:00');
  await page.goto('/');
  await expect(page.locator('#field')).toHaveAttribute('data-daypart', 'afternoon');
  for (let i = 0; i < 4; i++) await page.keyboard.press('t'); // morning, afternoon, evening, night
  await expect(page.locator('#field')).toHaveAttribute('data-daypart', 'night');
  await page.goto('/writing');
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'night');
  await expect(page.locator('.night-note')).toHaveCount(1);
  // t on /writing steps on to auto: the clock (13:00, afternoon) again
  await page.keyboard.press('t');
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'afternoon');
  await expect(page.locator('.night-note')).toHaveCount(0);
  await expect(page.locator('.room-tag')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.room-tag')).toContainText('Room · auto');
  await page.goto('/');
  await expect(page.locator('#field')).toHaveAttribute('data-daypart', 'afternoon');
});

test('t works on /writing: it steps the room and shows the quiet Room label', async ({ page }) => {
  await at(page, '2026-10-14T13:00:00');
  await page.goto('/writing');
  await page.keyboard.press('t'); // the first step from the 13:00 clock is morning
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'morning');
  await expect(page.locator('.room-tag')).toContainText('Room · morning');
});
