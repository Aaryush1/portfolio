import { describe, expect, it } from 'vitest';
import { revisions } from '../../src/data/revisions';

describe('revision block data (E14)', () => {
  it('lists the approved rows exactly, newest first', () => {
    expect(revisions.map((r) => [r.rev, r.date, r.description])).toEqual([
      ['G', '2026.10', 'A contact card that remembers where you met.'],
      ['F', '2026.10', 'The writing room.'],
      ['E', '2026.10', 'The hero learns to rearrange itself.'],
      ['D', '2026.10', 'Topography and light replace the grid. A new mark.'],
      ['C', '2026.10', 'Redrawn as a set of sheets. Systems you can open.'],
      ['B', '2026.02', 'Repositioned around AI. The writing begins.'],
      ['A', '2025.08', 'Rebuilt in Astro. Works on phones.'],
    ]);
  });
  it('is lettered without gaps, dated year.month, and never goes back in time', () => {
    const letters = revisions.map((r) => r.rev);
    expect(letters).toEqual([...letters].sort().reverse());
    letters.forEach((l, i) => expect(l.charCodeAt(0)).toBe('A'.charCodeAt(0) + letters.length - 1 - i));
    for (const r of revisions) expect(r.date).toMatch(/^\d{4}\.(0[1-9]|1[0-2])$/);
    for (let i = 1; i < revisions.length; i++) expect(revisions[i - 1].date >= revisions[i].date).toBe(true);
  });
});
