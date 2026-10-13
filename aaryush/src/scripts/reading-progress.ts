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
