import { describe, expect, it } from 'vitest';
import { createKeyRouter, type KeyInput } from '../../src/lib/keymap';

const k = (key: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, keyCode: 0,
  editable: false, popupOpen: false, mapOpen: false, ...over,
});

function router(has = { time: false }) {
  let t = 0;
  const r = createKeyRouter({ now: () => t, timeout: 1200, hasTime: () => has.time });
  return { r, at: (ms: number) => { t = ms; }, has };
}

describe('keyboard router', () => {
  it('? opens the map', () => {
    expect(router().r.handle(k('?'))).toBe('map');
  });
  it('resolves ? via e.key regardless of keyCode (non-US layouts)', () => {
    expect(router().r.handle(k('?', { keyCode: 191 }))).toBe('map');
    expect(router().r.handle(k('?', { keyCode: 219 }))).toBe('map');
  });
  it('maps g then h/l/w/r/c', () => {
    const want = { h: 'hero', l: 'levels', w: 'work', r: 'writing', c: 'contact' } as const;
    for (const [key, action] of Object.entries(want)) {
      const { r } = router();
      expect(r.handle(k('g'))).toBeNull();
      expect(r.handle(k(key))).toBe(action);
    }
  });
  it('a g sequence times out after 1.2s', () => {
    const { r, at } = router();
    r.handle(k('g'));
    at(1199);
    expect(r.handle(k('w'))).toBe('work');
    at(2000);
    r.handle(k('g'));
    at(2000 + 1201);
    expect(r.handle(k('w'))).toBeNull();
  });
  it('a sequence is consumed once and cleared by other keys', () => {
    const { r } = router();
    r.handle(k('g'));
    expect(r.handle(k('x'))).toBeNull();
    expect(r.handle(k('w'))).toBeNull();
    r.handle(k('g'));
    r.handle(k('w'));
    expect(r.handle(k('w'))).toBeNull();
  });
  it('ignores everything in editable targets', () => {
    const { r } = router();
    expect(r.handle(k('?', { editable: true }))).toBeNull();
    r.handle(k('g', { editable: true }));
    expect(r.handle(k('w'))).toBeNull();
    r.handle(k('g'));
    expect(r.handle(k('w', { editable: true }))).toBeNull();
  });
  it('ignores modifiers', () => {
    for (const m of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      const { r } = router();
      expect(r.handle(k('?', { [m]: true }))).toBeNull();
      r.handle(k('g', { [m]: true }));
      expect(r.handle(k('w'))).toBeNull();
    }
  });
  it('ignores IME composition', () => {
    const { r } = router();
    expect(r.handle(k('?', { isComposing: true }))).toBeNull();
    expect(r.handle(k('?', { keyCode: 229 }))).toBeNull();
    r.handle(k('g', { isComposing: true }));
    expect(r.handle(k('w'))).toBeNull();
  });
  it('while a pop-up is open only ? works', () => {
    const { r } = router();
    expect(r.handle(k('?', { popupOpen: true }))).toBe('map');
    r.handle(k('g', { popupOpen: true }));
    expect(r.handle(k('w', { popupOpen: true }))).toBeNull();
    expect(router({ time: true }).r.handle(k('t', { popupOpen: true }))).toBeNull();
  });
  it('while the map is open nothing else fires', () => {
    const { r } = router();
    r.handle(k('g', { mapOpen: true }));
    expect(r.handle(k('w', { mapOpen: true }))).toBeNull();
    expect(r.handle(k('?', { mapOpen: true }))).toBeNull();
  });
  it('t is a no-op unless the time preview exists', () => {
    expect(router({ time: false }).r.handle(k('t'))).toBeNull();
    expect(router({ time: true }).r.handle(k('t'))).toBe('time');
  });
  it('does not treat capital letters as g sequences', () => {
    const { r } = router();
    r.handle(k('G'));
    expect(r.handle(k('w'))).toBeNull();
  });
});
