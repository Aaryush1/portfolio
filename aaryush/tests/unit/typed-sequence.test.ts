import { describe, expect, it } from 'vitest';
import { createTypedSequence, shortcutBlocked, type KeyInput } from '../../src/lib/keymap';

const k = (key: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, keyCode: 0,
  editable: false, popupOpen: false, mapOpen: false, ...over,
});

function seq(gap = 1500) {
  let t = 0;
  const s = createTypedSequence('contextos', { now: () => t, gap });
  // each key lands 40ms after the last; `at` is the time of the first key
  const type = (word: string, at = t) => { let hit = false; for (const ch of word) { t = at; hit = s.handle(k(ch)) || hit; at += 40; } return hit; };
  return { s, type };
}

describe('shortcutBlocked (the guards shared with the keyboard map)', () => {
  it('blocks composition, modifiers, editable targets and an open map', () => {
    expect(shortcutBlocked(k('a', { isComposing: true }))).toBe(true);
    expect(shortcutBlocked(k('a', { keyCode: 229 }))).toBe(true);
    for (const m of ['ctrlKey', 'metaKey', 'altKey'] as const) expect(shortcutBlocked(k('a', { [m]: true }))).toBe(true);
    expect(shortcutBlocked(k('a', { editable: true }))).toBe(true);
    expect(shortcutBlocked(k('a', { mapOpen: true }))).toBe(true);
  });
  it('lets plain keys through, including Shift', () => {
    expect(shortcutBlocked(k('a'))).toBe(false);
    expect(shortcutBlocked(k('A'))).toBe(false); // Shift is not a blocking modifier
  });
});

describe('createTypedSequence', () => {
  it('fires once when the word is typed, in any case', () => {
    const { type } = seq();
    expect(type('contextos')).toBe(true);
    const again = seq();
    expect(again.type('ConTextOS')).toBe(true);
  });
  it('fires on a word typed inside a longer run of letters', () => {
    const { type } = seq();
    expect(type('xxcontextos')).toBe(true);
  });
  it('does not fire on a near miss', () => {
    // each near miss gets a fresh matcher: 'context' followed by 'os' is itself a valid spelling
    expect(seq().type('contextsO')).toBe(false);
    expect(seq().type('context')).toBe(false);
    expect(seq().type('contextoz')).toBe(false);
    expect(seq().type('contxtos')).toBe(false);
  });
  it('forgets letters after a 1.5s gap between keys', () => {
    const { type } = seq();
    type('contex', 0);         // last key at 200ms, then a pause of more than 1.5s
    expect(type('tos', 1800)).toBe(false);
    expect(type('contextos', 5000)).toBe(true);
  });
  it('keeps the word when keys are within the gap', () => {
    const { type } = seq();
    expect(type('context', 0)).toBe(false);
    expect(type('os', 1400)).toBe(true);
  });
  it('ignores keys that are not characters (Shift, arrows) without breaking the word', () => {
    const { s } = seq();
    for (const ch of 'context') s.handle(k(ch));
    expect(s.handle(k('Shift'))).toBe(false);
    expect(s.handle(k('ArrowLeft'))).toBe(false);
    expect(s.handle(k('o'))).toBe(false);
    expect(s.handle(k('s'))).toBe(true);
  });
  it('blocked keys reset the word and never count', () => {
    const { s } = seq();
    for (const ch of 'contextos'.slice(0, 8)) s.handle(k(ch));
    expect(s.handle(k('s', { editable: true }))).toBe(false);
    expect(s.handle(k('s'))).toBe(false); // the word was broken: a lone s is not a match
  });
  it('a pop-up being open blocks it like the shortcuts', () => {
    const { s } = seq();
    for (const ch of 'contextos'.slice(0, 8)) s.handle(k(ch));
    expect(s.handle(k('s', { popupOpen: true }))).toBe(false);
  });
  it('clears after a match, so the same letters need typing again', () => {
    const { type } = seq();
    expect(type('contextos')).toBe(true);
    expect(type('os')).toBe(false);
    expect(type('contextos', 2000)).toBe(true);
  });
});
