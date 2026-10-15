import { expect, test } from '@playwright/test';

const svg = (page: import('@playwright/test').Page) => page.locator('dialog#popup svg.dg');

// The diagram advances by rAF frames (dt capped at 120ms so a backgrounded tab doesn't jump), so under heavy parallel
// load a throttled WebKit runs the animation slower than wall-clock and a wall-clock wait for "closed" races.
// A paused Playwright clock drives timers and rAF in fixed 16ms steps instead, independent of machine load.
async function freezeClock(page: import('@playwright/test').Page) {
  await page.clock.install({ time: 0 });
  // install() lets the fake clock run until it is paused, so pause far enough ahead that this can't land in the past.
  await page.clock.pauseAt(60_000);
}
const step = (page: import('@playwright/test').Page, ms: number) => page.clock.runFor(ms);
async function runUntilClosed(page: import('@playwright/test').Page, limitMs = 15000) {
  for (let t = 0; t < limitMs; t += 250) {
    if (/\bclosed\b/.test((await svg(page).getAttribute('class')) ?? '')) return;
    await step(page, 250);
  }
  await expect(svg(page)).toHaveClass(/\bclosed\b/, { timeout: 1 });
}

test('diagram draws, closes the loop, and pulses nodes as the dot passes', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/work/cylerity-intake');
  await step(page, 200); // the 160ms start timer
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await runUntilClosed(page);
  // Step frame by frame until a node is hit, then check the dot is on that node at that moment.
  let seen: { node: number; ok: boolean; hitNodes: number[] } | null = null;
  for (let i = 0; i < 1500 && !seen; i++) {
    await step(page, 16);
    seen = await page.evaluate(() => {
      const el = document.querySelector('dialog#popup svg.dg') as SVGSVGElement;
      const g = el.querySelector('g.node.hit') as SVGGElement | null;
      if (!g) return null;
      const rt = JSON.parse(el.dataset.runtime!) as { hits: { node: number }[] };
      const b = g.getBoundingClientRect();
      const d = el.querySelector('.pulse')!.getBoundingClientRect();
      const cx = d.x + d.width / 2, cy = d.y + d.height / 2, m = 8;
      return { node: Number(g.dataset.node), hitNodes: rt.hits.map((h) => h.node), ok: cx >= b.left - m && cx <= b.right + m && cy >= b.top - m && cy <= b.bottom + m };
    });
  }
  expect(seen, 'a node was hit').not.toBeNull();
  expect(seen!.hitNodes).toContain(seen!.node);
  expect(seen!.ok).toBe(true);
  const pos = () => page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  const first = await pos();
  await step(page, 400);
  expect(await pos()).not.toBe(first);
});

test('reduced motion shows the finished diagram with no movement', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await freezeClock(page);
  await page.goto('/work/ready-rebound-loop');
  await expect(svg(page)).toHaveClass(/instant/);
  await expect(svg(page)).toHaveClass(/closed/);
  const before = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  await step(page, 1200);
  const after = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  expect(after).toBe(before);
  await expect(page.locator('dialog#popup g.node.hit')).toHaveCount(0);
  await context.close();
});

test('reopening does not stack loops', async ({ page }) => {
  await page.goto('/');
  // Count distinct rAF callbacks, not calls per second: the frame rate of a headless browser varies a lot with load
  // (Firefox ranged 16-160 fps for one loop), but each mounted diagram loop re-registers its own single callback.
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafNative = raf;
    (window as any).__rafFns = new Set();
    window.requestAnimationFrame = (cb) => { (window as any).__rafFns.add(cb); return raf(cb); };
  });
  for (let i = 0; i < 4; i++) {
    await page.locator('#sys-cylerity-intake').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  }
  await page.locator('#sys-cylerity-intake').click();
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await page.evaluate(() => { (window as any).__rafFns = new Set(); });
  // about a second of frames, counted with the browser's own rAF so the wait itself isn't one of the loops being counted
  await page.evaluate(() => new Promise<void>((done) => { const raf = (window as any).__rafNative as typeof requestAnimationFrame; let i = 0; const tick = () => { if (++i >= 60) done(); else raf(tick); }; raf(tick); }));
  // Only the one live diagram loop schedules frames while a pop-up is open (the hero canvas pauses, Task 8); stacked loops would show 2+.
  expect(await page.evaluate(() => (window as any).__rafFns.size as number)).toBe(1);
});

test('pauses when hidden', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/work/cylerity-intake');
  await step(page, 200);
  await runUntilClosed(page);
  await step(page, 400); // the dot is moving by now
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await page.locator('dialog#popup .pulse').getAttribute('cy');
  await step(page, 600);
  const b = await page.locator('dialog#popup .pulse').getAttribute('cy');
  expect(b).toBe(a);
});

for (const slug of ['cylerity-intake', 'ready-rebound-loop', 'umn-launchpad', 'skale-platform']) {
  test(`diagram labels are legible and input labels are spaced on a phone: ${slug}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/work/${slug}`);
    const r = await page.locator('dialog#popup svg.dg').evaluate((svg: SVGSVGElement) => {
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      const texts = [...svg.querySelectorAll('text')].map((t) => ({
        eff: parseFloat(getComputedStyle(t).fontSize) * scale,
        h: t.getBoundingClientRect().height,
      }));
      const inputs = JSON.parse(svg.dataset.runtime!).inputs.length as number;
      const boxes = [...svg.querySelectorAll('text.lb')].slice(0, inputs).map((t) => t.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      const gaps = boxes.slice(1).map((b, i) => b.left - boxes[i].right);
      return { texts, gaps };
    });
    expect(r.texts.length).toBeGreaterThan(0);
    for (const t of r.texts) { expect(t.eff).toBeGreaterThanOrEqual(12); expect(t.h).toBeGreaterThanOrEqual(11.5); }
    for (const g of r.gaps) expect(g).toBeGreaterThanOrEqual(6);
  });
}

test('skale platform page renders the diagram with its title and closes its loop', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/work/skale-platform');
  await step(page, 200);
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await expect(svg(page).locator('title')).toHaveText('Skale.win career platform system diagram');
  await runUntilClosed(page, 20000); // the Skale loop starts at 5.4s of animation time
});

test('skale platform home pop-up renders the diagram with its title', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-skale-platform').click();
  await expect(page.locator('dialog#popup')).toBeVisible();
  await expect(svg(page).locator('title')).toHaveText('Skale.win career platform system diagram');
});
