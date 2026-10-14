import { describe, expect, it } from 'vitest';
import { DAYPARTS } from '../../src/lib/daypart';
import { nearestToCenter, roomLight } from '../../src/lib/room-light';

describe('roomLight', () => {
  it('afternoon window light is softer than the prototype (0.2)', () => {
    expect(roomLight('afternoon').windowAlpha).toBeLessThanOrEqual(0.13);
    expect(roomLight('afternoon').windowAlpha).toBeGreaterThan(0);
  });
  it('morning is cooler (more blue than red) than afternoon', () => {
    const m = roomLight('morning').windowColor, a = roomLight('afternoon').windowColor;
    expect(m[2] - m[0]).toBeGreaterThan(a[2] - a[0]);
  });
  it('evening dims the window below afternoon, and night has none', () => {
    expect(roomLight('evening').windowAlpha).toBeLessThan(roomLight('afternoon').windowAlpha);
    expect(roomLight('night').windowAlpha).toBe(0);
  });
  it('every daypart keeps the warm pool visible', () => {
    for (const d of DAYPARTS) expect(roomLight(d).poolPeak).toBeGreaterThan(0.3);
  });
  it('afternoon shadow is softer than the prototype (blur 34)', () => {
    expect(roomLight('afternoon').shadowBlur).toBeLessThanOrEqual(34);
  });
});

describe('nearestToCenter', () => {
  const r = (top: number, height = 100) => ({ top, height });
  it('picks the piece whose centre is closest to the viewport centre', () => {
    expect(nearestToCenter([r(0), r(300), r(700)], 800)).toBe(1); // centres 50, 350, 750 vs 400
  });
  it('is deterministic on ties (first wins) and handles negatives', () => {
    expect(nearestToCenter([r(-100), r(300)], 400)).toBe(1);
    expect(nearestToCenter([r(100), r(300)], 400)).toBe(0); // centres 150 and 350 vs 200
    expect(nearestToCenter([r(100), r(100)], 400)).toBe(0);
  });
  it('returns -1 for nothing', () => {
    expect(nearestToCenter([], 800)).toBe(-1);
  });
});
