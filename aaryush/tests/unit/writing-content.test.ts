import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/data/site';

const dir = 'src/content/writing';
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const fm = (f: string) => yaml.load(readFileSync(join(dir, f), 'utf8').split(/^---$/m)[1]) as Record<string, any>;

describe.each(files)('%s writing-room fields', (f) => {
  const d = fm(f);
  it('has a one-line why', () => {
    expect(typeof d.why).toBe('string');
    expect(d.why).not.toMatch(/\n/);
  });
  it('has a 3 to 6 entry breakdown with no null values', () => {
    expect(d.breakdown.length).toBeGreaterThanOrEqual(3);
    expect(d.breakdown.length).toBeLessThanOrEqual(6);
    for (const b of d.breakdown) {
      expect(typeof b.label).toBe('string');
      if (b.gist !== undefined) expect(b.gist.split(/\s+/).length).toBeLessThanOrEqual(5);
    }
  });
  it('papers carry a gist per section; letters do not need one', () => {
    if (d.kind === 'paper') for (const b of d.breakdown) expect(b.gist, b.label).toBeTruthy();
  });
});

describe('site.drawer', () => {
  it('holds only kind and length, never a title', () => {
    for (const e of site.drawer) expect(Object.keys(e).sort()).toEqual(['kind', 'length']);
  });
});
