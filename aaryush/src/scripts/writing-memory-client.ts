/**
 * The room remembers you: one script for the three places that show it.
 *  - /writing: pieces you have opened are left pulled out of place, with a mark where you got to (flag, thumbprint or pulled card); a quiet "forget" clears it.
 *  - an essay page: records the furthest section (papers: essay:section; letters: scroll fraction) and offers "Pick up".
 *  - the home teaser: the same ribbon and a pick-up link for a piece you are partway through.
 * Storage is read and written only through ../lib/writing-memory, which never throws.
 */
import { forget, inRange, noteOpened, noteSection, pickup, readMemory } from '../lib/writing-memory';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ribbon = () => { const i = document.createElement('i'); i.className = 'ribbon'; i.setAttribute('aria-hidden', 'true'); return i; };

// ---------- the desk ----------
// "Where you left off": one mark per kind, at the part the visitor reached. All are decoration (aria-hidden).
//  - paper: an amber sticky flag poking out of the right edge, at the height of the section reached
//  - letter: a faint amber thumbprint on the fold reached (a child of that fold's panel, so it rides the fold's own transform)
//  - note: the card reached is pulled out of the stack
const SVG = 'http://www.w3.org/2000/svg';
function thumbprint(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'print');
  svg.setAttribute('viewBox', '0 0 46 58');
  svg.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 9; i++) {
    const e = document.createElementNS(SVG, 'ellipse');
    e.setAttribute('cx', '23'); e.setAttribute('cy', '30');
    e.setAttribute('rx', String(4 + i * 2.3)); e.setAttribute('ry', String(6 + i * 2.9));
    e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#F2B544'); e.setAttribute('stroke-width', '1.05');
    e.setAttribute('stroke-dasharray', `${7 + i * 2} ${1.6 + ((i * 7) % 4)}`);
    e.setAttribute('stroke-dashoffset', String(i * 5));
    e.setAttribute('opacity', String(0.9 - i * 0.06));
    svg.appendChild(e);
  }
  return svg;
}
function clearMarks(p: HTMLElement) {
  p.classList.remove('seen');
  p.querySelectorAll('.flag, .print').forEach((n) => n.remove());
  p.querySelectorAll('.pulled').forEach((n) => n.classList.remove('pulled'));
}
function mark(p: HTMLElement, sec: number, total: number) {
  const shape = p.dataset.shape;
  const skin = p.querySelector<HTMLElement>('.skin');
  if (shape === 'paper' && skin) {
    const f = document.createElement('span');
    f.className = 'flag';
    f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--fy', String((sec + 0.5) / total));
    skin.appendChild(f);
  } else if (shape === 'letter') {
    p.querySelector(`.fold-${sec + 1}`)?.appendChild(thumbprint());
  } else if (shape === 'note') {
    p.querySelector(`.card.n${sec + 1}`)?.classList.add('pulled');
    p.querySelector(`.breakdown li:nth-child(${sec + 1})`)?.classList.add('pulled');
  }
}

const pieces = Array.from(document.querySelectorAll<HTMLElement>('[data-piece]'));
if (pieces.length) {
  const button = document.querySelector<HTMLButtonElement>('[data-forget]');
  const paint = () => {
    const mem = readMemory();
    for (const p of pieces) {
      clearMarks(p);
      const e = mem.pieces[p.dataset.slug ?? ''];
      const total = Number(p.dataset.total) || 0;
      if (!e || !inRange(e.sec, total)) continue;
      p.classList.add('seen');
      if (total > 0) mark(p, Math.min(e.sec, total - 1), total);
    }
    if (button) button.hidden = !pieces.some((p) => p.classList.contains('seen'));
  };
  paint();
  button?.addEventListener('click', () => {
    forget();
    paint();
    const k = document.querySelector<HTMLElement>('.room-kicker');
    if (k) { k.tabIndex = -1; k.focus({ preventScroll: true }); }
  });
  addEventListener('pageshow', (e) => { if (e.persisted) paint(); });
}

// ---------- an essay page ----------
const article = document.querySelector<HTMLElement>('.essay-body');
const slug = article?.dataset.slug;
if (article && slug) {
  const isLetter = article.dataset.kind === 'letter';
  // Read the stored section before this visit's own scrolling can move it.
  let total = 0;
  let goTo: ((sec: number) => void) | null = null;
  const behavior: ScrollBehavior = reduce.matches ? 'auto' : 'smooth';
  const heads = () => Array.from(article.querySelectorAll<HTMLElement>('h2:not(.references h2)'));

  if (isLetter) {
    total = Number(article.dataset.sections) || 0;
    goTo = (sec) => {
      const rect = article.getBoundingClientRect();
      const span = Math.max(0, rect.height - innerHeight);
      scrollTo({ top: scrollY + rect.top + span * ((sec + 0.02) / total), behavior });
      article.tabIndex = -1;
      article.focus({ preventScroll: true });
    };
  } else {
    // The shared chunk can run before reading-progress has published its state, so fall back to counting the same headings it counts.
    try { total = Number(JSON.parse(document.documentElement.dataset.essaySection ?? 'null')?.total) || 0; } catch { /* not set yet */ }
    if (!total) total = heads().length;
    goTo = (sec) => {
      const h = heads()[sec];
      if (!h) return;
      h.tabIndex = -1;
      h.scrollIntoView({ behavior, block: 'start' });
      h.focus({ preventScroll: true });
    };
  }

  const offer = total > 0 ? pickup(slug, total) : null;
  const slot = document.getElementById('pickup');
  if (offer && slot && goTo) {
    const m = !isLetter ? heads()[offer.sec]?.textContent?.trim().match(/^([IVX]+)\./) : null;
    const where = isLetter ? '' : ` — section ${m ? m[1] : ROMAN[offer.sec + 1] || offer.sec + 1}`;
    const a = document.createElement('a');
    a.className = 'pickup';
    a.href = `/writing/${slug}#pickup`;
    a.textContent = `Pick up where you left off${where}`;
    const go = goTo;
    a.addEventListener('click', (e) => { e.preventDefault(); go(offer.sec); });
    slot.appendChild(a);
    // the browser's own fragment scroll lands after the load event, so jump just after it
    if (location.hash === '#pickup') {
      const run = () => requestAnimationFrame(() => go(offer.sec));
      if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
    }
  }

  noteOpened(slug);
  if (isLetter) {
    const progress = () => {
      const rect = article.getBoundingClientRect();
      const span = rect.height - innerHeight;
      return span <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / span));
    };
    let queued = false;
    const note = () => { queued = false; if (total > 0) noteSection(slug, Math.min(total - 1, Math.floor(progress() * total)), total); };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(note); } }, { passive: true });
    addEventListener('pagehide', note);
    note();
  } else {
    const apply = (s: { index: number; total: number } | null) => {
      if (s && s.total > 0 && s.index >= 0) noteSection(slug, s.index, s.total);
    };
    try { apply(JSON.parse(document.documentElement.dataset.essaySection ?? 'null')); } catch { /* the event will tell us */ }
    document.addEventListener('essay:section', (e) => apply((e as CustomEvent).detail));
  }
}

// ---------- the home teaser ----------
const rows = Array.from(document.querySelectorAll<HTMLAnchorElement>('#writing a.post[data-slug]'));
if (rows.length) {
  const mem = readMemory();
  let best: { row: HTMLAnchorElement; t: number } | null = null;
  for (const row of rows) {
    const s = row.dataset.slug ?? '';
    if (!pickup(s, Number(row.dataset.total) || 0)) continue;
    const r = ribbon();
    const e = mem.pieces[s];
    const total = Number(row.dataset.total) || 0;
    r.style.setProperty('--rib', String(e && total > 0 ? Math.min(1, (e.sec + 1) / total) : 1));
    row.appendChild(r);
    row.classList.add('seen');
    const t = mem.pieces[s]?.t ?? 0;
    if (!best || t > best.t) best = { row, t };
  }
  const link = document.querySelector<HTMLAnchorElement>('[data-pickup-home]');
  if (best && link) {
    link.href = `/writing/${best.row.dataset.slug}#pickup`;
    link.textContent = 'Pick up where you left off';
    link.setAttribute('aria-label', `Pick up where you left off: ${best.row.dataset.title ?? ''}`);
    link.hidden = false;
    // the ribbon (hover devices) shows only while the link is hovered or focused
    const target = best.row;
    const show = () => target.classList.add('show-rib');
    const hide = () => target.classList.remove('show-rib');
    link.addEventListener('pointerenter', show);
    link.addEventListener('pointerleave', hide);
    link.addEventListener('focus', show);
    link.addEventListener('blur', hide);
  }
}

export {};
