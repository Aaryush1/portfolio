import { describe, expect, it } from 'vitest';
import { diagrams } from '../../src/data/diagrams';
import { renderOg, topoPaths, type OgCard } from '../../src/lib/og';

const isPng = (b: Buffer) => b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
const dims = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const MAX_BYTES = 300 * 1024;

const cards: [string, OgCard][] = [
  ['home', { type: 'home', name: 'Aaryush Gupta', line: 'I build the systems behind how anyone solves problems.', deploy: '2026.10' }],
  ['system with diagram', { type: 'place', kicker: 'System diagram', title: 'Skale.win', sub: 'Career platform', diagram: diagrams.skale, seed: 3 }],
  ['system without diagram', { type: 'place', kicker: 'System', title: 'Ready Rebound', sub: 'Claims underwriting', seed: 5 }],
  ['company, no diagram', { type: 'place', kicker: 'Practice', title: 'Gupta Advisory', seed: 7 }],
  ['letter', { type: 'essay', shape: 'letter', kicker: 'LETTER · 14 MIN READ', title: 'This Is Bigger Than Electricity' }],
  ['paper', { type: 'essay', shape: 'paper', kicker: 'PAPER · 6 MIN READ', title: 'The Quiet Singularity' }],
  ['sheet', { type: 'essay', shape: 'sheet', kicker: 'ESSAY · 3 MIN READ', title: 'A very long title that goes on across several lines of the card to prove it still fits' }],
  ['writing', { type: 'writing' }],
];

describe('renderOg', () => {
  it.each(cards)('%s: a 1200x630 PNG under 300KB', async (_n, card) => {
    const png = await renderOg(card);
    expect(isPng(png)).toBe(true);
    expect(dims(png)).toEqual([1200, 630]);
    expect(png.length).toBeLessThan(MAX_BYTES);
  }, 30_000);

  it('is byte-stable across runs', async () => {
    const [, card] = cards[1];
    expect((await renderOg(card)).equals(await renderOg(card))).toBe(true);
  }, 30_000);
});

describe('topoPaths', () => {
  it('is deterministic and seed-dependent, with one amber contour', () => {
    const a = topoPaths(23), b = topoPaths(23), c = topoPaths(24);
    expect(a).toEqual(b);
    expect(a.thin).not.toEqual(c.thin);
    expect(a.amber.startsWith('M')).toBe(true);
    expect(a.thin.length).toBeGreaterThan(5000);
    expect(a.thin.length + a.amber.length).toBeLessThan(160_000);
  });
});

