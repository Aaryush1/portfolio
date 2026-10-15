// Encoder for public/stars3d.bin (prd-probe-home §5). Shared by scripts/bake-stars3d.mjs and the unit test.
// Layout, little-endian: uint32 n | float32 x[n] | float32 y[n] | float32 z[n] | uint8 absmag[n] (q/10 - 10) | uint8 ci[n] (q/100 - 0.5)
const q8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function encodeStars(stars) {
  const n = stars.length;
  const buf = new ArrayBuffer(4 + n * 14);
  const dv = new DataView(buf);
  dv.setUint32(0, n, true);
  const col = (k, i) => 4 + k * n * 4 + i * 4;
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    dv.setFloat32(col(0, i), s.x, true);
    dv.setFloat32(col(1, i), s.y, true);
    dv.setFloat32(col(2, i), s.z, true);
    dv.setUint8(4 + n * 12 + i, q8((s.absmag + 10) * 10));
    dv.setUint8(4 + n * 13 + i, q8((s.ci + 0.5) * 100));
  }
  return new Uint8Array(buf);
}
