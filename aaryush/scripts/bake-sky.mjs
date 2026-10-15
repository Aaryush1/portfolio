// Bakes the star-chart data used by the hero sky: the small first-paint set (src/data/sky/sky-data.json), the Milky Way grid
// (src/data/sky/sky-mw.json) and the deeper star tiles served from our own site (public/sky/*.bin).
// Run by hand, only when the data should change:   node scripts/bake-sky.mjs [dir-with-d3-celestial-json]
// With no argument it downloads five files from d3-celestial 0.7.35 on jsDelivr. The app itself never does.
//
// Source and licence: d3-celestial by Olaf Frohn, BSD 3-Clause (https://github.com/ofrohn/d3-celestial).
// Its star positions, magnitudes and B-V colours derive from the ESA Hipparcos catalogue. The constellation
// lines and names, and the Milky Way outlines, are d3-celestial's own data files; see that repository for each
// file's upstream credit. Redistribution notice kept in docs/redesign/decisions.md.
//
// What it keeps:
//   stars          magnitude <= 3.7 (the first-paint set, ~380 stars), as four integer columns, brightest first.
//                  The rest (d3-celestial stars.8.json, to magnitude 7.5: about 25,700 stars) is cut into tiles by declination band
//                  (15 degrees, 12 bands) and magnitude shell (3.7-6, 6-6.5, 6.5-7, 7-7.5), in the compact binary format of
//                  scripts/sky-tile-encode.mjs, and fetched in the background, only for the bands a visitor's latitude can show.
//   names          index -> name for ~26 well-known bright stars (labels view only)
//   lines          constellation lines, 0.1 degree integers
//   cons           constellation names with a label position
//   mw             (own file, sky-mw.json) the five nested Milky Way outlines, filled and blurred into a 1 degree brightness grid (base64 bytes)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';
import { BANDS, SHELLS, bandOf, encodeTile } from './sky-tile-encode.mjs';

const CDN = 'https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/';
const FILES = ['stars.8', 'constellations.lines', 'constellations', 'mw'];
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'data', 'sky', 'sky-data.json');
const dir = process.argv[2];

async function load(name) {
  if (dir) return JSON.parse(await readFile(join(dir, name + '.json'), 'utf8'));
  const r = await fetch(CDN + name + '.json');
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}

const rev = (x) => ((x % 360) + 360) % 360;
const BRIGHT = { 32349: 'Sirius', 30438: 'Canopus', 69673: 'Arcturus', 91262: 'Vega', 24608: 'Capella', 24436: 'Rigel', 37279: 'Procyon', 27989: 'Betelgeuse', 97649: 'Altair', 21421: 'Aldebaran', 80763: 'Antares', 65474: 'Spica', 37826: 'Pollux', 113368: 'Fomalhaut', 102098: 'Deneb', 49669: 'Regulus', 11767: 'Polaris', 7588: 'Achernar', 68702: 'Hadar', 60718: 'Acrux', 36850: 'Castor', 85927: 'Shaula', 92855: 'Nunki', 54061: 'Dubhe', 15863: 'Mirfak', 26311: 'Alnilam' };
const MAG_LIMIT = 3.7; // keep in step with BRIGHT_LIMIT in src/scripts/sky/engine.ts

const [st, ln, cn, mw] = await Promise.all(FILES.map(load));

// ---- stars
const ALL = st.features.map((f) => ({ id: f.id, ra: rev(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1], mag: f.properties.mag, bv: parseFloat(f.properties.bv) }));
const F = ALL
  .filter((s) => s.mag <= MAG_LIMIT)
  .sort((a, b) => a.mag - b.mag || a.id - b.id);
const stars = { ra: [], dec: [], mag: [], bv: [] };
const names = {};
F.forEach((s, i) => {
  stars.ra.push(Math.round(s.ra * 100) % 36000);
  stars.dec.push(Math.round(s.dec * 100));
  stars.mag.push(Math.round(s.mag * 10));
  stars.bv.push(Number.isNaN(s.bv) ? 60 : Math.round(Math.max(-30, Math.min(160, s.bv * 100))));
  if (BRIGHT[s.id]) names[i] = BRIGHT[s.id];
});

// ---- constellation lines: each polyline is [ra0, dec0, ra1, dec1, ...] in 0.1 degrees
const lines = [];
for (const f of ln.features) for (const line of f.geometry.coordinates) {
  lines.push(line.flatMap((c) => [Math.round(rev(c[0]) * 10) % 3600, Math.round(c[1] * 10)]));
}
const cons = cn.features.map((f) => [f.properties.name, Math.round(rev(f.geometry.coordinates[0]) * 10) % 3600, Math.round(f.geometry.coordinates[1] * 10)]);

// ---- Milky Way: even-odd fill of each outline at 0.5 degrees, composited at 20% each, gaussian blur (sigma 2.5 cells), 1 degree grid
const W = 720, H = 360;
let img = new Float32Array(W * H);
for (const f of mw.features) {
  const edges = [];
  for (const poly of f.geometry.coordinates) for (const ring of poly) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      edges.push([(a[0] + 180) * 2, (90 - a[1]) * 2, (b[0] + 180) * 2, (90 - b[1]) * 2]);
    }
  }
  for (let j = 0; j < H; j++) {
    const y = j + 0.5, xs = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] - 0.5)), i1 = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let i = i0; i <= i1; i++) { const v = img[j * W + i]; img[j * W + i] = v + (1 - v) * 0.2; }
    }
  }
}
function blur(src, sigma) {
  const r = Math.ceil(sigma * 3), ker = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); ker.push(v); sum += v; }
  const k = ker.map((v) => v / sum);
  const tmp = new Float32Array(W * H), res = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let s = 0;
    for (let d = -r; d <= r; d++) { const x = i + d; if (x >= 0 && x < W) s += src[j * W + x] * k[d + r]; }
    tmp[j * W + i] = s;
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let s = 0;
    for (let d = -r; d <= r; d++) { const y = j + d; if (y >= 0 && y < H) s += tmp[y * W + i] * k[d + r]; }
    res[j * W + i] = s;
  }
  return res;
}
img = blur(img, 2.5);
const GW = 360, GH = 180, grid = new Uint8Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const s = img[2 * j * W + 2 * i] + img[2 * j * W + 2 * i + 1] + img[(2 * j + 1) * W + 2 * i] + img[(2 * j + 1) * W + 2 * i + 1];
  grid[j * GW + i] = Math.round((s / 4) * 255);
}
// Row 0 is dec +90, column 0 is longitude -180 (RA 180 when read as signed), 1 degree cells.
const data = { v: 2, stars, names, lines, cons };
const json = JSON.stringify(data);
const mwJson = JSON.stringify({ w: GW, h: GH, grid: Buffer.from(grid).toString('base64') });
await mkdir(dirname(out), { recursive: true });
await writeFile(out, json);
await writeFile(join(dirname(out), 'sky-mw.json'), mwJson);
console.log(`stars ${F.length}, lines ${lines.length}, cons ${cons.length}, sky-data ${(json.length / 1024).toFixed(1)} KB (gzip ${(gzipSync(json).length / 1024).toFixed(1)}), sky-mw ${(mwJson.length / 1024).toFixed(1)} KB (gzip ${(gzipSync(mwJson).length / 1024).toFixed(1)})`);

// ---- star tiles: stars fainter than the first-paint set, by declination band and magnitude shell
const tileDir = join(here, '..', 'public', 'sky');
await rm(tileDir, { recursive: true, force: true });
await mkdir(tileDir, { recursive: true });
let tileStars = 0, tileBytes = 0, tileGz = 0, tileFiles = 0;
const perShell = SHELLS.map(() => 0);
SHELLS.forEach(([lo, hi], si) => {
  for (let band = 0; band < BANDS; band++) {
    const rows = ALL.filter((s) => s.mag > lo && s.mag <= hi && bandOf(s.dec) === band);
    if (!rows.length) continue;
    const bytes = encodeTile(rows);
    tileStars += rows.length; perShell[si] += rows.length;
    tileBytes += bytes.length; tileGz += gzipSync(bytes).length; tileFiles++;
    writeFileSync(join(tileDir, `s${si}-b${band}.bin`), bytes);
  }
});
console.log(`tiles: ${tileFiles} files, ${tileStars} stars (${perShell.join(' / ')} by shell), ${(tileBytes / 1024).toFixed(0)} KB raw, ${(tileGz / 1024).toFixed(0)} KB gzip`);
