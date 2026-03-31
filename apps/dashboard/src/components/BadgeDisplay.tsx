'use client';
// ============================================
// SPRINT 6A: BADGE DISPLAY COMPONENT
// Tier ikonu, renk, glow animasyonu
// ============================================

import React, { useState } from 'react';
import { BadgeTier, BadgeTierId, BADGE_TIERS, getBadgeTier } from '@/store/badgeStore';

interface BadgeDisplayProps {
  tierId: BadgeTierId;
  reputation?: number;
  accuracy?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showLabel?: boolean;
  showStats?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_CONFIG = {
  xs: { icon: 'text-sm', label: 'text-xs', container: 'gap-1', padding: 'px-1.5 py-0.5' },
  sm: { icon: 'text-base', label: 'text-xs', container: 'gap-1.5', padding: 'px-2 py-1' },
  md: { icon: 'text-xl', label: 'text-sm', container: 'gap-2', padding: 'px-3 py-1.5' },
  lg: { icon: 'text-3xl', label: 'text-base', container: 'gap-3', padding: 'px-4 py-2' },
};

// Tiers with animated glow (journalist + institutional)
const GLOWING_TIERS: BadgeTierId[] = ['journalist', 'institutional'];

export default function BadgeDisplay({
  tierId,
  reputation,
  accuracy,
  size = 'sm',
  showTooltip = true,
  showLabel = false,
  showStats = false,
  className = '',
  onClick,
}: BadgeDisplayProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tier = getBadgeTier(tierId);
  const sizeConf = SIZE_CONFIG[size];
  const isGlowing = GLOWING_TIERS.includes(tierId);

  const glowStyle = isGlowing
    ? { boxShadow: `0 0 8px ${tier.color}55, 0 0 16px ${tier.color}22` }
    : {};

  const handleClick = () => {
    if (onClick) onClick();
  };

  // Use <div> instead of <button> when no onClick — prevents nested <button> hydration errors
  const Tag = onClick ? 'button' : 'div';

  return (
    <div className={`relative inline-flex ${className}`}>
      <Tag
        onClick={handleClick}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        className={`
          inline-flex items-center ${sizeConf.container} ${sizeConf.padding}
          rounded border font-mono transition-all duration-200
          ${onClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
          ${isGlowing ? 'animate-pulse-slow' : ''}
        `}
        style={{
          borderColor: `${tier.color}66`,
          backgroundColor: `${tier.color}11`,
          color: tier.color,
          ...glowStyle,
        }}
        aria-label={`${tier.name_tr} rozeti`}
      >
        <span className={sizeConf.icon} role="img" aria-label={tier.name_en}>
          {tier.icon}
        </span>
        {showLabel && (
          <span className={`${sizeConf.label} font-semibold tracking-wider uppercase`}>
            {tier.name_tr}
          </span>
        )}
        {showStats && reputation !== undefined && (
          <span className={`${sizeConf.label} opacity-75`}>
            {reputation} puan
          </span>
        )}
      </Tag>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          style={{ minWidth: '200px' }}
        >
          <div
            className="rounded-lg border p-3 text-xs font-mono shadow-xl"
            style={{
              backgroundColor: '#0a0a0a',
              borderColor: `${tier.color}44`,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{tier.icon}</span>
              <div>
                <div className="font-bold" style={{ color: tier.color }}>
                  {tier.name_tr}
                </div>
                <div className="text-gray-500 text-[10px]">{tier.name_en}</div>
              </div>
            </div>
            {tier.description_tr && (
              <p className="text-gray-400 mb-2 leading-relaxed">{tier.description_tr}</p>
            )}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Oy ağırlığı</span>
                <span style={{ color: tier.color }}>×{tier.vote_weight}</span>
              </div>
              {tier.can_create_networks && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Network creation</span>
                  <span className="text-green-400">✓</span>
                </div>
              )}
              {tier.can_verify_evidence && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kanıt doğrulama</span>
                  <span className="text-green-400">✓</span>
                </div>
              )}
              {tier.can_moderate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Moderasyon</span>
                  <span className="text-green-400">✓</span>
                </div>
              )}
              {tier.can_nominate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Aday gösterme</span>
                  <span className="text-green-400">✓</span>
                </div>
              )}
              {reputation !== undefined && (
                <div className="flex justify-between mt-1 pt-1 border-t border-gray-800">
                  <span className="text-gray-600">Reputation</span>
                  <span style={{ color: tier.color }}>{reputation} puan</span>
                </div>
              )}
              {accuracy !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Doğruluk</span>
                  <span className="text-yellow-400">{Math.round(accuracy * 100)}%</span>
                </div>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: `${tier.color}44` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// BADGE TIER SELECTOR — All 4 tiers shown
// ============================================
export function BadgeTierList({ activeTier }: { activeTier?: BadgeTierId }) {
  return (
    <div className="flex flex-col gap-2">
      {[...BADGE_TIERS].reverse().map((tier) => (
        <div
          key={tier.id}
          className={`
            flex items-center gap-3 p-2.5 rounded border text-xs font-mono
            ${activeTier === tier.id ? 'opacity-100' : 'opacity-40'}
          `}
          style={{
            borderColor: `${tier.color}44`,
            backgroundColor: activeTier === tier.id ? `${tier.color}11` : 'transparent',
          }}
        >
          <span className="text-lg">{tier.icon}</span>
          <div className="flex-1">
            <div className="font-bold" style={{ color: tier.color }}>
              {tier.name_tr}
            </div>
            <div className="text-gray-600 text-[10px]">{tier.description_tr}</div>
          </div>
          {activeTier === tier.id && (
            <span className="text-green-400 text-xs">← Sen</span>
          )}
        </div>
      ))}
    </div>
  );
}
