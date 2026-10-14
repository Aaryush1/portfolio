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
  /** Centre of the amber contour's oscillation (default 0.03) and its stroke width in px. */
  amberBase: number;
  amberWidth: number;
  /** An optional extra contour at a fixed level, drawn in a warm colour (evening only). */
  warmLevel: { level: number; color: Rgba } | null;
}

const BASE: FieldParams = {
  minor: [160, 164, 174, 0.12],
  major: [160, 164, 174, 0.24],
  amber: [242, 181, 68, 0.62],
  levelStep: 0.1,
  levelCount: 15,
  drift: 1,
  amberBase: 0.03,
  amberWidth: 1.2,
  warmLevel: null,
};

const PARAMS: Record<Daypart, FieldParams> = {
  // Morning: cool and airy. A clear blue-grey cast on the lines, the amber contour a little lower, a quicker drift.
  morning: { ...BASE, minor: [84, 146, 232, 0.14], major: [96, 158, 240, 0.26], levelStep: 0.085, levelCount: 18, amberBase: -0.03, drift: 1.3 },
  afternoon: BASE,
  // Evening: warm. Faint warm tint on the lines, a brighter and thicker amber contour, one extra contour warmed toward amber.
  evening: {
    ...BASE,
    minor: [206, 170, 130, 0.14], major: [214, 168, 112, 0.26],
    amber: [250, 170, 50, 0.78], amberWidth: 1.9,
    warmLevel: { level: -0.2, color: [244, 160, 60, 0.4] },
  },
  night: { ...BASE, amber: [242, 181, 68, 0.46], levelStep: 0.175, levelCount: 9, drift: 0.6 },
};

export function fieldParams(d: Daypart): FieldParams {
  return PARAMS[d];
}

/**
 * The period the room should show: a valid `data-daypart` attribute on the root (the test and preview hook)
 * wins, otherwise the visitor's clock. Non-finite clocks give the default look.
 */
export function currentDaypart(root: Element, now: Date = new Date()): Daypart {
  const attr = root.getAttribute('data-daypart');
  return isDaypart(attr) ? attr : daypartFor(now.getHours());
}
