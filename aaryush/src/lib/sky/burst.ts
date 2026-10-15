/**
 * The click burst's shape (E22): how many meteors, and which way they go.
 * Counts are weighted linearly, so one is most likely and four still turns up about one click in eight.
 * Directions are free, with only a small gap kept between them, so a burst never looks like an evenly spaced star.
 */

/** Chance of 1, 2, 3 and 4 meteors: a straight line down in steps of 0.08. */
export const BURST_WEIGHTS = [0.37, 0.29, 0.21, 0.13] as const;

/** Pick a count from 1 to 4 for a uniform random number r in [0, 1). */
export function burstCount(r: number): number {
  let acc = 0;
  for (let i = 0; i < BURST_WEIGHTS.length; i++) {
    acc += BURST_WEIGHTS[i];
    if (r < acc) return i + 1;
  }
  return BURST_WEIGHTS.length;
}

/** The smallest angle kept between two meteors of one burst, in radians (about 28°). */
export const MIN_GAP = 0.5;

/** n independent random directions, each at least `gap` away from the others (it gives up retrying after a while, which is fine). */
export function burstAngles(n: number, rand: () => number = Math.random, gap = MIN_GAP): number[] {
  const out: number[] = [];
  const apart = (a: number, b: number) => {
    const d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    return d >= gap;
  };
  for (let i = 0; i < n; i++) {
    let a = rand() * Math.PI * 2;
    for (let tries = 0; tries < 24 && !out.every((b) => apart(a, b)); tries++) a = rand() * Math.PI * 2;
    out.push(a);
  }
  return out;
}
