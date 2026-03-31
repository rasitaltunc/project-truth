/**
 * Playwright Global Setup
 *
 * MSW server'ı burada başlatmıyoruz — çünkü MSW browser-level
 * interception yapar, Playwright'ın kendi route interception'ı ile
 * karışabilir. Bunun yerine, MSW handler'larını doğrudan
 * Playwright'ın page.route() API'si ile kullanıyoruz.
 *
 * Bu dosya gelecekte aşağıdaki amaçlarla kullanılabilir:
 * - Veritabanı seed data yükleme
 * - Test kullanıcısı oluşturma
 * - Çevre değişkeni doğrulama
 */
export default async function globalSetup() {
  // Verify environment
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  console.log(`[E2E Setup] Base URL: ${baseURL}`);
  console.log(`[E2E Setup] E2E tests starting...`);
}
