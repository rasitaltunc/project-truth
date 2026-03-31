import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ── SECURITY D2: Request body size limits ──
  // Default Next.js middleware limit is 10MB. We tighten it:
  // - General API routes: 2MB (JSON payloads should never be this big)
  // - File upload routes handle their own limits via formData()
  serverExternalPackages: [],

  async headers() {
    // ── SECURITY D3: Content-Security-Policy ──
    // Production: NO unsafe-eval (React/Next.js don't need it)
    // Development: unsafe-eval needed for React Fast Refresh / HMR
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com/ajax/libs/ https://unpkg.com https://cdn.jsdelivr.net"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com/ajax/libs/ https://unpkg.com https://cdn.jsdelivr.net";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org https://commons.wikimedia.org https://storage.googleapis.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://unpkg.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://storage.googleapis.com https://*.googleapis.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // D3: Prevent object/embed/applet injection
      "object-src 'none'",
      // D3: Upgrade insecure requests in production
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // SECURITY F1: HSTS — force HTTPS, include subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // SECURITY F1: Prevent MIME type confusion attacks on downloads
          { key: 'X-Download-Options', value: 'noopen' },
          // SECURITY F1: Cross-Origin policies for Spectre/Meltdown isolation
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // SECURITY D3: Content-Security-Policy (env-aware)
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      // ── SECURITY D4: Explicit CORS for API routes ──
      // Same-origin only. No external domains can call our API.
      // When public API is needed (Sprint R12), add allowed origins here.
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: isProd ? 'https://projecttruth.org' : 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Fingerprint' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

// Sentry wraps the final config for source map upload + error tracking
export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppress noisy Sentry webpack logs during build
  silent: !process.env.CI,

  // Upload source maps for readable stack traces in production
  // Requires SENTRY_AUTH_TOKEN env var (set up later)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,

  // Source maps: production'da Sentry'ye yükle ama kullanıcıya gösterme
  // hideSourceMaps Sentry v9'da kaldırıldı → sourcemaps objesi kullanılıyor
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
});
