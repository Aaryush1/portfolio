import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Drawer from '../../src/components/writing/Drawer.astro';

// The live site.drawer is empty, so the redacted rendering is tested against a fixture entry.
const render = async (entries?: { kind: string; length: string }[]) =>
  (await AstroContainer.create()).renderToString(Drawer, entries ? { props: { entries } } : {});

describe('the drawer', () => {
  it('with no unpublished work it holds only the contextOS folder', async () => {
    const html = await render([]);
    expect(html).toContain('contextOS');
    expect(html).not.toContain('class="redacted"');
  });

  it('renders one redacted paper per entry, with kind and length only', async () => {
    const html = await render([{ kind: 'essay', length: '~2,000 words' }]);
    expect(html.match(/class="redacted"/g)).toHaveLength(1);
    expect(html).toContain('essay');
    expect(html).toContain('~2,000 words');
    expect(html).toContain('aria-label="essay, ~2,000 words, unpublished"');
  });

  it('an unknown kind still renders as a redacted paper without errors', async () => {
    const html = await render([{ kind: 'zine', length: '~300 words' }]);
    expect(html).toContain('aria-label="zine, ~300 words, unpublished"');
  });

  it('the folder is decorative: nothing in the drawer is a link', async () => {
    const html = await render([{ kind: 'letter', length: '~800 words' }]);
    expect(html).not.toMatch(/<a\s/);
    expect(html).not.toMatch(/href=/);
  });

  it('the front is a button that controls the contents', async () => {
    const html = await render([]);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="drawer-contents"/);
    expect(html).toContain('id="drawer-contents"');
  });
});
