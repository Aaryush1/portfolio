import { createLens } from './lens';
import { reducedMotion } from './motion-pref';

const STEP = 100; // ms between meter segments
const fig = document.getElementById('lvfig');
// Phones show the figure as a zoom window (see Levels.astro); under reduced motion the window jumps to each new framing.
const windowMode = matchMedia('(max-width: 959px) and ((pointer: coarse) or (max-width: 700px))');
const lens = fig ? createLens(fig, { jump: () => windowMode.matches }) : null;
const section = document.getElementById('levels');

type Row = { el: HTMLElement; depth: number; fill(): void; drain(): void };

// The active level comes from four row sources (pointer hover, keyboard focus, a touch tap
// that stays pinned, and on phones the scroll position) and one figure source (hovering a ring lights its row but does not zoom).
let hover: number | null = null;
let focus: number | null = null;
let pinned: number | null = null;
let scrolled: number | null = null; // phones: the level nearest the middle of the screen
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
  const rowLevel = hover ?? focus ?? pinned ?? scrolled;
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

// Pinching the figure steps levels: fingers apart zooms in (toward L4), together zooms out (toward L1). A step pins
// the level just like a tap, until the visitor scrolls on. Only the figure takes the gesture; the rest of the page
// keeps its normal pinch-zoom.
const PINCH_STEP = 40; // px of finger-distance change per level
function stepLevel(dir: 1 | -1) {
  const cur = hover ?? focus ?? pinned ?? scrolled ?? 1;
  const next = Math.min(4, Math.max(1, cur + dir));
  hover = null;
  if (focus !== null) (document.activeElement as HTMLElement | null)?.blur();
  focus = null;
  if (next === cur && pinned === cur) return;
  pinned = next;
  update();
}
if (fig) {
  let d0 = 0;
  const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  fig.addEventListener('touchstart', (e) => { d0 = e.touches.length === 2 ? dist(e.touches) : 0; }, { passive: true });
  fig.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !d0) return;
    e.preventDefault();
    const d = dist(e.touches);
    while (Math.abs(d - d0) >= PINCH_STEP) {
      const dir = d > d0 ? 1 : -1;
      stepLevel(dir);
      d0 += dir * PINCH_STEP;
    }
  }, { passive: false });
  fig.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
  fig.addEventListener('touchcancel', () => { d0 = 0; }, { passive: true });

  // Trackpad pinch arrives as wheel + ctrlKey. Only claimed while over the figure; ctrl+wheel elsewhere is untouched.
  let acc = 0, lockedUntil = 0, idle = 0;
  fig.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    clearTimeout(idle);
    idle = window.setTimeout(() => { acc = 0; }, 200);
    if (e.timeStamp < lockedUntil) return;
    acc -= e.deltaY; // fingers apart reports a negative deltaY
    if (Math.abs(acc) < PINCH_STEP) return;
    stepLevel(acc > 0 ? 1 : -1);
    acc = 0;
    lockedUntil = e.timeStamp + 350;
  }, { passive: false });
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

// Phones (touch, or a narrow window) have no hover, so the level nearest the middle of the screen becomes the active one as
// the list scrolls past, exactly as a tap would. An IntersectionObserver on a thin band at the viewport centre: nothing
// runs per scroll event, nothing snaps and nothing scrolls the page.
const followScroll = matchMedia('(pointer: coarse), (max-width: 700px)');
const list0 = document.querySelector<HTMLElement>('ol.levels');
if (list0 && rows.length && 'IntersectionObserver' in window) {
  const crossing = new Set<HTMLElement>();
  const byEl = new Map(rows.map((r) => [r.el, r.depth]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) crossing.add(en.target as HTMLElement); else crossing.delete(en.target as HTMLElement); });
    if (!followScroll.matches) return;
    const hit = entries.filter((en) => en.isIntersecting).pop()?.target as HTMLElement | undefined;
    let next: number | null | undefined;
    if (hit) next = byEl.get(hit);
    else if (crossing.size === 0 && list0.getBoundingClientRect().top > innerHeight / 2) next = null; // above the list: the full picture
    if (next === undefined || (next === scrolled && pinned === null)) return;
    scrolled = next;
    pinned = null; // scrolling on releases a tap's pin
    update();
  }, { rootMargin: '-50% 0px -49% 0px' });
  rows.forEach((r) => io.observe(r.el));
}

// Hovering a ring lights its row (no zoom); the ring markup is lens.ts's business.
lens?.onRingHover((level) => { ring = level; update(); });

// Leaving the section always returns to the full picture.
if (section && 'IntersectionObserver' in window) {
  let wasIn = false; // the observer's first callback reports the initial state; only a real exit clears
  new IntersectionObserver((en) => {
    const now = en[en.length - 1].isIntersecting;
    const left = wasIn && !now;
    wasIn = now;
    if (!left) return;
    hover = focus = pinned = scrolled = ring = null;
    update();
  }).observe(section);
}

// Keyboard focus must not end up behind the pinned mini lens (WCAG 2.4.11). Browsers only scroll
// a focused element that is outside the viewport, and one parked under the band counts as inside,
// so nudge it clear. Only acts while the lens is actually pinned (sticky), i.e. below 960px.
const list = document.querySelector<HTMLElement>('ol.levels');
list?.addEventListener('focusin', () => {
  if (!fig || getComputedStyle(fig).position !== 'sticky') return;
  requestAnimationFrame(() => {
    const el = document.activeElement;
    if (!el || !list.contains(el)) return;
    const clear = fig.getBoundingClientRect().bottom + 24; // band + fade + a little air
    const top = el.getBoundingClientRect().top;
    if (top < clear) window.scrollBy({ top: top - clear, behavior: 'instant' as ScrollBehavior });
  });
});
