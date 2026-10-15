import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { deflateSync, crc32 } from 'node:zlib';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { boxPath, pathD, pointAt, polylineLength, type DiagramSpec, type Pt } from './diagram';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFile(require.resolve(`${pkg}/files/${file}`));
type F = { name: string; data: Buffer; weight: 400 | 500; style: 'normal' | 'italic' };
let fonts: Promise<F[]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  font('@fontsource/instrument-sans', 'instrument-sans-latin-500-normal.woff').then((data): F => ({ name: 'Instrument Sans', data, weight: 500, style: 'normal' })),
  font('@fontsource/instrument-sans', 'instrument-sans-latin-400-normal.woff').then((data): F => ({ name: 'Instrument Sans', data, weight: 400, style: 'normal' })),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff').then((data): F => ({ name: 'JetBrains Mono', data, weight: 400, style: 'normal' })),
  font('@fontsource/instrument-serif', 'instrument-serif-latin-400-normal.woff').then((data): F => ({ name: 'Instrument Serif', data, weight: 400, style: 'normal' })),
]));

export type OgCard =
  | { type: 'home'; name: string; line: string; deploy: string }
  /** Systems and companies: big name, small subtext, the system diagram dimmed behind (or topography). */
  | { type: 'place'; kicker: string; title: string; sub?: string; diagram?: DiagramSpec; seed: number }
  /** A company and the set of systems inside it: name big, one small framed figure per system. */
  | { type: 'company'; kicker: string; title: string; seed: number; systems: { title: string; diagram?: DiagramSpec }[] }
  | { type: 'essay'; shape: 'letter' | 'paper' | 'note' | 'sheet'; kicker: string; title: string }
  /** /writing is a static cover: it must not change as pieces are published. */
  | { type: 'writing' };

const W = 1200, H = 630;
const AMBER = '#F2B544';

/* ---------- satori helpers ---------- */
type El = { type: string; props: Record<string, unknown> };
const h = (style: Record<string, unknown>, children?: unknown): El => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const abs = (style: Record<string, unknown>, children?: unknown) => h({ position: 'absolute', ...style }, children);
const b64 = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
const img = (src: string, width: number, height: number, style: Record<string, unknown> = {}): El => ({ type: 'img', props: { src, width, height, style } });

/* ---------- seeded topography ---------- */
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeNoise(seed: number) {
  const r = mulberry32(seed), N = 256, g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = g[((yi & 255) << 8) + (xi & 255)], b = g[((yi & 255) << 8) + ((xi + 1) & 255)], c = g[(((yi + 1) & 255) << 8) + (xi & 255)], d = g[(((yi + 1) & 255) << 8) + ((xi + 1) & 255)];
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number) => { let s = 0, a = 0.55, f = 1; for (let o = 0; o < 4; o++) { s += a * v(x * f, y * f); a *= 0.5; f *= 2.05; } return s; };
}

const topoCache = new Map<string, { thin: string; amber: string }>();
/** Many thin contours plus one amber contour (the longest loop at the median level). Deterministic per seed. */
export function topoPaths(seed: number, cell = 8, scale = 0.0042, levels = 13, amberShift = 0): { thin: string; amber: string } {
  const key = [seed, cell, scale, levels, amberShift].join();
  const hit = topoCache.get(key);
  if (hit) return hit;
  const n = makeNoise(seed), cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1, F = new Float32Array(cols * rows);
  let mn = 9, mx = -9;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const v = n(i * cell * scale + 3, j * cell * scale + 7); F[j * cols + i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const lo = mn + (mx - mn) * 0.08, hi = mx - (mx - mn) * 0.08;
  let thin = '', bestLen = 0, bestD = '';
  const mid = Math.round(levels / 2) + amberShift;
  type E = ['h' | 'v', number, number];
  for (let L = 0; L < levels; L++) {
    const t = lo + ((hi - lo) * L) / (levels - 1);
    const pt = ([type, i, j]: E): Pt => {
      if (type === 'h') { const a = F[j * cols + i], b = F[j * cols + i + 1]; return [(i + (t - a) / (b - a)) * cell, j * cell]; }
      const a = F[j * cols + i], b = F[(j + 1) * cols + i]; return [i * cell, (j + (t - a) / (b - a)) * cell];
    };
    const S: [string, string, E, E][] = [];
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = F[j * cols + i] > t, b = F[j * cols + i + 1] > t, c = F[(j + 1) * cols + i + 1] > t, d = F[(j + 1) * cols + i] > t;
      const c4 = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
      if (c4 === 0 || c4 === 15) continue;
      const top: E = ['h', i, j], right: E = ['v', i + 1, j], bot: E = ['h', i, j + 1], left: E = ['v', i, j];
      let pairs: [E, E][] = [];
      switch (c4) {
        case 1: case 14: pairs = [[left, bot]]; break;
        case 2: case 13: pairs = [[bot, right]]; break;
        case 3: case 12: pairs = [[left, right]]; break;
        case 4: case 11: pairs = [[top, right]]; break;
        case 6: case 9: pairs = [[top, bot]]; break;
        case 7: case 8: pairs = [[left, top]]; break;
        case 5: pairs = [[left, top], [bot, right]]; break;
        case 10: pairs = [[top, right], [left, bot]]; break;
      }
      for (const [e1, e2] of pairs) S.push([e1.join(), e2.join(), e1, e2]);
    }
    const adj = new Map<string, number[]>();
    S.forEach((s, k) => { for (const id of [s[0], s[1]]) { if (!adj.has(id)) adj.set(id, []); adj.get(id)!.push(k); } });
    const used = new Uint8Array(S.length);
    const extend = (startId: string) => {
      const out: E[] = []; let id = startId;
      for (;;) {
        const nx = (adj.get(id) ?? []).find((q) => !used[q]);
        if (nx === undefined) break;
        used[nx] = 1; const ss = S[nx];
        out.push(ss[0] === id ? ss[3] : ss[2]); id = ss[0] === id ? ss[1] : ss[0];
      }
      return out;
    };
    for (let k = 0; k < S.length; k++) {
      if (used[k]) continue;
      used[k] = 1; const s = S[k];
      const fwd = extend(s[1]), bwd = extend(s[0]);
      const pts = [...bwd.reverse().map(pt), pt(s[2]), pt(s[3]), ...fwd.map(pt)];
      if (pts.length < 3) continue;
      let len = 0; for (let q = 1; q < pts.length; q++) len += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]);
      if (len < 30) continue;
      const sm: Pt[] = [pts[0]];
      for (let q = 0; q < pts.length - 1; q++) { const p = pts[q], r = pts[q + 1]; sm.push([p[0] * 0.75 + r[0] * 0.25, p[1] * 0.75 + r[1] * 0.25], [p[0] * 0.25 + r[0] * 0.75, p[1] * 0.25 + r[1] * 0.75]); }
      sm.push(pts[pts.length - 1]);
      const d = 'M' + sm.map((p) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join('L');
      if (L === mid) { if (len > bestLen) { if (bestD) thin += bestD + ' '; bestLen = len; bestD = d; } else thin += d + ' '; }
      else thin += d + ' ';
    }
  }
  const out = { thin, amber: bestD };
  topoCache.set(key, out);
  return out;
}

const topoImg = (seed: number, thinA: number, amberW: number, style: Record<string, unknown> = {}) => {
  const f = topoPaths(seed);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${f.thin}" stroke="rgba(230,231,234,${thinA})" stroke-width="1"/><path d="${f.amber}" stroke="${AMBER}" stroke-width="${amberW}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  return img(b64(svg), W, H, { position: 'absolute', left: 0, top: 0, ...style });
};

/* ---------- grainy radial glow, pre-rendered as a small PNG (avoids gradient banding) ---------- */
function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1); }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
type Stop = [t: number, rgb: [number, number, number], a: number];
const glowCache = new Map<string, string>();
/** Elliptical glow at card coordinates. Rendered at half resolution with +-1 alpha grain so it dithers instead of banding. */
function glow(cx: number, cy: number, rx: number, ry: number, stops: Stop[], seed = 1, grain = 0.5): El {
  const key = JSON.stringify([cx, cy, rx, ry, stops, seed, grain]);
  let uri = glowCache.get(key);
  if (!uri) {
    const w = W / 2, hh = H / 2, px = new Uint8Array(w * hh * 4), rnd = mulberry32(seed);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const t = Math.min(1, Math.hypot((x * 2 - cx) / rx, (y * 2 - cy) / ry));
      let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0, c0, a0] = stops[k], [t1, c1, a1] = stops[k + 1], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      const a = (a0 + (a1 - a0) * u) * 255, i = (y * w + x) * 4;
      px[i] = c0[0] + (c1[0] - c0[0]) * u; px[i + 1] = c0[1] + (c1[1] - c0[1]) * u; px[i + 2] = c0[2] + (c1[2] - c0[2]) * u;
      px[i + 3] = a < 0.5 ? 0 : Math.max(0, Math.min(255, Math.round(a + (rnd() - 0.5) * 2 * grain)));
    }
    uri = `data:image/png;base64,${png(w, hh, px).toString('base64')}`;
    glowCache.set(key, uri);
  }
  return img(uri, W, H, { position: 'absolute', left: 0, top: 0 });
}
const warm = (a: number): Stop[] => [[0, [255, 190, 105], a], [0.45, [242, 170, 70], a * 0.38], [1, [242, 170, 70], 0]];
const scrim = (a: number): Stop[] => [[0, [10, 11, 14], a], [0.55, [10, 11, 14], a * 0.88], [1, [10, 11, 14], 0]];

/* ---------- brand mark: the real ag. glyph paths (same as src/components/Mark.astro), amber full stop ---------- */
const GLYPH = 'M2.67 22.27L2.67 22.27Q1.59 22.27 0.99 21.34Q0.39 20.41 0.39 18.61L0.39 18.61Q0.39 16.90 0.87 15.18Q1.35 13.45 2.19 11.89Q3.03 10.33 4.09 9.13Q5.16 7.93 6.34 7.23Q7.53 6.52 8.70 6.52L8.70 6.52Q9.27 6.52 9.78 6.75Q10.29 6.97 10.62 7.45L10.62 7.45Q10.80 7.72 10.98 7.72L10.98 7.72Q11.16 7.72 11.34 7.45L11.34 7.45Q11.67 6.97 11.88 6.84Q12.09 6.70 12.27 6.70L12.27 6.70Q12.66 6.70 12.57 7.12L12.57 7.12L9.90 18.61Q9.45 20.56 10.50 20.56L10.50 20.56Q11.19 20.56 11.74 19.63Q12.30 18.70 12.87 16.75L12.87 16.75Q12.96 16.42 13.26 16.42L13.26 16.42Q13.47 16.42 13.53 16.60Q13.59 16.78 13.53 17.02L13.53 17.02Q12.96 19.84 12 21.05Q11.04 22.27 9.69 22.27L9.69 22.27Q8.52 22.27 8.03 21.28Q7.53 20.29 7.92 18.58L7.92 18.58L8.31 16.93Q8.37 16.72 8.23 16.69Q8.10 16.66 8.01 16.84L8.01 16.84Q6.36 19.87 5.08 21.07Q3.81 22.27 2.67 22.27ZM3.42 20.74L3.42 20.74Q4.14 20.74 5.01 19.87Q5.88 19 6.73 17.62Q7.59 16.24 8.31 14.65Q9.03 13.06 9.46 11.59Q9.90 10.12 9.90 9.10L9.90 9.10Q9.90 7.27 8.61 7.27L8.61 7.27Q7.83 7.27 6.96 7.97Q6.09 8.68 5.29 9.88Q4.50 11.08 3.85 12.60Q3.21 14.11 2.82 15.75Q2.43 17.38 2.43 18.94L2.43 18.94Q2.43 19.99 2.69 20.36Q2.94 20.74 3.42 20.74Z M15.67 28.48L15.67 28.48Q13.30 28.48 12.07 27.61Q10.84 26.74 10.84 25.54L10.84 25.54Q10.84 24.49 11.66 23.48Q12.49 22.48 14.71 21.19L14.71 21.19Q15.04 21.01 15.08 20.79Q15.13 20.56 14.80 20.35L14.80 20.35Q13.96 19.81 13.79 19.09Q13.63 18.37 14.17 18.07L14.17 18.07L16.45 16.75Q16.75 16.60 16.77 16.38Q16.78 16.15 16.45 15.97L16.45 15.97Q15.64 15.49 15.23 14.61Q14.83 13.72 14.83 12.67L14.83 12.67Q14.83 11.05 15.63 9.66Q16.42 8.26 17.75 7.39Q19.09 6.52 20.74 6.52L20.74 6.52Q21.43 6.52 21.91 6.70L21.91 6.70Q22.27 6.82 22.45 6.46L22.45 6.46Q22.96 5.35 23.75 4.71Q24.55 4.06 25.42 4.06L25.42 4.06Q26.05 4.06 26.39 4.39Q26.74 4.72 26.74 5.29L26.74 5.29Q26.74 5.86 26.41 6.22Q26.08 6.58 25.57 6.58L25.57 6.58Q25.18 6.58 24.98 6.43Q24.79 6.28 24.64 6.13Q24.49 5.98 24.16 5.98L24.16 5.98Q23.50 5.98 23.11 6.73L23.11 6.73Q22.99 7 23.05 7.23Q23.11 7.45 23.29 7.69L23.29 7.69Q24.07 8.71 24.07 10.27L24.07 10.27Q24.07 11.68 23.45 12.96Q22.84 14.23 21.77 15.12Q20.71 16 19.33 16.30L19.33 16.30Q18.79 16.42 18.35 16.59Q17.92 16.75 17.26 17.17L17.26 17.17L16.06 17.89Q15.61 18.16 15.82 18.57Q16.03 18.97 16.99 19.33L16.99 19.33L19.57 20.29Q21.25 20.89 21.89 21.76Q22.54 22.63 22.54 23.80L22.54 23.80Q22.54 25.24 21.59 26.29Q20.65 27.34 19.09 27.91Q17.53 28.48 15.67 28.48ZM16.84 13.21L16.84 13.21Q16.84 14.59 17.24 15.21Q17.65 15.82 18.40 15.82L18.40 15.82Q19.36 15.82 20.18 14.94Q21.01 14.05 21.52 12.66Q22.03 11.26 22.03 9.76L22.03 9.76Q22.03 8.26 21.64 7.71Q21.25 7.15 20.47 7.15L20.47 7.15Q19.54 7.15 18.70 8.04Q17.86 8.92 17.35 10.30Q16.84 11.68 16.84 13.21ZM16 27.73L16 27.73Q17.17 27.73 18.19 27.34Q19.21 26.95 19.85 26.23Q20.50 25.51 20.50 24.52L20.50 24.52Q20.50 23.53 20.00 22.89Q19.51 22.24 18.07 21.70L18.07 21.70L17.50 21.49Q16.96 21.28 16.42 21.34Q15.88 21.40 15.40 21.64L15.40 21.64Q13.78 22.54 13.21 23.32Q12.64 24.10 12.64 25.03L12.64 25.03Q12.64 26.14 13.45 26.93Q14.26 27.73 16 27.73Z';
const markSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="32" viewBox="0 0 34 32" fill="none"><g transform="translate(1.8 0)"><path d="${GLYPH}" fill="${color}"/></g><path d="M1.3 23H32.21" stroke="${color}" stroke-opacity=".5" stroke-width="1"/><circle cx="29.71" cy="19.5" r="2.5" fill="${AMBER}"/></svg>`;
const mark = (w: number, color = '#E6E7EA', style: Record<string, unknown> = {}) => img(b64(markSvg(color)), w, Math.round((w * 32) / 34), style);

const kicker = (text: string, size = 22) =>
  h({ alignItems: 'center', gap: 18, fontFamily: 'JetBrains Mono', fontSize: size, letterSpacing: size * 0.14, color: AMBER, textTransform: 'uppercase' }, [
    h({ width: 30, height: 2, background: AMBER }),
    text,
  ]);
const footer = () => abs({ left: 72, bottom: 54, alignItems: 'center', gap: 22 }, [mark(54), h({ fontFamily: 'JetBrains Mono', fontSize: 20, letterSpacing: 1.6, color: '#8B909C' }, 'aaryush.com')]);

/* ---------- system diagram, labels omitted (satori would not use the loaded fonts inside SVG) ---------- */
function diagramSvg(spec: DiagramSpec, scale: number, frac = 0.3, sw = 1.4): { svg: string; w: number; h: number } {
  const [vw, vh] = spec.vb;
  const arrow = (x: number, y: number, dx: number, dy: number) => { const b = 6, s = 4; return `M${x - dx * b - dy * s} ${y - dy * b + dx * s} L${x} ${y} L${x - dx * b + dy * s} ${y - dy * b - dx * s}`; };
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw * scale}" height="${vh * scale}" viewBox="0 0 ${vw} ${vh}" fill="none" stroke-width="${sw}">`;
  for (const [x, y1, y2] of spec.inputs) o += `<path d="M${x} ${y1} V${y2}" stroke="rgba(255,255,255,.4)"/><path d="${arrow(x, y2, 0, 1)}" stroke="rgba(255,255,255,.6)" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x}" cy="${y1}" r="2.8" fill="${AMBER}"/>`;
  for (const e of spec.edges) {
    const a = e.p[e.p.length - 2], b = e.p[e.p.length - 1];
    const col = e.fb ? 'rgba(242,181,68,.7)' : e.dash ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.4)';
    o += `<path d="${pathD(e.p, false)}" stroke="${col}"${e.dash ? ' stroke-dasharray="3 4"' : ''}/><path d="${arrow(b[0], b[1], Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1]))}" stroke="${e.fb ? 'rgba(242,181,68,.9)' : 'rgba(255,255,255,.6)'}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const n of spec.nodes) {
    const d = boxPath(n), human = 'human' in n && n.human;
    o += `<path d="${d}" fill="#12151B"/><path d="${d}" stroke="${human ? 'rgba(242,181,68,.7)' : 'rgba(255,255,255,.5)'}"/>`;
    if (human && 'x' in n) o += `<rect x="${n.x + n.w - 9}" y="${n.y + 4}" width="5" height="5" fill="${AMBER}" stroke="none"/>`;
  }
  const s = polylineLength(spec.pulse) * frac;
  const tr: Pt[] = []; for (let k = -70; k <= 0; k += 5) tr.push(pointAt(spec.pulse, s + k));
  const [px, py] = pointAt(spec.pulse, s);
  for (let k = 0; k < tr.length - 1; k++) o += `<path d="M${tr[k].join(' ')}L${tr[k + 1].join(' ')}" stroke="${AMBER}" stroke-opacity="${(0.08 + (0.8 * k) / tr.length).toFixed(2)}" stroke-width="2.6" stroke-linecap="round"/>`;
  o += `<circle cx="${px}" cy="${py}" r="11" fill="${AMBER}" fill-opacity=".2" stroke="none"/><circle cx="${px}" cy="${py}" r="4.6" fill="${AMBER}" stroke="none"/></svg>`;
  return { svg: o, w: vw * scale, h: vh * scale };
}

/* ---------- desk objects (flexbox, gradients, shadows) ---------- */
const bars = (w: number, k: number) =>
  h({ flexDirection: 'column', gap: 11 * k }, [0.6, 1, 1, 0.8, 1, 0.45].map((f, i) => h({ width: Math.round(w * f), height: Math.max(2, 5 * k), borderRadius: 3, background: i === 0 ? 'rgba(43,36,25,.5)' : 'rgba(43,36,25,.28)' })));

function letterObj(x: number, y: number, w: number, hh: number, rot: number): El {
  const ph = hh / 3, k = w / 300;
  return abs({ left: x, top: y, width: w, height: hh, transform: `rotate(${rot}deg)`, boxShadow: '0 26px 50px rgba(0,0,0,.65), 0 4px 10px rgba(0,0,0,.5)', flexDirection: 'column', background: '#E6DAC2' }, [
    h({ height: ph, background: 'linear-gradient(180deg,#F0E6D1 0%,#E4D8BF 100%)' }),
    h({ height: ph, background: 'linear-gradient(180deg,#C3B79C 0%,#E1D5BC 28%,#EADFC8 100%)', borderTop: '1px solid rgba(60,45,20,.28)' }),
    h({ height: ph, background: 'linear-gradient(180deg,#CBBFA4 0%,#DCD0B6 35%,#CDBFA3 100%)', borderTop: '1px solid rgba(60,45,20,.3)' }),
    abs({ left: 0, top: 0, width: w, height: hh, padding: `${26 * k}px ${30 * k}px` }, bars(w - 60 * k, k)),
  ]);
}
function paperObj(x: number, y: number, w: number, hh: number, rot: number): El {
  const k = w / 300;
  const sheet = (dx: number, dy: number, r: number, c: string) => abs({ left: x + dx, top: y + dy, width: w, height: hh, transform: `rotate(${rot + r}deg)`, background: c, boxShadow: '0 10px 24px rgba(0,0,0,.5)' });
  return h({ position: 'absolute', left: 0, top: 0, width: W, height: H }, [
    sheet(8, 8, 2.4, '#CFC3A8'),
    sheet(-6, 5, -1.6, '#D9CDB3'),
    abs({ left: x, top: y, width: w, height: hh, transform: `rotate(${rot}deg)`, background: 'linear-gradient(160deg,#F1E8D4 0%,#E6DBC3 100%)', boxShadow: '0 26px 50px rgba(0,0,0,.65)', padding: `${44 * k}px ${30 * k}px 0`, flexDirection: 'column' }, [
      abs({ left: 18 * k, top: 18 * k, width: 30 * k, height: 5 * k, background: 'linear-gradient(180deg,#b9bdc4,#6e727a)', borderRadius: 2, transform: 'rotate(-38deg)' }),
      bars(w - 60 * k, k),
    ]),
  ]);
}
function sheetObj(x: number, y: number, w: number, hh: number, rot: number): El {
  const k = w / 300;
  return abs({ left: x, top: y, width: w, height: hh, transform: `rotate(${rot}deg)`, background: 'linear-gradient(160deg,#F1E8D4 0%,#E6DBC3 100%)', boxShadow: '0 26px 50px rgba(0,0,0,.65), 0 4px 10px rgba(0,0,0,.5)', padding: `${40 * k}px ${30 * k}px 0`, flexDirection: 'column' }, bars(w - 60 * k, k));
}

/** A clipped stack of index cards, each wider than the one above (the desk's note). */
function noteObj(x: number, y: number, w: number, hh: number, rot: number): El {
  const cardH = hh * 0.62;
  const card = (i: number, widthK: number, c: string): El => abs({ left: x + (w * (1 - widthK)) / 2, top: y + i * 18, width: w * widthK, height: cardH, transform: `rotate(${rot}deg)`, background: c, borderRadius: 3, boxShadow: '0 10px 22px rgba(0,0,0,.45)' });
  return h({ position: 'absolute', left: 0, top: 0, width: W, height: H }, [
    card(4, 1, '#D2C7AE'),
    card(3, 0.947, '#D9CEB5'),
    card(2, 0.893, '#E0D5BC'),
    card(1, 0.84, '#E6DCC4'),
    abs({ left: x + w * 0.107, top: y, width: w * 0.787, height: cardH, transform: `rotate(${rot}deg)`, background: 'linear-gradient(160deg,#F1E8D4 0%,#E6DBC3 100%)', borderRadius: 3, boxShadow: '0 14px 30px rgba(0,0,0,.55)', padding: `${cardH * 0.34}px 26px 0`, flexDirection: 'column' }, [
      abs({ left: 0, right: 0, top: cardH * 0.3, height: 2, background: 'rgba(190,92,80,.55)' }),
      bars(w * 0.787 - 52, w / 300),
    ]),
    abs({ left: x + w / 2 - 24, top: y - 12, width: 48, height: 30, background: '#16171b', borderRadius: 4, transform: `rotate(${rot}deg)` }),
  ]);
}

/* ---------- cards ---------- */
const fit = (text: string, sizes: [number, number][]) => (sizes.find(([max]) => text.length <= max) ?? sizes[sizes.length - 1])[1];
const root = (children: unknown[]) => h({ width: W, height: H, position: 'relative', background: '#0A0B0E', fontFamily: 'Instrument Sans', color: '#E6E7EA' }, children);

function home(c: Extract<OgCard, { type: 'home' }>): El {
  return root([
    topoImg(23, 0.17, 2.4),
    glow(600, 305, 780, 300, scrim(0.95), 2),
    abs({ left: 0, top: 0, width: W, height: H, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 30 }, [
      mark(96, '#E6E7EA', { marginBottom: 28 }),
      h({ fontSize: 124, lineHeight: 1, fontWeight: 500, letterSpacing: -5, color: '#E6E7EA' }, c.name),
      h({ marginTop: 28, fontSize: 36, lineHeight: 1.22, color: "#C8CBD2", letterSpacing: -0.3, textAlign: "center", justifyContent: "center", width: 1040 }, c.line),
    ]),
    abs({ right: 48, bottom: 44, alignItems: 'center', gap: 16, padding: '9px 16px', border: '1px solid rgba(255,255,255,.26)', background: 'rgba(10,11,14,.88)', fontFamily: 'JetBrains Mono', fontSize: 17, letterSpacing: 1.1, textTransform: 'uppercase' }, [
      h({ color: AMBER }, 'Last deploy'),
      h({ color: '#E6E7EA' }, c.deploy),
    ]),
  ]);
}

function place(c: Extract<OgCard, { type: 'place' }>): El {
  const bg: El[] = [];
  if (c.diagram) {
    const d = diagramSvg(c.diagram, 1.55);
    bg.push(img(b64(d.svg), d.w, d.h, { position: 'absolute', left: 660, top: Math.round((H - d.h) / 2), opacity: 0.5 }));
    bg.push(abs({ left: 0, top: 0, width: W, height: H, background: 'linear-gradient(90deg, #0A0B0E 0%, rgba(10,11,14,.94) 42%, rgba(10,11,14,.1) 80%)' }));
  } else {
    bg.push(topoImg(c.seed, 0.12, 1.8, { opacity: 0.8 }));
    bg.push(abs({ left: 0, top: 0, width: W, height: H, background: 'linear-gradient(90deg, #0A0B0E 0%, rgba(10,11,14,.93) 50%, rgba(10,11,14,.55) 100%)' }));
  }
  return root([
    ...bg,
    abs({ left: 72, top: 64 }, kicker(c.kicker)),
    abs({ left: 72, top: 150, width: 800, flexDirection: 'column' }, [
      h({ fontSize: fit(c.title, [[10, 128], [15, 104], [20, 92], [30, 80]]), lineHeight: 1, fontWeight: 500, letterSpacing: -4, color: '#E6E7EA' }, c.title),
      c.sub ? h({ marginTop: 34, fontSize: 52, lineHeight: 1.1, letterSpacing: -0.8, color: '#C8CBD2' }, c.sub) : null,
    ].filter(Boolean)),
    footer(),
  ]);
}

export const COMPANY_FRAMES_MAX = 4;
function company(c: Extract<OgCard, { type: 'company' }>): El {
  const systems = c.systems.slice(0, COMPANY_FRAMES_MAX);
  const fw = 250, fh = 190, gap = 28;
  const frames = systems.map((s, i) => {
    const num = `SYS.${String(i + 1).padStart(2, '0')}`;
    let fig: El | null = null;
    if (s.diagram) {
      const d = diagramSvg(s.diagram, (fh - 56) / s.diagram.vb[1], 0.3, 3.2);
      fig = img(b64(d.svg), Math.round(d.w), Math.round(d.h), { position: 'absolute', left: Math.round((fw - d.w) / 2), top: 44, opacity: 0.78 });
    }
    return h({ flexDirection: 'column', width: fw }, [
      h({ position: 'relative', width: fw, height: fh, border: '1px solid rgba(255,255,255,.3)', background: '#0E1015' }, [
        abs({ left: 12, top: 10, fontFamily: 'JetBrains Mono', fontSize: 16, letterSpacing: 1.6, color: AMBER }, num),
        fig,
      ].filter(Boolean)),
      h({ marginTop: 16, fontSize: 28, lineHeight: 1.15, letterSpacing: -0.3, color: '#C8CBD2' }, s.title),
    ]);
  });
  return root([
    topoImg(c.seed, 0.13, 1.8, { opacity: 0.9 }),
    abs({ left: 0, top: 0, width: W, height: H, background: 'linear-gradient(90deg, rgba(10,11,14,.9) 0%, rgba(10,11,14,.8) 60%, rgba(10,11,14,.55) 100%)' }),
    abs({ left: 72, top: 64 }, kicker(c.kicker)),
    abs({ left: 72, top: frames.length ? 112 : 216, width: 1056 }, h({ fontSize: fit(c.title, [[10, 124], [15, 108], [22, 88], [40, 72]]), lineHeight: 1, fontWeight: 500, letterSpacing: -4, color: '#E6E7EA' }, c.title)),
    frames.length ? abs({ left: 72, top: 296, gap }, frames) : null,
    abs({ right: 72, bottom: 54 }, mark(54)),
  ].filter(Boolean));
}

function essay(c: Extract<OgCard, { type: 'essay' }>): El {
  const obj = c.shape === 'letter' ? letterObj(150, 120, 300, 392, -4) : c.shape === 'paper' ? paperObj(150, 120, 300, 392, -3) : c.shape === 'note' ? noteObj(150, 140, 300, 392, -3) : sheetObj(150, 120, 300, 392, -3);
  return root([
    glow(330, 315, 600, 440, warm(0.36), 4),
    obj,
    abs({ left: 590, top: 0, width: 540, height: H, flexDirection: 'column', justifyContent: 'center' }, [
      kicker(c.kicker, 20),
      h({ marginTop: 34, fontFamily: 'Instrument Serif', fontSize: fit(c.title, [[24, 92], [40, 78], [64, 62]]), lineHeight: 1.02, letterSpacing: -1, color: '#F4ECDD' }, c.title),
    ]),
    abs({ left: 72, bottom: 46 }, mark(50)),
  ]);
}

/** Static cover for the writing room: warm pool on the desk, the mark signed in the light, the word. Never data-driven. */
function writing(): El {
  return root([
    glow(600, 300, 760, 440, warm(0.34), 6),
    abs({ left: 0, top: 0, width: W, height: H, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', paddingBottom: 14 }, [
      mark(230, '#F4ECDD'),
      h({ marginTop: 34, fontFamily: 'Instrument Serif', fontSize: 132, lineHeight: 1, letterSpacing: -2, color: '#F4ECDD' }, 'Writing'),
    ]),
  ]);
}

export async function renderOg(card: OgCard): Promise<Buffer> {
  const tree = card.type === 'home' ? home(card) : card.type === 'place' ? place(card) : card.type === 'company' ? company(card) : card.type === 'essay' ? essay(card) : writing();
  const svg = await satori(tree as never, { width: W, height: H, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
