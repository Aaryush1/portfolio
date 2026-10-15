import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BEAT_IDS, timingOf, validateStory, type Beat } from '../../src/lib/probe/story';
import { story } from '../../src/data/probe-story';

const slugs = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
const known = { companies: slugs('src/content/companies'), writing: slugs('src/content/writing') };

const beat = (over: Partial<Beat>): Beat => ({ id: 'boot', idea: 'x', intent: ['x'], questions: [], dwellMs: 1000, thoughts: [], ...over });
const seven = (patch: (b: Beat[]) => void): Beat[] => { const b = BEAT_IDS.map((id) => beat({ id })); patch(b); return b; };

describe('the story data', () => {
  it('is valid against the real content', () => {
    expect(validateStory(story, known)).toEqual([]);
  });

  it('has the seven beats in order', () => {
    expect(story.map((b) => b.id)).toEqual(BEAT_IDS);
  });

  it('gives the director one dwell per beat', () => {
    expect(timingOf(story, 20000, 700).dwellMs).toHaveLength(7);
  });
});

describe('validateStory', () => {
  it('rejects beats out of order or missing', () => {
    expect(validateStory(BEAT_IDS.slice(1).map((id) => beat({ id })), known)).toContain('beats must be boot, liftoff, replication, drift, bustle, landing, seam in that order');
  });

  it('rejects a memory pointing at a company that does not exist', () => {
    const errs = validateStory(seven((b) => b[1].thoughts.push({ kind: 'memory', atMs: 0, ref: 'no-such-co' })), known);
    expect(errs).toContain('liftoff: memory "no-such-co" is not a company');
  });

  it('rejects a transmission pointing at writing that does not exist', () => {
    const errs = validateStory(seven((b) => b[3].thoughts.push({ kind: 'transmission', atMs: 0, ref: 'gone' })), known);
    expect(errs).toContain('drift: transmission "gone" is not a piece of writing');
  });

  it('rejects a log thought without an approved line', () => {
    const errs = validateStory(seven((b) => b[1].thoughts.push({ kind: 'log', atMs: 0 })), known);
    expect(errs).toContain('liftoff: a log thought needs a line Aaryush approved');
  });

  it('rejects a line whose approval is not a date', () => {
    const errs = validateStory(seven((b) => b[1].thoughts.push({ kind: 'log', atMs: 0, line: { text: 'hi', approved: 'soon' } })), known);
    expect(errs).toContain('liftoff: approval "soon" is not a YYYY-MM-DD date');
  });

  it('rejects banned words in approved lines', () => {
    const errs = validateStory(seven((b) => b[2].thoughts.push({ kind: 'log', atMs: 0, line: { text: 'Pure Leverage.', approved: '2026-10-15' } })), known);
    expect(errs).toContain('replication: "leverage" is a banned word');
  });

  it('rejects a thought timed after its beat ends, and a non-positive dwell', () => {
    const errs = validateStory(seven((b) => { b[4].dwellMs = 0; b[5].thoughts.push({ kind: 'memory', atMs: 5000, ref: 'cylerity' }); }), known);
    expect(errs).toContain('bustle: dwellMs must be positive');
    expect(errs).toContain('landing: a thought at 5000 ms is after the beat ends (1000 ms)');
  });
});
