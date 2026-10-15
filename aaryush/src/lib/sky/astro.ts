/**
 * Astronomy for the hero sky (E17). Pure and DOM-free so it can be unit-tested.
 * Planets: Paul Schlyter's low-precision elements, with the Jupiter/Saturn mutual perturbations. Moon: Schlyter's
 * series, topocentric (parallax matters for the Moon). Sun: Schlyter. Precession is removed from solar-system
 * positions, so everything is J2000 like the star catalogue. Good to about 0.02 degrees in RA/Dec for 2026, checked
 * against JPL Horizons (tests/unit/sky-astro.test.ts).
 */

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export type Vec3 = [number, number, number];
export type Rgb = readonly [number, number, number];

/** A body on the celestial sphere: its J2000 unit vector, RA/Dec in degrees, colour and apparent magnitude. */
export interface Body {
  name: string;
  v: Vec3;
  vx: number;
  vy: number;
  vz: number;
  ra: number;
  dec: number;
  col: Rgb;
  mag: number;
  /** Distance in AU (Earth radii for the Moon) where known. */
  dist?: number;
}
export interface MoonBody extends Body {
  /** Illuminated fraction, 0 (new) to 1 (full). */
  k: number;
}

export interface Sky {
  ms: number;
  jd: number;
  /** Days since 1999-12-31 00:00 UT (Schlyter's epoch). */
  d: number;
  lat: number;
  lon: number;
  /** Local sidereal time in degrees. */
  lst: number;
  cL: number;
  sL: number;
  cp: number;
  sp: number;
  sun: Body;
  planets: Body[];
  moon: MoonBody;
}

export const rev = (x: number) => {
  x %= 360;
  return x < 0 ? x + 360 : x;
};
const sd = (x: number) => Math.sin(x * D2R);
const cd = (x: number) => Math.cos(x * D2R);

function kepler(Mdeg: number, e: number) {
  const M = Mdeg * D2R;
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 10; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

type Pair = readonly [number, number];
interface Elements { N: Pair; i: Pair; w: Pair; a: Pair; e: Pair; M: Pair }
// N, i, w, a, e, M as [value at epoch, change per day]
const EL: Record<'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn', Elements> = {
  Mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  Venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
  Mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
  Jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
  Saturn: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] },
};
type PlanetName = keyof typeof EL;
export const PLANET_NAMES = Object.keys(EL) as PlanetName[];
/** Planets in their own colours. */
export const PLANET_COLOURS: Record<PlanetName, Rgb> = {
  Mercury: [170, 172, 178],
  Venus: [252, 252, 255],
  Mars: [222, 112, 86],
  Jupiter: [242, 228, 192],
  Saturn: [228, 202, 136],
};
const val = (p: Pair, d: number) => p[0] + p[1] * d;

function helio(name: PlanetName, d: number) {
  const E = EL[name];
  const N = val(E.N, d), i = val(E.i, d), w = val(E.w, d), a = val(E.a, d), e = val(E.e, d), M = rev(val(E.M, d));
  const Ek = kepler(M, e);
  const xv = a * (Math.cos(Ek) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(Ek);
  const r = Math.hypot(xv, yv), v = Math.atan2(yv, xv) * R2D;
  const lon = Math.atan2(sd(N) * cd(v + w) + cd(N) * sd(v + w) * cd(i), cd(N) * cd(v + w) - sd(N) * sd(v + w) * cd(i)) * R2D;
  const lat = Math.asin(sd(v + w) * sd(i)) * R2D;
  return { lon, lat, r, M };
}

function sunPos(d: number) {
  const w = 282.9404 + 4.70935e-5 * d, e = 0.016709 - 1.151e-9 * d, M = rev(356.047 + 0.9856002585 * d), Ek = kepler(M, e);
  const xv = Math.cos(Ek) - e, yv = Math.sqrt(1 - e * e) * Math.sin(Ek);
  const r = Math.hypot(xv, yv), v = Math.atan2(yv, xv) * R2D, lon = rev(v + w);
  return { lon, r, x: r * cd(lon), y: r * sd(lon), M, L: rev(w + M) };
}

/** Ecliptic of date to J2000 equatorial. Precession is removed as a longitude shift. */
function eclToEq(x: number, y: number, z: number, d: number): Vec3 {
  const p = -3.82394e-5 * d * D2R, c = Math.cos(p), s = Math.sin(p);
  const x2 = x * c - y * s, y2 = x * s + y * c;
  const eps = 23.4392911 * D2R;
  return [x2, y2 * Math.cos(eps) - z * Math.sin(eps), y2 * Math.sin(eps) + z * Math.cos(eps)];
}

function moonVec(d: number, sun: { L: number; M: number }) {
  const N = 125.1228 - 0.0529538083 * d, i = 5.1454, w = 318.0634 + 0.1643573223 * d, a = 60.2666, e = 0.0549, M = rev(115.3654 + 13.0649929509 * d);
  const Ek = kepler(M, e), xv = a * (Math.cos(Ek) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(Ek);
  let r = Math.hypot(xv, yv);
  const v = Math.atan2(yv, xv) * R2D;
  let lon = Math.atan2(sd(N) * cd(v + w) + cd(N) * sd(v + w) * cd(i), cd(N) * cd(v + w) - sd(N) * sd(v + w) * cd(i)) * R2D;
  let lat = Math.asin(sd(v + w) * sd(i)) * R2D;
  const Ls = sun.L, Ms = sun.M, Lm = N + w + M, Dm = Lm - Ls, F = Lm - N;
  lon += -1.274 * sd(M - 2 * Dm) + 0.658 * sd(2 * Dm) - 0.186 * sd(Ms) - 0.059 * sd(2 * M - 2 * Dm) - 0.057 * sd(M - 2 * Dm + Ms) + 0.053 * sd(M + 2 * Dm) + 0.046 * sd(2 * Dm - Ms) + 0.041 * sd(M - Ms) - 0.035 * sd(Dm) - 0.031 * sd(M + Ms) - 0.015 * sd(2 * F - 2 * Dm) + 0.011 * sd(M - 4 * Dm);
  lat += -0.173 * sd(F - 2 * Dm) - 0.055 * sd(M - F - 2 * Dm) - 0.046 * sd(M + F - 2 * Dm) + 0.033 * sd(F + 2 * Dm) + 0.017 * sd(2 * M + F);
  r += -0.58 * cd(M - 2 * Dm) - 0.46 * cd(2 * Dm);
  return { v: eclToEq(r * cd(lat) * cd(lon), r * cd(lat) * sd(lon), r * sd(lat), d), r };
}

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
export const eqVec = (ra: number, dec: number): Vec3 => [Math.cos(dec * D2R) * Math.cos(ra * D2R), Math.cos(dec * D2R) * Math.sin(ra * D2R), Math.sin(dec * D2R)];
const raDec = (v: Vec3): [number, number] => [rev(Math.atan2(v[1], v[0]) * R2D), Math.asin(v[2] / Math.hypot(v[0], v[1], v[2])) * R2D];
export function body(v: Vec3, name: string, col: Rgb, mag: number): Body {
  const [ra, dec] = raDec(v);
  return { name, v, vx: v[0], vy: v[1], vz: v[2], ra, dec, col, mag };
}

/** Greenwich mean sidereal time in degrees. */
export const gmstDeg = (jd: number) => rev(280.46061837 + 360.98564736629 * (jd - 2451545.0));
/** Julian day for a Unix time in milliseconds. */
export const julianDay = (ms: number) => ms / 86400000 + 2440587.5;

const MAGNITUDE: Record<PlanetName, (r: number, R: number, fv: number) => number> = {
  Mercury: (r, R, fv) => -0.36 + 5 * Math.log10(r * R) + 0.027 * fv + 2.2e-13 * fv ** 6,
  Venus: (r, R, fv) => -4.34 + 5 * Math.log10(r * R) + 0.013 * fv + 4.2e-7 * fv ** 3,
  Mars: (r, R, fv) => -1.51 + 5 * Math.log10(r * R) + 0.016 * fv,
  Jupiter: (r, R, fv) => -9.25 + 5 * Math.log10(r * R) + 0.014 * fv,
  Saturn: (r, R, fv) => -8.6 + 5 * Math.log10(r * R) + 0.044 * fv,
};

/** The Sun, planets and Moon for an instant and an observer (degrees north, degrees east). */
export function computeSky(ms: number, lat: number, lon: number): Sky {
  const jd = julianDay(ms), d = jd - 2451543.5;
  const lst = rev(gmstDeg(jd) + lon), L = lst * D2R, ph = lat * D2R;
  const planets: Body[] = [];
  const sun = sunPos(d), sv = eclToEq(sun.x, sun.y, 0, d);
  // Jupiter / Saturn mutual perturbations (Schlyter)
  const Mj = rev(19.895 + 0.0830853001 * d), Ms = rev(316.967 + 0.0334442282 * d);
  const hel = {} as Record<PlanetName, ReturnType<typeof helio>>;
  for (const n of PLANET_NAMES) hel[n] = helio(n, d);
  hel.Jupiter.lon += -0.332 * sd(2 * Mj - 5 * Ms - 67.6) - 0.056 * sd(2 * Mj - 2 * Ms + 21) + 0.042 * sd(3 * Mj - 5 * Ms + 21) - 0.036 * sd(Mj - 2 * Ms) + 0.022 * cd(Mj - Ms) + 0.023 * sd(2 * Mj - 3 * Ms + 52) - 0.016 * sd(Mj - 5 * Ms - 69);
  hel.Saturn.lon += 0.812 * sd(2 * Mj - 5 * Ms - 67.6) - 0.229 * cd(2 * Mj - 4 * Ms - 2) + 0.119 * sd(Mj - 2 * Ms - 3) + 0.046 * sd(2 * Mj - 6 * Ms - 69) + 0.014 * sd(Mj - 3 * Ms + 32);
  hel.Saturn.lat += -0.02 * cd(2 * Mj - 4 * Ms - 2) + 0.018 * sd(2 * Mj - 6 * Ms - 49);
  const sunBody = body(norm(sv), 'Sun', [255, 244, 222], -26.7);
  sunBody.dist = sun.r;
  for (const n of PLANET_NAMES) {
    const h = hel[n];
    const xh = h.r * cd(h.lat) * cd(h.lon), yh = h.r * cd(h.lat) * sd(h.lon), zh = h.r * sd(h.lat);
    const xg = xh + sun.x, yg = yh + sun.y, zg = zh, R = Math.hypot(xg, yg, zg);
    const cosfv = (h.r * h.r + R * R - sun.r * sun.r) / (2 * h.r * R);
    const fv = Math.acos(Math.max(-1, Math.min(1, cosfv))) * R2D;
    const o = body(norm(eclToEq(xg, yg, zg, d)), n, PLANET_COLOURS[n], MAGNITUDE[n](h.r, R, fv));
    o.dist = R;
    planets.push(o);
  }
  // Moon, topocentric
  const cp = Math.cos(ph), sp = Math.sin(ph), cL = Math.cos(L), sL = Math.sin(L);
  const mg = moonVec(d, sun), mgv = norm(mg.v), obs = [cp * cL, cp * sL, sp];
  const mt = norm([mgv[0] * mg.r - obs[0], mgv[1] * mg.r - obs[1], mgv[2] * mg.r - obs[2]]);
  const moon = body(mt, 'Moon', [236, 232, 218], -9) as MoonBody;
  moon.k = (1 - (mgv[0] * sunBody.vx + mgv[1] * sunBody.vy + mgv[2] * sunBody.vz)) / 2;
  return { ms, jd, d, lat, lon, lst, cL, sL, cp, sp, sun: sunBody, planets, moon };
}

/** Horizon coordinates of a J2000 vector: east, north and up components of the unit vector (what the projection reads). */
export interface Enu { e: number; n: number; u: number }
/** Writes the local east/north/up components of (vx, vy, vz) into `o`. `k` carries the sidereal-time sine/cosine and latitude. */
export function enu(k: { cL: number; sL: number; cp: number; sp: number }, vx: number, vy: number, vz: number, o: Enu) {
  const xp = vx * k.cL + vy * k.sL, yp = vx * k.sL - vy * k.cL;
  o.e = -yp;
  o.n = -(xp * k.sp - vz * k.cp);
  o.u = xp * k.cp + vz * k.sp;
}
export function altAz(sky: Sky, b: { vx: number; vy: number; vz: number }) {
  const o: Enu = { e: 0, n: 0, u: 0 };
  enu(sky, b.vx, b.vy, b.vz, o);
  return { alt: Math.asin(o.u) * R2D, az: rev(Math.atan2(o.e, o.n) * R2D) };
}

/** Local sidereal time as `12h34m`, for the readout. */
export const hms = (deg: number) => {
  const h = deg / 15, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return hh + 'h' + String(mm).padStart(2, '0') + 'm';
};

// ---------- fixed objects ----------
/** Sgr A*, the galactic centre: the single amber accent. */
export const SGR_A = body(eqVec(266.41683, -29.00781), 'Sgr A*', [242, 181, 68], 0);
/** Faint marks for a few loved objects. */
export const MARKS: (Body & { kind: 'bh' | 'psr' })[] = (
  [['Cyg X-1', 'bh', 299.59032, 35.20161], ['Crab Pulsar', 'psr', 83.63308, 22.0145], ['Vela Pulsar', 'psr', 128.83608, -45.17636]] as const
).map(([n, kind, ra, dec]) => ({ ...body(eqVec(ra, dec), n, [150, 198, 220], 0), kind }));

// ---------- meteor showers ----------
const SHOWERS: readonly (readonly [number, number, string])[] = [
  [1, 3, 'Quadrantids'], [4, 22, 'Lyrids'], [5, 6, 'Eta Aquariids'], [8, 12, 'Perseids'],
  [10, 21, 'Orionids'], [11, 17, 'Leonids'], [12, 14, 'Geminids'], [12, 22, 'Ursids'],
];
/** 1 on an ordinary night, up to 5 on the peak of a real shower, falling off over a couple of days. Month is 1-12. */
export function showerFactor(month: number, day: number): number {
  let f = 1;
  for (const [m, d] of SHOWERS) {
    let dd = Math.abs((Date.UTC(2001, month - 1, day) - Date.UTC(2001, m - 1, d)) / 86400000);
    dd = Math.min(dd, 365 - dd);
    f = Math.max(f, 1 + 4 * Math.exp(-((dd / 2.2) ** 2)));
  }
  return f;
}

// ---------- the spacing of the sky's colours: B-V to RGB ----------
const BVT: readonly (readonly [number, Rgb])[] = [
  [-0.3, [150, 175, 255]], [0, [170, 195, 255]], [0.3, [210, 224, 255]], [0.6, [255, 246, 236]],
  [0.8, [255, 230, 196]], [1.15, [255, 204, 148]], [1.6, [255, 168, 108]],
];
/** A star's display colour from its B-V index and magnitude. Saturation scales with brightness, from 0.3 on faint stars to 0.85 on the brightest. */
export function starColour(bv: number, mag: number): [number, number, number] {
  const b = Number.isNaN(bv) ? 0.6 : Math.max(-0.3, Math.min(1.6, bv));
  let k = 0;
  while (k < BVT.length - 2 && b > BVT[k + 1][0]) k++;
  const a = BVT[k], z = BVT[k + 1], u = (b - a[0]) / (z[0] - a[0]);
  const sat = Math.max(0.3, Math.min(0.85, 0.38 + (4.5 - mag) * 0.1)), nn = [228, 230, 238];
  return [0, 1, 2].map((j) => Math.round(nn[j] + (a[1][j] + (z[1][j] - a[1][j]) * u - nn[j]) * sat)) as [number, number, number];
}
