// Hero background: contour lines (marching squares) over slowly drifting 3D noise,
// with one amber contour whose level oscillates. Lifecycle (idle start, pause when
// offscreen / hidden / pop-up open, dt cap, DPR cap, reduced-motion still) is unchanged
// from the previous hero drawing; tests/e2e/hero.spec.ts depends on it.
// The look follows the visitor's local hour (src/lib/daypart.ts, spec E5).

import { daypartFor, fieldParams, isDaypart, nextPreview, type Daypart, type FieldParams, type Rgba } from '../lib/daypart';

const hero = document.getElementById('hero');
const cv = document.getElementById('field') as HTMLCanvasElement | null;
const ctx = cv?.getContext('2d') ?? null;

// ---------- deterministic noise ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERM = new Uint8Array(512);
{
  const rand = mulberry32(11);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function gradient(hash: number, x: number, y: number, z: number) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function noise3(x: number, y: number, z: number) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const X = fx & 255, Y = fy & 255, Z = fz & 255;
  x -= fx; y -= fy; z -= fz;
  const u = fade(x), v = fade(y), w = fade(z), P = PERM;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
  const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(
    lerp(lerp(gradient(P[AA], x, y, z), gradient(P[BA], x - 1, y, z), u),
         lerp(gradient(P[AB], x, y - 1, z), gradient(P[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(gradient(P[AA + 1], x, y, z - 1), gradient(P[BA + 1], x - 1, y, z - 1), u),
         lerp(gradient(P[AB + 1], x, y - 1, z - 1), gradient(P[BB + 1], x - 1, y - 1, z - 1), u), v),
    w,
  );
}

// ---------- marching squares ----------
// Cell corners: a = top-left, b = top-right, c = bottom-right, d = bottom-left.
// Cell edges: 0 top, 1 right, 2 bottom, 3 left. Each case lists the edge pairs a segment joins.
const SEGMENTS: (number[] | null)[] = [
  null, [3, 2], [2, 1], [3, 1], [0, 1], [0, 1, 3, 2], [0, 2], [0, 3],
  [0, 3], [0, 2], [0, 3, 1, 2], [0, 1], [3, 1], [2, 1], [3, 2],
];

const rgba = (c: Rgba) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
const RECHECK_MS = 10 * 60 * 1000;

const FRAME_MS = 1000 / 30;
const STILL_T = 18;

if (hero && cv && ctx) {
  const root = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMQ.matches;
  const locked = () => root.classList.contains('locked');

  let W = 0, H = 0, dpr = 1;
  let cell = 13, cols = 0, rows = 0;
  let field = new Float32Array(0);
  let raf = 0, last = 0, clock = STILL_T, lastDraw = 0;
  let visible = true, ready = false;

  // ---------- day period (E5) ----------
  let preview: Daypart | null = null;
  let part: Daypart | null = null;
  let params: FieldParams = fieldParams('afternoon');
  let minorStroke = '', majorStroke = '', amberStroke = '', warmStroke = '';
  let minorLevels: number[] = [], majorLevels: number[] = [];
  let tag: HTMLElement | null = null, tagTimer = 0;

  // Precedence: keyboard preview, then data-daypart on <html> (tests), then ?daypart= (dev builds only), then the clock.
  function resolvePart(): Daypart {
    if (preview) return preview;
    const forced = root.getAttribute('data-daypart');
    if (isDaypart(forced)) return forced;
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search).get('daypart');
      if (isDaypart(q)) return q;
    }
    return daypartFor(new Date().getHours());
  }

  function applyPart() {
    const next = resolvePart();
    if (next === part) return;
    part = next;
    params = fieldParams(next);
    minorStroke = rgba(params.minor); majorStroke = rgba(params.major); amberStroke = rgba(params.amber); warmStroke = params.warmLevel ? rgba(params.warmLevel.color) : '';
    minorLevels = []; majorLevels = [];
    for (let i = 0; i < params.levelCount; i++) (i % 4 === 0 ? majorLevels : minorLevels).push(-0.7 + i * params.levelStep);
    cv!.dataset.daypart = next;
    cv!.dataset.levels = String(params.levelCount);
    cv!.dataset.drift = String(params.drift);
    cv!.dataset.amber = String(params.amber[3]);
    // Redraw straight away when nothing else will (reduced-motion still frame, or paused).
    if (ready && !raf) draw(reduced() ? STILL_T : clock);
  }

  function showTag(name: string) {
    tag?.remove();
    clearTimeout(tagTimer);
    tag = document.createElement('div');
    tag.className = 'dp-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = `Field · ${name}`;
    hero!.appendChild(tag);
    const el = tag;
    tagTimer = window.setTimeout(() => { el.remove(); if (tag === el) tag = null; }, 2200);
  }

  // Task 23's keyboard map calls this on `t`: morning, afternoon, evening, night, then auto.
  (window as unknown as { __heroDaypart?: () => string }).__heroDaypart = () => {
    preview = nextPreview(preview);
    applyPart();
    const name = preview ?? 'auto';
    showTag(name);
    return name;
  };

  cv.dataset.running = 'false';

  function build() {
    const r = hero!.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv!.width = Math.round(W * dpr);
    cv!.height = Math.round(H * dpr);
    cell = W < 700 ? 15 : 13;
    cols = Math.ceil(W / cell) + 1;
    rows = Math.ceil(H / cell) + 1;
    field = new Float32Array(cols * rows);
  }

  function sampleField(t: number) {
    const z = t * 0.03;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * cell, y = j * cell;
        field[j * cols + i] =
          (noise3(x * 0.0026, y * 0.0026, z) * 0.7 +
           noise3(x * 0.0062 + 31, y * 0.0062, z * 1.6) * 0.26 +
           noise3(x * 0.014, y * 0.014 + 9, z * 2.2) * 0.06) * 1.55;
      }
    }
  }

  function edgePoint(edge: number, x: number, y: number, a: number, b: number, c: number, d: number, level: number): [number, number] {
    if (edge === 0) return [x + (cell * (level - a)) / (b - a), y];
    if (edge === 1) return [x + cell, y + (cell * (level - b)) / (c - b)];
    if (edge === 2) return [x + (cell * (level - d)) / (c - d), y + cell];
    return [x, y + (cell * (level - a)) / (d - a)];
  }

  // Adds the contour at `level` to the current path.
  function contour(c: CanvasRenderingContext2D, level: number) {
    for (let j = 0; j < rows - 1; j++) {
      const y = j * cell;
      for (let i = 0; i < cols - 1; i++) {
        const k = j * cols + i;
        const a = field[k], b = field[k + 1], cc = field[k + cols + 1], d = field[k + cols];
        const state = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (cc > level ? 2 : 0) | (d > level ? 1 : 0);
        if (state === 0 || state === 15) continue;
        const x = i * cell;
        const seg = SEGMENTS[state]!;
        for (let q = 0; q < seg.length; q += 2) {
          const from = edgePoint(seg[q], x, y, a, b, cc, d, level);
          const to = edgePoint(seg[q + 1], x, y, a, b, cc, d, level);
          c.moveTo(from[0], from[1]);
          c.lineTo(to[0], to[1]);
        }
      }
    }
  }

  function draw(t: number) {
    const c = ctx!;
    sampleField(t);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.lineJoin = 'round';
    c.lineWidth = 1;
    c.beginPath(); minorLevels.forEach((l) => contour(c, l)); c.strokeStyle = minorStroke; c.stroke();
    c.beginPath(); majorLevels.forEach((l) => contour(c, l)); c.strokeStyle = majorStroke; c.stroke();
    if (params.warmLevel) { c.beginPath(); contour(c, params.warmLevel.level); c.strokeStyle = warmStroke; c.stroke(); }
    c.beginPath(); contour(c, params.amberBase + 0.07 * Math.sin(t * 0.06));
    c.strokeStyle = amberStroke; c.lineWidth = params.amberWidth; c.stroke();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < FRAME_MS - 3) return; // 30fps cap
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; lastDraw = now;
    clock += dt * params.drift;
    draw(clock);
  }

  function start() {
    if (!ready || raf || reduced() || !visible || document.hidden || locked()) return;
    last = 0; lastDraw = 0;
    raf = requestAnimationFrame(loop);
    cv!.dataset.running = 'true';
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    cv!.dataset.running = 'false';
  }
  function refresh() {
    ready = true;
    applyPart();
    build();
    if (reduced()) { stop(); draw(STILL_T); } else { draw(clock); start(); }
  }

  applyPart();

  // Start after first paint so the canvas never competes with LCP.
  if (reduced()) refresh();
  else if ('requestIdleCallback' in window) requestIdleCallback(refresh, { timeout: 500 });
  else setTimeout(refresh, 200);

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (Math.round(r.width) !== W || Math.abs(Math.round(r.height) - H) > 80) { stop(); refresh(); }
    }, 160);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { applyPart(); start(); } else stop(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { applyPart(); start(); } });
  // Re-check the hour every 10 minutes, only while the hero is on screen.
  setInterval(() => { if (visible && !document.hidden) applyPart(); }, RECHECK_MS);
  new MutationObserver(applyPart).observe(root, { attributes: true, attributeFilter: ['data-daypart'] });
  reduceMQ.addEventListener('change', () => { stop(); refresh(); });
  // Pause while a pop-up is open (html.locked): saves CPU and keeps the frame count low behind the dialog.
  new MutationObserver(() => { if (locked()) stop(); else start(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
}
