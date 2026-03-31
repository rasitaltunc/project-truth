'use client';

/**
 * Global Error Boundary — Son Savunma Hattı
 *
 * Eğer uygulamanın herhangi bir yerinde yakalanmamış bir hata olursa,
 * kullanıcı bu sayfayı görür. Sentry hatayı otomatik kaydeder.
 *
 * Bu, binanın yangın merdiveni gibi — asla kullanılmaması ideal,
 * ama olduğunda hayat kurtarır.
 */
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry'ye hatayı bildir
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        background: '#030303',
        color: '#e5e5e5',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        margin: 0,
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{
            color: '#dc2626',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}>
            ⚠ SYSTEM ERROR
          </h1>

          <p style={{
            color: '#a3a3a3',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}>
            Something went wrong. The error has been automatically reported
            to our team. You can try again or return to the main page.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >
              TRY AGAIN
            </button>

            <a
              href="/en/landing"
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #dc2626',
                padding: '0.75rem 1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              RETURN HOME
            </a>
          </div>

          {error.digest && (
            <p style={{
              color: '#525252',
              fontSize: '0.75rem',
              marginTop: '2rem',
              fontFamily: 'monospace',
            }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
