import { expect, test, type Page } from '@playwright/test';

async function openUnlocked(page: Page, path: string) {
  await page.addInitScript(() => {
    sessionStorage.setItem('fm-tech-pay-unlocked', '1');
  });
  await page.goto(path);
}

test.describe('public guides', () => {
  test('index lists live guides and header has Guides', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: 'Helpful resources' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Stairlift Cost Guide/ })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Guides' })).toBeVisible();
    await expect(page.getByText('Straight Stairlift Installation')).toHaveCount(0);
  });

  test('live article has SEO tags and draft slug is 404', async ({ page, request }) => {
    await page.goto('/resources/stairlift-cost-guide');
    await expect(page.getByRole('heading', { name: 'Stairlift Cost Guide for Upstate New York' })).toBeVisible();
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/resources\/stairlift-cost-guide\/?$/);

    const draft = await request.get('/resources/straight-stairlift-install-what-to-expect');
    expect(draft.status()).toBe(404);
  });

  test('sitemap includes live guides and omits drafts and admin', async ({ request }) => {
    const sitemap = await request.get('/sitemap-0.xml');
    const xml = await sitemap.text();
    expect(xml).toContain('/resources/stairlift-cost-guide');
    expect(xml).not.toContain('straight-stairlift-install-what-to-expect');
    expect(xml).not.toContain('/admin/blog');
  });
});

test.describe('admin blog', () => {
  test('lists live and repo draft posts', async ({ page }) => {
    await openUnlocked(page, '/admin/blog');
    await expect(page.getByRole('heading', { name: 'Blog & guides' })).toBeVisible();
    await expect(page.getByText('Live').first()).toBeVisible();
    await expect(page.getByText('Draft').first()).toBeVisible();
    await expect(page.getByText('Straight Stairlift Installation')).toBeVisible();
  });

  test('PIN preview shows a repo draft that is not public', async ({ page }) => {
    await openUnlocked(page, '/admin/blog/straight-stairlift-install-what-to-expect');
    await expect(page.getByText('Repo draft')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Straight Stairlift Installation: What to Expect' })).toBeVisible();
  });

  test('device draft can be saved and listed', async ({ page }) => {
    await openUnlocked(page, '/admin/blog/edit');
    await page.locator('#draft-headline').fill('E2E device draft');
    await page.locator('#draft-body').fill('## Hello\n\nFrom the admin.');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.locator('#draft-status')).toContainText(/Saved on this device/);
    await page.goto('/admin/blog');
    await expect(page.getByText('E2E device draft')).toBeVisible();
    await expect(page.getByText('Device draft', { exact: true })).toBeVisible();
  });
});
