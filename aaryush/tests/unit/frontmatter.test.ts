import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

// YAML flow mappings split on commas: `{ detail: a, b }` silently becomes detail "a" plus a null key "b".
// Any null value inside a list-of-objects field means a comma-containing value wasn't quoted.
const dirs = ['src/content/companies', 'src/content/systems'];
const files = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => join(d, f)));

describe('content frontmatter', () => {
  it.each(files)('%s has no values truncated by unquoted commas', (file) => {
    const fm = readFileSync(file, 'utf8').split(/^---$/m)[1];
    const data = yaml.load(fm) as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (item && typeof item === 'object') {
          for (const [k, v] of Object.entries(item)) expect(v, `${key}.${k}`).not.toBeNull();
        }
      }
    }
  });
});
