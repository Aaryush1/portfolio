/**
 * Desk behaviour: pointer and focus light a piece (is-lit + is-open), phones tap once to open and again to enter.
 * Everything visual is CSS; this only sets classes, a little pointer tilt, and announces piece:lit / piece:unlit.
 * CSS hover/:has(:focus-visible) already covers the case where this script never runs.
 */
const pieces = Array.from(document.querySelectorAll<HTMLElement>('[data-piece]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const phone = () => matchMedia('(hover: none)').matches || innerWidth <= 700;

function light(el: HTMLElement) {
  if (el.classList.contains('is-lit')) return;
  for (const p of pieces) if (p !== el && p.classList.contains('is-lit')) unlight(p);
  el.classList.add('is-lit', 'is-open');
  document.dispatchEvent(new CustomEvent('piece:lit', { detail: { el } }));
}
function unlight(el: HTMLElement) {
  if (!el.classList.contains('is-lit')) return;
  el.classList.remove('is-lit', 'is-open');
  el.style.removeProperty('--tx');
  el.style.removeProperty('--ty');
  document.dispatchEvent(new CustomEvent('piece:unlit'));
}

for (const el of pieces) {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch' && !phone()) light(el); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && !phone() && !el.matches(':has(:focus-visible)')) unlight(el); });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || phone() || reduce.matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ty', `${(x * 6).toFixed(2)}deg`);
    el.style.setProperty('--tx', `${(-y * 5).toFixed(2)}deg`);
  });
  // a tap or click focuses the link too; only keyboard focus (:focus-visible) lights the piece, or the phone's first tap would open and follow at once
  el.addEventListener('focusin', (e) => { if ((e.target as Element).matches(':focus-visible')) light(el); });
  el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget as Node | null)) unlight(el); });
  el.querySelector<HTMLAnchorElement>('.piece-link')?.addEventListener('click', (e) => {
    if (!phone() || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (el.classList.contains('is-open')) return; // second tap follows the link
    e.preventDefault();
    for (const p of pieces) if (p !== el) unlight(p);
    light(el);
  });
}
document.addEventListener('click', (e) => {
  if (!phone()) return;
  if (!(e.target as Element).closest('[data-piece]')) for (const p of pieces) unlight(p);
});
