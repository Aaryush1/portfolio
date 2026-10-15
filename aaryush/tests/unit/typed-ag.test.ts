import { describe, expect, it } from 'vitest';
import { createTypedSequence, type KeyInput } from '../../src/lib/keymap';

// E11: typing `ag.` anywhere replays the header mark. It uses the same typed-sequence matcher as `contextos`.
const k = (key: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, keyCode: 0,
  editable: false, popupOpen: false, mapOpen: false, ...over,
});

function run(keys: string[], over: Partial<KeyInput> = {}) {
  let t = 0;
  const s = createTypedSequence('ag.', { now: () => t });
  return keys.map((key) => { t += 40; return s.handle(k(key, over)); });
}

describe('typed sequence ag.', () => {
  it('fires on the full period', () => {
    expect(run(['a', 'g', '.'])).toEqual([false, false, true]);
  });
  it('fires inside a longer run, and not on a near miss', () => {
    expect(run(['x', 'a', 'g', '.']).at(-1)).toBe(true);
    expect(run(['a', 'g', ',']).includes(true)).toBe(false);
    expect(run(['g', '.']).includes(true)).toBe(false);
  });
  it('is blocked by the same guards as the shortcuts', () => {
    expect(run(['a', 'g', '.'], { editable: true }).includes(true)).toBe(false);
    expect(run(['a', 'g', '.'], { metaKey: true }).includes(true)).toBe(false);
    expect(run(['a', 'g', '.'], { popupOpen: true }).includes(true)).toBe(false);
  });
});
