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

## Type (2026-10-15, branch `type-spectral`, preview only)

- **Pairing:** Spectral (voice), Karla (body and UI), Spectral SC (drawing labels). Round-2 pairing 4 from `portfolio-explorations/fonts.html`. Replaces Instrument Sans, Instrument Serif and JetBrains Mono. JetBrains is removed; mono survives only for the commit hash.
- **Labels are real small caps** (`--label`), sentence case in the source, tracking .06 to .12em, sizes about 20% above the old mono. Lining and tabular figures everywhere, so "AG-001" and "2026.10" never go old-style. Spectral's 1 looks like a small-cap I, which is the face's own design.
- **Headings are upright Spectral 400** with looser tracking than the old sans (-.01 to -.03em). The hero name stays the big headline. The hero's shared-letter morph measures real glyph boxes, so it needed no change.
- **Essay body stays Karla** after trying Spectral at 21px on one essay: Spectral reads well on paper but its thin strokes lose weight on the dark ground and on phones, and Karla matches the rest of the site.
- **Weight:** 98,436 B of woff2 on every page (Spectral 400 and italic, Spectral SC 400, Karla 400 and 500), against 116,628 B on the home page and 137,660 B on /writing before. Preload Spectral 400 and Karla 400 only. `font-display: swap` with size-adjusted Georgia/Arial fallbacks.
- **OG cards** use the same faces from woff copies in `src/assets/og-fonts/`.

## The hero sky (2026-10-15, branch `sky`, E17 to E19)

- **What replaced the topography:** the visitor's live star chart, variant E1 of the throwaway `star-chart.html`, approved after four tuning rounds. See `prd-addendum-extras.md` E17 to E19.
- **Data credit.** The star, constellation and Milky Way data come from **d3-celestial 0.7.35** by Olaf Frohn (https://github.com/ofrohn/d3-celestial), **BSD 3-Clause licence**, Copyright (c) 2015, Olaf Frohn. Its star positions, magnitudes and B-V colours derive from the ESA Hipparcos catalogue; the constellation lines and names and the Milky Way outlines are d3-celestial's own data files (see that repository for each file's upstream credit). The BSD notice: redistributions of source code must retain the copyright notice, the conditions and the disclaimer; the name of the copyright holder may not be used to endorse derived products. We keep that notice here and in the comments at the top of `src/scripts/sky/engine.ts` and `scripts/bake-sky.mjs`.
- **Baked, not fetched.** `scripts/bake-sky.mjs` turns four d3-celestial files (1.2 MB) into `src/data/sky/sky-data.json` (123 KB, **28 KB gzipped**; the whole lazy engine chunk with its code is about 42 KB gzipped, against the 60 KB limit). Stars are cut to magnitude 5 (1,627) and quantised to 0.01 degrees; constellation lines to 0.1 degrees; the Milky Way's five nested outlines are filled and blurred once at bake time into a 1 degree brightness grid, so the browser never rasterises them. The app makes no CDN call.
- **Magnitude 5, not 6.** The prototype used magnitude 6 (5,044 stars). The cut to 5 is what keeps the data small and the per-frame cost near 3 ms; the faintest naked-eye stars are missing and the night sky is a little sparser than the prototype's.
- **Load order protects LCP.** A first version loaded the sky in idle time right after first paint and moved Lighthouse's simulated LCP by about 250 ms (the engine's work landed before the text's last paint, which waits for the fonts). It now waits for the page load and the web fonts, then 1.2 s, then idle. Measured on the same build mode, LCP is unchanged. The cost: the sky fades in about two seconds after the page appears.
- **A previewed period moves the sky's clock** (the `t` key and `data-daypart`), so the Sun and Moon are where they would really be at 09:30, 14:30, 19:00 or 23:00. The Sun is otherwise pinned to the real time of day while the stars run fast.
- **Labels use the label face.** On-canvas labels and the `L` readout are Spectral SC small caps in sentence case, like the rest of the drawing language, not mono.
- **`L`, `[` and `]` live in the keyboard router** (`src/lib/keymap.ts`) so they share its guards (text fields, modifiers, open map, open pop-up) and `g` then `l` still means the levels section. They are never listed in the `?` map.
