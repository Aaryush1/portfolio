/**
 * contextOS on the timeline (E8). When JS runs, the period after the name becomes a slow amber caret. Typing `contextos`
 * anywhere outside text fields (same guards as the keyboard map) re-types the word once with the hero's shared-letter
 * morph (./morph). Repeats while it runs are ignored. Reduced motion: the caret stays still, and the word takes one
 * instant amber tint instead. Nothing announces either part.
 */
import { changedLetters, morphTiming } from '../lib/morph-timing';
import { onTypedWord } from './typed-words';
import { createMorph } from './morph';

const WORD = 'contextOS';
const TINT_MS = 2400;
const BUSY_MAX_MS = 1500;

const line = document.querySelector<HTMLElement>('.tl-wrap > .next');
const word = line?.querySelector<HTMLElement>('.nx-word') ?? null;
const dot = line?.querySelector<HTMLElement>('.nx-dot') ?? null;

if (line && word && dot) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // The caret replaces the period. CSS blinks it unless reduced motion is on.
  dot.classList.add('caret');
  dot.textContent = '';

  const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#F2B544';
  const morph = reduced ? null : createMorph(word, getComputedStyle(word).color, accent);

  let busy = false;
  let runs = 0;

  function play() {
    word!.dataset.retype = String(++runs);
    if (reduced) {
      word!.classList.add('is-tint');
      window.setTimeout(() => { word!.classList.remove('is-tint'); busy = false; }, TINT_MS);
      return;
    }
    // Re-type: the old letters are dropped and the word arrives letter by letter, all of it new.
    morph!.transition([[WORD, false]], true, morphTiming(changedLetters('', WORD)));
    // Busy until every letter has landed and settled, so a repeat trigger in the meantime is ignored.
    // (with a ceiling: an animation that never finishes, say in a hidden tab, must not leave the word busy for good)
    const done = Promise.allSettled(word!.getAnimations({ subtree: true }).map((a) => a.finished));
    const ceiling = new Promise((r) => window.setTimeout(r, BUSY_MAX_MS));
    Promise.race([done, ceiling]).then(() => { busy = false; });
  }

  const onScreen = () => { const r = line.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; };

  // The line may be off screen: bring it into view first, then re-type.
  function whenVisible(fn: () => void) {
    if (onScreen()) return fn();
    line!.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    });
    io.observe(line!);
  }

  function trigger() {
    if (busy) return;
    busy = true;
    whenVisible(play);
  }

  // The shared typed-word listener applies the guards (fields, modifiers, composition, open pop-ups).
  onTypedWord(WORD, trigger);
}
