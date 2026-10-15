# Spec: the writing room

**Status:** approved in direction by Aaryush, 2026-10-14. Built from the throwaway prototype `portfolio-explorations/writing-desk-v2.html` plus his feedback on it.

**Scope:** this spec replaces the `/writing` index described in `prd.md` §6.5. It also adds two touches to the essay pages and to the home writing teaser.

## Intent

`/writing` should feel like stepping into his library room, not like reading a blog. It's his own take on Stripe Press, not a copy of it. This is the fun page: warm, dim and personal. The drawing language used elsewhere on the site doesn't belong here.

Each piece of writing is a physical object on a desk. The object's structure shows the piece's high-level breakdown, so visitors get something to chew on before they read.

## W1. The desk

- **Objects by kind:**
  - A **letter** is a folded sheet with one panel per part.
  - A **paper** is a stapled stack with one sheet per section.
  - A **note** is a clipped stack of warm index cards, one per card of the piece. Closed: a black binder clip at the top centre, a ruled front card with a thin red header rule under the title, and three stepped edges beneath it (each card wider than the one above, widest at the back). It shows the kind, the reading time, the title and the "why" line. Open (hover, focus, or the first phone tap): the cards fan out from the clip, slightly rotated, each showing its number, label and gist, and the widths even out. Matte, 2D at rest, the existing slow easing, and the breakdown is a real list for screen readers. Reduced motion shows the final frame.
  - **Other kinds** (essay, talk and anything later) are designed when the first one is published. Until then, an unknown kind renders as a plain single sheet, so nothing breaks.
- **Composition:** the objects sit in a tight, deliberate arrangement. There are no large empty gaps. They may be slightly rotated and must not overlap illegibly. The layout is deterministic: the same pieces always land in the same places, and it holds up from 2 pieces to about 15.
- **Grain and props:** the site's film grain applies to the room, **never to the objects**. Objects are matte and clean. No mug, and no lamp object.
- **Light:**
  - A pool of warm light settles on the hovered or focused piece.
  - Hover must be clearly noticeable: the piece lifts, straightens, brightens, and its breakdown opens.
  - Dust motes drift only inside the light pool, on a canvas that pauses when offscreen, when the tab is hidden, or under reduced motion.
- **Breakdown:** each piece's frontmatter carries `breakdown: [{ label, gist? }]`, three to six entries.
  - A letter shows one phrase per fold. Its **first phrase is faintly visible at rest**.
  - A paper fans out on hover into its sections, each with a heading and a gist of five words or fewer.
- **"Why I wrote this":** frontmatter `why`, one line.
  - It's written on the object in handwritten italic, faint like pencil at rest, and darkens as if freshly inked when the light lands.
  - It's always visible, so there's no hover dependency.
  - We co-write it with Aaryush whenever a piece is added. That's the workflow; the project CLAUDE.md records it.
- **Meta:** each piece shows its kind and its reading time. Reading time is computed from the word count at 230 wpm and rounded.

## W2. The room keeps the visitor's time

- **Periods:** these come from `src/lib/daypart.ts`, the same module the hero uses:
  - **Morning:** pale, cool window light falls across the desk.
  - **Afternoon:** softer than the prototype. It was too bright.
  - **Evening:** the window dims and the warm pool takes over.
  - **Night (21:00–07:00):** only the warm pool.
- **The night note:** at night, a small handwritten paper note sits on the desk reading "you're up late too."
  - It's never announced or labelled, and it catches the light when the pool passes near it.
  - During the day it doesn't exist in the DOM at all.
- **Testing hook:** `data-daypart` on `<html>` forces a period in tests, the same hook the hero uses.

## W3. The drawer: "writing I'm working on"

- **The drawer:** a desk drawer sits slightly open at the desk's edge. Focus or click slides it open.
- **Contents:**
  - a folder labelled **contextOS**;
  - the drafts listed in `site.ts` (`drawer: [{ kind, length }]`), shown as redacted papers that show only the kind and a rough length.
- **What it never shows:** titles or content of unpublished work.

## W4. Walking into a piece

Opening a piece is a real navigation to `/writing/<slug>`, using the site's cross-document view transitions, so the URL, back button and sharing all work. The transition depends on the kind:

- **Letter:**
  - **Opening:** it lifts and unfolds toward you, and the letter page appears.
  - **The signature:** at the end of every piece's essay page (letters, papers and notes), the "ag." mark writes itself once it scrolls into view. On a paper it sits after the last section and before the references. This reuses the logo draw-on; every piece ends with the signature.
- **Paper:**
  - **Opening:** the stack slides forward and the cover flips at the staple to reveal the page.
- **Reading progress (every kind, Task 49):** the same thin amber bar under the header on letter, paper and note pages. It has a small gap at each section break (a paper's `##` sections, a letter's folds, a note's cards) and the current section's stretch of the line is a little brighter. Breaks sit by cumulative word count, so a longer section takes more of the bar (a letter's folds are equal parts, the way memory reads a letter). The fill crosses each break just as that section's heading reaches the reading line. The old "two piles" for papers is gone.
- **Note opening, "the deal" (Task 49):** the binder clip lifts off, the cards slide out of the stack and settle down the screen in a column, each a little wider than the last, then the essay page fades in and each card resolves into its section mark. On phones (below 560px) this is done on the desk by `scripts/walk-in.ts`, like the letter and paper (about 1.3s end to end); on wider screens it is a view transition (the stack is dealt downward, then the page), and the marks settle the same way. Reduced motion goes straight to the page.
- **/writing on phones (Task 49):** at 700px and below, or on a coarse pointer, each piece has its own screen: centred in the viewport with its own pool of light, the moving light still following the centred piece. A faint drift of dust at the foot of the first screen invites a scroll (no words or arrows); it stops for good once the visitor scrolls, and is a still hint under reduced motion. Desktop is unchanged.
- **Note:** a plain page, like the letter's. At each card, a quiet section mark: the top edge of an index card (a faint hairline outline about 9px tall) with the number in amber and the label in mono. The mark widens with each card (58%, 70%, 84%, 100% of the text column, at every screen size). Reading progress, memory and "pick up where you left off" work by card, as they do by section on a paper.
- **Back:** browser Back returns to the desk with the piece back in place.
- **Reduced motion:** all transitions are instant.

## W5. The room remembers you

- **Storage:** only `localStorage` (`writing:v1`), wrapped in try/catch, per visitor. There is no backend and no analytics.
- **Behaviour:**
  - A piece you've opened before is left slightly pulled out of place, with a mark at the part you reached (a piece opened with no recorded progress is marked at part 1). The marks replace the old thin ribbon and are all decoration (aria-hidden):
    - **Paper:** an amber sticky flag (about 42x22, slightly rotated, with a darker adhesive strip and a small shadow) poking out of the right edge at the height of the section reached.
    - **Letter:** a faint amber thumbprint (broken concentric ellipses, about half opacity, slightly blurred) on the fold reached. It is a child of that fold's panel, so it rides the fold's own transform, and it sits under the text.
    - **Note:** the card reached is pulled out of the stack, down and to the right and slightly rotated, with a thin amber edge along its bottom. When fanned it stays a little further out than the others.
  - The essay page tracks the furthest section you reached.
  - Coming back to the essay page offers **"Pick up where you left off"**, which jumps to that section.
- **Forgetting:** a small, quiet "forget" control on `/writing` clears everything.
- **E8, the home writing teaser:** each started piece the teaser lists gets "Keep reading · section III" on its date line (a paper says "section" and a Roman numeral, a note "card 2", a letter "fold 2"), led by the amber dot; the link goes to that piece at the remembered section (`/writing/<slug>#pickup`, the essay page's own mechanism). Under about 400px the place drops off, leaving "Keep reading". The line never wraps and the section never changes height when it appears (asserted at 320, 360, 390, 412 and 1280). If a started piece is *not* listed in the teaser, one link at the foot reads "Pick up *Title*" (serif italic) for the most recently read of those; its line is reserved before first paint, and when every started piece is listed there is no bottom link. The desktop hover ribbon and the generic "Pick up where you left off" link are gone from the teaser (the essay page keeps its own prompt). Approved 2026-10-15.

## W6. Phones, no JS and accessibility

- **Phones:**
  - The objects stack vertically, and the light follows the piece nearest the centre of the viewport.
  - Tapping once opens the breakdown, and tapping again enters the piece.
  - The drawer sits at the bottom.
- **No JS:** a plain, fully working list of the pieces with title, kind, reading time, date, "why" line and link. The desk is progressive enhancement.
- **Accessibility:**
  - Each piece is a link named "Title — kind, N min read".
  - The breakdown is a real list that screen readers can reach.
  - The night note and dust are `aria-hidden`.
  - The keyboard focus order matches the visual order.
- **Contrast:** every readable label passes WCAG AA on its darkest surface. Amber is used only for small marks: the full stop, the memory marks, ribbons and one accent line.

## Acceptance criteria

1. **The desk:**
   - With two real pieces, the arrangement has no empty region larger than one object.
   - There's no mug.
   - The objects have no grain overlay; a computed-style or pixel test verifies this.
   - The letter's first phrase is visible at rest.
2. **Hover and focus** on a piece measurably change three things: its transform (lift), the light pool position, and the opacity of the "why" line.
3. **Night note:** it renders only for 21:00–07:00, including at the boundary hours, and is absent from the DOM in daytime.
4. **Opening a piece** navigates to its URL, and Back restores the desk with focus on that piece.
5. **Signature:** every piece's page draws the signature at the end (before the references on a paper). Every kind has the section-break reading bar.
6. **Remembering:** after reading a paper to section III and returning, the paper is pulled out with an amber flag at section III, and its page offers to pick up at III. "Forget" clears it, and so does storage throwing.
7. **No JS:** all pieces are listed, with working links.
8. **Reduced motion:** the page is static and lit, transitions are instant, there's no dust, and no animation loop is running.
9. **Unknown kind:** a piece with a kind the desk doesn't know renders as a plain sheet without errors.
10. **Quality bars:**
    - Lighthouse mobile on `/writing` scores ≥ 95 for performance and 100 for accessibility.
    - Axe passes.
    - The layout tests pass at 320, 375, 768 and 1280.
11. **Leaks:** no email or phone in the HTML. The confidentiality tests pass.

## Content to co-write before release

The breakdowns and "why" lines for the two real pieces start from the prototype's drafts. They're listed in `copy-review.md` §16 and are flagged as drafts until Aaryush and Claude finalise them together.

## Known limitations

- **One device only:** what the room remembers is per browser and per device. It's lost if storage is cleared, which is by design.
- **Unique kinds come later:** essay and talk get their own objects only when the first one is published.
- **Stored progress is approximate:** it's tracked by section, not by exact scroll position.
