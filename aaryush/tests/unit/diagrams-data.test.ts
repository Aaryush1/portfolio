import { describe, expect, it } from 'vitest';
import { diagrams } from '../../src/data/diagrams';
import { isDiamond, nodeBounds, nodeHits } from '../../src/lib/diagram';

for (const [key, spec] of Object.entries(diagrams)) {
  describe(`diagram ${key}`, () => {
    const [W, H] = spec.vb;
    const inside = (x: number, y: number) => x >= 0 && x <= W && y >= 0 && y <= H;

    it('keeps every node inside the viewBox', () => {
      for (const n of spec.nodes) {
        const b = nodeBounds(n);
        expect(inside(b.x, b.y) && inside(b.x + b.w, b.y + b.h), `${key} node ${n.t}`).toBe(true);
      }
    });
    it('keeps every pulse and edge point inside the viewBox', () => {
      for (const [x, y] of spec.pulse) expect(inside(x, y)).toBe(true);
      for (const e of spec.edges) for (const [x, y] of e.p) expect(inside(x, y)).toBe(true);
    });
    it('has a pulse that passes through at least two nodes', () => {
      expect(new Set(nodeHits(spec).map((h) => h.node)).size).toBeGreaterThanOrEqual(2);
    });
    it('starts the loop after the last node has drawn', () => {
      expect(spec.loopStart).toBeGreaterThan(Math.max(...spec.nodes.map((n) => n.d)));
    });
    it('keeps input lines clear of the N.xx label of the node they enter', () => {
      for (const [x, , y2, label] of spec.inputs) {
        const n = spec.nodes.find((m) => !isDiamond(m) && m.y === y2);
        if (!n || isDiamond(n)) continue;
        expect(x < n.x - 2 || x > n.x + 26, `${key} input ${label} crosses the N label at x ${n.x}-${n.x + 26}`).toBe(true);
      }
    });
    it('has an accessible title and description', () => {
      expect(spec.title.length).toBeGreaterThan(5);
      expect(spec.desc.length).toBeGreaterThan(40);
    });
  });
}
