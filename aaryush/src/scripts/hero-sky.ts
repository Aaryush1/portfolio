// Hero background: the live star chart (E17). This file is the small part that ships with the page. It stamps the
// period on the canvas, shows the `t` preview label, and loads the sky itself (scripts/sky/engine.ts, with the baked
// star data) after first paint, in idle time, so it never competes with LCP. The canvas then fades in.
// Lifecycle (pause when offscreen, hidden or a pop-up is open; a still frame under reduced motion) lives in the engine
// and is what tests/e2e/hero.spec.ts depends on.

import { resolvePart } from './sky-part';
import type { SkyHandle } from './sky/engine';

declare global {
  interface Window { __sky?: SkyHandle }
}

const hero = document.getElementById('hero');
const cv = document.getElementById('field') as HTMLCanvasElement | null;

if (hero && cv) {
  const root = document.documentElement;
  cv.dataset.running = 'false';
  cv.dataset.daypart = resolvePart(root);

  let tag: HTMLElement | null = null, tagTimer = 0;
  function showTag(name: string) {
    tag?.remove();
    clearTimeout(tagTimer);
    tag = document.createElement('div');
    tag.className = 'dp-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = `Field · ${name}`;
    hero!.appendChild(tag);
    const el = tag;
    tagTimer = window.setTimeout(() => { el.remove(); if (tag === el) tag = null; }, 2200);
  }

  // The shared `t` preview (daypart-override.ts) announces each step; the sky follows and shows its label.
  // Until the engine loads, only the stamp changes. The engine reads the period itself when it starts.
  document.addEventListener('daypart:change', (e) => {
    cv.dataset.daypart = resolvePart(root);
    showTag((e as CustomEvent<{ name: string }>).detail.name);
  });
  new MutationObserver(() => { if (!window.__sky) cv.dataset.daypart = resolvePart(root); }).observe(root, { attributes: true, attributeFilter: ['data-daypart'] });

  let started = false;
  async function load() {
    if (started) return;
    started = true;
    try {
      const { mountSky } = await import('./sky/engine');
      const handle = mountSky(hero!, cv!);
      if (handle) window.__sky = handle;
    } catch {
      /* the sky is decoration: if it can't load, the hero is simply calm */
    }
  }

  // Well after first paint: wait for the page load and the web fonts (the text's final paint, which is what LCP
  // measures, happens when they land), give that a moment to settle, then start in idle time. The canvas fades in.
  const SETTLE_MS = 1200;
  const idle = () => {
    setTimeout(() => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => void load(), { timeout: 1500 });
      else void load();
    }, SETTLE_MS);
  };
  const afterFonts = () => {
    const ready = document.fonts?.ready;
    if (ready) ready.then(idle, idle); else idle();
  };
  if (document.readyState === 'complete') afterFonts();
  else window.addEventListener('load', afterFonts, { once: true });
}
