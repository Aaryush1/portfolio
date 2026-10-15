/**
 * The homepage story's shape and its checks (prd-probe-home §3–§5). Pure.
 * Log lines exist only once Aaryush has approved them (§4), so a log thought without a dated approval is an error, not a draft.
 * Memories point at companies (/work/<slug>) and transmissions at writing (/writing/<slug>); a bad ref fails the build.
 */
import type { Timing } from './director';

export type BeatId ='boot' | 'liftoff' | 'replication' | 'drift' | 'bustle' | 'landing' | 'seam';
export type ThoughtKind = 'log' | 'memory' | 'transmission';
export interface ApprovedLine { text: string; approved: string }
export interface Thought { kind: ThoughtKind; atMs: number; ref?: string; line?: ApprovedLine }
export interface Beat { id: BeatId; idea: string; intent: string[]; questions: string[]; dwellMs: number; thoughts: Thought[] }

export const BEAT_IDS: readonly BeatId[] = ['boot', 'liftoff', 'replication', 'drift', 'bustle', 'landing', 'seam'];
const BANNED = ['leverage', 'unlock', 'transform', 'seamless', 'paradigm shift'];
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validateStory(beats: readonly Beat[], known: { companies: readonly string[]; writing: readonly string[] }): string[] {
  const errs: string[] = [];
  if (beats.map((b) => b.id).join() !== BEAT_IDS.join()) errs.push(`beats must be ${BEAT_IDS.join(', ')} in that order`);
  for (const b of beats) {
    if (!(b.dwellMs > 0)) errs.push(`${b.id}: dwellMs must be positive`);
    for (const th of b.thoughts) {
      if (th.atMs > b.dwellMs) errs.push(`${b.id}: a thought at ${th.atMs} ms is after the beat ends (${b.dwellMs} ms)`);
      if (th.kind === 'memory' && !known.companies.includes(th.ref ?? '')) errs.push(`${b.id}: memory "${th.ref}" is not a company`);
      if (th.kind === 'transmission' && !known.writing.includes(th.ref ?? '')) errs.push(`${b.id}: transmission "${th.ref}" is not a piece of writing`);
      if (th.kind === 'log' && !th.line) errs.push(`${b.id}: a log thought needs a line Aaryush approved`);
      if (th.line) {
        if (!DATE.test(th.line.approved)) errs.push(`${b.id}: approval "${th.line.approved}" is not a YYYY-MM-DD date`);
        const low = th.line.text.toLowerCase();
        for (const w of BANNED) if (low.includes(w)) errs.push(`${b.id}: "${w}" is a banned word`);
      }
    }
  }
  return errs;
}

export const timingOf = (beats: readonly Beat[], idleMs: number, cooldownMs: number): Timing => ({ dwellMs: beats.map((b) => b.dwellMs), idleMs, cooldownMs });
