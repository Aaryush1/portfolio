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
  level.addEventListener('focusout', (e) => { if (!level.contains(e.relatedTarget as Node | null)) drain(); });
});
