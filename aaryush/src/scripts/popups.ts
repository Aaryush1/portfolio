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
    view.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    return true;
  }

  function show() {
    if (dialog.open && !dialog.matches(':modal')) dialog.close();
    if (!dialog.open) { dialog.showModal(); openedAt = performance.now(); }
    document.documentElement.classList.add('locked');
    requestAnimationFrame(() => dialog.classList.add('is-in'));
  }

  function hide() {
    closing = false;
    stopDiagrams();
    dialog.classList.remove('is-in');
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('locked');
    document.title = homeTitle;
    current = null;
    currentParent = null;
    const t = trigger;
    trigger = null;
    t?.focus({ preventScroll: true });
  }

  function open(slug: string, from: HTMLElement | null) {
    if (slug === current) return;
    if (current) {
      const s = state();
      if (s?.parent === slug) { history.back(); return; }
      history.pushState({ popup: slug, depth: (s?.depth ?? 0) + 1, parent: current } satisfies PopupState, '', `/work/${slug}`);
      render(slug, 'forward');
      return;
    }
    trigger = from;
    history.pushState({ popup: slug, depth: 1 } satisfies PopupState, '', `/work/${slug}`);
    if (render(slug, 'none')) show();
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

  // The browser may close the dialog natively (Esc without user activation): resync our state.
  dialog.addEventListener('close', () => { if (current && !dialog.open) requestClose(); });
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
  // Ignore the second half of a double-click landing on the freshly opened backdrop.
  dialog.addEventListener('click', (e) => { if (e.target === dialog && performance.now() - openedAt > 350) requestClose(); });

  // Keep Tab inside the dialog (native modal dialogs can let focus escape to browser chrome).
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll<HTMLElement>('a[href]:not([hidden]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !dialog.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !dialog.contains(active))) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('popstate', () => {
    const slug = parseWorkPath(location.pathname);
    closing = false;
    if (!slug) { if (current) hide(); return; }
    const direction: Direction = !current ? 'none' : slug === currentParent ? 'back' : 'forward';
    if (render(slug, direction)) show();
  });

  // Direct load of /work/<slug>: put the homepage underneath in history so Back stays on the site.
  const initial = parseWorkPath(location.pathname);
  if (initial && template(initial)) {
    history.replaceState(null, '', '/');
    history.pushState({ popup: initial, depth: 1 } satisfies PopupState, '', `/work/${initial}`);
    render(initial, 'none');
    show();
  }
}
