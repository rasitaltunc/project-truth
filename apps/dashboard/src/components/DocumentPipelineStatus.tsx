'use client';

/**
 * DocumentPipelineStatus — Visual progress indicator for document processing
 * Shows: UPLOAD → VIEW → OCR → AI SCAN → QUARANTINE → NETWORK
 * Federal indictment aesthetic
 */

import React from 'react';
import {
  Upload, Eye, ScanLine, Brain, Shield, Network,
  Check, Loader2, Clock, AlertTriangle,
} from 'lucide-react';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export type PipelineStage =
  | 'uploaded'
  | 'viewing'
  | 'ocr_running'
  | 'ocr_done'
  | 'ai_scanning'
  | 'ai_done'
  | 'quarantine'
  | 'promoted';

interface PipelineStageConfig {
  id: PipelineStage;
  label: string;
  icon: React.ReactNode;
}

const STAGES: PipelineStageConfig[] = [
  { id: 'uploaded', label: 'UPLOAD', icon: <Upload size={14} /> },
  { id: 'viewing', label: 'REVIEW', icon: <Eye size={14} /> },
  { id: 'ocr_done', label: 'OCR', icon: <ScanLine size={14} /> },
  { id: 'ai_done', label: 'AI ANALYSIS', icon: <Brain size={14} /> },
  { id: 'quarantine', label: 'QUARANTINE', icon: <Shield size={14} /> },
  { id: 'promoted', label: 'NETWORK ADDED', icon: <Network size={14} /> },
];

// Map current stage to index
function getStageIndex(stage: PipelineStage): number {
  const map: Record<PipelineStage, number> = {
    uploaded: 0,
    viewing: 1,
    ocr_running: 2,
    ocr_done: 2,
    ai_scanning: 3,
    ai_done: 3,
    quarantine: 4,
    promoted: 5,
  };
  return map[stage] ?? 0;
}

function isRunningStage(stage: PipelineStage): boolean {
  return stage === 'ocr_running' || stage === 'ai_scanning';
}

interface DocumentPipelineStatusProps {
  currentStage: PipelineStage;
  /** Optional: summary counts */
  quarantineStats?: {
    pending: number;
    verified: number;
    rejected: number;
    promoted: number;
  };
}

export default function DocumentPipelineStatus({
  currentStage,
  quarantineStats,
}: DocumentPipelineStatusProps) {
  const currentIndex = getStageIndex(currentStage);
  const isRunning = isRunningStage(currentStage);

  return (
    <div style={{
      padding: '14px 16px',
      background: '#0a0a0a',
      border: '1px solid #222',
      borderRadius: '4px',
      fontFamily: mono,
    }}>
      {/* Pipeline stages */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginBottom: quarantineStats ? '10px' : 0,
      }}>
        {STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          let color = '#333'; // future
          let textColor = '#555';
          let borderColor = '#222';

          if (isComplete) {
            color = '#166534';
            textColor = '#22c55e';
            borderColor = '#166534';
          } else if (isCurrent && isRunning) {
            color = '#78350f';
            textColor = '#f59e0b';
            borderColor = '#92400e';
          } else if (isCurrent) {
            color = '#1e3a5f';
            textColor = '#60a5fa';
            borderColor = '#1d4ed8';
          }

          return (
            <React.Fragment key={stage.id}>
              {/* Stage box */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  background: color,
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: textColor,
                  transition: 'all 0.3s ease',
                }}>
                  {isComplete ? (
                    <Check size={14} />
                  ) : isCurrent && isRunning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    stage.icon
                  )}
                </div>
                <span style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: isFuture ? '#444' : textColor,
                  textAlign: 'center',
                }}>
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div style={{
                  width: '12px',
                  height: '2px',
                  background: isComplete ? '#166534' : '#222',
                  marginTop: '-14px',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Quarantine summary */}
      {quarantineStats && (
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '10px',
          color: '#666',
          paddingTop: '8px',
          borderTop: '1px solid #1a1a1a',
        }}>
          {quarantineStats.pending > 0 && (
            <span>
              <Clock size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {quarantineStats.pending} inceleme bekliyor
            </span>
          )}
          {quarantineStats.verified > 0 && (
            <span style={{ color: '#22c55e' }}>
              <Check size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {quarantineStats.verified} doğrulandı
            </span>
          )}
          {quarantineStats.promoted > 0 && (
            <span style={{ color: '#60a5fa' }}>
              <Network size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {quarantineStats.promoted} ağa eklendi
            </span>
          )}
          {quarantineStats.rejected > 0 && (
            <span style={{ color: '#ef4444' }}>
              <AlertTriangle size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {quarantineStats.rejected} reddedildi
            </span>
          )}
        </div>
      )}
    </div>
  );
}
