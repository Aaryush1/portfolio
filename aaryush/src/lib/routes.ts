const WORK = /^\/work\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

export function parseWorkPath(pathname: string): string | null {
  return WORK.exec(pathname)?.[1] ?? null;
}
