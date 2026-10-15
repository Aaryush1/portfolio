// The compact binary format of the sky's star tiles (public/sky/s<shell>-b<band>.bin), written by bake-sky.mjs and read by
// src/lib/sky/tiles.ts (decodeTile). Plain JS so both the bake script and the tests can import it.
//
// One tile is the stars of one magnitude shell in one 15 degree declination band, sorted by right ascension:
//   u32  count (little endian)
//   u16  x count   right ascension, as the difference from the previous star, in 1/65536 of a turn (wraps)
//   u16  x count   declination, (dec + 90) / 180 * 65535
//   u8   x count   magnitude, (mag - 3) * 50  (0.02 mag steps, 3.0 to 8.1)
//   u8   x count   B-V colour, (bv + 0.5) * 100  (0.01 steps, -0.5 to 2.05; missing is stored as 0.6)
// That is 6 bytes a star, in columns so it gzips well.

export const BAND_DEG = 15;
export const BANDS = 180 / BAND_DEG;
/** Magnitude shells, faint end inclusive: [lo, hi]. The first one is loaded first, then the others on desktop. */
export const SHELLS = [[3.7, 6], [6, 6.5], [6.5, 7], [7, 7.5]];

export const bandOf = (dec) => Math.max(0, Math.min(BANDS - 1, Math.floor((dec + 90) / BAND_DEG)));

/** rows: [{ ra (deg), dec (deg), mag, bv }]. Returns an ArrayBuffer-backed Uint8Array. */
export function encodeTile(rows) {
  const sorted = [...rows].sort((a, b) => a.ra - b.ra);
  const n = sorted.length;
  const buf = new ArrayBuffer(4 + n * 6);
  const dv = new DataView(buf);
  dv.setUint32(0, n, true);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const r = sorted[i];
    const ra16 = Math.round((((r.ra % 360) + 360) % 360) / 360 * 65536) & 0xffff;
    dv.setUint16(4 + i * 2, (ra16 - prev) & 0xffff, true);
    prev = ra16;
    dv.setUint16(4 + n * 2 + i * 2, Math.round(((r.dec + 90) / 180) * 65535), true);
    dv.setUint8(4 + n * 4 + i, Math.max(0, Math.min(255, Math.round((r.mag - 3) * 50))));
    const bv = Number.isNaN(r.bv) ? 0.6 : r.bv;
    dv.setUint8(4 + n * 5 + i, Math.max(0, Math.min(255, Math.round((bv + 0.5) * 100))));
  }
  return new Uint8Array(buf);
}
