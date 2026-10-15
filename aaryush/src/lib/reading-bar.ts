/**
 * Where the reading bar's section breaks go. Pure, so the arithmetic is tested without a browser.
 * A "start" is the fraction (0..1) of the whole piece at which a section begins.
 */

/** Section starts from the words that come before each section's heading. A longer section takes more of the bar. */
export function startsFromWords(wordsBefore: number[], totalWords: number): number[] {
  if (!(totalWords > 0)) return wordsBefore.map(() => 0);
  return wordsBefore.map((w) => Math.min(1, Math.max(0, w / totalWords)));
}

/** A letter's folds are read by scroll fraction (the memory code does the same), so its sections are equal parts. */
export function equalStarts(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i / count);
}

/** The ticks to draw: every start except one at the very beginning of the bar. */
export function tickStarts(starts: number[]): number[] {
  return starts.filter((s) => s > 0.004 && s < 0.996);
}

/** [from, to] of section `index` as fractions of the bar; null when there is no such section. */
export function segmentBounds(starts: number[], index: number): [number, number] | null {
  if (index < 0 || index >= starts.length) return null;
  return [starts[index], index + 1 < starts.length ? starts[index + 1] : 1];
}

/**
 * How far along the bar the reader is, as a fraction. `y` is the reading line's position down the article (px), `offsets` are the
 * px positions of each section's heading, `starts` the same sections' places on the bar. Between two headings the fill moves
 * linearly, so it reaches a section's break just as that heading reaches the reading line, even when words and pixels disagree
 * (a table, a pull quote). With no headings it is plain y / height.
 */
export function progressAt(y: number, offsets: number[], starts: number[], height: number): number {
  if (!(height > 0)) return 1;
  const pts: [number, number][] = [[0, 0]];
  for (let i = 0; i < Math.min(offsets.length, starts.length); i++) {
    const o = Math.min(height, Math.max(0, offsets[i]));
    const s = Math.min(1, Math.max(0, starts[i]));
    const last = pts[pts.length - 1];
    if (o > last[0] && s >= last[1]) pts.push([o, s]);
  }
  const lastPt = pts[pts.length - 1];
  if (lastPt[0] < height) pts.push([height, 1]);
  const yy = Math.min(height, Math.max(0, y));
  for (let i = 1; i < pts.length; i++) {
    const [y0, p0] = pts[i - 1], [y1, p1] = pts[i];
    if (yy <= y1) return p0 + ((yy - y0) / (y1 - y0)) * (p1 - p0);
  }
  return 1;
}

/** The section the fill is in: the last one that has started by `progress`; -1 before the first. */
export function sectionAtProgress(starts: number[], progress: number): number {
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= progress + 1e-6) idx = i;
  return idx;
}
