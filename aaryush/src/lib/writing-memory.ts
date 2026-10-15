/**
 * What the writing room remembers about a visitor: the furthest section of each piece they have read, and the last piece they
 * opened. One localStorage key, per browser, no backend. Pure over an injected store so it unit-tests; every read and write is
 * guarded, so a store that throws (private windows, blocked site data) simply means nothing is remembered.
 */
export const KEY = 'writing:v1';
/** sessionStorage fallback for the "last opened" slug, so Back still restores focus when localStorage is blocked. */
export const LAST_FALLBACK = 'writing:last';

export interface Memory { v: 1; pieces: Record<string, { sec: number; t: number }>; last?: string }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const empty = (): Memory => ({ v: 1, pieces: {} });

function local(): Store | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}
function session(): Store | undefined {
  try { return typeof sessionStorage === 'undefined' ? undefined : sessionStorage; } catch { return undefined; }
}

function parse(raw: string | null): Memory {
  try {
    if (!raw) return empty();
    const m = JSON.parse(raw);
    if (!m || typeof m !== 'object' || Array.isArray(m) || m.v !== 1) return empty();
    const p = m.pieces;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return empty();
    for (const e of Object.values(p) as any[]) {
      if (!e || typeof e !== 'object' || !Number.isInteger(e.sec) || e.sec < 0 || typeof e.t !== 'number' || !Number.isFinite(e.t)) return empty();
    }
    const out: Memory = { v: 1, pieces: p };
    if (typeof m.last === 'string') out.last = m.last;
    return out;
  } catch { return empty(); }
}

export function readMemory(store: Pick<Storage, 'getItem'> | undefined = local()): Memory {
  try { return store ? parse(store.getItem(KEY)) : empty(); } catch { return empty(); }
}

function write(m: Memory, store: Store | undefined): void {
  try { store?.setItem(KEY, JSON.stringify(m)); } catch { /* storage blocked: nothing is remembered */ }
}

/** Keeps the furthest section reached; clamps to the piece; ignores non-finite input. */
export function noteSection(slug: string, sec: number, total: number, store: Store | undefined = local(), now: number = Date.now()): void {
  if (!Number.isFinite(sec) || !Number.isFinite(total) || total < 1) return;
  const s = Math.min(Math.max(0, Math.floor(sec)), Math.floor(total) - 1);
  const m = readMemory(store);
  const cur = m.pieces[slug];
  if (cur && cur.sec >= s) return;
  m.pieces[slug] = { sec: s, t: now };
  write(m, store);
}

export function noteOpened(slug: string, store: Store | undefined = local(), now: number = Date.now()): void {
  const m = readMemory(store);
  m.pieces[slug] = { sec: m.pieces[slug]?.sec ?? 0, t: now };
  m.last = slug;
  write(m, store);
}

/** The desk records the piece you walked into. Falls back to sessionStorage if localStorage throws. */
export function noteLast(slug: string, store: Store | undefined = local(), fallback: Store | undefined = session()): void {
  try {
    if (!store) throw new Error('no store');
    const m = readMemory(store);
    m.last = slug;
    store.setItem(KEY, JSON.stringify(m));
  } catch {
    try { fallback?.setItem(LAST_FALLBACK, slug); } catch { /* both blocked: the browser default applies */ }
  }
}

export function lastOpened(store: Pick<Storage, 'getItem'> | undefined = local(), fallback: Pick<Storage, 'getItem'> | undefined = session()): string | null {
  const l = readMemory(store).last;
  if (l) return l;
  try { return fallback?.getItem(LAST_FALLBACK) ?? null; } catch { return null; }
}

export function forget(store: Store | undefined = local(), fallback: Store | undefined = session()): void {
  try { store?.removeItem(KEY); } catch { /* ignore */ }
  try { fallback?.removeItem(LAST_FALLBACK); } catch { /* ignore */ }
}

/** True when the entry points at a section the piece really has (a stale or corrupt value does not). */
export function inRange(sec: number, total: number): boolean {
  return !(total > 0 && sec > total - 1);
}

/**
 * A section worth offering, or null: never read past the start, outside the piece, or already at the final section
 * (reaching the end clears the offer).
 */
export function pickup(slug: string, total: number, store: Pick<Storage, 'getItem'> | undefined = local()): { sec: number } | null {
  const e = readMemory(store).pieces[slug];
  if (!e || !Number.isFinite(total)) return null;
  if (e.sec < 1 || e.sec > total - 2) return null;
  return { sec: e.sec };
}
