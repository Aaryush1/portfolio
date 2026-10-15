import { describe, it, expect } from 'vitest';
import { BURST_WEIGHTS, burstCount, burstAngles, MIN_GAP } from '../../src/lib/sky/burst';

describe('click burst', () => {
  it('weights fall in a straight line and sum to 1', () => {
    const steps = BURST_WEIGHTS.slice(1).map((w, i) => +(BURST_WEIGHTS[i] - w).toFixed(6));
    expect(new Set(steps).size).toBe(1);
    expect(BURST_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('one is the most likely, four is about one in eight', () => {
    const n = 40000, c = [0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) c[burstCount(i / n)]++;
    expect(c[1]).toBeGreaterThan(c[2]);
    expect(c[2]).toBeGreaterThan(c[3]);
    expect(c[3]).toBeGreaterThan(c[4]);
    expect(c[4] / n).toBeGreaterThan(1 / 9);
    expect(c[4] / n).toBeLessThan(1 / 6);
  });
  it('directions are free but never closer than the gap', () => {
    for (let k = 0; k < 500; k++) {
      const a = burstAngles(4);
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        const d = Math.abs(((a[i] - a[j]) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        expect(d).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
      }
    }
  });
  it('is not an evenly spaced star', () => {
    let even = 0;
    for (let k = 0; k < 200; k++) {
      const a = burstAngles(4).sort((x, y) => x - y);
      const gaps = a.map((v, i) => (i ? v - a[i - 1] : v + 2 * Math.PI - a[a.length - 1]));
      if (Math.max(...gaps) - Math.min(...gaps) < 0.3) even++;
    }
    expect(even).toBeLessThan(20);
  });
});
