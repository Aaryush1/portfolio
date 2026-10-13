import { describe, expect, it } from 'vitest';
import { crossed, nodeBounds, nodeHits, pathD, pointAt, polylineLength, type DiagramSpec, type Pt } from '../../src/lib/diagram';

const square: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe('polyline geometry', () => {
  it('measures a closed square', () => expect(polylineLength(square)).toBe(40));
  it('measures an open polyline', () => expect(polylineLength(square, false)).toBe(30));
  it('finds points along the path', () => {
    expect(pointAt(square, 0)).toEqual([0, 0]);
    expect(pointAt(square, 15)).toEqual([10, 5]);
    expect(pointAt(square, 35)).toEqual([0, 5]);
  });
  it('wraps positions beyond the length', () => expect(pointAt(square, 45)).toEqual([5, 0]));
  it('wraps negative positions', () => expect(pointAt(square, -5)).toEqual([0, 5]));
  it('writes an SVG path', () => {
    expect(pathD(square, true)).toBe('M0 0 L10 0 L10 10 L0 10 Z');
    expect(pathD([[1, 2], [3, 4]], false)).toBe('M1 2 L3 4');
  });
});

describe('nodeBounds', () => {
  it('uses the box for box nodes', () => expect(nodeBounds({ x: 1, y: 2, w: 3, h: 4, t: 'a', d: 0 })).toEqual({ x: 1, y: 2, w: 3, h: 4 }));
  it('uses the bounding square for diamonds', () => expect(nodeBounds({ diamond: true, cx: 10, cy: 10, r: 5, t: 'a', d: 0 })).toEqual({ x: 5, y: 5, w: 10, h: 10 }));
});

describe('nodeHits', () => {
  const spec = (nodes: DiagramSpec['nodes']): DiagramSpec => ({ vb: [100, 100], title: '', desc: '', inputs: [], edges: [], loopStart: 0, nodes, pulse: [[0, 50], [100, 50], [100, 90], [0, 90]] });

  it('records the arc length where the pulse enters a node', () => {
    const hits = nodeHits(spec([{ x: 40, y: 45, w: 20, h: 10, t: 'mid', d: 0 }]));
    expect(hits).toHaveLength(1);
    expect(hits[0].node).toBe(0);
    expect(hits[0].at).toBeGreaterThanOrEqual(38);
    expect(hits[0].at).toBeLessThanOrEqual(41);
  });
  it('skips nodes the pulse never touches', () => {
    expect(nodeHits(spec([{ x: 40, y: 0, w: 10, h: 10, t: 'off', d: 0 }]))).toEqual([]);
  });
  it('treats a node containing the start as entered on wrap, not at 0', () => {
    const hits = nodeHits(spec([{ x: -5, y: 40, w: 20, h: 60, t: 'start', d: 0 }]));
    expect(hits).toHaveLength(1);
    expect(hits[0].at).toBeGreaterThan(200);
  });
  it('returns hits sorted by position', () => {
    const hits = nodeHits(spec([{ x: 80, y: 45, w: 10, h: 10, t: 'b', d: 0 }, { x: 20, y: 45, w: 10, h: 10, t: 'a', d: 0 }]));
    expect(hits.map((h) => h.node)).toEqual([1, 0]);
  });
});

describe('crossed', () => {
  it('detects a crossing within a forward step', () => expect(crossed(10, 20, 15, 100)).toBe(true));
  it('ignores positions outside the step', () => expect(crossed(10, 20, 25, 100)).toBe(false));
  it('includes the end of the step, excludes the start', () => {
    expect(crossed(10, 20, 20, 100)).toBe(true);
    expect(crossed(10, 20, 10, 100)).toBe(false);
  });
  it('handles wrap-around steps', () => {
    expect(crossed(95, 5, 98, 100)).toBe(true);
    expect(crossed(95, 5, 2, 100)).toBe(true);
    expect(crossed(95, 5, 50, 100)).toBe(false);
  });
  it('treats a zero step as no crossing', () => expect(crossed(10, 10, 10, 100)).toBe(false));
});
