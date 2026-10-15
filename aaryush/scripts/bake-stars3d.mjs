// Bakes public/stars3d.bin for the story (prd-probe-home §5). Run by hand, only when the data should change:
//   node scripts/bake-stars3d.mjs <path-to-hyg-csv>
// Source: the HYG database by David Nash (astronexus), CC BY-SA 4.0, https://codeberg.org/astronexus/hyg (current v4.x CSV
// under data/hyg/CURRENT/). Distances come from Hipparcos and Gaia parallaxes. Credit and licence are kept in docs/redesign/decisions.md.
// Keeps stars with apparent mag <= 7.5 and a known distance (HYG uses 100000 for unknown), and drops the Sun (id 0).
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { encodeStars } from './stars3d-encode.mjs';

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/bake-stars3d.mjs <hyg.csv>'); process.exit(1); }
const [head, ...rows] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
const cols = head.split(',').map((c) => c.replace(/"/g, ''));
const at = (name) => { const i = cols.indexOf(name); if (i < 0) throw new Error(`HYG column "${name}" missing`); return i; };
const I = { id: at('id'), dist: at('dist'), mag: at('mag'), absmag: at('absmag'), ci: at('ci'), x: at('x'), y: at('y'), z: at('z') };
const stars = [];
for (const r of rows) {
  const f = r.split(',');
  const num = (k) => Number(f[I[k]]);
  if (num('id') === 0 || !(num('dist') > 0 && num('dist') < 100000) || !(num('mag') <= 7.5)) continue;
  stars.push({ x: num('x'), y: num('y'), z: num('z'), absmag: num('absmag'), ci: Number.isFinite(num('ci')) && f[I.ci] !== '' ? num('ci') : 0.65 });
}
stars.sort((a, b) => a.absmag - b.absmag);
const bytes = encodeStars(stars);
writeFileSync(new URL('../public/stars3d.bin', import.meta.url), bytes);
console.log(`stars3d.bin: ${stars.length} stars, ${bytes.length} bytes, ${gzipSync(bytes).length} gzipped`);
