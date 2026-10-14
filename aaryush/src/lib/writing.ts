export const KNOWN_KINDS = ['letter', 'paper'] as const;
export type KnownKind = (typeof KNOWN_KINDS)[number];

export function wordCount(body: string): number {
  return body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

/** 230 words per minute, rounded, never below one minute. */
export function readingMinutes(words: number): number {
  if (!Number.isFinite(words) || words <= 0) return 1;
  return Math.max(1, Math.round(words / 230));
}

/** Kinds the desk has an object for. Anything else renders as a plain sheet (spec W1). */
export function knownKind(kind: string): KnownKind | 'sheet' {
  return (KNOWN_KINDS as readonly string[]).includes(kind) ? (kind as KnownKind) : 'sheet';
}

export function pieceLabel(title: string, kind: string, minutes: number): string {
  return `${title} — ${kind}, ${minutes} min read`;
}

export interface PieceView {
  slug: string;
  title: string;
  subtitle: string;
  kind: string;
  shape: KnownKind | 'sheet';
  date: Date;
  minutes: number;
  why?: string;
  breakdown: { label: string; gist?: string }[];
}

/** Structural input, so this module stays free of `astro:content` and runs under Vitest. */
export interface WritingEntry {
  id: string;
  body?: string;
  data: {
    title: string;
    subtitle: string;
    kind: string;
    date: Date;
    why?: string;
    breakdown?: { label: string; gist?: string }[];
  };
}

export function toPieceView(entry: WritingEntry): PieceView {
  const d = entry.data;
  return {
    slug: entry.id,
    title: d.title,
    subtitle: d.subtitle,
    kind: d.kind,
    shape: knownKind(d.kind),
    date: d.date,
    minutes: readingMinutes(wordCount(entry.body ?? '')),
    why: d.why,
    breakdown: d.breakdown ?? [],
  };
}
