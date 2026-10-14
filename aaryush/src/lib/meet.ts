// "Where we met" context (E6). Pure: no DOM, no storage. Everything here treats its input as hostile text.

export const LIMITS = { where: 60, note: 80, topics: 2 } as const;
export const PARAMS = ['met', 'about', 'note'] as const;

export interface Meet { met: string; about: string[]; note: string }
/** slug -> display name */
export type Known = Readonly<Record<string, string>>;

const CONTROL = new RegExp('[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]', 'g');
// Links are never kept: schemes, www hosts, email-like tokens and bare domains.
const LINKS = [
  /\b[a-z][a-z0-9+.-]*:\/\/\S*/gi,
  /\b(?:javascript|data|vbscript|mailto|tel|sms):\S*/gi,
  /\bwww\.\S*/gi,
  /\S+@\S+/g,
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|ai|co|dev|app|edu|gov|us|me|xyz|info|ly|uk|de|ca)\b\S*/gi,
];

/** Trim, drop control/bidi characters, angle brackets and links, collapse whitespace, cap by character. */
export function clean(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFC').replace(/[\t\r\n]/g, ' ').replace(CONTROL, '').replace(/[<>]/g, '');
  for (const re of LINKS) s = s.replace(re, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, max).join('').trim();
}

/** Keep known, distinct slugs, at most LIMITS.topics, in the order given. Accepts "a,b" or an array. */
export function cleanAbout(raw: unknown, known: Known): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const out: string[] = [];
  for (const item of list) {
    const slug = typeof item === 'string' ? item.trim() : '';
    if (Object.prototype.hasOwnProperty.call(known, slug) && !out.includes(slug)) out.push(slug);
    if (out.length >= LIMITS.topics) break;
  }
  return out;
}

export function cleanMeet(m: { met?: unknown; about?: unknown; note?: unknown }, known: Known): Meet {
  return { met: clean(m.met, LIMITS.where), about: cleanAbout(m.about, known), note: clean(m.note, LIMITS.note) };
}

export const isEmpty = (m: Meet) => !m.met && !m.note && m.about.length === 0;

export function hasMeetParams(search: string): boolean {
  const p = new URLSearchParams(search);
  return PARAMS.some((k) => p.has(k));
}

/** The sanitized context in a query string, or null when none of the params is present or nothing survives cleaning. */
export function parseMeet(search: string, known: Known): Meet | null {
  const p = new URLSearchParams(search);
  const m = cleanMeet({ met: p.get('met'), about: p.get('about'), note: p.get('note') }, known);
  return isEmpty(m) ? null : m;
}

/** path + remaining query + hash, with met/about/note removed. */
export function stripMeetParams(u: URL): string {
  const p = new URLSearchParams(u.search);
  for (const k of PARAMS) p.delete(k);
  const q = p.toString();
  return u.pathname + (q ? '?' + q : '') + u.hash;
}

/** The URL the QR encodes: base + "/?met=…&about=a,b&note=…", omitting what is empty. */
export function buildMeetUrl(base: string, input: Meet, known: Known): string {
  const m = cleanMeet(input, known);
  const q: string[] = [];
  if (m.met) q.push('met=' + encodeURIComponent(m.met));
  if (m.about.length) q.push('about=' + m.about.map(encodeURIComponent).join(','));
  if (m.note) q.push('note=' + encodeURIComponent(m.note));
  return base.replace(/\/+$/, '') + '/' + (q.length ? '?' + q.join('&') : '');
}

/** Quiet caption under the QR: what will be saved on the other side. */
export function summary(m: Meet, known: Known): string {
  const talked = [...m.about.map((s) => known[s]).filter(Boolean), m.note].filter(Boolean).join(', ');
  const parts: string[] = [];
  if (m.met) parts.push(`Met at ${m.met}`);
  if (talked) parts.push(m.met ? `talked about ${talked}` : `Talked about ${talked}`);
  return parts.join(' · ');
}
