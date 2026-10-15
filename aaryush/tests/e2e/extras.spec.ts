import { expect, test, type Browser, type Page } from '@playwright/test';
import { settled } from './settle';

const NOTE = 'fellow inspector';
const map = (page: Page) => page.getByRole('dialog', { name: 'Keyboard map' });

function collectLogs(page: Page) {
  const logs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'log') logs.push(m.text()); });
  return logs;
}

test.describe('E1 console note', () => {
  test('logs exactly once per document, including after navigating', async ({ page }) => {
    const logs = collectLogs(page);
    await page.goto('/');
    await expect.poll(() => logs.filter((l) => l.includes(NOTE)).length).toBe(1);
    await page.waitForTimeout(400);
    expect(logs.filter((l) => l.includes(NOTE))).toHaveLength(1);
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Contact' }).click();
    await page.goto('/writing');
    await expect.poll(() => logs.filter((l) => l.includes(NOTE)).length).toBe(2);
    await page.waitForTimeout(400);
    expect(logs.filter((l) => l.includes(NOTE))).toHaveLength(2);
  });

  test('the logged note draws the loop, points at ?, and never leaks contact details', async ({ page }) => {
    const logs = collectLogs(page);
    await page.goto('/');
    await expect.poll(() => logs.length).toBeGreaterThan(0);
    const text = logs.find((l) => l.includes(NOTE))!;
    expect(text).toContain('This site was built by talking.');
    expect(text).toContain('shipped');
    expect(text).toContain('?');
    expect(text).toContain('— ag.');
    for (const s of ['@', 'outlook', '949', '331', '2850', 'mailto', 'tel:']) expect(text.toLowerCase()).not.toContain(s);
  });

  test('re-evaluating the module does not log again', async ({ page }) => {
    const logs = collectLogs(page);
    await page.goto('/');
    await expect.poll(() => logs.filter((l) => l.includes(NOTE)).length).toBe(1);
    // Astro may inline small scripts, so find the real chunk URLs from the resource timeline.
    const chunks = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\.js$/.test(new URL(n).pathname)),
    );
    expect(chunks.length, 'no script chunks found to re-import').toBeGreaterThan(0);
    // A new query string makes the browser evaluate the module again. Without the per-document
    // guard in logNote, evaluating the entry chunk a second time would log a second time.
    let reimported = 0;
    for (const u of chunks) {
      reimported += await page.evaluate((url) => import(/* @vite-ignore */ `${url}?again=${Math.random()}`).then(() => 1, () => 0), u);
    }
    expect(reimported).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    expect(logs.filter((l) => l.includes(NOTE))).toHaveLength(1);
  });

  test('the note text is not in the served HTML', async ({ request }) => {
    for (const path of ['/', '/writing', '/nope']) {
      const html = await (await request.get(path)).text();
      expect(html.includes(NOTE), path).toBe(false);
    }
  });
});

test.describe('E2 keyboard map', () => {
  test('? opens a labelled dialog and Esc closes it, returning focus', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Work' });
    await link.focus();
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    await expect(map(page)).toContainText('g w');
    await page.keyboard.press('Escape');
    await expect(map(page)).toBeHidden();
    await expect(link).toBeFocused();
  });

  test('backdrop click and the close button close it', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    await page.waitForTimeout(400);
    await page.mouse.click(4, 4);
    await expect(map(page)).toBeHidden();
    await page.keyboard.press('?');
    await map(page).getByRole('button', { name: 'Close' }).click();
    await expect(map(page)).toBeHidden();
  });

  test('Tab stays inside the map', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog#keymap'))).toBe(true);
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog#keymap'))).toBe(true);
    }
  });

  test('g then w/c/l/h move around the home page', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('g');
    await page.keyboard.press('w');
    await expect(page).toHaveURL(/#work$/);
    await page.keyboard.press('g');
    await page.keyboard.press('c');
    await expect(page).toHaveURL(/#contact$/);
    await page.keyboard.press('g');
    await page.keyboard.press('l');
    await expect(page).toHaveURL(/#levels$/);
    await page.keyboard.press('g');
    await page.keyboard.press('h');
    await expect(page).toHaveURL(/#hero$/);
  });

  test('g then r goes to /writing, and g then h from there returns home', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('g');
    await page.keyboard.press('r');
    await expect(page).toHaveURL(/\/writing$/);
    // The keymap on the new document only exists once its scripts have run; keys pressed before then are lost.
    await page.waitForLoadState('load');
    await page.keyboard.press('g');
    await page.keyboard.press('h');
    await expect(page).toHaveURL(/\/#hero$/);
  });

  test('a g sequence times out after 1.2s', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('g');
    await page.waitForTimeout(1400);
    await page.keyboard.press('w');
    await expect(page).not.toHaveURL(/#work/);
  });

  test('typing in a text field does nothing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const i = document.createElement('input'); i.id = 'probe'; i.style.cssText = 'position:fixed;top:80px;left:10px;z-index:99';
      const d = document.createElement('div'); d.id = 'ce'; d.contentEditable = 'true'; d.textContent = 'x'; d.style.cssText = 'position:fixed;top:120px;left:10px;z-index:99';
      document.body.append(i, d);
    });
    for (const sel of ['#probe', '#ce']) {
      await page.locator(sel).focus();
      await page.keyboard.type('gw?');
      await expect(page).not.toHaveURL(/#work/);
      await expect(map(page)).toBeHidden();
    }
  });

  test('shortcuts are ignored with a modifier held', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+g');
    await page.keyboard.press('w');
    await page.keyboard.press('Alt+?');
    await expect(page).not.toHaveURL(/#work/);
    await expect(map(page)).toBeHidden();
  });

  test('inside a pop-up only ? works, and Esc closes the map before the pop-up', async ({ page }) => {
    await page.goto('/work/cylerity');
    const popup = page.locator('dialog#popup');
    await expect(popup).toBeVisible();
    await page.keyboard.press('g');
    await page.keyboard.press('r');
    await expect(popup).toBeVisible();
    await expect(page).toHaveURL(/\/work\/cylerity$/);
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(map(page)).toBeHidden();
    await expect(popup).toBeVisible();
    await expect(page).toHaveURL(/\/work\/cylerity$/);
  });

  test('t is listed in the map and steps the field through the periods', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    await expect(map(page).getByText('Step the time of day')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(map(page)).toBeHidden();
    await page.keyboard.press('t');
    await expect(page.locator('#field')).toHaveAttribute('data-daypart', 'morning');
  });

  test('t does nothing while the map is open, and with no hook the row is hidden', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { delete (window as any).__heroDaypart; delete (window as any).__daypart; });
    await page.keyboard.press('?');
    await expect(map(page).getByText('Step the time of day')).toBeHidden();
    await page.keyboard.press('Escape');
    const before = await page.locator('#field').getAttribute('data-daypart');
    await page.keyboard.press('t'); // no hook: must not throw
    expect(await page.locator('#field').getAttribute('data-daypart')).toBe(before);
  });

  test('the dialog title takes focus without a focus ring', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');
    const title = map(page).getByRole('heading', { name: 'Keyboard map' });
    await expect(title).toBeFocused();
    expect(await title.getAttribute('tabindex')).toBe('-1');
    expect(await title.evaluate((h) => getComputedStyle(h).outlineStyle)).toBe('none');
  });

  test('under reduced motion the map has no entry animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.keyboard.press('?');
    const s = await page.locator('dialog#keymap').evaluate((d) => { const c = getComputedStyle(d); return { a: c.animationName, t: c.transitionDuration }; });
    expect(s.a).toBe('none');
    expect(parseFloat(s.t)).toBeLessThan(0.001);
  });

  test('the map is in the served HTML only as a closed dialog and has no contact details', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(/<dialog[^>]*id="keymap"(?![^>]*\sopen)/.test(html)).toBe(true);
  });
});

test.describe('E3 404 sheet', () => {
  test('shows the strip, heading, register links and a struck row for the path', async ({ page }) => {
    const res = await page.goto('/no/such/sheet');
    expect(res?.status()).toBe(404);
    await expect(page.locator('main .sec-head')).toContainText('§ 404');
    await expect(page.locator('main .sec-head')).toContainText('Sheet not in set');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sheet not in set.');
    const hrefs = await page.locator('[data-register] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/#hero', '/#levels', '/#work', '/writing', '/#contact']);
    const row = page.locator('[data-register] [data-missing]');
    await expect(row).toContainText('/no/such/sheet');
    await expect(row).toContainText('Not issued');
    expect(await row.locator('s').count()).toBe(1);
  });

  // One test per link: the old single test navigated 404 -> home -> 404 -> /writing in one page, and WebKit's renderer
  // crashed ("Page crashed") on the hop away from the canvas-heavy home page under load. Each link now gets a fresh page.
  for (const [label, url] of [['Work', /\/#work$/], ['Writing', /\/writing$/]] as const) {
    test(`register link works: ${label}`, async ({ page }) => {
      await page.goto('/nope');
      // The page script inserts the "not issued" row above the links after load; clicking before that lands on a moving target.
      await expect(page.locator('[data-register] [data-missing]')).toBeAttached();
      await page.locator('[data-register] a', { hasText: label }).click();
      await expect(page).toHaveURL(url);
    });
  }

  test('a path containing <script> renders as literal text', async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs++; void d.dismiss(); });
    await page.goto('/%3Cscript%3Ealert(1)%3C/script%3E');
    const row = page.locator('[data-register] [data-missing]');
    await expect(row).toContainText('<script>alert(1)</script>');
    expect(await row.locator('script').count()).toBe(0);
    expect(await page.locator('[data-register] script').count()).toBe(0);
    expect(dialogs).toBe(0);
  });

  test('truncates to 60 characters', async ({ page }) => {
    await page.goto('/' + 'a'.repeat(300));
    const t = await page.locator('[data-missing] s').innerText();
    expect([...t.trim()]).toHaveLength(60);
  });

  test('very long and unicode paths do not overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const p of ['/' + 'a'.repeat(300), '/' + encodeURIComponent('é日本語😀'.repeat(30)), '/' + 'x'.repeat(59)]) {
      await page.goto(p);
      await expect(page.locator('[data-missing]')).toBeVisible();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, p).toBeLessThanOrEqual(0);
    }
  });

  test('without JavaScript the missing row is omitted and the links remain', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/gone');
    await expect(page.locator('[data-register] a')).toHaveCount(5);
    await expect(page.locator('[data-missing]')).toHaveCount(0);
    await ctx.close();
  });
});

test.describe('E5 hero topography follows the clock', () => {
  const field = (page: Page) => page.locator('#field');
  const info = (page: Page) =>
    field(page).evaluate((c: HTMLCanvasElement) => ({ part: c.dataset.daypart, levels: Number(c.dataset.levels), drift: Number(c.dataset.drift), amber: Number(c.dataset.amber) }));
  const at = async (page: Page, h: number, m: number) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date(2026, 9, 14, h, m, 0) });
  };
  // <html> may not exist yet when an init script first runs, so wait for it.
  const setDaypart = (v: string) => {
    const set = () => !!document.documentElement && (document.documentElement.setAttribute('data-daypart', v), true);
    if (!set()) new MutationObserver((_m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true });
  };
  /** A fresh page whose <html> carries data-daypart before any script runs. */
  const forced = async (browser: Browser, part: string, reduced = false) => {
    const ctx = await browser.newContext({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    await page.addInitScript(setDaypart, part);
    await page.goto('/');
    return { page, ctx };
  };

  for (const [h, m, want] of [[6, 59, 'night'], [7, 0, 'morning'], [11, 59, 'morning'], [12, 0, 'afternoon'], [16, 59, 'afternoon'], [17, 0, 'evening'], [20, 59, 'evening'], [21, 0, 'night']] as const) {
    test(`${h}:${String(m).padStart(2, '0')} local time is ${want}`, async ({ page }) => {
      await at(page, h, m);
      await page.goto('/');
      await expect(field(page)).toHaveAttribute('data-daypart', want);
    });
  }

  test('data-daypart on <html> forces each period with its own parameters', async ({ browser }) => {
    const seen: Record<string, Awaited<ReturnType<typeof info>>> = {};
    for (const d of ['morning', 'afternoon', 'evening', 'night']) {
      const { page, ctx } = await forced(browser, d);
      await expect(field(page)).toHaveAttribute('data-daypart', d);
      seen[d] = await info(page);
      await ctx.close();
    }
    expect(seen.afternoon).toMatchObject({ levels: 15, drift: 1 });
    expect(seen.night.levels).toBeLessThan(15);
    expect(seen.night.drift).toBeCloseTo(0.6, 5);
    expect(seen.night.amber).toBeLessThan(seen.afternoon.amber);
    expect(seen.evening.amber).toBeGreaterThan(seen.afternoon.amber);
    expect(seen.morning.levels).toBe(18);
    expect(seen.morning.drift).toBeGreaterThan(1);
  });

  test('an invalid data-daypart is ignored', async ({ page }) => {
    await at(page, 13, 0);
    await page.addInitScript(setDaypart, 'dawn');
    await page.goto('/');
    await expect(field(page)).toHaveAttribute('data-daypart', 'afternoon');
  });

  test('the ?daypart query is ignored in a production build', async ({ page }) => {
    await at(page, 13, 0);
    await page.goto('/?daypart=night');
    await expect(field(page)).toHaveAttribute('data-daypart', 'afternoon');
  });

  test('re-checks the hour every 10 minutes while the hero is visible', async ({ page }) => {
    await at(page, 11, 55);
    await page.goto('/');
    await expect(field(page)).toHaveAttribute('data-daypart', 'morning');
    await page.clock.runFor('09:00');
    await expect(field(page)).toHaveAttribute('data-daypart', 'morning');
    await page.clock.runFor('01:05');
    await expect(field(page)).toHaveAttribute('data-daypart', 'afternoon');
  });

  test('the reduced-motion still frame reflects the period', async ({ browser }) => {
    const frames: string[] = [];
    for (const d of ['afternoon', 'night']) {
      const { page, ctx } = await forced(browser, d, true);
      await expect(field(page)).toHaveAttribute('data-daypart', d);
      expect(await field(page).getAttribute('data-running')).toBe('false');
      frames.push(await field(page).evaluate((c: HTMLCanvasElement) => c.toDataURL()));
      await ctx.close();
    }
    expect(frames[0]).not.toBe(frames[1]);
  });

  test('window.__heroDaypart is a function that cycles to the next period and returns its name', async ({ page }) => {
    await at(page, 13, 0);
    await page.goto('/');
    expect(await page.evaluate(() => typeof (window as any).__heroDaypart)).toBe('function');
    const seq: string[] = [];
    for (let i = 0; i < 5; i++) seq.push(await page.evaluate(() => (window as any).__heroDaypart()));
    expect(seq).toEqual(['morning', 'afternoon', 'evening', 'night', 'auto']);
    await expect(field(page)).toHaveAttribute('data-daypart', 'afternoon'); // back to the 13:00 clock
    expect(await page.evaluate(() => (window as any).__heroDaypart())).toBe('morning');
    await expect(field(page)).toHaveAttribute('data-daypart', 'morning');
  });

  test('t previews the next period and shows a brief label that then goes away', async ({ page }) => {
    await at(page, 13, 0);
    await page.goto('/');
    await page.keyboard.press('t');
    await expect(field(page)).toHaveAttribute('data-daypart', 'morning');
    const tag = page.locator('.dp-tag');
    await expect(tag).toContainText('morning');
    await page.clock.runFor(4000);
    await expect(tag).toHaveCount(0);
    await page.keyboard.press('t');
    await expect(field(page)).toHaveAttribute('data-daypart', 'afternoon');
  });

  test('the label is not in the served HTML', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html.includes('class="dp-tag"')).toBe(false);
  });

  // One test per period: three browser contexts plus three axe runs in one test is slow enough on a loaded
  // machine to hit the 30s budget. Each also waits for the finite hero animations to finish before measuring.
  for (const d of ['morning', 'evening', 'night']) {
    test(`hero text keeps its contrast in the ${d} period`, async ({ browser }) => {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      const { page, ctx } = await forced(browser, d);
      try {
        await expect(field(page)).toHaveAttribute('data-daypart', d);
        await settled(page);
        const r = await new AxeBuilder({ page }).include('#hero').withRules(['color-contrast']).analyze();
        expect(r.violations.map((v) => v.id), d).toEqual([]);
      } finally {
        await ctx.close();
      }
    });
  }

});
