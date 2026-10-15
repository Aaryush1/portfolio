/**
 * The homepage night note (E7). Between 21:00 and 07:00 local time (or while the `t` preview is on night) a pencilled
 * "General notes" block appears: beside the title block on desktop, under the hero's contact buttons on phones. It is built here,
 * never in the served HTML, so it is absent from the DOM by day. It is decorative: aria-hidden, unlabelled, unexplained.
 * The copy is its own chunk (src/lib/night-note.ts), loaded only when the night period is actually on.
 */
import { currentDaypart } from './daypart-override';

const root = document.documentElement;
const heroFoot = document.querySelector<HTMLElement>('#hero .hero-foot');
const heroCta = document.querySelector<HTMLElement>('#hero .cta');
const desktop = matchMedia('(min-width: 960px)');
const CHECK_MS = 60_000;

let el: HTMLElement | null = null;
let loading = false;
let timer = 0;

/** Desktop: first in the hero's title row, so it sits beside the title block. Phones: right under the hero's contact buttons. */
function place() {
  if (!el) return;
  if (desktop.matches && heroFoot) heroFoot.prepend(el);
  else if (heroCta) heroCta.after(el);
}

function build(label: string, lines: readonly string[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'gen-notes';
  wrap.setAttribute('aria-hidden', 'true');
  const title = document.createElement('p');
  title.className = 'gn-label';
  title.textContent = label;
  const list = document.createElement('ol');
  list.className = 'gn-lines';
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    list.append(li);
  }
  wrap.append(title, list);
  return wrap;
}

/** Applies the current period. Safe to call any time; it only changes what has changed. */
function apply() {
  const night = currentDaypart(root) === 'night';
  if (!night) {
    el?.remove();
    el = null;
    return;
  }
  if (el || loading) return;
  loading = true;
  import('../lib/night-note').then((m) => {
    loading = false;
    if (el || currentDaypart(root) !== 'night') return;
    el = build(m.NIGHT_NOTE.label, m.NIGHT_NOTE.lines);
    place();
  }, () => { loading = false; });
}

if (heroFoot || heroCta) {
  apply();
  document.addEventListener('daypart:change', apply);
  // Re-check the hour while the tab is open, so a tab left across 21:00 gets the note without a reload.
  const start = () => { if (!timer) timer = window.setInterval(apply, CHECK_MS); };
  const stop = () => { clearInterval(timer); timer = 0; };
  start();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { apply(); start(); } });
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-daypart'] });
  desktop.addEventListener('change', place);
  addEventListener('pagehide', stop);
  addEventListener('pageshow', (e) => { if (e.persisted) { apply(); start(); } });
}
