import type { Level } from '../data/levels';

export function levelsFor(slug: string, all: Level[]): Level[] {
  return all.filter((l) => l.refs.includes(slug));
}
