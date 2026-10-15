import { describe, expect, it } from 'vitest';
import { instantForPart, placeFor, zoneParts } from '../../src/lib/sky/place';
import { clampRate, DEFAULT_RATE, makeView, meteorInterval, parseStoredRate, project, quietFactor, readoutText, sampleGrid, stepRate, trailArc, trailSamples } from '../../src/lib/sky/view';

describe('rate', () => {
  it('defaults are 225x desktop, 150x phone', () => {
    expect(DEFAULT_RATE).toEqual({ desktop: 225, phone: 150 });
  });
  it('steps through the ladder and stops at 50 and 500', () => {
    expect(stepRate(225, 1)).toBe(250);
    expect(stepRate(225, -1)).toBe(200);
    expect(stepRate(500, 1)).toBe(500);
    expect(stepRate(50, -1)).toBe(50);
    let r = 50;
    for (let i = 0; i < 20; i++) r = stepRate(r, 1);
    expect(r).toBe(500);
  });
  it('clamps and rejects bad stored values', () => {
    expect(clampRate(9000)).toBe(500);
    expect(clampRate(1)).toBe(50);
    expect(clampRate(NaN)).toBe(225);
    expect(parseStoredRate('300')).toBe(300);
    for (const bad of [null, '', 'abc', '10', '1000', 'NaN']) expect(parseStoredRate(bad)).toBeNull();
  });
});

describe('readout', () => {
  it('has the agreed shape', () => {
    const t = readoutText({ lat: 43.07, lon: -89.4, hour: 23, minute: 5, elapsedMs: 18 * 60000, lstText: '23h56m', moonPct: 19.4, rate: 225 });
    expect(t).toBe('Live · 43.1°N 89.4°W · 23:05 local · T+00h18m · LST 23h56m · Moon 19% · ×225');
    expect(readoutText({ lat: -33.9, lon: 151.2, hour: 1, minute: 2, elapsedMs: 3 * 3600000 + 5 * 60000, lstText: 'x', moonPct: 0, rate: 50 })).toContain('33.9°S 151.2°E');
  });
});

describe('view', () => {
  const q = { x0: 100, y0: 100, x1: 300, y1: 200, feather: 100 };
  it('puts the pole just above the top edge and the horizon below the bottom', () => {
    const v = makeView(1280, 800, false, 43, q);
    const poleY = v.cy - v.sg * v.Rh * Math.tan(((90 - 43) * Math.PI) / 360);
    expect(poleY).toBeCloseTo(-16, 3);
    expect(v.cy + v.Rh).toBeCloseTo(800 + 24, 3);
  });
  it('mirrors in the southern hemisphere', () => {
    const n = { x: 0, y: 0 }, s = { x: 0, y: 0 };
    const vn = makeView(1280, 800, false, 40, q), vs = makeView(1280, 800, false, -40, q);
    expect(vs.sg).toBe(-1);
    project(vn, 0, 0.5, 0.8, n);
    project(vs, 0, 0.5, 0.8, s);
    expect(n.y).toBeLessThan(vn.cy);
    expect(s.y).toBeGreaterThan(vs.cy);
  });
  it('hides what is far below the horizon', () => {
    expect(project(makeView(1280, 800, false, 43, q), 1, 0, -0.5, { x: 0, y: 0 })).toBe(false);
  });
  it('the quiet zone is 30% inside and 100% beyond the feather', () => {
    expect(quietFactor(q, 150, 150)).toBeCloseTo(0.3);
    expect(quietFactor(q, 500, 150)).toBeCloseTo(1);
    expect(quietFactor(q, 350, 150)).toBeGreaterThan(0.3);
    expect(quietFactor(q, 350, 150)).toBeLessThan(1);
  });
  it('trail arcs grow with speed and cap', () => {
    expect(trailArc(225)).toBeCloseTo(16, 0);
    expect(trailArc(500)).toBeLessThanOrEqual(26);
    expect(trailArc(500)).toBeGreaterThan(trailArc(100));
    expect(trailSamples(16)).toBe(40);
    expect(trailSamples(26)).toBeLessThanOrEqual(60);
  });
  it('meteors come faster in a shower or a rush, slower on phones', () => {
    expect(meteorInterval(false, 1, 0)).toBe(3500);
    expect(meteorInterval(true, 1, 0)).toBe(4500);
    expect(meteorInterval(false, 5, 0)).toBeLessThan(1000);
    expect(meteorInterval(false, 1, 1)).toBeLessThan(1000);
  });
  it('samples the milky way grid bilinearly and stays in bounds', () => {
    const g = new Uint8Array(360 * 180).fill(255);
    expect(sampleGrid(g, 360, 180, 0, 0)).toBeCloseTo(1);
    expect(sampleGrid(g, 360, 180, 359.9, 89.9)).toBeCloseTo(1);
    expect(sampleGrid(g, 360, 180, 10, -90)).toBeCloseTo(1);
  });
});

describe('place', () => {
  it('knows common zones and falls back from the UTC offset', () => {
    const c = placeFor('America/Chicago', 300);
    expect(c.known).toBe(true);
    expect(c.lat).toBeGreaterThan(40);
    const f = placeFor('Nowhere/Land', -330);
    expect(f.known).toBe(false);
    expect(f.lon).toBeCloseTo(82.5);
    expect(f.lat).toBe(38);
    expect(placeFor(undefined, NaN).tz).toBe('UTC');
  });
  it('a previewed period lands on its own wall-clock time', () => {
    const now = Date.UTC(2026, 9, 15, 12, 0, 0);
    const t = instantForPart(now, 'America/Chicago', 'afternoon', 'morning');
    const p = zoneParts(t, 'America/Chicago');
    expect([p.hour, p.minute]).toEqual([14, 30]);
    expect(instantForPart(now, 'America/Chicago', 'morning', 'morning')).toBe(now);
    expect(instantForPart(now, 'America/Chicago', null, 'morning')).toBe(now);
    expect(instantForPart(now, 'Bad/Zone', 'night', 'morning')).toBe(now);
  });
});
