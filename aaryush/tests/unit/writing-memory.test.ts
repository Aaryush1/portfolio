import { describe, expect, it } from 'vitest';
import { forget, inRange, lastOpened, noteLast, noteOpened, noteSection, offPagePickup, pickup, placeLabel, readMemory } from '../../src/lib/writing-memory';

const fake = (initial?: string) => {
  let v: string | null = initial ?? null;
  return { getItem: () => v, setItem: (_: string, x: string) => { v = x; }, removeItem: () => { v = null; }, raw: () => v } as any;
};
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } } as any;

describe('writing memory', () => {
  it('keeps the furthest section, never moves backwards', () => {
    const s = fake();
    noteSection('p', 3, 6, s, 1); noteSection('p', 1, 6, s, 2);
    expect(readMemory(s).pieces.p.sec).toBe(3);
  });
  it('clamps a section beyond the piece and ignores non-finite values', () => {
    const s = fake();
    noteSection('p', 99, 6, s, 1); expect(readMemory(s).pieces.p.sec).toBe(5);
    noteSection('q', Number.NaN, 6, s, 1); expect(readMemory(s).pieces.q).toBeUndefined();
    noteSection('r', 2, Number.NaN, s, 1); expect(readMemory(s).pieces.r).toBeUndefined();
  });
  it('treats corrupt, foreign or wrong-shape values as empty', () => {
    for (const bad of ['not json', '[]', '{"v":2}', '{"v":1,"pieces":"x"}', 'null', '{"v":1,"pieces":{"p":{"sec":"3"}}}', '{"v":1,"pieces":{"p":{"sec":-1,"t":1}}}'])
      expect(readMemory(fake(bad)).pieces).toEqual({});
  });
  it('never throws when storage throws', () => {
    expect(() => { noteOpened('p', throwing); noteSection('p', 2, 6, throwing); noteLast('p', throwing, throwing); forget(throwing, throwing); }).not.toThrow();
    expect(readMemory(throwing).pieces).toEqual({});
    expect(lastOpened(throwing, throwing)).toBeNull();
  });
  it('forget clears everything', () => {
    const s = fake(); noteOpened('p', s); noteSection('p', 2, 6, s); forget(s, fake());
    expect(readMemory(s).pieces).toEqual({});
  });
  it('pickup offers a section only when it is past the start, inside the piece and not the last', () => {
    const s = fake(); noteSection('p', 2, 6, s);
    expect(pickup('p', 6, s)).toEqual({ sec: 2 });
    expect(pickup('p', 3, s)).toBeNull();   // sec 2 is the final section of 3: finished, nothing to offer
    expect(pickup('p', 2, s)).toBeNull();   // stale: piece now has fewer sections
    expect(pickup('unread', 6, s)).toBeNull();
    noteSection('z', 0, 6, s); expect(pickup('z', 6, s)).toBeNull(); // opened but never past the start
  });
  it('records the last opened piece', () => {
    const s = fake(); noteOpened('a', s); noteOpened('b', s);
    expect(readMemory(s).last).toBe('b');
  });
  it('last falls back to the session store when the main store throws', () => {
    const sess = fake();
    noteLast('a', throwing, sess);
    expect(lastOpened(throwing, sess)).toBe('a');
    const main = fake(); noteLast('b', main, sess);
    expect(lastOpened(main, sess)).toBe('b');
  });
  it('a stale section is out of range', () => {
    expect(inRange(99, 6)).toBe(false);
    expect(inRange(5, 6)).toBe(true);
    expect(inRange(3, 0)).toBe(true);
  });
});

describe('teaser place labels and the off-page pick-up', () => {
  it("names the place in each piece's own words", () => {
    expect(placeLabel('paper', 2)).toBe('section III');
    expect(placeLabel('note', 1)).toBe('card 2');
    expect(placeLabel('letter', 1)).toBe('fold 2');
    expect(placeLabel('paper', 14)).toBe('section 15');
  });
  const all = [{ slug: 'a', title: 'A', total: 6 }, { slug: 'b', title: 'B', total: 6 }, { slug: 'c', title: 'C', total: 6 }];
  const store = (pieces: Record<string, { sec: number; t: number }>) => fake(JSON.stringify({ v: 1, pieces }));
  it('offers the most recently read started piece that is not listed', () => {
    const s = store({ a: { sec: 2, t: 5 }, b: { sec: 3, t: 9 }, c: { sec: 2, t: 7 } });
    expect(offPagePickup(all, ['a'], s)).toEqual({ piece: all[1], sec: 3 });
    expect(offPagePickup(all, ['a', 'b'], s)).toEqual({ piece: all[2], sec: 2 });
  });
  it('offers nothing when every started piece is listed, or the unlisted ones are not started or already finished', () => {
    const s = store({ a: { sec: 2, t: 5 }, b: { sec: 0, t: 9 }, c: { sec: 5, t: 7 } });
    expect(offPagePickup(all, ['a'], s)).toBeNull();
    expect(offPagePickup(all, ['a', 'b', 'c'], store({ a: { sec: 2, t: 5 } }))).toBeNull();
    expect(offPagePickup(all, [], fake())).toBeNull();
    expect(offPagePickup(all, [], throwing)).toBeNull();
  });
});
