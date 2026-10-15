/**
 * The reading bar, the same on every kind: a hairline under the header that fills as you read, with a small gap at each
 * section break and the current section's stretch of the line a little brighter.
 *  - paper: its `##` sections; note: its cards. Breaks sit at the cumulative word count, so a longer section takes more bar.
 *  - letter: its folds, in equal parts (the same split the memory code reads a letter by).
 * It also publishes the current section (essay:section) for the room's memory.
 */
import { currentSection } from '../lib/sections';
import { equalStarts, progressAt, sectionAtProgress, segmentBounds, startsFromWords, tickStarts } from '../lib/reading-bar';

const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
const article = document.querySelector<HTMLElement>('.essay-body');

if (article) {
  const kind = article.dataset.kind ?? '';
  const folds = Number(article.dataset.sections) || 0;
  let heads: HTMLElement[] = [];
  let starts: number[] = []; // where each section begins, as a fraction of the bar
  let queued = false;
  let lastSection = -1;
  let lastSeg = '';

  const words = (n: Node) => (n.textContent ?? '').split(/\s+/).filter(Boolean).length;

  const measure = () => {
    heads = Array.from(article.querySelectorAll<HTMLElement>('h2:not(.references h2)')); // convention: a paper's bibliography is wrapped in <div class="references"> and is not a section
    if (kind === 'letter') {
      starts = equalStarts(folds);
    } else {
      // words before each heading, counting the body only (not the signature or the references)
      const before: number[] = [];
      let total = 0;
      for (const child of Array.from(article.children)) {
        if (child.matches('.signature, .references')) continue;
        const i = heads.indexOf(child as HTMLElement);
        if (i >= 0) before[i] = total;
        else {
          const inner = heads.findIndex((h) => child.contains(h));
          if (inner >= 0) before[inner] = total;
        }
        total += words(child);
      }
      starts = startsFromWords(heads.map((_, i) => before[i] ?? 0), total);
    }
    if (bar) {
      bar.querySelectorAll('.tick').forEach((t) => t.remove());
      for (const s of tickStarts(starts)) {
        const t = document.createElement('i');
        t.className = 'tick';
        t.style.left = `${(s * 100).toFixed(3)}%`;
        bar.appendChild(t);
      }
      lastSeg = '';
    }
  };

  const paintSegment = (idx: number) => {
    if (!bar) return;
    const b = segmentBounds(starts, idx);
    const key = b ? `${b[0].toFixed(4)}-${b[1].toFixed(4)}` : '';
    if (key === lastSeg) return;
    lastSeg = key;
    if (b) {
      bar.style.setProperty('--seg-a', `${(b[0] * 100).toFixed(3)}%`);
      bar.style.setProperty('--seg-b', `${(b[1] * 100).toFixed(3)}%`);
    } else {
      bar.style.removeProperty('--seg-a');
      bar.style.removeProperty('--seg-b');
    }
  };

  const update = () => {
    queued = false;
    const rect = article.getBoundingClientRect();
    const H = window.innerHeight;
    const span = rect.height - H;
    const lin = span <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / span));
    if (heads.length) {
      const idx = currentSection(heads.map((h) => h.getBoundingClientRect().top), H);
      // current state for late listeners (the room's memory reads this on init, in case it missed the first event)
      document.documentElement.dataset.essaySection = JSON.stringify({ index: idx, total: heads.length, kind });
      if (idx !== lastSection) {
        lastSection = idx;
        document.dispatchEvent(new CustomEvent('essay:section', { detail: { index: idx, total: heads.length, kind } }));
      }
    }
    // The reading line runs from the top of the article (at the start) to its foot (at the end). Between section headings the fill moves
    // evenly, so it crosses each break just as that heading reaches the line, whatever the pixels per word. Letters are plain fractions.
    let p = lin;
    if (kind !== 'letter' && heads.length) {
      const y = -rect.top + lin * H;
      p = progressAt(y, heads.map((h) => h.getBoundingClientRect().top - rect.top), starts, rect.height);
      if (span <= 0) p = 1;
    }
    paintSegment(sectionAtProgress(starts, p));
    bar?.style.setProperty('--progress', p.toFixed(4));
  };

  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const onResize = () => { onScroll(); };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  // fonts and images change the height, never the word counts, so the breaks stay put; only the fill and current section follow
  update();
}
