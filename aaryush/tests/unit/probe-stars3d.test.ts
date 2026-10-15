import { describe, expect, it } from 'vitest';
import { encodeStars } from '../../scripts/stars3d-encode.mjs';
import { apparentMag, decodeStars } from '../../src/lib/probe/stars3d';

const sample = [
  { x: 0.000004, y: 0, z: 0, absmag: 4.85, ci: 0.656 },     // the Sun's neighbourhood, near origin
  { x: -0.4954, y: -0.4141, z: -1.1566, absmag: 4.38, ci: 0.71 }, // about Alpha Centauri A
  { x: 120.5, y: -80.25, z: 300, absmag: -6.2, ci: 1.85 },
];

describe('stars3d', () => {
  it('round-trips positions exactly and magnitudes and colours within quantisation', () => {
    const s = decodeStars(encodeStars(sample).buffer as ArrayBuffer)!;
    expect(s.n).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(s.x[i]).toBeCloseTo(sample[i].x, 4);
      expect(s.y[i]).toBeCloseTo(sample[i].y, 4);
      expect(s.z[i]).toBeCloseTo(sample[i].z, 4);
      expect(Math.abs(s.absmag[i] - sample[i].absmag)).toBeLessThanOrEqual(0.05 + 1e-6);
      expect(Math.abs(s.ci[i] - sample[i].ci)).toBeLessThanOrEqual(0.005 + 1e-6);
    }
  });

  it('clamps magnitudes and colours outside the encodable range instead of wrapping', () => {
    const s = decodeStars(encodeStars([{ x: 1, y: 1, z: 1, absmag: -30, ci: 9 }]).buffer as ArrayBuffer)!;
    expect(s.absmag[0]).toBeCloseTo(-10, 5);
    expect(s.ci[0]).toBeCloseTo(2.05, 5);
  });

  it('refuses bytes that are not a catalogue', () => {
    expect(decodeStars(new ArrayBuffer(2))).toBeNull();
    const bad = new ArrayBuffer(4 + 14 * 3 - 1);
    new DataView(bad).setUint32(0, 3, true);
    expect(decodeStars(bad)).toBeNull();
    expect(decodeStars(new TextEncoder().encode('<!doctype html>').buffer as ArrayBuffer)).toBeNull();
  });

  it('gives the apparent magnitude from any distance', () => {
    expect(apparentMag(4.83, 10)).toBeCloseTo(4.83, 5);
    expect(apparentMag(4.83, 1 / 206265)).toBeCloseTo(-26.74, 1); // the Sun from Earth
    expect(Number.isFinite(apparentMag(0, 0))).toBe(true); // a star at the camera never gives NaN or -Infinity
  });
});
