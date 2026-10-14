import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg, type OgCard } from '../../lib/og';
import { site, lastDeploy } from '../../data/site';
import { diagrams } from '../../data/diagrams';
import { toPieceView } from '../../lib/writing';

type Props = { card: OgCard };

/** Stable per-route seed for the topography background. */
const seedOf = (s: string) => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;

export async function getStaticPaths() {
  const companies = (await getCollection('companies')).sort((a, b) => a.data.order - b.data.order);
  const systems = (await getCollection('systems')).sort((a, b) => a.data.order - b.data.order);
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const byId = new Map(companies.map((c) => [c.id, c.data]));
  const line = `${site.hero.lead} ${site.hero.settled.before}${site.hero.settled.em}${site.hero.settled.after}.`;

  const home: { params: { route: string }; props: Props }[] = [
    { params: { route: 'home' }, props: { card: { type: 'home', name: site.name, line, deploy: lastDeploy() } } },
    { params: { route: 'writing' }, props: { card: { type: 'writing' } } },
  ];

  const essays = writing.map((entry) => {
    const p = toPieceView(entry);
    return { params: { route: `writing/${p.slug}` }, props: { card: { type: 'essay', shape: p.shape, kicker: `${p.kind} · ${p.minutes} min read`, title: p.title } satisfies OgCard } };
  });

  // A company shows its first system that has a diagram; none (Gupta Advisory) falls back to the topography.
  const companyCards = companies.filter((c) => c.data.kind === 'company').map((c) => {
    const rep = systems.find((s) => s.data.company.id === c.id && s.data.diagram);
    const card: OgCard = {
      type: 'place',
      kicker: c.id === 'gupta-advisory' ? 'Practice' : 'Company',
      title: c.data.name,
      sub: rep?.data.title ?? c.data.role,
      diagram: rep?.data.diagram ? diagrams[rep.data.diagram] : undefined,
      seed: seedOf(c.id),
    };
    return { params: { route: `work/${c.id}` }, props: { card } };
  });

  const systemCards = systems.map((s) => {
    const co = byId.get(s.data.company.id);
    const group = co?.kind === 'group';
    const card: OgCard = {
      type: 'place',
      kicker: s.data.diagram ? 'System diagram' : 'System',
      // "Earlier" is a group of unrelated past work, so the system leads and the group becomes the subtext.
      title: group || !co ? s.data.title : co.name,
      sub: group || !co ? (co ? `${co.name} work` : undefined) : s.data.title,
      diagram: s.data.diagram ? diagrams[s.data.diagram] : undefined,
      seed: seedOf(s.id),
    };
    return { params: { route: `work/${s.id}` }, props: { card } };
  });

  return [...home, ...essays, ...companyCards, ...systemCards] satisfies { params: { route: string }; props: Props }[];
}

export const GET: APIRoute<Props> = async ({ props }) =>
  new Response(new Uint8Array(await renderOg(props.card)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
