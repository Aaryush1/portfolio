import { expect, test } from '@playwright/test';
import { EMAIL, PHONE_DIGITS, PHONE_FULL } from '../contact-fixture';

test.describe('/card', () => {
  test('a QR scan saves the contact with where we met, then continues to the site', async ({ page }) => {
    await page.goto('/card?met=AI%20Week&about=writing');
    await expect(page).toHaveURL(/\/card$/); // contact-card.ts keeps the details and cleans the URL
    const save = page.locator('[data-contact="card"] [data-vcard]');
    await expect(save).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
    const vcf = await (await download.createReadStream())!.toArray().then((c) => Buffer.concat(c).toString('utf8'));
    expect(vcf).toContain('BEGIN:VCARD');
    expect(vcf).toMatch(/AI Week/);
    await page.getByRole('link', { name: 'Continue to website' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('works on a phone without scrolling to reach Save contact', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/card');
    const box = await page.locator('[data-contact="card"] [data-vcard]').boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(640);
  });

  test('never serves the email or phone in its HTML', async ({ request }) => {
    const html = await (await request.get('/card')).text();
    for (const leak of [EMAIL, PHONE_FULL, PHONE_DIGITS]) expect(html).not.toContain(leak);
  });
});
