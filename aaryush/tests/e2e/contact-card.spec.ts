import { expect, test, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { unfold } from '../../src/lib/vcard';

// E6: the QR page builds a QR that remembers where Aaryush met someone; the scanner's Save contact carries it.

const BASE = 'https://aaryush.com';
const SAVED = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

/** Rasterize the page's own QR <svg> (its path data) in node and decode it. Returns the encoded text or null. */
async function decodeQr(page: Page): Promise<string | null> {
  const { viewBox, d } = await page.locator('[data-qr-box] svg').evaluate((s) => ({
    viewBox: s.getAttribute('viewBox')!,
    d: s.querySelector('path')!.getAttribute('d')!,
  }));
  const size = Number(viewBox.split(' ')[2]);
  const scale = 8;
  const w = size * scale;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, len] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let yy = y * scale; yy < (y + 1) * scale; yy++) {
      for (let xx = x * scale; xx < (x + len) * scale; xx++) {
        const i = (yy * w + xx) * 4;
        px[i] = px[i + 1] = px[i + 2] = 0;
      }
    }
  }
  return jsQR(px, w, w)?.data ?? null;
}

const qrUrl = async (page: Page) => (await page.locator('[data-qr-box] svg').getAttribute('data-url'))!;
const where = (page: Page) => page.getByRole('textbox', { name: 'Where' });
const note = (page: Page) => page.locator('[data-note]');
const topic = (page: Page, name: string) => page.locator('[data-topic]', { hasText: new RegExp(`^${name}$`) });

/** Click a "Save contact" button and return the downloaded vCard text, unfolded. */
async function saveContact(page: Page, where: 'hero' | 'footer' = 'hero') {
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(`[data-contact="${where}"] [data-vcard]`).click(),
  ]);
  const stream = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  const fields = new Map<string, string>();
  for (const line of unfold(text).split('\r\n').filter(Boolean)) {
    const i = line.indexOf(':');
    fields.set(line.slice(0, i).split(';')[0], line.slice(i + 1));
  }
  const unescape = (v: string) => v.replace(/\\([\\,;nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
  return { text, fields, filename: dl.suggestedFilename(), noteText: unescape(fields.get('NOTE') ?? '') };
}

test.describe('E6 /qr: the tool', () => {
  test('starts blank: a QR for the plain site URL, nothing selected, caption idle', async ({ page }) => {
    await page.goto('/qr');
    await expect(page.locator('[data-qr-box] svg')).toBeVisible();
    expect(await qrUrl(page)).toBe(`${BASE}/`);
    expect(await decodeQr(page)).toBe(`${BASE}/`);
    await expect(where(page)).toHaveValue('');
    await expect(note(page)).toHaveValue('');
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('[data-qr-cap]')).toHaveText('aaryush.com');
  });

  test('typing, presets and topic chips re-render a QR that decodes to the right URL', async ({ page }) => {
    await page.goto('/qr');
    await where(page).fill('Madison AI Week');
    await topic(page, 'Engineering loop').click();
    await topic(page, 'Writing').click();
    await note(page).fill('pricing AI agents');
    const want = `${BASE}/?met=Madison%20AI%20Week&about=ready-rebound-loop,writing&note=pricing%20AI%20agents`;
    await expect.poll(() => qrUrl(page)).toBe(want);
    expect(await decodeQr(page)).toBe(want);
    await expect(page.locator('[data-qr-cap]')).toHaveText('Met at Madison AI Week · talked about Engineering loop, Writing, pricing AI agents');
  });

  test('the three presets fill Where, toggle off, and are the only presets', async ({ page }) => {
    await page.goto('/qr');
    await expect(page.locator('[data-preset]')).toHaveText(['Coffee', 'Conference', 'Dinner']);
    const coffee = page.locator('[data-preset="Coffee"]');
    await coffee.click();
    await expect(where(page)).toHaveValue('Coffee');
    await expect(coffee).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => qrUrl(page)).toBe(`${BASE}/?met=Coffee`);
    await page.locator('[data-preset="Dinner"]').click();
    await expect(where(page)).toHaveValue('Dinner');
    await expect(coffee).toHaveAttribute('aria-pressed', 'false');
    await page.locator('[data-preset="Dinner"]').click();
    await expect(where(page)).toHaveValue('');
    await expect.poll(() => qrUrl(page)).toBe(`${BASE}/`);
  });

  test('at most two topics: the rest are disabled until one is released', async ({ page }) => {
    await page.goto('/qr');
    await topic(page, 'Gupta Advisory').click();
    await topic(page, 'Writing').click();
    await expect(topic(page, 'Engineering loop')).toBeDisabled();
    await topic(page, 'Writing').click();
    await expect(topic(page, 'Engineering loop')).toBeEnabled();
    await topic(page, 'Engineering loop').click();
    await expect.poll(() => qrUrl(page)).toBe(`${BASE}/?about=advisory,ready-rebound-loop`);
  });

  test('topic chips come from the site: every system plus Advisory and Writing', async ({ page }) => {
    await page.goto('/qr');
    const names = await page.locator('[data-topic]').allInnerTexts();
    for (const n of ['Gupta Advisory', 'Engineering intake', 'Claims underwriting', 'Engineering loop', 'Career platform', 'SmartBenAI', 'UMN Discovery Launchpad', 'Univise', 'Writing']) {
      expect(names, n).toContain(n);
    }
  });

  test('over-long and unicode values are capped, never break the code', async ({ page }) => {
    await page.goto('/qr');
    await where(page).fill('w'.repeat(100));
    await note(page).fill('😀'.repeat(100));
    await expect.poll(async () => (await qrUrl(page)).length).toBeGreaterThan(100);
    const url = new URL(await qrUrl(page));
    expect(Array.from(url.searchParams.get('met')!)).toHaveLength(60);
    // (the input's own maxlength=80 counts UTF-16 units, so 100 emoji are cut even earlier: never more than 80 characters)
    expect(Array.from(url.searchParams.get('note')!).length).toBeLessThanOrEqual(80);
    expect(await decodeQr(page)).toBe(await qrUrl(page));
  });

  test('<script> and links in the fields never reach the QR or the page', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await page.goto('/qr');
    await where(page).fill('<script>alert(1)</script>');
    await note(page).fill('see https://evil.example/x now');
    await expect.poll(() => qrUrl(page)).toContain('met=');
    const url = await qrUrl(page);
    expect(url).not.toMatch(/%3C|%3E|evil/i);
    await expect(page.locator('[data-qr-cap]')).not.toContainText('evil');
    expect(await page.locator('main script, main [onerror]').count()).toBe(0);
    expect(dialogs).toEqual([]);
  });

  test('Clear resets every field, chip and the code', async ({ page }) => {
    await page.goto('/qr');
    await where(page).fill('Madison AI Week');
    await topic(page, 'Writing').click();
    await note(page).fill('x');
    await expect.poll(() => qrUrl(page)).toContain('met=');
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(where(page)).toHaveValue('');
    await expect(note(page)).toHaveValue('');
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('[data-qr-cap]')).toHaveText('aaryush.com');
    expect(await qrUrl(page)).toBe(`${BASE}/`);
  });

  test('nothing persists: no storage is written, and a reload starts blank', async ({ page }) => {
    await page.goto('/qr');
    await where(page).fill('Madison AI Week');
    await topic(page, 'Writing').click();
    await note(page).fill('pricing AI agents');
    await expect.poll(() => qrUrl(page)).toContain('note=');
    const stored = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie }));
    expect(stored).toEqual({ local: 0, session: 0, cookie: '' });
    await page.reload();
    await expect(where(page)).toHaveValue('');
    await expect(note(page)).toHaveValue('');
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    expect(await qrUrl(page)).toBe(`${BASE}/`);
  });

  test('no network call leaves the origin', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4322') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
    await page.goto('/qr');
    await where(page).fill('Madison');
    await page.waitForTimeout(300);
    expect(external).toEqual([]);
  });

  test('the QR box and everything below it never move, even for a dense code', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/qr');
    const geo = () => page.evaluate(() => {
      const top = document.querySelector('[data-qr-box]')!.getBoundingClientRect().y; // the page may scroll while typing: compare to the box
      const r = (s: string) => { const b = document.querySelector(s)!.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y - top), Math.round(b.width), Math.round(b.height)]; };
      return { box: r('[data-qr-box]'), cap: r('[data-qr-cap]'), where: r('[data-where]'), note: r('[data-note]'), clear: r('[data-clear]'), sw: document.documentElement.scrollWidth, vw: innerWidth };
    });
    await expect(page.locator('[data-qr-box] svg')).toBeVisible();
    const blank = await geo();
    // worst case: 60-character place, the two longest topic names, an 80-character note
    await where(page).fill('Madison AI Week conference hall, level three, east wing lobby, x'.slice(0, 60));
    await topic(page, 'UMN Discovery Launchpad').click();
    await topic(page, 'Claims underwriting').click();
    await note(page).fill('a rather long note about pricing AI agents and other things we cover here ok'.slice(0, 80));
    await expect.poll(async () => (await qrUrl(page)).length).toBeGreaterThan(150);
    const dense = await geo();
    expect(dense).toEqual(blank);
    // the caption shows everything that will be saved: nothing is clipped
    const cap = page.locator('[data-qr-cap]');
    expect(await cap.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
    await expect(cap).toContainText('Met at Madison AI Week');
    await expect(cap).toContainText(await note(page).inputValue());
    expect(dense.sw).toBeLessThanOrEqual(dense.vw);
    expect(await decodeQr(page)).toBe(await qrUrl(page));
  });

  test('the QR sits on a white quiet zone and uses crisp black modules', async ({ page }) => {
    await page.goto('/qr');
    const info = await page.locator('[data-qr-box] svg').evaluate((s) => {
      const vb = s.getAttribute('viewBox')!.split(' ').map(Number);
      const xs = [...s.querySelector('path')!.getAttribute('d')!.matchAll(/M(\d+) (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      return { size: vb[2], minX: Math.min(...xs.map((p) => p[0])), minY: Math.min(...xs.map((p) => p[1])), bg: s.querySelector('rect')!.getAttribute('fill'), fg: s.querySelector('path')!.getAttribute('fill') };
    });
    expect(info.bg).toBe('#fff');
    expect(info.fg).toBe('#000');
    expect(info.minX).toBeGreaterThanOrEqual(4);
    expect(info.minY).toBeGreaterThanOrEqual(4);
  });

  test('without JavaScript: the static QR shows, the tool hides, Save contact keeps the static vCard', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/qr');
    await expect(page.getByRole('img', { name: 'QR code for aaryush.com' })).toBeVisible();
    await expect(page.locator('[data-qr-form]')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Save contact' }).first()).toHaveAttribute('href', '/Aaryush%20Contact%20Info.vcf');
    await ctx.close();
  });

  test('the QR library is on /qr only, never in the home bundle', async ({ page }) => {
    const SIG = ['createSvgTag', 'getModuleCount'];
    const scriptsOn = async (path: string) => {
      const pending: Promise<string>[] = [];
      page.on('response', (r) => { if (/javascript/.test(r.headers()['content-type'] ?? '')) pending.push(r.text().catch(() => '')); });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      page.removeAllListeners('response');
      return Promise.all(pending); // every body, not just the ones that resolved in time
    };
    const home = await scriptsOn('/');
    expect(home.length).toBeGreaterThan(0);
    for (const sig of SIG) expect(home.some((b) => b.includes(sig)), `home bundle contains ${sig}`).toBe(false);
    const qr = await scriptsOn('/qr');
    for (const sig of SIG) expect(qr.some((b) => b.includes(sig)), `/qr bundle should contain ${sig}`).toBe(true);
    // and the home HTML itself inlines no copy of it
    const html = await (await page.request.get('/')).text();
    for (const sig of SIG) expect(html).not.toContain(sig);
  });
});

test.describe('E6 the person who scans', () => {
  const CTX = '/?met=Madison%20AI%20Week&about=ready-rebound-loop,writing&note=pricing%20AI%20agents&x=1#work';

  test('params are stripped from the address bar; other params and the hash stay', async ({ page }) => {
    await page.goto(CTX);
    await expect.poll(() => new URL(page.url()).search).toBe('?x=1');
    expect(new URL(page.url()).hash).toBe('#work');
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('meet-context')!));
    expect(stored).toEqual({ met: 'Madison AI Week', about: ['ready-rebound-loop', 'writing'], note: 'pricing AI agents' });
  });

  test('Save contact builds a vCard 3.0 with the note, from either button, with name, email, phone and URL', async ({ page }) => {
    await page.goto(CTX);
    for (const which of ['hero', 'footer'] as const) {
      const v = await saveContact(page, which);
      expect(v.filename).toBe('Aaryush Gupta.vcf');
      expect(v.text.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
      expect(v.text.endsWith('END:VCARD\r\n')).toBe(true);
      expect(v.fields.get('FN')).toBe('Aaryush Gupta');
      expect(v.fields.get('N')).toBe('Gupta;Aaryush;;;');
      expect(v.fields.get('EMAIL')).toBe('aaryush@outlook.com');
      expect(v.fields.get('TEL')).toBe('+1 949 331 2850');
      expect(v.fields.get('URL')).toBe(BASE);
      expect(v.noteText).toBe(`Met at Madison AI Week · ${SAVED} · Talked about: Engineering loop, Writing, pricing AI agents`);
      expect(v.noteText).not.toMatch(/https?:|www\./);
      for (const line of v.text.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
  });

  test('a reload drops the params from the URL but the note still applies in that tab', async ({ page }) => {
    await page.goto(CTX);
    await expect.poll(() => new URL(page.url()).search).toBe('?x=1');
    await page.reload();
    expect(new URL(page.url()).search).toBe('?x=1');
    expect((await saveContact(page)).noteText).toContain('Met at Madison AI Week');
  });

  test('a new tab gets no note context', async ({ page, context }) => {
    await page.goto(CTX);
    await expect.poll(() => new URL(page.url()).search).toBe('?x=1');
    const other = await context.newPage();
    await other.goto('/');
    expect((await saveContact(other)).noteText).toBe(`Saved ${SAVED}`);
    await other.close();
  });

  test('without params the card still gets the save date, and nothing else', async ({ page }) => {
    await page.goto('/');
    const v = await saveContact(page);
    expect(v.noteText).toBe(`Saved ${SAVED}`);
    expect(await page.evaluate(() => sessionStorage.getItem('meet-context'))).toBeNull();
  });

  test('works on other pages too, including a standalone /work page', async ({ page }) => {
    await page.goto('/work/cylerity?met=Dinner');
    await expect.poll(() => new URL(page.url()).search).toBe('');
    await page.keyboard.press('Escape'); // the standalone page opens its pop-up; close it to reach the footer
    await expect(page.locator('dialog#popup')).toBeHidden();
    expect((await saveContact(page, 'footer')).noteText).toBe(`Met at Dinner · ${SAVED}`);
  });

  test('unknown, repeated and surplus topics are dropped', async ({ page }) => {
    await page.goto('/?about=writing,writing,nope,advisory,ready-rebound-loop,constructor');
    expect((await saveContact(page)).noteText).toBe(`Saved ${SAVED} · Talked about: Writing, Gupta Advisory`);
  });

  test('hostile values: <script>, links, newlines and vCard injection are neutralized', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
    const evil = encodeURIComponent('<script>alert(1)</script>');
    const inject = encodeURIComponent('x\r\nEND:VCARD\r\nBEGIN:VCARD\r\nTEL:666 https://evil.example');
    await page.goto(`/?met=${evil}&note=${inject}`);
    const v = await saveContact(page);
    expect(dialogs).toEqual([]);
    const lines = unfold(v.text).split('\r\n');
    expect(lines.filter((l) => l === 'END:VCARD')).toHaveLength(1);
    expect(lines.filter((l) => l === 'BEGIN:VCARD')).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith('TEL'))).toHaveLength(1);
    expect(v.noteText).not.toMatch(/[<>]|evil/);
    expect(v.noteText).not.toContain('\n');
  });

  test('over-long and unicode values are capped in the saved note', async ({ page }) => {
    await page.goto(`/?met=${encodeURIComponent('😀'.repeat(100))}&note=${encodeURIComponent('é'.repeat(200))}`);
    const v = await saveContact(page);
    expect(v.noteText).toContain('Met at ' + '😀'.repeat(60) + ' · ');
    expect(v.noteText).not.toContain('😀'.repeat(61));
    expect(v.noteText).toContain('Talked about: ' + 'é'.repeat(80));
    expect(v.noteText).not.toContain('é'.repeat(81));
  });

  test('params that clean to nothing leave no context but are still stripped', async ({ page }) => {
    await page.goto('/?met=https%3A%2F%2Fevil.example&about=nope');
    await expect.poll(() => new URL(page.url()).search).toBe('');
    expect((await saveContact(page)).noteText).toBe(`Saved ${SAVED}`);
  });

  test('when sessionStorage is blocked the card is plain and Save contact still works', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new Error('blocked'); };
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
    });
    await page.goto(CTX);
    await expect.poll(() => new URL(page.url()).search).toBe('?x=1');
    const v = await saveContact(page);
    expect(v.noteText).toBe(`Saved ${SAVED}`);
    expect(v.fields.get('EMAIL')).toBe('aaryush@outlook.com');
  });

  test('the served HTML still never holds the email or phone, with or without params', async ({ request }) => {
    for (const path of ['/', '/qr', '/?met=x&about=writing']) {
      const html = await (await request.get(path)).text();
      for (const s of ['aaryush@outlook.com', 'aaryush@', '@outlook', '9493312850', '949 331 2850', '+1 949', 'mailto:', 'tel:', 'BEGIN:VCARD']) {
        expect(html, `${path} leaks ${s}`).not.toContain(s);
      }
    }
  });

  test('the shipped scripts never hold the joined address or number either', async ({ page }) => {
    const pending: Promise<string>[] = [];
    page.on('response', (r) => { if (/javascript/.test(r.headers()['content-type'] ?? '')) pending.push(r.text().catch(() => '')); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.goto('/qr');
    await page.waitForLoadState('networkidle');
    const bodies = await Promise.all(pending);
    expect(bodies.length).toBeGreaterThan(0);
    // specific forms only: the joined address, the host half, the number as written or digits-only, and the two link schemes
    for (const b of bodies) for (const s of ['aaryush@outlook.com', 'outlook.com', '+1 949', '949 331', '9493312850', '+19493312850', 'mailto:', 'tel:']) expect(b, s).not.toContain(s);
  });
});

test.describe('E6 hardening', () => {
  test('/qr never writes storage, even when visited with met, about and note', async ({ page }) => {
    await page.goto('/qr?met=x&note=y&about=writing');
    await expect(page.locator('[data-qr-box] svg')).toBeVisible();
    await where(page).fill('Madison');
    await page.waitForTimeout(250);
    const stored = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie }));
    expect(stored).toEqual({ local: 0, session: 0, cookie: '' });
    // and the visit left no context for a later Save contact in this tab
    await page.goto('/');
    expect((await saveContact(page)).noteText).toBe(`Saved ${SAVED}`);
  });

  test('a huge met value cannot stall the page', async ({ page }) => {
    // (two values of 3k characters each (past the 1000-character read cap): the preview server rejects request lines over ~16KB; the unit test covers 200k)
    for (const shape of ['a', 'a.', 'x@', 'a-']) {
      const big = encodeURIComponent(shape.repeat(Math.floor(3000 / shape.length)));
      const t0 = Date.now();
      await page.goto(`/?met=${big}&note=${big}`);
      await expect.poll(() => new URL(page.url()).search).toBe('');
      expect(Date.now() - t0, shape).toBeLessThan(4000);
      const v = await saveContact(page);
      expect(v.noteText.length, shape).toBeLessThan(400);
      for (const line of v.text.split('\r\n')) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
  });

  test('modified clicks on Save contact are left to the browser; a plain click is handled', async ({ page }) => {
    await page.goto('/');
    const notPrevented = await page.locator('[data-contact="hero"] [data-vcard]').evaluate((a) => {
      const send = (init: MouseEventInit) => a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
      // dispatchEvent returns false when something called preventDefault
      return { ctrl: send({ ctrlKey: true }), meta: send({ metaKey: true }), shift: send({ shiftKey: true }), alt: send({ altKey: true }), plain: send({}) };
    });
    expect(notPrevented).toEqual({ ctrl: true, meta: true, shift: true, alt: true, plain: false });
  });
});
