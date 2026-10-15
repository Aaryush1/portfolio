import { describe, expect, it } from 'vitest';
import { buildTimeline, formatRange, numberSystems, workSlugs } from '../../src/lib/timeline';

const co = (id: string, order: number, kind: 'company' | 'group' = 'company') => ({ id, data: { order, kind, start: '2024-01', end: null } });
const sys = (id: string, company: string, order: number) => ({ id, data: { company: { id: company }, order } });

describe('formatRange', () => {
  it('formats an open-ended role', () => expect(formatRange('2024-01', null)).toBe('Jan 2024 – Present'));
  it('formats a closed role', () => expect(formatRange('2024-06', '2026-02')).toBe('Jun 2024 – Feb 2026'));
  it('formats years only for groups', () => expect(formatRange('2023-03', '2024-07', true)).toBe('2023 – 2024'));
  it('rejects malformed months', () => expect(() => formatRange('2024-13', null)).toThrow(/month/));
});

describe('buildTimeline', () => {
  it('orders companies by order and nests their systems by order', () => {
    const t = buildTimeline([co('b', 2), co('a', 1)], [sys('a2', 'a', 2), sys('a1', 'a', 1), sys('b1', 'b', 1)]);
    expect(t.map((e) => e.company.id)).toEqual(['a', 'b']);
    expect(t[0].systems.map((s) => s.id)).toEqual(['a1', 'a2']);
  });
  it('keeps companies with no systems', () => {
    expect(buildTimeline([co('a', 1)], [])[0].systems).toEqual([]);
  });
  it('throws when a system points at a missing company', () => {
    expect(() => buildTimeline([co('a', 1)], [sys('x', 'missing', 1)])).toThrow(/missing/);
  });
});

describe('numberSystems', () => {
  it('numbers systems in timeline order, zero-padded', () => {
    const t = buildTimeline([co('a', 1), co('b', 2)], [sys('b1', 'b', 1), sys('a1', 'a', 1)]);
    expect(Object.fromEntries(numberSystems(t))).toEqual({ a1: 'SYS.01', b1: 'SYS.02' });
  });
});

describe('workSlugs', () => {
  it('lists company (non-group) and system slugs', () => {
    expect(workSlugs([co('a', 1), co('g', 2, 'group')], [sys('s', 'a', 1)])).toEqual(['a', 's']);
  });
  it('throws on a duplicate slug', () => {
    expect(() => workSlugs([co('a', 1)], [sys('a', 'a', 1)])).toThrow(/duplicate/i);
  });
});
