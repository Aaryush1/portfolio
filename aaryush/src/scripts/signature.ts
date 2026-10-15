// Plays the closing signature's draw-on once, when it is almost fully on screen. The keyframes live in Mark.astro.
const sig = document.querySelector<SVGElement>('svg[data-signature]');
if (sig) {
  if (!('IntersectionObserver' in window)) sig.classList.add('is-playing');
  else {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        sig.classList.add('is-playing');
        io.disconnect();
      }
    }, { threshold: 0.9 });
    io.observe(sig);
  }
}

export {};
