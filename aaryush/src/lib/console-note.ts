import { consoleNote } from '../data/console';

const HEAD = 'font:600 13px ui-monospace,Menlo,Consolas,monospace;color:#B7790A';
const BODY = 'font:12px/1.5 ui-monospace,Menlo,Consolas,monospace';

/** Arguments for one console.log call: a format string with two %c styles, then the styles. */
export function buildNote(): string[] {
  const [first, ...rest] = consoleNote.text;
  const fmt = `%c${first}%c\n${rest.join('\n')}\n\n${consoleNote.art.join('\n')}`;
  return [fmt, HEAD, BODY];
}

/**
 * The one line that follows once the sky's full catalogue has landed. Same two-style format as the note.
 * Draft wording (copy-review section 19), proposed by the controller.
 */
export type LocationSource = 'zone' | 'connection' | 'device';
const FROM: Record<LocationSource, string> = { zone: 'from your time zone', connection: 'from your connection', device: 'from your device' };
export function buildSkyNote(count: number, lat: number, lon: number, source: LocationSource = 'zone'): string[] {
  const d = source === 'device' ? 2 : 1;
  const place = `${Math.abs(lat).toFixed(d)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(d)}°${lon >= 0 ? 'E' : 'W'}`;
  const n = Math.round(count).toLocaleString('en-US');
  return [`%c✦%c ${n} stars · Hipparcos via d3-celestial · your sky over ${place} · ${FROM[source]}`, HEAD, BODY];
}

/** Logs the sky line once per document. */
export function logSkyNote(c: Console | undefined, g: Record<string, unknown>, count: number, lat: number, lon: number, source: LocationSource = 'zone'): void {
  try {
    if (!c || typeof c.log !== 'function' || g.__agSkyNote) return;
    g.__agSkyNote = true;
    c.log(...buildSkyNote(count, lat, lon, source));
  } catch { /* optional */ }
}

/** Logs the note once per document. `g` is the per-document guard (window in the browser). */
export function logNote(c: Console | undefined, g: Record<string, unknown>): void {
  try {
    if (!c || typeof c.log !== 'function' || g.__agNote) return;
    g.__agNote = true;
    c.log(...buildNote());
  } catch { /* the note is optional */ }
}
