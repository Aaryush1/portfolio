import { expect, test, type Page } from '@playwright/test';

// E4: printing the home page produces a drawing sheet. Layout checks run in every browser under
// emulated print media; PDF page counts run in Chromium only (page.pdf() is Chromium-only).

const EMAIL = 'aaryush@outlook.com';
const PHONE = '949 331 2850';
const printed = async (page: Page, path = '/') => {
  await page.goto(path);
  await page.emulateMedia({ media: 'print' });
};
const text = (page: Page) => page.locator('body').innerText();
const visible = (page: Page, sel: string) =>
  page.locator(sel).evaluateAll((els) =>
    els.filter((e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }).length,
  );
const fire = (page: Page, name: 'beforeprint' | 'afterprint') => page.evaluate((n) => window.dispatchEvent(new Event(n)), name);

test.describe('E4 print sheet: what prints', () => {
  test('nothing decorative or interactive prints', async ({ page }) => {
    await printed(page);
    for (const sel of ['.bg', 'canvas', '#top', '.foot', '#keymap', '#popup', '.hero .reg', '.hero .ruler', '.hero .cta', '#levels', '.frag']) {
      expect(await visible(page, sel), sel).toBe(0);
    }
    // nothing fades in or loops on paper
    const stuck = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.rv, .enter')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    expect(stuck).toBe(0);
    const running = await page.evaluate(() =>
      document.getAnimations().filter((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
        return a.playState === 'running' && !!t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().width > 0;
      }).length,
    );
    expect(running).toBe(0);
  });

  test('ink is black on a white page', async ({ page }) => {
    await printed(page);
    const c = await page.evaluate(() => ({
      body: getComputedStyle(document.body).color,
      h1: getComputedStyle(document.querySelector('h1')!).color,
      bg: getComputedStyle(document.documentElement).backgroundColor,
    }));
    expect(c.bg).toMatch(/rgb\(255, 255, 255\)|rgba\(0, 0, 0, 0\)/);
    expect(c.h1).toBe('rgb(0, 0, 0)');
    expect(c.body).toBe('rgb(0, 0, 0)');
  });

  test('header, about, timeline, writing and links are on the sheet', async ({ page }) => {
    await printed(page);
    const t = (await text(page)).toLowerCase();
    for (const s of [
      'aaryush gupta', 'ai strategy & organizational design',
      'i build the systems behind', 'how anyone solves problems',
      'ai is becoming the infrastructure', 'if you’re thinking about what ai means',
      'gupta advisory', 'founder', 'dec 2024 – present',
      'ready rebound', 'ai & engineering lead', 'cylerity', 'ai lead', 'jan 2024 – present',
      'skale.win', 'jun 2024 – feb 2026', 'earlier', '2023 – 2024',
      'a fintech-healthcare company that underwrites',
      'this is bigger than electricity', 'the quiet singularity',
      'linkedin.com/in/aaryush', 'github.com/aaryush1', 'aaryush.com',
    ]) expect(t, s).toContain(s);
    for (const title of await page.locator('#work .card h4').allInnerTexts()) expect(t, title).toContain(title.toLowerCase());
    for (const s of ['dwg. no.', 'ag-001', 'sheet', 'region', 'us-central', 'last deploy', 'scale', 'nts']) expect(t, s).toContain(s);
    expect(await visible(page, '.print-block .tblock')).toBe(1);
  });

  test('pop-up copy, long card prose and nav chrome stay off the sheet', async ({ page }) => {
    await printed(page);
    const t = await text(page);
    expect(t).not.toMatch(/the challenge|what i designed|open schematic|all writing|inside cylerity|back to top|save contact|how ai fits/i);
    expect(await visible(page, '#work .card p')).toBe(0);
    expect(await visible(page, '.post p')).toBe(0);
  });

  test('the sheet has a hairline black border and the title block sits bottom-right', async ({ page }) => {
    await printed(page);
    const b = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { w: s.borderTopWidth, c: s.borderTopColor, st: s.borderTopStyle };
    });
    expect(b.st).toBe('solid');
    expect(b.c).toBe('rgb(0, 0, 0)');
    expect(parseFloat(b.w)).toBeLessThanOrEqual(1.5);
    const align = await page.evaluate(() => getComputedStyle(document.querySelector('.print-block')!).justifyContent);
    expect(align).toMatch(/flex-end|end|right/);
  });
});

test.describe('E4 print sheet: contact lines', () => {
  test('email and phone are never in the served HTML', async ({ request }) => {
    const html = await (await request.get('/')).text();
    // (the existing scraper protection stores the parts reversed in data-v, so single parts may appear; the joined forms never do)
    for (const s of [EMAIL, PHONE, '9493312850', '+19493312850', '+1 949', 'mailto:', 'tel:']) expect(html, s).not.toContain(s);
    expect(html).not.toMatch(/aaryush@|@outlook/);
  });

  test('beforeprint assembles the contact text and afterprint removes it', async ({ page }) => {
    await printed(page);
    const before = await text(page);
    expect(before).not.toContain(EMAIL);
    expect(before).not.toContain(PHONE);
    await fire(page, 'beforeprint');
    const during = await text(page);
    expect(during).toContain(EMAIL);
    expect(during).toContain(PHONE);
    await fire(page, 'afterprint');
    // (the runtime mailto/tel hrefs legitimately hold the address in the live DOM; the print text must be gone)
    const html = await page.locator('[data-print-contact]').evaluate((e) => e.outerHTML);
    for (const s of [EMAIL, PHONE, 'aaryush@']) expect(html, s).not.toContain(s);
    expect(await text(page)).not.toContain(EMAIL);
    // printing twice works again, and does not duplicate the lines
    await fire(page, 'beforeprint');
    await fire(page, 'beforeprint');
    expect(((await text(page)).match(/aaryush@outlook\.com/g) ?? []).length).toBe(1);
    await fire(page, 'afterprint');
  });

  test('the contact lines are not on screen', async ({ page }) => {
    await page.goto('/');
    await fire(page, 'beforeprint');
    expect(await visible(page, '.print-only')).toBe(0);
    await fire(page, 'afterprint');
  });

  test('without JavaScript the contact lines are omitted, the rest still prints', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await printed(page);
    const t = await text(page);
    expect(t).not.toMatch(/e-?mail|phone|@|outlook|949/i);
    expect(t).toContain('linkedin.com/in/aaryush');
    expect(t).toContain('Aaryush Gupta');
    expect(t.toLowerCase()).toContain('gupta advisory');
    expect(t.toLowerCase()).toContain('how anyone solves problems');
    await ctx.close();
  });
});

test.describe('E4 print sheet: failure cases', () => {
  test('printing with a pop-up open still prints the home sheet, without the pop-up', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sys-univise').click();
    await expect(page.locator('dialog#popup')).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    expect(await visible(page, 'dialog#popup')).toBe(0);
    const t = (await text(page)).toLowerCase();
    expect(t).not.toMatch(/the challenge|what i designed|open schematic/);
    expect(t).toContain('how anyone solves problems');
    expect(t).toContain('gupta advisory');
    expect(t).toContain('univise');
    // a locked page must not clip the sheet to the first screen
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe('hidden');
  });

  test('a standalone /work page prints the same sheet', async ({ page }) => {
    await printed(page, '/work/cylerity');
    expect(await visible(page, 'dialog#popup')).toBe(0);
    expect((await text(page)).toLowerCase()).toContain('how anyone solves problems');
  });

  test('essays keep their own print rules, minus the background layer', async ({ page }) => {
    await printed(page, '/writing/quiet-singularity');
    expect(await visible(page, '.bg')).toBe(0);
    expect(await visible(page, '.top')).toBe(0);
    expect(await visible(page, '.foot')).toBe(0);
    expect(await visible(page, '.print-block')).toBe(0); // the drawing sheet is home-only
    expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(0, 0, 0)');
    expect((await text(page)).length).toBeGreaterThan(2000);
  });
});

test.describe('E4 print sheet: PDF page budget (Chromium)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'page.pdf() is Chromium-only');
  const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;

  for (const format of ['Letter', 'A4'] as const) {
    test(`home fits on one or two ${format} pages`, async ({ page }) => {
      await page.goto('/');
      await fire(page, 'beforeprint');
      const n = pages(await page.pdf({ format }));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
    });
  }

  test('with a pop-up open the PDF is still the home sheet, within budget', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sys-univise').click();
    await expect(page.locator('dialog#popup')).toBeVisible();
    expect(pages(await page.pdf({ format: 'Letter' }))).toBeLessThanOrEqual(2);
  });
});

test.describe('E4 print sheet: page breaks and page margin', () => {
  test('the border is cloned at a page break (box-decoration-break)', async ({ page }) => {
    await printed(page);
    const v = await page.evaluate(() => {
      const s = getComputedStyle(document.body) as CSSStyleDeclaration & { webkitBoxDecorationBreak?: string };
      return s.getPropertyValue('box-decoration-break') || s.webkitBoxDecorationBreak || '';
    });
    expect(v).toBe('clone');
  });

  // Note: this only proves that a long sheet paginates to exactly two pages. It cannot show that the border is repeated on
  // page two; the computed-style test above (box-decoration-break: clone) is the guard for that.
  test('a sheet forced onto a second page still renders as exactly two pages (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is Chromium-only');
    const pages = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
    await page.goto('/');
    await fire(page, 'beforeprint');
    // grow the sheet one extra writing row at a time until it spills onto page two
    let n = pages(await page.pdf({ format: 'Letter' }));
    for (let i = 0; i < 60 && n < 2; i++) {
      await page.evaluate(() => {
        const post = document.querySelector('.post')!;
        post.parentElement!.append(post.cloneNode(true));
      });
      n = pages(await page.pdf({ format: 'Letter' }));
    }
    expect(n).toBe(2);
  });

  // Task 28 regression: real Ctrl+P printed a blank page 1 and the sheet on page 2. A named page on <body> alone differs
  // from the unnamed <html> page, and a browser print forces a break at that boundary. page.pdf() and --print-to-pdf do not
  // force it, which is why the PDF page-count tests above passed. The invariant that does catch it: every box from <html>
  // down to the sheet carries the same page name, so there is no page-name transition before the sheet.
  test('no page-name change between <html> and the sheet (no forced blank first page)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'named pages (the page property) are Chromium-only; the blank-page bug is a Chrome print behaviour');
    const names = async (path: string) => {
      await printed(page, path);
      return page.evaluate(() => {
        const pg = (e: Element) => { const s = getComputedStyle(e) as CSSStyleDeclaration & { page?: string }; return s.page || s.getPropertyValue('page') || 'auto'; };
        return { html: pg(document.documentElement), body: pg(document.body) };
      });
    };
    const home = await names('/');
    expect(home.body).toBe('home');
    expect(home.html).toBe(home.body);
    const essay = await names('/writing/quiet-singularity');
    expect(essay.html).toBe(essay.body);
  });

  test('the narrow .3in margin belongs to the home sheet only (named @page)', async ({ page }) => {
    const rules = async (path: string) => {
      await printed(page, path);
      return page.evaluate(() => {
        const out: { name: string; margin: string }[] = [];
        for (const sheet of [...document.styleSheets]) {
          let list: CSSRuleList;
          try { list = sheet.cssRules; } catch { continue; }
          for (const r of [...list]) if (r instanceof CSSPageRule) out.push({ name: r.selectorText, margin: r.style.margin });
        }
        const bodyPage = (getComputedStyle(document.body) as CSSStyleDeclaration & { page?: string }).page ?? getComputedStyle(document.body).getPropertyValue('page');
        return { out, bodyPage };
      });
    };
    const home = await rules('/');
    // no unnamed @page rule carries a margin, and the home page opts into the named one
    expect(home.out.filter((r) => r.name === '' && r.margin !== '')).toEqual([]);
    expect(home.out.some((r) => r.name === 'home' && /\.3in|0\.3in|28\.8px/.test(r.margin))).toBe(true);
    if (home.bodyPage) expect(home.bodyPage).toBe('home');
    const essay = await rules('/writing/quiet-singularity');
    expect(essay.out.filter((r) => r.name === '' && r.margin !== '')).toEqual([]);
    expect(essay.bodyPage === '' || essay.bodyPage === 'auto').toBe(true);
  });
});
