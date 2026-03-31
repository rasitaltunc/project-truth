'use client';

/**
 * Document Archive Panel (TARA Protocol - Sprint 16)
 * Main 3-tab panel: BELGELERİM (Documents) | KEŞFET (Explore) | TARA (Scan)
 * Federal indictment aesthetic — sharp corners, monospace, dark
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RefreshCw, Search, Download, AlertTriangle, Loader2,
  ChevronLeft, ChevronRight, FileText, Database, BarChart3,
  GhostIcon, Filter, Check, Zap, Upload,
} from 'lucide-react';
import { useDocumentStore, type DocumentRecord, type ExternalSearchResult } from '@/store/documentStore';
import { useResearchStore } from '@/store/researchStore';
import { useNodes } from '@/store/truthStore';
import { findBestMatch } from '@/lib/entityResolution';
import DocumentCard from './DocumentCard';
import DocumentDetailView from './DocumentDetailView';
import DocumentScanStats from './DocumentScanStats';
import ExploreDiscoveryView from './ExploreDiscoveryView';
import ManualDocumentUploadFlow from './ManualDocumentUploadFlow';

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

interface DocumentArchivePanelProps {
  networkId: string;
  fingerprint: string;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════
// TAB: BELGELERİM (My Documents)
// ═══════════════════════════════════════════════════════

function DocumentsTab({ networkId, fingerprint, onClose }: DocumentArchivePanelProps) {
  const {
    documents, totalCount, currentPage, isLoading, filters, stats,
    fetchDocuments, setFilters, fetchStats, scanDocument, setViewingDocument,
  } = useDocumentStore();

  useEffect(() => {
    if (networkId) {
      fetchDocuments(networkId, 1);
      fetchStats(networkId);
    }
  }, [networkId, fetchDocuments, fetchStats]);

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchDocuments(networkId, currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchDocuments(networkId, currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDocumentTypeFilter = (type: string | null) => {
    setFilters({ documentType: type });
    fetchDocuments(networkId, 1);
  };

  const handleScanStatusFilter = (status: string | null) => {
    setFilters({ scanStatus: status });
    fetchDocuments(networkId, 1);
  };

  // Empty state
  if (!isLoading && documents.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          fontSize: 12,
          color: '#666',
        }}
      >
        <FileText size={32} color="#444" style={{ marginBottom: 16 }} />
        <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
          NO DOCUMENTS IN THIS NETWORK YET
        </div>
        <div style={{ fontSize: 10, color: '#555', lineHeight: 1.4, marginBottom: 16 }}>
          Find documents from external sources,<br />
          import them and scan with AI.
        </div>
        <button
          onClick={() => useDocumentStore.getState().setActiveTab('explore')}
          style={{
            padding: '8px 20px',
            background: '#dc2626',
            border: 'none',
            color: '#fff',
            fontSize: 10,
            fontFamily: mono,
            fontWeight: 600,
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.opacity = '0.85'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
        >
          EXPLORE →
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats Bar */}
      <DocumentScanStats />

      {/* Filter Bar */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          gap: '8px',
          fontSize: 11,
          fontFamily: mono,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Filter size={14} color="#666" />

        <select
          value={filters.documentType || ''}
          onChange={(e) => handleDocumentTypeFilter(e.target.value || null)}
          style={{
            background: '#0f0f0f',
            border: '1px solid #1a1a1a',
            color: '#e5e5e5',
            padding: '4px 8px',
            fontSize: 10,
            fontFamily: mono,
            cursor: 'pointer',
            flex: '1 1 auto',
            minWidth: 120,
          }}
        >
          <option value="">ALL TYPES</option>
          <option value="court_record">COURT_RECORD</option>
          <option value="financial">FINANCIAL</option>
          <option value="leaked">LEAKED</option>
          <option value="foia">FOIA</option>
          <option value="deposition">DEPOSITION</option>
          <option value="indictment">INDICTMENT</option>
          <option value="correspondence">CORRESPONDENCE</option>
          <option value="media">MEDIA</option>
          <option value="academic">ACADEMIC</option>
        </select>

        <select
          value={filters.scanStatus || ''}
          onChange={(e) => handleScanStatusFilter(e.target.value || null)}
          style={{
            background: '#0f0f0f',
            border: '1px solid #1a1a1a',
            color: '#e5e5e5',
            padding: '4px 8px',
            fontSize: 10,
            fontFamily: mono,
            cursor: 'pointer',
            flex: '1 1 auto',
            minWidth: 120,
          }}
        >
          <option value="">ALL STATUS</option>
          <option value="pending">PENDING</option>
          <option value="scanning">SCANNING</option>
          <option value="scanned">SCANNED</option>
          <option value="failed">FAILED</option>
        </select>

        <button
          onClick={() => setFilters({ documentType: null, scanStatus: null, sourceType: null })}
          style={{
            background: 'transparent',
            border: '1px solid #1a1a1a',
            color: '#666',
            padding: '4px 8px',
            fontSize: 9,
            fontFamily: mono,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = '#666';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = '#1a1a1a';
          }}
        >
          RESET
        </button>
      </div>

      {/* Documents List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Loader2 size={24} color="#dc2626" className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        )}

        {!isLoading && documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onView={() => {
              setViewingDocument(doc);
            }}
            onScan={() => {
              scanDocument(doc.id, fingerprint);
            }}
          />
        ))}
      </div>

      {/* Footer: Stats + Pagination */}
      <div
        style={{
          borderTop: '1px solid #1a1a1a',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          fontFamily: mono,
          color: '#666',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {stats && (
          <div>
            📊 {stats.total} documents | {stats.scanned} scanned | {stats.ready || 0} ready | {stats.pending} pending
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            style={{
              background: 'transparent',
              border: '1px solid #1a1a1a',
              color: currentPage === 1 ? '#444' : '#999',
              padding: '4px 8px',
              cursor: currentPage === 1 ? 'default' : 'pointer',
              fontSize: 10,
              fontFamily: mono,
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            ← PREV
          </button>

          <span style={{ minWidth: 40, textAlign: 'center', fontSize: 10 }}>
            {currentPage}/{totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              background: 'transparent',
              border: '1px solid #1a1a1a',
              color: currentPage === totalPages ? '#444' : '#999',
              padding: '4px 8px',
              cursor: currentPage === totalPages ? 'default' : 'pointer',
              fontSize: 10,
              fontFamily: mono,
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            NEXT →
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: KEŞFET (Explore / External Search)
// ═══════════════════════════════════════════════════════

function ExploreTab({ networkId, fingerprint }: { networkId: string; fingerprint: string }) {
  const [localQuery, setLocalQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['icij', 'opensanctions', 'courtlistener']);
  const { searchResults, isSearching, searchExternal } = useDocumentStore();
  const { infoBannerDismissed, dismissInfoBanner } = useResearchStore();
  const networkNodes = useNodes();

  const handleSearch = useCallback((queryOverride?: string) => {
    const q = queryOverride || localQuery;
    if (q.trim()) {
      if (queryOverride) setLocalQuery(q);
      setHasSearched(true);
      searchExternal(q, selectedProviders);
    }
  }, [localQuery, selectedProviders, searchExternal]);

  const handleCategorySearch = useCallback((category: string, query: string) => {
    setLocalQuery(query);
    setHasSearched(true);
    searchExternal(query, selectedProviders);
  }, [selectedProviders, searchExternal]);

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const handleBackToDiscovery = () => {
    setLocalQuery('');
    setHasSearched(false);
  };

  // Show discovery view when no search is active
  const showDiscovery = !hasSearched && searchResults.length === 0 && !isSearching;

  return (
    <>
      {/* Search Input — always visible */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          gap: '8px',
          flexDirection: 'column',
          background: '#050505',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Belge arayın... (ICIJ, OpenSanctions, CourtListener)"
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              color: '#e5e5e5',
              padding: '10px 14px',
              fontSize: 11,
              fontFamily: mono,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#dc2626'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !localQuery.trim()}
            style={{
              padding: '10px 16px',
              background: isSearching ? '#333' : '#dc2626',
              border: 'none',
              color: '#fff',
              fontSize: 10,
              fontFamily: mono,
              fontWeight: 700,
              letterSpacing: '0.05em',
              cursor: isSearching ? 'default' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: isSearching || !localQuery.trim() ? 0.5 : 1,
            }}
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'ARA'}
          </button>
        </div>

        {/* Provider Checkboxes */}
        <div style={{ display: 'flex', gap: '14px', fontSize: 10, fontFamily: mono }}>
          {[
            { id: 'icij', label: 'ICIJ' },
            { id: 'opensanctions', label: 'OpenSanctions' },
            { id: 'courtlistener', label: 'CourtListener' },
          ].map((provider) => (
            <label
              key={provider.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                cursor: 'pointer',
                color: selectedProviders.includes(provider.id) ? '#dc2626' : '#555',
                transition: 'color 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={selectedProviders.includes(provider.id)}
                onChange={() => toggleProvider(provider.id)}
                style={{ cursor: 'pointer', accentColor: '#dc2626' }}
              />
              {provider.label}
            </label>
          ))}
        </div>
      </div>

      {/* Info Banner — show once */}
      {!infoBannerDismissed && (
        <div
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderLeft: '3px solid #3b82f6',
            fontSize: 10,
            fontFamily: mono,
            color: '#999',
            lineHeight: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: 4, letterSpacing: '0.05em' }}>
              RESEARCH DESK
            </div>
            Here you can search external sources and save results to your research notebook.
            To add data to the network, upload actual documents from the <span style={{ color: '#dc2626', fontWeight: 600 }}>MY DOCUMENTS</span> tab.
          </div>
          <button
            onClick={dismissInfoBanner}
            style={{
              background: '#1a1a1a', border: 'none', color: '#666',
              fontSize: 9, fontFamily: mono, padding: '4px 10px',
              cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
            }}
          >
            GOT IT
          </button>
        </div>
      )}

      {/* Discovery View OR Search Results */}
      {showDiscovery ? (
        <ExploreDiscoveryView
          onSearch={handleSearch}
          onCategorySearch={handleCategorySearch}
        />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* Back to discovery button */}
          {hasSearched && !isSearching && (
            <button
              onClick={handleBackToDiscovery}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none',
                color: '#666', fontSize: 9, fontFamily: mono,
                cursor: 'pointer', marginBottom: 12,
                padding: 0, transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
            >
              ← RETURN TO EXPLORE
            </button>
          )}

          {isSearching && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Loader2 size={24} color="#dc2626" className="animate-spin" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: 10, color: '#666', marginTop: 12, fontFamily: mono }}>
                Searching external sources...
              </div>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, color: '#888', marginBottom: 14, fontFamily: mono,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Search size={12} />
                <span style={{ fontWeight: 600, letterSpacing: '0.05em' }}>
                  {searchResults.length} RESULTS FOUND
                </span>
              </div>
              {searchResults.map((result) => (
                <ResearchResultCard
                  key={result.externalId}
                  result={result}
                  networkNodes={networkNodes}
                />
              ))}
            </div>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                fontSize: 10,
                color: '#666',
                fontFamily: mono,
              }}
            >
              <AlertTriangle size={28} color="#444" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                NO RESULTS FOUND
              </div>
              <div style={{ lineHeight: 1.4, marginBottom: 16 }}>
                Try changing your search term and try again.
              </div>
              <button
                onClick={handleBackToDiscovery}
                style={{
                  padding: '8px 20px', background: '#dc2626',
                  border: 'none', color: '#fff', fontSize: 10,
                  fontFamily: mono, fontWeight: 600, letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                RETURN TO EXPLORE
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Research Result Card (replaces old ExternalSearchResultCard)
// "Bak ama dokunma" — explore, don't import
// ═══════════════════════════════════════════════════════

interface ResearchResultCardProps {
  result: ExternalSearchResult;
  networkNodes: Array<{ id: string; label: string; type: string }>;
}

function ResearchResultCard({ result, networkNodes }: ResearchResultCardProps) {
  const { saveToNotebook, isInNotebook } = useResearchStore();
  const [saved, setSaved] = useState(false);
  const [crossRef, setCrossRef] = useState<{ label: string; score: number } | null | undefined>(undefined);

  const alreadySaved = isInNotebook(result.externalId, result.source);

  const handleSave = () => {
    saveToNotebook({
      query: '',
      source: result.source,
      externalId: result.externalId,
      title: result.title,
      description: result.description,
      url: result.url,
      documentType: result.documentType,
      relevanceScore: result.relevanceScore,
      crossRefMatch: crossRef?.label,
      crossRefScore: crossRef?.score,
    });
    setSaved(true);
  };

  const handleCrossRef = () => {
    if (networkNodes.length === 0) {
      setCrossRef(null);
      return;
    }
    const nodesForMatch = networkNodes.map((n) => ({ id: n.id, name: n.label, type: n.type }));
    const match = findBestMatch(result.title, nodesForMatch, 0.70);
    if (match && match.score >= 0.70) {
      setCrossRef({ label: match.nodeName, score: match.score });
    } else {
      setCrossRef(null);
    }
  };

  const relevancePercent = Math.round((result.relevanceScore || 0.5) * 100);
  const relevanceColor =
    relevancePercent >= 80 ? '#22c55e' : relevancePercent >= 60 ? '#3b82f6' : '#f59e0b';

  return (
    <div
      style={{
        border: '1px solid #1a1a1a',
        padding: '12px',
        marginBottom: '12px',
        background: '#0a0a0a',
        fontSize: 11,
        fontFamily: mono,
        color: '#e5e5e5',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <h4
          style={{
            margin: '0 0 4px 0',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.05em',
            wordBreak: 'break-word',
          }}
        >
          {result.title}
        </h4>
        <div style={{ fontSize: 10, color: '#666' }}>
          {result.date && <span>{result.date}</span>}
          {result.date && <span> • </span>}
          <span>{result.documentType}</span>
        </div>
      </div>

      {result.description && (
        <p
          style={{
            fontSize: 10,
            color: '#999',
            margin: '0 0 8px 0',
            lineHeight: 1.3,
            maxHeight: '2.6em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {result.description}
        </p>
      )}

      {/* Relevance + Source Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingTop: 8,
          borderTop: '1px solid #1a1a1a',
          fontSize: 9,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Source Badge */}
          <div
            style={{
              padding: '2px 6px',
              background:
                result.source === 'icij' ? '#3b82f633' :
                result.source === 'opensanctions' ? '#a855f733' :
                result.source === 'courtlistener' ? '#f59e0b33' :
                result.source === 'local' ? '#22c55e33' :
                '#66666633',
              color:
                result.source === 'icij' ? '#3b82f6' :
                result.source === 'opensanctions' ? '#a855f7' :
                result.source === 'courtlistener' ? '#f59e0b' :
                result.source === 'local' ? '#22c55e' :
                '#888',
              border: '1px solid #1a1a1a',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            {result.source === 'local' ? 'YEREL ARŞİV' : result.source.toUpperCase()}
          </div>

          {/* Relevance Score Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 50,
                height: 3,
                background: '#1a1a1a',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${relevancePercent}%`,
                  background: relevanceColor,
                }}
              />
            </div>
            <span style={{ color: relevanceColor, fontWeight: 600, minWidth: 20 }}>
              {relevancePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Cross-Reference Result (if checked) */}
      {crossRef !== undefined && (
        <div
          style={{
            padding: '6px 10px',
            marginBottom: 8,
            fontSize: 9,
            fontFamily: mono,
            background: crossRef ? (crossRef.score >= 0.90 ? '#22c55e11' : '#f59e0b11') : '#11111188',
            border: `1px solid ${crossRef ? (crossRef.score >= 0.90 ? '#22c55e33' : '#f59e0b33') : '#1a1a1a'}`,
            color: crossRef ? (crossRef.score >= 0.90 ? '#22c55e' : '#f59e0b') : '#555',
          }}
        >
          {crossRef === null ? (
            'ℹ Ağda eşleşme yok'
          ) : crossRef.score >= 0.90 ? (
            <>✓ AĞDA MEVCUT: <span style={{ fontWeight: 600 }}>{crossRef.label}</span> ({Math.round(crossRef.score * 100)}%)</>
          ) : (
            <>⚠ OLASI EŞLEŞME: <span style={{ fontWeight: 600 }}>{crossRef.label}</span> ({Math.round(crossRef.score * 100)}%)</>
          )}
        </div>
      )}

      {/* Action Buttons — NO IMPORT */}
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Primary: Go to Source */}
        {result.url && (
          <button
            onClick={() => window.open(result.url, '_blank')}
            style={{
              flex: 1,
              padding: '6px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              fontSize: 10,
              fontFamily: mono,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            KAYNAĞA GİT ↗
          </button>
        )}

        {/* Secondary: Save to Notebook */}
        <button
          onClick={handleSave}
          disabled={saved || alreadySaved}
          style={{
            flex: 1,
            padding: '6px',
            background: saved || alreadySaved ? '#f59e0b33' : '#f59e0b22',
            border: `1px solid ${saved || alreadySaved ? '#f59e0b55' : '#f59e0b33'}`,
            color: saved || alreadySaved ? '#f59e0b' : '#f59e0bcc',
            fontSize: 10,
            fontFamily: mono,
            fontWeight: 600,
            letterSpacing: '0.05em',
            cursor: saved || alreadySaved ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved || alreadySaved ? '✓ DEFTERDE' : 'DEFTERE KAYDET'}
        </button>

        {/* Tertiary: Cross-Reference Check */}
        <button
          onClick={handleCrossRef}
          style={{
            padding: '6px 10px',
            background: '#a855f711',
            border: '1px solid #a855f733',
            color: '#a855f7',
            fontSize: 10,
            fontFamily: mono,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#a855f722'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#a855f711'; }}
        >
          CROSS-REFERENCE
        </button>
      </div>

      {/* External data warning */}
      <div style={{ fontSize: 8, color: '#444', marginTop: 6, fontFamily: mono }}>
        External source data • To add to network, upload the document itself from MY DOCUMENTS
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: TARA (Scan Queue)
// ═══════════════════════════════════════════════════════

function ScanTab({ networkId, fingerprint }: { networkId: string; fingerprint: string }) {
  const {
    scanQueue, activeScan, isLoading,
    fetchScanQueue, claimScanTask,
  } = useDocumentStore();

  useEffect(() => {
    if (networkId) {
      fetchScanQueue(networkId);
      // Poll every 30 seconds
      const interval = setInterval(() => {
        fetchScanQueue(networkId);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [networkId, fetchScanQueue]);

  const openTasks = scanQueue.filter((t) => t.status === 'open');
  const claimedTasks = scanQueue.filter((t) => t.status === 'claimed');

  const handleClaimTask = async (taskId: string) => {
    const claimed = await claimScanTask(fingerprint);
  };

  return (
    <>
      {/* Queue Stats */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #1a1a1a',
          fontSize: 11,
          fontFamily: mono,
          color: '#e5e5e5',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Zap size={14} color="#eab308" />
        <span style={{ fontWeight: 600 }}>
          Pending scan: {openTasks.length} documents
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Active Scan */}
        {activeScan && (
          <div
            style={{
              padding: '16px',
              background: '#0f0f0f',
              borderBottom: '2px solid #dc2626',
              fontFamily: mono,
              fontSize: 10,
              color: '#e5e5e5',
            }}
          >
            <div style={{ fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
              SCAN IN PROGRESS
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Loader2 size={14} color="#dc2626" className="animate-spin" />
              <span style={{ fontSize: 9, color: '#999' }}>
                Document scanning... ({activeScan.progress}%)
              </span>
            </div>
            <div style={{ width: '100%', height: 3, background: '#1a1a1a' }}>
              <div
                style={{
                  height: '100%',
                  width: `${activeScan.progress}%`,
                  background: '#dc2626',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Queue List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Loader2 size={24} color="#dc2626" className="animate-spin" style={{ margin: '0 auto' }} />
            </div>
          )}

          {!isLoading && openTasks.length === 0 && claimedTasks.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                fontSize: 11,
                color: '#666',
                fontFamily: mono,
              }}
            >
              <GhostIcon size={32} color="#444" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                QUEUE EMPTY
              </div>
              <div style={{ fontSize: 10, lineHeight: 1.4 }}>
                No documents pending<br />
                scan found.
              </div>
            </div>
          )}

          {openTasks.length > 0 && (
            <>
              <div style={{ padding: '12px 16px', fontSize: 9, color: '#666', fontFamily: mono }}>
                OPEN TASKS ({openTasks.length})
              </div>
              {openTasks.map((task) => (
                <DocumentCard
                  key={task.id}
                  document={{
                    id: task.document_id,
                    network_id: task.network_id,
                    title: task.document_title || 'Untitled',
                    description: null,
                    document_type: task.document_type || 'document',
                    source_type: 'manual',
                    external_id: null,
                    external_url: null,
                    file_path: null,
                    file_size: null,
                    file_type: null,
                    language: 'en',
                    country_tags: [],
                    date_filed: null,
                    date_uploaded: task.created_at,
                    uploaded_by: null,
                    scan_status: 'pending',
                    scan_result: null,
                    scanned_by: null,
                    scanned_at: null,
                    review_count: 0,
                    quality_score: 0,
                    is_public: false,
                    raw_content: null,
                    metadata: {},
                    created_at: task.created_at,
                    updated_at: task.created_at,
                  } as DocumentRecord}
                  onScan={() => handleClaimTask(task.id)}
                  compact
                />
              ))}
            </>
          )}

          {claimedTasks.length > 0 && (
            <>
              <div style={{ padding: '12px 16px', fontSize: 9, color: '#666', fontFamily: mono }}>
                TAŞINAN GÖREVLERİ ({claimedTasks.length})
              </div>
              {claimedTasks.map((task) => (
                <DocumentCard
                  key={task.id}
                  document={{
                    id: task.document_id,
                    network_id: task.network_id,
                    title: task.document_title || 'Untitled',
                    description: null,
                    document_type: task.document_type || 'document',
                    source_type: 'manual',
                    external_id: null,
                    external_url: null,
                    file_path: null,
                    file_size: null,
                    file_type: null,
                    language: 'en',
                    country_tags: [],
                    date_filed: null,
                    date_uploaded: task.created_at,
                    uploaded_by: null,
                    scan_status: 'scanning',
                    scan_result: null,
                    scanned_by: task.assigned_to || null,
                    scanned_at: null,
                    review_count: 0,
                    quality_score: 0,
                    is_public: false,
                    raw_content: null,
                    metadata: { assigned_to: task.assigned_to },
                    created_at: task.created_at,
                    updated_at: task.claimed_at || task.created_at,
                  } as DocumentRecord}
                  compact
                />
              ))}
            </>
          )}
        </div>

        {/* Leaderboard Placeholder */}
        {!isLoading && openTasks.length === 0 && (
          <div
            style={{
              padding: '20px',
              borderTop: '1px solid #1a1a1a',
              background: '#0a0a0a',
              fontSize: 10,
              fontFamily: mono,
              color: '#666',
              textAlign: 'center',
            }}
          >
            🏆 SCAN LEADERBOARD
            <div style={{ fontSize: 9, marginTop: 4, color: '#555' }}>
              (Coming soon)
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════

export default function DocumentArchivePanel({
  networkId,
  fingerprint,
  onClose,
}: DocumentArchivePanelProps) {
  const { activeTab, setActiveTab, viewingDocument, setViewingDocument } = useDocumentStore();
  const [showUploadFlow, setShowUploadFlow] = useState(false);

  // ESC key handler — if viewing document, go back first; otherwise close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingDocument) {
          setViewingDocument(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, viewingDocument, setViewingDocument]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: mono,
        color: '#e5e5e5',
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.92)',
          backdropFilter: 'blur(12px)',
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: 'relative',
          width: '92vw',
          maxWidth: 880,
          maxHeight: '90vh',
          background: '#030303',
          border: '1px solid rgba(220, 38, 38, 0.4)',
          boxShadow: '0 0 80px rgba(220, 38, 38, 0.08), 0 0 1px rgba(220, 38, 38, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0a0a0a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Database size={18} color="#dc2626" />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', color: '#dc2626' }}>
              DOCUMENT ARCHIVE
            </span>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#dc2626', opacity: 0.6,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* BELGE YÜKLE button */}
            <button
              onClick={() => setShowUploadFlow(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                border: '1px solid #dc2626',
                borderRadius: '3px',
                padding: '5px 14px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 10,
                fontFamily: mono,
                fontWeight: 700,
                letterSpacing: '0.1em',
                transition: 'all 0.2s',
              }}
            >
              <Upload size={12} />
              BELGE YÜKLE
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid #1a1a1a',
                padding: '4px 8px',
                cursor: 'pointer',
                color: '#666',
                fontSize: 9,
                fontFamily: mono,
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget;
                btn.style.color = '#e5e5e5';
                btn.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget;
                btn.style.color = '#666';
                btn.style.borderColor = '#1a1a1a';
              }}
            >
              ESC
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1a1a1a',
            backgroundColor: '#050505',
          }}
        >
          {(['documents', 'explore', 'scan'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '14px 16px',
                background: activeTab === tab ? '#0f0f0f' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #dc2626' : '2px solid transparent',
                color: activeTab === tab ? '#dc2626' : '#555',
                fontSize: 11,
                fontFamily: mono,
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
              }}
            >
              {tab === 'documents' && 'MY DOCUMENTS'}
              {tab === 'explore' && 'EXPLORE'}
              {tab === 'scan' && 'SCAN'}
            </button>
          ))}
        </div>

        {/* Tab Content OR Detail View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {viewingDocument ? (
              <DocumentDetailView
                key="detail"
                document={viewingDocument}
                fingerprint={fingerprint}
                onBack={() => setViewingDocument(null)}
              />
            ) : (
              <motion.div
                key="tabs"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {activeTab === 'documents' && (
                  <DocumentsTab networkId={networkId} fingerprint={fingerprint} onClose={onClose} />
                )}
                {activeTab === 'explore' && (
                  <ExploreTab networkId={networkId} fingerprint={fingerprint} />
                )}
                {activeTab === 'scan' && (
                  <ScanTab networkId={networkId} fingerprint={fingerprint} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Manual Document Upload Flow */}
      <ManualDocumentUploadFlow
        networkId={networkId}
        fingerprint={fingerprint}
        isOpen={showUploadFlow}
        onClose={() => setShowUploadFlow(false)}
        onComplete={() => {
          // Refresh document list after upload
          useDocumentStore.getState().fetchDocuments(networkId, 1);
          useDocumentStore.getState().fetchStats(networkId);
        }}
      />
    </div>
  );
}
