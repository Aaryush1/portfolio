import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BAND_DEG as ENC_BAND, BANDS as ENC_BANDS, SHELLS as ENC_SHELLS, bandOf as encBandOf, encodeTile } from '../../scripts/sky-tile-encode.mjs';
import { BAND_DEG, BANDS, SHELLS, bandOf, bandsFor, decodeTile, DRAW_MAG, nextTile, shellsFor, tileUrl, visibleDecRange } from '../../src/lib/sky/tiles';

describe('which bands a latitude can ever show', () => {
  const d = (lat: number, phone = false) => bandsFor(lat, phone ? 412 : 1280, phone ? 780 : 800, phone);
  it('43 N (Madison, Chicago): the far southern bands 0 and 1 (below -60) are never fetched', () => {
    expect(d(43)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(d(43, true)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('on the equator every band can show', () => {
    expect(d(0)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('34 S (Sydney): the far northern bands 10 and 11 (above 60) are never fetched; it is the mirror of 34 N', () => {
    expect(d(-34)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const north = d(34).map((b) => BANDS - 1 - b).sort((a, b) => a - b);
    expect(d(-34)).toEqual(north);
  });
  it('further from the equator, more of the far side is skipped', () => {
    expect(d(60)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(d(-60)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(d(89).length).toBeLessThan(d(60).length);
  });
  it('the visible declinations: the pole end is always in, the far end is cut by the framing, symmetric north and south', () => {
    const [lo, hi] = visibleDecRange(43, 1280, 800, false);
    expect(hi).toBeGreaterThan(85);
    expect(lo).toBeGreaterThan(-47); // the horizon's south point is at -47: the bottom edge sits just above its far side
    const [slo, shi] = visibleDecRange(-43, 1280, 800, false);
    expect(slo).toBeCloseTo(-hi, 0);
    expect(shi).toBeCloseTo(-lo, 0);
  });
  it('never throws on silly input', () => {
    expect(bandsFor(90, 1280, 800, false).length).toBeGreaterThan(0);
    expect(bandsFor(-90, 1, 1, true).length).toBeGreaterThan(0);
  });
});

describe('shells and the order of fetching', () => {
  it('Save-Data none, 2g the first shell, phones two, desktop four', () => {
    expect(shellsFor(false, { saveData: true })).toEqual([]);
    expect(shellsFor(true, { saveData: true })).toEqual([]);
    expect(shellsFor(false, { effectiveType: '2g' })).toEqual([0]);
    expect(shellsFor(false, { effectiveType: 'slow-2g' })).toEqual([0]);
    expect(shellsFor(true, { effectiveType: '4g' })).toEqual([0, 1]);
    expect(shellsFor(false, { effectiveType: '4g' })).toEqual([0, 1, 2, 3]);
    expect(shellsFor(false, undefined)).toEqual([0, 1, 2, 3]);
  });
  it('the first shell comes first, bands in order, and nothing is asked for twice', () => {
    const asked = new Set<string>();
    const seen: [number, number][] = [];
    for (let k = 0; k < 100; k++) {
      const t = nextTile([0, 1], [2, 3], asked);
      if (!t) break;
      asked.add(tileUrl(t[0], t[1]));
      seen.push(t);
    }
    expect(seen).toEqual([[0, 2], [0, 3], [1, 2], [1, 3]]);
    expect(nextTile([0], [2], asked)).toBeNull();
  });
  it('a band added later (the position moved) is the only thing left to ask for', () => {
    const asked = new Set<string>([tileUrl(0, 2), tileUrl(0, 3)]);
    expect(nextTile([0], [0, 2, 3], asked)).toEqual([0, 0]);
  });
});

describe('the binary tile format', () => {
  const rows = [
    { ra: 350.25, dec: -33.5, mag: 5.62, bv: 0.64 },
    { ra: 10.5, dec: 80.1, mag: 7.48, bv: -0.31 },
    { ra: 180, dec: 0, mag: 3.74, bv: Number.NaN },
    { ra: 359.99, dec: -89.9, mag: 6.01, bv: 1.9 },
  ];
  const bytes = encodeTile(rows);
  const tile = decodeTile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)!;
  it('is six bytes a star plus a four byte count', () => {
    expect(bytes.length).toBe(4 + rows.length * 6);
  });
  it('round trips every star within the quantisation, sorted by right ascension', () => {
    expect(tile.n).toBe(4);
    const sorted = [...rows].sort((a, b) => a.ra - b.ra);
    sorted.forEach((r, i) => {
      expect(tile.ra[i]).toBeCloseTo(r.ra, 1); // 1/65536 of a turn is 0.0055 degrees
      expect(tile.dec[i]).toBeCloseTo(r.dec, 1);
      expect(Math.abs(tile.mag[i] - r.mag)).toBeLessThan(0.011);
      expect(Math.abs(tile.bv[i] - (Number.isNaN(r.bv) ? 0.6 : r.bv))).toBeLessThan(0.011);
    });
  });
  it('wraps right ascension correctly across 0 and 360', () => {
    const t = decodeTile(encodeTile([{ ra: 359.9, dec: 0, mag: 5, bv: 0.5 }, { ra: 0.1, dec: 0, mag: 5, bv: 0.5 }]).buffer as ArrayBuffer)!;
    expect([...t.ra].map((v) => Math.round(v * 10) / 10).sort((a, b) => a - b)).toEqual([0.1, 359.9]);
  });
  it('rejects anything that is not a tile', () => {
    expect(decodeTile(new ArrayBuffer(0))).toBeNull();
    expect(decodeTile(new ArrayBuffer(3))).toBeNull();
    expect(decodeTile(new TextEncoder().encode('<html>not a tile</html>').buffer as ArrayBuffer)).toBeNull();
    expect(decodeTile(bytes.slice(0, bytes.length - 1).buffer as ArrayBuffer)).toBeNull();
    expect(decodeTile(new Uint8Array([0, 0, 0, 0]).buffer as ArrayBuffer)?.n).toBe(0);
  });
});

describe('the baked tiles in public/sky', () => {
  it('agree with the runtime on bands and shells', () => {
    expect(BAND_DEG).toBe(ENC_BAND);
    expect(BANDS).toBe(ENC_BANDS);
    expect(SHELLS).toEqual(ENC_SHELLS);
    for (const dec of [-90, -75.1, -75, 0, 14.9, 15, 89.9, 90]) expect(bandOf(dec)).toBe(encBandOf(dec));
    expect(DRAW_MAG).toEqual({ desktop: 7.5, phone: 6.5 });
  });
  const dir = fileURLToPath(new URL('../../public/sky/', import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith('.bin'));
  it('are all valid tiles whose stars sit in their own band and shell', () => {
    expect(files.length).toBeGreaterThan(40);
    let total = 0;
    for (const f of files) {
      const m = /^s(\d)-b(\d+)\.bin$/.exec(f)!;
      const shell = Number(m[1]), band = Number(m[2]);
      const buf = readFileSync(dir + f);
      const t = decodeTile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      expect(t, f).not.toBeNull();
      total += t!.n;
      const [lo, hi] = SHELLS[shell];
      for (let i = 0; i < t!.n; i++) {
        expect(bandOf(t!.dec[i]), f).toBe(band);
        expect(t!.mag[i], f).toBeGreaterThan(lo - 0.011);
        expect(t!.mag[i], f).toBeLessThanOrEqual(hi + 0.011);
      }
    }
    expect(total).toBeGreaterThan(24000); // about 25,400 stars to magnitude 7.5
    expect(total).toBeLessThan(27000);
  });
  it('are small: every tile under 25 KB, the whole set about 150 KB', () => {
    let sum = 0;
    for (const f of files) { const n = statSync(dir + f).size; expect(n, f).toBeLessThan(25 * 1024); sum += n; }
    expect(sum).toBeLessThan(170 * 1024);
  });
});
