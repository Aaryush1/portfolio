# The Writing Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/writing` list with a warm, dim "writing room": each piece is an object on a desk (letter, paper, plain sheet) that opens into its breakdown, with room light that follows the visitor's clock, a drawer of unpublished drafts, kind-specific page transitions, and a room that remembers the visitor.

**Architecture:** The page is a semantic, server-rendered list of pieces that works with no JavaScript. Desk visuals, light, dust, drawer, night note and memory are progressive enhancement layered on the same DOM (gated on the existing `html.js` class). Layout positions come from a pure, seeded function computed at build time. Opening a piece is a real navigation using the site's existing native cross-document view transitions (`@view-transition { navigation: auto }` in `base.css`), with a per-piece `view-transition-name` and per-kind `view-transition-class`.

**Tech Stack:** Astro 5 (content collections, native cross-document view transitions, no ClientRouter), TypeScript, scoped CSS, Vitest (`tests/unit`), Playwright (`tests/e2e`), axe, Lighthouse CLI.

**Spec:** `docs/redesign/prd-writing-room.md` (W1–W6 and the 11 acceptance criteria). It replaces `prd.md` §6.5 and adds touches to the essay pages and to the home teaser (E8).
**Prototype (throwaway, do not edit or import):** `C:\Users\aaryu\code\personal\portfolio-explorations\writing-desk-v2.html`.
**Project constraints (bind every task):** `.superpowers/sdd/plan/constraints.md`. **Implementer environment:** `.superpowers/sdd/plan/implementer-instructions.md`.

## Global Constraints

Copied from `constraints.md` and the spec. Every task includes these.

- All app code lives in `aaryush/`; every command runs from `aaryush/`. Do not touch legacy root files.
- **Dark only.** Palette: `--bg:#0A0B0E`, `--s1:#0E1015`, `--s2:#12151B`, `--s3:#171A22`, `--text:#E6E7EA`, `--text-2:#A0A4AE`, `--text-3:#8B909C`, `--accent:#F2B544`. Amber is for small marks only: the full stop, ribbons and one accent line (spec W6).
- **Fonts:** Instrument Sans, JetBrains Mono, Instrument Serif italic. Self-hosted only; no `fonts.googleapis.com` (the prototype links Google Fonts: do not copy that).
- Never write "Orchestra" or name the Ready Rebound city product. No buzzwords ("leverage", "unlock", "transform", "seamless"). No "hire me", no availability statements, no metrics except people ratios.
- **Drafts:** copy Claude wrote ships flagged as draft until Aaryush approves. The new `why` and `breakdown` text is DRAFT (see Task 1 and `copy-review.md` §16). `draft: true` in frontmatter keeps its current meaning: the piece is excluded from the list, the page and the teaser.
- **Reduced motion:** with `prefers-reduced-motion: reduce` the page is static and lit, transitions are instant, there is no dust, and no animation loop is running.
- **Progressive enhancement:** with JS off, `/writing` is a plain, complete list (title, kind, reading time, date, "why" line, link).
- **Scraper protection:** the email address and phone number never appear in served HTML. Never write the literal strings `mailto:` or `tel:` in markup or client scripts. `tests/unit/confidentiality.test.ts` must stay green.
- **Layout:** no horizontal scroll from 320px up; layout tests at 320, 375, 768 and 1280.
- **Storage:** `localStorage` only, key `writing:v1`, every access wrapped in try/catch, no backend, no analytics.
- **Grain** belongs to the room (`.bg .grain`, already site-wide), never to objects. **No mug, no lamp object.**
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Never push.** Commit with the repo's local identity.
- **Playwright discipline (machine is shared):** run with `--workers=4` (already the default in `playwright.config.ts`; keep passing it explicitly), and run **one Playwright process at a time**: never start a second while another is running. The config builds and serves port 4322 itself. If you start `astro preview` or `astro dev` for screenshots, stop it before running Playwright (see implementer instructions, "Servers").
- **npm quirk:** installs need `npm_config_os=win32 npm install ...`. Never edit `~/.npmrc`.
- **Performance budget:** Lighthouse mobile on `/writing` must score >= 95 performance and 100 accessibility. Every task must keep that true (see "Lighthouse" in Task 8; run a quick check at the end of Tasks 3 and 6 as well, since those add the heaviest code).

## Known-flaky tests (do not chase these)

These fail intermittently on this shared machine, with or without your change. If one fails, re-run that single test once. If it passes, move on. If it fails in a file you did not touch, note it in your report and continue. Never "fix" them as part of this plan.

- webkit `tests/e2e/diagram.spec.ts`: "diagram draws, closes the loop, and pulses nodes as the dot passes" and "pauses when hidden".
- `tests/e2e/popups.spec.ts` lines 58 and 82.
- the occasional firefox a11y run on `/` (`tests/e2e/a11y.spec.ts`, path `/`).

A failure in any *new* writing-room test, or in `/writing` a11y, is real. Do not dismiss it as flaky.

## Review Focus

Failure modes the spec implies that no single acceptance criterion pins down. Each has a test in the owning task.

1. **Storage throws or is full.** `localStorage.getItem`/`setItem` throws (private window, blocked site data). Expect: the page renders and works, nothing remembered. *(Task 8, `writing-memory.test.ts` and e2e "storage throws")*
2. **Corrupt or foreign `writing:v1` value** (not JSON, wrong shape, section index beyond the piece's sections). Expect: treated as empty, never a crash, never a ribbon on a piece that has no such section. *(Task 8, unit)*
3. **A piece with `breakdown` missing, empty or longer than six**, or `why` missing. Expect: the object still renders (title, kind, meta), with no empty "fold" panels; no throw at build. *(Task 2, unit + e2e)*
4. **Unpublished titles leaking through the drawer.** Expect: a draft `draft: true` piece's title or body never appears anywhere in `/writing` HTML; the drawer shows only `{kind, length}` from `site.ts`. *(Task 5, e2e + build-output test)*
5. **Back/forward and bfcache.** Back from an essay must land on the desk with the piece in place and focus on it; the dust loop and light must not double-start on a bfcache restore (`pageshow`). *(Task 6, e2e)*
6. **Clock edge cases.** 20:59, 21:00, 06:59, 07:00; a tab left open across 21:00 (the note appears without reload and disappears at 07:00); a non-finite hour. *(Task 4)*
7. **Modifier-click on a piece** (Ctrl/Cmd/middle click) must open the link in a new tab like a normal link, not be swallowed by the phone tap-once logic. *(Task 2, e2e)*

---

## Data model (decided here; Task 1 implements it)

**Writing frontmatter** gains two fields:

```ts
why: z.string().min(1).optional(),                       // one line, handwritten italic on the object
breakdown: z.array(z.object({ label: z.string().min(1), gist: z.string().optional() })).max(6).optional(),
```

- `breakdown` is spec'd as 3 to 6 entries; the schema enforces `max(6)` and a unit test enforces `>= 3` for **published** pieces (so a missing field degrades gracefully while a bad one fails the build).
- A paper's `gist` is five words or fewer (unit test); a letter's entries have `label` only.
- `kind` is relaxed from `z.enum(['letter','paper'])` to `z.string()` so an unknown kind (acceptance 9) reaches the desk and renders as a plain sheet. `knownKind()` in `src/lib/writing.ts` is the only place that narrows it. This is a deliberate loosening; see Open Question 1.
- `draft: true` is unchanged.

**`site.ts`** gains:

```ts
/** /writing drawer: unpublished work, shown only as kind + rough length. Never titles or content. Draft copy. */
drawer: [
  { kind: 'essay', length: '~2,000 words' },
  { kind: 'letter', length: '~800 words' },
],
```

and `drafts.writingRoom: true` (flipped to `false` at copy approval; `tests/release/drafts.test.ts` already blocks release while any flag is `true`). The two entries above come from the prototype's drawer and are DRAFT.

**DRAFT content for the two real pieces** (from the prototype; flagged in `copy-review.md` §16):

| Piece | `why` | `breakdown` |
|---|---|---|
| `bigger-than-electricity` (letter) | I failed to explain this to my family for years. This is the attempt. | One app, one weekend / It's already here / We've seen this before / The great experiment |
| `quiet-singularity` (paper) | I kept seeing one loop in three different headlines, and nobody was naming it. | The Shift: Systems now help build themselves / Recursive Self-Improvement: Labs say models build models / The Collapse of Cost: Frontier-class intelligence gets nearly free / The Implication: Judgment becomes the scarce thing / The Feedback Loop: Better tools build better tools / The Institutional Gap: Institutions built for scarcity |

Both piece files keep `draft: false` (they are published), but the *new fields* are tracked as draft copy via `site.drafts.writingRoom` and `copy-review.md` §16.

**localStorage shape (`writing:v1`):**

```json
{ "v": 1, "pieces": { "<slug>": { "sec": 2, "t": 1760000000000 } }, "last": "<slug>" }
```

`sec` is the furthest section index reached (0-based); `last` is the slug of the piece most recently opened (used for focus-on-Back).

---

## File Structure

```
aaryush/
├── src/
│   ├── content.config.ts                     (modify) why, breakdown, kind: z.string()
│   ├── content/writing/*.md                  (modify) add why + breakdown (DRAFT)
│   ├── data/site.ts                          (modify) drawer, drafts.writingRoom
│   ├── lib/
│   │   ├── writing.ts                        (create) wordCount, readingMinutes, knownKind, pieceLabel
│   │   ├── writing-layout.ts                 (create) deterministic seeded layout for N pieces
│   │   ├── writing-memory.ts                 (create) writing:v1 read/write/forget, pure + safe
│   │   ├── room-light.ts                     (create) per-daypart light parameters (pure data)
│   │   ├── sections.ts                       (create) currentSection(): pure "which section is the reader in"
│   │   └── daypart.ts                        (modify, additive) currentDaypart(root, now)
│   ├── components/writing/
│   │   ├── Piece.astro                       (create) one list item: link, meta, why, breakdown <ol>
│   │   ├── ObjectLetter.astro                (create) letter skin (folds)
│   │   ├── ObjectPaper.astro                 (create) paper skin (stack)
│   │   ├── ObjectSheet.astro                 (create) plain-sheet skin (unknown kinds)
│   │   ├── Drawer.astro                      (create)
│   │   └── Signature.astro                   (create) wraps Mark for the letter ending
│   ├── components/Mark.astro                 (modify) maskId prop, signature variant
│   ├── components/home/WritingTeaser.astro   (modify) ribbon + pick-up link hook
│   ├── layouts/EssayLayout.astro             (modify) kind-aware: signature / piles / bar, vt name
│   ├── pages/writing/index.astro             (rewrite)
│   ├── pages/writing/[slug].astro            (modify) use lib/writing.ts, pass kind/slug/sections
│   ├── scripts/
│   │   ├── writing-desk.ts                   (create) hover/focus/tap state, focus restore
│   │   ├── light-pool.ts                     (create) pool position/intensity (settling loop only)
│   │   ├── dust.ts                           (create) canvas motes, pausing
│   │   ├── room-clock.ts                     (create) daypart on the room, night note insert/remove
│   │   ├── drawer.ts                         (create)
│   │   ├── writing-memory-client.ts          (create) ribbons, forget, pickup on /writing + teaser
│   │   ├── signature.ts                      (create) draw the signature when in view
│   │   ├── reading-progress.ts               (modify) section hook for piles + memory
│   │   └── mark.ts                           (modify) ignore the signature instance
│   └── styles/
│       ├── writing-room.css                  (create) room, light, objects, drawer, note (scoped by .room)
│       ├── writing-transitions.css           (create) view-transition names/classes/keyframes
│       └── essay.css                         (modify) piles, signature spacing, pick-up link
└── tests/
    ├── unit/{writing,writing-layout,writing-memory,room-light,sections,writing-content}.test.ts
    └── e2e/{writing,writing-desk,writing-light,writing-clock,writing-drawer,writing-open,writing-essay,writing-memory}.spec.ts
docs/redesign/copy-review.md                  (modify) new §16
aaryush/CLAUDE.md or ../CLAUDE.md             (modify, Task 8) record the co-write workflow
```

Splitting rule used: pure logic in `src/lib` (Vitest), DOM behaviour in `src/scripts` (Playwright), visuals in two CSS files. The 4,000-line single-file prototype is the reason for the split: nothing here should exceed roughly 250 lines.

## What to port and what to rewrite from the prototype

**Port (values and ideas, copied by hand into the new files):**

- Object geometry and palette values: letter 300 x 478 with panels 150/100/100/128; paper 300 x 270, 46px fan step, 1.5/1.7px stack offset; the `--ink` handwritten-ink color `#F4ECDD`; folder and redacted-paper dimensions for the drawer; the pile-of-sheets geometry (34 x 44, 2.6px step).
- The fold transforms (`rotateX(-24deg)`, `48deg`, `-48deg`) and shading, the `.sh` fan, the staple.
- The light model: one big radial pool with an inner amber core, window light as two clipped, blurred parallelograms. Use its numbers as a starting point, then apply the feedback below.
- The dust model (about 90 motes, drift up, intensity from distance to the pool) but with a seeded PRNG.
- The signature: the prototype fakes it with an SVG `<text>`; **do not port that**. Reuse the real site mark (Task 7).

**Rewrite cleanly (do not copy):**

- All HTML built by `innerHTML` template strings and the prototype's single global state machine (`room.dataset.state`, `busy`, `enter()`, `swapIn()`, `exit()`, `readerHTML()`): the real site uses real navigation, so the whole in-page "reader" disappears.
- The `P` content object, the "talk" kind and the placeholder chips, the prototype chrome (`.proto`, `.phones` iframe, `forget me` button in the top bar, time switcher).
- The `mug`, `.steam`, and `body::after` global grain (feedback: remove the mug; grain never on objects; the site grain already exists).
- Per-frame `getComputedStyle(room).getPropertyValue('--pk')` reads inside the rAF loop and the perpetual `requestAnimationFrame(tick)` that never stops. The new pool loop stops when it settles; the dust loop pauses offscreen, hidden and under reduced motion.
- The flex-wrap `deskwrap` layout (leaves a large empty area with two objects, which is the "close the empty gap" feedback).
- `localStorage` key `aaryush.room.v1` becomes `writing:v1` with the shape above.

**Feedback from Aaryush, all folded into the spec, and where each lands:**

| Feedback | Where |
|---|---|
| remove the mug | not ported (Task 3) |
| no grain on the objects | Task 2 computed-style test + Task 3 pixel test |
| close the empty gap | Task 2 `writing-layout.ts` |
| show the letter's faint first phrase at rest | Task 2 |
| make the afternoon less bright | Task 3 `room-light.ts` (afternoon window alpha .12, down from the prototype's .2) |
| make hover do more | Task 2 (lift, straighten, brighten, breakdown opens) and Task 3 (pool moves, why inks) |

---

### Task 1: Data model, reading time, and the no-JS list

**Files:**
- Modify: `src/content.config.ts` (writing schema), `src/content/writing/bigger-than-electricity.md`, `src/content/writing/quiet-singularity.md`, `src/data/site.ts`, `src/pages/writing/index.astro`, `src/pages/writing/[slug].astro`, `../docs/redesign/copy-review.md`
- Create: `src/lib/writing.ts`, `src/components/writing/Piece.astro`, `src/styles/writing-room.css` (list styling only for now)
- Test: `tests/unit/writing.test.ts`, `tests/unit/writing-content.test.ts`, extend `tests/e2e/writing.spec.ts`

**Interfaces:**
- Consumes: the `writing` collection; `BaseLayout` props (`title, description, ogImage, path`).
- Produces (later tasks rely on these exact names):
  - `src/lib/writing.ts`:
    - `export const KNOWN_KINDS = ['letter', 'paper'] as const`
    - `export type KnownKind = (typeof KNOWN_KINDS)[number]`
    - `export function wordCount(body: string): number`
    - `export function readingMinutes(words: number): number` (230 wpm, rounded, minimum 1)
    - `export function knownKind(kind: string): KnownKind | 'sheet'`
    - `export function pieceLabel(title: string, kind: string, minutes: number): string` returns `"{title} — {kind}, {minutes} min read"`
    - `export interface PieceView { slug: string; title: string; subtitle: string; kind: string; shape: KnownKind | 'sheet'; date: Date; minutes: number; why?: string; breakdown: { label: string; gist?: string }[]; }`
    - `export function toPieceView(entry): PieceView`
  - `Piece.astro` markup contract: `<li class="piece" data-piece data-slug data-kind data-shape>` containing `<a class="piece-link" href aria-label>`, `.piece-meta` (kind, minutes, date), `.piece-why`, and `<ol class="breakdown">`. Later tasks add skins and behaviour onto exactly this DOM; they never replace it.
  - `[data-writing-list]` stays the `<ul>` hook (the existing test uses it).

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/writing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { knownKind, pieceLabel, readingMinutes, wordCount } from '../../src/lib/writing';

describe('reading time', () => {
  it('uses 230 wpm and rounds', () => {
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(345)).toBe(2); // 1.5 rounds up
    expect(readingMinutes(3220)).toBe(14);
  });
  it('never returns less than one minute, even for nothing', () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(Number.NaN)).toBe(1);
  });
});

describe('wordCount', () => {
  it('ignores html tags and collapses whitespace', () => {
    expect(wordCount('<p>one  two</p>\n\n<p>three &mdash; four</p>')).toBe(5);
  });
  it('is zero for an empty body', () => expect(wordCount('')).toBe(0));
});

describe('knownKind', () => {
  it('passes letter and paper through', () => {
    expect(knownKind('letter')).toBe('letter');
    expect(knownKind('paper')).toBe('paper');
  });
  it('turns anything else into a plain sheet', () => {
    expect(knownKind('zine')).toBe('sheet');
    expect(knownKind('')).toBe('sheet');
  });
});

describe('pieceLabel', () => {
  it('names the link "Title — kind, N min read"', () => {
    expect(pieceLabel('The Quiet Singularity', 'paper', 6)).toBe('The Quiet Singularity — paper, 6 min read');
  });
});
```

`tests/unit/writing-content.test.ts` (reads the real files; pattern from `frontmatter.test.ts`):

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/data/site';

const dir = 'src/content/writing';
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const fm = (f: string) => yaml.load(readFileSync(join(dir, f), 'utf8').split(/^---$/m)[1]) as Record<string, any>;

describe.each(files)('%s writing-room fields', (f) => {
  const d = fm(f);
  it('has a one-line why', () => {
    expect(typeof d.why).toBe('string');
    expect(d.why).not.toMatch(/\n/);
  });
  it('has a 3 to 6 entry breakdown with no null values', () => {
    expect(d.breakdown.length).toBeGreaterThanOrEqual(3);
    expect(d.breakdown.length).toBeLessThanOrEqual(6);
    for (const b of d.breakdown) {
      expect(typeof b.label).toBe('string');
      if (b.gist !== undefined) expect(b.gist.split(/\s+/).length).toBeLessThanOrEqual(5);
    }
  });
  it('papers carry a gist per section; letters do not need one', () => {
    if (d.kind === 'paper') for (const b of d.breakdown) expect(b.gist, b.label).toBeTruthy();
  });
});

describe('site.drawer', () => {
  it('holds only kind and length, never a title', () => {
    for (const e of site.drawer) expect(Object.keys(e).sort()).toEqual(['kind', 'length']);
  });
});
```

`tests/e2e/writing.spec.ts`: add (keep the four existing tests; the first is rewritten in Step 5 because titles move from `h2` to the link):

```ts
test('no-JS: every piece is listed with title, kind, minutes, why and a working link', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const items = page.locator('[data-writing-list] > li');
  await expect(items).toHaveCount(2);
  const first = items.first();
  await expect(first.getByRole('link', { name: /This Is Bigger Than Electricity — letter, \d+ min read/ })).toHaveAttribute('href', '/writing/bigger-than-electricity');
  await expect(first.locator('.piece-why')).not.toBeEmpty();
  await expect(first.locator('ol.breakdown li')).toHaveCount(4);
  await ctx.close();
});

test('the list never exposes email or phone', async ({ request }) => {
  const html = await (await request.get('/writing')).text();
  expect(html).not.toMatch(/aaryush@outlook\.com|331-2850|\+1949/);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npm test -- writing` then `npx playwright test tests/e2e/writing.spec.ts --workers=4 --project=chromium`
Expected: unit FAIL "Cannot find module ../../src/lib/writing"; e2e FAIL (no `.piece-why`, titles still in `h2`).

- [ ] **Step 3: Implement `src/lib/writing.ts`**

```ts
export const KNOWN_KINDS = ['letter', 'paper'] as const;
export type KnownKind = (typeof KNOWN_KINDS)[number];

export function wordCount(body: string): number {
  return body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

/** 230 words per minute, rounded, never below one minute. */
export function readingMinutes(words: number): number {
  if (!Number.isFinite(words) || words <= 0) return 1;
  return Math.max(1, Math.round(words / 230));
}

/** Kinds the desk has an object for. Anything else renders as a plain sheet (spec W1). */
export function knownKind(kind: string): KnownKind | 'sheet' {
  return (KNOWN_KINDS as readonly string[]).includes(kind) ? (kind as KnownKind) : 'sheet';
}

export function pieceLabel(title: string, kind: string, minutes: number): string {
  return `${title} — ${kind}, ${minutes} min read`;
}

export interface PieceView {
  slug: string; title: string; subtitle: string; kind: string; shape: KnownKind | 'sheet';
  date: Date; minutes: number; why?: string; breakdown: { label: string; gist?: string }[];
}

export function toPieceView(entry: { id: string; body?: string; data: any }): PieceView {
  const d = entry.data;
  return {
    slug: entry.id, title: d.title, subtitle: d.subtitle, kind: d.kind, shape: knownKind(d.kind), date: d.date,
    minutes: readingMinutes(wordCount(entry.body ?? '')), why: d.why, breakdown: d.breakdown ?? [],
  };
}
```

- [ ] **Step 4: Schema, content, site data, copy-review**

1. `src/content.config.ts`: in the `writing` schema replace the `kind` line with `kind: z.string(),` and add `why` and `breakdown` exactly as in "Data model" above.
2. Add `why:` and `breakdown:` to both `.md` files using the DRAFT table above. **Quote every value** (the repo has a test for unquoted-comma truncation in YAML flow mappings), e.g. `- { label: "One app, one weekend" }` and `- { label: "The Shift", gist: "Systems now help build themselves" }`.
3. `src/data/site.ts`: add `drawer` (shape above) and `writingRoom: true` to `drafts`.
4. `../docs/redesign/copy-review.md`: add a new `## 16. Writing room copy` before "Sign-off". Use the file's existing block format (Source / Current / checklist or edit fence). List: 16a the `why` line for each of the two pieces; 16b the breakdown phrases (letter: 4 labels; paper: 6 label + gist pairs); 16c the drawer entries (`site.drawer`, kind and length only); 16d the night note "you're up late too." (fixed by the spec; listed so it can be confirmed); 16e the visible labels "Pick up where you left off", "forget", "writing I'm working on". Source lines: `aaryush/src/content/writing/*.md`, `aaryush/src/data/site.ts` (`site.drawer`, flag `site.drafts.writingRoom`). Add §16 to the Contents list and the sign-off checklist if it enumerates sections.

- [ ] **Step 5: Build the list page**

`src/components/writing/Piece.astro` (props `{ piece: PieceView }`) renders the contract above. Use `pieceLabel()` for the link's `aria-label`; visible link text is the title. The `<ol class="breakdown">` is a *sibling* of the `<a>`, not a child, so the link's accessible name stays "Title — kind, N min read" while the list stays reachable. Show `gist` after the label when present. If `breakdown` is empty, render no `<ol>` at all. If `why` is missing, render no `.piece-why`.

`src/pages/writing/index.astro`: keep the `BaseLayout` call, `sec-head`, and `<h1>`, then:

```astro
<ul class="pieces" data-writing-list>
  {pieces.map((p) => <Piece piece={p} />)}
</ul>
```

where `pieces = (await getCollection('writing', ({ data }) => !data.draft)).sort(newestFirst).map(toPieceView)`. `src/pages/writing/[slug].astro`: replace the inline `words`/`minutes` lines with `readingMinutes(wordCount(post.body ?? ''))`. Import `../../styles/writing-room.css` in the index page only. In the CSS, style the plain list (title, mono meta line, italic `why` in `--text-2`, breakdown as a small mono list). Update the first existing e2e test to read titles from `[data-writing-list] .piece-link` instead of `h2`.

- [ ] **Step 6: Run to GREEN**

Run: `npm test` then `npx playwright test tests/e2e/writing.spec.ts tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts --workers=4`
Expected: all PASS (apart from the known-flaky set). Then `npm run build` is clean.

**Visual check (screenshot `tests/screenshots/` is not used; write to `C:\Users\aaryu\code\personal\portfolio-explorations\shots\`):**
- `twr1-list-1280.png`: `/writing` at 1280 with JS disabled. Must show two entries, each with title, kind and "N min read", date, an italic why line and a four- or six-item breakdown list. No horizontal scroll.
- `twr1-list-375.png`: same at 375, readable, with no clipped text.

- [ ] **Step 7: Commit**

```bash
git add aaryush/src aaryush/tests docs/redesign/copy-review.md
git commit -m "feat(writing): why + breakdown data model, reading time lib, no-JS piece list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The desk (objects, deterministic layout, hover that does more)

**Files:**
- Create: `src/lib/writing-layout.ts`, `src/components/writing/ObjectLetter.astro`, `src/components/writing/ObjectPaper.astro`, `src/components/writing/ObjectSheet.astro`, `src/scripts/writing-desk.ts`
- Modify: `src/components/writing/Piece.astro` (choose skin by `shape`), `src/pages/writing/index.astro` (wrap in `.room`/`.desk`, apply layout), `src/styles/writing-room.css`
- Test: `tests/unit/writing-layout.test.ts`, `tests/e2e/writing-desk.spec.ts`

**Interfaces:**
- Consumes: `PieceView`, `toPieceView`, `knownKind` (Task 1).
- Produces:
  - `src/lib/writing-layout.ts`:
    - `export interface Placement { slug: string; col: number; x: number; y: number; w: number; h: number; rot: number; dx: number; dy: number; }`
    - `export interface DeskLayout { cols: number; width: number; height: number; placements: Placement[]; }`
    - `export function nominalSize(shape: string): { w: number; h: number }` (letter 300x478, paper 300x290, sheet 260x220)
    - `export function layoutDesk(pieces: { slug: string; shape: string }[], opts?: { cols?: number }): DeskLayout`
    - `placements` is returned in **visual reading order** (sorted by `y`, then `x`), and the page renders the DOM in that order so keyboard focus order equals visual order.
  - CSS custom properties set per piece by the page: `--rot`, `--dx`, `--dy`; the object's state classes are `.is-lit` (hover/focus/centre-nearest) and `.is-open` (breakdown open).
  - `writing-desk.ts` exports nothing; it dispatches `CustomEvent('piece:lit', { detail: { el } })` and `CustomEvent('piece:unlit')` on `document` for Task 3 to consume.

**Layout algorithm (deterministic, 1 to about 15 pieces):**

1. `cols = opts.cols ?? (n <= 2 ? 2 : n <= 6 ? 3 : 4)`, capped at `n`.
2. Seed per piece: `mulberry32(fnv1a(slug))`. The same slug always draws the same rotation (`rot` in `[-2.6deg, 2.6deg]`, never 0), `dx` in `[-10, 10]` and `dy` in `[-8, 8]`. Never use `Math.random()` anywhere in layout.
3. Input is sorted newest first by the caller. Place each piece in the **shortest column so far** (ties to the lowest index); column gap 56px, row gap 40px. This is greedy masonry packing, so heights balance.
4. After packing, vertically center each column against the tallest one (`y += (tallest - colHeight) / 2`) so a short column does not leave a hole under it.
5. Sort `placements` by `(y, x)`.
6. The mobile (`max-width: 700px`) CSS ignores `x`/`y` and stacks in the same DOM order, so order stays consistent.

The page does not position objects absolutely at build-time coordinates. It renders each column as a flex column (`.desk-col`) containing its pieces, with `--rot --dx --dy` applied; `placements` is used for DOM order, column membership and the test. (Absolute coordinates would break on font load and on viewport resize.)

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/writing-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { layoutDesk, nominalSize } from '../../src/lib/writing-layout';

const mk = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ slug: `piece-${i}`, shape: i % 3 === 0 ? 'letter' : i % 3 === 1 ? 'paper' : 'sheet' }));

describe('layoutDesk', () => {
  it('is deterministic: the same pieces always land in the same places', () => {
    expect(layoutDesk(mk(7))).toEqual(layoutDesk(mk(7)));
  });
  it('gives a piece the same rotation regardless of what else is on the desk', () => {
    const a = layoutDesk(mk(3)).placements.find((p) => p.slug === 'piece-1')!;
    const b = layoutDesk(mk(9)).placements.find((p) => p.slug === 'piece-1')!;
    expect(a.rot).toBe(b.rot);
  });
  it.each([1, 2, 3, 5, 8, 12, 15])('places every piece exactly once for n=%i', (n) => {
    const l = layoutDesk(mk(n));
    expect(l.placements.map((p) => p.slug).sort()).toEqual(mk(n).map((p) => p.slug).sort());
  });
  it.each([2, 3, 6, 9, 15])('leaves no column imbalance larger than the shortest object for n=%i', (n) => {
    const l = layoutDesk(mk(n));
    const bottoms = Array.from({ length: l.cols }, (_, c) =>
      Math.max(0, ...l.placements.filter((p) => p.col === c).map((p) => p.y + p.h)));
    const tops = Array.from({ length: l.cols }, (_, c) =>
      Math.min(...l.placements.filter((p) => p.col === c).map((p) => p.y)));
    const shortest = Math.min(...mk(n).map((p) => nominalSize(p.shape).h));
    for (let c = 0; c < l.cols; c++) {
      expect(l.height - bottoms[c]).toBeLessThan(shortest);
      expect(tops[c]).toBeLessThan(shortest);
    }
  });
  it('lists placements in visual reading order (y, then x)', () => {
    const p = layoutDesk(mk(8)).placements;
    for (let i = 1; i < p.length; i++) expect(p[i].y > p[i - 1].y || (p[i].y === p[i - 1].y && p[i].x >= p[i - 1].x)).toBe(true);
  });
  it('rotates every object a little but never more than 3 degrees, and never exactly 0', () => {
    for (const p of layoutDesk(mk(15)).placements) { expect(Math.abs(p.rot)).toBeGreaterThan(0); expect(Math.abs(p.rot)).toBeLessThanOrEqual(3); }
  });
  it('treats an unknown shape as a sheet and an empty desk as empty', () => {
    expect(nominalSize('zine')).toEqual(nominalSize('sheet'));
    expect(layoutDesk([]).placements).toEqual([]);
  });
  it('handles one piece without NaN', () => {
    const l = layoutDesk(mk(1));
    expect(l.cols).toBe(1);
    expect(Number.isFinite(l.height)).toBe(true);
  });
});
```

`tests/e2e/writing-desk.spec.ts` (chromium is enough for pixel and computed-style checks; the rest run on all projects):

```ts
import { expect, test } from '@playwright/test';

const piece = (page, slug) => page.locator(`[data-piece][data-slug="${slug}"]`);
const tf = (loc) => loc.evaluate((el) => getComputedStyle(el).transform);

test('there is no mug, and no lamp', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.locator('.mug, [class*="mug"], .lamp, [class*="lamp"]')).toHaveCount(0);
});

test('objects carry no grain overlay', async ({ page }) => {
  await page.goto('/writing');
  const grainOnObjects = await page.locator('[data-piece] *').evaluateAll((els) =>
    els.some((e) => ['::before', '::after'].some((p) => /grain/.test(getComputedStyle(e, p).backgroundImage))
      || /grain/.test(getComputedStyle(e).backgroundImage)));
  expect(grainOnObjects).toBe(false);
});

test('the letter shows its first phrase faintly at rest', async ({ page }) => {
  await page.goto('/writing');
  const first = page.locator('[data-slug="bigger-than-electricity"] .breakdown li').first();
  await expect(first).toContainText('One app, one weekend');
  const o = Number(await first.evaluate((el) => getComputedStyle(el).opacity));
  expect(o).toBeGreaterThan(0.2);
  expect(o).toBeLessThan(0.8);
});

test('with two pieces there is no empty region larger than one object', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  const boxes = await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  const desk = await page.locator('.desk').evaluate((e) => e.getBoundingClientRect().toJSON());
  const maxObjW = Math.max(...boxes.map((b) => b.width)), maxObjH = Math.max(...boxes.map((b) => b.height));
  const [a, b] = boxes.sort((x, y) => x.left - y.left);
  expect(b.left - (a.left + a.width)).toBeLessThan(maxObjW);          // horizontal gap
  for (const bx of boxes) expect(desk.top + desk.height - (bx.top + bx.height)).toBeLessThan(maxObjH); // gap under each
});

for (const slug of ['bigger-than-electricity', 'quiet-singularity']) {
  test(`hover does more: ${slug} lifts, straightens, brightens and opens its breakdown`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover is a pointer behaviour; phones tap (see the phone test)');
    await page.goto('/writing');
    const p = piece(page, slug);
    const before = { t: await tf(p), f: await p.evaluate((e) => getComputedStyle(e).filter), o: await p.locator('.breakdown').evaluate((e) => getComputedStyle(e).opacity) };
    await p.hover();
    await expect.poll(() => tf(p)).not.toBe(before.t);                               // lift + straighten
    await expect(p).toHaveClass(/is-lit/);
    await expect(p).toHaveClass(/is-open/);
    await expect.poll(async () => Number(await p.locator('.breakdown').evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(Number(before.o));
    const lit = await p.evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--lit') || '0'));
    expect(lit).toBeGreaterThan(0); // brighten is driven by --lit, which CSS maps to surface brightness
  });
}

test('keyboard focus lands in visual order and shows the same state as hover', async ({ page }) => {
  await page.goto('/writing');
  const order = await page.locator('[data-piece]').evaluateAll((els) =>
    els.map((e) => ({ slug: (e as HTMLElement).dataset.slug, top: e.getBoundingClientRect().top, left: e.getBoundingClientRect().left })));
  const visual = [...order].sort((a, b) => a.top - b.top || a.left - b.left).map((o) => o.slug);
  expect(order.map((o) => o.slug)).toEqual(visual);
  await page.locator('[data-piece] .piece-link').first().focus();
  await expect(page.locator('[data-piece]').first()).toHaveClass(/is-lit/);
});

test('the desk renders with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/writing');
  expect(errors).toEqual([]);
});

test('a phone tap opens the breakdown first and a second tap enters the piece; modifier clicks still follow the link', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone-only');
  await page.goto('/writing');
  const p = piece(page, 'quiet-singularity');
  await p.locator('.piece-link').tap();
  await expect(p).toHaveClass(/is-open/);
  await expect(page).toHaveURL(/\/writing\/?$/);
  await p.locator('.piece-link').tap();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity/);
});

test('ctrl-click opens in a new tab and is not swallowed by the tap logic', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'no modifier keys on touch');
  await page.goto('/writing');
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-slug="quiet-singularity"] .piece-link').click({ modifiers: ['Control'] })]);
  await expect(popup).toHaveURL(/quiet-singularity/);
});
```

Add two Vitest tests (`tests/unit/writing-objects.test.ts`) for the cases the static build cannot show: (1) an unknown kind, and (2) a piece with no `breakdown` or `why`. Render the object through Astro's container API (`experimental_AstroContainer`, Astro 5), with `{ shape: 'sheet', kind: 'zine', breakdown: [] }` and `{ shape: 'letter', breakdown: [] }`; assert the HTML contains the title and kind, has no `.fold` or `.sheet` panels and no empty `<ol>`, and that rendering does not throw. Original wording follows, kept for the details: for "unknown kind" add a Vitest test that renders `ObjectSheet` through Astro's container API (`experimental_AstroContainer`, available in Astro 5) with `{ shape: 'sheet', breakdown: [] }` and asserts the HTML contains the title and no `.fold` element. For "no breakdown", the same container test with `breakdown: []`. Do not leave `async () => {}` bodies.

- [ ] **Step 2: Run to confirm RED**

Run: `npm test -- writing-layout` and `npx playwright test tests/e2e/writing-desk.spec.ts --workers=4 --project=chromium`
Expected: unit FAIL on missing module; e2e FAIL on `.desk` / `.is-lit` not found.

- [ ] **Step 3: Implement `writing-layout.ts`**

Pure module; no DOM, no `Math.random`. Include `fnv1a(str): number`, `mulberry32(seed): () => number`, `nominalSize`, `layoutDesk` exactly per the algorithm above. Constants: `COL_GAP = 56`, `ROW_GAP = 40`, `MAX_ROT = 2.6`.

- [ ] **Step 4: Objects and desk markup**

- `Piece.astro` renders `<li class="piece">` > `<div class="obj obj--{shape}" data-piece ...>` containing the skin component and, outside the skin, the real `<a class="piece-link">` and `<ol class="breakdown">` from Task 1. The skin is decorative (`aria-hidden="true"`), draws folds or sheets, and *repeats nothing a screen reader needs*. The visible words on the object (title, kind, minutes, why, breakdown phrases) are the real DOM text, positioned by CSS onto the skin. Do not duplicate text into the skin (duplicate text hurts a11y and the "link name" rule).
- `ObjectLetter.astro`: one `<span class="fold fold-N">` per breakdown entry (N = 1 to 6), nested exactly as the prototype so the folds hinge (`.fold > .fold { top:100% }`), panel heights from a CSS var per index. **Port** the geometry and shading; **rewrite** the markup (no `<button>`, no nested `<span class="in">` soup).
- `ObjectPaper.astro`: one `.sheet` per breakdown entry plus a cover and a staple. Fan step 46px on `.is-open`. Cover has the title, kind, why.
- `ObjectSheet.astro`: a single matte sheet: title, kind, minutes, why. No breakdown panels.
- Matte and clean: flat gradients only. No `filter: url(#grain)`, no `background-image` that references `grain.png`, no noise on `::before`/`::after` of the objects. Shadows are allowed.
- Letter's first phrase at rest: `.obj--letter .breakdown li:first-child { opacity: .45 }` and `.is-open .breakdown li { opacity: 1 }`; remaining phrases start at `opacity: 0`.
- `why` line: italic serif, color `--text-2` at rest (faint like pencil); on `.is-lit` transition to `--ink: #F4ECDD` over 1.4s with `text-shadow: 0 0 1px rgba(244,236,221,.35)` (ink wet). Task 3 owns the opacity ramp driven by the pool; here, a plain class-based transition is enough. Contrast: `--text-2` on the darkest object surface must be AA; test in Task 8, verify now with axe.
- Hover that does more (the feedback): on `.is-lit` the object (a) translates up 8px, (b) rotates to 30% of its `--rot`, (c) raises `--lit` from 0 to 1, which maps to `filter: brightness(calc(1 + var(--lit) * .18))` on the *surface only*, (d) the breakdown opens (`.is-open`). Hover and `:focus-within` both set it (via `writing-desk.ts`). CSS-only fallback: `@media (hover:hover){ .obj:hover { ... } } .obj:focus-within { ... }` so it still works if the script fails.
- Desk wrapper: `<div class="room"><div class="desk">{columns}</div></div>` with `.desk` as `display:flex; justify-content:center; align-items:flex-start; gap:56px`, columns as `.desk-col { display:flex; flex-direction:column; gap:40px }` and the vertical centering offset from step 4 of the algorithm applied as `margin-top` per column.
- Phone (`@media (max-width:700px), (hover:none)`): `.desk` becomes a single column, objects centered, `gap:56px`.
- All desk CSS is gated on `html.js` so the no-JS list stays plain. Object skins and rotations apply only under `html.js .room`.

- [ ] **Step 5: `writing-desk.ts`**

Pointer enter/leave (`pointerType === 'mouse'` and not narrow), `focusin`/`focusout`, and the phone logic: on narrow/`hover:none`, the first click on a link whose piece is not `.is-open` calls `preventDefault()`, opens it and closes others; the second click follows the link. **Do not intercept** clicks with `ctrlKey`, `metaKey`, `shiftKey`, `altKey` or `button !== 0`. Dispatch `piece:lit` / `piece:unlit`. Add `is-lit` and `is-open` classes together on the desktop; on phones `is-open` only after the first tap. Under reduced motion no timers or loops are created here (CSS transitions only; the global reduced-motion rule already collapses them).

- [ ] **Step 6: GREEN**

Run: `npm test` then `npx playwright test tests/e2e/writing-desk.spec.ts tests/e2e/writing.spec.ts tests/e2e/layout.spec.ts tests/e2e/a11y.spec.ts --workers=4`
Expected: PASS (known-flaky aside). Layout test file: add `/writing` to its widths loop if not already there (it should cover 320, 375, 768, 1280).

**Visual check** (to `portfolio-explorations\shots\`; chromium at 1280x900 unless stated):
- `twr2-desk-rest-1280.png`: two objects side by side, tightly composed, slight tilts, no mug, no grain on the paper/letter surfaces, no gap bigger than one object. The letter's first phrase visible and faint.
- `twr2-desk-hover-letter-1280.png`: pointer on the letter. Clearly different from rest: lifted, straighter, brighter, all four phrases showing.
- `twr2-desk-hover-paper-1280.png`: paper fanned into six headed rows, each with a gist.
- `twr2-desk-375.png`: stacked vertically on a 375 viewport; nothing clipped.
- `twr2-desk-focus-1280.png`: keyboard-focused piece, with a visible focus ring.

- [ ] **Step 7: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat(writing): the desk, deterministic layout and objects that open on hover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Light and dust

**Files:**
- Create: `src/lib/room-light.ts`, `src/scripts/light-pool.ts`, `src/scripts/dust.ts`
- Modify: `src/lib/daypart.ts` (additive `currentDaypart`), `src/pages/writing/index.astro` (light layer markup, script imports), `src/styles/writing-room.css`, `src/scripts/writing-desk.ts` (nearest-to-centre on phones)
- Test: `tests/unit/room-light.test.ts`, `tests/unit/daypart.test.ts` (extend), `tests/e2e/writing-light.spec.ts`

**Interfaces:**
- Consumes: `Daypart`, `daypartFor` from `src/lib/daypart.ts`; `piece:lit` / `piece:unlit` events and `.is-lit` (Task 2).
- Produces:
  - `src/lib/daypart.ts`: `export function currentDaypart(root: Element, now?: Date): Daypart`. Precedence, matching the hero: `data-daypart` attribute on `<html>` (if `isDaypart`), then the clock via `daypartFor(now.getHours())`. (Do not copy the `?daypart=` or keyboard-preview logic from `hero-topography.ts`; this room only needs the test hook and the clock.)
  - `src/lib/room-light.ts`: `export interface RoomLight { windowColor: [number, number, number]; windowAlpha: number; windowOffset: { x: number; y: number }; shadowBlur: number; poolPeak: number; }` and `export function roomLight(d: Daypart): RoomLight`.
  - Pool state exposed as CSS custom properties on `.room`: `--pool-x`, `--pool-y` (px, room-relative), `--pool-s` (scale), `--pool-i` (0 to 1 intensity). Also `room.dataset.pool = 'rest' | 'piece' | 'drawer'`.
  - `light-pool.ts` exports `aimAt(el: Element, scale?: number, intensity?: number): void`, `aimRest(): void`, `aimPoint(x: number, y: number, scale?: number, intensity?: number): void` (drawer uses it in Task 5), and `onMove(cb: (x: number, y: number, i: number) => void): () => void` (the night note uses it in Task 4).
  - `dust.ts`: sets `canvas.dataset.dust = 'running' | 'paused'`; exports nothing else.

**Feedback applied here:**
- Afternoon less bright: prototype afternoon had window alpha `.2` and a hard offset shadow. New: `windowAlpha: 0.12`, `shadowBlur` softer, `poolPeak` unchanged from evening (the pool is the star at all times).
- Hover does more: the pool moves to the piece, the `why` line inks (opacity .55 to 1 plus the color shift from Task 2) and the pool's intensity rises to 1 from the rest value 0.5.

- [ ] **Step 1: Write the failing tests**

`tests/unit/room-light.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DAYPARTS } from '../../src/lib/daypart';
import { roomLight } from '../../src/lib/room-light';

describe('roomLight', () => {
  it('afternoon window light is softer than the prototype (0.2)', () => {
    expect(roomLight('afternoon').windowAlpha).toBeLessThanOrEqual(0.13);
    expect(roomLight('afternoon').windowAlpha).toBeGreaterThan(0);
  });
  it('morning is cooler (more blue than red) than afternoon', () => {
    const m = roomLight('morning').windowColor, a = roomLight('afternoon').windowColor;
    expect(m[2] - m[0]).toBeGreaterThan(a[2] - a[0]);
  });
  it('evening dims the window below afternoon, and night has none', () => {
    expect(roomLight('evening').windowAlpha).toBeLessThan(roomLight('afternoon').windowAlpha);
    expect(roomLight('night').windowAlpha).toBe(0);
  });
  it('every daypart keeps the warm pool visible', () => {
    for (const d of DAYPARTS) expect(roomLight(d).poolPeak).toBeGreaterThan(0.3);
  });
});
```

Extend `tests/unit/daypart.test.ts`:

```ts
import { currentDaypart } from '../../src/lib/daypart';
describe('currentDaypart', () => {
  const root = (attr?: string) => ({ getAttribute: () => attr ?? null }) as unknown as Element;
  it('prefers a valid data-daypart over the clock', () => {
    expect(currentDaypart(root('night'), new Date(2026, 9, 14, 13))).toBe('night');
  });
  it('ignores an invalid data-daypart and uses the clock', () => {
    expect(currentDaypart(root('noon'), new Date(2026, 9, 14, 13))).toBe('afternoon');
  });
  it('uses the clock at the boundary hours', () => {
    const at = (h: number) => currentDaypart(root(), new Date(2026, 9, 14, h, 0));
    expect([at(20), at(21), at(6), at(7)]).toEqual(['evening', 'night', 'night', 'morning']);
  });
});
```

`tests/e2e/writing-light.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const pool = (page) => page.locator('.room').evaluate((r) => ({
  x: parseFloat(getComputedStyle(r).getPropertyValue('--pool-x')),
  y: parseFloat(getComputedStyle(r).getPropertyValue('--pool-y')),
  i: parseFloat(getComputedStyle(r).getPropertyValue('--pool-i')),
}));
const whyOpacity = (loc) => loc.locator('.piece-why').evaluate((e) => Number(getComputedStyle(e).opacity));

test('hover or focus measurably changes transform, pool position and why opacity', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer hover');
  await page.goto('/writing');
  const p = page.locator('[data-slug="quiet-singularity"]');
  const before = { t: await p.evaluate((e) => getComputedStyle(e).transform), pool: await pool(page), why: await whyOpacity(p) };
  await p.hover();
  await expect.poll(async () => (await pool(page)).x).not.toBe(before.pool.x);
  await expect.poll(async () => await whyOpacity(p)).toBeGreaterThan(before.why);
  expect(await p.evaluate((e) => getComputedStyle(e).transform)).not.toBe(before.t);
  expect((await pool(page)).i).toBeGreaterThan(before.pool.i);
});

test('keyboard focus does the same as hover', async ({ page }) => {
  await page.goto('/writing');
  const before = await pool(page);
  await page.locator('[data-slug="quiet-singularity"] .piece-link').focus();
  await expect.poll(async () => (await pool(page)).x).not.toBe(before.x);
});

test('the pool settles: the light loop stops when nothing is moving', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__rafFns = new Set(); const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { (window as any).__rafFns.add(cb); return raf(cb); }; });
  await page.goto('/writing');
  await page.locator('.room').hover(); await page.waitForTimeout(3500);
  const a = await page.evaluate(() => (window as any).__rafFns.size);
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => (window as any).__rafFns.size);
  expect(b).toBe(a); // no new distinct rAF callbacks created once settled (dust is one stable loop)
});

test('dust runs only while visible and pauses when the tab is hidden or offscreen', async ({ page }) => {
  await page.goto('/writing');
  const d = page.locator('canvas.dust');
  await expect(d).toHaveAttribute('data-dust', 'running');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(d).toHaveAttribute('data-dust', 'paused');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(d).toHaveAttribute('data-dust', 'running');
});

test('reduced motion: static and lit, no dust, no loop', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => { (window as any).__raf = 0; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { (window as any).__raf++; return raf(cb); }; });
  await page.goto('/writing');
  await page.waitForTimeout(600);
  const n = await page.evaluate(() => (window as any).__raf);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).__raf)).toBe(n);
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'paused');
  expect((await pool(page)).i).toBeGreaterThan(0.8); // lit
  await ctx.close();
});

test('dust lives only inside the pool: no mote paints far from it', async ({ page }) => {
  test.skip((test.info().project.name) !== 'chromium', 'pixel read');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/writing');
  await page.waitForTimeout(1500);
  const far = await page.evaluate(() => {
    const c = document.querySelector('canvas.dust') as HTMLCanvasElement, r = document.querySelector('.room') as HTMLElement;
    const x = parseFloat(getComputedStyle(r).getPropertyValue('--pool-x')), y = parseFloat(getComputedStyle(r).getPropertyValue('--pool-y'));
    const g = c.getContext('2d')!; const corner = g.getImageData(0, 0, 120, 120).data; // top-left corner, far from any pool target
    let lit = 0; for (let i = 3; i < corner.length; i += 4) if (corner[i] > 8) lit++;
    return { lit, x, y };
  });
  expect(far.lit).toBe(0);
});

test('afternoon is dimmer than the prototype: window light alpha is low', async ({ page }) => {
  await page.addInitScript(() => document.documentElement.setAttribute('data-daypart', 'afternoon'));
  await page.goto('/writing');
  const a = await page.locator('.room').evaluate((r) => parseFloat(getComputedStyle(r).getPropertyValue('--window-alpha')));
  expect(a).toBeLessThanOrEqual(0.13);
});

test('a page of objects has no grain on them even with the light layer on (pixel)', async ({ page }) => {
  test.skip((test.info().project.name) !== 'chromium', 'pixel read');
  await page.goto('/writing');
  // Sample a 40x40 patch from the middle of the paper's cover; matte and clean means near-zero variance.
  const shot = await page.locator('[data-slug="quiet-singularity"] .cover, [data-slug="quiet-singularity"] .obj-surface').first().screenshot();
  const { PNG } = await import('pngjs'); // add as devDependency if missing: npm_config_os=win32 npm install -D pngjs
  const png = PNG.sync.read(shot);
  const sample: number[] = []; for (let y = 20; y < 60; y++) for (let x = 20; x < 60; x++) sample.push(png.data[(y * png.width + x) * 4]);
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  const sd = Math.sqrt(sample.reduce((a, b) => a + (b - mean) ** 2, 0) / sample.length);
  expect(sd).toBeLessThan(6);
});
```

(If `pngjs` is not already a dependency, install as a dev dependency with the npm quirk prefix. If installing is undesirable, replace the last test with a canvas-based read via `page.evaluate` and `drawImage`, which cannot read cross-origin pixels but can read a same-origin screenshot URL; choose whichever is simpler, but the test must exist.)

- [ ] **Step 2: Run to confirm RED**

Run: `npm test -- room-light daypart` and `npx playwright test tests/e2e/writing-light.spec.ts --workers=4 --project=chromium`
Expected: FAIL (missing modules, no `--pool-x`, no `canvas.dust`).

- [ ] **Step 3: Implement the pure modules**

`room-light.ts`: a `Record<Daypart, RoomLight>` table. Starting values (adjust by eye in the visual check, but the unit-test invariants must hold):

```ts
morning:   { windowColor: [196, 214, 244], windowAlpha: 0.12, windowOffset: { x: 20, y: 12 }, shadowBlur: 22, poolPeak: 0.5 },
afternoon: { windowColor: [255, 238, 210], windowAlpha: 0.12, windowOffset: { x: 40, y: 22 }, shadowBlur: 30, poolPeak: 0.5 },
evening:   { windowColor: [255, 160,  90], windowAlpha: 0.075, windowOffset: { x: 10, y: 12 }, shadowBlur: 24, poolPeak: 1 },
night:     { windowColor: [0, 0, 0],       windowAlpha: 0,     windowOffset: { x: 0,  y: 0  }, shadowBlur: 24, poolPeak: 1.25 },
```

`currentDaypart` goes in `daypart.ts` per the interface above (additive; do not change existing exports).

- [ ] **Step 4: Implement the light layer and scripts**

Markup in `index.astro` inside `.room`, `aria-hidden="true"`, `pointer-events:none`:
`<div class="light"><div class="window"><i></i><i></i></div><div class="pool"><i></i><i></i></div><canvas class="dust" data-dust="paused"></canvas></div>`.
The room's `--window-alpha`, `--window-rgb`, `--pool-peak` custom properties are set from `roomLight()` by `light-pool.ts` at load. **Port** the prototype's window parallelogram `clip-path`s and the two radial gradients; **rewrite** all inline JS and the `getComputedStyle` per-frame read (read `poolPeak` from the table once).

`light-pool.ts`:
- State `{x, y, s, i}` and target. A `step()` function eases toward the target (`k = .035`), writes the four CSS variables on `.room`, then schedules the next frame **only if** any delta exceeds an epsilon (0.4px, 0.004 scale or intensity). Otherwise it stops. Any `aim*` call restarts it. That is what makes "no animation loop running" true when settled.
- Rest target: centroid of `.desk`, intensity 0.5 (1 under reduced motion).
- Subscribes to `piece:lit` (aim at element center, scale 1, intensity 1) and `piece:unlit` (rest).
- Phones: on scroll (rAF-throttled), light the piece whose center is nearest the viewport center, unless one is `.is-open`. This is a deterministic function of scroll position; extract it as `nearestToCenter(rects, viewportH): number` and export for a unit test.
- Reduced motion: no easing; set the state instantly at load and on every change (`Object.assign` then write variables); add `is-lit` to all pieces (static and lit, spec).
- `pageshow` with `persisted`: re-aim at rest, do not start a second loop (guard with a module-level `running` flag).

`dust.ts`:
- Seeded PRNG (`mulberry32(0x5eed)`), 90 motes (60 on narrow), drawing only inside the pool (influence = gaussian of distance to `--pool-x/y` times `--pool-i`; skip below 0.02). Read pool variables once per frame from a cached object that `light-pool.ts` updates through an exported setter (do not parse CSS every frame).
- Start only when the room is intersecting (`IntersectionObserver`), `!document.hidden`, and motion is allowed; stop on any of those changing (`visibilitychange`, observer callback, `matchMedia('(prefers-reduced-motion: reduce)')` change listener). Cancel the pending frame on stop. Set `data-dust` to `running`/`paused`. Resize the canvas through `ResizeObserver`, with `devicePixelRatio` capped at 2.
- Reduced motion: never starts; the canvas stays empty.

CSS: `.light` layers `z-index:0`, objects above; the existing site grain stays behind the room content exactly as now (do not add a second grain). Add the soft vignette from the prototype (`.room::after`, inset box-shadow) at lower strength than the prototype's `rgba(0,0,0,.6)`: 0.5.

- [ ] **Step 5: GREEN and Lighthouse smoke**

Run: `npm test` then `npx playwright test tests/e2e/writing-light.spec.ts tests/e2e/writing-desk.spec.ts tests/e2e/a11y.spec.ts --workers=4`
Then (server stopped afterwards) `npx lighthouse http://localhost:4322/writing --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility --output=json --output-path=./lh-writing.json --chrome-flags="--headless"` against `npm run build && npm run preview -- --port 4322`. Expected: performance >= 95. If under, the likely cause is the 900px blurred pool and the full-viewport canvas: lower blur radius, use `will-change: transform` only on `.pool`, and cap canvas DPR.

**Visual check:**
- `twr3-light-night-rest-1280.png`: only the warm pool over the desk centre, dust visible as faint specks inside the pool, none in the corners.
- `twr3-light-night-hover-paper-1280.png`: pool has moved onto the paper; the why line is inked darker than at rest.
- `twr3-light-morning-1280.png`: pale cool window light across the desk.
- `twr3-light-afternoon-1280.png`: soft warm window light, visibly dimmer than the prototype; objects still clearly legible.
- `twr3-light-evening-1280.png`: window dim, warm pool dominant.
- `twr3-light-reduced-1280.png`: reduced-motion context, static and lit, no dust specks.
- Set the period with `document.documentElement.setAttribute('data-daypart', ...)` before capture.

- [ ] **Step 6: Commit**

```bash
git add aaryush/src aaryush/tests aaryush/package.json aaryush/package-lock.json
git commit -m "feat(writing): room light, moving pool and pausing dust

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The room keeps the visitor's time (daypart + night note)

**Files:**
- Create: `src/scripts/room-clock.ts`
- Modify: `src/pages/writing/index.astro` (import script), `src/styles/writing-room.css` (note styling), `src/scripts/light-pool.ts` (call `onMove` consumers)
- Test: `tests/e2e/writing-clock.spec.ts`; extend `tests/unit/daypart.test.ts` for a non-finite hour (already covered by the existing `daypartFor` tests: assert once more via `currentDaypart`)

**Interfaces:**
- Consumes: `currentDaypart` (Task 3), `roomLight`, `onMove` from `light-pool.ts`.
- Produces: `room.dataset.daypart` mirrors the active period; the note element `<div class="night-note" aria-hidden="true">you're up late too.</div>` exists in the DOM **only** while the period is `night`; custom property `--near` (0 to 1) on the note.

Behaviour:
- `applyDaypart()` reads `currentDaypart(document.documentElement)`, writes `room.dataset.daypart`, updates the light variables from `roomLight()`, and inserts or removes the note. The note is created by script (the static HTML can't know the visitor's hour, so it must never be in the served HTML: that satisfies "absent from the DOM in daytime").
- Re-evaluate every 60s (`setInterval`), on `visibilitychange` becoming visible, and on mutations of `data-daypart` on `<html>` (`MutationObserver`, the hero's hook). Clear the interval on `pagehide`.
- The note is unlabelled: `aria-hidden="true"`, no heading, no "easter egg" text anywhere. Position: bottom-right of the desk, a few degrees off-axis, handwritten italic (`--serif`), small paper surface. On phones it sits below the last piece, not overlapping the drawer.
- Catches the light: `light-pool.ts` calls subscribers on every step; the note sets `--near = exp(-d^2 / (2 * (210*s)^2)) * i` and CSS maps `--near` to the note's text color/opacity (ink from faint to `--ink`). Unsubscribe when the note is removed.

- [ ] **Step 1: Write the failing e2e tests**

`tests/e2e/writing-clock.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });
const at = async (page, iso: string) => { await page.clock.install({ time: new Date(iso) }); };

for (const [iso, shown] of [
  ['2026-10-14T20:59:00', false], ['2026-10-14T21:00:00', true], ['2026-10-14T23:59:00', true],
  ['2026-10-14T00:00:00', true], ['2026-10-14T06:59:00', true], ['2026-10-14T07:00:00', false],
  ['2026-10-14T13:00:00', false],
] as const) {
  test(`night note ${shown ? 'is' : 'is not'} in the DOM at ${iso.slice(11, 16)}`, async ({ page }) => {
    await at(page, iso);
    await page.goto('/writing');
    await expect(page.locator('.night-note')).toHaveCount(shown ? 1 : 0);
  });
}

test('the served HTML never contains the note, and the note is hidden from assistive tech and unlabelled', async ({ page, request }) => {
  expect(await (await request.get('/writing')).text()).not.toContain('up late');
  await at(page, '2026-10-14T23:00:00');
  await page.goto('/writing');
  const n = page.locator('.night-note');
  await expect(n).toHaveAttribute('aria-hidden', 'true');
  await expect(n).toHaveText(/you.re up late too\./);
  await expect(page.locator('[class*="easter"], [aria-label*="late"]')).toHaveCount(0);
});

test('a tab left open across 21:00 gets the note without a reload, and loses it at 07:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T20:58:00') });
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(0);
  await page.clock.fastForward('03:00');
  await expect(page.locator('.night-note')).toHaveCount(1);
  await page.clock.fastForward('10:00:00');
  await expect(page.locator('.night-note')).toHaveCount(0);
});

test('data-daypart forces a period in tests, both ways', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-14T13:00:00') });
  await page.addInitScript(() => document.documentElement.setAttribute('data-daypart', 'night'));
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-daypart', 'morning'));
  await expect(page.locator('.night-note')).toHaveCount(0);
  await expect(page.locator('.room')).toHaveAttribute('data-daypart', 'morning');
});

test('the note catches the light when the pool passes near it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer');
  await page.addInitScript(() => document.documentElement.setAttribute('data-daypart', 'night'));
  await page.goto('/writing');
  const near = () => page.locator('.night-note').evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--near')));
  const far = await near();
  const b = await page.locator('.night-note').boundingBox();
  // aim the pool at the note by hovering the piece closest to it
  const pieces = page.locator('[data-piece]');
  await pieces.last().hover();
  await expect.poll(near).toBeGreaterThanOrEqual(far);
  expect(b).not.toBeNull();
});

test('reduced motion: the note is still absent by day and present by night, and nothing animates', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', timezoneId: 'America/Chicago' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-14T23:00:00') });
  await page.goto('/writing');
  await expect(page.locator('.night-note')).toHaveCount(1);
  const anims = await page.evaluate(() => document.getAnimations().length);
  expect(anims).toBe(0);
  await ctx.close();
});
```

Extend `tests/unit/daypart.test.ts`: `expect(currentDaypart(root(), new Date(Number.NaN))).toBe('afternoon')`.

- [ ] **Step 2: RED** — `npx playwright test tests/e2e/writing-clock.spec.ts --workers=4 --project=chromium` → FAIL (no `.night-note`).

- [ ] **Step 3: Implement `room-clock.ts`** per the behaviour list. Use `document.createElement`, never `innerHTML`. The note text lives in a `const NOTE = 'you’re up late too.'` at the top of the file (typographic apostrophe; the test regex accepts both).
- [ ] **Step 4: Note CSS.** Small matte paper, `rotate(-4deg)`, serif italic ~19px, text color `color-mix(in srgb, var(--text-2), var(--ink) calc(var(--near, 0) * 100%))`. Hide on `[data-reading]`-style states (none yet). On narrow screens, `position:static; align-self:flex-start; margin: 34px 0 0 10px`.
- [ ] **Step 5: GREEN** — `npm test` and `npx playwright test tests/e2e/writing-clock.spec.ts tests/e2e/writing-light.spec.ts tests/e2e/a11y.spec.ts --workers=4`.

**Visual check:**
- `twr4-night-note-1280.png`: night, pool at rest. The small handwritten paper note sits on the desk; it reads as a found object, with no label or tooltip.
- `twr4-night-note-near-1280.png`: pool moved toward the note by hovering the nearest piece; the note's ink is visibly lit compared with the previous shot.
- `twr4-day-no-note-1280.png`: afternoon, no note.
- `twr4-night-note-375.png`: note sits below the pieces on a phone, clear of the drawer area.

- [ ] **Step 6: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat(writing): room clock, live daypart and the night note

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The drawer ("writing I'm working on")

**Files:**
- Create: `src/components/writing/Drawer.astro`, `src/scripts/drawer.ts`
- Modify: `src/pages/writing/index.astro`, `src/styles/writing-room.css`, `src/data/site.ts` (no change expected; `drawer` exists from Task 1)
- Test: `tests/e2e/writing-drawer.spec.ts`, `tests/unit/writing-drawer-leak.test.ts`

**Interfaces:**
- Consumes: `site.drawer: { kind: string; length: string }[]`, `aimPoint` from `light-pool.ts`.
- Produces: `<section class="drawer" aria-label="Writing I'm working on">` with a `<button class="drawer-front" aria-expanded aria-controls>` and a contents region `#drawer-contents`. Contents: one folder labelled `contextOS` (text from `site.next.name`) and one redacted paper per `site.drawer` entry.

Rules:
- Each redacted paper shows only `kind` and `length` as readable text plus decorative black bars (`aria-hidden`). Its accessible text is exactly `"{kind}, {length}, unpublished"`. **It never shows a title or content.**
- The drawer is not a link and has no hover-to-navigate. The contextOS folder is a decorative object labelled by its name; it does not link anywhere (the site has no outbound content link; `site.next.note` stays on the home page).
- No-JS: the contents region is visible as a plain list under a heading "Writing I'm working on" (progressive enhancement collapses it under `html.js`).
- Open: click or Enter/Space on the front toggles it; keyboard focus on the front opens it (like the prototype), blur closes it unless focus moved inside the contents; Escape closes it and returns focus to the front; a pointerdown outside closes it. While open, the stage dims to 0.3 opacity and the pool moves to the drawer through `aimPoint`; closing restores the previous aim. Reduced motion: opens instantly, no dimming transition.
- Phones: the drawer sits at the bottom of the page flow (not fixed), full width up to 92vw.
- Build-time guard: `Drawer.astro` takes only `site.drawer` and `site.next.name`; it must not import the content collection (so a draft piece's title cannot reach it by construction).

- [ ] **Step 1: Failing tests**

`tests/unit/writing-drawer-leak.test.ts` (reads files, no browser):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('the drawer cannot see the collection', () => {
  const src = readFileSync('src/components/writing/Drawer.astro', 'utf8');
  it('does not import astro:content', () => expect(src).not.toMatch(/astro:content|getCollection/));
  it('only reads kind and length from site.drawer', () => expect(src).not.toMatch(/\.title|\.body|\.summary/));
});
```

`tests/e2e/writing-drawer.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the drawer sits slightly open at the desk edge and lists contextOS plus redacted drafts', async ({ page }) => {
  await page.goto('/writing');
  const front = page.getByRole('button', { name: /writing I.m working on/i });
  await expect(front).toBeVisible();
  await expect(front).toHaveAttribute('aria-expanded', 'false');
  await front.click();
  await expect(front).toHaveAttribute('aria-expanded', 'true');
  const c = page.locator('#drawer-contents');
  await expect(c.getByText('contextOS')).toBeVisible();
  await expect(c.locator('.redacted')).toHaveCount(2);
  await expect(c.locator('.redacted').first()).toContainText(/essay|letter/i);
  await expect(c.locator('.redacted').first()).toContainText(/~[\d,]+ words/);
});

test('it never shows a title or body of unpublished work', async ({ page, request }) => {
  const html = await (await request.get('/writing')).text();
  await page.goto('/writing');
  await page.getByRole('button', { name: /writing I.m working on/i }).click();
  const text = await page.locator('#drawer-contents').innerText();
  expect(text.replace(/\s+/g, ' ')).toMatch(/^contextOS /i);
  for (const redacted of await page.locator('.redacted').all()) {
    const t = await redacted.innerText();
    expect(t.split('\n').filter(Boolean).length).toBeLessThanOrEqual(3); // kind, length (+ label)
  }
  expect(html).not.toMatch(/draft: true/);
});

test('keyboard: focus opens, Escape closes and returns focus', async ({ page }) => {
  await page.goto('/writing');
  const front = page.getByRole('button', { name: /writing I.m working on/i });
  await page.keyboard.press('Tab'); // advance until the front is focused
  await front.focus();
  await expect(front).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(front).toHaveAttribute('aria-expanded', 'false');
  await expect(front).toBeFocused();
});

test('click outside closes it', async ({ page }) => {
  await page.goto('/writing');
  const front = page.getByRole('button', { name: /writing I.m working on/i });
  await front.click();
  await page.locator('h1').click();
  await expect(front).toHaveAttribute('aria-expanded', 'false');
});

test('opening the drawer moves the light to it', async ({ page }) => {
  await page.goto('/writing');
  const y = () => page.locator('.room').evaluate((r) => parseFloat(getComputedStyle(r).getPropertyValue('--pool-y')));
  const before = await y();
  await page.getByRole('button', { name: /writing I.m working on/i }).click();
  await expect.poll(y).toBeGreaterThan(before);
});

test('no-JS: the drafts are a readable list', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await expect(page.getByText('contextOS')).toBeVisible();
  await expect(page.locator('.redacted')).toHaveCount(2);
  await ctx.close();
});

test('reduced motion: opens instantly (no running transitions)', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  await page.getByRole('button', { name: /writing I.m working on/i }).click();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await ctx.close();
});

test('drawer fits at 320 with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/writing');
  await page.getByRole('button', { name: /writing I.m working on/i }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
```

- [ ] **Step 2: RED**, **Step 3: implement** (`Drawer.astro`, `drawer.ts`, CSS ported from the prototype's `.drawer`, `.dr-in`, `.dr-front`, `.folder`, `.red`), **Step 4: GREEN**: `npm test`, then `npx playwright test tests/e2e/writing-drawer.spec.ts tests/e2e/writing-light.spec.ts tests/e2e/writing-desk.spec.ts tests/e2e/a11y.spec.ts tests/e2e/layout.spec.ts --workers=4`.

**Visual check:**
- `twr5-drawer-closed-1280.png`: front edge visible at the bottom of the desk, slightly open, labelled.
- `twr5-drawer-open-1280.png`: contextOS folder plus two redacted papers (kind and rough length only, black bars for text); the desk above is dimmed; the pool has moved down.
- `twr5-drawer-open-375.png`: fits the phone, nothing clipped.
- `twr5-drawer-nojs-1280.png`: plain list, readable.

- [ ] **Step 5: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat(writing): the drawer of unpublished work, kind and length only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Walking into a piece (kind-specific view transitions, Back restores the desk)

**Files:**
- Create: `src/styles/writing-transitions.css`
- Modify: `src/components/writing/Piece.astro` (vt name/class), `src/layouts/EssayLayout.astro` (matching vt name on the essay head, `kind` prop), `src/pages/writing/[slug].astro` (pass `kind`, `slug`), `src/scripts/writing-desk.ts` (remember last piece, restore focus), `src/styles/base.css` only if the reduced-motion `@view-transition { navigation: none }` needs an override (it already disables transitions, so no change is expected)
- Test: `tests/e2e/writing-open.spec.ts`

**Interfaces:**
- Consumes: `.obj` / `PieceView.slug` / `shape` (Task 2); `writing-memory` is **not** used yet (Task 8 owns it); this task writes only a tiny, self-contained `sessionStorage` key `writing:last` for focus-on-Back.
- Produces: on `/writing`, each piece's `.obj` has `view-transition-name: piece-<slug>` and `view-transition-class: vt-<shape>`; on `/writing/<slug>`, `.essay-head` (the title block) has `view-transition-name: piece-<slug>` and the same `view-transition-class`.

**How kind-specific transitions work with Astro cross-document view transitions:**

The site uses the native browser feature (`@view-transition { navigation: auto }`), not Astro's `<ClientRouter />`; so there is no `transition:name` directive and no JS swap. The mechanism is pure CSS:

1. Both documents opt in (already true in `base.css`).
2. A shared `view-transition-name` links the old element to the new one. Names must be unique per document, so use `piece-<slug>`. Putting a name on every piece is fine: only the pair that exists in *both* documents animates as a "morph"; the other pieces' names exist only in the old document, so they get a plain fade-out. (Do not put a name on an element not in the viewport that is expensive to snapshot: the objects are small, this is fine; verify with the Lighthouse check.)
3. `view-transition-class: vt-letter | vt-paper | vt-sheet` lets one CSS rule target all pieces of a kind: `::view-transition-group(*.vt-letter)`, `::view-transition-old(*.vt-letter)`, `::view-transition-new(*.vt-letter)`. Support: Chromium and Safari support `view-transition-class`; where unsupported the rules are ignored and the default cross-fade runs. That is the intended degradation, along with no transition at all in browsers without cross-document support.
4. **Letter** (lifts and unfolds toward you): the group scales from the object's box to the essay-head box (default). Add `::view-transition-old(*.vt-letter) { animation: vt-letter-out .55s var(--ease-out) both; }` that lifts (`translateY(-14px) scale(1.06)`, `perspective(900px) rotateX(10deg)`) and fades; `::view-transition-new(*.vt-letter) { animation: vt-letter-in .7s var(--ease-out) both; }` that reveals with `clip-path: inset(0 0 72% 0)` to `inset(0)` (the sheet unfolds downward) and fades in.
5. **Paper** (stack slides forward, the cover flips at the staple): old: `translateX(-24px) scale(1.04)` and `perspective(1000px) rotateY(-100deg)` with `transform-origin: 0 50%` (hinge at the staple edge) while fading out in the last 30%; new: fades in from `translateX(10px)`, delayed `.15s`.
6. **Sheet / unknown**: the default cross-fade only (no custom rule).
7. **Back:** the browser plays the same transition in reverse with the same names, so the piece returns to its place. Restoring *focus* is script, not CSS: on leaving, `writing-desk.ts` stores the slug in `sessionStorage['writing:last']` (try/catch) on `pagehide` and on link click. On `/writing` load, if `performance.getEntriesByType('navigation')[0].type === 'back_forward'` (or `pageshow` with `persisted`), focus `[data-slug=<last>] .piece-link` with `{ preventScroll: true }` and add `is-lit` so the light finds it; scroll it into view only if it is outside the viewport.
8. **Reduced motion:** `base.css` already sets `@view-transition { navigation: none }` under `prefers-reduced-motion: reduce`, so navigation is instant. Belt and braces in the new CSS file: under the same media query set `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }` and `view-transition-name: none` on the pieces.
9. **Phones:** the same transitions apply (the tap-once logic from Task 2 decides when navigation happens).
10. **Stability rules:** never set `view-transition-name` from JS (it would be missing at the first snapshot); it is inline `style` in the markup or in CSS, per piece. Keep `site-header` (existing) so the header does not animate. Do not put `view-transition-name` on elements with `overflow:hidden` ancestors that clip the snapshot incorrectly; verify visually.

- [ ] **Step 1: Failing tests**

`tests/e2e/writing-open.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const open = (page, slug) => page.locator(`[data-slug="${slug}"] .piece-link`);

test('opening a piece is a real navigation to its URL, and Back restores the desk with focus on that piece', async ({ page, isMobile }) => {
  await page.goto('/writing');
  if (isMobile) { await open(page, 'quiet-singularity').tap(); await open(page, 'quiet-singularity').tap(); }
  else await open(page, 'quiet-singularity').click();
  await expect(page).toHaveURL(/\/writing\/quiet-singularity\/?$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/writing\/?$/);
  await expect(open(page, 'quiet-singularity')).toBeFocused();
  await expect(page.locator('[data-slug="quiet-singularity"]')).toHaveClass(/is-lit/);
});

test('each piece and its essay head share a view-transition name, and the class tracks the kind', async ({ page }) => {
  await page.goto('/writing');
  const name = (slug) => page.locator(`[data-slug="${slug}"] .obj`).evaluate((e) => { const s = getComputedStyle(e) as any; return [s.viewTransitionName, s.viewTransitionClass]; });
  expect(await name('bigger-than-electricity')).toEqual(['piece-bigger-than-electricity', 'vt-letter']);
  expect(await name('quiet-singularity')).toEqual(['piece-quiet-singularity', 'vt-paper']);
  await page.goto('/writing/quiet-singularity');
  const [n, c] = await page.locator('.essay-head').evaluate((e) => { const s = getComputedStyle(e) as any; return [s.viewTransitionName, s.viewTransitionClass]; });
  expect([n, c]).toEqual(['piece-quiet-singularity', 'vt-paper']);
});

test('view-transition names are unique on each page (a duplicate would abort the transition)', async ({ page }) => {
  for (const path of ['/writing', '/writing/bigger-than-electricity']) {
    await page.goto(path);
    const names = await page.evaluate(() => [...document.querySelectorAll('*')].map((e) => (getComputedStyle(e) as any).viewTransitionName).filter((n) => n && n !== 'none'));
    expect(new Set(names).size, path).toBe(names.length);
  }
});

test('reduced motion: no view transition runs and navigation is instant', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing');
  const rules = await page.evaluate(() => getComputedStyle(document.querySelector('[data-slug="quiet-singularity"] .obj')!).viewTransitionName);
  expect(rules).toBe('none');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await expect(page).toHaveURL(/quiet-singularity/);
  await ctx.close();
});

test('the kind-specific rules exist in the stylesheet (letter and paper differ)', async ({ page }) => {
  await page.goto('/writing');
  const css = await page.evaluate(async () => (await Promise.all([...document.styleSheets].map(async (s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }))).join('\n'));
  expect(css).toMatch(/view-transition-old\(\*\.vt-letter\)/);
  expect(css).toMatch(/view-transition-old\(\*\.vt-paper\)/);
});

test('a direct visit to an essay (no desk behind it) works and Back leaves the site cleanly', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Quiet Singularity');
});

test('browser Back after a bfcache restore does not start a second light/dust loop', async ({ page }) => {
  await page.goto('/writing');
  await page.locator('[data-slug="quiet-singularity"] .piece-link').click();
  await page.goBack();
  await expect(page.locator('canvas.dust')).toHaveAttribute('data-dust', 'running');
  const loops = await page.evaluate(() => (window as any).__dustLoops ?? 1);
  expect(loops).toBe(1); // dust.ts increments window.__dustLoops on start and decrements on stop; assert it is exactly 1 while running
});
```

(For the last test, have `dust.ts` maintain `window.__dustLoops` only when `location.hostname === 'localhost'`-independent: simply keep the counter on a `data-loops` attribute of the canvas instead of a global, and assert `canvas.dataset.loops === '1'`. Use whichever is cleaner; the assertion that exactly one loop is alive after Back is the requirement.)

- [ ] **Step 2: RED**, **Step 3: implement** `writing-transitions.css` (imported by `index.astro` and `EssayLayout.astro`; it must be in both documents' CSS because each side needs the name and the class), the `Piece.astro` inline style `style={`view-transition-name: piece-${slug}; view-transition-class: vt-${shape}`}` on `.obj`, the `EssayLayout.astro` head attribute (new optional props `kind?: string`), and focus restore in `writing-desk.ts`.
- [ ] **Step 4: GREEN** — `npm test`; `npx playwright test tests/e2e/writing-open.spec.ts tests/e2e/writing-desk.spec.ts tests/e2e/writing-light.spec.ts tests/e2e/writing.spec.ts tests/e2e/seo.spec.ts tests/e2e/smoke.spec.ts --workers=4`. Run Lighthouse on `/writing` (see Task 3 Step 5; budget >= 95).

**Visual check** (transitions can't be seen in a still, so capture mid-transition frames with a throttled approach: in Chromium use `page.emulateMedia` default and record with `context` `recordVideo`, then extract frames; or temporarily slow animations with `document.getAnimations().forEach(a => { a.pause(); a.currentTime = X })` after `document.startViewTransition` is in flight. Document the method you used in the report):
- `twr6-open-letter-start.png`: the letter's old snapshot lifting, roughly 15% in.
- `twr6-open-letter-mid.png`: the sheet part-unfolded, roughly 50%.
- `twr6-open-paper-start.png`: the stack sliding forward.
- `twr6-open-paper-mid.png`: the cover turning at the staple edge (hinge on the left).
- `twr6-back-desk-1280.png`: after Back, the desk with the piece in place, focus ring on it, the pool on it.
- `twr6-open-reduced.png`: reduced-motion context, the essay page appears immediately (a single frame is enough; the check is that there is no intermediate state).

If the browser under test does not support cross-document view transitions, say so in the report, still deliver the still frames from Chromium, and state which engines were exercised.

- [ ] **Step 5: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat(writing): kind-specific view transitions and focus restore on Back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Essay-page touches (letter signature, paper two piles)

**Files:**
- Create: `src/components/writing/Signature.astro`, `src/scripts/signature.ts`, `src/lib/sections.ts`
- Modify: `src/components/Mark.astro` (props and signature variant), `src/scripts/mark.ts` (ignore the signature), `src/layouts/EssayLayout.astro` (render signature for letters, piles for papers, no generic bar for papers), `src/scripts/reading-progress.ts`, `src/styles/essay.css`, `src/pages/writing/[slug].astro`
- Test: `tests/unit/sections.test.ts`, `tests/e2e/writing-essay.spec.ts`; the existing `tests/e2e/mark.spec.ts` and `tests/e2e/writing.spec.ts` must stay green

**Interfaces:**
- Consumes: `EssayLayout` props (`kind` added in Task 6), `.essay-body`, `[data-reading-progress]`.
- Produces:
  - `src/lib/sections.ts`: `export function currentSection(tops: number[], viewportH: number, ratio?: number): number`. Returns the index of the last section whose top is above `viewportH * ratio` (default 0.5); returns `-1` when none has started (reader is still in the abstract or intro). Pure.
  - `reading-progress.ts` dispatches `CustomEvent('essay:section', { detail: { index: number, total: number, kind: string } })` on `document` whenever the current section changes. Task 8 listens to it for memory.
  - Markup: `<div class="piles" data-piles aria-hidden="true">` and `<p class="pile-label" role="status" aria-live="off">` (screen readers read the heading text, not the piles); signature `<svg class="mark-svg" data-signature>`.

**The signature (reuse the logo draw-on):**
- `Mark.astro` today has fixed ids (`mark-pen`) and a first-visit rule keyed on `html.mark-first`. Add props `{ maskId?: string; signature?: boolean; size?: number }` (defaults preserve the header exactly: `maskId='mark-pen'`, not signature, width 25.5). The mask id must be unique per instance (duplicate ids would let the header mask clip the signature or vice versa), so the signature passes `maskId="sig-pen"` and the markup uses `mask="url(#{maskId})"`.
- Guard every `html.mark-first` rule in the component's `<style>` with `:not([data-signature])` so the signature never auto-plays on page load, and `mark.ts` selects `.mark-svg:not([data-signature])`. Re-run `mark.spec.ts`.
- Initial (hidden) state for the signature, applied only under `html.js` and `prefers-reduced-motion: no-preference`: pens at `stroke-dashoffset:108`, rule at `100`, stop at `scale(0)`. Without JS, or under reduced motion, it shows fully drawn (final frame).
- `signature.ts`: an `IntersectionObserver` (threshold `.9`, once) adds `is-playing` to the signature; the existing keyframes (`mk-draw`, `mk-rule`, `mk-pop`) already run on `.mark-svg.is-playing`. Size 3x the header mark (about 76 x 72), `color: var(--text)`, with the amber full stop untouched. It is a letter-only element; papers and unknown kinds get none.
- Accessible name: `role="img" aria-label="ag."` on the wrapper; the inner `<svg>` stays `aria-hidden`.

**Two piles (paper):**
- `currentSection(tops, viewportH)` with `tops` = `getBoundingClientRect().top` of each `.essay-body h2` (the paper's sections are the `## I. ...` headings; the count comes from the DOM, not from `breakdown`, so a mismatch cannot break it).
- The unread pile holds `total` sheets; sheets with index `< current` move to the read pile (class `moved`), with the prototype's geometry (34 x 44 sheets, 2.6px stacking, slight rotation in the read pile). The label reads `Section III of VI` (Roman numeral from the heading text if it matches `^[IVX]+\.`, else the number).
- `reading-progress.ts`: build `tops` once per resize and read rects on rAF-throttled scroll (the existing pattern). If `[data-piles]` exists, update the piles; **otherwise** keep updating the bar exactly as today. The generic bar (`[data-reading-progress]`) is not rendered at all for `kind === 'paper'` (the spec: "replaces the generic progress bar on papers only"); letters and unknown kinds keep the bar. No-JS: piles are hidden (they are decoration); the page reads normally.
- Reduced motion: piles update without transitions (the global rule handles it) and no animation loops.
- Position: fixed bottom-right on desktop; on phones centered above the safe area, 52px from the bottom, never covering the footer links (add `padding-bottom` to `.essay` equal to the pile height).

- [ ] **Step 1: Failing tests**

`tests/unit/sections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { currentSection } from '../../src/lib/sections';

describe('currentSection', () => {
  it('is -1 before the first section starts', () => expect(currentSection([600, 1400], 800)).toBe(-1));
  it('picks the last section whose top is above the midpoint', () => {
    expect(currentSection([-900, 300, 1100], 800)).toBe(1);
    expect(currentSection([-900, -300, 100], 800)).toBe(2);
  });
  it('is -1 for no sections and never NaN', () => {
    expect(currentSection([], 800)).toBe(-1);
    expect(currentSection([Number.NaN], 800)).toBe(-1);
  });
  it('honours a custom ratio', () => expect(currentSection([200], 800, 0.2)).toBe(-1));
});
```

`tests/e2e/writing-essay.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('a letter ends with the ag. signature, drawn once when it scrolls into view', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const sig = page.locator('svg[data-signature]');
  await expect(sig).toHaveCount(1);
  await expect(sig).not.toHaveClass(/is-playing/);
  await sig.scrollIntoViewIfNeeded();
  await expect(sig).toHaveClass(/is-playing/);
  // the logo draw-on is reused: same keyframes as the header mark
  expect(await sig.locator('.pen-a').evaluate((e) => getComputedStyle(e).animationName)).toBe('mk-draw');
});

test('only letters get a signature; papers do not', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('svg[data-signature]')).toHaveCount(0);
});

test('the header mark and the signature have different mask ids and the header still plays', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  const ids = await page.locator('svg.mark-svg mask').evaluateAll((m) => m.map((e) => e.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(2);
});

test('signature is fully drawn without JS and under reduced motion', async ({ browser }) => {
  for (const opts of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' as const }]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto('/writing/bigger-than-electricity');
    const off = await page.locator('svg[data-signature] .pen-a').evaluate((e) => getComputedStyle(e).strokeDashoffset);
    expect(parseFloat(off)).toBe(0);
    await ctx.close();
  }
});

test('a paper shows two piles, not the generic bar, and sheets move as sections pass', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('[data-reading-progress]')).toHaveCount(0);
  const piles = page.locator('[data-piles]');
  await expect(piles).toHaveCount(1);
  await expect(piles).toHaveAttribute('aria-hidden', 'true');
  const total = await piles.locator('.pile-sh').count();
  expect(total).toBe(await page.locator('.essay-body h2').count());
  const moved = () => piles.locator('.pile-sh.moved').count();
  expect(await moved()).toBe(0);
  const third = page.locator('.essay-body h2').nth(2);
  await third.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(moved).toBe(2); // sections I and II are behind us
  await expect(page.locator('.pile-label')).toContainText(/Section III of VI/);
  await page.locator('.essay-body h2').last().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(moved).toBe(total - 1);
});

test('a letter keeps the generic bar and has no piles', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.locator('[data-reading-progress]')).toHaveCount(1);
  await expect(page.locator('[data-piles]')).toHaveCount(0);
});

test('the piles never cover the footer links on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/writing/quiet-singularity');
  await page.getByRole('link', { name: /All writing/ }).scrollIntoViewIfNeeded();
  const link = await page.getByRole('link', { name: /All writing/ }).boundingBox();
  const pile = await page.locator('[data-piles]').boundingBox();
  expect(link!.y + link!.height <= pile!.y || link!.y >= pile!.y + pile!.height).toBe(true);
});
```

Existing `writing.spec.ts` "essay page renders the full letter with reading progress" stays; `mark.spec.ts` stays green.

- [ ] **Step 2: RED**, **Step 3: implement**, **Step 4: GREEN**: `npm test`; `npx playwright test tests/e2e/writing-essay.spec.ts tests/e2e/mark.spec.ts tests/e2e/writing.spec.ts tests/e2e/print.spec.ts tests/e2e/a11y.spec.ts --workers=4`. `print.spec.ts` matters: add `.piles` to the print-hidden selector list in `essay.css` (`@media print { ... .progress, .piles { display:none } }`).

**Visual check:**
- `twr7-letter-signature-end-1280.png`: end of a letter, the "ag." signature mid-draw or complete with its amber full stop, sitting under the closing line with comfortable space.
- `twr7-letter-signature-mid.png`: pause the animation at roughly 50% (`document.getAnimations()` with `currentTime`), showing the pen strokes partway.
- `twr7-paper-piles-start-1280.png`: top of the paper, all six sheets in the unread pile, read pile empty, label "Section I of VI" (or none before the first heading).
- `twr7-paper-piles-iii-1280.png`: at section III, two sheets in the read pile.
- `twr7-paper-piles-375.png`: phone, piles centered, clear of the content and the footer.

- [ ] **Step 5: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat(writing): letter signature reusing the logo draw-on, paper two-pile progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The room remembers you, the home teaser, and release verification

**Files:**
- Create: `src/lib/writing-memory.ts`, `src/scripts/writing-memory-client.ts`
- Modify: `src/pages/writing/index.astro` ("forget" control, ribbons), `src/components/writing/Piece.astro` (ribbon element), `src/layouts/EssayLayout.astro` ("Pick up where you left off" slot), `src/scripts/reading-progress.ts` / `src/scripts/signature.ts` (record the section), `src/components/home/WritingTeaser.astro` (ribbon + link hook), `src/styles/writing-room.css`, `src/styles/essay.css`, project `CLAUDE.md` (`aaryush/` has none today; edit the repo root `CLAUDE.md` only by adding a short "Writing room" section, and flag in the report that the root file is otherwise stale per the user's rule), `../docs/redesign/copy-review.md` (confirm §16 lists the new visible labels), `tests/e2e/layout.spec.ts` (add `/writing` widths if missing)
- Test: `tests/unit/writing-memory.test.ts`, `tests/e2e/writing-memory.spec.ts`, extend `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `essay:section` events (Task 7), the `last` slug logic from Task 6 (migrate that `sessionStorage` key into `writing:v1.last`; keep `sessionStorage` as the fallback if `localStorage` throws, so focus-on-Back still works in a private window), `PieceView`.
- Produces `src/lib/writing-memory.ts` (pure over an injected `Storage`-like, so it is unit-testable):
  - `export const KEY = 'writing:v1'`
  - `export interface Memory { v: 1; pieces: Record<string, { sec: number; t: number }>; last?: string }`
  - `export function readMemory(store?: Pick<Storage,'getItem'>): Memory` (never throws; invalid input gives `{ v: 1, pieces: {} }`)
  - `export function noteSection(slug: string, sec: number, total: number, store?, now?: number): void` (keeps the **furthest** section; clamps to `[0, total - 1]`; ignores non-finite)
  - `export function noteOpened(slug: string, store?, now?: number): void`
  - `export function forget(store?): void`
  - `export function pickup(slug: string, total: number, store?): { sec: number } | null` (null when never read past the start, or when `sec` is outside `[1, total - 1]` for a stale/corrupt value)

Behaviour:
- **Opened piece:** on `/writing`, a piece with a memory entry gets class `seen`: translated slightly out of place (`--pull-x: 12px; --pull-y: 16px`, ported from the prototype) and a thin amber ribbon (`<i class="ribbon">` inside `.obj`, amber `--accent`; ribbon position on the paper tracks `sec`, on the letter it sits at the fold reached). Amber is used for this small mark only.
- **Essay page:** records the furthest section via `essay:section` (papers) and, for letters, the fold index derived from scroll fraction (see Open Question 3). Records "opened" on load. If `pickup()` returns a section, render a link `Pick up where you left off` (plus " — section III" on papers) above the body. Activating it scrolls to that section's `h2` (papers) or scroll fraction (letters), `behavior: 'auto'` under reduced motion else `'smooth'`, and moves focus to the heading (`tabindex=-1`).
- **Forget:** a small, quiet `<button class="forget">forget</button>` at the bottom corner of `/writing`. Click clears `writing:v1` and the `seen` state live. `aria-label="Forget what this room remembers"`. It only appears when there is something to forget (hidden otherwise) and never under no-JS.
- **Storage throws:** every read/write is inside try/catch inside `writing-memory.ts`; with a throwing store nothing is remembered and nothing errors.
- **Teaser (E8):** each row in `WritingTeaser.astro` gets `data-slug`; `writing-memory-client.ts` (imported on the home page) adds the same ribbon to a row with partial progress and a `Pick up where you left off` link to `/writing/<slug>#pickup` (the essay page then jumps; a fragment avoids needing JS on the home page beyond reading storage). Rows with no memory, or with the final section reached (`sec >= total - 1`), get nothing. The ribbon uses the same `--accent` rule line as the `/writing` ribbon.
- **Home must not regress:** no layout shift when the ribbon appears (reserve its space with a transparent left border).

- [ ] **Step 1: Failing unit tests**

`tests/unit/writing-memory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { forget, noteOpened, noteSection, pickup, readMemory } from '../../src/lib/writing-memory';

const fake = (initial?: string) => {
  let v: string | null = initial ?? null;
  return { getItem: () => v, setItem: (_: string, x: string) => { v = x; }, removeItem: () => { v = null; }, raw: () => v } as any;
};
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } } as any;

describe('writing memory', () => {
  it('keeps the furthest section, never moves backwards', () => {
    const s = fake();
    noteSection('p', 3, 6, s, 1); noteSection('p', 1, 6, s, 2);
    expect(readMemory(s).pieces.p.sec).toBe(3);
  });
  it('clamps a section beyond the piece and ignores non-finite values', () => {
    const s = fake();
    noteSection('p', 99, 6, s, 1); expect(readMemory(s).pieces.p.sec).toBe(5);
    noteSection('q', Number.NaN, 6, s, 1); expect(readMemory(s).pieces.q).toBeUndefined();
  });
  it('treats corrupt, foreign or wrong-shape values as empty', () => {
    for (const bad of ['not json', '[]', '{"v":2}', '{"v":1,"pieces":"x"}', 'null', '{"v":1,"pieces":{"p":{"sec":"3"}}}'])
      expect(readMemory(fake(bad)).pieces).toEqual({});
  });
  it('never throws when storage throws', () => {
    expect(() => { noteOpened('p', throwing); noteSection('p', 2, 6, throwing); forget(throwing); }).not.toThrow();
    expect(readMemory(throwing).pieces).toEqual({});
  });
  it('forget clears everything', () => {
    const s = fake(); noteOpened('p', s); noteSection('p', 2, 6, s); forget(s);
    expect(readMemory(s).pieces).toEqual({});
  });
  it('pickup offers a section only when it is past the start and inside the piece', () => {
    const s = fake(); noteSection('p', 2, 6, s);
    expect(pickup('p', 6, s)).toEqual({ sec: 2 });
    expect(pickup('p', 2, s)).toBeNull();   // stale: piece now has fewer sections
    expect(pickup('unread', 6, s)).toBeNull();
    noteSection('z', 0, 6, s); expect(pickup('z', 6, s)).toBeNull(); // opened but never past the start
  });
  it('records the last opened piece', () => {
    const s = fake(); noteOpened('a', s); noteOpened('b', s);
    expect(readMemory(s).last).toBe('b');
  });
});
```

- [ ] **Step 2: Failing e2e**

`tests/e2e/writing-memory.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const reach = async (page, n: number) => {
  await page.locator('.essay-body h2').nth(n).evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(250);
};

test('read a paper to III, return: it is pulled out with a ribbon and its page offers to pick up at III', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await page.goto('/writing');
  const p = page.locator('[data-slug="quiet-singularity"]');
  await expect(p).toHaveClass(/seen/);
  await expect(p.locator('.ribbon')).toBeVisible();
  const color = await p.locator('.ribbon').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(color).toBe('rgb(242, 181, 68)'); // --accent
  await page.goto('/writing/quiet-singularity');
  const link = page.getByRole('link', { name: /Pick up where you left off/ });
  await expect(link).toContainText(/III/);
  await link.click();
  await expect.poll(() => page.locator('.essay-body h2').nth(2).evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(300);
});

test('storage has the documented shape under writing:v1', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 1);
  const raw = await page.evaluate(() => localStorage.getItem('writing:v1'));
  const m = JSON.parse(raw!);
  expect(m.v).toBe(1);
  expect(m.pieces['quiet-singularity'].sec).toBe(1);
  expect(m.last).toBe('quiet-singularity');
});

test('forget clears everything and the ribbon goes', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await page.goto('/writing');
  await page.getByRole('button', { name: /forget what this room remembers/i }).click();
  await expect(page.locator('[data-slug="quiet-singularity"]')).not.toHaveClass(/seen/);
  expect(await page.evaluate(() => localStorage.getItem('writing:v1'))).toBeNull();
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
});

test('the forget control is absent when there is nothing to forget', async ({ page }) => {
  await page.goto('/writing');
  await expect(page.getByRole('button', { name: /forget/i })).toHaveCount(0);
});

test('storage that throws never breaks the room or the essay', async ({ page }) => {
  await page.addInitScript(() => {
    const boom = () => { throw new Error('blocked'); };
    Object.defineProperty(window, 'localStorage', { get: boom });
    Object.defineProperty(window, 'sessionStorage', { get: boom });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/writing');
  await expect(page.locator('[data-piece]')).toHaveCount(2);
  await page.goto('/writing/quiet-singularity');
  await reach(page, 2);
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('corrupt storage is ignored', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('writing:v1', '{"v":1,"pieces":{"quiet-singularity":{"sec":99,"t":1}}}'));
  await page.goto('/writing');
  // sec 99 is beyond the piece's sections: no ribbon pointing at a section that does not exist
  await expect(page.locator('[data-slug="quiet-singularity"]')).not.toHaveClass(/seen/);
});

test('a letter that was read to the end is not offered "pick up", but is pulled out', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await page.locator('svg[data-signature]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.goto('/writing');
  await expect(page.locator('[data-slug="bigger-than-electricity"]')).toHaveClass(/seen/);
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
});

test('reduced motion: the ribbon and pulled-out state show with no transition', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/writing/quiet-singularity');
  await page.locator('.essay-body h2').nth(2).evaluate((e) => e.scrollIntoView());
  await page.waitForTimeout(250);
  await page.goto('/writing');
  await expect(page.locator('[data-slug="quiet-singularity"]')).toHaveClass(/seen/);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await ctx.close();
});
```

`tests/e2e/home.spec.ts` additions:

```ts
test('E8: the home writing teaser shows a ribbon and a pick-up link for a piece you are partway through', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('writing:v1', JSON.stringify({ v: 1, pieces: { 'quiet-singularity': { sec: 2, t: 1 } }, last: 'quiet-singularity' })));
  await page.goto('/');
  const row = page.locator('#writing a.post[href="/writing/quiet-singularity"]');
  await expect(row.locator('.ribbon')).toBeVisible();
  await expect(page.locator('#writing').getByRole('link', { name: /Pick up where you left off/ })).toHaveAttribute('href', '/writing/quiet-singularity#pickup');
});

test('E8: no ribbon on the home teaser when nothing is remembered, and no layout shift', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#writing .ribbon')).toHaveCount(0);
  await expect(page.locator('#writing').getByRole('link', { name: /Pick up where you left off/ })).toHaveCount(0);
});
```

- [ ] **Step 3: RED** — `npm test -- writing-memory` and `npx playwright test tests/e2e/writing-memory.spec.ts tests/e2e/home.spec.ts --workers=4 --project=chromium` → FAIL.
- [ ] **Step 4: Implement** `writing-memory.ts` (pure, injectable store, strict shape validation: `v === 1`, `pieces` is a plain object, each entry `{ sec: finite integer >= 0, t: finite number }`; otherwise treat the whole value as empty), the client script, the ribbon, the pick-up link (`id="pickup"` on its container so `#pickup` works), the forget control, and the teaser hooks. Update the repo root `CLAUDE.md` with a short **Writing room** section: pieces carry `why` and `breakdown`; **we co-write both with Aaryush whenever a piece is added** (draft copy goes into `copy-review.md` §16 first); unknown kinds fall back to a plain sheet and get a bespoke object when the first one is published; the drawer in `site.ts` shows kind and length only.
- [ ] **Step 5: GREEN** — `npm test`; then the **full** suite once, alone: `npx playwright test --workers=4`. Triage failures against the known-flaky list; re-run any known-flaky failure once; anything else is real.

**Release verification (run in this task, after the suite is green; stop any server you started first):**

1. `npm run build && npm run preview -- --port 4322` in the background, then:
   - `npx lighthouse http://localhost:4322/writing --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lh-writing.json --chrome-flags="--headless"`
   - Expected: performance >= 95 and accessibility 100. Report all four scores and LCP/CLS/TBT. If performance < 95, fix before committing (candidates: cap dust motes and canvas DPR, drop blur radii on `.pool`, `content-visibility:auto` on the drawer, `loading`/`fetchpriority` untouched since there are no images).
   - Stop the preview server: `Get-NetTCPConnection -LocalPort 4322 -State Listen | % { Stop-Process -Id $_.OwningProcess }` (PowerShell).
2. Axe on `/writing` and `/writing/*` is already in `a11y.spec.ts`; confirm it ran and passed in chromium and webkit. Spot-check contrast by hand for the faint states (letter first phrase at rest, pencil `why` at rest, redacted paper label, `forget`): each readable label must be >= 4.5:1 (or 3:1 if large text) on its darkest surface; amber only on the full stop, ribbons and one accent line. If the pencil-faint `why` fails AA, raise its resting color rather than hiding it (it must stay visible without hover).
3. `tests/e2e/layout.spec.ts` covers `/writing` and an essay at 320, 375, 768 and 1280 (add them if missing).
4. Confidentiality: `npm test` includes `confidentiality.test.ts`; additionally `grep -R "mailto:\|tel:" dist/writing` should find nothing, and `grep -R "aaryush@outlook" dist` should find nothing outside the allowed legacy places (there are none expected).
5. The release gate `npm run test:release` is **expected to fail** while `site.drafts.writingRoom` is `true` (copy not yet approved). Report that as the intended state, not a bug.

**Visual check:**
- `twr8-remember-writing-1280.png`: `/writing` after reading the paper to section III: the paper sits slightly pulled out of place with a thin amber ribbon; the quiet "forget" control visible in a corner.
- `twr8-remember-pickup-1280.png`: the paper's essay page with the "Pick up where you left off — section III" link above the body.
- `twr8-remember-home-teaser-1280.png`: the home page writing teaser with the ribbon and the pick-up link on the paper's row; no layout shift against the no-memory screenshot.
- `twr8-remember-home-teaser-375.png`: same on a phone.
- `twr8-final-night-1280.png`: the finished room at night with the note, a hovered piece and the drawer ajar, as the composite check of the whole feature (screenshots from Tasks 2 to 5 should still hold).
- `twr8-final-day-375.png`: the finished room on a phone by day.

- [ ] **Step 6: Commit**

```bash
git add aaryush/src aaryush/tests CLAUDE.md docs/redesign/copy-review.md
git commit -m "feat(writing): the room remembers you, home teaser ribbon, release checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review against the spec

| Spec | Where |
|---|---|
| W1 objects by kind, unknown kind = sheet | Tasks 1, 2 (`knownKind`, `ObjectSheet`, container-API test) |
| W1 composition, deterministic, 2 to ~15 | Task 2 `layoutDesk` + unit tests for n up to 15 |
| W1 grain never on objects, no mug, no lamp | Task 2 computed-style test; Task 3 pixel test |
| W1 light pool, hover does more, dust only in the pool and pausing | Tasks 2 and 3 |
| W1 breakdown (letter first phrase at rest, paper fan with gist <= 5 words) | Tasks 1 (content test), 2 |
| W1 `why` always visible, ink on light, co-write workflow in CLAUDE.md | Tasks 2, 3, 8 |
| W1 meta (kind, reading time at 230 wpm rounded) | Task 1 |
| W2 periods, softer afternoon, night note (script-inserted, absent by day), `data-daypart` hook | Tasks 3, 4 |
| W3 drawer, contextOS, redacted kind/length, never titles | Task 5 |
| W4 letter unfold + signature, paper slide/flip + two piles, Back, reduced motion | Tasks 6, 7 |
| W5 `writing:v1`, ribbon, furthest section, pick up, forget, E8 teaser | Task 8 |
| W6 phones, no-JS list, a11y (link name, real list, aria-hidden, focus order), contrast | Tasks 1, 2, 4, 8 |
| Acceptance 1 to 11 | 1: Task 2; 2: Tasks 2, 3; 3: Task 4; 4: Task 6; 5: Task 7; 6: Task 8; 7: Task 1; 8: Tasks 3, 4, 6, 7, 8; 9: Tasks 1, 2; 10: Tasks 3, 6, 8; 11: Tasks 1, 8 |

Names checked across tasks: `layoutDesk`, `nominalSize`, `Placement` (Task 2); `currentDaypart`, `roomLight`, `aimAt`, `aimRest`, `aimPoint`, `onMove` (Task 3, used in 4 and 5); `currentSection`, `essay:section` (Task 7, used in 8); `readMemory`, `noteSection`, `noteOpened`, `forget`, `pickup` (Task 8 only); `.is-lit`, `.is-open`, `.seen`, `.ribbon`, `.piece-link`, `.breakdown`, `[data-piece]`, `[data-slug]`, `canvas.dust[data-dust]` (consistent across tasks).

## Open questions (the spec leaves these ambiguous; not answered here)

1. **Relaxing the `kind` schema.** Acceptance 9 needs an unknown kind to reach the desk, so this plan changes `kind` from `z.enum(['letter','paper'])` to `z.string()`. That also means a typo ("leter") now builds silently as a plain sheet instead of failing the build. Keep the loosening, or keep the enum and test unknown kinds only at unit level?
2. **Does the letter's "furthest section" exist?** The spec's progress memory is by section, but a letter has no section headings: its breakdown phrases are folds, not anchors in the text. The spec doesn't say how a letter's progress maps to them.
3. **What "Pick up where you left off" does on a letter.** This plan derives a fold index from scroll fraction and scrolls to that fraction. The alternative is no pick-up for letters, only the ribbon. Which one?
4. **When a piece counts as finished.** The spec doesn't say whether reaching the last section removes the ribbon or the pick-up offer. This plan hides the pick-up (and the home-teaser ribbon) at the last section but leaves the "pulled out" state on `/writing`. Needs a decision.
5. **Breakdown count versus section count on papers.** The pile count comes from the essay's headings, the fan from `breakdown`. If they differ, which wins visually? Plan assumes they match and doesn't validate it.
6. **Unknown-kind transitions.** The spec fixes letter and paper only. The plan uses the default cross-fade for any other kind, which is a decision for Aaryush rather than something the spec states.
7. **Transitions on browsers without cross-document view transitions** (currently Firefox). The plan degrades to an instant navigation. Is that acceptable, or should a JS fallback animate?
8. **The drawer's contextOS folder.** The spec says "a folder labelled contextOS", with no link or content. The plan makes it decorative. Should it ever open, or link to the home page's "Next" block?
9. **Cross-page "Back" focus when storage is blocked.** The plan falls back to `sessionStorage`, then to nothing. The spec only says "Back restores the desk with focus on that piece"; no stated behaviour when both stores are blocked.
10. **Draft drawer entries.** The two `site.drawer` entries (essay ~2,000 words, letter ~800 words) come from the prototype. Whether those reflect real drafts is Aaryush's call.
11. **Where the generic progress bar goes for unknown kinds.** The plan keeps it (only papers lose it). The spec says "papers only", so this follows it literally, but it's untested against a real third kind.
12. **Lighthouse "100 accessibility" with the faint states.** The spec asks for AA on every readable label while also asking for a faint pencil `why` and a faint first phrase. If both can't hold at once, the plan raises the resting contrast; the spec doesn't say which wins.

## Controller rulings on open questions (2026-10-14)

1. Keep `kind` strict, with `z.enum(['letter','paper','essay','talk'])`, so a typo fails the build. Essay and talk render as the plain sheet until each is designed. Acceptance criterion 9 (unknown kind → plain sheet) is tested at the component level by passing an unrecognised kind to the desk renderer directly.
2. A letter's "furthest section" is the fold index derived from scroll fraction across its `breakdown` length. Accepted as the plan describes.
3. "Pick up" on a letter scrolls to the stored fraction, with the same affordance as papers.
4. Reaching the final section clears the pick-up offer and the home teaser ribbon. The piece keeps a subtle pulled-out look, which reads as "you've been here".
5. On papers, the fan is driven by `breakdown` and the piles by the real `##` headings on the essay page. They're allowed to differ.
6. Unknown kinds use the default cross-fade. Accepted.
7. Firefox navigates instantly, with no cross-document view transitions. Accepted. It's progressive enhancement.
8. The contextOS folder is decorative and doesn't open or link anywhere. Confirmed by Aaryush, 2026-10-14.
9. If both storages are blocked, Back doesn't restore focus to the piece, and the browser default applies. Accepted.
10. The drawer holds ONLY the contextOS folder. Aaryush confirmed this on 2026-10-14: there are no draft entries, so `site.drawer` is empty and the redacted-draft rendering stays in place for future use.
11. Papers swap the progress bar for the piles. Letters and other kinds keep the bar.
12. AA wins. The faint states are faint relative to the inked state, but still pass AA at rest.
