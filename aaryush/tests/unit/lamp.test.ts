import { describe, expect, it } from 'vitest';
import { LAMP_FULL_MS, LAMP_READ_WINDOW_MS, LAMP_TICK_MS, isReading, nextActive, warmth } from '../../src/lib/lamp';

// E12: the essay lamp warms only while someone is reading, and reaches full warmth after about 5 minutes of it.

describe('warmth (E12)', () => {
  it('is zero at rest, and for nonsense input', () => {
    expect(warmth(0)).toBe(0);
    expect(warmth(-5)).toBe(0);
    expect(warmth(Number.NaN)).toBe(0);
  });
  it('is half way at 2.5 minutes of reading and full at 5 minutes', () => {
    expect(warmth(LAMP_FULL_MS / 2)).toBe(0.5);
    expect(warmth(LAMP_FULL_MS)).toBe(1);
  });
  it('never goes past full, however long someone stays', () => {
    expect(warmth(LAMP_FULL_MS * 10)).toBe(1);
  });
});

describe('isReading (E12)', () => {
  const now = 1_000_000;
  it('counts a visible tab with activity in the last 60 seconds', () => {
    expect(isReading({ visible: true, lastActivityAt: now - 10_000, now })).toBe(true);
    expect(isReading({ visible: true, lastActivityAt: now - LAMP_READ_WINDOW_MS, now })).toBe(true);
  });
  it('does not count a hidden tab, however recent the activity', () => {
    expect(isReading({ visible: false, lastActivityAt: now, now })).toBe(false);
  });
  it('does not count activity older than 60 seconds', () => {
    expect(isReading({ visible: true, lastActivityAt: now - LAMP_READ_WINDOW_MS - 1, now })).toBe(false);
  });
  it('does not count a page where nothing has happened yet', () => {
    expect(isReading({ visible: true, lastActivityAt: -Infinity, now })).toBe(false);
  });
});

describe('nextActive (E12)', () => {
  const reading = { visible: true, lastActivityAt: 0, now: 1 };
  const idle = { visible: true, lastActivityAt: -Infinity, now: 1 };
  it('adds one tick only while reading', () => {
    expect(nextActive(0, reading)).toBe(LAMP_TICK_MS);
    expect(nextActive(0, idle)).toBe(0);
  });
  it('takes about five minutes of reading to reach full warmth', () => {
    let active = 0;
    for (let i = 0; i < 19; i++) active = nextActive(active, reading);
    expect(warmth(active)).toBeLessThan(1);
    active = nextActive(active, reading);
    expect(warmth(active)).toBe(1);
  });
  it('is imperceptible minute to minute: no more than a fifth of the full shift in one minute', () => {
    expect(warmth(LAMP_FULL_MS / 5)).toBeLessThanOrEqual(0.2);
  });
});
