'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Link as LinkIcon,
  Calendar,
  ZoomIn,
  Zap,
} from 'lucide-react';
import { useDocumentStore, type DocumentRecord, type ScanResultData, type DerivedItem } from '@/store/documentStore';

interface DocumentScanViewProps {
  documentId: string;
  fingerprint: string;
  onClose: () => void;
  onComplete?: () => void;
}

type ScanStage = 'loading' | 'scanning' | 'results' | 'error';

const ENTITY_TYPE_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  person: { color: '#dc2626', label: 'Kişi', icon: '👤' },
  organization: { color: '#3b82f6', label: 'Kuruluş', icon: '🏢' },
  location: { color: '#22c55e', label: 'Yer', icon: '📍' },
  date: { color: '#eab308', label: 'Tarih', icon: '📅' },
  money: { color: '#f59e0b', label: 'Finansal', icon: '💰' },
  account: { color: '#8b5cf6', label: 'Hesap', icon: '💳' },
};

export default function DocumentScanView({
  documentId,
  fingerprint,
  onClose,
  onComplete,
}: DocumentScanViewProps) {
  const [stage, setStage] = useState<ScanStage>('loading');
  const [scanProgress, setScanProgress] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [localApprovals, setLocalApprovals] = useState<Record<string, 'approved' | 'rejected' | 'pending'>>({});

  const {
    derivedItems,
    activeScan,
    viewingDocument,
    fetchDerivedItems,
    scanDocument,
    approveDerivedItem,
    rejectDerivedItem,
  } = useDocumentStore();

  // Get total counts from scan_result (pre-filter) for transparency
  const scanResultRaw = viewingDocument?.scan_result as ScanResultData | null;
  const totalRawEntities = scanResultRaw?.entities?.length || 0;
  const totalRawRelationships = scanResultRaw?.relationships?.length || 0;
  const totalRawDates = scanResultRaw?.keyDates?.length || 0;

  // Initialize scan on mount
  useEffect(() => {
    const initiateScan = async () => {
      try {
        setStage('scanning');
        setScanProgress(0);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setScanProgress((p) => Math.min(p + Math.random() * 25, 95));
        }, 400);

        const result = await scanDocument(documentId, fingerprint);

        clearInterval(progressInterval);
        setScanProgress(100);

        if (result) {
          // Fetch derived items after scan completes
          await new Promise((resolve) => setTimeout(resolve, 800));
          await fetchDerivedItems(documentId);
          setStage('results');

          // Delayed re-fetch: scoring pipeline runs fire-and-forget after scan.
          // Score route takes ~2-5s, so re-fetch at 4s, 8s, and 15s for reliability.
          const refetch = () => {
            console.log('[ScanView] Re-fetching derived items for score update...');
            fetchDerivedItems(documentId);
          };
          const t1 = setTimeout(refetch, 4000);
          const t2 = setTimeout(refetch, 8000);
          const t3 = setTimeout(refetch, 15000);
          // Note: cleanup won't fire from async fn return, but timeouts still execute
        } else {
          setStage('error');
        }
      } catch (error) {
        console.error('Scan failed:', error);
        setStage('error');
      }
    };

    initiateScan();
  }, [documentId, fingerprint, scanDocument, fetchDerivedItems]);

  // Handle item approval
  const handleApprove = useCallback(
    async (itemId: string) => {
      try {
        setLocalApprovals((prev) => ({ ...prev, [itemId]: 'approved' }));
        await approveDerivedItem(itemId, fingerprint);
      } catch (error) {
        console.error('Approval failed:', error);
        setLocalApprovals((prev) => ({ ...prev, [itemId]: 'pending' }));
      }
    },
    [approveDerivedItem, fingerprint]
  );

  // Handle item rejection
  const handleReject = useCallback(
    async (itemId: string) => {
      try {
        setLocalApprovals((prev) => ({ ...prev, [itemId]: 'rejected' }));
        await rejectDerivedItem(itemId);
      } catch (error) {
        console.error('Rejection failed:', error);
        setLocalApprovals((prev) => ({ ...prev, [itemId]: 'pending' }));
      }
    },
    [rejectDerivedItem]
  );

  // Handle approve all
  const handleApproveAll = useCallback(async () => {
    for (const item of derivedItems.filter((i) => localApprovals[i.id] === 'pending')) {
      await handleApprove(item.id);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Stagger requests
    }
  }, [derivedItems, localApprovals, handleApprove]);

  const pendingCount = derivedItems.filter((item) => {
    const status = localApprovals[item.id];
    return status === 'pending' || status === undefined;
  }).length;

  const approvedCount = derivedItems.filter((item) => localApprovals[item.id] === 'approved').length;

  // Calculate overall confidence
  const overallConfidence = derivedItems.length > 0
    ? Math.round(
        (derivedItems.reduce((sum, item) => sum + item.confidence, 0) / derivedItems.length) * 100
      )
    : 0;

  const renderLoading = () => (
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: '4px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid #1a1a1a',
      }}
    >
      <Loader2
        style={{
          width: '48px',
          height: '48px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
          color: '#dc2626',
        }}
      />
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#e5e5e5' }}>
        INITIATING SCAN...
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        Verifying document fingerprint
      </div>
    </div>
  );

  const renderScanning = () => (
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: '4px',
        padding: '32px',
        border: '1px solid #1a1a1a',
      }}
    >
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '13px',
          color: '#e5e5e5',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Zap style={{ width: '16px', height: '16px', color: '#dc2626' }} />
        AI ANALYZING DOCUMENT...
      </div>
      <div
        style={{
          width: '100%',
          height: '4px',
          background: '#1a1a1a',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            height: '100%',
            background: '#dc2626',
            width: `${scanProgress}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
        {Math.round(scanProgress)}% completed
      </div>
    </div>
  );

  const renderResults = () => {
    const entities = derivedItems.filter((item) => item.item_type === 'entity');
    const relationships = derivedItems.filter((item) => item.item_type === 'relationship');
    const dates = derivedItems.filter((item) => item.item_type === 'date');

    return (
      <div>
        {/* Header with confidence */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '12px',
                color: '#e5e5e5',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
              }}
            >
              SCAN RESULTS
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {approvedCount} approved • {pendingCount} pending • {derivedItems.length} filtered{totalRawEntities > 0 ? ` (AI extracted ${totalRawEntities + totalRawRelationships + totalRawDates})` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              CONFIDENCE
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#dc2626',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {overallConfidence}%
            </div>
          </div>
        </div>

        {/* Summary */}
        {derivedItems.length > 0 && (
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '8px',
              }}
            >
              SUMMARY
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#e5e5e5',
                lineHeight: '1.6',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {entities.length} entities and {relationships.length} connections detected. Document contains{' '}
              {dates.length} key dates and {entities.length} persons/organizations.
            </div>
          </div>
        )}

        {/* Entities section */}
        {entities.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '12px',
                color: '#e5e5e5',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              <Users style={{ width: '14px', height: '14px' }} />
              EXTRACTED ENTITIES ({entities.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {entities.map((item) => {
                const data = item.item_data as any;
                const entityType = data.type || 'person';
                const config = ENTITY_TYPE_CONFIG[entityType] || ENTITY_TYPE_CONFIG.person;
                const itemStatus = localApprovals[item.id] || 'pending';

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#111',
                      border: `1px solid ${itemStatus === 'approved' ? '#22c55e' : itemStatus === 'rejected' ? '#ef4444' : '#1a1a1a'}`,
                      borderRadius: '4px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        itemStatus === 'pending' ? '#dc2626' : '';
                      (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        itemStatus === 'approved' ? '#22c55e' : itemStatus === 'rejected' ? '#ef4444' : '#1a1a1a';
                      (e.currentTarget as HTMLElement).style.background = '#111';
                    }}
                    onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            fontSize: '13px',
                            color: '#e5e5e5',
                            marginBottom: '4px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{config.icon}</span>
                          {data.name}
                          <span
                            style={{
                              fontSize: '10px',
                              background: config.color + '20',
                              color: config.color,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: 'normal',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {config.label}
                          </span>
                        </div>
                        {data.context && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            "{data.context.substring(0, 80)}..."
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginTop: '8px',
                          }}
                        >
                          {/* Calculated confidence (5-layer) takes priority over AI confidence */}
                          {data.calculated_confidence ? (
                            <>
                              <div style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: data.confidence_band === 'HIGHLY_PROBABLE' ? '#166534'
                                  : data.confidence_band === 'PROBABLE' ? '#854d0e'
                                  : data.confidence_band === 'CONFIRMED' ? '#1e40af'
                                  : '#7f1d1d',
                                color: '#e5e5e5',
                                letterSpacing: '0.5px',
                              }}>
                                {data.confidence_band || 'SCORED'} {Math.round(data.calculated_confidence * 100)}%
                              </div>
                              {data.nato_code && (
                                <div style={{ fontSize: '10px', color: '#888', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                                  NATO {data.nato_code}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                AI Confidence: <span style={{ color: '#e5e5e5' }}>{Math.round(item.confidence * 100)}%</span>
                              </div>
                              <div style={{ fontSize: '9px', color: '#555', fontStyle: 'italic' }}>
                                PRELIMINARY
                              </div>
                            </>
                          )}
                          <div
                            style={{
                              width: '100px',
                              height: '3px',
                              background: '#1a1a1a',
                              borderRadius: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                background: data.calculated_confidence
                                  ? (data.confidence_band === 'HIGHLY_PROBABLE' ? '#22c55e' : data.confidence_band === 'PROBABLE' ? '#eab308' : config.color)
                                  : config.color,
                                width: `${(data.calculated_confidence || item.confidence) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginLeft: '12px',
                        }}
                      >
                        {itemStatus === 'approved' ? (
                          <CheckCircle2
                            style={{
                              width: '18px',
                              height: '18px',
                              color: '#22c55e',
                              flexShrink: 0,
                            }}
                          />
                        ) : itemStatus === 'rejected' ? (
                          <AlertCircle
                            style={{
                              width: '18px',
                              height: '18px',
                              color: '#ef4444',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(item.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(item.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Relationships section */}
        {relationships.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '12px',
                color: '#e5e5e5',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              <LinkIcon style={{ width: '14px', height: '14px' }} />
              EXTRACTED RELATIONSHIPS ({relationships.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relationships.map((item) => {
                const data = item.item_data as any;
                const itemStatus = localApprovals[item.id] || 'pending';

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#111',
                      border: `1px solid ${itemStatus === 'approved' ? '#22c55e' : itemStatus === 'rejected' ? '#ef4444' : '#1a1a1a'}`,
                      borderRadius: '4px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        itemStatus === 'pending' ? '#dc2626' : '';
                      (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        itemStatus === 'approved' ? '#22c55e' : itemStatus === 'rejected' ? '#ef4444' : '#1a1a1a';
                      (e.currentTarget as HTMLElement).style.background = '#111';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            fontSize: '13px',
                            color: '#e5e5e5',
                            marginBottom: '4px',
                            fontWeight: '500',
                          }}
                        >
                          {data.sourceName} → {data.targetName}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#999',
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              background: '#dc262620',
                              color: '#dc2626',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {data.relationshipType}
                          </span>
                          <span
                            style={{
                              background: '#3b82f620',
                              color: '#3b82f6',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {data.evidenceType}
                          </span>
                        </div>
                        {data.description && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {data.description}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#666',
                          }}
                        >
                          Confidence: <span style={{ color: '#e5e5e5' }}>{Math.round(item.confidence * 100)}%</span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          marginLeft: '12px',
                        }}
                      >
                        {itemStatus === 'approved' ? (
                          <CheckCircle2
                            style={{
                              width: '18px',
                              height: '18px',
                              color: '#22c55e',
                              flexShrink: 0,
                            }}
                          />
                        ) : itemStatus === 'rejected' ? (
                          <AlertCircle
                            style={{
                              width: '18px',
                              height: '18px',
                              color: '#ef4444',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(item.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(item.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dates section */}
        {dates.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '12px',
                color: '#e5e5e5',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
              }}
            >
              <Calendar style={{ width: '14px', height: '14px' }} />
              KEY DATES ({dates.length})
            </div>
            <div
              style={{
                background: '#111',
                border: '1px solid #1a1a1a',
                borderRadius: '4px',
                padding: '12px',
              }}
            >
              {dates.map((item) => {
                const data = item.item_data as any;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '8px 0',
                      borderBottom: '1px solid #1a1a1a',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        color: '#eab308',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontWeight: 'bold',
                        minWidth: '80px',
                      }}
                    >
                      {data.date}
                    </div>
                    <div style={{ color: '#999' }}>{data.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '20px',
            justifyContent: 'flex-end',
          }}
        >
          {pendingCount > 0 && (
            <button
              onClick={handleApproveAll}
              style={{
                padding: '10px 16px',
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.8')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}
            >
              APPROVE ALL ({pendingCount})
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: '#1a1a1a',
              color: '#e5e5e5',
              border: '1px solid #dc2626',
              borderRadius: '4px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#dc2626';
              (e.target as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = '#1a1a1a';
              (e.target as HTMLElement).style.color = '#e5e5e5';
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div
      style={{
        background: '#0a0a0a',
        borderRadius: '4px',
        padding: '32px',
        border: '1px solid #ef4444',
        textAlign: 'center',
      }}
    >
      <AlertCircle
        style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          color: '#ef4444',
        }}
      />
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          color: '#e5e5e5',
          fontSize: '14px',
          marginBottom: '16px',
          fontWeight: '500',
        }}
      >
        SCAN FAILED
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
        An error occurred while analyzing the document. Please try again.
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '10px 16px',
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        GO BACK
      </button>
    </div>
  );

  // Modal container
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          background: '#030303',
          borderRadius: '8px',
          border: '1px solid #1a1a1a',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e5e5e5')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#666')}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Content */}
        {stage === 'loading' && renderLoading()}
        {stage === 'scanning' && renderScanning()}
        {stage === 'results' && renderResults()}
        {stage === 'error' && renderError()}
      </div>
    </div>
  );
}
