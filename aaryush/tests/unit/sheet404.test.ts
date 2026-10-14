import { describe, expect, it } from 'vitest';
import { displayPath, insertIndex } from '../../src/lib/sheet404';

describe('404 sheet helpers', () => {
  it('shows short paths as they are, decoded', () => {
    expect(displayPath('/nope')).toBe('/nope');
    expect(displayPath('/caf%C3%A9')).toBe('/café');
  });
  it('keeps malformed escapes as literal text', () => {
    expect(displayPath('/%E0%A4%A')).toBe('/%E0%A4%A');
  });
  it('truncates to 60 characters, counting code points', () => {
    const out = displayPath('/' + 'a'.repeat(200));
    expect([...out]).toHaveLength(60);
    expect(out.endsWith('…')).toBe(true);
    expect([...displayPath('/' + '😀'.repeat(100))]).toHaveLength(60);
    expect(displayPath('/' + 'b'.repeat(59))).toHaveLength(60);
    expect(displayPath('/' + 'b'.repeat(59))).not.toContain('…');
  });
  it('leaves markup alone (escaping is the renderer job, via textContent)', () => {
    expect(displayPath('/<script>alert(1)</script>')).toBe('/<script>alert(1)</script>');
  });
  it('inserts the missing row in sorted position among the sheets', () => {
    const hrefs = ['/#hero', '/#about', '/#levels', '/#work', '/writing', '/#contact'];
    expect(insertIndex('/zzz', hrefs)).toBe(6);
    expect(insertIndex('/nope', hrefs)).toBe(4);
    expect(insertIndex('/', hrefs)).toBe(0);
  });
});
