/**
 * Raw input to story steps (prd-probe-home §3). Pure.
 * A wheel burst, meaning events closer together than gapMs, fires at most once, so a trackpad's inertia tail or a hard flick is one beat.
 * The next burst can fire again. Keys the easter eggs use (L, [, ]) are left alone.
 */
export type Step = -1 | 0 | 1;
export interface WheelState { last: number; acc: number; fired: boolean }

export const WHEEL = { gapMs: 180, threshold: 40, lineHeight: 16 } as const;
export const SWIPE = { minPx: 40, maxMs: 800 } as const;

export const wheelStart = (): WheelState => ({ last: -Infinity, acc: 0, fired: false });

export function wheel(s: WheelState, deltaY: number, deltaMode: number, now: number): [WheelState, Step] {
  const px = deltaMode === 1 ? deltaY * WHEEL.lineHeight : deltaMode === 2 ? deltaY * 800 : deltaY;
  const fresh = now - s.last > WHEEL.gapMs;
  const acc = (fresh ? 0 : s.acc) + px;
  const fired = fresh ? false : s.fired;
  if (!fired && Math.abs(acc) >= WHEEL.threshold) return [{ last: now, acc, fired: true }, acc > 0 ? 1 : -1];
  return [{ last: now, acc, fired }, 0];
}

export function swipe(dy: number, dt: number): Step {
  if (dt > SWIPE.maxMs || Math.abs(dy) < SWIPE.minPx) return 0;
  return dy < 0 ? 1 : -1;
}

const FORWARD = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ']);
const BACK = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);

export function key(k: string): Step | null {
  if (FORWARD.has(k)) return 1;
  if (BACK.has(k)) return -1;
  return null;
}
