import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { settled } from './settle';

// E9 to E13, plus the approved console note (copy-review section 14).

const gitShort = () => execSync('git rev-parse --short HEAD', { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
const heroSave = (page: Page) => page.locator('[data-contact="hero"] a[data-vcard]');
const footSave = (page: Page) => page.locator('[data-contact="footer"] a[data-vcard]');
const label = (a: ReturnType<Page['locator']>) => a.locator('.save-label');

test.describe('E9 "Save contact" becomes "Saved."', () => {
  test('the hero button morphs to "Saved." after the download, with a new name and a polite status', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const btn = heroSave(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
    expect(dl.suggestedFilename()).toBe('Aaryush Gupta.vcf');
    await expect(label(btn)).toHaveText('Saved.');
    await expect(btn).toHaveClass(/is-saved/);
    await expect(btn).toHaveAccessibleName('Contact saved');
    const status = page.locator('[data-contact="hero"] [data-save-status]');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('Contact saved');
  });

  test('the footer instance does the same', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const btn = footSave(page);
    await btn.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForEvent('download'), btn.click()]);
    await expect(label(btn)).toHaveText('Saved.');
    await expect(btn).toHaveAccessibleName('Contact saved');
  });

  test('a failed build never morphs the label or sets the saved state', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('no blob'); }; });
    const btn = heroSave(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
    expect(dl.suggestedFilename()).toBe('Aaryush Gupta.vcf'); // the static file still downloads
    await page.waitForTimeout(900);
    await expect(label(btn)).toHaveText('Save contact');
    await expect(btn).not.toHaveClass(/is-saved/);
  });

  test('under reduced motion the label swaps at once, with no animation', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', acceptDownloads: true });
    const page = await ctx.newPage();
    await page.goto('/');
    await settled(page);
    const btn = heroSave(page);
    await Promise.all([page.waitForEvent('download'), btn.click()]);
    await expect(label(btn)).toHaveText('Saved.');
    const animations = await label(btn).evaluate((el) => el.getAnimations({ subtree: true }).length);
    expect(animations).toBe(0);
    await ctx.close();
  });

  test('the saved state returns to "Save contact" only on the next page load', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    await Promise.all([page.waitForEvent('download'), heroSave(page).click()]);
    await expect(label(heroSave(page))).toHaveText('Saved.');
    await page.reload();
    await settled(page);
    await expect(label(heroSave(page))).toHaveText('Save contact');
    await expect(heroSave(page)).not.toHaveClass(/is-saved/);
  });
});

test.describe('E10 the deploy hash', () => {
  test('Last deploy is named with the build commit, and that commit is the real short SHA', async ({ page }) => {
    await page.goto('/');
    // located by place, not role. The cell has no role (a role on a dl row fails axe); its text carries the date and commit.
    const cell = page.locator('#hero .dep');
    await expect(cell).toContainText(`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')} · ${gitShort()}`);
  });

  test('focus and hover reveal the hash, and nothing around it moves', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const cell = page.locator('#hero .dep');
    const sha = cell.locator('.sha');
    await expect(sha).toHaveCSS('opacity', '0');
    const before = await cell.boundingBox();
    await cell.focus();
    await expect(sha).toHaveCSS('opacity', '1');
    expect(await cell.boundingBox()).toEqual(before);
    await cell.evaluate((el) => (el as HTMLElement).blur());
    await page.mouse.move(0, 0);
    await expect(sha).toHaveCSS('opacity', '0');
    await cell.hover();
    await expect(sha).toHaveCSS('opacity', '1');
    expect(await cell.boundingBox()).toEqual(before);
  });

  test('the hero title block fits at 320px with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(320);
  });
});

test.describe('E11 type "ag."', () => {
  test('typing a, g, . anywhere replays the header mark', async ({ page }) => {
    await page.goto('/');
    await settled(page);
    const mark = page.locator('svg.mark-svg:not([data-signature])').first();
    await page.waitForTimeout(2500); // let the first-visit draw-on finish
    await expect(mark).not.toHaveClass(/is-playing/);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.type('ag.');
    await expect(mark).toHaveClass(/is-playing/);
  });

  test('under reduced motion it does nothing', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await settled(page);
    await page.keyboard.type('ag.');
    await page.waitForTimeout(300);
    await expect(page.locator('svg.mark-svg:not([data-signature])').first()).not.toHaveClass(/is-playing/);
    await ctx.close();
  });

  test('typing it inside a text field does nothing', async ({ page }) => {
    await page.goto('/qr');
    await settled(page);
    const field = page.getByRole('textbox').first();
    await field.click();
    await page.keyboard.type('ag.');
    await expect(field).toHaveValue('ag.');
    await expect(page.locator('svg.mark-svg:not([data-signature])').first()).not.toHaveClass(/is-playing/);
  });
});

test.describe('E12 the lamp warms while you read', () => {
  const warm = (page: Page) => page.evaluate(() => document.documentElement.style.getPropertyValue('--warm'));

  test('rises over about five minutes of reading and leaves the text alone', async ({ page }) => {
    await page.clock.install();
    await page.goto('/writing/quiet-singularity');
    const textBefore = await page.locator('.essay-body p').first().evaluate((e) => getComputedStyle(e).color);
    expect(await warm(page)).toBe('');
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(100 + i, 200); // reading: activity every 30 seconds
      await page.clock.runFor(30_000);
    }
    expect(parseFloat(await warm(page))).toBeCloseTo(1, 2);
    // the warm layer's centre alpha: .085 at rest, six per cent more at full (opacity can't go past 1, so it is in the gradient)
    const centre = await page.locator('.essay-page .bg .l1').evaluate((e) => getComputedStyle(e).backgroundImage);
    const alpha = parseFloat(centre.match(/rgba\(255, 214, 150, ([\d.]+)\)/)![1]);
    expect(alpha).toBeCloseTo(0.085 * 1.06, 3);
    expect(await page.locator('.essay-body p').first().evaluate((e) => getComputedStyle(e).color)).toBe(textBefore);
  });

  test('does not warm without reading: no activity means no change', async ({ page }) => {
    await page.clock.install();
    await page.goto('/writing/quiet-singularity');
    await page.clock.runFor(5 * 60_000);
    expect(parseFloat((await warm(page)) || '0')).toBe(0);
  });

  test('a new page load starts again from rest', async ({ page }) => {
    await page.clock.install();
    await page.goto('/writing/quiet-singularity');
    for (let i = 0; i < 10; i++) { await page.mouse.move(100 + i, 200); await page.clock.runFor(30_000); }
    await page.goto('/writing/quiet-singularity');
    expect(await warm(page)).toBe('');
  });

  test('under reduced motion there is no change at all', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.clock.install();
    await page.goto('/writing/quiet-singularity');
    for (let i = 0; i < 10; i++) { await page.mouse.move(100 + i, 200); await page.clock.runFor(30_000); }
    expect(await warm(page)).toBe('');
    await ctx.close();
  });
});

test.describe('E13 signed prints', () => {
  test('the printed sheet carries a Signed cell with the grey mark, fully drawn', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
    const cell = page.locator('.tblock .signed');
    await expect(cell).toBeVisible();
    await expect(cell.locator('dt')).toHaveText('Signed');
    const svg = cell.locator('svg.mark-svg');
    await expect(svg).toHaveCount(1);
    const drawn = await svg.evaluate((s) => ({
      pen: getComputedStyle(s.querySelector('.pen-a')!).strokeDashoffset,
      stop: getComputedStyle(s.querySelector('.stop')!).transform,
      color: getComputedStyle(s).color,
    }));
    expect(drawn.pen).toBe('0px');
    expect(drawn.stop === 'none' || drawn.stop === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    const [r, g, b] = drawn.color.match(/\d+/g)!.map(Number);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(180);
  });

  test('the Signed cell is not on screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tblock .signed')).toBeHidden();
  });
});
