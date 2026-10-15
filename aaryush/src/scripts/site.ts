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

// phones have no hover: the timeline dot of the entry nearest the middle of the screen lights as you scroll
if (!matchMedia('(hover: hover) and (pointer: fine)').matches && 'IntersectionObserver' in window) {
  const entries = [...document.querySelectorAll<HTMLElement>('.entry')];
  const seen = new Set<HTMLElement>();
  let lit: HTMLElement | null = null;
  const pick = () => {
    const mid = innerHeight / 2;
    let best: HTMLElement | null = null, bestD = Infinity;
    seen.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestD) { bestD = d; best = el; }
    });
    if (best !== lit) { lit?.classList.remove('is-near'); (best as HTMLElement | null)?.classList.add('is-near'); lit = best; }
  };
  const io = new IntersectionObserver((list) => {
    list.forEach((en) => { if (en.isIntersecting) seen.add(en.target as HTMLElement); else seen.delete(en.target as HTMLElement); });
    pick();
  }, { rootMargin: '-35% 0px -35% 0px' });
  entries.forEach((el) => io.observe(el));
  let raf = 0;
  addEventListener('scroll', () => { if (!raf && seen.size > 1) raf = requestAnimationFrame(() => { raf = 0; pick(); }); }, { passive: true });
}

// back to top: the header is sticky, so jumping to it barely moves; go to the real top instead
document.querySelectorAll<HTMLAnchorElement>('a[data-to-top]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
    document.querySelector<HTMLElement>('#top a, #top button')?.focus({ preventScroll: true });
  });
});
