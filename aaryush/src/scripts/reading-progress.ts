import { currentSection } from '../lib/sections';

const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
const piles = document.querySelector<HTMLElement>('[data-piles]');
const article = document.querySelector<HTMLElement>('.essay-body');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

if (article) {
  const kind = article.dataset.kind ?? '';
  let heads: HTMLElement[] = [];
  let queued = false;
  let lastSection = -1;
  let sheets: HTMLElement[] = [];
  const label = document.querySelector<HTMLElement>('.pile-label');

  const buildPiles = () => {
    if (!piles) return;
    piles.textContent = '';
    sheets = heads.map((_, i) => {
      const s = document.createElement('span');
      s.className = 'pile-sh';
      s.style.setProperty('--i', String(i));
      s.style.setProperty('--r', String(((i * 37) % 9) - 4)); // slight, stable tilt in the read pile
      piles.appendChild(s);
      return s;
    });
    piles.style.setProperty('--n', String(heads.length));
  };

  const measure = () => {
    const next = Array.from(article.querySelectorAll<HTMLElement>('h2:not(.references h2)')); // the References heading is not a section
    const changed = next.length !== heads.length;
    heads = next;
    if (changed) buildPiles();
  };

  const numeral = (i: number) => {
    const m = heads[i]?.textContent?.trim().match(/^([IVX]+)\./);
    return m ? m[1] : String(i + 1);
  };

  const updatePiles = (current: number) => {
    sheets.forEach((s, i) => s.classList.toggle('moved', i < current));
    if (!label) return;
    const total = heads.length;
    const romanTotal = /^[IVX]+\./.test(heads[0]?.textContent?.trim() ?? '');
    const totalText = romanTotal ? ROMAN[total] || String(total) : String(total);
    label.textContent = current < 0 ? `${totalText} sections` : `Section ${numeral(current)} of ${totalText}`;
  };

  const update = () => {
    queued = false;
    if (piles || heads.length) {
      const idx = currentSection(heads.map((h) => h.getBoundingClientRect().top), window.innerHeight);
      if (piles) updatePiles(idx);
      if (idx !== lastSection) {
        lastSection = idx;
        document.dispatchEvent(new CustomEvent('essay:section', { detail: { index: idx, total: heads.length, kind } }));
      }
    }
    if (bar && !piles) {
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total));
      bar.style.setProperty('--progress', p.toFixed(4));
    }
  };

  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  const onResize = () => { measure(); onScroll(); };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  update();
}
