# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio site for Aaryush Gupta at aaryush.com. The site's primary purpose is to be the first and only place someone needs to go to understand what Aaryush does and decide whether to reach out. Built with Astro. Active codebase lives in `aaryush/`. Root-level HTML/CSS files are legacy — do not edit them.

## Commands

All commands run from the `aaryush/` directory:

```bash
npm run dev       # Dev server at localhost:4321
npm run build     # Production build to ./dist/
npm run preview   # Preview production build locally
```

No tests or linting. Always run `npm run build` to verify changes compile.

## How We Work on This Site

This site was built through an iterative, collaborative process. The pattern matters for future work:

1. **Ask before building.** Content and positioning decisions require alignment. When Aaryush gives a direction, ask targeted questions before writing code. Understand the *intent* — not just the words.

2. **The site is self-contained.** It should not send people elsewhere to understand what Aaryush does. Contact links (email, phone, LinkedIn, GitHub) are fine as icons — they're entry points, not content destinations. No outbound content links. No "read my article" references. Everything someone needs is on this page.

3. **Story over metrics.** User numbers, throughput stats, and engineering metrics were deliberately cut. The narrative does the work. Impact pills on project cards are outcome-oriented ("Same-day decisions", "Viral campus adoption") not number-oriented.

4. **Short and scannable.** Every section was tightened through multiple rounds. Cards get one paragraph. Modals get 2-3 paragraphs of narrative. No bullet-point résumé language. A CEO scanning this in 30 seconds should know exactly what Aaryush does.

5. **Content changes go through conversation.** Don't guess at positioning, tone, or what Aaryush wants to emphasize. Ask. The voice and framing were refined over several iterations and reflect specific decisions about what to include, what to cut, and how to order things.

## Positioning & Voice

The site positions Aaryush as **AI Strategy & Organizational Design**.

- **Operator, not engineer.** Think: someone a CEO calls, not someone who submits pull requests. Role titles are reframed — his actual title at companies is "Lead AI Engineer" but the site uses "AI Lead", "AI & Engineering Lead", etc.
- **Confident but not salesy.** The site should make people think "I should reach out" without ever saying "hire me."
- **No buzzwords:** don't say "leverage AI," "unlock potential," "digital transformation," "paradigm shift."
- **Frame work as outcomes and operating model decisions**, not technical implementation.
- **No personal workflow details.** Don't mention things like "I don't write code by hand anymore." The perspective and credentials speak for themselves.
- **Target audience:** founders, CEOs, VPs — people thinking about what AI means for their organization.

## Content Structure

### About Section
Three tight paragraphs: (1) big-picture insight about AI and organizations, (2) what Aaryush does and light career arc, (3) open-door line. No essay energy. No personal proof points. Detached observation first, then shift to "I."

### Experience Section
Four roles, ordered intentionally:

1. **Gupta Advisory — AI Strategy & Systems** (Dec 2024 – Present) — FIRST because it's why most people visit the site. This is the advisory practice. Card describes the engagement model directly. Modal explains the full process: deep business understanding → targeted experiments → ROI on day one → commit to something larger.

2. **Ready Rebound — AI & Engineering Lead** (Dec 2025 – Present) — Workers' comp platform. Key concept: "Native AI Workflows" — a structured system where every team member can evaluate and adopt AI capabilities independently. Spec-driven development, tool-agnostic environment, V1 shipped on schedule.

3. **Cylerity — AI Lead** (Jan 2024 – Present) — Fintech-healthcare claims underwriting. Key story: redesigned the operating model so everyone in the company uses Claude Code and produces output independently. Structured business-to-technical pipeline. Eight-figure lending facility.

4. **Skale.win — Founding Member, Product & Strategy** (Jun 2024 – Present) — End-to-end career platform. Key insight: reinventing hiring using higher-dimensional embedding models to capture real capability. White-label and enterprise hiring. "Making meritocracy scalable."

All experience entries have clickable "More" buttons that open `<dialog>` modals with 2-3 paragraphs of narrative. No bullet points. No metrics grids. Story only.

### Selected Work (Projects)
Five projects in `src/data/projects.ts`. Each rendered as a card with a "More" button opening a modal. Modal structure: value one-liner → "The challenge" → "What I designed" (3 bullets) → "The outcome." No metrics grid — that was deliberately removed. Tech badges and filter chips remain for functional filtering but are secondary to the narrative.

### Areas of Focus
Four static capability cards (not clickable — deliberate design decision). Categories: AI Operating Model Design, Human-AI Workflow Architecture, Healthcare & Compliance Systems, Product Strategy & Delivery. Each has a title and one sentence that tells the reader what they get, not what the category means.

## Data Architecture

### Project data: `src/data/projects.ts`

Single source of truth for project content. Exports a typed `Project[]` array:

```typescript
type Project = {
    id: string;          // HTML element ID for modals and filters
    title: string;
    value: string;       // One-liner at top of modal
    problem: string;     // "The challenge" in modal
    result: string;      // "The outcome" in modal
    summary: string;     // Shown on card
    impact: string[];    // Gradient pills on card (outcome-oriented, no user numbers)
    stack: string[];     // Tech stack — only tags matching filterTags render
    details: string[];   // "What I designed" bullets in modal (max 3)
    links?: { label: string; href: string }[];
};
```

### Experience data

Experience entries are hardcoded in `index.astro` (not data-driven). Each entry has a card with a "More" button and a `<dialog>` modal with narrative paragraphs.

### Filter system

`index.astro` defines a `filterTags` array (~9 tech names). A project's `stack` entries are intersected with `filterTags` to produce visible badges (max 4) and `data-techs` attributes for the client-side filter. If adding a new project, its `stack` must overlap with `filterTags` or it won't be filterable.

## Client-Side Interactivity

Three scripts in `src/scripts/`, loaded by BaseLayout:

- **`motion.ts`** — IntersectionObserver scroll reveals (`[data-reveal]` elements), section visibility (triggers `::after` underline sweep), hero parallax. All skipped if `prefers-reduced-motion: reduce`.
- **`modals.ts`** — Click delegation on `[data-open-modal]` to open `<dialog>` by ID. Computes animation origin from nearest `.project-card` or `.card--link`. Close via `[data-close-modal]` or backdrop click with exit animation.
- **`filters.ts`** — AND-logic tech filter. Maintains a `Set<string>` of active tags. Cards with `data-techs` that don't match all active tags get `is-hidden`.

## Styling

- Dark theme: `--bg: #0B0B0F`, `--surface: #121218`, `--primary: #7C5CFF`, `--accent: #00E5A8`
- 12-column CSS Grid. Responsive breakpoints: 900px, 620px, 520px.
- BEM-like naming: `hero__text`, `card--link`, `modal__title`
- Hero contact links are icon-only (`hero__icon` class) — 36px circles with `currentColor` SVGs, purple glow on hover.
- `prefers-reduced-motion: reduce` disables all transitions/animations globally.

## Static Assets

- `public/Aaryush Contact Info.vcf` — vCard for "Download Contact Card" button
- `public/assets/HS Grad.jpg` — Headshot (URL-encoded as `HS%20Grad.jpg`)
- Various legacy images/SVGs in `public/assets/` — not all actively used

## Contact Information

- Email: aaryush@outlook.com
- Phone: (949) 331-2850
- LinkedIn: /in/aaryush
- GitHub: Aaryush1
- Location: Madison, WI
- Advisory practice: Gupta Advisory, LLC
