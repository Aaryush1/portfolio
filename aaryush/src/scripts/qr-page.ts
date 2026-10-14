// /qr: build the QR for "https://aaryush.com/?met=…&about=…&note=…" as the fields change.
// This is the only module that imports the QR library, so it never ships in the home bundle.
// No storage of any kind: every visit starts blank.
import qrcode from 'qrcode-generator';
import { LIMITS, buildMeetUrl, clean, summary, type Known, type Meet } from '../lib/meet';

const root = document.querySelector<HTMLElement>('[data-qr]');
const box = root?.querySelector<HTMLElement>('[data-qr-box]');
const cap = root?.querySelector<HTMLElement>('[data-qr-cap]');
const where = root?.querySelector<HTMLInputElement>('[data-where]');
const note = root?.querySelector<HTMLInputElement>('[data-note]');
const presets = [...(root?.querySelectorAll<HTMLButtonElement>('[data-preset]') ?? [])];
const topicBtns = [...(root?.querySelectorAll<HTMLButtonElement>('[data-topic]') ?? [])];

if (root && box && cap && where && note) {
  const known: Known = Object.fromEntries(topicBtns.map((b) => [b.dataset.topic!, b.textContent ?? '']));
  const base = root.dataset.base ?? 'https://aaryush.com';
  const NS = 'http://www.w3.org/2000/svg';
  const QUIET = 4; // modules of white around the code, so phones lock on reliably
  let about: string[] = [];
  let timer = 0;

  /** The code as inline SVG: black runs on a white square with a quiet zone. Error correction level M. */
  function draw(text: string) {
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const size = n + QUIET * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        let len = 1;
        while (c + len < n && qr.isDark(r, c + len)) len++;
        d += `M${c + QUIET} ${r + QUIET}h${len}v1h-${len}z`;
        c += len - 1;
      }
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code for aaryush.com');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.dataset.url = text;
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', String(size));
    bg.setAttribute('height', String(size));
    bg.setAttribute('fill', '#fff');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#000');
    svg.append(bg, path);
    box!.replaceChildren(svg);
  }

  const state = (): Meet => ({ met: clean(where!.value, LIMITS.where), about, note: clean(note!.value, LIMITS.note) });

  function sync() {
    const m = state();
    cap!.textContent = summary(m, known) || cap!.dataset.idle || '';
    presets.forEach((b) => b.setAttribute('aria-pressed', String(m.met !== '' && m.met === b.dataset.preset)));
    topicBtns.forEach((b) => {
      const on = about.includes(b.dataset.topic!);
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !on && about.length >= LIMITS.topics;
    });
  }

  function render() {
    window.clearTimeout(timer);
    try { draw(buildMeetUrl(base, state(), known)); } catch { /* keep the last code on screen */ }
  }

  const changed = () => {
    sync();
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 120);
  };

  where.addEventListener('input', changed);
  note.addEventListener('input', changed);
  for (const input of [where, note]) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  }
  presets.forEach((b) => b.addEventListener('click', () => {
    where.value = where.value.trim() === b.dataset.preset ? '' : b.dataset.preset!;
    changed();
  }));
  topicBtns.forEach((b) => b.addEventListener('click', () => {
    const slug = b.dataset.topic!;
    about = about.includes(slug) ? about.filter((s) => s !== slug) : about.length < LIMITS.topics ? [...about, slug] : about;
    changed();
  }));
  root.querySelector('[data-clear]')?.addEventListener('click', () => {
    where.value = '';
    note.value = '';
    about = [];
    sync();
    render();
  });

  sync();
  render();
}
