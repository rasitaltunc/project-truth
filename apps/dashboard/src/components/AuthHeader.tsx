'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getRoleInfo } from '@/lib/roles';
import Link from 'next/link';
import { useLocale } from 'next-intl';

/**
 * Compact auth header bar — sits in top-right of truth page.
 * Shows: role badge + display name + login/profile link
 * Minimal footprint — doesn't interfere with 3D scene.
 */
export default function AuthHeader() {
  const { user, isAuthenticated, isAnonymous, isLoading } = useAuth();
  const locale = useLocale();

  if (isLoading) return null;

  const trustLevel = user?.trust_level ?? 0;
  const roleInfo = getRoleInfo(trustLevel, locale === 'tr' ? 'tr' : 'en');

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'auto',
      }}
    >
      {isAuthenticated && !isAnonymous ? (
        // ── Logged in ──
        <Link
          href={`/${locale}/profile`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: `1px solid ${roleInfo.color}33`,
            borderRadius: '4px',
            textDecoration: 'none',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>{roleInfo.icon}</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: roleInfo.color,
              letterSpacing: '0.05em',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.display_name || user?.anonymous_id || roleInfo.name}
          </span>
        </Link>
      ) : (
        // ── Not logged in ──
        <Link
          href={`/${locale}/auth`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'rgba(220,38,38,0.15)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '4px',
            textDecoration: 'none',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: '#dc2626',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Giriş Yap
          </span>
        </Link>
      )}
    </div>
  );
}
