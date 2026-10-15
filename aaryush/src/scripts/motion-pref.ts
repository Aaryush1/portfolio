// One live source for the reduced-motion preference, shared by the Lens figure and the level list.
const mq = matchMedia('(prefers-reduced-motion: reduce)');

export const reducedMotion = {
  get matches() { return mq.matches; },
  onChange(cb: (reduced: boolean) => void) { mq.addEventListener('change', () => cb(mq.matches)); },
};
