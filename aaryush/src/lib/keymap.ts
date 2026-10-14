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
      // IME composition reports keyCode 229 and/or isComposing.
      if (e.isComposing || e.keyCode === 229) return null;
      if (e.ctrlKey || e.metaKey || e.altKey) return null;
      if (e.editable || e.mapOpen) return null;
      if (e.key === '?') return 'map';
      if (e.popupOpen) return null;
      if (pending && GO[e.key]) return GO[e.key];
      if (e.key === 'g') { pendingAt = now(); return null; }
      if (e.key === 't' && hasTime()) return 'time';
      return null;
    },
  };
}
