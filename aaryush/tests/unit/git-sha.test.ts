import { describe, expect, it } from 'vitest';
import { readShortSha } from '../../src/lib/git-sha.mjs';

// E10: the deploy hash is the short git SHA at build time. No git means no hash, and the build still works.
describe('readShortSha (E10)', () => {
  it('returns the short SHA git prints', () => {
    expect(readShortSha(() => 'a868cd5\n')).toBe('a868cd5');
  });
  it('gives nothing when git is unavailable or throws', () => {
    expect(readShortSha(() => { throw new Error('git: not found'); })).toBe('');
  });
  it('gives nothing for anything that is not a hex SHA', () => {
    expect(readShortSha(() => 'fatal: not a git repository')).toBe('');
    expect(readShortSha(() => '')).toBe('');
    expect(readShortSha(() => undefined as unknown as string)).toBe('');
  });
});
