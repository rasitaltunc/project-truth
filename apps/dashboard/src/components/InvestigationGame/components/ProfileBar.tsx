'use client';

/**
 * ProfileBar — Your investigator identity
 *
 * Research ref: Stack Overflow privilege unlocking + radar chart for domain expertise
 * — Trust weight formula VISIBLE (radical transparency)
 * — Tier progression feels like leveling up
 * — Streak + accuracy + trust weight as mini stats
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, Scale, Shield, TrendingUp } from 'lucide-react';
import type { InvestigatorProfile } from '@/store/investigationGameStore';

// ─── Tier Visual System ─────────────────────────────────────────────

const TIER_CONFIG: Record<string, {
  color: string;
  minXp: number;
  label: string;
  icon: React.ReactNode;
}> = {
  novice: { color: '#6b7280', minXp: 0, label: 'NOVICE', icon: <Shield size={10} /> },
  researcher: { color: '#3b82f6', minXp: 50, label: 'RESEARCHER', icon: <Shield size={10} /> },
  analyst: { color: '#8b5cf6', minXp: 200, label: 'ANALYST', icon: <Shield size={10} /> },
  senior: { color: '#f59e0b', minXp: 500, label: 'SENIOR', icon: <Shield size={10} /> },
  expert: { color: '#ef4444', minXp: 1000, label: 'EXPERT', icon: <Shield size={10} /> },
};

interface ProfileBarProps {
  profile: InvestigatorProfile | null;
}

export default function ProfileBar({ profile }: ProfileBarProps) {
  if (!profile) return null;

  const tier = TIER_CONFIG[profile.tier] || TIER_CONFIG.novice;
  const tiers = Object.values(TIER_CONFIG);
  const nextTier = tiers.find((t) => t.minXp > profile.xp);
  const progress = nextTier
    ? ((profile.xp - tier.minXp) / (nextTier.minXp - tier.minXp)) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-3"
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Tier Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-[0.15em] font-mono"
          style={{
            background: `${tier.color}15`,
            color: tier.color,
            border: `1px solid ${tier.color}30`,
          }}
        >
          {tier.icon}
          {tier.label}
        </div>

        {/* XP Progress Bar */}
        <div className="flex-1">
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${tier.color}, ${tier.color}90)`,
              }}
            />
          </div>
          <div className="text-[8px] text-neutral-700 mt-0.5 font-mono">
            {profile.xp} XP{nextTier ? ` / ${nextTier.minXp}` : ' (MAX)'}
          </div>
        </div>

        {/* Mini Stats */}
        <div className="flex items-center gap-2.5">
          {/* Streak */}
          <div className="flex items-center gap-0.5" title="Investigation Streak">
            <Flame size={9} className="text-orange-500/70" />
            <span className="text-[9px] font-mono text-neutral-600">
              {profile.streak_days}d
            </span>
          </div>

          {/* Accuracy */}
          <div className="flex items-center gap-0.5" title="Calibration Accuracy">
            <Target size={9} className="text-emerald-500/70" />
            <span className="text-[9px] font-mono text-neutral-600">
              {(profile.calibration_accuracy * 100).toFixed(0)}%
            </span>
          </div>

          {/* Trust Weight */}
          <div className="flex items-center gap-0.5" title="Trust Weight">
            <Scale size={9} className="text-blue-500/70" />
            <span className="text-[9px] font-mono text-neutral-600">
              {profile.trust_weight.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Trust Weight Formula — radical transparency */}
      {profile.trust_weight_formula && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-1 flex items-center gap-1.5 px-3"
        >
          <TrendingUp size={8} className="text-neutral-700" />
          <span
            className="text-[8px] font-mono text-neutral-700 truncate"
            title={profile.trust_weight_formula}
          >
            {profile.trust_weight_formula}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
