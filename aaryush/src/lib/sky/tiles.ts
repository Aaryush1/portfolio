/**
 * The sky's star tiles (E17): which ones a visitor can ever need, and how to read them. Pure and DOM-free.
 *
 * The stars fainter than the first-paint set are cut into static tiles (public/sky/s<shell>-b<band>.bin) by magnitude shell and
 * 15 degree declination band, written by scripts/bake-sky.mjs in the format of scripts/sky-tile-encode.mjs.
 *
 * Declination is the axis that saves bytes. The sky runs at 225x and more, so every right ascension comes past within minutes and
 * a filter on RA or on time would save nothing. Latitude, though, decides which declinations can ever reach the frame: the framing
 * keeps the pole just above the top edge and the horizon just under the bottom edge, so a visitor at 43 degrees north never sees
 * the far southern sky, and a visitor at 34 degrees south never sees the far northern one.
 */
import { makeView } from './view';

export const BAND_DEG = 15;
export const BANDS = 180 / BAND_DEG;
/** Magnitude shells [bright, faint], faint end inclusive. Shell 0 loads first; shells 2 and 3 are desktop only. */
export const SHELLS: readonly (readonly [number, number])[] = [[3.7, 6], [6, 6.5], [6.5, 7], [7, 7.5]];

export const bandOf = (dec: number) => Math.max(0, Math.min(BANDS - 1, Math.floor((dec + 90) / BAND_DEG)));
export const tileUrl = (shell: number, band: number) => `/sky/s${shell}-b${band}.bin`;

export interface Tile { n: number; ra: Float32Array; dec: Float32Array; mag: Float32Array; bv: Float32Array }

/** Reads one tile. Null when the bytes are not a tile (wrong length, or a server answering with something else). */
export function decodeTile(buf: ArrayBuffer): Tile | null {
  if (buf.byteLength < 4) return null;
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  if (buf.byteLength !== 4 + n * 6) return null;
  const ra = new Float32Array(n), dec = new Float32Array(n), mag = new Float32Array(n), bv = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc = (acc + dv.getUint16(4 + i * 2, true)) & 0xffff;
    ra[i] = (acc / 65536) * 360;
    dec[i] = (dv.getUint16(4 + n * 2 + i * 2, true) / 65535) * 180 - 90;
    mag[i] = dv.getUint8(4 + n * 4 + i) / 50 + 3;
    bv[i] = dv.getUint8(4 + n * 5 + i) / 100 - 0.5;
  }
  return { n, ra, dec, mag, bv };
}

/**
 * The declinations (degrees) that can reach the frame from a latitude: every direction the projection draws (down to 0.45 below
 * the horizon, as the engine does) that lands inside a W by H frame, sampled on a grid. Every right ascension comes round, so
 * only declination matters.
 */
export function visibleDecRange(lat: number, W: number, H: number, phone: boolean): [number, number] {
  const v = makeView(W, H, phone, lat, { x0: 0, y0: 0, x1: 0, y1: 0, feather: 1 });
  const sp = Math.sin((lat * Math.PI) / 180), cp = Math.cos((lat * Math.PI) / 180);
  let lo = 90, hi = -90;
  const NX = 48, NY = 32;
  for (let j = 0; j <= NY; j++) {
    for (let i = 0; i <= NX; i++) {
      const X = (i / NX) * W, Y = (j / NY) * H;
      const a = (v.sg * (v.cx - X)) / v.Rh, b = (v.sg * (v.cy - Y)) / v.Rh;
      const r2 = a * a + b * b, u = (1 - r2) / (1 + r2);
      if (u < -0.45) continue;
      const n = b * (1 + u);
      const dec = (Math.asin(Math.max(-1, Math.min(1, u * sp + n * cp))) * 180) / Math.PI;
      if (dec < lo) lo = dec;
      if (dec > hi) hi = dec;
    }
  }
  return lo > hi ? [-90, 90] : [lo, hi];
}

/** The bands that can show in the frame from this latitude, plus a margin so the edge stays filled. Mirrored for the south. */
export function bandsFor(lat: number, W: number, H: number, phone: boolean, marginDeg = 3): number[] {
  const [lo, hi] = visibleDecRange(Math.max(-89, Math.min(89, lat)), W, H, phone);
  const out: number[] = [];
  for (let b = 0; b < BANDS; b++) {
    const b0 = b * BAND_DEG - 90, b1 = b0 + BAND_DEG;
    if (b1 >= lo - marginDeg && b0 <= hi + marginDeg) out.push(b);
  }
  return out;
}

export interface Connection { saveData?: boolean; effectiveType?: string }
/** Which shells to fetch: none on Save-Data, the first on a 2g connection, the first two on phones, all four on desktop. */
export function shellsFor(phone: boolean, c: Connection | undefined): number[] {
  if (c?.saveData) return [];
  if (c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g') return [0];
  return phone ? [0, 1] : [0, 1, 2, 3];
}

/** The next tile to fetch (shells in order, bands in order within a shell) that is wanted and not yet asked for, or null. */
export function nextTile(shells: readonly number[], bands: readonly number[], asked: ReadonlySet<string>): [number, number] | null {
  for (const s of shells) for (const b of bands) if (!asked.has(tileUrl(s, b))) return [s, b];
  return null;
}

/** The faintest magnitude drawn: about 7.5 on desktop, 6.5 on phones (what the shells reach). */
export const DRAW_MAG = { desktop: 7.5, phone: 6.5 } as const;
