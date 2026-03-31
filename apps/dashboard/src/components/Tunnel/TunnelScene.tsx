'use client';

import React, { useRef, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useTunnelStore } from '@/store/tunnelStore';
import {
  tunnelVertexShader,
  tunnelFragmentShader,
  tunnelFloorVertexShader,
  tunnelFloorFragmentShader,
  CORRIDOR_THEMES,
  isEvidenceVisibleInTheme,
} from '@/shaders/tunnelShaders';

// ═══════════════════════════════════════════════════════════════
// SPRINT 14A v6 — PREMIUM FIBER OPTIC EXHIBITION TUNNEL
// Dual-layer pulse • Panel clicking • AR detail overlay
// Premium bloom • Glass morphism panels
// ═══════════════════════════════════════════════════════════════

const TUNNEL_LENGTH = 200;
const TUNNEL_RADIUS = 5.0;
const TUNNEL_SEGMENTS = 48;
const CAMERA_Y = -0.5;
const WALK_SPEED_BASE = 4.0;
const BOOT_DURATION = 3.0;

// Cinematic camera look — wide angle
const MOUSE_LOOK_RANGE_X = 1.3;
const MOUSE_LOOK_RANGE_Y = 0.6;
const MOUSE_SMOOTH = 0.04;

// ═══════════════════════════════════════════════════════════════
// FIBER TUNNEL — Full cylinder, dual-layer pulse
// ═══════════════════════════════════════════════════════════════
function FiberTunnel() {
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      TUNNEL_RADIUS, TUNNEL_RADIUS,
      TUNNEL_LENGTH,
      TUNNEL_SEGMENTS,
      Math.floor(TUNNEL_LENGTH / 2),
      true
    );
    geo.rotateX(Math.PI / 2);
    const normals = geo.attributes.normal;
    for (let i = 0; i < normals.count; i++) {
      normals.setXYZ(i, -normals.getX(i), -normals.getY(i), -normals.getZ(i));
    }
    normals.needsUpdate = true;
    return geo;
  }, []);

  const uniforms = useRef({
    uTime: { value: 0 },
    uBootProgress: { value: 0 },
    uCorridorColor: { value: new THREE.Vector3(0.55, 0.08, 0.12) },
    uAccentColor: { value: new THREE.Vector3(1.0, 0.35, 0.30) },
    uCameraZ: { value: 0 },
    uTunnelLength: { value: TUNNEL_LENGTH },
    uGridDensity: { value: 8.0 },
    uPulseSpeed: { value: 0.3 },
  }).current;

  useFrame((state) => {
    const store = useTunnelStore.getState();
    const cfg = CORRIDOR_THEMES[store.theme];
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uBootProgress.value = store.bootProgress;
    uniforms.uCameraZ.value = store.cameraZ;
    uniforms.uCorridorColor.value.set(cfg.corridorColor[0], cfg.corridorColor[1], cfg.corridorColor[2]);
    uniforms.uAccentColor.value.set(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]);
    uniforms.uGridDensity.value = cfg.gridDensity;
    uniforms.uPulseSpeed.value = cfg.pulseSpeed;
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        vertexShader={tunnelVertexShader}
        fragmentShader={tunnelFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLOOR
// ═══════════════════════════════════════════════════════════════
function TunnelFloor() {
  const floorY = -TUNNEL_RADIUS + 0.3;
  const uniforms = useRef({
    uTime: { value: 0 },
    uBootProgress: { value: 0 },
    uCorridorColor: { value: new THREE.Vector3(0.55, 0.08, 0.12) },
    uAccentColor: { value: new THREE.Vector3(1.0, 0.35, 0.30) },
    uCameraZ: { value: 0 },
    uTunnelLength: { value: TUNNEL_LENGTH },
    uPulseSpeed: { value: 0.3 },
  }).current;

  useFrame((state) => {
    const store = useTunnelStore.getState();
    const cfg = CORRIDOR_THEMES[store.theme];
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uBootProgress.value = store.bootProgress;
    uniforms.uCameraZ.value = store.cameraZ;
    uniforms.uCorridorColor.value.set(cfg.corridorColor[0], cfg.corridorColor[1], cfg.corridorColor[2]);
    uniforms.uAccentColor.value.set(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]);
    uniforms.uPulseSpeed.value = cfg.pulseSpeed;
  });

  return (
    <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[TUNNEL_RADIUS * 1.6, TUNNEL_LENGTH, 8, Math.floor(TUNNEL_LENGTH / 2)]} />
      <shaderMaterial
        vertexShader={tunnelFloorVertexShader}
        fragmentShader={tunnelFloorFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════
// AR HOLOGRAFİK SERGİ PANELLERİ — Glass Morphism + Tıklanabilir
// ═══════════════════════════════════════════════════════════════
const EVIDENCE_COLORS: Record<string, string> = {
  court_record: '#ef4444', financial_record: '#22c55e',
  witness_testimony: '#ec4899', news_major: '#3b82f6',
  official_document: '#f59e0b', leaked_document: '#a855f7',
  photograph: '#14b8a6', social_media: '#06b6d4',
  flight_record: '#f97316', inference: '#8b5cf6',
  rumor: '#6b7280', testimony: '#ec4899',
};

// Köşe markerları
function CornerMarkers({ w, h, color, opacity }: { w: number; h: number; color: string; opacity: number }) {
  const len = 0.3;
  const thick = 0.025;
  const hw = w / 2;
  const hh = h / 2;
  const z = 0.003;
  const corners = [
    { pos: [-hw, hh, z] as const, sx: len, sy: thick },
    { pos: [-hw, hh, z] as const, sx: thick, sy: len },
    { pos: [hw, hh, z] as const, sx: len, sy: thick },
    { pos: [hw, hh, z] as const, sx: thick, sy: len },
    { pos: [-hw, -hh, z] as const, sx: len, sy: thick },
    { pos: [-hw, -hh, z] as const, sx: thick, sy: len },
    { pos: [hw, -hh, z] as const, sx: len, sy: thick },
    { pos: [hw, -hh, z] as const, sx: thick, sy: len },
  ];
  return (
    <group>
      {corners.map((c, i) => (
        <mesh key={i} position={[c.pos[0], c.pos[1], c.pos[2]]}>
          <planeGeometry args={[c.sx, c.sy]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

// Scan line efekti
function ScanLine({ w, h, color, speed }: { w: number; h: number; color: string; speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = (Math.sin(state.clock.elapsedTime * speed) * 0.5 + 0.5);
    meshRef.current.position.y = -h / 2 + t * h;
  });
  return (
    <mesh ref={meshRef} position={[0, 0, 0.004]}>
      <planeGeometry args={[w * 0.9, 0.008]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}

// Tek AR Panel — Glass Morphism
function ARPanel({
  evidence,
  isActive,
  typeColor,
  accentHex,
  onPanelClick,
}: {
  evidence: { title?: string | null; eventDate?: string | null; summary?: string | null; evidenceType: string; timelineId: string };
  isActive: boolean;
  typeColor: string;
  accentHex: string;
  onPanelClick: () => void;
}) {
  const PW = 3.6;
  const PH = 2.4;
  const activeOpacity = isActive ? 1.0 : 0.55;
  const glowColor = isActive ? accentHex : typeColor;

  const dateStr = evidence.eventDate
    ? new Date(evidence.eventDate).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    : '';
  const typeLabel = evidence.evidenceType.replace(/_/g, ' ').toUpperCase();

  return (
    <group>
      {/* Tıklama alanı (görünmez ama raycaster yakalar) */}
      <mesh onClick={(e) => { e.stopPropagation(); onPanelClick(); }}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Dış glow katmanı */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[PW + 0.8, PH + 0.8]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isActive ? 0.1 : 0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ana cam panel — GLASS MORPHISM (%18 opacity = şeffaf AR hissi) */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial
          color="#080812"
          transparent
          opacity={isActive ? 0.35 : 0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Kenar glow çizgileri */}
      <mesh position={[0, PH / 2, 0.002]}>
        <planeGeometry args={[PW, 0.015]} />
        <meshBasicMaterial color={glowColor} transparent opacity={activeOpacity * 0.9} />
      </mesh>
      <mesh position={[0, -PH / 2, 0.002]}>
        <planeGeometry args={[PW, 0.01]} />
        <meshBasicMaterial color={glowColor} transparent opacity={activeOpacity * 0.4} />
      </mesh>
      <mesh position={[-PW / 2, 0, 0.002]}>
        <planeGeometry args={[0.015, PH]} />
        <meshBasicMaterial color={glowColor} transparent opacity={activeOpacity * 0.7} />
      </mesh>
      <mesh position={[PW / 2, 0, 0.002]}>
        <planeGeometry args={[0.008, PH]} />
        <meshBasicMaterial color={glowColor} transparent opacity={activeOpacity * 0.25} />
      </mesh>

      {/* Köşe markerları */}
      <CornerMarkers w={PW} h={PH} color={glowColor} opacity={activeOpacity * 0.9} />

      {/* İç çerçeve */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[PW - 0.2, PH - 0.2]} />
        <meshBasicMaterial color={glowColor} transparent opacity={isActive ? 0.08 : 0.025} wireframe />
      </mesh>

      {/* Scan line */}
      {isActive && <ScanLine w={PW} h={PH} color={glowColor} speed={0.8} />}

      {/* Üst bar */}
      <mesh position={[0, PH / 2 - 0.18, 0.003]}>
        <planeGeometry args={[PW - 0.1, 0.28]} />
        <meshBasicMaterial color={typeColor} transparent opacity={0.12} />
      </mesh>
      <Text position={[-PW / 2 + 0.2, PH / 2 - 0.18, 0.005]} fontSize={0.09} color={typeColor} anchorX="left" anchorY="middle" letterSpacing={0.12}>
        {typeLabel}
      </Text>
      {dateStr && (
        <Text position={[PW / 2 - 0.2, PH / 2 - 0.18, 0.005]} fontSize={0.09} color="#888888" anchorX="right" anchorY="middle" letterSpacing={0.05}>
          {dateStr}
        </Text>
      )}

      {/* Sol accent bar + glow */}
      <mesh position={[-PW / 2 + 0.06, 0, 0.003]}>
        <planeGeometry args={[0.06, PH * 0.7]} />
        <meshBasicMaterial color={typeColor} transparent opacity={activeOpacity * 0.8} />
      </mesh>
      <mesh position={[-PW / 2 + 0.06, 0, 0.001]}>
        <planeGeometry args={[0.3, PH * 0.7]} />
        <meshBasicMaterial color={typeColor} transparent opacity={activeOpacity * 0.04} />
      </mesh>

      {/* Başlık */}
      <Text position={[0.05, 0.35, 0.005]} fontSize={0.16} color={isActive ? '#ffffff' : '#cccccc'} anchorX="center" anchorY="middle" maxWidth={PW - 0.6} letterSpacing={0.02}>
        {evidence.title || 'Evidence'}
      </Text>

      {/* Ayırıcı */}
      <mesh position={[0, 0.12, 0.004]}>
        <planeGeometry args={[PW * 0.6, 0.003]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.25} />
      </mesh>

      {/* Özet */}
      {evidence.summary && (
        <Text position={[0.05, -0.2, 0.005]} fontSize={0.09} color={isActive ? '#aaaaaa' : '#666666'} anchorX="center" anchorY="middle" maxWidth={PW - 0.6} lineHeight={1.5}>
          {evidence.summary.slice(0, 120)}{evidence.summary.length > 120 ? '...' : ''}
        </Text>
      )}

      {/* Alt data bar + noktalar */}
      <mesh position={[0, -PH / 2 + 0.12, 0.003]}>
        <planeGeometry args={[PW * 0.4, 0.04]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.12} />
      </mesh>
      {[0, 1, 2].map(j => (
        <mesh key={j} position={[PW / 2 - 0.3 - j * 0.15, -PH / 2 + 0.12, 0.004]}>
          <circleGeometry args={[0.025, 8]} />
          <meshBasicMaterial color={j === 0 ? glowColor : '#333333'} transparent opacity={j === 0 ? 0.6 : 0.25} />
        </mesh>
      ))}

      {/* Panel glow ışığı */}
      {isActive && (
        <pointLight position={[0, 0, 2.5]} color={accentHex} intensity={4} distance={7} decay={2} />
      )}
    </group>
  );
}

// Panel listesi — tıklama olaylarıyla
function ExhibitionPanels() {
  const linkData = useTunnelStore(s => s.linkData);
  const activeEvidenceIndex = useTunnelStore(s => s.activeEvidenceIndex);
  const theme = useTunnelStore(s => s.theme);
  const bootProgress = useTunnelStore(s => s.bootProgress);
  const focusEvidence = useTunnelStore(s => s.focusEvidence);
  const themeConfig = CORRIDOR_THEMES[theme];

  if (!linkData || bootProgress < 0.8) return null;

  const minZ = -TUNNEL_LENGTH * 0.46;
  const maxZ = TUNNEL_LENGTH * 0.46;
  const range = maxZ - minZ;
  const wallX = TUNNEL_RADIUS - 0.5;

  const accentHex = '#' + new THREE.Color(
    themeConfig.accentColor[0], themeConfig.accentColor[1], themeConfig.accentColor[2]
  ).getHexString();

  const filteredEvidences = linkData.evidences.filter(ev =>
    isEvidenceVisibleInTheme(ev.evidenceType, theme)
  );

  return (
    <group>
      {filteredEvidences.map((ev, i) => {
        const z = minZ + ev.pulsePosition * range;
        const isLeft = i % 2 === 0;
        const x = isLeft ? -wallX : wallX;
        const y = CAMERA_Y + 0.3;
        const rotY = isLeft ? Math.PI / 2 : -Math.PI / 2;
        const originalIndex = linkData.evidences.indexOf(ev);
        const isActive = originalIndex === activeEvidenceIndex;
        const typeColor = EVIDENCE_COLORS[ev.evidenceType] || '#525252';

        return (
          <group key={ev.timelineId} position={[x, y, z]} rotation={[0, rotY, 0]}>
            <ARPanel
              evidence={ev}
              isActive={isActive}
              typeColor={typeColor}
              accentHex={accentHex}
              onPanelClick={() => {
                // Panel tıklandı → kamera dur, detay aç
                focusEvidence(ev.timelineId);
              }}
            />
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// AR DETAY OVERLAY — Tıklanan panelin detayı (ekranın ortasında)
// HTML overlay, 3D sahnenin üstünde
// ═══════════════════════════════════════════════════════════════
function DetailOverlay() {
  const focusedId = useTunnelStore(s => s.focusedEvidenceId);
  const linkData = useTunnelStore(s => s.linkData);
  const theme = useTunnelStore(s => s.theme);
  const focusEvidence = useTunnelStore(s => s.focusEvidence);
  const themeConfig = CORRIDOR_THEMES[theme];

  if (!focusedId || !linkData) return null;

  const evidence = linkData.evidences.find(e => e.timelineId === focusedId);
  if (!evidence) return null;

  const typeColor = EVIDENCE_COLORS[evidence.evidenceType] || '#525252';
  const accentHex = '#' + new THREE.Color(
    themeConfig.accentColor[0], themeConfig.accentColor[1], themeConfig.accentColor[2]
  ).getHexString();
  const typeLabel = evidence.evidenceType.replace(/_/g, ' ').toUpperCase();
  const dateStr = evidence.eventDate
    ? new Date(evidence.eventDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // Confidence bar rengi
  const conf = evidence.confidence ?? 0.5;
  const confColor = conf > 0.7 ? '#22c55e' : conf > 0.4 ? '#f59e0b' : '#ef4444';
  const confLabel = conf > 0.7 ? 'HIGH' : conf > 0.4 ? 'MEDIUM' : 'LOW';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) focusEvidence(null); }}
    >
      {/* Scrim */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)',
      }} />

      {/* AR Detail Card */}
      <div style={{
        position: 'relative', width: '60%', maxWidth: 720, maxHeight: '80vh',
        background: 'rgba(8,8,18,0.75)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${accentHex}33`,
        borderLeft: `3px solid ${typeColor}`,
        borderRadius: 4,
        padding: '32px 36px',
        overflow: 'auto',
        boxShadow: `0 0 60px ${accentHex}15, 0 0 120px ${accentHex}08, inset 0 0 30px rgba(0,0,0,0.3)`,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Köşe markerları (CSS) */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: `2px solid ${accentHex}`, borderLeft: `2px solid ${accentHex}` }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${accentHex}`, borderRight: `2px solid ${accentHex}` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: `2px solid ${accentHex}`, borderLeft: `2px solid ${accentHex}` }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: `2px solid ${accentHex}`, borderRight: `2px solid ${accentHex}` }} />

        {/* Üst bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: typeColor, fontSize: 11, letterSpacing: '0.15em', fontWeight: 600 }}>
            {typeLabel}
          </span>
          <span style={{ color: '#666', fontSize: 12, letterSpacing: '0.05em' }}>
            {dateStr}
          </span>
        </div>

        {/* Başlık */}
        <h2 style={{
          color: '#e5e5e5', fontSize: 22, fontWeight: 600,
          marginBottom: 16, lineHeight: 1.3, letterSpacing: '0.01em',
        }}>
          {evidence.title || 'Evidence'}
        </h2>

        {/* Ayırıcı */}
        <div style={{ height: 1, background: `linear-gradient(90deg, ${accentHex}44, transparent)`, marginBottom: 20 }} />

        {/* Özet */}
        {evidence.summary && (
          <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            {evidence.summary}
          </p>
        )}

        {/* Güven Barı */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#666', fontSize: 10, letterSpacing: '0.12em' }}>CONFIDENCE</span>
            <span style={{ color: confColor, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
              {confLabel} — {Math.round(conf * 100)}%
            </span>
          </div>
          <div style={{ height: 3, background: '#1a1a2e', borderRadius: 2 }}>
            <div style={{
              width: `${conf * 100}%`, height: '100%',
              background: `linear-gradient(90deg, ${confColor}88, ${confColor})`,
              borderRadius: 2, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Kaynak bilgisi */}
        {evidence.sourceName && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ color: '#555', fontSize: 10, letterSpacing: '0.1em' }}>SOURCE</div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {evidence.sourceName}
            </div>
          </div>
        )}

        {/* Kapat butonu */}
        <div style={{
          position: 'absolute', top: 12, right: 16,
          color: '#555', fontSize: 18, cursor: 'pointer',
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', border: '1px solid #333',
          transition: 'all 0.2s',
        }}
          onClick={() => focusEvidence(null)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentHex; e.currentTarget.style.color = '#aaa'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#555'; }}
        >
          x
        </div>

        {/* Alt dekoratif çizgi */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: typeColor, opacity: 0.6 }} />
          <div style={{ flex: 1, height: 1, background: '#1a1a2e' }} />
          <span style={{ color: '#444', fontSize: 9, letterSpacing: '0.15em' }}>
            ESC TO CLOSE
          </span>
          <div style={{ flex: 1, height: 1, background: '#1a1a2e' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentHex, opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SİNEMATİK KAMERA
// ═══════════════════════════════════════════════════════════════
function CinematicCamera() {
  const { camera, gl } = useThree();
  const setWalkProgress = useTunnelStore(s => s.setWalkProgress);
  const setBootProgress = useTunnelStore(s => s.setBootProgress);
  const setPhase = useTunnelStore(s => s.setPhase);
  const setCameraZ = useTunnelStore(s => s.setCameraZ);

  const bootStartRef = useRef(0);
  const zoomStartRef = useRef(0);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ZOOM_DURATION = 1.2;

  const mouseNormRef = useRef({ x: 0, y: 0 });
  const currentLookRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const store = useTunnelStore.getState();
        if (store.focusedEvidenceId) {
          store.focusEvidence(null); // Detay overlay'ı kapat
        } else {
          store.exitTunnel();
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        useTunnelStore.getState().togglePause();
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      mouseNormRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNormRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouseMove);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const store = useTunnelStore.getState();
    const currentPhase = store.phase;

    if (currentPhase === 'zooming') {
      if (zoomStartRef.current === 0) zoomStartRef.current = state.clock.elapsedTime;
      const t = Math.min((state.clock.elapsedTime - zoomStartRef.current) / ZOOM_DURATION, 1.0);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.set(0, CAMERA_Y, THREE.MathUtils.lerp(-TUNNEL_LENGTH * 0.55, -TUNNEL_LENGTH * 0.48, ease));
      camera.lookAt(0, CAMERA_Y, 0);
      if (t >= 1.0) { setPhase('booting'); zoomStartRef.current = 0; }
      setCameraZ(camera.position.z);
      return;
    }

    if (currentPhase === 'booting') {
      if (bootStartRef.current === 0) bootStartRef.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - bootStartRef.current;
      const progress = Math.min(elapsed / BOOT_DURATION, 1.0);
      setBootProgress(progress);
      camera.position.x = Math.sin(elapsed * 15) * 0.015 * (1 - progress);
      camera.position.y = CAMERA_Y + Math.cos(elapsed * 12) * 0.01 * (1 - progress);
      camera.position.z = -TUNNEL_LENGTH * 0.48;
      camera.lookAt(0, CAMERA_Y, 0);
      if (progress >= 1.0) { setPhase('entering'); bootStartRef.current = 0; }
      setCameraZ(camera.position.z);
      return;
    }

    if (currentPhase === 'entering') {
      const targetZ = -TUNNEL_LENGTH * 0.42;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.035);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.1);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, CAMERA_Y, 0.1);
      applyMouseLook(camera);
      if (Math.abs(camera.position.z - targetZ) < 0.3) {
        setPhase('walking');
        useTunnelStore.getState().setWalkDirection('forward');
      }
      setCameraZ(camera.position.z);
      return;
    }

    // Walking + Focused — focused'ta kamera durur ama mouse bakış çalışır
    if (currentPhase === 'walking' || currentPhase === 'focused') {
      if (!store.paused && currentPhase === 'walking') {
        const speed = WALK_SPEED_BASE * store.walkSpeed * delta;
        const minZ = -TUNNEL_LENGTH * 0.48;
        const maxZ = TUNNEL_LENGTH * 0.48;
        camera.position.z = THREE.MathUtils.clamp(camera.position.z + speed, minZ, maxZ);

        const bobFreq = state.clock.elapsedTime * 2.5;
        camera.position.y = CAMERA_Y + Math.sin(bobFreq) * 0.008;
        camera.position.x = Math.sin(bobFreq * 0.7) * 0.003;

        const progress = (camera.position.z - minZ) / (maxZ - minZ);
        setWalkProgress(progress);

        // Coming Soon: kısa yürüyüşten sonra durdur
        if (store.comingSoon && !store.comingSoonTriggered && progress > 0.08) {
          useTunnelStore.getState().triggerComingSoon();
        }
      }
      applyMouseLook(camera);
      setCameraZ(camera.position.z);
      return;
    }

    if (currentPhase === 'exiting') {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, -TUNNEL_LENGTH * 0.55, 0.04);
      currentLookRef.current.x *= 0.92;
      currentLookRef.current.y *= 0.92;
      camera.lookAt(0, CAMERA_Y, camera.position.z + 15);
      if (camera.position.z < -TUNNEL_LENGTH * 0.52) setPhase('returning');
      setCameraZ(camera.position.z);
      return;
    }

    if (currentPhase === 'returning') {
      if (!returnTimerRef.current) {
        returnTimerRef.current = setTimeout(() => {
          setPhase('idle');
          returnTimerRef.current = null;
        }, 100);
      }
      return;
    }
  });

  function applyMouseLook(cam: THREE.Camera) {
    currentLookRef.current.x += (mouseNormRef.current.x - currentLookRef.current.x) * MOUSE_SMOOTH;
    currentLookRef.current.y += (mouseNormRef.current.y - currentLookRef.current.y) * MOUSE_SMOOTH;
    const yaw = -currentLookRef.current.x * MOUSE_LOOK_RANGE_X;
    const pitch = -currentLookRef.current.y * MOUSE_LOOK_RANGE_Y;
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    const dir = new THREE.Vector3(0, 0, 1).applyEuler(euler);
    cam.lookAt(cam.position.x + dir.x * 30, cam.position.y + dir.y * 30, cam.position.z + dir.z * 30);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// POST-PROCESSING — Premium Bloom
// ═══════════════════════════════════════════════════════════════
function PostEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0004, 0.0002)}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANA SAHNE
// ═══════════════════════════════════════════════════════════════
function TunnelContent() {
  return (
    <>
      <ambientLight intensity={0.005} />
      <FiberTunnel />
      <TunnelFloor />
      <Suspense fallback={null}>
        <ExhibitionPanels />
      </Suspense>
      <CinematicCamera />
      <PostEffects />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORT — Canvas + HTML Detail Overlay
// ═══════════════════════════════════════════════════════════════
export default function TunnelScene() {
  const active = useTunnelStore(s => s.active);
  const phase = useTunnelStore(s => s.phase);

  if (!active || phase === 'idle') return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: '#000' }}>
      <Canvas
        camera={{
          fov: 72, near: 0.1, far: 350,
          position: [0, CAMERA_Y, -TUNNEL_LENGTH * 0.5],
        }}
        gl={{
          antialias: true, alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#010101']} />
        <fog attach="fog" args={['#010101', 20, TUNNEL_LENGTH * 0.4]} />
        <TunnelContent />
      </Canvas>
      {/* HTML Detail Overlay (3D Canvas'ın üstünde) */}
      <DetailOverlay />
    </div>
  );
}
