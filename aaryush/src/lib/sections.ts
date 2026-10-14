/** Index of the last section whose top is at or above `viewportH * ratio`; -1 when none has started yet. */
export function currentSection(tops: number[], viewportH: number, ratio = 0.5): number {
  const line = viewportH * ratio;
  let idx = -1;
  for (let i = 0; i < tops.length; i++) {
    if (Number.isFinite(tops[i]) && tops[i] <= line) idx = i;
  }
  return idx;
}
