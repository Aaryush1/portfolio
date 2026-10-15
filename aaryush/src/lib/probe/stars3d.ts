/**
 * The 3D star catalogue for the story (prd-probe-home §5): every star with a measured distance, so flying between them is true.
 * Written by scripts/bake-stars3d.mjs from the HYG database (see decisions.md for source and licence). Pure and DOM-free.
 */
export interface Stars3D { n: number; x: Float32Array; y: Float32Array; z: Float32Array; absmag: Float32Array; ci: Float32Array }

export const STARS3D_URL = '/stars3d.bin';

export function decodeStars(buf: ArrayBuffer): Stars3D | null {
  if (buf.byteLength < 4) return null;
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  if (buf.byteLength !== 4 + n * 14) return null;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), absmag = new Float32Array(n), ci = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = dv.getFloat32(4 + i * 4, true);
    y[i] = dv.getFloat32(4 + n * 4 + i * 4, true);
    z[i] = dv.getFloat32(4 + n * 8 + i * 4, true);
    absmag[i] = dv.getUint8(4 + n * 12 + i) / 10 - 10;
    ci[i] = dv.getUint8(4 + n * 13 + i) / 100 - 0.5;
  }
  return { n, x, y, z, absmag, ci };
}

/** Apparent magnitude of a star of absolute magnitude M seen from dPc parsecs. Distances under a microparsec are held there, so it never returns NaN or -Infinity. */
export const apparentMag = (absmag: number, dPc: number): number => absmag + 5 * Math.log10(Math.max(dPc, 1e-6) / 10);
