// The homepage story (prd-probe-home). Intent notes are Claude's, for talking each beat through with Aaryush; they never render.
// Log lines are added only with Aaryush's approval date (validateStory enforces it). Dwell times are first guesses, tuned in part 2.
import type { Beat } from '../lib/probe/story';

export const story: readonly Beat[] = [
  {
    id: 'boot', idea: 'Waking up as a probe', dwellMs: 12000, thoughts: [],
    intent: ['The amber dot wakes; a start-up sequence: you are a probe, you have just woken up.', 'Then the visitor\'s real sky resolves above a figure on the ground who could be anyone.'],
    questions: ['Raw material: "What the fuck? Wait, this is kind of cool, actually. Hold on, what can I do?"'],
  },
  {
    id: 'liftoff', idea: 'Intelligence stops being scarce', dwellMs: 30000,
    thoughts: [{ kind: 'memory', atMs: 9000, ref: 'ready-rebound' }, { kind: 'memory', atMs: 18000, ref: 'cylerity' }],
    intent: ['The camera leaves the ground. Thinking stops being the bottleneck.', 'Work turned into conversation: talk, move your hands, and what is in your head becomes real.'],
    questions: ['What does it feel like when it stops feeling like work?'],
  },
  {
    id: 'replication', idea: 'Things that build things', dwellMs: 30000,
    thoughts: [{ kind: 'memory', atMs: 10000, ref: 'skale' }, { kind: 'memory', atMs: 20000, ref: 'gupta-advisory' }],
    intent: ['Another one comes online. Not just the self: the systems and structures in your head get replicated.', 'Builders of builders. ("Leverage" is a banned word; find another way.)'],
    questions: ['What is the first thing you would want copied?'],
  },
  {
    id: 'drift', idea: 'The light-speed problem', dwellMs: 32000,
    thoughts: [{ kind: 'transmission', atMs: 8000, ref: 'quiet-singularity' }, { kind: 'transmission', atMs: 16000, ref: 'bigger-than-electricity' }, { kind: 'transmission', atMs: 24000, ref: 'once-for-good' }],
    intent: ['Copies spread; light-cones grow too long to ask permission across. Identical at first, every decision bends each a little.', 'What is handed off and what stays yours? Alignment could end it or grow it. Unresolved, on purpose.'],
    questions: ['Influences: solveeverything.org and The Intelligence Curse. Linked, quoted, or only felt?'],
  },
  {
    id: 'bustle', idea: 'The Fermi question', dwellMs: 30000, thoughts: [],
    intent: ['Far out. The galaxy is not quiet: it is bustling, full of us. So how is it just us?', 'Somber and lonely, and proud: we did this ourselves.'],
    questions: ['Which feeling should win at the end of this beat?'],
  },
  {
    id: 'landing', idea: 'What stays human', dwellMs: 30000, thoughts: [],
    intent: ['The camera turns home: the night side of Earth, 8 billion people barreling toward this together.', 'We are at the landing stage now; the next 10 to 20 years decide the next billion.'],
    questions: ['Raw material: "What we do for the next 20 years, the next 10 years, will determine the next billion."'],
  },
  {
    id: 'seam', idea: 'The signature', dwellMs: 14000, thoughts: [],
    intent: ['The view pulls back until the period of "ag." is one amber star: the same dot that wakes in the boot.', 'Contact lives here, before the loop.'],
    questions: ['Who signs? Left open on purpose.'],
  },
];
