export type Level = { n: 1 | 2 | 3 | 4; title: string; em: string; body: string; refs: string[] };

/** Copy is draft until Task 13 (site.drafts.levels). refs are company or system slugs. */
export const levels: Level[] = [
  { n: 1, title: 'How the organization ', em: 'runs', body: 'Operating models and decision rights: who decides what, and which decisions a system can carry so people don’t have to.', refs: ['cylerity', 'gupta-advisory'] },
  { n: 2, title: 'How work ', em: 'moves', body: 'The handoffs between people and AI: where judgment is needed, and where volume can be absorbed without anyone touching it.', refs: ['smartbenai', 'cylerity-intake'] },
  { n: 3, title: 'How things get ', em: 'built', body: 'Engineering and product processes rebuilt around AI, so more people can build and fewer steps wait on a specialist.', refs: ['ready-rebound-loop', 'cylerity-intake'] },
  { n: 4, title: 'What gets ', em: 'built', body: 'Products that only exist because AI does.', refs: ['univise', 'skale-platform', 'cylerity-underwriting', 'umn-launchpad'] },
];
