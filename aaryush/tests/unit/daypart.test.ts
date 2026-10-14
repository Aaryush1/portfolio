import { describe, expect, it } from 'vitest';
import { DAYPARTS, daypartFor, fieldParams, isDaypart, nextPreview } from '../../src/lib/daypart';

describe('daypartFor', () => {
  it('maps the boundary hours', () => {
    expect(daypartFor(6)).toBe('night');      // 06:59
    expect(daypartFor(7)).toBe('morning');    // 07:00
    expect(daypartFor(11)).toBe('morning');
    expect(daypartFor(12)).toBe('afternoon');
    expect(daypartFor(16)).toBe('afternoon');
    expect(daypartFor(17)).toBe('evening');
    expect(daypartFor(20)).toBe('evening');    // 20:59
    expect(daypartFor(21)).toBe('night');      // 21:00
    expect(daypartFor(23)).toBe('night');
    expect(daypartFor(0)).toBe('night');
  });
  it('covers all 24 hours with contiguous periods', () => {
    const seq = Array.from({ length: 24 }, (_, h) => daypartFor(h));
    expect(new Set(seq)).toEqual(new Set(DAYPARTS));
    // 07..06 wraps: count transitions starting at 7 is exactly 3 plus none inside a period
    const rot = [...seq.slice(7), ...seq.slice(0, 7)];
    let changes = 0;
    for (let i = 1; i < rot.length; i++) if (rot[i] !== rot[i - 1]) changes++;
    expect(changes).toBe(3);
  });
  it('ignores fractional minutes and wraps out-of-range input', () => {
    expect(daypartFor(6.99)).toBe('night');
    expect(daypartFor(20.99)).toBe('evening');
    expect(daypartFor(31)).toBe(daypartFor(7));
    expect(daypartFor(-1)).toBe('night');
  });
  it('falls back to the default look for non-numbers', () => {
    expect(daypartFor(NaN)).toBe('afternoon');
    expect(daypartFor(Infinity)).toBe('afternoon');
  });
});

describe('isDaypart', () => {
  it('accepts only the four names', () => {
    for (const d of DAYPARTS) expect(isDaypart(d)).toBe(true);
    for (const v of ['dawn', '', 'Night', null, undefined, 3]) expect(isDaypart(v)).toBe(false);
  });
});

describe('nextPreview', () => {
  it('cycles morning, afternoon, evening, night, then back to auto', () => {
    expect(nextPreview(null)).toBe('morning');
    expect(nextPreview('morning')).toBe('afternoon');
    expect(nextPreview('afternoon')).toBe('evening');
    expect(nextPreview('evening')).toBe('night');
    expect(nextPreview('night')).toBeNull();
  });
});

describe('fieldParams', () => {
  const p = (d: Parameters<typeof fieldParams>[0]) => fieldParams(d);
  it('afternoon is the default look', () => {
    expect(p('afternoon')).toMatchObject({ levelStep: 0.1, levelCount: 15, drift: 1, amber: [242, 181, 68, 0.62] });
  });
  it('morning only cools the minor lines', () => {
    const m = p('morning'), a = p('afternoon');
    expect(m.minor).not.toEqual(a.minor);
    expect(m.minor[2]).toBeGreaterThan(m.minor[0]); // bluer than red
    expect({ ...m, minor: 0, major: 0 }).toEqual({ ...a, minor: 0, major: 0 });
  });
  it('evening warms and brightens the amber contour a little', () => {
    const e = p('evening'), a = p('afternoon');
    expect(e.amber[3]).toBeGreaterThan(a.amber[3]);
    expect(e.amber[3] - a.amber[3]).toBeLessThanOrEqual(0.2);
    expect(e.amber[2]).toBeLessThan(a.amber[2]); // less blue = warmer
  });
  it('night has fewer levels, about 40% slower drift and a dimmer amber', () => {
    const n = p('night'), a = p('afternoon');
    expect(n.levelCount).toBeLessThan(a.levelCount);
    expect(n.drift).toBeCloseTo(0.6, 5);
    expect(n.amber[3]).toBeLessThan(a.amber[3]);
    expect(a.amber[3] - n.amber[3]).toBeLessThanOrEqual(0.25);
  });
  it('every period keeps lines faint (alpha caps keep text contrast)', () => {
    for (const d of DAYPARTS) {
      const q = p(d);
      expect(q.minor[3]).toBeLessThanOrEqual(0.14);
      expect(q.major[3]).toBeLessThanOrEqual(0.26);
      expect(q.amber[3]).toBeLessThanOrEqual(0.8);
    }
  });
});
