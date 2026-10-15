/**
 * The homepage story's director (prd-probe-home §3, "Pace and control"). Pure: the caller passes the time.
 * It decides only which beat the camera is heading for. Flying there is the renderer's job.
 * One gesture is one beat; gestures inside the cooldown are dropped, never queued. After a beat has dwelt and the visitor has been
 * idle for idleMs, it carries on by one, and a long sleep (hidden tab, locked phone) still only moves one.
 */
export interface Timing { dwellMs: readonly number[]; idleMs: number; cooldownMs: number }
export interface DirectorState { beat: number; since: number; lastGesture: number; lastActivity: number }

export const IDLE_MS = 20_000;
export const COOLDOWN_MS = 700;

export const start = (now: number): DirectorState => ({ beat: 0, since: now, lastGesture: -Infinity, lastActivity: now });

const arrive = (beat: number, now: number, lastGesture: number): DirectorState => ({ beat, since: now, lastGesture, lastActivity: now });

export function gesture(s: DirectorState, dir: 1 | -1, now: number, t: Timing): DirectorState {
  if (now - s.lastGesture < t.cooldownMs) return s;
  const n = t.dwellMs.length;
  const beat = dir === 1 ? (s.beat + 1) % n : Math.max(0, s.beat - 1);
  if (beat === s.beat) return { ...s, lastGesture: now, lastActivity: now };
  return arrive(beat, now, now);
}

export function jump(s: DirectorState, beat: number, now: number, t: Timing): DirectorState {
  return arrive(Math.max(0, Math.min(t.dwellMs.length - 1, Math.round(beat))), now, s.lastGesture);
}

export const activity = (s: DirectorState, now: number): DirectorState => ({ ...s, lastActivity: Math.max(s.lastActivity, now) });

export const invited = (s: DirectorState, now: number, t: Timing): boolean => now - s.since >= t.dwellMs[s.beat];

export function tick(s: DirectorState, now: number, t: Timing): DirectorState {
  const readyAt = Math.max(s.since + t.dwellMs[s.beat], s.lastActivity);
  if (now - readyAt < t.idleMs) return s;
  return arrive((s.beat + 1) % t.dwellMs.length, now, s.lastGesture);
}
