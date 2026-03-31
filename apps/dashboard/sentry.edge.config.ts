/**
 * Sentry Edge Configuration — Middleware / Edge Runtime
 *
 * Bu dosya Next.js middleware'de (locale routing vb.) çalışır.
 * Edge runtime'da çalıştığı için daha hafif bir konfigürasyon.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  environment: process.env.NODE_ENV || 'development',

  sampleRate: 1.0,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,

  debug: false,
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DSN,
});
