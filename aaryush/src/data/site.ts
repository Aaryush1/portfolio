export const site = {
  name: 'Aaryush Gupta',
  url: 'https://aaryush.com',
  title: 'Aaryush Gupta — AI Strategy & Organizational Design',
  description:
    'I build the systems behind how organizations work: operating models, decision architectures and AI systems for organizations in healthcare, finance, tech and beyond.',
  eyebrow: 'AI Strategy & Organizational Design',
  hero: {
    lead: 'I build the systems behind',
    subjects: ['how decisions get made', 'how work moves', 'how teams build', 'how products get made'],
    settled: { before: 'how ', em: 'organizations', after: ' work' },
    lede: 'I look for the system underneath how a company works, then rebuild it with AI, so it handles a whole class of problems on its own, not just the one in front of it.',
  },
  about: [
    'AI is becoming the infrastructure underneath how decisions get made, how expertise gets applied, and how teams create value. The organizations that see this early won’t just be faster. They’ll be built differently.',
    'That’s the work I do: finding the system underneath how an organization runs, then rebuilding it around AI so it handles a whole class of problems on its own. I’ve done it across healthcare, finance, hiring and education, inside companies and as an advisor.',
    'If you’re thinking about what AI means for how your organization actually works, I’d like to hear about it.',
  ],
  contact: {
    /** Split on purpose: never render the joined address or number into HTML (scraper protection). */
    emailParts: ['aaryush', 'outlook.com'],
    phoneParts: ['+1', '949', '331', '2850'],
    linkedin: 'https://www.linkedin.com/in/aaryush',
    github: 'https://github.com/Aaryush1',
    vcard: '/Aaryush%20Contact%20Info.vcf',
  },
  location: 'Madison, WI',
  education: 'UW–Madison',
  next: { name: 'contextOS', note: 'Coming soon.' },
  footer: {
    heading: 'Let’s talk.',
    lead: 'The best first message is a rough picture of what you’re trying to solve and how it’s handled today.',
  },
  companyLinkLabel: (name: string) => `Inside ${name}`,
  /** Flip to false in Task 13 once Aaryush approves each block. */
  drafts: { hero: true, about: true, levels: true, companyLinkLabel: true, footer: false, consoleNote: true, keyboardMap: true, notFound: true },
} as const;

export type Site = typeof site;
