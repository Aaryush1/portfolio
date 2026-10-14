import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFile(require.resolve(`${pkg}/files/${file}`));
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: 'normal' | 'italic' }[]> | null = null;
const loadFonts = () => (fonts ??= Promise.all([
  font('@fontsource/instrument-sans', 'instrument-sans-latin-500-normal.woff').then((data) => ({ name: 'Instrument Sans', data, weight: 500 as const, style: 'normal' as const })),
  font('@fontsource/instrument-sans', 'instrument-sans-latin-400-normal.woff').then((data) => ({ name: 'Instrument Sans', data, weight: 400 as const, style: 'normal' as const })),
  font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff').then((data) => ({ name: 'JetBrains Mono', data, weight: 400 as const, style: 'normal' as const })),
]));

type El = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): El => ({ type, props: { style, children } });

export async function renderOg({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }): Promise<Buffer> {
  const grid = 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)';
  const tree = h('div', { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', paddingTop: 72, paddingBottom: 72, paddingLeft: 80, paddingRight: 80, background: '#0A0B0E', backgroundImage: grid, backgroundSize: '48px 48px', color: '#E6E7EA', fontFamily: 'Instrument Sans' }, [
    h('div', { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 2, color: '#A0A4AE', textTransform: 'uppercase' }, [
      h('div', { width: 28, height: 2, background: '#F2B544' }),
      kicker,
    ]),
    h('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
      h('div', { fontSize: title.length > 40 ? 64 : 80, fontWeight: 500, lineHeight: 1.02, letterSpacing: -2.5 }, title),
      subtitle ? h('div', { fontSize: 30, color: '#A0A4AE', lineHeight: 1.3, maxWidth: 940 }, subtitle) : null,
    ].filter(Boolean)),
    h('div', { display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 20, color: '#8B909C' }, [h('div', {}, 'aaryush.com'), h('div', {}, 'Aaryush Gupta')]),
  ]);
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
