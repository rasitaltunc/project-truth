'use client';

/**
 * PHOTO FALLBACK FIX (2026-02-22):
 * Images in database have stale/invalid URLs. Fallback to initials works perfectly.
 *
 * SQL to clean up bad image_urls:
 * UPDATE nodes SET image_url = NULL WHERE image_url LIKE '%upload.wikimedia%';
 * UPDATE nodes SET image_url = NULL WHERE image_url LIKE '%example.com%';
 *
 * The node sprite system gracefully falls back to initials in a tier-colored circle
 * if image_url is missing or fails to load (404, CORS error, etc).
 */

import { useEffect, useRef, useState } from 'react';
import type * as THREE_TYPES from 'three';
import { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';
import {
  getNodeColor, getOrbitRadius, getTypeIcon,
  getEvidenceTypeColor, getConfidenceOpacity,
  getEvidenceWidthOpacityBoost, getEvidencePulseIntensity,
  hexToRGB,
  ANNOTATION_THEMES, DEFAULT_ANNOTATION_COLORS, getAnnotationColors,
} from '@/constants/colors';
import {
  CABLE_VERTEX_SHADER, CABLE_FRAGMENT_SHADER,
  createCableGlowUniforms,
} from '@/lib/shaders/cableGlowShader';
import {
  quadraticBezier as quadraticBezierUtil,
  easeInOutCubic as easeInOutCubicUtil,
  CINEMATIC_ZOOM_SPEED, CINEMATIC_FADE_SPEED,
  CORRIDOR_ENTER_SPEED, CORRIDOR_EXIT_SPEED,
  CORRIDOR_CAM_DISTANCE, CORRIDOR_CAM_HEIGHT,
  LERP_SPEED, DRAG_THRESHOLD, CLICK_MAX_TIME,
  ANNOTATION_STAGGER_DELAY, ANNOTATION_FADE_DURATION, ANNOTATION_INITIAL_DELAY,
} from '@/lib/3d/utils';

// ⚡ NO TOP-LEVEL THREE IMPORT - async import inside useEffect (test3d proven pattern)
// Type-only import for TypeScript, actual module loaded async

interface TruthNode {
    id: string;
    label?: string;
    tier?: number | string;
    type?: string;
    risk?: number;
    nationality?: string;
    occupation?: string;
    connections?: number;
    [key: string]: any;
}

interface TruthLink {
    source: string | { id: string };
    target: string | { id: string };
    label?: string;
    type?: string;
    // Sprint 6B: Epistemolojik katman
    evidence_type?: string;
    confidence_level?: number;
    source_hierarchy?: string;
    evidence_count?: number;
    [key: string]: any;
}

interface Props {
    nodes: TruthNode[];
    links: TruthLink[];
    onNodeClick: (node: any) => void;
    onLinkClick?: (linkData: { sourceId: string; targetId: string; sourceLabel: string; targetLabel: string; label?: string; type?: string }) => void;
    onCinematicEnd?: () => void;
    registerEndCinematic?: (fn: () => void) => void;
    cinematicActive?: boolean; // When set to false externally, triggers camera restore
    // AI Chat integration — external highlight control
    highlightNodeIds?: string[];
    highlightLinkIds?: string[];
    focusNodeId?: string | null;
    annotations?: Record<string, string>;
    // Sprint 5: Heat Map + Consensus
    nodeHeatMap?: Map<string, number>;      // nodeId → 0.0-1.0
    consensusAnnotations?: Map<string, string>; // nodeId → "DECEASED"
    // Sprint 6B: Epistemolojik Mod
    epistemologicalMode?: boolean;           // true = görsel ontoloji aktif
    linkConfidenceMap?: Map<string, { evidence_type: string; confidence_level: number; evidence_count: number; source_hierarchy: string }>;
    // Sprint 6C: Konuşan İpler — link evidence verisi
    linkEvidenceMap?: Map<string, { evidenceCount: number; keystoneCount: number; dateRange: { earliest: string; latest: string } | null }>;
    onPulseClick?: (sourceId: string, targetId: string, pulsePosition: number) => void;
    // Sprint 7: View Modes — Akıllı Lens sistemi
    viewMode?: import('@/store/viewModeStore').ViewMode;
    timelineRange?: [number, number] | null;
    // Sprint 10: Sinematik + İP UZAT
    ghostLinks?: Array<{ id: string; sourceId: string; targetId: string; status: string; evidenceCount: number; evidenceThreshold: number }>;
    cinematicNodeReveal?: number;
    cinematicLinkReveal?: boolean;
    isThreadingActive?: boolean;
    threadingSourceId?: string | null;
    onGhostLinkClick?: (link: any) => void;
    // Sprint 14: Utanç Koridoru — 3D wire-walk
    corridorWalkMode?: boolean;
    corridorWalkProgress?: number;
    corridorWalkPhase?: 'idle' | 'entering' | 'walking' | 'focused' | 'exiting';
    corridorWalkSourceId?: string;
    corridorWalkTargetId?: string;
    onCorridorWalkPhaseChange?: (phase: 'idle' | 'entering' | 'walking' | 'focused' | 'exiting') => void;
}

// ═══════════════════════════════════════════
// CORRIDOR WALK STATE — Sprint 14 "Utanç Koridoru"
// ═══════════════════════════════════════════
interface CorridorWalkState {
    active: boolean;
    phase: 'entering' | 'walking' | 'exiting';
    progress: number;          // 0-1 entering/exiting, store-driven walking
    savedCameraPos: { x: number; y: number; z: number } | null;
    savedCameraTarget: { x: number; y: number; z: number } | null;
    sourcePos: THREE_TYPES.Vector3 | null;
    targetPos: THREE_TYPES.Vector3 | null;
    // Bezier kontrol noktaları
    walkP0: THREE_TYPES.Vector3 | null;  // Kamera başlangıç (source tarafı)
    walkP1: THREE_TYPES.Vector3 | null;  // Kontrol noktası (midpoint üstü)
    walkP2: THREE_TYPES.Vector3 | null;  // Kamera bitiş (target tarafı)
    perpDir: THREE_TYPES.Vector3 | null; // İpe dik yön (panel yerleşimi için)
}

// Quadratic Bezier — imported from @/lib/3d/utils, alias kept for closure compat
const quadraticBezier = quadraticBezierUtil;

// ═══════════════════════════════════════════
// CINEMATIC STATE
// ═══════════════════════════════════════════
interface CinematicState {
    active: boolean;
    sourceId: string;
    targetId: string;
    progress: number; // 0-1 animation progress
    phase: 'zooming' | 'focused' | 'restoring';
    savedCameraPos: { x: number; y: number; z: number } | null;
    savedCameraTarget: { x: number; y: number; z: number } | null;
}

// Easing — imported from @/lib/3d/utils
const easeInOutCubic = easeInOutCubicUtil;

// ═══════════════════════════════════════════
// HOVER TOOLTIP (HTML Overlay)
// ═══════════════════════════════════════════
function HoverTooltip({ data, x, y }: { data: TruthNode | null; x: number; y: number }) {
    if (!data) return null;

    // Type-aware labels
    const typeLabels: Record<string, string> = {
        organization: '🏛️ ORGANIZATION',
        location: '📍 LOCATION',
        document: '📄 DOCUMENT',
        event: '📅 EVENT',
    };
    const tierLabels: Record<string, string> = {
        '0': '👑 KINGPIN', 'tier0': '👑 KINGPIN',
        '1': '🔴 MASTERMIND', 'tier1': '🔴 MASTERMIND',
        '2': '🟤 KEY PLAYER', 'tier2': '🟤 KEY PLAYER',
        '3': '⚫ CONNECTED', 'tier3': '⚫ CONNECTED',
        '4': '⚪ PERIPHERAL', 'tier4': '⚪ PERIPHERAL',
    };
    const nodeType = data.type || 'person';
    const tierLabel = typeLabels[nodeType] || tierLabels[String(data.tier)] || '⚪ UNKNOWN';

    return (
        <div style={{
            position: 'fixed',
            left: x + 16,
            top: y - 10,
            zIndex: 100000,
            pointerEvents: 'none',
            backgroundColor: 'rgba(5, 5, 5, 0.95)',
            border: '1px solid #dc2626',
            borderLeft: '3px solid #dc2626',
            padding: '10px 14px',
            minWidth: '180px',
            maxWidth: '280px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            backdropFilter: 'blur(8px)',
        }}>
            {/* Name */}
            <div style={{
                fontSize: '13px', fontWeight: 700, color: '#ffffff',
                marginBottom: '6px', letterSpacing: '0.03em',
            }}>
                {data.label || data.id}
            </div>

            {/* Tier badge */}
            <div style={{
                fontSize: '9px', color: '#fca5a5', letterSpacing: '0.15em',
                marginBottom: '8px',
            }}>
                {tierLabel}
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {data.occupation && (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        <span style={{ color: '#6b7280' }}>Meslek:</span> {data.occupation}
                    </div>
                )}
                {data.nationality && (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        <span style={{ color: '#6b7280' }}>Uyruk:</span> {data.nationality}
                    </div>
                )}
                {typeof data.risk === 'number' && (
                    <div style={{ fontSize: '11px', color: data.risk > 70 ? '#ef4444' : data.risk > 40 ? '#f59e0b' : '#22c55e' }}>
                        <span style={{ color: '#6b7280' }}>Risk:</span> {data.risk}/100
                    </div>
                )}
                {typeof data.connections === 'number' && (
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        <span style={{ color: '#6b7280' }}>Bağlantı:</span> {data.connections}
                    </div>
                )}
            </div>

            {/* Click hint */}
            <div style={{
                marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #ffffff10',
                fontSize: '9px', color: '#6b728080', letterSpacing: '0.1em',
            }}>
                TIKLA → DOSYAYI AÇ
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// LINK TOOLTIP (HTML Overlay)
// ═══════════════════════════════════════════
function LinkTooltip({ data, x, y }: { data: { source: string; target: string; label?: string; type?: string; evidence_type?: string; confidence_level?: number; source_hierarchy?: string; evidence_count?: number } | null; x: number; y: number }) {
    if (!data) return null;

    const linkTypeColors: Record<string, string> = {
        financial: '#22c55e', banking: '#22c55e',
        victim: '#ef4444', trafficking: '#ef4444',
        travel: '#38bdf8', flight: '#38bdf8',
        legal: '#fbbf24', prosecution: '#fbbf24',
        employer: '#a78bfa', professional: '#a78bfa',
        ownership: '#2dd4bf', property: '#2dd4bf',
        associate: '#fb923c', social: '#fb923c',
        intelligence: '#f472b6', recruitment: '#f472b6',
        criminal: '#ff6b6b',
    };
    const typeColor = linkTypeColors[(data.type || '').toLowerCase()] || '#fca5a5';

    // Sprint 6B: Epistemolojik metadata etiketleri
    const evidenceTypeLabels: Record<string, string> = {
        court_record: '📜 Mahkeme Kaydı',
        official_document: '📄 Resmi Belge',
        leaked_document: '🔓 Sızdırılmış Belge',
        financial_record: '💰 Finansal Kayıt',
        witness_testimony: '👤 Tanık İfadesi',
        news_major: '📰 Ana Akım Haber',
        news_minor: '📰 Yerel Haber',
        academic_paper: '🔬 Akademik Makale',
        social_media: '📱 Sosyal Medya',
        rumor: '❓ Söylenti',
        inference: '💭 Çıkarım',
    };
    const hierarchyLabels: Record<string, string> = {
        primary: '🏛️ Birincil Kaynak',
        secondary: '📰 İkincil Kaynak',
        tertiary: '💬 Üçüncül Kaynak',
    };

    const hasEpData = data.evidence_type && data.evidence_type !== 'inference';
    const confidencePercent = data.confidence_level != null ? Math.round(data.confidence_level * 100) : null;

    return (
        <div style={{
            position: 'fixed',
            left: x + 16,
            top: y - 10,
            zIndex: 100000,
            pointerEvents: 'none',
            backgroundColor: 'rgba(5, 5, 5, 0.92)',
            border: `1px solid ${typeColor}`,
            borderLeft: `3px solid ${typeColor}`,
            padding: '8px 12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            maxWidth: '320px',
        }}>
            <div style={{ fontSize: '10px', color: typeColor, letterSpacing: '0.1em', marginBottom: '4px' }}>
                {(data.type || 'BAĞLANTI').toUpperCase()}
            </div>
            <div style={{ fontSize: '12px', color: '#ffffff' }}>
                {data.source} ↔ {data.target}
            </div>
            {data.label && (
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    {data.label}
                </div>
            )}
            {hasEpData && (
                <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#d4d4d4' }}>
                        {evidenceTypeLabels[data.evidence_type!] || data.evidence_type}
                    </div>
                    {confidencePercent != null && (
                        <div style={{ fontSize: '10px', color: confidencePercent >= 70 ? '#22c55e' : confidencePercent >= 40 ? '#f59e0b' : '#ef4444', marginTop: '2px' }}>
                            Confidence: {confidencePercent}%
                        </div>
                    )}
                    {data.source_hierarchy && (
                        <div style={{ fontSize: '10px', color: '#737373', marginTop: '2px' }}>
                            {hierarchyLabels[data.source_hierarchy] || data.source_hierarchy}
                        </div>
                    )}
                    {(data.evidence_count ?? 0) > 0 && (
                        <div style={{ fontSize: '10px', color: '#737373', marginTop: '2px' }}>
                            {data.evidence_count} kanıt destekliyor
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════
// MAIN 3D SCENE
// ═══════════════════════════════════════════
export default function Truth3DScene({ nodes, links, onNodeClick, onLinkClick, onCinematicEnd, registerEndCinematic, cinematicActive, highlightNodeIds, highlightLinkIds, focusNodeId, annotations, nodeHeatMap, consensusAnnotations, epistemologicalMode, linkConfidenceMap, linkEvidenceMap, onPulseClick, viewMode = 'full_network', timelineRange, ghostLinks, cinematicNodeReveal, cinematicLinkReveal, isThreadingActive, threadingSourceId, onGhostLinkClick, corridorWalkMode, corridorWalkProgress = 0, corridorWalkPhase = 'idle', corridorWalkSourceId, corridorWalkTargetId, onCorridorWalkPhaseChange }: Props) {
    const mountRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<{
        cleanup: () => void;
        updateData: (n: TruthNode[], l: TruthLink[]) => void;
        startCinematic: (sourceId: string, targetId: string) => void;
        endCinematic: () => void;
        startCorridorWalk: (sourceId: string, targetId: string) => void;
        endCorridorWalk: () => void;
        getCorridorWalkState: () => CorridorWalkState;
        highlightNodes: (nodeIds: string[], linkIds: string[]) => void;
        focusOnNode: (nodeId: string) => void;
        focusOnNodes: (nodeIds: string[]) => void;
        restoreAllHighlights: () => void;
        setAnnotations: (annotations: Record<string, string>) => void;
    } | null>(null);
    const onNodeClickRef = useRef(onNodeClick);
    onNodeClickRef.current = onNodeClick;
    const onLinkClickRef = useRef(onLinkClick);
    onLinkClickRef.current = onLinkClick;
    const onCinematicEndRef = useRef(onCinematicEnd);
    onCinematicEndRef.current = onCinematicEnd;
    // Pending highlight — applied when engine becomes ready
    const pendingHighlightRef = useRef<{ nodeIds: string[]; linkIds: string[]; focusId: string | null } | null>(null);

    const latestNodesRef = useRef<TruthNode[]>(nodes);
    const latestLinksRef = useRef<TruthLink[]>(links);
    latestNodesRef.current = nodes;
    latestLinksRef.current = links;

    // Sprint 6B: Epistemolojik mod ref (closure-safe)
    const epistemologicalModeRef = useRef(epistemologicalMode);
    epistemologicalModeRef.current = epistemologicalMode;

    // Sprint 6C: Link evidence map ref (closure-safe) + pulse click callback
    const linkEvidenceMapRef = useRef(linkEvidenceMap);
    linkEvidenceMapRef.current = linkEvidenceMap;
    const onPulseClickRef = useRef(onPulseClick);
    onPulseClickRef.current = onPulseClick;

    // Sprint 7: View Mode ref (closure-safe)
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const timelineRangeRef = useRef(timelineRange);
    timelineRangeRef.current = timelineRange;

    // Sprint 7: Lens helper function refs (lazy import — avoid async useEffect coupling)
    type GetNodeVisibility = typeof import('@/store/viewModeStore')['getNodeVisibility'];
    type GetLinkVisibility = typeof import('@/store/viewModeStore')['getLinkVisibility'];
    const getNodeVisibilityRef = useRef<GetNodeVisibility | null>(null);
    const getLinkVisibilityRef = useRef<GetLinkVisibility | null>(null);
    // Sprint 10.5: Link filter ref — animate loop'tan filtre durumuna erişim
    type IsLinkVisible = (evidenceType: string | null | undefined) => boolean;
    const isLinkVisibleRef = useRef<IsLinkVisible | null>(null);

    // Sprint 14: Corridor Walk refs (closure-safe)
    const corridorWalkModeRef = useRef(corridorWalkMode);
    corridorWalkModeRef.current = corridorWalkMode;
    const corridorWalkProgressRef = useRef(corridorWalkProgress);
    corridorWalkProgressRef.current = corridorWalkProgress;
    const corridorWalkPhaseRef = useRef(corridorWalkPhase);
    corridorWalkPhaseRef.current = corridorWalkPhase;
    const corridorWalkSourceIdRef = useRef(corridorWalkSourceId);
    corridorWalkSourceIdRef.current = corridorWalkSourceId;
    const corridorWalkTargetIdRef = useRef(corridorWalkTargetId);
    corridorWalkTargetIdRef.current = corridorWalkTargetId;
    const onCorridorWalkPhaseChangeRef = useRef(onCorridorWalkPhaseChange);
    onCorridorWalkPhaseChangeRef.current = onCorridorWalkPhaseChange;
    useEffect(() => {
        import('@/store/viewModeStore').then(mod => {
            getNodeVisibilityRef.current = mod.getNodeVisibility;
            getLinkVisibilityRef.current = mod.getLinkVisibility;
        });
        import('@/store/linkFilterStore').then(mod => {
            // Store'un isLinkVisible'ını her frame güncel şekilde oku
            isLinkVisibleRef.current = (evType) => mod.useLinkFilterStore.getState().isLinkVisible(evType);
        });
    }, []);

    // Watch cinematicActive prop — when parent closes the panel, restore camera
    const cinematicActiveInitRef = useRef(true); // skip first render
    useEffect(() => {
        if (cinematicActiveInitRef.current) {
            cinematicActiveInitRef.current = false;
            return;
        }
        if (cinematicActive === false && engineRef.current) {
            engineRef.current.endCinematic();
        }
    }, [cinematicActive]);

    // Watch corridorWalkMode + corridorWalkPhase props — Sprint 14
    useEffect(() => {
        if (!engineRef.current) return;
        if (corridorWalkMode && corridorWalkPhase === 'entering' && corridorWalkSourceId && corridorWalkTargetId) {
            const state = engineRef.current.getCorridorWalkState();
            if (!state.active) {
                engineRef.current.startCorridorWalk(corridorWalkSourceId, corridorWalkTargetId);
            }
        } else if (corridorWalkPhase === 'exiting') {
            const state = engineRef.current.getCorridorWalkState();
            if (state.active && state.phase !== 'exiting') {
                engineRef.current.endCorridorWalk();
            }
        }
    }, [corridorWalkMode, corridorWalkPhase, corridorWalkSourceId, corridorWalkTargetId]);

    // Hover state
    const [hoveredNode, setHoveredNode] = useState<TruthNode | null>(null);
    const [hoveredLink, setHoveredLink] = useState<{ source: string; target: string; label?: string; type?: string; evidence_type?: string; confidence_level?: number; source_hierarchy?: string; evidence_count?: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isCinematic, setIsCinematic] = useState(false);

    // ENGINE - ONCE on mount
    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        while (container.firstChild) container.removeChild(container.firstChild);

        let frameId: number;

        let disposed = false;

        const init = async () => {
            const THREE = await import('three');
            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

            // If component unmounted during async import, abort
            if (disposed) return;

            // Remove any stale canvases from previous StrictMode mount
            const existingCanvases = container.querySelectorAll('canvas');
            if (existingCanvases.length > 0) {
                existingCanvases.forEach(c => container.removeChild(c));
            }


            // ═══ SCENE ═══
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x030303);

            // Subtle fog for depth
            scene.fog = new THREE.FogExp2(0x030303, 0.002); // Daha az sis — uzak node'lar görünsün

            const width = container.clientWidth || window.innerWidth;
            const height = container.clientHeight || window.innerHeight;

            // ═══ CAMERA ═══
            const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
            camera.position.set(0, 30, 130);

            // ═══ RENDERER ═══
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
            container.appendChild(renderer.domElement);

            // ═══ CONTROLS ═══
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.rotateSpeed = 0.5;
            controls.zoomSpeed = 0.7;
            controls.minDistance = 5;     // Çok yakına zoom yapabilsin
            controls.maxDistance = 800;    // Çok uzağa gidebilsin (40+ node)
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.15;

            // ═══ LIGHTS ═══
            scene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const redLight = new THREE.PointLight(0xef4444, 3, 200);
            redLight.position.set(30, 30, 30);
            scene.add(redLight);
            const blueLight = new THREE.PointLight(0x3b82f6, 1, 150);
            blueLight.position.set(-30, -20, -30);
            scene.add(blueLight);

            // ═══ ATMOSPHERE PARTICLES ═══
            const particleCount = 800;
            const particleGeo = new THREE.BufferGeometry();
            const pPositions = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount * 3; i++) {
                pPositions[i] = (Math.random() - 0.5) * 300;
            }
            particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
            const particleMat = new THREE.PointsMaterial({
                color: 0xdc2626,
                size: 0.3,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particles = new THREE.Points(particleGeo, particleMat);
            scene.add(particles);

            // ═══ RAYCASTER ═══
            const raycaster = new THREE.Raycaster();
            raycaster.params.Points = { threshold: 3 };
            const mouse = new THREE.Vector2();
            let nodeMeshes: THREE_TYPES.Mesh[] = [];
            let linkMeshes: THREE_TYPES.Mesh[] = [];
            let linkLines: any[] = []; // animated link materials
            let clock = new THREE.Clock();

            // ═══ CANLI İP: Shader-Based Cable Glow ═══
            // Her link'in kendisi parlıyor — elektrik kablosu gibi
            interface CableGlow {
                material: THREE_TYPES.ShaderMaterial;
                speed: number;          // pulse hızı (evidence yoğunluğu)
                pulseCount: number;     // kaç pulse aynı anda (1-3)
                direction: number;      // 1=forward, -1=backward, 0=bidirectional
                linkKey: string;        // Sprint 6C: sourceId::targetId (sorted)
                sourceId: string;
                targetId: string;
                originalColor?: { x: number; y: number; z: number }; // Sprint 7: lens restore için
                linkMeta?: { type: string; evidence_type: string; evidence_count: number; confidence_level: number }; // Sprint 7 fix: lens visibility
            }
            let cableGlows: CableGlow[] = [];

            // ═══ CINEMATIC STATE ═══
            let cinematic: CinematicState = {
                active: false,
                sourceId: '', targetId: '',
                progress: 0,
                phase: 'zooming',
                savedCameraPos: null,
                savedCameraTarget: null,
            };
            let cinematicTarget = new THREE.Vector3();
            let cinematicCamPos = new THREE.Vector3();
            const CINEMATIC_ZOOM_SPEED = 0.015; // How fast camera moves (0-1 per frame)
            const CINEMATIC_FADE_SPEED = 0.04; // How fast others fade out

            // ═══ CORRIDOR WALK STATE — Sprint 14 ═══
            let corridorWalk: CorridorWalkState = {
                active: false,
                phase: 'entering',
                progress: 0,
                savedCameraPos: null,
                savedCameraTarget: null,
                sourcePos: null,
                targetPos: null,
                walkP0: null,
                walkP1: null,
                walkP2: null,
                perpDir: null,
            };
            const CORRIDOR_ENTER_SPEED = 0.025;  // ~40 frames = ~0.67s
            const CORRIDOR_EXIT_SPEED = 0.04;    // ~25 frames = ~0.42s
            const CORRIDOR_CAM_DISTANCE = 12;    // Kameradan ipe uzaklık
            const CORRIDOR_CAM_HEIGHT = 3;       // Kamera yüksekliği

            // Track original opacities for restore
            let nodeOriginalOpacities = new Map<string, number>();

            // Shared position map (populated by updateData, used by cinematic)
            let posMap = new Map<string, THREE_TYPES.Vector3>();
            let nodeNameMap = new Map<string, string>();

            // ═══ DRAG DETECTION — prevent click during rotate/pan ═══
            let mouseDownPos = { x: 0, y: 0 };
            let mouseDownTime = 0;
            const DRAG_THRESHOLD = 5; // pixels — more than this = dragging, not clicking
            const CLICK_MAX_TIME = 400; // ms — hold longer = drag

            const onMouseDown = (e: MouseEvent) => {
                mouseDownPos = { x: e.clientX, y: e.clientY };
                mouseDownTime = Date.now();
            };
            container.addEventListener('mousedown', onMouseDown);

            // ═══ CLICK ═══
            const onClick = (e: MouseEvent) => {
                // Ignore if user was dragging/rotating
                const dx = Math.abs(e.clientX - mouseDownPos.x);
                const dy = Math.abs(e.clientY - mouseDownPos.y);
                const dt = Date.now() - mouseDownTime;
                if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD || dt > CLICK_MAX_TIME) {
                    return; // Was a drag, not a click
                }

                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);

                // Check nodes first
                const nodeHits = raycaster.intersectObjects(nodeMeshes);
                if (nodeHits.length > 0) {
                    const obj = nodeHits[0].object;
                    if (obj.userData.id) {
                        const clickedId = obj.userData.id;
                        // Node click handled

                        // ═══ SUB-NETWORK HIGHLIGHT ═══
                        // Find all connected node IDs from links
                        const connectedIds = new Set<string>();
                        connectedIds.add(clickedId);
                        latestLinksRef.current.forEach(link => {
                            const sid = typeof link.source === 'object' ? (link.source as any)?.id : link.source;
                            const tid = typeof link.target === 'object' ? (link.target as any)?.id : link.target;
                            if (sid === clickedId) connectedIds.add(tid);
                            if (tid === clickedId) connectedIds.add(sid);
                        });

                        // Dim unrelated nodes, brighten connected
                        nodeMeshes.forEach(mesh => {
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            const nid = mesh.userData.id;
                            mat.opacity = connectedIds.has(nid) ? 1.0 : 0.08;
                        });

                        // Dim unrelated links, brighten connected
                        scene.traverse((child: any) => {
                            if (child.userData.isLink && child.material) {
                                const sid = child.userData.sourceId;
                                const tid = child.userData.targetId;
                                const isConnected = (sid === clickedId || tid === clickedId);
                                child.material.opacity = isConnected ? 0.7 : 0.02;
                            }
                        });

                        controls.autoRotate = false;

                        // Open panel
                        onNodeClickRef.current(obj.userData);
                        return;
                    }
                }

                // Check links — start cinematic mode
                const linkHits = raycaster.intersectObjects(linkMeshes);
                if (linkHits.length > 0 && !cinematic.active) {
                    const ld = linkHits[0].object.userData;

                    // Notify parent (for side panel)
                    if (onLinkClickRef.current) {
                        onLinkClickRef.current({
                            sourceId: ld.sourceId,
                            targetId: ld.targetId,
                            sourceLabel: ld.sourceLabel,
                            targetLabel: ld.targetLabel,
                            label: ld.label,
                            type: ld.type,
                        });
                    }

                    // Start cinematic camera animation
                    startCinematicMode(ld.sourceId, ld.targetId);
                    return;
                }

                // Empty space click → restore all highlights + exit cinematic
                if (nodeHits.length === 0 && linkHits.length === 0) {
                    if (cinematic.active) {
                        endCinematicMode();
                    }
                    // AI highlight aktifse → animasyonlu restore
                    if (highlightActive) {
                        restoreAllHighlightsExternal();
                    }
                    // Notify parent to close side panel + clear store highlights
                    if (onCinematicEndRef.current) onCinematicEndRef.current();
                }
            };

            // ═══ HOVER ═══
            const onMove = (e: MouseEvent) => {
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);

                setMousePos({ x: e.clientX, y: e.clientY });

                // Check nodes
                const nodeHits = raycaster.intersectObjects(nodeMeshes);
                if (nodeHits.length > 0) {
                    container.style.cursor = 'pointer';
                    setHoveredNode(nodeHits[0].object.userData as TruthNode);
                    setHoveredLink(null);
                    // Stop auto-rotate on hover
                    controls.autoRotate = false;
                    return;
                }

                // Check links
                const linkHits = raycaster.intersectObjects(linkMeshes);
                if (linkHits.length > 0) {
                    container.style.cursor = 'pointer';
                    const ld = linkHits[0].object.userData;
                    setHoveredLink({ source: ld.source || ld.sourceLabel, target: ld.target || ld.targetLabel, label: ld.label, type: ld.type, evidence_type: ld.evidence_type, confidence_level: ld.confidence_level, source_hierarchy: ld.source_hierarchy, evidence_count: ld.evidence_count });
                    setHoveredNode(null);
                    controls.autoRotate = false;
                    return;
                }

                container.style.cursor = 'default';
                setHoveredNode(null);
                setHoveredLink(null);
                controls.autoRotate = true;
            };

            const onMouseLeave = () => {
                setHoveredNode(null);
                setHoveredLink(null);
                controls.autoRotate = true;
            };

            container.addEventListener('click', onClick);
            container.addEventListener('mousemove', onMove);
            container.addEventListener('mouseleave', onMouseLeave);

            // ═══ CINEMATIC MODE ═══
            const startCinematicMode = (sourceId: string, targetId: string) => {
                if (cinematic.active) return;

                const sp = posMap.get(sourceId);
                const tp = posMap.get(targetId);
                if (!sp || !tp) return;

                // Save current camera state
                cinematic = {
                    active: true,
                    sourceId,
                    targetId,
                    progress: 0,
                    phase: 'zooming',
                    savedCameraPos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    savedCameraTarget: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
                };

                // Calculate target: midpoint between the two nodes, camera offset
                const mid = sp.clone().add(tp).multiplyScalar(0.5);
                cinematicTarget.copy(mid);

                const dist = sp.distanceTo(tp);
                const camDist = Math.max(dist * 1.2, 20); // enough distance to see both
                // Camera position: offset from midpoint, slightly above
                const dir = tp.clone().sub(sp).normalize();
                const perp = new THREE.Vector3(-dir.z, 0.5, dir.x).normalize();
                cinematicCamPos.copy(mid).add(perp.multiplyScalar(camDist));

                controls.autoRotate = false;
                setIsCinematic(true);

            };

            const endCinematicMode = () => {
                if (!cinematic.active) return;

                cinematic.phase = 'restoring';
                cinematic.progress = 0;

            };

            // ═══ CORRIDOR WALK MODE — Sprint 14 ═══
            const startCorridorWalk = (sourceId: string, targetId: string) => {
                if (corridorWalk.active) return;

                const sp = posMap.get(sourceId);
                const tp = posMap.get(targetId);
                if (!sp || !tp) {
                    console.warn('⚠️ Corridor Walk: node positions not found', sourceId, targetId);
                    return;
                }

                // Önce cinematic'i kapat
                if (cinematic.active) {
                    cinematic.active = false;
                    cinematic.phase = 'zooming';
                }

                // İp yönü ve dik vektör
                const dir = tp.clone().sub(sp).normalize();
                const perp = new THREE.Vector3(-dir.z, CORRIDOR_CAM_HEIGHT, dir.x).normalize();
                const mid = sp.clone().add(tp).multiplyScalar(0.5);

                // Bezier kontrol noktaları — kamera ipin yanından yürür
                const walkP0 = sp.clone().add(perp.clone().multiplyScalar(CORRIDOR_CAM_DISTANCE));
                const walkP1 = mid.clone().add(perp.clone().multiplyScalar(CORRIDOR_CAM_DISTANCE * 1.3)); // midpoint'te hafif kabarık
                const walkP2 = tp.clone().add(perp.clone().multiplyScalar(CORRIDOR_CAM_DISTANCE));

                corridorWalk.active = true;
                corridorWalk.phase = 'entering';
                corridorWalk.progress = 0;
                corridorWalk.savedCameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
                corridorWalk.savedCameraTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
                corridorWalk.sourcePos = sp.clone();
                corridorWalk.targetPos = tp.clone();
                corridorWalk.walkP0 = walkP0;
                corridorWalk.walkP1 = walkP1;
                corridorWalk.walkP2 = walkP2;
                corridorWalk.perpDir = perp;

                controls.autoRotate = false;
            };

            const endCorridorWalk = () => {
                if (!corridorWalk.active) return;
                corridorWalk.phase = 'exiting';
                corridorWalk.progress = 0;
                // 🔄 Store'a exiting fazını bildir
                if (onCorridorWalkPhaseChangeRef.current) {
                    onCorridorWalkPhaseChangeRef.current('exiting');
                }
            };

            // ESC key to exit cinematic or corridor walk
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    if (corridorWalk.active) {
                        endCorridorWalk();
                    } else if (cinematic.active) {
                        endCinematicMode();
                        if (onCinematicEndRef.current) onCinematicEndRef.current();
                    }
                }
            };
            window.addEventListener('keydown', onKeyDown);

            // ═══ RESIZE ═══
            const onResize = () => {
                const w = container.clientWidth || window.innerWidth;
                const h = container.clientHeight || window.innerHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            };
            window.addEventListener('resize', onResize);

            // Glow ring meshes for AI highlighted nodes (must be before animate)
            const glowRings: THREE_TYPES.Mesh[] = [];
            // Flag: when true, animate loop skips link pulse (highlight takes priority)
            let highlightActive = false;

            // Annotation label sprites (DECEASED, CONVICTED, etc.)
            const annotationSprites: THREE_TYPES.Sprite[] = [];

            // ═══ HIGHLIGHT ANIMATION STATE ═══
            let highlightAnimation: {
                active: boolean;
                progress: number;
                duration: number;
                targetNodeIds: Set<string>;
                targetLinkIds: Set<string>;
                phase: 'dimming' | 'glowing' | 'complete';
            } | null = null;

            // ═══ ANIMATE ═══
            const animate = () => {
                frameId = requestAnimationFrame(animate);
                const elapsed = clock.getElapsedTime();

                controls.update();

                // Animate particles - slow rotation
                particles.rotation.y = elapsed * 0.02;
                particles.rotation.x = Math.sin(elapsed * 0.01) * 0.1;

                // Animate red light orbit
                redLight.position.x = Math.sin(elapsed * 0.3) * 40;
                redLight.position.z = Math.cos(elapsed * 0.3) * 40;

                // ═══ HIGHLIGHT ANIMATION (frame-by-frame fade) ═══
                if (highlightAnimation && highlightAnimation.active) {
                    highlightAnimation.progress++;
                    const p = Math.min(highlightAnimation.progress / highlightAnimation.duration, 1);
                    const t = easeInOutCubic(p);

                    const nodeSet = highlightAnimation.targetNodeIds;
                    const linkSet = highlightAnimation.targetLinkIds;

                    // Node fade animation
                    nodeMeshes.forEach(mesh => {
                        const nid = mesh.userData.id;
                        const isHighlighted = nodeSet.has(nid);
                        const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                        if (isHighlighted) {
                            mat.opacity = 1;
                            mesh.scale.set(7 + t * 4, 8.75 + t * 5, 1); // 7→11, 8.75→13.75
                        } else {
                            mat.opacity = 1 - t * 0.94; // 1.0 → 0.06
                            mesh.scale.set(7 - t * 2.5, 8.75 - t * 3.125, 1); // 7→4.5, 8.75→5.625
                        }
                        mat.needsUpdate = true;
                    });

                    // Glow halo fade animation
                    scene.traverse((child: any) => {
                        if (child.userData.isGlow && child.material) {
                            const isHighlighted = child.userData.nodeId && nodeSet.has(child.userData.nodeId);
                            const base = child.userData.originalOpacity || 0.15;
                            child.material.opacity = isHighlighted
                                ? Math.min(base * (1 + t * 2), 0.6)
                                : base * (1 - t * 0.9);
                        }
                    });

                    // Link fade animation (shader-compatible)
                    scene.traverse((child: any) => {
                        if (child.userData.isLink && child.material) {
                            const sid = child.userData.sourceId;
                            const tid = child.userData.targetId;
                            const bothHighlighted = nodeSet.has(sid) && nodeSet.has(tid);
                            const oneHighlighted = nodeSet.has(sid) || nodeSet.has(tid);
                            const targetDim = bothHighlighted ? 1.0 : oneHighlighted ? 0.3 : 0.05;
                            // ShaderMaterial: uHighlightDim uniform'unu güncelle
                            if (child.material.uniforms?.uHighlightDim) {
                                const current = child.material.uniforms.uHighlightDim.value;
                                child.material.uniforms.uHighlightDim.value += (targetDim - current) * t;
                            } else if (child.material.opacity !== undefined) {
                                // Fallback: eski LineBasicMaterial (paralel çizgiler vs)
                                const targetOpacity = bothHighlighted ? 0.7 : oneHighlighted ? 0.12 : 0.02;
                                child.material.opacity += (targetOpacity - child.material.opacity) * t;
                            }
                        }
                    });

                    // Create glow rings at 30% mark
                    if (highlightAnimation.phase === 'dimming' && p >= 0.3) {
                        highlightAnimation.phase = 'glowing';
                        nodeMeshes.forEach(mesh => {
                            if (nodeSet.has(mesh.userData.id)) {
                                const ringGeo = new THREE.RingGeometry(5, 9, 48);
                                const ringMat = new THREE.MeshBasicMaterial({
                                    color: 0xff4444,
                                    transparent: true,
                                    opacity: 0,
                                    side: THREE.DoubleSide,
                                    blending: THREE.AdditiveBlending,
                                    depthWrite: false,
                                });
                                const ring = new THREE.Mesh(ringGeo, ringMat);
                                ring.position.copy(mesh.position);
                                ring.lookAt(camera.position);
                                ring.userData.isGlowRing = true;
                                ring.userData.phase = Math.random() * Math.PI * 2;
                                scene.add(ring);
                                glowRings.push(ring);
                            }
                        });
                    }

                    if (p >= 1) {
                        highlightAnimation.phase = 'complete';
                        highlightAnimation.active = false;
                    }
                }

                // ═══ PULSE GLOW RINGS (AI Highlights) ═══
                glowRings.forEach(ring => {
                    if (ring.parent) {
                        const mat = ring.material as THREE_TYPES.MeshBasicMaterial;
                        const phase = ring.userData.phase || 0;
                        // Yavaş nefes nabzı — keşif hissi, alarm değil
                        mat.opacity = 0.15 + Math.sin(elapsed * 1.6 + phase) * 0.10;
                        // Yavaş rotasyon
                        ring.rotation.z = elapsed * 0.2 + phase;
                        // Face camera
                        ring.lookAt(camera.position);
                    }
                });

                // ═══ PULSE LINKS ═══
                // Skip pulsing when AI highlight is active (highlight sets its own opacity)
                if (!highlightActive) {
                    // Link pulse artık shader ile yapılıyor (CANLI İP sistemi)
                    // Eski opacity pulse'a gerek yok — shader kendi animasyonunu çalıştırıyor

                    // ═══ SPRINT 5: HEAT MAP PULSE ═══
                    // Sık sorgulanan node'lar hafif nabız atar (highlight olmadan)
                    if (nodeHeatMap && nodeHeatMap.size > 0) {
                        nodeMeshes.forEach(mesh => {
                            const heat = nodeHeatMap.get(mesh.userData.id) ?? 0;
                            if (heat > 0.2) {
                                const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                                // Orijinal scale'den hesapla (SET, çarpma DEĞİL)
                                const baseX = 7;    // default node width
                                const baseY = 8.75; // default node height
                                const heatPulse = 1 + Math.sin(elapsed * 1.8 + heat * 3) * 0.03 * heat;
                                mesh.scale.x = baseX * heatPulse;
                                mesh.scale.y = baseY * heatPulse;
                                // Hafif parlaklık artışı (base'den hesapla)
                                mat.opacity = Math.min(1, 0.85 + heat * 0.12);
                            }
                        });
                    }
                }

                // ═══ CANLI İP: Shader Cable Glow Update ═══
                // Her frame'de shader uniform'larını güncelle
                if (cableGlows.length > 0 && !cinematic.active) {
                    const epModeNow = epistemologicalModeRef.current ? 1.0 : 0.0;
                    const currentViewMode = viewModeRef.current || 'full_network';
                    cableGlows.forEach(glow => {
                        glow.material.uniforms.uTime.value = elapsed;
                        glow.material.uniforms.uEpMode.value = epModeNow;
                        // NOT: uHighlightDim burada SET EDİLMEZ — lens branch ve full_network branch
                        // kendi LERP değerlerini hesaplar. Eski kod her frame'de 1.0'a reset ederek
                        // LERP'in yakınsamasını engelliyordu (links hep ~0.95'te kalıyordu).
                    });

                    // ═══ SPRINT 7: LENS VİSİBİLİTY — Smooth Z-Axis Ghosting ═══
                    // Araştırmadan: "staged transitions" — ani geçiş değil, yumuşak fade
                    if (currentViewMode !== 'full_network') {
                        const LERP_SPEED = 0.06;
                        const getNodeVis = getNodeVisibilityRef.current;
                        const getLinkVis = getLinkVisibilityRef.current;
                        const checkLinkFilter = isLinkVisibleRef.current;
                        if (!getNodeVis || !getLinkVis) return;

                        // NODE VİSİBİLİTY
                        nodeMeshes.forEach((mesh) => {
                            const node = mesh.userData;
                            if (!node.id) return;
                            const vis = getNodeVis(node, currentViewMode, timelineRangeRef.current);
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            if (mat && mat.opacity !== undefined) {
                                mat.opacity = mat.opacity + (vis.opacity * 0.85 - mat.opacity) * LERP_SPEED;
                            }
                            const targetZ = (node.z ?? 0) + vis.zOffset;
                            mesh.position.z = mesh.position.z + (targetZ - mesh.position.z) * LERP_SPEED;
                        });

                        // LINK VİSİBİLİTY (shader uniform) + İP FİLTRESİ
                        cableGlows.forEach(glow => {
                            const mat = glow.material;
                            if (!mat.uniforms) return;
                            const linkData = glow.linkMeta || { type: '', evidence_type: '', evidence_count: 0, confidence_level: 0 };

                            // Sprint 10.5: İp filtresi — filtre aktifse ve bu tip seçili değilse gizle
                            const passesFilter = checkLinkFilter ? checkLinkFilter(linkData.evidence_type || null) : true;
                            const vis = getLinkVis(linkData, currentViewMode);
                            const targetDim = highlightActive ? 0.15 : (passesFilter ? vis.opacity : 0.0);

                            const LINK_LERP = 0.12;
                            mat.uniforms.uHighlightDim.value = mat.uniforms.uHighlightDim.value +
                                (targetDim - mat.uniforms.uHighlightDim.value) * LINK_LERP;

                            // Renk override — filtreden geçen link'ler kendi tip renklerini gösterir
                            if (passesFilter && vis.colorOverride !== null) {
                                const r = ((vis.colorOverride >> 16) & 255) / 255;
                                const g = ((vis.colorOverride >> 8) & 255) / 255;
                                const b = (vis.colorOverride & 255) / 255;
                                const cu = mat.uniforms.uColor.value as THREE_TYPES.Vector3;
                                cu.x = cu.x + (r - cu.x) * LINK_LERP;
                                cu.y = cu.y + (g - cu.y) * LINK_LERP;
                                cu.z = cu.z + (b - cu.z) * LINK_LERP;
                            }
                        });
                    } else {
                        // FULL NETWORK: Restore everything (node + link)
                        const LERP_SPEED = 0.06;
                        nodeMeshes.forEach((mesh) => {
                            const node = mesh.userData;
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            if (mat && mat.opacity !== undefined) {
                                // full_network: node'lar tam opaklığa dön (1.0)
                                mat.opacity = mat.opacity + (1.0 - mat.opacity) * LERP_SPEED;
                            }
                            // Z restore
                            const targetZ = node.z ?? 0;
                            mesh.position.z = mesh.position.z + (targetZ - mesh.position.z) * LERP_SPEED;
                        });
                        // LINK RESTORE — renk ve opacity orijinale dönsün
                        // Sprint 10.5: full_network modunda da ip filtresi aktifse uygula
                        const checkLinkFilterFull = isLinkVisibleRef.current;
                        cableGlows.forEach(glow => {
                            const mat = glow.material;
                            const linkData = glow.linkMeta || { type: '', evidence_type: '', evidence_count: 0, confidence_level: 0 };
                            const passesFilter = checkLinkFilterFull ? checkLinkFilterFull(linkData.evidence_type || null) : true;
                            const targetDim = highlightActive ? 0.15 : (passesFilter ? 1.0 : 0.0);
                            mat.uniforms.uHighlightDim.value = mat.uniforms.uHighlightDim.value +
                                (targetDim - mat.uniforms.uHighlightDim.value) * LERP_SPEED;
                            // Renk restore — orijinal renge dön (sadece filtreden geçenler)
                            if (passesFilter && glow.originalColor) {
                                const oc = glow.originalColor;
                                const cu = mat.uniforms.uColor.value as THREE_TYPES.Vector3;
                                cu.x = cu.x + (oc.x - cu.x) * LERP_SPEED;
                                cu.y = cu.y + (oc.y - cu.y) * LERP_SPEED;
                                cu.z = cu.z + (oc.z - cu.z) * LERP_SPEED;
                            }
                        });
                    }
                }

                // ═══ CINEMATIC ANIMATION ═══
                if (cinematic.active) {
                    if (cinematic.phase === 'zooming') {
                        cinematic.progress = Math.min(1, cinematic.progress + CINEMATIC_ZOOM_SPEED);
                        const t = easeInOutCubic(cinematic.progress);

                        // Smooth camera movement
                        camera.position.lerp(cinematicCamPos, t * 0.08);
                        controls.target.lerp(cinematicTarget, t * 0.08);

                        // Fade out non-related nodes/links
                        nodeMeshes.forEach((mesh) => {
                            const nid = mesh.userData.id;
                            const isRelated = nid === cinematic.sourceId || nid === cinematic.targetId;
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            if (isRelated) {
                                mat.opacity = 1;
                            } else {
                                mat.opacity = Math.max(0.05, mat.opacity - CINEMATIC_FADE_SPEED);
                            }
                        });

                        // Fade links (shader-compatible)
                        linkLines.forEach((lineMat: any) => {
                            if (lineMat.uniforms?.uHighlightDim) {
                                // ShaderMaterial: dim down
                                lineMat.uniforms.uHighlightDim.value = Math.max(0.05, lineMat.uniforms.uHighlightDim.value - CINEMATIC_FADE_SPEED * 0.5);
                            } else if (lineMat.opacity !== undefined) {
                                lineMat.opacity = Math.max(0.02, lineMat.opacity - CINEMATIC_FADE_SPEED * 0.5);
                            }
                        });

                        // Brighten the specific link between source and target
                        scene.traverse((obj: any) => {
                            if (obj.userData.isLink && obj.type === 'Line') {
                                const isTheLink =
                                    (obj.userData.sourceId === cinematic.sourceId && obj.userData.targetId === cinematic.targetId) ||
                                    (obj.userData.sourceId === cinematic.targetId && obj.userData.targetId === cinematic.sourceId);
                                if (isTheLink && obj.material) {
                                    if (obj.material.uniforms?.uHighlightDim) {
                                        obj.material.uniforms.uHighlightDim.value = 1.5 + Math.sin(elapsed * 3) * 0.5;
                                    } else {
                                        obj.material.opacity = 0.8 + Math.sin(elapsed * 3) * 0.2;
                                    }
                                }
                            }
                        });

                        if (cinematic.progress >= 1) {
                            cinematic.phase = 'focused';
                        }
                    } else if (cinematic.phase === 'focused') {
                        // Gentle breathing on focused link
                        scene.traverse((obj: any) => {
                            if (obj.userData.isLink && obj.type === 'Line') {
                                const isTheLink =
                                    (obj.userData.sourceId === cinematic.sourceId && obj.userData.targetId === cinematic.targetId) ||
                                    (obj.userData.sourceId === cinematic.targetId && obj.userData.targetId === cinematic.sourceId);
                                if (isTheLink && obj.material) {
                                    if (obj.material.uniforms?.uHighlightDim) {
                                        obj.material.uniforms.uHighlightDim.value = 1.2 + Math.sin(elapsed * 2) * 0.6;
                                    } else {
                                        obj.material.opacity = 0.6 + Math.sin(elapsed * 2) * 0.3;
                                    }
                                }
                            }
                        });
                    } else if (cinematic.phase === 'restoring') {
                        cinematic.progress = Math.min(1, cinematic.progress + 0.04); // ~25 frames = 0.4s

                        // Faster lerp that increases as animation progresses
                        const lerpFactor = 0.08 + cinematic.progress * 0.12; // 0.08 → 0.20
                        if (cinematic.savedCameraPos) {
                            const savedPos = new THREE.Vector3(cinematic.savedCameraPos.x, cinematic.savedCameraPos.y, cinematic.savedCameraPos.z);
                            camera.position.lerp(savedPos, lerpFactor);
                        }
                        if (cinematic.savedCameraTarget) {
                            const savedTarget = new THREE.Vector3(cinematic.savedCameraTarget.x, cinematic.savedCameraTarget.y, cinematic.savedCameraTarget.z);
                            controls.target.lerp(savedTarget, lerpFactor);
                        }

                        // Restore all opacities
                        nodeMeshes.forEach((mesh) => {
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            mat.opacity = Math.min(1, mat.opacity + CINEMATIC_FADE_SPEED * 3);
                        });

                        if (cinematic.progress >= 1) {
                            // Snap camera to exact saved position
                            if (cinematic.savedCameraPos) {
                                camera.position.set(cinematic.savedCameraPos.x, cinematic.savedCameraPos.y, cinematic.savedCameraPos.z);
                            }
                            if (cinematic.savedCameraTarget) {
                                controls.target.set(cinematic.savedCameraTarget.x, cinematic.savedCameraTarget.y, cinematic.savedCameraTarget.z);
                            }
                            // Ensure all nodes are fully visible
                            nodeMeshes.forEach((mesh) => {
                                const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                                mat.opacity = 1;
                            });
                            cinematic.active = false;
                            cinematic.phase = 'zooming';
                            controls.autoRotate = true;
                            setIsCinematic(false);
                            if (onCinematicEndRef.current) onCinematicEndRef.current();
                        }
                    }
                }

                // ═══ CORRIDOR WALK ANIMATION — Sprint 14 "Utanç Koridoru" ═══
                if (corridorWalk.active) {
                    if (corridorWalk.phase === 'entering') {
                        corridorWalk.progress = Math.min(1, corridorWalk.progress + CORRIDOR_ENTER_SPEED);
                        const t = easeInOutCubic(corridorWalk.progress);

                        // Kamerayı ip başlangıcına (walkP0) doğru hareket ettir
                        if (corridorWalk.walkP0) {
                            camera.position.lerp(corridorWalk.walkP0, t * 0.1);
                        }
                        if (corridorWalk.sourcePos) {
                            controls.target.lerp(corridorWalk.sourcePos, t * 0.1);
                        }

                        // Diğer node/link'leri karart
                        nodeMeshes.forEach((mesh) => {
                            const nid = mesh.userData.id;
                            const isRelated = nid === corridorWalkSourceIdRef.current || nid === corridorWalkTargetIdRef.current;
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            mat.opacity = isRelated ? 1 : Math.max(0.03, mat.opacity - CINEMATIC_FADE_SPEED);
                        });
                        linkLines.forEach((lineMat: any) => {
                            if (lineMat.uniforms?.uHighlightDim) {
                                lineMat.uniforms.uHighlightDim.value = Math.max(0.03, lineMat.uniforms.uHighlightDim.value - CINEMATIC_FADE_SPEED * 0.5);
                            }
                        });
                        // Hedef ip'i parlat
                        scene.traverse((obj: any) => {
                            if (obj.userData.isLink && obj.type === 'Line') {
                                const isTheLink =
                                    (obj.userData.sourceId === corridorWalkSourceIdRef.current && obj.userData.targetId === corridorWalkTargetIdRef.current) ||
                                    (obj.userData.sourceId === corridorWalkTargetIdRef.current && obj.userData.targetId === corridorWalkSourceIdRef.current);
                                if (isTheLink && obj.material?.uniforms?.uHighlightDim) {
                                    obj.material.uniforms.uHighlightDim.value = 2.0;
                                }
                            }
                        });

                        if (corridorWalk.progress >= 1) {
                            corridorWalk.phase = 'walking';
                            // 🔄 Store'a faz geçişini bildir
                            if (onCorridorWalkPhaseChangeRef.current) {
                                onCorridorWalkPhaseChangeRef.current('walking');
                            }
                        }

                    } else if (corridorWalk.phase === 'walking') {
                        // Progress store'dan gelir (corridorWalkProgressRef)
                        const walkT = corridorWalkProgressRef.current;

                        if (corridorWalk.walkP0 && corridorWalk.walkP1 && corridorWalk.walkP2 && corridorWalk.sourcePos && corridorWalk.targetPos) {
                            // Bezier kamera pozisyonu
                            const camTarget = quadraticBezier(corridorWalk.walkP0, corridorWalk.walkP1, corridorWalk.walkP2, walkT);
                            camera.position.lerp(camTarget, 0.08);

                            // Kamera ipin üzerindeki noktaya bakıyor
                            const lookTarget = corridorWalk.sourcePos.clone().lerp(corridorWalk.targetPos, walkT);
                            controls.target.lerp(lookTarget, 0.08);
                        }

                        // İp'i nefes aldır
                        scene.traverse((obj: any) => {
                            if (obj.userData.isLink && obj.type === 'Line') {
                                const isTheLink =
                                    (obj.userData.sourceId === corridorWalkSourceIdRef.current && obj.userData.targetId === corridorWalkTargetIdRef.current) ||
                                    (obj.userData.sourceId === corridorWalkTargetIdRef.current && obj.userData.targetId === corridorWalkSourceIdRef.current);
                                if (isTheLink && obj.material?.uniforms?.uHighlightDim) {
                                    obj.material.uniforms.uHighlightDim.value = 1.5 + Math.sin(elapsed * 2) * 0.5;
                                }
                            }
                        });

                    } else if (corridorWalk.phase === 'exiting') {
                        corridorWalk.progress = Math.min(1, corridorWalk.progress + CORRIDOR_EXIT_SPEED);
                        const lerpFactor = 0.08 + corridorWalk.progress * 0.15;

                        // Kayıtlı kamera pozisyonuna dön
                        if (corridorWalk.savedCameraPos) {
                            const savedPos = new THREE.Vector3(corridorWalk.savedCameraPos.x, corridorWalk.savedCameraPos.y, corridorWalk.savedCameraPos.z);
                            camera.position.lerp(savedPos, lerpFactor);
                        }
                        if (corridorWalk.savedCameraTarget) {
                            const savedTarget = new THREE.Vector3(corridorWalk.savedCameraTarget.x, corridorWalk.savedCameraTarget.y, corridorWalk.savedCameraTarget.z);
                            controls.target.lerp(savedTarget, lerpFactor);
                        }

                        // Opasiteleri geri yükle
                        nodeMeshes.forEach((mesh) => {
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            mat.opacity = Math.min(1, mat.opacity + CINEMATIC_FADE_SPEED * 3);
                        });
                        linkLines.forEach((lineMat: any) => {
                            if (lineMat.uniforms?.uHighlightDim) {
                                lineMat.uniforms.uHighlightDim.value = Math.min(1, lineMat.uniforms.uHighlightDim.value + CINEMATIC_FADE_SPEED * 2);
                            }
                        });

                        if (corridorWalk.progress >= 1) {
                            // Snap
                            if (corridorWalk.savedCameraPos) {
                                camera.position.set(corridorWalk.savedCameraPos.x, corridorWalk.savedCameraPos.y, corridorWalk.savedCameraPos.z);
                            }
                            if (corridorWalk.savedCameraTarget) {
                                controls.target.set(corridorWalk.savedCameraTarget.x, corridorWalk.savedCameraTarget.y, corridorWalk.savedCameraTarget.z);
                            }
                            nodeMeshes.forEach((mesh) => {
                                const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                                mat.opacity = 1;
                            });
                            corridorWalk.active = false;
                            controls.autoRotate = true;
                            // 🔄 Store'a çıkış tamamlandığını bildir
                            if (onCorridorWalkPhaseChangeRef.current) {
                                onCorridorWalkPhaseChangeRef.current('idle');
                            }
                        }
                    }
                }

                renderer.render(scene, camera);
            };
            animate();

            // ═══════════════════════════════════════════
            // DATA UPDATE
            // ═══════════════════════════════════════════
            const updateData = (newNodes: TruthNode[], newLinks: TruthLink[]) => {
                if (newNodes.length === 0) return;


                // Clear previous nodes
                nodeMeshes.forEach(m => {
                    scene.remove(m);
                    (m.geometry as any)?.dispose?.();
                    (m.material as any)?.dispose?.();
                });
                nodeMeshes = [];
                linkMeshes = [];
                linkLines = [];

                // Clear previous cable glow shaders
                cableGlows = [];

                // Clear previous links & helpers
                const toRemove: THREE_TYPES.Object3D[] = [];
                scene.traverse(obj => {
                    if (obj.userData.isLink || obj.userData.isGlow) toRemove.push(obj);
                });
                toRemove.forEach(obj => scene.remove(obj));

                // ═══ TIER & TYPE CONFIG — imported from @/constants/colors ═══
                const getColor = getNodeColor;
                const getRadius = getOrbitRadius;

                // ═══ GROUP BY TIER ═══
                const tierGroups: Record<string, TruthNode[]> = {};
                newNodes.forEach(node => {
                    const key = String(node.tier ?? 'other');
                    if (!tierGroups[key]) tierGroups[key] = [];
                    tierGroups[key].push(node);
                });

                posMap.clear();
                nodeNameMap.clear();

                // ═══ CREATE NODE CANVAS (Initials Fallback - Beautiful & Responsive) ═══
                const createNodeCanvas = (node: TruthNode, color: number): HTMLCanvasElement => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 128;
                    canvas.height = 160;
                    const ctx = canvas.getContext('2d')!;

                    // ═══ TYPE & TIER COLOR MAPPING ═══
                    let tierColor = color;
                    const nodeType = node.type || 'person';
                    const isNonPerson = ['organization', 'location', 'document', 'event'].includes(nodeType);
                    if (!isNonPerson) {
                        // Person nodes: tier-based
                        const t = node.tier;
                        if (t === 0 || t === 'tier0') tierColor = 0xff0000;   // KINGPIN
                        if (t === 1 || t === 'tier1') tierColor = 0xdc2626;
                        if (t === 2 || t === 'tier2') tierColor = 0x991b1b;
                        if (t === 3 || t === 'tier3') tierColor = 0x7f1d1d;
                        if (t === 4 || t === 'tier4') tierColor = 0x4a1515;   // Peripheral
                    }
                    const hex = '#' + tierColor.toString(16).padStart(6, '0');

                    // ═══ SHAPE: Circle for person, Rounded rect for others ═══
                    const darkerHex = '#' + Math.max(0, Math.floor((tierColor & 0xffffff) * 0.5)).toString(16).padStart(6, '0');

                    if (isNonPerson) {
                        // ═══ ROUNDED RECTANGLE for non-person nodes ═══
                        const rx = 8, ry = 8, x0 = 4, y0 = 4, w = 120, h = 120;
                        const roundRect = (r: number) => {
                            ctx.beginPath();
                            ctx.moveTo(x0 + r, y0);
                            ctx.lineTo(x0 + w - r, y0);
                            ctx.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
                            ctx.lineTo(x0 + w, y0 + h - r);
                            ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
                            ctx.lineTo(x0 + r, y0 + h);
                            ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
                            ctx.lineTo(x0, y0 + r);
                            ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
                            ctx.closePath();
                        };

                        // Background gradient
                        const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 70);
                        gradient.addColorStop(0, hex);
                        gradient.addColorStop(0.7, hex);
                        gradient.addColorStop(1, darkerHex);
                        roundRect(16);
                        ctx.fillStyle = gradient;
                        ctx.fill();

                        // Outer glow
                        roundRect(16);
                        ctx.strokeStyle = '#ffffff';
                        ctx.globalAlpha = 0.4;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.globalAlpha = 1;

                        // Main color border
                        roundRect(16);
                        ctx.strokeStyle = hex;
                        ctx.lineWidth = 3;
                        ctx.shadowColor = hex;
                        ctx.shadowBlur = 20;
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                        // Inner accent
                        const ix = 10, iy = 10, iw = 108, ih = 108;
                        ctx.beginPath();
                        ctx.moveTo(ix + 14, iy);
                        ctx.lineTo(ix + iw - 14, iy);
                        ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + 14);
                        ctx.lineTo(ix + iw, iy + ih - 14);
                        ctx.quadraticCurveTo(ix + iw, iy + ih, ix + iw - 14, iy + ih);
                        ctx.lineTo(ix + 14, iy + ih);
                        ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih - 14);
                        ctx.lineTo(ix, iy + 14);
                        ctx.quadraticCurveTo(ix, iy, ix + 14, iy);
                        ctx.closePath();
                        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    } else {
                        // ═══ CIRCLE for person nodes (original) ═══
                        const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
                        gradient.addColorStop(0, hex);
                        gradient.addColorStop(0.6, hex);
                        gradient.addColorStop(1, darkerHex);
                        ctx.beginPath();
                        ctx.arc(64, 64, 60, 0, Math.PI * 2);
                        ctx.fillStyle = gradient;
                        ctx.fill();

                        // Outer glow ring
                        ctx.beginPath();
                        ctx.arc(64, 64, 60, 0, Math.PI * 2);
                        ctx.strokeStyle = '#ffffff';
                        ctx.globalAlpha = 0.4;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.globalAlpha = 1;

                        // Main color ring
                        ctx.beginPath();
                        ctx.arc(64, 64, 60, 0, Math.PI * 2);
                        ctx.strokeStyle = hex;
                        ctx.lineWidth = 3;
                        ctx.shadowColor = hex;
                        ctx.shadowBlur = 20;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                        // Inner accent ring
                        ctx.beginPath();
                        ctx.arc(64, 64, 54, 0, Math.PI * 2);
                        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }

                    // ═══ CONTENT: Icon for non-person, Initials for person ═══
                    const typeIcon = getTypeIcon(nodeType);

                    if (isNonPerson && typeIcon) {
                        // Non-person: render type icon large + small initials below
                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                        ctx.shadowBlur = 6;
                        ctx.shadowOffsetY = 2;

                        ctx.font = '44px system-ui, -apple-system, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(typeIcon, 64, 55);

                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetY = 0;

                        // Small type label below icon
                        const typeLabels: Record<string, string> = {
                            organization: 'ORG', location: 'LOC', document: 'DOC', event: 'EVENT'
                        };
                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
                        ctx.letterSpacing = '0.15em';
                        ctx.fillText(typeLabels[nodeType] || '', 64, 88);
                    } else {
                        // Person: bold initials
                        const initials = (node.label || '??')
                            .split(' ')
                            .map(w => w[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();

                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                        ctx.shadowBlur = 6;
                        ctx.shadowOffsetY = 2;

                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(initials, 64, 61);

                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetY = 0;
                    }

                    // ═══ NAME LABEL - Smart sizing for long names ═══
                    let label = node.label || '';
                    // Remove parenthetical for very long names
                    if (label.length > 22 && label.includes('(')) {
                        label = label.split('(')[0].trim();
                    }
                    if (label.length > 24) label = label.substring(0, 22) + '…';

                    ctx.shadowColor = 'rgba(0,0,0,0.9)';
                    ctx.shadowBlur = 5;
                    ctx.shadowOffsetY = 1;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    // Dynamic font size based on label length
                    const fontSize = label.length > 18 ? 9 : label.length > 14 ? 10 : 11;
                    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
                    ctx.fillText(label, 64, 128);

                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetY = 0;

                    return canvas;
                };

                // ═══ LOAD PHOTO INTO SPRITE (with graceful fallback) ═══
                const loadPhotoIntoSprite = (sprite: THREE_TYPES.Sprite, imgUrl: string, node: TruthNode, color: number) => {
                    if (!imgUrl || imgUrl.trim() === '') {
                        // No URL provided - initials already rendered, nothing to do
                        return;
                    }

                    // Sprint 14B: Wikipedia URL'leri hotlink koruması yüzünden 404/429 döner — skip
                    if (imgUrl.includes('wikipedia') || imgUrl.includes('wikimedia')) {
                        return; // Initials fallback zaten aktif
                    }

                    const img = new Image();
                    img.crossOrigin = 'anonymous';

                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = 128;
                            canvas.height = 160;
                            const ctx = canvas.getContext('2d')!;

                            // Get tier color
                            let tierColor = color;
                            const t = node.tier;
                            if (t === 1 || t === 'tier1') tierColor = 0xdc2626;      // Red
                            if (t === 2 || t === 'tier2') tierColor = 0x991b1b;      // Dark Red
                            if (t === 3 || t === 'tier3') tierColor = 0x7f1d1d;      // Darker Red
                            const hex = '#' + tierColor.toString(16).padStart(6, '0');

                            // Circular photo with clipping
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(64, 64, 56, 0, Math.PI * 2);
                            ctx.clip();
                            // Center & scale image in circle
                            ctx.drawImage(img, 4, 4, 120, 120);
                            ctx.restore();

                            // Outer glow ring (same as initials for consistency)
                            ctx.beginPath();
                            ctx.arc(64, 64, 60, 0, Math.PI * 2);
                            ctx.strokeStyle = '#ffffff';
                            ctx.globalAlpha = 0.4;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            ctx.globalAlpha = 1;

                            // Main tier-colored ring
                            ctx.beginPath();
                            ctx.arc(64, 64, 60, 0, Math.PI * 2);
                            ctx.strokeStyle = hex;
                            ctx.lineWidth = 3;
                            ctx.shadowColor = hex;
                            ctx.shadowBlur = 20;
                            ctx.stroke();
                            ctx.shadowBlur = 0;

                            // Inner accent ring
                            ctx.beginPath();
                            ctx.arc(64, 64, 54, 0, Math.PI * 2);
                            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            // Name label with shadow
                            const label = (node.label || '').substring(0, 20);
                            ctx.shadowColor = 'rgba(0,0,0,0.9)';
                            ctx.shadowBlur = 5;
                            ctx.shadowOffsetY = 1;

                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'top';
                            ctx.fillText(label, 64, 128);

                            ctx.shadowBlur = 0;
                            ctx.shadowOffsetY = 0;

                            const newTexture = new THREE.CanvasTexture(canvas);
                            (sprite.material as THREE_TYPES.SpriteMaterial).map = newTexture;
                            (sprite.material as THREE_TYPES.SpriteMaterial).needsUpdate = true;
                        } catch (err) {
                            console.warn(`⚠️ Error rendering photo for ${node.label}:`, err);
                            // Silently fall back to initials
                        }
                    };

                    img.onerror = () => {
                        // Silently keep initials fallback - nothing to do
                    };

                    img.onabort = () => {
                        // Silently keep initials fallback
                    };

                    img.src = imgUrl;

                    // Timeout: if image takes >3 seconds, give up gracefully
                    setTimeout(() => {
                        if (!img.complete) {
                            img.src = ''; // Cancel pending request
                        }
                    }, 3000);
                };

                // ═══ PLACE NODES ═══
                Object.entries(tierGroups).forEach(([_tier, tierNodes]) => {
                    const R = getRadius(tierNodes[0]);
                    tierNodes.forEach((node, i) => {
                        const total = tierNodes.length;
                        const phi = total > 1 ? Math.acos(1 - 2 * (i + 0.5) / total) : Math.PI / 2;
                        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                        const pos = new THREE.Vector3(
                            R * Math.sin(phi) * Math.cos(theta),
                            R * Math.sin(phi) * Math.sin(theta),
                            R * Math.cos(phi)
                        );

                        const color = getColor(node);

                        // Sprite
                        const canvas = createNodeCanvas(node, color);
                        const texture = new THREE.CanvasTexture(canvas);
                        const spriteMat = new THREE.SpriteMaterial({
                            map: texture,
                            transparent: true,
                            depthWrite: false,
                        });
                        const sprite = new THREE.Sprite(spriteMat);
                        sprite.position.copy(pos);
                        sprite.scale.set(7, 8.75, 1);
                        sprite.userData = { ...node, isNode: true, x: pos.x, y: pos.y, z: pos.z };
                        scene.add(sprite);
                        nodeMeshes.push(sprite as any);
                        posMap.set(node.id, pos.clone());
                        nodeNameMap.set(node.id, node.label || node.id);

                        // Load photo async (will gracefully fall back to initials on 404/CORS/timeout)
                        if (node.image_url || node.img) {
                            loadPhotoIntoSprite(sprite, node.image_url || node.img, node, color);
                        }

                        // ═══ GLOW (additive blend halo) — ring for person, plane for non-person ═══
                        const nodeT = node.type || 'person';
                        const isNP = ['organization', 'location', 'document', 'event'].includes(nodeT);
                        const glowGeo = isNP
                            ? new THREE.PlaneGeometry(8, 8)
                            : new THREE.RingGeometry(3.2, 4.0, 32);
                        const glowMat = new THREE.MeshBasicMaterial({
                            color: color,
                            transparent: true,
                            opacity: isNP ? 0.08 : 0.15,
                            side: THREE.DoubleSide,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                        });
                        const glow = new THREE.Mesh(glowGeo, glowMat);
                        glow.position.copy(pos);
                        glow.userData.isGlow = true;
                        glow.userData.nodeId = node.id;
                        glow.userData.originalOpacity = isNP ? 0.08 : 0.15;
                        glow.lookAt(camera.position);
                        scene.add(glow);
                    });
                });

                // ═══ SPRINT 14B: UNIFIED LINK COLOR — imported from @/constants/colors ═══

                // ═══ DRAW ANIMATED LINKS ═══
                if (newLinks.length > 0) {
                    newLinks.forEach((link, i) => {
                        const sid = typeof link.source === 'object' ? link.source?.id : link.source;
                        const tid = typeof link.target === 'object' ? link.target?.id : link.target;
                        const sp = posMap.get(sid);
                        const tp = posMap.get(tid);
                        if (!sp || !tp) return;

                        // Sprint 14B: Unified color — her iki modda da evidence_type rengini kullan
                        const isEpMode = epistemologicalModeRef.current === true;
                        const linkColor = getEvidenceTypeColor(link.evidence_type);
                        // Normal modda sabit opacity + evidence boost, epistemo modda confidence bazlı
                        const baseOpacity = isEpMode
                            ? getConfidenceOpacity(link.confidence_level) + getEvidenceWidthOpacityBoost(link.evidence_count)
                            : 0.35 + getEvidenceWidthOpacityBoost(link.evidence_count);

                        // ═══ SHADER CABLE GLOW: İpin kendisi parlıyor ═══
                        // Sprint 6C: linkEvidenceMap varsa gerçek evidence verisi kullan
                        const linkKey = [sid, tid].sort().join('::');
                        const linkEvData = linkEvidenceMapRef.current?.get(linkKey);
                        const realEvidenceCount = linkEvData?.evidenceCount ?? link.evidence_count ?? 0;
                        const pulseSpeed = 0.3 + (realEvidenceCount * 0.12); // Hız: kanıt yoğunluğu
                        const pulseCount = realEvidenceCount >= 5 ? 3 : realEvidenceCount >= 2 ? 2 : 1;
                        const phaseOffset = i * 1.7 + Math.random() * 2.0; // Her ip farklı fazda

                        // Renk → vec3 for shader (using imported hexToRGB)
                        const { r, g, b } = hexToRGB(linkColor);

                        const cableShaderMat = new THREE.ShaderMaterial({
                            transparent: true,
                            blending: THREE.AdditiveBlending,
                            depthWrite: false,
                            uniforms: {
                                ...createCableGlowUniforms({
                                    color: { r, g, b },
                                    baseOpacity,
                                    pulseIntensity: getEvidencePulseIntensity(realEvidenceCount),
                                    pulseSpeed,
                                    pulseCount,
                                    phaseOffset,
                                }),
                            },
                            vertexShader: CABLE_VERTEX_SHADER,
                            fragmentShader: CABLE_FRAGMENT_SHADER,
                        });

                        // LineGeometry with linePosition attribute (0 at start, 1 at end)
                        const lineGeo = new THREE.BufferGeometry().setFromPoints([sp.clone(), tp.clone()]);
                        const linePositions = new Float32Array([0.0, 1.0]); // start=0, end=1
                        lineGeo.setAttribute('linePosition', new THREE.BufferAttribute(linePositions, 1));

                        const line = new THREE.Line(lineGeo, cableShaderMat);
                        line.userData = {
                            isLink: true,
                            sourceId: sid,
                            targetId: tid,
                            sourceLabel: nodeNameMap.get(sid) || sid,
                            targetLabel: nodeNameMap.get(tid) || tid,
                            label: link.label,
                            type: link.type,
                            evidence_type: link.evidence_type,
                            confidence_level: link.confidence_level,
                            source_hierarchy: link.source_hierarchy,
                            evidence_count: link.evidence_count,
                            baseOpacity,
                        };
                        scene.add(line);
                        linkLines.push(cableShaderMat);

                        // Cable glow tracking (animate loop'ta uniform güncellenir)
                        cableGlows.push({
                            material: cableShaderMat,
                            speed: pulseSpeed,
                            pulseCount,
                            direction: 1,
                            linkKey,
                            sourceId: sid,
                            targetId: tid,
                            originalColor: { x: r, y: g, z: b }, // Sprint 7: lens restore
                            linkMeta: {
                                type: link.type || link.label || '',
                                evidence_type: link.evidence_type || '',
                                evidence_count: link.evidence_count ?? 0,
                                confidence_level: link.confidence_level ?? 0,
                            },
                        });

                        // Invisible thick tube for raycasting (click/hover detection)
                        const dir = tp.clone().sub(sp);
                        const len = dir.length();
                        const mid = sp.clone().add(tp).multiplyScalar(0.5);
                        const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, len, 4);
                        const tubeMat = new THREE.MeshBasicMaterial({ visible: false });
                        const tube = new THREE.Mesh(tubeGeo, tubeMat);
                        tube.position.copy(mid);
                        tube.lookAt(tp);
                        tube.rotateX(Math.PI / 2);
                        tube.userData = {
                            isLink: true,
                            sourceId: sid,
                            targetId: tid,
                            source: nodeNameMap.get(sid) || sid,
                            target: nodeNameMap.get(tid) || tid,
                            sourceLabel: nodeNameMap.get(sid) || sid,
                            targetLabel: nodeNameMap.get(tid) || tid,
                            label: link.label,
                            type: link.type,
                            evidence_type: link.evidence_type,
                            confidence_level: link.confidence_level,
                            source_hierarchy: link.source_hierarchy,
                            evidence_count: link.evidence_count,
                        };

                        // Sprint 6B paralel çizgiler kaldırıldı — tek çizgi + kalınlık/parlaklık yeterli
                        // Gelecek: İP TÜNEL deneyimi (Sprint 14+) paralel çizgi yerine 3D koridor olacak
                        scene.add(tube);
                        linkMeshes.push(tube);
                    });
                }


                // ═══ SPRINT 10: GHOST LINKS (hayalet ipler) ═══
                const ghostLinkMeshes: THREE_TYPES.Object3D[] = [];
                if (ghostLinks && ghostLinks.length > 0 && posMap.size > 0) {
                    ghostLinks.forEach((gl: any) => {
                        const sp = posMap.get(gl.sourceId);
                        const tp = posMap.get(gl.targetId);
                        if (!sp || !tp) return;

                        const progress = Math.min(gl.evidenceCount / gl.evidenceThreshold, 1);
                        // Renk: gri → sarı eşiğe yaklaştıkça
                        const r = 0.61 + progress * 0.37;  // 0.61 → 0.98
                        const g = 0.64 + progress * 0.11;  // 0.64 → 0.75
                        const b = 0.69 - progress * 0.55;  // 0.69 → 0.14
                        const ghostColor = new THREE.Color(r, g, b);

                        const ghostGeo = new THREE.BufferGeometry().setFromPoints([sp.clone(), tp.clone()]);
                        const ghostMat = new THREE.LineDashedMaterial({
                            color: ghostColor,
                            dashSize: 2,
                            gapSize: 2,
                            opacity: 0.25 + progress * 0.15,
                            transparent: true,
                        });
                        const ghostLine = new THREE.Line(ghostGeo, ghostMat);
                        ghostLine.computeLineDistances();
                        ghostLine.userData = {
                            isGhostLink: true,
                            ghostLinkId: gl.id,
                            sourceId: gl.sourceId,
                            targetId: gl.targetId,
                        };
                        scene.add(ghostLine);
                        ghostLinkMeshes.push(ghostLine);

                        // Lock/unlock sprite at midpoint
                        const mid = sp.clone().add(tp.clone()).multiplyScalar(0.5);
                        mid.y += 2;

                        const lockCanvas = document.createElement('canvas');
                        lockCanvas.width = 48;
                        lockCanvas.height = 48;
                        const lctx = lockCanvas.getContext('2d')!;
                        lctx.font = '32px serif';
                        lctx.textAlign = 'center';
                        lctx.textBaseline = 'middle';
                        lctx.fillText(progress >= 1 ? '🔓' : '🔒', 24, 24);

                        const lockTexture = new THREE.CanvasTexture(lockCanvas);
                        const lockMat = new THREE.SpriteMaterial({
                            map: lockTexture,
                            transparent: true,
                            opacity: 0.6 + progress * 0.3,
                        });
                        const lockSprite = new THREE.Sprite(lockMat);
                        lockSprite.position.copy(mid);
                        lockSprite.scale.set(3, 3, 1);
                        lockSprite.userData = { isGhostLock: true, ghostLinkId: gl.id };
                        scene.add(lockSprite);
                        ghostLinkMeshes.push(lockSprite);
                    });
                }
            };

            // ═══ AI CHAT: EXTERNAL HIGHLIGHT CONTROL ═══
            const highlightNodesExternal = (nodeIds: string[], linkIds: string[]) => {
                const hasHighlights = nodeIds.length > 0;
                const hadPreviousHighlights = highlightAnimation && highlightAnimation.active;

                // ═══ SMOOTH CROSS-FADE: eski elementleri yumuşak söndür ═══
                // Eski glow ring'leri ve annotation sprite'ları anında silmek yerine fade-out
                const oldGlowRings = [...glowRings];
                const oldAnnotationSprites = [...annotationSprites];
                glowRings.length = 0;
                annotationSprites.length = 0;

                if (oldGlowRings.length > 0 || oldAnnotationSprites.length > 0) {
                    let fadeOutProgress = 0;
                    const fadeOutDuration = 25; // ~420ms — hızlı ama yumuşak
                    const fadeOutOld = () => {
                        fadeOutProgress++;
                        const t = easeInOutCubic(Math.min(fadeOutProgress / fadeOutDuration, 1));
                        // Glow ring'leri söndür
                        oldGlowRings.forEach(ring => {
                            if (ring.material) {
                                (ring.material as THREE_TYPES.MeshBasicMaterial).opacity = (1 - t) * 0.3;
                            }
                        });
                        // Annotation sprite'ları söndür
                        oldAnnotationSprites.forEach(s => {
                            (s.material as THREE_TYPES.SpriteMaterial).opacity = (1 - t) * 0.95;
                            // Hafif yukarı kayarak söner (cinematic exit)
                            s.position.y += 0.05;
                        });
                        if (fadeOutProgress >= fadeOutDuration) {
                            // Temizlik — fade bittikten sonra sil
                            oldGlowRings.forEach(ring => {
                                ring.geometry?.dispose();
                                if (Array.isArray(ring.material)) {
                                    ring.material.forEach(m => m.dispose());
                                } else {
                                    ring.material?.dispose();
                                }
                                scene.remove(ring);
                            });
                            oldAnnotationSprites.forEach(s => {
                                if ((s.material as THREE_TYPES.SpriteMaterial).map) {
                                    (s.material as THREE_TYPES.SpriteMaterial).map!.dispose();
                                }
                                s.material.dispose();
                                scene.remove(s);
                            });
                        } else {
                            requestAnimationFrame(fadeOutOld);
                        }
                    };
                    requestAnimationFrame(fadeOutOld);
                }

                // Cancel any running animation
                if (highlightAnimation) {
                    highlightAnimation.active = false;
                    highlightAnimation = null;
                }

                highlightActive = hasHighlights;

                if (!hasHighlights) return;

                // ═══ CROSS-FADE: Eğer önceki highlight varsa, restore fazını kısalt ═══
                // Önceki highlight'tan yenisine geçişte "tüm node'ları restore et → tekrar dim" yerine
                // doğrudan yeni hedeflere geçiş yap (daha smooth)
                const transitionDelay = hadPreviousHighlights ? 15 : 0; // ~250ms geçiş tamponu

                setTimeout(() => {
                    // Start cinematic fade animation
                    highlightAnimation = {
                        active: true,
                        progress: 0,
                        duration: hadPreviousHighlights ? 90 : 120, // Geçişte biraz daha hızlı
                        targetNodeIds: new Set(nodeIds),
                        targetLinkIds: new Set(linkIds),
                        phase: 'dimming',
                    };
                }, transitionDelay * (1000 / 60)); // frame → ms

                controls.autoRotate = false;
            };

            // Tüm highlighted node'ları çerçevele — bounding box kamera
            const focusOnNodesExternal = (nodeIds: string[]) => {
                if (nodeIds.length === 0) return;

                const positions: THREE_TYPES.Vector3[] = [];
                nodeMeshes.forEach(mesh => {
                    if (nodeIds.includes(mesh.userData.id)) {
                        positions.push(mesh.position.clone());
                    }
                });
                if (positions.length === 0) return;

                // Merkez noktası
                const center = new THREE.Vector3();
                positions.forEach(p => center.add(p));
                center.divideScalar(positions.length);

                // Bounding radius — en uzak node mesafesi
                let maxDist = 0;
                positions.forEach(p => {
                    const d = p.distanceTo(center);
                    if (d > maxDist) maxDist = d;
                });

                // Kamera mesafesi: tek node yakın, çok node uzak
                const cameraDistance = Math.max(25, maxDist * 2.5 + 20);

                // Kamera pozisyonu: merkeze göre yukarıdan ve yandan
                const dir = center.clone().normalize();
                if (dir.length() < 0.1) dir.set(1, 0.5, 1).normalize();

                const targetCamPos = new THREE.Vector3(
                    center.x + dir.x * cameraDistance * 0.7,
                    center.y + cameraDistance * 0.4,
                    center.z + dir.z * cameraDistance * 0.7
                );
                const targetLookAt = center.clone();

                const startCamPos = camera.position.clone();
                const startLookAt = controls.target.clone();

                let progress = 0;
                const duration = 120; // 2 saniye — sinematik
                const animateZoom = () => {
                    progress++;
                    const t = easeInOutCubic(Math.min(progress / duration, 1));
                    camera.position.lerpVectors(startCamPos, targetCamPos, t);
                    controls.target.lerpVectors(startLookAt, targetLookAt, t);
                    controls.update();
                    glowRings.forEach(ring => ring.lookAt(camera.position));
                    if (progress < duration) requestAnimationFrame(animateZoom);
                };
                animateZoom();
            };

            // Geriye uyumluluk — tek node için wrapper
            const focusOnNodeExternal = (nodeId: string) => {
                focusOnNodesExternal([nodeId]);
            };

            const restoreAllHighlightsExternal = () => {
                // Devam eden animasyonu durdur
                if (highlightAnimation) {
                    highlightAnimation.active = false;
                    highlightAnimation = null;
                }

                // Annotation sprite'ları temizle
                annotationSprites.forEach(s => scene.remove(s));
                annotationSprites.length = 0;

                // Animasyonlu geri dönüş
                let restoreProgress = 0;
                const restoreDuration = 90; // 1.5 saniye

                const animateRestore = () => {
                    restoreProgress++;
                    const t = easeInOutCubic(Math.min(restoreProgress / restoreDuration, 1));

                    // Node'ları yavaşça geri getir
                    nodeMeshes.forEach(mesh => {
                        mesh.visible = true;
                        const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                        mat.opacity = mat.opacity + (1 - mat.opacity) * t;
                        mesh.scale.set(
                            mesh.scale.x + (7 - mesh.scale.x) * t,
                            mesh.scale.y + (8.75 - mesh.scale.y) * t,
                            1
                        );
                        mat.needsUpdate = true;
                    });

                    // Glow ring'leri söndür
                    glowRings.forEach(ring => {
                        const mat = ring.material as THREE_TYPES.MeshBasicMaterial;
                        mat.opacity = mat.opacity * (1 - t);
                    });

                    // Link'leri ve halo'ları geri getir
                    scene.traverse((child: any) => {
                        if (child.userData.isLink && child.material) {
                            if (child.material.uniforms?.uHighlightDim) {
                                // ShaderMaterial: restore dim to 1.0
                                const current = child.material.uniforms.uHighlightDim.value;
                                child.material.uniforms.uHighlightDim.value += (1.0 - current) * t;
                            } else if (child.material.opacity !== undefined) {
                                child.material.opacity += (0.3 - child.material.opacity) * t;
                            }
                        }
                        if (child.userData.isGlow && child.material) {
                            child.visible = true;
                            const orig = child.userData.originalOpacity || 0.15;
                            child.material.opacity = child.material.opacity + (orig - child.material.opacity) * t;
                        }
                    });

                    if (restoreProgress < restoreDuration) {
                        requestAnimationFrame(animateRestore);
                    } else {
                        // Final temizlik — kesin değerleri set et
                        glowRings.forEach(ring => scene.remove(ring));
                        glowRings.length = 0;
                        highlightActive = false;
                        controls.autoRotate = true;

                        nodeMeshes.forEach(mesh => {
                            mesh.visible = true;
                            const mat = (mesh as any).material as THREE_TYPES.SpriteMaterial;
                            mat.opacity = 1;
                            mesh.scale.set(7, 8.75, 1);
                            mat.needsUpdate = true;
                        });
                        scene.traverse((child: any) => {
                            if (child.userData.isGlow) {
                                child.visible = true;
                                if (child.material) child.material.opacity = child.userData.originalOpacity || 0.15;
                            }
                        });
                    }
                };
                animateRestore();
            };

            // ═══ ANNOTATION LABELS — imported from @/constants/colors ═══
            // Sprint 14B+: AI-generated dynamic tags with smart color matching

            const setAnnotationsExternal = (newAnnotations: Record<string, string>) => {
                // ═══ SMOOTH CROSSFADE: eski sprite'lar sönerken yenileri gelir ═══
                // highlightNodesExternal zaten fade-out başlattıysa, burada sadece temizlik
                const existingSprites = [...annotationSprites];
                if (existingSprites.length > 0) {
                    // Eğer highlightNodes tarafından zaten fade-out başlatılmadıysa, burada yap
                    let alreadyFading = false;
                    existingSprites.forEach(s => {
                        const opacity = (s.material as THREE_TYPES.SpriteMaterial).opacity;
                        if (opacity < 0.9) alreadyFading = true;
                    });
                    if (!alreadyFading) {
                        // Kısa fade-out (highlight zaten temizledi muhtemelen, ama safety net)
                        let fp = 0;
                        const dur = 20;
                        const quickFade = () => {
                            fp++;
                            const t = Math.min(fp / dur, 1);
                            existingSprites.forEach(s => {
                                (s.material as THREE_TYPES.SpriteMaterial).opacity = (1 - t) * 0.95;
                            });
                            if (fp >= dur) {
                                existingSprites.forEach(s => {
                                    if ((s.material as THREE_TYPES.SpriteMaterial).map) {
                                        (s.material as THREE_TYPES.SpriteMaterial).map!.dispose();
                                    }
                                    s.material.dispose();
                                    scene.remove(s);
                                });
                            } else {
                                requestAnimationFrame(quickFade);
                            }
                        };
                        requestAnimationFrame(quickFade);
                    }
                }
                annotationSprites.length = 0;

                const entries = Object.entries(newAnnotations);
                if (entries.length === 0) return;

                // ── Measurement canvas — text ölç, sonra gerçek canvas boyutunu belirle ──
                const measureCanvas = document.createElement('canvas');
                const measureCtx = measureCanvas.getContext('2d')!;

                entries.forEach(([nodeId, rawLabel], index) => {
                    const mesh = nodeMeshes.find(m => m.userData.id === nodeId);
                    if (!mesh) return;

                    // Truncate label if > 28 chars (safety net — AI should respect 25 but just in case)
                    let label = rawLabel.trim();
                    if (label.length > 28) label = label.substring(0, 26) + '…';

                    const colors = getAnnotationColors(label);

                    // ── DYNAMIC CANVAS SIZING — metin genişliğine göre ──
                    const fontSize = 34;
                    const fontStack = `bold ${fontSize}px "SF Mono", "Cascadia Code", Consolas, monospace, "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", "Noto Sans Arabic", system-ui`;
                    const letterSpacing = 2.5;
                    const isCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0600-\u06ff]/.test(label);

                    // Measure text width
                    measureCtx.font = fontStack;
                    let textWidth: number;
                    if (isCJK) {
                        textWidth = measureCtx.measureText(label).width;
                    } else {
                        const chars = label.split('');
                        textWidth = chars.reduce((w, c) => w + measureCtx.measureText(c).width + letterSpacing, -letterSpacing);
                    }

                    // Canvas boyutu: metin + padding + glow margin
                    const hPadding = 32; // yatay padding (her taraf)
                    const glowMargin = 28; // glow için ekstra
                    const canvasWidth = Math.max(256, Math.ceil(textWidth + hPadding * 2 + glowMargin * 2));
                    const canvasHeight = 112; // dikey yeterli
                    const badgeHeight = 54;
                    const badgeWidth = textWidth + hPadding * 2;

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d')!;
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;

                    const x = (canvasWidth - badgeWidth) / 2;
                    const y = (canvasHeight - badgeHeight) / 2;
                    const radius = 10;

                    // ═══ OUTER GLOW — çift katman ═══
                    ctx.shadowColor = colors.glow;
                    ctx.shadowBlur = 24;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 2;

                    // ═══ BADGE SHAPE — rounded rectangle ═══
                    const drawRoundRect = (rx: number, ry: number, rw: number, rh: number, rr: number) => {
                        ctx.beginPath();
                        ctx.moveTo(rx + rr, ry);
                        ctx.lineTo(rx + rw - rr, ry);
                        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
                        ctx.lineTo(rx + rw, ry + rh - rr);
                        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
                        ctx.lineTo(rx + rr, ry + rh);
                        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
                        ctx.lineTo(rx, ry + rr);
                        ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
                        ctx.closePath();
                    };

                    // Background fill
                    drawRoundRect(x, y, badgeWidth, badgeHeight, radius);
                    ctx.fillStyle = colors.bg;
                    ctx.fill();

                    // Reset shadow
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetY = 0;

                    // ═══ BORDER — premium double-line ═══
                    ctx.strokeStyle = colors.border;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Inner border (subtle inset)
                    const inset = 3.5;
                    drawRoundRect(x + inset, y + inset, badgeWidth - inset * 2, badgeHeight - inset * 2, radius - 2);
                    ctx.strokeStyle = `${colors.border}40`; // 25% opacity
                    ctx.lineWidth = 0.8;
                    ctx.stroke();

                    // ═══ TEXT RENDERING — multilingual ═══
                    ctx.fillStyle = colors.text;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = fontStack;

                    // Subtle text shadow for depth
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetY = 1;

                    if (isCJK) {
                        ctx.fillText(label, canvasWidth / 2, canvasHeight / 2 + 1);
                    } else {
                        // Latin/Cyrillic: letter-spacing for premium feel
                        const chars = label.split('');
                        let cx = (canvasWidth - textWidth) / 2;
                        chars.forEach(c => {
                            const cw = measureCtx.measureText(c).width;
                            ctx.fillText(c, cx + cw / 2, canvasHeight / 2 + 1);
                            cx += cw + letterSpacing;
                        });
                    }

                    // ═══ SPRITE ═══
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;
                    const spriteMat = new THREE.SpriteMaterial({
                        map: texture,
                        transparent: true,
                        opacity: 0, // Fade-in başlangıcı
                        depthWrite: false,
                    });
                    const sprite = new THREE.Sprite(spriteMat);
                    sprite.position.copy(mesh.position);
                    sprite.position.y += 8;

                    // Sprite scale — canvas aspect ratio'ya orantılı
                    const aspectRatio = canvasWidth / canvasHeight;
                    const baseHeight = 3;
                    sprite.scale.set(baseHeight * aspectRatio, baseHeight, 1);

                    sprite.userData.isAnnotation = true;
                    sprite.userData.nodeId = nodeId;
                    sprite.userData.staggerIndex = index; // Kademeli animasyon için
                    scene.add(sprite);
                    annotationSprites.push(sprite);
                });

                // ═══ STAGGERED FADE-IN — her badge sırayla belirir (sinematik) ═══
                const totalSprites = annotationSprites.length;
                const staggerDelay = 180; // ms between each badge
                const fadeDuration = 40; // ~667ms per badge
                const initialDelay = 900; // highlight animasyonundan sonra

                annotationSprites.forEach((sprite, i) => {
                    let fadeProgress = 0;
                    const startTime = initialDelay + i * staggerDelay;

                    setTimeout(() => {
                        const fadeIn = () => {
                            fadeProgress++;
                            const t = easeInOutCubic(Math.min(fadeProgress / fadeDuration, 1));
                            (sprite.material as THREE_TYPES.SpriteMaterial).opacity = t * 0.95;

                            // Hafif yukarı kayma efekti (cinematic entrance)
                            const mesh = nodeMeshes.find(m => m.userData.id === sprite.userData.nodeId);
                            if (mesh) {
                                const targetY = mesh.position.y + 8;
                                const startY = targetY - 2; // 2 birim aşağıdan başla
                                sprite.position.y = startY + (targetY - startY) * easeInOutCubic(Math.min(fadeProgress / fadeDuration, 1));
                            }

                            // Hafif scale bounce (0.8 → 1.0 → 1.05 → 1.0)
                            const scaleT = Math.min(fadeProgress / fadeDuration, 1);
                            const bounce = scaleT < 0.7 ? scaleT / 0.7 : 1.0 + 0.06 * Math.sin((scaleT - 0.7) / 0.3 * Math.PI);
                            const mapImg = (sprite.material as THREE_TYPES.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
                            const canvasW = mapImg?.width || 512;
                            const canvasH = mapImg?.height || 112;
                            const aspect = canvasW / canvasH;
                            const bh = 3;
                            sprite.scale.set(bh * aspect * bounce, bh * bounce, 1);

                            if (fadeProgress < fadeDuration) requestAnimationFrame(fadeIn);
                        };
                        requestAnimationFrame(fadeIn);
                    }, startTime);
                });
            };

            engineRef.current = {
                updateData,
                startCinematic: startCinematicMode,
                endCinematic: endCinematicMode,
                startCorridorWalk,
                endCorridorWalk,
                getCorridorWalkState: () => corridorWalk,
                highlightNodes: highlightNodesExternal,
                focusOnNode: focusOnNodeExternal,
                focusOnNodes: focusOnNodesExternal,
                restoreAllHighlights: restoreAllHighlightsExternal,
                setAnnotations: setAnnotationsExternal,
                cleanup: () => {
                    container.removeEventListener('mousedown', onMouseDown);
                    container.removeEventListener('click', onClick);
                    container.removeEventListener('mousemove', onMove);
                    container.removeEventListener('mouseleave', onMouseLeave);
                    window.removeEventListener('resize', onResize);
                    window.removeEventListener('keydown', onKeyDown);
                    cancelAnimationFrame(frameId);
                    controls.dispose();
                    renderer.dispose();
                    if (container.contains(renderer.domElement)) {
                        container.removeChild(renderer.domElement);
                    }
                }
            };


            // Register endCinematic so parent can call it
            if (registerEndCinematic) {
                registerEndCinematic(endCinematicMode);
            }

            // ⚡ PENDING HIGHLIGHT: apply if highlight arrived before engine was ready
            if (pendingHighlightRef.current) {
                const { nodeIds, linkIds } = pendingHighlightRef.current;
                setTimeout(() => {
                    highlightNodesExternal(nodeIds, linkIds);
                    setTimeout(() => focusOnNodesExternal(nodeIds), 300);
                }, 200);
                pendingHighlightRef.current = null;
            }

            // ⚡ RACE CONDITION FIX
            if (latestNodesRef.current.length > 0) {
                updateData(latestNodesRef.current, latestLinksRef.current);
            }
        };

        init().catch(err => {
            console.error('💀 Three.js init failed:', err);
        });

        return () => {
            disposed = true;
            if (engineRef.current) {
                engineRef.current.cleanup();
                engineRef.current = null;
            }
            cancelAnimationFrame(frameId);
        };
    }, []); // ENGINE: run once

    // DATA EFFECT
    useEffect(() => {
        if (engineRef.current && nodes.length > 0) {
            engineRef.current.updateData(nodes, links);
        }
    }, [nodes, links, epistemologicalMode]);

    // ═══ AI CHAT: EXTERNAL HIGHLIGHT EFFECT ═══
    useEffect(() => {
        const nodeIds = highlightNodeIds ?? [];
        const linkIds = highlightLinkIds ?? [];

        if (nodeIds.length > 0) {
            if (!engineRef.current) {
                // Engine not ready yet — save for later
                pendingHighlightRef.current = { nodeIds, linkIds, focusId: focusNodeId ?? null };
                return;
            }
            engineRef.current.highlightNodes(nodeIds, linkIds);
            // Tüm highlighted node'ları çerçevele (tek node değil)
            setTimeout(() => {
                engineRef.current?.focusOnNodes(nodeIds);
            }, 300);
        } else {
            pendingHighlightRef.current = null;
            if (engineRef.current) {
                engineRef.current.restoreAllHighlights();
            }
        }
    }, [highlightNodeIds, highlightLinkIds, focusNodeId]);

    // ═══ ANNOTATIONS EFFECT ═══
    useEffect(() => {
        if (!engineRef.current || !annotations) return;
        const hasAnnotations = Object.keys(annotations).length > 0;
        if (hasAnnotations) {
            engineRef.current.setAnnotations(annotations);
        }
    }, [annotations]);

    // ═══ SPRINT 5: CONSENSUS ANNOTATIONS (kalıcı badge'ler) ═══
    useEffect(() => {
        if (!engineRef.current || !consensusAnnotations || consensusAnnotations.size === 0) return;
        // Map'i Record'a dönüştür (mevcut setAnnotations API'si Record bekliyor)
        const consensusRecord: Record<string, string> = {};
        consensusAnnotations.forEach((label, nodeId) => {
            consensusRecord[nodeId] = label;
        });
        engineRef.current.setAnnotations(consensusRecord);
    }, [consensusAnnotations]);

    return (
        <div style={{ width: '100%', height: '100%', background: '#030303', position: 'relative' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {/* Hover tooltips */}
            <HoverTooltip data={hoveredNode} x={mousePos.x} y={mousePos.y} />
            <LinkTooltip data={hoveredLink} x={mousePos.x} y={mousePos.y} />

            {/* Corner watermark */}
            <div style={{
                position: 'absolute',
                bottom: 12,
                right: 16,
                fontSize: '9px',
                color: '#dc262640',
                letterSpacing: '0.3em',
                fontFamily: 'monospace',
                pointerEvents: 'none',
            }}>
                PROJECT TRUTH // SOVEREIGN ENGINE
            </div>
        </div>
    );
}
