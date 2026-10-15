import { describe, expect, it } from 'vitest';
import { LIMITS, buildMeetUrl, clean, cleanAbout, parseMeet, stripMeetParams, summary } from '../../src/lib/meet';

const known = { 'ready-rebound-loop': 'Engineering loop', 'cylerity-intake': 'Engineering intake', advisory: 'Gupta Advisory', writing: 'Writing' };

describe('clean (where and note)', () => {
  it('trims and collapses whitespace, newlines and tabs', () => {
    expect(clean('  Madison \n\t AI   Week  ', 60)).toBe('Madison AI Week');
  });
  it('caps where at 60 and note at 80 characters', () => {
    expect(clean('a'.repeat(100), LIMITS.where)).toHaveLength(60);
    expect(clean('a'.repeat(100), LIMITS.note)).toHaveLength(80);
  });
  it('caps by character, never splitting an emoji or leaving a lone surrogate', () => {
    const out = clean('😀'.repeat(100), 60);
    expect(Array.from(out)).toHaveLength(60);
    expect(out).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });
  it('keeps ordinary unicode', () => {
    expect(clean('Café Müller 東京', 60)).toBe('Café Müller 東京');
  });
  it('drops angle brackets, control and bidi characters', () => {
    const out = clean('<script>alert(1)</script>\u0000‮ x', 60);
    expect(out).not.toMatch(/[<>\u0000‮]/);
    expect(out).toContain('x');
  });
  it('drops links, www hosts, bare domains and email-like tokens', () => {
    expect(clean('see https://evil.example/x?y=1 now', 80)).toBe('see now');
    expect(clean('go to www.evil.example today', 80)).toBe('go to today');
    expect(clean('visit evil.com/pay or me@evil.io', 80)).toBe('visit or');
    expect(clean('javascript:alert(1)', 80)).not.toMatch(/javascript:/i);
  });
  it('keeps ordinary prose that merely contains dots', () => {
    expect(clean('Dr. Smith, 3.5 hours', 80)).toBe('Dr. Smith, 3.5 hours');
  });
  it('returns an empty string for non-strings and blanks', () => {
    expect(clean(undefined, 60)).toBe('');
    expect(clean(null, 60)).toBe('');
    expect(clean('   ', 60)).toBe('');
  });
});

describe('cleanAbout', () => {
  it('keeps known slugs in order', () => {
    expect(cleanAbout('ready-rebound-loop,writing', known)).toEqual(['ready-rebound-loop', 'writing']);
  });
  it('drops unknown slugs, repeated slugs and empties', () => {
    expect(cleanAbout('nope,writing,,writing,<script>', known)).toEqual(['writing']);
  });
  it('keeps at most two', () => {
    expect(cleanAbout('writing,advisory,cylerity-intake,ready-rebound-loop', known)).toEqual(['writing', 'advisory']);
  });
  it('does not match inherited object keys', () => {
    expect(cleanAbout('constructor,__proto__,toString,hasOwnProperty', known)).toEqual([]);
  });
  it('handles missing and non-string input', () => {
    expect(cleanAbout(null, known)).toEqual([]);
    expect(cleanAbout(undefined, known)).toEqual([]);
  });
});

describe('parseMeet', () => {
  it('reads met, about and note', () => {
    expect(parseMeet('?met=Madison%20AI%20Week&about=ready-rebound-loop&note=pricing+AI+agents', known)).toEqual({
      met: 'Madison AI Week', about: ['ready-rebound-loop'], note: 'pricing AI agents',
    });
  });
  it('returns null when none of the three params is present', () => {
    expect(parseMeet('', known)).toBeNull();
    expect(parseMeet('?utm_source=x&foo=bar', known)).toBeNull();
  });
  it('returns null when params are present but nothing survives cleaning', () => {
    expect(parseMeet('?met=&about=nope&note=%20%20', known)).toBeNull();
    expect(parseMeet('?met=https://evil.example', known)).toBeNull();
  });
  it('survives malformed percent-encoding', () => {
    expect(() => parseMeet('?met=%E0%A4%A&note=%', known)).not.toThrow();
  });
  it('uses the first value when a param repeats', () => {
    expect(parseMeet('?met=A&met=B', known)?.met).toBe('A');
  });
});

describe('stripMeetParams', () => {
  it('removes only met, about and note, and keeps other params and the hash', () => {
    const u = new URL('https://aaryush.com/?a=1&met=x&about=writing&note=y&b=2#work');
    expect(stripMeetParams(u)).toBe('/?a=1&b=2#work');
  });
  it('leaves a clean path when nothing else remains', () => {
    expect(stripMeetParams(new URL('https://aaryush.com/?met=x'))).toBe('/');
    expect(stripMeetParams(new URL('https://aaryush.com/work/cylerity?met=x#top'))).toBe('/work/cylerity#top');
  });
});

describe('buildMeetUrl', () => {
  const base = 'https://aaryush.com';
  it('is the plain site URL when nothing is set', () => {
    expect(buildMeetUrl(base, { met: '', about: [], note: '' }, known)).toBe('https://aaryush.com/card');
  });
  it('encodes met, about and note, in that order, omitting empty ones', () => {
    expect(buildMeetUrl(base, { met: 'Madison AI Week', about: ['ready-rebound-loop', 'writing'], note: 'pricing AI agents' }, known)).toBe(
      'https://aaryush.com/card?met=Madison%20AI%20Week&about=ready-rebound-loop,writing&note=pricing%20AI%20agents',
    );
    expect(buildMeetUrl(base, { met: '', about: ['writing'], note: '' }, known)).toBe('https://aaryush.com/card?about=writing');
  });
  it('encodes reserved characters so the values cannot add params', () => {
    const url = buildMeetUrl(base, { met: 'a&b=c#d', about: [], note: '' }, known);
    const p = new URL(url).searchParams;
    expect(p.get('met')).toBe('a&b=c#d');
    expect([...p.keys()]).toEqual(['met']);
    expect(new URL(url).hash).toBe('');
  });
  it('round-trips through parseMeet, unicode included', () => {
    const m = { met: 'Café 東京 😀', about: ['advisory'], note: 'a, b; c' };
    expect(parseMeet(new URL(buildMeetUrl(base, m, known)).search, known)).toEqual(m);
  });
  it('cleans its input, so a long or hostile value cannot reach the QR', () => {
    const url = buildMeetUrl(base, { met: 'x'.repeat(200), about: ['nope', 'writing', 'writing'], note: '<b>' + 'y'.repeat(200) }, known);
    const m = parseMeet(new URL(url).search, known)!;
    expect(m.met).toHaveLength(60);
    expect(m.note.length).toBeLessThanOrEqual(80);
    expect(m.about).toEqual(['writing']);
  });
});

describe('summary (the caption under the QR)', () => {
  it('is empty when nothing is set', () => {
    expect(summary({ met: '', about: [], note: '' }, known)).toBe('');
  });
  it('lists where, then topics by name, then free text', () => {
    expect(summary({ met: 'Madison AI Week', about: ['ready-rebound-loop'], note: '' }, known)).toBe('Met at Madison AI Week · talked about Engineering loop');
    expect(summary({ met: '', about: ['writing'], note: 'pricing AI agents' }, known)).toBe('Talked about Writing, pricing AI agents');
  });
});
