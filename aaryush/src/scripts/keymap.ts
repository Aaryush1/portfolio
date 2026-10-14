import { createKeyRouter, isEditableTarget, type KeyAction } from '../lib/keymap';

const dialog = document.getElementById('keymap') as HTMLDialogElement | null;
if (dialog && !(window as unknown as Record<string, unknown>).__agKeys) {
  (window as unknown as Record<string, unknown>).__agKeys = true;
  init(dialog);
}

type TimeHook = () => void;
// Any page with a daypart consumer (home field, writing room) installs window.__daypart; __heroDaypart is an alias.
const timeHook = (): TimeHook | null => {
  const w = window as unknown as { __daypart?: { cycle?: unknown }; __heroDaypart?: unknown };
  const f = typeof w.__daypart?.cycle === 'function' ? w.__daypart.cycle : w.__heroDaypart;
  return typeof f === 'function' ? (f as TimeHook) : null;
};

const TARGETS: Partial<Record<KeyAction, string>> = {
  hero: '/#hero',
  levels: '/#levels',
  work: '/#work',
  writing: '/writing',
  contact: '/#contact',
};

function init(dialog: HTMLDialogElement) {
  const timeRow = dialog.querySelector<HTMLElement>('[data-km-time]');
  const title = dialog.querySelector<HTMLElement>('#km-title');
  let returnTo: HTMLElement | null = null;

  const router = createKeyRouter({ hasTime: () => timeHook() !== null });

  function open() {
    if (dialog.open) return;
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (timeRow) timeRow.hidden = timeHook() === null;
    dialog.showModal();
    // showModal() would otherwise focus the first control (Close).
    title?.focus({ preventScroll: true });
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  // Runs for every close path (button, Esc, backdrop), so focus always goes back.
  dialog.addEventListener('close', () => {
    const t = returnTo;
    returnTo = null;
    if (t && t.isConnected) t.focus({ preventScroll: true });
  });
  dialog.querySelector('[data-km-close]')?.addEventListener('click', close);
  // The sheet fills the dialog, so a click that lands on the dialog itself is a backdrop click.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  // Same manual Tab handling as the pop-ups: WebKit can send focus to the dialog itself or out of it.
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll<HTMLElement>('a[href]:not([hidden]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
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

  function go(href: string) {
    if (href.startsWith('/#') && location.pathname === '/') location.hash = href.slice(1);
    else location.assign(href);
  }

  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.defaultPrevented) return;
    const action = router.handle({
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      isComposing: e.isComposing,
      keyCode: e.keyCode,
      editable: isEditableTarget(e.target),
      popupOpen: !!document.querySelector('dialog#popup[open]'),
      mapOpen: dialog.open,
    });
    if (!action) return;
    if (action === 'map') { e.preventDefault(); open(); return; }
    if (action === 'time') { timeHook()?.(); return; }
    const href = TARGETS[action];
    if (href) go(href);
  });
}
