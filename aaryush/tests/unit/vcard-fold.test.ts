import { describe, expect, it } from 'vitest';
import { foldLine, unfold } from '../../src/lib/vcard';

const octets = (s: string) => new TextEncoder().encode(s).length;

describe('foldLine is escape-aware', () => {
  it('never breaks between a backslash and the character it escapes', () => {
    // 'NOTE:' + 69 x = 74 octets; the escape pair would straddle the 75-octet limit
    const line = 'NOTE:' + 'x'.repeat(69) + '\\,' + 'yy';
    const folded = foldLine(line);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    expect(physical[0].endsWith('\\')).toBe(false);
    expect(physical[1].startsWith(' \\,')).toBe(true);
    expect(unfold(folded)).toBe(line);
  });
  it('holds for every possible fold position', () => {
    for (let pad = 60; pad < 80; pad++) {
      const line = 'NOTE:' + 'x'.repeat(pad) + ('\\,\\;\\n\\\\' + 'ab').repeat(12);
      const folded = foldLine(line);
      for (const l of folded.split('\r\n')) {
        expect(octets(l)).toBeLessThanOrEqual(75);
        const body = l.replace(/^ /, '');
        const trailing = body.length - body.replace(/\\+$/, '').length;
        expect(trailing % 2, `pad ${pad}`).toBe(0);
      }
      expect(unfold(folded)).toBe(line);
    }
  });
});

describe('foldLine keeps grapheme clusters together where it is cheap', () => {
  it('does not split a ZWJ emoji sequence or a combining mark', () => {
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    const line = 'NOTE:' + 'x'.repeat(66) + family + 'éz';
    const folded = foldLine(line);
    expect(unfold(folded)).toBe(line);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
    expect(folded.split('\r\n').some((l) => l.includes(family))).toBe(true);
    expect(folded.split('\r\n').some((l) => l.includes('é'))).toBe(true);
    for (const l of folded.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
  });
  it('still folds when a single cluster is longer than a line', () => {
    const line = 'NOTE:' + 'a' + '́'.repeat(200);
    const folded = foldLine(line);
    for (const l of folded.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(line);
  });
});
