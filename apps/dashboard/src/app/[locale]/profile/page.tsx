'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { getRoleInfo } from '@/lib/roles';
import { getReputationLevel } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const { isReady, isAllowed, user } = useRequireAuth();
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!isReady) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#525252', fontFamily: 'monospace', fontSize: '0.9rem' }}>Yükleniyor...</div>
      </div>
    );
  }

  if (!isAllowed || !user) return null; // useRequireAuth handles redirect

  const roleInfo = getRoleInfo(user.trust_level);
  const repInfo = getReputationLevel(user.reputation_score);

  // Account age
  const createdAt = new Date(user.created_at);
  const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    color: '#525252',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.25rem',
  };

  const valueStyle: React.CSSProperties = {
    color: '#e5e5e5',
    fontSize: '1rem',
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only navigate back if clicking the background itself, not the card
    if (e.target === e.currentTarget) {
      router.back();
    }
  };

  return (
    <div
      onClick={handleBackgroundClick}
      style={{
        minHeight: '100vh',
        backgroundColor: '#030303',
        padding: 'clamp(1rem, 4vw, 3rem)',
        cursor: 'pointer',
      }}
    >
      {/* Background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 20%, rgba(220,38,38,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.3em',
            color: 'rgba(220,38,38,0.4)',
            marginBottom: '0.5rem',
          }}>
            ▓ PROFİL ▓
          </div>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.6rem',
            fontWeight: 400,
            color: '#e5e5e5',
            margin: 0,
          }}>
            {user.display_name || user.anonymous_id}
          </h1>
        </div>

        {/* Role & Reputation */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Role */}
            <div>
              <div style={labelStyle}>Rol</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{roleInfo.icon}</span>
                <span style={{ ...valueStyle, color: roleInfo.color, fontWeight: 500 }}>
                  {roleInfo.name}
                </span>
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {roleInfo.description}
              </div>
            </div>

            {/* Reputation */}
            <div>
              <div style={labelStyle}>İtibar</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{repInfo.icon}</span>
                <span style={{ ...valueStyle, color: repInfo.color, fontWeight: 500 }}>
                  {user.reputation_score} puan
                </span>
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Seviye: {repInfo.level}
              </div>
            </div>

            {/* Vote Weight */}
            <div>
              <div style={labelStyle}>Vote Weight</div>
              <div style={valueStyle}>
                {roleInfo.voteWeight}x
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Account age: {ageDays} days
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={cardStyle}>
          <div style={labelStyle}>İstatistikler</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
            <div>
              <div style={{ color: '#e5e5e5', fontSize: '1.4rem', fontWeight: 500 }}>
                {user.contributions_count}
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Toplam Katkı</div>
            </div>
            <div>
              <div style={{ color: '#22c55e', fontSize: '1.4rem', fontWeight: 500 }}>
                {user.verified_contributions}
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Doğrulanmış</div>
            </div>
            <div>
              <div style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: 500 }}>
                {user.false_contributions}
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Rejected</div>
            </div>
            <div>
              <div style={{ color: '#f59e0b', fontSize: '1.4rem', fontWeight: 500 }}>
                {user.contributions_count > 0
                  ? Math.round((user.verified_contributions / user.contributions_count) * 100)
                  : 0}%
              </div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Doğruluk Oranı</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div style={cardStyle}>
          <div style={labelStyle}>Hesap Bilgileri</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Anonim ID</div>
              <div style={{ color: '#737373', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {user.anonymous_id}
              </div>
            </div>
            <div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Kayıt Tarihi</div>
              <div style={{ color: '#737373', fontSize: '0.85rem' }}>
                {createdAt.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <div style={{ color: '#525252', fontSize: '0.75rem' }}>Confidence Level</div>
              <div style={{ color: '#737373', fontSize: '0.85rem' }}>
                Trust Level {user.trust_level} / 4
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => logout()}
            style={{
              padding: '10px 24px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '4px',
              color: '#dc2626',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Çıkış Yap
          </button>
        </div>

        {/* Privacy notice */}
        <p style={{
          color: '#2a2a2a',
          fontSize: '0.65rem',
          marginTop: '3rem',
          fontFamily: 'monospace',
          lineHeight: 1.5,
        }}>
          Bu sayfa sadece size görünür. Profil bilgileriniz diğer kullanıcılarla paylaşılmaz.
          Platform kullanıcı verilerini üçüncü taraflarla paylaşmaz.
        </p>
      </motion.div>
    </div>
  );
}
