// The bundle is here, so the 4s "show everything" fallback armed by the inline boot script is not needed.
clearTimeout((window as unknown as { __rvT?: number }).__rvT);
import { decode, emailOf, phoneOf } from './obf';

const top = document.getElementById('top');
const onScroll = () => top?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Assemble obfuscated contact links at runtime (scraper protection: never in HTML).
// The scheme is derived from data-obf so the literal protocol strings never ship in the bundle either.
document.querySelectorAll<HTMLAnchorElement>('a[data-obf][data-v]').forEach((a) => {
  const { kind, parts } = decode(a);
  const scheme = kind === 'mail' ? kind + 'to' : kind;
  a.href = scheme + ':' + (kind === 'mail' ? parts[0] + '@' + parts[1] : parts.join(''));
});

// Printing (E4): the drawing sheet shows the email and phone as plain text. They are assembled here,
// from the same split parts, only for the printout, and removed again afterwards.
const printBox = document.querySelector<HTMLElement>('[data-print-contact]');
if (printBox) {
  window.addEventListener('beforeprint', () => {
    const rows: [string, string][] = [];
    document.querySelectorAll<HTMLAnchorElement>('[data-contact="hero"] a[data-obf][data-v]').forEach((a) => {
      const { kind, parts } = decode(a);
      rows.push(kind === 'mail' ? ['Email', emailOf(parts)] : ['Phone', phoneOf(parts)]);
    });
    printBox.replaceChildren(...rows.map(([label, value]) => {
      const p = document.createElement('p');
      const k = document.createElement('span');
      const v = document.createElement('span');
      k.textContent = label;
      v.textContent = value;
      p.append(k, v);
      return p;
    }));
  });
  window.addEventListener('afterprint', () => printBox.replaceChildren());
}

// ---------- Homepage: reveal, pointer glow, depth meters, index chips ----------
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealTargets = document.querySelectorAll<HTMLElement>('.rv, .frag');
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
