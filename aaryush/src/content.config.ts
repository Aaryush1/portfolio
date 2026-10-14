import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const fact = z.object({ label: z.string(), value: z.string() });

const companies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/companies' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['company', 'group']).default('company'),
    role: z.string().optional(),
    start: month,
    end: month.nullable(),
    order: z.number().int(),
    summary: z.string(),
    problem: z.string().optional(),
    owns: z.array(z.object({ title: z.string(), detail: z.string() })).default([]),
    facts: z.array(fact).default([]),
    ogDescription: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const systems = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/systems' }),
  schema: z.object({
    title: z.string(),
    company: reference('companies'),
    order: z.number().int(),
    summary: z.string(),
    outcome: z.string().optional(),
    diagram: z.enum(['intake', 'loop', 'launchpad', 'skale']).optional(),
    caption: z.string().optional(),
    legend: z.array(z.object({ kind: z.enum(['flow', 'dashed', 'feedback', 'human']), label: z.string() })).default([]),
    facts: z.array(fact).default([]),
    draft: z.boolean().default(false),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    kind: z.enum(['letter', 'paper']),
    pdf: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { companies, systems, writing };
