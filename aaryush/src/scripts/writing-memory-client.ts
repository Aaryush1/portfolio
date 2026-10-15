/**
 * The room remembers you: one script for the three places that show it.
 *  - /writing: pieces you have opened are left pulled out of place, with a mark where you got to (flag, thumbprint or pulled card); a quiet "forget" clears it.
 *  - an essay page: records the furthest section (papers: essay:section; letters: scroll fraction) and offers "Pick up".
 *  - the home teaser: \"Keep reading\" on each started piece it lists, and a named \"Pick up\" link for a started piece it does not list.
 * Storage is read and written only through ../lib/writing-memory, which never throws.
 */
import { forget, inRange, noteOpened, noteSection, offPagePickup, pickup, placeLabel, readMemory, type PieceRef } from '../lib/writing-memory';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ---------- the desk ----------
// "Where you left off": one mark per kind, at the part the visitor reached. All are decoration (aria-hidden).
//  - paper: an amber sticky flag poking out of the right edge (a child of the section's sheet, so it fans down with it)
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
  const sheets = Array.from(p.querySelectorAll<HTMLElement>('.skin > .sheet:not(.cover)'));
  // the flag is a child of the sheet it marks (section n is the sheet that fans out n steps), so it travels with it when the paper opens
  const sheet = sheets[sheets.length - Math.min(sec + 1, sheets.length)];
  if (shape === 'paper' && sheet) {
    const f = document.createElement('span');
    f.className = 'flag';
    f.setAttribute('aria-hidden', 'true');
    f.style.setProperty('--fy', String((sec + 0.5) / total));
    sheet.appendChild(f);
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
    const isNote = article.dataset.kind === 'note';
    const m = !isLetter && !isNote ? heads()[offer.sec]?.textContent?.trim().match(/^([IVX]+)\./) : null;
    // papers say "section II", notes say "card 2" (approved copy), letters name no place
    const where = isLetter ? '' : isNote ? ` — card ${offer.sec + 1}` : ` — section ${m ? m[1] : ROMAN[offer.sec + 1] || offer.sec + 1}`;
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
// Every started piece the teaser lists gets "Keep reading · <place> →" on its date line. The one named bottom link,
// "Pick up <Title> →", is only for the most recently read started piece that the teaser does not list.
const rows = Array.from(document.querySelectorAll<HTMLElement>('#writing .post[data-slug]'));
if (rows.length) {
  for (const row of rows) {
    const s = row.dataset.slug ?? '';
    const p = pickup(s, Number(row.dataset.total) || 0);
    if (!p) continue;
    const when = row.querySelector('.when');
    if (!when) continue;
    const place = placeLabel(row.dataset.kind ?? '', p.sec);
    const a = document.createElement('a');
    a.className = 'keep';
    a.href = `/writing/${s}#pickup`;
    a.setAttribute('aria-label', `Keep reading ${row.dataset.title ?? ''}, ${place}`);
    a.innerHTML = '<span class="k">Keep reading</span><span class="k-place"><span class="sep"> · </span>' + place + '</span><span class="k-arr" aria-hidden="true"> →</span>';
    when.appendChild(a);
    row.classList.add('seen');
  }
  const link = document.querySelector<HTMLAnchorElement>('[data-pickup-home]');
  let all: PieceRef[] = [];
  try { all = JSON.parse(document.getElementById('writing-index')?.textContent ?? '[]'); } catch { /* no index: no off-page link */ }
  const off = link ? offPagePickup(all, rows.map((r) => r.dataset.slug ?? '')) : null;
  if (link && off) {
    link.href = `/writing/${off.piece.slug}#pickup`;
    link.replaceChildren('Pick up ');
    const em = document.createElement('em');
    em.textContent = off.piece.title;
    link.append(em, ' →');
  }
}

export {};
