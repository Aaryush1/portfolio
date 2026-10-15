import { describe, expect, it } from 'vitest';
import { altAz, computeSky, hmsSec, SGR_A, showerFactor, starColour } from '../../src/lib/sky/astro';

// Madison 43.0731N 89.4012W, 2026-10-14 03:00 UT, checked against JPL Horizons (task 44 report).
const LAT = 43.0731, LON = -89.4012, T = Date.UTC(2026, 9, 14, 3, 0, 0);
const sky = computeSky(T, LAT, LON);
const angle = (a: { ra: number; dec: number }, ra: number, dec: number) => {
  const dr = ((a.ra - ra + 540) % 360) - 180;
  return Math.hypot(dr * Math.cos((dec * Math.PI) / 180), a.dec - dec);
};
const HORIZONS: Record<string, [number, number, number, number]> = {
  Mercury: [221.94, -19.32, -31.9, 272.6], Venus: [210.85, -20.56, -40.8, 279.7], Mars: [131.55, 19.27, -23.2, 27.1],
  Jupiter: [144.03, 14.95, -30.7, 15.7], Saturn: [10.41, 1.53, 39.5, 135.9],
};

describe('sky astronomy for Madison tonight', () => {
  for (const [name, [ra, dec, alt, az]] of Object.entries(HORIZONS)) {
    it(`${name} is within 1 degree of Horizons in RA/Dec and in alt/az`, () => {
      const p = sky.planets.find((x) => x.name === name)!;
      expect(angle(p, ra, dec)).toBeLessThan(1);
      const h = altAz(sky, p);
      expect(Math.abs(h.alt - alt)).toBeLessThan(1);
      expect(Math.abs(((h.az - az + 540) % 360) - 180)).toBeLessThan(1);
    });
  }
  it('Moon and Sun match', () => {
    expect(angle(sky.moon, 236.6, -25.76)).toBeLessThan(1);
    expect(angle(sky.sun, 198.86, -7.98)).toBeLessThan(1);
    expect(altAz(sky, sky.sun).alt).toBeLessThan(-35);
  });
  it('the Moon phase is about 19% lit', () => {
    expect(sky.moon.k).toBeGreaterThan(0.1);
    expect(sky.moon.k).toBeLessThan(0.3);
  });
  it('sidereal time is in range and gains about 0.99 degrees a day over a solar day', () => {
    const a = computeSky(T, LAT, LON), b = computeSky(T + 86400000, LAT, LON);
    expect(a.lst).toBeGreaterThanOrEqual(0);
    expect(a.lst).toBeLessThan(360);
    expect((b.lst - a.lst + 360) % 360).toBeCloseTo(0.9856, 1);
  });
  it('the galactic centre is below the horizon from Madison at 3am UT in October', () => {
    expect(altAz(sky, SGR_A).alt).toBeLessThan(0);
  });
});

describe('helpers', () => {
  it('shower peaks lift the rate to about 5x and ordinary nights stay at 1', () => {
    expect(showerFactor(8, 12)).toBeCloseTo(5, 1);
    expect(showerFactor(12, 14)).toBeCloseTo(5, 1);
    expect(showerFactor(3, 1)).toBe(1);
  });
  it('star colours run blue to orange by B-V', () => {
    const blue = starColour(-0.2, 1), orange = starColour(1.5, 1);
    expect(blue[2]).toBeGreaterThan(blue[0]);
    expect(orange[0]).toBeGreaterThan(orange[2]);
    expect(starColour(NaN, 3)).toHaveLength(3);
  });
});

describe('LST readout', () => {
  it('shows seconds, rolls forward, and gains about 361 degrees a day', () => {
    expect(hmsSec(0)).toBe('0h00m00s');
    expect(hmsSec(15)).toBe('1h00m00s');
    expect(hmsSec(15 * 23 + 15 / 60 * 56 + 15 / 3600 * 12.01)).toBe('23h56m12s');
    expect(hmsSec(359.9999)).toMatch(/^23h59m5\ds$/);
    expect(hmsSec(-15)).toBe('23h00m00s');
    // one real second at 225x is 225 simulated seconds, so LST moves about 56 s of sidereal time
    const a = computeSky(T, LAT, LON), b = computeSky(T + 225000, LAT, LON);
    expect((b.lst - a.lst) * 240).toBeCloseTo(225.6, 0);
  });
});
