// vCard 3.0 builder (E6). Pure: no DOM, no storage. The caller supplies the email and phone, assembled at runtime.

const enc = new TextEncoder();
const octets = (s: string) => enc.encode(s).length;

/** Escape a TEXT value: backslash first, then comma, semicolon and line breaks (RFC 6350 section 3.4, same in RFC 2426). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

/** Fold one content line so no physical line exceeds 75 octets; continuation lines start with one space. */
export function foldLine(line: string): string {
  if (octets(line) <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let used = 0;
  let limit = 75;
  for (const ch of line) {
    const n = octets(ch);
    if (used + n > limit) {
      out.push(cur);
      cur = ' ';
      used = 1;
      limit = 75;
    }
    cur += ch;
    used += n;
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
