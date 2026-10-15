/**
 * The essay lamp (E12): the warm light behind an essay grows only while someone is reading it.
 * Pure rules here; scripts/lamp.ts does the DOM work. Nothing here touches the network or storage.
 */
export const LAMP_TICK_MS = 15_000; // how often the lamp is updated: once per tick, no animation loop
export const LAMP_READ_WINDOW_MS = 60_000; // activity this recent still counts as reading
export const LAMP_FULL_MS = 300_000; // about five minutes of reading reaches full warmth

/** 0 at rest, 1 at full warmth. Linear, so it moves only a fraction of the total in any one minute. */
export function warmth(activeMs: number): number {
  if (!Number.isFinite(activeMs) || activeMs <= 0) return 0;
  return Math.min(1, activeMs / LAMP_FULL_MS);
}

/** Reading means the tab is visible and the reader has scrolled or moved within the last minute. */
export function isReading(s: { visible: boolean; lastActivityAt: number; now: number }): boolean {
  return s.visible && s.now >= s.lastActivityAt && s.now - s.lastActivityAt <= LAMP_READ_WINDOW_MS;
}

/** Each tick adds one tick's worth of reading time, but only while reading. */
export function nextActive(activeMs: number, s: { visible: boolean; lastActivityAt: number; now: number }): number {
  return isReading(s) ? activeMs + LAMP_TICK_MS : activeMs;
}
