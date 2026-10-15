import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARAMS } from '../../src/lib/meet';

const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { redirects?: { source: string; destination: string; permanent: boolean; has?: { type: string; key: string }[] }[] };

describe('old QR codes', () => {
  it('send a home URL carrying any meet parameter to /card, temporarily, keeping the query', () => {
    for (const key of PARAMS) {
      const r = cfg.redirects?.find((x) => x.source === '/' && x.has?.some((h) => h.type === 'query' && h.key === key));
      expect(r, `redirect for ?${key}=`).toBeDefined();
      expect(r!.destination).toBe('/card');
      expect(r!.permanent).toBe(false);
    }
  });

  it('leave the plain home URL alone', () => {
    expect(cfg.redirects?.some((x) => x.source === '/' && !x.has)).toBe(false);
  });
});
