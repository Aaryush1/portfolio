import { describe, expect, it } from 'vitest';
import { SWIPE, WHEEL, key, swipe, wheel, wheelStart, type Step, type WheelState } from '../../src/lib/probe/gestures';

function run(events: [number, number][], mode = 0): Step[] {
  let s: WheelState = wheelStart();
  const out: Step[] = [];
  for (const [dy, at] of events) { let step: Step; [s, step] = wheel(s, dy, mode, at); if (step) out.push(step); }
  return out;
}

describe('wheel', () => {
  it('a single notch of a mouse wheel is one step', () => {
    expect(run([[100, 0]])).toEqual([1]);
  });

  it('a trackpad inertia tail of 120 events over about 2 s is one step', () => {
    const tail: [number, number][] = Array.from({ length: 120 }, (_, i) => [Math.max(1, 60 * Math.exp(-i / 30)), i * 16]);
    expect(run(tail)).toEqual([1]);
  });

  it('a hard flick of big deltas is one step', () => {
    expect(run(Array.from({ length: 10 }, (_, i) => [800, i * 8] as [number, number]))).toEqual([1]);
  });

  it('two deliberate scrolls with a pause between are two steps', () => {
    expect(run([[100, 0], [100, 16], [100, 16 + WHEEL.gapMs + 1]])).toEqual([1, 1]);
  });

  it('tiny jitter below the threshold does nothing', () => {
    expect(run([[3, 0], [-2, 16], [4, 32]])).toEqual([]);
  });

  it('scrolling up is a step back', () => {
    expect(run([[-120, 0]])).toEqual([-1]);
  });

  it('line-mode deltas (Firefox) are scaled to pixels', () => {
    expect(run([[3, 0]], 1)).toEqual([1]);
  });
});

describe('swipe', () => {
  it('a swipe up is forward and a swipe down is back', () => {
    expect(swipe(-120, 200)).toBe(1);
    expect(swipe(120, 200)).toBe(-1);
  });
  it('a short or slow drag is not a swipe', () => {
    expect(swipe(-(SWIPE.minPx - 1), 200)).toBe(0);
    expect(swipe(-200, SWIPE.maxMs + 1)).toBe(0);
  });
});

describe('key', () => {
  it('maps the stepping keys', () => {
    for (const k of ['ArrowDown', 'ArrowRight', 'PageDown', ' ']) expect(key(k)).toBe(1);
    for (const k of ['ArrowUp', 'ArrowLeft', 'PageUp']) expect(key(k)).toBe(-1);
  });
  it('leaves every other key to the browser and the existing easter eggs', () => {
    for (const k of ['L', 'l', '[', ']', 'Tab', 'Enter', 'Escape']) expect(key(k)).toBeNull();
  });
});
