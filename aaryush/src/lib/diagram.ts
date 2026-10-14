export type Pt = [number, number];
export type BoxNode = { x: number; y: number; w: number; h: number; t: string; s?: string; d: number; dashed?: boolean; human?: boolean };
export type DiamondNode = { diamond: true; cx: number; cy: number; r: number; t: string; d: number };
export type DiagramNode = BoxNode | DiamondNode;
export type DiagramEdge = { p: Pt[]; d: number; dur?: number; fb?: boolean; dash?: boolean; l?: [string, number, number, 'start' | 'middle' | 'end'][] };
export type DiagramInput = [x: number, y1: number, y2: number, label: string, delay: number];
export type DiagramSpec = { vb: [number, number]; title: string; desc: string; inputs: DiagramInput[]; nodes: DiagramNode[]; edges: DiagramEdge[]; pulse: Pt[]; loopStart: number; speed?: number };
export type Hit = { node: number; at: number };
export type DiagramRuntime = { pulse: Pt[]; inputs: DiagramInput[]; loopStart: number; hits: Hit[]; speed?: number };
export type DiagramKey = 'intake' | 'loop' | 'launchpad' | 'skale';

export const isDiamond = (n: DiagramNode): n is DiamondNode => 'diamond' in n;

export function nodeBounds(n: DiagramNode) {
  return isDiamond(n) ? { x: n.cx - n.r, y: n.cy - n.r, w: n.r * 2, h: n.r * 2 } : { x: n.x, y: n.y, w: n.w, h: n.h };
}

export function boxPath(n: DiagramNode): string {
  if (isDiamond(n)) return `M${n.cx} ${n.cy - n.r} L${n.cx + n.r} ${n.cy} L${n.cx} ${n.cy + n.r} L${n.cx - n.r} ${n.cy} Z`;
  return `M${n.x} ${n.y} H${n.x + n.w} V${n.y + n.h} H${n.x} Z`;
}

export function pathD(pts: Pt[], closed: boolean): string {
  return 'M' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L') + (closed ? ' Z' : '');
}

function segments(pts: Pt[], closed: boolean): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
  if (closed && pts.length > 2) segs.push([pts[pts.length - 1], pts[0]]);
  return segs;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function polylineLength(pts: Pt[], closed = true): number {
  return segments(pts, closed).reduce((sum, [a, b]) => sum + dist(a, b), 0);
}

export function pointAt(pts: Pt[], s: number, closed = true): Pt {
  const len = polylineLength(pts, closed);
  if (len === 0) return [pts[0][0], pts[0][1]];
  let rest = ((s % len) + len) % len;
  for (const [a, b] of segments(pts, closed)) {
    const l = dist(a, b);
    if (rest <= l) {
      const k = l === 0 ? 0 : rest / l;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    rest -= l;
  }
  const last = pts[closed ? 0 : pts.length - 1];
  return [last[0], last[1]];
}

export function nodeHits(spec: DiagramSpec, step = 1): Hit[] {
  const len = polylineLength(spec.pulse);
  const boxes = spec.nodes.map((n) => {
    const b = nodeBounds(n);
    return { x0: b.x - 1, y0: b.y - 1, x1: b.x + b.w + 1, y1: b.y + b.h + 1 };
  });
  const inside = (p: Pt, i: number) => p[0] >= boxes[i].x0 && p[0] <= boxes[i].x1 && p[1] >= boxes[i].y0 && p[1] <= boxes[i].y1;
  const hits: Hit[] = [];
  boxes.forEach((_, i) => {
    let was = inside(pointAt(spec.pulse, len - step), i);
    for (let s = 0; s < len; s += step) {
      const now = inside(pointAt(spec.pulse, s), i);
      if (now && !was) hits.push({ node: i, at: s });
      was = now;
    }
  });
  return hits.sort((a, b) => a.at - b.at);
}

export function crossed(prev: number, next: number, at: number, _len: number): boolean {
  if (next === prev) return false;
  if (next > prev) return at > prev && at <= next;
  return at > prev || at <= next;
}
