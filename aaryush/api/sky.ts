// The site's one server function. It tells the hero sky roughly where the visitor is, so the sky starts over the right city
// instead of the time-zone guess. Vercel adds the visitor's approximate position to every request as two headers
// (x-vercel-ip-latitude, x-vercel-ip-longitude); this hands back just those, rounded to 0.1 degree (about 11 km).
//
// Nothing is logged, stored or sent anywhere else: no third-party call, no key, no cookie, no database.
// Off Vercel (local dev, preview of the static build) the headers are missing, and the answer is 204.
// Self-contained on purpose: Vercel builds api/ on its own, so this file imports nothing from the app.

interface Req { headers: Record<string, string | string[] | undefined> }
interface Res { statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Rounds to 0.1 degree, never returning negative zero. */
const round1 = (n: number) => Math.round(n * 10) / 10 + 0;

/** The visitor's position from the Vercel IP headers, or null when they are missing or not real coordinates. Pure. */
export function locate(headers: Req['headers']): { lat: number; lon: number } | null {
  const rawLat = first(headers['x-vercel-ip-latitude']), rawLon = first(headers['x-vercel-ip-longitude']);
  if (!rawLat || !rawLon) return null;
  const lat = Number(rawLat), lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: round1(lat), lon: round1(lon) };
}

export default function handler(req: Req, res: Res): void {
  res.setHeader('Cache-Control', 'private, no-store');
  const where = locate(req.headers);
  if (!where) {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(where));
}
