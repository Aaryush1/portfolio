/**
 * The moving pool of warm light. It eases toward a target (a piece, the desk centre, or a point) and the
 * frame loop stops the moment it has settled, so a still room costs nothing. Every aim* call restarts it.
 * State is mirrored as --pool-x/-y/-s/-i on .room (registered non-inheriting, so writing them is cheap).
 */

type MoveCb = (x: number, y: number, i: number, s: number) => void;

const room = document.querySelector<HTMLElement>('.room');
const poolEl = room?.querySelector<HTMLElement>('.light .pool') ?? null;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const REST_SCALE = 1.15;
const K = 0.035;

const cur = { x: 0, y: 0, s: REST_SCALE, i: 0 };
const tgt = { x: 0, y: 0, s: REST_SCALE, i: 0.5 };
const subs = new Set<MoveCb>();
let raf = 0;
let placed = false;
/** Recomputes the target from the layout; set by whichever aim* call was last made. */
let retarget: () => void = () => {};

const rel = (el: Element) => {
  const a = room!.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
};

function write() {
  if (!room || !poolEl) return;
  poolEl.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0) scale(${cur.s.toFixed(3)})`;
  poolEl.style.opacity = cur.i.toFixed(3);
  room.style.setProperty('--pool-x', `${cur.x.toFixed(1)}px`);
  room.style.setProperty('--pool-y', `${cur.y.toFixed(1)}px`);
  room.style.setProperty('--pool-s', cur.s.toFixed(3));
  room.style.setProperty('--pool-i', cur.i.toFixed(3));
  for (const cb of subs) cb(cur.x, cur.y, cur.i, cur.s);
}

const settled = () =>
  Math.abs(tgt.x - cur.x) < 0.4 && Math.abs(tgt.y - cur.y) < 0.4 &&
  Math.abs(tgt.s - cur.s) < 0.004 && Math.abs(tgt.i - cur.i) < 0.004;

function step() {
  raf = 0;
  if (settled()) { Object.assign(cur, tgt); write(); return; }
  cur.x += (tgt.x - cur.x) * K;
  cur.y += (tgt.y - cur.y) * K;
  cur.s += (tgt.s - cur.s) * K;
  cur.i += (tgt.i - cur.i) * K;
  write();
  if (settled()) { Object.assign(cur, tgt); write(); return; }
  raf = requestAnimationFrame(step);
}

function kick() {
  if (reduce.matches) { Object.assign(cur, tgt); write(); return; }
  if (!raf) raf = requestAnimationFrame(step);
}

function setTarget(x: number, y: number, s: number, i: number) {
  tgt.x = x; tgt.y = y; tgt.s = s; tgt.i = i;
  if (!placed) { cur.x = x; cur.y = y; cur.s = s; placed = true; } // first placement is instant; only the intensity fades in
  kick();
}

function setMode(m: 'rest' | 'piece' | 'drawer') {
  if (room) room.dataset.pool = m;
}

export function aimAt(el: Element, scale = 1, intensity = 1): void {
  if (!room) return;
  setMode('piece');
  retarget = () => { const r = rel(el); setTarget(r.x + r.w / 2, r.y + r.h / 2, scale, intensity); };
  retarget();
}

export function aimRest(): void {
  if (!room) return;
  setMode('rest');
  retarget = () => {
    const desk = room.querySelector('.desk');
    if (!desk) return;
    const r = rel(desk);
    setTarget(r.x + r.w / 2, r.y + Math.min(r.h / 2, 450), REST_SCALE, reduce.matches ? 1 : 0.5);
  };
  retarget();
}

export function aimPoint(x: number, y: number, scale = 1, intensity = 1): void {
  if (!room) return;
  setMode('drawer');
  retarget = () => setTarget(x, y, scale, intensity);
  retarget();
}

/** Subscribe to the pool's movement. Called once straight away, then on every step. Returns an unsubscribe. */
export function onMove(cb: MoveCb): () => void {
  subs.add(cb);
  cb(cur.x, cur.y, cur.i, cur.s);
  return () => { subs.delete(cb); };
}

if (room && poolEl) {
  document.addEventListener('piece:lit', (e) => {
    const el = (e as CustomEvent<{ el?: Element }>).detail?.el;
    if (el) aimAt(el, 1, 1);
  });
  document.addEventListener('piece:unlit', () => aimRest());

  aimRest();
  // layout settles after fonts and on resize: keep the current target honest without starting a second loop
  document.fonts?.ready.then(() => retarget());
  new ResizeObserver(() => retarget()).observe(room);
  addEventListener('pageshow', (e) => { if (e.persisted) aimRest(); });
  reduce.addEventListener('change', () => { retarget(); });
}
