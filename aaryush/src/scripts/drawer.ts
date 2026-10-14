/**
 * The drawer under the desk. Click or Enter/Space on the front toggles it; keyboard focus opens it (like a drawer
 * that slides out as you tab to it); leaving the drawer, Escape or a pointerdown outside closes it. While it is open
 * the desk dims and the pool of light moves to the drawer, and closing hands the pool back to the rest aim.
 * Everything visual is CSS; this only sets state and drives the pool through light-pool.ts (owner 'drawer').
 */
import { aimPoint, aimRest } from './light-pool';

const drawer = document.querySelector<HTMLElement>('[data-drawer]');
const room = document.querySelector<HTMLElement>('.room');

if (drawer && room) {
  // non-null bindings, so the closures below keep the narrowing
  const panel: HTMLElement = drawer;
  const stage: HTMLElement = room;
  const front = panel.querySelector<HTMLButtonElement>('.drawer-front');
  let open = false;
  // Escape moves focus back to the front; that focus must not reopen the drawer it just closed.
  let returning = false;

  /** The drawer's centre, in room coordinates. Re-read on every layout change, so the light tracks it. */
  const drawerCentre = () => {
    const a = stage.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 };
  };

  function set(v: boolean) {
    if (v === open) return;
    open = v;
    panel.classList.toggle('is-open', v);
    front?.setAttribute('aria-expanded', String(v));
    stage.classList.toggle('drawer-open', v);
    if (v) aimPoint(drawerCentre, 0.9, 1, 'drawer');
    else aimRest('drawer');
  }

  front?.addEventListener('click', () => set(!open));
  // keyboard focus opens (pointer focus does not, so a click toggles exactly once)
  front?.addEventListener('focus', (e) => {
    if (!returning && (e.target as HTMLElement).matches(':focus-visible')) set(true);
  });
  panel.addEventListener('focusout', (e) => {
    if (!panel.contains((e as FocusEvent).relatedTarget as Node | null)) set(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (open && !panel.contains(e.target as Node)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open) return;
    set(false);
    if (front) {
      returning = true;
      front.focus();
      returning = false;
    }
  });
  // a restored page (back/forward cache) should not come back with the drawer still open
  addEventListener('pageshow', (e) => { if (e.persisted) set(false); });
}
