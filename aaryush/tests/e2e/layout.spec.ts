import { expect, test } from '@playwright/test';

const widths = [320, 375, 768, 1280];
const paths = ['/', '/writing', '/writing/bigger-than-electricity', '/writing/quiet-singularity'];

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

test('header mark links home and has an accessible name', async ({ page }) => {
  await page.goto('/writing');
  const mark = page.locator('header .mark');
  await expect(mark).toHaveAttribute('href', '/');
  await expect(mark).toHaveAccessibleName(/Aaryush Gupta/);
  await expect(mark.locator('svg')).toHaveCount(1);
  await expect(mark.locator('svg .stop')).toHaveCount(1);
  await expect(mark.locator('svg rect')).toHaveCount(0);
});

test('favicon is served', async ({ request }) => {
  const res = await request.get('/favicon.svg');
  expect(res.status()).toBe(200);
  const svg = await res.text();
  expect(svg).toContain('<svg');
  // new "ag." mark: amber full stop circle plus glyph outlines; fails against the old Node favicon
  expect(svg).toMatch(/<circle[^>]*fill="#F2B544"/);
  expect(svg).toMatch(/<path[^>]*fill="#E6E7EA"[^>]*d="M[^"]{200,}"/);
  expect(svg).not.toContain('<rect x="2.5"');
});
