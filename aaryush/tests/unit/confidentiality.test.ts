import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Add the city product's name here (lower-case) if it is ever mentioned in conversation. */
const FORBIDDEN = ['orchestra'];
const root = fileURLToPath(new URL('../../src/', import.meta.url));

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(astro|ts|md|css)$/.test(name)) yield p;
  }
}

describe('confidentiality', () => {
  it('never names internal tools or products', () => {
    for (const f of files(root)) {
      const text = readFileSync(f, 'utf8').toLowerCase();
      for (const word of FORBIDDEN) expect(text.includes(word), `${f} contains "${word}"`).toBe(false);
    }
  });
});
