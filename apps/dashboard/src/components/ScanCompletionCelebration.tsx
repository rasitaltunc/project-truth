'use client';

/**
 * Scan Completion Celebration Banner (TARA Protocol - Sprint 16.5)
 * Full-screen overlay that shows when a document scan completes
 * Inspired by FirstDiscoveryBanner — scale-bounce entrance, 4s auto-dismiss
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Zap, FileText, Users, Link2, Trophy, ArrowRight, X } from 'lucide-react';
import { useDocumentStore } from '@/store/documentStore';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export default function ScanCompletionCelebration() {
  const showCelebration = useDocumentStore((s) => s.showScanCelebration);
  const data = useDocumentStore((s) => s.celebrationData);
  const dismiss = useDocumentStore((s) => s.dismissCelebration);

  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit' | 'gone'>('gone');

  useEffect(() => {
    if (showCelebration && data) {
      setPhase('enter');

      // Enter → hold
      const t1 = setTimeout(() => setPhase('hold'), 500);
      // hold → exit
      const t2 = setTimeout(() => setPhase('exit'), 4000);
      // exit → gone + dismiss
      const t3 = setTimeout(() => {
        setPhase('gone');
        dismiss();
      }, 4600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showCelebration, data, dismiss]);

  const handleDismiss = useCallback(() => {
    setPhase('exit');
    setTimeout(() => {
      setPhase('gone');
      dismiss();
    }, 600);
  }, [dismiss]);

  if (phase === 'gone' || !data) return null;

  const getTransform = () => {
    if (phase === 'enter') return 'scale(0.3) translateY(-30px)';
    if (phase === 'exit') return 'scale(0.9) translateY(-10px)';
    return 'scale(1) translateY(0)';
  };

  const getOpacity = () => {
    if (phase === 'enter') return 0;
    if (phase === 'exit') return 0;
    return 1;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        pointerEvents: phase === 'hold' ? 'auto' : 'none',
        background: phase === 'hold' ? 'rgba(0,0,0,0.5)' : 'transparent',
        transition: 'background 0.3s ease',
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)',
          border: '1px solid rgba(220, 38, 38, 0.6)',
          borderBottom: '3px solid #dc2626',
          padding: '28px 36px',
          maxWidth: 400,
          width: '90vw',
          fontFamily: mono,
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(220,38,38,0.4), 0 20px 40px rgba(0,0,0,0.5)',
          transform: getTransform(),
          opacity: getOpacity(),
          transition: phase === 'enter'
            ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'all 0.6s ease',
          pointerEvents: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <Zap size={24} style={{ marginBottom: 8 }} />
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            DOCUMENT SCAN COMPLETED
          </div>
        </div>

        {/* Document title */}
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <FileText size={12} />
          <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.title}
          </span>
        </div>

        {/* Results grid */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginBottom: 20,
            fontSize: 11,
          }}
        >
          {data.entityCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} />
              <span style={{ fontWeight: 700 }}>{data.entityCount}</span>
              <span style={{ opacity: 0.7 }}>kisi</span>
            </div>
          )}
          {data.relationshipCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} />
              <span style={{ fontWeight: 700 }}>{data.relationshipCount}</span>
              <span style={{ opacity: 0.7 }}>baglanti</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trophy size={14} />
            <span style={{ fontWeight: 700 }}>+{data.reputationAwarded}</span>
            <span style={{ opacity: 0.7 }}>puan</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              fontSize: 10,
              fontFamily: mono,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            TAMAM
          </button>
        </div>
      </div>
    </div>
  );
}
