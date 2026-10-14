import { describe, expect, it } from 'vitest';
import { knownKind, pieceLabel, readingMinutes, wordCount } from '../../src/lib/writing';

describe('reading time', () => {
  it('uses 230 wpm and rounds', () => {
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(345)).toBe(2); // 1.5 rounds up
    expect(readingMinutes(3220)).toBe(14);
  });
  it('never returns less than one minute, even for nothing', () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(Number.NaN)).toBe(1);
  });
});

describe('wordCount', () => {
  it('ignores html tags and collapses whitespace', () => {
    expect(wordCount('<p>one  two</p>\n\n<p>three &mdash; four</p>')).toBe(5);
  });
  it('is zero for an empty body', () => expect(wordCount('')).toBe(0));
});

describe('knownKind', () => {
  it('passes letter and paper through', () => {
    expect(knownKind('letter')).toBe('letter');
    expect(knownKind('paper')).toBe('paper');
  });
  it('turns anything else into a plain sheet', () => {
    expect(knownKind('zine')).toBe('sheet');
    expect(knownKind('')).toBe('sheet');
  });
});

describe('pieceLabel', () => {
  it('names the link "Title — kind, N min read"', () => {
    expect(pieceLabel('The Quiet Singularity', 'paper', 6)).toBe('The Quiet Singularity — paper, 6 min read');
  });
});
