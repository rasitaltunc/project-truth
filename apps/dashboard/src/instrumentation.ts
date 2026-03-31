/**
 * Next.js Instrumentation Hook
 *
 * Bu dosya Next.js tarafından otomatik algılanır.
 * Sentry server/edge config'lerini uygun runtime'da başlatır.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
