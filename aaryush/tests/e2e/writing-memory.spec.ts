import { expect, test, type Page } from '@playwright/test';

const reach = async (page: Page, n: number) => {
  await page.locator('.essay-body h2').nth(n).evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(250);
};
const forgetBtn = (page: Page) => page.getByRole('button', { name: /forget what this room remembers/i });
const mem = (sec: number) => JSON.stringify({ v: 1, pieces: { 'quiet-singularity': { sec, t: 1 } } });

test('read a paper to III, return: it is pulled out with a ribbon and its page offers to pick up at III', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await page.goto('/writing');
  const p = page.locator('[data-slug="quiet-singularity"]');
  await expect(p).toHaveClass(/seen/);
  await expect(p.locator('.ribbon')).toBeVisible();
  const color = await p.locator('.ribbon').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(color).toBe('rgb(242, 181, 68)'); // --accent
  await page.goto('/writing/quiet-singularity');
  const link = page.getByRole('link', { name: /Pick up where you left off/ });
  await expect(link).toContainText(/III/);
  await link.click();
  await expect.poll(() => page.locator('.essay-body h2').nth(2).evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(300);
  await expect(page.locator('.essay-body h2').nth(2)).toBeFocused();
});

test('the #pickup fragment (from the home teaser) jumps to the section', async ({ page }) => {
  await page.addInitScript((m) => { if (!localStorage.getItem('writing:v1')) localStorage.setItem('writing:v1', m); }, mem(2));
  await page.goto('/writing/quiet-singularity#pickup');
  await expect.poll(() => page.locator('.essay-body h2').nth(2).evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(300);
});

test('the offer appears with no layout shift', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  const top = () => page.locator('.essay-body').evaluate((e) => e.getBoundingClientRect().top + scrollY);
  const before = await top();
  await page.evaluate((m) => localStorage.setItem('writing:v1', m), mem(2));
  await page.reload();
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toBeVisible();
  expect(await top()).toBe(before);
});

test('storage has the documented shape under writing:v1', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 1);
  const raw = await page.evaluate(() => localStorage.getItem('writing:v1'));
  const m = JSON.parse(raw!);
  expect(m.v).toBe(1);
  expect(m.pieces['quiet-singularity'].sec).toBeGreaterThanOrEqual(1);
  expect(m.last).toBe('quiet-singularity');
});

test('a letter remembers the fold reached from the scroll fraction and pick up scrolls back to it', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await page.evaluate(() => { const b = document.querySelector('.essay-body')!; const r = b.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * 0.6, behavior: 'instant' }); });
  await page.waitForTimeout(300);
  const m = JSON.parse((await page.evaluate(() => localStorage.getItem('writing:v1')))!);
  expect(m.pieces['bigger-than-electricity'].sec).toBe(2); // 4 folds, 60% is fold index 2
  await page.goto('/writing/bigger-than-electricity');
  const link = page.getByRole('link', { name: /Pick up where you left off/ });
  await expect(link).toBeVisible();
  await expect(link).not.toContainText(/section/);
  await link.click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
});

test('forget clears everything and the ribbon goes', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await page.goto('/writing');
  await forgetBtn(page).click();
  await expect(page.locator('[data-slug="quiet-singularity"]')).not.toHaveClass(/seen/);
  await expect(page.locator('.ribbon')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('writing:v1'))).toBeNull();
  await expect(forgetBtn(page)).toHaveCount(0);
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
});

test('forget is a quiet word, with no explanation text', async ({ page }) => {
  await page.addInitScript((m) => localStorage.setItem('writing:v1', m), mem(2));
  await page.goto('/writing');
  const b = page.locator('[data-forget]');
  await expect(b).toHaveText('forget');
  expect(await b.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(12);
});

test('the forget control is absent when there is nothing to forget', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.getByRole('button', { name: /forget/i })).toHaveCount(0);
});

test('without JavaScript the forget control never appears', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await expect(page.getByRole('button', { name: /forget/i })).toHaveCount(0);
  await ctx.close();
});

test('storage that throws never breaks the room or the essay', async ({ page }) => {
  await page.addInitScript(() => {
    const boom = () => { throw new Error('blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom });
    Object.defineProperty(window, 'sessionStorage', { get: boom });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/writing');
  await expect(page.locator('[data-piece]')).toHaveCount(2);
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('corrupt storage is ignored', async ({ page }) => {
  await page.addInitScript((m) => localStorage.setItem('writing:v1', m), mem(99));
  await page.goto('/writing');
  // sec 99 is beyond the piece's sections: no ribbon pointing at a section that does not exist
  await expect(page.locator('[data-slug="quiet-singularity"]')).not.toHaveClass(/seen/);
});

test('a letter that was read to the end is not offered "pick up", but is pulled out', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await page.locator('svg[data-signature]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.goto('/writing');
  await expect(page.locator('[data-slug="bigger-than-electricity"]')).toHaveClass(/seen/);
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
});

test('Back focus still works: the last piece lives in writing:v1.last', async ({ page }) => {
  await page.goto('/writing');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await page.waitForURL(/quiet-singularity/);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('writing:v1')))!).last).toBe('quiet-singularity');
  await page.goBack();
  await expect(page.locator('[data-slug="quiet-singularity"] .piece-link')).toBeFocused();
});

test('reduced motion: the ribbon and pulled-out state show with no transition', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing/quiet-singularity');
  await page.locator('.essay-body h2').nth(2).evaluate((e) => e.scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(250);
  await page.goto('/writing');
  await expect(page.locator('[data-slug="quiet-singularity"]')).toHaveClass(/seen/);
  // the room's own lighting still settles on load (Tasks 2 and 3); the remembered state itself must not animate
  const mine = await page.evaluate(() => document.getAnimations().filter((a) => (a as CSSTransition).transitionProperty === 'translate' || (a.effect as KeyframeEffect | null)?.target?.classList?.contains('ribbon')).length);
  expect(mine).toBe(0);
  expect(await page.locator('[data-slug="quiet-singularity"]').evaluate((e) => getComputedStyle(e).translate)).toBe('12px 16px');
  await ctx.close();
});
