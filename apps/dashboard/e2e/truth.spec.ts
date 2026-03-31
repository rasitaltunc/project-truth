import { test, expect } from '@playwright/test';

/**
 * Truth Page E2E Tests — "Soruşturma Odası Duman Testi"
 *
 * Truth sayfası ağır bileşenler yüklüyor (Three.js, R3F, Drei).
 *
 * Bilinen davranışlar:
 * - LensSidebar: left: -200px ile başlıyor (gizli), toggle butonuyla açılır
 * - RESET butonu: Metin yok, sadece RefreshCw ikonu
 * - Cinematic opening: İlk ziyarette overlay gösterebilir
 */

test.setTimeout(90_000);

test.describe('Truth Investigation Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/truth', { timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 });
  });

  test('should load and display PROJECT TRUTH heading', async ({ page }) => {
    const heading = page.locator('h1').filter({ hasText: /PROJECT TRUTH/i });
    await expect(heading).toBeVisible({ timeout: 30_000 });
  });

  test('should display connection status badge', async ({ page }) => {
    // LIVE or OFFLINE text
    const statusBadge = page.getByText(/LIVE|OFFLINE/);
    await expect(statusBadge.first()).toBeVisible({ timeout: 30_000 });
  });

  test('should have lens sidebar in DOM', async ({ page }) => {
    // Sidebar starts hidden (left: -200px) but element IS in DOM
    const sidebar = page.locator('[data-tour="lens-sidebar"]');
    // Use toBeAttached instead of toBeVisible — element exists but may be off-screen
    await expect(sidebar).toBeAttached({ timeout: 30_000 });
  });

  test('should render toolbar area', async ({ page }) => {
    const toolbar = page.locator('[data-tour="toolbar-area"]');
    await expect(toolbar).toBeVisible({ timeout: 30_000 });
  });

  test('should have EVIDENCE MAP label', async ({ page }) => {
    const label = page.getByText(/EVIDENCE MAP|KANIT HARİTASI/i);
    await expect(label.first()).toBeVisible({ timeout: 30_000 });
  });

  test('should have action buttons with text labels', async ({ page }) => {
    // At least one labeled action button should be visible
    // "ANALYZE DOC" or "FOLLOW THE MONEY" or "INVESTIGATE" etc.
    const anyActionBtn = page.getByText(/ANALYZE DOC|FOLLOW THE MONEY|INVESTIGATE|SPOTLIGHT/i);
    await expect(anyActionBtn.first()).toBeVisible({ timeout: 30_000 });
  });
});
