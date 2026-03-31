'use client';

/**
 * AUTH CALLBACK PAGE — PKCE Code Exchange
 * Sprint Auth
 *
 * Bu sayfa Magic Link veya OAuth callback'i işler.
 * Supabase PKCE client detectSessionInUrl: true ile code'u otomatik algılar.
 * Biz sadece session oluşmasını bekliyoruz.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient } from '@/lib/supabaseAuth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const authClient = getAuthClient();
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Supabase error in URL
        if (errorParam) {
          console.error('[auth/callback] Supabase error:', errorParam, errorDescription);
          setStatus('error');
          setErrorMsg(errorDescription || errorParam);
          setTimeout(() => router.push('/en/auth'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setErrorMsg('Doğrulama kodu bulunamadı');
          setTimeout(() => router.push('/en/auth'), 3000);
          return;
        }

        // PKCE code exchange
        console.log('[auth/callback] Exchanging code for session...');
        const { data, error } = await authClient.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[auth/callback] Exchange error:', error.message, error);
          setStatus('error');
          setErrorMsg(error.message);
          setTimeout(() => router.push('/en/auth'), 3000);
          return;
        }

        if (data?.session) {
          console.log('[auth/callback] Session created successfully');
          setStatus('success');

          // URL'den auth parametrelerini temizle
          window.history.replaceState({}, '', window.location.pathname);

          // Truth sayfasına yönlendir
          setTimeout(() => router.push('/en/truth'), 800);
        } else {
          // Session oluşmadı ama hata da yok — bekle
          console.warn('[auth/callback] No session returned, checking auth state...');

          // onAuthStateChange'in tetiklenmesini bekle
          const { data: { session } } = await authClient.auth.getSession();
          if (session) {
            setStatus('success');
            setTimeout(() => router.push('/en/truth'), 800);
          } else {
            setStatus('error');
            setErrorMsg('Oturum oluşturulamadı. Lütfen tekrar deneyin.');
            setTimeout(() => router.push('/en/auth'), 3000);
          }
        }
      } catch (err: any) {
        // AbortError from Supabase Web Locks API — happens during page navigation
        // Not a real error, just a race condition with locks
        if (err?.name === 'AbortError' || err?.message?.includes('signal is aborted')) {
          console.warn('[auth/callback] AbortError (Web Locks) — retrying session check...');
          // Wait a moment and check if session was actually created
          await new Promise(r => setTimeout(r, 1000));
          try {
            const retryClient = getAuthClient();
            const { data: { session } } = await retryClient.auth.getSession();
            if (session) {
              setStatus('success');
              setTimeout(() => router.push('/en/truth'), 800);
              return;
            }
          } catch {
            // Retry also failed
          }
        }

        console.error('[auth/callback] Unexpected error:', err);
        setStatus('error');
        setErrorMsg('Doğrulama sırasında hata oluştu. Lütfen yeni link isteyin.');
        setTimeout(() => router.push('/en/auth'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030303',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
    }}>
      {status === 'processing' && (
        <>
          <div style={{
            width: '24px', height: '24px',
            border: '2px solid rgba(220,38,38,0.3)',
            borderTopColor: '#dc2626',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#737373', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            Doğrulanıyor...
          </p>
        </>
      )}

      {status === 'success' && (
        <p style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          ✓ Giriş başarılı — yönlendiriliyorsunuz...
        </p>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            ✗ Doğrulama başarısız
          </p>
          {errorMsg && (
            <p style={{ color: '#525252', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '400px' }}>
              {errorMsg}
            </p>
          )}
          <p style={{ color: '#525252', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
