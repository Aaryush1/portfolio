/**
 * The visitor's time-of-day preview, shared by every page with a daypart consumer (the hero field and the writing room).
 * `t` steps it: morning, afternoon, evening, night, then auto (the clock). It lives in sessionStorage so it survives
 * navigation within the tab; if storage is blocked it stays in memory for this page only.
 * Changes are announced with a `daypart:change` event on document, detail { part, name }.
 */
import { currentDaypart as periodFor, isDaypart, nextPreview, type Daypart } from '../lib/daypart';

const KEY = 'daypart:override';
/** undefined until first read; then the current override (null = auto). */
let memory: Daypart | null | undefined;

export function getOverride(): Daypart | null {
  if (memory !== undefined) return memory;
  try {
    const v = sessionStorage.getItem(KEY);
    memory = isDaypart(v) ? v : null;
  } catch {
    memory = null;
  }
  return memory;
}

function setOverride(v: Daypart | null) {
  memory = v;
  try {
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the in-memory value still applies on this page */
  }
}

/** Steps the override one place and announces it. Returns the new name ('auto' when back on the clock). */
export function cycleOverride(): string {
  const next = nextPreview(getOverride());
  setOverride(next);
  const name = next ?? 'auto';
  document.dispatchEvent(new CustomEvent('daypart:change', { detail: { part: next, name } }));
  return name;
}

/** The period to show now: data-daypart on <html> (tests), then the override, then the clock. */
export function currentDaypart(root: Element = document.documentElement, now: Date = new Date()): Daypart {
  return periodFor(root, now, getOverride());
}

// One hook for every page: `t` in the keyboard map calls cycle(). __heroDaypart stays as an alias.
const w = window as unknown as { __daypart?: { cycle: () => string; get: () => Daypart | null }; __heroDaypart?: () => string };
w.__daypart = { cycle: cycleOverride, get: getOverride };
w.__heroDaypart = cycleOverride;
