import { describe, expect, it } from 'vitest';
import { equalStarts, progressAt, sectionAtProgress, segmentBounds, startsFromWords, tickStarts } from '../../src/lib/reading-bar';

describe('reading bar breaks', () => {
  it('positions section starts by cumulative words, so a longer section takes more of the bar', () => {
    const s = startsFromWords([0, 100, 400, 500], 1000);
    expect(s).toEqual([0, 0.1, 0.4, 0.5]);
    const [a, b] = segmentBounds(s, 2)!;
    const [c, d] = segmentBounds(s, 1)!;
    expect(d - c).toBeGreaterThan(b - a); // the 300-word section takes more bar than the 100-word one
  });
  it('clamps, and survives an empty piece', () => {
    expect(startsFromWords([0, 2000], 1000)).toEqual([0, 1]);
    expect(startsFromWords([0, 5], 0)).toEqual([0, 0]);
  });
  it('splits a letter into equal parts', () => {
    expect(equalStarts(4)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(equalStarts(0)).toEqual([]);
  });
  it('draws no tick at the very start or end', () => {
    expect(tickStarts([0, 0.1, 0.5, 1])).toEqual([0.1, 0.5]);
  });
  it('the last section runs to the end of the bar; no such section is null', () => {
    expect(segmentBounds([0, 0.5], 1)).toEqual([0.5, 1]);
    expect(segmentBounds([0, 0.5], -1)).toBeNull();
    expect(segmentBounds([0, 0.5], 2)).toBeNull();
  });
  it('the fill reaches a break just as its heading reaches the reading line, even when words and pixels disagree', () => {
    // 1000px article; section 2 starts at 600px but only 30% of the words
    const offsets = [0, 600], starts = [0, 0.3];
    expect(progressAt(600, offsets, starts, 1000)).toBeCloseTo(0.3);
    expect(progressAt(300, offsets, starts, 1000)).toBeCloseTo(0.15);
    expect(progressAt(800, offsets, starts, 1000)).toBeCloseTo(0.65);
    expect(progressAt(0, offsets, starts, 1000)).toBe(0);
    expect(progressAt(1000, offsets, starts, 1000)).toBe(1);
    expect(progressAt(-50, offsets, starts, 1000)).toBe(0);
  });
  it('handles a preface before the first heading, and no headings at all', () => {
    expect(progressAt(100, [200], [0.2], 1000)).toBeCloseTo(0.1);
    expect(progressAt(500, [], [], 1000)).toBeCloseTo(0.5);
    expect(progressAt(5, [0, 0], [0, 0], 0)).toBe(1);
  });
  it('the current section is the last one the fill has reached', () => {
    expect(sectionAtProgress([0.1, 0.4, 0.7], 0.05)).toBe(-1);
    expect(sectionAtProgress([0.1, 0.4, 0.7], 0.4)).toBe(1);
    expect(sectionAtProgress([0.1, 0.4, 0.7], 1)).toBe(2);
    expect(sectionAtProgress([0, 0.5], 0)).toBe(0);
  });
});
