import { crossed, pointAt, polylineLength, type DiagramRuntime } from '../lib/diagram';

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const SPEED = 96; // px of path per second
let stops: Array<() => void> = [];

export function stopDiagrams(): void {
  for (const stop of stops) stop();
  stops = [];
}

export function mountDiagrams(root: ParentNode): void {
  root.querySelectorAll<SVGSVGElement>('svg.dg[data-runtime]').forEach((svg) => stops.push(mount(svg)));
}

function mount(svg: SVGSVGElement): () => void {
  const rt = JSON.parse(svg.dataset.runtime ?? '{}') as DiagramRuntime;
  const len = polylineLength(rt.pulse);
  const dot = svg.querySelector<SVGCircleElement>('.pulse')!;
  const halo = svg.querySelector<SVGCircleElement>('.halo')!;
  const inDots = [...svg.querySelectorAll<SVGCircleElement>('.in-dot')];
  const nodes = new Map([...svg.querySelectorAll<SVGGElement>('g.node[data-node]')].map((g) => [Number(g.dataset.node), g]));

  const place = (s: number) => {
    const [x, y] = pointAt(rt.pulse, s);
    for (const c of [dot, halo]) { c.setAttribute('cx', x.toFixed(2)); c.setAttribute('cy', y.toFixed(2)); }
  };
  const setOn = (on: boolean) => { dot.classList.toggle('on', on); halo.classList.toggle('on', on); };

  svg.classList.remove('run', 'closed', 'instant');
  if (reduceMQ.matches) {
    svg.classList.add('instant', 'run', 'closed');
    place(len * 0.62);
    setOn(true);
    return () => {};
  }

  setOn(false);
  let raf = 0, last = 0, t = 0, s = 0, stopped = false;

  const pulseNode = (i: number) => {
    const g = nodes.get(i);
    if (!g) return;
    g.classList.remove('hit');
    void g.getBoundingClientRect(); // restart the CSS animation
    g.classList.add('hit');
  };

  const frame = (now: number) => {
    if (stopped) return;
    const dt = last ? Math.min(50, now - last) : 0;
    last = now;
    if (!document.hidden) {
      t += dt;
      inDots.forEach((c, i) => {
        const [, y1, y2, , d] = rt.inputs[i];
        const p = Math.min(1, Math.max(0, (t - d - 120) / 640));
        const eased = 1 - (1 - p) ** 3;
        c.setAttribute('cy', (y1 + (y2 - y1) * eased).toFixed(2));
        c.style.opacity = p <= 0 || p >= 1 ? '0' : '1';
      });
      if (t >= rt.loopStart - 300) svg.classList.add('closed');
      if (t >= rt.loopStart) {
        const prev = s;
        s = (s + (SPEED * dt) / 1000) % len;
        place(s);
        if (!dot.classList.contains('on')) setOn(true);
        for (const h of rt.hits) if (crossed(prev, s, h.at, len)) pulseNode(h.node);
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => { last = 0; };
  document.addEventListener('visibilitychange', onVisibility);
  const timer = window.setTimeout(() => { svg.classList.add('run'); raf = requestAnimationFrame(frame); }, 160);

  return () => {
    stopped = true;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
