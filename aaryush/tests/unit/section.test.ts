import { describe, expect, it } from 'vitest';
import { arrowD, floorLayout, levelAtProgress, offsetForLevel, polyAt, progress, pulseAt, trackHeight } from '../../src/lib/section';

const P = { pad: 30, lbl: 24, base: 62, gap: 12, capH: 0 };

describe('floorLayout', () => {
  it('fills the frame exactly whichever floor is active', () => {
    for (const k of [0, 1, 2, 3]) {
      const act = [0, 0, 0, 0].map((_, i) => (i === k ? 1 : 0));
      const L = floorLayout(520, act, P);
      expect(L.ys[3] + L.hs[3]).toBeCloseTo(520 - P.pad, 6);
      expect(L.hs[k]).toBeCloseTo(L.full, 6);
      L.hs.forEach((h, i) => { if (i !== k) expect(h).toBeCloseTo(P.base, 6); });
    }
  });
  it('keeps the total constant mid-transition and the floors in order', () => {
    const L = floorLayout(520, [0.3, 0.7, 0, 0], P);
    expect(L.ys[3] + L.hs[3]).toBeCloseTo(520 - P.pad, 6);
    for (let i = 1; i < 4; i++) expect(L.ys[i]).toBeGreaterThan(L.ys[i - 1] + L.hs[i - 1]);
  });
  it('reserves the caption strip', () => {
    const L = floorLayout(400, [1, 0, 0, 0], { ...P, capH: 28 });
    expect(L.ys[3] + L.hs[3]).toBeCloseTo(400 - P.pad - 28, 6);
  });
});

describe('scroll mapping', () => {
  it('maps every level mark back to its own level', () => {
    const step = 330, stageH = 600, trackH = trackHeight(stageH, step);
    expect(trackH).toBe(600 + 3 * step);
    for (const k of [0, 1, 2, 3]) {
      const scrolled = offsetForLevel(k, step); // distance past the moment the stage sticks
      const s = progress(-scrolled, 0, trackH, stageH);
      expect(levelAtProgress(s)).toBe(k);
    }
  });
  it('clamps before and after the pinned stretch', () => {
    expect(levelAtProgress(-1)).toBe(0);
    expect(levelAtProgress(2)).toBe(3);
    expect(progress(500, 0, 1800, 600)).toBe(0);
    expect(progress(-5000, 0, 1800, 600)).toBe(1);
  });
  it('switches at the half-steps', () => {
    expect(levelAtProgress(0.16)).toBe(0);
    expect(levelAtProgress(0.17)).toBe(1);
    expect(levelAtProgress(0.5)).toBe(2);
    expect(levelAtProgress(0.84)).toBe(3);
  });
  it('is short: the pinned stretch is the steps only', () => {
    expect(trackHeight(600, 440) - 600).toBe(3 * 440);
  });
});

describe('path helpers', () => {
  it('finds points along a polyline', () => {
    const pts: [number, number][] = [[0, 0], [10, 0], [10, 10]];
    expect(polyAt(pts, 0)).toEqual([0, 0]);
    expect(polyAt(pts, 0.5)).toEqual([10, 0]);
    expect(polyAt(pts, 1)).toEqual([10, 10]);
  });
  it('draws an arrowhead with its tip at the point', () => {
    expect(arrowD(10, 10, 1, 0)).toMatch(/L10 10 /);
  });
  it('rests after one pass', () => {
    expect(pulseAt(0, 100, 50, 2)).toBe(0);
    expect(pulseAt(1000, 100, 50, 2)).toBeCloseTo(0.5, 6);
    expect(pulseAt(3000, 100, 50, 2)).toBeGreaterThan(1);
  });
});
