/**
 * Desk behaviour: pointer and focus light a piece (is-lit + is-open), phones tap once to open and again to enter.
 * Everything visual is CSS; this only sets classes, a little pointer tilt, and announces piece:lit / piece:unlit.
 * CSS hover/:has(:focus-visible) already covers the case where this script never runs.
 */
import { deskKey, isEditableTarget } from '../lib/keymap';
import { nearestToCenter } from '../lib/room-light';
import { aimAt } from './light-pool';
import { noteLast } from '../lib/writing-memory';
import { canWalk, clearWalk, isWalking, prefetchPiece, walkIn } from './walk-in';

const pieces = Array.from(document.querySelectorAll<HTMLElement>('[data-piece]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const phone = () => matchMedia('(hover: none)').matches || innerWidth <= 700;

const isLit = (p: HTMLElement) => p.classList.contains('is-lit');
// piece:unlit is announced one tick late and dropped if a piece:lit follows at once, so moving the light from one piece to the next
// (focus leaves one, then arrives at the other) never sends the pool toward rest and back.
let unlitTimer = 0;
const queueUnlit = () => { if (!unlitTimer) unlitTimer = window.setTimeout(() => { unlitTimer = 0; document.dispatchEvent(new CustomEvent('piece:unlit')); }, 0); };
const cancelUnlit = () => { clearTimeout(unlitTimer); unlitTimer = 0; };
// Reduced motion: the room is static and lit. Every piece stays lit; hover and focus only open or close one.
function light(el: HTMLElement, open = true) {
  const wasLit = isLit(el), wasOpen = el.classList.contains('is-open');
  // Swapping the light between pieces announces only piece:lit: an unlit straight before it would send the pool toward rest and back.
  let dropped = false;
  for (const p of pieces) {
    if (p === el) continue;
    if (reduce.matches) p.classList.remove('is-open'); else if (unlight(p, false)) dropped = true;
  }
  el.classList.add('is-lit');
  if (open) el.classList.add('is-open');
  if (!wasLit || (open && !wasOpen)) { cancelUnlit(); document.dispatchEvent(new CustomEvent('piece:lit', { detail: { el } })); }
  else if (dropped) queueUnlit();
}
/** Returns true when it changed anything. `announce` false leaves the piece:unlit event to the caller. */
function unlight(el: HTMLElement, announce = true): boolean {
  if (!isLit(el) && !el.classList.contains('is-open')) return false;
  el.classList.remove('is-open');
  if (!reduce.matches) el.classList.remove('is-lit');
  el.style.removeProperty('--tx');
  el.style.removeProperty('--ty');
  if (announce) queueUnlit();
  return true;
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

// Phones: a faint drift of dust at the foot of the first screen invites a scroll. It comes in after a moment and goes for good once the visitor scrolls.
const cue = document.querySelector<HTMLElement>('[data-scroll-cue]');
if (cue && phone() && pieces.length > 1 && scrollY < 24) {
  const on = window.setTimeout(() => cue.classList.add('is-on'), 1400);
  const off = () => {
    if (scrollY < 24) return;
    clearTimeout(on);
    cue.classList.remove('is-on');
    cue.classList.add('is-off');
    removeEventListener('scroll', off);
  };
  addEventListener('scroll', off, { passive: true });
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
  // The two-step is for fingers only: a mouse click or a keyboard/screen-reader activation follows the link at once.
  let pointer = '';
  el.querySelector<HTMLAnchorElement>('.piece-link')?.addEventListener('pointerdown', (e) => { pointer = e.pointerType; });
  el.querySelector<HTMLAnchorElement>('.piece-link')?.addEventListener('click', (e) => {
    const touched = pointer === 'touch';
    pointer = '';
    if (!touched || !phone() || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (isWalking()) { e.preventDefault(); return; }
    if (el.classList.contains('is-open')) {
      // second tap follows the link; letters, papers and notes walk in first (Task 32, 49), anything else just navigates
      const shape = el.dataset.shape;
      if ((shape === 'letter' || shape === 'paper' || shape === 'note') && walkIn(el, (e.currentTarget as HTMLAnchorElement).href, shape)) e.preventDefault();
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
// The slug is kept on this history entry (so a Back weeks later, or to a different entry, restores nothing) and consumed
// once used. writing:v1.last (localStorage, sessionStorage as the fallback) still records it for the rest of the room.
const MARK = 'deskLast';
const remember = (slug: string | undefined) => {
  if (!slug) return;
  noteLast(slug);
  try { history.replaceState({ ...(history.state && typeof history.state === 'object' ? history.state : {}), [MARK]: slug }, ''); } catch { /* ignore */ }
};
for (const el of pieces) el.querySelector('.piece-link')?.addEventListener('click', (e) => {
  remember(el.dataset.slug);
  // A note opened on a bigger screen (the view transition does the move) still tells its page to settle the cards into section marks.
  if (el.dataset.shape === 'note' && !e.defaultPrevented && !reduce.matches) { try { sessionStorage.setItem('walk-in', `note|${Date.now()}`); } catch { /* storage blocked: the marks just appear */ } }
});
addEventListener('pagehide', () => {
  const f = document.activeElement?.closest<HTMLElement>('[data-piece]');
  if (f) remember(f.dataset.slug);
});
function restoreFocus() {
  const st = history.state && typeof history.state === 'object' ? history.state : null;
  const slug: string | undefined = st?.[MARK];
  if (!slug) return;
  try { const { [MARK]: _used, ...rest } = st; history.replaceState(Object.keys(rest).length ? rest : null, ''); } catch { /* ignore */ }
  const el = pieces.find((p) => p.dataset.slug === slug);
  const link = el?.querySelector<HTMLAnchorElement>('.piece-link');
  if (!el || !link) return;
  link.focus({ preventScroll: true });
  light(el);
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' });
}
// The marker only exists on the history entry we left from (and is consumed by the first restore), so no navigation-type check is needed.
restoreFocus();
addEventListener('pageshow', (e) => { if (e.persisted) { clearWalk(); restoreFocus(); } });

// E15: arrow keys walk the desk. Left and right move the light and the keyboard focus through the pieces in visual (DOM)
// order, Home and End jump to the ends, and Enter opens the lit piece when focus is not already on its link (which opens
// natively). It sits beside Tab, not instead of it, and only acts when focus is on the page itself or on a piece.
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  const t = e.target as Element | null;
  const onPage = !t || t === document.body || t === document.documentElement;
  if (!onPage && !t.closest('[data-piece]')) return;
  // with focus on the page itself only the arrows act, so Home, End and Enter keep their native scrolling and activation
  if (onPage && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const focused = pieces.findIndex((p) => p.contains(document.activeElement));
  const current = focused >= 0 ? focused : pieces.findIndex((p) => p.classList.contains('is-open'));
  const move = deskKey({
    key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, isComposing: e.isComposing, keyCode: e.keyCode,
    editable: isEditableTarget(e.target),
    popupOpen: !!document.querySelector('dialog[open]'),
    mapOpen: !!(document.getElementById('keymap') as HTMLDialogElement | null)?.open,
  }, pieces.length, current);
  if (!move) return;
  if ('open' in move) {
    if (t?.closest('a, button')) return; // native Enter on the focused link
    e.preventDefault();
    pieces[move.open].querySelector<HTMLAnchorElement>('.piece-link')?.click();
    return;
  }
  e.preventDefault();
  const el = pieces[move.to];
  const link = el.querySelector<HTMLAnchorElement>('.piece-link');
  if (!link) return;
  link.focus({ preventScroll: true });
  light(el);
  aimAt(el, 1, 1);
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
});
