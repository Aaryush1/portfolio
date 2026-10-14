// Header mark "ag.": replays the draw-on animation on hover/focus of the home link, and tidies up the
// first-visit state. The first-visit class (html.mark-first) is decided synchronously in BaseLayout's head
// script so the mark never flashes drawn-then-blank. See Mark.astro for the animation itself.
// E11: typing `ag.` anywhere (outside text fields) replays the same draw-on. Unexplained, and nothing under reduced motion.
import { onTypedWord } from './typed-words';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function init() {
  const svg = document.querySelector<SVGElement>('.mark-svg:not([data-signature])');
  const link = svg?.closest<HTMLElement>('a');
  if (!svg || !link) return;

  let playing = false;
  const finish = () => {
    playing = false;
    svg.classList.remove('is-playing');
    root.classList.remove('mark-first');
  };
  const play = () => {
    if (reduce || playing) return;
    playing = true;
    root.classList.remove('mark-first'); // the class takes over from the first-visit state
    svg.classList.remove('is-playing');
    void svg.getBoundingClientRect(); // restart the animations
    svg.classList.add('is-playing');
    const stop = svg.querySelector('.stop');
    stop?.addEventListener('animationend', finish, { once: true });
    setTimeout(() => { if (playing) finish(); }, 2200);
  };

  if (root.classList.contains('mark-first')) {
    if (reduce) root.classList.remove('mark-first');
    else {
      // already animating via html.mark-first; add the playing class for the same duration
      playing = true;
      svg.classList.add('is-playing');
      svg.querySelector('.stop')?.addEventListener('animationend', finish, { once: true });
      setTimeout(() => { if (playing) finish(); }, 2200);
    }
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) link.addEventListener('pointerenter', play);
  link.addEventListener('focus', () => { if (link.matches(':focus-visible')) play(); });
  onTypedWord('ag.', play);
}

init();

export {};
