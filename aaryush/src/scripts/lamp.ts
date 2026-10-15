/*
 * The essay lamp (E12). On essay pages the warm light behind the text grows, very slowly, while someone reads.
 * It writes one CSS custom property (--warm, 0 to 1) about every 15 seconds: no animation loop. base.css turns it into
 * a few percent more warmth on the background light, and never touches text. Stops itself at full warmth.
 * Reduced motion: nothing runs. A new page load starts from rest.
 */
import { LAMP_TICK_MS, nextActive, warmth } from '../lib/lamp';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduced && document.body.classList.contains('essay-page')) {
  const root = document.documentElement;
  let active = 0;
  let lastActivityAt = -Infinity;

  const onActivity = () => { lastActivityAt = Date.now(); };
  const events = ['scroll', 'wheel', 'touchmove', 'pointermove', 'pointerdown', 'keydown'] as const;
  const listenOpts: AddEventListenerOptions = { passive: true };
  for (const t of events) window.addEventListener(t, onActivity, listenOpts);

  const tick = () => {
    const now = Date.now();
    active = nextActive(active, { visible: document.visibilityState === 'visible', lastActivityAt, now });
    const w = warmth(active);
    root.style.setProperty('--warm', w.toFixed(3));
    if (w >= 1) {
      done = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      removeEventListener('pagehide', stop);
      for (const t of events) window.removeEventListener(t, onActivity, listenOpts);
    }
  };
  // The timer only runs while the tab is visible, and is cleared when the page goes away.
  let timer = 0;
  let done = false;
  const start = () => { if (!timer && !done) timer = window.setInterval(tick, LAMP_TICK_MS); };
  const stop = () => { window.clearInterval(timer); timer = 0; };
  const onVisibility = () => { if (document.hidden) stop(); else start(); };
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('pagehide', stop);
  addEventListener('pageshow', (e) => { if (e.persisted && !document.hidden) start(); });
  if (!document.hidden) start();
}

export {};
