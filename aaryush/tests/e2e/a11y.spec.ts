import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { settled } from './settle';
import { pinAfternoon } from './afternoon';

pinAfternoon();

for (const path of ['/', '/writing', '/writing/quiet-singularity', '/work/cylerity-intake', '/qr', '/nope']) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await settled(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('every interactive element shows a visible focus state', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return 'none-needed';
      // a card-wide link draws its ring on the card that holds it (:has), so look there too
      const s = getComputedStyle(el.matches('.post-link') ? el.closest('.post')! : el);
      return s.outlineStyle !== 'none' && s.outlineWidth !== '0px' ? 'ok' : `missing on ${el.tagName}.${el.className}`;
    });
    expect(outline === 'ok' || outline === 'none-needed', outline).toBe(true);
  }
});
