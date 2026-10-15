/**
 * The short git SHA for the deploy stamp (E10). `run` runs `git rev-parse --short HEAD` and returns its output.
 * If git is missing, the repo is absent or the output is not a hex SHA, the result is '' and the stamp shows the date only.
 */
export function readShortSha(run) {
  try {
    const out = String(run() ?? '').trim();
    return /^[0-9a-f]{4,40}$/.test(out) ? out : '';
  } catch {
    return '';
  }
}
