/**
 * Sentry Server Configuration — Sunucu Tarafı
 *
 * Bu dosya API route'larında ve SSR sırasında çalışır.
 * Server-side hatalar: Supabase bağlantı hataları,
 * Groq API timeout'ları, Document AI hataları vs.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  environment: process.env.NODE_ENV || 'development',

  // Sunucu tarafında hataların hepsini yakala
  sampleRate: 1.0,

  // Performans: sunucu isteklerinin %20'sini izle
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  debug: false,

  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DSN,

  // Server-side sensitive data filtering
  beforeSend(event) {
    // Remove API keys from error messages
    if (event.message) {
      event.message = event.message
        .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-[REDACTED]')
        .replace(/gsk_[a-zA-Z0-9]{20,}/g, 'gsk_[REDACTED]')
        .replace(/sbp_[a-zA-Z0-9]{20,}/g, 'sbp_[REDACTED]');
    }

    // Never send environment variables
    if (event.extra) {
      delete (event.extra as Record<string, unknown>).env;
    }

    return event;
  },

  // Server-specific ignores
  ignoreErrors: [
    // Groq rate limit (handled gracefully in app)
    'Groq rate limit',
    '429 Too Many Requests',
    // Supabase connection interruption (auto-reconnects)
    'FetchError: request to https://*.supabase.co',
  ],
});
