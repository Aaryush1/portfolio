/*
 * Hero rotator: shared-letter morph.
 * Each subject is laid out as real in-flow letters. When the subject changes, the next one is built,
 * letters both phrases share glide (FLIP) from their old positions to their new ones, letters that
 * disappear rise out, and new letters arrive with a brief amber tint that settles to the text colour.
 * Web Animations only: no rAF loop, and no timer runs once the line has settled or while it is paused.
 */
const rot = document.getElementById('rot');
const slot = document.getElementById('slot');
const root = document.documentElement;

import { changedLetters, classifyWords, morphTiming, type MorphTiming } from '../lib/morph-timing';

type Ch = { el: HTMLElement; ch: string; em: boolean; w: number; r: DOMRect };
type Runs = [string, boolean][];

if (rot && slot) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settledHTML = slot.dataset.settled ?? slot.innerHTML;
  const subjects: string[] = JSON.parse(rot.dataset.subjects ?? '[]');
  const EASE_OUT = 'cubic-bezier(.22,.8,.2,1)';
  const EASE_IN = 'cubic-bezier(.4,0,1,1)';

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

    let chars: Ch[] = [];
    const build = (runs: Runs) => {
      slot.textContent = '';
      chars = [];
      let word: HTMLElement | null = null;
      let wi = -1;
      for (const [t, em] of runs) {
        for (const ch of t) {
          if (ch === ' ') {
            // the word space is its own fixed-width element: never collapsed, never matched or animated (not tracked in `chars`)
            const sp = document.createElement('span');
            sp.className = 'mc sp';
            sp.textContent = ' ';
            slot.append(sp);
            word = null;
            continue;
          }
          if (!word) { word = document.createElement('span'); word.className = 'mw'; slot.append(word); wi++; }
          const el = document.createElement('span');
          el.className = em ? 'mc em' : 'mc';
          el.textContent = ch;
          word.append(el);
          chars.push({ el, ch, em, w: wi, r: new DOMRect() });
        }
      }
    };
    const measureChars = () => chars.forEach((c) => (c.r = c.el.getBoundingClientRect()));

    // Longest common subsequence of identical letters, keeping only pairs that move a short distance.
    const match = (A: Ch[], B: Ch[], ax: number, bx: number, maxd: number) => {
      const n = A.length, m = B.length;
      const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
      const eq = (a: Ch, b: Ch) => a.ch === b.ch && a.em === b.em && Math.abs(a.r.left - ax - (b.r.left - bx)) < maxd;
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
        dp[i][j] = eq(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      const pairs = new Map<number, number>();
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (eq(A[i], B[j])) { pairs.set(j, i); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
      }
      return pairs;
    };

    const transition = (runs: Runs, final: boolean, { scale: S, tiny }: MorphTiming) => {
      const s0 = slot.getBoundingClientRect();
      measureChars();
      const old = chars;
      build(runs);
      const s1 = slot.getBoundingClientRect();
      measureChars();
      const fs = parseFloat(getComputedStyle(slot).fontSize);
      const pairs = match(old, chars, s0.left, s1.left, fs * 4);
      // a letter whose old and new spots sit on different lines crossfades instead of flying across
      for (const [j, i] of [...pairs]) {
        if (Math.abs(old[i].r.top - s0.top - (chars[j].r.top - s1.top)) > fs * 0.6) pairs.delete(j);
      }
      const used = new Set(pairs.values());
      const W = Math.max(s1.width, 1);
      let rank = 0;
      const arriving = new Array<number>(Math.max(0, ...chars.map((c) => c.w)) + 1).fill(0);
      chars.forEach((c, j) => { if (!pairs.has(j)) arriving[c.w]++; });
      const roles = classifyWords(arriving);

      chars.forEach((c, j) => {
        const frac = (c.r.left - s1.left) / W;
        if (pairs.has(j)) {
          const o = old[pairs.get(j)!];
          const dx = o.r.left - s0.left - (c.r.left - s1.left);
          const dy = o.r.top - s0.top - (c.r.top - s1.top);
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
          c.el.animate(
            [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }],
            { duration: 600 * S, delay: (40 + frac * 100) * S, easing: EASE_OUT, fill: 'backwards' },
          );
        } else {
          // lands, holds the amber a beat (longer on a tiny change, where it is the highlight), then settles to text
          // an incidental change (not the word that changes most) gets a quarter of the amber for half as long
          const quiet = roles[c.w] === 'incidental';
          const tint = quiet ? `color-mix(in srgb, ${accent} 25%, ${textColor})` : accent;
          const land = 330 * S;
          const hold = (final ? 0 : tiny ? 250 : 120) * (quiet ? 0.5 : 1);
          const fade = (final ? 640 : tiny ? 350 : 450) * (quiet ? 0.5 : 1);
          const total = land + hold + fade;
          c.el.animate([
            { opacity: 0, transform: 'translateY(.34em)', color: tint, easing: EASE_OUT },
            { opacity: 1, transform: 'translateY(0)', color: tint, offset: land / total, easing: 'linear' },
            { opacity: 1, transform: 'translateY(0)', color: tint, offset: (land + hold) / total, easing: 'linear' },
            { opacity: 1, transform: 'translateY(0)', color: textColor },
          ], { duration: total, delay: (290 + Math.min(rank, 14) * 14 + frac * 50) * S, fill: 'backwards' });
          rank++;
        }
      });

      old.forEach((o, i) => {
        if (used.has(i)) return;
        const g = document.createElement('span');
        g.className = 'mc ghost';
        g.textContent = o.ch;
        g.style.left = `${o.r.left - s0.left}px`;
        g.style.top = `${o.r.top - s0.top}px`;
        slot.append(g);
        const a = g.animate(
          [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-.3em)' }],
          { duration: 250 * S, delay: ((o.r.left - s0.left) / Math.max(s0.width, 1)) * 40 * S, easing: EASE_IN, fill: 'forwards' },
        );
        a.onfinish = () => g.remove();
      });

      // the full stop sits outside the slot and follows the last letter, so the width glides in step
      slot.animate(
        [{ width: `${s0.width}px` }, { width: `${s1.width}px` }],
        { duration: 600 * S, delay: 40 * S, easing: EASE_OUT, fill: 'backwards' },
      );
    };

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
