import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { knownKind, readingMinutes, sectionCount, toPieceView, wordCount } from '../../src/lib/writing';

const raw = readFileSync('src/content/writing/once-for-good.md', 'utf8');
const [, front, ...rest] = raw.split(/^---$/m);
const data = yaml.load(front) as Record<string, any>;
const body = rest.join('---');

describe('the first note, "Once, for Good"', () => {
  it('is kind: note and the desk has an object for it', () => {
    expect(data.kind).toBe('note');
    expect(knownKind(data.kind)).toBe('note');
  });
  it('has a computed reading time and no hand-written one', () => {
    expect(data.minutes).toBeUndefined();
    const v = toPieceView({ id: 'once-for-good', body, data: { ...data, date: new Date(data.date), subtitle: '' } as any });
    expect(v.minutes).toBe(readingMinutes(wordCount(body)));
    expect(v.minutes).toBeGreaterThanOrEqual(1);
    expect(v.shape).toBe('note');
  });
  it('has a four entry breakdown and one section per card', () => {
    expect(data.breakdown).toHaveLength(4);
    expect(sectionCount('note', body, 4)).toBe(4);
  });
  it('is published, with its approved summary', () => {
    expect(data.draft).toBe(false);
    expect(data.summary).toBe('Solving the same problem twice never sat right with me. Here’s what AI changed about that.');
  });
});
