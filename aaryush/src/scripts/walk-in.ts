/**
 * Walking into a piece on phones (below 560px, Task 32).
 *
 * The second tap on an open letter or paper does not navigate straight away. A copy of the piece is lifted to the
 * front of the screen and brought up until the sheet *is* the screen: the paper's cover fills it edge to edge, the
 * letter's panels open one after another until they cover it, and a note's clip lifts and its cards are dealt out down the
 * screen, each a little wider than the last (the page then turns them into its section marks). Then the page navigates, and the essay page's view
 * transition finishes the move (the cover turns on its staple, or the essay text fades up on the opened sheet).
 * See the "walking in" rules in writing-room.css and writing-transitions.css, and the pagereveal hook in BaseLayout.
 *
 * Only transforms and opacity move. Without cross-document view transitions (Firefox), or with reduced motion,
 * this does nothing and the link is followed as usual.
 */
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_D = 'cubic-bezier(.45,.05,.2,1)';
const FLAG = 'walk-in';

export type WalkKind = 'letter' | 'paper' | 'note';

let walking = false;

export const isWalking = () => walking;

/** Ask the browser to fetch the essay while the piece is still opening, so the walk-in doesn't wait on the network. */
export function prefetchPiece(href: string) {
  try {
    if (document.head.querySelector(`link[rel="prefetch"][href="${CSS.escape(href)}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = href; l.as = 'document';
    document.head.append(l);
  } catch { /* prefetch is only a hint */ }
}

export function canWalk(): boolean {
  return innerWidth <= 559 && 'onpagereveal' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Remove the overlay and un-hide the piece (bfcache restore, or a navigation that never happened). */
export function clearWalk() {
  walking = false;
  document.querySelectorAll('.walk-clone, .walk-veil, .walk-staple').forEach((n) => n.remove());
  document.documentElement.classList.remove('walk-out');
  document.querySelectorAll<HTMLElement>('[data-piece]').forEach((p) => p.style.removeProperty('visibility'));
}

function timers(list: number[]) {
  return (fn: () => void, ms: number) => { list.push(window.setTimeout(fn, ms)); };
}

/** Starts the walk-in. Returns false (and does nothing) when it can't run, so the caller lets the link navigate. */
export function walkIn(el: HTMLElement, href: string, kind: WalkKind): boolean {
  if (walking || !canWalk() || typeof el.animate !== 'function') return false;
  walking = true;

  const W = document.documentElement.clientWidth, H = innerHeight;
  const rect = el.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const m = new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform);
  const base = `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, 0, 0)`;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.classList.add('walk-clone');
  clone.removeAttribute('data-piece');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  if (kind === 'paper') clone.classList.remove('is-open');
  Object.assign(clone.style, {
    left: `${cx - w / 2}px`, top: `${cy - h / 2}px`, width: `${w}px`, height: `${h}px`,
    viewTransitionName: 'none', transform: base, transformOrigin: '50% 50%',
  });

  const veil = document.createElement('div');
  veil.className = 'walk-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.append(veil, clone);
  el.style.visibility = 'hidden';

  const tx = W / 2 - cx, ty = H / 2 - cy;
  const kids = Array.from(clone.children).filter((c) => !c.classList.contains('skin') && !c.classList.contains('cast')) as HTMLElement[];
  const fadeKids = (ms: number) => kids.forEach((k) => k.animate([{ opacity: getComputedStyle(k).opacity }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' }));
  const cast = clone.querySelector<HTMLElement>('.cast');
  cast?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });

  const pending: number[] = [];
  const at = timers(pending);
  let total = 0, lead = 0;

  if (kind === 'letter') {
    // A: the folded sheet comes up to your face, fitting the screen's width. B: the folds open one panel at a time
    // while the sheet grows to the screen's height, until the panels are the screen.
    const folds = Math.max(Number(el.dataset.folds) || 0, 0);
    const steps = Math.max(folds - 1, 1);
    const A = 300;
    const step = Math.min(300, Math.max(250, Math.round(900 / steps)));
    const B = steps * step;
    total = A + B;
    lead = 180; // the last panel is nearly flat by the time the page answers
    const fit = W / w;
    const sxF = (W * 1.03) / w, syF = (H * 1.03) / h;
    // the sheet grows from its top edge, so the panels open downward from the cover: top = where the top edge ends up
    const sheetAt = (sx: number, sy: number, top: number) => `translate(${W / 2 - cx}px, ${top - cy + (sy * h) / 2}px) scale(${sx}, ${sy})`;
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: A + 120, easing: 'ease-out', fill: 'forwards' });
    fadeKids(A - 60);
    clone.animate([
      { transform: base, offset: 0, easing: EASE_OUT },
      { transform: sheetAt(fit, fit, H * 0.07), offset: A / total, easing: 'cubic-bezier(.4,0,.3,1)' },
      { transform: sheetAt(sxF, syF, -H * 0.015), offset: 1 },
    ], { duration: total, fill: 'forwards' });
    for (let k = 2; k <= Math.max(folds, 2); k++) {
      at(() => {
        clone.style.setProperty(`--a${k}`, '0deg');
        clone.querySelectorAll(`.fold-${k}`).forEach((f) => f.classList.add('flat'));
        if (folds < 2) clone.querySelectorAll('.letter-base').forEach((f) => f.classList.add('flat'));
      }, A + (k - 2) * step);
    }
  } else if (kind === 'paper') {
    // Paper: the stack lifts a little, the fan folds back in, and the cover scales until it fills the screen edge to edge.
    const A = 480;
    total = A;
    lead = 30;
    const cover = clone.querySelector<HTMLElement>('.sheet.cover');
    const cr = cover?.getBoundingClientRect();
    // cover's centre relative to the clone's centre, at rest (the clone sits under `base`, a near-identity matrix)
    const dx = cr ? cr.left + cr.width / 2 - cx : 0, dy = cr ? cr.top + cr.height / 2 - cy : 0;
    const sw = cr ? cr.width : w, sh = cr ? cr.height : h;
    const sx = (W * 1.03) / sw, sy = (H * 1.03) / sh;
    const T = `translate(${W / 2 - cx - dx * sx}px, ${H / 2 - cy - dy * sy}px) scale(${sx}, ${sy})`;
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: A, easing: 'ease-out', fill: 'forwards' });
    fadeKids(220);
    clone.animate([
      { transform: base, offset: 0, easing: EASE_OUT },
      { transform: `translateY(-10px) ${base} scale(1.05)`, offset: 0.22, easing: 'cubic-bezier(.35,.1,.25,1)' },
      { transform: T, offset: 1 },
    ], { duration: A, fill: 'forwards' });
    const staple = document.createElement('span');
    staple.className = 'walk-staple';
    staple.setAttribute('aria-hidden', 'true');
    document.body.append(staple);
    staple.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration: A, fill: 'forwards' });
  }

  else {
    // Note, "the deal": the binder clip lifts off, the cards slide out of the stack and settle down the screen in a column, each a
    // little wider than the last (58 / 70 / 84 / 100% of the text column, the widths of the page's section marks). The essay page
    // then fades in and each card resolves into its section mark (see "walk-note" in writing-transitions.css).
    const SLOW = 'cubic-bezier(.22,.7,.2,1)';
    const cards = Array.from(clone.querySelectorAll<HTMLElement>('.card:not(.n0)'));
    const front = clone.querySelector<HTMLElement>('.card.n0');
    const clip = clone.querySelector<HTMLElement>('.clip');
    const colW = Math.min(W - 48, 560);
    const fracs = [0.58, 0.7, 0.84, 1];
    const gap = 12;
    const th = Math.max(78, Math.min(132, (H * 0.74 - gap * (cards.length - 1)) / Math.max(cards.length, 1)));
    const top0 = Math.max(24, (H - (cards.length * th + (cards.length - 1) * gap)) / 2 - H * 0.02);
    const START = 130, STAGGER = 80, DUR = 560;
    total = START + (cards.length - 1) * STAGGER + DUR + 40;
    lead = 160;
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
    fadeKids(300);
    const rest = (el: HTMLElement) => { const t = getComputedStyle(el).transform; return t === 'none' ? 'none' : t; };
    // the clip lifts off first and goes
    clip?.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(-26px) rotate(-5deg)', opacity: 0 },
    ], { duration: 420, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    // the front card (the title) slips away up and off the stack
    front?.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(-40px)', opacity: 0 },
    ], { duration: 460, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    const left = parseFloat(clone.style.left) || 0, topPx = parseFloat(clone.style.top) || 0;
    cards.forEach((card, i) => {
      const ow = card.offsetWidth || 1, oh = card.offsetHeight || 1;
      const ox = left + card.offsetLeft + ow / 2, oy = topPx + card.offsetTop;
      const sx = (colW * (fracs[Math.min(i, fracs.length - 1)])) / ow, sy = th / oh;
      const to = `translate(${W / 2 - ox}px, ${top0 + i * (th + gap) - oy}px) scale(${sx}, ${sy})`;
      card.style.zIndex = String(10 + i);
      card.animate([{ transform: rest(card) }, { transform: to }], { duration: DUR, delay: START + i * STAGGER, easing: SLOW, fill: 'both' });
    });
  }

  // Go a little before the last frame lands: the page takes a moment to answer, and the sheet keeps closing meanwhile.
  at(() => {
    try { sessionStorage.setItem(FLAG, `${kind}|${Date.now()}`); } catch { /* storage blocked: the page still opens, plain */ }
    document.documentElement.classList.add('walk-out');
    location.assign(href);
    // if the page never came (offline, blocked), put the desk back
    at(() => { if (walking) { try { sessionStorage.removeItem(FLAG); } catch { /* ignore */ } clearWalk(); } }, 5000);
  }, Math.max(total - lead, 0));
  return true;
}
