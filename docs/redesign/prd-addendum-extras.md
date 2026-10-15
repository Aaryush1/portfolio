# Addendum: details for people who notice

Approved by Aaryush on 2026-10-14. These additions extend the redesign PRD (`prd.md`). They share one rule:

> The details are true and quiet. They reward people who notice, and nobody is ever told they're there.

Each feature works without JavaScript, or degrades to nothing. Each respects `prefers-reduced-motion`. None adds a backend, analytics or any network call.

## E1. Console note

- **What it is:** opening DevTools on any page shows a short note signed "— ag.", with the Engineering loop drawn in ASCII (Ticket → Spec & decisions → Implement ⇄ Review → Docs → PR → Browser QA, plus a loop back to a person).
- **Copy:** draft, and listed in the copy review. Under 8 lines of text, not counting the ASCII. It points at the `?` keyboard map.
- **Acceptance criteria:**
  - It logs exactly once per page load, including after view-transition navigations.
  - It uses `console.log` with at most two `%c` styles, so it's legible in both light and dark DevTools themes.
  - It never logs the email address or phone number, in any form.
  - No errors are thrown if `console` is unavailable.
- **Failure cases to test:**
  - It doesn't log twice when a script module is evaluated again.
  - It doesn't appear in the served HTML. The confidentiality and leak tests still pass.

## E2. Hidden keyboard commands

- **Bindings:**

  | Keys | Action |
  | --- | --- |
  | `?` | Opens a small keyboard map styled like the hero title block. |
  | `g` then `h` | Go to the hero. |
  | `g` then `l` | Go to the levels section. |
  | `g` then `w` | Go to Work. |
  | `g` then `r` | Go to Writing (the `/writing` page). |
  | `g` then `c` | Go to Contact. |
  | `t` | Toggle the hero topography's time preview through the periods. Debug-ish; it only shows in the map. |
  | `Esc` | Closes the map. |

- **Acceptance criteria:**
  - Shortcuts are ignored while focus is in an input, textarea or contenteditable element, while a modifier key (Ctrl, Meta or Alt) is held, and while a pop-up dialog is open. The exception is that `?` still works inside a pop-up.
  - A `g` sequence times out after 1.2s.
  - The keyboard map is a proper dialog: it has focus trap behaviour, returns focus on close, is labelled, and closes on `Esc` and on backdrop click.
  - Navigation uses the existing smooth-scroll and view-transition behaviour.
  - Under reduced motion, there's no animated entry.
- **Failure cases to test:**
  - Typing `g`/`w` inside any text field does nothing.
  - `?` with Shift on non-US layouts still resolves via `e.key === '?'`.
  - Shortcuts don't fire during IME composition.

## E3. 404 as a missing sheet

- **What it is:** the strip reads "§ 404 · Sheet not in set". The heading is "Sheet not in set." Below it is a small register of the real sheets, with each row a link:
  - 01 Hero
  - 02 About
  - 03 How AI fits
  - 04 Work
  - 05 Writing
  - 06 Contact

  A struck-through row for the requested path (shown as text, escaped) sits in sorted position as "— Not issued".
- **Acceptance criteria:**
  - The requested path is rendered with `textContent` only, never as HTML, and is truncated to 60 characters.
  - The page returns status 404, which Vercel already does for `404.astro`.
  - All links work, and the page passes axe.
- **Failure cases to test:**
  - A path containing `<script>` renders as literal text.
  - Paths that are very long, or contain unicode, don't overflow at 320px.

## E4. Print as a drawing sheet

- **What it is:** printing the home page produces a clean A4/Letter sheet:
  - a black-on-white line border and the hero title block (Dwg. no., Sheet, Region, Last deploy, Scale);
  - the name and eyebrow, plus the about paragraph;
  - the work timeline as text: company, role, dates, one-liner and system titles;
  - the writing list.
  - The contact block shows the email, phone and site as **text**. They're assembled at print time by the same runtime that builds `mailto:`, so they never appear in the served HTML.

  It is not a résumé download. It exists only via Print.
- **Acceptance criteria:**
  - Under `@media print` there is no background layer, no canvas, no animation and no header or footer navigation. Pop-ups are closed.
  - The home page fits on one or two pages at Letter and A4, checked with Playwright `page.pdf()` for both sizes.
  - Without JavaScript, the contact lines are omitted rather than shown broken.
- **Failure cases to test:**
  - Printing while a pop-up is open still prints the home sheet.
  - The email and phone never appear in the HTML source. The existing leak test still passes.

## E5. Hero topography follows the visitor's clock

*Superseded in part by E17: the topography is gone and the live star chart reuses the same period logic.*

- **What it is:** the hero field reads the visitor's local hour once on load, and again every 10 minutes while visible. It uses the same periods as the writing room:

  | Period | Hours | Field |
  | --- | --- | --- |
  | Morning | 07–12 | Slightly cooler minor lines. |
  | Afternoon | 12–17 | The default look. |
  | Evening | 17–21 | The amber contour warms and brightens a little. |
  | Night | 21–07 | Fewer contour levels, about 40% slower drift, and the amber contour slightly dimmer, as if the system is idling. |

  The periods live in `src/lib/daypart.ts`, shared with the future writing room.
- **Acceptance criteria:**
  - Changes are subtle: the text contrast checks still pass in every period.
  - The reduced-motion still frame reflects the period.
  - A test hook (`?daypart=night`, honoured only in dev and test builds, or via `data-daypart` set by tests) lets e2e tests force each period. Production ignores the query parameter.
- **Failure cases to test:**
  - The boundary hours (06:59, 07:00, 20:59, 21:00) map correctly, with unit tests on the pure function.
  - DST transitions don't matter, because only the local hour is used.

## E6. A contact card that remembers where you met

- **Why:** Aaryush shows his QR from his phone at events and meetings. Generating event QRs by hand is too much friction, so the QR page itself is the tool.
- **The QR page (`/qr`, on his phone):**
  - Above the QR are two quick inputs:
    - **Where:** a free-text field ("Madison AI Week") with three vague one-tap presets configured in `site.ts`: Coffee, Conference, Dinner. Anything more specific gets typed.
    - **Talked about:** up to two topic chips, each mapping to a page on the site (the systems, Advisory, Writing), plus a free-text field for anything else ("pricing AI agents"). Free text is capped at 80 characters.
  - The QR re-renders live as he types or taps, client-side, and encodes `https://aaryush.com/?met=<where>&about=<slug,slug>&note=<free text>`.
  - **Nothing persists:** every visit to `/qr` starts blank, with no storage of any kind.
  - Under Reduce Motion, the QR doesn't animate between states.
- **The person who scans:**
  - They land on the home page as normal, and nothing on the page announces the context.
  - The params are read once, kept in `sessionStorage`, and stripped from the address bar with `history.replaceState`, so they don't end up in shared links.
  - Any "Save contact" button then builds the vCard at runtime. It has the usual fields: name, email and phone assembled from parts, as today, plus the URL. It adds a `NOTE`, for example: "Met at Madison AI Week · Tue, Oct 14, 2026 · Talked about: Engineering loop, pricing AI agents". Topic chips appear by name only; the note contains no links.
  - The date comes from the scanner's device at save time.
  - Without params, the vCard still gets "Saved Tue, Oct 14, 2026".
- **No follow-up nudge:** the note never tells them what to write.
- **Acceptance criteria:**
  - **Escaping:** the `note` value follows the same rules as `where`, but is capped at 80 characters. The `where` value is trimmed, capped at 60 characters and vCard-escaped. Backslash, comma, semicolon and newline are escaped per RFC 6350.
  - **Unknown topics:** topic slugs not in the known list are dropped.
  - **Valid card:** the vCard imports on iOS and Android contacts with the note intact. This is a manual check; automated tests parse the generated text.
  - **Scraper protection holds:** the email and phone never appear in the served HTML or the QR. The existing leak tests still pass.
  - **No JS:** `/qr` shows the static QR, and "Save contact" falls back to the static `.vcf`.
  - **Library:** QR generation uses one small, zero-dependency, MIT-style library, loaded only on `/qr`. It must not ship in the home bundle.
- **Failure cases to test:**
  - `?met=<script>` and over-long or unicode values.
  - Repeated `about` slugs, and more than two of them.
  - A visit with params followed by a reload: the params are gone from the URL but the note still applies in that tab.
  - A new tab gets no note context.

## E7. The homepage night note: general notes

- **What it is:** between 21:00 and 07:00 in the visitor's local time, a small "General notes" block in pencil appears on the hero drawing, near the title block. It reads:
  > GENERAL NOTES
  > 1. It's past nine.
  > 2. You're still here.
  > 3. Good.

  "General notes" is set as a drafting label. The numbered lines are in the pencil hand: Instrument Serif italic, slightly rotated, the colour of pencil graphite.
- **Placement:**
  - **Desktop (title block visible):** above or beside the title block. It must not overlap the block, the hero text or the contact row.
  - **Phones (title block hidden):** in the footer's bottom bar, next to the location line, in the same pencil style.
- **Never announced:** no label, tooltip or hint explains it. In the daytime it is absent from the DOM entirely, because it is inserted by script only at night.
- **Clock:** it shares `src/lib/daypart.ts` with the hero and the writing room.
- **Distinct from the writing room:** it is not the writing room's "you're up late too." note, and it uses different words and form.
- **Acceptance criteria:**
  - It is present only from 21:00 to 07:00, with the boundary hours tested.
  - It is absent from the served HTML.
  - It doesn't overlap anything at 1280 or 375.
  - It is `aria-hidden`, since it is decorative.
  - Under reduced motion it appears with no animation.
  - The `data-daypart` hook forces it on in tests.

## E8. The contextOS line: a caret, and a word you can type

- **The caret.** On the timeline's "Next" line, the period after "contextOS" is replaced by a thin blinking caret, as if the name is still being typed. The rest of the line stays as it is: "Next — contextOS▍ Coming soon."
  - **Style:** the caret matches the hero's morph styling. It uses the amber of the hero's arriving letters, sits at the same weight, and blinks slowly (about a 1.1s cycle, ease in and out, never a hard flash).
  - **Reduced motion:** the caret shows, but doesn't blink.
  - **No JS:** the original period shows.
- **The typed easter egg.** Typing `contextos` anywhere on the site (case-insensitive, outside text inputs, using the same guards as the keyboard shortcuts) makes the contextOS word on the timeline re-type itself once. It uses the hero's shared-letter morph style: the letters arrive amber and settle. If the timeline line isn't on screen, it scrolls into view first.
  - No message, label or toast, and nothing explains it.
  - Under reduced motion, the line gets a single, instant amber tint instead.
  - On pages without the timeline, it does nothing.
- **Acceptance criteria:**
  - The caret replaces the period when JS runs. Under reduced motion it doesn't animate.
  - The typed sequence fires only from outside editable fields, with a 1.5s gap tolerance between keys.
  - The morph runs once per trigger, and repeated triggers while it's running are ignored.
  - Neither part is in the keyboard map or explained anywhere.

## E9. "Save contact" becomes "Saved."

When a Save contact button successfully triggers the vCard download, its label morphs with the hero's shared-letter morph:
- "Save" keeps its letters.
- A "d" arrives in amber, following the hero's main-change rule.
- "contact" leaves.
- A full stop settles at the end.

The button's look also changes to show the saved state: an amber hairline border, the icon swapped for a small check, and a slightly dimmed fill. It returns to "Save contact" only on the next page load.

Requirements:
- The morph and state change happen only after the download was actually triggered, never on a failed build.
- Under reduced motion the label swaps instantly.
- The accessible name changes to "Contact saved" through a polite live region.
- This applies to both the hero and footer instances.

## E10. The deploy hash

Hovering or focusing "Last deploy" in the hero title block reveals the commit it was built from, e.g. "2026.10 · a868cd5".
- The commit is the short git SHA, injected at build time via `import.meta.env` or a Vite `define`. It falls back to nothing (just the date) if git is unavailable.
- Use the mono style, fade in, and keep the cell width stable so nothing shifts.
- Show it on focus too (the cell is focusable, with `tabindex=0`), with the accessible name "Last deploy 2026.10, commit a868cd5".

## E11. Type `ag.`

Typing `a`, `g`, `.` anywhere (same guards as `contextos` and the keyboard shortcuts) replays the header logo's draw-on. It isn't explained anywhere. Under reduced motion it does nothing.

## E12. The lamp warms while you read

On essay pages (any kind), the page's ambient light very slowly warms the longer someone stays and reads.
- Reading means the tab is visible and the user has scrolled or moved within the last 60 seconds.
- The shift is imperceptible minute to minute. It reaches its maximum after about 5 minutes of reading: roughly +6% warmth in the background warm light, never touching text contrast.
- It resets on a new page load.
- Under reduced motion there's no change. It costs nothing at rest: use a single CSS custom property updated about once every 15 seconds, with no rAF.

## E13. Signed prints

The printed home drawing sheet carries the "ag." mark in the title block, as a static pencil-grey signature in a small "Signed" cell. Low priority; it's cheap.

## E14. A revision block behind the deploy hash

Clicking or pressing Enter on the "Last deploy" cell (which reveals the commit hash, E10) opens a small drawing-style revision block anchored to the title block. It's a table with the columns **Rev · Date · Description**, showing the five most recent entries.
- **Data:** the rows come from a hand-written list in `src/data/revisions.ts`. They're curated descriptions, not git messages. Revisions are lettered A, B, C… in drafting style, newest first. The current redesign is the latest row.
- **Behaviour:** it closes on Esc, on an outside click, and on clicking the cell again. Focus returns to the cell.
- **Phones:** the title block is hidden, so this easter egg is desktop-only.
- **Visibility:** it isn't explained anywhere. It's listed in `docs/easter-eggs.md`.
- **Workflow:** add a row whenever something meaningful ships. The project CLAUDE.md records this step.

## E15. Arrow keys walk the desk

On /writing, when no text field has focus:
- ← and → move the light, and the keyboard focus, from piece to piece in visual order;
- Enter opens the lit piece;
- Home and End jump to the first and last piece.

It works alongside Tab order, not instead of it. Under reduced motion, the light jumps rather than glides.

## E16. The writing room's own 404

Unknown `/writing/<slug>` URLs render a writing-room-specific not-found page instead of the site 404:
- the dim desk, in the current daypart's light;
- a single crumpled sheet in the pool of light;
- one quiet link, "Back to the desk".

The page returns a 404 status, and the requested slug is never rendered as HTML. In Astro, this means a catch-all route or redirect so that `/writing/*` misses land here; choose the cleanest approach that still returns a 404 from Vercel and explain it.

## E17. The hero is the live star chart

The hero's topography is replaced by the visitor's own sky, drawn live. Approved as variant E1 of the throwaway prototype (`portfolio-explorations/star-chart.html`, tuning in `task-44-report.md`). Code: `src/scripts/hero-sky.ts` (small, ships with the page), `src/scripts/sky/engine.ts` (the sky, loaded after first paint), `src/lib/sky/` (astronomy, place, geometry and rules, all pure and unit-tested), `src/data/sky/sky-data.json` (baked by `scripts/bake-sky.mjs`).

**Whose sky.** The visitor's real sky. The location comes from their time zone name through a built-in table of 55 zones (fallback: longitude from the UTC offset at latitude 38). There is no geolocation prompt and no network call. The southern hemisphere mirrors, with south at the top.

**Framing.** Full-bleed, looking straight up, north at the top, with the celestial pole 16px above the top edge, so the whole sky wheels around the pole on arcs. The horizon is just below the bottom edge. There is no disc, grid or ground.

**What is in it.**
- Stars in their real B-V colours, saturation rising with brightness. The first paint has the roughly 360 brightest (magnitude 3.7 and brighter). The rest arrives in the background as static tiles from our own site and **trickles in**: as soon as a tile is decoded its stars are released in small batches (150 to 300 stars every 80 to 120 ms, brightest first), so the field fills continuously over about 10 s on desktop and about 4 s on phones, rather than a tile at a time. Each star blooms briefly when it appears (about 0.5 s up to roughly 1.6 times its resting brightness, with a hint of its own colour, then settling); the faintest, from magnitude 7, just fade in. Reduced motion: every star appears in place, with no bloom. The faint ones fill the empty patches as tiny, quiet points. Desktop goes to magnitude 7.5 (about 24,000 stars in all at night), phones to 6.5 (about 8,000).
- Subtle constellation lines.
- The Milky Way: cool blue with warm dust toward the galactic centre.
- The planets in their own colours, and the Moon in its real phase and orientation.
- **Sgr A\***, the galactic centre, as the single amber accent, with a faint amber tick on the rim while it is below the horizon.
- Faint marks for Cygnus X-1, the Crab pulsar and the Vela pulsar.
- **The Sun:** a soft glow at its real position, pinned to real time (it does not run fast), whenever it is above the horizon. In daytime it reads clearly but stays quiet behind the text (its glow is also eased by the quiet zone). Below the horizon it is simply not there.

**Quiet zone.** A feathered area behind the name, line and lede (measured from the live text boxes, 110px feather, 70px on phones) takes stars, lines and planets to about 30% and hides labels there. The hero's old scrim stays.

**Motion.**
- The sky runs at an accelerated rate: **225x on desktop, 150x on phones**.
- **Trails** are true arcs that follow each star's past positions, only for the brightest 50 stars (30 on phones), the planets and the Moon, fading along their length. Length grows with the rate: 10 + 4 ln(rate/50) degrees of sky rotation, capped at 26.
- **Twinkle** on stars brighter than magnitude 4.2, stronger near the horizon.
- **Meteors:** about one every 3.5 seconds (4.5 on phones), thin and faint, up to about five times as often on real shower peaks (Quadrantids, Lyrids, Eta Aquariids, Perseids, Orionids, Leonids, Geminids, Ursids). Moving a pointer over the hero (desktop) or touching it (phones) starts a rush: a meteor straight away and a few within the first second (about eight times the ordinary rate), still thin and faint, easing off over the last 3 s of about 6 s (3.6 s on phones), then a 9 s rest before it can start again. The listeners are on the hero, so the text above the canvas can't swallow them.
- **Time of day:** the existing daypart behaviour stays (`daypart.ts`, the `t` preview, `data-daypart`). Sky colour, star depth and the Milky Way follow the real clock; daytime stays populated, just quieter. A previewed period moves the sky to that period's representative time today (09:30, 14:30, 19:00, 23:00), so the Sun and Moon are where they would really be.
- **Reduced motion:** one still frame, with no trails and no meteors.
- **Pausing:** the loop pauses when the tab is hidden, the hero is offscreen, or a pop-up is open.

**Production requirements.**
- **First paint is instant.** A small first chunk (about 21 KB gzipped: the engine, the 361 brightest stars, constellation lines and names) loads after one rAF following the page's own first paint, and the sky draws in its own short task, about 140 ms after navigation on desktop. The Moon, Sun, planets and Sgr A\* need no data. The quiet zone applies from the first frame.
- **Background tiles:** once the page has loaded, the fonts are in and things have settled (about 1.2 s), in idle time, the engine fetches the fainter stars as static tiles (`public/sky/s<shell>-b<band>.bin`, baked from d3-celestial 0.7.35's `stars.8.json`, 25,362 stars between magnitude 3.7 and 7.5). Tiles are split by **magnitude shell** (3.7 to 6, 6 to 6.5, 6.5 to 7, 7 to 7.5) and **15 degree declination band**, in a compact binary format (6 bytes a star: right ascension as a delta, declination, magnitude and B-V quantised; about 150 KB for all 48 tiles). Shells load in order, two tiles at a time; phones take the first two shells only, and a 2g connection only the first. Save-Data fetches none. The Milky Way grid (11 KB gzipped, baked, own chunk) arrives with them and fades in. Nothing leaves our site. If a tile fails, is blocked or isn't a tile, the sky keeps what it has and nothing breaks.
- **Only the bands that can show:** the sky runs at 225x or more, so every right ascension comes past within minutes and an RA or time filter saves nothing. Latitude does decide what can ever appear: from the visitor's latitude and the E17 framing (pole just above the top edge, horizon just under the bottom edge) `src/lib/sky/tiles.ts` works out the lowest and highest declination that can reach the frame, adds 3 degrees, and only those bands are fetched (from 43 N the far southern bands below -60 are skipped; from 34 S the far northern ones above 60; mirrored). If the position moves, any band newly needed is fetched.
- **Console:** when the first sweep of tiles is done, one line with the real count and where the position came from: `✦ 23,795 stars · Hipparcos via d3-celestial · your sky over 41.9°N 87.6°W · from your time zone` (draft wording, copy review section 19).
- **LCP:** the first chunk is small, the first frame is one short task, and the big fetch waits until what LCP measures is done, so the sky does not move LCP. Precomputed vectors; each frame only rotates and projects them (faint stars are drawn in a few batched fills). One rAF loop, 30 fps cap, DPR capped at 2.
- **Failure:** if even the first chunk can't load, the hero is simply calm. Storage is wrapped in try/catch.

**Known limitations.** The time-zone location is a city guess, up to a few degrees off, so alt/az is approximate (the sky itself is true for that guess). No atmospheric refraction or twilight model. The Moon is drawn larger than life. Stars stop at magnitude 7.5 on desktop and 6.5 on phones. Without the network, the sky is the 361 brightest stars. A phone shows the top of the sky only, since the hero is short there.

## E18. `L` toggles labels and a readout

Pressing `L` (not `g` then `l`, which still goes to the levels section) fades in very subtle labels: the planets, the Moon, the Sun, 26 bright stars, constellation names (small caps, in the label face), Sgr A\*, and the Cyg X-1, Crab and Vela marks. A readout appears top right: `Live · lat/long · HH:MM local · T+XXhYYmZZs · LST XXhYYmZZs · Moon % · ×rate`. `local` is the real clock. `T+` is the **simulated** sky time elapsed since page load, at the current rate, including changes from `[` and `]`; `LST` is the simulated local sidereal time. Both show seconds and roll about 20 times a second (once a second under reduced motion), in tabular figures so the digits don't jitter. `Moon` is the illuminated fraction. Ignored in text fields and while the keyboard map or a pop-up is open. Not in the `?` map.

## E19. `[` and `]` change the sky's speed

`[` slows and `]` speeds up the sky through 50, 100, 150, 200, 250, 300, 400, 500, 700 and 1000x (from 225x, the first step is 200 or 250). Capped at 50x to 1000x for visitors. Trails keep their cap of 26 degrees of sky rotation. The rate is remembered for the session (sessionStorage in a try/catch), the readout shows it, and the trails lengthen or shorten with it. Same guards as `L`. Not in the `?` map. Neither key conflicts with `t`, `g`, `?` or the typed words `contextos` and `ag.`.

## E20. The sky starts over where you are

By default the sky looks from the time-zone guess (E17). After first paint the page asks the site's one server function, `GET /api/sky` (`aaryush/api/sky.ts`), where the connection seems to be. Vercel puts an approximate position on every request (`x-vercel-ip-latitude`, `x-vercel-ip-longitude`); the function returns just `{lat, lon}` rounded to 0.1 degree (about 11 km), with `Cache-Control: private, no-store`. It logs nothing, stores nothing and calls nothing else; it has no keys. With the headers missing (local dev, a static preview), or out of range, it answers 204 with no body.
- **Client:** the fetch has a 1.5 s timeout and sends no credentials. On a good answer the sky glides to the new position over about 2 s (latitude and longitude eased together, the short way round the globe, the horizon and the Milky Way following), and the readout follows. On a 204, an error, junk, a timeout or a block, it keeps the time-zone guess and nothing else happens. Under reduced motion it moves at once.
- **Time of day** and the visitor's clock do not change: the zone still decides the local hour.
- **Console:** the line that follows the catalogue says where the position came from: `… your sky over 43.1°N 89.4°W · from your IP`, or `from your time zone` when the guess stands, or `from your device` after E21.
- **Privacy:** the position stays in the browser, and the readout shows 0.1 degree unless the visitor opted in (E21).

## E21. `L`, then click the readout: your exact position

With the labels on (E18), the `Live · ...` readout becomes a button: clickable and reachable by keyboard (Tab, Enter or Space). Nothing says so; the pointer cursor is the only cue. Activating it calls `navigator.geolocation.getCurrentPosition` with low accuracy, which makes the browser ask.
- **Allowed:** the sky glides to the exact position, shown to 0.01 degree in the readout. The second decimal of each coordinate fades in over about 0.8 s (in tabular lining figures, so nothing shifts) while the digits already there roll with the glide, so `43.1°N` becomes `43.07°N` calmly. Under reduced motion it swaps in at once. Everyone else sees one decimal (0.1 degree) throughout. It is remembered for this session only (sessionStorage in a try/catch), so a reload starts there and does not ask again. It never leaves the browser.
- **Declined, unavailable or failed:** nothing changes, and there are no messages.
- **Never on load:** the browser is only asked from this click.
- The readout is not focusable and stays hidden from assistive technology while the labels are off.

## E22. A click on the sky sets off a few meteors

Any click or tap on the hero background, meaning not on a link, button, field or the readout and not the end of a text selection, sets off a small burst of 2 to 4 thin, faint meteors radiating from roughly the click point, like a little shower radiant. It works on desktop and phones. A 0.7 s cooldown and a cap on active meteors stop rapid clicking from flooding the sky. Under reduced motion it does nothing. Shown, never explained.

## Out of scope here (planned separately)

- **The dynamic vCard:** waiting on Aaryush's depth decision.
- **The writing room:** waiting on prototype v2 feedback.
- **The essay ribbon on the home writing teaser:** depends on the writing room's localStorage format.
- **The string board, coffee rings and AI-assisted vCard notes:** parked.
