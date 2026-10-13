import { describe, expect, it } from 'vitest';
import { parseWorkPath } from '../../src/lib/routes';

describe('parseWorkPath', () => {
  it('extracts the slug', () => expect(parseWorkPath('/work/cylerity-intake')).toBe('cylerity-intake'));
  it('accepts a trailing slash', () => expect(parseWorkPath('/work/cylerity/')).toBe('cylerity'));
  it('rejects other paths', () => {
    expect(parseWorkPath('/')).toBeNull();
    expect(parseWorkPath('/work')).toBeNull();
    expect(parseWorkPath('/work/')).toBeNull();
    expect(parseWorkPath('/writing/x')).toBeNull();
    expect(parseWorkPath('/work/a/b')).toBeNull();
  });
  it('rejects unsafe slugs', () => {
    expect(parseWorkPath('/work/..%2F')).toBeNull();
    expect(parseWorkPath('/work/Upper')).toBeNull();
  });
});
