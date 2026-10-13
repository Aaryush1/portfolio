# aaryush.com Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild aaryush.com as the "Signal × Schematic" design. The homepage tells the story through systems: a career timeline, job and system pop-ups that have their own URLs, schematic diagrams that animate themselves, and an essay section that can grow.

**Architecture:**
- **Framework and content:** Astro 5, built as a static site. Content lives in Astro content collections: `companies`, `systems` and `writing` as Markdown with typed frontmatter. Small TypeScript data modules hold site copy, the four levels and the diagram specs.
- **Pop-ups as pages:** every `/work/<slug>` URL is a real static page. It renders the homepage with that pop-up already open, so the pop-ups work without JavaScript and every one can be linked to. Client-side scripts add the History API overlay behavior, the diagram animation and the hero motion on top.
- **Pure logic:** timeline ordering, routes, levels and diagram geometry live in `src/lib/` and are unit-tested with Vitest. The behavior in the acceptance criteria is tested end to end with Playwright against the production build.

**Tech Stack:**
- Astro 5.17 and TypeScript (strict).
- Self-hosted fonts from `@fontsource`: Instrument Sans, Instrument Serif and JetBrains Mono.
- `satori` and `@resvg/resvg-js` to generate the Open Graph PNGs at build time.
- Vitest for unit tests and `@playwright/test` (with `@axe-core/playwright`) for end-to-end tests.
- Hosting stays on Vercel (static).

**Spec:** [`docs/redesign/prd.md`](prd.md). Visual reference: [`docs/redesign/reference/direction-d.html`](reference/direction-d.html), called **REF-D** below. Line numbers in this plan refer to REF-D as committed in `953695f`.

---

## Global Constraints

- All app code lives in `aaryush/`. Every command runs from `aaryush/` unless it says otherwise. Don't edit the legacy files at the repo root; removing them is optional Task 17.
- **Dark only.** There's no light theme and no theme toggle.
- **Palette** (copied from REF-D lines 17–41):
  - backgrounds `--bg:#0A0B0E`, `--s1:#0E1015`, `--s2:#12151B`, `--s3:#171A22`;
  - text `--text:#E6E7EA`, `--text-2:#A0A4AE`, `--text-3:#7D828E`;
  - accent `--accent:#F2B544`;
  - lines `--line:rgba(255,255,255,.08)`, `--line-2:rgba(255,255,255,.13)`, `--line-3:rgba(255,255,255,.22)`.
- **Fonts:** Instrument Sans (body and interface), JetBrains Mono (labels and metadata), and Instrument Serif italic for one emphasized word at a time. All self-hosted; no requests to `fonts.googleapis.com`.
- **Never use the word "Orchestra"**, and never name the Ready Rebound city product, anywhere in source or output.
- **Voice:**
  - No buzzwords ("leverage", "unlock", "transform", "seamless").
  - No "hire me" and no availability statements.
  - No testimonials.
  - No metrics except people ratios such as "two people now ship what four did".
- **Drafts:** copy that Claude wrote or changed ships as `draft: true` until Aaryush approves it in Task 13. Copy carried over unchanged from the live site is `draft: false`.
- **Diagrams** appear only for `cylerity-intake`, `ready-rebound-loop` and `umn-launchpad`, and are always vertical.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, nothing loops or reveals; every animated element shows its final frame.
- **Progressive enhancement:** without JavaScript, all content is readable, links to `/work/<slug>` load standalone pages, and the contact links work.
- **Layout:** no horizontal scroll at any width from 320px up. Diagram labels are at least 12px on a 375px screen.
- **`/qr`** keeps its URL.
- **Accounts:** commits use the repo's local identity, which is already set to `Aaryush1 <aaryush@outlook.com>`. Push only in Task 16, using the Aaryush1 token (see the global CLAUDE.md).
- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

These are the failure modes most likely to reach a real visitor that no single task's main tests cover. Each one has a test in the task that owns the code.

1. **Back after a direct link.** A visitor opens a shared `/work/<slug>` link, closes the pop-up and presses Back. They expect to stay on aaryush.com, not be thrown back to wherever they came from. *(Task 6, `popups.spec.ts` › "direct link then back stays on site")*
2. **A double-click or quick re-click on a card** must not push two history entries or leave a pop-up open with nothing in it. *(Task 6, `popups.spec.ts` › "double click opens once")*
3. **Modifier clicks** (Cmd/Ctrl-click, middle-click) on a card should open `/work/<slug>` in a new tab, as a normal link does, and not hijack the current tab. *(Task 6, `popups.spec.ts` › "modifier click is not intercepted")*
4. **Opening, closing and reopening pop-ups repeatedly** must not pile up diagram animation loops, which would make pulses speed up or burn CPU. *(Task 7, `diagram.spec.ts` › "reopening does not stack loops")*
5. **A diagram in a background tab** must pause, not keep consuming CPU. *(Task 7, `diagram.spec.ts` › "pauses when hidden")*

---

## File Structure

```
aaryush/
├── astro.config.mjs                 (modify) site, sitemap, prefetch off
├── package.json                     (modify) deps + scripts
├── vitest.config.ts                 (create)
├── playwright.config.ts             (create)
├── public/
│   ├── Aaryush Contact Info.vcf     (modify) refresh REV, add URL
│   ├── favicon.svg                  (replace in Task 12)
│   ├── og-image.svg                 (delete in Task 10)
│   └── quiet-singularity.pdf        (keep)
├── src/
│   ├── content.config.ts            (create) collections + schemas
│   ├── content/
│   │   ├── companies/*.md           (create) 5 files
│   │   ├── systems/*.md             (create) 7 files
│   │   └── writing/*.md             (create) 2 files
│   ├── data/
│   │   ├── site.ts                  (create) contact, hero, about, footer copy
│   │   ├── levels.ts                (create) the 4 levels + refs
│   │   └── diagrams.ts              (create) diagram specs
│   ├── lib/
│   │   ├── timeline.ts              (create) ordering, ranges, numbering
│   │   ├── levels.ts                (create) levelsFor()
│   │   ├── routes.ts                (create) parseWorkPath()
│   │   ├── diagram.ts               (create) types + geometry
│   │   └── og.ts                    (create) OG PNG renderer
│   ├── layouts/
│   │   ├── BaseLayout.astro         (rewrite)
│   │   └── EssayLayout.astro        (create)
│   ├── components/
│   │   ├── Seo.astro                (create)
│   │   ├── SiteHeader.astro         (create)
│   │   ├── SiteFooter.astro         (create)
│   │   ├── Mark.astro               (create in Task 12)
│   │   ├── ContactActions.astro     (create)
│   │   ├── Icon.astro               (create) inline SVG icon set
│   │   ├── HomePage.astro           (create) composes the home sections + popup shell
│   │   ├── home/Hero.astro          (create)
│   │   ├── home/About.astro         (create)
│   │   ├── home/Levels.astro        (create)
│   │   ├── home/Timeline.astro      (create)
│   │   ├── home/WritingTeaser.astro (create)
│   │   ├── popup/PopupShell.astro   (create)
│   │   ├── popup/JobView.astro      (create)
│   │   ├── popup/SystemView.astro   (create)
│   │   └── SystemDiagram.astro      (create)
│   ├── pages/
│   │   ├── index.astro              (rewrite)
│   │   ├── work/[slug].astro        (create)
│   │   ├── writing/index.astro      (create)
│   │   ├── writing/[slug].astro     (create)
│   │   ├── og/[...route].png.ts     (create)
│   │   ├── 404.astro                (create)
│   │   └── qr.astro                 (rewrite, same URL)
│   ├── scripts/
│   │   ├── site.ts                  (create) header state, reveal, pointer glow, index flash
│   │   ├── levels.ts                (create) meter fill
│   │   ├── hero-rotator.ts          (create)
│   │   ├── hero-schematic.ts        (create)
│   │   ├── popups.ts                (create)
│   │   ├── diagram.ts               (create)
│   │   └── reading-progress.ts      (create)
│   └── styles/
│       ├── tokens.css               (create)
│       ├── base.css                 (create)
│       ├── diagram.css              (create)
│       └── essay.css                (create)
└── tests/
    ├── unit/*.test.ts
    ├── release/drafts.test.ts
    └── e2e/*.spec.ts
```

Delete in Task 5, once nothing imports them: `src/styles/global.css`, `src/scripts/motion.ts`, `src/scripts/modals.ts`, `src/scripts/filters.ts`, `src/data/projects.ts`.

---

### Task 1: Tooling, dependencies and test harness

**Files:**
- Modify: `aaryush/package.json`, `aaryush/astro.config.mjs`
- Create: `aaryush/vitest.config.ts`, `aaryush/playwright.config.ts`, `aaryush/tests/unit/sanity.test.ts`, `aaryush/tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `npm test` (unit), `npm run test:e2e` (Playwright against `astro build && astro preview` on port 4322), `npm run test:release` (draft gate), `npm run check` (astro check).

- [ ] **Step 1: Install dependencies**

```bash
cd aaryush
npm install @fontsource/instrument-sans @fontsource/instrument-serif @fontsource/jetbrains-mono
npm install -D vitest @playwright/test @axe-core/playwright satori @resvg/resvg-js @astrojs/check typescript
npx playwright install chromium
```

If `astro` fails with `Cannot find module @rollup/rollup-win32-x64-msvc`, the lockfile is missing the Windows native package. Run `npm install` once more with the new dependencies; if it still fails, delete `node_modules` and run `npm install` (keep `package-lock.json`).

- [ ] **Step 2: Add scripts to `package.json`**

Replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro",
  "check": "astro check",
  "test": "vitest run tests/unit",
  "test:release": "vitest run tests/release",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/release/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4322', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 5: Write the sanity unit test and the smoke e2e test**

`tests/unit/sanity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

`tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home responds and names Aaryush', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aaryush Gupta');
});
```

- [ ] **Step 6: Run both suites**

Run: `npm test` → Expected: 1 passed.
Run: `npm run test:e2e` → Expected: 1 passed (the current site still has an h1 "Aaryush Gupta").

- [ ] **Step 7: Commit**

```bash
git add aaryush/package.json aaryush/package-lock.json aaryush/vitest.config.ts aaryush/playwright.config.ts aaryush/tests
git commit -m "chore: add vitest, playwright, fonts and OG tooling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Design tokens, base layout, header, footer, contact actions

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/data/site.ts`, `src/components/Seo.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/components/ContactActions.astro`, `src/components/Icon.astro`
- Rewrite: `src/layouts/BaseLayout.astro`, `src/pages/index.astro` (temporary minimal body)
- Modify: `public/Aaryush Contact Info.vcf`
- Test: `tests/e2e/layout.spec.ts`, `tests/e2e/contact.spec.ts`

**Interfaces:**
- Produces:
  - `site` (from `src/data/site.ts`), shape below.
  - `<BaseLayout title description ogImage? path?>` with a default slot. It adds the `js` class to `<html>`, loads the fonts and the base CSS, and renders `SiteHeader` above the slot and `SiteFooter` below it.
  - `<ContactActions variant="hero"|"footer">`.
  - `<Icon name="card"|"mail"|"phone"|"linkedin"|"github"|"arrow-right"|"arrow-down"|"arrow-up-right"|"back"|"close">`.

- [ ] **Step 1: Write the failing e2e tests**

`tests/e2e/layout.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const widths = [320, 375, 768, 1280];
const paths = ['/'];

for (const path of paths) {
  for (const width of widths) {
    test(`no horizontal scroll on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('fonts are self-hosted', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('footer shows location and school without years', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('[data-footer-meta]');
  await expect(bar).toContainText('Madison, WI');
  await expect(bar).toContainText('UW–Madison');
  await expect(bar).not.toContainText(/UW–Madison[^·]*\d{4}/);
});
```

`tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('vCard downloads and contains contact details', async ({ request }) => {
  const res = await request.get('/Aaryush%20Contact%20Info.vcf');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('BEGIN:VCARD');
  expect(body).toContain('aaryush@outlook.com');
  expect(body).toContain('URL:https://aaryush.com');
});

test('contact links work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:aaryush@outlook.com');
  await expect(footer.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+19493312850');
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/aaryush');
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Aaryush1');
  await expect(footer.getByRole('link', { name: 'Save contact' })).toHaveAttribute('href', '/Aaryush%20Contact%20Info.vcf');
  await context.close();
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/layout.spec.ts tests/e2e/contact.spec.ts`
Expected: FAIL. The current site loads Google Fonts, has no `[data-footer-meta]`, the vCard has no `URL:` line, and the footer links use `href="#"`.

- [ ] **Step 3: Create `src/data/site.ts`**

```ts
export const site = {
  name: 'Aaryush Gupta',
  url: 'https://aaryush.com',
  title: 'Aaryush Gupta — AI Strategy & Organizational Design',
  description:
    'I build the systems behind how organizations work: operating models, decision architectures and AI systems across healthcare, finance and tech.',
  eyebrow: 'AI Strategy & Organizational Design',
  hero: {
    lead: 'I build the systems behind',
    subjects: ['how decisions get made', 'how work moves', 'how teams build', 'how products get made'],
    settled: { before: 'how ', em: 'organizations', after: ' work' },
    lede: 'I look for the system underneath how a company works, then rebuild it with AI, so it handles a whole class of problems on its own, not just the one in front of it.',
  },
  about: [
    'AI is becoming the infrastructure underneath how decisions get made, how expertise gets applied, and how teams create value. The organizations that see this early won’t just be faster. They’ll be built differently.',
    'That’s the work I do: finding the system underneath how an organization runs, then rebuilding it around AI so it handles a whole class of problems on its own. I’ve done it across healthcare, finance, hiring and education, inside companies and as an advisor.',
    'If you’re thinking about what AI means for how your organization actually works, I’d like to hear about it.',
  ],
  contact: {
    email: 'aaryush@outlook.com',
    phone: '+19493312850',
    linkedin: 'https://www.linkedin.com/in/aaryush',
    github: 'https://github.com/Aaryush1',
    vcard: '/Aaryush%20Contact%20Info.vcf',
  },
  location: 'Madison, WI',
  education: 'UW–Madison',
  next: { name: 'contextOS', note: 'Coming soon.' },
  footer: {
    heading: 'Let’s talk.',
    lead: 'The best first message is a rough picture of what you’re trying to solve and how it’s handled today.',
  },
  companyLinkLabel: (name: string) => `Inside ${name}`,
  /** Flip to false in Task 13 once Aaryush approves each block. */
  drafts: { hero: true, about: true, levels: true, companyLinkLabel: true, footer: false },
} as const;

export type Site = typeof site;
```

- [ ] **Step 4: Create `src/styles/tokens.css` and `src/styles/base.css`**

`tokens.css`: copy REF-D lines 17–43 (the `:root` block and the two gutter media queries) unchanged, except for the font stacks:

```css
--font: "Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--serif: "Instrument Serif", Georgia, serif;
--mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

`base.css`:
- Copy REF-D lines 44–79 (reset, body grid background, `.wrap`, `.mono`, `.reg`).
- Copy lines 213–221 (entrance and reveal) and lines 243–253 (`.hl` pointer highlight).
- Copy lines 223–241 (section heads), with one change: keep `.sec-head`'s `border-top`. It's the drawing-sheet rule and is part of the language.
- Then append:

```css
/* Page transitions (cross-document, no JS). Degrades to an instant navigation. */
@view-transition { navigation: auto; }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .28s; animation-timing-function: var(--ease); }
.top { view-transition-name: site-header; }

/* Reduced motion: final frames, no loops (REF-D 579–582) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: .01ms !important; transition-delay: 0ms !important; animation: none !important; }
  @view-transition { navigation: none; }
}
```

- [ ] **Step 5: Create `src/components/Icon.astro`**

Copy the inline SVGs from REF-D:
- `card`: line 627
- `mail`: line 633
- `phone`: line 637
- `linkedin`: line 641
- `github`: line 645
- `arrow-right`: line 775 (14×14)
- `arrow-down`: line 693 (12×12)
- `arrow-up-right`: line 855
- `back`: line 937
- `close`: line 944

```astro
---
interface Props { name: 'card' | 'mail' | 'phone' | 'linkedin' | 'github' | 'arrow-right' | 'arrow-down' | 'arrow-up-right' | 'back' | 'close'; class?: string }
const { name, class: cls } = Astro.props;
---
{name === 'card' && (<svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="11" r="2.4"/><path d="M5.6 16.8c.6-1.7 1.9-2.6 3.4-2.6s2.8.9 3.4 2.6M15 10h3.2M15 13.5h3.2"/></svg>)}
{name === 'mail' && (<svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>)}
<!-- …one branch per remaining name, SVG copied verbatim from the REF-D lines listed above… -->
```

Write out all ten branches in full. The comment above is only so this plan doesn't repeat ten SVGs; the file itself must contain every one.

- [ ] **Step 6: Create `src/components/ContactActions.astro`**

```astro
---
import Icon from './Icon.astro';
import { site } from '../data/site';
interface Props { variant: 'hero' | 'footer' }
const { variant } = Astro.props;
const c = site.contact;
const links = [
  { label: 'Email', href: `mailto:${c.email}`, icon: 'mail' },
  { label: 'Call', href: `tel:${c.phone}`, icon: 'phone' },
  { label: 'LinkedIn', href: c.linkedin, icon: 'linkedin' },
  { label: 'GitHub', href: c.github, icon: 'github' },
] as const;
---
<div class="cta" data-contact={variant}>
  <a class="btn btn-primary" href={c.vcard} download="Aaryush Gupta.vcf"><Icon name="card" />Save contact</a>
  <span class="sep-v" aria-hidden="true"></span>
  <div class="icons">
    {links.map((l) => (
      <a class="ico" href={l.href} aria-label={l.label} rel={l.href.startsWith('http') ? 'noopener' : undefined}>
        <Icon name={l.icon} /><span class="lbl" aria-hidden="true">{l.label}</span>
      </a>
    ))}
  </div>
</div>
<style>
  /* Port REF-D lines 146–188 (.cta, .btn, .btn-primary, .icons, .ico, .lbl, mobile grid) verbatim, scoped. */
</style>
```

Paste lines 146–188 into the `<style>` block; the comment is not the content. Use `:global(svg)` where the rules target the SVG children rendered by `Icon`.

- [ ] **Step 7: Create `SiteHeader.astro`, `SiteFooter.astro` and `Seo.astro`, and rewrite `BaseLayout.astro`**

`SiteHeader.astro`:
- Markup from REF-D lines 587–597. The `.mark` link points to `/` and contains `<span class="mark-text">Aaryush Gupta</span>`. **Leave out `.mark-sq`.** The amber-square logo is rejected, and the real mark arrives in Task 12.
- Nav links: `/#levels` (How AI fits, class `opt`), `/#work`, `/writing` (class `opt`), `/#contact`.
- Styles: port REF-D lines 81–97, minus the `.mark-sq` rules.

`SiteFooter.astro`:
- `<footer class="foot" id="contact" aria-labelledby="contact-title">` with:
  - the `.sec-head` row `§ 05 / Contact`;
  - `<h2 id="contact-title">{site.footer.heading}</h2>`;
  - `<p class="lead">{site.footer.lead}</p>`;
  - `<ContactActions variant="footer" />`;
  - the bar `<div class="foot-bar mono" data-footer-meta><span>© {new Date().getFullYear()} Aaryush Gupta</span><span>{site.location} · {site.education}</span><a href="#top">Back to top ↑</a></div>`.
- Styles: port REF-D lines 397–404, with two changes:
  - **Delete** `border-top` from `.foot-bar` (spec 6.6: fewer lines).
  - Change `.foot-bar` `margin-top` to `clamp(56px, 8vw, 96px)`.
- Leave out the schematic `frag` from REF-D lines 903–920 for now. Task 8 decides where the fragments go.

`Seo.astro`:

```astro
---
import { site } from '../data/site';
interface Props { title: string; description: string; ogImage: string; path: string }
const { title, description, ogImage, path } = Astro.props;
const canonical = new URL(path, site.url).href;
const image = new URL(ogImage, site.url).href;
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content={site.name} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={image} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={image} />
```

`BaseLayout.astro`:

```astro
---
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '../styles/tokens.css';
import '../styles/base.css';
import Seo from '../components/Seo.astro';
import SiteHeader from '../components/SiteHeader.astro';
import SiteFooter from '../components/SiteFooter.astro';
import { site } from '../data/site';
interface Props { title?: string; description?: string; ogImage?: string; path?: string; bodyClass?: string }
const { title = site.title, description = site.description, ogImage = '/og/home.png', path = Astro.url.pathname, bodyClass } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0A0B0E" />
    <meta name="color-scheme" content="dark" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <Seo title={title} description={description} ogImage={ogImage} path={path} />
    <script is:inline>document.documentElement.classList.add('js');</script>
    <slot name="head" />
  </head>
  <body class={bodyClass} data-home-title={site.title}>
    <SiteHeader />
    <slot />
    <SiteFooter />
    <script>import '../scripts/site';</script>
  </body>
</html>
```

Create `src/scripts/site.ts` with only the header-state logic for now. Tasks 5 and 8 add to it.

```ts
const top = document.getElementById('top');
const onScroll = () => top?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
```

- [ ] **Step 8: Make `index.astro` a temporary minimal page and update the vCard**

`src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout>
  <main class="wrap"><h1>Aaryush Gupta</h1></main>
</BaseLayout>
```

In `public/Aaryush Contact Info.vcf`, keep the existing lines, change `REV:` to `REV:2026-10-13T00:00:00.000Z`, and add `URL:https://aaryush.com` before `END:VCARD`.

`src/pages/qr.astro` still imports the removed classes. Change its body to `<main class="wrap"><img src="/assets/QR.png" alt="QR code for aaryush.com" width="320" height="320" /><a href="/">Continue to site</a></main>` for now; Task 11 restyles it.

- [ ] **Step 9: Run the tests**

Run: `npm run build` → Expected: builds with no errors.
Run: `npx playwright test tests/e2e/layout.spec.ts tests/e2e/contact.spec.ts tests/e2e/smoke.spec.ts` → Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add aaryush
git commit -m "feat: dark design tokens, base layout, header, footer and contact actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content model and content files

**Files:**
- Create: `src/content.config.ts`, `src/content/companies/{gupta-advisory,cylerity,ready-rebound,skale,earlier}.md`, `src/content/systems/{cylerity-underwriting,cylerity-intake,ready-rebound-loop,skale-platform,univise,smartbenai,umn-launchpad}.md`, `src/content/writing/{bigger-than-electricity,quiet-singularity}.md`, `src/data/levels.ts`, `src/lib/timeline.ts`, `src/lib/levels.ts`
- Test: `tests/unit/timeline.test.ts`, `tests/unit/levels.test.ts`, `tests/unit/confidentiality.test.ts`, `tests/release/drafts.test.ts`

**Interfaces:**
- Produces:
  - Collections `companies`, `systems` and `writing`. Each entry's `id` is its filename slug.
  - `buildTimeline(companies, systems): TimelineEntry[]`, where `TimelineEntry = { company: C; systems: S[] }`.
  - `formatRange(start: string, end: string | null, yearsOnly?: boolean): string`.
  - `numberSystems(timeline): Map<string, string>`, mapping a slug to `'SYS.01'`.
  - `workSlugs(companies, systems): string[]`, which throws on duplicates.
  - `levels: Level[]`, where `Level = { n: 1|2|3|4; title: string; body: string; refs: string[] }`.
  - `levelsFor(slug: string, levels: Level[]): Level[]`.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTimeline, formatRange, numberSystems, workSlugs } from '../../src/lib/timeline';

const co = (id: string, order: number, kind: 'company' | 'group' = 'company') => ({ id, data: { order, kind, start: '2024-01', end: null } });
const sys = (id: string, company: string, order: number) => ({ id, data: { company: { id: company }, order } });

describe('formatRange', () => {
  it('formats an open-ended role', () => expect(formatRange('2024-01', null)).toBe('Jan 2024 – Present'));
  it('formats a closed role', () => expect(formatRange('2024-06', '2026-02')).toBe('Jun 2024 – Feb 2026'));
  it('formats years only for groups', () => expect(formatRange('2023-03', '2024-07', true)).toBe('2023 – 2024'));
  it('rejects malformed months', () => expect(() => formatRange('2024-13', null)).toThrow(/month/));
});

describe('buildTimeline', () => {
  it('orders companies by order and nests their systems by order', () => {
    const t = buildTimeline([co('b', 2), co('a', 1)], [sys('a2', 'a', 2), sys('a1', 'a', 1), sys('b1', 'b', 1)]);
    expect(t.map((e) => e.company.id)).toEqual(['a', 'b']);
    expect(t[0].systems.map((s) => s.id)).toEqual(['a1', 'a2']);
  });
  it('keeps companies with no systems', () => {
    expect(buildTimeline([co('a', 1)], [])[0].systems).toEqual([]);
  });
  it('throws when a system points at a missing company', () => {
    expect(() => buildTimeline([co('a', 1)], [sys('x', 'missing', 1)])).toThrow(/missing/);
  });
});

describe('numberSystems', () => {
  it('numbers systems in timeline order, zero-padded', () => {
    const t = buildTimeline([co('a', 1), co('b', 2)], [sys('b1', 'b', 1), sys('a1', 'a', 1)]);
    expect(Object.fromEntries(numberSystems(t))).toEqual({ a1: 'SYS.01', b1: 'SYS.02' });
  });
});

describe('workSlugs', () => {
  it('lists company (non-group) and system slugs', () => {
    expect(workSlugs([co('a', 1), co('g', 2, 'group')], [sys('s', 'a', 1)])).toEqual(['a', 's']);
  });
  it('throws on a duplicate slug', () => {
    expect(() => workSlugs([co('a', 1)], [sys('a', 'a', 1)])).toThrow(/duplicate/i);
  });
});
```

`tests/unit/levels.test.ts`:

```ts
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { levels } from '../../src/data/levels';
import { levelsFor } from '../../src/lib/levels';

const slugsIn = (dir: string) => readdirSync(new URL(`../../src/content/${dir}/`, import.meta.url)).map((f) => f.replace(/\.md$/, ''));
const allSlugs = new Set([...slugsIn('companies'), ...slugsIn('systems')]);

describe('levels', () => {
  it('has exactly four levels numbered 1–4', () => expect(levels.map((l) => l.n)).toEqual([1, 2, 3, 4]));
  it('every ref points at real content', () => {
    for (const l of levels) for (const r of l.refs) expect(allSlugs, `level ${l.n} ref ${r}`).toContain(r);
  });
  it('every level has at least one ref', () => {
    for (const l of levels) expect(l.refs.length).toBeGreaterThan(0);
  });
  it('levelsFor returns the levels that reference a slug', () => {
    expect(levelsFor('cylerity-intake', levels).map((l) => l.n)).toEqual([2, 3]);
    expect(levelsFor('nope', levels)).toEqual([]);
  });
});
```

`tests/unit/confidentiality.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Add the city product's name here (lower-case) if it is ever mentioned in conversation. */
const FORBIDDEN = ['orchestra'];
const root = fileURLToPath(new URL('../../src/', import.meta.url));

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(astro|ts|md|css)$/.test(name)) yield p;
  }
}

describe('confidentiality', () => {
  it('never names internal tools or products', () => {
    for (const f of files(root)) {
      const text = readFileSync(f, 'utf8').toLowerCase();
      for (const word of FORBIDDEN) expect(text.includes(word), `${f} contains "${word}"`).toBe(false);
    }
  });
});
```

`tests/release/drafts.test.ts` (only run in Task 13 and at release, as the content-approval gate):

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/data/site';

const dirs = ['companies', 'systems', 'writing'];

describe('content approval gate', () => {
  it('no content file is still a draft', () => {
    for (const d of dirs) {
      const dir = new URL(`../../src/content/${d}/`, import.meta.url);
      for (const f of readdirSync(dir)) {
        const text = readFileSync(new URL(f, dir), 'utf8');
        expect(/^draft:\s*true\s*$/m.test(text), `${d}/${f} is draft`).toBe(false);
      }
    }
  });
  it('no site copy block is still a draft', () => {
    for (const [k, v] of Object.entries(site.drafts)) expect(v, `site.drafts.${k}`).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test`
Expected: FAIL. The modules `../../src/lib/timeline`, `../../src/data/levels` and `../../src/lib/levels` can't be resolved, and the content directories don't exist yet.

- [ ] **Step 3: Implement `src/lib/timeline.ts`**

```ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type CompanyLike = { id: string; data: { order: number; kind: 'company' | 'group'; start: string; end: string | null } };
export type SystemLike = { id: string; data: { company: { id: string }; order: number } };
export type TimelineEntry<C extends CompanyLike, S extends SystemLike> = { company: C; systems: S[] };

function parseMonth(value: string): { y: number; m: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const m = match ? Number(match[2]) : NaN;
  if (!match || m < 1 || m > 12) throw new Error(`Invalid month "${value}" (expected YYYY-MM)`);
  return { y: Number(match[1]), m };
}

export function formatRange(start: string, end: string | null, yearsOnly = false): string {
  const s = parseMonth(start);
  const e = end ? parseMonth(end) : null;
  if (yearsOnly) return `${s.y} – ${e ? e.y : 'Present'}`;
  const fmt = (p: { y: number; m: number }) => `${MONTHS[p.m - 1]} ${p.y}`;
  return `${fmt(s)} – ${e ? fmt(e) : 'Present'}`;
}

export function buildTimeline<C extends CompanyLike, S extends SystemLike>(companies: C[], systems: S[]): TimelineEntry<C, S>[] {
  const ids = new Set(companies.map((c) => c.id));
  for (const s of systems) if (!ids.has(s.data.company.id)) throw new Error(`System "${s.id}" references missing company "${s.data.company.id}"`);
  return [...companies]
    .sort((a, b) => a.data.order - b.data.order)
    .map((company) => ({
      company,
      systems: systems.filter((s) => s.data.company.id === company.id).sort((a, b) => a.data.order - b.data.order),
    }));
}

export function numberSystems<C extends CompanyLike, S extends SystemLike>(timeline: TimelineEntry<C, S>[]): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  for (const entry of timeline) for (const s of entry.systems) out.set(s.id, `SYS.${String(++i).padStart(2, '0')}`);
  return out;
}

export function workSlugs(companies: CompanyLike[], systems: SystemLike[]): string[] {
  const slugs = [...companies.filter((c) => c.data.kind === 'company').map((c) => c.id), ...systems.map((s) => s.id)];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`Duplicate work slug "${slug}"`);
    seen.add(slug);
  }
  return slugs;
}
```

- [ ] **Step 4: Implement `src/data/levels.ts` and `src/lib/levels.ts`**

`src/data/levels.ts`:

```ts
export type Level = { n: 1 | 2 | 3 | 4; title: string; em: string; body: string; refs: string[] };

/** Copy is draft until Task 13 (site.drafts.levels). refs are company or system slugs. */
export const levels: Level[] = [
  { n: 1, title: 'How the organization ', em: 'runs', body: 'Operating models and decision rights: who decides what, and which decisions a system can carry so people don’t have to.', refs: ['cylerity', 'gupta-advisory'] },
  { n: 2, title: 'How work ', em: 'moves', body: 'The handoffs between people and AI: where judgment is needed, and where volume can be absorbed without anyone touching it.', refs: ['smartbenai', 'cylerity-intake'] },
  { n: 3, title: 'How things get ', em: 'built', body: 'Engineering and product processes rebuilt around AI, so more people can build and fewer steps wait on a specialist.', refs: ['ready-rebound-loop', 'cylerity-intake'] },
  { n: 4, title: 'What gets ', em: 'built', body: 'Products that only exist because AI does.', refs: ['univise', 'skale-platform', 'cylerity-underwriting', 'umn-launchpad'] },
];
```

`src/lib/levels.ts`:

```ts
import type { Level } from '../data/levels';

export function levelsFor(slug: string, all: Level[]): Level[] {
  return all.filter((l) => l.refs.includes(slug));
}
```

- [ ] **Step 5: Create `src/content.config.ts`**

```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const fact = z.object({ label: z.string(), value: z.string() });

const companies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/companies' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['company', 'group']).default('company'),
    role: z.string().optional(),
    start: month,
    end: month.nullable(),
    order: z.number().int(),
    summary: z.string(),
    problem: z.string().optional(),
    owns: z.array(z.object({ title: z.string(), detail: z.string() })).default([]),
    facts: z.array(fact).default([]),
    ogDescription: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const systems = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/systems' }),
  schema: z.object({
    title: z.string(),
    company: reference('companies'),
    order: z.number().int(),
    summary: z.string(),
    outcome: z.string().optional(),
    diagram: z.enum(['intake', 'loop', 'launchpad']).optional(),
    caption: z.string().optional(),
    legend: z.array(z.object({ kind: z.enum(['flow', 'dashed', 'feedback', 'human']), label: z.string() })).default([]),
    facts: z.array(fact).default([]),
    draft: z.boolean().default(false),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    kind: z.enum(['letter', 'paper']),
    pdf: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { companies, systems, writing };
```

- [ ] **Step 6: Create the company files**

`src/content/companies/gupta-advisory.md`:

```md
---
name: Gupta Advisory
role: AI strategy & systems advisory
start: 2024-12
end: null
order: 1
summary: I work with organizations on how they should operate with AI, starting with how the business actually works, then targeted experiments that prove value fast.
facts:
  - { label: Role, value: Advisor }
  - { label: Since, value: Dec 2024 }
ogDescription: How Aaryush Gupta works with organizations on what AI means for how they operate.
draft: true
---
The model is simple. Someone reaches out with a problem. I spend real time understanding their business: not just the symptom, but what the organization actually looks like today and where the friction is.

Then I come back with a few targeted solutions for quick experiments, ways to find value without a large upfront commitment. If we see ROI on day one, we commit to something larger. No lengthy proposals. No months of discovery before anything happens.

The through-line is always the same: figure out where AI changes how the organization works, and design for that shift.

I do my best work where decisions can move quickly. That's usually smaller teams, sometimes a focused group inside a larger company.

The best first message is a rough picture of what you're trying to solve and how it's handled today.
```

`src/content/companies/cylerity.md`:

```md
---
name: Cylerity
role: AI Lead
start: 2024-01
end: null
order: 2
summary: A fintech-healthcare company that underwrites insurance claims and advances cash to healthcare providers, so they aren't waiting weeks to get paid.
problem: Providers can wait weeks for a claim to pay out. Advancing that cash means every funding decision has to be fast, explainable and compliant. A weeks-long claims cycle has to become a same-day decision without cutting corners on risk.
owns:
  - { title: Decision architecture, detail: How funding decisions get made, which ones a system makes on its own, and where a person decides. }
  - { title: Compliance framework, detail: Designed so risk and compliance run in parallel with each decision, not after it. }
  - { title: Operating model, detail: Redesigned so everyone in the company uses Claude Code and produces output independently, not just the engineers. }
  - { title: Business-to-technical pipeline, detail: A structured path from a business need to something an engineer can build. }
facts:
  - { label: Role, value: AI Lead }
  - { label: Since, value: Jan 2024 }
  - { label: Arc, value: MVP → eight-figure lending facility }
ogDescription: Aaryush Gupta's work as AI Lead at Cylerity, from MVP to an eight-figure lending facility.
draft: true
---
When I joined, Cylerity had a standard roadmap and a traditional way of building. I redesigned the operating model. Today everyone in the company uses Claude Code and produces output independently, and everything flows from business-level features down to technical implementation, step by step.

That operating model took the company from MVP to an eight-figure lending facility.
```

`src/content/companies/ready-rebound.md`:

```md
---
name: Ready Rebound
role: AI & Engineering Lead
start: 2025-12
end: null
order: 3
summary: A workers' comp platform that helps injured employees get back to work.
owns:
  - { title: AI in every department, detail: The goal I care most about isn't in engineering at all. It's AI-driven efficiency across the whole company, with workflows redesigned around AI rather than AI added to old ones. }
  - { title: Engineering, detail: I lead AI and engineering, manage the engineering team, and set the technical architecture. }
  - { title: A new product, detail: I shaped a new product that cities are now adopting, built the system that builds it, and led the team that shipped it. }
facts:
  - { label: Role, value: AI & Engineering Lead }
  - { label: Since, value: Dec 2025 }
ogDescription: Aaryush Gupta's work as AI & Engineering Lead at Ready Rebound.
draft: true
---
The goal isn't to add AI to the workflow. It's to redesign the workflow around AI, in every department, not just engineering.
```

`src/content/companies/skale.md`:

```md
---
name: Skale.win
role: Founding member, Product & Strategy
start: 2024-06
end: 2026-02
order: 4
summary: Co-founded an end-to-end career platform that helps people understand their strengths, upskill, and get matched to opportunities.
facts:
  - { label: Role, value: "Founding member, Product & Strategy" }
  - { label: When, value: Jun 2024 – Feb 2026 }
ogDescription: Aaryush Gupta's work as a founding member of Skale.win.
draft: true
---
We set out to reconstruct what hiring is as a whole. The resume has been the standard for decades, but it's a flat, low-resolution signal of what a person can actually do. We used higher-dimensional embedding models to capture real capability: not keywords on a page, but what someone is genuinely able to contribute.

The platform covered everything a career needs: understand how to be better, upskill, and find the right opportunities. The business model was white-label and enterprise hiring.

It was the first AI product I took end to end, from infrastructure to deployment, and it was received exceptionally well by the people using it to prepare for interviews.
```

`src/content/companies/earlier.md`:

```md
---
name: Earlier
kind: group
start: 2023-03
end: 2024-07
order: 5
summary: The first products I built with AI, from the release of GPT-4 onward.
draft: true
---
```

- [ ] **Step 7: Create the system files**

Bodies marked *existing* reuse copy from the live site (`src/data/projects.ts`, still in the repo until Task 5) and are restructured into prose.

`src/content/systems/cylerity-underwriting.md`:

```md
---
title: Claims underwriting
company: cylerity
order: 1
summary: Turns a weeks-long claims cycle into same-day funding decisions. Risk and compliance run in parallel, and providers see what was approved and why.
outcome: Backs an eight-figure lending facility
facts:
  - { label: Input, value: Healthcare claims data }
  - { label: Output, value: A same-day funding decision }
  - { label: Result, value: Eight-figure lending facility }
draft: true
---
Insurance claims took weeks to pay out, forcing healthcare providers into cash crunches that stalled operations and growth. No underwriting process existed to fix it.

I designed the operating model end to end: how claims data enters, gets assessed, and produces a funding decision. Risk assessment and compliance run in parallel, which collapses weeks into hours, and a transparency layer shows providers exactly what was approved and why.

The result is same-day decisions for providers, an underwriting operation that runs end to end, and an eight-figure lending facility.
```

`src/content/systems/cylerity-intake.md` (story taken from REF-D lines 1118–1125):

```md
---
title: Engineering intake
company: cylerity
order: 2
summary: Anyone in the company drops an idea into a shared Claude project. A conversation draws out what's needed and classifies it as an idea, tracked, or a scope, ready to build.
outcome: Retired a sprawling spreadsheet
diagram: intake
caption: Every request enters the same conversation; classification decides where it waits.
legend:
  - { kind: flow, label: Flow }
  - { kind: dashed, label: Revisited }
  - { kind: feedback, label: Feedback loop }
facts:
  - { label: Input, value: Anyone in the company }
  - { label: Interface, value: A shared Claude project }
  - { label: Output, value: "Idea (tracked) · Scope (ready to build)" }
  - { label: Replaced, value: A sprawling spreadsheet }
draft: true
---
Engineering requests used to live in a sprawling spreadsheet. Half-formed ideas sat next to work that was ready to build, and scoping an idea depended on someone already knowing what it needed.

Now anyone in the company drops an idea into a shared Claude project. A proactive conversation draws out what's actually needed, then classifies it: an idea, vague but tracked, or a scope, defined enough for an engineer to build. People focus on the ideas; the system handles the definition, and what ships feeds the next conversation.
```

`src/content/systems/ready-rebound-loop.md` (story taken from REF-D lines 1152–1158):

```md
---
title: Engineering loop
company: ready-rebound
order: 1
summary: An engineer hands it a ticket; it runs the full engineering process, from implementation and review passes to a documentation tree it keeps current, the PR, and QA in a real browser, pulling a person in only for decisions, specs and architecture.
outcome: Two people now ship what four did
diagram: loop
caption: A ticket runs the whole process; a person is pulled back in only where judgment matters.
legend:
  - { kind: human, label: A person }
  - { kind: dashed, label: Builds from the docs }
  - { kind: feedback, label: Back to a person }
facts:
  - { label: Input, value: A ticket from an engineer }
  - { label: A person, value: "Decisions, specs, architecture" }
  - { label: Output, value: "A reviewed PR, QA-tested in a real browser" }
  - { label: Result, value: Two people ship what four did }
draft: true
---
An engineer hands the loop a ticket. From there it runs the full engineering process: implementation and review passes, a documentation tree it keeps current and builds from, the pull request, and QA in a real browser.

A person is pulled in only where judgment matters: decisions, specs and architecture. Two people now ship what four did, and for smaller features that don't need architecture work, non-technical teammates open their own PRs.
```

`src/content/systems/skale-platform.md`:

```md
---
title: Career platform
company: skale
order: 1
summary: End-to-end career platform. Understand your strengths, upskill, and get matched to opportunities based on what you're actually capable of.
facts:
  - { label: Approach, value: Higher-dimensional embedding models }
  - { label: Model, value: White-label & enterprise hiring }
draft: false
---
Hiring has been stuck on the same model for decades: resumes, keyword matching, and surface-level signals. Candidates can't show what they're actually capable of, and employers can't see it.

The platform captured capability at a higher dimension than a resume ever could. It was built to be model-agnostic, so it evolves with AI capabilities without rebuilds, and designed for white-label and enterprise hiring, so the platform becomes the hiring infrastructure. Making meritocracy scalable.
```

`src/content/systems/univise.md`:

```md
---
title: Univise
company: earlier
order: 1
summary: Built a university advising system that spread across campus through word of mouth. No marketing, no push, just a product that solved a daily problem.
outcome: Best pitch at Transcend
draft: false
---
Advising information was scattered across dozens of university pages and PDFs. Students couldn't find straightforward answers. Advisors were overwhelmed with repetitive questions.

The core problem wasn't a lack of information but a lack of accessible information architecture. Univise surfaces answers in plain language with links to official sources, trust through transparency, and it spread organically because it solved a daily friction point every student experienced.

It was adopted across campus through word of mouth alone and won best pitch at Transcend, proof that the right information architecture reshapes how an institution delivers a service.
```

`src/content/systems/smartbenai.md`:

```md
---
title: SmartBenAI
company: earlier
order: 2
summary: Automated claims data extraction for healthcare TPAs while keeping humans in the loop where compliance demands it.
outcome: Compliance-first automation
draft: false
---
TPAs spent hours re-typing claim data from noisy scans. The process was slow and expensive, but compliance requirements made automation seem risky.

Automation handles the volume and humans handle judgment. Confidence scoring flags low-certainty items for human review automatically, and the whole system was built around healthcare privacy requirements from day one.

The result is clean, structured data with human oversight where it matters. Automation enhances accuracy instead of introducing risk.
```

`src/content/systems/umn-launchpad.md`:

```md
---
title: UMN Discovery Launchpad
company: earlier
order: 3
summary: Replaced ad-hoc startup mentorship with a system that structures what each founder has already done, so the right people can help without relearning it.
diagram: launchpad
caption: Founder materials become structure once, so nobody relearns what's already been done.
legend:
  - { kind: flow, label: Flow }
  - { kind: human, label: The Launchpad team }
  - { kind: feedback, label: Progress updates the profile }
draft: true
---
Founders and mentors were drowning in scattered information with no way to identify gaps or prioritize. Mentorship was ad-hoc, and the most useful help often arrived too late.

Founders upload their documents and materials. The system builds the rubrics, structure and documentation of where that company actually stands, work that used to fall on people. Launchpad, the University of Minnesota's tech-transfer office, uses that picture to bring in the right people and the right support, without spending time relearning what's already been done.
```

- [ ] **Step 8: Create the writing files, moving the essays across unchanged**

`src/content/writing/bigger-than-electricity.md`:
- Frontmatter: `title: This Is Bigger Than Electricity`, `subtitle: A letter to the people I love`, `date: 2026-02-18`, `summary:` the card paragraph from current `src/pages/index.astro` line 278 (decode `&mdash;` to `—`), `kind: letter`, `draft: false`.
- Body: the HTML inside `<div class="letter__body">` (current `index.astro` lines 293–491), moved verbatim, with these class renames:

| Old class | New class |
|---|---|
| `letter__pullquote` | `pullquote` |
| `letter__divider` | `divider` |
| `letter__section-title` | `section-title` |
| `letter__closing-statement` | `closing` |

  Turn each `<h4 class="section-title">X</h4>` into a Markdown `## X`. Leave plain `<p>` paragraphs as HTML; Markdown allows raw HTML. Don't change a single word.

`src/content/writing/quiet-singularity.md`:
- Frontmatter: `title: The Quiet Singularity`, `subtitle: Recursive Self-Improvement, Collapsing Costs, and the Feedback Loop No One Is Governing`, `date: 2026-02-15`, `summary:` the abstract from current `index.astro` line 518 (decoded), `kind: paper`, `pdf: /quiet-singularity.pdf`, `draft: false`.
- Body: move current `index.astro` lines 520–618 verbatim (the sections, table, references and closing), with these renames:

| Old | New |
|---|---|
| `paper__section` wrapper `<div>` | remove (keep its children) |
| `<h4>` | `##` |
| `<h5>` | `###` |
| `paper__table` | `data-table` |
| `paper__table-note` | `table-note` |
| `paper__callout` | `callout` |
| `paper__references` | `references` |
| `paper__closing` | `closing-block` |
| `paper__closing-statement` | `closing` |
| `paper__author` | `author` |

  Keep the `<sup>[n]</sup>` markers.

- [ ] **Step 9: Run the unit tests and the build**

Run: `npm test` → Expected: timeline, levels, confidentiality and sanity all pass.
Run: `npm run build` → Expected: succeeds. Astro validates the schemas, the `company` references and the month formats. A bad reference fails the build with `companies entry "x" does not exist`.

- [ ] **Step 10: Commit**

```bash
git add aaryush/src aaryush/tests
git commit -m "feat: content collections for companies, systems, writing and levels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Diagram geometry library

**Files:**
- Create: `src/lib/diagram.ts`, `src/data/diagrams.ts`
- Test: `tests/unit/diagram.test.ts`, `tests/unit/diagrams-data.test.ts`

**Interfaces:**
- Produces, all exported from `src/lib/diagram.ts`:
  - **Types:**
    - `Pt = [number, number]`
    - `BoxNode = { x; y; w; h; t: string; s?: string; d: number; dashed?: boolean; human?: boolean }`
    - `DiamondNode = { diamond: true; cx; cy; r; t: string; d: number }`
    - `DiagramNode = BoxNode | DiamondNode`
    - `DiagramEdge = { p: Pt[]; d: number; dur?: number; fb?: boolean; dash?: boolean; l?: [string, number, number, 'start'|'middle'|'end'][] }`
    - `DiagramInput = [x: number, y1: number, y2: number, label: string, delay: number]`
    - `DiagramSpec = { vb: [number, number]; title: string; desc: string; inputs: DiagramInput[]; nodes: DiagramNode[]; edges: DiagramEdge[]; pulse: Pt[]; loopStart: number }`
    - `Hit = { node: number; at: number }`
    - `DiagramRuntime = { pulse: Pt[]; inputs: DiagramInput[]; loopStart: number; hits: Hit[] }`
    - `DiagramKey = 'intake' | 'loop' | 'launchpad'`
  - **Functions:**
    - `isDiamond(n): n is DiamondNode`
    - `nodeBounds(n): { x; y; w; h }`
    - `boxPath(n): string`
    - `pathD(pts, closed): string`
    - `polylineLength(pts, closed = true): number`
    - `pointAt(pts, s, closed = true): Pt`, with `s` wrapping modulo the length
    - `nodeHits(spec, step = 1): Hit[]`, giving every arc-length position where the pulse **enters** a node, sorted
    - `crossed(prev, next, at, len): boolean`
- Produces from `src/data/diagrams.ts`: `diagrams: Record<DiagramKey, DiagramSpec>`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/diagram.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { crossed, nodeBounds, nodeHits, pathD, pointAt, polylineLength, type DiagramSpec, type Pt } from '../../src/lib/diagram';

const square: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe('polyline geometry', () => {
  it('measures a closed square', () => expect(polylineLength(square)).toBe(40));
  it('measures an open polyline', () => expect(polylineLength(square, false)).toBe(30));
  it('finds points along the path', () => {
    expect(pointAt(square, 0)).toEqual([0, 0]);
    expect(pointAt(square, 15)).toEqual([10, 5]);
    expect(pointAt(square, 35)).toEqual([0, 5]);
  });
  it('wraps positions beyond the length', () => expect(pointAt(square, 45)).toEqual([5, 0]));
  it('wraps negative positions', () => expect(pointAt(square, -5)).toEqual([0, 5]));
  it('writes an SVG path', () => {
    expect(pathD(square, true)).toBe('M0 0 L10 0 L10 10 L0 10 Z');
    expect(pathD([[1, 2], [3, 4]], false)).toBe('M1 2 L3 4');
  });
});

describe('nodeBounds', () => {
  it('uses the box for box nodes', () => expect(nodeBounds({ x: 1, y: 2, w: 3, h: 4, t: 'a', d: 0 })).toEqual({ x: 1, y: 2, w: 3, h: 4 }));
  it('uses the bounding square for diamonds', () => expect(nodeBounds({ diamond: true, cx: 10, cy: 10, r: 5, t: 'a', d: 0 })).toEqual({ x: 5, y: 5, w: 10, h: 10 }));
});

describe('nodeHits', () => {
  const spec = (nodes: DiagramSpec['nodes']): DiagramSpec => ({ vb: [100, 100], title: '', desc: '', inputs: [], edges: [], loopStart: 0, nodes, pulse: [[0, 50], [100, 50], [100, 90], [0, 90]] });

  it('records the arc length where the pulse enters a node', () => {
    const hits = nodeHits(spec([{ x: 40, y: 45, w: 20, h: 10, t: 'mid', d: 0 }]));
    expect(hits).toHaveLength(1);
    expect(hits[0].node).toBe(0);
    expect(hits[0].at).toBeGreaterThanOrEqual(38);
    expect(hits[0].at).toBeLessThanOrEqual(41);
  });
  it('skips nodes the pulse never touches', () => {
    expect(nodeHits(spec([{ x: 40, y: 0, w: 10, h: 10, t: 'off', d: 0 }]))).toEqual([]);
  });
  it('treats a node containing the start as entered on wrap, not at 0', () => {
    const hits = nodeHits(spec([{ x: -5, y: 40, w: 20, h: 60, t: 'start', d: 0 }]));
    expect(hits).toHaveLength(1);
    expect(hits[0].at).toBeGreaterThan(250);
  });
  it('returns hits sorted by position', () => {
    const hits = nodeHits(spec([{ x: 80, y: 45, w: 10, h: 10, t: 'b', d: 0 }, { x: 20, y: 45, w: 10, h: 10, t: 'a', d: 0 }]));
    expect(hits.map((h) => h.node)).toEqual([1, 0]);
  });
});

describe('crossed', () => {
  it('detects a crossing within a forward step', () => expect(crossed(10, 20, 15, 100)).toBe(true));
  it('ignores positions outside the step', () => expect(crossed(10, 20, 25, 100)).toBe(false));
  it('includes the end of the step, excludes the start', () => {
    expect(crossed(10, 20, 20, 100)).toBe(true);
    expect(crossed(10, 20, 10, 100)).toBe(false);
  });
  it('handles wrap-around steps', () => {
    expect(crossed(95, 5, 98, 100)).toBe(true);
    expect(crossed(95, 5, 2, 100)).toBe(true);
    expect(crossed(95, 5, 50, 100)).toBe(false);
  });
  it('treats a zero step as no crossing', () => expect(crossed(10, 10, 10, 100)).toBe(false));
});
```

`tests/unit/diagrams-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diagrams } from '../../src/data/diagrams';
import { nodeBounds, nodeHits } from '../../src/lib/diagram';

for (const [key, spec] of Object.entries(diagrams)) {
  describe(`diagram ${key}`, () => {
    const [W, H] = spec.vb;
    const inside = (x: number, y: number) => x >= 0 && x <= W && y >= 0 && y <= H;

    it('keeps every node inside the viewBox', () => {
      for (const n of spec.nodes) {
        const b = nodeBounds(n);
        expect(inside(b.x, b.y) && inside(b.x + b.w, b.y + b.h), `${key} node ${n.t}`).toBe(true);
      }
    });
    it('keeps every pulse and edge point inside the viewBox', () => {
      for (const [x, y] of spec.pulse) expect(inside(x, y)).toBe(true);
      for (const e of spec.edges) for (const [x, y] of e.p) expect(inside(x, y)).toBe(true);
    });
    it('has a pulse that passes through at least two nodes', () => {
      expect(new Set(nodeHits(spec).map((h) => h.node)).size).toBeGreaterThanOrEqual(2);
    });
    it('starts the loop after the last node has drawn', () => {
      expect(spec.loopStart).toBeGreaterThan(Math.max(...spec.nodes.map((n) => n.d)));
    });
    it('has an accessible title and description', () => {
      expect(spec.title.length).toBeGreaterThan(5);
      expect(spec.desc.length).toBeGreaterThan(40);
    });
  });
}
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/unit/diagram.test.ts tests/unit/diagrams-data.test.ts`
Expected: FAIL. The modules don't exist yet.

- [ ] **Step 3: Implement `src/lib/diagram.ts`**

```ts
export type Pt = [number, number];
export type BoxNode = { x: number; y: number; w: number; h: number; t: string; s?: string; d: number; dashed?: boolean; human?: boolean };
export type DiamondNode = { diamond: true; cx: number; cy: number; r: number; t: string; d: number };
export type DiagramNode = BoxNode | DiamondNode;
export type DiagramEdge = { p: Pt[]; d: number; dur?: number; fb?: boolean; dash?: boolean; l?: [string, number, number, 'start' | 'middle' | 'end'][] };
export type DiagramInput = [x: number, y1: number, y2: number, label: string, delay: number];
export type DiagramSpec = { vb: [number, number]; title: string; desc: string; inputs: DiagramInput[]; nodes: DiagramNode[]; edges: DiagramEdge[]; pulse: Pt[]; loopStart: number };
export type Hit = { node: number; at: number };
export type DiagramRuntime = { pulse: Pt[]; inputs: DiagramInput[]; loopStart: number; hits: Hit[] };
export type DiagramKey = 'intake' | 'loop' | 'launchpad';

export const isDiamond = (n: DiagramNode): n is DiamondNode => 'diamond' in n;

export function nodeBounds(n: DiagramNode) {
  return isDiamond(n) ? { x: n.cx - n.r, y: n.cy - n.r, w: n.r * 2, h: n.r * 2 } : { x: n.x, y: n.y, w: n.w, h: n.h };
}

export function boxPath(n: DiagramNode): string {
  if (isDiamond(n)) return `M${n.cx} ${n.cy - n.r} L${n.cx + n.r} ${n.cy} L${n.cx} ${n.cy + n.r} L${n.cx - n.r} ${n.cy} Z`;
  return `M${n.x} ${n.y} H${n.x + n.w} V${n.y + n.h} H${n.x} Z`;
}

export function pathD(pts: Pt[], closed: boolean): string {
  return 'M' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L') + (closed ? ' Z' : '');
}

function segments(pts: Pt[], closed: boolean): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
  if (closed && pts.length > 2) segs.push([pts[pts.length - 1], pts[0]]);
  return segs;
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function polylineLength(pts: Pt[], closed = true): number {
  return segments(pts, closed).reduce((sum, [a, b]) => sum + dist(a, b), 0);
}

export function pointAt(pts: Pt[], s: number, closed = true): Pt {
  const len = polylineLength(pts, closed);
  if (len === 0) return [pts[0][0], pts[0][1]];
  let rest = ((s % len) + len) % len;
  for (const [a, b] of segments(pts, closed)) {
    const l = dist(a, b);
    if (rest <= l) {
      const k = l === 0 ? 0 : rest / l;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    rest -= l;
  }
  const last = pts[closed ? 0 : pts.length - 1];
  return [last[0], last[1]];
}

export function nodeHits(spec: DiagramSpec, step = 1): Hit[] {
  const len = polylineLength(spec.pulse);
  const boxes = spec.nodes.map((n) => {
    const b = nodeBounds(n);
    return { x0: b.x - 1, y0: b.y - 1, x1: b.x + b.w + 1, y1: b.y + b.h + 1 };
  });
  const inside = (p: Pt, i: number) => p[0] >= boxes[i].x0 && p[0] <= boxes[i].x1 && p[1] >= boxes[i].y0 && p[1] <= boxes[i].y1;
  const hits: Hit[] = [];
  boxes.forEach((_, i) => {
    let was = inside(pointAt(spec.pulse, len - step), i);
    for (let s = 0; s < len; s += step) {
      const now = inside(pointAt(spec.pulse, s), i);
      if (now && !was) hits.push({ node: i, at: s });
      was = now;
    }
  });
  return hits.sort((a, b) => a.at - b.at);
}

export function crossed(prev: number, next: number, at: number, _len: number): boolean {
  if (next === prev) return false;
  if (next > prev) return at > prev && at <= next;
  return at > prev || at <= next;
}
```

- [ ] **Step 4: Implement `src/data/diagrams.ts`**

- **`intake` and `loop`:** copy from REF-D lines 1465–1513, but convert each `pulse` string into a point list:
  - intake: `[[150,79],[150,282],[228,282],[228,548],[310,548],[310,79]]`
  - loop: `[[150,165],[150,212],[79,212],[79,259],[241,259],[241,316],[150,316],[150,594],[310,594],[310,165]]`
- **`launchpad`** is new:

```ts
import type { DiagramKey, DiagramSpec } from '../lib/diagram';

export const diagrams: Record<DiagramKey, DiagramSpec> = {
  intake: { /* REF-D 1466–1486 with pulse as the point list above */ },
  loop: { /* REF-D 1489–1512 with pulse as the point list above */ },
  launchpad: {
    vb: [320, 452],
    title: 'UMN Discovery Launchpad system diagram',
    desc: 'Founders upload their documents and materials. The system builds rubrics, structure and documentation of where each company stands. The Launchpad team uses that picture to bring in the right people and support, and progress feeds back into the profile so nothing is relearned.',
    inputs: [[110, 26, 54, 'DOCS', 0], [150, 26, 54, 'DECKS', 110], [190, 26, 54, 'NOTES', 220]],
    nodes: [
      { x: 75, y: 54, w: 150, h: 50, t: 'Founder materials', s: 'UPLOADED', d: 380 },
      { x: 50, y: 140, w: 200, h: 54, t: 'Structure built', s: 'RUBRICS · DOCS', d: 900 },
      { x: 50, y: 230, w: 200, h: 54, t: 'Where it stands', s: 'COMPANY PROFILE', d: 1400 },
      { x: 50, y: 320, w: 200, h: 54, t: 'Launchpad team', s: 'RIGHT PEOPLE · SUPPORT', d: 1900, human: true },
    ],
    edges: [
      { p: [[150, 104], [150, 140]], d: 700, dur: 360 },
      { p: [[150, 194], [150, 230]], d: 1200, dur: 360 },
      { p: [[150, 284], [150, 320]], d: 1700, dur: 360 },
      { p: [[150, 374], [150, 402], [310, 402], [310, 167], [250, 167]], d: 2300, dur: 1300, fb: true, l: [['PROGRESS UPDATES', 306, 420, 'end'], ['THE PROFILE', 306, 436, 'end']] },
    ],
    pulse: [[150, 167], [150, 402], [310, 402], [310, 167]],
    loopStart: 3900,
  },
};
```

In the real file, replace both `/* REF-D … */` comments with the literal objects copied from those lines. Don't leave the comments in.

- [ ] **Step 5: Run the tests**

Run: `npm test` → Expected: all unit tests pass, including the three diagram-data suites.

- [ ] **Step 6: Commit**

```bash
git add aaryush/src/lib/diagram.ts aaryush/src/data/diagrams.ts aaryush/tests/unit
git commit -m "feat: diagram geometry and specs with node-hit detection

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Homepage sections (static markup and styles)

**Files:**
- Create: `src/components/HomePage.astro`, `src/components/home/{Hero,About,Levels,Timeline,WritingTeaser}.astro`
- Rewrite: `src/pages/index.astro`
- Modify: `src/scripts/site.ts` (reveal, pointer glow, index flash)
- Delete: `src/styles/global.css`, `src/scripts/{motion,modals,filters}.ts`, `src/data/projects.ts`
- Test: `tests/e2e/home.spec.ts`, `tests/e2e/hero.spec.ts` (static parts)

**Interfaces:**
- Consumes:
  - `site` (Task 2) and `levels` (Task 3).
  - From Task 3: `buildTimeline`, `formatRange`, `numberSystems` and `levelsFor`.
  - Collections via `getCollection`.
- Produces:
  - `<HomePage openSlug?: string />`. In this task it renders the sections only; Task 6 adds the pop-up shell and templates.
  - DOM contract that later tasks rely on:
    - every company entry is `article.entry#co-<slug>`;
    - every system card is `a.card#sys-<slug>[data-popup-link][href="/work/<slug>"]`;
    - every company's inside link is `a.more[data-popup-link][href="/work/<slug>"]`, except the `earlier` group, which has none;
    - each level is `li.level[data-level="<n>"]` containing `.meter > i` ×4;
    - level chips are `a.chip[href="#sys-<slug>"|"#co-<slug>"]`;
    - the hero has `canvas#field`, `#rot` and `#slot`.

- [ ] **Step 1: Write the failing e2e tests**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('home structure', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('sections appear in order', async ({ page }) => {
    const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['hero', 'about', 'levels', 'work', 'writing']);
  });

  test('timeline lists companies newest first, with the earlier group last', async ({ page }) => {
    const ids = await page.locator('article.entry').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['co-gupta-advisory', 'co-cylerity', 'co-ready-rebound', 'co-skale', 'co-earlier']);
  });

  test('contextOS is a single line above the timeline, not a card', async ({ page }) => {
    const next = page.locator('.tl-wrap > .next');
    await expect(next).toContainText('contextOS');
    await expect(next).toContainText('Coming soon.');
    await expect(page.locator('.card', { hasText: 'contextOS' })).toHaveCount(0);
  });

  test('every system card and company inside-link points at /work/<slug>', async ({ page }) => {
    const hrefs = await page.locator('[data-popup-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.length).toBe(11);
    for (const h of hrefs) expect(h).toMatch(/^\/work\/[a-z0-9-]+$/);
    await expect(page.locator('#co-earlier a.more')).toHaveCount(0);
  });

  test('Skale shows its end date', async ({ page }) => {
    await expect(page.locator('#co-skale .date')).toHaveText('Jun 2024 – Feb 2026');
  });

  test('level chips scroll to the referenced entry and flash it', async ({ page }) => {
    await page.locator('li.level[data-level="3"] a.chip[href="#sys-ready-rebound-loop"]').click();
    const card = page.locator('#sys-ready-rebound-loop');
    await expect(card).toBeInViewport();
    await expect(card).toHaveClass(/is-target/);
  });

  test('no inside-link uses the word "More"', async ({ page }) => {
    await expect(page.locator('a.more', { hasText: /^More/ })).toHaveCount(0);
  });
});
```

`tests/e2e/hero.spec.ts` (the static part; Task 8 adds the motion tests):

```ts
import { expect, test } from '@playwright/test';

test('contact actions sit above the fold on a 375×667 phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const hero = page.locator('[data-contact="hero"]');
  for (const name of ['Save contact', 'Email', 'Call', 'LinkedIn', 'GitHub']) {
    const box = await hero.getByRole('link', { name }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.y + box!.height, name).toBeLessThanOrEqual(667);
  }
});

test('hero reads correctly without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#rot')).toContainText('I build the systems behind');
  await expect(page.locator('#rot')).toContainText('how organizations work.');
  await context.close();
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/home.spec.ts tests/e2e/hero.spec.ts`
Expected: FAIL. The temporary index page has none of these sections.

- [ ] **Step 3: Build `Hero.astro`**

- **Markup:** REF-D lines 601–662, with these changes:
  - The eyebrow text comes from `site.eyebrow`.
  - `#rot` keeps the sr-only full sentence.
  - The visible `.rot-1` is `site.hero.lead`.
  - `#slot` initially contains the **settled** phrase `<span class="slot-w">{before}<em>{em}</em>{after}</span>`, so the page is correct without JS.
  - Add `data-subjects={JSON.stringify(site.hero.subjects)}` to `#rot`.
  - Replace the inline first-frame script (REF-D 617–623) with this `is:inline` script, which runs only when the `rot-pre` class is present (set in the next bullet):

```html
<script is:inline>
  (function () {
    var rot = document.getElementById('rot'), slot = document.getElementById('slot');
    if (!rot || !slot || !document.documentElement.classList.contains('rot-pre')) return;
    var first = JSON.parse(rot.dataset.subjects || '[]')[0];
    if (first) slot.innerHTML = '<span class="slot-w">' + first + '</span>';
  })();
</script>
```

  - Add to `BaseLayout`'s inline head script: `try { if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('rot-pre'); } catch (e) {}`.
  - `.lede` is `site.hero.lede`.
  - Replace the CTA block with `<ContactActions variant="hero" />`.
  - Keep the hero-foot figure caption and title block (REF-D 652–660) as they are, with `Rev.` set to `2026.10`.
- **Styles:** port REF-D lines 100–145 and 189–211 into the component `<style>`. Use `:global()` for `.js`, `.rot-pre` and `.is-settled` selectors.

- [ ] **Step 4: Build `About.astro`**

```astro
---
import { site } from '../../data/site';
---
<section class="sec" id="about" aria-labelledby="about-title">
  <div class="wrap">
    <div class="sec-head mono rv"><span class="n">§ 02</span><span>About</span><span class="f">Sheet 02 / 06</span></div>
    <div class="about rv">
      <h2 class="sr-only" id="about-title">About</h2>
      <p class="about-lead">{site.about[0]}</p>
      {site.about.slice(1).map((p) => <p>{p}</p>)}
    </div>
  </div>
</section>
<style>
  .about { margin-top: 44px; max-width: 46rem; display: grid; gap: 18px; }
  .about-lead { font-size: clamp(22px, 2.6vw, 30px); line-height: 1.35; letter-spacing: -.02em; color: var(--text); }
  .about p:not(.about-lead) { color: var(--text-2); font-size: 17px; line-height: 1.7; max-width: 38rem; }
  @media (min-width: 960px) { .about { margin-top: 56px; } }
</style>
```

Renumber the section heads to fit six sheets: hero = 01, About = 02, How AI fits = 03, Work = 04, Writing = 05, Contact = 06. Update `SiteFooter`'s head to `§ 06` and `Sheet 06 / 06`.

- [ ] **Step 5: Build `Levels.astro`**

- **Markup:** REF-D lines 665–734, generated from `levels`:
  - Each `<li class="level hl" data-level={l.n}>` has 4 `<i>` in `.meter`. Add `class="on"` to the first `l.n` of them.
  - The `<h3>` is `{l.title}<em>{l.em}</em>`; style `em` as `font-family: var(--serif); font-style: italic`.
  - Chips: map `l.refs` to `{ href: '#sys-<slug>' | '#co-<slug>', company, label }`.
    - Look up systems by id: company = the system's company name, label = the system title.
    - Look up companies by id: company = the name, label = `'Operating model'` for `cylerity` and `'Advisory'` for `gupta-advisory`. Put these two labels in a `const chipLabels: Record<string, string>` at the top of `Levels.astro`.
  - Keep the `lvfig` figure (REF-D 672–684). Section head: `§ 03`, `How AI fits`, `Sheet 03 / 06`.
- **Styles:** port REF-D lines 255–310, with these changes:
  - Remove `.level`'s `border-top` and replace it with `margin-top: 2px` between rows.
  - Give `.level:hover` the background `var(--s2)` as before. The rows are separated by spacing and the hover surface instead of rules (spec 6.6).

- [ ] **Step 6: Build `Timeline.astro`**

- **Setup:** use `getCollection('companies')` and `getCollection('systems')`, then `buildTimeline` and `numberSystems`.
- **Entries:** for each entry, render REF-D's markup from lines 745–840:
  - `article.entry` gets the class `now` when `end === null`, and `id="co-{id}"`.
  - `.meta .date` shows `formatRange(start, end, kind === 'group')`. `.meta .role` shows `role`, or `'Earlier work'` for the group.
  - `h3` is the name. `.desc` is the summary. For `gupta-advisory`, render the summary as `<blockquote>` (REF-D 752).
  - For `kind === 'company'`: `<a class="more" href={`/work/${id}`} data-popup-link>{site.companyLinkLabel(name)}<Icon name="arrow-right" /></a>`.
  - `.cards` holds one `<a class="card hl" id={`sys-${s.id}`} href={`/work/${s.id}`} data-popup-link>` per system. Inside:
    - `.card-top`: the SYS number, plus `.lvs` badges from `levelsFor(s.id, levels)` shown as `L{n}`;
    - `h4`: the title;
    - `p`: the summary;
    - `p.out` if there's an outcome;
    - `.card-open`: `Open schematic` if `s.data.diagram`, otherwise `Read`, plus the arrow icon.
  - `.cards.three` for the group. Add `.wide` to a card when it's the only one in its company.
- **Top line:** above the first entry: `<p class="next"><b>Next</b> — {site.next.name}. <span class="soon">{site.next.note}</span></p>`.
- **Section head:** `§ 04`, `Work`, `Fig. 4.1 — Timeline, newest first`. Intro: `h2` "Companies, and the systems inside them." with the lead from REF-D line 742. Mark the lead as draft (it's covered by `site.drafts.hero`).
- **Styles:** port REF-D lines 312–379, with these changes (spec 6.6: fewer lines, bolder inside-link):
  - `.entry`: **delete** `border-top`.
  - `.card .out`: **delete** `border-top` and `padding-top`; keep the `→` marker.
  - `.more`: replace the whole rule with:

```css
.more{margin-top:16px;display:inline-flex;align-items:center;gap:10px;min-height:36px;font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--text);transition:color .2s var(--ease)}
.more :global(svg){width:14px;height:14px;color:var(--accent);transition:transform .3s var(--ease)}
.more:hover{color:#fff}
.more:hover :global(svg){transform:translateX(4px)}
```

  - The whole card is now an `<a>`. Remove the `.card-hit` overlay rules, and add `.card{color:inherit} .card:focus-visible{outline-offset:2px}`.

- [ ] **Step 7: Build `WritingTeaser.astro`**

- **Setup:** `getCollection('writing', ({ data }) => !data.draft)`, sorted by `date` descending, first 3.
- **Markup:** REF-D lines 845–864. Each `.post` links to `/writing/{id}`. `time` is `datetime={date.toISOString().slice(0,7)}`, formatted as `Feb 2026`. After `.posts`, add `<a class="more" href="/writing">All writing<Icon name="arrow-right" /></a>`, styled the same way as in the timeline.
- **Section head:** `§ 05`.
- **Styles:** port REF-D lines 381–395, with these changes:
  - `.posts`: **delete** `border-top`.
  - `.post`: **delete** `border-bottom`.
  - `.post::after` (desktop hairline): **delete**.
  - Keep the hover surface.

- [ ] **Step 8: Compose `HomePage.astro` and `index.astro`, and port the site scripts**

`HomePage.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from './home/Hero.astro';
import About from './home/About.astro';
import Levels from './home/Levels.astro';
import Timeline from './home/Timeline.astro';
import WritingTeaser from './home/WritingTeaser.astro';
interface Props { openSlug?: string; title?: string; description?: string; ogImage?: string; path?: string }
const { openSlug, ...seo } = Astro.props;
---
<BaseLayout {...seo}>
  <main>
    <Hero />
    <About />
    <Levels />
    <Timeline />
    <WritingTeaser />
  </main>
</BaseLayout>
```

`index.astro`: `<HomePage />`.

`src/scripts/site.ts`: append ports of REF-D lines 1179–1230:
- scroll reveal with IntersectionObserver on `.rv`;
- pointer-following highlight setting `--mx`/`--my` on `.hl`;
- index chips that scroll to the target and add `is-target` for 2.2s.

In those ports:
- Convert `var` and IIFE style to typed module code.
- Wrap the reveal in `if (!matchMedia('(prefers-reduced-motion: reduce)').matches)`, and add `.in` to every `.rv` immediately otherwise.
- Make the index-chip handler read `a.chip[href^="#"]`, find the target with `document.querySelector(href)`, call `scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })`, and update `history.replaceState(null, '', href)`.

Delete `src/styles/global.css`, `src/scripts/motion.ts`, `src/scripts/modals.ts`, `src/scripts/filters.ts` and `src/data/projects.ts`.

- [ ] **Step 9: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/home.spec.ts tests/e2e/hero.spec.ts tests/e2e/layout.spec.ts`
Expected: all pass. Add `'/'` breakpoints as needed in `layout.spec.ts`; it already covers `/`.

- [ ] **Step 10: Visual check in the browser**

Run `npm run dev` and open `http://localhost:4321` at 1280px and at 375px. Compare it with REF-D. These differences are expected and correct:
- fewer rules between entries, posts and footer;
- a bold inside-link with no underline;
- no amber-square logo;
- an extra About section.

Fix anything that differs from REF-D for any other reason.

- [ ] **Step 11: Commit**

```bash
git add -A aaryush
git commit -m "feat: homepage sections from content collections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Job and system pop-ups with real URLs

**Files:**
- Create: `src/lib/routes.ts`, `src/components/popup/{PopupShell,JobView,SystemView}.astro`, `src/components/SystemDiagram.astro`, `src/styles/diagram.css`, `src/pages/work/[slug].astro`, `src/scripts/popups.ts`
- Modify: `src/components/HomePage.astro`
- Test: `tests/unit/routes.test.ts`, `tests/e2e/popups.spec.ts`

**Interfaces:**
- Consumes:
  - Task 3: the collections, `buildTimeline`, `numberSystems`, `formatRange`, `levelsFor` and `workSlugs`.
  - Task 4: `diagrams`, `nodeHits`, `pointAt`, `polylineLength`, `pathD`, `boxPath` and `isDiamond`.
- Produces:
  - `parseWorkPath(pathname: string): string | null`.
  - `<SystemDiagram name={DiagramKey} />`, which renders `svg.dg[data-runtime]` with `[data-node="<i>"]` groups. It's fully visible without JS.
  - From `popups.ts`, `mountDiagrams(root)` and `stopDiagrams()` are imported from `./diagram`, which Task 7 creates. In this task, create `src/scripts/diagram.ts` as a stub that exports both functions as no-ops.
  - DOM contract:
    - `dialog#popup.sheet` contains `[data-popup-body]`, `a[data-popup-back]`, `a[data-popup-close]` and `[data-popup-crumb]`;
    - there's one `<template id="popup-<slug>">` for every work slug;
    - each view is `article.view[data-title][data-crumb][data-parent?][data-parent-name?]`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseWorkPath } from '../../src/lib/routes';

describe('parseWorkPath', () => {
  it('extracts the slug', () => expect(parseWorkPath('/work/cylerity-intake')).toBe('cylerity-intake'));
  it('accepts a trailing slash', () => expect(parseWorkPath('/work/cylerity/')).toBe('cylerity'));
  it('rejects other paths', () => {
    expect(parseWorkPath('/')).toBeNull();
    expect(parseWorkPath('/work')).toBeNull();
    expect(parseWorkPath('/work/')).toBeNull();
    expect(parseWorkPath('/writing/x')).toBeNull();
    expect(parseWorkPath('/work/a/b')).toBeNull();
  });
  it('rejects unsafe slugs', () => {
    expect(parseWorkPath('/work/..%2F')).toBeNull();
    expect(parseWorkPath('/work/Upper')).toBeNull();
  });
});
```

`tests/e2e/popups.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog#popup');

test('direct link opens the pop-up over the homepage', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Engineering intake');
  await expect(page.locator('#hero')).toBeAttached();
  await expect(page).toHaveTitle('Engineering intake — Aaryush Gupta');
});

test('direct link then back stays on site', async ({ page }) => {
  await page.goto('/work/ready-rebound');
  await expect(dialog(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveTitle(/AI Strategy & Organizational Design/);
});

test('job → system → back to job → Esc closes', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('#co-cylerity a.more');
  await trigger.click();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await dialog(page).getByRole('link', { name: /Engineering intake/ }).click();
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  await dialog(page).locator('[data-popup-back]').click();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Cylerity');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await expect(trigger).toBeFocused();
});

test('backdrop click and close button both close', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-univise').click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(400); // backdrop clicks are ignored for 350ms after opening
  await page.mouse.click(5, 5);
  await expect(dialog(page)).toBeHidden();
  await page.locator('#sys-univise').click();
  await dialog(page).locator('[data-popup-close]').click();
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

test('every card and inside-link opens a real pop-up (no stubs)', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('main [data-popup-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
  for (const href of hrefs) {
    await page.locator(`main [data-popup-link][href="${href}"]`).first().click();
    await expect(dialog(page), href).toBeVisible();
    const text = await dialog(page).innerText();
    expect(text, href).not.toMatch(/coming|write-up soon|lorem/i);
    expect(text.length, href).toBeGreaterThan(200);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  }
});

test('double click opens once', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-smartbenai').dblclick();
  await expect(dialog(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('modifier click is not intercepted', async ({ page, context }) => {
  await page.goto('/');
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('#sys-univise').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] }),
  ]);
  await popup.waitForLoadState();
  expect(new URL(popup.url()).pathname).toBe('/work/univise');
  await expect(dialog(page)).toBeHidden();
});

test('focus is trapped inside the open pop-up', async ({ page }) => {
  await page.goto('/');
  await page.locator('#co-gupta-advisory a.more').click();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog#popup'));
    expect(inside, `tab ${i}`).toBe(true);
  }
});

test('without JavaScript, /work pages are readable standalone pages', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/work/ready-rebound-loop');
  await expect(page.getByRole('heading', { name: 'Engineering loop' })).toBeVisible();
  await expect(page.locator('svg.dg title')).toHaveText(/Engineering loop/);
  await expect(page.locator('[data-popup-close]')).toHaveAttribute('href', '/');
  await expect(page.locator('[data-popup-back]')).toHaveAttribute('href', '/work/ready-rebound');
  await context.close();
});

test('Gupta Advisory has no availability language', async ({ page }) => {
  await page.goto('/work/gupta-advisory');
  await expect(dialog(page)).not.toContainText(/taking on|availability|now booking|small number/i);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/unit/routes.test.ts` → FAIL (module missing).
Run: `npx playwright test tests/e2e/popups.spec.ts` → FAIL (no `/work/*` pages yet).

- [ ] **Step 3: Implement `src/lib/routes.ts`**

```ts
const WORK = /^\/work\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

export function parseWorkPath(pathname: string): string | null {
  return WORK.exec(pathname)?.[1] ?? null;
}
```

- [ ] **Step 4: Implement `SystemDiagram.astro` and `diagram.css`**

`src/components/SystemDiagram.astro`:

```astro
---
import { diagrams } from '../data/diagrams';
import { boxPath, isDiamond, nodeHits, pathD, pointAt, polylineLength, type DiagramKey, type DiagramRuntime } from '../lib/diagram';
interface Props { name: DiagramKey }
const { name } = Astro.props;
const S = diagrams[name];
const runtime: DiagramRuntime = { pulse: S.pulse, inputs: S.inputs, loopStart: S.loopStart, hits: nodeHits(S) };
const rest = pointAt(S.pulse, polylineLength(S.pulse) * 0.62);
const ms = (d: number) => `--d:${Math.round(d)}ms`;
const pad = (n: number) => String(n).padStart(2, '0');
const arrow = (x: number, y: number, dx: number, dy: number) => {
  const b = 6, s = 4;
  return `M${x - dx * b - dy * s} ${y - dy * b + dx * s} L${x} ${y} L${x - dx * b + dy * s} ${y - dy * b - dx * s}`;
};
---
<svg class="dg" viewBox={`0 0 ${S.vb[0]} ${S.vb[1]}`} role="img" aria-labelledby={`dg-t-${name} dg-d-${name}`} data-runtime={JSON.stringify(runtime)}>
  <title id={`dg-t-${name}`}>{S.title}</title>
  <desc id={`dg-d-${name}`}>{S.desc}</desc>
  <g>
    {S.inputs.map(([x, y1, y2, , d]) => (
      <Fragment>
        <path d={`M${x} ${y1} V${y2}`} pathLength="1" class="ln draw" style={`${ms(d)};--dur:520ms`} />
        <path d={arrow(x, y2, 0, 1)} class="ah fade" style={ms(d + 420)} />
      </Fragment>
    ))}
    {S.edges.map((e) => {
      const dur = e.dur ?? 500;
      const a = e.p[e.p.length - 2], b = e.p[e.p.length - 1];
      return (
        <Fragment>
          {e.dash
            ? <path d={pathD(e.p, false)} class="ln dash fade" style={ms(e.d)} />
            : <path d={pathD(e.p, false)} pathLength="1" class={`ln draw${e.fb ? ' fb' : ''}`} style={`${ms(e.d)};--dur:${dur}ms`} />}
          <path d={arrow(b[0], b[1], Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1]))} class={`ah fade${e.fb ? ' fb' : ''}`} style={ms(e.d + (e.dash ? 200 : dur * 0.85))} />
        </Fragment>
      );
    })}
  </g>
  <g>
    <circle class="halo on" r="8" cx={rest[0]} cy={rest[1]} />
    <circle class="pulse on" r="3.25" cx={rest[0]} cy={rest[1]} />
  </g>
  <g>
    {S.nodes.map((n, i) => {
      const d = boxPath(n);
      const human = !isDiamond(n) && n.human;
      return (
        <g class="node" data-node={i}>
          <path d={d} class="fill fade" style={ms(n.d)} />
          {!isDiamond(n) && n.dashed
            ? <path d={d} class="box dbox fade" style={ms(n.d)} />
            : <path d={d} pathLength="1" class={`box draw${human ? ' hum' : ''}`} style={`${ms(n.d)};--dur:620ms`} />}
          {isDiamond(n)
            ? <path d={d} class="lit fade" style={ms(n.d + 560)} />
            : <path d={d} class="flash" style={ms(n.d + 520)} />}
          <path d={d} class="hl" />
          <path d={d} class="ring" />
          {human && !isDiamond(n) && <rect x={n.x + n.w - 9} y={n.y + 4} width="5" height="5" class="hm fade" style={ms(n.d + 400)} />}
        </g>
      );
    })}
  </g>
  <g>
    {S.inputs.map(([x, y1, , label, d]) => (
      <Fragment>
        <text x={x} y={y1 - 10} class="lb fade" style={ms(d)} text-anchor="middle">{label}</text>
        <circle class="in-dot" cx={x} cy={y1} r="2.5" style="opacity:0" />
      </Fragment>
    ))}
    {S.edges.flatMap((e) => (e.l ?? []).map(([t, x, y, anchor]) => (
      <text x={x} y={y} class="lb fade" style={ms(e.d + (e.dash ? 150 : (e.dur ?? 500) * 0.5))} text-anchor={anchor}>{t}</text>
    )))}
    {S.nodes.map((n, i) => isDiamond(n) ? (
      <Fragment>
        <text x={n.cx} y={n.cy + 5} class="nt fade" style={ms(n.d + 220)} text-anchor="middle">{n.t}</text>
        <text x={n.cx + n.r * 0.55 + 8} y={n.cy - n.r * 0.55 - 6} class="id fade" style={ms(n.d + 220)} text-anchor="start">{`N.${pad(i + 1)}`}</text>
      </Fragment>
    ) : (
      <Fragment>
        <text x={n.x + n.w / 2} y={n.s ? n.y + n.h / 2 - 1 : n.y + n.h / 2 + 5} class="nt fade" style={ms(n.d + 220)} text-anchor="middle">{n.t}</text>
        {n.s && <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 16} class={`ns fade${n.human ? ' hum' : ''}`} style={ms(n.d + 300)} text-anchor="middle">{n.s}</text>}
        <text x={n.x} y={n.y - 7} class="id fade" style={ms(n.d + 220)} text-anchor="start">{`N.${pad(i + 1)}`}</text>
      </Fragment>
    ))}
  </g>
</svg>
```

`src/styles/diagram.css`: port REF-D lines 547–577, changing the draw and fade defaults so the diagram is visible **without JS**:

```css
.dg .draw{stroke-dasharray:1 1;stroke-dashoffset:0;transition:stroke-dashoffset var(--dur,.5s) var(--ease-d) var(--d,0ms)}
.js .dg:not(.run) .draw{stroke-dashoffset:1}
.dg .fade{opacity:1;transition:opacity .5s var(--ease) var(--d,0ms)}
.js .dg:not(.run) .fade{opacity:0}
.dg .ln.fb{stroke:rgba(242,181,68,.62)}
.js .dg:not(.closed) .ln.fb{stroke:rgba(255,255,255,.36)}

/* Node highlight + pulse when the travelling dot arrives (spec 6.6) */
.dg .node .hl{fill:rgba(242,181,68,.1);stroke:var(--accent);stroke-width:1.2;opacity:0}
.dg .node .ring{fill:none;stroke:var(--accent);stroke-width:1;opacity:0;transform-box:fill-box;transform-origin:center}
.dg .node.hit .hl{animation:node-hl .9s var(--ease) both}
.dg .node.hit .ring{animation:node-ring .9s var(--ease-out) both}
@keyframes node-hl{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
@keyframes node-ring{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}
```

Copy all the other `.dg` rules from REF-D 548–577 unchanged, apart from the two `.draw`/`.fade`/`.run` pairs replaced above. Also add REF-D lines 524–546 (`.dg-frame`, `.dg-host`, `.dg-fig`, `.lg` legend swatches) to `diagram.css`.

- [ ] **Step 5: Implement `JobView.astro`, `SystemView.astro` and `PopupShell.astro`**

`JobView.astro`:
- **Props:** `{ company, systems, numbers: Map<string,string> }`.
- **Root:** `<article class="view" data-title={name} data-crumb={`Work · ${range}`}>`.
- **Markup:** follows REF-D lines 952–1010:
  - `header.v-head`: crumbs, then `<h2 tabindex="-1">`, then `.v-role`.
  - `ul.tags`: one `L{n} — {title}` per level from the union of `levelsFor` over the company slug and its systems. Leave the tags out if there are none.
  - `.v-body` left column:
    - `The company`: the summary as `p.first`.
    - `The problem space`: only if `problem` is set.
    - `What I own`: `<Content />` from `render(company)`, then `ol.owns` if `owns` isn't empty.
  - `.v-body` aside: `dl.spec` from `facts`.
  - `section.v-sys` (only if there are systems): an `a.sys-row[href="/work/<slug>"][data-popup-link]` for every system, with the id, title, summary as `small`, the levels and `.go` (`Open schematic` or `Read`).
  - Gupta Advisory label: use `The practice` instead of `The company` when the slug is `gupta-advisory`, and `How I work` instead of `What I own`.

`SystemView.astro`:
- **Props:** `{ system, company, number }`.
- **Root:** `<article class="view" data-title={title} data-crumb={`${companyName} · ${number}`} data-parent={company.kind === 'company' ? company.id : undefined} data-parent-name={company.kind === 'company' ? company.data.name : undefined}>`.
- **Markup:** follows REF-D lines 1099–1128:
  - `header.v-head`: crumbs, then `<h2 tabindex="-1">`, then tags.
  - With a diagram: `.sys-body` holding `figure.dg-fig` (with the `.dg-frame` registration marks and `<div class="dg-host"><SystemDiagram name={diagram} /></div>`, then a `figcaption` with `Fig. {number}` and the caption, and the legend from `legend` mapped to `i.lg` + `.d`/`.a`/`.h` classes), then `.story` holding `<Content />` and `dl.spec` from `facts`.
  - Without a diagram: render `.story` in `.v-body` with `dl.spec` in the aside.

`PopupShell.astro`:
- **Props:** `{ openSlug?: string; children via slot "open" }`.
- Renders `<dialog id="popup" class="sheet" aria-labelledby="popup-title" open={openSlug ? true : undefined}>`.
- **Bar markup:** REF-D lines 934–946, with these changes:
  - The back control is `<a class="back" data-popup-back href={backHref} hidden={!backHref}><Icon name="back"/><span>{backName}</span></a>`.
  - The crumb is `<span class="crumb mono" data-popup-crumb>`.
  - The close control is `<a class="x" data-popup-close href="/" aria-label="Close"><span class="k">Esc</span><Icon name="close"/></a>`.
- **Body:** `<div class="sheet-view" data-popup-body><slot name="open" /></div>`.
- **Styles:** port REF-D lines 436–546, plus:

```css
/* Without JS the dialog is an open, non-modal element: make it a full overlay. */
html:not(.js) dialog.sheet[open]{position:fixed;inset:0;margin:auto;z-index:50;opacity:1;transform:none;box-shadow:0 0 0 100vmax rgba(4,5,7,.74)}
html.locked{overflow:hidden}
```

Change the `h2` ids so each view's `h2` has `id="popup-title"`. Only one view is ever inside the dialog, so the id stays unique.

- [ ] **Step 6: Add the templates and the open pop-up to `HomePage.astro`, and create `/work/[slug].astro`**

Extend `HomePage.astro`:
- Load the collections and build `timeline`, `numbers` and `slugs = workSlugs(...)`.
- After `</main>`:
  - render `<PopupShell openSlug={openSlug}>`;
  - inside its `open` slot, render the view for `openSlug` (a `JobView` for a company, a `SystemView` for a system);
  - then render one `<template id={`popup-${slug}`}>` per slug containing the same view component.
- Import `../styles/diagram.css`.
- Add `<script>import '../scripts/popups';</script>`.
- Compute `backHref` and `backName` for the shell when `openSlug` is a system whose company is a real company.

`src/pages/work/[slug].astro`:

```astro
---
import { getCollection, getEntry } from 'astro:content';
import HomePage from '../../components/HomePage.astro';
import { workSlugs } from '../../lib/timeline';
import { site } from '../../data/site';

export async function getStaticPaths() {
  const companies = await getCollection('companies');
  const systems = await getCollection('systems');
  return workSlugs(companies, systems).map((slug) => ({ params: { slug } }));
}

const { slug } = Astro.params as { slug: string };
const company = await getEntry('companies', slug);
const system = company ? undefined : await getEntry('systems', slug);
const name = company?.data.name ?? system!.data.title;
const description = company?.data.ogDescription ?? company?.data.summary ?? system!.data.summary;
---
<HomePage openSlug={slug} title={`${name} — ${site.name}`} description={description} ogImage={`/og/work/${slug}.png`} path={`/work/${slug}`} />
```

- [ ] **Step 7: Implement `src/scripts/popups.ts` and the `diagram.ts` stub**

`src/scripts/diagram.ts` (the stub; Task 7 replaces it):

```ts
export function mountDiagrams(_root: ParentNode): void {}
export function stopDiagrams(): void {}
```

`src/scripts/popups.ts`:

```ts
import { parseWorkPath } from '../lib/routes';
import { mountDiagrams, stopDiagrams } from './diagram';

type PopupState = { popup: string; depth: number; parent?: string };
type Direction = 'none' | 'forward' | 'back';

const dialog = document.getElementById('popup') as HTMLDialogElement | null;
if (dialog) init(dialog);

function init(dialog: HTMLDialogElement) {
  const body = dialog.querySelector<HTMLElement>('[data-popup-body]')!;
  const back = dialog.querySelector<HTMLAnchorElement>('[data-popup-back]')!;
  const crumb = dialog.querySelector<HTMLElement>('[data-popup-crumb]')!;
  const homeTitle = document.body.dataset.homeTitle ?? document.title;
  let current: string | null = null;
  let currentParent: string | null = null;
  let trigger: HTMLElement | null = null;
  let openedAt = 0;

  const template = (slug: string) => document.getElementById(`popup-${slug}`) as HTMLTemplateElement | null;
  const state = (): PopupState | null => {
    const s = history.state as PopupState | null;
    return s && typeof s.popup === 'string' ? s : null;
  };

  function render(slug: string, direction: Direction): boolean {
    const tpl = template(slug);
    if (!tpl) return false;
    stopDiagrams();
    body.replaceChildren(tpl.content.cloneNode(true));
    const view = body.querySelector<HTMLElement>('.view');
    if (!view) return false;
    if (direction !== 'none') view.classList.add('enter-v', direction === 'forward' ? 'from-r' : 'from-l');
    const parent = view.dataset.parent ?? null;
    back.hidden = !parent;
    if (parent) {
      back.href = `/work/${parent}`;
      back.querySelector('span')!.textContent = view.dataset.parentName ?? '';
    }
    crumb.textContent = view.dataset.crumb ?? '';
    document.title = `${view.dataset.title} — Aaryush Gupta`;
    current = slug;
    currentParent = parent;
    dialog.scrollTop = 0;
    mountDiagrams(body);
    view.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    return true;
  }

  function show() {
    if (dialog.open && !dialog.matches(':modal')) dialog.close();
    if (!dialog.open) { dialog.showModal(); openedAt = performance.now(); }
    document.documentElement.classList.add('locked');
    requestAnimationFrame(() => dialog.classList.add('is-in'));
  }

  function hide() {
    stopDiagrams();
    dialog.classList.remove('is-in');
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('locked');
    document.title = homeTitle;
    current = null;
    currentParent = null;
    const t = trigger;
    trigger = null;
    t?.focus({ preventScroll: true });
  }

  function open(slug: string, from: HTMLElement | null) {
    if (slug === current) return;
    if (current) {
      const s = state();
      if (s?.parent === slug) { history.back(); return; }
      history.pushState({ popup: slug, depth: (s?.depth ?? 0) + 1, parent: current } satisfies PopupState, '', `/work/${slug}`);
      render(slug, 'forward');
      return;
    }
    trigger = from;
    history.pushState({ popup: slug, depth: 1 } satisfies PopupState, '', `/work/${slug}`);
    if (render(slug, 'none')) show();
  }

  function requestClose() {
    const s = state();
    if (s && s.depth > 0) history.go(-s.depth);
    else { history.replaceState(null, '', '/'); hide(); }
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-popup-link], a[data-popup-back], a[data-popup-close]');
    if (!a) return;
    if (a.hasAttribute('data-popup-close')) { e.preventDefault(); requestClose(); return; }
    const slug = parseWorkPath(new URL(a.href, location.href).pathname);
    if (!slug || !template(slug)) return;
    e.preventDefault();
    open(slug, a.closest('dialog') ? null : a);
  });

  dialog.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
  // Ignore the second half of a double-click landing on the freshly opened backdrop.
  dialog.addEventListener('click', (e) => { if (e.target === dialog && performance.now() - openedAt > 350) requestClose(); });

  // Keep Tab inside the dialog (native modal dialogs can let focus escape to browser chrome).
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll<HTMLElement>('a[href]:not([hidden]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !dialog.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !dialog.contains(active))) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('popstate', () => {
    const slug = parseWorkPath(location.pathname);
    if (!slug) { if (current) hide(); return; }
    const direction: Direction = !current ? 'none' : slug === currentParent ? 'back' : 'forward';
    if (render(slug, direction)) show();
  });

  // Direct load of /work/<slug>: put the homepage underneath in history so Back stays on the site.
  const initial = parseWorkPath(location.pathname);
  if (initial && template(initial)) {
    history.replaceState(null, '', '/');
    history.pushState({ popup: initial, depth: 1 } satisfies PopupState, '', `/work/${initial}`);
    render(initial, 'none');
    show();
  }
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test` → all unit tests pass.
Run: `npm run build && npx playwright test tests/e2e/popups.spec.ts tests/e2e/home.spec.ts` → all pass.

- [ ] **Step 9: Commit**

```bash
git add -A aaryush
git commit -m "feat: job and system pop-ups with real URLs and no-JS fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Diagram animation (draw, loop and node pulse)

**Files:**
- Rewrite: `src/scripts/diagram.ts`
- Test: `tests/e2e/diagram.spec.ts`

**Interfaces:**
- Consumes: from Task 4, `DiagramRuntime`, `pointAt`, `polylineLength` and `crossed`. From Task 6, `svg.dg[data-runtime]` with `.pulse`, `.halo`, `.in-dot` and `g.node[data-node]`.
- Produces: `mountDiagrams(root: ParentNode): void` and `stopDiagrams(): void`. At most one animation loop runs per mounted diagram, and `stopDiagrams` cancels all of them.

- [ ] **Step 1: Write the failing e2e tests**

`tests/e2e/diagram.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const svg = (page: import('@playwright/test').Page) => page.locator('dialog#popup svg.dg');

test('diagram draws, closes the loop, and pulses nodes as the dot passes', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/\brun\b/);
  await expect(svg(page)).toHaveClass(/\bclosed\b/, { timeout: 7000 });
  await expect(page.locator('dialog#popup g.node.hit').first()).toBeAttached({ timeout: 10000 });
  const pos = () => page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  const first = await pos();
  await page.waitForTimeout(400);
  expect(await pos()).not.toBe(first);
});

test('reduced motion shows the finished diagram with no movement', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/work/ready-rebound-loop');
  await expect(svg(page)).toHaveClass(/instant/);
  await expect(svg(page)).toHaveClass(/closed/);
  const before = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  await page.waitForTimeout(1200);
  const after = await page.locator('dialog#popup .pulse').evaluate((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
  expect(after).toBe(before);
  await expect(page.locator('dialog#popup g.node.hit')).toHaveCount(0);
  await context.close();
});

test('reopening does not stack loops', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).__rafCalls = 0;
    window.requestAnimationFrame = (cb) => { (window as any).__rafCalls++; return raf(cb); };
  });
  for (let i = 0; i < 4; i++) {
    await page.locator('#sys-cylerity-intake').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  }
  await page.locator('#sys-cylerity-intake').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { (window as any).__rafCalls = 0; });
  await page.waitForTimeout(1000);
  const calls = await page.evaluate(() => (window as any).__rafCalls as number);
  // One diagram loop ≈ 60 calls/s (the hero canvas pauses while a pop-up is open, Task 8); stacked loops would be 120+.
  expect(calls).toBeLessThan(100);
});

test('pauses when hidden', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(svg(page)).toHaveClass(/closed/, { timeout: 7000 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await page.locator('dialog#popup .pulse').getAttribute('cy');
  await page.waitForTimeout(600);
  const b = await page.locator('dialog#popup .pulse').getAttribute('cy');
  expect(b).toBe(a);
});

test('diagram labels are at least 12px on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/work/cylerity-intake');
  const sizes = await page.locator('dialog#popup svg.dg text').evaluateAll((els) => els.map((t) => (t as SVGTextElement).getBoundingClientRect().height));
  for (const h of sizes) expect(h).toBeGreaterThanOrEqual(11.5);
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/diagram.spec.ts`
Expected: FAIL. The stub never adds `run`, `closed`, `instant` or `hit`.

- [ ] **Step 3: Implement `src/scripts/diagram.ts`**

```ts
import { crossed, pointAt, polylineLength, type DiagramRuntime } from '../lib/diagram';

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const SPEED = 96; // px of path per second
let stops: Array<() => void> = [];

export function stopDiagrams(): void {
  for (const stop of stops) stop();
  stops = [];
}

export function mountDiagrams(root: ParentNode): void {
  root.querySelectorAll<SVGSVGElement>('svg.dg[data-runtime]').forEach((svg) => stops.push(mount(svg)));
}

function mount(svg: SVGSVGElement): () => void {
  const rt = JSON.parse(svg.dataset.runtime ?? '{}') as DiagramRuntime;
  const len = polylineLength(rt.pulse);
  const dot = svg.querySelector<SVGCircleElement>('.pulse')!;
  const halo = svg.querySelector<SVGCircleElement>('.halo')!;
  const inDots = [...svg.querySelectorAll<SVGCircleElement>('.in-dot')];
  const nodes = new Map([...svg.querySelectorAll<SVGGElement>('g.node[data-node]')].map((g) => [Number(g.dataset.node), g]));

  const place = (s: number) => {
    const [x, y] = pointAt(rt.pulse, s);
    for (const c of [dot, halo]) { c.setAttribute('cx', x.toFixed(2)); c.setAttribute('cy', y.toFixed(2)); }
  };
  const setOn = (on: boolean) => { dot.classList.toggle('on', on); halo.classList.toggle('on', on); };

  svg.classList.remove('run', 'closed', 'instant');
  if (reduceMQ.matches) {
    svg.classList.add('instant', 'run', 'closed');
    place(len * 0.62);
    setOn(true);
    return () => {};
  }

  setOn(false);
  let raf = 0, last = 0, t = 0, s = 0, stopped = false;

  const pulseNode = (i: number) => {
    const g = nodes.get(i);
    if (!g) return;
    g.classList.remove('hit');
    void g.getBoundingClientRect(); // restart the CSS animation
    g.classList.add('hit');
  };

  const frame = (now: number) => {
    if (stopped) return;
    const dt = last ? Math.min(50, now - last) : 0;
    last = now;
    if (!document.hidden) {
      t += dt;
      inDots.forEach((c, i) => {
        const [, y1, y2, , d] = rt.inputs[i];
        const p = Math.min(1, Math.max(0, (t - d - 120) / 640));
        const eased = 1 - (1 - p) ** 3;
        c.setAttribute('cy', (y1 + (y2 - y1) * eased).toFixed(2));
        c.style.opacity = p <= 0 || p >= 1 ? '0' : '1';
      });
      if (t >= rt.loopStart - 300) svg.classList.add('closed');
      if (t >= rt.loopStart) {
        const prev = s;
        s = (s + (SPEED * dt) / 1000) % len;
        place(s);
        if (!dot.classList.contains('on')) setOn(true);
        for (const h of rt.hits) if (crossed(prev, s, h.at, len)) pulseNode(h.node);
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => { last = 0; };
  document.addEventListener('visibilitychange', onVisibility);
  const timer = window.setTimeout(() => { svg.classList.add('run'); raf = requestAnimationFrame(frame); }, 160);

  return () => {
    stopped = true;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/diagram.spec.ts tests/e2e/popups.spec.ts`
Expected: all pass.

- [ ] **Step 5: Visual check**

Run `npm run dev` and open `/work/cylerity-intake`, `/work/ready-rebound-loop` and `/work/umn-launchpad`. Check that:
- each node draws in sequence;
- the feedback edge turns amber;
- the dot circles the loop;
- every node the dot enters briefly highlights and gives off a ring;
- the launchpad labels don't clip at 375px.

If a launchpad label clips, adjust its x or y in `src/data/diagrams.ts` and re-run `npm test`.

- [ ] **Step 6: Commit**

```bash
git add aaryush/src/scripts/diagram.ts aaryush/tests/e2e/diagram.spec.ts aaryush/src/data/diagrams.ts
git commit -m "feat: animate diagrams with node highlight pulses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Hero motion, level meters and page fragments

**Files:**
- Create: `src/scripts/hero-rotator.ts`, `src/scripts/hero-schematic.ts`, `src/scripts/levels.ts`
- Modify: `src/components/home/Hero.astro` (script imports), `src/components/home/Levels.astro` (script import), `src/components/SiteFooter.astro` (fragment)
- Test: add to `tests/e2e/hero.spec.ts` and `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: the DOM contract from Task 5 (`#rot[data-subjects]`, `#slot`, `canvas#field`, `li.level[data-level] .meter i`).
- Produces: `canvas#field[data-running="true"|"false"]`, which tests read, and `li.level .meter i.fill` while hovered or focused.

- [ ] **Step 1: Write the failing e2e tests (append)**

Append to `tests/e2e/hero.spec.ts`:

```ts
test('rotating line cycles subjects, then settles', async ({ page }) => {
  await page.goto('/');
  const slot = page.locator('#slot');
  await expect(slot).toHaveText('how decisions get made');
  await expect(slot).toHaveText('how organizations work', { timeout: 15000 });
  await expect(page.locator('#rot')).toHaveClass(/is-settled/);
});

test('reduced motion shows the settled line immediately', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#slot')).toHaveText('how organizations work');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
  await context.close();
});

test('hero schematic pauses while a pop-up is open', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
  await page.locator('#sys-univise').click();
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
});

test('hero schematic pauses when scrolled away', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'true');
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await expect(page.locator('canvas#field')).toHaveAttribute('data-running', 'false');
});
```

Append to `tests/e2e/home.spec.ts`:

```ts
test('level meter fills step by step on hover and drains on leave', async ({ page }) => {
  await page.goto('/');
  const level = page.locator('li.level[data-level="3"]');
  await level.scrollIntoViewIfNeeded();
  await level.hover();
  await expect(level.locator('.meter i.fill')).toHaveCount(1, { timeout: 150 });
  await expect(level.locator('.meter i.fill')).toHaveCount(3, { timeout: 1000 });
  await page.mouse.move(0, 0);
  await expect(level.locator('.meter i.fill')).toHaveCount(0, { timeout: 1500 });
});

test('level meter fills on keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('li.level[data-level="2"] a.chip').first().focus();
  await expect(page.locator('li.level[data-level="2"] .meter i.fill')).toHaveCount(2, { timeout: 1000 });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/hero.spec.ts tests/e2e/home.spec.ts`
Expected: the new tests fail. There's no rotator, no `data-running` and no `.fill`.

- [ ] **Step 3: Implement `src/scripts/hero-rotator.ts`**

This ports REF-D lines 1231–1278 with the same timing (`HOLD`, width animation via `.meas`, a `leave`/enter slide), but reads the subjects from `#rot[data-subjects]` and settles on the markup already in `#slot`.

```ts
const rot = document.getElementById('rot');
const slot = document.getElementById('slot');
const meas = document.getElementById('meas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (rot && slot && meas) {
  const settledHTML = slot.dataset.settled ?? '';
  const subjects: string[] = JSON.parse(rot.dataset.subjects ?? '[]');
  const words = [...subjects.map((s) => `<span class="slot-w">${s}</span>`), settledHTML];
  const HOLD = 1700;
  const measure = (html: string) => { meas.innerHTML = html; return Math.ceil(meas.getBoundingClientRect().width) + 1; };
  const setWidth = (html: string, instant = false) => {
    if (instant) slot.style.transition = 'none';
    slot.style.width = `${measure(html)}px`;
    if (instant) { void slot.offsetWidth; slot.style.transition = ''; }
  };
  const settle = () => { slot.innerHTML = settledHTML; slot.style.width = ''; rot.classList.add('is-settled'); };

  if (reduced || subjects.length === 0) settle();
  else {
    let i = 0;
    const next = () => {
      i++;
      const html = words[i];
      const old = slot.firstElementChild as HTMLElement | null;
      if (old) old.classList.add('leave');
      const tmp = document.createElement('span');
      tmp.innerHTML = html;
      const incoming = tmp.firstElementChild as HTMLElement;
      incoming.classList.add('enter-w');
      slot.appendChild(incoming);
      setWidth(html);
      window.setTimeout(() => old?.remove(), 600);
      if (i === words.length - 1) window.setTimeout(settle, 650);
      else window.setTimeout(next, HOLD);
    };
    setWidth(words[0], true);
    window.setTimeout(next, 900 + HOLD);
  }
}
```

In `Hero.astro`:
- Set `data-settled` on `#slot` to the settled HTML string `<span class="slot-w">how <em>organizations</em> work</span>`, built from `site.hero.settled`.
- Add the `.slot-w.enter-w` keyframe styles from REF-D, or if REF-D animates the change differently, port that animation from REF-D lines 131–141 together with the corresponding JS in 1231–1278. The new phrase should slide up and fade in while the old one slides up and out.
- Import with `<script>import '../../scripts/hero-rotator';</script>`.

- [ ] **Step 4: Implement `src/scripts/hero-schematic.ts`**

Port REF-D lines 1280–1457 (the "living schematic" canvas) into a typed module, with these changes:
- Export nothing; it runs on import against `document.getElementById('field') as HTMLCanvasElement`.
- Convert `var` to `const`/`let`, and type the node, edge and pulse records (`{ x: number; y: number }`, `{ a: number; b: number; pts: Pt[]; len: number }`, `{ e: number; fwd: boolean; s: number; v: number; hops: number; dead: boolean }`).
- In `start()`, set `canvas.dataset.running = 'true'` after requesting the frame. In `stop()`, set it to `'false'`. In the reduced-motion branch of `refresh()`, set it to `'false'`. Initialise it to `'false'`.
- Read colours from CSS custom properties once at start (`getComputedStyle(document.documentElement).getPropertyValue('--accent')`, etc.) instead of hard-coded rgba strings where REF-D uses the palette colours.
- Keep the IntersectionObserver that sets `visible`, the `visibilitychange` handler and the resize debounce exactly as they are in REF-D.
- **Pause while a pop-up is open.** Add a `MutationObserver` on `document.documentElement` (`attributeFilter: ['class']`). When `html.locked` is present, call `stop()`; when it's removed, call `start()`. This keeps CPU low and keeps Task 7's "reopening does not stack loops" test valid (it counts animation frames while a pop-up is open).

Import it from `Hero.astro` with `<script>import '../../scripts/hero-schematic';</script>`.

- [ ] **Step 5: Implement `src/scripts/levels.ts`**

```ts
const STEP = 100; // ms between segments
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fig = document.getElementById('lvfig');

document.querySelectorAll<HTMLElement>('li.level[data-level]').forEach((level) => {
  const depth = Number(level.dataset.level);
  const segs = [...level.querySelectorAll<HTMLElement>('.meter i')].slice(0, depth);
  let timers: number[] = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  const fill = () => {
    clear();
    fig?.setAttribute('data-on', String(depth));
    segs.forEach((seg, i) => {
      if (reduced) seg.classList.add('fill');
      else timers.push(window.setTimeout(() => seg.classList.add('fill'), i * STEP));
    });
  };
  const drain = () => {
    clear();
    if (fig?.getAttribute('data-on') === String(depth)) fig.removeAttribute('data-on');
    [...segs].reverse().forEach((seg, i) => {
      if (reduced) seg.classList.remove('fill');
      else timers.push(window.setTimeout(() => seg.classList.remove('fill'), i * STEP));
    });
  };

  level.addEventListener('pointerenter', fill);
  level.addEventListener('pointerleave', drain);
  level.addEventListener('focusin', fill);
  level.addEventListener('focusout', (e) => { if (!level.contains(e.relatedTarget as Node)) drain(); });
});
```

In `Levels.astro`'s styles, replace REF-D's hover-delay meter rules (lines 286–291) with:

```css
.meter i{display:block;height:3px;border-radius:1px;background:rgba(255,255,255,.08);transition:background-color .22s var(--ease),box-shadow .22s var(--ease)}
.meter i.on{background:rgba(255,255,255,.28)}
.meter i.fill{background:var(--accent);box-shadow:0 0 8px rgba(242,181,68,.35)}
```

Import it with `<script>import '../../scripts/levels';</script>`.

- [ ] **Step 6: Add schematic fragments, sparingly**

Spec 6.6 asks for a faint structure everywhere but fewer lines. Add exactly **one** fragment: the footer figure from REF-D lines 903–920, inside `SiteFooter.astro`'s grid. Port its styles from lines 406–424 (desktop only, as in REF-D). Add its reveal (`.frag.in`) to the reveal observer in `site.ts`. Don't add fragments to other sections; the body grid already carries the page.

- [ ] **Step 7: Run the tests**

Run: `npm run build && npx playwright test`
Expected: the whole e2e suite passes.

- [ ] **Step 8: Commit**

```bash
git add -A aaryush
git commit -m "feat: hero rotator and schematic canvas, stepped level meters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Writing index and essay pages

**Files:**
- Create: `src/pages/writing/index.astro`, `src/pages/writing/[slug].astro`, `src/layouts/EssayLayout.astro`, `src/styles/essay.css`, `src/scripts/reading-progress.ts`
- Test: `tests/e2e/writing.spec.ts`; extend `tests/e2e/layout.spec.ts` paths

**Interfaces:**
- Consumes: the `writing` collection (Task 3) and `BaseLayout` (Task 2).
- Produces:
  - `/writing`, which lists entries newest first and excludes drafts.
  - `/writing/<slug>`.
  - `[data-reading-progress]` with the CSS variable `--progress` (0–1).

- [ ] **Step 1: Checkpoint — essay page styling (needs Aaryush)**

Build two throwaway mockups in `C:\Users\aaryu\code\personal\portfolio-explorations\essay-a.html` and `essay-b.html`. Both use the first three sections of "The Quiet Singularity", with the site header and dark palette.
- **A ("Signal"):** body in Instrument Sans 18px, measure 66ch, headings in Instrument Sans 500, pull quotes in Instrument Serif italic.
- **B ("Editorial"):** body in Newsreader 20px (`@fontsource-variable/newsreader`), measure 62ch, headings in Instrument Serif, small-caps section labels.

Serve them with the existing `explorations` launch config, show both to Aaryush, and record his pick in the **Notes** section at the bottom of this plan. The tokens in Step 4 cover both; set them to whichever he picks.

- [ ] **Step 2: Write the failing tests**

`tests/e2e/writing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('writing index lists essays newest first', async ({ page }) => {
  await page.goto('/writing');
  const titles = await page.locator('[data-writing-list] h2').allInnerTexts();
  expect(titles).toEqual(['This Is Bigger Than Electricity', 'The Quiet Singularity']);
});

test('essay page renders the full letter with reading progress', async ({ page }) => {
  await page.goto('/writing/bigger-than-electricity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This Is Bigger Than Electricity');
  await expect(page.locator('article')).toContainText('Don’t let them grow up in a world we were too quiet to shape.');
  const bar = page.locator('[data-reading-progress]');
  const start = Number(await bar.evaluate((el) => getComputedStyle(el).getPropertyValue('--progress') || '0'));
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(300);
  const later = Number(await bar.evaluate((el) => getComputedStyle(el).getPropertyValue('--progress')));
  expect(later).toBeGreaterThan(start);
});

test('paper page keeps references and the PDF download', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.locator('.references li')).toHaveCount(16);
  const pdf = page.getByRole('link', { name: /Download PDF/ });
  await expect(pdf).toHaveAttribute('href', '/quiet-singularity.pdf');
  const res = await page.request.get('/quiet-singularity.pdf');
  expect(res.status()).toBe(200);
});

test('essay pages link back to the writing index and home', async ({ page }) => {
  await page.goto('/writing/quiet-singularity');
  await expect(page.getByRole('link', { name: /All writing/ })).toHaveAttribute('href', '/writing');
});
```

Add `'/writing'`, `'/writing/bigger-than-electricity'` and `'/writing/quiet-singularity'` to `paths` in `tests/e2e/layout.spec.ts`.

- [ ] **Step 3: Run them to confirm they fail**

Run: `npx playwright test tests/e2e/writing.spec.ts tests/e2e/layout.spec.ts`
Expected: FAIL (404 on `/writing`).

- [ ] **Step 4: Implement `essay.css`, `EssayLayout.astro` and `reading-progress.ts`**

`src/styles/essay.css`:

```css
.essay{--essay-font:var(--font);--essay-size:18px;--essay-measure:66ch;--essay-head:var(--font);--essay-head-weight:500}
/* Variant B (if chosen in Step 1): --essay-font:"Newsreader Variable",Georgia,serif; --essay-size:20px; --essay-measure:62ch; --essay-head:var(--serif); --essay-head-weight:400 */
.essay{padding:clamp(48px,8vw,104px) 0 clamp(72px,10vw,136px)}
.essay-head,.essay-body{max-width:var(--essay-measure);margin:0 auto}
.essay-head .kicker{color:var(--text-3)}
.essay-head h1{margin-top:18px;font-family:var(--essay-head);font-weight:var(--essay-head-weight);font-size:clamp(36px,5.4vw,60px);line-height:1.04;letter-spacing:-.035em}
.essay-head .sub{margin-top:14px;color:var(--text-2);font-size:clamp(18px,2vw,22px);line-height:1.4}
.essay-head .meta{margin-top:20px;display:flex;flex-wrap:wrap;gap:8px 18px;color:var(--text-3)}
.essay-body{margin-top:clamp(40px,6vw,64px);font-family:var(--essay-font);font-size:var(--essay-size);line-height:1.75;color:var(--text)}
.essay-body p{margin:0 0 1.15em;color:color-mix(in srgb,var(--text) 88%,transparent)}
.essay-body h2{margin:2.4em 0 .8em;font-family:var(--essay-head);font-weight:var(--essay-head-weight);font-size:1.45em;letter-spacing:-.02em;line-height:1.2}
.essay-body h3{margin:1.8em 0 .6em;font-size:1.1em;font-weight:500}
.essay-body .pullquote,.essay-body .callout{margin:1.8em 0;padding-left:20px;border-left:1px solid var(--accent);font-family:var(--serif);font-style:italic;font-size:1.35em;line-height:1.4;color:var(--text)}
.essay-body .divider{margin:2.4em 0;text-align:center;color:var(--text-3);letter-spacing:.4em}
.essay-body .closing{margin-top:2em;font-family:var(--serif);font-style:italic;font-size:1.5em;line-height:1.35;color:var(--text)}
.essay-body sup{font-family:var(--mono);font-size:.62em;color:var(--accent)}
.essay-body .data-table{width:100%;border-collapse:collapse;margin:1.6em 0;font-family:var(--font);font-size:15px}
.essay-body .data-table th,.essay-body .data-table td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line)}
.essay-body .data-table th{font:400 12px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}
.essay-body .table-note{font:400 12.5px/1.5 var(--mono);color:var(--text-3)}
.essay-body .references{margin-top:3em;font-family:var(--font);font-size:14px;color:var(--text-2)}
.essay-body .references ol{list-style:decimal;padding-left:1.4em;display:grid;gap:6px}
.essay-foot{max-width:var(--essay-measure);margin:clamp(48px,7vw,80px) auto 0;display:flex;flex-wrap:wrap;gap:12px 24px}
.progress{position:fixed;top:var(--header);left:0;right:0;height:2px;z-index:19;background:transparent}
.progress::after{content:"";position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(var(--progress,0));background:var(--accent)}
@media (max-width:719px){.essay-body .data-table{display:block;overflow-x:auto}}
@media print{.top,.foot,.progress,.essay-foot{display:none}body{background:#fff;color:#000}.essay-body p,.essay-body{color:#000}}
```

`src/layouts/EssayLayout.astro`:

```astro
---
import BaseLayout from './BaseLayout.astro';
import '../styles/essay.css';
interface Props { title: string; subtitle: string; date: Date; summary: string; slug: string; pdf?: string; minutes: number }
const { title, subtitle, date, summary, slug, pdf, minutes } = Astro.props;
const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
---
<BaseLayout title={`${title} — Aaryush Gupta`} description={summary} ogImage={`/og/writing/${slug}.png`} path={`/writing/${slug}`}>
  <div class="progress" data-reading-progress aria-hidden="true"></div>
  <main class="wrap essay">
    <header class="essay-head">
      <p class="mono kicker"><a href="/writing">Writing</a> · {month}</p>
      <h1>{title}</h1>
      <p class="sub">{subtitle}</p>
      <p class="mono meta"><span>Aaryush Gupta</span><span>{minutes} min read</span></p>
    </header>
    <article class="essay-body"><slot /></article>
    <footer class="essay-foot">
      <a class="more" href="/writing">All writing</a>
      {pdf && <a class="more" href={pdf} download>Download PDF</a>}
      <a class="more" href="/#contact">Get in touch</a>
    </footer>
  </main>
  <script>import '../scripts/reading-progress';</script>
</BaseLayout>
```

Give `.more` in `essay.css` the same rules as the timeline's `.more` from Task 5, Step 6. Copy that block; don't import component-scoped CSS.

`src/scripts/reading-progress.ts`:

```ts
const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
const article = document.querySelector<HTMLElement>('.essay-body');
if (bar && article) {
  let queued = false;
  const update = () => {
    queued = false;
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
    bar.style.setProperty('--progress', p.toFixed(4));
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
```

- [ ] **Step 5: Implement the writing pages**

`src/pages/writing/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import EssayLayout from '../../layouts/EssayLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('writing', ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const words = (post.body ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const minutes = Math.max(1, Math.round(words / 230));
---
<EssayLayout title={post.data.title} subtitle={post.data.subtitle} date={post.data.date} summary={post.data.summary} slug={post.id} pdf={post.data.pdf} minutes={minutes}>
  <Content />
</EssayLayout>
```

`src/pages/writing/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
---
<BaseLayout title="Writing — Aaryush Gupta" description="Essays by Aaryush Gupta on AI and how organizations work." ogImage="/og/writing.png" path="/writing">
  <main class="wrap sec">
    <div class="sec-head mono"><span class="n">§</span><span>Writing</span><span class="f">{posts.length} entries</span></div>
    <h1 class="h2" style="margin-top:44px">Notes on where this is going.</h1>
    <ul class="posts" data-writing-list>
      {posts.map((p) => (
        <li><a class="post" href={`/writing/${p.id}`}>
          <time datetime={p.data.date.toISOString().slice(0, 10)}>{fmt(p.data.date)}</time>
          <div><h2>{p.data.title}</h2><p>{p.data.summary}</p></div>
        </a></li>
      ))}
    </ul>
  </main>
</BaseLayout>
```

Move `.posts` and `.post` styles from `WritingTeaser.astro` into `base.css` so both pages share them, and change the `h3` selectors to `:is(h2,h3)`.

- [ ] **Step 6: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/writing.spec.ts tests/e2e/layout.spec.ts tests/e2e/home.spec.ts`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A aaryush
git commit -m "feat: writing index and essay pages with reading progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Open Graph images and per-page metadata

**Files:**
- Create: `src/lib/og.ts`, `src/pages/og/[...route].png.ts`
- Delete: `public/og-image.svg`
- Test: `tests/e2e/seo.spec.ts`

**Interfaces:**
- Consumes: the collections and `site`.
- Produces:
  - `renderOg({ kicker, title, subtitle }): Promise<Buffer>`, which returns a 1200×630 PNG.
  - Image routes `/og/home.png`, `/og/writing.png`, `/og/writing/<slug>.png` and `/og/work/<slug>.png`. These match the `ogImage` paths already set in Tasks 2, 6 and 9.

- [ ] **Step 1: Write the failing test**

`tests/e2e/seo.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const pages = ['/', '/writing', '/writing/bigger-than-electricity', '/writing/quiet-singularity', '/work/cylerity', '/work/cylerity-intake', '/work/gupta-advisory', '/work/umn-launchpad'];

for (const path of pages) {
  test(`${path} has a PNG Open Graph image and its own title`, async ({ page, request }) => {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/^https:\/\/aaryush\.com\/og\/.+\.png$/);
    const local = new URL(og!).pathname;
    const res = await request.get(local);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const buf = await res.body();
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.length).toBeGreaterThan(8_000);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.{40,}/);
  });
}

test('titles are unique across pages', async ({ page }) => {
  const titles = new Set<string>();
  for (const path of pages) { await page.goto(path); titles.add(await page.title()); }
  expect(titles.size).toBe(pages.length);
});
```

The title test relies on `/work/<slug>` pages using the pop-up title server-side (`<title>` set by `HomePage`'s `title` prop in Task 6), not the JS-updated `document.title`. Both match.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/seo.spec.ts`
Expected: FAIL (`/og/*.png` returns 404).

- [ ] **Step 3: Implement `src/lib/og.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFile(require.resolve(`${pkg}/files/${file}`));
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: 'normal' | 'italic' }[]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  font('@fontsource/instrument-sans', 'instrument-sans-latin-500-normal.woff').then((data) => ({ name: 'Instrument Sans', data, weight: 500 as const, style: 'normal' as const })),
  font('@fontsource/instrument-sans', 'instrument-sans-latin-400-normal.woff').then((data) => ({ name: 'Instrument Sans', data, weight: 400 as const, style: 'normal' as const })),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff').then((data) => ({ name: 'JetBrains Mono', data, weight: 400 as const, style: 'normal' as const })),
]));

type El = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): El => ({ type, props: { style, children } });

export async function renderOg({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }): Promise<Buffer> {
  const grid = 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)';
  const tree = h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#0A0B0E', backgroundImage: grid, backgroundSize: '48px 48px', color: '#E6E7EA', fontFamily: 'Instrument Sans' }, [
    h('div', { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 2, color: '#A0A4AE', textTransform: 'uppercase' }, [
      h('div', { width: 28, height: 2, background: '#F2B544' }),
      kicker,
    ]),
    h('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
      h('div', { fontSize: title.length > 40 ? 64 : 80, fontWeight: 500, lineHeight: 1.02, letterSpacing: -2.5 }, title),
      subtitle ? h('div', { fontSize: 30, color: '#A0A4AE', lineHeight: 1.3, maxWidth: 940 }, subtitle) : null,
    ].filter(Boolean)),
    h('div', { display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 20, color: '#7D828E' }, ['aaryush.com', 'Aaryush Gupta']),
  ]);
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
```

If `require.resolve` can't find a font file, list `node_modules/@fontsource/instrument-sans/files/` and use the exact `latin-500-normal.woff` filename there. Satori needs `.woff` or `.ttf`, not `.woff2`.

- [ ] **Step 4: Implement `src/pages/og/[...route].png.ts`**

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../lib/og';
import { site } from '../../data/site';

type Props = { kicker: string; title: string; subtitle?: string };

export async function getStaticPaths() {
  const companies = await getCollection('companies', ({ data }) => data.kind === 'company');
  const systems = await getCollection('systems');
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const byId = new Map(companies.map((c) => [c.id, c.data.name]));
  return [
    { params: { route: 'home' }, props: { kicker: site.eyebrow, title: site.name, subtitle: `${site.hero.lead} ${site.hero.settled.before}${site.hero.settled.em}${site.hero.settled.after}.` } },
    { params: { route: 'writing' }, props: { kicker: 'Writing', title: 'Notes on where this is going.' } },
    ...writing.map((p) => ({ params: { route: `writing/${p.id}` }, props: { kicker: 'Writing', title: p.data.title, subtitle: p.data.subtitle } })),
    ...companies.map((c) => ({ params: { route: `work/${c.id}` }, props: { kicker: 'Work', title: c.data.name, subtitle: c.data.summary } })),
    ...systems.map((s) => ({ params: { route: `work/${s.id}` }, props: { kicker: byId.get(s.data.company.id) ?? 'Work', title: s.data.title, subtitle: s.data.summary } })),
  ] satisfies { params: { route: string }; props: Props }[];
}

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(await renderOg(props), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
```

Delete `public/og-image.svg`.

- [ ] **Step 5: Run the test and check an image by eye**

Run: `npm run build && npx playwright test tests/e2e/seo.spec.ts` → all pass.
Open `aaryush/dist/og/work/cylerity-intake.png` in the file viewer and check the layout: kicker, title, subtitle and footer, all legible.

- [ ] **Step 6: Commit**

```bash
git add -A aaryush
git commit -m "feat: generated Open Graph PNGs and per-page metadata

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 404 page and QR page

**Files:**
- Create: `src/pages/404.astro`
- Rewrite: `src/pages/qr.astro`
- Test: `tests/e2e/errors.spec.ts`

- [ ] **Step 1: Write the failing test**

`tests/e2e/errors.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

for (const path of ['/work/does-not-exist', '/writing/nope', '/definitely/not/here']) {
  test(`${path} shows the designed 404`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/not here/i);
    await expect(page.getByRole('link', { name: /Back to home/ })).toHaveAttribute('href', '/');
    await expect(page.locator('dialog#popup[open]')).toHaveCount(0);
  });
}

test('/qr still works', async ({ page }) => {
  const res = await page.goto('/qr');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue to site/ })).toHaveAttribute('href', '/');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/errors.spec.ts`
Expected: the 404 tests fail; Astro's default 404 has no matching heading or link.

- [ ] **Step 3: Implement both pages**

`src/pages/404.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Not found — Aaryush Gupta" description="This page doesn't exist." path="/404">
  <main class="wrap sec">
    <div class="sec-head mono"><span class="n">§ 404</span><span>Not found</span><span class="f">Sheet — / —</span></div>
    <h1 class="h2" style="margin-top:44px">This one’s not here.</h1>
    <p class="lead">The link may be old, or the page may have moved.</p>
    <p style="margin-top:28px"><a class="more" href="/">Back to home</a></p>
  </main>
</BaseLayout>
```

Move the `.more` rule into `base.css` (it's now used in 4 places), and remove the copies from `Timeline.astro`, `WritingTeaser.astro` and `essay.css`.

`src/pages/qr.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="QR — Aaryush Gupta" description="Scan to open aaryush.com." path="/qr">
  <main class="wrap qr">
    <img src="/assets/QR.png" alt="QR code for aaryush.com" width="320" height="320" />
    <a class="more" href="/">Continue to site</a>
  </main>
</BaseLayout>
<style>
  .qr { min-height: calc(100svh - var(--header) - 240px); display: grid; place-content: center; justify-items: center; gap: 28px; padding: 64px 0; }
  .qr img { width: min(320px, 80vw); height: auto; padding: 14px; border-radius: 14px; background: #fff; border: 1px solid var(--line-2); }
</style>
```

- [ ] **Step 4: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/errors.spec.ts tests/e2e/home.spec.ts tests/e2e/writing.spec.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A aaryush
git commit -m "feat: designed 404 and restyled QR page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Logo mark (checkpoint)

**Files:**
- Create: `src/components/Mark.astro`, plus the throwaway `C:\Users\aaryu\code\personal\portfolio-explorations\logo-options.html`
- Modify: `src/components/SiteHeader.astro`, `public/favicon.svg`
- Test: extend `tests/e2e/layout.spec.ts`

- [ ] **Step 1: Build the options page (throwaway)**

Create `portfolio-explorations/logo-options.html`. It shows each option at header size (on `#0A0B0E`, next to "Aaryush Gupta" in JetBrains Mono 13px) and at favicon size (16px and 32px). Use these four SVGs, each in a 20×20 viewBox, with `currentColor` = `#A0A4AE` and accent `#F2B544`:

```html
<!-- 1. Node: a schematic node with a connector stub ending in a live dot -->
<svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="9" height="9" stroke="currentColor"/><path d="M11.5 7H17V15" stroke="#F2B544"/><circle cx="17" cy="15.5" r="1.8" fill="#F2B544"/></svg>
<!-- 2. Loop: an almost-closed loop with the dot sitting in the gap -->
<svg viewBox="0 0 20 20" fill="none"><path d="M6 17H3V3H17V17H10" stroke="currentColor"/><circle cx="8" cy="17" r="1.8" fill="#F2B544"/></svg>
<!-- 3. Connector: A and G joined by an orthogonal line (uses text, so check font rendering) -->
<svg viewBox="0 0 40 20" fill="none"><text x="1" y="15" font-family="JetBrains Mono" font-size="14" fill="currentColor">A</text><path d="M11 10H19V6H27" stroke="#F2B544"/><text x="28" y="15" font-family="JetBrains Mono" font-size="14" fill="currentColor">G</text></svg>
<!-- 4. Wordmark only: no symbol, "Aaryush Gupta" with an amber full stop -->
```

Show the page to Aaryush, iterate if he asks, and record the choice in **Notes** below.

- [ ] **Step 2: Write the failing test**

Append to `tests/e2e/layout.spec.ts`:

```ts
test('header mark links home and has an accessible name', async ({ page }) => {
  await page.goto('/writing');
  const mark = page.locator('header .mark');
  await expect(mark).toHaveAttribute('href', '/');
  await expect(mark).toHaveAccessibleName(/Aaryush Gupta/);
  await expect(mark.locator('.mark-sq')).toHaveCount(0);
});

test('favicon is served', async ({ request }) => {
  const res = await request.get('/favicon.svg');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('<svg');
});
```

- [ ] **Step 3: Implement the chosen mark**

- Create `src/components/Mark.astro` containing the chosen SVG, with `aria-hidden="true"`, `width="20" height="20"` and `stroke`/`fill` set from `currentColor` and `var(--accent)`.
- In `SiteHeader.astro`, render `<a class="mark" href="/" aria-label="Aaryush Gupta, home"><Mark /><span class="mark-text">Aaryush Gupta</span></a>`.
- Write `public/favicon.svg` as the same SVG with hard-coded colours (`#E6E7EA` for the stroke, `#F2B544` for the accent) on a `#0A0B0E` rounded-square background (`<rect width="20" height="20" rx="4" fill="#0A0B0E"/>`).
- If option 4 (wordmark only) is chosen, `Mark.astro` renders nothing, and the favicon uses option 1's SVG.

- [ ] **Step 4: Run the tests**

Run: `npm run build && npx playwright test tests/e2e/layout.spec.ts` → all pass.

- [ ] **Step 5: Commit**

```bash
git add -A aaryush
git commit -m "feat: new header mark and favicon

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Copy review and approval gate (checkpoint)

**Files:**
- Create: `docs/redesign/copy-review.md`
- Modify: whichever of `src/data/site.ts`, `src/data/levels.ts` and `src/content/**/*.md` Aaryush edits
- Test: `tests/release/drafts.test.ts` (written in Task 3)

- [ ] **Step 1: Generate the review document**

Write `docs/redesign/copy-review.md` with one section per draft block, each quoting the current text in full:
1. **Hero:** the `site.hero.subjects` list, offered with two alternatives:
   - A: `how decisions get made / how work moves / how teams build / how products get made`
   - B: `how companies decide / how work flows / how software gets built / how teams scale`
   - C: Aaryush's own wording

   The settled line and the lede are quoted in full under it.
2. **About:** all three paragraphs.
3. **How AI fits:** the four level bodies, and the section intro from `Levels.astro`.
4. **Inside-link label**, with options: "Inside {name}", "The role", "{name} in detail", or his own.
5. **Work intro lead** (`Timeline.astro`).
6. **Every content file with `draft: true`:** the full frontmatter summary, owns, facts and body.

At the top, add: "Edit anything directly in this file. Replace an option list with the chosen wording. Delete nothing you want kept."

- [ ] **Step 2: Review with Aaryush**

Share the file and wait for his edits. Apply every change to the source files exactly as he writes it. After each file is approved, set its `draft: false` and flip the matching `site.drafts` key to `false`.

- [ ] **Step 3: Run the gate and the full suite**

Run: `npm run test:release` → Expected: PASS (no drafts left).
Run: `npm test && npm run build && npx playwright test` → Expected: all pass. Copy changes can break text-matching e2e assertions, such as the rotator's first subject in `hero.spec.ts`. Update those assertions to the approved wording; don't change the copy to fit the tests.

- [ ] **Step 4: Commit**

```bash
git add -A aaryush docs/redesign/copy-review.md
git commit -m "content: approved copy for hero, about, levels and pop-ups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Accessibility, performance and cross-browser verification

**Files:**
- Create: `tests/e2e/a11y.spec.ts`
- Modify: whatever the audits flag
- Modify: `playwright.config.ts` (add the Firefox and WebKit projects)

- [ ] **Step 1: Write the accessibility test**

`tests/e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/writing', '/writing/quiet-singularity', '/work/cylerity-intake', '/qr', '/nope']) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('every interactive element shows a visible focus state', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return 'none-needed';
      const s = getComputedStyle(el);
      return s.outlineStyle !== 'none' && s.outlineWidth !== '0px' ? 'ok' : `missing on ${el.tagName}.${el.className}`;
    });
    expect(outline === 'ok' || outline === 'none-needed', outline).toBe(true);
  }
});
```

- [ ] **Step 2: Run it and fix every finding**

Run: `npm run build && npx playwright test tests/e2e/a11y.spec.ts`
Fix each violation in the source; don't suppress rules. Muted text on `--s1` is the likeliest contrast failure. If `--text-3` fails, raise it until it passes AA.

- [ ] **Step 3: Add the Firefox and WebKit projects and run the full suite**

In `playwright.config.ts`, add these to `projects`:

```ts
{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
{ name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
```

Run: `npx playwright install firefox webkit && npx playwright test`
Expected: all pass in all four projects. The modifier-click test uses `Meta` on WebKit; the helper in that test already branches on `process.platform`. If it fails on WebKit on Windows, change the condition to `browserName === 'webkit' ? 'Meta' : 'Control'`.

- [ ] **Step 4: Lighthouse**

Run: `npm run build && npm run preview -- --port 4322`. In another terminal:

```bash
npx lighthouse http://localhost:4322/ --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lh-home.json --chrome-flags="--headless"
npx lighthouse http://localhost:4322/writing/quiet-singularity --form-factor=mobile --screenEmulation.mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lh-essay.json --chrome-flags="--headless"
node -e "for (const f of ['lh-home.json','lh-essay.json']) { const r = require('./' + f); console.log(f, Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]))); }"
```

Expected: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 and SEO ≥ 95 on both pages. If Performance is low:
- check that the hero canvas starts after the first paint (start it on `requestIdleCallback`, falling back to `setTimeout(…, 200)`);
- confirm only the font weights in use are imported;
- confirm `HomePage` doesn't inline more than about 150 KB of templates.

Delete the `lh-*.json` files afterwards; don't commit them.

- [ ] **Step 5: Manual checks (record the results in Notes)**

- [ ] Real phone (iOS Safari): scan `/qr` from another screen, then tap Save contact. The contact card should import.
- [ ] Share the Vercel preview URL (Task 16) in Slack and LinkedIn's post inspector. The preview should show the OG image.
- [ ] Keyboard only: tab through home, open a system, Tab is trapped, Esc closes, focus returns.
- [ ] macOS or iOS with Reduce Motion turned on: nothing loops.

- [ ] **Step 6: Commit**

```bash
git add -A aaryush
git commit -m "test: accessibility, cross-browser and focus coverage; audit fixes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Rewrite the project CLAUDE.md and README

**Files:**
- Rewrite: `CLAUDE.md` (repo root), `aaryush/README.md`

- [ ] **Step 1: Rewrite `CLAUDE.md`**

Replace the whole file. Keep it about 80–120 lines, with these sections:
- **Project** (one paragraph): aaryush.com, Astro 5, static, deployed by Vercel from `aaryush/`, with the legacy root files still pending removal unless Task 17 ran.
- **Commands:** `npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run test:release` (the draft gate, which must pass before deploy), and `npm run check`.
- **Purpose and voice:**
  - the internal brief sentence from the PRD;
  - positioning;
  - the voice rules (Global Constraints);
  - "no availability language, no testimonials, story over metrics (people ratios OK)";
  - "never name internal tools ('Orchestra') or the Ready Rebound city product". The confidentiality test enforces this.
- **Content model:**
  - where companies, systems, writing, levels and site copy live;
  - how to add an essay (one Markdown file in `src/content/writing/`);
  - how to add a system (one Markdown file, plus a diagram spec if it's a real system);
  - the `draft: true` workflow.
- **Architecture:**
  - `/work/<slug>` is a static page that renders home with the pop-up open;
  - the History API overlay in `popups.ts`;
  - diagrams are server-rendered SVG plus `diagram.ts` for motion, with the geometry in `src/lib/diagram.ts`;
  - the no-JS and reduced-motion guarantees.
- **Design system:** the tokens, fonts and accent rules; "fewer lines: spacing before rules"; "every animation ends on a meaningful static frame"; and REF-D as the visual reference.
- **Testing expectations:** pure logic gets a Vitest test in `tests/unit`, user-facing behaviour gets a Playwright test in `tests/e2e`, and Lighthouse thresholds are checked before release.
- **Accounts:** the repo belongs to Aaryush1; see the global CLAUDE.md for push credentials.

Remove everything else the old file described: the one-page rule, the filter system, "Focus cards not clickable" and the old Experience notes.

- [ ] **Step 2: Rewrite `aaryush/README.md`**

Ten lines: what the site is, the commands, and a pointer to `CLAUDE.md` and `docs/redesign/`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md aaryush/README.md
git commit -m "docs: rewrite project CLAUDE.md and README for the redesign

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Release

**Files:** none. This task covers git, Vercel and verification.

- [ ] **Step 1: Run the full gate**

```bash
cd aaryush && npm run test:release && npm test && npm run check && npm run build && npx playwright test
```

Expected: every command exits 0.

- [ ] **Step 2: Push the branch with the Aaryush1 account (needs Aaryush's go-ahead)**

Ask Aaryush before pushing. Then, from the repo root:

```bash
git -c credential.helper= -c credential.helper='!f() { echo username=Aaryush1; echo "password=$(gh auth token --user Aaryush1)"; }; f' push -u origin redesign
```

- [ ] **Step 3: Check the Vercel preview**

Vercel builds a preview for the pushed branch. Open it and check that:
- `/`, `/work/cylerity-intake` (loaded directly), `/writing/quiet-singularity`, `/qr` and `/nope` all render;
- `/work/cylerity` works with and without a trailing slash.

Run the LinkedIn and Slack preview checks from Task 14 Step 5 against the preview URL.

If `/work/<slug>` returns 404 on Vercel, set `build: { format: 'directory' }` explicitly in `astro.config.mjs` and confirm that Vercel's "Output Directory" is `dist` with root `aaryush`.

- [ ] **Step 4: Open the PR (needs Aaryush's go-ahead)**

```bash
GH_TOKEN=$(gh auth token --user Aaryush1) gh pr create --repo Aaryush1/portfolio --base master --head redesign --title "Redesign: Signal × Schematic" --body "$(cat <<'EOF'
Implements docs/redesign/prd.md per docs/redesign/plan.md.

- Systems-led homepage: timeline, job and system pop-ups with real URLs, self-drawing diagrams
- Writing index and essay pages; generated Open Graph images
- Dark-only Signal × Schematic design; no-JS and reduced-motion support
- Unit (Vitest) and end-to-end (Playwright) coverage of the PRD acceptance criteria

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Merge only when Aaryush says so. Merging to `master` deploys production.

---

### Task 17: Optional cleanup — legacy root files

Run this only if Aaryush asks for it after release.

- [ ] **Step 1: Confirm Vercel's root directory**

Ask Aaryush to confirm, in the Vercel project settings, that the Root Directory is `aaryush`. Don't delete anything until he confirms.

- [ ] **Step 2: Remove the files**

```bash
git rm index.html main.css qr.css qr.html "Aaryush Contact Info.vcf" "HS Grad.jpg" .nojekyll README.md
git rm -r assets
```

Before deleting each file, `git grep` for any reference to it from `aaryush/`. If anything refers to it, stop and report.

- [ ] **Step 3: Verify and commit**

Run the Task 16 Step 1 gate, then:

```bash
git commit -m "chore: remove legacy pre-Astro site files

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Update `CLAUDE.md`'s Project paragraph to drop the legacy-files note.

---

## Notes

(Record checkpoint decisions here as they happen: essay style (Task 9), logo choice (Task 12), copy approvals (Task 13), manual test results (Task 14).)

- Contact links are plain `mailto:` and `tel:` links, not the old JS-assembled obfuscation, because the spec requires contact to work without JavaScript. The same details are already public in the vCard.
- The "How AI fits" level → work references live in `src/data/levels.ts` (one source of truth). Level tags on cards and pop-ups are derived from it with `levelsFor()`, so the frontmatter has no `levels` field.
