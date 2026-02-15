export type Project = {
    id: string;
    title: string;
    value: string;
    problem: string;
    result: string;
    summary: string;
    impact: string[];
    stack: string[];
    details: string[];
    links?: { label: string; href: string }[];
};

export const projects: Project[] = [
    {
        id: 'cylerity-underwriting',
        title: 'Cylerity Claims Underwriting',
        value: 'Turned a weeks-long healthcare cash cycle into same-day provider decisions.',
        problem: 'Insurance claims took weeks to pay out, forcing healthcare providers into cash crunches that stalled operations and growth. No underwriting process existed to fix it.',
        result: 'Same-day decisions for providers. Eight-figure lending facility secured. A scalable underwriting operation that runs end-to-end.',
        summary: 'Designed the operating model that turns healthcare claims into same-day funding decisions — from architecture through an eight-figure lending facility.',
        impact: [
            'Same-day decisions',
            'Eight-figure facility',
            'End-to-end operating model',
        ],
        stack: ['Next.js', 'TypeScript', 'Node.js', 'Firebase', 'Firestore', 'SQL Server', 'Azure', 'Azure Data Factory', 'Docker', 'Confluence', 'Jira'],
        details: [
            'Designed the end-to-end operating model — how claims data enters, gets assessed, and produces a funding decision.',
            'Ran risk assessment and compliance in parallel, collapsing weeks into hours.',
            'Built the transparency layer so providers see exactly what was approved and why.',
        ],
        links: [
            { label: 'Company', href: 'https://cylerity.com/' },
        ],
    },
    {
        id: 'skalewin',
        title: 'Skale.win Career Platform',
        value: 'Reinventing how hiring works — from resumes to real capability.',
        problem: 'Hiring has been stuck on the same model for decades — resumes, keyword matching, and surface-level signals. Candidates can\'t show what they\'re actually capable of, and employers can\'t see it.',
        result: 'A platform that captures capability at a higher dimension than a resume ever could. White-label ready for enterprise hiring. Making meritocracy scalable.',
        summary: 'End-to-end career platform — understand your strengths, upskill, and get matched to opportunities based on what you\'re actually capable of.',
        impact: ['End-to-end careers', 'Enterprise & white-label', 'Reinventing meritocracy'],
        stack: ['FastAPI', 'Python', 'Next.js', 'TypeScript', 'OpenRouter', 'Perplexity', 'ElevenLabs', 'Kubernetes', 'Azure', 'PostgreSQL'],
        details: [
            'Rethinking hiring from first principles — using higher-dimensional embedding models to capture what a person can actually do.',
            'Built the product to be model-agnostic, so it evolves with AI capabilities without requiring rebuilds.',
            'Designed for white-label and enterprise hiring — the platform becomes the hiring infrastructure.',
        ],
    },
    {
        id: 'umn-launchpad',
        title: 'UMN Discovery Launchpad',
        value: 'Replaced ad-hoc mentorship with a system that moves founders forward faster.',
        problem: 'Founders and mentors were drowning in scattered information with no way to identify gaps or prioritize. Mentorship was ad-hoc, and the most useful help often arrived too late.',
        result: 'Mentors see where help is needed most. Founders see their gaps clearly. The right expertise reaches the right founder at the right time.',
        summary: 'Replaced ad-hoc startup mentorship with a system that detects gaps, matches expertise, and moves founders forward faster.',
        impact: ['Automated gap detection', 'Real-time mentor matching', 'Structured from chaos'],
        stack: ['Next.js', 'TypeScript', 'Vercel', 'PostgreSQL', 'Auth', 'Stripe'],
        details: [
            'Designed information architecture that turns unstructured founder activity into a coherent progress view.',
            'Built gap detection that surfaces what\'s missing and what needs attention next.',
            'Created mentor matching that connects the right expertise at the right time.',
        ],
    },
    {
        id: 'univise',
        title: 'Univise — Academic Advising AI',
        value: 'Made university advising accessible at scale — word of mouth only.',
        problem: 'Advising information was scattered across dozens of university pages and PDFs. Students couldn\'t find straightforward answers. Advisors were overwhelmed with repetitive questions.',
        result: 'Adopted across campus through word of mouth alone. Won best pitch at Transcend. Proved that the right information architecture reshapes how an institution delivers a service.',
        summary: 'Built a university advising system that spread across campus through word of mouth — no marketing, no push, just a product that solved a daily problem.',
        impact: ['Viral campus adoption', 'Best pitch at Transcend', 'Zero marketing spend'],
        stack: ['RAG', 'LLMs', 'Next.js', 'TypeScript', 'Pinecone', 'LangChain'],
        details: [
            'Identified the core problem: not a lack of information, but a lack of accessible information architecture.',
            'Surfaces answers in plain language with links to official sources — trust through transparency.',
            'Spread organically because it solved a daily friction point every student experienced.',
        ],
    },
    {
        id: 'smartbenai',
        title: 'SmartBenAI Claims Adjudication',
        value: 'Automated claims data extraction without compromising compliance.',
        problem: 'TPAs spent hours re-typing claim data from noisy scans. The process was slow and expensive, but compliance requirements made automation seem risky.',
        result: 'Clean, structured data with human oversight where it matters. Compliance-first — automation enhances accuracy instead of introducing risk.',
        summary: 'Automated claims data extraction for healthcare TPAs while keeping humans in the loop where compliance demands it.',
        impact: ['Hours of manual work cut', 'Compliance-first', 'Human-in-the-loop'],
        stack: ['Gemini Vision', 'Google Cloud', 'Azure', 'Docker', 'Next.js'],
        details: [
            'Automation handles volume, humans handle judgment — each doing what they do best.',
            'Confidence scoring flags low-certainty items for human review automatically.',
            'Built around healthcare privacy requirements from day one.',
        ],
    },
];
