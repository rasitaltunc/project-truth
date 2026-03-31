'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { useViewModeStore, LENS_CONFIGS, ViewMode, AiLensSuggestion } from '@/store/viewModeStore';
import { LinkFilterPanel } from './LinkFilterPanel';
import { useLinkFilterStore } from '@/store/linkFilterStore';

// ═══════════════════════════════════════════
// LENS SIDEBAR — Sprint 7 "Akıllı Lens"
// Sol persistent sidebar — 5 lens butonu
// İlk açılışta açık + ipucu (10 saniye testi)
// ═══════════════════════════════════════════

const ONBOARDING_KEY = 'truth_lens_onboarding_seen';

export default function LensSidebar() {
  const {
    activeMode, setMode, sidebarOpen, toggleSidebar, setSidebarOpen,
    aiSuggestion, dismissAiSuggestion, acceptAiSuggestion,
  } = useViewModeStore();

  const filterCount = useLinkFilterStore((s) => s.activeFilters.size);

  const [showOnboardingHint, setShowOnboardingHint] = useState(false);

  // İlk kez gelen kullanıcıya sidebar'ı açık göster
  useEffect(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) {
        setSidebarOpen(true);
        setShowOnboardingHint(true);
        localStorage.setItem(ONBOARDING_KEY, '1');
        // 8 saniye sonra ipucu kaybolsun
        const timer = setTimeout(() => setShowOnboardingHint(false), 8000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage erişim hatası — sessizce devam
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLens = LENS_CONFIGS.find(l => l.id === activeMode)!;

  return (
    <>
      {/* TOGGLE TAB — her zaman görünür */}
      <button
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          left: sidebarOpen ? '200px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 55,
          width: '20px',
          height: '64px',
          backgroundColor: activeLens.color + '22',
          borderTop: `1px solid ${activeLens.color}60`,
          borderRight: `1px solid ${activeLens.color}60`,
          borderBottom: `1px solid ${activeLens.color}60`,
          borderLeft: sidebarOpen ? `1px solid ${activeLens.color}60` : 'none',
          borderRadius: '0 4px 4px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: activeLens.color,
          transition: 'left 0.3s ease',
        }}
        title={sidebarOpen ? 'Close' : 'Lens Menu'}
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        {/* Filtre aktif badge */}
        {filterCount > 0 && !sidebarOpen && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '14px', height: '14px', borderRadius: '50%',
            backgroundColor: '#dc2626', color: '#fff',
            fontSize: '8px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {filterCount}
          </span>
        )}
      </button>

      {/* SIDEBAR PANEL */}
      <div style={{
        position: 'fixed',
        left: sidebarOpen ? '0px' : '-200px',
        top: 0,
        bottom: 0,
        width: '200px',
        zIndex: 54,
        backgroundColor: 'rgba(8, 8, 8, 0.97)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        transition: 'left 0.3s ease',
        overflowY: 'auto',
      }}>

        {/* HEADER */}
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <div style={{
            fontSize: '8px', letterSpacing: '0.25em', color: '#dc262660',
            fontFamily: 'monospace', marginBottom: '4px',
          }}>
            VIEW MODE
          </div>
          <div style={{ fontSize: '11px', color: '#444', fontFamily: 'monospace' }}>
            {activeLens.icon} {activeLens.label}
          </div>
        </div>

        {/* LENS LİSTESİ */}
        <div style={{ padding: '8px 0', flex: 1 }}>
          {LENS_CONFIGS.map((lens) => {
            const isActive = activeMode === lens.id;
            return (
              <button
                key={lens.id}
                onClick={() => setMode(lens.id)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: isActive ? `${lens.color}18` : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `3px solid ${lens.color}` : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* İkon */}
                <span style={{ fontSize: '16px', minWidth: '20px' }}>{lens.icon}</span>

                {/* Metin */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: isActive ? lens.color : '#888',
                    letterSpacing: '0.1em',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}>
                    {lens.label}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    color: isActive ? '#aaa' : '#444',
                    marginTop: '1px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {lens.description}
                  </div>
                </div>

                {/* Aktif göstergesi */}
                {isActive && (
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    backgroundColor: lens.color, flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* İP FİLTRESİ — Sprint 10.5 */}
        <div style={{
          borderTop: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <LinkFilterPanel />
        </div>

        {/* ONBOARDING HINT — ilk açılışta göster */}
        {showOnboardingHint && (
          <div style={{
            padding: '10px 12px',
            margin: '4px 8px',
            backgroundColor: '#dc262612',
            border: '1px solid #dc262630',
            borderRadius: '4px',
            animation: 'hintPulse 2s ease-in-out infinite',
          }}>
            <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '4px' }}>
              FIRST STEP
            </div>
            <div style={{ fontSize: '9px', color: '#888', lineHeight: 1.5 }}>
              Choose a lens or ask AI — the network will adapt to you.
            </div>
            <style>{`
              @keyframes hintPulse {
                0%, 100% { border-color: rgba(220,38,38,0.19); }
                50% { border-color: rgba(220,38,38,0.45); }
              }
            `}</style>
          </div>
        )}

        {/* FOOTER — kısayol hatırlatıcı */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #1a1a1a',
        }}>
          <div style={{ fontSize: '8px', color: '#333', fontFamily: 'monospace', lineHeight: 1.6 }}>
            AI can suggest a mode in chat.
          </div>
        </div>
      </div>

      {/* AI LENS SUGGESTION BANNER */}
      {aiSuggestion && (
        <AiSuggestionBanner
          suggestion={aiSuggestion}
          onAccept={acceptAiSuggestion}
          onDismiss={dismissAiSuggestion}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// AI SUGGESTION BANNER
// ═══════════════════════════════════════════
function AiSuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: AiLensSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const lens = LENS_CONFIGS.find(l => l.id === suggestion.mode);
  if (!lens) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      backgroundColor: 'rgba(10, 10, 10, 0.96)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${lens.color}60`,
      borderRadius: '6px',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'suggestionSlideUp 0.3s ease-out',
      maxWidth: '420px',
    }}>
      {/* İkon + metin */}
      <span style={{ fontSize: '18px' }}>{lens.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', color: lens.color, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
          AI SUGGESTION
        </div>
        <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
          {suggestion.reason}
        </div>
      </div>

      {/* Kabul */}
      <button
        onClick={onAccept}
        style={{
          padding: '5px 10px', backgroundColor: `${lens.color}25`,
          border: `1px solid ${lens.color}80`, borderRadius: '3px',
          cursor: 'pointer', color: lens.color, fontSize: '9px',
          fontFamily: 'monospace', letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        <Check size={10} /> Switch to {lens.label}
      </button>

      {/* Reddet */}
      <button
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#555', padding: '4px',
        }}
      >
        <X size={12} />
      </button>

      <style>{`
        @keyframes suggestionSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
