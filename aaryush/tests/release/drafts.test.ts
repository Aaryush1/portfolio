import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/data/site';

const dirs = ['companies', 'systems', 'writing'];

describe('content approval gate', () => {
  it('no content file is still a draft', () => {
    for (const d of dirs) {
      const dir = new URL(`../../src/content/${d}/`, import.meta.url);
      for (const f of readdirSync(dir)) {
        const text = readFileSync(new URL(f, dir), 'utf8');
        expect(/^draft:\s*true\s*$/m.test(text), `${d}/${f} is draft`).toBe(false);
      }
    }
  });
  it('no site copy block is still a draft', () => {
    for (const [k, v] of Object.entries(site.drafts)) expect(v, `site.drafts.${k}`).toBe(false);
  });
});
