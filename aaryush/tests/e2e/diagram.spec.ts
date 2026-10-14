import { expect, test } from '@playwright/test';

const svg = (page: import('@playwright/test').Page) => page.locator('dialog#popup svg.dg');

test('diagram draws, closes the loop, and pulses nodes as the dot passes', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await expect(svg(page)).toHaveClass(/\bclosed\b/, { timeout: 15000 });
  const seen = await page.evaluate(() => new Promise<{ node: number; ok: boolean; hitNodes: number[] }>((resolve, reject) => {
    const el = document.querySelector('dialog#popup svg.dg') as SVGSVGElement;
    const rt = JSON.parse(el.dataset.runtime!) as { hits: { node: number }[] };
    const hitNodes = rt.hits.map((h) => h.node);
    const t0 = performance.now();
    const poll = () => {
      const g = el.querySelector('g.node.hit') as SVGGElement | null;
      if (g) {
        const b = g.getBoundingClientRect();
        const d = el.querySelector('.pulse')!.getBoundingClientRect();
        const cx = d.x + d.width / 2, cy = d.y + d.height / 2, m = 8;
        return resolve({ node: Number(g.dataset.node), hitNodes, ok: cx >= b.left - m && cx <= b.right + m && cy >= b.top - m && cy <= b.bottom + m });
      }
      if (performance.now() - t0 > 10000) return reject(new Error('no hit'));
      requestAnimationFrame(poll);
    };
    poll();
  }));
  expect(seen.hitNodes).toContain(seen.node);
  expect(seen.ok).toBe(true);
  const pos = () => page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  const first = await pos();
  await page.waitForTimeout(400);
  expect(await pos()).not.toBe(first);
});

test('reduced motion shows the finished diagram with no movement', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/work/ready-rebound-loop');
  await expect(svg(page)).toHaveClass(/instant/);
  await expect(svg(page)).toHaveClass(/closed/);
  const before = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  await page.waitForTimeout(1200);
  const after = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  expect(after).toBe(before);
  await expect(page.locator('dialog#popup g.node.hit')).toHaveCount(0);
  await context.close();
});

test('reopening does not stack loops', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafCalls = 0;
    window.requestAnimationFrame = (cb) => { (window as any).__rafCalls++; return raf(cb); };
  });
  for (let i = 0; i < 4; i++) {
    await page.locator('#sys-cylerity-intake').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  }
  await page.locator('#sys-cylerity-intake').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { (window as any).__rafCalls = 0; });
  await page.waitForTimeout(1000);
  const calls = await page.evaluate(() => (window as any).__rafCalls as number);
  // One diagram loop ≈ 60 calls/s (the hero canvas pauses while a pop-up is open, Task 8); stacked loops would be 120+.
  expect(calls).toBeLessThan(100);
});

test('pauses when hidden', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/closed/, { timeout: 15000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await page.locator('dialog#popup .pulse').getAttribute('cy');
  await page.waitForTimeout(600);
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

test('skale platform page and home pop-up render the diagram with its title', async ({ page }) => {
  await page.goto('/work/skale-platform');
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await expect(svg(page).locator('title')).toHaveText('Skale.win career platform system diagram');
  // 30s tolerates webkit running slowly under full parallel load (the Skale loop starts at 5.4s).
  await expect(svg(page)).toHaveClass(/\bclosed\b/, { timeout: 30000 });
  await page.goto('/');
  await page.locator('#sys-skale-platform').click();
  await expect(page.locator('dialog#popup')).toBeVisible();
  await expect(svg(page).locator('title')).toHaveText('Skale.win career platform system diagram');
});
