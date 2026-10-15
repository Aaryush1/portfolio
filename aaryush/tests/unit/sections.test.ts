import { describe, expect, it } from 'vitest';
import { currentSection } from '../../src/lib/sections';

describe('currentSection', () => {
  it('is -1 before the first section starts', () => expect(currentSection([600, 1400], 800)).toBe(-1));
  it('picks the last section whose top is above the midpoint', () => {
    expect(currentSection([-900, 300, 1100], 800)).toBe(1);
    expect(currentSection([-900, -300, 100], 800)).toBe(2);
  });
  it('is -1 for no sections and never NaN', () => {
    expect(currentSection([], 800)).toBe(-1);
    expect(currentSection([Number.NaN], 800)).toBe(-1);
  });
  it('honours a custom ratio', () => expect(currentSection([200], 800, 0.2)).toBe(-1));
});
