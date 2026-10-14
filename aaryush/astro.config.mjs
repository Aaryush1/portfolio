// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://aaryush.com',
	integrations: [sitemap()],
	// Inline the (small) stylesheets so first paint doesn't wait on a CSS round trip and then the fonts it references.
	build: { inlineStylesheets: 'always' },
});
