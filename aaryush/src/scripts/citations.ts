/**
 * Citation markers become buttons that open a small preview of the reference, so the reader keeps their place.
 * The reference text is read from the document's own references list (matched by id), never copied into markup.
 * Phones get a sheet at the bottom (CSS); desktop gets a popover beside the marker. Esc or a press outside closes it
 * and focus goes back to the marker. Without JavaScript the markers stay plain links to the list.
 */
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.essay-body a.cite[data-ref]'));

if (links.length) {
  const sheet = document.createElement('div');
  sheet.className = 'cite-sheet';
  sheet.id = 'cite-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Reference');
  sheet.hidden = true;
  const head = document.createElement('p');
  head.className = 'cite-head mono';
  const body = document.createElement('p');
  body.className = 'cite-text';
  const more = document.createElement('a');
  more.className = 'cite-more mono';
  more.textContent = 'Go to references';
  sheet.append(head, body, more);
  document.body.append(sheet);

  let current: HTMLButtonElement | null = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 719px)');

  const place = (btn: HTMLElement) => {
    if (phone.matches || innerWidth <= 719) { sheet.style.left = sheet.style.top = sheet.style.width = ''; return; }
    const r = btn.getBoundingClientRect();
    const w = Math.min(340, innerWidth - 32);
    sheet.style.width = `${w}px`;
    const left = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), innerWidth - w - 16);
    sheet.style.left = `${left + scrollX}px`;
    const below = r.bottom + 10;
    const h = sheet.offsetHeight;
    const top = below + h > innerHeight - 12 && r.top - 10 - h > 12 ? r.top - 10 - h : below;
    sheet.style.top = `${top + scrollY}px`;
  };

  const close = (restore: boolean) => {
    if (!current) return;
    const btn = current;
    current = null;
    btn.setAttribute('aria-expanded', 'false');
    sheet.classList.remove('is-open');
    sheet.hidden = true;
    if (restore) btn.focus({ preventScroll: true });
  };

  const open = (btn: HTMLButtonElement) => {
    const id = btn.dataset.ref ?? '';
    const li = document.getElementById(id);
    if (!li) return;
    close(false);
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    head.textContent = `Reference ${btn.textContent?.replace(/[\[\]]/g, '')}`;
    body.textContent = (li.textContent ?? '').replace(/\s+/g, ' ').trim();
    more.href = `#${id}`;
    sheet.hidden = false;
    place(btn);
    if (reduce.matches) sheet.classList.add('is-open');
    else requestAnimationFrame(() => sheet.classList.add('is-open'));
  };

  for (const a of links) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cite';
    btn.dataset.ref = a.dataset.ref;
    btn.textContent = a.textContent;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'cite-sheet');
    btn.setAttribute('aria-label', `Reference ${a.textContent?.replace(/[\[\]]/g, '')}`);
    btn.addEventListener('click', () => (current === btn ? close(true) : open(btn)));
    a.replaceWith(btn);
  }

  more.addEventListener('click', () => close(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) close(true); });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (current && !sheet.contains(t) && !current.contains(t)) close(false);
  });
  sheet.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (current && to && !sheet.contains(to) && !current.contains(to)) close(false);
  });
  addEventListener('resize', () => { if (current) place(current); });
  // a media query can update after the resize event in Firefox and WebKit, so re-place when it flips too
  phone.addEventListener('change', () => { if (current) place(current); });
}
