/**
 * E14: the "Last deploy" cell of the hero title block opens the revision block. Click, Enter or Space toggles it;
 * Esc closes it and returns focus to the cell; a click anywhere outside closes it. The cell keeps its group role (a button role
 * would break the definition list), and without JavaScript the block stays hidden. Nothing announces any of it.
 */
const cell = document.querySelector<HTMLElement>('#hero .tblock .dep');
const block = document.querySelector<HTMLElement>('#hero [data-revs]');

if (cell && block) {
  if (!cell.hasAttribute('tabindex')) cell.tabIndex = 0;
  cell.style.cursor = 'pointer';

  const set = (open: boolean, refocus = false) => {
    block.hidden = !open;
    if (!open && refocus) cell.focus({ preventScroll: true });
  };
  const isOpen = () => !block.hidden;

  cell.addEventListener('click', () => set(!isOpen()));
  cell.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    set(!isOpen());
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); set(false, true); }
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (isOpen() && !block.contains(t) && !cell.contains(t)) set(false);
  });
}

export {};
