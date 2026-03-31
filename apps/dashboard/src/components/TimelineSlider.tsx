'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useViewModeStore } from '@/store/viewModeStore';

// ═══════════════════════════════════════════
// TIMELINE SLIDER — Sprint 7 "Akıllı Lens"
// Timeline lens için yıl range slider'ı
// Proximity-based dual handle (overlap fix)
// ═══════════════════════════════════════════

const PURPLE = '#8b5cf6';

export function TimelineSlider() {
  const {
    activeMode,
    timelineRange,
    timelineYearRange,
    isTimelinePlaying,
    setTimelineRange,
    toggleTimelinePlaying,
  } = useViewModeStore();

  const playRef = useRef<number | null>(null);
  const rangeRef = useRef(timelineRange);
  rangeRef.current = timelineRange;

  // Hangi tutamak aktif? "start" | "end" — pointer pozisyonuna göre seçilir
  const [activeThumb, setActiveThumb] = useState<'start' | 'end'>('end');

  const [minYear, maxYear] = timelineYearRange;

  // Aktif range (başlangıç değeri: tüm yıllar)
  const range = timelineRange ?? [minYear, maxYear];
  const [startYear, endYear] = range;

  // Auto-play: SLIDING WINDOW — sabit genişlik, ikisi birlikte kayar
  useEffect(() => {
    if (isTimelinePlaying) {
      const tick = () => {
        const current = rangeRef.current ?? [minYear, maxYear];
        const [s, e] = current;
        const windowSize = e - s; // pencere genişliğini koru
        if (e >= maxYear) {
          // Başa dön (aynı pencere genişliğiyle)
          setTimelineRange([minYear, minYear + windowSize]);
        } else {
          // İkisi birlikte kayar
          setTimelineRange([s + 1, e + 1]);
        }
      };
      playRef.current = window.setInterval(tick, 800);
    } else {
      if (playRef.current !== null) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    }
    return () => {
      if (playRef.current !== null) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    };
  }, [isTimelinePlaying, minYear, maxYear, setTimelineRange]);

  // Proximity detection: track bar üzerinde pointer basıldığında
  // hangi tutamağa daha yakınsa onu aktif yap
  const handleTrackPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const yearAtCursor = minYear + pct * (maxYear - minYear);
    const current = rangeRef.current ?? [minYear, maxYear];
    const distToStart = Math.abs(yearAtCursor - current[0]);
    const distToEnd   = Math.abs(yearAtCursor - current[1]);
    setActiveThumb(distToStart <= distToEnd ? 'start' : 'end');
  }, [minYear, maxYear]);

  // Unified slider change — aktif tutamağa göre start veya end'i güncelle
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const current = rangeRef.current ?? [minYear, maxYear];
    if (activeThumb === 'start') {
      // Start tutamağı: end'den küçük kalmalı
      setTimelineRange([Math.min(val, current[1] - 1), current[1]]);
    } else {
      // End tutamağı: start'tan büyük kalmalı
      setTimelineRange([current[0], Math.max(val, current[0] + 1)]);
    }
  }, [activeThumb, minYear, maxYear, setTimelineRange]);

  const resetRange = useCallback(() => {
    setTimelineRange([minYear, maxYear]);
    // Oynatmayı durdur
    if (isTimelinePlaying) toggleTimelinePlaying();
  }, [minYear, maxYear, setTimelineRange, isTimelinePlaying, toggleTimelinePlaying]);

  if (activeMode !== 'timeline') return null;

  // Yüzde hesapla (progress bar için)
  const totalSpan = maxYear - minYear;
  const startPct = totalSpan > 0 ? ((startYear - minYear) / totalSpan) * 100 : 0;
  const endPct   = totalSpan > 0 ? ((endYear   - minYear) / totalSpan) * 100 : 100;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'rgba(10,10,10,0.95)',
        border: `1px solid ${PURPLE}44`,
        borderRadius: '12px',
        padding: '16px 24px',
        minWidth: '480px',
        maxWidth: '600px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 32px ${PURPLE}22`,
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⏳</span>
          <span style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: PURPLE,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            KRONOLOJİ
          </span>
        </div>

        {/* Active range badge */}
        <div style={{
          background: `${PURPLE}22`,
          border: `1px solid ${PURPLE}55`,
          borderRadius: '6px',
          padding: '3px 10px',
          fontSize: '13px',
          color: '#e5e5e5',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
        }}>
          {startYear} — {endYear}
        </div>
      </div>

      {/* Progress track (visual) */}
      <div style={{
        position: 'relative',
        height: '6px',
        background: '#1f1f1f',
        borderRadius: '3px',
        marginBottom: '10px',
      }}>
        {/* Active range fill */}
        <div style={{
          position: 'absolute',
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
          height: '100%',
          background: PURPLE,
          borderRadius: '3px',
          transition: 'left 0.2s, width 0.2s',
        }} />
        {/* Start knob */}
        <div style={{
          position: 'absolute',
          left: `${startPct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          background: PURPLE,
          borderRadius: '50%',
          border: '2px solid #0a0a0a',
          transition: 'left 0.2s',
        }} />
        {/* End knob */}
        <div style={{
          position: 'absolute',
          left: `${endPct}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          background: PURPLE,
          borderRadius: '50%',
          border: '2px solid #0a0a0a',
          transition: 'left 0.2s',
        }} />
      </div>

      {/* Unified range input — pointerDown'da proximity ile aktif tutamak seçilir */}
      <div
        style={{ position: 'relative', height: '0' }}
        onPointerDown={handleTrackPointerDown}
      >
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={activeThumb === 'start' ? startYear : endYear}
          onChange={handleSliderChange}
          style={{
            position: 'absolute',
            top: '-16px',
            left: 0,
            width: '100%',
            appearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            opacity: 0,
            height: '20px',
            zIndex: 2,
          }}
        />
      </div>

      {/* Year labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{minYear}</span>
        {/* Tick marks every 5 years */}
        {Array.from({ length: Math.floor((maxYear - minYear) / 5) - 1 }, (_, i) => minYear + (i + 1) * 5).map(yr => (
          <span key={yr} style={{ fontSize: '9px', color: '#333', fontFamily: 'monospace' }}>{yr}</span>
        ))}
        <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{maxYear}</span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Play/Pause */}
        <button
          onClick={toggleTimelinePlaying}
          style={{
            background: isTimelinePlaying ? `${PURPLE}33` : `${PURPLE}22`,
            border: `1px solid ${PURPLE}66`,
            borderRadius: '6px',
            color: PURPLE,
            padding: '6px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s',
          }}
        >
          {isTimelinePlaying ? '⏸ DURDUR' : '▶ OYNAT'}
        </button>

        {/* Reset */}
        <button
          onClick={resetRange}
          style={{
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#666',
            padding: '6px 12px',
            fontSize: '11px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#555'; (e.target as HTMLElement).style.color = '#999'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#333'; (e.target as HTMLElement).style.color = '#666'; }}
        >
          ↺ SIFIRLA
        </button>

        {/* Info */}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#444', fontFamily: 'monospace' }}>
          {endYear - startYear} yıllık pencere
        </span>
      </div>
    </div>
  );
}

export default TimelineSlider;
