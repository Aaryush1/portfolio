# The homepage as a story: "I am the probe"

_Spec, 2026-10-15. Brainstormed with Aaryush. Branch `probe`. Status: **waiting for Aaryush's review**._

## 1. Intent

The homepage stops being a website you scroll and becomes one continuous experience that walks the visitor through it, like putting something on the TV. It is a small window into the vision in Aaryush's head, not a pitch.

**What the visitor should leave with:** this person thinks far beyond the next 5 or 10 years. They think about humanity, not themselves. Expansion into space is the next frontier, and AI is what gets us there. The reaction we're aiming for at the end: "holy shit, this is insane."

**The guiding concept:** a software engineer uploaded into a von Neumann probe. _We Are Legion (We Are Bob)_ is the north star for the **concept only**. The personality is entirely Aaryush's, not Bob's.

**Who the probe is stays open on purpose.** The visitor should feel they've been spawned as the probe. Over the loop they come to sense the probe may be Aaryush, or that they may be a copy. They never learn it for certain. That ambiguity is what sells the piece.

**Whether it reads as grandiose to a client doesn't matter.** Aaryush's words: "this is my personality." Visitors who want to know what he could do for them reach out, or go to /work.

## 2. Site structure

| Page | Becomes |
|---|---|
| `/` | The story (this spec). |
| `/work` | **New page:** the timeline, one full screen per job, and each scroll or swipe brings the next job. The existing `/work/<slug>` pop-ups stay. **Separate spec.** |
| `/writing` | It keeps its content, letters, notes and links, and is reached from the story through the wormhole. The room is restyled as **weightless (anti-gravity)**: objects drifting, with mass and pull instead of warm desk light. **Separate spec.** |
| `/card` (working name) | **New:** the contact page the QR code points to: the contact card, Save contact, and Continue to website (§6). |
| `/qr` | Unchanged, except that its code points to `/card` instead of `/`. |

**Build order:**
1. this spec;
2. throwaway mockups (the three thought shapes and the boot);
3. a rough 3D test of one camera move;
4. the homepage build;
5. /work;
6. the writing room restyle and the wormhole.

## 3. The experience

**One continuous shot:**
- The camera never cuts.
- There are no web-style animations or transitions: nothing fades in, slides or crossfades between scenes. The only motion is the camera, and things in the world appearing as the camera reaches them.
- No sound. Sound is parked as a separate later project.
- No scroll bar.

### The beats

| # | Beat | What happens | Shows up |
|---|---|---|---|
| 0 | **Boot** | The amber dot in the dark wakes up. A start-up sequence follows: you're a probe, you've just woken up. The waking is immediate, before takeoff. Then the real star map resolves above a figure on the ground. The sky is the visitor's real sky: their location and time (the current hero's engine and its precise-location opt-in). The figure can be read as the visitor, as Aaryush, or as the probe. | |
| 1 | **Liftoff**: intelligence stops being scarce | The camera rises off the ground. Thinking stops being the bottleneck: you talk, move your hands, and what's in your head becomes real. It stops feeling like work. | Memories |
| 2 | **Replication**: things that build things | Another one comes online. It doesn't just copy the self: the systems and structures in your head get replicated. Builders of builders. | Memories |
| 3 | **Drift**: the light-speed problem | The copies spread out. Light-cones grow too long to ask permission across. Each copy starts identical, then every decision bends it a little. What gets handed off, what stays yours? Alignment could end civilization or grow it, and nobody knows how to reach it. The influences are solveeverything.org (the best case) and _The Intelligence Curse_ (humans made irrelevant). **This beat stays unresolved.** | Transmissions, through the wormhole to /writing |
| 4 | **Bustle**: the Fermi question | Far out. The galaxy isn't quiet. It's bustling, full of us. So how is it just us? It's somber and lonely, but also proud: we did this ourselves. | |
| 5 | **Landing**: what stays human | The camera turns home to the night side of Earth. It isn't one figure; it's all 8 billion people barreling toward this together. We're at the landing stage *now*. The next 10–20 years decide the next billion. | |
| End | **The seam** | The camera pulls back until the period of "ag." is a single amber star. That same dot is the one that wakes up in beat 0, so the loop never shows a join. | Contact (§6) |

**Quiet extras, never explained:**
- the **T+** clock moves from seconds to millennia;
- a **Kardashev** readout creeps up from about 0.7;
- energy, scale and deep time live only here and in easter eggs, never as their own beats;
- **naming the copies** after things Aaryush loves is optional, and may never happen.

### Thoughts: what surfaces on screen

The probe is in a cockpit or interface exploring the universe. Words and fragments surface **the way thoughts pop into your head**:
- they appear wherever on the interface they arise, at irregular moments;
- tapping or clicking one opens more.

There are three kinds, and each has its own shape and character:

| Kind | Character | Tap → |
|---|---|---|
| **Log line** | The probe thinking: terse, instrument-like, anchored to what it's looking at. | Expands the thought. |
| **Memory** | A visual fragment with no words, e.g. Cylerity. It's partial and slightly out of focus, like recollection. Ignored, it's a flashback in the story. | That job on `/work`. |
| **Transmission** | A signal with a direction and a source in space. | The wormhole into the writing room, to that piece. |

Their look is decided by mockups (build step 2), not by this spec. Under the hood they are real text and links.

### Pace and control

- **Visitor-paced, directed.**
  - Each beat stays until its idea has landed.
  - Then a quiet sign invites the visitor to move on.
  - If they don't, it carries on by itself after about 20 seconds of idle.
- One full loop runs about 3–5 minutes or more. Content and feel set the length, not a target time.
- One gesture (wheel, swipe, arrow key or tap) moves **exactly one beat**, forward or back. A short cooldown stops a hard flick skipping several beats.
- A small corner mark ("ag.") opens an index that jumps to any beat. Links to /work and /writing are always one tap away.
- The usual site header is hidden on the homepage and stays on every other page.
- Phone and desktop get **the same experience**, adapted only for fit and detail.

## 4. The words

These rules are firm:
- **No line ships that Aaryush hasn't said or approved.**
- Claude writes **intent notes** per beat (what happens, what should land, the idea underneath, questions), and **never** tries to imitate his voice.
- Each beat is then **talked out** with Aaryush, and the lines come from what he says.
- Raw material so far, in his words: on waking, "What the fuck? Wait, this is kind of cool, actually. Hold on, what can I do?"; on the spark, his work turning into conversation; on replication, leverage; on drift; on Fermi, "how is it just us?"; on landing, "the next 10 years… will determine the next billion." (Full answers are in the session transcript.)
- Copy approval is recorded in `copy-review.md` as usual.
- The site's voice rules still apply. "Leverage" is on the banned-buzzword list, so the replication beat has to say it some other way, and that's for the talk-out.

## 5. How it's built

- **Shell:** Astro stays. `/` is one full-screen page with two parts:
  - **WebGL (Three.js):** sky, flight, galaxy, Earth, and faint navigation and cartography line work in the site's drawing language. It's present but never strong.
  - **Thoughts:** HTML elements placed over the scene (§3).
- **Story data:** one data file, with beats, camera waypoints, which thoughts appear where and when, intent notes and approved lines. Content edits don't touch code.
- **Director:** a pure module, unit tested, that owns:
  - the timeline position along one continuous camera path;
  - one-beat steps, back and forth, with the cooldown;
  - the idle carry-on and the loop seam.

  Rendering only reads from it.
- **Stars:** real measured distances for every catalog star (parallaxes from Hipparcos and Gaia), so flying between stars is true. Only the galaxy-wide view, beyond any catalog, is generated. Location, time, the projection maths and the tiles carry over from `src/lib/sky/`.
- **Loading:**
  - The first frame (the amber dot and the first boot line) is in the initial HTML and is the LCP element.
  - Everything heavy (Three.js, distances, galaxy, Earth) streams in during the boot, which is the loading screen without looking like one.
  - Heavy is fine. It has to start fast and be smooth once loaded.
- **Removed from the homepage:**
  - Fig. 2.1 (PR #19, if merged);
  - the timeline (its content moves to /work);
  - the writing teaser;
  - the contact block (it moves into the story, §6).
- **Shipping:** built on `probe`, with Vercel previews along the way. It replaces the live homepage only when Aaryush says so.

## 6. Contact (must keep)

The contact card's **Save contact**, including its custom contact save (the vCard from `src/lib/vcard.ts` and `ContactActions`), must exist in the new homepage.

**Why it has to be on the first frame.** Most visitors arrive by scanning Aaryush's QR code in person (CLAUDE.md, "The QR moment"). They save his contact, put the phone away, and watch later. A 3–5 minute story can't stand between them and Save contact.

**Placement (Aaryush's call, 2026-10-15):**
- **A contact page of its own.** The QR code is generated on `/qr`, so it simply points here instead of at `/`. The page carries the same details the QR adds today, so the custom contact save works exactly as now. It shows the contact card, **Save contact**, and **Continue to website**, which goes into the story.
  - QR visitors save and leave in one tap, with nothing in the way.
  - The story's boot stays pure: nothing on it but the waking.
  - The page lives in the same world: the amber dot and the dark, so Continue reads as the dot waking up.
  - Working path: `/card`. The name is open.
- **Always reachable** from the corner mark on `/`.
- **In the ending,** as the story's way to make contact, before the seam.
- **`/qr`:** the generated QR link changes from `/` to the contact page. Nothing else changes.
- **Printed codes:** any already-printed code that points at `/` keeps working and lands in the story. Contact is still one tap away from the corner mark.

**Unchanged rule:** the email address and phone number are never in served HTML or JS (they're assembled at runtime as today).

## 7. Acceptance criteria

**Must:**
1. The boot frame paints within the current homepage's LCP (about 2.7 s on Lighthouse's phone test), with a Lighthouse performance score of 90 or more.
2. Once loaded, it holds a steady 60 fps on desktop and a recent phone.
3. The camera never cuts or jumps, including at the loop seam.
4. Exactly one beat per gesture, forward or back, on wheel, swipe, keys and tap. A fast wheel or flick moves one beat.
5. After about 20 seconds of idle it continues by itself, and it loops through the dot seam.
6. Every memory opens the right job on /work, and every transmission opens the right piece in the writing room. Back returns to the same beat.
7. Save contact works from the contact page and from `/` (the vCard downloads with the custom fields), and a QR scan lands on the contact page.
8. The same story plays on phone and desktop.
9. The index jumps to any beat. /work and /writing are reachable in one tap from any moment.

**Must refuse:**
- a scroll bar on `/`;
- any way to get stuck, with exits always one tap away;
- sound;
- skipping more than one beat per gesture;
- shipping a line Aaryush hasn't approved;
- the email or phone in served HTML or JS.

**Nice to have, not required:**
- no-JS, reduced-motion and no-WebGL versions (a plain or still-frame version of the story);
- keeping existing easter eggs: as many as possible without losing value (sky labels `L`, speed `[`/`]`, meteors, the precise-location opt-in), plus the new readouts.

## 8. Known limits

- The first visit downloads a lot. It's cached afterward.
- Old phones get reduced detail.
- The galaxy beyond the catalog is generated, not charted.
- The usual 3D-on-the-web caveats apply: battery use on phones, and browsers that block WebGL fall back (or, since that's nice-to-have, may get a basic version).
- Search engines see the server HTML, which is thinner than today's homepage unless the plain version (nice-to-have) is built.

## 9. Changes to standing rules

These are approved in this brainstorm, and CLAUDE.md is updated when the build lands:
- **Reduced motion:** CLAUDE.md says "everything shows its final frame." On `/` this becomes nice to have, not a rule.
- **The homepage drawing language:** the section strips, the title block and "Sheet NN / 05" go away with the sections. Faint cartography and navigation line work carries the drawing language into the story.
- **Never trap scrolling:** this still holds, in a new form. There is no page scroll on `/`. The gestures step the story, and exits are always one tap away.

## 10. Open for later

- Sound, as its own creative project.
- Naming the copies.
- The contact page's name and look (§6), shown with the boot mockups.
