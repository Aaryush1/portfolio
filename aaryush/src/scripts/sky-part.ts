// Which period the hero sky shows. Shared by the small bootstrap (hero-sky.ts) and the lazily loaded engine (sky/engine.ts).
// Precedence: data-daypart on <html> (tests), then the shared `t` preview, then ?daypart= (dev builds only), then the clock.
import { daypartFor, isDaypart, type Daypart } from '../lib/daypart';
import { getOverride } from './daypart-override';

export function resolvePart(root: Element = document.documentElement): Daypart {
  const forced = root.getAttribute('data-daypart');
  if (isDaypart(forced)) return forced;
  const override = getOverride();
  if (override) return override;
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search).get('daypart');
    if (isDaypart(q)) return q;
  }
  return daypartFor(new Date().getHours());
}

/** The period the clock alone would give, ignoring any preview. */
export const realPart = (): Daypart => daypartFor(new Date().getHours());
