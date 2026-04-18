'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionData } from '@/components/ConnectionTimelinePanel';

// Custom hooks (extracted from this file — Sprint 18)
import { useTruthData } from '@/hooks/truth/useTruthData';
import { useInitializeStores } from '@/hooks/truth/useInitializeStores';
import { useModalState } from '@/hooks/truth/useModalState';
import { useTruthHandlers } from '@/hooks/truth/useTruthHandlers';
import { useForceLayout } from '@/hooks/useForceLayout';

// Extracted components (Sprint 18)
import { ActionButtonGrid, TruthModals, LinkDetailPanel } from '@/components/Truth';

// Existing components
import ArchiveModal from '@/components/ArchiveModal';

// Store hooks
import { useStore } from '@/store/useStore';
import { useChatStore } from '@/store/chatStore';
import { useThreadingStore } from '@/store/threadingStore';
import { useViewModeStore, countVisibleNodes } from '@/store/viewModeStore';
import { useBoardStore } from '@/store/boardStore';
import { useLinkEvidenceStore } from '@/store/linkEvidenceStore';
import { useTunnelStore } from '@/store/tunnelStore';
import { useDocumentStore } from '@/store/documentStore';
import { useInvestigationStore } from '@/store/investigationStore';
import { useBadgeStore } from '@/store/badgeStore';

// Lightweight components (always loaded)
import { UserBadge } from '@/components/UserBadge';
import ChatPanel from '@/components/ChatPanel';
import StoryPanel from '@/components/StoryPanel';
import InvestigationBanner from '@/components/InvestigationBanner';
import FirstDiscoveryBanner from '@/components/FirstDiscoveryBanner';
import EpistemologicalLegend from '@/components/EpistemologicalLegend';
import LinkEvidencePanel from '@/components/LinkEvidencePanel';
import CorridorOverlay from '@/components/CorridorOverlay';
import CorridorWalkOverlay from '@/components/CorridorWalkOverlay';
import LensSidebar from '@/components/LensSidebar';
import TimelineSlider from '@/components/TimelineSlider';
import LensEmptyState from '@/components/LensEmptyState';
import LensTransitionFlash from '@/components/LensTransitionFlash';
import BoardTransition from '@/components/InvestigationBoard/BoardTransition';
import CinematicOpening from '@/components/CinematicOpening';
import VoyagerHint from '@/components/VoyagerHint';
import GuidedTour from '@/components/GuidedTour';
import AuthHeader from '@/components/AuthHeader';
import { useAuth } from '@/contexts/AuthContext';
import SystemPulseWidget from '@/components/SystemPulseWidget';
import ConsentBanner from '@/components/ConsentBanner';
import NetworkDisclaimer from '@/components/NetworkDisclaimer';
import ModerationPanel from '@/components/ModerationPanel';
import { useInvestigationGameStore } from '@/store/investigationGameStore';
import { useSurvivorStore } from '@/store/survivorStore';

// Heavy components (dynamic import, no SSR)
const InvestigationGamePanel = dynamic(() => import('@/components/InvestigationGame/InvestigationGamePanel'), { ssr: false, loading: () => null });
const InvestigationDesk = dynamic(() => import('@/components/InvestigationGame/InvestigationDesk'), { ssr: false, loading: () => null });
const Truth3DScene = dynamic(() => import('@/components/Truth3DScene'), { ssr: false, loading: () => null });
const InvestigationBoard = dynamic(() => import('@/components/InvestigationBoard/Board'), { ssr: false, loading: () => null });
const ThreadingMode = dynamic(() => import('@/components/ThreadingMode'), { ssr: false, loading: () => null });
const ProposeLinkModal = dynamic(() => import('@/components/ProposeLinkModal'), { ssr: false, loading: () => null });
const ProposedLinkPanel = dynamic(() => import('@/components/ProposedLinkPanel'), { ssr: false, loading: () => null });
const TunnelScene = dynamic(() => import('@/components/Tunnel/TunnelScene'), { ssr: false, loading: () => null });
const TunnelBootSequence = dynamic(() => import('@/components/Tunnel/TunnelBootSequence'), { ssr: false, loading: () => null });
const TunnelHUD = dynamic(() => import('@/components/Tunnel/TunnelHUD'), { ssr: false, loading: () => null });
const TunnelComingSoon = dynamic(() => import('@/components/Tunnel/TunnelComingSoon'), { ssr: false, loading: () => null });

export default function Truth3D() {
    // ── Data ──
    const { nodes, links, loading, activeNetworkId, isRealtimeConnected } = useTruthData();

    // ── Force-Directed Physics Layout ──
    // Nature-inspired positioning — hub emergence via physics, not tiers
    const forceLayoutLinks = useMemo(() =>
        links.map(l => ({
            source: (typeof l.source === 'object' ? l.source?.id : l.source) || l.source_id || '',
            target: (typeof l.target === 'object' ? l.target?.id : l.target) || l.target_id || '',
            evidence_count: l.evidence_count || 1,
            strength: l.confidence_level ? l.confidence_level * 100 : 50,
        })),
    [links]);

    const { positions: forcePositions, isSimulating: forceSimulating, focusNode: forceFocusNode } =
        useForceLayout(nodes, forceLayoutLinks);

    // ── Store Initialization ──
    const {
        cinematicNodeReveal, cinematicLinkReveal,
        nodeHeatMap, consensusAnnotations,
        firstDiscovery, clearFirstDiscovery,
    } = useInitializeStores(loading, nodes.length);

    // ── Survivor Protection (Sprint SP-1) ──
    const initSurvivorProtections = useSurvivorStore(s => s.initializeProtections);
    useMemo(() => {
        if (nodes.length > 0) {
            initSurvivorProtections(nodes, links, activeNetworkId || 'unknown');
        }
    }, [nodes, links, activeNetworkId, initSurvivorProtections]);

    // ── Auth state (for AuthHeader visibility bypass) ──
    const { isAuthenticated, isAnonymous } = useAuth();
    const isLoggedIn = isAuthenticated && !isAnonymous;

    // ── Progressive Disclosure (Faz 0 — ilk kullanıcı deneyimi) ──
    const [isExplorer, setIsExplorer] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const explored = localStorage.getItem('truth_explored');
            if (explored) setIsExplorer(true);
        }
    }, []);
    const unlockExplorer = useCallback(() => {
        if (!isExplorer) {
            setIsExplorer(true);
            localStorage.setItem('truth_explored', 'true');
        }
    }, [isExplorer]);
    // İlk node tıklaması veya chat açılışı = kullanıcı etkileşime geçti
    const markInteracted = useCallback(() => {
        if (!hasInteracted) setHasInteracted(true);
    }, [hasInteracted]);

    // ── Modal State ──
    const modals = useModalState();

    // ── Document Archive (from documentStore, not local state) ──
    const { isOpen: isDocArchiveOpen, setOpen: setDocArchiveOpen } = useDocumentStore();

    // ── Selection State ──
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [selectedConnection, setSelectedConnection] = useState<ConnectionData | null>(null);
    const [activeLinkDetail, setActiveLinkDetail] = useState<{
        sourceId: string; targetId: string;
        sourceLabel: string; targetLabel: string;
        label?: string; type?: string;
    } | null>(null);
    const endCinematicRef = useRef<(() => void) | null>(null);

    // ── Handlers ──
    const { handleNodeClick: _handleNodeClick, handleLinkClick, closeLinkDetail, handleReset, handleEnterBoard, handleExitBoard } =
        useTruthHandlers({
            nodes,
            setSelectedNode,
            setSelectedConnection,
            setActiveLinkDetail,
            endCinematicRef,
        });
    // Wrap handleNodeClick to track first interaction + ego-network physics
    const handleNodeClick = useCallback((node: any) => {
        markInteracted();
        unlockExplorer();
        _handleNodeClick(node);
        // Ego-network: pin clicked node to center, reheat physics
        if (node?.id) forceFocusNode(node.id);
    }, [_handleNodeClick, markInteracted, unlockExplorer, forceFocusNode]);

    // ── View Mode + Board ──
    const { activeMode: viewMode, timelineRange } = useViewModeStore();
    const isBoardMode = viewMode === 'board';

    // ── Threading (İP UZAT) ──
    const {
        isThreadingActive, showProposalForm, showDetailPanel, sourceNodeId,
        targetNodeId, stopThreading, setShowProposalForm, setShowDetailPanel,
        selectGhostLink, ghostLinks, selectedGhostLink,
    } = useThreadingStore();

    const getNodeLabel = useCallback((id: string) => {
        const node = nodes.find(n => n.id === id);
        return node?.label || node?.name || id.slice(0, 10);
    }, [nodes]);

    const ghostLinkData = useMemo(() =>
        ghostLinks.filter(gl => gl.status !== 'accepted' && gl.status !== 'rejected'),
    [ghostLinks]);

    // ── Link Evidence (Konuşan İpler) ──
    const { data: linkEvidenceData, cache: linkEvidenceCache,
        corridorWalkMode, corridorWalkProgress, corridorWalkPhase, setCorridorWalkPhase } = useLinkEvidenceStore();

    const linkEvidenceMap = useMemo(() => {
        if (!linkEvidenceCache || linkEvidenceCache.size === 0) return undefined;
        const map = new Map<string, { evidenceCount: number; keystoneCount: number; dateRange: { earliest: string; latest: string } | null }>();
        linkEvidenceCache.forEach((data, key) => {
            map.set(key, { evidenceCount: data.totalCount, keystoneCount: data.keystoneCount, dateRange: data.dateRange });
        });
        return map;
    }, [linkEvidenceCache]);

    // ── Tunnel ──
    const tunnelActive = useTunnelStore(s => s.active);
    const tunnelPhase = useTunnelStore(s => s.phase);
    const isTunnelVisible = tunnelActive || (tunnelPhase !== 'idle');

    // ── Chat ──
    const { highlightedNodeIds, highlightedLinkIds, focusNodeId, annotations, clearHighlights, isChatOpen } = useChatStore();
    const { isArchiveOpen } = useStore();

    // ── Lens empty state ──
    const visibleNodeCount = useMemo(
        () => countVisibleNodes(nodes, viewMode, timelineRange),
        [nodes, viewMode, timelineRange],
    );

    return (
        <>
            {/* === AUTH HEADER (top-right) — always visible when logged in, otherwise after exploration === */}
            {(isLoggedIn || isExplorer || hasInteracted) && <AuthHeader />}

            {/* === 3D SAHNE === */}
            <div style={{ position: 'fixed', inset: 0, backgroundColor: '#030303' }}>

                {/* 3D CANVAS */}
                {!loading && !isBoardMode && (
                    <Truth3DScene
                        nodes={nodes} links={links}
                        onNodeClick={handleNodeClick} onLinkClick={handleLinkClick}
                        registerEndCinematic={(fn) => { endCinematicRef.current = fn; }}
                        cinematicActive={activeLinkDetail !== null}
                        onCinematicEnd={() => { setActiveLinkDetail(null); clearHighlights(); }}
                        highlightNodeIds={highlightedNodeIds} highlightLinkIds={highlightedLinkIds}
                        focusNodeId={focusNodeId} annotations={annotations}
                        nodeHeatMap={nodeHeatMap} consensusAnnotations={consensusAnnotations}
                        epistemologicalMode={modals.epistemologicalMode}
                        linkEvidenceMap={linkEvidenceMap}
                        viewMode={viewMode} timelineRange={timelineRange}
                        ghostLinks={ghostLinkData}
                        cinematicNodeReveal={cinematicNodeReveal} cinematicLinkReveal={cinematicLinkReveal}
                        isThreadingActive={isThreadingActive} threadingSourceId={sourceNodeId}
                        onGhostLinkClick={(gl) => selectGhostLink(gl)}
                        corridorWalkMode={corridorWalkMode} corridorWalkProgress={corridorWalkProgress}
                        corridorWalkPhase={corridorWalkPhase}
                        corridorWalkSourceId={activeLinkDetail?.sourceId}
                        corridorWalkTargetId={activeLinkDetail?.targetId}
                        onCorridorWalkPhaseChange={setCorridorWalkPhase}
                        forcePositions={forcePositions}
                        forceSimulating={forceSimulating}
                    />
                )}

                {/* 2D SORUŞTURMA PANOSU */}
                {!loading && isBoardMode && (
                    <InvestigationBoard
                        nodes={nodes.map(n => ({
                            id: n.id, name: n.name || n.label || 'Bilinmeyen', type: n.type, tier: n.tier,
                            risk: n.risk ?? n.defcon_score ?? 50, image_url: n.image_url,
                            verification_level: n.verification_level || n.verification_status,
                            occupation: n.occupation || n.role,
                        }))}
                        links={links.map(l => ({
                            id: l.id || `${l.source_id || l.source}-${l.target_id || l.target}`,
                            source_id: l.source_id || l.source, target_id: l.target_id || l.target,
                            label: l.label || l.description, evidence_type: l.evidence_type || l.relationship_type,
                            confidence_level: l.confidence_level, evidence_count: l.evidence_count,
                        }))}
                        onNodeClick={(nodeId) => {
                            const node = nodes.find(n => n.id === nodeId);
                            if (node) setSelectedNode(node);
                        }}
                        onNodeDoubleClick={(nodeId) => {
                            const node = nodes.find(n => n.id === nodeId);
                            if (node) handleNodeClick(node);
                        }}
                        onLinkClick={(linkId) => {
                            const link = links.find(l => l.id === linkId || `${l.source_id || l.source}-${l.target_id || l.target}` === linkId);
                            if (link) {
                                const sourceNode = nodes.find(n => n.id === (link.source_id || link.source));
                                const targetNode = nodes.find(n => n.id === (link.target_id || link.target));
                                handleLinkClick({
                                    sourceId: link.source_id || link.source, targetId: link.target_id || link.target,
                                    sourceLabel: sourceNode?.name || sourceNode?.label || '?',
                                    targetLabel: targetNode?.name || targetNode?.label || '?',
                                    label: link.label || link.description, type: link.evidence_type || link.relationship_type,
                                });
                            }
                        }}
                        onExitBoard={handleExitBoard}
                    />
                )}

                {/* Lens Sidebar + Overlay Components */}
                {isExplorer && <div data-tour="lens-sidebar"><LensSidebar /></div>}
                <LensTransitionFlash />
                <BoardTransition />

                {!isBoardMode && isExplorer && (
                    <EpistemologicalLegend
                        epistemologicalMode={modals.epistemologicalMode}
                        onToggle={() => modals.setEpistemologicalMode(!modals.epistemologicalMode)}
                        chatOpen={isChatOpen}
                    />
                )}

                {!isBoardMode && !isTunnelVisible && <LinkEvidencePanel />}
                {!isBoardMode && <CorridorOverlay />}
                {!isBoardMode && <CorridorWalkOverlay />}

                {/* Tunnel */}
                <TunnelScene />
                <TunnelBootSequence />
                <TunnelHUD />
                <TunnelComingSoon />

                {!isBoardMode && <TimelineSlider />}
                {!isBoardMode && (
                    <LensEmptyState mode={viewMode} visibleNodeCount={visibleNodeCount} totalNodeCount={nodes.length} />
                )}

                {/* BAŞLIK */}
                <div style={{ position: 'absolute', top: 0, left: 0, padding: '2rem', pointerEvents: 'none', zIndex: 10 }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#1a1a1a', letterSpacing: '-0.05em', margin: 0 }}>PROJECT TRUTH</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                        <div style={{ width: '60px', height: '1px', backgroundColor: '#991b1b' }} />
                        <span style={{ fontSize: '10px', color: '#991b1b', letterSpacing: '0.3em', fontFamily: 'monospace' }}>EVIDENCE MAP / CLASSIFIED</span>
                        <span style={{
                            fontSize: '9px', padding: '2px 8px',
                            backgroundColor: isRealtimeConnected ? '#16a34a' : '#991b1b',
                            color: isRealtimeConnected ? '#bbf7d0' : '#fecaca',
                            borderRadius: '2px', transition: 'all 0.3s ease'
                        }}>
                            {isRealtimeConnected ? '● LIVE' : '○ OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* USER BADGE — replaced by AuthHeader (Sprint Auth) */}
                {/* Old UserBadge removed to prevent overlap with new auth system */}

                {/* SYSTEM PULSE WIDGET — hidden for first-time visitors */}
                {isExplorer && <SystemPulseWidget networkId={activeNetworkId || undefined} />}

                {/* ACTION BUTTONS — hidden until user interacts */}
                {(isExplorer || hasInteracted) && <ActionButtonGrid
                    isBoardMode={isBoardMode}
                    onDocSubmit={() => modals.setShowDocSubmit(true)}
                    onMoneyTracker={() => modals.setShowMoneyTracker(true)}
                    onSystemPulse={() => modals.setShowSystemPulse(true)}
                    onIsikTut={() => modals.setShowIsikTut(true)}
                    onDMS={() => modals.setShowDMS(true)}
                    onCollectiveShield={() => modals.setShowCollectiveShield(true)}
                    onDocArchive={() => setDocArchiveOpen(true)}
                    onInvestigate={() => useInvestigationGameStore.getState().openDesk()}
                    onModeration={() => { import('@/store/moderationStore').then(m => m.useModerationStore.getState().openPanel()); }}
                    onReset={() => { handleReset(); forceFocusNode(null); }}
                />}

                {/* ONBOARDING HINT — only for first-time visitors who haven't interacted yet */}
                {!isExplorer && !hasInteracted && !loading && (
                    <div style={{
                        position: 'absolute', bottom: '3rem', left: '50%', transform: 'translateX(-50%)',
                        zIndex: 20, pointerEvents: 'none', textAlign: 'center',
                        animation: 'fadeInUp 1.5s ease-out 2s both',
                    }}>
                        <div style={{
                            padding: '10px 24px', borderRadius: '8px',
                            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(153,27,27,0.3)',
                        }}>
                            <span style={{
                                color: '#e5e5e5', fontSize: '13px', letterSpacing: '0.15em',
                                fontFamily: 'monospace', opacity: 0.9,
                            }}>
                                CLICK A NODE TO BEGIN INVESTIGATION
                            </span>
                        </div>
                        <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
                    </div>
                )}

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
                                border: '2px solid #7f1d1d', borderTopColor: '#dc2626',
                                borderRadius: '50%', margin: '0 auto 1rem',
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

            {/* === OVERLAYS === */}
            <CinematicOpening />
            <VoyagerHint />
            <GuidedTour />
            <ThreadingMode />

            {/* İP UZAT — Proposal Form */}
            {showProposalForm && sourceNodeId && targetNodeId && (
                <ProposeLinkModal
                    fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
                    badgeTier={useBadgeStore.getState().globalBadge?.badge_tier || 'community'}
                    reputation={useBadgeStore.getState().reputation?.score || 100}
                    sourceLabel={getNodeLabel(sourceNodeId)}
                    targetLabel={getNodeLabel(targetNodeId)}
                    onClose={() => { setShowProposalForm(false); stopThreading(); }}
                />
            )}

            {/* İP UZAT — Ghost Link Detail */}
            {showDetailPanel && selectedGhostLink && (
                <ProposedLinkPanel
                    fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
                    badgeTier={useBadgeStore.getState().globalBadge?.badge_tier || 'community'}
                    onClose={() => { setShowDetailPanel(false); selectGhostLink(null); }}
                    getNodeLabel={getNodeLabel}
                />
            )}

            {/* First Discovery Banner */}
            {firstDiscovery && (
                <FirstDiscoveryBanner nodeName={firstDiscovery.nodeName} onDismiss={clearFirstDiscovery} />
            )}

            {/* Chat Panel */}
            <div data-tour="chat-panel">
                <ChatPanel
                    nodes={nodes} links={links}
                    onNodeHighlight={(nodeId) => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (node) handleNodeClick(node);
                    }}
                    footer={<InvestigationBanner />}
                />
            </div>

            {/* Story Panel — hidden for first-time visitors */}
            {isExplorer && !activeLinkDetail && (
                <StoryPanel
                    nodes={nodes}
                    onNodeClick={(nodeId) => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (node) handleNodeClick(node);
                    }}
                />
            )}

            {/* Archive Modal */}
            {isArchiveOpen && <ArchiveModal />}

            {/* Link Detail Panel (extracted) */}
            {activeLinkDetail && (
                <LinkDetailPanel
                    activeLinkDetail={activeLinkDetail}
                    nodes={nodes}
                    onClose={closeLinkDetail}
                    onNodeClick={handleNodeClick}
                />
            )}

            {/* All Modals (extracted) */}
            <TruthModals
                showDocSubmit={modals.showDocSubmit}
                setShowDocSubmit={modals.setShowDocSubmit}
                showMoneyTracker={modals.showMoneyTracker}
                setShowMoneyTracker={modals.setShowMoneyTracker}
                showSystemPulse={modals.showSystemPulse}
                setShowSystemPulse={modals.setShowSystemPulse}
                showIsikTut={modals.showIsikTut}
                setShowIsikTut={modals.setShowIsikTut}
                showDMS={modals.showDMS}
                setShowDMS={modals.setShowDMS}
                showCollectiveShield={modals.showCollectiveShield}
                setShowCollectiveShield={modals.setShowCollectiveShield}
                showProfilePanel={modals.showProfilePanel}
                setShowProfilePanel={modals.setShowProfilePanel}
                isDocArchiveOpen={isDocArchiveOpen}
                setDocArchiveOpen={setDocArchiveOpen}
                selectedNode={selectedNode}
                selectedConnection={selectedConnection}
                setSelectedConnection={setSelectedConnection}
                nodes={nodes}
                activeNetworkId={activeNetworkId}
            />

            {/* INVESTIGATION GAME PANEL — Sprint G1 (Task Wallet — right side) */}
            <InvestigationGamePanel
                networkId={activeNetworkId || ''}
                fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
            />

            {/* INVESTIGATION DESK — Center Screen (opens from task wallet or INVESTIGATE button) */}
            <InvestigationDesk
                networkId={activeNetworkId || ''}
                fingerprint={useInvestigationStore.getState().fingerprint || 'anonymous'}
            />

            {/* === MODERATION PANEL (Tier 3+ moderators) === */}
            <ModerationPanel />

            {/* === NETWORK DISCLAIMER (Legal Fortress — always visible) === */}
            <NetworkDisclaimer />

            {/* === CONSENT BANNER (BK-5: Honest Pseudonymity) === */}
            <ConsentBanner />
        </>
    );
}
