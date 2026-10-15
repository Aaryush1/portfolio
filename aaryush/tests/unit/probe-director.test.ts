import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, IDLE_MS, activity, gesture, invited, jump, start, tick, type Timing } from '../../src/lib/probe/director';

const t: Timing = { dwellMs: [8000, 30000, 30000, 30000, 30000, 30000, 12000], idleMs: IDLE_MS, cooldownMs: COOLDOWN_MS };

describe('director', () => {
  it('starts at the boot', () => {
    expect(start(1000)).toEqual({ beat: 0, since: 1000, lastGesture: -Infinity, lastActivity: 1000 });
  });

  it('moves exactly one beat per gesture, either way', () => {
    let s = start(0);
    s = gesture(s, 1, 1000, t);
    expect(s.beat).toBe(1);
    s = gesture(s, 1, 2000, t);
    expect(s.beat).toBe(2);
    s = gesture(s, -1, 3000, t);
    expect(s.beat).toBe(1);
  });

  it('ignores gestures inside the cooldown instead of queueing them', () => {
    let s = gesture(start(0), 1, 1000, t);
    s = gesture(s, 1, 1000 + COOLDOWN_MS - 1, t);
    s = gesture(s, 1, 1000 + COOLDOWN_MS - 1, t);
    expect(s.beat).toBe(1);
    s = gesture(s, 1, 1000 + COOLDOWN_MS, t);
    expect(s.beat).toBe(2);
  });

  it('retargets by one from where it was heading when a gesture lands mid-flight', () => {
    let s = gesture(start(0), 1, 1000, t); // heading for 1, camera still flying
    s = gesture(s, 1, 1000 + COOLDOWN_MS, t);
    expect(s.beat).toBe(2);
    s = gesture(s, -1, 1000 + 2 * COOLDOWN_MS, t);
    expect(s.beat).toBe(1);
  });

  it('loops forward from the last beat through the seam to the boot', () => {
    let s = jump(start(0), 6, 0, t);
    s = gesture(s, 1, 5000, t);
    expect(s.beat).toBe(0);
  });

  it('does not go back past the boot', () => {
    const s = gesture(start(0), -1, 1000, t);
    expect(s.beat).toBe(0);
  });

  it('invites the visitor on once the beat has dwelt', () => {
    const s = start(0);
    expect(invited(s, 7999, t)).toBe(false);
    expect(invited(s, 8000, t)).toBe(true);
  });

  it('carries on by itself after dwell plus idle', () => {
    const s = start(0);
    expect(tick(s, 8000 + IDLE_MS - 1, t).beat).toBe(0);
    const next = tick(s, 8000 + IDLE_MS, t);
    expect(next.beat).toBe(1);
    expect(next.since).toBe(8000 + IDLE_MS);
  });

  it('counts any activity as not idle', () => {
    let s = start(0);
    s = activity(s, 25000);
    expect(tick(s, 25000 + IDLE_MS - 1, t).beat).toBe(0);
    expect(tick(s, 25000 + IDLE_MS, t).beat).toBe(1);
  });

  it('moves at most one beat when it comes back from a long sleep', () => {
    const s = start(0);
    const woke = tick(s, 10 * 60 * 60 * 1000, t);
    expect(woke.beat).toBe(1);
    expect(tick(woke, 10 * 60 * 60 * 1000 + 16, t).beat).toBe(1);
  });

  it('loops through the seam when idle on the last beat', () => {
    const s = jump(start(0), 6, 0, t);
    expect(tick(s, 12000 + IDLE_MS, t).beat).toBe(0);
  });

  it('jumps anywhere from the index, without a cooldown, clamped to the beats', () => {
    let s = gesture(start(0), 1, 1000, t);
    s = jump(s, 4, 1001, t);
    expect(s.beat).toBe(4);
    expect(jump(s, 99, 1002, t).beat).toBe(6);
    expect(jump(s, -3, 1003, t).beat).toBe(0);
  });
});
