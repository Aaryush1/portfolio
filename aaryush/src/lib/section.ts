/**
 * Pure geometry and scroll maths for the Fig. 2.1 section schematic (src/scripts/levels.ts).
 * Nothing here touches the DOM, so it is unit tested.
 */
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
export const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export type FloorParams = {
  pad: number; // space above the spine labels and below the last floor
  lbl: number; // height reserved for the spine labels
  base: number; // height of a compact floor
  gap: number; // space between floors
  capH: number; // space reserved at the bottom of the frame (the caption, on phones)
};

/**
 * Floor tops and heights for activation weights `act` (one per floor, summing to 1). The active floor takes whatever room
 * the compact ones leave, so the stack always fills the frame exactly, whatever is mid-transition.
 */
export function floorLayout(H: number, act: number[], p: FloorParams) {
  const n = act.length;
  const full = H - 2 * p.pad - p.lbl - p.capH - (n - 1) * p.gap - (n - 1) * p.base;
  const hs = act.map((v) => p.base + (full - p.base) * v);
  const top = p.pad + p.lbl;
  const ys: number[] = [];
  let y = top;
  hs.forEach((h) => { ys.push(y); y += h + p.gap; });
  return { ys, hs, top, full, mid: ys.map((v, k) => v + hs[k] / 2) };
}

/** How far through the pinned stretch the page is: 0 when the stage sticks, 1 when it lets go. */
export function progress(trackTop: number, stickTop: number, trackH: number, stageH: number): number {
  const span = Math.max(1, trackH - stageH);
  return clamp((stickTop - trackTop) / span, 0, 1);
}

/** The active level (0-based) for a progress value: each level owns the half-step either side of its own mark. */
export function levelAtProgress(s: number, n = 4): number {
  return clamp(Math.round(clamp(s, 0, 1) * (n - 1)), 0, n - 1);
}

/** The scroll distance past the start of the pinned stretch at which level `k` is the active one. */
export function offsetForLevel(k: number, step: number): number {
  return k * step;
}

/** The track is the stage plus one step per level change, and nothing else, so there is no dead scroll. */
export function trackHeight(stageH: number, step: number, n = 4): number {
  return stageH + (n - 1) * step;
}

export type Pt = [number, number];

export function polyLength(pts: Pt[]): number {
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) t += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return t;
}

/** A point `f` (0..1) of the way along a polyline. */
export function polyAt(pts: Pt[], f: number): Pt {
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) lens.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
  let r = clamp(f, 0, 1) * polyLength(pts);
  for (let i = 0; i < lens.length; i++) {
    if (r <= lens[i]) {
      const k = lens[i] ? r / lens[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    r -= lens[i];
  }
  return pts[pts.length - 1];
}

const fx = (n: number) => +n.toFixed(1);
export const pathD = (pts: Pt[]) => 'M' + pts.map((p) => `${fx(p[0])} ${fx(p[1])}`).join(' L');

/** A chevron arrowhead whose tip is at (x, y), pointing along the unit vector (dx, dy). */
export function arrowD(x: number, y: number, dx: number, dy: number, back = 6, side = 4): string {
  return `M${fx(x - dx * back - dy * side)} ${fx(y - dy * back + dx * side)} L${fx(x)} ${fx(y)} L${fx(x - dx * back + dy * side)} ${fx(y - dy * back - dx * side)}`;
}

/** The calm pulse: one pass along the path at `speed` px/s, then a rest. Returns the fraction along (>= 1 while resting). */
export function pulseAt(tMs: number, len: number, speed: number, restS: number): number {
  const cyc = len / speed + restS;
  return (((tMs / 1000) % cyc) * speed) / len;
}
