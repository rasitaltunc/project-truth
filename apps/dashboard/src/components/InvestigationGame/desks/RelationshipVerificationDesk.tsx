'use client';

/**
 * RelationshipVerificationDesk — Two node cards + proposed connection
 *
 * Layout:
 *   [ SOURCE NODE ] ──── proposed link ──── [ TARGET NODE ]
 *
 * Below each node: known connections from the network (mini context)
 * Center: The proposed relationship details + evidence
 *
 * The user judges: Does this connection make sense?
 * Is the relationship type correct?
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  User, Building, MapPin, ArrowRight, GitBranch, FileText,
  AlertCircle, Shield, ExternalLink, Database,
} from 'lucide-react';
import type { InvestigationTask, DocumentContext } from '@/store/investigationGameStore';

// ─── Helpers ────────────────────────────────────────────────────────

function getSourceBadge(provider?: string): { label: string; color: string } {
  switch (provider?.toLowerCase()) {
    case 'icij': return { label: 'ICIJ', color: '#f59e0b' };
    case 'opensanctions': return { label: 'OpenSanctions', color: '#8b5cf6' };
    case 'courtlistener': return { label: 'CourtListener', color: '#3b82f6' };
    case 'groq': return { label: 'AI Extraction', color: '#ef4444' };
    default: return { label: provider || 'Unknown', color: '#6b7280' };
  }
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  PERSON: <User size={18} />,
  ORGANIZATION: <Building size={18} />,
  LOCATION: <MapPin size={18} />,
};

// ─── Main Component ────────────────────────────────────────────────

interface RelationshipVerificationDeskProps {
  task: InvestigationTask;
  document: DocumentContext | null;
}

export default function RelationshipVerificationDesk({ task, document }: RelationshipVerificationDeskProps) {
  const { task_data, context_data } = task;

  const sourceEntity = task_data.source_entity || task_data.entity_name || 'Unknown Source';
  const targetEntity = task_data.target_entity || '—';
  const relationshipType = task_data.relationship_type || 'unknown';
  const sourceBadge = getSourceBadge(task_data.source_provider);
  const sourceUrl = task_data.source_url || (context_data as Record<string, string>)?.source_url;

  // Relationship type styling
  const relColor = getRelationshipColor(relationshipType);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4">
      {/* Source document context */}
      <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Database size={12} className="text-neutral-600" />
        <span className="text-[9px] font-mono text-neutral-500 tracking-wider uppercase">SOURCE:</span>
        {document && (
          <span className="text-[10px] text-neutral-400">{document.title}</span>
        )}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono"
          style={{
            background: sourceBadge.color + '15',
            color: sourceBadge.color,
            border: `1px solid ${sourceBadge.color}25`,
          }}
        >
          <Shield size={8} />
          {sourceBadge.label}
        </span>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors ml-auto"
          >
            <ExternalLink size={9} /> View source
          </a>
        )}
      </div>

      {/* ═══ NODE CARDS + CONNECTION ═══ */}
      <div className="flex items-center gap-4 mb-6">
        {/* Source Node */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1"
        >
          <NodeCard
            name={sourceEntity}
            type={task_data.entity_type || 'PERSON'}
            side="source"
          />
        </motion.div>

        {/* Connection Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div
            className="px-3 py-1.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase"
            style={{
              background: relColor + '15',
              color: relColor,
              border: `1px solid ${relColor}30`,
            }}
          >
            {relationshipType.replace(/_/g, ' ')}
          </div>
          <div className="flex items-center gap-1" style={{ color: relColor + '60' }}>
            <div className="w-8 h-px" style={{ background: relColor + '40' }} />
            <ArrowRight size={12} />
            <div className="w-8 h-px" style={{ background: relColor + '40' }} />
          </div>
          <span className="text-[8px] text-neutral-700 font-mono">PROPOSED</span>
        </motion.div>

        {/* Target Node */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1"
        >
          <NodeCard
            name={targetEntity}
            type="PERSON"
            side="target"
          />
        </motion.div>
      </div>

      {/* ═══ RELATIONSHIP DETAILS ═══ */}
      <div
        className="p-4 rounded-lg mb-4"
        style={{
          background: 'rgba(139,92,246,0.04)',
          border: '1px solid rgba(139,92,246,0.1)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={12} style={{ color: '#8b5cf6' }} />
          <span className="text-[9px] font-mono text-purple-400/70 tracking-wider uppercase">
            PROPOSED RELATIONSHIP
          </span>
        </div>

        <div className="space-y-2 text-[10px]">
          <div className="flex items-center gap-3">
            <span className="text-neutral-600 font-mono uppercase w-24 flex-shrink-0">Type</span>
            <span className="text-neutral-300 font-medium">{relationshipType.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-600 font-mono uppercase w-24 flex-shrink-0">Confidence</span>
            <span className="font-mono font-bold" style={{
              color: task_data.confidence >= 0.7 ? '#10b981' : task_data.confidence >= 0.4 ? '#f59e0b' : '#ef4444'
            }}>
              {Math.round(task_data.confidence * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-600 font-mono uppercase w-24 flex-shrink-0">Source</span>
            <span className="text-neutral-400">{task_data.source_type?.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-neutral-600 font-mono uppercase w-24 flex-shrink-0">Reviews</span>
            <span className="text-neutral-400 font-mono">{task.completed_count} / {task.required_reviews}</span>
          </div>
        </div>

        {/* Raw data if available */}
        {task_data.raw_data && Object.keys(task_data.raw_data).length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[8px] font-mono text-neutral-700 tracking-wider uppercase">RAW DATA</span>
            <div className="mt-1.5 space-y-1">
              {Object.entries(task_data.raw_data).slice(0, 6).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-[9px]">
                  <span className="text-neutral-600 font-mono w-24 flex-shrink-0">{key.replace(/_/g, ' ')}</span>
                  <span className="text-neutral-500 break-all">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verification guide */}
      <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <AlertCircle size={11} className="text-neutral-700 mt-0.5 flex-shrink-0" />
        <span className="text-[9px] text-neutral-600 leading-relaxed">
          Verify that this relationship between the two entities exists in the source.
          Consider: Is the relationship type accurate? Is there sufficient evidence?
          Check the source document for corroborating details.
        </span>
      </div>
    </div>
  );
}

// ─── Node Card ──────────────────────────────────────────────────────

function NodeCard({ name, type, side }: { name: string; type: string; side: 'source' | 'target' }) {
  const icon = ENTITY_ICONS[type] || <User size={18} />;
  const borderColor = side === 'source' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)';
  const accentColor = side === 'source' ? '#3b82f6' : '#10b981';

  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
        style={{
          background: accentColor + '12',
          color: accentColor,
        }}
      >
        {icon}
      </div>
      <div className="text-sm font-semibold text-neutral-200 leading-snug">
        {name}
      </div>
      <div className="text-[9px] font-mono text-neutral-600 mt-0.5 uppercase tracking-wider">
        {type}
      </div>
      <div className="text-[8px] font-mono mt-1 uppercase tracking-wider" style={{ color: accentColor + '70' }}>
        {side}
      </div>
    </div>
  );
}

// ─── Relationship Color ─────────────────────────────────────────────

function getRelationshipColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('financial') || t.includes('money') || t.includes('fund')) return '#10b981';
  if (t.includes('court') || t.includes('legal') || t.includes('indict')) return '#f59e0b';
  if (t.includes('associate') || t.includes('friend') || t.includes('social')) return '#3b82f6';
  if (t.includes('employ') || t.includes('work') || t.includes('staff')) return '#8b5cf6';
  if (t.includes('family') || t.includes('spouse') || t.includes('child')) return '#ec4899';
  return '#8b5cf6';
}
