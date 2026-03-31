'use client';

/**
 * InvestigationRoom — The cinematic container
 *
 * This is NOT a modal. This is a room you enter.
 * Spring physics, backdrop blur, staggered content reveal.
 *
 * Research ref: Diegetic UI (Diegetic Interface concept)
 * — panel feels pulled from the 3D data sea, not a web overlay
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crosshair, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InvestigationRoomProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTasksCompleted: number;
  sessionCorrect: number;
  children: React.ReactNode;
}

export default function InvestigationRoom({
  isOpen,
  onClose,
  sessionTasksCompleted,
  sessionCorrect,
  children,
}: InvestigationRoomProps) {
  const t = useTranslations('game');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — 3D world dims but doesn't vanish */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* The Room — heavy file dropping onto desk */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.92,
              y: 30,
              rotateX: 4,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              rotateX: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 20,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 28,
              mass: 0.8,
            }}
            className="fixed right-4 top-16 bottom-4 z-[1000] flex flex-col overflow-hidden"
            style={{
              width: 460,
              maxWidth: 'calc(100vw - 32px)',
              perspective: '1200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outer glow border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-red-900/20 via-transparent to-transparent pointer-events-none" />

            {/* Main container */}
            <div className="relative flex flex-col h-full rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #0c0c0c 0%, #080808 100%)',
                border: '1px solid rgba(220, 38, 38, 0.12)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 40px rgba(220,38,38,0.05)',
              }}
            >
              {/* === HEADER === */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Pulsing investigation indicator */}
                <div className="relative">
                  <Crosshair size={16} className="text-red-600" />
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)' }}
                  />
                </div>

                {/* Title — Courier for classified feel */}
                <span
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{
                    color: '#dc2626',
                    fontFamily: '"Courier New", Courier, monospace',
                    textShadow: '0 0 20px rgba(220,38,38,0.3)',
                  }}
                >
                  {t('title')}
                </span>

                {/* Session stats */}
                <div className="ml-auto flex items-center gap-3">
                  {sessionTasksCompleted > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <Zap size={10} className="text-emerald-500" />
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {sessionTasksCompleted} {t('tasks')}
                        {sessionCorrect > 0 && (
                          <span className="text-emerald-600 ml-1">
                            · {sessionCorrect} ✓
                          </span>
                        )}
                      </span>
                    </motion.div>
                  )}

                  {/* Close button — minimal, always accessible */}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md transition-all duration-200 hover:bg-white/5 text-neutral-600 hover:text-neutral-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>

              {/* === CONTENT with staggered reveal === */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.08,
                      delayChildren: 0.2,
                    },
                  },
                }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {children}
              </motion.div>

              {/* Bottom edge glow */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.15), transparent)' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
