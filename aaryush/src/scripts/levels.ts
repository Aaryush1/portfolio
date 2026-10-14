import { createLens } from './lens';
import { reducedMotion } from './motion-pref';

const STEP = 100; // ms between meter segments
const fig = document.getElementById('lvfig');
const lens = fig ? createLens(fig) : null;
const section = document.getElementById('levels');

type Row = { el: HTMLElement; depth: number; fill(): void; drain(): void };

// The active level comes from three row sources (pointer hover, keyboard focus, a touch tap
// that stays pinned) and one figure source (hovering a ring lights its row but does not zoom).
let hover: number | null = null;
let focus: number | null = null;
let pinned: number | null = null;
let ring: number | null = null;
let lit: number | null = null;

function buildRow(el: HTMLElement): Row {
  const depth = Number(el.dataset.level);
  const segs = [...el.querySelectorAll<HTMLElement>('.meter i')].slice(0, depth);
  let timers: number[] = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  return {
    el, depth,
    fill() {
      clear();
      segs.forEach((seg, i) => {
        if (reducedMotion.matches) seg.classList.add('fill');
        else timers.push(window.setTimeout(() => seg.classList.add('fill'), i * STEP));
      });
    },
    drain() {
      clear();
      [...segs].reverse().forEach((seg, i) => {
        if (reducedMotion.matches) seg.classList.remove('fill');
        else timers.push(window.setTimeout(() => seg.classList.remove('fill'), i * STEP));
      });
    },
  };
}

const rows = [...document.querySelectorAll<HTMLElement>('li.level[data-level]')].map(buildRow);

function update() {
  const rowLevel = hover ?? focus ?? pinned;
  const next = rowLevel ?? ring;
  if (next !== lit) {
    rows.forEach((r) => {
      const on = r.depth === next;
      if (on !== (r.depth === lit)) (on ? r.fill() : r.drain());
      r.el.classList.toggle('is-lit', on && rowLevel === null);
    });
    lit = next;
  }
  // Zoom follows the row (L1 is the full picture); a ring hover only highlights.
  lens?.set(next, rowLevel === null ? 0 : rowLevel - 1);
}

rows.forEach(({ el, depth }) => {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { hover = depth; update(); } });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && hover === depth) { hover = null; update(); } });
  el.addEventListener('focusin', () => { focus = depth; update(); });
  el.addEventListener('focusout', (e) => {
    if (!el.contains(e.relatedTarget as Node | null) && focus === depth) { focus = null; update(); }
  });
  // Touch has no hover: a tap on a row pins its level, tapping it again lets go.
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch' || (e.target as Element).closest('a')) return;
    pinned = pinned === depth ? null : depth;
    update();
  });
});

// Hovering a ring lights its row (no zoom); the ring markup is lens.ts's business.
lens?.onRingHover((level) => { ring = level; update(); });

// Leaving the section always returns to the full picture.
if (section && 'IntersectionObserver' in window) {
  new IntersectionObserver((en) => {
    if (en[0].isIntersecting) return;
    hover = focus = pinned = ring = null;
    update();
  }).observe(section);
}
