/**
 * The writing room's light, per period of the day. Pure data so it can be tested without a DOM.
 * The pool is the star at every hour; only the window light changes with the day.
 */
import type { Daypart } from './daypart';

export interface RoomLight {
  /** Colour of the window light shafts. */
  windowColor: [number, number, number];
  /** 0 to 1. Afternoon is deliberately low: the prototype's 0.2 read as too bright. */
  windowAlpha: number;
  /** Offset of the objects' cast shadows, in px. */
  windowOffset: { x: number; y: number };
  /** Blur of the objects' cast shadows, in px. */
  shadowBlur: number;
  /** Multiplier on the pool's strength. */
  poolPeak: number;
}

const TABLE: Record<Daypart, RoomLight> = {
  morning: { windowColor: [196, 214, 244], windowAlpha: 0.12, windowOffset: { x: 20, y: 12 }, shadowBlur: 22, poolPeak: 0.8 },
  afternoon: { windowColor: [255, 238, 210], windowAlpha: 0.12, windowOffset: { x: 40, y: 22 }, shadowBlur: 30, poolPeak: 0.9 },
  evening: { windowColor: [255, 160, 90], windowAlpha: 0.075, windowOffset: { x: 10, y: 12 }, shadowBlur: 24, poolPeak: 1 },
  night: { windowColor: [0, 0, 0], windowAlpha: 0, windowOffset: { x: 0, y: 0 }, shadowBlur: 24, poolPeak: 1.25 },
};

export function roomLight(d: Daypart): RoomLight {
  return TABLE[d];
}

/** Index of the rect whose centre is closest to the middle of the viewport (first wins a tie); -1 for none. */
export function nearestToCenter(rects: ReadonlyArray<{ top: number; height: number }>, viewportH: number): number {
  let best = -1;
  let bestD = Infinity;
  rects.forEach((r, i) => {
    const d = Math.abs(r.top + r.height / 2 - viewportH / 2);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
