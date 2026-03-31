'use client';

// ============================================
// PROJECT TRUTH: INVESTIGATION REPLAY
// /truth/investigations/[id] — step-by-step replay
// LOCAL-FIRST: Zustand'dan da okuyabilir
// ============================================

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Play, Pause, SkipForward, GitFork, ThumbsUp, ChevronRight } from 'lucide-react';
import { useInvestigationStore } from '@/store/investigationStore';
import { useChatStore } from '@/store/chatStore';

const Truth3DScene = dynamic(
  () => import('@/components/Truth3DScene'),
  { ssr: false, loading: () => null }
);

interface Step {
  id: string;
  step_order: number;
  query: string;
  response: string;
  highlight_node_ids: string[];
  highlight_link_ids: string[];
  annotations: Record<string, string>;
  node_names: string[];
  created_at: string;
}

interface InvestigationData {
  id: string;
  author_name: string;
  title: string;
  description: string;
  status: string;
  parent_id: string | null;
  fork_count: number;
  step_count: number;
  upvote_count: number;
  significance_score: number;
  view_count: number;
  published_at: string;
}

export default function InvestigationReplayPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise — unwrap with use()
  const { id } = use(params);

  const [investigation, setInvestigation] = useState<InvestigationData | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [forkingId, setForkingId] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  const { fingerprint, initFingerprint, forkInvestigation, currentInvestigation, steps: localSteps } = useInvestigationStore();
  const { setHighlights, clearHighlights } = useChatStore();

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const endCinematicRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initFingerprint();
  }, []);

  // LOCAL investigation — store'dan oku (her render'da güncel)
  const isLocalId = id.startsWith('local_');
  useEffect(() => {
    if (isLocalId && !currentInvestigation) {
      // Store boş — muhtemelen sayfa yenilendi, local veri kayboldu
      setLoading(false);
      return;
    }
    if (isLocalId && currentInvestigation && currentInvestigation.id === id) {
      const localInv: InvestigationData = {
        id: currentInvestigation.id,
        author_name: currentInvestigation.authorName,
        title: currentInvestigation.title || 'Untitled Investigation',
        description: currentInvestigation.description || '',
        status: currentInvestigation.status,
        parent_id: currentInvestigation.parentId || null,
        fork_count: currentInvestigation.forkCount,
        step_count: currentInvestigation.stepCount,
        upvote_count: currentInvestigation.upvoteCount,
        significance_score: currentInvestigation.significanceScore,
        view_count: currentInvestigation.viewCount,
        published_at: currentInvestigation.publishedAt || currentInvestigation.createdAt,
      };

      const localStepsMapped: Step[] = localSteps.map((s, i) => ({
        id: s.id || `step_${i}`,
        step_order: s.stepOrder,
        query: s.query,
        response: s.response,
        highlight_node_ids: s.highlightNodeIds,
        highlight_link_ids: s.highlightLinkIds,
        annotations: s.annotations,
        node_names: s.nodeNames,
        created_at: new Date(s.createdAt).toISOString(),
      }));

      setInvestigation(localInv);
      setSteps(localStepsMapped);
      setUpvoteCount(localInv.upvote_count);
      setIsLocal(true);
      setLoading(false);
    }
  }, [isLocalId, currentInvestigation, id]);

  // REMOTE investigation — API'den oku
  useEffect(() => {
    if (isLocalId) return; // local ID ise API'ye gitme
    const loadRemote = async () => {
      try {
        const invRes = await fetch(`/api/investigation/${id}`);
        const invData = await invRes.json();
        setInvestigation(invData.investigation);
        setSteps(invData.steps || []);
        setUpvoteCount(invData.investigation?.upvote_count || 0);
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadRemote();
  }, [id, isLocalId]);

  // Nodes — her zaman API'den
  useEffect(() => {
    fetch('/api/truth')
      .then(res => res.json())
      .then(data => {
        setNodes(data.nodes || []);
        setLinks(data.links || []);
      })
      .catch(e => console.error('Nodes load error:', e));
  }, []);

  // Adıma git
  const goToStep = (index: number) => {
    setActiveStep(index);
    const step = steps[index];
    if (step) {
      setHighlights(
        step.highlight_node_ids || [],
        step.highlight_link_ids || [],
        step.highlight_node_ids?.[0] || null
      );
    }
  };

  // Otomatik oynat
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setActiveStep(prev => {
          const next = (prev === null ? 0 : prev + 1);
          if (next >= steps.length) {
            setIsPlaying(false);
            return prev;
          }
          // setHighlights'ı setState dışında çağır (React render sırasında state güncellemesi hatası)
          const step = steps[next];
          if (step) {
            setTimeout(() => {
              setHighlights(
                step.highlight_node_ids || [],
                step.highlight_link_ids || [],
                step.highlight_node_ids?.[0] || null
              );
            }, 0);
          }
          return next;
        });
      }, 3000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, steps]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearHighlights();
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  const handleVote = async () => {
    if (!fingerprint || hasVoted || isLocal) return;
    try {
      const res = await fetch('/api/investigation/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigationId: id, fingerprint }),
      });
      const data = await res.json();
      setUpvoteCount(data.upvote_count);
      setHasVoted(data.action === 'added');
    } catch (e) {
      console.error('Vote error:', e);
    }
  };

  const handleFork = async () => {
    if (!fingerprint || forkingId || isLocal) return;
    setForkingId(true);
    try {
      const result = await forkInvestigation(id);
      if (result) {
        window.location.href = '/truth';
      }
    } finally {
      setForkingId(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#4b5563', fontFamily: 'Courier New, monospace' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid #7f1d1d', borderTopColor: '#dc2626', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          YÜKLENİYOR...
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '14px', fontFamily: 'Courier New, monospace', marginBottom: '16px' }}>INVESTIGATION NOT FOUND</div>
          <Link href="/truth" style={{ color: '#dc2626', fontSize: '13px', textDecoration: 'none' }}>← Back to Network</Link>
        </div>
      </div>
    );
  }

  const currentHighlightIds = activeStep !== null ? (steps[activeStep]?.highlight_node_ids || []) : [];
  const currentLinkIds = activeStep !== null ? (steps[activeStep]?.highlight_link_ids || []) : [];
  const currentAnnotations = activeStep !== null ? (steps[activeStep]?.annotations || {}) : {};

  return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(220,38,38,0.2)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: 'linear-gradient(180deg, rgba(127,29,29,0.1), transparent)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <Link
          href="/truth"
          style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '11px', fontFamily: 'Courier New, monospace', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        >
          <ArrowLeft size={13} /> BACK TO NETWORK
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ color: '#dc2626', fontSize: '10px', fontFamily: 'Courier New, monospace', letterSpacing: '0.15em' }}>
              INVESTIGATION FILE / {investigation.author_name}
            </span>
            {isLocal && (
              <span style={{
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#eab308',
                padding: '1px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'Courier New, monospace',
                letterSpacing: '0.1em',
              }}>
                LOCAL
              </span>
            )}
          </div>
          <h1 style={{ color: '#e5e5e5', fontSize: '17px', fontWeight: 'bold', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {investigation.title || 'Untitled Investigation'}
          </h1>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {!isLocal && (
            <>
              <button
                onClick={handleVote}
                disabled={!fingerprint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: hasVoted ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.08)',
                  border: `1px solid ${hasVoted ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.2)'}`,
                  color: hasVoted ? '#fca5a5' : '#6b7280',
                  padding: '6px 12px', borderRadius: '5px',
                  fontSize: '12px', fontFamily: 'Courier New, monospace',
                  cursor: fingerprint ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                }}
              >
                <ThumbsUp size={13} /> {upvoteCount}
              </button>

              <button
                onClick={handleFork}
                disabled={!fingerprint || forkingId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(107,114,128,0.08)',
                  border: '1px solid rgba(107,114,128,0.2)',
                  color: '#9ca3af',
                  padding: '6px 12px', borderRadius: '5px',
                  fontSize: '12px', fontFamily: 'Courier New, monospace',
                  cursor: fingerprint && !forkingId ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                }}
              >
                <GitFork size={13} />
                {forkingId ? 'CONTINUING...' : 'CONTINUE'}
              </button>
            </>
          )}

          {isLocal && (
            <Link
              href="/truth"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.35)',
                color: '#fca5a5',
                padding: '6px 14px', borderRadius: '5px',
                fontSize: '12px', fontFamily: 'Courier New, monospace',
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
            >
              ARAŞTIRMAYA CONTINUE →
            </Link>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Sol Panel — Adımlar */}
        <div style={{
          width: '320px',
          flexShrink: 0,
          borderRight: '1px solid rgba(220,38,38,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Playback controls */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <button
              onClick={() => { setActiveStep(0); setIsPlaying(true); goToStep(0); }}
              disabled={steps.length === 0 || isPlaying}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(220,38,38,0.15)',
                border: '1px solid rgba(220,38,38,0.3)',
                color: '#fca5a5', padding: '5px 12px', borderRadius: '4px',
                fontSize: '11px', fontFamily: 'Courier New, monospace',
                cursor: steps.length > 0 && !isPlaying ? 'pointer' : 'not-allowed',
              }}
            >
              <Play size={11} /> PLAY
            </button>

            {isPlaying && (
              <button
                onClick={() => setIsPlaying(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af', padding: '5px 10px', borderRadius: '4px',
                  fontSize: '11px', fontFamily: 'Courier New, monospace', cursor: 'pointer',
                }}
              >
                <Pause size={11} /> PAUSE
              </button>
            )}

            <div style={{ flex: 1 }} />
            <span style={{ color: '#4b5563', fontSize: '11px', fontFamily: 'Courier New, monospace' }}>
              {steps.length} STEPS
            </span>
          </div>

          {/* Step list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => { setIsPlaying(false); goToStep(i); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: activeStep === i ? 'rgba(220,38,38,0.12)' : 'transparent',
                  border: `1px solid ${activeStep === i ? 'rgba(220,38,38,0.35)' : 'transparent'}`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  marginBottom: '4px',
                  transition: 'all 0.15s',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
                onMouseEnter={e => {
                  if (activeStep !== i) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.15)';
                  }
                }}
                onMouseLeave={e => {
                  if (activeStep !== i) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }
                }}
              >
                {/* Step number */}
                <div style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: activeStep === i ? '#dc2626' : 'rgba(127,29,29,0.3)',
                  color: activeStep === i ? '#fff' : '#991b1b',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Courier New, monospace',
                  marginTop: '1px',
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Query */}
                  <div style={{
                    color: activeStep === i ? '#fca5a5' : '#9ca3af',
                    fontSize: '12px',
                    fontWeight: activeStep === i ? 'bold' : 'normal',
                    marginBottom: '3px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {step.query}
                  </div>

                  {/* Highlighted nodes */}
                  {step.node_names && step.node_names.length > 0 && (
                    <div style={{ color: '#4b5563', fontSize: '10px', fontFamily: 'Courier New, monospace' }}>
                      {step.node_names.slice(0, 3).join(', ')}
                      {step.node_names.length > 3 && ` +${step.node_names.length - 3}`}
                    </div>
                  )}
                </div>

                <ChevronRight size={12} style={{ color: activeStep === i ? '#dc2626' : '#374151', flexShrink: 0, marginTop: '3px' }} />
              </button>
            ))}
          </div>

          {/* Active step detail */}
          {activeStep !== null && steps[activeStep] && (
            <div style={{
              borderTop: '1px solid rgba(220,38,38,0.15)',
              padding: '14px 16px',
              background: 'rgba(127,29,29,0.05)',
              maxHeight: '180px',
              overflowY: 'auto',
            }}>
              <div style={{ color: '#dc2626', fontSize: '10px', fontFamily: 'Courier New, monospace', letterSpacing: '0.1em', marginBottom: '8px' }}>
                AI RESPONSE
              </div>
              <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                {steps[activeStep].response}
              </p>
            </div>
          )}
        </div>

        {/* Sağ — 3D Sahne */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {nodes.length > 0 && (
            <Truth3DScene
              nodes={nodes}
              links={links}
              onNodeClick={() => {}}
              onLinkClick={() => {}}
              registerEndCinematic={(fn) => { endCinematicRef.current = fn; }}
              cinematicActive={false}
              onCinematicEnd={() => {}}
              highlightNodeIds={currentHighlightIds}
              highlightLinkIds={currentLinkIds}
              focusNodeId={currentHighlightIds[0] || null}
              annotations={currentAnnotations}
            />
          )}

          {/* Empty state */}
          {activeStep === null && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center', color: '#374151' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔦</div>
                <div style={{ fontSize: '13px', fontFamily: 'Courier New, monospace' }}>
                  Sol panelden bir adım seç
                </div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  veya PLAY&apos;a bas
                </div>
              </div>
            </div>
          )}

          {/* Playback progress bar */}
          {isPlaying && steps.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'rgba(220,38,38,0.2)',
            }}>
              <div style={{
                height: '100%',
                background: '#dc2626',
                width: `${((activeStep ?? 0) + 1) / steps.length * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
