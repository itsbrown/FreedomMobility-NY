import { expect, test, type Page } from '@playwright/test';

async function openUnlocked(page: Page, path: string) {
  await page.addInitScript(() => {
    sessionStorage.setItem('fm-tech-pay-unlocked', '1');
  });
  await page.goto(path);
}

test.describe('public site is unchanged', () => {
  test('home still markets the business, not the shop tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Contact Us' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Schedule Free Consultation' }).first()).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Rates' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Weekly pay form' })).toHaveCount(0);
  });

  test('contact form is still present', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('internal tools are hidden from search surfaces', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain('Disallow: /admin');
    expect(robotsText).toContain('Disallow: /tech/');

    const sitemap = await request.get('/sitemap-0.xml');
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/tech/');
  });
});

test.describe('admin hub and rates', () => {
  test('admin dashboard links to pay form and rates', async ({ page }) => {
    await openUnlocked(page, '/admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.getByRole('heading', { name: 'Shop admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Weekly pay form/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pay rates/ }).first()).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Rates' })).toBeVisible();
  });

  test('admin can edit a rate and the pay form picks it up', async ({ page }) => {
    await openUnlocked(page, '/admin/rates');
    await expect(page.getByRole('heading', { name: 'Pay rates' })).toBeVisible();

    const firstTask = page.locator('[data-task-row]').first();
    await expect(firstTask).toBeVisible();
    await firstTask.locator('[data-field="name"]').fill('E2E stairlift install');
    await firstTask.locator('[data-field="rate"]').fill('199');

    await page.getByRole('button', { name: 'Save rates' }).click();
    await expect(page.locator('#rates-status')).toContainText(/Saved/);

    await page.getByRole('navigation').getByRole('link', { name: 'Pay form' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly pay form' })).toBeVisible();
    await expect(page.getByText('E2E stairlift install')).toBeVisible();
    await expect(page.getByText('$199.00')).toBeVisible();

    const row = page.locator('#install-catalog').getByText('E2E stairlift install').locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await row.getByRole('button', { name: /Increase/ }).click();
    await expect(page.locator('#total-install')).toHaveText('$199.00');
    await expect(page.locator('#total-grand')).toHaveText('$199.00');
  });

  test('unconfirming rates shows the pay form draft banner', async ({ page }) => {
    await openUnlocked(page, '/admin/rates');
    await page.locator('#rate-confirmed').uncheck();
    await page.getByRole('button', { name: 'Save rates' }).click();
    await expect(page.locator('#rates-status')).toContainText(/DRAFT RATES/);
    await page.getByRole('link', { name: 'Open pay form' }).click();
    await expect(page.locator('#draft-rates-banner')).toBeVisible();
  });
});

test.describe('weekly pay form', () => {
  test('validates empty submit and computes a service line', async ({ page }) => {
    await openUnlocked(page, '/tech/pay');
    await expect(page.getByRole('heading', { name: 'Weekly pay form' })).toBeVisible();
    await expect(page.locator('#draft-rates-banner')).toBeHidden();

    await page.getByRole('button', { name: 'Submit timesheet' }).click();
    await expect(page.locator('#form-status')).toContainText('Technician name and week ending are required');

    await page.locator('#technician-name').fill('Test Tech');
    const serviceRow = page.locator('#service-catalog').getByText('Service / repair call').locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await serviceRow.getByRole('button', { name: /Increase/ }).click();
    await expect(page.locator('#total-mileage')).toHaveText('$65.00');
    await expect(page.locator('#total-grand')).toHaveText('$65.00');
  });

  test('manual trip miles become billable at the threshold', async ({ page }) => {
    await openUnlocked(page, '/tech/pay');
    await page.locator('#trips-list input[data-field="calculatedMiles"]').fill('80');
    await page.locator('#trips-list input[data-field="calculatedMiles"]').blur();
    await expect(page.locator('#trips-list').getByText('Billable')).toBeVisible();
    await expect(page.locator('#billable-miles')).toHaveText('80.0');
    await expect(page.locator('#mileage-pay')).toHaveText('$53.60');
  });

  test('submit posts the timesheet to Formspree with a recaptcha token', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'grecaptcha', {
        configurable: true,
        get() {
          return {
            ready(cb: () => void) { cb(); },
            execute() { return Promise.resolve('test-recaptcha-token'); },
          };
        },
        set() { /* keep the stub if the real recaptcha script loads */ },
      });
    });

    let posted: Record<string, string> | undefined;
    await page.route('https://formspree.io/**', async (route) => {
      posted = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await openUnlocked(page, '/tech/pay');
    await page.locator('#technician-name').fill('Test Tech');
    const serviceRow = page.locator('#service-catalog').getByText('Service / repair call').locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await serviceRow.getByRole('button', { name: /Increase/ }).click();
    await page.getByRole('button', { name: 'Submit timesheet' }).click();
    await expect(page).toHaveURL(/\/tech\/success/);
    expect(posted).toBeTruthy();
    expect(posted!['g-recaptcha-response']).toBe('test-recaptcha-token');
    expect(posted!._subject).toMatch(/Weekly Pay Form - Test Tech/);
    expect(posted!.source).toBe('Website - Tech Pay Form');
  });
});
