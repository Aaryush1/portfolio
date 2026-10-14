const rot = document.getElementById('rot');
const slot = document.getElementById('slot');
const meas = document.getElementById('meas');
const root = document.documentElement;

if (rot && slot && meas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settledHTML = slot.dataset.settled ?? slot.innerHTML;
  const subjects: string[] = JSON.parse(rot.dataset.subjects ?? '[]');
  const words = [...subjects.map((s) => `<span class="slot-w">${s}</span>`), settledHTML];
  const HOLD = 1700;

  const measure = (html: string) => {
    meas.innerHTML = html;
    return Math.ceil(meas.getBoundingClientRect().width) + 1;
  };
  const setWidth = (html: string, instant = false) => {
    if (instant) slot.style.transition = 'none';
    slot.style.width = `${measure(html)}px`;
    if (instant) { void slot.offsetWidth; slot.style.transition = ''; }
  };
  const settle = () => {
    root.classList.remove('rot-pre');
    slot.innerHTML = settledHTML;
    slot.style.width = '';
    rot.classList.add('is-settled');
  };

  if (reduced || subjects.length === 0 || !slot.animate || !root.classList.contains('rot-pre')) settle();
  else {
    let i = 0;
    const next = () => {
      i++;
      const html = words[i];
      const last = i === words.length - 1;
      const old = slot.querySelector<HTMLElement>('.slot-w:not(.leave)');
      const tmp = document.createElement('span');
      tmp.innerHTML = html;
      const incoming = tmp.firstElementChild as HTMLElement;
      incoming.classList.add('enter-w');
      if (old) {
        old.classList.add('leave');
        old.animate(
          [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-.42em)' }],
          { duration: 340, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
        ).onfinish = () => old.remove();
      }
      slot.insertBefore(incoming, slot.firstChild);
      incoming.animate(
        [{ opacity: 0, transform: 'translateY(.42em)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 640, easing: 'cubic-bezier(.16,1,.3,1)', delay: 110, fill: 'backwards' },
      );
      setWidth(html);
      if (last) window.setTimeout(settle, 900);
      else window.setTimeout(next, HOLD);
    };
    window.addEventListener('resize', () => {
      const cur = slot.querySelector<HTMLElement>('.slot-w:not(.leave)');
      if (cur && !rot.classList.contains('is-settled')) setWidth(cur.outerHTML, true);
    });
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      window.setTimeout(() => { setWidth(words[0], true); window.setTimeout(next, HOLD); }, 900);
    };
    // the serif only appears in the final phrase; load it first so the measured width is exact
    if (document.fonts?.load) {
      Promise.all([document.fonts.ready, document.fonts.load('italic 40px "Instrument Serif"')]).then(go, go);
      window.setTimeout(go, 2200);
    } else go();
  }
}

export {};
