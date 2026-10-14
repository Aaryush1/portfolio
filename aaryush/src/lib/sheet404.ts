const MAX = 60;

/** Requested path for display: decoded when valid, at most 60 characters (code points). Escaping is left to textContent. */
export function displayPath(pathname: string): string {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* keep the raw text */ }
  const chars = [...p];
  return chars.length > MAX ? chars.slice(0, MAX - 1).join('') + '…' : p;
}

/** Index at which the missing row sorts among the sheet links (first link that sorts after the path). */
export function insertIndex(pathname: string, hrefs: readonly string[]): number {
  const i = hrefs.findIndex((h) => h > pathname);
  return i === -1 ? hrefs.length : i;
}
