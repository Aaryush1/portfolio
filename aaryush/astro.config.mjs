// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeRaw from 'rehype-raw';
import rehypeCitations from './src/lib/rehype-citations.mjs';
import rehypeReferences from './src/lib/rehype-references.mjs';
import { execSync } from 'node:child_process';
import { readShortSha } from './src/lib/git-sha.mjs';

// E10: the build's short commit, shown on hover or focus in the title block. Empty when git is unavailable.
const gitSha = readShortSha(() => execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }));

// https://astro.build/config
export default defineConfig({
	site: 'https://aaryush.com',
	// Parallel builders set ASTRO_OUT_DIR so two builds never write the same dist/.
	outDir: process.env.ASTRO_OUT_DIR || './dist',
	// /qr is a private tool page (noindex), so it stays out of the sitemap.
	integrations: [sitemap({ filter: (page) => !/\/qr\/?$/.test(page) })],
	markdown: { rehypePlugins: [rehypeRaw, rehypeCitations, rehypeReferences] },
	// Inline the (small) stylesheets so first paint doesn't wait on a CSS round trip and then the fonts it references.
	build: { inlineStylesheets: 'always' },
	vite: { define: { __GIT_SHA__: JSON.stringify(gitSha) } },
});
