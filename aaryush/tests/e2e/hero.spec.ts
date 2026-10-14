import { expect, test } from '@playwright/test';

test('contact actions sit above the fold on a 375×667 phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const hero = page.locator('[data-contact="hero"]');
  for (const name of ['Save contact', 'Email', 'Call', 'LinkedIn', 'GitHub']) {
    const box = await hero.getByRole('link', { name }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.y + box!.height, name).toBeLessThanOrEqual(667);
  }
});

test('hero reads correctly without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#rot')).toContainText('I build the systems behind');
  await expect(page.locator('#slot')).toHaveText('how organizations work');
  await expect(page.locator('#slot')).toBeVisible();
  await context.close();
});

test('rotating line cycles subjects, then settles', async ({ page }) => {
  await page.goto('/');
  const slot = page.locator('#slot');
  await expect(slot).toHaveText('how decisions get made');
  await expect(slot).toHaveText('how organizations work', { timeout: 15000 });
  await expect(page.locator('#rot')).toHaveClass(/is-settled/);
});

test('reduced motion shows the settled line immediately', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#slot')).toHaveText('how organizations work');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
  await context.close();
});

test('hero canvas pauses while a pop-up is open', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
  // DOM click so the page does not scroll: the hero stays in view and only html.locked can pause it
  await page.locator('#sys-univise').evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator('html')).toHaveClass(/locked/);
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
});

test('hero canvas pauses when scrolled away', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
});
