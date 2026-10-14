import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Piece from '../../src/components/writing/Piece.astro';
import type { PieceView } from '../../src/lib/writing';

const base: PieceView = {
  slug: 'x', title: 'A Strange Thing', subtitle: '', kind: 'zine', shape: 'sheet',
  date: new Date('2026-01-01'), minutes: 3, why: 'because', breakdown: [], sections: 0,
};
const render = async (piece: PieceView) => (await AstroContainer.create()).renderToString(Piece, { props: { piece } });

describe('desk objects degrade gracefully', () => {
  it('an unknown kind renders as a plain sheet with title and kind, and no folds', async () => {
    const html = await render(base);
    expect(html).toContain('A Strange Thing');
    expect(html).toContain('zine');
    expect(html).toContain('class="plain"');
    expect(html).not.toMatch(/class="fold|class="sheet/);
  });
  it('a letter with no breakdown has no fold panels and no empty list', async () => {
    const html = await render({ ...base, kind: 'letter', shape: 'letter' });
    expect(html).toContain('A Strange Thing');
    expect(html).not.toMatch(/class="fold/);
    expect(html).not.toContain('<ol');
  });
  it('a paper with no breakdown keeps its cover and renders no sheets or list', async () => {
    const html = await render({ ...base, kind: 'paper', shape: 'paper' });
    expect(html).toContain('cover');
    expect(html).not.toMatch(/class="sheet" /);
    expect(html).not.toContain('<ol');
  });
  it('a letter with four entries gets four folds', async () => {
    const html = await render({ ...base, kind: 'letter', shape: 'letter', breakdown: ['a', 'b', 'c', 'd'].map((label) => ({ label })) });
    expect(html.match(/class="fold fold-\d/g)).toHaveLength(4);
  });
});
