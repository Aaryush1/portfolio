import { test, type Page } from '@playwright/test';

/**
 * Pins the page clock to a fixed afternoon (13:00) so specs that are not about the time of day never run at night
 * (9pm to 7am the room, the field and the note all change). Install before goto.
 */
export const afternoon = (page: Page) => page.clock.install({ time: new Date('2026-10-14T13:00:00') });

/** For a whole spec file that uses the `page` fixture. */
export const pinAfternoon = () => test.beforeEach(async ({ page }) => { await afternoon(page); });