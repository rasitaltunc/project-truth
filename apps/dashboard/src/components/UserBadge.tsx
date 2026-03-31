// ============================================
// TRUTH PROTOCOL - User Badge Component v2
// Sprint 6A: badgeStore entegrasyonu
// ============================================

'use client';

import React, { useState } from 'react';
import { useBadgeStore, getBadgeTier } from '@/store/badgeStore';
import BadgeDisplay from './BadgeDisplay';

// ============================================
// MAIN BADGE COMPONENT
// ============================================

interface UserBadgeProps {
    onProfileClick?: () => void;
}

export function UserBadge({ onProfileClick }: UserBadgeProps) {
    const { userFingerprint, globalBadge, reputation, isLoadingBadge } = useBadgeStore();
    const [hovered, setHovered] = useState(false);

    const tierId = globalBadge?.badge_tier || 'anonymous';
    const tierInfo = getBadgeTier(tierId);
    const totalScore = reputation?.score ?? 0;

    const shortFp = userFingerprint
        ? userFingerprint.substring(0, 8) + '...'
        : 'ANON';

    const tierColor = tierInfo?.color || '#6b7280';

    const handleClick = () => {
        if (onProfileClick) onProfileClick();
    };

    if (isLoadingBadge) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #1f1f1f',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}>
                <div style={{
                    width: '16px', height: '16px',
                    border: '1px solid #333',
                    borderTopColor: '#666',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.05em' }}>
                    YÜKLENIYOR...
                </span>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                title="Profili görüntüle"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: hovered ? '#0f0f0f' : '#0a0a0a',
                    border: `1px solid ${hovered ? tierColor : '#2a2a2a'}`,
                    boxShadow: hovered ? `0 0 12px ${tierColor}30` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    outline: 'none',
                    userSelect: 'none',
                }}
            >
                {/* Badge Tier Icon */}
                <BadgeDisplay
                    tierId={tierId}
                    size="xs"
                    showTooltip={false}
                    showLabel={false}
                    showStats={false}
                />

                {/* Divider */}
                <div style={{ width: '1px', height: '14px', backgroundColor: '#2a2a2a', flexShrink: 0 }} />

                {/* Fingerprint */}
                <span style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                }}>
                    {shortFp}
                </span>

                {/* Divider */}
                <div style={{ width: '1px', height: '14px', backgroundColor: '#2a2a2a', flexShrink: 0 }} />

                {/* Reputation Score */}
                <span style={{
                    fontSize: '10px',
                    color: hovered ? tierColor : '#999',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    transition: 'color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                }}>
                    ⚡ {totalScore}
                </span>

                {/* Live dot */}
                <div style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    flexShrink: 0,
                }} />
            </button>
        </>
    );
}

// ============================================
// COMPACT BADGE (for inline use, e.g. chat messages)
// ============================================

export function CompactUserBadge({
    fingerprint,
    tierId = 'anonymous',
    showTooltip = true,
}: {
    fingerprint: string;
    tierId?: string;
    showTooltip?: boolean;
}) {
    const tierInfo = getBadgeTier(tierId as any);
    const shortFp = fingerprint.length > 12
        ? fingerprint.substring(0, 12) + '...'
        : fingerprint;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative',
        }}>
            <BadgeDisplay
                tierId={tierId as any}
                size="xs"
                showTooltip={showTooltip}
                showLabel={false}
                showStats={false}
            />
            <code style={{
                fontSize: '10px',
                color: tierInfo?.color || '#6b7280',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 500,
                letterSpacing: '0.05em',
            }}>
                {shortFp}
            </code>
        </div>
    );
}

// ============================================
// TRUST LEVEL BADGE (standalone — tier icon only)
// ============================================

export function TrustLevelBadge({
    tierId = 'anonymous',
    size = 'md',
}: {
    tierId?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
    return (
        <BadgeDisplay
            tierId={tierId as any}
            size={size}
            showTooltip={true}
            showLabel={false}
            showStats={false}
        />
    );
}

export default UserBadge;
