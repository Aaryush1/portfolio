/**
 * Day periods keyed to the visitor's local hour. Pure and DOM-free so the hero field and the
 * future writing room share one definition. Only the hour is used, so DST changes don't matter.
 */
export type Daypart = 'morning' | 'afternoon' | 'evening' | 'night';

/** Preview order for the keyboard shortcut. */
export const DAYPARTS: readonly Daypart[] = ['morning', 'afternoon', 'evening', 'night'];

export function isDaypart(v: unknown): v is Daypart {
  return typeof v === 'string' && (DAYPARTS as readonly string[]).includes(v);
}

/** morning 07-12, afternoon 12-17, evening 17-21, night 21-07. Non-finite input gives the default look. */
export function daypartFor(hour: number): Daypart {
  if (!Number.isFinite(hour)) return 'afternoon';
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 7 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/** Next step of the preview cycle: morning, afternoon, evening, night, then null (back to automatic). */
export function nextPreview(current: Daypart | null): Daypart | null {
  if (current === null) return DAYPARTS[0];
  const i = DAYPARTS.indexOf(current);
  return i < 0 || i === DAYPARTS.length - 1 ? null : DAYPARTS[i + 1];
}

export type Rgba = readonly [number, number, number, number];

export interface FieldParams {
  minor: Rgba;
  major: Rgba;
  amber: Rgba;
  /** Contour spacing and number of levels, from -0.7 upward. */
  levelStep: number;
  levelCount: number;
  /** Multiplier on the drift clock. */
  drift: number;
}

const BASE: FieldParams = {
  minor: [160, 164, 174, 0.12],
  major: [160, 164, 174, 0.24],
  amber: [242, 181, 68, 0.62],
  levelStep: 0.1,
  levelCount: 15,
  drift: 1,
};

const PARAMS: Record<Daypart, FieldParams> = {
  morning: { ...BASE, minor: [136, 158, 190, 0.12], major: [140, 160, 190, 0.24] },
  afternoon: BASE,
  evening: { ...BASE, amber: [246, 174, 58, 0.74] },
  night: { ...BASE, amber: [242, 181, 68, 0.46], levelStep: 0.175, levelCount: 9, drift: 0.6 },
};

export function fieldParams(d: Daypart): FieldParams {
  return PARAMS[d];
}
