import { expect, test } from '@playwright/test';

const widths = [320, 375, 768, 1280];
const paths = ['/'];

for (const path of paths) {
  for (const width of widths) {
    test(`no horizontal scroll on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('fonts are self-hosted', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('footer shows location and school without years', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('[data-footer-meta]');
  await expect(bar).toContainText('Madison, WI');
  await expect(bar).toContainText('UW–Madison');
  await expect(bar).not.toContainText(/UW–Madison[^·]*\d{4}/);
});
