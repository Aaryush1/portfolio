/**
 * The geometry and the small rules of the hero sky (E17), kept pure so they can be tested without a canvas.
 * The picture is a full-bleed stereographic view about the zenith: you are looking straight up, north at the top
 * (south at the top in the southern hemisphere, which mirrors), and the celestial pole sits just above the top edge,
 * so the whole sky wheels around it on arcs.
 */
import type { Daypart } from '../daypart';

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- rate (how fast the sky runs) ----------
/** The steps `[` and `]` walk through. Visitors can't go outside 50x to 1000x. */
export const RATES: readonly number[] = [50, 100, 150, 200, 250, 300, 400, 500, 700, 1000];
export const RATE_MIN = 50;
export const RATE_MAX = 1000;
export const DEFAULT_RATE = { desktop: 225, phone: 150 } as const;
export const clampRate = (v: number) => (Number.isFinite(v) ? Math.max(RATE_MIN, Math.min(RATE_MAX, Math.round(v))) : DEFAULT_RATE.desktop);
/** One step up (dir > 0) or down (dir < 0) from `cur`. The default 225 isn't on the ladder, so it steps to 250 or 200. */
export function stepRate(cur: number, dir: number): number {
  if (dir > 0) return RATES.find((x) => x > cur) ?? RATE_MAX;
  const below = [...RATES].reverse().find((x) => x < cur);
  return below ?? RATE_MIN;
}
/** A stored session value, or null when it isn't a rate a visitor could have set. */
export function parseStoredRate(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= RATE_MIN && n <= RATE_MAX ? Math.round(n) : null;
}

// ---------- the readout under L ----------
const pad2 = (n: number) => String(n).padStart(2, '0');
export interface ReadoutInput { lat: number; lon: number; hour: number; minute: number; elapsedMs: number; lstText: string; moonPct: number; rate: number }
/** `Live · 43.1°N 89.4°W · 23:00 local · T+00h18m42s · LST 23h56m12s · Moon 19% · ×225`. T+ is simulated sky time since load; local is the real clock. */
export function readoutText(r: ReadoutInput): string {
  const lat = Math.abs(r.lat).toFixed(1) + '°' + (r.lat >= 0 ? 'N' : 'S');
  const lon = Math.abs(r.lon).toFixed(1) + '°' + (r.lon >= 0 ? 'E' : 'W');
  const el = Math.max(0, Math.floor(r.elapsedMs / 1000));
  const t = `${pad2(Math.floor(el / 3600))}h${pad2(Math.floor((el % 3600) / 60))}m${pad2(el % 60)}s`;
  return `Live · ${lat} ${lon} · ${pad2(r.hour)}:${pad2(r.minute)} local · T+${t} · LST ${r.lstText} · Moon ${Math.round(r.moonPct)}% · ×${Math.round(r.rate)}`;
}

// ---------- looks per period ----------
export interface Look {
  /** Gradient top and bottom, rgb. */
  top: readonly [number, number, number];
  bot: readonly [number, number, number];
  /** Star brightness multiplier. */
  star: number;
  /** Faintest star magnitude drawn. */
  mag: number;
  /** Milky Way strength. */
  mw: number;
  /** Constellation line strength. */
  line: number;
  /** Sun glow strength when the Sun is above the horizon. */
  glow: number;
}
export const LOOKS: Readonly<Record<Daypart, Look>> = {
  night: { top: [4, 7, 19], bot: [10, 17, 38], star: 1, mag: 6.9, mw: 1, line: 1, glow: 0.55 },
  evening: { top: [9, 11, 26], bot: [44, 26, 22], star: 0.8, mag: 6.2, mw: 0.55, line: 1.05, glow: 0.85 },
  morning: { top: [10, 19, 40], bot: [34, 50, 76], star: 0.55, mag: 5.3, mw: 0.28, line: 1.1, glow: 1 },
  afternoon: { top: [12, 18, 32], bot: [30, 40, 58], star: 0.45, mag: 4.8, mw: 0.12, line: 1.2, glow: 1 },
};
export const lookFor = (d: Daypart): Look => LOOKS[d];

// ---------- the view ----------
export interface Quiet { x0: number; y0: number; x1: number; y1: number; feather: number }
export interface View {
  W: number;
  H: number;
  phone: boolean;
  /** +1 northern hemisphere (north up), -1 southern. */
  sg: number;
  /** Radius of the horizon circle, px. */
  Rh: number;
  /** Where the zenith lands. */
  cx: number;
  cy: number;
  quiet: Quiet;
}

/** Sets the view up for a size and a latitude. The pole lands 16px above the top edge, the horizon just under the bottom. */
export function makeView(W: number, H: number, phone: boolean, lat: number, quiet: Quiet): View {
  const t = Math.tan(((90 - Math.min(89, Math.abs(lat))) * Math.PI) / 360);
  const m = 16;
  const Rh = (H + 24 + m) / (1 + t);
  return { W, H, phone, sg: lat >= 0 ? 1 : -1, Rh, cx: phone ? W * 0.5 : W * 0.56, cy: Rh * t - m, quiet };
}

export interface Pt { x: number; y: number }
/** Screen position for a direction (east, north, up). False when it's far enough below the horizon not to draw. */
export function project(v: View, e: number, n: number, u: number, out: Pt): boolean {
  if (u < -0.45) return false;
  const k = v.Rh / (1 + u);
  out.x = v.cx - v.sg * e * k;
  out.y = v.cy - v.sg * n * k;
  return true;
}

/** The feathered quiet zone behind the text: 0.3 inside, easing to 1 over `feather` px. */
export function quietFactor(q: Quiet, x: number, y: number): number {
  const dx = Math.max(q.x0 - x, 0, x - q.x1), dy = Math.max(q.y0 - y, 0, y - q.y1);
  return 0.3 + 0.7 * smooth(0, q.feather, Math.hypot(dx, dy));
}

/** How much of an object shows for its height above the horizon (u = sin altitude). Below the horizon it keeps a faint 0.3. */
export function horizonAlpha(u: number, below = 0.3): number {
  return u >= 0 ? 0.45 + 0.55 * smooth(0, 0.25, u) : below * smooth(-0.6, 0, u);
}

/** Trail length in degrees of sky rotation, growing with speed: 10 + 4 ln(k/50), capped at 26. */
export function trailArc(rate: number): number {
  return Math.min(26, 10 + 4 * Math.log(Math.max(50, rate) / 50));
}
/** One sample per 0.4 degrees of sky rotation, 14 to 60 points. */
export function trailSamples(arc: number): number {
  return Math.min(60, Math.max(14, Math.ceil(arc / 0.4)));
}

/** The stars that leave trails: the brightest 50 on desktop, 30 on phones. */
export const TRAIL_STARS = { desktop: 50, phone: 30 } as const;

// ---------- the Milky Way grid ----------
/** Bilinear sample of the 1 degree grid at (ra, dec) in degrees. Row 0 is dec +90, column 0 is signed longitude -180. */
export function sampleGrid(grid: Uint8Array, w: number, h: number, ra: number, dec: number): number {
  const lon = ra > 180 ? ra - 360 : ra;
  const fx = Math.min(w - 1.001, Math.max(0, lon + 180 - 0.5)), fy = Math.min(h - 1.001, Math.max(0, 90 - dec - 0.5));
  const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
  const a = grid[y0 * w + x0], b = grid[y0 * w + x0 + 1], c = grid[(y0 + 1) * w + x0], d = grid[(y0 + 1) * w + x0 + 1];
  return ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty) / 255;
}

/** Decodes the baked base64 grid. */
export function decodeGrid(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- the meteors ----------
/** Average milliseconds between meteors on an ordinary night: 3500 on desktop, 4500 on phones, shorter on a shower or a rush. */
export function meteorInterval(phone: boolean, shower: number, rush: number): number {
  return (phone ? 4500 : 3500) / (Math.max(1, shower) * (1 + 3.2 * rush));
}
