import { describe, expect, it } from 'vitest';
import { arrivalRoles, changedLetters, classifyWords, morphTiming } from '../../src/lib/morph-timing';
import { site } from '../../src/data/site';

describe('changedLetters', () => {
  it('counts the letters that must change, ignoring spaces', () => {
    expect(changedLetters('how a problem gets solved', 'how problems get solved')).toBe(2);
    expect(changedLetters('same', 'same')).toBe(0);
    expect(changedLetters('abc', 'xyz')).toBe(3);
  });
});

describe('morphTiming', () => {
  it('runs a tiny change about twice as fast with a shorter hold, and flags the amber highlight', () => {
    const tiny = morphTiming(2), full = morphTiming(30);
    expect(tiny.scale).toBe(0.5);
    expect(tiny.tiny).toBe(true);
    expect(full).toEqual({ scale: 1, hold: 1500, tiny: false });
    expect(tiny.hold).toBeLessThan(full.hold);
  });
  it('scales monotonically between the minimum and the full values', () => {
    let prev = morphTiming(0);
    for (let n = 1; n <= 20; n++) {
      const t = morphTiming(n);
      expect(t.scale).toBeGreaterThanOrEqual(prev.scale);
      expect(t.hold).toBeGreaterThanOrEqual(prev.hold);
      expect(t.scale).toBeLessThanOrEqual(1);
      prev = t;
    }
  });
  it('gives only the first approved step the quick treatment', () => {
    const { subjects, settled } = site.hero;
    const seq = [...subjects, `${settled.before}${settled.em}${settled.after}`];
    const scales = seq.slice(1).map((s, i) => morphTiming(changedLetters(seq[i], s)).scale);
    expect(scales[0]).toBeLessThan(0.7);
    for (const s of scales.slice(1)) expect(s).toBeGreaterThan(scales[0]);
  });
});

describe('arrival roles: main versus incidental', () => {
  it('the word with most arriving letters is main, other changed words are incidental', () => {
    expect(classifyWords([0, 6, 1, 0])).toEqual(['none', 'main', 'incidental', 'none']);
    expect(classifyWords([0, 0])).toEqual(['none', 'none']);
    expect(classifyWords([2, 2])).toEqual(['main', 'incidental']);
  });
  it('a single changed word is the main change', () => {
    const roles = arrivalRoles('how a problem gets solved', 'how problems get solved');
    expect(roles.filter((r) => r === 'main')).toHaveLength(1);
    expect(roles.filter((r) => r === 'incidental')).toHaveLength(0);
  });
  it('the final step: "anyone" is main, the extra s on "solves" is incidental', () => {
    const { subjects, settled } = site.hero;
    const last = subjects[subjects.length - 1];
    const roles = arrivalRoles(last, `${settled.before}${settled.em}${settled.after}`);
    expect(roles).toEqual(['none', 'main', 'incidental', 'none']);
  });
});
