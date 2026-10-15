/**
 * Where the visitor is, without asking. The time zone name gives a city-sized guess (no geolocation prompt, no
 * network); zones not in the table fall back to a longitude from the UTC offset at a mid-northern latitude.
 * The guess can be a few degrees off, so the horizon is approximate. The sky itself is true for that guess.
 */
import type { Daypart } from '../daypart';

export interface Place { tz: string; lat: number; lon: number; known: boolean }

// zone -> [latitude, longitude]; a representative city per zone
export const ZONES: Readonly<Record<string, readonly [number, number]>> = {
  'America/Chicago': [41.88, -87.63], 'America/New_York': [40.71, -74.0], 'America/Denver': [39.74, -104.99], 'America/Los_Angeles': [34.05, -118.24],
  'America/Phoenix': [33.45, -112.07], 'America/Anchorage': [61.2, -149.9], 'Pacific/Honolulu': [21.3, -157.86], 'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12], 'America/Edmonton': [53.55, -113.49], 'America/Winnipeg': [49.9, -97.14], 'America/Detroit': [42.33, -83.05],
  'America/Indiana/Indianapolis': [39.77, -86.16], 'America/Halifax': [44.65, -63.57], 'America/Mexico_City': [19.43, -99.13], 'America/Bogota': [4.71, -74.07],
  'America/Lima': [-12.05, -77.04], 'America/Santiago': [-33.45, -70.67], 'America/Sao_Paulo': [-23.55, -46.63], 'America/Argentina/Buenos_Aires': [-34.6, -58.38],
  'Europe/London': [51.5, -0.12], 'Europe/Dublin': [53.35, -6.26], 'Europe/Paris': [48.85, 2.35], 'Europe/Berlin': [52.52, 13.4], 'Europe/Madrid': [40.42, -3.7],
  'Europe/Rome': [41.9, 12.5], 'Europe/Amsterdam': [52.37, 4.9], 'Europe/Stockholm': [59.33, 18.07], 'Europe/Moscow': [55.75, 37.62], 'Europe/Istanbul': [41.0, 28.97],
  'Africa/Cairo': [30.04, 31.24], 'Africa/Lagos': [6.52, 3.38], 'Africa/Johannesburg': [-26.2, 28.05], 'Africa/Nairobi': [-1.29, 36.82],
  'Asia/Dubai': [25.2, 55.27], 'Asia/Kolkata': [19.07, 72.88], 'Asia/Calcutta': [19.07, 72.88], 'Asia/Karachi': [24.86, 67.0], 'Asia/Dhaka': [23.8, 90.4],
  'Asia/Bangkok': [13.75, 100.5], 'Asia/Singapore': [1.35, 103.82], 'Asia/Hong_Kong': [22.3, 114.17], 'Asia/Shanghai': [31.23, 121.47], 'Asia/Seoul': [37.57, 126.98],
  'Asia/Tokyo': [35.68, 139.69], 'Asia/Manila': [14.6, 120.98], 'Asia/Jakarta': [-6.2, 106.85], 'Asia/Jerusalem': [31.77, 35.21], 'Asia/Riyadh': [24.7, 46.7],
  'Asia/Tehran': [35.69, 51.39], 'Australia/Sydney': [-33.87, 151.2], 'Australia/Melbourne': [-37.81, 144.96], 'Australia/Brisbane': [-27.47, 153.03],
  'Australia/Perth': [-31.95, 115.86], 'Pacific/Auckland': [-36.85, 174.76], UTC: [40, 0],
};

/** The place for a time zone name. `offsetMinutes` is Date#getTimezoneOffset (minutes WEST of UTC), used only for the fallback. */
export function placeFor(tz: string | undefined | null, offsetMinutes: number): Place {
  const name = tz || 'UTC';
  const z = ZONES[name];
  if (z) return { tz: name, lat: z[0], lon: z[1], known: true };
  const off = Number.isFinite(offsetMinutes) ? -offsetMinutes / 60 : 0;
  return { tz: name, lat: 38, lon: Math.max(-180, Math.min(180, off * 15)), known: false };
}

/** The visitor's place, from the browser's time zone. Never throws. */
export function visitorPlace(now: Date = new Date()): Place {
  let tz: string | undefined;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { tz = undefined; }
  return placeFor(tz, now.getTimezoneOffset());
}

// ---------- wall-clock parts in a zone (used to put a previewed time of day on the right instant) ----------
const fmtCache = new Map<string, Intl.DateTimeFormat>();
export interface ZoneParts { year: number; month: number; day: number; hour: number; minute: number; second: number }
export function zoneParts(ms: number, tz: string): ZoneParts {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    fmtCache.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = +x.value;
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}
const tzOffset = (ms: number, tz: string) => {
  const p = zoneParts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

/** The wall-clock moment the preview of each period stands for. */
export const PART_CLOCK: Readonly<Record<Daypart, readonly [number, number]>> = {
  morning: [9, 30], afternoon: [14, 30], evening: [19, 0], night: [23, 0],
};

/**
 * The instant to draw for a period. With no preview (`part` equals the real period, or null) it is `now`.
 * A previewed period moves the sky to that period's representative wall-clock time today in the zone, so the Sun
 * and the Moon are where they would really be then. Falls back to `now` if the zone can't be resolved.
 */
export function instantForPart(now: number, tz: string, part: Daypart | null, realPart: Daypart): number {
  if (!part || part === realPart) return now;
  try {
    const p = zoneParts(now, tz), [h, m] = PART_CLOCK[part];
    const g = Date.UTC(p.year, p.month - 1, p.day, h, m);
    let inst = g - tzOffset(g, tz);
    inst = g - tzOffset(inst, tz);
    return Number.isFinite(inst) ? inst : now;
  } catch {
    return now;
  }
}
