// "Lens" figure for the How AI fits section: four concentric rings, one per level.
// Activating a level zooms the view until that ring fills the figure (in toward L4, out
// toward L1), sends a ripple between the previous and new level, and opens the iris on the
// rings inside it. The server-rendered SVG is already the finished full picture; this script
// only animates it. Ported from the 9b exploration (zoom 1, hex .22, ripple .85, iris .38, spin .5).

import { reducedMotion } from './motion-pref';

type RGB = number[];
// Fallbacks for --text-2, --text-3 and --accent; the live tokens win when they parse.
const FALLBACK_TEXT2: RGB = [160, 164, 174];
const FALLBACK_TEXT3: RGB = [139, 144, 156];
const FALLBACK_ACCENT: RGB = [242, 181, 68];

function token(name: string, fallback: RGB): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : fallback;
}

// Tuning for the chosen variant.
const ZOOM = 1, HEX_ALPHA = 0.22, RIPPLE_ALPHA = 0.85, IRIS_OPEN = 0.38, SPIN = 0.5;
const STILL_T = 16;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Ripple = { from: number; to: number; t0: number; dur: number };

export type Lens = {
  /** Highlight `level` (1-4, or null) and zoom toward `zoomTo` (0-3 ring index; 0 is the full picture). */
  set(level: number | null, zoomTo: number): void;
  /** Called with the level (1-4) under the pointer, or null when it leaves the rings. Mouse and pen only. */
  onRingHover(cb: (level: number | null) => void): void;
};

export type LensOptions = {
  /** Phone window mode: under reduced motion the zoom jumps to its target instead of staying on the full picture. */
  jump?: () => boolean;
};

export function createLens(fig: HTMLElement, opts: LensOptions = {}): Lens | null {
  const svg = fig.querySelector('svg');
  if (!svg) return null;
  const q = <T extends Element>(sel: string) => [...svg.querySelectorAll<T>(sel)];
  const rings = q<SVGCircleElement>('[data-ring]');
  const labels = q<SVGTextElement>('[data-lab]');
  const hits = q<SVGCircleElement>('[data-hit]');
  const ripples = q<SVGGElement>('[data-rip]').map((g) => ({
    glow: g.querySelector<SVGCircleElement>('.rg')!, core: g.querySelector<SVGCircleElement>('.rc')!,
  }));
  const glowEl = svg.querySelector<SVGCircleElement>('[data-glow]');
  const hexEl = svg.querySelector<SVGPolygonElement>('[data-hex]');
  if (rings.length !== 4 || labels.length !== 4 || !glowEl || !hexEl) return null;
  const glow = glowEl, hex = hexEl;

  const GREY = token('--text-2', FALLBACK_TEXT2);
  const GREY3 = token('--text-3', FALLBACK_TEXT3);
  const AMBER = token('--accent', FALLBACK_ACCENT);
  const reduced = () => reducedMotion.matches;
  const root = document.documentElement;

  const cx = Number(fig.dataset.c), cy = cx;
  const m = Number(fig.dataset.m);
  const R = rings.map((r) => Number(r.dataset.r));
  const dir = [1, -1, 1, -1], spd = [3, 5, 8, 13];

  const a = [0, 0, 0, 0];        // per-ring highlight amount (grey to amber)
  const tg = [0, 0, 0, 0];       // its target
  const op = [0, 0, 0, 0];       // per-ring iris opening (rings inside the active one open)
  let any = 0;                   // strongest highlight, drives dimming
  let active: number | null = null; // ring index
  let last: number | null = null;   // last ring that was active, for ripple direction
  let u = 0, zt = 0;             // current / target zoom position (0-3)
  let glowR = R[3] * 1.15;
  let ripList: Ripple[] = [];
  let clock = STILL_T;

  const blend = (k: number, grey = GREY) => grey.map((g, i) => Math.round(lerp(g, AMBER[i], k))).join(',');
  function paint(node: Element, i: number, base: number, hi: number, prop: 'stroke' | 'fill', mul = 1, grey = GREY) {
    const k = a[i], dim = 1 - 0.5 * any * (1 - k);
    const al = lerp(base * dim, hi, k) * mul;
    (node as SVGElement).style[prop] = `rgba(${blend(k, grey)},${al.toFixed(3)})`; // inline style so it beats the stylesheet
  }

  // still = reduced motion: full picture, ring highlight only, nothing moves.
  function draw(t: number, dt: number, still: boolean) {
    const ka = still ? 1 : 1 - Math.exp(-dt * 9);
    any = 0;
    for (let i = 0; i < 4; i++) { a[i] += (tg[i] - a[i]) * ka; any = Math.max(any, a[i]); }

    if (still) u = opts.jump?.() ? zt : 0;
    else {
      u += (zt - u) * (1 - Math.exp(-dt * 3));
      if (Math.abs(zt - u) < 0.004) u = zt;
    }
    const uc = clamp(u, 0, 3), k = Math.min(2, Math.floor(uc)), f = uc - k;
    let S = Math.exp(ZOOM * lerp(Math.log(R[0] / R[k]), Math.log(R[0] / R[k + 1]), f));
    if (!still) S *= 1 + 0.012 * Math.sin(t * 0.5);

    const ki = still ? 1 : 1 - Math.exp(-dt * 4.2);
    for (let j = 0; j < 4; j++) op[j] += (((!still && active !== null && j < active) ? 1 : 0) - op[j]) * ki;
    const gt = (active !== null ? R[active] : R[3] * 1.15) * S;
    glowR += (gt - glowR) * ki;
    glow.setAttribute('r', glowR.toFixed(1));
    glow.setAttribute('fill-opacity', (0.07 * any).toFixed(3));

    const pts: string[] = [];
    const rot = (glowR * 0.9 * SPIN + (still ? 0 : t * 3)) * Math.PI / 180;
    for (let v = 0; v < 6; v++) {
      const an = rot + (v * Math.PI) / 3;
      pts.push(`${(cx + glowR * Math.cos(an)).toFixed(1)},${(cy + glowR * Math.sin(an)).toFixed(1)}`);
    }
    hex.setAttribute('points', pts.join(' '));
    hex.style.stroke = `rgba(${blend(any)},${lerp(0.12, HEX_ALPHA, any).toFixed(3)})`;

    ripList = ripList.filter((r) => t - r.t0 < r.dur);
    ripples.forEach((o, n) => {
      const r = ripList[ripList.length - 1 - n];
      if (!r) { o.glow.setAttribute('opacity', '0'); o.core.setAttribute('opacity', '0'); return; }
      const p = (t - r.t0) / r.dur, e = 1 - Math.pow(1 - p, 2);
      const rad = lerp(r.from, r.to, e) * S;
      const al = RIPPLE_ALPHA * Math.sin(Math.PI * Math.min(1, p * 0.9 + 0.05));
      o.glow.setAttribute('r', rad.toFixed(1)); o.core.setAttribute('r', rad.toFixed(1));
      o.glow.style.stroke = `rgba(${AMBER.join(',')},${(al * 0.16).toFixed(3)})`; o.glow.setAttribute('opacity', '1');
      o.core.style.stroke = `rgba(${AMBER.join(',')},${al.toFixed(3)})`; o.core.setAttribute('opacity', '1');
    });

    for (let j = 0; j < 4; j++) {
      const o = op[j], rs = R[j] * S;
      const fade = 1 - clamp((rs / m - 1.15) / 0.45, 0, 1); // outer rings leave the frame when zoomed in
      let d = lerp(0.86, IRIS_OPEN, o);
      d = lerp(d, 0.999, a[j]);
      const rr = rs * (1 + 0.08 * o);
      const ring = rings[j];
      ring.setAttribute('r', rr.toFixed(2));
      ring.setAttribute('stroke-dasharray', `${d.toFixed(3)} ${(1 - d).toFixed(3)}`);
      const deg = (still ? 0 : t * spd[j] * dir[j] * SPIN * 0.7) + o * 34 * dir[j] + j * 17;
      ring.setAttribute('transform', `rotate(${deg.toFixed(2)} ${cx} ${cy})`);
      ring.setAttribute('stroke-width', (1.3 + a[j]).toFixed(2));
      paint(ring, j, 0.38, 1, 'stroke', (1 - 0.6 * o) * fade);
      labels[j].setAttribute('y', (cy - rr - 4).toFixed(1));
      paint(labels[j], j, 1, 1, 'fill', (1 - 0.7 * o) * fade, GREY3); // rest = --text-3, as the stylesheet draws it
      hits[j]?.setAttribute('r', rs.toFixed(1));
    }
    fig.dataset.zoom = String(Math.round(u * 100) / 100);
  }

  // ---------- lifecycle: same pause rules as the hero canvas ----------
  let raf = 0, prev = 0, visible = true;
  const locked = () => root.classList.contains('locked');
  const canRun = () => !reduced() && visible && !document.hidden && !locked();

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    clock += dt;
    draw(clock, dt, false);
  }
  function start() {
    if (raf || !canRun()) return;
    prev = 0;
    raf = requestAnimationFrame(loop);
    fig.dataset.running = 'true';
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    fig.dataset.running = 'false';
    snapRest();
  }
  function sync() { if (canRun()) start(); else stop(); }
  function still() { draw(STILL_T, 0, true); }
  // Back at rest while paused: draw the full picture once so re-entry doesn't animate the zoom back out.
  function snapRest() {
    if (active !== null || zt !== 0 || reduced()) return;
    u = 0; a.fill(0); op.fill(0); glowR = R[3] * 1.15; ripList = [];
    draw(clock, 0, false); // dt 0: nothing eases, rotation keeps its clock phase
  }

  fig.dataset.running = 'false';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; sync(); }).observe(fig);
  }
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  reducedMotion.onChange((r) => {
    stop(); u = zt = 0; ripList = [];
    if (r) still(); else sync();
  });

  if (reduced()) still(); else sync();

  return {
    set(level, zoomTo) {
      const i = level === null ? null : level - 1;
      const changed = i !== active;
      active = i;
      tg.fill(0);
      if (i !== null) tg[i] = 1;
      fig.dataset.level = i === null ? '' : String(level);
      zt = clamp(zoomTo, 0, 3);
      if (reduced()) { if (!opts.jump?.()) zt = 0; still(); return; }
      if (i !== null && changed) {
        const from = last !== null ? last : (i === 0 ? 3 : 0);
        if (from !== i) ripList.push({ from: R[from], to: R[i], t0: clock, dur: 0.9 + Math.abs(from - i) * 0.25 });
      }
      if (i !== null) last = i;
      if (!raf) snapRest();
    },
    onRingHover(cb) {
      let cur: number | null = null;
      hits.forEach((hit, n) => {
        hit.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') { cur = n; cb(n + 1); } });
        hit.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && cur === n) { cur = null; cb(null); } });
      });
    },
  };
}
