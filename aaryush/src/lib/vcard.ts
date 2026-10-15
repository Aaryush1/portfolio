// vCard 3.0 builder (E6). Pure: no DOM, no storage. The caller supplies the email and phone, assembled at runtime.

const enc = new TextEncoder();
const octets = (s: string) => enc.encode(s).length;

/** Escape a TEXT value: backslash first, then comma, semicolon and line breaks (RFC 6350 section 3.4, same in RFC 2426). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

/** Unbreakable pieces of a line: a grapheme cluster where Intl.Segmenter exists (else a code point); a backslash and what it escapes stay together. */
function atoms(line: string): string[] {
  const segs: string[] =
    typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(line), (s) => s.segment)
      : Array.from(line);
  const out: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i] === '\\' && i + 1 < segs.length) out.push(segs[i] + segs[++i]);
    else out.push(segs[i]);
  }
  return out;
}

/** Fold one content line so no physical line exceeds 75 octets; continuation lines start with one space.
 *  Never breaks inside an escape pair or (where cheap) a grapheme cluster; an oversized cluster falls back to code points. */
export function foldLine(line: string): string {
  if (octets(line) <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let used = 0;
  const push = (piece: string) => {
    const n = octets(piece);
    if (used + n > 75) {
      out.push(cur);
      cur = ' ';
      used = 1;
    }
    cur += piece;
    used += n;
  };
  for (const atom of atoms(line)) {
    if (octets(atom) > 74) for (const ch of atom) push(ch);
    else push(atom);
  }
  out.push(cur);
  return out.join('\r\n');
}

/** Inverse of foldLine, for tests and for any reader of our own output. */
export function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '');
}

const dateFmt = () => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
/** "Wed, Oct 14, 2026", from the scanner's own device clock. */
export function formatSavedDate(d: Date): string {
  return dateFmt().format(d);
}

export interface NoteParts { met: string; topics: string[]; note: string; date: string }
/** The NOTE text. Topics appear by name only; nothing in it is a link. */
export function buildNote({ met, topics, note, date }: NoteParts): string {
  const parts = met ? [`Met at ${met}`, date] : [`Saved ${date}`];
  const talked = [...topics, note].filter(Boolean);
  if (talked.length) parts.push(`Talked about: ${talked.join(', ')}`);
  return parts.join(' · ');
}

export interface Card { given: string; family: string; email: string; phone: string; url: string; note?: string }
export function buildVCard(c: Card): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeText(`${c.given} ${c.family}`)}`,
    `N:${escapeText(c.family)};${escapeText(c.given)};;;`,
    `EMAIL;TYPE=INTERNET,WORK:${escapeText(c.email)}`,
    `TEL;TYPE=CELL:${escapeText(c.phone)}`,
    `URL:${c.url}`,
  ];
  if (c.note) lines.push(`NOTE:${escapeText(c.note)}`);
  lines.push('END:VCARD');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
