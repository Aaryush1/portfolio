import { expect, test, type Page } from '@playwright/test';
import { settled } from './settle';

// E16: an unknown /writing/<slug> gets the writing room's own not-found page. Static output has no per-folder 404, so the
// host serves dist/404.html with status 404 (Vercel and astro preview both do) and that page switches to the room by path.
const setDaypart = (page: Page, part: string) => page.addInitScript((p) => {
  const apply = () => document.documentElement?.setAttribute('data-daypart', p);
  if (document.documentElement) apply();
  else new MutationObserver((_, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
}, part);

test('an unknown slug returns 404 and shows the desk, one crumpled sheet and one link back', async ({ page }) => {
  const res = await page.goto('/writing/nope');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not on the desk.');
  await expect(page.locator('main.room')).toBeVisible();
  await expect(page.locator('main [data-register]')).toBeHidden();
  await expect(page.locator('.crumple')).toHaveCount(1);
  await expect(page.locator('.crumple')).toBeVisible();
  const links = page.locator('main.room a');
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveText('Back to the desk');
  await expect(links.first()).toHaveAttribute('href', '/writing');
  await expect(page).toHaveTitle(/Not on the desk/);
});

test('the requested slug is never rendered, in the page or the served HTML', async ({ page, request }) => {
  const slug = 'zz-secret-slug-<b>x';
  const raw = await request.get(`/writing/${encodeURIComponent(slug)}`);
  expect(raw.status()).toBe(404);
  expect(await raw.text()).not.toContain('zz-secret-slug');
  await page.goto(`/writing/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not on the desk.');
  expect(await page.locator('body').innerText()).not.toContain('zz-secret-slug');
  expect(await page.locator('main.room b').count()).toBe(0);
});

test('other unknown paths keep the site 404, and /writing itself is still the desk', async ({ page }) => {
  for (const p of ['/work/does-not-exist', '/definitely/not/here', '/writingx/nope']) {
    const res = await page.goto(p);
    expect(res?.status(), p).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sheet not in set.');
    await expect(page.locator('.crumple')).toBeHidden();
  }
  const ok = await page.goto('/writing');
  expect(ok?.status()).toBe(200);
  await expect(page.locator('.crumple')).toHaveCount(0);
});

test('the sheet is a flat 2D object at rest, in the pool of light', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/writing/nope');
  const c = page.locator('.crumple');
  await expect(c).toBeVisible();
  const flat = await c.evaluate((el) => {
    for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/matrix3d/.test(cs.transform) || cs.perspective !== 'none' || cs.transformStyle === 'preserve-3d') return false;
    }
    return true;
  });
  expect(flat).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    const room = document.querySelector('main.room')!;
    const r = room.getBoundingClientRect();
    const b = document.querySelector('.crumple')!.getBoundingClientRect();
    const px = parseFloat(getComputedStyle(room).getPropertyValue('--pool-x'));
    const py = parseFloat(getComputedStyle(room).getPropertyValue('--pool-y'));
    return Math.hypot(px - (b.left - r.left + b.width / 2), py - (b.top - r.top + b.height / 2));
  }), { timeout: 15000 }).toBeLessThan(2);
});

test('it takes the current daypart light, and the back link returns to the desk', async ({ page }) => {
  await setDaypart(page, 'evening');
  await page.goto('/writing/nope');
  await expect(page.locator('main.room')).toHaveAttribute('data-daypart', 'evening');
  await page.getByRole('link', { name: 'Back to the desk' }).click();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(page.locator('[data-piece]').first()).toBeVisible();
});

test('without JavaScript the status is still 404 and the site sheet is shown', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const res = await page.goto('/writing/nope');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sheet not in set.');
  await ctx.close();
});

test('phone: no horizontal scroll, link reachable', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/writing/nope');
  await expect(page.getByRole('link', { name: 'Back to the desk' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion: the sheet shows, nothing loops', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing/nope');
  await expect(page.locator('.crumple')).toBeVisible();
  await expect(page.locator('canvas.dust')).not.toHaveAttribute('data-dust', 'running');
  await ctx.close();
});

test('screenshots', async ({ page }) => {
  test.skip(!process.env.T37_SHOTS, 'evidence only');
  const dir = 'C:/Users/aaryu/code/personal/portfolio-explorations/shots';
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/writing/nope');
  await settled(page);
  await page.screenshot({ path: `${dir}/t37-writing-404-1280.png` });
  await page.setViewportSize({ width: 430, height: 900 });
  await settled(page);
  await page.screenshot({ path: `${dir}/t37-writing-404-430.png` });
});
