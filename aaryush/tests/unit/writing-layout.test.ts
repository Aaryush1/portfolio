import { describe, expect, it } from 'vitest';
import { layoutDesk, nominalSize } from '../../src/lib/writing-layout';

const mk = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ slug: `piece-${i}`, shape: i % 3 === 0 ? 'letter' : i % 3 === 1 ? 'paper' : 'sheet' }));

describe('layoutDesk', () => {
  it('is deterministic: the same pieces always land in the same places', () => {
    expect(layoutDesk(mk(7))).toEqual(layoutDesk(mk(7)));
  });
  it('gives a piece the same rotation regardless of what else is on the desk', () => {
    const a = layoutDesk(mk(3)).placements.find((p) => p.slug === 'piece-1')!;
    const b = layoutDesk(mk(9)).placements.find((p) => p.slug === 'piece-1')!;
    expect(a.rot).toBe(b.rot);
  });
  it.each([1, 2, 3, 5, 8, 12, 15])('places every piece exactly once for n=%i', (n) => {
    const l = layoutDesk(mk(n));
    expect(l.placements.map((p) => p.slug).sort()).toEqual(mk(n).map((p) => p.slug).sort());
  });
  it.each([2, 3, 6, 9, 15])('leaves no column imbalance larger than the shortest object for n=%i', (n) => {
    const l = layoutDesk(mk(n));
    const shortest = Math.min(...mk(n).map((p) => nominalSize(p.shape).h));
    for (let c = 0; c < l.cols; c++) {
      const inCol = l.placements.filter((p) => p.col === c);
      const bottom = Math.max(...inCol.map((p) => p.y + p.h));
      const top = Math.min(...inCol.map((p) => p.y));
      expect(l.height - bottom).toBeLessThan(shortest);
      expect(top).toBeLessThan(shortest);
    }
  });
  it('lists placements in visual reading order (y, then x)', () => {
    const p = layoutDesk(mk(8)).placements;
    for (let i = 1; i < p.length; i++) expect(p[i].y > p[i - 1].y || (p[i].y === p[i - 1].y && p[i].x >= p[i - 1].x)).toBe(true);
  });
  it('rotates every object a little but never more than 3 degrees, and never exactly 0', () => {
    for (const p of layoutDesk(mk(15)).placements) { expect(Math.abs(p.rot)).toBeGreaterThan(0); expect(Math.abs(p.rot)).toBeLessThanOrEqual(3); }
  });
  it('treats an unknown shape as a sheet and an empty desk as empty', () => {
    expect(nominalSize('zine')).toEqual(nominalSize('sheet'));
    expect(layoutDesk([]).placements).toEqual([]);
  });
  it('handles one piece without NaN', () => {
    const l = layoutDesk(mk(1));
    expect(l.cols).toBe(1);
    expect(Number.isFinite(l.height)).toBe(true);
  });
});
