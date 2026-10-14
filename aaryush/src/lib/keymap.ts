export type KeyAction = 'map' | 'hero' | 'levels' | 'work' | 'writing' | 'contact' | 'time';

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  keyCode: number;
  /** Focus is in an input, textarea, select or contenteditable element. */
  editable: boolean;
  popupOpen: boolean;
  mapOpen: boolean;
}

const GO: Record<string, KeyAction> = { h: 'hero', l: 'levels', w: 'work', r: 'writing', c: 'contact' };

/**
 * The guards every shortcut shares: IME composition, Ctrl/Meta/Alt, editable fields and the open keyboard map.
 * Pop-ups are left to each caller, because `?` still works inside one.
 */
export function shortcutBlocked(e: KeyInput): boolean {
  // IME composition reports keyCode 229 and/or isComposing.
  if (e.isComposing || e.keyCode === 229) return true;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  return e.editable || e.mapOpen;
}

/** True when the event target is a text field, select or contenteditable element. */
export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || !!t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

/**
 * Pure key interpreter: feed it keydown facts, it returns the action to run (or null).
 * Timing uses timestamps, not timers, so it is deterministic to test.
 */
export function createKeyRouter(opts: { now?: () => number; timeout?: number; hasTime?: () => boolean } = {}) {
  const now = opts.now ?? (() => performance.now());
  const timeout = opts.timeout ?? 1200;
  const hasTime = opts.hasTime ?? (() => false);
  let pendingAt: number | null = null;

  return {
    handle(e: KeyInput): KeyAction | null {
      const pending = pendingAt !== null && now() - pendingAt <= timeout;
      pendingAt = null;
      if (shortcutBlocked(e)) return null;
      if (e.key === '?') return 'map';
      if (e.popupOpen) return null;
      if (pending && GO[e.key]) return GO[e.key];
      if (e.key === 'g') { pendingAt = now(); return null; }
      if (e.key === 't' && hasTime()) return 'time';
      return null;
    },
  };
}

/**
 * Pure matcher for a typed word (the `contextos` easter egg, spec E8). Feed it keydowns; it returns true on the key that
 * completes the word. Same guards as the shortcuts, and a pop-up blocks it too. A gap longer than `gap` ms between keys
 * starts the word again. Keys that are not characters (Shift, arrows) neither count nor break it. A match clears the
 * buffer, so the word has to be typed again to fire again.
 */
export function createTypedSequence(word: string, opts: { now?: () => number; gap?: number } = {}) {
  const now = opts.now ?? (() => performance.now());
  const gap = opts.gap ?? 1500;
  const target = word.toLowerCase();
  let buf = '';
  let lastAt = -Infinity;

  return {
    handle(e: KeyInput): boolean {
      if (shortcutBlocked(e) || e.popupOpen) { buf = ''; return false; }
      if (e.key.length !== 1) return false;
      const t = now();
      if (t - lastAt > gap) buf = '';
      lastAt = t;
      buf = (buf + e.key.toLowerCase()).slice(-target.length);
      if (buf !== target) return false;
      buf = '';
      return true;
    },
  };
}
