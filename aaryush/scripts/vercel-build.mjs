// Vercel build: production builds run the release gate first (it fails while any copy is still a draft),
// preview builds skip it so branches still deploy with draft flags on. Run through `npm run build:vercel`.
import { spawnSync } from 'node:child_process';

const run = (args) => {
  const r = spawnSync('npm', args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (process.env.VERCEL_ENV === 'production') {
  console.log('[build:vercel] production build: running the release gate (npm run test:release)');
  run(['run', 'test:release']);
} else {
  console.log(`[build:vercel] ${process.env.VERCEL_ENV ?? 'local'} build: release gate skipped`);
}
run(['run', 'build']);
