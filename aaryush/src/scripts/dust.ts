/**
 * Dust motes drifting in the pool. Motes only ever paint inside the pool's glow. The loop runs only while the
 * room is on screen, the tab is visible and motion is allowed; otherwise it is cancelled and costs nothing.
 */
import { onMove } from './light-pool';

const canvas = document.querySelector<HTMLCanvasElement>('canvas.dust');
const room = document.querySelector<HTMLElement>('.room');
const area = room?.querySelector<HTMLElement>('.desk-wrap') ?? null;
const ctx = canvas?.getContext('2d') ?? null;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

if (canvas && room && area && ctx) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rand = mulberry32(0x5eed);
  const count = innerWidth <= 700 ? 60 : 90;
  const motes = Array.from({ length: count }, () => ({
    x: rand(), y: rand(), vx: (rand() - 0.5) * 5, vy: -1 - rand() * 3, r: 0.6 + rand() * 1.1, p: rand() * 6.28,
  })); // x, y start as fractions; they become pixels on the first resize()
  let W = 0, H = 0, ox = 0, oy = 0, scale = 1, sized = false;
  const pool = { x: 0, y: 0, i: 0, s: 1 };
  onMove((x, y, i, s) => { pool.x = x - ox; pool.y = y - oy; pool.i = i; pool.s = s; });
  const peak = () => Math.min(1, parseFloat(getComputedStyle(room).getPropertyValue('--pool-peak') || '1') + 0.3);
  let pk = 1;

  function resize() {
    const a = room!.getBoundingClientRect(), b = area!.getBoundingClientRect();
    const pad = 80;
    const nx = Math.max(0, b.left - a.left - pad), ny = Math.max(0, b.top - a.top - pad);
    const nw = Math.min(a.width - nx, b.width + pad * 2), nh = b.height + pad * 2;
    if (nw < 1 || nh < 1) return;
    const rx = sized ? nw / W : nw, ry = sized ? nh / H : nh;
    for (const m of motes) { m.x *= rx; m.y *= ry; }
    pool.x += ox - nx; pool.y += oy - ny;
    ox = nx; oy = ny; W = nw; H = nh; sized = true;
    let dpr = Math.min(devicePixelRatio || 1, 2);
    if (W * H * dpr * dpr > 3_000_000) dpr = 1; // big phone columns: keep the canvas affordable
    scale = dpr;
    canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr);
    canvas!.style.cssText = `left:${nx}px;top:${ny}px;width:${W}px;height:${H}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    pk = peak();
  }

  let raf = 0, last = 0, lastDraw = 0, visible = false;
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (t - lastDraw < 33) return; // ~30fps is plenty for slow specks
    const dt = Math.min(0.1, (t - last) / 1000); last = t; lastDraw = t;
    ctx!.clearRect(0, 0, W, H);
    const sg = 150 * pool.s;
    for (const m of motes) {
      m.x += m.vx * dt + Math.sin(t / 4000 + m.p) * 0.06; m.y += m.vy * dt; m.p += dt * 0.4;
      if (m.y < -5) { m.y = H + 5; m.x = rand() * W; }
      if (m.x < -5) m.x = W + 5; else if (m.x > W + 5) m.x = -5;
      const dx = m.x - pool.x, dy = m.y - pool.y;
      const inf = Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)) * pool.i * pk;
      if (inf < 0.04) continue;
      ctx!.fillStyle = `rgba(255, 226, 170, ${(inf * (0.35 + 0.3 * Math.sin(m.p * 2))).toFixed(3)})`;
      ctx!.beginPath(); ctx!.arc(m.x, m.y, m.r, 0, 6.283); ctx!.fill();
    }
  }

  function sync() {
    const want = visible && !document.hidden && !reduce.matches && sized;
    if (want && !raf) { last = lastDraw = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; ctx!.clearRect(0, 0, W, H); }
    canvas!.dataset.dust = want ? 'running' : 'paused';
  }

  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; sync(); }).observe(room);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  new ResizeObserver(() => { resize(); sync(); }).observe(room);
  document.fonts?.ready.then(() => { resize(); sync(); });
  addEventListener('pagehide', () => { visible = false; sync(); });
  addEventListener('pageshow', () => { resize(); });
}
