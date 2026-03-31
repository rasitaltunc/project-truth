'use client';

/**
 * ExploreDiscoveryView — Netflix-quality KEŞFET experience
 * Sprint 16.6 "BELGE DÜNYASI"
 *
 * Premium discovery interface with:
 * - Hero banner with pulse animation
 * - Category grid (6 document types)
 * - Quick search chips
 * - Gamification banner (Belge Madencisi)
 * - Campaign/Event banner
 *
 * Federal Indictment Aesthetic — #030303 bg, #dc2626 red, monospace, sharp corners
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scale, DollarSign, Lock, FileQuestion, Newspaper, BookOpen,
  Search, Target, Pickaxe, Loader2,
} from 'lucide-react';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ═══════════════════════════════════════════════════════
// CATEGORY DATA
// ═══════════════════════════════════════════════════════

const CATEGORIES = [
  {
    id: 'court_record',
    label: 'MAHKEME KAYITLARI',
    sublabel: 'İddianameler, duruşma tutanakları, mahkumiyet kararları',
    icon: Scale,
    color: '#3b82f6',
    query: 'court record indictment',
  },
  {
    id: 'financial',
    label: 'FİNANSAL BELGELER',
    sublabel: 'Banka kayıtları, offshore hesaplar, vergi belgeleri',
    icon: DollarSign,
    color: '#22c55e',
    query: 'financial offshore bank',
  },
  {
    id: 'leaked',
    label: 'SIZDIRILMIŞ BELGELER',
    sublabel: 'Gizli yazışmalar, iç dokümanlar, whistleblower',
    icon: Lock,
    color: '#f59e0b',
    query: 'leaked confidential',
  },
  {
    id: 'foia',
    label: 'BİLGİ EDİNME',
    sublabel: 'FOIA talepleri, hükümet belgeleri, kamu kayıtları',
    icon: FileQuestion,
    color: '#a855f7',
    query: 'foia government public record',
  },
  {
    id: 'media',
    label: 'MEDYA & HABER',
    sublabel: 'Araştırmacı gazetecilik, röportajlar, raporlar',
    icon: Newspaper,
    color: '#ef4444',
    query: 'investigation report journalism',
  },
  {
    id: 'academic',
    label: 'AKADEMİK ARAŞTIRMA',
    sublabel: 'Üniversite çalışmaları, analizler, veri setleri',
    icon: BookOpen,
    color: '#06b6d4',
    query: 'research analysis academic study',
  },
];

const QUICK_SEARCHES = [
  { label: 'Panama Papers', query: 'panama papers' },
  { label: 'Offshore Leaks', query: 'offshore leaks' },
  { label: 'Epstein Network', query: 'epstein' },
  { label: 'Sanctions List', query: 'sanctions' },
  { label: 'Paradise Papers', query: 'paradise papers' },
  { label: 'FinCEN Files', query: 'fincen files' },
];

// ═══════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ═══════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════

interface ExploreDiscoveryViewProps {
  onSearch: (query: string) => void;
  onCategorySearch: (category: string, query: string) => void;
}

// ═══════════════════════════════════════════════════════
// SECTION 1: HERO BANNER
// ═══════════════════════════════════════════════════════

function HeroBanner() {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: '32px 28px',
        borderBottom: '1px solid #1a1a1a',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #030303 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle red accent line at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #dc2626 50%, transparent 100%)',
        opacity: 0.6,
      }} />

      {/* Background grid texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(#dc2626 1px, transparent 1px), linear-gradient(90deg, #dc2626 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <div style={{
            padding: '3px 10px',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            fontSize: 9,
            fontFamily: mono,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#dc2626',
          }}>
            CLASSIFIED
          </div>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#dc2626',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </div>

        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: 20,
          fontWeight: 800,
          fontFamily: mono,
          letterSpacing: '0.12em',
          color: '#e5e5e5',
          lineHeight: 1.2,
        }}>
          BELGE DÜNYASI
        </h2>

        <p style={{
          margin: 0,
          fontSize: 11,
          fontFamily: mono,
          color: '#666',
          letterSpacing: '0.03em',
          lineHeight: 1.5,
        }}>
          Kamusal belgelerin karanlığına dalın.<br />
          Gerçeği ortaya çıkarın. Ağı genişletin.
        </p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 2: CATEGORY GRID
// ═══════════════════════════════════════════════════════

function CategoryGrid({ onCategorySearch }: { onCategorySearch: (cat: string, query: string) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <div style={{
        fontSize: 9, fontFamily: mono, fontWeight: 700,
        letterSpacing: '0.12em', color: '#555', marginBottom: 14,
      }}>
        KATEGORİLERE GÖRE KEŞFEDİN
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isHovered = hoveredId === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onCategorySearch(cat.id, cat.query)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: isHovered ? '#0f0f0f' : '#080808',
                border: `1px solid ${isHovered ? cat.color + '55' : '#1a1a1a'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
                background: cat.color,
                opacity: isHovered ? 0.8 : 0.2,
                transition: 'opacity 0.25s',
              }} />

              <Icon
                size={16}
                color={isHovered ? cat.color : '#555'}
                style={{ flexShrink: 0, marginTop: 2, transition: 'color 0.25s' }}
              />

              <div>
                <div style={{
                  fontSize: 10, fontFamily: mono, fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: isHovered ? '#e5e5e5' : '#999',
                  transition: 'color 0.25s',
                  marginBottom: 3,
                }}>
                  {cat.label}
                </div>
                <div style={{
                  fontSize: 9, color: '#555', lineHeight: 1.3,
                  fontFamily: mono,
                }}>
                  {cat.sublabel}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 3: QUICK SEARCH CHIPS
// ═══════════════════════════════════════════════════════

function QuickSearchChips({ onSearch }: { onSearch: (query: string) => void }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      <div style={{
        fontSize: 9, fontFamily: mono, fontWeight: 700,
        letterSpacing: '0.12em', color: '#555', marginBottom: 10,
      }}>
        HIZLI ARAMA
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QUICK_SEARCHES.map((qs) => (
          <motion.button
            key={qs.label}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSearch(qs.query)}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #1a1a1a',
              color: '#888',
              fontSize: 10,
              fontFamily: mono,
              fontWeight: 600,
              letterSpacing: '0.03em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#dc2626';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1a1a1a';
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {qs.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 4: GAMIFICATION — BELGE MADENCİSİ
// ═══════════════════════════════════════════════════════

function MinerBanner() {
  const tiers = [
    { label: 'ÇAYLAK', icon: '🥚', threshold: 0, color: '#666' },
    { label: 'MADENCİ', icon: '⛏️', threshold: 5, color: '#f59e0b' },
    { label: 'ARAŞTIRMACI', icon: '🔍', threshold: 15, color: '#3b82f6' },
    { label: 'USTA', icon: '🏆', threshold: 30, color: '#dc2626' },
  ];

  // TODO: Read actual scan count from store
  const scannedCount = 0;
  const currentTierIdx = tiers.reduce((acc, t, i) => (scannedCount >= t.threshold ? i : acc), 0);
  const currentTier = tiers[currentTierIdx];
  const nextTier = tiers[currentTierIdx + 1];
  const progress = nextTier
    ? ((scannedCount - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100
    : 100;

  return (
    <motion.div
      variants={itemVariants}
      style={{
        padding: '18px 24px',
        borderBottom: '1px solid #1a1a1a',
        background: '#050505',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
      }}>
        <Pickaxe size={14} color="#f59e0b" />
        <span style={{
          fontSize: 10, fontFamily: mono, fontWeight: 700,
          letterSpacing: '0.1em', color: '#f59e0b',
        }}>
          BELGE MADENCİSİ OL
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
      }}>
        <span style={{ fontSize: 18 }}>{currentTier.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, fontFamily: mono, fontWeight: 600,
            color: currentTier.color, letterSpacing: '0.05em', marginBottom: 4,
          }}>
            {currentTier.label}
          </div>
          {/* Progress bar */}
          <div style={{
            width: '100%', height: 4, background: '#1a1a1a',
            position: 'relative',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: nextTier ? nextTier.color : '#dc2626',
              }}
            />
          </div>
        </div>
        {nextTier && (
          <div style={{
            fontSize: 9, fontFamily: mono, color: '#555',
            textAlign: 'right', minWidth: 50,
          }}>
            {scannedCount}/{nextTier.threshold}
          </div>
        )}
      </div>

      <div style={{
        fontSize: 9, fontFamily: mono, color: '#555', lineHeight: 1.4,
      }}>
        Belge tarayarak rozet kazan. Her tarama ağa yeni bilgi ekler.
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// SECTION 5: EVENT/CAMPAIGN BANNER
// ═══════════════════════════════════════════════════════

function EventBanner({ onSearch }: { onSearch: (query: string) => void }) {
  return (
    <motion.div
      variants={itemVariants}
      style={{
        margin: '16px 24px 24px',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.2) 0%, rgba(220, 38, 38, 0.08) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated scan line */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '30%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(220, 38, 38, 0.05), transparent)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <Target size={14} color="#dc2626" />
          <span style={{
            fontSize: 10, fontFamily: mono, fontWeight: 700,
            letterSpacing: '0.1em', color: '#dc2626',
          }}>
            ETKİNLİK
          </span>
        </div>

        <div style={{
          fontSize: 12, fontFamily: mono, fontWeight: 700,
          color: '#e5e5e5', letterSpacing: '0.05em', marginBottom: 6,
        }}>
          Finansal Ağları Çöz
        </div>

        <div style={{
          fontSize: 9, fontFamily: mono, color: '#888',
          lineHeight: 1.4, marginBottom: 12,
        }}>
          Finansal belgeleri tara ve offshore bağlantıları keşfet.
          <span style={{ color: '#22c55e', fontWeight: 600 }}> +15 İtibar</span> her tarama için.
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSearch('financial offshore')}
          style={{
            padding: '8px 20px',
            background: '#dc2626',
            border: 'none',
            color: '#fff',
            fontSize: 10,
            fontFamily: mono,
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          BAŞLA →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════

export default function ExploreDiscoveryView({
  onSearch,
  onCategorySearch,
}: ExploreDiscoveryViewProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        flex: 1,
        overflow: 'auto',
      }}
    >
      <HeroBanner />
      <CategoryGrid onCategorySearch={onCategorySearch} />
      <QuickSearchChips onSearch={onSearch} />
      <MinerBanner />
      <EventBanner onSearch={onSearch} />
    </motion.div>
  );
}
