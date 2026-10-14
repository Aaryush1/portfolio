import { consoleNote } from '../data/console';

const HEAD = 'font:600 13px ui-monospace,Menlo,Consolas,monospace;color:#B7790A';
const BODY = 'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace';

/** Arguments for one console.log call: a format string with two %c styles, then the styles. */
export function buildNote(): string[] {
  const [first, ...rest] = consoleNote.text;
  const fmt = `%c${first}%c\n${rest.join('\n')}\n\n${consoleNote.art.join('\n')}`;
  return [fmt, HEAD, BODY];
}

/** Logs the note once per document. `g` is the per-document guard (window in the browser). */
export function logNote(c: Console | undefined, g: Record<string, unknown>): void {
  try {
    if (!c || typeof c.log !== 'function' || g.__agNote) return;
    g.__agNote = true;
    c.log(...buildNote());
  } catch { /* the note is optional */ }
}
