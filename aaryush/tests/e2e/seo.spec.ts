import { expect, test } from '@playwright/test';

const pages = ['/', '/writing', '/writing/bigger-than-electricity', '/writing/quiet-singularity', '/work/cylerity', '/work/cylerity-intake', '/work/gupta-advisory', '/work/umn-launchpad'];

for (const path of pages) {
  test(`${path} has a PNG Open Graph image and its own title`, async ({ page, request }) => {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/^https:\/\/aaryush\.com\/og\/.+\.png$/);
    const local = new URL(og!).pathname;
    const res = await request.get(local);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const buf = await res.body();
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.length).toBeGreaterThan(8_000);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.{40,}/);
  });
}

test('titles are unique across pages', async ({ page }) => {
  const titles = new Set<string>();
  for (const path of pages) { await page.goto(path); titles.add(await page.title()); }
  expect(titles.size).toBe(pages.length);
});
