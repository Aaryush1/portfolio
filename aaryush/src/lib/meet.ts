// "Where we met" context (E6). Pure: no DOM, no storage. Everything here treats its input as hostile text.

export const LIMITS = { where: 60, note: 80, topics: 2 } as const;
export const PARAMS = ['met', 'about', 'note'] as const;

export interface Meet { met: string; about: string[]; note: string }
/** slug -> display name */
export type Known = Readonly<Record<string, string>>;

// Control, zero-width and bidi characters (built from code points so the source holds no invisible characters).
const CONTROL = new RegExp(
  '[' + [[0, 31], [127, 159], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]]
    .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']',
  'g',
);
// Ideographic and half-width full stops count as dots (NFKC already maps the full-width one).
const DOTS = new RegExp('[' + String.fromCharCode(0x3002, 0xff0e, 0xff61) + ']', 'g');

// Links are never kept. Matching is token by token (split on whitespace) with simple anchored tests, so the cost is
// linear and no pattern backtracks across the input. The input is capped before any of it runs.
const RAW_CAP = 1000; // UTF-16 units read from a value, however long it is
// A scheme name anywhere in a token, but not as the tail of a longer word ("Hotel:" is not "tel:").
const SCHEME = /(?<![\p{L}\p{N}])(?:javascript|data|vbscript|mailto|tel|sms|file|blob|https?|ftp):/iu;
const HOST = /^(?:[\p{L}\p{N}_-]+\.)+(?:\p{L}{2,24}|xn--[a-z0-9-]{2,20})$/iu;
// Separators and brackets that can sit in front of, between or after the parts of a link.
const SEPARATORS = /[,;:()[\]{}"'*|\\/<>?#&=“”‘’–—]+/u;
const ALNUM = /[\p{L}\p{N}]/u;

const trimEdges = (s: string) => {
  let a = 0;
  let b = s.length;
  while (a < b && !ALNUM.test(s[a])) a++;
  while (b > a && !ALNUM.test(s[b - 1])) b--;
  return s.slice(a, b);
};

// Over-strips on purpose: anything shaped like label.label with a letters-only TLD is dropped, so "Mr.Smith" and "Node.js"
// go too. A missed link in someone's saved contact is worse than a lost word.
function isLink(token: string): boolean {
  if (token.includes('://') || token.includes('@') || SCHEME.test(token)) return true;
  for (const piece of token.split(SEPARATORS)) {
    const p = trimEdges(piece);
    if (p && (/^www\./i.test(p) || HOST.test(p))) return true;
  }
  return false;
}

/** Cap the raw value, NFKC-normalise (catches full-width lookalike links; side effect: the ellipsis character becomes three dots), drop control/bidi characters, angle brackets and links, collapse whitespace, cap by character. */
export function clean(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  let head = raw.slice(0, RAW_CAP);
  const last = head.charCodeAt(head.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) head = head.slice(0, -1); // never end on half an emoji
  const s = head.normalize('NFKC').replace(DOTS, '.').replace(/[\t\r\n]/g, ' ').replace(CONTROL, '').replace(/[<>]/g, '');
  const kept = s.split(/\s+/).filter((t) => t && !isLink(t)).join(' ');
  return Array.from(kept).slice(0, max).join('').trim();
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
