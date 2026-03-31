'use client';

/**
 * TrustWeightDetail — Güven Ağırlığı Şeffaf Gösterim
 *
 * Game Bible Bölüm 7: "Formül HERKESE AÇIK — her kullanıcı kendi ağırlığının
 * neden o olduğunu görür"
 *
 * 6 sinyal:
 *   - Kalibrasyon doğruluğu (33%)
 *   - Çapraz doğrulama (23%)
 *   - Gerekçe kalitesi (13%)
 *   - Tutarlılık (13%)
 *   - Alan uzmanlığı (8%)
 *   - Spotlight direnci (10%) — Verification Desk v2
 *
 * Bu bileşen ProfileBar'a tıklandığında veya profile tab'ında açılır.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Target, GitBranch, Brain, TrendingUp,
  Compass, Eye, Scale, Info,
} from 'lucide-react';
import type { InvestigatorProfile } from '@/store/investigationGameStore';

interface TrustWeightDetailProps {
  profile: InvestigatorProfile;
}

interface SignalConfig {
  key: string;
  label: string;
  labelEn: string;
  weight: number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const SIGNALS: SignalConfig[] = [
  {
    key: 'calibration',
    label: 'Kalibrasyon',
    labelEn: 'Calibration',
    weight: 0.33,
    icon: <Target size={10} />,
    color: '#10b981',
    description: 'Bilinen doğru cevaplı test görevlerindeki başarı oranın',
  },
  {
    key: 'cross_validation',
    label: 'Çapraz Doğrulama',
    labelEn: 'Cross Validation',
    weight: 0.23,
    icon: <GitBranch size={10} />,
    color: '#3b82f6',
    description: 'Diğer incelemecilerle ne sıklıkla aynı karara vardığın',
  },
  {
    key: 'reasoning',
    label: 'Gerekçe Kalitesi',
    labelEn: 'Reasoning Quality',
    weight: 0.13,
    icon: <Brain size={10} />,
    color: '#8b5cf6',
    description: 'Gerekçelerinin detayı, kaynak referansları, tutarlılığı',
  },
  {
    key: 'consistency',
    label: 'Tutarlılık',
    labelEn: 'Consistency',
    weight: 0.13,
    icon: <TrendingUp size={10} />,
    color: '#f59e0b',
    description: 'Benzer görevlerde ne kadar tutarlı kararlar verdiğin',
  },
  {
    key: 'domain',
    label: 'Alan Uzmanlığı',
    labelEn: 'Domain Expertise',
    weight: 0.08,
    icon: <Compass size={10} />,
    color: '#06b6d4',
    description: 'Belirli alanlardaki (finans, hukuk, vb.) doğruluk oranın',
  },
  {
    key: 'spotlight',
    label: 'Spotlight Direnci',
    labelEn: 'Spotlight Resistance',
    weight: 0.10,
    icon: <Eye size={10} />,
    color: '#ec4899',
    description: 'Honeypot görevlerinde yanlış spotlight\'ı fark edip reddetme oranın',
  },
];

/**
 * Parse the trust_weight_formula string to extract individual signal values.
 * Format: "cal(85%)×0.33 + cross(70%)×0.23 + reason(60%)×0.13 + consist(75%)×0.13 + domain(50%)×0.08 + spotlight(90%)×0.10"
 */
function parseFormulaValues(formula: string | null): Record<string, number> {
  const values: Record<string, number> = {};
  if (!formula) return values;

  const keyMap: Record<string, string> = {
    cal: 'calibration',
    cross: 'cross_validation',
    reason: 'reasoning',
    consist: 'consistency',
    domain: 'domain',
    spotlight: 'spotlight',
  };

  const matches = formula.matchAll(/(\w+)\((\d+)%\)/g);
  for (const match of matches) {
    const shortKey = match[1];
    const value = parseInt(match[2], 10) / 100;
    const fullKey = keyMap[shortKey];
    if (fullKey) {
      values[fullKey] = value;
    }
  }

  return values;
}

export default function TrustWeightDetail({ profile }: TrustWeightDetailProps) {
  const signalValues = parseFormulaValues(profile.trust_weight_formula);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Scale size={12} className="text-blue-500" />
        <span className="text-[10px] font-mono font-bold text-neutral-300 tracking-wider uppercase">
          GÜVEN AĞIRLIĞI DETAY
        </span>
        <span
          className="text-[11px] font-mono font-bold ml-auto"
          style={{
            color: profile.trust_weight > 0.7 ? '#10b981'
              : profile.trust_weight > 0.4 ? '#f59e0b' : '#ef4444',
          }}
        >
          {profile.trust_weight.toFixed(3)}
        </span>
      </div>

      {/* Transparency note */}
      <div
        className="flex items-start gap-1.5 px-2.5 py-1.5 rounded"
        style={{
          background: 'rgba(99,102,241,0.04)',
          border: '1px solid rgba(99,102,241,0.08)',
        }}
      >
        <Info size={9} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <span className="text-[8px] text-neutral-500 leading-relaxed">
          Bu formül herkese açıktır. Her sinyal 0-100% arasında ölçülür ve belirtilen ağırlıkla çarpılır.
          Toplam = senin güven ağırlığın.
        </span>
      </div>

      {/* Signal Bars */}
      <div className="flex flex-col gap-2">
        {SIGNALS.map((signal, i) => {
          const value = signalValues[signal.key] ?? 0.5; // default 50% if not in formula
          const hasData = signal.key in signalValues;
          const contribution = value * signal.weight;

          return (
            <motion.div
              key={signal.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: signal.color }}>{signal.icon}</span>
                  <span className="text-[9px] font-mono text-neutral-400">
                    {signal.label}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-700">
                    ×{(signal.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-mono font-semibold"
                    style={{
                      color: hasData
                        ? (value > 0.7 ? '#10b981' : value > 0.4 ? '#f59e0b' : '#ef4444')
                        : '#525252',
                    }}
                  >
                    {hasData ? `${(value * 100).toFixed(0)}%` : '—'}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-700">
                    = {(contribution * 100).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(value * 100, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: hasData
                      ? `linear-gradient(90deg, ${signal.color}, ${signal.color}80)`
                      : 'rgba(255,255,255,0.08)',
                  }}
                />
              </div>

              {/* Description */}
              <div className="text-[7px] text-neutral-700 mt-0.5 leading-relaxed">
                {signal.description}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Raw formula */}
      {profile.trust_weight_formula && (
        <div
          className="px-2.5 py-2 rounded text-[7px] font-mono text-neutral-700 break-all leading-relaxed"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span className="text-neutral-600">FORMÜL:</span>{' '}
          {profile.trust_weight_formula}
        </div>
      )}

      {/* Total */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
          TOPLAM GÜVEN AĞIRLIĞI
        </span>
        <span
          className="text-sm font-mono font-bold"
          style={{
            color: profile.trust_weight > 0.7 ? '#10b981'
              : profile.trust_weight > 0.4 ? '#f59e0b' : '#ef4444',
          }}
        >
          {profile.trust_weight.toFixed(3)}
        </span>
      </div>
    </motion.div>
  );
}
