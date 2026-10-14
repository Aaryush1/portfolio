/** Timing for the hero morph scales with how much of the line actually changes. */

const letters = (s: string) => [...s.replace(/\s+/g, '')];

/** Letters that must change between two phrases: the longer one minus its longest common subsequence. */
export function changedLetters(from: string, to: string): number {
  const a = letters(from), b = letters(to);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return Math.max(a.length, b.length) - dp[0][0];
}

export const TINY = 3; // this many changed letters or fewer: the amber arrival is the highlight
const MIN_SCALE = 0.5; // a tiny change moves about twice as fast as a full one
const MIN_HOLD = 700;
const FULL_HOLD = 1500;
const FULL_AT = 10; // changed letters at which the morph runs at full length

export type MorphTiming = { scale: number; hold: number; tiny: boolean };

/** `scale` multiplies every morph duration and delay; `hold` is the readable pause after landing. */
export function morphTiming(changed: number): MorphTiming {
  const f = Math.min(1, Math.max(0, (changed - 2) / (FULL_AT - 2)));
  return {
    scale: MIN_SCALE + (1 - MIN_SCALE) * f,
    hold: Math.round(MIN_HOLD + (FULL_HOLD - MIN_HOLD) * f),
    tiny: changed <= TINY,
  };
}

export type Role = 'main' | 'incidental' | 'none';

/**
 * `counts[w]` is how many letters of new word `w` arrive (are not shared with the old phrase).
 * The word with the most arriving letters (first, on a tie) is the main change; any other word with
 * arrivals is incidental and gets a quieter glow, so it never competes with the main change.
 */
export function classifyWords(counts: number[]): Role[] {
  const max = Math.max(0, ...counts);
  const main = max > 0 ? counts.indexOf(max) : -1;
  return counts.map((c, w) => (c === 0 ? 'none' : w === main ? 'main' : 'incidental'));
}

/** String-level version of the same classification, for reasoning about and testing whole transitions. */
export function arrivalRoles(from: string, to: string): Role[] {
  const fw = from.split(/\s+/), tw = to.split(/\s+/);
  const a = letters(from), b = tw.flatMap((w, wi) => [...w].map(() => wi));
  const bl = letters(to);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(bl.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = bl.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const counts = new Array<number>(tw.length).fill(0);
  const matched = new Set<number>();
  for (let i = 0, j = 0; i < a.length && j < bl.length; ) {
    if (a[i] === bl[j]) { matched.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  bl.forEach((_, j) => { if (!matched.has(j)) counts[b[j]]++; });
  return classifyWords(counts);
}
