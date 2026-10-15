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
  await expect(page).toHaveTitle('Aaryush Gupta');
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
  await expect(page).toHaveTitle('Aaryush Gupta');
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

// ---- Task 41: history inside the pop-up, the Android Back request, scroll lock ----
const SHOT = (name: string) => `C:/Users/aaryu/code/personal/portfolio-explorations/shots/${name}.png`;
// page.goBack() is a no-op for same-document entries in Playwright's Firefox; history.back() is what the Back button runs.
const back = (page: import('@playwright/test').Page) => page.evaluate(() => history.back());

test('company → system → Back returns to the company, Back again closes on the homepage', async ({ page }) => {
  await page.goto('/');
  await page.locator('#co-cylerity a.more').click();
  await dialog(page).getByRole('link', { name: /Engineering intake/ }).click();
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  await back(page);
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Cylerity');
  await back(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('direct load of a system → open its company → Back → system, Back → closed on the homepage', async ({ page }) => {
  await page.goto('/work/cylerity-intake');
  await expect(dialog(page)).toBeVisible();
  await dialog(page).locator('[data-popup-back]').click();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await back(page);
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Engineering intake');
  await expect(dialog(page)).toBeVisible();
  await back(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('a close request that is not Esc (the Android Back) steps back one view; from the first view it closes', async ({ page }) => {
  await page.goto('/');
  await page.locator('#co-cylerity a.more').click();
  await dialog(page).getByRole('link', { name: /Engineering intake/ }).click();
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  // Chrome on Android fires `cancel` on the open modal dialog when the hardware Back is pressed, without a key event.
  const cancel = () => dialog(page).evaluate((d) => d.dispatchEvent(new Event('cancel', { cancelable: true })));
  await cancel();
  await expect(page).toHaveURL(/\/work\/cylerity$/);
  await expect(dialog(page)).toBeVisible();
  await cancel();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('Esc still closes the whole pop-up from a nested view', async ({ page }) => {
  await page.goto('/');
  await page.locator('#co-cylerity a.more').click();
  await dialog(page).getByRole('link', { name: /Engineering intake/ }).click();
  await expect(page).toHaveURL(/\/work\/cylerity-intake$/);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

test('reloading /work/<slug> adds no history entry and Back still leaves for the homepage', async ({ page }) => {
  await page.goto('/work/ready-rebound');
  await expect(dialog(page)).toBeVisible();
  const before = await page.evaluate(() => history.length);
  await page.reload();
  await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(before);
  await back(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog(page)).toBeHidden();
});

test('after a direct load, closing puts focus on the matching card', async ({ page }) => {
  await page.goto('/work/univise');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('#sys-univise')).toBeFocused();
  await page.goto('/work/ready-rebound');
  await page.keyboard.press('Escape');
  await expect(page.locator('#co-ready-rebound a.more')).toBeFocused();
});

test('the close link is named with its shortcut', async ({ page }) => {
  await page.goto('/work/univise');
  await expect(dialog(page).getByRole('link', { name: 'Close (Esc)' })).toBeAttached();
});

test('the page behind is locked and inert while any pop-up is open, Earlier work cards included', async ({ page }) => {
  for (const open of [() => page.locator('#sys-univise').click(), () => page.locator('#co-cylerity a.more').click()]) {
    await page.goto('/');
    await open();
    await expect(dialog(page)).toBeVisible();
    expect(await dialog(page).evaluate((d) => d.matches(':modal'))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    expect(await page.locator('main').evaluate((m) => m.hasAttribute('inert'))).toBe(true);
    expect(await page.locator('header#top').evaluate((m) => m.hasAttribute('inert'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    expect(await page.locator('main').evaluate((m) => m.hasAttribute('inert'))).toBe(false);
  }
});

test('a direct load of an Earlier work pop-up is locked and inert too', async ({ page }) => {
  await page.goto('/work/smartbenai');
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate((d) => d.matches(':modal'))).toBe(true);
  expect(await page.locator('main').evaluate((m) => m.hasAttribute('inert'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.classList.contains('locked'))).toBe(true);
});

test('phones: scrolling inside a pop-up never moves the page behind, and the sheet stays on top', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
  const y0 = await page.evaluate(() => window.scrollY);
  expect(y0).toBeGreaterThan(1000);
  await page.locator('#co-cylerity a.more').evaluate((el) => (el as HTMLElement).click());
  await expect(dialog(page)).toBeVisible();
  const topAtCentre = () => page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return { inside: !!el?.closest('dialog#popup'), scrollY: window.scrollY };
  });
  expect(await topAtCentre()).toEqual({ inside: true, scrollY: y0 });
  if (browserName !== 'webkit') { // (mobile WebKit has no mouse wheel)
    await page.mouse.move(206, 500);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 900); // to the end of the sheet and beyond, where scrolls chain
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -900); // and back past the top
    expect(await topAtCentre()).toEqual({ inside: true, scrollY: y0 });
  }
  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    for (const yDistance of [-1400, 1400, 1400, -2000]) {
      await cdp.send('Input.synthesizeScrollGesture', { x: 206, y: 500, yDistance, gestureSourceType: 'touch', speed: 1800 });
    }
    expect(await topAtCentre()).toEqual({ inside: true, scrollY: y0 });
  }
  if (process.env.T41_SHOTS) await page.screenshot({ path: SHOT('t41-popup-412') });
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(y0);
  await context.close();
});
