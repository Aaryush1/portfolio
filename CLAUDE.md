# aaryush.com

Aaryush Gupta's personal site. It helps people understand who he is as a builder and want to talk to him because he's interesting, not to hire him. There's no selling, no testimonials and no "hire me".

The app lives in `aaryush/` (Astro 5, static, deployed on Vercel). It has one tiny server function, `aaryush/api/sky.ts` (the hero sky's approximate position from Vercel's IP headers; see `decisions.md`).

## Who visits, and on what

- **Most visitors arrive on a phone,** by scanning Aaryush's QR code in person. Design, review and test for phones first: 430 (iPhone 16 Pro Max), 412 and 360 (Galaxy S20), and 375. Desktop matters, but second.
- **The QR moment:** the person saves his contact, puts the phone away, and opens the site later.
- **Investors and founders read the site too.** The companies lead, and the advisory practice (Gupta Advisory) stays a quiet single line.

## How we work together

This is the working style that built the redesign (October 2026). Keep it.

- **Interview, don't assume.** Ask about intent before building anything with content or taste in it. Group related questions in one message, offer concrete options, and say which one you'd pick and why.
- **Bring your own ideas.** Aaryush wants Claude's taste. Every option list should include at least one original idea, not just variations on his. Several of the site's best details came from Claude: the room that remembers you, the shared-letter morph in the hero, the stepped index cards.
- **Show, don't describe.** For anything visual, build a throwaway comparison page in `C:\Users\aaryu\code\personal\portfolio-explorations\` (served on port 4400; see `.claude/launch.json` in the parent folder) and let him react. Throwaway work never goes in the app.
- **The queue is visible.** Keep `portfolio-explorations/queue.md` current: what's building, what's next in order, what's waiting on him, and what's parked. It's rendered live at `localhost:4400/queue.html`, so keep that open in a Browser pane tab. Update it whenever work starts, finishes or gets reordered.
- **Copy is his.** Never ship new wording as final. Draft it, mark it as a draft (`site.drafts.*`, or `draft: true` in content), list it in `docs/redesign/copy-review.md`, and flip it only after he approves it. When he approves something, record the date in the copy review.
- **The bar is "it works".** This site gets a few visitors a week, so keep testing proportionate.
  - **Per change:** run only the specs you changed, in Chromium, plus `npm test` and `npm run check`.
  - **Before a release:** run the full four-browser suite once and patch whatever it finds.
  - Don't chase flaky tests past one re-run. Don't leave Playwright or preview servers running; the machine is shared.
- **Subagents and reviews.**
  - **Haiku** implements mechanical, well-specified tasks.
  - **Sonnet** implements anything that needs judgement, debugging or visual taste, and does all reviews.
  - Small visual fixes get a controller check, meaning a screenshot plus a read of the diff. Features get a reviewer.
  - Parallel builders either use separate ports (`PW_PORT=4323`, `4324`; `playwright.config.ts` reads it) or separate worktrees.
  - Builders never use `git stash` and stage only their own paths.
  - For a worktree, link `node_modules` with a junction, and remove the junction before removing the worktree.
- **Docs travel with changes.** When content or structure changes, update in the same change:
  - the spec it belongs to (`docs/redesign/*.md`);
  - the copy review;
  - the easter-egg register (`docs/easter-eggs.md`);
  - the revision block (`src/data/revisions.ts`), for anything meaningful that ships;
  - the link-preview cards (`src/lib/og.ts`), if a page's title, kind or structure changes.

## Writing a new piece (letters, papers, notes, and kinds to come)

Pieces live in `aaryush/src/content/writing/`. When one is added:

1. Aaryush writes it, possibly elsewhere first. Claude helps when asked.
2. Pick its **kind**. Each kind is a physical object on the /writing desk:
   - `letter` is a folded sheet;
   - `paper` is a stapled stack;
   - `note` is a clipped stack of index cards with stepped edges when closed (each card wider than the one in front), a fan from the clip when open, and quiet section marks when reading (the top edge of a card, widening 58%, 70%, 84%, 100% of the text column). "Once, for Good" is the first.

   The desk's "where you left off" memory is a mark per kind, replacing the old ribbon: a sticky flag on a paper, a faint amber thumbprint on a letter's fold, and a pulled-out card on a note. The home teaser keeps its dot and ribbon.

   A new kind gets its own object, designed together when the first one arrives. Until then it renders as a plain sheet.
3. Write the **breakdown** together: 3–6 entries with a `label` and an optional `gist` of 5 words or fewer. It's what the object shows when it opens:
   - a letter's folds;
   - a paper's sections;
   - a note's cards.
4. Write the **"why I wrote this"** line together: one line in his voice, handwritten on the object. This is a co-writing step every time; don't draft it alone and ship it.
5. Reading time is computed from the word count. Don't hand-write it.
6. Every piece ends with the "ag." signature, which draws itself. A paper's references go in `<div class="references">`, so they aren't counted as a section and the signature lands before them.
7. Update the copy review, and check the piece's link-preview card.

## Easter eggs

They're **shown, never explained**. Nothing on the site hints at them, labels them or explains them. `docs/easter-eggs.md` lists every one. Add a row (and a spec section) for each new one.

## Voice and content rules

- **Never show on the site** the Ready Rebound engineering tool's name, the Ready Rebound city product, or any city. Repo docs may mention them; the site must not. The confidentiality test in `tests/unit/` scans the site source.
- **No buzzwords:** leverage, unlock, transform, seamless, paradigm shift.
- **No metrics,** except people ratios like "two people now ship what four did" and facts he's given ("under 500ms a turn").
- **Real titles are reframed:** "Lead AI Engineer" appears as "AI Lead" and "AI & Engineering Lead". Gupta Advisory's role is "Founder".
- **Dates:** Skale.win ended Feb 2026. The resume has been the standard for *centuries*.

## Design system (short)

- **Dark only.**
  - **Palette:** `--bg #0A0B0E`; text `#E6E7EA`, `#A0A4AE` and `#8B909C`; one amber accent `#F2B544`, used sparingly. All tokens live in `src/styles/tokens.css`.
  - **Fonts** (self-hosted woff2 in `public/fonts/`, `src/styles/fonts.css`, latin subset, about 98 KB in total): **Spectral** (`--serif`) for headings, the hero lines, writing titles and the italic emphasis words; **Karla** (`--font`) for body text, UI and buttons; **Spectral SC** (`--label`, small caps) for every drawing label, readout and meta line, always with lining and tabular figures. Mono (`--mono`) is only for literal code, the commit hash. Use real small caps: write labels in sentence case and do not add `text-transform:uppercase`. Only Karla 400/500 and Spectral 400 exist, so never ask for weight 600+ (it would be faux bold). OG cards read woff copies from `src/assets/og-fonts/` (Satori cannot read woff2). Essay body is Karla.
- **Homepage language: engineering drawings.**
  - **Section strips:** "§ NN … Sheet NN / 05".
  - **The hero title block:** Dwg. no., Sheet, Region us-central, Last deploy (stamped at build), Scale NTS.
  - **Background:** the live star chart of the visitor's own sky (E17): real stars, planets, Moon, Sun and Milky Way, running fast and following the visitor's local time. Easter eggs `L` and `[` `]`. The ~360 brightest stars are baked in `src/data/sky/` for an instant first paint; the rest of the catalogue is fetched from jsDelivr in the background and twinkles in (the one outside request).
  - **Hero:** a shared-letter morph.
- **Writing language: a warm, dim room.** The /writing page and essay pages do **not** use the drawing language. They have objects on a desk, a pool of light, dust, and the visitor's clock (9pm–7am is night).
- **Motion:** warm, slow and never bouncy. Resting objects are 2D, so text stays crisp, and 3D only appears during interaction. With `prefers-reduced-motion`, everything shows its final frame. Nothing animates when it isn't on screen.
- **Scraper protection (intentional):** the email address and phone number never appear in served HTML or JS literals. They're stored as reversed parts and assembled at runtime (`src/scripts/obf.ts`, `site.ts`). Leak tests enforce this.

## Code map

- **`src/data/`:** content that isn't in collections.
  - `site.ts`: hero, footer, contact parts, drafts, the drawer.
  - `diagrams.ts`: system diagram specs.
  - `levels.ts`
  - `console.ts`: the DevTools note.
  - `revisions.ts`
- **`src/content/`:** companies, systems and writing (Astro collections; schema in `content.config.ts`). Quote any frontmatter value that contains a comma.
- **`src/lib/`:** pure, tested logic: timeline, diagram, daypart, sky (astronomy, place, geometry), morph timing, keymap, vcard, meet, writing layout and memory, OG cards, rehype plugins.
- **`src/scripts/`:** client behaviour, one concern per file: hero-rotator and morph, hero-sky (and `sky/engine.ts`, loaded lazily), lens, popups, writing-desk, light-pool, dust, walk-in, keymap, contact-card, and so on.
- **`src/components/`:**
  - `home/`: Hero, Levels, Timeline, TitleBlock, WritingTeaser, PrintSheet.
  - `popup/`
  - `writing/`: objects, Drawer, Signature.
- **Pages:** `/`, `/work/<slug>` (the pop-up content as standalone pages), `/writing`, `/writing/<slug>`, `/qr` (Aaryush's contact-card tool), `/og/...png`, `404`.

## Commands

Run these from `aaryush/`:

- `npm run dev`: dev server on port 4321.
- `npm run build` / `npm run preview`
- `npm test`: unit tests (Vitest).
- `npm run check`: types. It must report 0 errors.
- `npx playwright test tests/e2e/<spec> --project=chromium`: one e2e spec. The full suite runs only before a release.
- `npm run test:release`: the release gate. It fails while any copy is still a draft.

**Windows quirk:** `~/.npmrc` contains `os=linux`. Install with `npm_config_os=win32 npm install …`, and never edit `~/.npmrc`.

## Where things are written down

- **Specs:**
  - `docs/redesign/prd.md`: the redesign.
  - `prd-addendum-extras.md`: E1–E19, the details and easter eggs.
  - `prd-writing-room.md`
- **Plans:** `docs/redesign/plan.md` and `plan-writing-room.md`.
- **Copy:** `docs/redesign/copy-review.md`, with every approval dated.
- **Decisions and reasoning:** `docs/redesign/decisions.md`.
- **Easter eggs:** `docs/easter-eggs.md`.
- **The live queue:** `portfolio-explorations/queue.md`.

## Release

Push only with the Aaryush1 account: `GH_TOKEN=$(gh auth token --user Aaryush1)`. Set per-repo credentials first, and never run `gh auth switch`. Ask before pushing, opening a PR or merging. Vercel builds previews from branches.

**Release gate on Vercel:** `aaryush/vercel.json` sets the build command to `npm run build:vercel` (`scripts/vercel-build.mjs`). When `VERCEL_ENV=production` it runs `npm run test:release` first, so a production deploy fails while any copy is still a draft, then builds. Preview builds skip the gate, so branches still deploy with draft flags on.
