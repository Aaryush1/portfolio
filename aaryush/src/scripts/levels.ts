/*
 * Fig. 2.1, the section schematic. Upgrades the server-rendered stack of four expanded levels (Levels.astro) into one
 * sticky figure: the floors stack, "Decisions" flow down the left spine, "Volume & feedback" flow up the right one,
 * and the active floor opens to hold the level's title (the hero's shared-letter morph) and its body.
 *
 * The page scrolls natively and nothing is captured: no pinning by script, no wheel or touch handling, no snapping.
 * The sticky stage lives inside a short track, and the scroll position alone decides the active level.
 * Not run under reduced motion or on very short windows: the stacked version stays.
 */
import { changedLetters, morphTiming } from '../lib/morph-timing';
import {
  arrowD, clamp, ease, floorLayout, lerp, levelAtProgress, offsetForLevel, pathD, polyAt, polyLength, progress, pulseAt,
  smooth, type FloorParams, type Pt,
} from '../lib/section';
import { createMorph, type Runs } from './morph';

type Lv = { n: number; runs: Runs; text: string; body: string; list: HTMLUListElement };

const root = document.getElementById('sx');
const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
if (root && !reducedMq.matches && innerHeight >= 500 && 'IntersectionObserver' in window && 'animate' in Element.prototype) enhance(root);

function enhance(root: HTMLElement) {
  const NS = 'http://www.w3.org/2000/svg';
  const ol = root.querySelector<HTMLOListElement>('ol.sx-floors')!;
  const stage = root.querySelector<HTMLElement>('.sx-stage')!;
  const track = root.querySelector<HTMLElement>('.sx-track')!;
  const frame = root.querySelector<HTMLElement>('.sx-frame')!;
  const exploreLabel = root.querySelector('.sx-more-h')?.textContent ?? 'Explore more';
  const root_ = document.documentElement;

  // ---- read the four levels out of the server markup, then drop it: from here there is one copy of each link ----
  const levels: Lv[] = [...ol.querySelectorAll<HTMLElement>(':scope > li.sx-lv')].map((li) => {
    const runs: Runs = [];
    const walk = (n: Node, em: boolean) => n.childNodes.forEach((c) => {
      if (c.nodeType === 3) runs.push([c.textContent ?? '', em]);
      else if (c instanceof HTMLElement) walk(c, em || c.tagName === 'EM');
    });
    walk(li.querySelector('h3')!, false);
    return {
      n: Number(li.dataset.level), runs, text: runs.map(([t]) => t).join(''),
      body: li.querySelector('p')!.textContent ?? '', list: li.querySelector<HTMLUListElement>('ul.sx-more')!,
    };
  });
  const N = levels.length;
  root.classList.add('sx--js');

  // ---- build the figure ----
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'sx-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const sv = (cls: string, parent: Element = svg, tag = 'path') => {
    const e = document.createElementNS(NS, tag);
    e.setAttribute('class', cls);
    parent.append(e);
    return e;
  };
  const dn = sv('ln');
  const stubsL = [1, 2].map(() => sv('ln'));
  const headsL = [1, 2, 3].map(() => sv('ah'));
  const up = sv('ln fb');
  const stubsR = [1, 2].map(() => sv('ln fb'));
  const headR = sv('ah fb');
  const halo = sv('halo', svg, 'circle');
  halo.setAttribute('r', '8');
  const pulse = sv('pulse', svg, 'circle');
  pulse.setAttribute('r', '3.25');
  const lblL = sv('lb', svg, 'text');
  lblL.textContent = root.querySelector('.lgd span:nth-child(1)')?.textContent ?? 'Decisions';
  const lblR = sv('lb', svg, 'text');
  lblR.setAttribute('text-anchor', 'end');
  lblR.textContent = root.querySelector('.lgd span:nth-child(2)')?.textContent ?? 'Volume & feedback';

  const floors = levels.map((l, k) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sx-floor';
    b.setAttribute('aria-label', `Level ${l.n}: ${l.text}`);
    b.innerHTML = `<span class="t" aria-hidden="true">L.0${l.n}</span><span class="n" aria-hidden="true"></span>`;
    b.querySelector('.n')!.textContent = l.text;
    li.append(b);
    b.addEventListener('click', () => goTo(k));
    return { li, b, t: b.querySelector<HTMLElement>('.t')!, n: b.querySelector<HTMLElement>('.n')! };
  });
  ol.setAttribute('role', 'list');
  ol.replaceChildren(...floors.map((f) => f.li));

  const ovl = document.createElement('div');
  ovl.className = 'sx-ovl';
  const h3 = document.createElement('h3');
  const slot = document.createElement('span');
  slot.className = 'slot';
  h3.append(slot);
  const bodyBox = document.createElement('div');
  bodyBox.className = 'sx-body';
  ovl.append(h3, bodyBox);
  frame.prepend(svg);
  frame.append(ovl);

  const read = document.createElement('div');
  read.className = 'sx-read';
  const readH = document.createElement('h4');
  readH.className = 'sx-more-h';
  readH.textContent = exploreLabel;
  const lists = document.createElement('div');
  lists.className = 'sx-lists';
  read.append(readH, lists);
  stage.append(read);

  const style = getComputedStyle(slot);
  const accent = getComputedStyle(root_).getPropertyValue('--accent').trim() || '#F2B544';
  const morph = createMorph(slot, style.color, accent);

  // ---- state ----
  const DUR = 700; // ms for the floors to trade places
  const SPEED = 82; // px/s along the return path
  let a: number[] = levels.map((_, k) => (k === 0 ? 1 : 0));
  let from = a.slice();
  let t0 = -1e9;
  let tgt = 0;
  let shown = 0;
  let W = 0, H = 0;
  let dirty = true;
  let wasMoving = false;
  let visible = false;
  let raf = 0;
  let textTimer = 0;
  let step = 300;

  const isPhone = () => matchMedia('(max-width: 959px)').matches;
  const params = (): FloorParams => (isPhone() ? { pad: 14, lbl: 20, base: 30, gap: 6, capH: innerWidth <= 340 ? 36 : 24 } : { pad: 28, lbl: 24, base: 56, gap: 12, capH: 0 });

  const setText = (k: number, animate: boolean) => {
    const l = levels[k];
    h3.setAttribute('aria-label', l.text);
    // body and list crossfade in place: the new layer fades in over the old one, which is then removed, so nothing ever blanks
    const swap = (box: HTMLElement, fresh: HTMLElement) => {
      [...box.children].forEach((c) => {
        if (!animate) { c.remove(); return; }
        c.classList.add('old');
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('inert', '');
        c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease', fill: 'forwards' }).onfinish = () => c.remove();
      });
      box.append(fresh);
      if (animate) fresh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease' });
    };
    const p = document.createElement('p');
    p.textContent = l.body;
    swap(bodyBox, p);
    swap(lists, l.list.cloneNode(true) as HTMLElement);
  };

  const showText = (k: number) => {
    if (k === shown) return;
    const prev = shown;
    shown = k;
    morph.transition(levels[k].runs, false, morphTiming(changedLetters(levels[prev].text, levels[k].text)));
    setText(k, true);
  };

  morph.build(levels[0].runs);
  setText(0, false);
  h3.setAttribute('aria-label', levels[0].text);

  // ---- drawing ----
  const draw = (now: number, full: boolean) => {
    if (!W) return;
    const P = params();
    const phone = isPhone();
    const L = floorLayout(H, a, P);
    const x0 = phone ? 36 : 60, x1 = W - x0, xd = phone ? 15 : 24, xu = W - xd;
    const mid = L.mid;
    if (full) {
      floors.forEach((f, k) => {
        const act = a[k];
        const c = [lerp(255, 242, act), lerp(255, 181, act), lerp(255, 68, act)].map(Math.round).join(',');
        const s = f.b.style;
        s.top = `${L.ys[k].toFixed(1)}px`;
        s.height = `${L.hs[k].toFixed(1)}px`;
        s.left = `${x0}px`;
        s.width = `${x1 - x0}px`;
        s.setProperty('--bc', `rgba(${c},${lerp(0.3, 0.72, act).toFixed(3)})`);
        s.setProperty('--bf', `rgba(242,181,68,${(0.045 * act).toFixed(3)})`);
        s.setProperty('--tc', `rgba(${c},${lerp(0.7, 0.95, act).toFixed(3)})`);
        const tagTop = lerp(L.hs[k] / 2 - 6.5, phone ? 14 : 18, smooth(act * 1.6));
        f.t.style.top = `${tagTop.toFixed(1)}px`;
        f.t.style.opacity = (0.15 + 0.85 * Math.abs(2 * act - 1)).toFixed(3);
        f.n.style.opacity = (1 - smooth(act * 2.4)).toFixed(3);
        f.b.toggleAttribute('data-on', k === tgt);
        if (k === tgt) f.b.setAttribute('aria-current', 'step'); else f.b.removeAttribute('aria-current');
      });
      // decisions flow down the left spine and land on every floor below L.01
      dn.setAttribute('d', pathD([[x0, mid[0]], [xd, mid[0]], [xd, mid[3]], [x0, mid[3]]]));
      [1, 2].forEach((k, i) => stubsL[i].setAttribute('d', pathD([[xd, mid[k]], [x0, mid[k]]])));
      [1, 2, 3].forEach((k, i) => headsL[i].setAttribute('d', arrowD(x0, mid[k], 1, 0)));
      // volume and feedback gather on the right spine and return to L.01
      up.setAttribute('d', pathD(upPath(x1, xu, mid)));
      headR.setAttribute('d', arrowD(x1, mid[0], -1, 0));
      [1, 2].forEach((k, i) => stubsR[i].setAttribute('d', pathD([[x1, mid[k]], [xu, mid[k]]])));
      lblL.setAttribute('x', String(phone ? 8 : xd - 8));
      lblL.setAttribute('y', String(L.top - 11));
      lblR.setAttribute('x', String(W - (phone ? 8 : xd - 8)));
      lblR.setAttribute('y', String(L.top - 11));
      // the text rides the floor that is opening: no fade, no gap
      const top = a.reduce((s, v, k) => s + v * L.ys[k], 0);
      ovl.style.left = `${x0 + 16}px`;
      ovl.style.width = `${x1 - x0 - 32}px`;
      ovl.style.top = `${(top + (phone ? 32 : 42)).toFixed(1)}px`;
    }
    // the pulse: one calm pass along the return path, then a rest
    const path = upPath(x1, xu, mid);
    const u = pulseAt(now, polyLength(path), SPEED, 1.8);
    const pp = polyAt(path, clamp(u, 0, 1));
    const op = u >= 1 ? 0 : smooth(u / 0.05) * smooth((1 - u) / 0.07);
    for (const e of [pulse, halo]) { e.setAttribute('cx', pp[0].toFixed(1)); e.setAttribute('cy', pp[1].toFixed(1)); }
    pulse.style.opacity = op.toFixed(3);
    halo.style.opacity = (0.16 * op).toFixed(3);
  };
  const upPath = (x1: number, xu: number, mid: number[]): Pt[] => [[x1, mid[3]], [xu, mid[3]], [xu, mid[0]], [x1, mid[0]]];

  const canRun = () => visible && !document.hidden && !root_.classList.contains('locked');
  const loop = () => {
    if (raf || !canRun()) return;
    const f = (now: number) => {
      raf = 0;
      const k = clamp((now - t0) / DUR, 0, 1);
      const e = ease(k);
      const moving = k < 1 || wasMoving || dirty;
      if (k < 1) a = a.map((_, i) => lerp(from[i], i === tgt ? 1 : 0, e));
      else a = a.map((_, i) => (i === tgt ? 1 : 0));
      draw(now, moving);
      wasMoving = k < 1;
      dirty = false;
      if (canRun()) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  };
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) loop(); else stopLoop(); }).observe(root);
  document.addEventListener('visibilitychange', () => (canRun() ? loop() : stopLoop()));
  new MutationObserver(() => (canRun() ? loop() : stopLoop())).observe(root_, { attributes: true, attributeFilter: ['class'] });

  // ---- the level follows the scroll position, and only that ----
  const setActive = (k: number) => {
    if (k === tgt) return;
    from = a.slice();
    t0 = performance.now();
    tgt = k;
    dirty = true;
    window.clearTimeout(textTimer);
    textTimer = window.setTimeout(() => showText(tgt), 70); // ride out a flick that passes straight through
    loop();
  };
  const stickTop = () => parseFloat(getComputedStyle(stage).top) || 0;
  let queued = 0;
  const update = () => {
    queued = 0;
    if (!W) return;
    const s = progress(track.getBoundingClientRect().top, stickTop(), track.offsetHeight, stage.offsetHeight);
    setActive(levelAtProgress(s, N));
  };
  const queue = () => { if (!queued) queued = requestAnimationFrame(update); };
  addEventListener('scroll', queue, { passive: true });

  // a floor is a button: it scrolls the page, natively, to that level's place in the track
  function goTo(k: number) {
    const pinStart = track.getBoundingClientRect().top + scrollY - stickTop();
    scrollTo({ top: Math.round(pinStart + offsetForLevel(k, step)), behavior: reducedMq.matches ? 'instant' as ScrollBehavior : 'smooth' });
  }

  // ---- sizes ----
  // The track is short on purpose: about half a viewport per level on desktop, a little more on phones.
  const layout = () => {
    const vh = innerHeight;
    const hdr = parseFloat(getComputedStyle(root_).getPropertyValue('--header')) || 60;
    const phone = isPhone();
    let sh: number;
    if (phone) {
      sh = vh - hdr;
      const figh = Math.round(vh * 0.55);
      root.style.setProperty('--figh', `${figh}px`);
      root.style.setProperty('--fh', `${figh - 10}px`);
      root.style.setProperty('--sx-top', '0px');
      step = clamp(Math.round(vh * 0.62), 300, 640);
    } else {
      const avail = vh - hdr - 24;
      const fh = clamp(avail - 70, 430, 540);
      sh = fh + 70;
      root.style.setProperty('--fh', `${fh}px`);
      root.style.setProperty('--sx-top', `${Math.max(12, Math.round((avail - sh) / 2) + 12)}px`);
      step = clamp(Math.round(vh * 0.55), 300, 560);
    }
    root.style.setProperty('--sh', `${sh}px`);
    root.style.setProperty('--step', `${step}px`);
    W = frame.clientWidth;
    H = frame.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    dirty = true;
    draw(performance.now(), true);
    update();
  };
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  layout();
  document.fonts?.ready.then(layout);
}
