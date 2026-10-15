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

### Sky update, 2026-10-15 (after review): instant first paint, background catalogue

- **Why:** the sky took a second or two to appear on desktop and the hero sat empty. Aaryush also found the density bare.
- **Two tiers.** The baked set is now only the 361 brightest stars (magnitude 3.7 and brighter), the constellation lines and names: 7 KB gzipped, in a first chunk of about 21 KB with the engine. It draws right after first paint (about 140 ms after navigation on desktop, about 600 to 700 ms with a 4x CPU slowdown). The Milky Way grid is its own baked chunk (11 KB gzipped) that loads with the catalogue. The rest of the catalogue (`stars.6.json`, magnitude 6, 5,044 stars) is fetched from jsDelivr in the background and its stars twinkle in over a few seconds. This **reverses** the earlier "no CDN call" rule for this one request (decided with Aaryush); it sends nothing but a GET, is skipped under Save-Data, and the sky works without it.
- **Why the fetch waits.** Fetching the 656 KB file straight after first paint moved Lighthouse's simulated LCP by about 1.1 s. Waiting for load, the fonts and a 1.2 s settle (then idle) brings it back to within 10 ms of the base. Loading the first chunk right after first paint, without the fetch, cost about 135 ms, so the Milky Way chunk waits too.
- **Star limits.** The d3-celestial file stops at magnitude 6; a deeper cut (magnitude 6.5 and beyond) is thousands of stars and megabytes, which isn't worth it for a hero. Limits: night shows all of it on desktop, phones to magnitude 5.6.
- **T+ was the bug, not LST.** T+ counted real seconds; it now counts simulated time, so it and LST agree (LST gains 1.0027 sidereal seconds per simulated second). Both roll with seconds at about 20 updates a second.
- **Rate cap is 1000x** (ladder 50, 100, 150, 200, 250, 300, 400, 500, 700, 1000). Trails keep their 26 degree cap.
- **Location is unchanged:** still the time zone. An IP-based option is being decided separately.

### The site's first server function: `/api/sky` (2026-10-15)

- **Why it exists.** The sky's position came from the visitor's time zone, a city guess that can be hundreds of kilometres out. The only place that knows roughly where a visitor is, without asking them, is the edge: Vercel puts an approximate position on every request. A static page can't read a request's headers, so a function is the smallest way to hand that to the page. The alternatives were a third-party IP lookup (a new service, a key, and the visitor's IP sent elsewhere) and the browser prompt on load (intrusive, and refused by most). Aaryush approved the hybrid: the connection by default, the exact position only if the visitor asks.
- **What it does, and no more.** `aaryush/api/sky.ts` reads the two Vercel IP headers and returns `{lat, lon}` rounded to 0.1 degree (about 11 km), `Cache-Control: private, no-store`. No logging, no storage, no cookie, no third-party call, no key, no import from the app. Headers missing or not real coordinates: 204 and no body. A unit test pins the rounding, the 204s and that it sets only two headers and imports nothing.
- **Placement.** A plain `api/` folder next to the static Astro build, with no adapter: Vercel builds `api/` functions for any project, and the site stays fully static. Fallback if a preview shows otherwise: `@astrojs/vercel` with one `prerender = false` route. Off Vercel (dev, a static preview) the route doesn't exist or has no headers, and the client keeps the time-zone guess.
- **Privacy.** The client sends nothing but the GET, with no credentials. The position stays in the browser; the readout shows 0.1 degree. The exact position (E21) is only asked for from a click, never on load, shown to 0.01 degree (the second decimal fades in over about 0.8 s, instantly under reduced motion), kept in sessionStorage for the session, and never sent anywhere. Rounding settled with Aaryush: 0.1 degree by default (the function's answer and the readout), 0.01 degree only for the opt-in.
- **Sky data privacy note.** The star catalogue (earlier in this file) is fetched from jsDelivr, which sees the visitor's IP like any CDN request; nothing about location goes with it.

### Preview fixes (2026-10-15)

- **`/api/sky` on a protected preview.** Vercel Authentication redirects an unauthenticated fetch to `vercel.com/sso-api`, which fails CORS. The client now sends the request same-origin (so the auth cookie goes with it) and with `redirect: 'error'`, so a redirect to an auth page fails at once, makes no cross-origin request, and the time-zone guess stands.
- **A precise position lasts only while the browser still allows it.** A stored precise position is checked against the Permissions API on load and dropped (back to the connection, then the time zone, at one decimal) if the state isn't granted; a `change` event drops it mid-session. Without the Permissions API it is kept as before.
- **A reload resets the speed;** moving between pages in the visit keeps it (the navigation type is the test). A precise position survives a reload only if the permission is still granted.

### Meteors (2026-10-15)

- **The hover rush wasn't noticeable.** The old rush only changed the rate of the next scheduled meteor, which could be seconds away, at about four times the ordinary rate. It now fires from the hero's own pointer events (enter and move, not the canvas under the text), spawns one at once, pulls the next one in, and runs at about eight times the rate for 6 s, easing off over the last 3 s, with a 9 s rest. Touch keeps its own shorter rush.
- **Clicks make bursts (E22).** Clicking the hero background sets off 2 to 4 meteors radiating from the click. A link, button, field, the readout or a text selection never does. A 0.7 s cooldown and a cap on active meteors bound it; reduced motion gets none.

### More stars, tiled and served from our own site (2026-10-15)

- **Why:** the sky still looked bare. The catalogue behind it stopped at magnitude 6 (5,044 stars) and came from jsDelivr.
- **Source and depth.** d3-celestial 0.7.35's `stars.8.json` (41,411 stars to magnitude 8, the Hipparcos catalogue). Desktop draws to magnitude 7.5 (25,362 stars outside the first-paint set, about 24,000 on screen for a visitor), phones to 6.5. The faintest shell (7.5 to 8, 15,688 stars) is left out: it would double the bytes for dots too faint to see.
- **Our own site, not a CDN.** `scripts/bake-sky.mjs` writes 48 static tiles to `public/sky/`: 4 magnitude shells (3.7 to 6, 6 to 6.5, 6.5 to 7, 7 to 7.5) by 12 declination bands of 15 degrees, in a binary format (`scripts/sky-tile-encode.mjs`: a count, then columns of right ascension deltas, declination, magnitude and B-V, 6 bytes a star). All 48 tiles are about 150 KB; the data gzips poorly, so transfer is about the same. The jsDelivr request is gone: the sky now makes no outside call at all. Credit unchanged (d3-celestial, BSD 3-Clause, Hipparcos).
- **Declination is the axis that saves bytes.** At 225x and more every right ascension comes past within minutes, so filtering by RA or by time saves nothing. Latitude decides which declinations can ever reach the frame, so from the latitude and the E17 framing `src/lib/sky/tiles.ts` finds the visible declination range (a grid of the frame run backwards through the projection), adds a 3 degree margin, and only the bands that overlap it are fetched. In practice the E17 framing shows most of the sky, so the saving is modest: 40 of 48 tiles from 43 N (bands 0 and 1 skipped) and 40 of 48 from 34 S (bands 10 and 11 skipped), about 137 KB each instead of 149 KB; phones take 20 tiles, about 46 KB. If `/api/sky` or the precise opt-in changes the latitude, newly needed bands are fetched.
- **Staging protects LCP.** Same as the catalogue before it: after the page load, the fonts and a 1.2 s settle, in idle time, shell by shell (two tiles at once, low priority). Each tile's stars twinkle in over a few seconds.
- **Cost of 24,000 stars.** Each star's constant brightness is worked out once and cached; each frame only rotates, projects, drops stars that are off the frame or too faint, and works out the quiet zone only near it. Faint stars are drawn as batched rectangles by colour class and brightness level (about 40 fills instead of thousands). Frame JS is about 3.7 ms median, 5 ms at p90 on desktop at night.
- **Looks:** the faintest magnitude drawn is 8.2 at night, 7.4 in the evening, 6.0 in the morning and 5.2 in the afternoon, so daytime stays quiet.

### The trickle (2026-10-15)

- **Why:** a whole tile's stars faded in together a few seconds after it landed, which read as a wait and then everything at once.
- **How:** the fetch keeps its settled-stage gate (that is what protects LCP). Only the reveal is paced: when a tile is decoded, its stars are sorted brightest first and given a reveal time in batches of 150 to 300, one batch every 80 to 120 ms, on a clock that runs on from the previous tile's. The frame loop reads each star's reveal time (no per-star timers), so a field of 24,000 fills in about 10 s on desktop and about 4 s on a phone. A star blooms to about 1.6 times its brightness over about 0.5 s with a soft square glow in its own, more saturated colour, then settles; stars fainter than magnitude 7 only fade. Under reduced motion every star is in place at once.
- **Cost:** frame JS stays near 4 ms during the trickle: the glow is another set of batched fills, not per-star sprites.
- **Console labels:** the sky line says `from your IP` (the `/api/sky` answer), `from your device` (the precise opt-in) or `from your time zone` (the fallback).

## 3D star catalogue (2026-10-15)

- **What:** `aaryush/public/stars3d.bin`, a binary catalogue of every star with a measured distance, so the probe story can fly between stars at true distances. Baked by hand with `scripts/bake-stars3d.mjs`, decoded by `src/lib/probe/stars3d.ts`.
- **Source:** the HYG database v4.4 by David Nash (astronexus), licensed CC BY-SA 4.0. URL: https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz (git-lfs, file commit 53e3df31 of 2026-07-12, LFS sha256 00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d), fetched 2026-10-15 and gunzipped unmodified. Credit: HYG database, David Nash, astronexus, CC BY-SA 4.0. The CSV itself is not committed.
- **Why HYG:** it already pairs Hipparcos and Gaia distances with the Hipparcos IDs the hero's catalogue uses.
- **Filter:** apparent magnitude 7.5 or brighter, a known distance (HYG marks unknown as 100000), and the Sun (id 0) dropped. Missing colour index defaults to 0.65. Sorted by absolute magnitude.
- **Result:** 24,940 stars, 349,164 bytes raw, 300,748 gzipped.
- **Format (little-endian, exactly 4 + 14n bytes):** `uint32 n`, `float32 x[n]`, `y[n]`, `z[n]` (parsecs, equatorial J2000, Sun at origin), `uint8 absmag[n]` (`q/10 - 10`), `uint8 ci[n]` (`q/100 - 0.5`). Out-of-range magnitude and colour clamp rather than wrap.

## Old QR codes go to the contact page (2026-10-15)

- **The rule:** `/?met|about|note` redirects (temporary, 307) to `/card` and keeps the query, while a plain `/` is untouched.
- **Why:** these codes exist to save the contact, and this follows Aaryush's call that the QR code opens the contact page.
- **The guard:** `tests/unit/card-redirect.test.ts` pins it.
- **The limit:** `astro preview` doesn't run Vercel redirects, so it's verified on the Vercel preview.
