const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type CompanyLike = { id: string; data: { order: number; kind: 'company' | 'group'; start: string; end: string | null } };
export type SystemLike = { id: string; data: { company: { id: string }; order: number } };
export type TimelineEntry<C extends CompanyLike, S extends SystemLike> = { company: C; systems: S[] };

function parseMonth(value: string): { y: number; m: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const m = match ? Number(match[2]) : NaN;
  if (!match || m < 1 || m > 12) throw new Error(`Invalid month "${value}" (expected YYYY-MM)`);
  return { y: Number(match[1]), m };
}

export function formatRange(start: string, end: string | null, yearsOnly = false): string {
  const s = parseMonth(start);
  const e = end ? parseMonth(end) : null;
  if (yearsOnly) return `${s.y} – ${e ? e.y : 'Present'}`;
  const fmt = (p: { y: number; m: number }) => `${MONTHS[p.m - 1]} ${p.y}`;
  return `${fmt(s)} – ${e ? fmt(e) : 'Present'}`;
}

export function buildTimeline<C extends CompanyLike, S extends SystemLike>(companies: C[], systems: S[]): TimelineEntry<C, S>[] {
  const ids = new Set(companies.map((c) => c.id));
  for (const s of systems) if (!ids.has(s.data.company.id)) throw new Error(`System "${s.id}" references missing company "${s.data.company.id}"`);
  return [...companies]
    .sort((a, b) => a.data.order - b.data.order)
    .map((company) => ({
      company,
      systems: systems.filter((s) => s.data.company.id === company.id).sort((a, b) => a.data.order - b.data.order),
    }));
}

export function numberSystems<C extends CompanyLike, S extends SystemLike>(timeline: TimelineEntry<C, S>[]): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  for (const entry of timeline) for (const s of entry.systems) out.set(s.id, `SYS.${String(++i).padStart(2, '0')}`);
  return out;
}

export function workSlugs(companies: CompanyLike[], systems: SystemLike[]): string[] {
  const slugs = [...companies.filter((c) => c.data.kind === 'company').map((c) => c.id), ...systems.map((s) => s.id)];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`Duplicate work slug "${slug}"`);
    seen.add(slug);
  }
  return slugs;
}
