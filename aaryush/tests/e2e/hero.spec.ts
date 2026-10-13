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
  await expect(page.locator('#rot')).toContainText('how organizations work.');
  await context.close();
});
