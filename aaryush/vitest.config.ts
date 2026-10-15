import { getViteConfig } from 'astro/config';

// getViteConfig lets unit tests import .astro components (the container API in writing-objects.test.ts).
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/release/**/*.test.ts'],
    environment: 'node',
  },
} as never);
