import { describe, expect, it } from 'vitest';
import { deskKey, type KeyInput } from '../../src/lib/keymap';

const k = (key: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, keyCode: 0,
  editable: false, popupOpen: false, mapOpen: false, ...over,
});

describe('desk arrow keys (E15)', () => {
  it('moves right and left in visual order, and stops at the ends', () => {
    expect(deskKey(k('ArrowRight'), 4, 1)).toEqual({ to: 2 });
    expect(deskKey(k('ArrowLeft'), 4, 2)).toEqual({ to: 1 });
    expect(deskKey(k('ArrowRight'), 4, 3)).toEqual({ to: 3 });
    expect(deskKey(k('ArrowLeft'), 4, 0)).toEqual({ to: 0 });
  });
  it('with no piece lit, right starts at the first and left at the last', () => {
    expect(deskKey(k('ArrowRight'), 4, -1)).toEqual({ to: 0 });
    expect(deskKey(k('ArrowLeft'), 4, -1)).toEqual({ to: 3 });
  });
  it('Home and End jump to the first and last piece', () => {
    expect(deskKey(k('Home'), 4, 2)).toEqual({ to: 0 });
    expect(deskKey(k('End'), 4, 1)).toEqual({ to: 3 });
  });
  it('Enter opens the lit piece, and does nothing when none is lit', () => {
    expect(deskKey(k('Enter'), 4, 2)).toEqual({ open: 2 });
    expect(deskKey(k('Enter'), 4, -1)).toBeNull();
  });
  it('ignores keys when a text field has focus, with modifiers, during IME, or with a pop-up or the map open', () => {
    for (const over of [{ editable: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }, { mapOpen: true }, { popupOpen: true }]) {
      expect(deskKey(k('ArrowRight', over), 4, 0), JSON.stringify(over)).toBeNull();
    }
  });
  it('does nothing on an empty desk, and ignores other keys', () => {
    expect(deskKey(k('ArrowRight'), 0, -1)).toBeNull();
    expect(deskKey(k('Home'), 0, -1)).toBeNull();
    expect(deskKey(k('ArrowDown'), 4, 1)).toBeNull();
    expect(deskKey(k('a'), 4, 1)).toBeNull();
  });
});
