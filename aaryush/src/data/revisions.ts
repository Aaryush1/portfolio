/**
 * The revision block (E14): a hand-written drawing-revision list behind the title block's "Last deploy" cell.
 * Curated descriptions, not git messages. Newest first, lettered A, B, C… Add a row when something meaningful ships.
 * Dates are year.month only.
 */
export interface Revision { rev: string; date: string; description: string }

export const revisions: readonly Revision[] = [
  { rev: 'E', date: '2026.10', description: 'The sky overhead, live.' },
  { rev: 'D', date: '2026.10', description: 'The writing room.' },
  { rev: 'C', date: '2026.10', description: 'Systems you can open. A card that remembers.' },
  { rev: 'B', date: '2026.02', description: 'Repositioned around AI. The writing begins.' },
  { rev: 'A', date: '2025.08', description: 'Rebuilt in Astro. Works on phones.' },
];
