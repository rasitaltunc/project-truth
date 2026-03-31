'use client';

import React from 'react';
import { useLinkFilterStore, EVIDENCE_TYPE_CONFIG, EVIDENCE_TYPE_ORDER } from '@/store/linkFilterStore';

/**
 * LinkFilterPanel — Evidence type filter UI
 * Sprint 10.5: İp Filtresi — kanıt tipine göre link filtreleme
 * LensSidebar içine gömülü, Federal Indictment estetiği
 */
export function LinkFilterPanel() {
  const activeFilters = useLinkFilterStore((state) => state.activeFilters);
  const filteringEnabled = useLinkFilterStore((state) => state.filteringEnabled);
  const toggleFilter = useLinkFilterStore((state) => state.toggleFilter);
  const clearFilters = useLinkFilterStore((state) => state.clearFilters);

  const filterCount = activeFilters.size;
  const isAnyFilterActive = filteringEnabled && filterCount > 0;

  return (
    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{
          fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em',
          color: '#dc2626', fontFamily: 'monospace',
        }}>
          İP FİLTRESİ
        </span>
        {isAnyFilterActive && (
          <span style={{
            fontSize: '8px', color: '#e5e5e5', opacity: 0.6, fontFamily: 'monospace',
          }}>
            {filterCount} aktif
          </span>
        )}
      </div>

      {/* Filter Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {EVIDENCE_TYPE_ORDER.map((typeKey) => {
          const config = EVIDENCE_TYPE_CONFIG[typeKey];
          if (!config) return null;
          const isActive = activeFilters.has(typeKey);

          return (
            <button
              key={typeKey}
              onClick={() => toggleFilter(typeKey)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                backgroundColor: isActive ? `${config.color}18` : 'transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                borderLeftStyle: 'solid',
                borderLeftWidth: '2px',
                borderLeftColor: isActive ? config.color : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderRadius: '0',
              }}
              title={config.label}
            >
              {/* Colored dot */}
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: config.color,
                opacity: isActive ? 1 : 0.35,
                boxShadow: isActive ? `0 0 6px ${config.color}50` : 'none',
                transition: 'all 0.2s ease',
              }} />

              {/* Icon */}
              <span style={{ fontSize: '10px', flexShrink: 0 }}>{config.icon}</span>

              {/* Label */}
              <span style={{
                fontSize: '8px', fontFamily: 'monospace', flex: 1,
                color: isActive ? '#e5e5e5' : '#666',
                letterSpacing: '0.05em',
                transition: 'color 0.2s ease',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {config.labelTR}
              </span>

              {/* Checkbox indicator */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '1px', flexShrink: 0,
                border: `1px solid ${isActive ? '#e5e5e5' : '#444'}`,
                backgroundColor: isActive ? '#dc2626' : 'transparent',
                transition: 'all 0.2s ease',
              }} />
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {isAnyFilterActive && (
        <button
          onClick={clearFilters}
          style={{
            marginTop: '4px', padding: '4px 8px',
            fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.15em',
            color: '#888', backgroundColor: 'transparent',
            border: '1px solid #333', borderRadius: '2px',
            cursor: 'pointer', transition: 'all 0.2s ease',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#dc2626';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.color = '#888';
          }}
        >
          TEMİZLE
        </button>
      )}

      {/* Hint text */}
      {!isAnyFilterActive && (
        <div style={{
          fontSize: '8px', color: '#333', fontFamily: 'monospace', lineHeight: 1.5, marginTop: '2px',
        }}>
          Kanıt tipine göre ipleri filtrele
        </div>
      )}
    </div>
  );
}
