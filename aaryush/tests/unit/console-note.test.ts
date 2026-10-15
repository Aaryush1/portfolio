import { describe, expect, it } from 'vitest';
import { consoleNote } from '../../src/data/console';
import { buildNote, logNote } from '../../src/lib/console-note';
import { HOST_NAME, PHONE } from '../contact-fixture';

// The approved console note (copy-review section 14, approved by Aaryush 2026-10-14).
describe('console note', () => {
  it('is the approved text, signed, and points at the keyboard map', () => {
    expect(consoleNote.text[0]).toBe('Hello, fellow inspector.');
    expect(consoleNote.text).toContain('This site was built by talking.');
    expect(consoleNote.text).toContain('Press ? for the keyboard map.');
    expect(consoleNote.text.at(-1)).toBe('— ag.');
  });
  it('draws the approved conversation loop', () => {
    const art = consoleNote.art.join('\n');
    for (const s of ['an idea', 'a conversation', 'spec --> build <==> review', '"not quite."', 'shipped']) expect(art).toContain(s);
    expect(consoleNote.art.every((l) => l.length < 60)).toBe(true);
  });
  it('uses at most two %c styles and no stray format specifiers', () => {
    const [fmt, ...styles] = buildNote();
    expect(styles.length).toBeLessThanOrEqual(2);
    expect((String(fmt).match(/%c/g) ?? []).length).toBe(styles.length);
    expect(String(fmt).replace(/%c/g, '')).not.toMatch(/%[sdifoOjc]/);
  });
  it('never contains contact details', () => {
    const all = [...consoleNote.text, ...consoleNote.art, ...buildNote().map(String)].join('\n').toLowerCase();
    for (const s of ['@', HOST_NAME, 'mailto', 'tel:', ...PHONE.split(' '), 'gmail']) expect(all).not.toContain(s);
  });
  it('logs once per document, even if evaluated again', () => {
    const calls: unknown[][] = [];
    const c = { log: (...a: unknown[]) => { calls.push(a); } } as unknown as Console;
    const g: Record<string, unknown> = {};
    logNote(c, g);
    logNote(c, g);
    expect(calls).toHaveLength(1);
  });
  it('does not throw when console is unavailable or broken', () => {
    expect(() => logNote(undefined, {})).not.toThrow();
    expect(() => logNote({} as Console, {})).not.toThrow();
    const bad = { log: () => { throw new Error('x'); } } as unknown as Console;
    expect(() => logNote(bad, {})).not.toThrow();
  });
});
