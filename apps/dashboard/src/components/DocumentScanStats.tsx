'use client';

/**
 * Document Scan Stats Bar (TARA Protocol - Sprint 16.5)
 * Sticky stats bar at top of BELGELERİM tab
 * Shows: scanned count, pending count, reputation earned
 */

import React from 'react';
import { CheckCircle, Clock, Trophy } from 'lucide-react';
import { useDocumentStore } from '@/store/documentStore';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export default function DocumentScanStats() {
  const stats = useDocumentStore((s) => s.stats);

  if (!stats) return null;

  const scanned = stats.scanned || 0;
  const ready = (stats as any).ready || 0;
  const pending = stats.pending || 0;
  const total = stats.total || 0;

  return (
    <div
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: mono,
        fontSize: 10,
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {/* Scanned count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <CheckCircle size={12} color="#22c55e" />
        <span style={{ color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em' }}>
          {scanned}
        </span>
        <span style={{ color: '#666' }}>SCANNED</span>
      </div>

      {/* Ready count (OCR done, waiting for AI scan) */}
      {ready > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={12} color="#3b82f6" />
          <span style={{ color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em' }}>
            {ready}
          </span>
          <span style={{ color: '#666' }}>OCR READY</span>
        </div>
      )}

      {/* Pending count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={12} color="#eab308" />
        <span style={{ color: '#eab308', fontWeight: 700, letterSpacing: '0.05em' }}>
          {pending}
        </span>
        <span style={{ color: '#666' }}>PENDING</span>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Trophy size={12} color="#dc2626" />
        <span style={{ color: '#e5e5e5', fontWeight: 700, letterSpacing: '0.05em' }}>
          {total}
        </span>
        <span style={{ color: '#666' }}>TOTAL</span>
      </div>
    </div>
  );
}
