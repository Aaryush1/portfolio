import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('the drawer cannot see the collection', () => {
  const src = readFileSync('src/components/writing/Drawer.astro', 'utf8');
  it('does not import astro:content', () => expect(src).not.toMatch(/astro:content|getCollection/));
  it('only reads kind and length from site.drawer', () => expect(src).not.toMatch(/\.title|\.body|\.summary/));
  it('the drawer script does not reach the collection either', () => {
    const script = readFileSync('src/scripts/drawer.ts', 'utf8');
    expect(script).not.toMatch(/astro:content|getCollection|\.title|\.body/);
  });
});
