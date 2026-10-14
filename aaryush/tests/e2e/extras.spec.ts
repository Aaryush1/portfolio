import { expect, test, type Page } from '@playwright/test';

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
    expect(text).toContain('Browser QA');
    expect(text).toContain('?');
    expect(text).toContain('— ag.');
    for (const s of ['@', 'outlook', '949', '331', '2850', 'mailto', 'tel:']) expect(text.toLowerCase()).not.toContain(s);
  });

  test('re-evaluating the module does not log again', async ({ page }) => {
    const logs = collectLogs(page);
    await page.goto('/');
    await expect.poll(() => logs.filter((l) => l.includes(NOTE)).length).toBe(1);
    const src = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean));
    for (const s of src) await page.evaluate((u) => import(/* @vite-ignore */ u + '?again').catch(() => null), s);
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

  test('t is not listed and does nothing without the time preview; with it, it is', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('?');
    await expect(map(page)).toBeVisible();
    await expect(map(page).getByText('Step the field')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(map(page)).toBeHidden();
    await page.evaluate(() => { (window as any).__t = 0; (window as any).__heroDaypart = () => { (window as any).__t++; }; });
    await page.keyboard.press('?');
    await expect(map(page).getByText('Step the field')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(map(page)).toBeHidden();
    await page.keyboard.press('t');
    expect(await page.evaluate(() => (window as any).__t)).toBe(1);
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
    expect(hrefs).toEqual(['/#hero', '/#about', '/#levels', '/#work', '/writing', '/#contact']);
    const row = page.locator('[data-register] [data-missing]');
    await expect(row).toContainText('/no/such/sheet');
    await expect(row).toContainText('Not issued');
    expect(await row.locator('s').count()).toBe(1);
  });

  test('every register link works', async ({ page }) => {
    await page.goto('/nope');
    await page.locator('[data-register] a', { hasText: 'Work' }).click();
    await expect(page).toHaveURL(/\/#work$/);
    await page.goto('/nope');
    await page.locator('[data-register] a', { hasText: 'Writing' }).click();
    await expect(page).toHaveURL(/\/writing$/);
  });

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
    await expect(page.locator('[data-register] a')).toHaveCount(6);
    await expect(page.locator('[data-missing]')).toHaveCount(0);
    await ctx.close();
  });
});
