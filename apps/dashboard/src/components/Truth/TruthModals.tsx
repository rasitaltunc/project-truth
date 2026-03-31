'use client';

import dynamic from 'next/dynamic';
import { X, Brain, Shield } from 'lucide-react';
import { DocumentSubmission } from '@/components/DocumentSubmission';
import { FollowTheMoneyPanel } from '@/components/FollowTheMoneyPanel';
import { SystemPulsePanel } from '@/components/SystemPulsePanel';
import { ConnectionTimelinePanel, ConnectionData } from '@/components/ConnectionTimelinePanel';
import IsikTutForm from '@/components/IsikTutForm';
import { useInvestigationStore } from '@/store/investigationStore';

// Dynamic imports for SSR
const DeadManSwitchPanel = dynamic(
  () => import('@/components/DeadManSwitchPanel'),
  { ssr: false, loading: () => null }
);

const CollectiveShieldPanel = dynamic(
  () => import('@/components/CollectiveShieldPanel'),
  { ssr: false, loading: () => null }
);

const DocumentOCRUpload = dynamic(
  () => import('@/components/DocumentOCRUpload'),
  { ssr: false, loading: () => null }
);

const MediaUploader = dynamic(
  () => import('@/components/MediaUpload/MediaUploader'),
  { ssr: false, loading: () => null }
);

const DocumentArchivePanel = dynamic(
  () => import('@/components/DocumentArchivePanel'),
  { ssr: false, loading: () => null }
);

const ScanCompletionCelebration = dynamic(
  () => import('@/components/ScanCompletionCelebration'),
  { ssr: false, loading: () => null }
);

const ProfilePanel = dynamic(
  () => import('@/components/ProfilePanel'),
  { ssr: false, loading: () => null }
);

export interface TruthModalsProps {
  // Modal states
  showDocSubmit: boolean;
  setShowDocSubmit: (v: boolean) => void;
  showMoneyTracker: boolean;
  setShowMoneyTracker: (v: boolean) => void;
  showSystemPulse: boolean;
  setShowSystemPulse: (v: boolean) => void;
  showIsikTut: boolean;
  setShowIsikTut: (v: boolean) => void;
  showDMS: boolean;
  setShowDMS: (v: boolean) => void;
  showCollectiveShield: boolean;
  setShowCollectiveShield: (v: boolean) => void;
  showProfilePanel: boolean;
  setShowProfilePanel: (v: boolean) => void;
  isDocArchiveOpen: boolean;
  setDocArchiveOpen: (v: boolean) => void;
  // Data
  selectedNode: any;
  selectedConnection: ConnectionData | null;
  setSelectedConnection: (v: ConnectionData | null) => void;
  nodes: any[];
  activeNetworkId: string;
}

export function TruthModals({
  showDocSubmit,
  setShowDocSubmit,
  showMoneyTracker,
  setShowMoneyTracker,
  showSystemPulse,
  setShowSystemPulse,
  showIsikTut,
  setShowIsikTut,
  showDMS,
  setShowDMS,
  showCollectiveShield,
  setShowCollectiveShield,
  showProfilePanel,
  setShowProfilePanel,
  isDocArchiveOpen,
  setDocArchiveOpen,
  selectedNode,
  selectedConnection,
  setSelectedConnection,
  nodes,
  activeNetworkId,
}: TruthModalsProps) {
  return (
    <>
      {/* DOCUMENT MODAL — ANALYZE DOC */}
      {showDocSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          <div
            onClick={() => setShowDocSubmit(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(6px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'auto',
              backgroundColor: '#0a0a0a',
              border: '1px solid #dc2626',
              borderTop: '3px solid #dc2626',
              borderRadius: '0',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #7f1d1d40',
                background: 'linear-gradient(180deg, #1a050580, transparent)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={18} style={{ color: '#dc2626' }} />
                <span
                  style={{
                    fontSize: '11px',
                    color: '#dc2626',
                    letterSpacing: '0.2em',
                    fontWeight: 700,
                  }}
                >
                  ANALYZE DOCUMENT
                </span>
              </div>
              <button
                onClick={() => setShowDocSubmit(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <DocumentSubmission />
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid #7f1d1d20',
                }}
              >
                <DocumentOCRUpload />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW THE MONEY MODAL */}
      {showMoneyTracker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={() => setShowMoneyTracker(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid #22c55e40',
              borderTop: '3px solid #22c55e',
              borderRadius: '0',
            }}
          >
            <FollowTheMoneyPanel
              isModal={true}
              onClose={() => setShowMoneyTracker(false)}
              entityId={selectedNode?.id}
              entityName={selectedNode?.label}
            />
          </div>
        </div>
      )}

      {/* SYSTEM PULSE MODAL */}
      {showSystemPulse && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={() => setShowSystemPulse(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflow: 'auto',
              border: '1px solid #dc2626',
              borderTop: '3px solid #dc2626',
              borderRadius: '4px',
            }}
          >
            <SystemPulsePanel
              isModal={true}
              onClose={() => setShowSystemPulse(false)}
            />
          </div>
        </div>
      )}

      {/* SPOTLIGHT — COMMUNITY EVIDENCE FORM */}
      {showIsikTut && (
        <IsikTutForm
          nodes={nodes}
          preSelectedNodeId={selectedNode?.id}
          onClose={() => setShowIsikTut(false)}
          onSuccess={() => setTimeout(() => setShowIsikTut(false), 2000)}
        />
      )}

      {/* JOURNALIST SHIELD (DMS) MODAL */}
      {showDMS && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={() => setShowDMS(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(6px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '85vh',
              overflow: 'auto',
              backgroundColor: '#0a0a0a',
              border: '1px solid #8b5cf6',
              borderTop: '3px solid #8b5cf6',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #8b5cf620',
                background: 'linear-gradient(180deg, #1a0a2580, transparent)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={18} style={{ color: '#8b5cf6' }} />
                <span
                  style={{
                    fontSize: '11px',
                    color: '#8b5cf6',
                    letterSpacing: '0.2em',
                    fontWeight: 700,
                  }}
                >
                  JOURNALIST SHIELD — DEAD MAN SWITCH
                </span>
              </div>
              <button
                onClick={() => setShowDMS(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <DeadManSwitchPanel />
              {/* Media Upload */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid #1a1a1a',
                }}
              >
                <MediaUploader
                  fingerprint={
                    useInvestigationStore.getState().fingerprint || 'anon'
                  }
                  nodeId={selectedNode?.id}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLECTIVE SHIELD PANEL */}
      {showCollectiveShield && (
        <CollectiveShieldPanel
          fingerprint={
            useInvestigationStore.getState().fingerprint || 'anon'
          }
          displayName={undefined}
          onClose={() => setShowCollectiveShield(false)}
        />
      )}

      {/* CONNECTION TIMELINE */}
      {selectedConnection && (
        <ConnectionTimelinePanel
          connection={selectedConnection}
          onClose={() => setSelectedConnection(null)}
        />
      )}

      {/* SPRINT 16: SCAN PROTOCOL — Document Archive Panel */}
      {isDocArchiveOpen && (
        <DocumentArchivePanel
          networkId={activeNetworkId}
          fingerprint={
            useInvestigationStore.getState().fingerprint || 'anon'
          }
          onClose={() => setDocArchiveOpen(false)}
        />
      )}

      {/* SPRINT 16.5: Scan Completion Celebration */}
      <ScanCompletionCelebration />

      {/* SPRINT 6A: PROFILE PANEL — Badge, Reputation, Leaderboard, Nominations */}
      <ProfilePanel
        isOpen={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
        networkId={activeNetworkId}
      />
    </>
  );
}
