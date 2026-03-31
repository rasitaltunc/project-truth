'use client';

import { ViewMode, LENS_CONFIGS } from '@/store/viewModeStore';

// ═══════════════════════════════════════════
// LENS EMPTY STATE — Sprint 7.5 Polish
// Lens modunda yeterli veri yoksa güzel fallback
// "Boş ekran" yerine "yardımcı mesaj"
// ═══════════════════════════════════════════

interface LensEmptyStateProps {
  mode: ViewMode;
  visibleNodeCount: number;  // opacity > 0.3 olan node sayısı
  totalNodeCount: number;
}

const EMPTY_MESSAGES: Record<ViewMode, {
  title: string;
  message: string;
  hint: string;
  icon: string;
}> = {
  full_network: {
    title: 'AĞ YÜKLENIYOR',
    message: 'Veriler henüz yüklenemedi.',
    hint: 'Sayfayı yenile veya bağlantını kontrol et.',
    icon: '🌐',
  },
  main_story: {
    title: 'KİLİT AKTÖR BULUNAMADI',
    message: 'Bu ağda henüz tier-0 veya tier-1 seviyesinde işaretlenmiş aktör yok.',
    hint: 'Node\'ların tier ve risk değerlerini güncelle — kilit aktörler otomatik öne çıkar.',
    icon: '📖',
  },
  follow_money: {
    title: 'FİNANSAL VERİ YOK',
    message: 'Bu ağda finansal olarak etiketlenmiş node veya bağlantı bulunamadı.',
    hint: 'Node type\'ını "organization" veya "financial_entity" olarak ayarla. Bağlantılara "financial" tipi ekle.',
    icon: '💰',
  },
  evidence_map: {
    title: 'KANIT VERİSİ EKSİK',
    message: 'Bağlantılarda confidence_level veya evidence_type bilgisi yok.',
    hint: 'Kanıt arşivine kaynak ekle — güven seviyeleri otomatik hesaplanır.',
    icon: '🔍',
  },
  timeline: {
    title: 'TARİH VERİSİ YOK',
    message: 'Node\'larda birth_date veya created_at alanı bulunamadı.',
    hint: 'Kronolojik görünüm için node\'lara tarih bilgisi ekle.',
    icon: '⏳',
  },
  board: {
    title: 'SORUŞTURMA PANOSU',
    message: 'Soruşturma Panosu aktif. 2D görünümde node\'ları düzenleyin.',
    hint: 'Araç çubuğu düğmelerini kullanarak node pozisyonlarını kaydedin ve yükleyin.',
    icon: '📌',
  },
};

// Threshold: bu kadar az node görünüyorsa empty state göster
const VISIBILITY_THRESHOLD = 2;

export default function LensEmptyState({ mode, visibleNodeCount, totalNodeCount }: LensEmptyStateProps) {
  // full_network'te empty state gösterme (zaten her şey görünür)
  if (mode === 'full_network') return null;
  // Yeterli node görünüyorsa empty state gereksiz
  if (visibleNodeCount >= VISIBILITY_THRESHOLD) return null;

  const config = EMPTY_MESSAGES[mode];
  const lens = LENS_CONFIGS.find(l => l.id === mode);
  const color = lens?.color || '#dc2626';

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 40,
      textAlign: 'center',
      pointerEvents: 'none',
      maxWidth: '340px',
      animation: 'emptyFadeIn 0.6s ease-out',
    }}>
      {/* İkon */}
      <div style={{
        fontSize: '32px',
        marginBottom: '12px',
        opacity: 0.6,
        filter: 'grayscale(0.4)',
      }}>
        {config.icon}
      </div>

      {/* Başlık */}
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.2em',
        color: `${color}88`,
        fontFamily: 'monospace',
        fontWeight: 700,
        marginBottom: '8px',
      }}>
        {config.title}
      </div>

      {/* Açıklama */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        lineHeight: 1.6,
        marginBottom: '12px',
      }}>
        {config.message}
      </div>

      {/* İpucu */}
      <div style={{
        fontSize: '10px',
        color: '#444',
        lineHeight: 1.5,
        padding: '8px 12px',
        backgroundColor: `${color}08`,
        border: `1px dashed ${color}30`,
        borderRadius: '4px',
        fontFamily: 'monospace',
      }}>
        💡 {config.hint}
      </div>

      {/* Toplam node bilgisi */}
      <div style={{
        marginTop: '10px',
        fontSize: '9px',
        color: '#333',
        fontFamily: 'monospace',
      }}>
        {totalNodeCount} node mevcut — {visibleNodeCount} görünür
      </div>

      <style>{`
        @keyframes emptyFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
