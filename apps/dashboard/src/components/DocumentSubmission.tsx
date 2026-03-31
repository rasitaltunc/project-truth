// ============================================
// PROJECT TRUTH - Document Submission Panel
// Belge Yükleme ve AI Analiz Arayüzü
// ============================================

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Link, Loader2, CheckCircle, AlertTriangle,
  Brain, Zap, Shield, DollarSign, Eye, ChevronDown, ChevronUp,
  X, Users, Building, MapPin, Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TruthEngine, { ExtractedEntity, ExtractedRelationship } from '@/lib/truthEngine';

// ============================================
// TYPES
// ============================================

type SubmissionMode = 'text' | 'url' | 'file';
type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error';

interface ProcessingResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  summary: string;
  keyFacts: string[];
  processingLevel: string;
  cost: number;
  processingTime: number;
}

// ============================================
// ENTITY ICONS
// ============================================

const ENTITY_ICONS: Record<string, any> = {
  person: Users,
  organization: Building,
  location: MapPin,
  event: Calendar,
  asset: Shield,
  financial: DollarSign,
  default: FileText
};

// ============================================
// MAIN COMPONENT
// ============================================

export function DocumentSubmission() {
  const { user, isAuthenticated } = useAuth();

  // State
  const [mode, setMode] = useState<SubmissionMode>('text');
  const [textContent, setTextContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Quick preview (local only - FREE)
  const handlePreview = useCallback(() => {
    if (!textContent.trim()) return;

    const preview = TruthEngine.quickExtract(textContent);
    setResult({
      entities: preview.entities,
      relationships: preview.relationships,
      summary: `Found ${preview.entities.length} entities and ${preview.relationships.length} relationships`,
      keyFacts: [],
      processingLevel: 'local (preview)',
      cost: 0,
      processingTime: 0
    });
    setShowPreview(true);
  }, [textContent]);

  // Full analysis
  const handleSubmit = async () => {
    if (mode === 'text' && !textContent.trim()) {
      setError('Please enter text to analyze');
      return;
    }

    if (mode === 'url' && !urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    setStatus('processing');
    setError(null);
    setResult(null);

    try {
      let response;

      if (mode === 'url') {
        response = await TruthEngine.analyzeUrl(urlInput, {
          priority: 'normal'
        });
      } else {
        response = await TruthEngine.analyzeDocument(textContent, {
          title: title || undefined,
          priority: 'normal',
          uploadedBy: user?.id
        });
      }

      if (response.success && response.data) {
        setResult({
          entities: response.data.entities,
          relationships: response.data.relationships,
          summary: response.data.summary,
          keyFacts: response.data.keyFacts,
          processingLevel: response.processingLevel,
          cost: response.cost,
          processingTime: response.processingTime
        });
        setStatus('completed');
      } else {
        throw new Error(response.error || 'Processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setStatus('error');
    }
  };

  // Reset
  const handleReset = () => {
    setTextContent('');
    setUrlInput('');
    setTitle('');
    setStatus('idle');
    setError(null);
    setResult(null);
    setShowPreview(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Brain color="#dc2626" size={20} />
          </div>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#e5e5e5',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em'
            }}>TRUTH ENGINE</h2>
            <p style={{
              fontSize: '10px',
              color: '#999999',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em'
            }}>AI-POWERED DOCUMENT ANALYSIS</p>
          </div>
        </div>

        {/* Cost indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '9px', color: '#999999', marginTop: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={10} color="#22c55e" />
            LOCAL: FREE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={10} color="#dc2626" />
            EMBEDDING: ~$0.0001
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Brain size={10} color="#dc2626" />
            AI ANALYSIS: ~$0.01-0.05
          </span>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['text', 'url'] as SubmissionMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={status === 'processing'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              border: '1px solid',
              borderColor: mode === m ? '#dc2626' : '#7f1d1d40',
              backgroundColor: mode === m ? '#991b1b' : '#0a0a0a',
              color: mode === m ? '#dc2626' : '#999999',
              cursor: status === 'processing' ? 'not-allowed' : 'pointer',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.1em',
              opacity: status === 'processing' ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {m === 'text' && <><FileText size={14} /> TEXT</>}
            {m === 'url' && <><Link size={14} /> URL</>}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: '#0a0a0a',
        border: '1px solid #7f1d1d40',
        padding: '16px',
        marginBottom: '16px'
      }}>
        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '9px',
            color: '#999999',
            marginBottom: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.2em',
            textTransform: 'uppercase'
          }}>Document Title (Optional)</label>
          <input
            type="text"
            placeholder="Enter document title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={status === 'processing'}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#030303',
              border: '1px solid #7f1d1d40',
              color: '#e5e5e5',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              outline: 'none',
              opacity: status === 'processing' ? 0.5 : 1,
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#dc2626'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#7f1d1d40'}
          />
        </div>

        {/* Content Input */}
        {mode === 'text' ? (
          <>
            <label style={{
              display: 'block',
              fontSize: '9px',
              color: '#999999',
              marginBottom: '6px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}>Document Content</label>
            <textarea
              placeholder="Paste document text here...

Examples: Court documents, flight logs, news articles, emails..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={status === 'processing'}
              style={{
                width: '100%',
                height: '192px',
                padding: '12px',
                backgroundColor: '#030303',
                border: '1px solid #7f1d1d40',
                color: '#e5e5e5',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                outline: 'none',
                resize: 'none',
                opacity: status === 'processing' ? 0.5 : 1,
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#dc2626'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#7f1d1d40'}
            />
          </>
        ) : (
          <>
            <label style={{
              display: 'block',
              fontSize: '9px',
              color: '#999999',
              marginBottom: '6px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}>Document URL</label>
            <input
              type="url"
              placeholder="https://example.com/document"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={status === 'processing'}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#030303',
                border: '1px solid #7f1d1d40',
                color: '#e5e5e5',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                outline: 'none',
                opacity: status === 'processing' ? 0.5 : 1,
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#dc2626'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#7f1d1d40'}
            />
          </>
        )}

        {/* Word count */}
        {mode === 'text' && textContent && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '9px', color: '#999999', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
            <span>{textContent.split(/\s+/).filter(w => w).length} WORDS</span>
            <button
              onClick={handlePreview}
              disabled={status === 'processing'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#dc2626',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: status === 'processing' ? 'not-allowed' : 'pointer',
                fontSize: '9px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: status === 'processing' ? 0.5 : 1
              }}
            >
              <Eye size={12} />
              QUICK PREVIEW (FREE)
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={status === 'processing' || (!textContent && mode === 'text') || (!urlInput && mode === 'url')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: status === 'processing' || (!textContent && mode === 'text') || (!urlInput && mode === 'url') ? '#3f3f3f' : '#dc2626',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 'bold',
            border: '1px solid #dc2626',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
            letterSpacing: '0.1em',
            cursor: status === 'processing' || (!textContent && mode === 'text') || (!urlInput && mode === 'url') ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!(status === 'processing' || (!textContent && mode === 'text') || (!urlInput && mode === 'url'))) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#991b1b';
            }
          }}
          onMouseLeave={(e) => {
            if (!(status === 'processing' || (!textContent && mode === 'text') || (!urlInput && mode === 'url'))) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626';
            }
          }}
        >
          {status === 'processing' ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ANALYZING...
            </>
          ) : (
            <>
              <Brain size={16} />
              START FULL ANALYSIS
            </>
          )}
        </motion.button>

        {(result || status === 'error') && (
          <button
            onClick={handleReset}
            style={{
              padding: '12px 16px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #7f1d1d40',
              color: '#999999',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a1a1a';
              (e.currentTarget.style as any).borderColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0a0a0a';
              (e.currentTarget.style as any).borderColor = '#7f1d1d40';
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px 16px',
              backgroundColor: '#7f1d1d40',
              border: '1px solid #dc2626',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#dc2626',
              fontSize: '13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview (Local Results) */}
      <AnimatePresence>
        {showPreview && result && status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              border: '1px solid #7f1d1d',
              backgroundColor: '#0a0a0a',
              overflow: 'hidden',
              marginBottom: '16px'
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid #7f1d1d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px', fontWeight: 'bold', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <Eye size={14} />
                  <span>Quick Preview (Free)</span>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#999999',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = '#e5e5e5'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = '#999999'}
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ fontSize: '9px', color: '#999999', marginTop: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.05em' }}>
                Local pattern-matching results only. Click "START FULL ANALYSIS" for AI-powered analysis.
              </p>
            </div>
            <div style={{ padding: '16px' }}>
              <EntityList entities={result.entities} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              border: '1px solid #dc2626',
              backgroundColor: '#0a0a0a',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #7f1d1d',
              backgroundColor: '#1a0a0a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '13px', fontWeight: 'bold', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <CheckCircle size={16} />
                <span>Analysis Complete</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '9px', color: '#999999', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.05em' }}>
                <span>LEVEL: {result.processingLevel}</span>
                <span>TIME: {(result.processingTime / 1000).toFixed(2)}s</span>
                <span style={{ color: '#22c55e' }}>COST: ${result.cost.toFixed(4)}</span>
              </div>
            </div>

            {/* Summary */}
            {result.summary && (
              <div style={{ padding: '16px', borderBottom: '1px solid #7f1d1d' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 'bold', color: '#999999', marginBottom: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Summary</h4>
                <p style={{ color: '#e5e5e5', fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>{result.summary}</p>
              </div>
            )}

            {/* Key Facts */}
            {result.keyFacts.length > 0 && (
              <div style={{ padding: '16px', borderBottom: '1px solid #7f1d1d' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 'bold', color: '#999999', marginBottom: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Key Findings</h4>
                <ul style={{ gap: '4px' }}>
                  {result.keyFacts.map((fact, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#e5e5e5', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                      <span style={{ color: '#dc2626', marginTop: '2px' }}>•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entities */}
            <div style={{ padding: '16px', borderBottom: '1px solid #7f1d1d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 'bold', color: '#999999', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Detected Entities ({result.entities.length})
                </h4>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    fontSize: '9px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}
                >
                  {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showDetails ? 'HIDE' : 'DETAILS'}
                </button>
              </div>
              <EntityList entities={result.entities} showDetails={showDetails} />
            </div>

            {/* Relationships */}
            {result.relationships.length > 0 && (
              <div style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 'bold', color: '#999999', marginBottom: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Relationships ({result.relationships.length})
                </h4>
                <div style={{ gap: '8px' }}>
                  {result.relationships.slice(0, 10).map((rel, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                      <span style={{ color: '#e5e5e5' }}>{rel.sourceEntityName}</span>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#7f1d1d40',
                        color: '#dc2626',
                        fontSize: '9px',
                        border: '1px solid #7f1d1d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {rel.relationshipType.replace('_', ' ')}
                      </span>
                      <span style={{ color: '#e5e5e5' }}>{rel.targetEntityName}</span>
                      <span style={{ color: '#999999', fontSize: '9px' }}>({rel.confidence}%)</span>
                    </div>
                  ))}
                  {result.relationships.length > 10 && (
                    <div style={{ fontSize: '9px', color: '#999999', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas' }}>
                      +{result.relationships.length - 10} MORE RELATIONSHIPS
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ENTITY LIST COMPONENT
// ============================================

function EntityList({
  entities,
  compact = false,
  showDetails = false
}: {
  entities: ExtractedEntity[];
  compact?: boolean;
  showDetails?: boolean;
}) {
  // Group by type
  const grouped = entities.reduce((acc, e) => {
    if (!acc[e.type]) acc[e.type] = [];
    acc[e.type].push(e);
    return acc;
  }, {} as Record<string, ExtractedEntity[]>);

  if (compact) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {entities.slice(0, 15).map((entity, i) => {
          const Icon = ENTITY_ICONS[entity.type] || ENTITY_ICONS.default;
          return (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #7f1d1d40',
                fontSize: '11px',
                color: '#e5e5e5',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
              }}
            >
              <Icon size={10} color="#999999" />
              <span>{entity.name}</span>
              <span style={{ color: '#999999' }}>({entity.confidence}%)</span>
            </span>
          );
        })}
        {entities.length > 15 && (
          <span style={{
            padding: '4px 8px',
            fontSize: '11px',
            color: '#999999',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
          }}>
            +{entities.length - 15} MORE
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ gap: '16px' }}>
      {Object.entries(grouped).map(([type, typeEntities]) => {
        const Icon = ENTITY_ICONS[type] || ENTITY_ICONS.default;
        return (
          <div key={type} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={12} color="#dc2626" />
              <span style={{
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#999999',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas'
              }}>
                {type} ({typeEntities.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {typeEntities.map((entity, i) => (
                <div
                  key={i}
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#030303',
                    border: '1px solid #7f1d1d40',
                    fontSize: '11px',
                    color: '#e5e5e5',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                    cursor: 'default',
                    transition: 'all 0.2s'
                  }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.borderColor = '#dc2626';
                      (e.currentTarget as HTMLSpanElement).style.backgroundColor = '#1a0a0a';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.borderColor = '#7f1d1d40';
                      (e.currentTarget as HTMLSpanElement).style.backgroundColor = '#030303';
                    }}
                  >
                    <span>{entity.name}</span>
                    <span style={{
                      fontSize: '9px',
                      color: entity.confidence >= 80 ? '#22c55e' : entity.confidence >= 60 ? '#eab308' : '#999999'
                    }}>
                      {entity.confidence}%
                    </span>
                  </span>

                  {/* Tooltip */}
                  {showDetails && entity.context && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '8px',
                      width: '256px',
                      backgroundColor: '#030303',
                      border: '1px solid #7f1d1d',
                      padding: '8px',
                      fontSize: '9px',
                      zIndex: 50,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}>
                      <div style={{ color: '#999999', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Context:</div>
                      <div style={{ color: '#e5e5e5' }}>...{entity.context}...</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DocumentSubmission;
