import { describe, expect, it } from 'vitest';
import { buildNote, buildVCard, escapeText, foldLine, formatSavedDate, unfold } from '../../src/lib/vcard';

const octets = (s: string) => new TextEncoder().encode(s).length;
/** A deliberately small vCard 3.0 parser, used only to check what buildVCard emits. */
function parse(text: string) {
  const lines = unfold(text).split('\r\n').filter(Boolean);
  const fields: Record<string, string> = {};
  for (const l of lines) {
    const i = l.indexOf(':');
    const key = l.slice(0, i).split(';')[0];
    fields[key] = l.slice(i + 1);
  }
  const unescape = (v: string) => v.replace(/\\([\\,;nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
  return { lines, fields, unescape };
}

describe('escapeText (RFC 6350 / vCard 3.0)', () => {
  it('escapes backslash, comma, semicolon and newline', () => {
    expect(escapeText('a\\b')).toBe('a\\\\b');
    expect(escapeText('a,b')).toBe('a\\,b');
    expect(escapeText('a;b')).toBe('a\\;b');
    expect(escapeText('a\nb')).toBe('a\\nb');
    expect(escapeText('a\r\nb')).toBe('a\\nb');
    expect(escapeText('a\rb')).toBe('a\\nb');
  });
  it('escapes the backslash first so it never double-escapes', () => {
    expect(escapeText('\\,')).toBe('\\\\\\,');
    expect(escapeText('\\n')).toBe('\\\\n');
  });
  it('leaves plain text and unicode alone', () => {
    expect(escapeText('Madison AI Week · café 😀')).toBe('Madison AI Week · café 😀');
  });
});

describe('foldLine', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('NOTE:hi')).toBe('NOTE:hi');
  });
  it('keeps every physical line within 75 octets and unfolds back to the original', () => {
    const line = 'NOTE:' + 'word '.repeat(80);
    const folded = foldLine(line);
    for (const l of folded.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(unfold(folded)).toBe(line);
  });
  it('counts octets, not characters, and never splits a multi-byte character', () => {
    const line = 'NOTE:' + 'é😀'.repeat(60);
    const folded = foldLine(line);
    for (const l of folded.split('\r\n')) {
      expect(octets(l)).toBeLessThanOrEqual(75);
      expect(l).not.toMatch(/�/);
    }
    expect(unfold(folded)).toBe(line);
  });
  it('folds at the 75-octet boundary: 75 stays whole, 76 folds', () => {
    expect(foldLine('x'.repeat(75))).toBe('x'.repeat(75));
    expect(foldLine('x'.repeat(76)).split('\r\n')).toHaveLength(2);
  });
});

describe('formatSavedDate', () => {
  it('uses the en-US short form', () => {
    expect(formatSavedDate(new Date(2026, 9, 14, 12))).toBe('Wed, Oct 14, 2026');
  });
});

describe('buildNote', () => {
  const date = 'Wed, Oct 14, 2026';
  it('with no context: only the save date', () => {
    expect(buildNote({ met: '', topics: [], note: '', date })).toBe('Saved Wed, Oct 14, 2026');
  });
  it('with everything: where, date, topics by name, free text', () => {
    expect(buildNote({ met: 'Madison AI Week', topics: ['Engineering loop'], note: 'pricing AI agents', date })).toBe(
      'Met at Madison AI Week · Wed, Oct 14, 2026 · Talked about: Engineering loop, pricing AI agents',
    );
  });
  it('without where, the date reads as a save date', () => {
    expect(buildNote({ met: '', topics: ['Writing'], note: '', date })).toBe('Saved Wed, Oct 14, 2026 · Talked about: Writing');
  });
  it('where only', () => {
    expect(buildNote({ met: 'Coffee', topics: [], note: '', date })).toBe('Met at Coffee · Wed, Oct 14, 2026');
  });
});

describe('buildVCard', () => {
  const base = {
    given: 'Aaryush', family: 'Gupta', email: 'x@example.test', phone: '+1 555 010 0000', url: 'https://aaryush.com',
    note: 'Met at Madison AI Week · Wed, Oct 14, 2026 · Talked about: Engineering loop, pricing AI agents',
  };
  it('is a vCard 3.0 with CRLF line endings and every field', () => {
    const v = buildVCard(base);
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
    expect(v).not.toMatch(/[^\r]\n/);
    const { fields } = parse(v);
    expect(fields.FN).toBe('Aaryush Gupta');
    expect(fields.N).toBe('Gupta;Aaryush;;;');
    expect(fields.EMAIL).toBe('x@example.test');
    expect(fields.TEL).toBe('+1 555 010 0000');
    expect(fields.URL).toBe('https://aaryush.com');
  });
  it('keeps the note intact through escaping and unfolding', () => {
    const { fields, unescape } = parse(buildVCard(base));
    expect(unescape(fields.NOTE)).toBe(base.note);
    expect(fields.NOTE).toContain('Engineering loop\\, pricing AI agents');
  });
  it('escapes hostile note text so it cannot add a property or end the card', () => {
    const evil = 'x\r\nEND:VCARD\r\nBEGIN:VCARD\r\nTEL:666; a,b \\ c';
    const v = buildVCard({ ...base, note: evil });
    const { lines, unescape, fields } = parse(v);
    expect(lines.filter((l) => l === 'END:VCARD')).toHaveLength(1);
    expect(lines.filter((l) => l === 'BEGIN:VCARD')).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith('TEL'))).toHaveLength(1);
    expect(unescape(fields.NOTE)).toBe(evil.replace(/\r\n/g, '\n'));
  });
  it('folds a long note and every physical line stays within 75 octets', () => {
    const v = buildVCard({ ...base, note: 'é, '.repeat(80) });
    for (const l of v.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
    const p = parse(v);
    expect(p.unescape(p.fields.NOTE)).toBe('é, '.repeat(80));
  });
  it('omits NOTE when there is none to write', () => {
    expect(buildVCard({ ...base, note: '' })).not.toContain('NOTE');
  });
});
