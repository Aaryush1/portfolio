import { describe, expect, it } from 'vitest';
import handler, { locate } from '../../api/sky';

function call(headers: Record<string, string | string[] | undefined>) {
  const out = { status: 0, headers: {} as Record<string, string>, body: '' as string | undefined };
  const res = {
    statusCode: 0,
    setHeader(n: string, v: string) { out.headers[n.toLowerCase()] = v; },
    end(b?: string) { out.status = this.statusCode; out.body = b; },
  };
  handler({ headers }, res);
  return out;
}

describe('the /api/sky function (the site\'s one server function)', () => {
  it('rounds the Vercel IP position to 0.1 degree', () => {
    expect(locate({ 'x-vercel-ip-latitude': '43.07310', 'x-vercel-ip-longitude': '-89.40120' })).toEqual({ lat: 43.1, lon: -89.4 });
    expect(locate({ 'x-vercel-ip-latitude': '-33.8688', 'x-vercel-ip-longitude': '151.2093' })).toEqual({ lat: -33.9, lon: 151.2 });
    expect(locate({ 'x-vercel-ip-latitude': '-0.04', 'x-vercel-ip-longitude': '0.04' })).toEqual({ lat: 0, lon: 0 });
    expect(Object.is(locate({ 'x-vercel-ip-latitude': '-0.04', 'x-vercel-ip-longitude': '10' })!.lat, 0)).toBe(true);
  });
  it('answers 204 with no body when the headers are missing', () => {
    for (const h of [{}, { 'x-vercel-ip-latitude': '43.1' }, { 'x-vercel-ip-longitude': '-89.4' }, { 'x-vercel-ip-latitude': '', 'x-vercel-ip-longitude': '' }]) {
      const r = call(h);
      expect(r.status).toBe(204);
      expect(r.body).toBeUndefined();
    }
  });
  it('treats junk and out-of-range values as missing', () => {
    for (const [la, lo] of [['abc', '10'], ['10', 'NaN'], ['91', '10'], ['10', '181'], ['Infinity', '0']]) {
      expect(call({ 'x-vercel-ip-latitude': la, 'x-vercel-ip-longitude': lo }).status).toBe(204);
    }
  });
  it('returns just lat and lon as JSON, never cached', () => {
    const r = call({ 'x-vercel-ip-latitude': '43.0731', 'x-vercel-ip-longitude': '-89.4012' });
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body!)).toEqual({ lat: 43.1, lon: -89.4 });
    expect(r.headers['cache-control']).toBe('private, no-store');
    expect(r.headers['content-type']).toMatch(/application\/json/);
    expect(call({}).headers['cache-control']).toBe('private, no-store');
  });
  it('reads the first value of a repeated header', () => {
    expect(locate({ 'x-vercel-ip-latitude': ['10.04', '20'], 'x-vercel-ip-longitude': ['20.06'] })).toEqual({ lat: 10, lon: 20.1 });
  });
  it('sets no cookie and no other header, and imports nothing', async () => {
    const r = call({ 'x-vercel-ip-latitude': '1', 'x-vercel-ip-longitude': '1' });
    expect(Object.keys(r.headers).sort()).toEqual(['cache-control', 'content-type']);
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../api/sky.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/^import /m);
    expect(src).not.toMatch(/fetch\(|console\.|process\.env/);
  });
});
