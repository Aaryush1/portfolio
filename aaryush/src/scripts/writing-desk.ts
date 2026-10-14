/**
 * Desk behaviour: pointer and focus light a piece (is-lit + is-open), phones tap once to open and again to enter.
 * Everything visual is CSS; this only sets classes, a little pointer tilt, and announces piece:lit / piece:unlit.
 * CSS hover/:has(:focus-visible) already covers the case where this script never runs.
 */
import { nearestToCenter } from '../lib/room-light';
import { lastOpened, noteLast } from '../lib/writing-memory';
import { canWalk, clearWalk, isWalking, prefetchPiece, walkIn } from './walk-in';

const pieces = Array.from(document.querySelectorAll<HTMLElement>('[data-piece]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const phone = () => matchMedia('(hover: none)').matches || innerWidth <= 700;

const isLit = (p: HTMLElement) => p.classList.contains('is-lit');
// Reduced motion: the room is static and lit. Every piece stays lit; hover and focus only open or close one.
function light(el: HTMLElement, open = true) {
  const wasLit = isLit(el), wasOpen = el.classList.contains('is-open');
  for (const p of pieces) {
    if (p === el) continue;
    if (reduce.matches) p.classList.remove('is-open'); else unlight(p);
  }
  el.classList.add('is-lit');
  if (open) el.classList.add('is-open');
  if (!wasLit || (open && !wasOpen)) document.dispatchEvent(new CustomEvent('piece:lit', { detail: { el } }));
}
function unlight(el: HTMLElement) {
  if (!isLit(el) && !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  if (!reduce.matches) el.classList.remove('is-lit');
  el.style.removeProperty('--tx');
  el.style.removeProperty('--ty');
  document.dispatchEvent(new CustomEvent('piece:unlit'));
}

function settleStatic() {
  if (reduce.matches) for (const p of pieces) p.classList.add('is-lit');
}
settleStatic();
reduce.addEventListener('change', () => {
  if (reduce.matches) settleStatic();
  else for (const p of pieces) if (!p.classList.contains('is-open') && !p.matches(':hover, :has(:focus-visible)')) p.classList.remove('is-lit');
});

// Phones: no hover, so the light follows the piece nearest the middle of the screen (unless one is open).
let following = 0;
function follow() {
  following = 0;
  if (!phone() || reduce.matches || pieces.some((p) => p.classList.contains('is-open'))) return;
  const best = pieces[nearestToCenter(pieces.map((p) => p.getBoundingClientRect()), innerHeight)];
  if (best && !isLit(best)) light(best, false);
}
const queueFollow = () => { if (!following && phone() && !reduce.matches) following = requestAnimationFrame(follow); };
addEventListener('scroll', queueFollow, { passive: true });
addEventListener('resize', queueFollow);
queueFollow();

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
    if (isWalking()) { e.preventDefault(); return; }
    if (el.classList.contains('is-open')) {
      // second tap follows the link; letters and papers walk in first (Task 32), anything else just navigates
      const shape = el.dataset.shape;
      if ((shape === 'letter' || shape === 'paper') && walkIn(el, (e.currentTarget as HTMLAnchorElement).href, shape)) e.preventDefault();
      return;
    }
    e.preventDefault();
    for (const p of pieces) if (p !== el) unlight(p);
    light(el);
    if (canWalk()) prefetchPiece((e.currentTarget as HTMLAnchorElement).href);
  });
}
document.addEventListener('click', (e) => {
  if (!phone()) return;
  if (!(e.target as Element).closest('[data-piece]')) { for (const p of pieces) unlight(p); queueFollow(); }
});

// Back restores the desk: remember which piece we walked into, and on a back/forward return put focus (and the light) on it.
// The slug lives in writing:v1.last (localStorage), with sessionStorage as the fallback when that is blocked.
const remember = (slug: string | undefined) => { if (slug) noteLast(slug); };
for (const el of pieces) el.querySelector('.piece-link')?.addEventListener('click', () => remember(el.dataset.slug));
addEventListener('pagehide', () => {
  const f = document.activeElement?.closest<HTMLElement>('[data-piece]');
  if (f) remember(f.dataset.slug);
});
function restoreFocus() {
  const slug = lastOpened();
  const el = slug ? pieces.find((p) => p.dataset.slug === slug) : undefined;
  const link = el?.querySelector<HTMLAnchorElement>('.piece-link');
  if (!el || !link) return;
  link.focus({ preventScroll: true });
  light(el);
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' });
}
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (nav?.type === 'back_forward') restoreFocus();
addEventListener('pageshow', (e) => { if (e.persisted) { clearWalk(); restoreFocus(); } });
