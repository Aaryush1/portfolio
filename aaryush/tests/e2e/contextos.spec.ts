import { expect, test, type Page } from '@playwright/test';
import { settled } from './settle';
import path from 'node:path';

// E8: the contextOS caret on the timeline's Next line, and the typed `contextos` that re-types the word once.
const SHOTS = path.resolve(process.cwd(), '../portfolio-explorations/shots'); // commands run from aaryush/
const next = (page: Page) => page.locator('.tl-wrap > .next');
const dot = (page: Page) => next(page).locator('.nx-dot');
const word = (page: Page) => next(page).locator('.nx-word');
const typeWord = (page: Page, w = 'contextos') => page.keyboard.type(w, { delay: 40 });
const focusBody = (page: Page) => page.locator('body').click({ position: { x: 5, y: 5 } });

test('the caret replaces the period once JS runs, and blinks slowly', async ({ page }) => {
  await page.goto('/');
  await expect(dot(page)).toHaveClass(/caret/);
  await expect(dot(page)).toHaveText('');
  await expect(next(page)).toContainText('contextOS');
  await expect(next(page)).toContainText('Coming soon.');
  const anim = await dot(page).evaluate((el) => {
    const a = el.getAnimations()[0];
    if (!a) return null;
    const t = a.effect!.getComputedTiming();
    return { dur: Number(t.duration), iter: t.iterations };
  });
  expect(anim).not.toBeNull();
  expect(anim!.iter).toBe(Infinity);
  expect(anim!.dur).toBeGreaterThanOrEqual(1000);
  expect(anim!.dur).toBeLessThanOrEqual(1200);
});

test('no JS: the original period shows and there is no caret', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(dot(page)).toHaveText('.');
  await expect(dot(page)).not.toHaveClass(/caret/);
  await ctx.close();
});

test('reduced motion: the caret shows but does not blink', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(dot(page)).toHaveClass(/caret/);
  expect(await dot(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await ctx.close();
});

test('typing contextos re-types the word once, with the hero morph (letters arrive as morph spans)', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await focusBody(page);
  await typeWord(page);
  await expect(word(page)).toHaveAttribute('data-retype', '1');
  await expect(word(page).locator('.mc')).toHaveCount(9);
  await expect(word(page)).toHaveText('contextOS');
});

test('repeated triggers while the morph is running are ignored', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await focusBody(page);
  await typeWord(page);
  await typeWord(page);
  await expect(word(page)).toHaveAttribute('data-retype', '1');
});

test('after the morph settles, typing again re-types it again', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await focusBody(page);
  await typeWord(page);
  await expect(word(page)).toHaveAttribute('data-retype', '1');
  await expect.poll(() => word(page).evaluate((el) => el.getAnimations({ subtree: true }).length), { timeout: 8000 }).toBe(0);
  await typeWord(page);
  await expect(word(page)).toHaveAttribute('data-retype', '2');
});

test('the timeline line scrolls into view before the morph starts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await settled(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await focusBody(page);
  expect(await next(page).evaluate((el) => el.getBoundingClientRect().top > window.innerHeight)).toBe(true);
  await typeWord(page);
  await expect(word(page)).toHaveAttribute('data-retype', '1');
  await expect.poll(() => next(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }), { timeout: 5000 }).toBe(true);
});

test('typing in a text field does nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = 'probe';
    document.body.append(i);
    i.focus();
  });
  await page.locator('#probe').pressSequentially('contextos', { delay: 40 });
  await expect(word(page)).not.toHaveAttribute('data-retype', /.+/);
});

test('modifier keys and an open keyboard map block the word', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await focusBody(page);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('?');
  await typeWord(page);
  await expect(word(page)).not.toHaveAttribute('data-retype', /.+/);
  await page.keyboard.press('Escape');
});

test('a 1.5s pause between keys breaks the word', async ({ page }) => {
  await page.clock.install(); // the pause is moved on the page's own clock, not slept through
  await page.goto('/');
  await settled(page);
  await focusBody(page);
  await page.keyboard.type('contex', { delay: 40 });
  await page.clock.fastForward(1700);
  await page.keyboard.type('os', { delay: 40 });
  await page.waitForTimeout(200);
  await expect(word(page)).not.toHaveAttribute('data-retype', /.+/);
});

test('the word is never explained: the keyboard map does not mention it', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('?');
  const text = (await page.getByRole('dialog', { name: 'Keyboard map' }).textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('context');
  await page.keyboard.press('Escape');
});

test('reduced motion: typing gives one instant amber tint, no letter animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await focusBody(page);
  await typeWord(page);
  await expect(word(page)).toHaveClass(/is-tint/);
  expect(await word(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  await ctx.close();
});

test('pages without the timeline do nothing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/writing');
  await focusBody(page);
  await typeWord(page);
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
  await expect(page.locator('.nx-word')).toHaveCount(0);
});

test('screenshots for the review (T34_SHOTS=1 only)', async ({ page }) => {
  test.skip(!process.env.T34_SHOTS || test.info().project.name !== 'chromium', 'manual evidence run');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await settled(page);
  await next(page).scrollIntoViewIfNeeded();
  await settled(page);
  await next(page).screenshot({ path: path.join(SHOTS, 't34-contextos-caret.png') });
  await focusBody(page);
  await typeWord(page);
  await page.waitForTimeout(450);
  await next(page).screenshot({ path: path.join(SHOTS, 't34-contextos-retype-mid.png') });
});
