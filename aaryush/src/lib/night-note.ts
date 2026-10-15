/**
 * The homepage night note copy (E7). It lives in its own module, which the script loads on demand, so it never appears
 * in the served HTML. It is pencil on the drawing: a drafting label and three numbered lines. The period rule (night is
 * 21:00 to 07:00) is in daypart.ts.
 */
export const NIGHT_NOTE = {
  label: 'General notes',
  lines: ['It’s past nine.', 'You’re still here.', 'Good.'],
} as const;
