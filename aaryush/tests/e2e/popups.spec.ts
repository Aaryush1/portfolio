import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const dialog = (page: import('@playwright/test').Page) => page.locator('dialog#popup');

test('direct link opens the pop-up over the homepage', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Engineering intake');
  await expect(page.locator('#hero')).toBeAttached();
  await expect(page).toHaveTitle('Engineering intake — Aaryush Gupta');
});

test('direct link then back stays on site', async ({ page }) => {
  await page.goto('/work/ready-rebound');
  await expect(dialog(page)).toBeVisible();
  // page.goBack() is a no-op for same-document entries in Playwright's Firefox; history.back() is what the Back button runs.
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveTitle(/AI Strategy & Organizational Design/);
});

test('job → system → back to job → Esc closes', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('#co-cylerity a.more');
  await trigger.click();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await dialog(page).getByRole('link', { name: /Engineering intake/ }).click();
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  await dialog(page).locator('[data-popup-back]').click();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Cylerity');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await expect(trigger).toBeFocused();
});

test('backdrop click and close button both close', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-univise').click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(400); // backdrop clicks are ignored for 350ms after opening
  // The sheet is full-screen below 640px, so there is no backdrop to click on phones.
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
  } else {
    await dialog(page).locator('[data-popup-close]').click();
    await expect(dialog(page)).toBeHidden();
  }
  await page.locator('#sys-univise').click();
  await dialog(page).locator('[data-popup-close]').click();
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

// One test per pop-up: a single loop over every card runs 10+ open/close cycles, which on a loaded machine
// (WebKit especially) legitimately takes longer than the 30s test budget even though nothing is wrong.
const contentIds = (dir: string, keep: (src: string) => boolean = () => true) =>
  readdirSync(`src/content/${dir}`).filter((f) => f.endsWith('.md') && keep(readFileSync(`src/content/${dir}/${f}`, 'utf8'))).map((f) => f.replace(/\.md$/, ''));
const popupSlugs = [...contentIds('companies', (src) => !/^kind: group$/m.test(src)), ...contentIds('systems')];

test('the pop-up slugs under test match the links on the page', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('main [data-popup-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
  expect([...new Set(hrefs)].sort()).toEqual(popupSlugs.map((s) => `/work/${s}`).sort());
});

for (const slug of popupSlugs) {
  test(`card opens a real pop-up (no stubs): ${slug}`, async ({ page }) => {
    await page.goto('/');
    await page.locator(`main [data-popup-link][href="/work/${slug}"]`).first().click();
    await expect(dialog(page)).toBeVisible();
    const text = await dialog(page).innerText();
    expect(text).not.toMatch(/coming|write-up soon|lorem/i);
    expect(text.length).toBeGreaterThan(200);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  });
}

test('double click opens once', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-smartbenai').dblclick();
  await expect(dialog(page)).toBeVisible();
  // page.goBack() is a no-op for same-document entries in Playwright's Firefox; history.back() is what the Back button runs.
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('modifier click is not intercepted', async ({ page, context }) => {
  await page.goto('/');
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('#sys-univise').click({ modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'] }),
  ]);
  // The new tab starts at about:blank; waitForLoadState() would resolve on that, so wait for the real navigation.
  await popup.waitForURL('**/work/univise');
  await expect(dialog(page)).toBeHidden();
});

test('focus is trapped inside the open pop-up', async ({ page }) => {
  await page.goto('/');
  await page.locator('#co-gupta-advisory a.more').click();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog#popup'));
    expect(inside, `tab ${i}`).toBe(true);
  }
});

test('without JavaScript, /work pages are readable standalone pages', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/work/ready-rebound-loop');
  await expect(page.getByRole('heading', { name: 'Engineering loop', level: 2 })).toBeVisible();
  await expect(page.locator('svg.dg title')).toHaveText(/Engineering loop/);
  await expect(page.locator('[data-popup-close]')).toHaveAttribute('href', '/');
  await expect(page.locator('[data-popup-back]')).toHaveAttribute('href', '/work/ready-rebound');
  await context.close();
});

test('Gupta Advisory has no availability language', async ({ page }) => {
  await page.goto('/work/gupta-advisory');
  await expect(dialog(page)).not.toContainText(/taking on|availability|now booking|small number/i);
});

test('direct link, Esc without clicking, then state is clean', async ({ page }) => {
  await page.goto('/work/ready-rebound');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle(/AI Strategy & Organizational Design/);
  expect(await page.evaluate(() => document.documentElement.classList.contains('locked'))).toBe(false);
  await page.locator('#co-ready-rebound a.more').click();
  await expect(dialog(page)).toBeVisible();
});

test('double close stays on site', async ({ page }) => {
  await page.goto('/');
  await page.locator('#sys-univise').click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
});

test('opening a pop-up focuses its title, and closing restores focus to the trigger', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('#sys-univise');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(trigger).toBeFocused();
});
