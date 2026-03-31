'use client';

// ============================================
// PROJECT TRUTH: INVESTIGATION BANNER
// Sprint 4 — "Bu Soruşturmayı Yayınla"
// ChatPanel'in altında, 2+ adım sonrası gösterilir
// ============================================

import { useState } from 'react';
import Link from 'next/link';
import {
  useInvestigationStore,
  useCurrentInvestigation,
  useInvestigationSteps,
  useIsPublishModalOpen,
} from '@/store/investigationStore';

export default function InvestigationBanner() {
  const currentInvestigation = useCurrentInvestigation();
  const steps = useInvestigationSteps();
  const isPublishModalOpen = useIsPublishModalOpen();
  const { openPublishModal, closePublishModal, publishInvestigation } = useInvestigationStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  // En az 1 adım olmalı
  if (!currentInvestigation || steps.length < 1) return null;

  // Yayınlanmış ama henüz local published flag set edilmemişse:
  // Yeni soruşturma başlatma butonu göster
  if (currentInvestigation.status === 'published' && !published) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.06))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '10px 16px',
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#93c5fd', fontSize: '12px', fontFamily: '"Courier New", monospace', letterSpacing: '0.05em' }}>
          ✓ PREVIOUS INVESTIGATION PUBLISHED
        </span>
        <button
          onClick={() => {
            useInvestigationStore.getState().resetInvestigation();
          }}
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '4px',
            padding: '4px 12px',
            color: '#93c5fd',
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          NEW INVESTIGATION →
        </button>
      </div>
    );
  }

  // Yayınlandıktan sonra tebrik göster
  if (published && publishedId) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(21, 128, 61, 0.08))',
        border: '1px solid rgba(22, 163, 74, 0.4)',
        borderRadius: '8px',
        padding: '12px 16px',
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: '#4ade80', fontSize: '16px' }}>✓</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#4ade80', fontSize: '12px', fontFamily: 'Courier New, monospace', fontWeight: 'bold' }}>
            INVESTIGATION PUBLISHED
          </div>
          <div style={{ color: '#86efac', fontSize: '11px', marginTop: '2px' }}>
            The community can view and continue this investigation.
          </div>
        </div>
        <Link
          href={`/truth/investigations/${publishedId}`}
          style={{
            background: 'rgba(22, 163, 74, 0.2)',
            border: '1px solid rgba(22, 163, 74, 0.5)',
            color: '#4ade80',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            cursor: 'pointer',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          VIEW →
        </Link>
      </div>
    );
  }

  const handlePublish = async () => {
    if (!title.trim()) return;
    setIsPublishing(true);
    try {
      const result = await publishInvestigation(title.trim(), description.trim());
      if (result) {
        setPublished(true);
        setPublishedId(result.id);
        closePublishModal();
      }
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(153, 27, 27, 0.15), rgba(127, 29, 29, 0.08))',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: '8px',
        padding: '10px 14px',
        margin: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {/* Kayıt göstergesi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <div style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#dc2626',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{
            color: '#dc2626',
            fontSize: '10px',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
          }}>
            REC
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fca5a5', fontSize: '12px', fontFamily: 'Courier New, monospace' }}>
            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{steps.length}</span>
            {' '}-step investigation recorded
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '10px', marginTop: '1px', fontFamily: 'Courier New, monospace' }}>
            Share with community — others can continue
          </div>
        </div>

        <button
          onClick={openPublishModal}
          style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            color: '#fca5a5',
            padding: '5px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'Courier New, monospace',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220, 38, 38, 0.2)';
          }}
        >
          PUBLISH
        </button>
      </div>

      {/* Publish Modal */}
      {isPublishModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) closePublishModal();
          }}
        >
          <div style={{
            background: '#0a0a0a',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            borderRadius: '12px',
            padding: '28px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 0 60px rgba(220, 38, 38, 0.15)',
          }}>
            {/* Header */}
            <div style={{
              borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                color: '#dc2626',
                fontSize: '11px',
                fontFamily: 'Courier New, monospace',
                letterSpacing: '0.15em',
                marginBottom: '6px',
              }}>
                INVESTIGATION FILE
              </div>
              <h3 style={{
                color: '#e5e5e5',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
                fontFamily: 'system-ui, sans-serif',
              }}>
                Publish Investigation
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '13px',
                marginTop: '6px',
                marginBottom: 0,
                fontFamily: 'system-ui, sans-serif',
              }}>
                This {steps.length}-step investigation will be shared with the community.
                Others can continue where you left off.
              </p>
            </div>

            {/* Steps preview */}
            <div style={{
              background: 'rgba(220, 38, 38, 0.05)',
              border: '1px solid rgba(220, 38, 38, 0.15)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '20px',
            }}>
              {steps.slice(0, 3).map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: i < Math.min(steps.length, 3) - 1 ? '6px' : 0,
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    color: '#dc2626',
                    fontSize: '10px',
                    fontFamily: 'Courier New, monospace',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}>
                    {i + 1}.
                  </span>
                  <span style={{
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {step.query}
                  </span>
                </div>
              ))}
              {steps.length > 3 && (
                <div style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px', fontFamily: 'Courier New, monospace' }}>
                  + {steps.length - 3} more steps...
                </div>
              )}
            </div>

            {/* Title input */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block',
                color: '#9ca3af',
                fontSize: '12px',
                fontFamily: 'Courier New, monospace',
                marginBottom: '6px',
                letterSpacing: '0.05em',
              }}>
                TITLE *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Example: Victim Profiles in Epstein Network"
                maxLength={100}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${title.trim() ? 'rgba(220, 38, 38, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#e5e5e5',
                  fontSize: '14px',
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
            </div>

            {/* Description input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#9ca3af',
                fontSize: '12px',
                fontFamily: 'Courier New, monospace',
                marginBottom: '6px',
                letterSpacing: '0.05em',
              }}>
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What were you investigating? What are you leaving for others?"
                maxLength={300}
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#e5e5e5',
                  fontSize: '13px',
                  fontFamily: 'system-ui, sans-serif',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={closePublishModal}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#6b7280',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handlePublish}
                disabled={!title.trim() || isPublishing}
                style={{
                  flex: 2,
                  background: title.trim() && !isPublishing
                    ? 'rgba(220, 38, 38, 0.3)'
                    : 'rgba(220, 38, 38, 0.1)',
                  border: `1px solid ${title.trim() ? 'rgba(220, 38, 38, 0.6)' : 'rgba(220, 38, 38, 0.2)'}`,
                  color: title.trim() && !isPublishing ? '#fca5a5' : '#7f1d1d',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'Courier New, monospace',
                  cursor: title.trim() && !isPublishing ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  letterSpacing: '0.08em',
                  transition: 'all 0.2s',
                }}
              >
                {isPublishing ? 'PUBLISHING...' : 'PUBLISH →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}
