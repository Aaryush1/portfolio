import { getCollection } from 'astro:content';

export interface Topic { slug: string; name: string }

/** "Talked about" topics (E6): Gupta Advisory, then every system, then Writing. Built from the collections so it never drifts. */
export async function getTopics(): Promise<Topic[]> {
  const [companies, systems] = await Promise.all([getCollection('companies'), getCollection('systems')]);
  const rank = new Map(companies.map((c) => [c.id, c.data.order]));
  const ordered = [...systems].sort(
    (a, b) => (rank.get(a.data.company.id) ?? 99) - (rank.get(b.data.company.id) ?? 99) || a.data.order - b.data.order,
  );
  return [
    { slug: 'advisory', name: 'Gupta Advisory' },
    ...ordered.map((s) => ({ slug: s.id, name: s.data.title })),
    { slug: 'writing', name: 'Writing' },
  ];
}
