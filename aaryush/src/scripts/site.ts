const top = document.getElementById('top');
const onScroll = () => top?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Assemble obfuscated contact links at runtime (scraper protection: never in HTML).
// The scheme is derived from data-obf so the literal protocol strings never ship in the bundle either.
document.querySelectorAll<HTMLAnchorElement>('a[data-obf][data-v]').forEach((a) => {
  const kind = a.dataset.obf ?? '';
  const parts = (a.dataset.v ?? '').split('|').reverse();
  const scheme = kind === 'mail' ? kind + 'to' : kind;
  a.href = scheme + ':' + (kind === 'mail' ? parts[0] + '@' + parts[1] : parts.join(''));
});

// ---------- Homepage: reveal, pointer glow, depth meters, index chips ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealTargets = document.querySelectorAll<HTMLElement>('.rv');
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('in'));
}

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll<HTMLElement>('.hl').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    });
  });
}

// Level rows light the matching square of the concentric figure.
const lvfig = document.getElementById('lvfig');
document.querySelectorAll<HTMLElement>('.level').forEach((row) => {
  const depth = row.dataset.level ?? '';
  const on = () => lvfig?.setAttribute('data-on', depth);
  const off = () => { if (lvfig?.getAttribute('data-on') === depth) lvfig.removeAttribute('data-on'); };
  row.addEventListener('mouseenter', on);
  row.addEventListener('mouseleave', off);
  row.addEventListener('focusin', on);
  row.addEventListener('focusout', (e) => { if (!row.contains(e.relatedTarget as Node | null)) off(); });
});

document.querySelectorAll<HTMLAnchorElement>('a.chip[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href') ?? '';
    const t = document.querySelector<HTMLElement>(href);
    if (!t) return;
    e.preventDefault();
    t.closest('.rv')?.classList.add('in');
    t.classList.add('in');
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    history.replaceState(null, '', href);
    t.classList.remove('is-target');
    void t.offsetWidth;
    t.classList.add('is-target');
    window.setTimeout(() => t.classList.remove('is-target'), 2200);
  });
});
