// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeRaw from 'rehype-raw';
import rehypeCitations from './src/lib/rehype-citations.mjs';
import rehypeReferences from './src/lib/rehype-references.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://aaryush.com',
	integrations: [sitemap()],
	markdown: { rehypePlugins: [rehypeRaw, rehypeCitations, rehypeReferences] },
	// Inline the (small) stylesheets so first paint doesn't wait on a CSS round trip and then the fonts it references.
	build: { inlineStylesheets: 'always' },
});
