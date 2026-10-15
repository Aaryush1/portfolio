/** Deterministic desk layout. Pure: no DOM, no Math.random. The same slugs always land in the same places. */
export interface Placement { slug: string; col: number; x: number; y: number; w: number; h: number; rot: number; dx: number; dy: number; }
export interface DeskLayout { cols: number; width: number; height: number; placements: Placement[]; }

const COL_GAP = 56;
const ROW_GAP = 40;
const MAX_ROT = 2.6;
const MIN_ROT = 0.5;

export function nominalSize(shape: string): { w: number; h: number } {
  if (shape === 'letter') return { w: 300, h: 478 };
  if (shape === 'paper') return { w: 300, h: 290 };
  if (shape === 'note') return { w: 300, h: 250 };
  return { w: 260, h: 220 };
}

export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutDesk(pieces: { slug: string; shape: string }[], opts: { cols?: number } = {}): DeskLayout {
  const n = pieces.length;
  if (n === 0) return { cols: 1, width: 0, height: 0, placements: [] };
  const cols = Math.max(1, Math.min(n, opts.cols ?? (n <= 2 ? 2 : n <= 6 ? 3 : 4)));
  const sizes = pieces.map((p) => nominalSize(p.shape));
  const colOf = new Array<number>(n).fill(0);
  const heights = () => {
    const hs = new Array<number>(cols).fill(0);
    colOf.forEach((c, i) => { hs[c] += sizes[i].h + ROW_GAP; });
    return hs.map((v) => (v > 0 ? v - ROW_GAP : 0));
  };
  // greedy masonry: next piece into the shortest column (ties to the lowest index)
  const run = new Array<number>(cols).fill(0);
  pieces.forEach((_, i) => {
    let c = 0;
    for (let k = 1; k < cols; k++) if (run[k] < run[c]) c = k;
    colOf[i] = c;
    run[c] += sizes[i].h + ROW_GAP;
  });
  // then move pieces from the tallest to the shortest column while that narrows the spread
  const spread = (hs: number[]) => Math.max(...hs) - Math.min(...hs);
  for (let guard = 0; guard < 60; guard++) {
    const hs = heights();
    const tall = hs.indexOf(Math.max(...hs));
    const short = hs.indexOf(Math.min(...hs));
    if (tall === short) break;
    let best = -1, bestSpread = spread(hs);
    for (let i = 0; i < n; i++) {
      if (colOf[i] !== tall) continue;
      colOf[i] = short;
      const s = spread(heights());
      colOf[i] = tall;
      if (s < bestSpread) { bestSpread = s; best = i; }
    }
    if (best >= 0) { colOf[best] = short; continue; }
    // no single move helps: try swapping one piece from each column
    let swap: [number, number] | null = null;
    for (let i = 0; i < n; i++) {
      if (colOf[i] !== tall) continue;
      for (let j = 0; j < n; j++) {
        if (colOf[j] !== short) continue;
        colOf[i] = short; colOf[j] = tall;
        const s = spread(heights());
        colOf[i] = tall; colOf[j] = short;
        if (s < bestSpread) { bestSpread = s; swap = [i, j]; }
      }
    }
    if (!swap) break;
    colOf[swap[0]] = short; colOf[swap[1]] = tall;
  }
  const colH = new Array<number>(cols).fill(0);
  const placed: Placement[] = pieces.map((p, i) => {
    const rnd = mulberry32(fnv1a(p.slug));
    const sign = rnd() < 0.5 ? -1 : 1;
    const rot = sign * (MIN_ROT + rnd() * (MAX_ROT - MIN_ROT));
    const dx = (rnd() * 2 - 1) * 10;
    const dy = (rnd() * 2 - 1) * 8;
    const { w, h } = sizes[i];
    const col = colOf[i];
    const y = colH[col];
    colH[col] += h + ROW_GAP;
    return { slug: p.slug, col, x: col * (300 + COL_GAP), y, w, h, rot, dx, dy };
  });
  const used = colH.map((v) => Math.max(0, v - ROW_GAP));
  const tallest = Math.max(...used);
  for (const p of placed) p.y += Math.round((tallest - used[p.col]) / 2);
  placed.sort((a, b) => a.y - b.y || a.x - b.x);
  return { cols, width: cols * 300 + (cols - 1) * COL_GAP, height: tallest, placements: placed };
}
