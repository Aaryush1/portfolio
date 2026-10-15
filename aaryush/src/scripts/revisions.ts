/**
 * E14: the "Last deploy" cell of the hero title block opens the revision block. A click, Enter or Space toggles it;
 * Esc closes it and returns focus to the cell's button; a click anywhere outside closes it. The cell keeps no role of its own
 * (a role on a dl row breaks the list). H3: the control is a real button inside the cell's <dd>, made here, so it carries
 * aria-expanded and aria-controls, and without JavaScript there is no dead control (the block stays hidden). Nothing announces any of it.
 */
const cell = document.querySelector<HTMLElement>('#hero .tblock .dep');
const block = document.querySelector<HTMLElement>('#hero [data-revs]');
const dd = cell?.querySelector('dd');

if (cell && block && dd) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dep-btn';
  if (block.id) btn.setAttribute('aria-controls', block.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.append(...dd.childNodes); // the date and the commit move inside, unchanged
  dd.append(btn);
  cell.removeAttribute('tabindex'); // the button is the tab stop now
  cell.style.cursor = 'pointer';

  const set = (open: boolean, refocus = false) => {
    block.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (!open && refocus) btn.focus({ preventScroll: true });
  };
  const isOpen = () => !block.hidden;

  // The whole cell is the target; Enter and Space on the button arrive here as clicks.
  cell.addEventListener('click', () => set(!isOpen()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); set(false, true); }
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (isOpen() && !block.contains(t) && !cell.contains(t)) set(false);
  });
}

export {};
