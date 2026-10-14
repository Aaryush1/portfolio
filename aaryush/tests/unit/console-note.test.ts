import { describe, expect, it } from 'vitest';
import { consoleNote } from '../../src/data/console';
import { buildNote, logNote } from '../../src/lib/console-note';

describe('console note', () => {
  it('has under 8 lines of text, signs off, and points at the keyboard map', () => {
    expect(consoleNote.text.length).toBeLessThan(8);
    expect(consoleNote.text.at(-1)).toBe('— ag.');
    expect(consoleNote.text.join(' ')).toContain('?');
  });
  it('draws the engineering loop', () => {
    const art = consoleNote.art.join('\n');
    for (const s of ['Ticket', 'Spec & decisions', 'Implement', 'Review', 'Docs', 'PR', 'Browser QA', 'person']) expect(art).toContain(s);
  });
  it('uses at most two %c styles and no stray format specifiers', () => {
    const [fmt, ...styles] = buildNote();
    expect(styles.length).toBeLessThanOrEqual(2);
    expect((String(fmt).match(/%c/g) ?? []).length).toBe(styles.length);
    expect(String(fmt).replace(/%c/g, '')).not.toMatch(/%[sdifoOjc]/);
  });
  it('never contains contact details', () => {
    const all = [...consoleNote.text, ...consoleNote.art, ...buildNote().map(String)].join('\n').toLowerCase();
    for (const s of ['@', 'outlook', 'mailto', 'tel:', '949', '331', '2850', 'gmail']) expect(all).not.toContain(s);
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
