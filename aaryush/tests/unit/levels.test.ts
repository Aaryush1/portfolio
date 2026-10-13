import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { levels } from '../../src/data/levels';
import { levelsFor } from '../../src/lib/levels';

const slugsIn = (dir: string) => readdirSync(new URL(`../../src/content/${dir}/`, import.meta.url)).map((f) => f.replace(/\.md$/, ''));
const allSlugs = new Set([...slugsIn('companies'), ...slugsIn('systems')]);

describe('levels', () => {
  it('has exactly four levels numbered 1–4', () => expect(levels.map((l) => l.n)).toEqual([1, 2, 3, 4]));
  it('every ref points at real content', () => {
    for (const l of levels) for (const r of l.refs) expect(allSlugs, `level ${l.n} ref ${r}`).toContain(r);
  });
  it('every level has at least one ref', () => {
    for (const l of levels) expect(l.refs.length).toBeGreaterThan(0);
  });
  it('levelsFor returns the levels that reference a slug', () => {
    expect(levelsFor('cylerity-intake', levels).map((l) => l.n)).toEqual([2, 3]);
    expect(levelsFor('nope', levels)).toEqual([]);
  });
});
