'use client';

/**
 * AUTH PAGE — PKCE Magic Link Only
 * Sprint Auth — Sıfır Risk Felsefesi
 *
 * SECURITY DECISIONS:
 * - Şifreli giriş/kayıt KALDIRILDI — credential stuffing, brute force riski
 * - Sadece Magic Link (PKCE) + Google OAuth — phishing-resistant
 * - Anonim devam seçeneği — sadece okuma yetkisi
 * - ProtonMail, Tutanota desteklenir — gerçek isim zorunlu değil
 *
 * ARAŞTIRMA REF: Saldırı Ansiklopedisi.md — Credential Stuffing, Brute Force
 * ARAŞTIRMA REF: Güvenli Gazeteci Platformu Auth Tasarımı.md — Bölüm A
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { sendMagicLink, loginWithGoogle, initAnonymousSession, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) { setError('Email gerekli'); return; }
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Geçerli bir email adresi girin');
      return;
    }

    const result = await sendMagicLink(trimmed);
    if (result.success) {
      setMagicLinkSent(true);
    } else {
      setError(result.error || 'Magic link gönderilemedi');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error || 'Google girişi başarısız');
    }
  };

  const handleAnonymous = async () => {
    await initAnonymousSession();
    router.push('/truth');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '4px',
    color: '#e5e5e5',
    fontSize: '0.95rem',
    fontFamily: 'system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const buttonPrimary: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    fontWeight: 600,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'background-color 0.2s',
  };

  const buttonSecondary: React.CSSProperties = {
    ...buttonPrimary,
    backgroundColor: 'transparent',
    border: '1px solid rgba(220,38,38,0.4)',
    color: '#e5e5e5',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030303',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(220,38,38,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            color: 'rgba(220,38,38,0.5)',
            marginBottom: '0.5rem',
          }}>
            ▓▓▓ PROJECT TRUTH ▓▓▓
          </div>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.8rem',
            fontWeight: 400,
            color: '#e5e5e5',
            margin: 0,
          }}>
            Giriş Yap
          </h1>
          <p style={{
            color: '#737373',
            fontSize: '0.85rem',
            marginTop: '0.5rem',
            lineHeight: 1.5,
          }}>
            Email adresinize şifresiz giriş linki gönderilecek.
          </p>
        </div>

        {/* Auth Card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '2rem',
        }}>
          <AnimatePresence mode="wait">
            {magicLinkSent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '1rem 0' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
                <h2 style={{ color: '#e5e5e5', fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Link Gönderildi!
                </h2>
                <p style={{ color: '#a3a3a3', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <strong style={{ color: '#dc2626' }}>{email}</strong> adresine giriş linki gönderildi.
                  Email kutunuzu kontrol edin ve linke tıklayın.
                </p>
                <p style={{ color: '#525252', fontSize: '0.75rem', marginTop: '1rem' }}>
                  Spam klasörünü de kontrol etmeyi unutmayın.
                </p>
                <button
                  onClick={() => { setMagicLinkSent(false); setEmail(''); }}
                  style={{ ...buttonSecondary, marginTop: '1.5rem' }}
                >
                  Farklı email dene
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Magic Link Form */}
                <form onSubmit={handleMagicLink}>
                  <div style={{ marginBottom: '1rem' }}>
                    <input
                      type="email"
                      placeholder="Email adresi (ProtonMail, Tutanota vb. kabul edilir)"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(220,38,38,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <button type="submit" style={buttonPrimary} disabled={isLoading}>
                    {isLoading ? 'Gönderiliyor...' : 'Giriş Linki Gönder'}
                  </button>
                </form>

                {/* Error */}
                {error && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: '4px',
                    color: '#fca5a5',
                    fontSize: '0.8rem',
                  }}>
                    {error}
                  </div>
                )}

                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0',
                }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ color: '#525252', fontSize: '0.75rem', fontFamily: 'monospace' }}>VEYA</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Google */}
                <button onClick={handleGoogle} style={{ ...buttonSecondary, marginBottom: '0.75rem' }}>
                  Google ile Giriş
                </button>

                {/* Anonymous */}
                <button
                  onClick={handleAnonymous}
                  style={{
                    ...buttonSecondary,
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#737373',
                    fontSize: '0.8rem',
                  }}
                >
                  Anonim Devam Et (sadece okuma)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security info */}
        <div style={{
          marginTop: '1.5rem',
          padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '4px',
          backgroundColor: 'rgba(255,255,255,0.01)',
        }}>
          <p style={{
            color: '#525252',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            lineHeight: 1.6,
            margin: 0,
          }}>
            🔒 Şifresiz giriş — PKCE korumalı Magic Link kullanılır.
            <br />
            Gerçek isim zorunlu değildir. ProtonMail ve anonim email servisleri kabul edilir.
            <br />
            Platform kullanıcı verilerini üçüncü taraflarla paylaşmaz.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
