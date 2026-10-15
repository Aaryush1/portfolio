import { parseWorkPath } from '../lib/routes';
import { mountDiagrams, stopDiagrams } from './diagram';

type PopupState = { popup: string; depth: number; parent?: string };
type Direction = 'none' | 'forward' | 'back';

const dialog = document.getElementById('popup') as HTMLDialogElement | null;
if (dialog) init(dialog);

function init(dialog: HTMLDialogElement) {
  const body = dialog.querySelector<HTMLElement>('[data-popup-body]')!;
  const back = dialog.querySelector<HTMLAnchorElement>('[data-popup-back]')!;
  const crumb = dialog.querySelector<HTMLElement>('[data-popup-crumb]')!;
  const homeTitle = document.body.dataset.homeTitle ?? document.title;
  let current: string | null = null;
  let currentParent: string | null = null;
  let trigger: HTMLElement | null = null;
  let openedAt = 0;
  let closing = false;
  let originSlug: string | null = null; // the view the pop-up first opened on, for the focus fallback after a direct load
  let inRaf = 0;
  let escAt = -1e9; // when Esc was last pressed: tells a keyboard close request from the Android Back one

  const template = (slug: string) => document.getElementById(`popup-${slug}`) as HTMLTemplateElement | null;
  const state = (): PopupState | null => {
    const s = history.state as PopupState | null;
    return s && typeof s.popup === 'string' ? s : null;
  };

  function render(slug: string, direction: Direction): boolean {
    const tpl = template(slug);
    if (!tpl) return false;
    stopDiagrams();
    body.replaceChildren(tpl.content.cloneNode(true));
    const view = body.querySelector<HTMLElement>('.view');
    if (!view) return false;
    if (direction !== 'none') view.classList.add('enter-v', direction === 'forward' ? 'from-r' : 'from-l');
    const parent = view.dataset.parent ?? null;
    back.hidden = !parent;
    if (parent) {
      back.href = `/work/${parent}`;
      back.querySelector('span')!.textContent = view.dataset.parentName ?? '';
    }
    crumb.textContent = view.dataset.crumb ?? '';
    document.title = `${view.dataset.title} — Aaryush Gupta`;
    current = slug;
    currentParent = parent;
    dialog.scrollTop = 0;
    mountDiagrams(body);
    return true;
  }

  // Focus must move after showModal(), which otherwise focuses the first control (close link).
  function focusTitle() {
    body.querySelector<HTMLElement>('.view h2')?.focus({ preventScroll: true });
  }

  // Everything behind the pop-up is inert while it is open (a modal dialog already inerts the page, this also covers
  // engines and states where it doesn't). Dialogs (the key map), scripts and templates stay live.
  const behind = () => [...document.body.children].filter((el) => !['DIALOG', 'SCRIPT', 'TEMPLATE'].includes(el.tagName));
  function lock(on: boolean) {
    document.documentElement.classList.toggle('locked', on);
    behind().forEach((el) => el.toggleAttribute('inert', on));
  }

  function show() {
    if (dialog.open && !dialog.matches(':modal')) dialog.close();
    if (!dialog.open) { dialog.showModal(); openedAt = performance.now(); }
    lock(true);
    cancelAnimationFrame(inRaf);
    inRaf = requestAnimationFrame(() => dialog.classList.add('is-in'));
  }

  // Where focus lands when the pop-up closes: the card that opened it, else (after a direct load) its card on the page, else the work section.
  function focusTarget(): HTMLElement | null {
    if (trigger?.isConnected) return trigger;
    const slug = originSlug;
    const card = slug ? document.querySelector<HTMLElement>(`#sys-${slug}, #co-${slug} a.more`) : null;
    if (card) return card;
    const work = document.getElementById('work');
    if (work && !work.hasAttribute('tabindex')) work.tabIndex = -1;
    return work;
  }

  function hide() {
    closing = false;
    cancelAnimationFrame(inRaf);
    stopDiagrams();
    dialog.classList.remove('is-in');
    if (dialog.open) dialog.close();
    lock(false);
    document.title = homeTitle;
    current = null;
    currentParent = null;
    const t = focusTarget();
    trigger = null;
    originSlug = null;
    t?.focus({ preventScroll: true });
  }

  function open(slug: string, from: HTMLElement | null) {
    if (slug === current) return;
    if (current) {
      const s = state();
      if (s?.parent === slug) { history.back(); return; }
      history.pushState({ popup: slug, depth: (s?.depth ?? 0) + 1, parent: current } satisfies PopupState, '', `/work/${slug}`);
      if (render(slug, 'forward')) focusTitle();
      return;
    }
    trigger = from;
    originSlug = slug;
    history.pushState({ popup: slug, depth: 1 } satisfies PopupState, '', `/work/${slug}`);
    if (render(slug, 'none')) { show(); focusTitle(); }
  }

  function requestClose() {
    if (closing) return;
    const s = state();
    if (s && s.depth > 0) { closing = true; history.go(-s.depth); }
    else { history.replaceState(null, '', '/'); hide(); }
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-popup-link], a[data-popup-back], a[data-popup-close]');
    if (!a) return;
    if (a.hasAttribute('data-popup-close')) { e.preventDefault(); requestClose(); return; }
    const slug = parseWorkPath(new URL(a.href, location.href).pathname);
    if (!slug || !template(slug)) return;
    e.preventDefault();
    open(slug, a.closest('dialog') ? null : a);
  });

  // One step back through the pop-up's own history: diagram -> company -> closed.
  function stepBack() {
    if (closing) return;
    const s = state();
    if (s && s.depth > 0) history.back();
    else requestClose();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') escAt = performance.now(); }, true);
  const fromKeyboard = () => performance.now() - escAt < 400;
  // A close request is Esc on a keyboard (close the whole pop-up) or the Android hardware/gesture Back (one step back).
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); if (fromKeyboard()) requestClose(); else stepBack(); });
  // The browser may also close the dialog natively (Esc or Back without user activation): resync our state.
  dialog.addEventListener('close', () => {
    if (!current || dialog.open) return;
    const s = state();
    // Deeper than the first view and not Esc: go back one view; popstate re-renders and reopens the modal.
    if (s && s.depth > 1 && !fromKeyboard() && !closing) history.back();
    else requestClose();
  });
  // Ignore the second half of a double-click landing on the freshly opened backdrop.
  dialog.addEventListener('click', (e) => { if (e.target === dialog && performance.now() - openedAt > 350) requestClose(); });

  // Keep Tab inside the dialog (native modal dialogs can let focus escape to browser chrome).
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll<HTMLElement>('a[href]:not([hidden]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    // Manage Tab ourselves: WebKit sends focus to the dialog itself (then the page) from a non-tabbable heading.
    const active = document.activeElement as HTMLElement | null;
    const follows = (el: HTMLElement) => !!active && !!(active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    let next: HTMLElement;
    if (e.shiftKey) {
      const before = focusables.filter((el) => el !== active && !follows(el));
      next = before[before.length - 1] ?? focusables[focusables.length - 1];
    } else {
      next = focusables.find((el) => el !== active && follows(el)) ?? focusables[0];
    }
    e.preventDefault();
    next.focus();
  });

  window.addEventListener('popstate', () => {
    const slug = parseWorkPath(location.pathname);
    closing = false;
    if (!slug) { if (current) hide(); return; }
    if (!current) originSlug = slug;
    const direction: Direction = !current ? 'none' : slug === currentParent ? 'back' : 'forward';
    if (render(slug, direction)) { show(); focusTitle(); }
  });

  // Direct load of /work/<slug>: put the homepage underneath in history so Back stays on the site.
  // A reload on /work/<slug> already carries the pop-up state (and the homepage entry below it): add nothing then.
  const initial = parseWorkPath(location.pathname);
  if (initial && template(initial)) {
    originSlug = initial;
    if (!state()) {
      history.replaceState(null, '', '/');
      history.pushState({ popup: initial, depth: 1 } satisfies PopupState, '', `/work/${initial}`);
    }
    render(initial, 'none');
    show();
    focusTitle();
  }
}
