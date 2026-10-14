import { expect, type Locator } from '@playwright/test';

// Zoom eases toward its target and snaps the last 0.004, so tests wait on a threshold, not an exact string.
export const SETTLE = 20_000;

export async function expectZoomAbove(fig: Locator, min = 2.9) {
  await expect.poll(async () => Number(await fig.getAttribute('data-zoom')), { timeout: SETTLE }).toBeGreaterThan(min);
}
