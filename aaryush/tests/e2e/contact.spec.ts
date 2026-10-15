import { expect, test } from '@playwright/test';
import { EMAIL, EMAIL_FORMAT, PHONE, PHONE_DIGITS, PHONE_E164, PHONE_FORMAT } from '../contact-fixture';

test('there is no public contact file; Save contact builds the card in the browser', async ({ request, page }) => {
  expect((await request.get('/Aaryush%20Contact%20Info.vcf')).status()).toBe(404);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).not.toMatch(/vcf/i);
  await page.goto('/');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-contact="hero"] [data-vcard]').click()]);
  const chunks: Buffer[] = [];
  for await (const c of await dl.createReadStream()) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks).toString('utf8');
  expect(body).toContain('BEGIN:VCARD');
  const field = (name: string) => body.match(new RegExp(`^${name}[^:]*:(.+?)\r?$`, 'm'))?.[1] ?? '';
  expect(field('EMAIL')).toMatch(EMAIL_FORMAT);
  expect(field('TEL')).toMatch(PHONE_FORMAT);
  expect(body).toContain('URL:https://aaryush.com');
});

test('served HTML never contains the email address or phone number', async ({ request }) => {
  for (const path of ['/', '/work/gupta-advisory', '/qr']) {
    const res = await request.get(path);
    if (res.status() === 404) continue; // route not built yet in early tasks
    const html = await res.text();
    for (const secret of [EMAIL, PHONE_DIGITS, PHONE.replace(' ', ') ').replace(' ', '-'), PHONE.replace(/ /g, '-'), 'mailto:', 'tel:']) {
      expect(html.includes(secret), `${path} leaks ${secret}`).toBe(false);
    }
  }
});

test('with JavaScript, Email and Call become working links', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Email' })).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(footer.getByRole('link', { name: 'Call' })).toHaveAttribute('href', `tel:${PHONE_E164}`);
});

test('without JavaScript, LinkedIn and GitHub work, and Save contact, Email and Call are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.locator('[data-vcard]')).toBeHidden();
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/aaryush');
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Aaryush1');
  await expect(footer.locator('[data-obf]')).toHaveCount(2);
  for (const el of await footer.locator('[data-obf]').all()) await expect(el).toBeHidden();
  await context.close();
});
