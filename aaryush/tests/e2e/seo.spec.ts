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

test('/qr is noindex, other pages are not', async ({ page }) => {
  await page.goto('/qr');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('canonicals match the sitemap (trailing slash), /qr is not in it, robots.txt names it', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(5);
  expect(locs.filter((l) => /\/qr\/?$/.test(l))).toEqual([]);
  for (const path of pages) {
    await page.goto(path);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(locs, `${path} canonical ${canonical}`).toContain(canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical!);
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/^Sitemap: https:\/\/aaryush\.com\/sitemap-index\.xml$/m);
});
