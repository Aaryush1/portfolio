import { describe, expect, it } from 'vitest';
import { clean } from '../../src/lib/meet';

describe('clean: links hidden by punctuation or separators are still dropped', () => {
  const cases: [string, string][] = [
    ['(evil.com)', 'evil'],
    ['"evil.com"', 'evil'],
    ['*evil.com*', 'evil'],
    ['[evil.com]', 'evil'],
    ['—evil.com', 'evil'],
    ['see:evil.com', 'evil'],
    ['a/evil.com', 'evil'],
    ['x,evil.com', 'evil'],
    ['evil.com,foo.com', 'com'],
    ['evil_x.com', 'evil'],
    ['(javascript:alert(1))', 'javascript'],
    ['“evil.com”', 'evil'],
    ['{evil.com}', 'evil'],
    ['a|evil.com', 'evil'],
    ['a;evil.com', 'evil'],
    ['x\\evil.com', 'evil'],
    ['evil.com?x=1', 'evil'],
    ['a=evil.com', 'evil'],
    ['(https://evil.example/x)', 'evil'],
    ['<evil.com>', 'evil'],
    ['"data:text/html,x"', 'data:'],
    ['[http:evil]', 'http:'],
  ];
  for (const [input, forbidden] of cases) {
    it(`drops ${JSON.stringify(input)}`, () => {
      const out = clean(`before ${input} after`, 80);
      expect(out.toLowerCase()).not.toContain(forbidden);
      expect(out).toBe('before after');
    });
  }
  it('drops a link at the very start or end of the value', () => {
    expect(clean('(evil.com)', 80)).toBe('');
    expect(clean('hi (evil.com)', 80)).toBe('hi');
  });
  it('does not mistake words that merely contain a scheme name for one', () => {
    expect(clean('Hotel: Hilton, Metadata: none', 80)).toBe('Hotel: Hilton, Metadata: none');
  });
});

describe('clean: the pre-cap is real', () => {
  it('reads at most 1000 characters of a value, whatever the final cap', () => {
    expect(clean('x'.repeat(1000) + ' tail', 2000)).toBe('x'.repeat(1000));
    expect(clean('x'.repeat(999) + ' tail', 2000)).toBe('x'.repeat(999));
  });
});

describe('clean: documented trade-offs', () => {
  it('over-strips anything shaped like a host, on purpose: a missed link in a saved contact is worse than a lost word', () => {
    expect(clean('met Mr.Smith', 80)).toBe('met');
    expect(clean('uses Node.js daily', 80)).toBe('uses daily');
  });
  it('NFKC turns the ellipsis character into three dots (a known side effect of catching full-width lookalikes)', () => {
    expect(clean('hmm… ok', 80)).toBe('hmm... ok');
  });
});
