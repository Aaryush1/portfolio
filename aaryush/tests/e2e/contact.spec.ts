import { expect, test } from '@playwright/test';

test('vCard downloads and contains contact details', async ({ request }) => {
  const res = await request.get('/Aaryush%20Contact%20Info.vcf');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('BEGIN:VCARD');
  expect(body).toContain('aaryush@outlook.com');
  expect(body).toContain('URL:https://aaryush.com');
});

test('served HTML never contains the email address or phone number', async ({ request }) => {
  for (const path of ['/', '/work/gupta-advisory', '/qr']) {
    const res = await request.get(path);
    if (res.status() === 404) continue; // route not built yet in early tasks
    const html = await res.text();
    for (const secret of ['aaryush@outlook.com', '9493312850', '949) 331-2850', '949-331-2850', 'mailto:', 'tel:']) {
      expect(html.includes(secret), `${path} leaks ${secret}`).toBe(false);
    }
  }
});

test('with JavaScript, Email and Call become working links', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:aaryush@outlook.com');
  await expect(footer.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+19493312850');
});

test('without JavaScript, the vCard, LinkedIn and GitHub work and Email/Call are hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Save contact' })).toHaveAttribute('href', '/Aaryush%20Contact%20Info.vcf');
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/aaryush');
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Aaryush1');
  await expect(footer.locator('[data-obf]')).toHaveCount(2);
  for (const el of await footer.locator('[data-obf]').all()) await expect(el).toBeHidden();
  await context.close();
});
