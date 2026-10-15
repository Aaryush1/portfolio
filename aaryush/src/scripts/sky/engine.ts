// The hero's live star chart (E17). Loaded after first paint, in idle time, by scripts/hero-sky.ts.
//
// Star, constellation-line and Milky Way data are baked into src/data/sky/sky-data.json (scripts/bake-sky.mjs) from
// d3-celestial 0.7.35 by Olaf Frohn, BSD 3-Clause, https://github.com/ofrohn/d3-celestial. The stars derive from the
// ESA Hipparcos catalogue. The app makes no network call for any of it. See docs/redesign/decisions.md for the credit.
//
// Everything is precomputed once (star vectors, colours, line points, the Milky Way grid). Each frame only rotates the
// vectors by the local sidereal time and projects them: one rAF loop, one canvas, capped at 30 fps.
import raw from '../../data/sky/sky-data.json';
import { PHONE_QUERY, type Daypart } from '../../lib/daypart';
import { computeSky, D2R, enu, eqVec, hms, MARKS, R2D, SGR_A, showerFactor, starColour, type Enu, type Sky } from '../../lib/sky/astro';
import { instantForPart, visitorPlace, type Place } from '../../lib/sky/place';
import {
  clampRate, DEFAULT_RATE, decodeGrid, horizonAlpha, lookFor, makeView, meteorInterval, parseStoredRate, project, quietFactor, readoutText,
  sampleGrid, smooth, stepRate, trailArc, trailSamples, TRAIL_STARS, type Look, type Pt, type Quiet, type View,
} from '../../lib/sky/view';
import { realPart, resolvePart } from '../sky-part';

interface SkyData {
  stars: { ra: number[]; dec: number[]; mag: number[]; bv: number[] };
  names: Record<string, string>;
  lines: number[][];
  cons: [string, number, number][];
  mw: { w: number; h: number; grid: string };
}
const data = raw as unknown as SkyData;

type Scratch = Enu & Pt;
const RATE_KEY = 'sky:rate';
const FRAME_MS = 1000 / 30;
const RECHECK_MS = 10 * 60 * 1000;
// Drawing labels are Spectral SC small caps (the --label face), written in sentence case, never uppercased.
const FONT = '11px "Spectral SC", "Spectral SC Fallback", Georgia, serif';
const FONT_CONS = '10.5px "Spectral SC", "Spectral SC Fallback", Georgia, serif';

// ---------- the baked data, turned into vectors once ----------
const N = data.stars.mag.length;
const S = {
  n: N,
  vx: new Float32Array(N), vy: new Float32Array(N), vz: new Float32Array(N),
  mag: new Float32Array(N), ph: new Float32Array(N), col: new Array<string>(N), rgb: new Uint8Array(N * 3),
};
for (let i = 0; i < N; i++) {
  const v = eqVec(data.stars.ra[i] / 100, data.stars.dec[i] / 100);
  S.vx[i] = v[0]; S.vy[i] = v[1]; S.vz[i] = v[2];
  const m = data.stars.mag[i] / 10;
  S.mag[i] = m;
  S.ph[i] = (((i * 2654435761) >>> 0) / 4294967296) * 6.283;
  const c = starColour(data.stars.bv[i] / 100, m);
  S.rgb[i * 3] = c[0]; S.rgb[i * 3 + 1] = c[1]; S.rgb[i * 3 + 2] = c[2];
  S.col[i] = `rgb(${c[0]},${c[1]},${c[2]})`;
}
const NAMED: [number, string][] = Object.entries(data.names).map(([i, n]) => [Number(i), n]);

// constellation lines: one point pool, polylines as index ranges
let LP = 0;
for (const l of data.lines) LP += l.length / 2;
const L = { n: LP, vx: new Float32Array(LP), vy: new Float32Array(LP), vz: new Float32Array(LP), polys: [] as [number, number][] };
{
  let k = 0;
  for (const l of data.lines) {
    const start = k;
    for (let j = 0; j < l.length; j += 2) {
      const v = eqVec(l[j] / 10, l[j + 1] / 10);
      L.vx[k] = v[0]; L.vy[k] = v[1]; L.vz[k] = v[2];
      k++;
    }
    L.polys.push([start, k]);
  }
}
const CONS = data.cons.map(([name, ra, dec]) => ({ name, v: eqVec(ra / 10, dec / 10) }));
const MW = { w: data.mw.w, h: data.mw.h, grid: decodeGrid(data.mw.grid) };

// A soft round sprite for halos, built once.
const halo = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return c;
})();

const rgba = (c: ArrayLike<number>, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

interface Meteor { x: number; y: number; dx: number; dy: number; t0: number; dur: number; len: number; a: number }

export interface SkyHandle {
  toggleLabels(): void;
  stepRate(dir: number): void;
}

export function mountSky(hero: HTMLElement, cv: HTMLCanvasElement): SkyHandle | null {
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const c = ctx;
  const root = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = matchMedia(PHONE_QUERY);
  const readout = hero.querySelector<HTMLElement>('.sky-readout');
  const place: Place = visitorPlace();
  const reduced = () => reduceMQ.matches;
  const locked = () => root.classList.contains('locked');

  // ---------- state ----------
  let W = 1, H = 1, dpr = 1, phone = false;
  let view: View = makeView(1, 1, false, place.lat, { x0: 0, y0: 0, x1: 0, y1: 0, feather: 1 });
  let part: Daypart = resolvePart();
  let look: Look = lookFor(part);
  let raf = 0, last = 0, lastDraw = 0, lastReadout = 0;
  let visible = true, ready = false;
  let rate: number = DEFAULT_RATE.desktop;
  let baseMs = Date.now(), elapsed = 0; // simulated instant = baseMs + elapsed (ms of simulated time since the base)
  let realElapsed = 0; // real ms the sky has run, for the readout's T+
  let sunSky: Sky = computeSky(baseMs, place.lat, place.lon);
  let sunAt = 0;
  let labels = false, labelA = 0;

  try {
    const stored = parseStoredRate(sessionStorage.getItem(RATE_KEY));
    if (stored) rate = stored;
    else rate = phoneMQ.matches ? DEFAULT_RATE.phone : DEFAULT_RATE.desktop;
  } catch {
    rate = phoneMQ.matches ? DEFAULT_RATE.phone : DEFAULT_RATE.desktop;
  }

  // ---------- sizes, the Milky Way sampling grid ----------
  let cs = 8;
  let mwCv: HTMLCanvasElement | null = null, mwCtx: CanvasRenderingContext2D | null = null, mwImg: ImageData | null = null;
  let cellE = new Float32Array(0), cellN = new Float32Array(0), cellU = new Float32Array(0);
  let mwLst = -999, mwKey = '';
  let bg: CanvasGradient | null = null, bgKey = '';

  function measureQuiet(heroRect: DOMRect): Quiet {
    const parts = ['.name', '.rot', '.lede'].map((s) => hero.querySelector<HTMLElement>(s)).filter((e): e is HTMLElement => !!e);
    if (!parts.length) return phone ? { x0: 10, y0: 100, x1: 402, y1: 300, feather: 70 } : { x0: 48, y0: 200, x1: 700, y1: 475, feather: 110 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of parts) {
      const r = e.getBoundingClientRect();
      x0 = Math.min(x0, r.left - heroRect.left); y0 = Math.min(y0, r.top - heroRect.top);
      x1 = Math.max(x1, r.right - heroRect.left); y1 = Math.max(y1, r.bottom - heroRect.top);
    }
    const px = phone ? 10 : 24, py = phone ? 14 : 22;
    return { x0: x0 - px, y0: y0 - py, x1: x1 + px, y1: y1 + py, feather: phone ? 70 : 110 };
  }

  function build() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    phone = phoneMQ.matches;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    view = makeView(W, H, phone, place.lat, measureQuiet(r));
    cs = phone ? 7 : 8;
    const mw = Math.ceil(W / cs), mh = Math.ceil(H / cs);
    mwCv = document.createElement('canvas');
    mwCv.width = mw; mwCv.height = mh;
    mwCtx = mwCv.getContext('2d');
    mwImg = mwCtx ? mwCtx.createImageData(mw, mh) : null;
    // The directions each Milky Way cell looks at depend only on the view, so they are worked out once here.
    cellE = new Float32Array(mw * mh); cellN = new Float32Array(mw * mh); cellU = new Float32Array(mw * mh);
    for (let j = 0; j < mh; j++) {
      for (let i = 0; i < mw; i++) {
        const k = j * mw + i;
        const a = view.sg * (view.cx - (i + 0.5) * cs) / view.Rh, b = view.sg * (view.cy - (j + 0.5) * cs) / view.Rh;
        const r2 = a * a + b * b, u = (1 - r2) / (1 + r2);
        cellU[k] = u; cellE[k] = a * (1 + u); cellN[k] = b * (1 + u);
      }
    }
    mwLst = -999;
    bgKey = '';
  }

  // ---------- the clock ----------
  /** Puts the sky on the right period. A change of period re-bases the simulated clock; nothing else does, so the sky never jumps. */
  function syncPart(force = false): boolean {
    const next = resolvePart();
    if (!force && next === part) return false;
    part = next;
    look = lookFor(part);
    const realNow = Date.now();
    baseMs = instantForPart(realNow, place.tz, part, realPart());
    elapsed = 0;
    sunAt = 0;
    mwLst = -999;
    cv.dataset.daypart = part;
    return true;
  }

  function currentSky(): Sky {
    return computeSky(reduced() ? baseMs : baseMs + elapsed, place.lat, place.lon);
  }

  // ---------- Milky Way: cached, refreshed when the sidereal time has moved a little ----------
  function updateMW(sky: Sky) {
    if (!mwImg || !mwCtx || !mwCv) return;
    if (Math.abs(sky.lst - mwLst) < 0.25 && mwKey === part) return;
    mwLst = sky.lst; mwKey = part;
    const d = mwImg.data, total = cellU.length, { cL, sL, cp, sp } = sky;
    const cl = [104, 138, 222], wm = [226, 172, 120]; // cool blue, with warm dust toward the galactic centre
    const gx = SGR_A.vx, gy = SGR_A.vy, gz = SGR_A.vz;
    const k0 = Math.pow(1, 1.35) * 255 * 0.5 * look.mw;
    for (let k = 0; k < total; k++) {
      const u = cellU[k], o = k * 4;
      if (u < -0.45) { d[o + 3] = 0; continue; }
      const e = cellE[k], n = cellN[k];
      const south = -n, xp = u * cp + south * sp, zp = u * sp - south * cp, yp = -e;
      const vx = xp * cL + yp * sL, vy = xp * sL - yp * cL;
      let ra = Math.atan2(vy, vx) * R2D;
      if (ra < 0) ra += 360;
      const dec = Math.asin(Math.max(-1, Math.min(1, zp))) * R2D;
      const den = sampleGrid(MW.grid, MW.w, MW.h, ra, dec);
      if (den < 0.004) { d[o + 3] = 0; continue; }
      const ang = Math.acos(Math.max(-1, Math.min(1, vx * gx + vy * gy + zp * gz)));
      const warm = Math.exp(-(ang * ang) / 0.36);
      d[o] = cl[0] + (wm[0] - cl[0]) * warm; d[o + 1] = cl[1] + (wm[1] - cl[1]) * warm; d[o + 2] = cl[2] + (wm[2] - cl[2]) * warm;
      d[o + 3] = Math.min(255, Math.pow(den, 1.35) * k0 * horizonAlpha(u));
    }
    mwCtx.putImageData(mwImg, 0, 0);
  }

  // ---------- meteors ----------
  const meteors: Meteor[] = [];
  let nextMeteor = 0, rushUntil = 0;
  function spawnMeteor(now: number) {
    const ang = (0.35 + Math.random() * 0.5) * Math.PI;
    const dirx = Math.cos(ang * 0.62 + 0.2) * (Math.random() < 0.78 ? 1 : -1);
    const diry = Math.abs(Math.sin(ang * 0.62 + 0.2)) * 0.8 + 0.2;
    const l = Math.hypot(dirx, diry);
    meteors.push({ x: Math.random() * W, y: Math.random() * H * 0.75, dx: dirx / l, dy: diry / l, t0: now, dur: 1000 + Math.random() * 900, len: (phone ? 50 : 70) + Math.random() * 80, a: 0.28 + Math.random() * 0.3 });
  }
  function drawMeteors(now: number, shower: number) {
    const rush = rushUntil > now ? Math.min(1, (rushUntil - now) / 1800) : 0; // eases off over the last 1.8s
    const interval = meteorInterval(phone, shower, rush);
    if (!nextMeteor) nextMeteor = now + 1500 + Math.random() * 3500;
    if (now >= nextMeteor) {
      if (meteors.length < 4) spawnMeteor(now);
      nextMeteor = now + interval * (0.5 + Math.random());
    }
    c.lineCap = 'round';
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i], t = (now - m.t0) / m.dur;
      if (t >= 1) { meteors.splice(i, 1); continue; }
      const e = t * t * (3 - 2 * t), hx = m.x + m.dx * m.len * 1.6 * e, hy = m.y + m.dy * m.len * 1.6 * e;
      const tail = m.len * Math.min(1, t * 3) * (1 - t * 0.5), tx = hx - m.dx * tail, ty = hy - m.dy * tail;
      const al = m.a * Math.sin(Math.PI * t) ** 1.2;
      const g = c.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(230,234,245,0)');
      g.addColorStop(1, `rgba(236,240,250,${al})`);
      c.strokeStyle = g; c.lineWidth = 1;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
    }
  }

  // ---------- drawing ----------
  const o: Scratch = { e: 0, n: 0, u: 0, x: 0, y: 0 };
  const q: Scratch = { e: 0, n: 0, u: 0, x: 0, y: 0 };
  const o2: Scratch = { e: 0, n: 0, u: 0, x: 0, y: 0 };
  let lx = new Float32Array(L.n), ly = new Float32Array(L.n), lu = new Float32Array(L.n), lv = new Uint8Array(L.n);
  const segs: Float32Array[] = [0, 1, 2, 3].map(() => new Float32Array(L.n * 4));
  let tc = new Float64Array(0), ts = new Float64Array(0), tx = new Float32Array(0), ty = new Float32Array(0);
  const pk = { cL: 0, sL: 0, cp: 0, sp: 0 };

  function label(text: string, x: number, y: number, a: number) {
    a *= smooth(0.5, 0.9, quietFactor(view.quiet, x, y));
    if (a < 0.01) return;
    c.fillStyle = `rgba(180,186,198,${0.55 * a * labelA})`;
    c.fillText(text, x + 9, y - 9);
  }

  function draw(now: number, sky: Sky, still: boolean, shower: number) {
    const V = view;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background gradient
    const key = part + W + 'x' + H;
    if (!bg || bgKey !== key) {
      bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, rgba(look.top, 1));
      bg.addColorStop(1, rgba(look.bot, 1));
      bgKey = key;
    }
    c.globalAlpha = 1;
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // Milky Way
    if (look.mw > 0.02 && mwCv) {
      updateMW(sky);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(mwCv, 0, 0, W, H);
    }

    const tw = still ? 0 : now / 1000;
    const map = (vx: number, vy: number, vz: number): boolean => { enu(sky, vx, vy, vz, o); return project(V, o.e, o.n, o.u, o); };

    // Sun glow at its real position, behind everything else
    {
      const sun = sunSky.sun;
      enu(sunSky, sun.vx, sun.vy, sun.vz, o);
      if (look.glow > 0 && o.u > -0.08 && project(V, o.e, o.n, o.u, o)) {
        const a = 0.42 * smooth(-0.08, 0.15, o.u) * look.glow * (0.55 + 0.45 * quietFactor(V.quiet, o.x, o.y));
        const r = phone ? 170 : 280;
        const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
        g.addColorStop(0, `rgba(255,240,215,${a})`);
        g.addColorStop(0.12, `rgba(255,236,205,${a * 0.55})`);
        g.addColorStop(1, 'rgba(255,236,205,0)');
        c.fillStyle = g;
        c.fillRect(o.x - r, o.y - r, 2 * r, 2 * r);
        c.beginPath();
        c.arc(o.x, o.y, phone ? 4 : 5.5, 0, 7);
        c.fillStyle = `rgba(255,246,228,${0.8 * smooth(-0.08, 0.1, o.u)})`;
        c.fill();
      }
    }

    // constellation lines
    for (let i = 0; i < L.n; i++) {
      const ok = map(L.vx[i], L.vy[i], L.vz[i]);
      lv[i] = ok ? 1 : 0; lx[i] = o.x; ly[i] = o.y; lu[i] = o.u;
    }
    const cnt = [0, 0, 0, 0];
    for (const [s, e] of L.polys) {
      for (let k = s + 1; k < e; k++) {
        const a = k - 1, b = k;
        if (!lv[a] || !lv[b] || Math.abs(lx[a] - lx[b]) > W * 0.45) continue;
        const qf = quietFactor(V.quiet, (lx[a] + lx[b]) / 2, (ly[a] + ly[b]) / 2);
        const bk = qf > 0.85 ? 0 : qf > 0.62 ? 1 : qf > 0.45 ? 2 : 3;
        const sg = segs[bk], p = cnt[bk]; cnt[bk] += 4;
        sg[p] = lx[a]; sg[p + 1] = ly[a]; sg[p + 2] = lx[b]; sg[p + 3] = ly[b];
      }
    }
    c.lineWidth = 1;
    for (let bk = 0; bk < 4; bk++) {
      if (!cnt[bk]) continue;
      c.strokeStyle = `rgba(150,160,184,${0.15 * look.line * (phone ? 0.8 : 1) * [1, 0.75, 0.55, 0.36][bk]})`;
      c.beginPath();
      const sg = segs[bk];
      for (let i = 0; i < cnt[bk]; i += 4) { c.moveTo(sg[i], sg[i + 1]); c.lineTo(sg[i + 2], sg[i + 3]); }
      c.stroke();
    }

    // stars
    const mm = Math.min(look.mag, phone ? 4.5 : 6.2);
    let last = 0;
    while (last < S.n && S.mag[last] <= mm) last++;
    for (let i = 0; i < last; i++) {
      const m = S.mag[i];
      if (!map(S.vx[i], S.vy[i], S.vz[i])) continue;
      let a = look.star * 1.3 * horizonAlpha(o.u) * Math.max(0.22, Math.min(1, 0.3 + (6.2 - m) * 0.13)) * smooth(0, 1.2, mm - m);
      if (m < 4.2 && !still) {
        a *= 1 + (m < 3.2 ? 0.17 : 0.12) * Math.sin(tw * (1.7 + (i % 7) * 0.45) + S.ph[i]) * (1 + 2.2 * Math.pow(Math.max(0, 1 - Math.max(o.u, 0) * 2.2), 2));
      }
      a *= quietFactor(V.quiet, o.x, o.y);
      if (a < 0.02) continue;
      const r = (0.45 + (6.3 - m) * 0.3) * (phone ? 0.9 : 1);
      if (m < 2.2) { c.globalAlpha = Math.min(0.5, a * 0.45); const hr = r * 5; c.drawImage(halo, o.x - hr, o.y - hr, 2 * hr, 2 * hr); }
      c.globalAlpha = Math.min(1, a);
      c.fillStyle = S.col[i];
      c.beginPath(); c.arc(o.x, o.y, r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    // trails: true arcs, sampled along each star's own past path and projected through the same map
    if (!still) {
      const arc = trailArc(rate), NS = trailSamples(arc), nT = phone ? TRAIL_STARS.phone : TRAIL_STARS.desktop, NC = 20;
      if (tc.length !== NS + 1) { tc = new Float64Array(NS + 1); ts = new Float64Array(NS + 1); tx = new Float32Array(NS + 1); ty = new Float32Array(NS + 1); }
      for (let j = 0; j <= NS; j++) { const l = (sky.lst - arc * (1 - j / NS)) * D2R; tc[j] = Math.cos(l); ts[j] = Math.sin(l); }
      pk.cp = sky.cp; pk.sp = sky.sp;
      c.lineCap = 'butt'; c.lineJoin = 'round';
      const trail = (vx: number, vy: number, vz: number, col: ArrayLike<number>, ba: number) => {
        enu(sky, vx, vy, vz, o);
        if (!project(V, o.e, o.n, o.u, o)) return;
        const hz = horizonAlpha(o.u) * quietFactor(V.quiet, o.x, o.y);
        if (hz < 0.03) return;
        for (let j = 0; j <= NS; j++) {
          pk.cL = tc[j]; pk.sL = ts[j];
          enu(pk, vx, vy, vz, q);
          if (!project(V, q.e, q.n, q.u, q)) return;
          tx[j] = q.x; ty[j] = q.y;
        }
        if (Math.hypot(tx[NS] - tx[0], ty[NS] - ty[0]) > 420) return;
        c.lineWidth = ba > 0.5 ? 1.4 : 1.1;
        const per = NS / NC;
        for (let k = 0; k < NC; k++) {
          const j0 = Math.floor(k * per), j1 = Math.min(NS, Math.floor((k + 1) * per) + 1);
          c.strokeStyle = rgba(col, ba * hz * Math.pow((k + 1) / NC, 1.6));
          c.beginPath(); c.moveTo(tx[j0], ty[j0]);
          for (let j = j0 + 1; j <= j1; j++) c.lineTo(tx[j], ty[j]);
          c.stroke();
        }
      };
      const nTrail = Math.min(nT, last);
      const rgb = [0, 0, 0];
      for (let i = 0; i < nTrail; i++) {
        rgb[0] = S.rgb[i * 3]; rgb[1] = S.rgb[i * 3 + 1]; rgb[2] = S.rgb[i * 3 + 2];
        trail(S.vx[i], S.vy[i], S.vz[i], rgb, (0.8 - (0.45 * i) / nT) * Math.max(0.7, look.star));
      }
      for (const p of sky.planets) trail(p.vx, p.vy, p.vz, p.col, 0.65);
      trail(sky.moon.vx, sky.moon.vy, sky.moon.vz, sky.moon.col, 0.25);
    }

    // faint marks: Cygnus X-1, the Crab and Vela pulsars
    c.font = FONT;
    (c as unknown as { letterSpacing: string }).letterSpacing = '1px';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    for (const e of MARKS) {
      if (!map(e.vx, e.vy, e.vz)) continue;
      const a = 0.42 * horizonAlpha(o.u) * Math.max(0.55, look.star);
      c.strokeStyle = rgba(e.col, a); c.lineWidth = 1; c.beginPath();
      if (e.kind === 'bh') { c.arc(o.x, o.y, 4.5, 0, 7); c.moveTo(o.x - 8, o.y); c.lineTo(o.x - 6, o.y); c.moveTo(o.x + 6, o.y); c.lineTo(o.x + 8, o.y); }
      else { c.moveTo(o.x, o.y - 4); c.lineTo(o.x + 3, o.y); c.lineTo(o.x, o.y + 4); c.lineTo(o.x - 3, o.y); c.closePath(); c.moveTo(o.x, o.y - 9); c.lineTo(o.x, o.y - 6); c.moveTo(o.x, o.y + 6); c.lineTo(o.x, o.y + 9); }
      c.stroke();
      if (labelA > 0.02) label(e.name, o.x, o.y, a);
    }

    // the galactic centre: the single amber accent; a faint tick on the rim while it is below the horizon
    if (map(SGR_A.vx, SGR_A.vy, SGR_A.vz)) {
      const a = horizonAlpha(o.u), br = still ? 0.7 : 0.7 + 0.18 * Math.sin(tw * 0.7);
      c.fillStyle = `rgba(242,181,68,${0.95 * a})`;
      c.beginPath(); c.arc(o.x, o.y, 2.3, 0, 7); c.fill();
      c.strokeStyle = `rgba(242,181,68,${0.5 * a * br})`; c.lineWidth = 1;
      c.beginPath(); c.arc(o.x, o.y, 8.5, 0, 7); c.stroke();
      c.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(o.x + dx * 12, o.y + dy * 12); c.lineTo(o.x + dx * 17, o.y + dy * 17); }
      c.strokeStyle = `rgba(242,181,68,${0.32 * a})`; c.stroke();
      if (labelA > 0.02) label('Sgr A*', o.x + 8, o.y, 0.9 * a);
    } else {
      enu(sky, SGR_A.vx, SGR_A.vy, SGR_A.vz, o);
      const nn = Math.hypot(o.e, o.n) || 1;
      o2.e = o.e / nn; o2.n = o.n / nn; o2.u = 0;
      if (project(V, o2.e, o2.n, 0, o2) && o2.x > 8 && o2.x < W - 8 && o2.y > -4 && o2.y < H + 30) {
        c.strokeStyle = 'rgba(242,181,68,.55)'; c.lineWidth = 1.4; c.beginPath();
        if (o2.y >= H - 4) { c.moveTo(o2.x, H - 3); c.lineTo(o2.x, H - 15); }
        else { const dx = o2.x - V.cx, dy = o2.y - V.cy, l = Math.hypot(dx, dy) || 1; c.moveTo(o2.x, o2.y); c.lineTo(o2.x - (dx / l) * 11, o2.y - (dy / l) * 11); }
        c.stroke();
      }
    }

    // planets
    const dayish = part === 'afternoon' || part === 'morning';
    for (const p of sky.planets) {
      if (!map(p.vx, p.vy, p.vz)) continue;
      const a = horizonAlpha(o.u) * (dayish ? 0.8 : 1) * (0.45 + 0.55 * quietFactor(V.quiet, o.x, o.y));
      const r = Math.max(1.5, Math.min(4.2, 2.1 - p.mag * 0.55)) * (phone ? 0.9 : 1);
      c.globalAlpha = 0.4 * a; const hr = r * 6; c.drawImage(halo, o.x - hr, o.y - hr, 2 * hr, 2 * hr);
      c.globalAlpha = Math.min(1, a); c.fillStyle = rgba(p.col, 1);
      c.beginPath(); c.arc(o.x, o.y, r, 0, 7); c.fill();
      c.globalAlpha = 1;
      if (labelA > 0.02) label(p.name, o.x + r, o.y, 0.8 * a);
    }

    // the Moon, in its real phase and orientation
    {
      const mo = sky.moon;
      if (map(mo.vx, mo.vy, mo.vz) && o.u > -0.05) {
        const ha = horizonAlpha(o.u), mx = o.x, my = o.y;
        const sv = sky.sun.v, dd = sv[0] * mo.vx + sv[1] * mo.vy + sv[2] * mo.vz;
        const tvx = sv[0] - dd * mo.vx, tvy = sv[1] - dd * mo.vy, tvz = sv[2] - dd * mo.vz, tl = Math.hypot(tvx, tvy, tvz) || 1;
        const wx = mo.vx + (tvx / tl) * 0.01, wy = mo.vy + (tvy / tl) * 0.01, wz = mo.vz + (tvz / tl) * 0.01;
        enu(sky, wx, wy, wz, o2);
        project(V, o2.e, o2.n, o2.u, o2);
        const ang = Math.atan2(o2.y - my, o2.x - mx), R = phone ? 7.5 : 9, k = mo.k, cc = 1 - 2 * k;
        c.save();
        c.translate(mx, my); c.rotate(ang);
        const day = dayish ? 0.85 : 1;
        const hr = R * 5;
        c.globalAlpha = 0.28 * Math.min(1, ha) * Math.max(0.25, k) * day;
        c.drawImage(halo, -hr, -hr, 2 * hr, 2 * hr);
        c.globalAlpha = Math.min(1, ha) * day;
        c.fillStyle = 'rgba(120,126,140,.16)';
        c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
        c.fillStyle = 'rgb(236,232,218)';
        c.beginPath(); c.moveTo(0, -R); c.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
        c.ellipse(0, 0, Math.max(0.01, Math.abs(cc) * R), R, 0, Math.PI / 2, cc > 0 ? -Math.PI / 2 : Math.PI * 1.5, cc > 0);
        c.closePath(); c.fill();
        c.restore();
        c.globalAlpha = 1;
        if (labelA > 0.02) label('Moon', mx + R + 3, my, 0.8 * ha);
      }
    }

    // labels view
    if (labelA > 0.02) {
      for (const [i, name] of NAMED) {
        if (i >= last || !map(S.vx[i], S.vy[i], S.vz[i]) || o.u < 0.02) continue;
        label(name, o.x, o.y, 0.75 * horizonAlpha(o.u));
      }
      c.save();
      c.font = FONT_CONS;
      (c as unknown as { letterSpacing: string }).letterSpacing = '1.5px';
      c.textAlign = 'center';
      for (const k of CONS) {
        if (!map(k.v[0], k.v[1], k.v[2]) || o.u < 0.08 || o.x < 30 || o.x > W - 30 || o.y < 30 || o.y > H - 30) continue;
        c.fillStyle = `rgba(150,158,176,${0.34 * labelA * horizonAlpha(o.u) * smooth(0.5, 0.9, quietFactor(V.quiet, o.x, o.y))})`;
        c.fillText(k.name, o.x, o.y);
      }
      c.restore();
      const sun = sunSky.sun;
      enu(sunSky, sun.vx, sun.vy, sun.vz, o);
      if (project(V, o.e, o.n, o.u, o) && o.u > -0.05) label('Sun', o.x, o.y, 0.8);
    }

    if (!still) drawMeteors(now, shower);

    // calm ground for the text: the scrim the hero has always had
    if (phone) {
      const g = c.createRadialGradient(W * 0.5, H * 0.34, 0, W * 0.5, H * 0.34, W * 0.95);
      g.addColorStop(0, 'rgba(10,11,14,.66)'); g.addColorStop(0.62, 'rgba(10,11,14,.42)'); g.addColorStop(1, 'rgba(10,11,14,0)');
      c.save(); c.scale(1, 0.9); c.fillStyle = g; c.fillRect(0, 0, W, H / 0.9); c.restore();
    } else {
      const g = c.createLinearGradient(0, 0, W * 0.62, 0);
      g.addColorStop(0, 'rgba(10,11,14,.78)'); g.addColorStop(0.55, 'rgba(10,11,14,.5)'); g.addColorStop(1, 'rgba(10,11,14,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  }

  // ---------- the readout under L ----------
  function updateReadout(sky: Sky) {
    if (!readout) return;
    const d = new Date();
    const t = readoutText({ lat: place.lat, lon: place.lon, hour: d.getHours(), minute: d.getMinutes(), elapsedMs: realElapsed, lstText: hms(sky.lst), moonPct: sky.moon.k * 100, rate });
    if (readout.textContent !== t) readout.textContent = t;
  }

  function frame(now: number, force = false) {
    const still = reduced();
    if (sunAt === 0 || now - sunAt > 5000) {
      sunSky = computeSky(instantForPart(Date.now(), place.tz, part, realPart()), place.lat, place.lon);
      sunAt = now || 1;
    }
    const sky = currentSky();
    const dm = new Date();
    draw(now, sky, still, showerFactor(dm.getMonth() + 1, dm.getDate()));
    if (force || now - lastReadout > 800 || still) { lastReadout = now; updateReadout(sky); }
    if (!cv.classList.contains('on')) cv.classList.add('on');
  }

  // ---------- the loop ----------
  function stepLabelFade(): boolean {
    const target = labels ? 1 : 0;
    labelA = reduced() ? target : labelA + (target - labelA) * 0.08;
    if (Math.abs(target - labelA) < 0.01) labelA = target;
    return labelA !== target;
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < FRAME_MS - 3) return; // 30 fps cap
    const dt = last ? Math.min(100, now - last) : 0;
    last = now; lastDraw = now;
    elapsed += dt * rate;
    realElapsed += dt;
    stepLabelFade();
    frame(now);
  }

  function start() {
    if (!ready || raf || reduced() || !visible || document.hidden || locked()) return;
    last = 0; lastDraw = 0;
    raf = requestAnimationFrame(loop);
    cv.dataset.running = 'true';
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    cv.dataset.running = 'false';
  }

  // One-off redraw while paused or reduced (a still frame, or the label fade in reduced motion).
  let fadeRaf = 0;
  function redraw() {
    if (!ready) return;
    if (raf) return; // the loop will draw it
    if (fadeRaf) return;
    const step = (now: number) => {
      fadeRaf = 0;
      const more = stepLabelFade();
      frame(now, true);
      if (more) fadeRaf = requestAnimationFrame(step);
    };
    fadeRaf = requestAnimationFrame(step);
  }

  function refresh() {
    ready = true;
    syncPart(true);
    build();
    cv.dataset.rate = String(rate);
    // The first frame gets its own task, so setup and the first draw never add up to one long task.
    requestAnimationFrame(() => {
      if (reduced()) { stop(); frame(performance.now(), true); } else { frame(performance.now(), true); start(); }
    });
  }

  // ---------- hooks ----------
  const handle: SkyHandle = {
    toggleLabels() {
      labels = !labels;
      if (labels) void document.fonts?.load(FONT).then(() => { if (labels) redraw(); }).catch(() => {});
      hero.classList.toggle('sky-labels', labels);
      cv.dataset.labels = String(labels);
      if (readout) readout.dataset.on = String(labels);
      redraw();
    },
    stepRate(dir: number) {
      const next = clampRate(stepRate(rate, dir));
      if (next === rate) return;
      rate = next;
      cv.dataset.rate = String(rate);
      try { sessionStorage.setItem(RATE_KEY, String(rate)); } catch { /* storage blocked: the rate still applies on this page */ }
      mwLst = -999;
      redraw();
    },
  };

  cv.dataset.rate = String(rate);
  cv.dataset.labels = 'false';
  cv.dataset.running = 'false';

  // ---------- lifecycle (unchanged from the topography this replaces) ----------
  refresh();

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (Math.round(r.width) !== W || Math.abs(Math.round(r.height) - H) > 80) { stop(); refresh(); }
    }, 160);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible) { start(); } else stop();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  const repart = () => { if (syncPart()) redraw(); };
  document.addEventListener('daypart:change', repart);
  // Re-check the hour every 10 minutes, only while the hero is on screen.
  setInterval(() => { if (visible && !document.hidden) repart(); }, RECHECK_MS);
  new MutationObserver(repart).observe(root, { attributes: true, attributeFilter: ['data-daypart'] });
  reduceMQ.addEventListener('change', () => { stop(); refresh(); });
  phoneMQ.addEventListener('change', () => { stop(); refresh(); });
  // Pause while a pop-up is open (html.locked): saves CPU and keeps the frame count low behind the dialog.
  new MutationObserver(() => { if (locked()) stop(); else start(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
  // Meteors rush on hover (desktop) and on a tap (phones).
  hero.addEventListener('mouseenter', () => { rushUntil = performance.now() + 4500; });
  hero.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') rushUntil = performance.now() + 2800; });

  return handle;
}

