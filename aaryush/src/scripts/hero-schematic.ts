type Pt = { x: number; y: number };
type Node = Pt & { k: 0 | 1 };
type Edge = { a: number; b: number; pts: Pt[]; sl: number[]; len: number };
type Pulse = { e: number; fwd: boolean; s: number; v: number; hops: number; dead: boolean };
type Ring = Pt & { t: number };
type Adj = { e: number; fwd: boolean };

const hero = document.getElementById('hero');
const cv = document.getElementById('field') as HTMLCanvasElement | null;
const ctx = cv?.getContext('2d') ?? null;

if (hero && cv && ctx) {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const hex = (v: string, fallback: string) => (/^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : fallback);
  const accHex = hex(cs.getPropertyValue('--accent'), '#F2B544');
  const ACC = [1, 3, 5].map((i) => parseInt(accHex.slice(i, i + 2), 16)).join(',');
  const BG = hex(cs.getPropertyValue('--bg'), '#0A0B0E');
  const G = 24;
  const LINE = 'rgba(196,206,228,0.15)';
  const NODE = 'rgba(214,220,234,0.46)';
  const TEXT = 'rgba(214,220,234,0.36)';

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMQ.matches;
  const locked = () => root.classList.contains('locked');

  let W = 0, H = 0, dpr = 1, oy = 0;
  let nodes: Node[] = [], edges: Edge[] = [], adj: Adj[][] = [], pulses: Pulse[] = [], rings: Ring[] = [];
  let layer: HTMLCanvasElement | null = null;
  let raf = 0, last = 0, spawnIn = 0.5, visible = true, maxP = 3, wide = false;

  cv.dataset.running = 'false';

  const rng = (seed: number) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sx = (v: number) => Math.round(v / G) * G;
  const sy = (v: number) => Math.round((v + oy) / G) * G - oy; // snap to the page grid, not the hero box
  const man = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const linked = (i: number, j: number) => adj[i].some((o) => { const e = edges[o.e]; return e.a === j || e.b === j; });

  function addEdge(i: number, j: number, rand: () => number) {
    const a = nodes[i], b = nodes[j];
    let raw: Pt[];
    if (a.x === b.x || a.y === b.y) raw = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    else if (rand() < 0.5) { const xm = sx((a.x + b.x) / 2); raw = [{ x: a.x, y: a.y }, { x: xm, y: a.y }, { x: xm, y: b.y }, { x: b.x, y: b.y }]; }
    else { const ym = sy((a.y + b.y) / 2); raw = [{ x: a.x, y: a.y }, { x: a.x, y: ym }, { x: b.x, y: ym }, { x: b.x, y: b.y }]; }
    const pts = raw.filter((p, k) => k === 0 || p.x !== raw[k - 1].x || p.y !== raw[k - 1].y);
    const sl: number[] = [];
    let len = 0;
    for (let k = 0; k < pts.length - 1; k++) { const L = man(pts[k], pts[k + 1]); sl.push(L); len += L; }
    if (!len) return;
    const idx = edges.length;
    edges.push({ a: i, b: j, pts, sl, len });
    adj[i].push({ e: idx, fwd: true });
    adj[j].push({ e: idx, fwd: false });
  }

  function build() {
    const r = hero!.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    oy = (((r.top + window.scrollY) % G) + G) % G;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv!.width = Math.round(W * dpr); cv!.height = Math.round(H * dpr);
    wide = W >= 960; maxP = wide ? 3 : 2;
    const rand = rng(1729);
    const x0 = wide ? sx(Math.max(W * 0.56, W / 2 + 120)) : G, x1 = W - G * 2;
    const y0 = G * 3, y1 = H - G * (wide ? 6 : 2);
    const target = wide ? 15 : 9, minD = wide ? 120 : 84;
    nodes = []; edges = []; pulses = []; rings = [];
    for (let t = 0; t < 1500 && nodes.length < target; t++) {
      const n: Node = { x: sx(x0 + rand() * (x1 - x0)), y: sy(y0 + rand() * (y1 - y0)), k: rand() < 0.25 ? 1 : 0 };
      if (nodes.every((m) => man(m, n) >= minD)) nodes.push(n);
    }
    adj = nodes.map(() => []);
    if (nodes.length > 1) {
      const inT = [0];
      const out = nodes.map((_, i) => i).slice(1);
      while (out.length) {
        let bi = -1, bj = -1, bd = Infinity;
        inT.forEach((i) => out.forEach((j) => { const d = man(nodes[i], nodes[j]); if (d < bd) { bd = d; bi = i; bj = j; } }));
        addEdge(bi, bj, rand); inT.push(bj); out.splice(out.indexOf(bj), 1);
      }
      for (let i = 0; i < nodes.length; i++) {
        if (rand() < 0.3) {
          let bj = -1, bd = Infinity;
          for (let j = 0; j < nodes.length; j++) {
            if (j === i || linked(i, j)) continue;
            const d = man(nodes[i], nodes[j]);
            if (d < bd) { bd = d; bj = j; }
          }
          if (bj >= 0) addEdge(i, bj, rand);
        }
      }
    }
    drawLayer();
  }

  function drawLayer() {
    layer = document.createElement('canvas');
    layer.width = cv!.width; layer.height = cv!.height;
    const c = layer.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineWidth = 1; c.strokeStyle = LINE; c.beginPath();
    edges.forEach((e) => e.pts.forEach((p, k) => (k ? c.lineTo(p.x + 0.5, p.y + 0.5) : c.moveTo(p.x + 0.5, p.y + 0.5))));
    c.stroke();
    c.font = '400 10.5px "JetBrains Mono", ui-monospace, monospace';
    let annotated = false;
    nodes.forEach((n, i) => {
      const s = n.k ? 9 : 5, h = (s - 1) / 2;
      c.fillStyle = BG; c.fillRect(n.x - h, n.y - h, s, s);
      c.strokeStyle = NODE; c.strokeRect(n.x + 0.5 - h, n.y + 0.5 - h, s - 1, s - 1);
      if (n.k) {
        c.fillStyle = NODE; c.fillRect(n.x - 1, n.y - 1, 3, 3);
        if (wide) {
          c.fillStyle = TEXT; c.fillText('N.' + String(i + 1).padStart(2, '0'), n.x + 10, n.y - 8);
          if (!annotated) { annotated = true; c.fillText('x ' + String(n.x).padStart(4, '0') + '  y ' + String(Math.round(n.y + oy)).padStart(4, '0'), n.x + 10, n.y + 18); }
        }
      }
    });
  }

  function at(e: Edge, s: number): [number, number] {
    s = Math.max(0, Math.min(e.len, s));
    let acc = 0;
    for (let k = 0; k < e.pts.length - 1; k++) {
      const L = e.sl[k];
      if (acc + L >= s) { const p = e.pts[k], q = e.pts[k + 1], t = L ? (s - acc) / L : 0; return [p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t]; }
      acc += L;
    }
    const l = e.pts[e.pts.length - 1];
    return [l.x, l.y];
  }
  const pos = (e: Edge, fwd: boolean, s: number) => at(e, fwd ? s : e.len - s);
  function spawn() {
    if (edges.length) pulses.push({ e: Math.floor(Math.random() * edges.length), fwd: Math.random() < 0.5, s: 0, v: 34 + Math.random() * 16, hops: 0, dead: false });
  }
  function step(dt: number) {
    spawnIn -= dt;
    if (spawnIn <= 0) { if (pulses.length < maxP) spawn(); spawnIn = 1.6 + Math.random() * 2.4; }
    rings.forEach((r) => { r.t += dt; });
    rings = rings.filter((r) => r.t < 1.1);
    pulses.forEach((p) => {
      p.s += p.v * dt;
      const e = edges[p.e];
      if (p.s >= e.len) {
        const n = p.fwd ? e.b : e.a;
        rings.push({ x: nodes[n].x, y: nodes[n].y, t: 0 });
        const opts = adj[n].filter((o) => o.e !== p.e);
        if (opts.length && p.hops < 4 && Math.random() < 0.7) { const o = opts[Math.floor(Math.random() * opts.length)]; p.e = o.e; p.fwd = o.fwd; p.s = 0; p.hops++; }
        else p.dead = true;
      }
    });
    pulses = pulses.filter((p) => !p.dead);
  }
  function render() {
    const c = ctx!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv!.width, cv!.height);
    if (layer) c.drawImage(layer, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineWidth = 1;
    rings.forEach((r) => {
      const p = r.t / 1.1, s = 4 + p * 9;
      c.strokeStyle = `rgba(${ACC},${(0.6 * (1 - p)).toFixed(3)})`;
      c.strokeRect(r.x + 0.5 - s, r.y + 0.5 - s, s * 2, s * 2);
    });
    c.lineWidth = 1.25;
    pulses.forEach((p) => {
      const e = edges[p.e];
      for (let i = 9; i >= 1; i--) {
        const s1 = p.s - (i - 1) * 4;
        if (s1 <= 0) continue;
        const a = pos(e, p.fwd, Math.max(0, p.s - i * 4)), b = pos(e, p.fwd, s1);
        c.strokeStyle = `rgba(${ACC},${(0.6 * (1 - i / 10)).toFixed(3)})`;
        c.beginPath(); c.moveTo(a[0] + 0.5, a[1] + 0.5); c.lineTo(b[0] + 0.5, b[1] + 0.5); c.stroke();
      }
      const h = pos(e, p.fwd, p.s);
      c.fillStyle = `rgba(${ACC},.1)`; c.beginPath(); c.arc(h[0] + 0.5, h[1] + 0.5, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgb(255,218,150)'; c.beginPath(); c.arc(h[0] + 0.5, h[1] + 0.5, 2, 0, Math.PI * 2); c.fill();
    });
  }
  function staticFrame() {
    pulses = []; rings = [];
    render();
    const n = nodes.filter((m) => m.k)[0] || nodes[0];
    if (!n) return;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.strokeStyle = `rgba(${ACC},.7)`; ctx!.lineWidth = 1;
    ctx!.strokeRect(n.x + 0.5 - 8, n.y + 0.5 - 8, 16, 16);
  }
  function loop(t: number) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t; step(dt); render();
  }
  function start() {
    if (raf || reduced() || !visible || document.hidden || locked()) return;
    last = 0; raf = requestAnimationFrame(loop);
    cv!.dataset.running = 'true';
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    cv!.dataset.running = 'false';
  }
  function refresh() {
    build();
    if (reduced()) { stop(); staticFrame(); } else { render(); start(); }
  }

  refresh();
  if (document.fonts?.ready) document.fonts.ready.then(() => { build(); if (reduced()) staticFrame(); else render(); });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (Math.round(r.width) !== W || Math.abs(Math.round(r.height) - H) > 80) { stop(); refresh(); }
    }, 160);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  reduceMQ.addEventListener('change', () => { stop(); refresh(); });
  // Pause while a pop-up is open (html.locked): saves CPU and keeps the frame count low behind the dialog.
  new MutationObserver(() => { if (locked()) stop(); else start(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
}
