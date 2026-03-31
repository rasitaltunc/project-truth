/**
 * Sentry Client Configuration — Tarayıcı Tarafı
 *
 * Bu dosya kullanıcının tarayıcısında çalışır.
 * JavaScript hataları, unhandled promise rejection'lar,
 * ve performans sorunlarını yakalar.
 *
 * Yangın alarm sistemi: kullanıcı bir hata alırsa,
 * biz uyurken bile Sentry bize haber verir.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // DSN = Sentry'ye bağlantı adresi. Hesap açılınca buraya yapıştır.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Ortam: development'ta daha az veri, production'da tam izleme
  environment: process.env.NODE_ENV || 'development',

  // Hangi hataların yüzdesini gönderelim (1.0 = %100)
  // Başlangıçta hepsini gönder, kullanıcı artınca düşür
  sampleRate: 1.0,

  // Performans izleme (sayfa yükleme süreleri, API çağrıları)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session replay — kullanıcının ne yaptığını video gibi izle
  // Hata anında son 30 saniyeyi kaydeder (gizlilik dostu — input'lar maskelenir)
  replaysSessionSampleRate: 0,    // Normal session'ları kaydetme
  replaysOnErrorSampleRate: 0.5,  // Hata olursa %50 şansla kaydet

  // Debug modunu sadece development'ta aç
  debug: false,

  // Development'ta Sentry'yi devre dışı bırak (konsol kirliliği önlenir)
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hassas veriyi filtrele — Sentry'ye asla şifre, token, fingerprint gönderme
  beforeSend(event) {
    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        // Remove auth tokens from URLs
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = breadcrumb.data.url
            .replace(/apikey=[^&]+/gi, 'apikey=[REDACTED]')
            .replace(/token=[^&]+/gi, 'token=[REDACTED]');
        }
        return breadcrumb;
      });
    }

    // Remove user fingerprint if present
    if (event.user) {
      delete (event.user as Record<string, unknown>).fingerprint;
    }

    return event;
  },

  // Gürültülü hataları filtrele
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'canvas.contentDocument',
    // Network errors (kullanıcının internet bağlantısı kesildi)
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // ResizeObserver (zararsız, çok sık oluyor)
    'ResizeObserver loop',
    // WebGL context lost (3D motor yeniden başlatılıyor)
    'WebGL context',
    'CONTEXT_LOST_WEBGL',
  ],

  integrations: [
    Sentry.replayIntegration({
      // Mask all text for privacy (kullanıcı verisi maskelenir)
      maskAllText: true,
      // Block all media (görsel/video kaydedilmez)
      blockAllMedia: true,
    }),
  ],
});
