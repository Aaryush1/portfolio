# Redesign decisions

The key decisions behind the October 2026 redesign, and why. Every entry is dated 2026-10-14 unless it says otherwise (the redesign was built in one long session with Aaryush choosing as it went). Sources: the build ledger (`.superpowers/sdd/plan/progress.md`, gitignored), the task briefs next to it, and the specs in this folder. Copy approvals live in `copy-review.md`, not here.

## Direction

- **The site exists to make people want to talk to him, not to hire him.** No selling, testimonials or "hire me". Companies lead; Gupta Advisory is one quiet line (investors and founders read it too).
- **Mobile first.** Most visitors arrive by scanning his QR code in person, so everything is designed and checked at 430, 412, 375 and 360 before desktop.
- **Dark only, one amber accent.** Palette tokens live in `src/styles/tokens.css`. `--text-3` moved from `#7D828E` to `#8B909C` so text stays AA over the lights.
- **Two languages.** The homepage speaks in engineering drawings (sheet strips, title block). The writing room is a warm, dim room with objects on a desk and does not use the drawing language. Aaryush said writing should be his taste, not drawings.
- **Easter eggs are shown, never explained.** No hint lines anywhere. Each one is listed in `docs/easter-eggs.md`.
- **Copy is his.** New wording ships as a draft, is listed in the copy review, and is flipped only after he approves it. The release gate fails while any draft remains.

## Homepage

- **Hero: the shared-letter morph.** Claude's idea. The rotating subject morphs letter by letter, timing scales with the size of the change, and the biggest changed word glows full amber while incidental changes glow quietly. It settles on "how *anyone* solves problems" (italic serif "anyone").
- **Eyebrow cut.** "AI Strategy & Organizational Design" read as too corporate, so the page title is just "Aaryush Gupta". The hero figure caption was cut too.
- **Background: topography in the hero, light and grain site-wide.** He rejected the hero circuit background and the page grid. The topography follows the visitor's local time (morning, afternoon, evening, night).
- **Logo: "ag." drawn on, animated.** Picked from the refined Loop and Signature concepts.
- **Levels figure: the Lens (option 9B).** Zoom-led, with a sticky translucent blurred band on phones. Caption: "Fig. 2.1 — Zoom in or out."
- **Title block:** Dwg. no. AG-001, Region us-central, Last deploy (stamped at build), Scale NTS. The Last deploy cell opens the revision block.
- **About leaves the homepage.** It became the first writing note, "Once, for Good", written after the CLAUDE.md rewrite as a test of the writing workflow.
- **Company pop-up:** "Systems built here" at the very top. Gupta Advisory is demoted to a one-line entry under the contextOS line.
- **Mobile contact:** a big Save contact button with small icon buttons. The saved contact card carries context about where you met (E6, `/qr`).
- **No check marks anywhere,** since they would remove the reason to come back.
- **Small extras (E1 to E16):** console note naming Claude and drawing the conversation loop, a hidden keyboard map, a 404 drawn as a missing sheet, print as a drawing sheet, the revision block, arrow keys on the desk, and the writing room's own 404. The contextOS caret and typed-word egg are hidden.

## The writing room

- **Not a blog: "stepping into a library room".** Each piece is a physical object on a desk, with its kind chosen to fit: a folded letter, a stapled paper, a clipped stack of index cards (note). Opening a piece is walking into the room.
- **Objects show the piece's own breakdown** (letter folds, paper sections, note cards) plus a handwritten "why I wrote this" line. The why-line and breakdown are co-written with Aaryush for every piece.
- **The room follows the visitor's clock.** 9pm to 7am is night, with a handwritten note ("you're up late too."), and the `t` key steps through times of day on both the homepage and the writing room, synced via sessionStorage.
- **No lamp object, no 3D, no coffee rings.** The coffee ring was cut because it needs analytics or a backend. The drawer holds only a decorative contextOS folder and is deliberately small and unlabelled-feeling.
- **The room remembers you,** with no backend: localStorage only. Replaced the old ribbon with a mark per kind (sticky flag, thumbprint, pulled card). The homepage teaser keeps a dot and ribbon, shown only while hovering "pick up" on desktop.
- **Notes are called "note", not "essay".** The new kind is index cards with stepped edges that widen as scope grows. Reading time is computed from the word count.
- **The "ag." signature draws itself at the end of every piece,** not only letters.
- **Phone opening is full-screen.** On phones a paper lifts and fills the screen and a letter unfolds panel by panel (about 1.4s), via a hybrid clone transition.
- **Writing page heading is just "Writing".** "Pull up a chair" was rejected because it did not make the desk obvious.

## Process and quality

- **Link previews (OG cards) are generated per page.** Home shows only the Last deploy cell, systems and companies use diagram thumbnails, essays show the object and title, and `/writing` is static and lasting (warm light, large mark, "Writing"). They must be updated when a page's title, kind or structure changes.
- **Testing is proportionate.** The site gets a few visitors a week. Per change: only the touched specs on Chromium plus unit tests and `astro check`. Full four-browser suite once before a release. Do not chase flaky tests past one re-run.
- **Models.** Haiku implements mechanical, well-specified tasks. Sonnet implements anything needing judgement or taste and does every review. Small visual fixes get a controller check (screenshot plus a read of the diff); features get a reviewer.
- **Parallel builders use separate ports or worktrees** (`PW_PORT`, `ASTRO_OUT_DIR`), never `git stash`, and stage only their own paths.
- **Docs travel with changes:** the spec, the copy review, the easter-egg register, the revision block and the OG cards update in the same change.
- **Scraper protection.** Email and phone are stored as reversed parts and assembled at runtime, never in served HTML. The contact `.vcf` file was removed (2026-10-14): the contact card is built in JavaScript.
- **The confidentiality rule.** The site never shows the Ready Rebound engineering tool's name, the city product, or any city. Repo docs may mention them. (Aaryush decided on 2026-10-14 that a guarding test was overkill, so the rule stands as a convention.)
- **Dates and titles.** Skale.win ended Feb 2026. Real titles are reframed ("AI Lead", "AI & Engineering Lead"; Gupta Advisory's role is "Founder").
- **Release gate.** `npm run test:release` fails while any copy is a draft. Vercel production builds run it (preview builds do not, so branches still deploy with drafts).
- **Windows quirk.** `~/.npmrc` sets `os=linux`, so installs use `npm_config_os=win32 npm install`. Never edit `~/.npmrc`.
- **Push only with the Aaryush1 account,** and only after asking.
