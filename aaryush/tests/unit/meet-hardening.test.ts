import { describe, expect, it } from 'vitest';
import { clean } from '../../src/lib/meet';

const time = (fn: () => unknown) => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

describe('clean runs in bounded time on hostile input', () => {
  const N = 200_000;
  const shapes: Record<string, string> = {
    'aaaa...': 'a'.repeat(N),
    'a.a.a...': 'a.'.repeat(N / 2),
    'x@x@...': 'x@'.repeat(N / 2),
    'a-a-a... with a final dot': 'a-'.repeat(N / 2) + '.',
    'https:/ repeated': 'https:/ '.repeat(N / 8),
    'long run of dots': '.'.repeat(N),
    'long run of punctuation then text': '!'.repeat(N) + 'a',
    'many spaces': ' '.repeat(N) + 'x',
    'unicode lookalikes': 'ａ．'.repeat(N / 2),
  };
  for (const [name, input] of Object.entries(shapes)) {
    it(`${name}: under 50ms for 200,000 characters`, () => {
      clean(input, 60); // warm up
      expect(time(() => clean(input, 60))).toBeLessThan(50);
      expect(time(() => clean(input, 80))).toBeLessThan(50);
    });
  }
  it('looks only at the first part of a huge input', () => {
    expect(clean('ok ' + 'x'.repeat(100_000), 80)).toBe('ok ' + 'x'.repeat(77));
    // a link far beyond the cap can never matter, and nothing past the cap is read
    expect(clean('a'.repeat(5000) + ' https://evil.example', 80)).toBe('a'.repeat(80));
  });
});

describe('clean: link coverage', () => {
  it('catches full-width lookalikes after NFKC', () => {
    expect(clean('see ｈｔｔｐｓ：／／ｅｖｉｌ．ｅｘ now', 80)).toBe('see now');
    expect(clean('go ｗｗｗ．ｅｖｉｌ．ｃｏｍ now', 80)).toBe('go now');
    expect(clean('evil。com now', 80)).toBe('now');
  });
  it('catches any label.label host with a letters-only TLD of 2 to 24 characters', () => {
    expect(clean('visit evil.zone now', 80)).toBe('visit now');
    expect(clean('visit shop.example.technology now', 80)).toBe('visit now');
    expect(clean('visit evil.com:8080/x?y#z now', 80)).toBe('visit now');
    expect(clean('evil.xn--p1ai', 80)).not.toContain('evil');
  });
  it('still keeps ordinary prose, abbreviations and numbers', () => {
    expect(clean('Dr. Smith, 3.5 hours, e.g. coffee, U.S.A', 80)).toBe('Dr. Smith, 3.5 hours, e.g. coffee, U.S.A');
    expect(clean('Re: pricing AI agents', 80)).toBe('Re: pricing AI agents');
    expect(clean('v2.0 and 10.5.1', 80)).toBe('v2.0 and 10.5.1');
  });
  it('drops other dangerous schemes', () => {
    for (const s of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:/etc/passwd', 'blob:abc']) expect(clean(s, 80)).toBe('');
  });
});
