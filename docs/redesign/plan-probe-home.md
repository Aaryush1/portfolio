# "I am the probe": implementation plan, part 1 (explore and foundations)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** settle the story's look and camera feel with throwaway mockups, and build the parts of the new homepage that don't depend on that look: the director, gesture input, the story data, the 3D star catalogue, and the contact page the QR code will point to.

**Architecture:**
- **Part 1 has two phases.**
  - **Phase A** is throwaway mockups in `portfolio-explorations/`, which Aaryush reacts to.
  - **Phase B** is pure, unit-tested modules plus one small shippable page (`/card`) in the app on branch `probe`.
- **Part 2** (rendering, thoughts on screen, assembly, replacing `/`) is planned *after* Phase A, because its code depends on what Aaryush picks there.
- `/work` and the writing room restyle get their own specs and plans after that.

**Tech stack:** Astro 5 (static), TypeScript, Vitest, Playwright. Three.js comes in for the spike (Phase A, from a CDN) and for part 2 (an npm dependency). The star distances come from the HYG database.

**Spec:** `docs/redesign/prd-probe-home.md`. Read it first. Then read `CLAUDE.md` at the repo root.

## Global constraints

- **Branch and worktree:**
  - Work on branch `probe`, in worktree `C:\Users\aaryu\code\personal\portfolio-probe`.
  - App code lives in `aaryush/`.
  - Builders may use their own worktrees branched from `probe`.
  - `node_modules` is a junction (`cmd /c mklink /J node_modules ..\..\portfolio\aaryush\node_modules`). Remove the junction before removing a worktree.
- **Copy:**
  - No log line, boot line or other story wording ships unless Aaryush has said it or approved it (spec §4).
  - Mockups show bracketed intent such as `[waking: you're a probe now]`, never invented copy in his voice.
- **Banned words on the site:** leverage, unlock, transform, seamless, paradigm shift.
- **Never show on the site:** the Ready Rebound engineering tool's name, the Ready Rebound city product, or any city.
- **Contact details:** the email address and phone number never appear in served HTML or JS. They're assembled at runtime from reversed parts (`ContactActions.astro`, `scripts/obf.ts`).
- **Homepage behaviour (spec §3):**
  - no scroll bar on `/`;
  - one gesture moves exactly one beat;
  - it continues after about 20 s of idle;
  - no sound;
  - phone and desktop get the same experience.
- **Type and colour:**
  - **Palette:** dark only, `--bg #0A0B0E`, one amber accent `#F2B544`.
  - **Fonts:** Spectral (headings), Karla (body), Spectral SC (labels, with lining and tabular figures). Only Karla 400/500 and Spectral 400 exist.
- **Machine hygiene:**
  - Use your own `PW_PORT`, `ASTRO_OUT_DIR` and `--output`, and `--workers=3`.
  - Never `git stash`.
  - Stop only servers you started, by PID.
  - Mockups are served by the existing server on port 4400; start it if it's down, and leave it running.
- **Commits:** end each message with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (or the model that did the work). Don't push; the controller pushes with the Aaryush1 token.
- **Per change:** run the specs you touched in Chromium, plus `npm test` and `npm run check` (0 errors).

## Review focus

The five failures most likely to bite a real visitor that the spec implies but doesn't spell out. Each is pinned by a test in the owning task.

1. **A trackpad's inertial scroll tail** (100+ small wheel events over about 1.5 s) must move one beat, not several. Pinned in Task B2.
2. **A tab that was hidden, or a phone that was locked, while idle** must not fast-forward through several beats when it comes back. It moves at most one. Pinned in Task B1.
3. **A gesture during the camera's flight between beats** retargets by exactly one beat from where it was heading. Repeated gestures inside the cooldown are ignored, not queued. Pinned in Task B1.
4. **An old printed QR code** (`/?met=…`) must still land where saving the contact is one tap away, with its details. Pinned in Task B5.
5. **Content that is renamed or removed** must fail the build, not leave a memory or transmission pointing nowhere. Pinned in Task B3.

---

## Phase A: throwaway mockups (no app code, no TDD)

All three tasks write only into `C:\Users\aaryu\code\personal\portfolio-explorations\`, and they can run in parallel. Each task produces:
- one page at `localhost:4400/<name>.html`, with a desktop frame (1280×800) and a phone frame (390×844);
- screenshots in `shots/`, which the builder looks at and iterates on;
- a short report in `portfolio/.superpowers/sdd/plan/`.

Aaryush picks from these. Nothing here is product code.

### Task A1: thought shapes (log line, memory, transmission)

**Files:**
- Create: `portfolio-explorations/probe-thoughts.html`
- Create: `portfolio-explorations/shots/t60-*.png`
- Create: `portfolio/.superpowers/sdd/plan/task-60-report.md`

**Brief:** the probe is in a cockpit or interface exploring space. Thoughts surface the way thoughts pop into your head (spec §3, "Thoughts"). Design **three characters for each kind**, so nine in total. Show each kind surfacing at random positions over a dark star field. The star field can be a simple static canvas.

- **Log line:** the probe thinking. Terse and instrument-like, anchored to something in view, such as a star with a leader line. Use the text `[log: intent]`, never invented lines.
- **Memory:** a wordless visual fragment of real work. Use the real company names only as a small Spectral SC tag (Cylerity, Ready Rebound, Skale, SmartBenAI, Univise). The fragment itself is a partial, slightly out-of-focus glimpse, e.g. a piece of that system's diagram from `aaryush/src/data/diagrams.ts`, or a cropped shape. Show the tap state (what "more" looks like before it navigates to `/work`).
- **Transmission:** a signal with a direction and a source. It arrives *from* a point in space, e.g. a pulse travelling in, a waveform resolving into a title. Use the real essay titles from `aaryush/src/content/writing/*.md`. Show the tap state.

**Rules:**
- No fades or slides as UI transitions (spec §3). A thought may *resolve* the way an instrument does: scanning, drawing or focusing.
- Each variant has a one-line caption saying what it's going for.
- Mark one variant per kind "MY PICK", with one sentence on why.
- Phone frame: the same thoughts, readable at 390 px wide, tappable at 44 px or larger.

- [ ] **Step 1:** build the page with the 9 variants, a "surface again" button per kind, and both frames.
- [ ] **Step 2:** shoot `shots/t60-{log,memory,transmission}-{1,2,3}-{desk,phone}.png`, look at them, and iterate until each reads as a different *kind* of thought at a glance.
- [ ] **Step 3:** write `task-60-report.md`: the picks, and what to steal from the others.

### Task A2: the boot, the seam and the contact page

**Files:**
- Create: `portfolio-explorations/probe-boot.html`
- Create: `portfolio-explorations/shots/t61-*.png`
- Create: `portfolio/.superpowers/sdd/plan/task-61-report.md`

**Brief, three pieces on one page:**

1. **The boot** (spec §3, beat 0). The amber dot in the dark wakes up. A start-up sequence: `[waking: you're a probe now]` → `[you've just woken up]`. Then the real star map resolves above a figure on the ground.
   - Build **three** boot sequences. Ideas to try: a power-on self-test (instrument checks lighting up); the dot opening like an aperture into the sky; a dark field where the sky's stars register one by one as the sensors calibrate.
   - The figure on the ground must read as anyone: the visitor, Aaryush, or the probe. A small silhouette or a single standing mark, never a portrait.
   - **The first frame must be pure HTML and CSS:** the dot and the first bracketed line, no canvas. That's what the real page paints first, for LCP.
2. **The seam.** The reverse: the view pulls back until the period of "ag." is a single amber star, and that dot is the one that wakes. Show it as a loop: end → seam → boot.
3. **The contact page (`/card`)** (spec §6). The same dark and amber dot, with:
   - the contact card: name, **Save contact**, and the email, call, LinkedIn and GitHub icons, styled like `aaryush/src/components/ContactActions.astro`;
   - **Continue to website**, which plays the dot waking into the boot.

   Build **two** layouts. Phone first: most visitors arrive here by scanning the QR code.

- [ ] **Step 1:** build the page: three boots, the seam loop, and two `/card` layouts, all in both frames.
- [ ] **Step 2:** shoot `shots/t61-boot-{1,2,3}-{a,b,c}-{desk,phone}.png` (three moments each), `t61-seam-{desk,phone}.png` and `t61-card-{1,2}-{desk,phone}.png`. Look and iterate.
- [ ] **Step 3:** write `task-61-report.md` with a pick for each piece.

### Task A3: camera spike, one real flight

**Files:**
- Create: `portfolio-explorations/probe-flight.html`
- Create: `portfolio-explorations/data/hyg-near.json`
- Create: `portfolio/.superpowers/sdd/plan/task-62-report.md`

**Question to answer:** can one continuous camera move go from the ground sky, to lifting off, to flying between real stars at their real distances, to looking back at the Sun, and stay smooth (60 fps) on a desktop and in a phone emulation?

**Brief:**
- Three.js `0.160.0` from `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` (throwaway only).
- **Data:**
  - Download the HYG star database once by hand from https://codeberg.org/astronexus/hyg. Take the current v4.x CSV under `data/hyg/CURRENT/`; if the layout moved, find the current release and note its URL in the report.
  - Its columns `x,y,z` (parsecs, equatorial, Sun at origin), `absmag` and `ci` are what we need.
  - Write the stars with `mag <= 7.5` and `dist < 100000` (100000 means unknown) to `data/hyg-near.json` as `[[x,y,z,absmag,ci],…]`.
  - Licence: CC BY-SA 4.0; note it in the report.
- **Render:** points with size and brightness from apparent magnitude at the *camera's* position: `m = absmag + 5*log10(d_pc/10)`. Colour from `ci`.
- **Camera:**
  - It starts at the Sun, looking up from a latitude of 43° N at the current local sidereal time. Reuse the maths idea from `aaryush/src/lib/sky/astro.ts`.
  - It rises, then flies about 10 s to Alpha Centauri (HIP 71683, about 1.34 pc), turns, and looks back at the Sun.
  - One continuous path (a Catmull-Rom curve with eased progress), with no cuts.
- **Measure:** frame times over the flight, on desktop and on a 390×844 viewport with mobile emulation and a 4× CPU throttle. Record the median and the 95th percentile.

- [ ] **Step 1:** write the data extraction (a node script in `portfolio-explorations/`, run once) and produce `hyg-near.json`.
- [ ] **Step 2:** build the flight page, with a play/scrub control for review only.
- [ ] **Step 3:** measure, record the numbers, and shoot `shots/t62-flight-{0,25,50,75,100}.png`.
- [ ] **Step 4:** write `task-62-report.md`: feasible or not, the frame times, data size raw and gzipped, what broke, and a recommendation for part 2 (star count per device, points vs. sprites, how to keep the ground sky matching today's hero).

**Gate:** Aaryush reviews A1–A3. Part 2's plan is written from his picks.

---

## Phase B: foundations in the app (TDD)

All paths are relative to `aaryush/`. B1–B4 are independent of each other and can run in parallel. B5 is independent too, and it can ship to production on its own: QR → `/card` → Continue → the current homepage.

### Task B1: the director

The pure timeline logic. Which beat the camera is heading for, one beat per gesture, idle carry-on, and the loop seam. No DOM, no time source: the caller passes `now` in milliseconds.

**Files:**
- Create: `src/lib/probe/director.ts`
- Test: `tests/unit/probe-director.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface Timing { dwellMs: readonly number[]; idleMs: number; cooldownMs: number }
  export interface DirectorState { beat: number; since: number; lastGesture: number; lastActivity: number }
  export const IDLE_MS = 20_000;
  export const COOLDOWN_MS = 700;
  export function start(now: number): DirectorState;
  export function gesture(s: DirectorState, dir: 1 | -1, now: number, t: Timing): DirectorState;
  export function jump(s: DirectorState, beat: number, now: number, t: Timing): DirectorState;
  export function activity(s: DirectorState, now: number): DirectorState;
  export function invited(s: DirectorState, now: number, t: Timing): boolean;
  export function tick(s: DirectorState, now: number, t: Timing): DirectorState;
  ```
  `beat` is the beat the camera is heading for. The renderer (part 2) flies there along the path, and the director never knows about flight progress.

- [ ] **Step 1: write the failing tests**

```ts
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
```

- [ ] **Step 2: run it and watch it fail**

Run: `npx vitest run tests/unit/probe-director.test.ts`
Expected: FAIL. Cannot find module `src/lib/probe/director`.

- [ ] **Step 3: implement**

```ts
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
```

- [ ] **Step 4: run it and watch it pass**

Run: `npx vitest run tests/unit/probe-director.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5:** commit `src/lib/probe/director.ts` and `tests/unit/probe-director.test.ts` with the message "Probe: the director, one beat per gesture with idle carry-on".

### Task B2: gestures (wheel, swipe, keys)

Turns raw input into one step, or none. A wheel *burst* (events closer together than `gapMs`) fires at most once, so a trackpad's inertia tail or a hard flick is one beat.

**Files:**
- Create: `src/lib/probe/gestures.ts`
- Test: `tests/unit/probe-gestures.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type Step = -1 | 0 | 1;
  export interface WheelState { last: number; acc: number; fired: boolean }
  export const WHEEL = { gapMs: 180, threshold: 40, lineHeight: 16 } as const;
  export const SWIPE = { minPx: 40, maxMs: 800 } as const;
  export const wheelStart = (): WheelState;
  export function wheel(s: WheelState, deltaY: number, deltaMode: number, now: number): [WheelState, Step];
  export function swipe(dy: number, dt: number): Step;   // dy = endY - startY in px; swiping up (negative dy) is forward
  export function key(k: string): Step | null;           // null = not ours, let the browser have it
  ```

- [ ] **Step 1: write the failing tests**

```ts
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
```

- [ ] **Step 2: run it and watch it fail**

Run: `npx vitest run tests/unit/probe-gestures.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: implement**

```ts
/**
 * Raw input to story steps (prd-probe-home §3). Pure.
 * A wheel burst, meaning events closer together than gapMs, fires at most once, so a trackpad's inertia tail or a hard flick is one beat.
 * The next burst can fire again. Keys the easter eggs use (L, [, ]) are left alone.
 */
export type Step = -1 | 0 | 1;
export interface WheelState { last: number; acc: number; fired: boolean }

export const WHEEL = { gapMs: 180, threshold: 40, lineHeight: 16 } as const;
export const SWIPE = { minPx: 40, maxMs: 800 } as const;

export const wheelStart = (): WheelState => ({ last: -Infinity, acc: 0, fired: false });

export function wheel(s: WheelState, deltaY: number, deltaMode: number, now: number): [WheelState, Step] {
  const px = deltaMode === 1 ? deltaY * WHEEL.lineHeight : deltaMode === 2 ? deltaY * 800 : deltaY;
  const fresh = now - s.last > WHEEL.gapMs;
  const acc = (fresh ? 0 : s.acc) + px;
  const fired = fresh ? false : s.fired;
  if (!fired && Math.abs(acc) >= WHEEL.threshold) return [{ last: now, acc, fired: true }, acc > 0 ? 1 : -1];
  return [{ last: now, acc, fired }, 0];
}

export function swipe(dy: number, dt: number): Step {
  if (dt > SWIPE.maxMs || Math.abs(dy) < SWIPE.minPx) return 0;
  return dy < 0 ? 1 : -1;
}

const FORWARD = new Set(['ArrowDown', 'ArrowRight', 'PageDown', ' ']);
const BACK = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);

export function key(k: string): Step | null {
  if (FORWARD.has(k)) return 1;
  if (BACK.has(k)) return -1;
  return null;
}
```

- [ ] **Step 4: run it and watch it pass**

Run: `npx vitest run tests/unit/probe-gestures.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5:** commit `src/lib/probe/gestures.ts` and `tests/unit/probe-gestures.test.ts` with the message "Probe: gestures, one step per wheel burst, swipe or key".

### Task B3: the story data and its checks

The one data file the whole story reads (spec §5, "Story data"). Today it holds the beats, intent notes and which work and writing appear where. Log lines are added only after Aaryush approves them, and the check enforces that.

**Files:**
- Create: `src/lib/probe/story.ts` (types and `validateStory`)
- Create: `src/data/probe-story.ts` (the data)
- Test: `tests/unit/probe-story.test.ts`

**Interfaces:**
- Consumes: `Timing` from Task B1 (only as a shape; `timingOf` returns one).
- Produces:
  ```ts
  export type BeatId = 'boot' | 'liftoff' | 'replication' | 'drift' | 'bustle' | 'landing' | 'seam';
  export type ThoughtKind = 'log' | 'memory' | 'transmission';
  export interface ApprovedLine { text: string; approved: string }          // approved: YYYY-MM-DD
  export interface Thought { kind: ThoughtKind; atMs: number; ref?: string; line?: ApprovedLine }
  export interface Beat { id: BeatId; idea: string; intent: string[]; questions: string[]; dwellMs: number; thoughts: Thought[] }
  export const BEAT_IDS: readonly BeatId[];
  export function validateStory(beats: readonly Beat[], known: { companies: readonly string[]; writing: readonly string[] }): string[];
  export function timingOf(beats: readonly Beat[], idleMs: number, cooldownMs: number): { dwellMs: number[]; idleMs: number; cooldownMs: number };
  // src/data/probe-story.ts
  export const story: readonly Beat[];
  ```
  A memory's `ref` is a company slug (`src/content/companies/<slug>.md`) and opens `/work/<slug>`. A transmission's `ref` is a writing slug and opens `/writing/<slug>`.

- [ ] **Step 1: write the failing tests**

```ts
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
```

- [ ] **Step 2: run it and watch it fail**

Run: `npx vitest run tests/unit/probe-story.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: implement `src/lib/probe/story.ts`**

```ts
/**
 * The homepage story's shape and its checks (prd-probe-home §3–§5). Pure.
 * Log lines exist only once Aaryush has approved them (§4), so a log thought without a dated approval is an error, not a draft.
 * Memories point at companies (/work/<slug>) and transmissions at writing (/writing/<slug>); a bad ref fails the build.
 */
export type BeatId = 'boot' | 'liftoff' | 'replication' | 'drift' | 'bustle' | 'landing' | 'seam';
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

export const timingOf = (beats: readonly Beat[], idleMs: number, cooldownMs: number) => ({ dwellMs: beats.map((b) => b.dwellMs), idleMs, cooldownMs });
```

- [ ] **Step 4: write `src/data/probe-story.ts`**

Intent notes come straight from the spec. There are no log thoughts yet, by design. The memories and transmissions use the real slugs; which ones go where gets revisited in the talk-throughs.

```ts
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
```

- [ ] **Step 5: run it and watch it pass**

Run: `npx vitest run tests/unit/probe-story.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: check that the confidentiality test still passes**

Run: `npm test`
Expected: all pass. The story file is under `src/`, so `tests/unit/confidentiality.test.ts` scans it. The intent notes must not name the engineering tool, the city product or a city.

- [ ] **Step 7:** commit the three files with the message "Probe: the story data, intent notes, and the checks that keep it honest".

### Task B4: the 3D star catalogue

Real distances for every catalogue star (spec §5, "Stars"). A bake script, run by hand like `scripts/bake-sky.mjs`, writes one compact binary file. A pure decoder reads it.

**Files:**
- Create: `scripts/stars3d-encode.mjs` (pure encoder, shared with the test)
- Create: `scripts/bake-stars3d.mjs` (reads the HYG CSV and writes the file)
- Create: `src/lib/probe/stars3d.ts` (decoder and the apparent-magnitude helper)
- Create: `public/stars3d.bin` (output of the bake)
- Test: `tests/unit/probe-stars3d.test.ts`
- Modify: `docs/redesign/decisions.md` (the data source and its licence)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  // scripts/stars3d-encode.mjs
  export function encodeStars(stars: { x: number; y: number; z: number; absmag: number; ci: number }[]): Uint8Array;
  // src/lib/probe/stars3d.ts
  export interface Stars3D { n: number; x: Float32Array; y: Float32Array; z: Float32Array; absmag: Float32Array; ci: Float32Array }
  export const STARS3D_URL = '/stars3d.bin';
  export function decodeStars(buf: ArrayBuffer): Stars3D | null;
  export function apparentMag(absmag: number, dPc: number): number;
  ```

**Format** (little-endian):
- `uint32 n`
- `float32 x[n]`, `float32 y[n]`, `float32 z[n]` (parsecs, equatorial J2000, Sun at origin)
- `uint8 absmagQ[n]`, where `absmag = q/10 - 10`
- `uint8 ciQ[n]`, where `ci = q/100 - 0.5`

The byte length is exactly `4 + 14n`.

- [ ] **Step 1: write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { encodeStars } from '../../scripts/stars3d-encode.mjs';
import { apparentMag, decodeStars } from '../../src/lib/probe/stars3d';

const sample = [
  { x: 0.000004, y: 0, z: 0, absmag: 4.85, ci: 0.656 },     // the Sun's neighbourhood, near origin
  { x: -0.4954, y: -0.4141, z: -1.1566, absmag: 4.38, ci: 0.71 }, // about Alpha Centauri A
  { x: 120.5, y: -80.25, z: 300, absmag: -6.2, ci: 1.85 },
];

describe('stars3d', () => {
  it('round-trips positions exactly and magnitudes and colours within quantisation', () => {
    const s = decodeStars(encodeStars(sample).buffer as ArrayBuffer)!;
    expect(s.n).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(s.x[i]).toBeCloseTo(sample[i].x, 4);
      expect(s.y[i]).toBeCloseTo(sample[i].y, 4);
      expect(s.z[i]).toBeCloseTo(sample[i].z, 4);
      expect(Math.abs(s.absmag[i] - sample[i].absmag)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(s.ci[i] - sample[i].ci)).toBeLessThanOrEqual(0.005);
    }
  });

  it('clamps magnitudes and colours outside the encodable range instead of wrapping', () => {
    const s = decodeStars(encodeStars([{ x: 1, y: 1, z: 1, absmag: -30, ci: 9 }]).buffer as ArrayBuffer)!;
    expect(s.absmag[0]).toBeCloseTo(-10, 5);
    expect(s.ci[0]).toBeCloseTo(2.05, 5);
  });

  it('refuses bytes that are not a catalogue', () => {
    expect(decodeStars(new ArrayBuffer(2))).toBeNull();
    const bad = new ArrayBuffer(4 + 14 * 3 - 1);
    new DataView(bad).setUint32(0, 3, true);
    expect(decodeStars(bad)).toBeNull();
    expect(decodeStars(new TextEncoder().encode('<!doctype html>').buffer as ArrayBuffer)).toBeNull();
  });

  it('gives the apparent magnitude from any distance', () => {
    expect(apparentMag(4.83, 10)).toBeCloseTo(4.83, 5);
    expect(apparentMag(4.83, 1 / 206265)).toBeCloseTo(-26.74, 1); // the Sun from Earth
    expect(Number.isFinite(apparentMag(0, 0))).toBe(true); // a star at the camera never gives NaN or -Infinity
  });
});
```

- [ ] **Step 2: run it and watch it fail**

Run: `npx vitest run tests/unit/probe-stars3d.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: implement the encoder `scripts/stars3d-encode.mjs`**

```js
// Encoder for public/stars3d.bin (prd-probe-home §5). Shared by scripts/bake-stars3d.mjs and the unit test.
// Layout, little-endian: uint32 n | float32 x[n] | float32 y[n] | float32 z[n] | uint8 absmag[n] (q/10 - 10) | uint8 ci[n] (q/100 - 0.5)
const q8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function encodeStars(stars) {
  const n = stars.length;
  const buf = new ArrayBuffer(4 + n * 14);
  const dv = new DataView(buf);
  dv.setUint32(0, n, true);
  const col = (k, i) => 4 + k * n * 4 + i * 4;
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    dv.setFloat32(col(0, i), s.x, true);
    dv.setFloat32(col(1, i), s.y, true);
    dv.setFloat32(col(2, i), s.z, true);
    dv.setUint8(4 + n * 12 + i, q8((s.absmag + 10) * 10));
    dv.setUint8(4 + n * 13 + i, q8((s.ci + 0.5) * 100));
  }
  return new Uint8Array(buf);
}
```

- [ ] **Step 4: implement the decoder `src/lib/probe/stars3d.ts`**

```ts
/**
 * The 3D star catalogue for the story (prd-probe-home §5): every star with a measured distance, so flying between them is true.
 * Written by scripts/bake-stars3d.mjs from the HYG database (see decisions.md for source and licence). Pure and DOM-free.
 */
export interface Stars3D { n: number; x: Float32Array; y: Float32Array; z: Float32Array; absmag: Float32Array; ci: Float32Array }

export const STARS3D_URL = '/stars3d.bin';

export function decodeStars(buf: ArrayBuffer): Stars3D | null {
  if (buf.byteLength < 4) return null;
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true);
  if (buf.byteLength !== 4 + n * 14) return null;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), absmag = new Float32Array(n), ci = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = dv.getFloat32(4 + i * 4, true);
    y[i] = dv.getFloat32(4 + n * 4 + i * 4, true);
    z[i] = dv.getFloat32(4 + n * 8 + i * 4, true);
    absmag[i] = dv.getUint8(4 + n * 12 + i) / 10 - 10;
    ci[i] = dv.getUint8(4 + n * 13 + i) / 100 - 0.5;
  }
  return { n, x, y, z, absmag, ci };
}

/** Apparent magnitude of a star of absolute magnitude M seen from dPc parsecs. Distances under a microparsec are held there, so it never returns NaN or -Infinity. */
export const apparentMag = (absmag: number, dPc: number): number => absmag + 5 * Math.log10(Math.max(dPc, 1e-6) / 10);
```

- [ ] **Step 5: run it and watch it pass**

Run: `npx vitest run tests/unit/probe-stars3d.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: write the bake `scripts/bake-stars3d.mjs` and run it**

```js
// Bakes public/stars3d.bin for the story (prd-probe-home §5). Run by hand, only when the data should change:
//   node scripts/bake-stars3d.mjs <path-to-hyg-csv>
// Source: the HYG database by David Nash (astronexus), CC BY-SA 4.0, https://codeberg.org/astronexus/hyg (current v4.x CSV
// under data/hyg/CURRENT/). Distances come from Hipparcos and Gaia parallaxes. Credit and licence are kept in docs/redesign/decisions.md.
// Keeps stars with apparent mag <= 7.5 and a known distance (HYG uses 100000 for unknown), and drops the Sun (id 0).
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { encodeStars } from './stars3d-encode.mjs';

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/bake-stars3d.mjs <hyg.csv>'); process.exit(1); }
const [head, ...rows] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
const cols = head.split(',').map((c) => c.replace(/"/g, ''));
const at = (name) => { const i = cols.indexOf(name); if (i < 0) throw new Error(`HYG column "${name}" missing`); return i; };
const I = { id: at('id'), dist: at('dist'), mag: at('mag'), absmag: at('absmag'), ci: at('ci'), x: at('x'), y: at('y'), z: at('z') };
const stars = [];
for (const r of rows) {
  const f = r.split(',');
  const num = (k) => Number(f[I[k]]);
  if (num('id') === 0 || !(num('dist') > 0 && num('dist') < 100000) || !(num('mag') <= 7.5)) continue;
  stars.push({ x: num('x'), y: num('y'), z: num('z'), absmag: num('absmag'), ci: Number.isFinite(num('ci')) && f[I.ci] !== '' ? num('ci') : 0.65 });
}
stars.sort((a, b) => a.absmag - b.absmag);
const bytes = encodeStars(stars);
writeFileSync(new URL('../public/stars3d.bin', import.meta.url), bytes);
console.log(`stars3d.bin: ${stars.length} stars, ${bytes.length} bytes, ${gzipSync(bytes).length} gzipped`);
```

The CSV's `proper` and `spect` columns can hold commas inside quotes. If the column check or row count looks wrong, switch the split to a quote-aware one: `r.match(/("([^"]|"")*"|[^,]*)(,|$)/g)`, with trailing commas stripped. Verify by checking that the count printed is between 20,000 and 30,000.

Run: `node scripts/bake-stars3d.mjs <downloaded csv>`
Expected: about 25,000 stars, about 350 KB raw. Commit the `.bin`, not the CSV.

- [ ] **Step 7: record the source**

Add a dated section to `docs/redesign/decisions.md`: "3D star catalogue (2026-10-15)". Include the source URL and version actually used, the CC BY-SA 4.0 credit to the HYG database (David Nash, astronexus), the filter, the format, and why HYG: it already pairs Hipparcos and Gaia distances with the Hipparcos IDs the hero's catalogue uses.

- [ ] **Step 8:** run `npm test` and `npm run check`, then commit the five files plus `decisions.md` with the message "Probe: the 3D star catalogue with real distances".

### Task B5: the contact page `/card`, and the QR code pointing at it

Spec §6. It ships on its own: QR → `/card` (Save contact, with the "where we met" details) → Continue to website → `/`. This task uses the current site styles; part 2 restyles it to the look Aaryush picks in A2.

**Files:**
- Create: `src/pages/card.astro`
- Modify: `src/components/ContactActions.astro` (add a `'card'` variant)
- Modify: `src/lib/meet.ts:111-118` (`buildMeetUrl` points to `/card`)
- Modify: `tests/unit/meet.test.ts:95-105` (the expected URLs)
- Modify: `vercel.json` (old QR codes `/?met=…` redirect to `/card`)
- Create: `tests/unit/card-redirect.test.ts`
- Create: `tests/e2e/card.spec.ts`
- Modify: `src/lib/og.ts`, only if the build demands an OG card per page (check how `/qr` is handled and do the same)
- Modify: `docs/redesign/copy-review.md` (the two new strings, as drafts)
- Modify: `src/data/site.ts` (the strings, behind a `site.drafts` flag)

**Interfaces:**
- Consumes: `buildMeetUrl`, `hasMeetParams` (`src/lib/meet.ts`); `ContactActions` (the `data-vcard` save, built at click time by `src/scripts/contact-card.ts`, which `BaseLayout` already loads on every non-bare page and which already captures the meet params from the URL).
- Produces: route `/card`; `buildMeetUrl(base, m, known)` returns `<base>/card` or `<base>/card?…`.

**Copy (drafts until Aaryush approves):**
- the page title "Aaryush Gupta";
- the link label "Continue to website".

Put both in `src/data/site.ts` under `card: { continue: 'Continue to website' }`. Add `card: true` to the `drafts` object (`src/data/site.ts:45`, next to `qrCard`), and list both in `copy-review.md` as drafted by Claude, pending Aaryush. While the flag is true, the release gate blocks production. That's intended: Aaryush flips it when he approves.

- [ ] **Step 1: update the failing unit tests**

In `tests/unit/meet.test.ts`, change the three `buildMeetUrl` expectations:

```ts
    expect(buildMeetUrl(base, { met: '', about: [], note: '' }, known)).toBe('https://aaryush.com/card');
    // …
      'https://aaryush.com/card?met=Madison%20AI%20Week&about=ready-rebound-loop,writing&note=pricing%20AI%20agents',
    // …
    expect(buildMeetUrl(base, { met: '', about: ['writing'], note: '' }, known)).toBe('https://aaryush.com/card?about=writing');
```

Create `tests/unit/card-redirect.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARAMS } from '../../src/lib/meet';

const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { redirects?: { source: string; destination: string; permanent: boolean; has?: { type: string; key: string }[] }[] };

describe('old QR codes', () => {
  it('send a home URL carrying any meet parameter to /card, temporarily, keeping the query', () => {
    for (const key of PARAMS) {
      const r = cfg.redirects?.find((x) => x.source === '/' && x.has?.some((h) => h.type === 'query' && h.key === key));
      expect(r, `redirect for ?${key}=`).toBeDefined();
      expect(r!.destination).toBe('/card');
      expect(r!.permanent).toBe(false);
    }
  });

  it('leave the plain home URL alone', () => {
    expect(cfg.redirects?.some((x) => x.source === '/' && !x.has)).toBe(false);
  });
});
```

Vercel keeps the incoming query string on a redirect when the destination has none, so `?met=…` arrives at `/card?met=…`.

- [ ] **Step 2: run them and watch them fail**

Run: `npx vitest run tests/unit/meet.test.ts tests/unit/card-redirect.test.ts`
Expected: FAIL. The URLs still end in `/`, and there are no redirects.

- [ ] **Step 3: implement the URL change and the redirects**

In `src/lib/meet.ts`, the last line of `buildMeetUrl` becomes:

```ts
  return base.replace(/\/+$/, '') + '/card' + (q.length ? '?' + q.join('&') : '');
```

Update the function's comment to say the QR code opens the contact page.

`vercel.json`:

```json
{
  "buildCommand": "npm run build:vercel",
  "redirects": [
    { "source": "/", "has": [{ "type": "query", "key": "met" }], "destination": "/card", "permanent": false },
    { "source": "/", "has": [{ "type": "query", "key": "about" }], "destination": "/card", "permanent": false },
    { "source": "/", "has": [{ "type": "query", "key": "note" }], "destination": "/card", "permanent": false }
  ]
}
```

- [ ] **Step 4: run them and watch them pass**

Run: `npx vitest run tests/unit/meet.test.ts tests/unit/card-redirect.test.ts`
Expected: PASS.

- [ ] **Step 5: write the failing e2e test `tests/e2e/card.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { EMAIL, PHONE_DIGITS, PHONE_FULL } from '../contact-fixture';

test.describe('/card', () => {
  test('a QR scan saves the contact with where we met, then continues to the site', async ({ page }) => {
    await page.goto('/card?met=AI%20Week&about=writing');
    await expect(page).toHaveURL(/\/card$/); // contact-card.ts keeps the details and cleans the URL
    const save = page.locator('[data-contact="card"] [data-vcard]');
    await expect(save).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
    const vcf = await (await download.createReadStream())!.toArray().then((c) => Buffer.concat(c).toString('utf8'));
    expect(vcf).toContain('BEGIN:VCARD');
    expect(vcf).toMatch(/AI Week/);
    await page.getByRole('link', { name: 'Continue to website' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('works on a phone without scrolling to reach Save contact', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/card');
    const box = await page.locator('[data-contact="card"] [data-vcard]').boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(640);
  });

  test('never serves the email or phone in its HTML', async ({ request }) => {
    const html = await (await request.get('/card')).text();
    for (const leak of [EMAIL, PHONE_FULL, PHONE_DIGITS]) expect(html).not.toContain(leak);
  });
});
```

The redirect itself is Vercel config, which `astro preview` doesn't run. The unit test pins the config, and the controller checks the redirect on the Vercel preview (Step 9).

- [ ] **Step 6: run it and watch it fail**

Run: `npx playwright test tests/e2e/card.spec.ts --project=chromium`
Expected: FAIL. `/card` is a 404.

- [ ] **Step 7: implement the page**

In `ContactActions.astro`, widen the prop to `variant: 'hero' | 'footer' | 'card'`. Don't change the hero markup: the print lines read the hero instance.

`src/pages/card.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ContactActions from '../components/ContactActions.astro';
import { site } from '../data/site';
// The contact page the QR code opens (prd-probe-home §6): save the contact first, then continue into the site.
// The "where we met" details ride in on the URL; scripts/contact-card.ts (loaded by BaseLayout) captures and strips them.
---
<BaseLayout title={site.name} description="Save Aaryush Gupta's contact." ogImage="/og/home.png" path="/card" skipTo="main">
  <main id="main" tabindex="-1" class="card-page">
    <span class="dot" aria-hidden="true"></span>
    <h1 class="name">{site.name}</h1>
    <ContactActions variant="card" />
    <a class="continue" href="/">{site.card.continue}</a>
  </main>
</BaseLayout>
<style>
.card-page{min-height:calc(100svh - var(--header));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:32px 16px;text-align:center}
.dot{width:10px;height:10px;border-radius:50%;background:var(--accent)}
.name{font-family:var(--serif);font-weight:400;font-size:clamp(30px,8vw,44px);margin:0}
.card-page :global(.cta){margin-top:8px;justify-content:center}
.continue{font-family:var(--label);color:var(--text-2, #A0A4AE);text-decoration:none;padding:12px 8px}
.continue:hover,.continue:focus-visible{color:var(--accent)}
</style>
```

Check the real token names in `src/styles/tokens.css` and use them, rather than the fallback. The `#meet-topics` block that `contact-card.ts` reads is already rendered by `BaseLayout` (line 50), so `/card` gets it for free. Don't pass `bare`: bare pages skip capturing the details.

- [ ] **Step 8: run the tests and watch them pass**

Run:
- `npx playwright test tests/e2e/card.spec.ts tests/e2e/contact-card.spec.ts --project=chromium`
- `npx playwright test tests/e2e/card.spec.ts --project=mobile-chrome`
- `npm test`
- `npm run check`

Expected: all pass. If `contact-card.spec.ts` asserted that the QR code encodes `/`, update that assertion to `/card`. That's the intended change.

- [ ] **Step 9:** commit everything listed under **Files**, with the message "Contact page /card: the QR code opens Save contact first". After the push, the controller checks on the Vercel preview that `/?met=x` lands on `/card` and that the saved card carries "x".

---

## After part 1

1. Aaryush reviews A1–A3 and picks.
2. The controller writes **part 2**: the renderer, the thoughts on screen, the corner index, wiring the director and gestures, the seam, restyling `/card` to the A2 pick, replacing `/`, moving the old homepage sections out, and the docs and CLAUDE.md updates. It's planned from his picks and from the spike's numbers.
3. The beat-by-beat talk-throughs with Aaryush run alongside part 2. Lines go into `probe-story.ts` with their approval dates.
