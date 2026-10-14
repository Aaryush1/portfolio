import type { Page } from '@playwright/test';

/**
 * Resolves once webfonts are loaded and every finite CSS/Web animation has finished, so a colour or layout
 * measurement isn't taken mid-fade. Looping animations are ignored on purpose (they never finish).
 * Replaces fixed waitForTimeout() sleeps, which are too short on a loaded machine and wasted time on an idle one.
 */
export async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let pass = 0; pass < 5; pass++) {
      const running = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.playState !== 'finished');
      if (running.length === 0) return;
      await Promise.allSettled(running.map((a) => a.finished));
    }
  });
}
