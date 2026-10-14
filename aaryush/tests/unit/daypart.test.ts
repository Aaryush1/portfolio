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
  it('morning is cool and airy: blue-grey lines, a lower amber contour, a faster drift', () => {
    const m = p('morning'), a = p('afternoon');
    expect(m.minor[2] - m.minor[0]).toBeGreaterThanOrEqual(60); // clearly blue (afternoon is 14)
    expect(m.amberBase).toBeLessThan(a.amberBase);
    expect(m.drift).toBeGreaterThan(a.drift);
    expect(m.drift).toBeLessThanOrEqual(1.5);
    expect(m.amber).toEqual(a.amber);
  });
  it('evening warms the lines and adds one warm contour', () => {
    const e = p('evening'), a = p('afternoon');
    expect(e.minor[0]).toBeGreaterThan(e.minor[2]); // red over blue = warm tint
    expect(e.amberWidth).toBeGreaterThan(a.amberWidth);
    expect(e.warmLevel).not.toBeNull();
    expect(a.warmLevel).toBeNull();
    expect(p('night').warmLevel).toBeNull();
  });
  it('evening brightens the amber contour a little', () => {
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
      if (q.warmLevel) expect(q.warmLevel.color[3]).toBeLessThanOrEqual(0.4);
    }
  });
});

import { currentDaypart } from '../../src/lib/daypart';
describe('currentDaypart', () => {
  const root = (attr?: string) => ({ getAttribute: () => attr ?? null }) as unknown as Element;
  it('prefers a valid data-daypart over the clock', () => {
    expect(currentDaypart(root('night'), new Date(2026, 9, 14, 13))).toBe('night');
  });
  it('ignores an invalid data-daypart and uses the clock', () => {
    expect(currentDaypart(root('noon'), new Date(2026, 9, 14, 13))).toBe('afternoon');
  });
  it('uses the clock at the boundary hours', () => {
    const at = (h: number) => currentDaypart(root(), new Date(2026, 9, 14, h, 0));
    expect([at(20), at(21), at(6), at(7)]).toEqual(['evening', 'night', 'night', 'morning']);
  });
  it('gives the default look for a non-finite hour', () => {
    expect(currentDaypart(root(), new Date(NaN))).toBe('afternoon');
  });
});
