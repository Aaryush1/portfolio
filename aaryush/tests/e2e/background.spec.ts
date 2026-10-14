import { expect, test } from '@playwright/test';

const PAGES = ['/', '/work/cylerity-intake', '/writing/quiet-singularity', '/qr', '/nope'];

test('body no longer draws a gradient grid', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toBe('none');
});

for (const path of PAGES) {
  test(`${path} has a fixed, non-interactive background layer behind content`, async ({ page }) => {
    await page.goto(path);
    const layer = await page.evaluate(() => {
      const el = document.querySelector('.bg');
      if (!el) return null;
      const s = getComputedStyle(el);
      const grain = getComputedStyle(el.querySelector('.grain')!);
      return {
        position: s.position,
        zIndex: s.zIndex,
        pointerEvents: s.pointerEvents,
        grainImage: grain.backgroundImage,
        width: el.getBoundingClientRect().width,
        vw: window.innerWidth,
      };
    });
    expect(layer, 'a .bg element exists').not.toBeNull();
    expect(layer!.position).toBe('fixed');
    expect(Number(layer!.zIndex)).toBeLessThan(0);
    expect(layer!.pointerEvents).toBe('none');
    expect(layer!.grainImage).toContain('grain.png');
    expect(layer!.width).toBe(layer!.vw);
  });
}

test('light layers drift with transform animations only', async ({ page }) => {
  await page.goto('/');
  const props = await page.evaluate(() =>
    document.querySelector('.bg')!.getAnimations({ subtree: true }).map((a) => {
      const frames = (a.effect as KeyframeEffect).getKeyframes();
      return Object.keys(frames[0]).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join(',');
    }),
  );
  expect(props.length).toBe(3);
  for (const p of props) expect(p).toBe('transform');
});

test('under reduced motion the light does not drift and the grain never animates', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const running = await page.evaluate(() =>
    document.querySelector('.bg')!.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
  );
  expect(running).toBe(0);
  await context.close();
});

test('hero canvas draws contour lines, including an amber one', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
  await page.waitForTimeout(600);
  const result = await page.evaluate(() => {
    const cv = document.getElementById('field') as HTMLCanvasElement;
    const c = cv.getContext('2d')!;
    const { data } = c.getImageData(0, 0, cv.width, cv.height);
    let drawn = 0, amber = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (!a) continue;
      drawn++;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (a > 40 && r > 150 && r > g && g > b) amber++;
    }
    return { drawn, amber };
  });
  expect(result.drawn).toBeGreaterThan(500);
  expect(result.amber).toBeGreaterThan(20);
});
