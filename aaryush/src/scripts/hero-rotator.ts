/*
 * Hero rotator: shared-letter morph.
 * Each subject is laid out as real in-flow letters, and the morph itself lives in ./morph (shared with the contextOS re-type).
 * Web Animations only: no rAF loop, and no timer runs once the line has settled or while it is paused.
 */
const rot = document.getElementById('rot');
const slot = document.getElementById('slot');
const root = document.documentElement;

import { changedLetters, morphTiming } from '../lib/morph-timing';
import { createMorph, type Runs } from './morph';

if (rot && slot) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settledHTML = slot.dataset.settled ?? slot.innerHTML;
  const subjects: string[] = JSON.parse(rot.dataset.subjects ?? '[]');

  const settle = () => {
    root.classList.remove('rot-pre');
    slot.innerHTML = settledHTML;
    slot.style.width = '';
    rot.classList.add('is-settled');
  };

  if (reduced || subjects.length === 0 || !slot.animate || !root.classList.contains('rot-pre')) settle();
  else {
    const textColor = getComputedStyle(slot).color;
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#F2B544';

    const settledRuns: Runs = [];
    const tpl = document.createElement('div');
    tpl.innerHTML = settledHTML;
    const walk = (n: Node, em: boolean) => {
      n.childNodes.forEach((c) => {
        if (c.nodeType === 3) settledRuns.push([c.textContent ?? '', em]);
        else if (c instanceof HTMLElement) walk(c, em || c.tagName === 'EM');
      });
    };
    walk(tpl, false);
    const phrases: Runs[] = [...subjects.map((s): Runs => [[s, false]]), settledRuns];

    const texts = phrases.map((r) => r.map(([t]) => t).join(''));
    const { build, transition } = createMorph(slot, textColor, accent);

    // pacing: nothing advances while the tab is hidden or the hero is offscreen
    let visible = true;
    let pending: (() => void) | null = null;
    const canRun = () => visible && !document.hidden;
    const resume = () => {
      if (pending && canRun()) { const f = pending; pending = null; f(); }
    };
    const later = (fn: () => void, ms: number) => window.setTimeout(() => (canRun() ? fn() : (pending = fn)), ms);
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; resume(); })
      : null;
    io?.observe(rot);
    document.addEventListener('visibilitychange', resume);
    const teardown = () => { io?.disconnect(); document.removeEventListener('visibilitychange', resume); };

    build(phrases[0]); // same text as the first paint, now as letters

    let i = 0;
    const next = () => {
      i++;
      const final = i === phrases.length - 1;
      const timing = final ? morphTiming(Infinity) : morphTiming(changedLetters(texts[i - 1], texts[i]));
      transition(phrases[i], final, timing);
      if (final) later(() => { rot.classList.add('is-settled'); root.classList.remove('rot-pre'); teardown(); }, 1100);
      else later(next, 950 * timing.scale + timing.hold);
    };

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      later(next, 900 + 1500);
    };
    // the serif only appears in the final phrase; load it first so its letters are measured at their real width
    if (document.fonts?.load) {
      Promise.all([document.fonts.ready, document.fonts.load('italic 40px "Instrument Serif"')]).then(go, go);
      window.setTimeout(go, 2200);
    } else go();
  }
}

export {};
