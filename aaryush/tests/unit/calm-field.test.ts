import { describe, expect, it } from 'vitest';
import { calmParams, contourLevels, fieldParams, type Daypart } from '../../src/lib/daypart';

const PARTS: Daypart[] = ['morning', 'afternoon', 'evening', 'night'];

describe('calm topography on phones (below 560px)', () => {
  it('draws noticeably fewer minor contours, and keeps the major ones', () => {
    for (const d of PARTS) {
      const p = fieldParams(d);
      const full = contourLevels(p, false), calm = contourLevels(p, true);
      expect(calm.minor.length, d).toBeLessThan(full.minor.length);
      expect(calm.minor.length, d).toBeGreaterThan(0);
      expect(calm.major, d).toEqual(full.major);
    }
  });
  it('is off on desktop: the levels are exactly the day levels', () => {
    const p = fieldParams('afternoon');
    expect(contourLevels(p, false).minor).toHaveLength(11);
    expect(contourLevels(p, false).major).toHaveLength(4);
  });
  it('lowers the minor line opacity by about 40%', () => {
    for (const d of PARTS) {
      const p = fieldParams(d), c = calmParams(p);
      expect(c.minor[3], d).toBeCloseTo(p.minor[3] * 0.6, 5);
      expect(c.minor.slice(0, 3), d).toEqual(p.minor.slice(0, 3));
    }
  });
  it('keeps the amber contour, slightly thinner', () => {
    for (const d of PARTS) {
      const p = fieldParams(d), c = calmParams(p);
      expect(c.amber, d).toEqual(p.amber);
      expect(c.amberWidth, d).toBeLessThan(p.amberWidth);
      expect(c.amberWidth, d).toBeGreaterThan(p.amberWidth * 0.7);
    }
  });
  it('keeps the night and day differences in proportion', () => {
    const day = fieldParams('afternoon'), night = fieldParams('night');
    const dayC = calmParams(day), nightC = calmParams(night);
    expect(nightC.amber[3] < dayC.amber[3]).toBe(night.amber[3] < day.amber[3]);
    expect(nightC.drift).toBe(night.drift);
  });
});
