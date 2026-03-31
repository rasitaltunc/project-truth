'use client';

// ═══════════════════════════════════════════
// THREADING MODE — Sprint 10
// İP UZAT aktifken: bilgi bandı + iptal butonu
// Kaynak node'dan kursöre hayalet çizgi (3D canvas tarafında)
// ═══════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, X, Target } from 'lucide-react';
import { useThreadingStore } from '@/store/threadingStore';

export default function ThreadingMode() {
  const {
    isThreadingActive,
    sourceNodeId,
    sourceNodeLabel,
    stopThreading,
  } = useThreadingStore();

  return (
    <AnimatePresence>
      {isThreadingActive && (
        <motion.div
          key="threading-mode-bar"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 20px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #dc262660',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.15)',
          }}
        >
          {/* Pulse indicator */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
            }}
          />

          {/* Icon */}
          <ArrowLeftRight size={14} style={{ color: '#dc2626' }} />

          {/* Label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: '#dc2626',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 700,
            }}>
              İP UZAT MODU
            </span>
            <span style={{
              fontSize: '10px',
              color: '#888',
              fontFamily: 'ui-monospace, monospace',
            }}>
              Kaynak: <span style={{ color: '#e5e5e5' }}>{sourceNodeLabel || sourceNodeId}</span>
              <span style={{ color: '#555', margin: '0 6px' }}>→</span>
              <Target size={10} style={{ color: '#dc2626', verticalAlign: 'middle' }} />
              <span style={{ color: '#dc2626', marginLeft: '4px' }}>Hedef node secin</span>
            </span>
          </div>

          {/* Cancel button */}
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: '#dc262620' }}
            whileTap={{ scale: 0.9 }}
            onClick={stopThreading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#666',
              marginLeft: '8px',
              transition: 'all 0.2s',
            }}
          >
            <X size={14} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
