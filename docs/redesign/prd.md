# PRD: aaryush.com redesign

**Status:** Draft for review · **Date:** 2026-10-13 · **Owner:** Aaryush Gupta

Visual reference: [`reference/direction-d.html`](reference/direction-d.html) (approved direction, "Signal × Schematic"). [`reference/direction-a-schematic.html`](reference/direction-a-schematic.html) is kept for its hero background and diagram motion, which D borrows. Both are throwaway mockups: they show the look and behavior, not the final content or code.

---

## 1. Problem statement

aaryush.com was last updated in February 2026. It is a dark, single-page grid of cards that each open a pop-up. It looks templated, and every section works the same way, so nothing stands out. It was written as a sales page for advisory work. That isn't what the site is for anymore, and it says nothing about the systems Aaryush has built since then. The essays are hidden inside pop-ups with no address of their own. Shared links show a blank preview, because the preview image is an SVG.

The site should feel premium and leave a visitor with a clear sense of who Aaryush is as a builder.

## 2. Purpose and audience

**Audience:** founders, CEOs and VPs. Most arrive through a link or a QR code Aaryush shared himself, so they already have some context. A few arrive cold.

**Purpose:** visitors understand who Aaryush is as a builder and a professional. They want to talk to him because he's interesting and a valuable connection, not because they've been sold something.

**Internal brief.** This sentence is never shown on the site. Every page should make a visitor more likely to say something like it:

> "Whatever you're trying to do, it can be done (and should be done) with AI. He finds the system underneath it and builds it, at the scale of a whole company."

**Hidden thread:** Aaryush's work keeps widening who has access to a capability: students to advising, founders to mentors, providers to cash, non-engineers to building. The site hints at this visually and never states it as a headline or makes the structure depend on it.

## 3. Goals

1. **Premium feel.** Refined, calm, alive and precise, with subtle motion that is well made. It should take Apple-level polish without copying Apple.
2. **Show systems thinking instead of claiming it.** Each real system gets the same visual language: a schematic diagram that draws itself.
3. **Readable in 30 seconds.** A CEO can tell what Aaryush does and see how his career has progressed.
4. **Contact first on phones.** Someone who scans the QR code can save his contact details without scrolling.
5. **Writing that can grow.** Each essay has its own page with a well-crafted reading experience, and adding a new essay is easy. He expects to publish about every 1–2 months.
6. **Good share previews.** Every page shows a proper preview when the link is posted on LinkedIn, Slack or iMessage.

## 4. Non-goals

- Selling or proving work: no testimonials, no press, no client logos, no "taking clients" language.
- An LLM chatbot or "ask about me" assistant.
- A "Now" page.
- RSS or email subscriptions.
- A downloadable résumé PDF.
- Personal or non-professional content.
- A free-roaming interactive system map as the homepage. It may come back later as an optional easter egg. That isn't committed, and it's out of scope for this project.
- Naming internal tools or products. This includes the Ready Rebound engineering loop and the city product.

## 5. Voice and content rules

- **Positioning:** AI Strategy & Organizational Design. Aaryush builds systems that handle whole classes of problems by themselves.
- **Tone:** confident but never self-congratulatory, warm and direct, not salesy.
  - No buzzwords such as "leverage", "unlock", "transform" or "seamless".
  - The site must not imply "hire me".
- **Story over metrics.** Ratios that describe people are allowed, such as "two people now ship what four did". Throughput numbers and user counts are not.
- **Copy:** the current intent and content are kept, but wording can improve.
  - Every change of positioning or tone is agreed with Aaryush before it ships.
  - Copy drafted by Claude is marked as draft until he approves it.
- **Diagrams:** a diagram appears only where a real system exists. Entries without one get the story alone.

## 6. Experience

### 6.1 Site map

```
/                      Home (one scrolling page)
/work/<slug>           Job or system pop-up, opened over Home; also loads directly
/writing               Writing index (newest first)
/writing/<slug>        Essay page
/qr                    QR code page (kept as is; the URL must not change)
```

### 6.2 Home, top to bottom

1. **Hero**
   - **Content:** the name, a rotating line, one supporting line, and the contact actions:
     - Save contact (the vCard), then email, phone, LinkedIn and GitHub.
   - **Rotating line:** "I build the systems behind ___". The blank cycles through *general* subjects, not his specific projects, and settles on "…how organizations work."
     - The subject list is still open (see Open questions).
   - **Background:** a hairline schematic of nodes with right-angle connectors, with soft amber pulses travelling along them.
2. **About.** Two or three short paragraphs, rewritten from the current copy (see Open questions).
3. **How AI fits**
   - **Purpose:** explains the idea and also indexes the timeline. It gets real space on the page.
   - **The four levels:**
     1. How the organization runs
     2. How work moves
     3. How things get built
     4. What gets built
   - **Each level** has a short explanation and links to the systems in the timeline that show it.
   - **Hover:** the level's 1–4 meter fills step by step.
4. **Work timeline**
   - **Layout:** newest roles first. Dates sit on one continuous line along the left.
   - **Top of the timeline:** one subtle line, "Next: contextOS. Coming soon." It is not a card.
   - **Each company entry** shows the dates, the role, and what the company is and does, then its system cards. Every card is clickable.
   - **Entries in order:**

     | Entry | Dates | Role / note | Systems |
     |---|---|---|---|
     | Gupta Advisory | Dec 2024 – present | AI strategy and systems advisory | None. The entry exists so visitors know he consults. |
     | Cylerity | Jan 2024 – present | AI Lead | Claims underwriting; Engineering intake (diagram) |
     | Ready Rebound | Dec 2025 – present | AI & Engineering Lead | Engineering loop (diagram) |
     | Skale.win | Jun 2024 – Feb 2026 | Founding member, Product & Strategy | Career platform (no diagram) |
     | Earlier (2023–2024) | — | — | Univise → SmartBenAI → UMN Discovery Launchpad, in that order. Only Launchpad gets a light diagram. |

5. **Writing:** the latest 2–3 pieces, plus a link to `/writing`.
6. **Footer**
   - **Copy:** a "let's talk" line, plus the guidance "The best first message is a rough picture of what you're trying to solve and how it's handled today."
   - **Links:** the same contact actions as the hero.
   - **Details:** Madison, WI · UW–Madison (no years) · ©.

**Background across the whole page:** a faint structure (grid, section marks, occasional schematic fragments) runs under the page so it never looks empty. It must stay quiet and must not add visual clutter (see 6.6).

### 6.3 Pop-ups

There are two kinds, and both open over the homepage.

- **Job pop-up** (one per company): what the company is, the problem it works on, what Aaryush owns there, and links to the systems built there.
- **System pop-up** (one per system): a title, the company, the level tags, a vertical schematic diagram (only if a real system exists), and a short story of 2–3 paragraphs.

**Behavior for both:**
- Each has its own URL. Opening one directly loads the homepage with that pop-up open.
- Esc, the browser back button, the close button and a click on the backdrop all close it.
- Opening a system from inside a job pop-up slides the content across, and "← Company" returns to the job.

### 6.4 Content for each pop-up

Copy marked *existing* comes from the live site. Everything else is drafted from the interview and needs approval.

| Pop-up | Content |
|---|---|
| **Gupta Advisory** (job) | Existing description of how engagements work: understand the business deeply, run targeted experiments, then commit to something larger once there's ROI. <br>Best fit (approved): *"I do my best work where decisions can move quickly. That's usually smaller teams, sometimes a focused group inside a larger company."* <br>Before reaching out (approved): *"The best first message is a rough picture of what you're trying to solve and how it's handled today."* <br>No explicit availability statement. |
| **Cylerity** (job) | A fintech-healthcare company that underwrites insurance claims and advances cash to healthcare providers. Aaryush designed the decision architecture and the compliance framework. He redesigned the operating model so that everyone in the company uses Claude Code and produces output independently. Took the company from MVP to an eight-figure lending facility. |
| **Claims underwriting** (system) | Existing copy: same-day funding decisions, risk and compliance run in parallel, providers can see what was approved and why. |
| **Engineering intake** (system, diagram) | Anyone drops an idea into a shared Claude project. A conversation draws out what's needed and classifies it as an *idea* (tracked) or a *scope* (ready to build). It retired a sprawling spreadsheet: the thinking needed to scope an idea used to stay in people's heads, and the conversation now draws it out, so people can focus on the ideas themselves. |
| **Ready Rebound** (job) | A workers' comp platform that helps injured employees get back to work. Aaryush leads AI and engineering and manages the engineering team. The headline goal is AI-driven efficiency in every department, not just engineering. He shaped a new product now being adopted by cities, built the system that builds it, and led the team (one or two lines, unnamed, nothing public beyond that). <br>Cut: the tool-agnostic setup and the experiments repo. |
| **Engineering loop** (system, diagram) | A general description of loop engineering, with no names or skills. An engineer hands it a ticket, and it runs implementation and review passes, keeps a documentation tree current, builds from those docs, opens the PR and QA-tests in a real browser. A human is pulled in only for decisions, specs and architecture. Two people now ship what four or more did, and non-technical teammates open PRs for small features. |
| **Skale.win** (job + system) | Existing copy, dates only, and no explanation of why it ended. One addition: his first end-to-end AI product deployed to real users, received very well and genuinely helpful for people preparing for interviews. No diagram. |
| **Univise** | Existing copy. No diagram. |
| **SmartBenAI** | Existing copy. No diagram. |
| **UMN Discovery Launchpad** | Existing copy, plus a light diagram: founder documents are uploaded → the system builds rubrics, structure and documentation of where the company stands → Launchpad (UMN's tech-transfer office) uses that to bring in the right people and support → nobody has to relearn what's already been done. |

### 6.5 Writing

- **Index:** `/writing` lists every piece, newest first. Adding a piece is a single new file and needs no layout changes.
- **Essay pages** are built for long-form reading:
  - comfortable line length and strong typography;
  - a reading-progress indicator;
  - a share preview for each essay;
  - for the paper, numbered references and a PDF download.
- **Styling:** essay pages may take more of an editorial approach than the homepage, borrowing ideas like Stripe Press's for this format only. They still read as part of the same site.
- **Launch content:** "This Is Bigger Than Electricity" and "The Quiet Singularity", with their text unchanged.

### 6.6 Visual and motion direction

- **Base:** taken from Direction D.
  - **Palette:** near-black (#0A0B0E family) with hairline borders.
  - **Type:** Instrument Sans for body and interface text, JetBrains Mono for labels, Instrument Serif italic for the occasional single word.
  - **Accent:** one amber, used sparingly.
- **Hover:** an amber border highlight that follows the pointer.
- **Hero background and diagrams:** taken from Direction A, restyled.
  - Diagrams are always vertical.
  - They draw themselves in sequence, then the loop closes.
  - As the travelling dot passes each node, the node **briefly highlights and pulses**. A dot moving along a line is not enough by itself.
- **Fewer lines than D.** D has too many rules and dividers on top of the background grid. Cut dividers wherever spacing can do the job instead.
- **"More about [company]" link:** the wording changes, because it reads awkwardly. It gets emphasis through weight or treatment, not an underline.
- **Logo:** the top-left mark is replaced. The current amber square inside a white square is out. Options are still open (see Open questions).
- **Smooth page transitions** between Home, Writing and essay pages.
- **Dark mode is primary.** A light theme isn't required. Whether to offer one is an open question.

## 7. User stories

1. **Linked-in CEO:** "As a CEO who got Aaryush's link after an intro call, I want to see in under a minute what he does and how his career has progressed, so I can decide to keep the conversation going."
2. **QR scan:** "As someone who just scanned his QR code at an event, I want to save his contact details in one tap without scrolling, so I don't lose him."
3. **Curious reader:** "As a founder who's interested, I want to open a system and see how it actually works, so I understand how he thinks."
4. **Sharer:** "As someone who wants to introduce him to a colleague, I want to send a link straight to a specific system or essay and have it preview properly."
5. **Essay reader:** "As a reader who arrived from a shared essay, I want a comfortable reading experience and an easy way to find out who wrote it."
6. **Aaryush:** "As the owner, I want to add an essay or a system by editing content, not layout code."

## 8. Acceptance criteria

### Success

1. **Contact on phones:** on a 375×667 phone, Save contact and all four contact links are visible on first load without scrolling. Save contact downloads a valid vCard.
2. **Direct links to pop-ups:** visiting `/work/cylerity-intake` directly loads the homepage with that pop-up open.
   - Pressing back closes the pop-up and leaves the visitor on the homepage.
   - The same is true for every job and system slug.
3. **Pop-up coverage:** every company entry and every system card on the homepage opens a pop-up. None are stubs.
4. **Diagram motion:** each diagram draws in order when its pop-up opens, then loops. When the moving dot reaches a node, that node visibly highlights and pulses.
5. **"How AI fits" links:** each level's link scrolls to the right systems in the timeline. Hovering or focusing a level fills its meter one segment at a time.
6. **Writing index:** `/writing` lists both essays, newest first. Adding a third essay as one content file makes it appear on the index and on the homepage, with no layout change.
7. **Share previews:** every page and pop-up URL has an Open Graph image in PNG or JPG and a title and description specific to that page. Paste-preview checkers for LinkedIn and Slack show the correct preview.
8. **QR page:** `/qr` still works at the same URL.
9. **Performance:** Lighthouse on mobile scores at least 90 for Performance, 95 for Accessibility, 95 for Best Practices and 95 for SEO, on Home and on one essay page.
10. **Confidentiality:** nothing on the site names the Ready Rebound engineering tool or the city product.

### Failure handling

11. **Reduced motion:** with `prefers-reduced-motion: reduce`, there are no loops or animated reveals. Every animation shows its final, meaningful frame. The hero line shows the settled sentence.
12. **No JavaScript:** with JavaScript off, all content is still readable. Job and system URLs load as standalone pages instead of pop-ups, and contact links work.
13. **Bad URLs:** an unknown slug such as `/work/does-not-exist` or `/writing/nope` shows a 404 page that matches the site's design and links back home. It must not show a blank pop-up.
14. **Small screens:** there's no horizontal scrolling at any width from 320px up. Diagram labels are at least 12px on phones.
15. **Hidden tab:** background animations pause when they are scrolled off screen or the tab is hidden, so they don't keep using CPU.
16. **Keyboard use:** every interactive element can be reached with the keyboard and shows a visible focus state. Pop-ups trap focus while open and return focus to whatever opened them.

## 9. Known limitations

- **Content is the bottleneck.** Pop-up copy beyond the existing text needs Aaryush's review. Until it's approved, it ships marked as draft or not at all.
- **No CMS.** Essays and systems are content files in the repo, edited in code and published by redeploying, as today.
- **Animation on older devices:** older browsers fall back to simpler transitions. Page transitions degrade to an instant page change where the browser doesn't support them.
- **A pop-up as a standalone page** (opened with no JavaScript, or by some crawlers) won't have the same overlay feel.
- **Search engines:** the site is optimized for share previews and basic indexing. Ranking in search is not a goal.

## 10. Open questions

1. **Hero rotation subjects.** These should be general rather than specific to his projects, for example "how decisions get made / how work moves / how teams build / how products get made". To iterate during the build.
2. **Logo or mark.** Options to explore:
   - a monogram drawn as a schematic node;
   - a small mark of a self-closing loop;
   - the "AG" initials joined by a right-angle connector;
   - a wordmark only.
   I'll mock up 3–4 options during the build.
3. **Wording for the "More about [company]" link**, for example "Inside Cylerity →" or "The role →".
4. **Light theme:** offer a toggle, or ship dark only? (Dark only is recommended for launch.)
5. **Essay page styling:** how editorial or Stripe Press-like should essay pages be compared with the homepage? This will be settled with a mockup during the build.
6. **Root legacy files.** The old HTML, CSS and vCard files at the repo root appear unused. The live site matches the Astro build in `aaryush/`, so Vercel most likely builds that folder; this needs confirming in the Vercel dashboard. Delete them as part of this project?
7. **Rewrite of the About copy**, plus the "How AI fits" explanations. Both need drafting and review.
