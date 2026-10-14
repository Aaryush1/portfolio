/*
 * One document keydown listener for every typed word on the site (E8 `contextos`, E11 `ag.`).
 * Each word registers a handler; the shared guards come from lib/keymap (fields, modifiers, composition, open pop-ups).
 * The registry lives on window, so a module evaluated twice still installs a single listener.
 */
import { createTypedSequence, isEditableTarget } from '../lib/keymap';

type Entry = { seq: ReturnType<typeof createTypedSequence>; fn: () => void };
const host = window as unknown as { __agTyped?: Entry[] };

function dispatch(e: KeyboardEvent) {
  if (e.repeat) return;
  const facts = {
    key: e.key,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
    keyCode: e.keyCode,
    editable: isEditableTarget(e.target),
    popupOpen: !!document.querySelector('dialog[open]'),
    mapOpen: false,
  };
  for (const entry of host.__agTyped ?? []) {
    if (entry.seq.handle(facts)) entry.fn();
  }
}

/** Runs `fn` each time `word` is typed outside text fields. Nothing is announced. */
export function onTypedWord(word: string, fn: () => void): void {
  if (!host.__agTyped) {
    host.__agTyped = [];
    document.addEventListener('keydown', dispatch);
  }
  host.__agTyped.push({ seq: createTypedSequence(word), fn });
}
