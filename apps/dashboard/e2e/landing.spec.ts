import { test, expect } from '@playwright/test';

/**
 * Landing Page E2E Tests — "Vitrin Duman Testi"
 *
 * Landing page bileşenleri SSR kapalı (dynamic import, ssr: false).
 * Bu yüzden domcontentloaded yetmez — JavaScript'in bileşenleri
 * render etmesini beklemeliyiz.
 *
 * CTA: "Explore the Network" (Link bileşeni, /en/truth'a yönlendirir)
 * Trust badge: "Open Source · AGPL-3.0"
 */

test.setTimeout(90_000);

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Go to landing and wait for JS to hydrate dynamic imports
    await page.goto('/en/landing', { timeout: 60_000 });
    // Wait for network to settle (dynamic imports loading)
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
  });

  test('should load and display hero content', async ({ page }) => {
    // Hero uses i18n: landing.hero.title = "See What Power Hides"
    // Wait for any meaningful text from hero section
    await expect(
      page.getByText(/see what|power hides|gücün sakladığını/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('should display Explore the Network CTA', async ({ page }) => {
    // Multiple "Explore the Network" links exist on page — use first()
    const exploreCTA = page.getByRole('link', { name: 'Explore the Network', exact: true });
    await expect(exploreCTA).toBeVisible({ timeout: 30_000 });
  });

  test('should navigate to truth page when CTA clicked', async ({ page }) => {
    const exploreCTA = page.getByRole('link', { name: 'Explore the Network', exact: true });
    await expect(exploreCTA).toBeVisible({ timeout: 30_000 });
    await exploreCTA.click();

    await page.waitForURL(/\/(en|tr)\/truth/, { timeout: 60_000 });
    expect(page.url()).toMatch(/\/(en|tr)\/truth/);
  });

  test('should display trust badges', async ({ page }) => {
    // Badge text: "Open Source · AGPL-3.0" (from landing.hero.badgeOpenSource)
    await expect(
      page.getByText(/AGPL|open source|açık kaynak/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('should have footer', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1_000);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 10_000 });
  });

  test('should be responsive — no horizontal overflow', async ({ page }) => {
    await page.waitForTimeout(2_000);
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
