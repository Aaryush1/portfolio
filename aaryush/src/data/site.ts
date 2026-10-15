export const site = {
  name: 'Aaryush Gupta',
  url: 'https://aaryush.com',
  title: 'Aaryush Gupta',
  description:
    'I build the systems behind how anyone solves problems: operating models, decision architectures and AI systems for organizations in healthcare, finance, tech and beyond.',
  hero: {
    lead: 'I build the systems behind',
    subjects: ['how a problem gets solved', 'how problems get solved', 'how problems solve themselves', 'how teams solve problems'],
    settled: { before: 'how ', em: 'anyone', after: ' solves problems' },
    lede: 'Interesting people are the best part of this. Say hi.',
  },
  contact: {
    /** Split on purpose: never render the joined address or number into HTML (scraper protection). */
    emailParts: ['aaryush', 'outlook.com'],
    phoneParts: ['+1', '949', '331', '2850'],
    linkedin: 'https://www.linkedin.com/in/aaryush',
    github: 'https://github.com/Aaryush1',
    vcard: '/Aaryush%20Contact%20Info.vcf',
  },
  /** /qr: the page Aaryush uses on his phone to make a QR that remembers where he met someone (E6). Draft copy. */
  meet: {
    presets: ['Coffee', 'Conference', 'Dinner'],
    labels: {
      where: 'Where',
      wherePlaceholder: 'Madison AI Week',
      about: 'Talked about',
      aboutPlaceholder: 'pricing AI agents',
      clear: 'Clear',
      idle: 'aaryush.com',
    },
  },
  /** Title-block fields, shared by the hero and the printed sheet. */
  sheet: { dwg: 'AG-001', sheet: '01 / 05', region: 'us-central', scale: 'NTS' },
  location: 'Madison, WI',
  education: 'UW–Madison',
  next: { name: 'contextOS', note: 'Coming soon.' },
  /** /writing drawer: unpublished work, shown only as kind + rough length. Never titles or content. Empty: the drawer holds only the contextOS folder (Aaryush, 2026-10-14). */
  drawer: [] as { kind: string; length: string }[],
  footer: {
    heading: 'Let’s talk.',
    lead: 'The best conversations start half-formed.',
  },
  companyLinkLabel: (name: string) => `Inside ${name}`,
  /** Flip to false in Task 13 once Aaryush approves each block. */
  drafts: { hero: false, about: false, levels: false, companyLinkLabel: false, footer: false, consoleNote: false, keyboardMap: false, notFound: false, qrCard: false, writingRoom: false },
} as const;

/** Build-time stamp (YYYY.MM), so it always matches the deploy that's live. */
export function lastDeploy(built = new Date()): string {
  return `${built.getFullYear()}.${String(built.getMonth() + 1).padStart(2, '0')}`;
}

// Replaced at build time by astro.config.mjs (Vite define). '' when git was unavailable, so the hash is simply absent.
declare const __GIT_SHA__: string | undefined;
/** Short git SHA of this build (E10): shown on hover or focus of "Last deploy". */
export function lastCommit(): string {
  return typeof __GIT_SHA__ === 'string' ? __GIT_SHA__ : '';
}

export type Site = typeof site;
