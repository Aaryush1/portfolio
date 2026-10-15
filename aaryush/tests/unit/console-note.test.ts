import { describe, expect, it } from 'vitest';
import { consoleNote } from '../../src/data/console';
import { buildNote, buildSkyNote, logNote, logSkyNote } from '../../src/lib/console-note';
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

describe('the sky line in the console', () => {
  it('is one line with a star count and the visitor sky, in the note style', () => {
    const [fmt, ...styles] = buildSkyNote(5044, 43.07, -89.4);
    expect(String(fmt)).toBe('%c✦%c 5,044 stars · Hipparcos via d3-celestial · your sky over 43.1°N 89.4°W · from your time zone');
    expect(String(buildSkyNote(5044, 43.07, -89.4, 'connection')[0])).toContain('89.4°W · from your connection');
    expect(String(buildSkyNote(5044, 43.0731, -89.4012, 'device')[0])).toContain('43.07°N 89.40°W · from your device');
    expect(styles).toHaveLength(2);
    expect(String(fmt)).not.toContain('\n');
    expect(String(buildSkyNote(100, -33.9, 151.2)[0])).toContain('33.9°S 151.2°E');
  });
  it('logs once per document and never throws', () => {
    const calls: unknown[][] = [];
    const g: Record<string, unknown> = {};
    const c = { log: (...a: unknown[]) => calls.push(a) } as unknown as Console;
    logSkyNote(c, g, 5044, 43, -89);
    logSkyNote(c, g, 5044, 43, -89);
    expect(calls).toHaveLength(1);
    expect(() => logSkyNote(undefined, {}, 1, 1, 1)).not.toThrow();
  });
});
