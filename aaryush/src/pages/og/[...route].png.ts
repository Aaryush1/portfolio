import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../lib/og';
import { site } from '../../data/site';

type Props = { kicker: string; title: string; subtitle?: string };

export async function getStaticPaths() {
  const companies = await getCollection('companies', ({ data }) => data.kind === 'company');
  const systems = await getCollection('systems');
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const byId = new Map(companies.map((c) => [c.id, c.data.name]));
  return [
    { params: { route: 'home' }, props: { kicker: site.eyebrow, title: site.name, subtitle: `${site.hero.lead} ${site.hero.settled.before}${site.hero.settled.em}${site.hero.settled.after}.` } },
    { params: { route: 'writing' }, props: { kicker: 'Writing', title: 'Notes on where this is going.' } },
    ...writing.map((p) => ({ params: { route: `writing/${p.id}` }, props: { kicker: 'Writing', title: p.data.title, subtitle: p.data.subtitle } })),
    ...companies.map((c) => ({ params: { route: `work/${c.id}` }, props: { kicker: 'Work', title: c.data.name, subtitle: c.data.summary } })),
    ...systems.map((s) => ({ params: { route: `work/${s.id}` }, props: { kicker: byId.get(s.data.company.id) ?? 'Work', title: s.data.title, subtitle: s.data.summary } })),
  ] satisfies { params: { route: string }; props: Props }[];
}

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(await renderOg(props), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
