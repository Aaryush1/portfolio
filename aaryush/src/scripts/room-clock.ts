/**
 * The room keeps the visitor's time: the period (from the clock, the test hook or the shared `t` preview) sets the
 * window light, and between 21:00 and 07:00 a small handwritten note is added to the desk. The note is created here,
 * never in the served HTML, so it is absent from the DOM by day.
 */
import { roomLight } from '../lib/room-light';
import { currentDaypart } from './daypart-override';
import { onMove } from './light-pool';

const NOTE = 'you’re up late too.';
const CHECK_MS = 60_000;
const root = document.documentElement;
const room = document.querySelector<HTMLElement>('.room');
const deskWrap = room?.querySelector<HTMLElement>('.desk-wrap') ?? null;

let note: HTMLDivElement | null = null;
let unsubscribe: (() => void) | null = null;
let timer = 0;

function applyLight(part: string) {
  if (!room) return;
  const light = roomLight(part as Parameters<typeof roomLight>[0]);
  room.dataset.daypart = part;
  room.style.setProperty('--window-rgb', light.windowColor.join(', '));
  room.style.setProperty('--window-alpha', String(light.windowAlpha));
  room.style.setProperty('--pool-peak', String(light.poolPeak));
  room.style.setProperty('--shadow-x', `${light.windowOffset.x}px`);
  room.style.setProperty('--shadow-y', `${light.windowOffset.y}px`);
  room.style.setProperty('--shadow-blur', `${light.shadowBlur}px`);
}

function mountNote() {
  if (!deskWrap || !room) return;
  const el = document.createElement('div');
  el.className = 'night-note';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = NOTE;
  deskWrap.append(el);
  note = el;
  // The note catches the light: brightness falls off with the pool's distance from the note's centre.
  unsubscribe = onMove((x, y, i, s) => {
    const a = room.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const dx = x - (b.left - a.left + b.width / 2);
    const dy = y - (b.top - a.top + b.height / 2);
    const sigma = 210 * s;
    const near = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) * i;
    el.style.setProperty('--near', near.toFixed(3));
  });
}

function unmountNote() {
  unsubscribe?.();
  unsubscribe = null;
  note?.remove();
  note = null;
}

/** Applies the current period. Safe to call any time; it only changes what has changed. */
function apply() {
  const part = currentDaypart(root);
  applyLight(part);
  if (part === 'night') { if (!note) mountNote(); }
  else unmountNote();
}

// Transient label after a `t` step, the same quiet style as the hero's "Field · night". Hidden from assistive tech.
let tag: HTMLElement | null = null;
let tagTimer = 0;
function showTag(name: string) {
  if (!room) return;
  tag?.remove();
  clearTimeout(tagTimer);
  const el = document.createElement('div');
  el.className = 'room-tag';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = `Room · ${name}`;
  room.append(el);
  tag = el;
  tagTimer = window.setTimeout(() => { el.remove(); if (tag === el) tag = null; }, 2200);
}

if (room && deskWrap) {
  apply();
  document.addEventListener('daypart:change', (e) => {
    apply();
    showTag((e as CustomEvent<{ name: string }>).detail.name);
  });
  // Re-check the hour while the tab is open, so a tab left across 21:00 gets the note without a reload.
  const start = () => { if (!timer) timer = window.setInterval(apply, CHECK_MS); };
  const stop = () => { clearInterval(timer); timer = 0; };
  start();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { apply(); start(); } });
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-daypart'] });
  addEventListener('pagehide', stop);
  addEventListener('pageshow', (e) => { if (e.persisted) { apply(); start(); } });
}
