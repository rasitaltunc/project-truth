'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, Brain, DollarSign, Heart, X, ArrowLeftRight, Calendar, FileText, Lightbulb, Shield, Eye } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ArchiveModal from '@/components/ArchiveModal';
import { useTruthRealtime } from '@/hooks/useTruthRealtime';
import { UserBadge } from '@/components/UserBadge';
import { DocumentSubmission } from '@/components/DocumentSubmission';
import { FollowTheMoneyPanel } from '@/components/FollowTheMoneyPanel';
import { ConnectionTimelinePanel, ConnectionData } from '@/components/ConnectionTimelinePanel';
import { SystemPulsePanel } from '@/components/SystemPulsePanel';
import { useChatStore } from '@/store/chatStore';
import ChatPanel from '@/components/ChatPanel';
import StoryPanel from '@/components/StoryPanel';
import IsikTutForm from '@/components/IsikTutForm';
import InvestigationBanner from '@/components/InvestigationBanner';
import { useInvestigationStore } from '@/store/investigationStore';
// Sprint 6A: Badge & Verification
import { useBadgeStore } from '@/store/badgeStore';
import ProfilePanel from '@/components/ProfilePanel';
// Sprint 5: Kolektif Zeka
import { useNodeStatsStore } from '@/store/nodeStatsStore';
import { useFirstDiscovery, useClearFirstDiscovery } from '@/store/chatStore';
import FirstDiscoveryBanner from '@/components/FirstDiscoveryBanner';
// Sprint 6B: Epistemolojik Katman
import EpistemologicalLegend from '@/components/EpistemologicalLegend';
// Sprint 6C: Konuşan İpler
import { useLinkEvidenceStore } from '@/store/linkEvidenceStore';
// Sprint 14A: Simülasyon Tüneli
import { useTunnelStore } from '@/store/tunnelStore';
import LinkEvidencePanel from '@/components/LinkEvidencePanel';
import CorridorOverlay from '@/components/CorridorOverlay';
import CorridorWalkOverlay from '@/components/CorridorWalkOverlay';
// Sprint 7: Akıllı Lens
import { useViewModeStore, countVisibleNodes } from '@/store/viewModeStore';
import LensSidebar from '@/components/LensSidebar';
import TimelineSlider from '@/components/TimelineSlider';
import LensEmptyState from '@/components/LensEmptyState';
import LensTransitionFlash from '@/components/LensTransitionFlash';
// Sprint 8: Soruşturma Panosu
import { useBoardStore } from '@/store/boardStore';
import BoardTransition from '@/components/InvestigationBoard/BoardTransition';
// Sprint 10: Sinematik Açılış + İP UZAT + Guided Tour
import { useCinematicStore } from '@/store/cinematicStore';
import { useThreadingStore } from '@/store/threadingStore';
import { useGuidedTourStore } from '@/store/guidedTourStore';
import CinematicOpening from '@/components/CinematicOpening';
import GuidedTour from '@/components/GuidedTour';
const ThreadingMode = dynamic(
  () => import('@/components/ThreadingMode'),
  { ssr: false, loading: () => null }
);
const ProposeLinkModal = dynamic(
  () => import('@/components/ProposeLinkModal'),
  { ssr: false, loading: () => null }
);
const ProposedLinkPanel = dynamic(
  () => import('@/components/ProposedLinkPanel'),
  { ssr: false, loading: () => null }
);

// Sprint 9: Gazeteci Kalkanı
const DeadManSwitchPanel = dynamic(
  () => import('@/components/DeadManSwitchPanel'),
  { ssr: false, loading: () => null }
);
// Sprint 13: Kolektif Kalkan
const CollectiveShieldPanel = dynamic(
  () => import('@/components/CollectiveShieldPanel'),
  { ssr: false, loading: () => null }
);
// Sprint 14A: Simülasyon Tüneli
const TunnelScene = dynamic(
  () => import('@/components/Tunnel/TunnelScene'),
  { ssr: false, loading: () => null }
);
const TunnelBootSequence = dynamic(
  () => import('@/components/Tunnel/TunnelBootSequence'),
  { ssr: false, loading: () => null }
);
const TunnelHUD = dynamic(
  () => import('@/components/Tunnel/TunnelHUD'),
  { ssr: false, loading: () => null }
);
const TunnelComingSoon = dynamic(
  () => import('@/components/Tunnel/TunnelComingSoon'),
  { ssr: false, loading: () => null }
);
const MediaUploader = dynamic(
  () => import('@/components/MediaUpload/MediaUploader'),
  { ssr: false, loading: () => null }
);

// SSR devre dışı - framer-motion hydration sorunu için
const DocumentOCRUpload = dynamic(
  () => import('@/components/DocumentOCRUpload'),
  { ssr: false, loading: () => null }
);

// 3D SAHNE - VANILLA THREE.JS - SSR DEVRE DIŞI
const Truth3DScene = dynamic(
  () => import('@/components/Truth3DScene'),
  { ssr: false, loading: () => null }
);

// Sprint 8: 2D SORUŞTURMA PANOSU - SSR DEVRE DIŞI
const InvestigationBoard = dynamic(
  () => import('@/components/InvestigationBoard/Board'),
  { ssr: false, loading: () => null }
);

export default function Truth3D() {
    const [nodes, setNodes] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [selectedConnection, setSelectedConnection] = useState<ConnectionData | null>(null);
    const [showDocSubmit, setShowDocSubmit] = useState(false);
    const [showMoneyTracker, setShowMoneyTracker] = useState(false);
    const [showSystemPulse, setShowSystemPulse] = useState(false);
    const [showIsikTut, setShowIsikTut] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    // Sprint 9: Gazeteci Kalkanı
    const [showDMS, setShowDMS] = useState(false);
    // Sprint 13: Kolektif Kalkan
    const [showCollectiveShield, setShowCollectiveShield] = useState(false);
    // Sprint 10: Sinematik Açılış + İP UZAT
    const { initCinematic, startCinematic, isActive: cinematicIsActive, phase: cinematicPhase, nodeRevealCount: cinematicNodeReveal, linkReveal: cinematicLinkReveal, hasSeenOpening } = useCinematicStore();
    const {
      isThreadingActive, showProposalForm, showDetailPanel, sourceNodeId,
      sourceNodeLabel, targetNodeId, stopThreading, selectTarget,
      setShowProposalForm, setShowDetailPanel, selectGhostLink,
      fetchGhostLinks, ghostLinks, selectedGhostLink,
    } = useThreadingStore();
    // Sprint 6B: Epistemolojik Mod
    const [epistemologicalMode, setEpistemologicalMode] = useState(false);
    const [activeLinkDetail, setActiveLinkDetail] = useState<{
        sourceId: string; targetId: string;
        sourceLabel: string; targetLabel: string;
        label?: string; type?: string;
    } | null>(null);

    const { isArchiveOpen, closeArchive, openArchive } = useStore();

    // 🤖 AI CHAT STATE
    const { highlightedNodeIds, highlightedLinkIds, focusNodeId, annotations, clearHighlights, isChatOpen } = useChatStore();

    // 🔍 INVESTIGATION — fingerprint başlat
    const { initFingerprint } = useInvestigationStore();
    useEffect(() => { initFingerprint(); }, []);

    // 🏷️ SPRINT 6A: BADGE STORE — init fingerprint + fetch badge
    const { initFingerprint: initBadgeFp, fetchUserBadge } = useBadgeStore();
    useEffect(() => {
        const fp = initBadgeFp();
        fetchUserBadge(fp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🔥 SPRINT 5: Kolektif Zeka — Heat Map + First Discovery
    const firstDiscovery = useFirstDiscovery();
    const clearFirstDiscovery = useClearFirstDiscovery();
    const { fetchStats, buildHeatMap, buildConsensusMap, isLoaded: statsLoaded } = useNodeStatsStore();

    useEffect(() => { fetchStats(); }, []);

    // Sprint 10: Sinematik açılış init + ghost links fetch
    const { startTour } = useGuidedTourStore();

    useEffect(() => { initCinematic(); }, []);
    useEffect(() => {
      if (!loading && nodes.length > 0 && cinematicPhase === 'idle' && !hasSeenOpening) {
        startCinematic(nodes.length);
      }
    }, [loading, nodes.length, cinematicPhase, hasSeenOpening]);

    // Sinematik bitince → guided tour başlat (1.5s delay for smooth transition)
    useEffect(() => {
      if (cinematicPhase === 'complete' && !cinematicIsActive) {
        const timer = setTimeout(() => startTour(), 1500);
        return () => clearTimeout(timer);
      }
    }, [cinematicPhase, cinematicIsActive]);

    useEffect(() => {
      if (!loading) {
        fetchGhostLinks().catch(() => {});
      }
    }, [loading]);

    // Heat map: nodeId → 0.0-1.0 (memoized — sadece stats değişince rebuild)
    const nodeHeatMap = useMemo(() => {
        if (!statsLoaded) return undefined;
        return buildHeatMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsLoaded, buildHeatMap]);

    // Consensus annotations: nodeId → label (10+ aynı label → kalıcı)
    const consensusAnnotations = useMemo(() => {
        if (!statsLoaded) return undefined;
        return buildConsensusMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsLoaded, buildConsensusMap]);

    // 🔴 REALTIME
    const { isConnected: isRealtimeConnected } = useTruthRealtime({
        enabled: true,
        onNodeChange: (event) => {
            if (event.type === 'INSERT' && event.data) setNodes(prev => [...prev, event.data]);
            else if (event.type === 'UPDATE' && event.data) setNodes(prev => prev.map(n => n.id === event.data.id ? event.data : n));
            else if (event.type === 'DELETE' && event.data) setNodes(prev => prev.filter(n => n.id !== event.data.id));
        },
        onLinkChange: (event) => {
            if (event.type === 'INSERT' && event.data) setLinks(prev => [...prev, event.data]);
            else if (event.type === 'DELETE' && event.data) setLinks(prev => prev.filter(l => !(l.source === event.data.source && l.target === event.data.target)));
        },
    });

    // DATA FETCH (with 5s safety timeout)
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            console.warn('⏱️ API timeout - force loading off');
            setLoading(false);
        }, 5000);

        fetch('/api/truth')
            .then(res => res.json())
            .then(data => {
                clearTimeout(safetyTimeout);
                setNodes(data.nodes || []);
                setLinks(data.links || []);
                setLoading(false);
            })
            .catch(e => {
                clearTimeout(safetyTimeout);
                console.error('API Error:', e);
                setLoading(false);
            });

        return () => clearTimeout(safetyTimeout);
    }, []);

    const handleNodeClick = useCallback((node: any) => {
        // Sprint 10: İP UZAT threading mode — hedef seçimi
        if (useThreadingStore.getState().isThreadingActive) {
            const sourceId = useThreadingStore.getState().sourceNodeId;
            if (sourceId && node.id !== sourceId) {
                selectTarget(node.id);
            }
            return; // Threading modda archive açma
        }

        setSelectedNode(node);

        // Evidence, timeline ve connections artık API'den node ile birlikte geliyor
        // Ekstra fetch'e gerek yok — doğrudan aç
        setTimeout(() => {
            openArchive({
                ...node,
                evidence: node.evidence || [],
                timeline: node.timeline || [],
                connections: node.connections || [],
            });
        }, 300);
    }, [openArchive]);

    const endCinematicRef = useRef<(() => void) | null>(null);

    // Sprint 7: Akıllı Lens — view mode store
    const { activeMode: viewMode, timelineRange, setMode: setViewModeFn } = useViewModeStore();

    // Sprint 8: Soruşturma Panosu — board mode
    const isBoardMode = viewMode === 'board';
    const { enterBoardMode, exitBoardMode } = useBoardStore();

    // Board moduna giriş/çıkış
    const handleEnterBoard = useCallback(() => {
      enterBoardMode();
      setViewModeFn('board');
    }, [enterBoardMode, setViewModeFn]);

    const handleExitBoard = useCallback(() => {
      exitBoardMode();
      setViewModeFn('full_network');
    }, [exitBoardMode, setViewModeFn]);

    // Sprint 7.5: Empty state — kaç node bu lens'te görünür?
    const visibleNodeCount = useMemo(
        () => countVisibleNodes(nodes, viewMode, timelineRange),
        [nodes, viewMode, timelineRange],
    );

    // Sprint 10: getNodeLabel helper (for ProposedLinkPanel)
    const getNodeLabel = useCallback((id: string) => {
      const node = nodes.find(n => n.id === id);
      return node?.label || node?.name || id.slice(0, 10);
    }, [nodes]);

    // Sprint 10: ghostLinks → 3D sahneye proxy linkler (accepted olanları normal ağa ekleme)
    const ghostLinkData = useMemo(() => {
      return ghostLinks.filter(gl => gl.status !== 'accepted' && gl.status !== 'rejected');
    }, [ghostLinks]);

    // Sprint 6C: Konuşan İpler — link evidence store
    const { fetchLinkEvidence, clearActiveLink, data: linkEvidenceData, cache: linkEvidenceCache,
        corridorWalkMode, corridorWalkProgress, corridorWalkPhase, setCorridorWalkPhase } = useLinkEvidenceStore();

    // Sprint 6C: linkEvidenceMap — cache'deki tüm link evidence verilerini 3D sahneye sun
    const linkEvidenceMap = useMemo(() => {
        if (!linkEvidenceCache || linkEvidenceCache.size === 0) return undefined;
        const map = new Map<string, { evidenceCount: number; keystoneCount: number; dateRange: { earliest: string; latest: string } | null }>();
        linkEvidenceCache.forEach((data, key) => {
            map.set(key, {
                evidenceCount: data.totalCount,
                keystoneCount: data.keystoneCount,
                dateRange: data.dateRange,
            });
        });
        return map;
    }, [linkEvidenceCache]);

    const handleLinkClick = useCallback((linkData: {
        sourceId: string; targetId: string;
        sourceLabel: string; targetLabel: string;
        label?: string; type?: string;
    }) => {
        setActiveLinkDetail(linkData);
        // Sprint 6C: Evidence timeline'ı fetch et (fire-and-forget)
        fetchLinkEvidence(linkData.sourceId, linkData.targetId);
    }, [fetchLinkEvidence]);

    const closeLinkDetail = useCallback(() => {
        setActiveLinkDetail(null);
        // Tell 3D scene to restore camera from cinematic mode
        if (endCinematicRef.current) {
            endCinematicRef.current();
        }
    }, []);

    // Sprint 7.5: Reset artık lens'i de sıfırlıyor
    const { dismissAiSuggestion: clearAiSuggestion } = useViewModeStore();

    const handleReset = useCallback(() => {
        setSelectedNode(null);
        setSelectedConnection(null);
        closeArchive();
        clearHighlights();
        // Board modundaysa çık
        if (useBoardStore.getState().isBoardMode) {
            exitBoardMode();
        }
        // Lens → full_network'e dön
        setViewModeFn('full_network');
        clearAiSuggestion();
    }, [closeArchive, clearHighlights, setViewModeFn, clearAiSuggestion, exitBoardMode]);

    return (
        <>
            {/* === 3D SAHNE === */}
            <div style={{ position: 'fixed', inset: 0, backgroundColor: '#030303' }}>

                {/* 3D CANVAS - loading bitmeden render etme, board modunda gizle */}
                {!loading && !isBoardMode && (
                    <Truth3DScene
                        nodes={nodes}
                        links={links}
                        onNodeClick={handleNodeClick}
                        onLinkClick={handleLinkClick}
                        registerEndCinematic={(fn) => { endCinematicRef.current = fn; }}
                        cinematicActive={activeLinkDetail !== null}
                        onCinematicEnd={() => { setActiveLinkDetail(null); clearHighlights(); }}
                        highlightNodeIds={highlightedNodeIds}
                        highlightLinkIds={highlightedLinkIds}
                        focusNodeId={focusNodeId}
                        annotations={annotations}
                        nodeHeatMap={nodeHeatMap}
                        consensusAnnotations={consensusAnnotations}
                        epistemologicalMode={epistemologicalMode}
                        linkEvidenceMap={linkEvidenceMap}
                        viewMode={viewMode}
                        timelineRange={timelineRange}
                        ghostLinks={ghostLinkData}
                        cinematicNodeReveal={cinematicNodeReveal}
                        cinematicLinkReveal={cinematicLinkReveal}
                        isThreadingActive={isThreadingActive}
                        threadingSourceId={sourceNodeId}
                        onGhostLinkClick={(gl) => selectGhostLink(gl)}
                        corridorWalkMode={corridorWalkMode}
                        corridorWalkProgress={corridorWalkProgress}
                        corridorWalkPhase={corridorWalkPhase}
                        corridorWalkSourceId={activeLinkDetail?.sourceId}
                        corridorWalkTargetId={activeLinkDetail?.targetId}
                        onCorridorWalkPhaseChange={setCorridorWalkPhase}
                    />
                )}

                {/* Sprint 8: 2D SORUŞTURMA PANOSU — board modunda göster */}
                {!loading && isBoardMode && (
                    <InvestigationBoard
                        nodes={nodes.map(n => ({
                            id: n.id,
                            name: n.name || n.label || 'Bilinmeyen',
                            type: n.type,
                            tier: n.tier,
                            risk: n.risk ?? n.defcon_score ?? 50,
                            image_url: n.image_url,
                            verification_level: n.verification_level || n.verification_status,
                            occupation: n.occupation || n.role,
                        }))}
                        links={links.map(l => ({
                            id: l.id || `${l.source_id || l.source}-${l.target_id || l.target}`,
                            source_id: l.source_id || l.source,
                            target_id: l.target_id || l.target,
                            label: l.label || l.description,
                            evidence_type: l.evidence_type || l.relationship_type,
                            confidence_level: l.confidence_level,
                            evidence_count: l.evidence_count,
                        }))}
                        onNodeClick={(nodeId) => {
                            const node = nodes.find(n => n.id === nodeId);
                            if (node) {
                                setSelectedNode(node);
                                // Seçim bilgisini göster ama modal açma
                            }
                        }}
                        onNodeDoubleClick={(nodeId) => {
                            const node = nodes.find(n => n.id === nodeId);
                            if (node) handleNodeClick(node);
                        }}
                        onLinkClick={(linkId) => {
                            const link = links.find(l =>
                                l.id === linkId ||
                                `${l.source_id || l.source}-${l.target_id || l.target}` === linkId
                            );
                            if (link) {
                                const sourceNode = nodes.find(n => n.id === (link.source_id || link.source));
                                const targetNode = nodes.find(n => n.id === (link.target_id || link.target));
                                handleLinkClick({
                                    sourceId: link.source_id || link.source,
                                    targetId: link.target_id || link.target,
                                    sourceLabel: sourceNode?.name || sourceNode?.label || '?',
                                    targetLabel: targetNode?.name || targetNode?.label || '?',
                                    label: link.label || link.description,
                                    type: link.evidence_type || link.relationship_type,
                                });
                            }
                        }}
                        onExitBoard={handleExitBoard}
                    />
                )}

                {/* Sprint 7: Akıllı Lens — sidebar (sol kenar) */}
                <div data-tour="lens-sidebar">
                  <LensSidebar />
                </div>

                {/* Sprint 7.5: Lens geçiş flash efekti */}
                <LensTransitionFlash />

                {/* Sprint 8: 3D ↔ 2D geçiş animasyonu */}
                <BoardTransition />

                {/* Sprint 6B: Epistemolojik Legend — board modunda gizle */}
                {!isBoardMode && (
                    <EpistemologicalLegend
                        epistemologicalMode={epistemologicalMode}
                        onToggle={() => setEpistemologicalMode(!epistemologicalMode)}
                    />
                )}

                {/* Sprint 6C: Link Evidence Panel — link tıklandığında sağda açılır */}
                {!isBoardMode && <LinkEvidencePanel />}

                {/* Sprint 6C: Koridor Overlay — kronolojik yolculuk modu */}
                {!isBoardMode && <CorridorOverlay />}
                {!isBoardMode && <CorridorWalkOverlay />}

                {/* Sprint 14A: Simülasyon Tüneli — 3D koridor deneyimi */}
                <TunnelScene />
                <TunnelBootSequence />
                <TunnelHUD />
                <TunnelComingSoon />

                {/* Sprint 7: Timeline Slider — sadece timeline modunda görünür */}
                {!isBoardMode && <TimelineSlider />}

                {/* Sprint 7.5: Empty State — lens'te veri yoksa yardımcı mesaj */}
                {!isBoardMode && (
                    <LensEmptyState
                        mode={viewMode}
                        visibleNodeCount={visibleNodeCount}
                        totalNodeCount={nodes.length}
                    />
                )}

                {/* BAŞLIK */}
                <div style={{ position: 'absolute', top: 0, left: 0, padding: '2rem', pointerEvents: 'none', zIndex: 10 }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.05em', margin: 0 }}>PROJECT TRUTH</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <div style={{ width: '60px', height: '1px', backgroundColor: '#991b1b' }} />
                        <span style={{ fontSize: '10px', color: '#991b1b', letterSpacing: '0.3em', fontFamily: 'monospace' }}>EVIDENCE MAP / CLASSIFIED</span>
                        <span style={{
                            fontSize: '9px',
                            padding: '2px 8px',
                            backgroundColor: isRealtimeConnected ? '#16a34a' : '#991b1b',
                            color: isRealtimeConnected ? '#bbf7d0' : '#fecaca',
                            borderRadius: '2px',
                            transition: 'all 0.3s ease'
                        }}>
                            {isRealtimeConnected ? '● LIVE' : '○ OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* USER BADGE */}
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 20, pointerEvents: 'auto' }}>
                    <UserBadge onProfileClick={() => setShowProfilePanel(true)} />
                </div>

                {/* STATS */}
                <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', fontSize: '10px', color: '#991b1b40', fontFamily: 'monospace', pointerEvents: 'none', zIndex: 10 }}>
                    <div>NODES: {nodes.length}</div>
                    <div>CONNECTIONS: {links.length}</div>
                </div>

                {/* ANALYZE DOC — board modunda gizle */}
                {!isBoardMode && <button
                    data-tour="toolbar-area"
                    onClick={() => setShowDocSubmit(true)}
                    style={{
                        position: 'absolute', bottom: '2rem', right: '6rem',
                        padding: '12px 16px', backgroundColor: '#7f1d1d',
                        border: '1px solid #dc2626', borderRadius: '4px',
                        color: '#fecaca', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <Brain size={16} />
                    ANALYZE DOC
                </button>}

                {/* FOLLOW THE MONEY — board modunda gizle */}
                {!isBoardMode &&
                <button
                    onClick={() => setShowMoneyTracker(true)}
                    style={{
                        position: 'absolute', bottom: '6rem', right: '2rem',
                        padding: '10px 16px', backgroundColor: '#0a0a0a',
                        border: '1px solid #22c55e50', borderRadius: '4px',
                        color: '#22c55e', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <DollarSign size={16} />
                    FOLLOW THE MONEY
                </button>}

                {/* SYSTEM PULSE — board modunda gizle */}
                {!isBoardMode &&
                <button
                    onClick={() => setShowSystemPulse(true)}
                    style={{
                        position: 'absolute', bottom: '10rem', right: '2rem',
                        padding: '10px 16px', backgroundColor: '#0a0a0a',
                        border: '1px solid #dc262650', borderRadius: '4px',
                        color: '#dc2626', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <Heart size={16} />
                    SYSTEM PULSE
                </button>}

                {/* IŞIK TUT — board modunda gizle */}
                {!isBoardMode &&
                <button
                    onClick={() => setShowIsikTut(true)}
                    style={{
                        position: 'absolute', bottom: '14rem', right: '2rem',
                        padding: '10px 16px', backgroundColor: '#0a0a0a',
                        border: '1px solid #fbbf2450', borderRadius: '4px',
                        color: '#fbbf24', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <Lightbulb size={16} />
                    IŞIK TUT
                </button>}

                {/* GAZETECİ KALKANI (DMS) — board modunda gizle */}
                {!isBoardMode &&
                <button
                    data-tour="journalist-shield"
                    onClick={() => setShowDMS(true)}
                    style={{
                        position: 'absolute', bottom: '18rem', right: '2rem',
                        padding: '10px 16px', backgroundColor: '#0a0a0a',
                        border: '1px solid #8b5cf650', borderRadius: '4px',
                        color: '#8b5cf6', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <Shield size={16} />
                    GAZETECİ KALKANI
                </button>}

                {/* KOLEKTİF KALKAN — board modunda gizle */}
                {!isBoardMode &&
                <button
                    onClick={() => setShowCollectiveShield(true)}
                    style={{
                        position: 'absolute', bottom: '22rem', right: '2rem',
                        padding: '10px 16px', backgroundColor: '#0a0a0a',
                        border: '1px solid #dc262650',
                        color: '#dc2626', cursor: 'pointer', zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em'
                    }}
                >
                    <Shield size={16} />
                    KOLEKTİF KALKAN
                </button>}

                {/* RESET */}
                <button
                    onClick={handleReset}
                    style={{
                        position: 'absolute', bottom: '2rem', right: '2rem',
                        padding: '12px', backgroundColor: '#0a0a0a',
                        border: '1px solid #991b1b50', borderRadius: '4px',
                        color: '#991b1b', cursor: 'pointer', zIndex: 10
                    }}
                >
                    <RefreshCw size={18} />
                </button>

                {/* LOADING */}
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#000000', zIndex: 50
                    }}>
                        <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                            <div style={{
                                width: '40px', height: '40px',
                                border: '2px solid #7f1d1d',
                                borderTopColor: '#dc2626',
                                borderRadius: '50%',
                                margin: '0 auto 1rem',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span style={{ color: '#dc2626', letterSpacing: '0.3em', fontSize: '11px' }}>
                                LOADING EVIDENCE MAP...
                            </span>
                        </div>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}
            </div>

            {/* === SPRINT 10: SİNEMATİK AÇILIŞ === */}
            <CinematicOpening />

            {/* === SPRINT 10: GUIDED TOUR (sinematikten sonra) === */}
            <GuidedTour />

            {/* === SPRINT 10: İP UZAT — Threading Mode Bar === */}
            <ThreadingMode />

            {/* === SPRINT 10: İP UZAT — Bağlantı Önerisi Formu === */}
            {showProposalForm && sourceNodeId && targetNodeId && (
                <ProposeLinkModal
                    fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
                    badgeTier={useBadgeStore.getState().globalBadge?.badge_tier || 'community'}
                    reputation={useBadgeStore.getState().reputation?.score || 100}
                    sourceLabel={getNodeLabel(sourceNodeId)}
                    targetLabel={getNodeLabel(targetNodeId)}
                    onClose={() => {
                      setShowProposalForm(false);
                      stopThreading();
                    }}
                />
            )}

            {/* === SPRINT 10: İP UZAT — Hayalet Link Detay Paneli === */}
            {showDetailPanel && selectedGhostLink && (
                <ProposedLinkPanel
                    fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
                    badgeTier={useBadgeStore.getState().globalBadge?.badge_tier || 'community'}
                    onClose={() => {
                      setShowDetailPanel(false);
                      selectGhostLink(null);
                    }}
                    getNodeLabel={getNodeLabel}
                />
            )}

            {/* === SPRINT 5: İLK KEŞFEDENi BANNER === */}
            {firstDiscovery && (
                <FirstDiscoveryBanner
                    nodeName={firstDiscovery.nodeName}
                    onDismiss={clearFirstDiscovery}
                />
            )}

            {/* === AI CHAT PANEL (SOL) === */}
            <div data-tour="chat-panel">
            <ChatPanel
                nodes={nodes}
                links={links}
                onNodeHighlight={(nodeId) => {
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) handleNodeClick(node);
                }}
                footer={<InvestigationBanner />}
            />
            </div>

            {/* === STORY PANEL (SAĞ) — only when chat has highlights and no link detail open === */}
            {!activeLinkDetail && (
                <StoryPanel
                    nodes={nodes}
                    onNodeClick={(nodeId) => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (node) handleNodeClick(node);
                    }}
                />
            )}

            {/* === MODALS === */}
            {isArchiveOpen && <ArchiveModal />}

            {/* LINK DETAIL — CINEMATIC SIDE PANEL */}
            {activeLinkDetail && (
                <div style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: '360px', zIndex: 90,
                    backgroundColor: 'rgba(5, 5, 5, 0.95)',
                    borderLeft: '1px solid #dc2626',
                    backdropFilter: 'blur(12px)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.5s ease-out',
                    overflow: 'hidden',
                }}>
                    <style>{`
                        @keyframes slideInRight {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                        @keyframes pulseGlow {
                            0%, 100% { box-shadow: 0 0 8px rgba(220,38,38,0.3); }
                            50% { box-shadow: 0 0 20px rgba(220,38,38,0.6); }
                        }
                        @keyframes fadeInUp {
                            from { opacity: 0; transform: translateY(12px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    {/* Header */}
                    <div style={{
                        padding: '20px',
                        borderBottom: '1px solid #7f1d1d40',
                        background: 'linear-gradient(180deg, #1a050580, transparent)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowLeftRight size={16} style={{ color: '#dc2626' }} />
                                <span style={{ fontSize: '10px', color: '#dc2626', letterSpacing: '0.2em', fontWeight: 700 }}>
                                    BAĞLANTI ANALİZİ
                                </span>
                            </div>
                            <button
                                onClick={() => closeLinkDetail()}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ fontSize: '9px', color: '#6b728080', letterSpacing: '0.1em' }}>
                            Press ESC to close • Click on people → Open file
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

                        {/* Source Person */}
                        <div
                            onClick={() => {
                                const sourceNode = nodes.find(n => n.id === activeLinkDetail.sourceId);
                                if (sourceNode) { closeLinkDetail(); handleNodeClick(sourceNode); }
                            }}
                            style={{
                                padding: '16px', backgroundColor: '#0f0f0f',
                                border: '1px solid #7f1d1d40', cursor: 'pointer',
                                transition: 'all 0.3s ease', marginBottom: '0',
                                animation: 'fadeInUp 0.4s ease 0.2s both',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.backgroundColor = '#1a0808'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(127,29,29,0.25)'; e.currentTarget.style.backgroundColor = '#0f0f0f'; }}
                        >
                            <div style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.15em', marginBottom: '6px' }}>
                                KİŞİ 1
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                                {activeLinkDetail.sourceLabel}
                            </div>
                            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px', letterSpacing: '0.1em' }}>
                                TIKLA → DOSYAYI AÇ
                            </div>
                        </div>

                        {/* Connection indicator */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '12px 0', animation: 'fadeInUp 0.4s ease 0.35s both',
                        }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#dc262640' }} />
                            <div style={{
                                padding: '6px 14px', border: '1px solid #dc262660',
                                fontSize: '9px', color: '#fca5a5', letterSpacing: '0.15em',
                                animation: 'pulseGlow 2s ease-in-out infinite',
                            }}>
                                BAĞLANTI
                            </div>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#dc262640' }} />
                        </div>

                        {/* Target Person */}
                        <div
                            onClick={() => {
                                const targetNode = nodes.find(n => n.id === activeLinkDetail.targetId);
                                if (targetNode) { closeLinkDetail(); handleNodeClick(targetNode); }
                            }}
                            style={{
                                padding: '16px', backgroundColor: '#0f0f0f',
                                border: '1px solid #7f1d1d40', cursor: 'pointer',
                                transition: 'all 0.3s ease', marginBottom: '20px',
                                animation: 'fadeInUp 0.4s ease 0.5s both',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.backgroundColor = '#1a0808'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(127,29,29,0.25)'; e.currentTarget.style.backgroundColor = '#0f0f0f'; }}
                        >
                            <div style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.15em', marginBottom: '6px' }}>
                                KİŞİ 2
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                                {activeLinkDetail.targetLabel}
                            </div>
                            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '4px', letterSpacing: '0.1em' }}>
                                TIKLA → DOSYAYI AÇ
                            </div>
                        </div>

                        {/* Relationship Details */}
                        {activeLinkDetail.label && (
                            <div style={{
                                padding: '16px', backgroundColor: '#0a0505',
                                border: '1px solid #7f1d1d20', marginBottom: '16px',
                                animation: 'fadeInUp 0.4s ease 0.65s both',
                            }}>
                                <div style={{ fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em', marginBottom: '8px' }}>
                                    İLİŞKİ DETAYI
                                </div>
                                <div style={{ fontSize: '13px', color: '#e5e5e5', lineHeight: 1.6 }}>
                                    {activeLinkDetail.label}
                                </div>
                            </div>
                        )}

                        {activeLinkDetail.type && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', backgroundColor: '#7f1d1d15', border: '1px solid #7f1d1d30',
                                fontSize: '10px', color: '#fca5a5', letterSpacing: '0.1em',
                                animation: 'fadeInUp 0.4s ease 0.8s both',
                            }}>
                                <FileText size={10} />
                                {activeLinkDetail.type.toUpperCase()}
                            </div>
                        )}

                        {/* Timeline — real evidence data from linkEvidenceStore */}
                        <div style={{
                            marginTop: '24px',
                            animation: 'fadeInUp 0.4s ease 0.95s both',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={14} style={{ color: '#991b1b' }} />
                                    <span style={{ fontSize: '9px', color: '#991b1b', letterSpacing: '0.15em' }}>ZAMAN ÇİZELGESİ</span>
                                </div>
                                {linkEvidenceData && linkEvidenceData.totalCount > 0 && (
                                    <span style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.1em' }}>
                                        {linkEvidenceData.totalCount} KANIT
                                    </span>
                                )}
                            </div>

                            {/* Loading state */}
                            {useLinkEvidenceStore.getState().loading && (
                                <div style={{ padding: '16px', border: '1px dashed #7f1d1d30', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em' }}>YÜKLENİYOR...</div>
                                </div>
                            )}

                            {/* Empty state */}
                            {!useLinkEvidenceStore.getState().loading && (!linkEvidenceData || linkEvidenceData.totalCount === 0) && (
                                <div style={{ padding: '16px', border: '1px dashed #7f1d1d30' }}>
                                    <div style={{ fontSize: '11px', color: '#6b728060', lineHeight: 1.5 }}>
                                        Bu bağlantıya ait kanıt zaman çizelgesi henüz oluşturulmamış.
                                    </div>
                                </div>
                            )}

                            {/* Date range bar */}
                            {linkEvidenceData && linkEvidenceData.dateRange && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '6px 10px', backgroundColor: '#0a0505', border: '1px solid #7f1d1d20',
                                    marginBottom: '2px', fontSize: '9px', color: '#6b7280', letterSpacing: '0.08em',
                                }}>
                                    <span>{new Date(linkEvidenceData.dateRange.earliest).getFullYear()}</span>
                                    <div style={{ flex: 1, height: '1px', margin: '0 10px', background: 'linear-gradient(90deg, #dc262640, #dc2626, #dc262640)' }} />
                                    <span>{new Date(linkEvidenceData.dateRange.latest).getFullYear()}</span>
                                </div>
                            )}

                            {/* Evidence timeline entries */}
                            {linkEvidenceData && linkEvidenceData.evidences.length > 0 && (
                                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                                    {/* Vertical timeline line */}
                                    <div style={{
                                        position: 'absolute', left: '7px', top: '0', bottom: '0',
                                        width: '2px', background: 'linear-gradient(180deg, #dc262680, #dc262620)',
                                    }} />

                                    {linkEvidenceData.evidences.map((ev, idx) => {
                                        const typeColors: Record<string, string> = {
                                            court_record: '#ef4444', financial_record: '#f59e0b', witness_testimony: '#8b5cf6',
                                            news_major: '#3b82f6', official_document: '#10b981', leaked_document: '#ec4899',
                                            photograph: '#06b6d4', social_media: '#a855f7', intelligence_report: '#f97316',
                                        };
                                        const dotColor = typeColors[ev.evidenceType] || '#6b7280';
                                        const typeLabels: Record<string, string> = {
                                            court_record: 'MAHKEME', financial_record: 'FİNANS', witness_testimony: 'İFADE',
                                            news_major: 'HABER', official_document: 'RESMİ', leaked_document: 'SIZINTI',
                                            photograph: 'FOTOĞRAF', social_media: 'SOSYAL', intelligence_report: 'İSTİHBARAT',
                                        };
                                        const year = ev.eventDate ? new Date(ev.eventDate).getFullYear() : '?';
                                        const monthDay = ev.eventDate && ev.datePrecision === 'day'
                                            ? new Date(ev.eventDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                                            : ev.eventDate && ev.datePrecision === 'month'
                                            ? new Date(ev.eventDate).toLocaleDateString('tr-TR', { month: 'short' })
                                            : '';

                                        return (
                                            <div key={ev.timelineId || idx} style={{
                                                position: 'relative', paddingBottom: idx === linkEvidenceData.evidences.length - 1 ? '4px' : '16px',
                                                animation: `fadeInUp 0.3s ease ${0.1 * idx}s both`,
                                            }}>
                                                {/* Timeline dot */}
                                                <div style={{
                                                    position: 'absolute', left: '-17px', top: '6px',
                                                    width: ev.isKeystone ? '12px' : '8px',
                                                    height: ev.isKeystone ? '12px' : '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: ev.isKeystone ? '#f59e0b' : dotColor,
                                                    border: ev.isKeystone ? '2px solid #fbbf24' : `2px solid ${dotColor}40`,
                                                    boxShadow: ev.isKeystone ? '0 0 8px rgba(245,158,11,0.6)' : `0 0 4px ${dotColor}40`,
                                                    transition: 'all 0.3s ease',
                                                }} />

                                                {/* Event card */}
                                                <div style={{
                                                    padding: '10px 12px', backgroundColor: ev.isKeystone ? '#1a130805' : '#0a0505',
                                                    border: `1px solid ${ev.isKeystone ? '#f59e0b30' : '#7f1d1d20'}`,
                                                    transition: 'border-color 0.3s ease',
                                                    cursor: 'default',
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.borderColor = ev.isKeystone ? '#f59e0b60' : '#dc262640'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.borderColor = ev.isKeystone ? '#f59e0b30' : '#7f1d1d20'; }}
                                                >
                                                    {/* Date + Type badge row */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: '#e5e5e5', fontWeight: 700 }}>{year}</span>
                                                        {monthDay && <span style={{ fontSize: '9px', color: '#6b7280' }}>{monthDay}</span>}
                                                        <div style={{
                                                            marginLeft: 'auto', padding: '2px 6px',
                                                            backgroundColor: `${dotColor}15`, border: `1px solid ${dotColor}30`,
                                                            fontSize: '7px', color: dotColor, letterSpacing: '0.12em',
                                                        }}>
                                                            {typeLabels[ev.evidenceType] || ev.evidenceType.toUpperCase()}
                                                        </div>
                                                        {ev.isKeystone && (
                                                            <span style={{ fontSize: '10px' }} title="Kilit Olay">⭐</span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <div style={{ fontSize: '12px', color: '#e5e5e5', fontWeight: 600, lineHeight: 1.4, marginBottom: ev.summary ? '4px' : '0' }}>
                                                        {ev.title}
                                                    </div>

                                                    {/* Summary */}
                                                    {ev.summary && (
                                                        <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.5 }}>
                                                            {ev.summary}
                                                        </div>
                                                    )}

                                                    {/* Confidence bar */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                        <div style={{
                                                            flex: 1, height: '2px', backgroundColor: '#ffffff08', borderRadius: '1px', overflow: 'hidden',
                                                        }}>
                                                            <div style={{
                                                                width: `${(ev.confidence * 100)}%`, height: '100%',
                                                                backgroundColor: ev.confidence > 0.7 ? '#22c55e' : ev.confidence > 0.4 ? '#f59e0b' : '#ef4444',
                                                                transition: 'width 0.5s ease',
                                                            }} />
                                                        </div>
                                                        <span style={{
                                                            fontSize: '8px', letterSpacing: '0.08em',
                                                            color: ev.verificationStatus === 'verified' ? '#22c55e' : ev.verificationStatus === 'credible' ? '#f59e0b' : '#6b7280',
                                                        }}>
                                                            {ev.verificationStatus === 'verified' ? 'DOĞRULANDI' :
                                                             ev.verificationStatus === 'credible' ? 'GÜVENİLİR' :
                                                             ev.verificationStatus === 'disputed' ? 'TARTIŞMALI' : 'BEKLİYOR'}
                                                        </span>
                                                    </div>

                                                    {/* Source */}
                                                    {ev.sourceName && (
                                                        <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '4px', letterSpacing: '0.05em' }}>
                                                            {ev.sourceUrl ? (
                                                                <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer"
                                                                   style={{ color: '#6b7280', textDecoration: 'none', borderBottom: '1px dotted #6b728040' }}
                                                                   onMouseOver={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                                                                   onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; }}
                                                                >
                                                                    ↗ {ev.sourceName}
                                                                </a>
                                                            ) : (
                                                                <span>📄 {ev.sourceName}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Keystone count footer */}
                            {linkEvidenceData && linkEvidenceData.keystoneCount > 0 && (
                                <div style={{
                                    marginTop: '8px', padding: '8px 10px',
                                    backgroundColor: '#f59e0b08', border: '1px solid #f59e0b15',
                                    fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    ⭐ {linkEvidenceData.keystoneCount} KİLİT OLAY TESPİT EDİLDİ
                                </div>
                            )}

                            {/* Sprint 14A: SİMÜLASYON TÜNELİ butonu */}
                            {linkEvidenceData && linkEvidenceData.totalCount >= 2 && (
                                <button
                                    onClick={() => {
                                        if (!activeLinkDetail || !linkEvidenceData) return;
                                        useTunnelStore.getState().enterTunnel({
                                            sourceId: activeLinkDetail.sourceId,
                                            targetId: activeLinkDetail.targetId,
                                            sourceLabel: activeLinkDetail.sourceLabel,
                                            targetLabel: activeLinkDetail.targetLabel,
                                            linkData: linkEvidenceData,
                                            theme: 'evidence',
                                        });
                                    }}
                                    style={{
                                        width: '100%', marginTop: '12px', padding: '12px 16px',
                                        backgroundColor: '#dc262608', border: '1px solid #dc262640',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px',
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc262620'; e.currentTarget.style.borderColor = '#dc2626'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#dc262608'; e.currentTarget.style.borderColor = '#dc262640'; }}
                                >
                                    <Eye size={14} style={{ color: '#dc2626' }} />
                                    <span style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.2em', fontWeight: 700 }}>
                                        SİMÜLASYON TÜNELİ
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '12px 20px', borderTop: '1px solid #7f1d1d20',
                        fontSize: '9px', color: '#6b728040', textAlign: 'center',
                        letterSpacing: '0.1em',
                    }}>
                        PROJECT TRUTH // BAĞLANTI ANALİZİ
                    </div>
                </div>
            )}

            {/* DOCUMENT MODAL — ANALYZE DOC */}
            {showDocSubmit && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}>
                    <div
                        onClick={() => setShowDocSubmit(false)}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '900px',
                        maxHeight: '85vh', overflow: 'auto',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #dc2626',
                        borderTop: '3px solid #dc2626',
                        borderRadius: '0',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #7f1d1d40',
                            background: 'linear-gradient(180deg, #1a050580, transparent)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Brain size={18} style={{ color: '#dc2626' }} />
                                <span style={{ fontSize: '11px', color: '#dc2626', letterSpacing: '0.2em', fontWeight: 700 }}>
                                    ANALYZE DOCUMENT
                                </span>
                            </div>
                            <button
                                onClick={() => setShowDocSubmit(false)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <DocumentSubmission />
                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #7f1d1d20' }}>
                                <DocumentOCRUpload />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FOLLOW THE MONEY MODAL */}
            {showMoneyTracker && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem',
                }}>
                    <div
                        onClick={() => setShowMoneyTracker(false)}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(4px)' }}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '1000px',
                        maxHeight: '85vh', overflow: 'hidden',
                        border: '1px solid #22c55e40', borderTop: '3px solid #22c55e',
                        borderRadius: '0',
                    }}>
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
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem',
                }}>
                    <div
                        onClick={() => setShowSystemPulse(false)}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '800px',
                        maxHeight: '85vh', overflow: 'auto',
                        border: '1px solid #dc2626', borderTop: '3px solid #dc2626',
                        borderRadius: '4px',
                    }}>
                        <SystemPulsePanel
                            isModal={true}
                            onClose={() => setShowSystemPulse(false)}
                        />
                    </div>
                </div>
            )}

            {/* IŞIK TUT — COMMUNITY EVIDENCE FORM */}
            {showIsikTut && (
                <IsikTutForm
                    nodes={nodes}
                    preSelectedNodeId={selectedNode?.id}
                    onClose={() => setShowIsikTut(false)}
                    onSuccess={() => setTimeout(() => setShowIsikTut(false), 2000)}
                />
            )}

            {/* GAZETECİ KALKANI (DMS) MODAL */}
            {showDMS && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem',
                }}>
                    <div
                        onClick={() => setShowDMS(false)}
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)' }}
                    />
                    <div style={{
                        position: 'relative', width: '100%', maxWidth: '700px',
                        maxHeight: '85vh', overflow: 'auto',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #8b5cf6',
                        borderTop: '3px solid #8b5cf6',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #8b5cf620',
                            background: 'linear-gradient(180deg, #1a0a2580, transparent)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Shield size={18} style={{ color: '#8b5cf6' }} />
                                <span style={{ fontSize: '11px', color: '#8b5cf6', letterSpacing: '0.2em', fontWeight: 700 }}>
                                    GAZETECİ KALKANI — ÖLÜ ADAM ANAHTARI
                                </span>
                            </div>
                            <button
                                onClick={() => setShowDMS(false)}
                                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <DeadManSwitchPanel />
                            {/* Medya Yükleme */}
                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1a1a1a' }}>
                                <MediaUploader
                                    fingerprint={useInvestigationStore.getState().fingerprint || 'anon'}
                                    nodeId={selectedNode?.id}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KOLEKTİF KALKAN PANELİ */}
            {showCollectiveShield && (
                <CollectiveShieldPanel
                    fingerprint={useInvestigationStore.getState().fingerprint || 'anon'}
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

            {/* SPRINT 6A: PROFILE PANEL — Badge, Reputation, Leaderboard */}
            <ProfilePanel
                isOpen={showProfilePanel}
                onClose={() => setShowProfilePanel(false)}
                networkId={nodes[0]?.network_id}
            />
        </>
    );
}
