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
  > 2. So are you.

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

## Out of scope here (planned separately)

- **The dynamic vCard:** waiting on Aaryush's depth decision.
- **The writing room:** waiting on prototype v2 feedback.
- **The essay ribbon on the home writing teaser:** depends on the writing room's localStorage format.
- **The string board, coffee rings and AI-assisted vCard notes:** parked.
