import { describe, expect, it } from 'vitest';
import { daypartFor } from '../../src/lib/daypart';
import { NIGHT_NOTE } from '../../src/lib/night-note';

describe('general notes (E7)', () => {
  it('reads exactly as the spec: a drafting label and two numbered lines', () => {
    expect(NIGHT_NOTE.label).toBe('General notes');
    expect(NIGHT_NOTE.lines).toEqual(['It’s past nine.', 'You’re still here.', 'Good.']);
  });
  it('the note period is night: 21:00 to 07:00, with the boundary hours', () => {
    const night = (h: number) => daypartFor(h) === 'night';
    expect(night(20)).toBe(false); // 20:59 is evening
    expect(night(21)).toBe(true);  // 21:00
    expect(night(6)).toBe(true);   // 06:59
    expect(night(7)).toBe(false);  // 07:00
    expect(night(13)).toBe(false);
  });
});
