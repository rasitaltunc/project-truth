'use client';

/**
 * FosforluKalemMasasi — "Highlighter Desk"
 *
 * Full-screen document review with colored entity highlights.
 * Two layers: Clean text ↔ AI-annotated text (opacity slider).
 * Click any highlight → entity popover (verify/reject/edit).
 *
 * Philosophy: "İnsana belgeyi göster, araçları ver, yoldan çekil."
 * Created: 27 Mart 2026 — Founders consensus pivot from entity-based tasks.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, User, Building2, MapPin, Calendar, DollarSign, Hash,
  CheckCircle, XCircle, Edit3, ChevronDown, ExternalLink, AlertTriangle,
  Layers, FileText, Plus, X, MessageSquare, ArrowLeft, Link2, Zap,
  BookOpen, Quote,
} from 'lucide-react';
import type { EntityRecord, RelationshipRecord, ScanResultData, DerivedItem } from '@/store/documentStore';
import { useDocumentStore } from '@/store/documentStore';
import { enrichEntities, type EnrichmentResult } from '@/lib/enrichmentEngine';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ═══════════════════════════════════════════
// ENTITY HIGHLIGHT CONFIG
// ═══════════════════════════════════════════

interface EntityHighlightConfig {
  bg: string;
  bgSolid: string;
  text: string;
  border: string;
  label: string;
  icon: React.ReactNode;
}

const ENTITY_HIGHLIGHT: Record<string, EntityHighlightConfig> = {
  person:       { bg: 'rgba(220, 38, 38, 0.18)', bgSolid: '#dc2626', text: '#ef4444', border: 'rgba(220, 38, 38, 0.4)', label: 'KİŞİ', icon: <User size={11} /> },
  organization: { bg: 'rgba(59, 130, 246, 0.18)', bgSolid: '#3b82f6', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)', label: 'KURULUŞ', icon: <Building2 size={11} /> },
  location:     { bg: 'rgba(34, 197, 94, 0.18)',  bgSolid: '#22c55e', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)',  label: 'YER', icon: <MapPin size={11} /> },
  date:         { bg: 'rgba(234, 179, 8, 0.18)',  bgSolid: '#eab308', text: '#facc15', border: 'rgba(234, 179, 8, 0.4)',  label: 'TARİH', icon: <Calendar size={11} /> },
  money:        { bg: 'rgba(168, 85, 247, 0.18)', bgSolid: '#a855f7', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)', label: 'FİNANSAL', icon: <DollarSign size={11} /> },
  account:      { bg: 'rgba(249, 115, 22, 0.18)', bgSolid: '#f97316', text: '#fb923c', border: 'rgba(249, 115, 22, 0.4)', label: 'HESAP', icon: <Hash size={11} /> },
};

const DEFAULT_HIGHLIGHT: EntityHighlightConfig = {
  bg: 'rgba(150, 150, 150, 0.18)', bgSolid: '#666', text: '#999', border: 'rgba(150,150,150,0.4)', label: 'DİĞER', icon: <FileText size={11} />,
};

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface AnnotatedSpan {
  text: string;
  isEntity: boolean;
  entity?: EntityRecord;
  entityIndex?: number;
  startIdx: number;
  endIdx: number;
}

// ═══════════════════════════════════════════
// CLAIM / CONTEXT TYPES
// ═══════════════════════════════════════════

type ViewMode = 'fosforlu' | 'baglam' | 'temiz';

interface ClaimSentence {
  id: string;          // Unique claim ID: CLM-{docHash}-{idx}
  text: string;        // The full sentence text
  startIdx: number;    // Position in raw text
  endIdx: number;
  entities: EntityRecord[];   // Entities found in this sentence
  entityIndices: number[];    // Indices into the master entity list
  hasDate: boolean;           // Contains a date entity
  hasLocation: boolean;       // Contains a location entity
  hasPerson: boolean;         // Contains a person entity
  hasOrg: boolean;            // Contains an org entity
  hasMoney: boolean;          // Contains a financial entity
  entityCount: number;        // Total entities in this sentence
}

interface ClaimAnnotatedSpan {
  text: string;
  isClaim: boolean;        // Is this part of a claim sentence?
  isEntity: boolean;       // Is this specific span an entity within the claim?
  claim?: ClaimSentence;
  entity?: EntityRecord;
  entityIndex?: number;
  startIdx: number;
  endIdx: number;
}

interface PopoverState {
  entity: EntityRecord;
  entityIndex: number;
  rect: DOMRect;
  relationships: RelationshipRecord[];
}

interface ClaimPopoverState {
  claim: ClaimSentence;
  rect: DOMRect;
}

// ═══════════════════════════════════════════
// SENTENCE PARSER
// ═══════════════════════════════════════════

/**
 * Split text into sentences. Handles:
 * - Standard punctuation (. ! ?)
 * - Abbreviations (Mr. Mrs. Dr. U.S. etc.)
 * - Numbers with dots (123.45)
 * - Newline-separated lines (common in OCR text)
 */
function splitIntoSentences(text: string): Array<{ text: string; start: number; end: number }> {
  if (!text) return [];

  const sentences: Array<{ text: string; start: number; end: number }> = [];

  // Common abbreviations that shouldn't trigger sentence breaks
  const abbreviations = new Set([
    'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
    'inc', 'corp', 'ltd', 'llc', 'co', 'dept', 'div', 'est', 'approx',
    'vol', 'no', 'vs', 'etc', 'al', 'fig', 'ref', 'rev', 'gen', 'gov',
    'sgt', 'cpl', 'pvt', 'capt', 'lt', 'col', 'maj', 'cmdr', 'adm',
    'u.s', 'u.k', 'e.g', 'i.e', 'a.m', 'p.m',
  ]);

  // Strategy: split on sentence-ending punctuation, then merge false splits
  // First, split on double newlines (paragraph breaks) — always a boundary
  const paragraphs = text.split(/\n\s*\n/);
  let globalOffset = 0;

  for (const para of paragraphs) {
    if (para.trim().length === 0) {
      globalOffset += para.length + 2; // +2 for the \n\n
      continue;
    }

    // Within a paragraph, split on sentence-ending patterns
    // Match: (text ending with . ! ? or ;) followed by whitespace and uppercase or quote
    const sentenceRegex = /[^.!?;]*(?:[.!?;](?:\s|$)|$)/g;
    let match: RegExpExecArray | null;
    let paraOffset = 0;
    const rawSentences: Array<{ text: string; start: number }> = [];

    // Simple approach: scan for . ! ? followed by space+uppercase
    let current = '';
    let currentStart = 0;

    for (let i = 0; i < para.length; i++) {
      current += para[i];
      const ch = para[i];

      if (ch === '.' || ch === '!' || ch === '?' || ch === ';') {
        // Check if this is a real sentence boundary
        const nextChar = i + 1 < para.length ? para[i + 1] : ' ';
        const nextNextChar = i + 2 < para.length ? para[i + 2] : '';

        // Not a boundary if:
        // 1. Next char is not whitespace or end of text
        if (ch === '.' && nextChar !== ' ' && nextChar !== '\n' && i + 1 < para.length) {
          continue;
        }

        // 2. Word before dot is an abbreviation
        if (ch === '.') {
          const wordBefore = current.trim().split(/\s+/).pop()?.replace('.', '').toLowerCase() || '';
          if (abbreviations.has(wordBefore)) {
            continue;
          }
          // Single letter + dot (likely initial like "J.")
          if (wordBefore.length === 1) {
            continue;
          }
        }

        // This looks like a sentence boundary
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          rawSentences.push({ text: trimmed, start: currentStart });
        }
        current = '';
        currentStart = i + 1;
      } else if (ch === '\n') {
        // Single newline in OCR text — often a line break within a sentence,
        // but sometimes a sentence boundary. Treat as boundary if current text
        // looks like a complete sentence (has some substance).
        if (current.trim().length > 40) {
          const trimmed = current.trim();
          rawSentences.push({ text: trimmed, start: currentStart });
          current = '';
          currentStart = i + 1;
        }
      }
    }

    // Don't forget remaining text
    if (current.trim().length > 0) {
      rawSentences.push({ text: current.trim(), start: currentStart });
    }

    // Convert to global offsets
    for (const s of rawSentences) {
      const globalStart = globalOffset + s.start;
      sentences.push({
        text: s.text,
        start: globalStart,
        end: globalStart + s.text.length,
      });
    }

    globalOffset += para.length + 2; // +2 for paragraph separator
  }

  // Filter out very short "sentences" (likely noise)
  return sentences.filter(s => s.text.length >= 10);
}

// ═══════════════════════════════════════════
// CLAIM DETECTION ENGINE (Yol B — Rule-based)
// ═══════════════════════════════════════════

/**
 * Identifies sentences containing known entities and marks them as "claims."
 * No AI calls needed — uses existing entity list + sentence splitting.
 */
function detectClaims(
  text: string,
  entities: EntityRecord[],
  documentId: string
): ClaimSentence[] {
  if (!text || !entities || entities.length === 0) return [];

  const sentences = splitIntoSentences(text);
  const normalizedText = text.toLowerCase();
  const claims: ClaimSentence[] = [];

  // Build entity search variants (same logic as buildAnnotatedSpans)
  const entityVariants: Array<{ names: string[]; entity: EntityRecord; idx: number }> = [];

  entities.forEach((entity, idx) => {
    if (!entity.name || entity.name.length < 2) return;
    const normalizedName = entity.name.toLowerCase();
    const variants: string[] = [normalizedName];

    const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 0);
    if (nameParts.length >= 2) {
      const surname = nameParts[nameParts.length - 1];
      if (surname.length >= 4) variants.push(surname);
    }
    if (entity.type === 'organization') {
      const abbrMatch = entity.name.match(/[""(]([^""()]+)["")/]/);
      if (abbrMatch && abbrMatch[1].length >= 2) variants.push(abbrMatch[1].toLowerCase());
    }

    entityVariants.push({ names: variants, entity, idx });
  });

  // Generate short hash for claim IDs
  const docHash = documentId.substring(0, 6).toUpperCase();

  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si];
    const sentNorm = sentence.text.toLowerCase();

    const foundEntities: EntityRecord[] = [];
    const foundIndices: number[] = [];

    for (const ev of entityVariants) {
      for (const variant of ev.names) {
        if (sentNorm.includes(variant)) {
          // Word boundary check for short names
          if (variant.length < 6 && variant !== ev.names[0]) {
            const pos = sentNorm.indexOf(variant);
            const before = pos > 0 ? sentNorm[pos - 1] : ' ';
            const after = pos + variant.length < sentNorm.length ? sentNorm[pos + variant.length] : ' ';
            if (!/[\s,.:;()\-/]/.test(before) || !/[\s,.:;()\-/]/.test(after)) {
              continue;
            }
          }
          if (!foundIndices.includes(ev.idx)) {
            foundEntities.push(ev.entity);
            foundIndices.push(ev.idx);
          }
          break; // Found this entity, move to next
        }
      }
    }

    // Only mark as claim if sentence contains at least one entity
    if (foundEntities.length > 0) {
      claims.push({
        id: `CLM-${docHash}-${String(si + 1).padStart(3, '0')}`,
        text: sentence.text,
        startIdx: sentence.start,
        endIdx: sentence.end,
        entities: foundEntities,
        entityIndices: foundIndices,
        hasDate: foundEntities.some(e => e.type === 'date'),
        hasLocation: foundEntities.some(e => e.type === 'location'),
        hasPerson: foundEntities.some(e => e.type === 'person'),
        hasOrg: foundEntities.some(e => e.type === 'organization'),
        hasMoney: foundEntities.some(e => e.type === 'money'),
        entityCount: foundEntities.length,
      });
    }
  }

  return claims;
}

/**
 * Build annotated spans for CONTEXT mode — highlights full sentences as claims,
 * with entity names within them getting their own entity-type color.
 */
function buildClaimAnnotatedSpans(
  text: string,
  claims: ClaimSentence[],
  entities: EntityRecord[]
): ClaimAnnotatedSpan[] {
  if (!text || claims.length === 0) {
    return [{ text, isClaim: false, isEntity: false, startIdx: 0, endIdx: text.length }];
  }

  const spans: ClaimAnnotatedSpan[] = [];
  let cursor = 0;

  // Sort claims by position
  const sortedClaims = [...claims].sort((a, b) => a.startIdx - b.startIdx);

  for (const claim of sortedClaims) {
    // Skip if claim overlaps with previous
    if (claim.startIdx < cursor) continue;

    // Text before this claim
    if (claim.startIdx > cursor) {
      spans.push({
        text: text.substring(cursor, claim.startIdx),
        isClaim: false, isEntity: false,
        startIdx: cursor, endIdx: claim.startIdx,
      });
    }

    // Within the claim, find entity positions and create sub-spans
    const claimText = text.substring(claim.startIdx, claim.endIdx);
    const claimNorm = claimText.toLowerCase();
    const entityMatches: Array<{ start: number; end: number; entity: EntityRecord; idx: number }> = [];

    for (let ei = 0; ei < claim.entities.length; ei++) {
      const entity = claim.entities[ei];
      const entityIdx = claim.entityIndices[ei];
      const normalizedName = entity.name.toLowerCase();

      // Search for entity name variants within this claim text
      const searchNames: string[] = [normalizedName];
      const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 0);
      if (nameParts.length >= 2) {
        const surname = nameParts[nameParts.length - 1];
        if (surname.length >= 4) searchNames.push(surname);
      }

      for (const sn of searchNames) {
        let searchFrom = 0;
        while (searchFrom < claimNorm.length) {
          const pos = claimNorm.indexOf(sn, searchFrom);
          if (pos === -1) break;

          // Word boundary for short names
          if (sn !== normalizedName && sn.length < 6) {
            const before = pos > 0 ? claimNorm[pos - 1] : ' ';
            const after = pos + sn.length < claimNorm.length ? claimNorm[pos + sn.length] : ' ';
            if (!/[\s,.:;()\-/]/.test(before) || !/[\s,.:;()\-/]/.test(after)) {
              searchFrom = pos + 1;
              continue;
            }
          }

          entityMatches.push({
            start: pos,
            end: pos + sn.length,
            entity,
            idx: entityIdx,
          });
          searchFrom = pos + sn.length;
          break; // One match per variant per entity is enough
        }
      }
    }

    // Sort and deduplicate entity matches within this claim
    entityMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const filteredMatches: typeof entityMatches = [];
    let lastEnd = -1;
    for (const m of entityMatches) {
      if (m.start >= lastEnd) {
        filteredMatches.push(m);
        lastEnd = m.end;
      }
    }

    // Build sub-spans within the claim
    let claimCursor = 0;
    for (const m of filteredMatches) {
      // Claim text before this entity
      if (m.start > claimCursor) {
        spans.push({
          text: claimText.substring(claimCursor, m.start),
          isClaim: true, isEntity: false,
          claim,
          startIdx: claim.startIdx + claimCursor,
          endIdx: claim.startIdx + m.start,
        });
      }
      // The entity within the claim
      spans.push({
        text: claimText.substring(m.start, m.end),
        isClaim: true, isEntity: true,
        claim, entity: m.entity, entityIndex: m.idx,
        startIdx: claim.startIdx + m.start,
        endIdx: claim.startIdx + m.end,
      });
      claimCursor = m.end;
    }
    // Remaining claim text
    if (claimCursor < claimText.length) {
      spans.push({
        text: claimText.substring(claimCursor),
        isClaim: true, isEntity: false,
        claim,
        startIdx: claim.startIdx + claimCursor,
        endIdx: claim.endIdx,
      });
    }

    cursor = claim.endIdx;
  }

  // Remaining text after last claim
  if (cursor < text.length) {
    spans.push({
      text: text.substring(cursor),
      isClaim: false, isEntity: false,
      startIdx: cursor, endIdx: text.length,
    });
  }

  return spans;
}

interface FosforluKalemMasasiProps {
  rawContent: string;
  scanResult: ScanResultData;
  documentTitle: string;
  documentId: string;
  externalUrl?: string | null;
  fingerprint: string;
  onBack: () => void;
}

// ═══════════════════════════════════════════
// TEXT ANNOTATION ENGINE
// ═══════════════════════════════════════════

function buildAnnotatedSpans(text: string, entities: EntityRecord[]): AnnotatedSpan[] {
  if (!text || !entities || entities.length === 0) {
    return [{ text, isEntity: false, startIdx: 0, endIdx: text.length }];
  }

  // Find all entity positions in text (case-insensitive)
  // Strategy: full name match first, then surname/abbreviation for broader coverage
  const normalizedText = text.toLowerCase();
  const matches: Array<{ start: number; end: number; entity: EntityRecord; entityIndex: number }> = [];

  entities.forEach((entity, idx) => {
    if (!entity.name || entity.name.length < 2) return;
    const normalizedName = entity.name.toLowerCase();

    // Build search variants: full name + surname + abbreviations
    const searchNames: string[] = [normalizedName];

    // For multi-word names, add surname (last word) if >= 4 chars
    const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 0);
    if (nameParts.length >= 2) {
      const surname = nameParts[nameParts.length - 1];
      if (surname.length >= 4) {
        searchNames.push(surname);
      }
      // Also add "last, first-initial" pattern (e.g., "LINDSEY, J.")
      // And abbreviated forms like "MC2" for "MC2 Model & Talent Miami, LLC"
    }

    // For organizations, add common abbreviations
    if (entity.type === 'organization') {
      // Extract words in parentheses/quotes as abbreviations (e.g., ("MC2"))
      const abbrMatch = entity.name.match(/[""(]([^""()]+)["")/]/);
      if (abbrMatch && abbrMatch[1].length >= 2) {
        searchNames.push(abbrMatch[1].toLowerCase());
      }
      // Also try first word if it looks like an abbreviation (all caps, short)
      if (nameParts[0] && nameParts[0].length <= 5 && nameParts[0] === nameParts[0]) {
        searchNames.push(nameParts[0]);
      }
    }

    // Search for each variant
    const usedVariants = new Set<string>();
    for (const searchName of searchNames) {
      if (searchName.length < 2 || usedVariants.has(searchName)) continue;
      usedVariants.add(searchName);

      let searchFrom = 0;
      while (searchFrom < normalizedText.length) {
        const pos = normalizedText.indexOf(searchName, searchFrom);
        if (pos === -1) break;

        // Word boundary check for short names to avoid false positives
        // (e.g., "MC2" shouldn't match inside "ABCMC2DEF")
        if (searchName !== normalizedName && searchName.length < 6) {
          const charBefore = pos > 0 ? normalizedText[pos - 1] : ' ';
          const charAfter = pos + searchName.length < normalizedText.length
            ? normalizedText[pos + searchName.length] : ' ';
          const isWordBoundary = /[\s,.:;()\-/]/.test(charBefore) && /[\s,.:;()\-/]/.test(charAfter);
          if (!isWordBoundary) {
            searchFrom = pos + 1;
            continue;
          }
        }

        matches.push({
          start: pos,
          end: pos + searchName.length,
          entity,
          entityIndex: idx,
        });
        searchFrom = pos + 1;
      }
    }
  });

  if (matches.length === 0) {
    return [{ text, isEntity: false, startIdx: 0, endIdx: text.length }];
  }

  // Sort by position, then by length (longer matches first for overlaps)
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Remove overlapping matches (keep longer/earlier ones)
  const filtered: typeof matches = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Build annotated spans
  const spans: AnnotatedSpan[] = [];
  let cursor = 0;

  for (const m of filtered) {
    // Text before this match
    if (m.start > cursor) {
      spans.push({
        text: text.substring(cursor, m.start),
        isEntity: false,
        startIdx: cursor,
        endIdx: m.start,
      });
    }
    // The entity match (preserve original casing from text)
    spans.push({
      text: text.substring(m.start, m.end),
      isEntity: true,
      entity: m.entity,
      entityIndex: m.entityIndex,
      startIdx: m.start,
      endIdx: m.end,
    });
    cursor = m.end;
  }

  // Remaining text after last match
  if (cursor < text.length) {
    spans.push({
      text: text.substring(cursor),
      isEntity: false,
      startIdx: cursor,
      endIdx: text.length,
    });
  }

  return spans;
}

// ═══════════════════════════════════════════
// ENTITY POPOVER COMPONENT
// ═══════════════════════════════════════════

function EntityPopover({
  popover,
  onClose,
  onVerify,
  onReject,
}: {
  popover: PopoverState;
  onClose: () => void;
  onVerify: (entity: EntityRecord) => void;
  onReject: (entity: EntityRecord) => void;
}) {
  const { entity, rect, relationships } = popover;
  const config = ENTITY_HIGHLIGHT[entity.type] || DEFAULT_HIGHLIGHT;
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position popover near clicked entity
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!popoverRef.current) return;
    const popH = popoverRef.current.offsetHeight;
    const popW = popoverRef.current.offsetWidth;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Flip up if not enough space below
    if (top + popH > viewH - 20) {
      top = rect.top - popH - 8;
    }
    // Keep within horizontal bounds
    if (left + popW > viewW - 20) {
      left = viewW - popW - 20;
    }
    if (left < 20) left = 20;

    setPos({ top, left });
  }, [rect]);

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.3)',
        }}
      />

      {/* Popover card */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          width: 340,
          background: '#0c0c0c',
          border: `1px solid ${config.border}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 20px ${config.bg}`,
          fontFamily: mono,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 14px',
          background: config.bg,
          borderBottom: `1px solid ${config.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: config.text }}>{config.icon}</span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            color: config.text, opacity: 0.8,
          }}>
            {config.label}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#666', cursor: 'pointer', padding: 2,
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Entity name */}
        <div style={{ padding: '12px 14px 8px' }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#e5e5e5',
            letterSpacing: '0.02em', lineHeight: 1.3,
          }}>
            {entity.name}
          </div>
          {entity.role && (
            <div style={{ fontSize: 10, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
              {entity.role}
            </div>
          )}

          {/* Confidence */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
          }}>
            <div style={{
              flex: 1, height: 4, background: '#1a1a1a',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.round(entity.confidence * 100)}%`,
                background: config.bgSolid,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 10, color: config.text, fontWeight: 600 }}>
              {Math.round(entity.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Source sentence — verbatim quote from document */}
        {(entity.source_sentence || entity.context) && (
          <div style={{ margin: '0 14px 10px' }}>
            {entity.source_sentence && (
              <div style={{
                fontSize: 8, fontWeight: 600, letterSpacing: '0.08em',
                color: '#555', marginBottom: 4,
              }}>
                BELGEDEN BİREBİR ALINTI
              </div>
            )}
            <div style={{
              padding: '8px 10px',
              background: '#080808',
              border: `1px solid ${entity.source_sentence ? 'rgba(234, 179, 8, 0.2)' : '#1a1a1a'}`,
              borderLeft: entity.source_sentence ? '3px solid rgba(234, 179, 8, 0.4)' : '3px solid #1a1a1a',
              fontSize: 10, color: '#ccc', lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              &ldquo;{(entity.source_sentence || entity.context || '').substring(0, 200)}
              {(entity.source_sentence || entity.context || '').length > 200 ? '...' : ''}&rdquo;
            </div>
            {entity.source_page && (
              <div style={{ fontSize: 8, color: '#555', marginTop: 3, textAlign: 'right' }}>
                Sayfa {entity.source_page}
              </div>
            )}
          </div>
        )}

        {/* Relationships for this entity */}
        {relationships.length > 0 && (
          <div style={{ padding: '0 14px 10px' }}>
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              color: '#666', marginBottom: 6,
            }}>
              <Link2 size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              BAĞLANTILAR ({relationships.length})
            </div>
            {relationships.slice(0, 4).map((rel, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, color: '#ccc', marginBottom: 3,
              }}>
                <span style={{ color: '#555' }}>→</span>
                <span style={{ fontWeight: 600 }}>
                  {rel.sourceName === entity.name ? rel.targetName : rel.sourceName}
                </span>
                <span style={{
                  fontSize: 8, padding: '1px 4px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  color: '#ef4444',
                }}>
                  {rel.relationshipType.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            {relationships.length > 4 && (
              <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>
                +{relationships.length - 4} daha...
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #1a1a1a',
          display: 'flex', gap: 6,
        }}>
          <button
            onClick={() => onVerify(entity)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 0', fontSize: 10, fontWeight: 700, fontFamily: mono,
              letterSpacing: '0.06em', cursor: 'pointer',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e', transition: 'all 0.2s',
            }}
          >
            <CheckCircle size={12} /> DOĞRU
          </button>
          <button
            onClick={() => onReject(entity)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 0', fontSize: 10, fontWeight: 700, fontFamily: mono,
              letterSpacing: '0.06em', cursor: 'pointer',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#ef4444', transition: 'all 0.2s',
            }}
          >
            <XCircle size={12} /> YANLIŞ
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '7px 12px', fontSize: 10, fontWeight: 700, fontFamily: mono,
              letterSpacing: '0.06em', cursor: 'pointer',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#eab308', transition: 'all 0.2s',
            }}
          >
            <Edit3 size={12} />
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════
// CLAIM POPOVER COMPONENT
// ═══════════════════════════════════════════

const CLAIM_BG = 'rgba(168, 85, 247, 0.06)';
const CLAIM_BORDER = 'rgba(168, 85, 247, 0.25)';

function ClaimPopover({
  claimPopover,
  onClose,
}: {
  claimPopover: ClaimPopoverState;
  onClose: () => void;
}) {
  const { claim, rect } = claimPopover;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!popoverRef.current) return;
    const popH = popoverRef.current.offsetHeight;
    const popW = popoverRef.current.offsetWidth;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;

    let top = rect.bottom + 8;
    let left = rect.left;
    if (top + popH > viewH - 20) top = rect.top - popH - 8;
    if (left + popW > viewW - 20) left = viewW - popW - 20;
    if (left < 20) left = 20;
    setPos({ top, left });
  }, [rect]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Classify claim by its entity composition
  const claimTags: string[] = [];
  if (claim.hasPerson) claimTags.push('KİŞİ');
  if (claim.hasOrg) claimTags.push('KURULUŞ');
  if (claim.hasLocation) claimTags.push('YER');
  if (claim.hasDate) claimTags.push('TARİH');
  if (claim.hasMoney) claimTags.push('FİNANSAL');

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.3)' }} />
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          width: 380, background: '#0c0c0c',
          border: `1px solid ${CLAIM_BORDER}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 20px ${CLAIM_BG}`,
          fontFamily: mono, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 14px', background: 'rgba(168, 85, 247, 0.08)',
          borderBottom: `1px solid ${CLAIM_BORDER}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Quote size={11} color="#a855f7" />
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#a855f7', opacity: 0.8 }}>
            BAĞLAM — {claim.id}
          </span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 2 }}>
            <X size={12} />
          </button>
        </div>

        {/* Claim text */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{
            padding: '10px 12px', background: '#080808',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderLeft: '3px solid rgba(168, 85, 247, 0.4)',
            fontSize: 11, color: '#d4d4d4', lineHeight: 1.6, fontStyle: 'italic',
          }}>
            &ldquo;{claim.text.length > 300 ? claim.text.substring(0, 300) + '...' : claim.text}&rdquo;
          </div>
        </div>

        {/* Entity tags in this claim */}
        <div style={{ padding: '0 14px 10px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: '#555', marginBottom: 6 }}>
            İÇERDİĞİ VARLIKLAR ({claim.entityCount})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {claim.entities.map((entity, i) => {
              const config = ENTITY_HIGHLIGHT[entity.type] || DEFAULT_HIGHLIGHT;
              return (
                <span key={i} style={{
                  fontSize: 9, padding: '2px 6px',
                  background: config.bg, border: `1px solid ${config.border}`,
                  color: config.text, fontWeight: 600,
                }}>
                  {config.icon} {entity.name.length > 25 ? entity.name.substring(0, 25) + '…' : entity.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Claim type tags */}
        <div style={{
          padding: '8px 14px', borderTop: '1px solid #1a1a1a',
          display: 'flex', gap: 4, flexWrap: 'wrap',
        }}>
          {claimTags.map(tag => (
            <span key={tag} style={{
              fontSize: 8, padding: '2px 5px', letterSpacing: '0.06em',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              color: '#c084fc', fontWeight: 600,
            }}>
              {tag}
            </span>
          ))}
          <span style={{
            fontSize: 8, padding: '2px 5px', letterSpacing: '0.06em',
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            color: '#eab308', fontWeight: 600, marginLeft: 'auto',
          }}>
            {claim.entityCount} VARLIK
          </span>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════
// FOSFORLU LEGEND BAR
// ═══════════════════════════════════════════

function FosforluLegend({ entities, claims, viewMode }: { entities: EntityRecord[]; claims?: ClaimSentence[]; viewMode: ViewMode }) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return counts;
  }, [entities]);

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
    }}>
      {viewMode === 'baglam' ? (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, color: '#a855f7', fontFamily: mono,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#a855f7', opacity: 0.7 }} />
            BAĞLAM CÜMLELERİ ({claims?.length || 0})
          </div>
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = ENTITY_HIGHLIGHT[type] || DEFAULT_HIGHLIGHT;
            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 9, color: config.text, fontFamily: mono, opacity: 0.6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: config.bgSolid, opacity: 0.5 }} />
                {config.label} ({count})
              </div>
            );
          })}
        </>
      ) : (
        Object.entries(typeCounts).map(([type, count]) => {
          const config = ENTITY_HIGHLIGHT[type] || DEFAULT_HIGHLIGHT;
          return (
            <div key={type} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9, color: config.text, fontFamily: mono,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: config.bgSolid, opacity: 0.7 }} />
              {config.label} ({count})
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function FosforluKalemMasasi({
  rawContent,
  scanResult,
  documentTitle,
  documentId,
  externalUrl,
  fingerprint,
  onBack,
}: FosforluKalemMasasiProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('fosforlu');
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [claimPopover, setClaimPopover] = useState<ClaimPopoverState | null>(null);
  const [verifiedEntities, setVerifiedEntities] = useState<Record<number, 'verified' | 'rejected'>>({});
  const textContainerRef = useRef<HTMLDivElement>(null);

  const aiEntities = scanResult?.entities || [];
  const relationships = scanResult?.relationships || [];

  // ═══ ENRICHMENT ENGINE — Katman 1 ═══
  // Normalize OCR text + detect dates/money/locations/orgs via regex/gazetteer
  const enrichment = useMemo(
    () => enrichEntities(rawContent, aiEntities),
    [rawContent, aiEntities]
  );

  // Use normalized text and enriched entity list for all modes
  const normalizedText = enrichment.normalizedText;
  const entities = enrichment.allEntities;

  // Build annotated text spans (for fosforlu mode) — uses normalized text
  const annotatedSpans = useMemo(
    () => buildAnnotatedSpans(normalizedText, entities),
    [normalizedText, entities]
  );

  // Detect claims (for baglam mode) — uses normalized text
  const claims = useMemo(
    () => detectClaims(normalizedText, entities, documentId),
    [normalizedText, entities, documentId]
  );

  // Build claim-annotated spans (for baglam mode) — uses normalized text
  const claimAnnotatedSpans = useMemo(
    () => buildClaimAnnotatedSpans(normalizedText, claims, entities),
    [normalizedText, claims, entities]
  );

  // Stats
  const totalEntities = entities.length;
  const verifiedCount = Object.values(verifiedEntities).filter(v => v === 'verified').length;
  const rejectedCount = Object.values(verifiedEntities).filter(v => v === 'rejected').length;
  const pendingCount = totalEntities - verifiedCount - rejectedCount;

  // Handle entity click
  const handleEntityClick = useCallback((e: React.MouseEvent, entity: EntityRecord, entityIndex: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const entityRels = relationships.filter(
      r => r.sourceName.toLowerCase() === entity.name.toLowerCase() ||
           r.targetName.toLowerCase() === entity.name.toLowerCase()
    );
    setPopover({ entity, entityIndex, rect, relationships: entityRels });
    setClaimPopover(null);
  }, [relationships]);

  // Handle claim click (click on non-entity part of a claim sentence)
  const handleClaimClick = useCallback((e: React.MouseEvent, claim: ClaimSentence) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setClaimPopover({ claim, rect });
    setPopover(null);
  }, []);

  // Verify/reject handlers
  const handleVerify = useCallback((entity: EntityRecord) => {
    const idx = entities.findIndex(e => e.name === entity.name);
    if (idx >= 0) {
      setVerifiedEntities(prev => ({ ...prev, [idx]: 'verified' }));
    }
    setPopover(null);
  }, [entities]);

  const handleReject = useCallback((entity: EntityRecord) => {
    const idx = entities.findIndex(e => e.name === entity.name);
    if (idx >= 0) {
      setVerifiedEntities(prev => ({ ...prev, [idx]: 'rejected' }));
    }
    setPopover(null);
  }, [entities]);

  // Cycle through view modes with Shift+Scroll
  const VIEW_MODES: ViewMode[] = ['fosforlu', 'baglam', 'temiz'];
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        setViewMode(prev => {
          const idx = VIEW_MODES.indexOf(prev);
          return e.deltaY > 0
            ? VIEW_MODES[(idx + 1) % VIEW_MODES.length]
            : VIEW_MODES[(idx - 1 + VIEW_MODES.length) % VIEW_MODES.length];
        });
      }
    };
    const container = textContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      fontFamily: mono, background: '#050505',
    }}>
      {/* ═══ TOOLBAR ═══ */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a1a',
        background: '#080808',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid #1a1a1a', color: '#888',
            padding: '5px 10px', fontSize: 10, fontFamily: mono, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={12} /> GERİ
        </button>

        {/* Title */}
        <div style={{
          flex: 1, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.04em', color: '#e5e5e5',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {documentTitle}
        </div>

        {/* 3-Mode Switcher */}
        <div style={{ display: 'flex', gap: 0, border: '1px solid #222', overflow: 'hidden' }}>
          {([
            { mode: 'fosforlu' as ViewMode, label: 'FOSFORLU', icon: <Eye size={11} />, color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', borderColor: 'rgba(234, 179, 8, 0.3)' },
            { mode: 'baglam' as ViewMode, label: 'BAĞLAM', icon: <BookOpen size={11} />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.3)' },
            { mode: 'temiz' as ViewMode, label: 'TEMİZ', icon: <EyeOff size={11} />, color: '#666', bg: '#111', borderColor: '#222' },
          ]).map(({ mode, label, icon, color, bg, borderColor }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', fontSize: 9, fontWeight: 600,
                fontFamily: mono, cursor: 'pointer', letterSpacing: '0.04em',
                background: viewMode === mode ? bg : '#0a0a0a',
                borderRight: '1px solid #222', borderTop: 'none', borderBottom: 'none', borderLeft: 'none',
                color: viewMode === mode ? color : '#444',
                transition: 'all 0.25s ease',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Original PDF link */}
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', fontSize: 9, fontFamily: mono,
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#3b82f6', textDecoration: 'none', fontWeight: 600,
            }}
          >
            <ExternalLink size={10} /> ORİJİNAL PDF
          </a>
        )}
      </div>

      {/* ═══ INFO BAR ═══ */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid #111',
        background: '#060606',
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        {/* Legend */}
        <FosforluLegend entities={entities} claims={claims} viewMode={viewMode} />

        {/* Progress */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 9, fontFamily: mono }}>
          {viewMode === 'baglam' ? (
            <span style={{ color: '#a855f7' }}>
              {claims.length} bağlam cümlesi tespit edildi
            </span>
          ) : (
            <>
              {pendingCount > 0 && (
                <span style={{ color: '#eab308' }}>⏳ {pendingCount} bekliyor</span>
              )}
              {verifiedCount > 0 && (
                <span style={{ color: '#22c55e' }}>✓ {verifiedCount} doğru</span>
              )}
              {rejectedCount > 0 && (
                <span style={{ color: '#ef4444' }}>✗ {rejectedCount} yanlış</span>
              )}
            </>
          )}
        </div>

        {/* Enrichment stats badge */}
        {enrichment.stats.totalEnriched > 0 && (
          <div style={{
            fontSize: 8, padding: '2px 6px', fontFamily: mono,
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#22c55e', fontWeight: 600, letterSpacing: '0.04em',
          }}
          title={`Regex: ${enrichment.stats.datesFound} tarih, ${enrichment.stats.moneyFound} para, ${enrichment.stats.locationsFound} yer, ${enrichment.stats.orgsFound} kuruluş`}
          >
            +{enrichment.stats.totalEnriched} ZENGİNLEŞTİRME
          </div>
        )}

        {/* Shift+Scroll hint */}
        <div style={{
          fontSize: 8, color: '#444', fontFamily: mono,
          letterSpacing: '0.04em',
        }}>
          SHIFT+SCROLL: MOD DEĞİŞTİR
        </div>
      </div>

      {/* ═══ DOCUMENT TEXT AREA ═══ */}
      <div
        ref={textContainerRef}
        style={{
          flex: 1, overflow: 'auto',
          padding: '24px 32px',
          lineHeight: 1.8,
          fontSize: 13,
          color: '#d4d4d4',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* ─── FOSFORLU MODE: Entity highlights ─── */}
          {viewMode === 'fosforlu' && annotatedSpans.map((span, i) => {
            if (!span.isEntity || !span.entity) {
              return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{span.text}</span>;
            }
            const entity = span.entity;
            const entityIdx = span.entityIndex ?? 0;
            const config = ENTITY_HIGHLIGHT[entity.type] || DEFAULT_HIGHLIGHT;
            const verification = verifiedEntities[entityIdx];
            const isVerified = verification === 'verified';
            const isRejected = verification === 'rejected';

            return (
              <span
                key={i}
                onClick={(e) => handleEntityClick(e, entity, entityIdx)}
                style={{
                  cursor: 'pointer', position: 'relative',
                  padding: '1px 2px', borderRadius: 2,
                  transition: 'all 0.3s ease',
                  background: config.bg,
                  borderBottom: `2px solid ${config.border}`,
                  ...(isVerified ? { background: 'rgba(34, 197, 94, 0.12)', borderBottom: '2px solid rgba(34, 197, 94, 0.5)' } : {}),
                  ...(isRejected ? { background: 'rgba(220, 38, 38, 0.08)', borderBottom: '2px solid rgba(220, 38, 38, 0.3)', textDecoration: 'line-through', textDecorationColor: 'rgba(220, 38, 38, 0.5)', opacity: 0.5 } : {}),
                }}
                title={`${config.label}: ${entity.name}${entity.role ? ` (${entity.role})` : ''}`}
              >
                {span.text}
                {!isVerified && !isRejected && (
                  <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: config.bgSolid, marginLeft: 2, verticalAlign: 'super', opacity: 0.6 }} />
                )}
                {isVerified && (
                  <span style={{ display: 'inline-block', marginLeft: 3, verticalAlign: 'middle' }}>
                    <CheckCircle size={10} color="#22c55e" />
                  </span>
                )}
              </span>
            );
          })}

          {/* ─── BAĞLAM MODE: Claim sentence highlights ─── */}
          {viewMode === 'baglam' && claimAnnotatedSpans.map((span, i) => {
            if (!span.isClaim) {
              // Non-claim text — dimmed
              return (
                <span key={i} style={{ whiteSpace: 'pre-wrap', opacity: 0.35 }}>
                  {span.text}
                </span>
              );
            }

            // Within a claim sentence
            if (span.isEntity && span.entity) {
              // Entity within a claim — highlighted with entity color + clickable
              const entity = span.entity;
              const entityIdx = span.entityIndex ?? 0;
              const config = ENTITY_HIGHLIGHT[entity.type] || DEFAULT_HIGHLIGHT;
              return (
                <span
                  key={i}
                  onClick={(e) => handleEntityClick(e, entity, entityIdx)}
                  style={{
                    cursor: 'pointer',
                    padding: '1px 3px', borderRadius: 2,
                    background: config.bg,
                    borderBottom: `2px solid ${config.border}`,
                    color: config.text,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                  title={`${config.label}: ${entity.name}`}
                >
                  {span.text}
                </span>
              );
            }

            // Non-entity text within a claim — purple background, clickable for claim card
            return (
              <span
                key={i}
                onClick={(e) => span.claim && handleClaimClick(e, span.claim)}
                style={{
                  whiteSpace: 'pre-wrap',
                  cursor: span.claim ? 'pointer' : 'default',
                  background: 'rgba(168, 85, 247, 0.06)',
                  borderBottom: '1px solid rgba(168, 85, 247, 0.15)',
                  transition: 'all 0.2s ease',
                }}
                title={span.claim ? `Bağlam: ${span.claim.id} — tıkla` : undefined}
              >
                {span.text}
              </span>
            );
          })}

          {/* ─── TEMİZ MODE: Clean text ─── */}
          {viewMode === 'temiz' && (
            <span style={{ whiteSpace: 'pre-wrap' }}>{normalizedText}</span>
          )}
        </div>

        {/* Relationships summary at bottom (fosforlu mode only) */}
        {viewMode === 'fosforlu' && relationships.length > 0 && (
          <div style={{
            maxWidth: 800, margin: '32px auto 0',
            padding: '16px 20px',
            background: '#080808',
            border: '1px solid #1a1a1a',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: '#dc2626', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Link2 size={12} /> ÇIKARILMIŞ İLİŞKİLER ({relationships.length})
            </div>
            {relationships.map((rel, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, marginBottom: 6, flexWrap: 'wrap',
              }}>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>{rel.sourceName}</span>
                <span style={{ color: '#555' }}>→</span>
                <span style={{ fontWeight: 700, color: '#60a5fa' }}>{rel.targetName}</span>
                <span style={{
                  fontSize: 8, padding: '1px 5px',
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  color: '#ef4444', fontWeight: 600,
                }}>
                  {rel.relationshipType.replace(/_/g, ' ').toUpperCase()}
                </span>
                {(rel.source_sentence || rel.description) && (
                  <span style={{ fontSize: 9, color: '#777', fontStyle: 'italic' }}>
                    — &ldquo;{(rel.source_sentence || rel.description || '').substring(0, 80)}
                    {(rel.source_sentence || rel.description || '').length > 80 ? '...' : ''}&rdquo;
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Claim statistics summary at bottom (baglam mode only) */}
        {viewMode === 'baglam' && claims.length > 0 && (
          <div style={{
            maxWidth: 800, margin: '32px auto 0',
            padding: '16px 20px',
            background: '#080808',
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: '#a855f7', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <BookOpen size={12} /> BAĞLAM İSTATİSTİKLERİ
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 10, color: '#ccc' }}>
              <span>Toplam bağlam cümlesi: <strong style={{ color: '#a855f7' }}>{claims.length}</strong></span>
              <span>Kişi içeren: <strong style={{ color: '#ef4444' }}>{claims.filter(c => c.hasPerson).length}</strong></span>
              <span>Kuruluş içeren: <strong style={{ color: '#60a5fa' }}>{claims.filter(c => c.hasOrg).length}</strong></span>
              <span>Yer içeren: <strong style={{ color: '#4ade80' }}>{claims.filter(c => c.hasLocation).length}</strong></span>
              <span>Tarih içeren: <strong style={{ color: '#facc15' }}>{claims.filter(c => c.hasDate).length}</strong></span>
              <span>Finansal içeren: <strong style={{ color: '#c084fc' }}>{claims.filter(c => c.hasMoney).length}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ POPOVERS ═══ */}
      <AnimatePresence>
        {popover && (
          <EntityPopover
            popover={popover}
            onClose={() => setPopover(null)}
            onVerify={handleVerify}
            onReject={handleReject}
          />
        )}
        {claimPopover && (
          <ClaimPopover
            claimPopover={claimPopover}
            onClose={() => setClaimPopover(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
