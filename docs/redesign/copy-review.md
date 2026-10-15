# Copy review: aaryush.com redesign

> Edit anything directly in this file. Replace an option list with the chosen wording. Delete nothing you want kept.

How to use this file: every block below has a **Source** (where the text lives), the **Current** text in full, and, where there are choices, a checklist. Tick one option (`[x]`) or write your own wording under "Own wording". Edit the Current text in place if you only want tweaks. When you are done, tell me and I will apply your wording to the source files exactly as written, then flip the draft flags.

Voice reminders (from the project notes): operator, not engineer; confident but not salesy; no "leverage AI", "unlock", "digital transformation"; no personal workflow details; no outbound content links; story over metrics.

Contents

- Part A: Draft blocks (the brief's list): 1 Hero, 2 About, 3 How AI fits, 4 Inside-link label, 5 Work intro lead, 6 Content files with `draft: true`
- Part B: New copy written during the build (not from the old live site): 7 Diagram titles and descriptions, 8 Hero figure caption and title block, 9 Section intros and headings, 10 Footer, 11 "Next" line, 12 404 page, 13 Other small UI labels, 14 Console note and keyboard map, 15 QR page and contact card, 16 Writing room copy

---

# Part A: Draft blocks

## 1. Hero

**Approved by Aaryush on 2026-10-14.** Final sequence (lead unchanged: "I build the systems behind"): how a problem gets solved / how problems get solved / how problems solve themselves / how teams solve problems, settling on "how *anyone* solves problems" (`anyone` in Instrument Serif italic; `settled = { before: 'how ', em: 'anyone', after: ' solves problems' }`). The options below are superseded.

**Source:** `aaryush/src/data/site.ts` (`site.hero`)

### 1a. Lead (fixed phrase before the rotating subject)

Current:

> I build the systems behind

### 1b. Rotating subjects (the `subjects` list)

Current (four phrases, each completes "I build the systems behind ___."; matches `site.hero.subjects`, the approved sequence above):

```
how a problem gets solved
how problems get solved
how problems solve themselves
how teams solve problems
```

The earlier option lists (A, B, C) are superseded by the approved sequence. The first subject is what the page shows before the rotator starts, and an e2e test (`hero.spec.ts`) checks it.

### 1c. Settled line (where the rotator comes to rest)

Approved: "I build the systems behind **how anyone solves problems**." Stored as three parts: before `how `, emphasized word `anyone`, after ` solves problems`.

```
before: "how "
em:     "anyone"
after:  " solves problems"
```

Edit here if you want different wording:

```
(settled line, with the italic word marked *like this*)
```

### 1d. Lede (paragraph under the rotator)

Current:

> Interesting people are the best part of this. Say hi.

**Approved by Aaryush 2026-10-14** (replaces the earlier lede). The eyebrow "AI Strategy & Organizational Design" was cut; the page title is now just "Aaryush Gupta".

### 1e. Eyebrow, site title and meta description (also in `site.ts`)

There is no eyebrow any more (the line "AI Strategy & Organizational Design" was cut on 2026-10-14).

Current page title (`site.title`):

> Aaryush Gupta

Current meta description (`site.description`; search results and link previews):

> I build the systems behind how anyone solves problems: operating models, decision architectures and AI systems for organizations in healthcare, finance, tech and beyond.

---

## 2. About (moved off the homepage; now the writing note "Once, for Good", see section 18)

**Source:** was `site.aboutArchive` in `aaryush/src/data/site.ts`, removed 2026-10-14 (nothing used it). The text below is kept here for the record.

Current paragraph 1:

> AI is becoming the infrastructure underneath how decisions get made, how expertise gets applied, and how teams create value. The organizations that see this early won’t just be faster. They’ll be built differently.

Current paragraph 2:

> That’s the work I do: finding the system underneath how an organization runs, then rebuilding it around AI so it handles a whole class of problems on its own. I’ve done it across healthcare, finance, hiring and education, inside companies and as an advisor.

Current paragraph 3:

> If you’re thinking about what AI means for how your organization actually works, I’d like to hear about it.

Edited version (leave blank to keep the current text):

```
(paragraph 1)

(paragraph 2)

(paragraph 3)
```

---

## 3. How AI fits

### 3a. Section intro

**Source:** `aaryush/src/components/home/Levels.astro` (the `h2` and `lead` in `.levels-head`)

Current heading:

> Four levels where AI changes an organization.

Current lead:

> Most problems show up at one level but are caused at another. I start by finding which level a problem actually lives at, then build there. Each level links to the work below that sits at it.

Edited version (leave blank to keep):

```
Heading:
Lead:
```

### 3b. The four levels

**Source:** `aaryush/src/data/levels.ts` (`title` + italic `em` form the heading; `body` is the paragraph)

**L.01** heading: *How the organization* **runs** (title "How the organization ", em "runs")

> Operating models and decision rights: who decides what, and which decisions a system can carry so people don’t have to.

**L.02** heading: *How work* **moves** (title "How work ", em "moves")

> The handoffs between people and AI: where judgment is needed, and where volume can be absorbed without anyone touching it.

**L.03** heading: *How things get* **built** (title "How things get ", em "built")

> Engineering and product processes rebuilt around AI, so more people can build and fewer steps wait on a specialist.

**L.04** heading: *What gets* **built** (title "What gets ", em "built")

> Products that only exist because AI does.

Note: L.03 and L.04 both end in the word "built" (how things get built / what gets built). Worth a glance on whether that reads as intended.

Edited version (leave blank to keep):

```
L.01 heading:
L.01 body:

L.02 heading:
L.02 body:

L.03 heading:
L.03 body:

L.04 heading:
L.04 body:
```

### 3c. "Seen in" chip labels (small)

**Source:** `aaryush/src/components/home/Levels.astro` (`chipLabels` and the "Seen in" label)

Current: the label "Seen in" precedes each level's links. Company chips read "Operating model" (Cylerity) and "Advisory" (Gupta Advisory); any other company chip reads "Overview". System chips use the system's title.

---

## 4. Inside-link label

**Source:** `aaryush/src/data/site.ts` (`companyLinkLabel`), used in `aaryush/src/components/home/Timeline.astro`. It is the link under each company's one-liner that opens the company pop-up.

Current: `Inside {name}` (example: "Inside Cylerity")

Options:

- [ ] **Inside {name}** (current)
- [ ] **The role** (same label for every company)
- [ ] **{name} in detail**
- [ ] **Own wording** (use `{name}` where the company name goes):

```
(your label)
```

---

## 5. Work intro lead

**Source:** `aaryush/src/components/home/Timeline.astro` (the `lead` under the "Work" heading)

Current heading (see also section 9):

> Companies, and the systems inside them.

Current lead:

> Each company in a sentence, then its systems, each one built to handle a whole class of work rather than a single case.

Edited version (leave blank to keep):

```
Lead:
```

---

## 6. Content files with `draft: true`

Ten files were drafts (five companies, five systems). **All ten were flipped to `draft: false` on 2026-10-14, after Aaryush approved all copy**, so `draft: true` now appears nowhere in `src/content/`. Each block below shows the frontmatter text fields (everything that renders as copy) and the body in full. Fields like `name`, `role`, `start`, `end`, `order`, `company`, `diagram`, `legend` kinds and `ogDescription` are listed where they affect what a visitor reads. Edit the quoted text in place.

Not drafts (already approved, no action): `systems/smartbenai.md`, `systems/univise.md`, `writing/bigger-than-electricity.md`, `writing/quiet-singularity.md`.

### 6.1 Gupta Advisory

**Source:** `aaryush/src/content/companies/gupta-advisory.md`

- name: Gupta Advisory
- role: AI strategy & systems advisory
- dates: Dec 2024 – present

**summary** (shown as a pull-quote on the timeline and as "The practice" in the pop-up):

> I work with organizations on how they should operate with AI, starting with how the business actually works, then targeted experiments that prove value fast.

**facts:**

- Role: Advisor
- Since: Dec 2024

**ogDescription** (link-preview text):

> How Aaryush Gupta works with organizations on what AI means for how they operate.

**Body** (shown under "How I work"):

> The model is simple. Someone reaches out with a problem. I spend real time understanding their business: not just the symptom, but what the organization actually looks like today and where the friction is.
>
> Then I come back with a few targeted solutions for quick experiments, ways to find value without a large upfront commitment. If we see ROI on day one, we commit to something larger. No lengthy proposals. No months of discovery before anything happens.
>
> The through-line is always the same: figure out where AI changes how the organization works, and design for that shift.
>
> I do my best work where decisions can move quickly. That's usually smaller teams, sometimes a focused group inside a larger company.
>
> The best first message is a rough picture of what you're trying to solve and how it's handled today.

Note: the last paragraph repeats the footer lead (section 10) almost word for word. Keep both, or change one.

### 6.2 Ready Rebound

**Source:** `aaryush/src/content/companies/ready-rebound.md`

- name: Ready Rebound
- role: AI & Engineering Lead
- dates: Dec 2025 – present

**summary:**

> A workers' comp platform that helps injured employees get back to work.

**owns** (title, then detail; shown as the numbered list under "What I own"):

1. **AI in every department:** The goal I care most about isn't in engineering at all. It's AI-driven efficiency across the whole company, with workflows redesigned around AI rather than AI added to old ones.
2. **Engineering:** I lead AI and engineering, manage the engineering team, and set the technical architecture.
3. **A new product:** I shaped a new product that cities are now adopting, built the system that builds it, and led the team that shipped it.

**facts:**

- Role: AI & Engineering Lead
- Since: Dec 2025

**ogDescription:**

> Aaryush Gupta's work as AI & Engineering Lead at Ready Rebound.

**Body:**

> The goal isn't to add AI to the workflow. It's to redesign the workflow around AI, in every department, not just engineering.

### 6.3 Cylerity

**Source:** `aaryush/src/content/companies/cylerity.md`

- name: Cylerity
- role: AI Lead
- dates: Jan 2024 – present

**summary:**

> A fintech-healthcare company that underwrites insurance claims and advances cash to healthcare providers, so they aren't waiting weeks to get paid.

**problem** (shown as "The problem space"):

> Providers can wait weeks for a claim to pay out. Advancing that cash means every funding decision has to be fast, explainable and compliant. A weeks-long claims cycle has to become a same-day decision without cutting corners on risk.

**owns:**

1. **Decision architecture:** How funding decisions get made, which ones a system makes on its own, and where a person decides.
2. **Compliance framework:** Designed so risk and compliance run in parallel with each decision, not after it.
3. **Operating model:** Redesigned so everyone in the company uses Claude Code and produces output independently, not just the engineers.
4. **Business-to-technical pipeline:** A structured path from a business need to something an engineer can build.

**facts:**

- Role: AI Lead
- Since: Jan 2024
- Arc: MVP → eight-figure lending facility

**ogDescription:**

> Aaryush Gupta's work as AI Lead at Cylerity, from MVP to an eight-figure lending facility.

**Body:**

> When I joined, Cylerity had a standard roadmap and a traditional way of building. I redesigned the operating model. Today everyone in the company uses Claude Code and produces output independently, and everything flows from business-level features down to technical implementation, step by step.
>
> That operating model took the company from MVP to an eight-figure lending facility.

### 6.4 Skale.win

**Source:** `aaryush/src/content/companies/skale.md`

- name: Skale.win
- role: Founding member, Product & Strategy
- dates: Jun 2024 – Feb 2026

**summary:**

> Co-founded an end-to-end career platform that helps people understand their strengths, upskill, and get matched to opportunities.

**facts:**

- Role: Founding member, Product & Strategy
- When: Jun 2024 – Feb 2026

**ogDescription:**

> Aaryush Gupta's work as a founding member of Skale.win.

**Body:**

> We set out to reconstruct what hiring is as a whole. The resume has been the standard for centuries, but it's a flat, low-resolution signal of what a person can actually do. We used higher-dimensional embedding models to capture real capability: not keywords on a page, but what someone is genuinely able to contribute.
>
> The platform covered everything a career needs: understand how to be better, upskill, and find the right opportunities. The business model was white-label and enterprise hiring.
>
> It was the first AI product I took end to end, from infrastructure to deployment, and it was received exceptionally well by the people using it to prepare for interviews.

### 6.5 Earlier (group)

**Source:** `aaryush/src/content/companies/earlier.md`

- name: Earlier (group heading on the timeline, labelled "Earlier work")
- dates: Mar 2023 – Jul 2024
- No body, no facts; it has no pop-up of its own. It groups the earlier systems (currently 6.9).

**summary:**

> The first products I built with AI, from the release of GPT-4 onward.

### 6.6 Cylerity: Claims underwriting

**Source:** `aaryush/src/content/systems/cylerity-underwriting.md`

- title: Claims underwriting
- company: Cylerity

**summary** (card on the timeline):

> Turns a weeks-long claims cycle into same-day funding decisions. Risk and compliance run in parallel, and providers see what was approved and why.

**outcome** (the "→" line on the card):

> Backs an eight-figure lending facility

**facts:**

- Input: Healthcare claims data
- Output: A same-day funding decision
- Result: Eight-figure lending facility

**Body:**

> Insurance claims took weeks to pay out, forcing healthcare providers into cash crunches that stalled operations and growth. No underwriting process existed to fix it.
>
> I designed the operating model end to end: how claims data enters, gets assessed, and produces a funding decision. Risk assessment and compliance run in parallel, which collapses weeks into hours, and a transparency layer shows providers exactly what was approved and why.
>
> The result is same-day decisions for providers, an underwriting operation that runs end to end, and an eight-figure lending facility.

### 6.7 Cylerity: Engineering intake

**Source:** `aaryush/src/content/systems/cylerity-intake.md` (has a diagram, see section 7)

- title: Engineering intake
- company: Cylerity

**summary:**

> Anyone in the company drops an idea into a shared Claude project. A conversation draws out what's needed and classifies it as an idea, tracked, or a scope, ready to build.

**outcome:**

> Retired a sprawling spreadsheet

**caption** (the "Fig." line under the diagram):

> Every request enters the same conversation; classification decides where it waits.

**legend** (labels under the diagram):

- Flow
- Revisited
- Feedback loop

**facts:**

- Input: Anyone in the company
- Interface: A shared Claude project
- Output: Idea (tracked) · Scope (ready to build)
- Replaced: A sprawling spreadsheet

**Body:**

> Engineering requests used to live in a sprawling spreadsheet. Half-formed ideas sat next to work that was ready to build, and scoping an idea depended on someone already knowing what it needed.
>
> Now anyone in the company drops an idea into a shared Claude project. A proactive conversation draws out what's actually needed, then classifies it: an idea, vague but tracked, or a scope, defined enough for an engineer to build. People focus on the ideas; the system handles the definition, and what ships feeds the next conversation.

### 6.8 Ready Rebound: Engineering loop

**Source:** `aaryush/src/content/systems/ready-rebound-loop.md` (has a diagram, see section 7)

- title: Engineering loop
- company: Ready Rebound

**summary:**

> An engineer hands it a ticket; it runs the full engineering process, from implementation and review passes to a documentation tree it keeps current, the PR, and QA in a real browser, pulling a person in only for decisions, specs and architecture.

**outcome:**

> Two people now ship what four did

**caption:**

> A ticket runs the whole process; a person is pulled back in only where judgment matters.

**legend:**

- A person
- Builds from the docs
- Back to a person

**facts:**

- Input: A ticket from an engineer
- A person: Decisions, specs, architecture
- Output: A reviewed PR, QA-tested in a real browser
- Result: Two people ship what four did

**Body:**

> An engineer hands the loop a ticket. From there it runs the full engineering process: implementation and review passes, a documentation tree it keeps current and builds from, the pull request, and QA in a real browser.
>
> A person is pulled in only where judgment matters: decisions, specs and architecture. Two people now ship what four did, and for smaller features that don't need architecture work, non-technical teammates open their own PRs.

### 6.9 Earlier: UMN Discovery Launchpad

**Source:** `aaryush/src/content/systems/umn-launchpad.md` (has a diagram, see section 7)

- title: UMN Discovery Launchpad
- company: Earlier (group)

**summary:**

> Replaced ad-hoc startup mentorship with a system that structures what each founder has already done, so the right people can help without relearning it.

**outcome:** none (no outcome line on this card)

**caption:**

> Founder materials become structure once, so nobody relearns what's already been done.

**legend:**

- Flow
- The Launchpad team
- Progress updates the profile

**facts:** none

**Body:**

> Founders and mentors were drowning in scattered information with no way to identify gaps or prioritize. Mentorship was ad-hoc, and the most useful help often arrived too late.
>
> Founders upload their documents and materials. The system builds the rubrics, structure and documentation of where that company actually stands, work that used to fall on people. Launchpad, the University of Minnesota's tech-transfer office, uses that picture to bring in the right people and the right support, without spending time relearning what's already been done.

### 6.10 Earlier: Univise (added after review round 1; was marked approved, carried over from the old site)

**Source:** `aaryush/src/content/systems/univise.md`

- title: Univise · company: Earlier (group) · order 1

**summary:**

> Built a university advising system that spread across campus through word of mouth. No marketing, no push, just a product that solved a daily problem.

**outcome:** Best pitch at Transcend

**Body:**

> Advising information was scattered across dozens of university pages and PDFs. Students couldn't find straightforward answers. Advisors were overwhelmed with repetitive questions.
>
> The core problem wasn't a lack of information but a lack of accessible information architecture. Univise surfaces answers in plain language with links to official sources, trust through transparency, and it spread organically because it solved a daily friction point every student experienced.
>
> It was adopted across campus through word of mouth alone and won best pitch at Transcend, proof that the right information architecture reshapes how an institution delivers a service.

### 6.11 Earlier: SmartBenAI (added after review round 1; carried over from the old site)

**Source:** `aaryush/src/content/systems/smartbenai.md`

- title: SmartBenAI · company: Earlier (group) · order 2

**summary:**

> Automated claims data extraction for healthcare TPAs while keeping humans in the loop where compliance demands it.

**outcome:** Compliance-first automation

**Body:**

> TPAs spent hours re-typing claim data from noisy scans. The process was slow and expensive, but compliance requirements made automation seem risky.
>
> Automation handles the volume and humans handle judgment. Confidence scoring flags low-certainty items for human review automatically, and the whole system was built around healthcare privacy requirements from day one.
>
> The result is clean, structured data with human oversight where it matters. Automation enhances accuracy instead of introducing risk.

### 6.12 Skale.win: Career platform (rewritten after review round 1; draft)

**Source:** `aaryush/src/content/systems/skale-platform.md` (has the technical diagram)

**summary:**

> AI interviews tailored to the job you want, feedback after every one, and a skills model that recommends jobs and aims the next interview at where you need the most help.

**caption:**

> Every interview sharpens the profile, and the person.

**facts:**

- Job data: Perplexity, structured from a job link
- Voice loop: Speech to text → OpenRouter → text to speech, under 500ms a turn
- Profile: Skills and preference embeddings
- Model: White-label & enterprise hiring

**Body:**

> Hiring runs on resumes: a flat, low-resolution signal of what someone can actually do.
>
> The platform started with an AI interview, a quick five minutes or a full thirty. A job link went through Perplexity and came back as structured requirements; without one, an industry or nothing at all was enough. The interview itself ran as a voice loop, speech to text into a model on OpenRouter and back out as speech, in under 500 milliseconds a turn, and every answer reshaped the next question. Each interview was scored on core competencies plus categories generated for that conversation, and the results became specific, actionable feedback and an embedded profile of the person's skills and preferences.
>
> That model recommended jobs and aimed the next interview at the weak spots. The more someone used it, the sharper their profile got, and the better they got.

---

# Part B: New copy written during the build

None of the text in Part B came from the old live site. It was written while building the redesign, so it needs your eye too. Same rule: edit in place.

## 7. Diagram titles, descriptions and labels

**Source:** `aaryush/src/data/diagrams.ts`. The `title` and `desc` are read aloud by screen readers (not visible on screen). Node and edge labels are drawn inside the diagram (shown in the table in capitals).

### 7a. Launchpad (UMN Discovery Launchpad), full detail

**title:**

> UMN Discovery Launchpad system diagram

**desc:**

> Founders upload their documents and materials. The system builds rubrics, structure and documentation of where each company stands. The Launchpad team uses that picture to bring in the right people and support, and progress feeds back into the profile so nothing is relearned.

**Input chips** (small tags above the first box): `DOCS`, `DECKS`, `NOTES`

**Boxes** (label, then sub-label):

| # | Label | Sub-label | Style |
| - | ----- | --------- | ----- |
| 1 | Founder materials | UPLOADED | normal |
| 2 | Structure built | RUBRICS · DOCS | normal |
| 3 | Where it stands | COMPANY PROFILE | normal |
| 4 | Launchpad team | RIGHT PEOPLE · SUPPORT | person (amber) |

**Arrows:** 1 → 2 → 3 → 4, then a feedback loop from 4 back up to 2, labelled `PROGRESS UPDATES THE PROFILE` (two lines in the drawing).

Edit labels here if you want changes:

```
Title:
Desc:
Input chips:
Box 1 / sub:
Box 2 / sub:
Box 3 / sub:
Box 4 / sub:
Feedback label:
```

### 7b. Intake (Engineering intake), brief

**title:**

> Engineering intake system diagram

**desc:**

> Anyone in the company starts a conversation in a shared Claude project. The conversation is classified as an idea, which is tracked and revisited as it sharpens, or a scope, which is ready to build and goes to an engineer. Shipped work feeds back to the people who asked.

Labels drawn: chips `OPS`, `FIN`, `SALES`; boxes "Anyone / IN THE COMPANY", "Conversation / SHARED CLAUDE PROJECT", decision "Classify", "Idea / TRACKED", "Scope / READY TO BUILD", "Engineer builds / SHIPS IT"; arrow labels `VAGUE`, `DEFINED`, `SHIPPED WORK FEEDS BACK`, `REVISITED AS IT SHARPENS`.

### 7c. Loop (Engineering loop), brief

**title:**

> Engineering loop system diagram

**desc:**

> An engineer hands over a ticket. A person sets the spec and decisions. The loop then implements and reviews in repeated passes, keeps the documentation tree current and builds from it, opens a pull request and QA-tests it in a real browser. It comes back to a person only for decisions, specs and architecture.

Labels drawn: chip `ENGINEER`; boxes "Ticket / FROM AN ENGINEER", "Spec & decisions / HUMAN", "Implement", "Review", "Docs tree updated / KEPT CURRENT", "PR opened", "Browser QA / REAL BROWSER"; arrow labels `PASSES`, `BACK TO A PERSON ONLY FOR DECISIONS & ARCHITECTURE`.

---

## 8. Hero figure caption and title block

**Source:** `aaryush/src/components/home/Hero.astro` (bottom strip of the hero, `.hero-foot`)

Current caption:

> **Fig. 1** — A system at rest. Each pulse is a piece of work moving through it.

Current title block (drawing-sheet style):

| Label | Value |
| ----- | ----- |
| Drawn by | A. Gupta |
| Sheet | 01 / 05 |
| Rev. | 2026.10 |
| Scale | 1 : company |

Edited version (leave blank to keep):

```
Caption:
Title block (label: value, one per line):
```

---

## 9. Section intros and headings

The small header strip on each section (a "§" number, a name and a "Sheet" note) is part of the drafting-sheet look. The big headings and leads are copy.

| Section | Strip | Heading | Lead | Source |
| ------- | ----- | ------- | ---- | ------ |
| Hero | none | (name) | see section 1 | `components/home/Hero.astro` |
| About | (removed: moved off the homepage; now the note "Once, for Good") | - | see section 2 | none (`site.aboutArchive` removed) |
| How AI fits | § 02 · How AI fits · Sheet 02 / 05 | Four levels where AI changes an organization. | see section 3a | `components/home/Levels.astro` |
| Work | § 03 · Work · Fig. 3.1 — Timeline, newest first | Companies, and the systems inside them. | see section 5 | `components/home/Timeline.astro` |
| Writing | § 04 · Writing · Sheet 04 / 05 | Notes on where this is going. | none | `components/home/WritingTeaser.astro` |
| Contact | § 05 · Contact · Sheet 05 / 05 | see section 10 | see section 10 | `components/SiteFooter.astro` |

Also: the levels diagram caption in the How AI fits section reads "**Fig. 2.1** — Zoom in or out." (**approved by Aaryush on 2026-10-14**; the earlier "Four levels, outside in" is superseded), and the Writing section has a link reading "All writing".

Edited headings (leave blank to keep):

```
How AI fits heading:
Work heading:
Writing heading:
```

---

## 10. Footer

**Source:** `aaryush/src/data/site.ts` (`site.footer`), rendered by `aaryush/src/components/SiteFooter.astro`. This block has its own draft flag (`site.drafts.footer`), currently `false`, so it is not blocking the release gate, but it is new copy.

Current heading:

> Let’s talk.

Current lead:

> The best conversations start half-formed.

**Approved by Aaryush 2026-10-14** (footer lead, replacing the earlier line).

Current drawing caption beside the footer graphic:

> **Fig. 5.1** — The loop, closed. Your turn.

Current bottom bar: "© {year} Aaryush Gupta", "Madison, WI · UW–Madison", "Back to top ↑" (location and school come from `site.location` and `site.education`).

Edited version (leave blank to keep):

```
Heading:
Lead:
Caption:
```

---

## 11. "Next" line on the timeline

**Source:** `aaryush/src/data/site.ts` (`site.next`), rendered at the top of the timeline in `aaryush/src/components/home/Timeline.astro`

Current (as shown):

> **Next** — contextOS. Coming soon.

Stored as `name: 'contextOS'` and `note: 'Coming soon.'`. The word "Next" is in the template.

Edited version (leave blank to keep; or write "remove" to drop the line):

```
Next line:
```

---

## 12. 404 page

**Source:** `aaryush/src/pages/404.astro`, copy in `aaryush/src/data/console.ts` (`notFound`). Rewritten in Task 23 as a "missing sheet" (see section 14).

Current:

- Strip: § 404 · Sheet not in set · Sheet — / —
- Heading: Sheet not in set.
- Register rows (each a link): 01 Hero, 02 How AI fits, 03 Work, 04 Writing, 05 Contact
- Struck-through row for the requested path (filled in by JavaScript; omitted without it): "Not issued"
- Browser tab title: Sheet not in set — Aaryush Gupta
- Meta description: This page doesn't exist.

Edited version (leave blank to keep):

```
Strip:
Heading:
Register labels:
Not-issued label:
```

---

## 13. Other small UI labels

**Source:** `aaryush/src/components/popup/JobView.astro`, `SystemView.astro`, `PopupShell.astro`, `Timeline.astro`

These are short labels inside the pop-ups and cards. Listed so nothing is a surprise; change only if one bothers you.

- Company pop-up section labels: "The company" (Gupta Advisory: "The practice"); "The problem space"; "What I own" (Gupta Advisory: "How I work"); "Systems built here"
- System rows and cards: "Open schematic" (has a diagram) or "Read" (no diagram)
- Timeline: the role column shows "Earlier work" for the Earlier group; breadcrumb reads "Work · {date range}"
- Pop-up chrome: "Back" (defaults to the parent company name), "Esc", "Close"
- Level tags on cards and pop-ups: `L1`–`L4`; in pop-ups they read e.g. "L1 — How the organization runs"

Edits:

```
(any label changes)
```

---

## 14. Console note and keyboard map

**Source:** `aaryush/src/data/console.ts` (`consoleNote`, `keyMap`, `notFound`). All draft (`site.drafts.consoleNote`, `keyboardMap`, `notFound`). Hidden details: nobody is told they exist, so keep them dry and short.

### 14a. Console note

Shown once per page load when DevTools is open. The ASCII drawing is the approved conversation loop: an idea, a conversation, spec, build and review, "not quite.", shipped.

**Approved by Aaryush 2026-10-14.** Replaces the earlier draft (under 8 lines, the Engineering loop). No contact details.

```
Hello, fellow inspector.

This site was built by talking.
No tickets. An idea, a conversation, and Claude, which asked
questions, drew options, built them, reviewed its own work,
and tried again until it felt right.
Most of the best parts came out of the back-and-forth.

Press ? for the keyboard map.
— ag.

   an idea
      |
      v
   a conversation <--------------+
      |                          |
      v                          |
   spec --> build <==> review    |
                 |               |
                 v               |
           "not quite." ---------+
                 |
                 v
              shipped
```

### 14b. Keyboard map labels

Opened with `?`. The last row appears only on pages with a time-of-day preview (the home field and the writing room).

Current:

- Title: Keyboard map. Hint: Esc to close. Button: Close
- ? : This map
- g h : Go to the hero
- g l : Go to how AI fits
- g w : Go to work
- g r : Go to writing
- g c : Go to contact
- t : Step the time of day

Edits:

```
(any label changes)
```

---

## 15. QR page and contact card

**Source:** `aaryush/src/data/site.ts` (`site.meet`; draft flag `site.drafts.qrCard`) and `aaryush/src/lib/vcard.ts` (the note's wording). Added in Task 26 (E6).

`/qr` is the page you use on your phone to make a QR that remembers where you met someone. Nothing on it is stored. The person who scans sees nothing on the page; the context only shows up in the note on the contact card they save.

### 15a. /qr labels

Current:

- Field label: Where. Placeholder: Madison AI Week
- Quick picks (one tap, deliberately vague): Coffee, Conference, Dinner
- Field label: Talked about. Placeholder: pricing AI agents
- Topic chips (built from the site, max 2): Gupta Advisory, the systems by name, Writing
- Clear control: Clear
- Caption when nothing is filled in: aaryush.com
- Caption when filled in (everyone near the screen can read it): Met at Madison AI Week · talked about Engineering loop, pricing AI agents

Edits:

```
(any label changes)
```

### 15b. Contact-card note

The note in the saved contact, built on the scanner's device from the context and their own clock. Topics appear by name; no links.

Current:

- With everything: Met at Madison AI Week · Wed, Oct 14, 2026 · Talked about: Engineering loop, pricing AI agents
- Where only: Met at Coffee · Wed, Oct 14, 2026
- No context at all (a plain Save contact): Saved Wed, Oct 14, 2026

Edits:

```
(any wording changes)
```

---

## 16. Writing room copy

**Source:** `aaryush/src/content/writing/bigger-than-electricity.md` and `aaryush/src/content/writing/quiet-singularity.md` (`why`, `breakdown`; both files are published, but these two new fields are draft copy); `aaryush/src/data/site.ts` (`site.drafts.writingRoom`, `site.drawer`). Added in the writing room plan, Task 1.

Each piece is an object on a desk. Its `why` line is written on the object, and its `breakdown` is the structure the object shows (letter folds, paper sections). Co-write each line with Aaryush before release.

### 16a. "Why I wrote this" lines

**Approved by Aaryush 2026-10-14: keep both current lines as written.**

Current:

- This Is Bigger Than Electricity (letter): I failed to explain this to my family for years. This is the attempt.
- The Quiet Singularity (paper): I kept seeing one loop in three different headlines, and nobody was naming it.

Edits:

```
(your text for each; keep it to one line)
```

### 16b. Breakdown phrases

**Approved by Aaryush 2026-10-14: keep current letter folds and paper sections.**

Letter: one phrase per fold, labels only. Paper: one label and one gist (five words or fewer) per section.

Current, letter (This Is Bigger Than Electricity):

- One app, one weekend
- It's already here
- We've seen this before
- The great experiment

Current, paper (The Quiet Singularity):

- The Shift: Systems now help build themselves
- Recursive Self-Improvement: Labs say models build models
- The Collapse of Cost: Frontier-class intelligence gets nearly free
- The Implication: Judgment becomes the scarce thing
- The Feedback Loop: Better tools build better tools
- The Institutional Gap: Institutions built for scarcity

Edits:

```
(any label or gist changes)
```

### 16c. Drawer

Current: the drawer holds only the contextOS folder. There are no draft entries (`site.drawer` is empty). Confirmed by Aaryush, 2026-10-14. The folder is decorative and doesn't open or link anywhere.

Edits: none unless drafts are added later. A drawer entry shows only a kind and a rough length, never a title.

### 16d. Night note

Current (shown at 21:00 to 07:00 only, handwritten on a paper note on the desk, never labelled):

- you're up late too.

Edits:

```
(keep or replace)
```

### 16e. Visible labels

Current:

- Pick up where you left off (on an essay page, and on the home writing teaser)
- forget (a quiet control on /writing that clears what the room remembers)
- " — section N" (appended to the pick-up link on a paper, e.g. "Pick up where you left off — section III"; letters have no suffix)
- " — card N" (the same link on a note, with an Arabic numeral, e.g. "Pick up where you left off — card 2"). **Approved by Aaryush on 2026-10-14.**
- writing I'm working on (the drawer's label)

Edits:

```
(any label changes)
```

### 16f. Page head

Source: `aaryush/src/pages/writing/index.astro` (draft, flag `site.drafts.writingRoom`).

Current:

- Heading (the page's only h1, styled small, quiet and centred like a kicker): Writing
- There is no other headline, sentence or hint on the page.

Edits:

```
(any changes)
```

---

## 17. Revision block and the writing room's 404

### 17a. Revision block (E14)

Source: `aaryush/src/data/revisions.ts`, shown from the hero title block's "Last deploy" cell.

**Approved by Aaryush 2026-10-14** (exact text; dates are year.month only). Regrouped to five rows (E, D, C, B, A) in the 2026-10-14 copy review, replacing the earlier seven (C to G):

| Rev | Date | Description |
| --- | --- | --- |
| E | 2026.10 | The sky overhead, live. |
| D | 2026.10 | The writing room. |
| C | 2026.10 | Systems you can open. A card that remembers. |
| B | 2026.02 | Repositioned around AI. The writing begins. |
| A | 2025.08 | Rebuilt in Astro. Works on phones. |

Column headers (Rev, Date, Description) come from the spec.

### 17b. The writing room's 404 (E16)

Source: `aaryush/src/pages/404.astro` (the room shows only for /writing/<unknown>). **"Not on the desk." approved by Aaryush on 2026-10-14.**

- Heading (the page's only h1, small and quiet like the desk's kicker): Not on the desk.
- Link: Back to the desk (from the spec)

Edits:

```
(any changes)
```

## 18. "Once, for Good" (the first note)

Source: `aaryush/src/content/writing/once-for-good.md` (kind `note`; four cards, one `##` section each). No subtitle.

**Approved by Aaryush 2026-10-14:** the body (word for word, four cards: One problem, A class of problems, The system, Everyone), the title, the "why" line and the breakdown.

- Title: Once, for Good
- Why: The short answer to 'so, how do you use AI?'
- Breakdown (label: gist):
  - One problem: why solve it twice?
  - A class of problems: the fixes start adding up
  - The system: a box that talks back
  - Everyone: people solve their own
- Summary (**approved 2026-10-14**): Solving the same problem twice never sat right with me. Here’s what AI changed about that.

Edits:

```
(any changes)
```

---

### 16e. Homepage night note (E7)

Approved 2026-10-14. It replaces "1. It's past nine. 2. So are you.", which didn't parse.

> GENERAL NOTES
> 1. It's past nine.
> 2. You're still here.
> 3. Good.

## Sign-off

- [ ] I have reviewed every block above.
- [ ] Blocks I want left exactly as they are: (list the section numbers)
- [ ] Anything I want to cut entirely: (list)

## 19. The sky's console line (DRAFT)

Source: `aaryush/src/lib/console-note.ts` (`buildSkyNote`). Logged once when the sky's full star catalogue lands, in the same two-style format as the DevTools note. **Draft, proposed in the controller's brief, not yet approved by Aaryush.** The line gets the count and the guessed place filled in:

`✦ 23,795 stars · Hipparcos via d3-celestial · your sky over 41.9°N 87.6°W · from your time zone` (the count is the real number of stars loaded for that visitor, and the ending is `from your connection` or `from your device` when the position came from there)

Edits:

```
(any changes)
```
