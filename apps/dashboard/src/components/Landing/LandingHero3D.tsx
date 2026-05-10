'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ── 20-node Epstein network — real names, real shock value ──
const NODES = [
  // Tier 1 — Mastermind
  { id: 0,  pos: [0, 0, 0],           tier: 1, size: 0.22, name: 'Jeffrey Epstein' },
  // Tier 2 — Key Players
  { id: 1,  pos: [2.2, 0.8, 0.4],     tier: 2, size: 0.16, name: 'Ghislaine Maxwell' },
  { id: 2,  pos: [-2.0, 1.0, -0.5],   tier: 2, size: 0.15, name: 'Jean-Luc Brunel' },
  { id: 3,  pos: [1.0, -1.8, 0.6],    tier: 2, size: 0.15, name: 'Les Wexner' },
  { id: 4,  pos: [-1.2, -1.2, 0.8],   tier: 2, size: 0.14, name: 'Sarah Kellen' },
  // Tier 3 — Connected
  { id: 5,  pos: [2.8, -0.6, -0.4],   tier: 3, size: 0.11, name: 'Nadia Marcinkova' },
  { id: 6,  pos: [-2.6, -0.3, 0.3],   tier: 3, size: 0.11, name: 'Adriana Ross' },
  { id: 7,  pos: [0.4, 2.4, -0.6],    tier: 3, size: 0.12, name: 'Prince Andrew' },
  { id: 8,  pos: [-0.6, -2.4, -0.4],  tier: 3, size: 0.11, name: 'Alan Dershowitz' },
  { id: 9,  pos: [1.6, 1.6, 0.8],     tier: 3, size: 0.10, name: 'Peter Nygård' },
  { id: 10, pos: [-1.8, 1.8, 0.5],    tier: 3, size: 0.10, name: 'Bill Richardson' },
  { id: 11, pos: [3.0, 1.2, -0.2],    tier: 3, size: 0.10, name: 'Lex Wexner Foundation' },
  { id: 12, pos: [-0.3, 2.8, 0.3],    tier: 3, size: 0.10, name: 'Harvard University' },
  { id: 13, pos: [2.0, -2.0, -0.3],   tier: 3, size: 0.10, name: 'Bear Stearns' },
  { id: 14, pos: [-2.5, -1.5, -0.5],  tier: 3, size: 0.10, name: 'Victoria Secret' },
  { id: 15, pos: [0.8, -2.8, 0.2],    tier: 3, size: 0.09, name: 'Palm Beach PD' },
  { id: 16, pos: [-3.0, 0.5, -0.3],   tier: 3, size: 0.09, name: 'MC2 Modeling' },
  { id: 17, pos: [1.4, 2.6, -0.4],    tier: 3, size: 0.09, name: 'Virgin Islands' },
  { id: 18, pos: [-1.5, -2.6, 0.4],   tier: 3, size: 0.09, name: 'JP Morgan Chase' },
  { id: 19, pos: [3.2, -1.4, 0.5],    tier: 3, size: 0.09, name: 'Alexander Acosta' },
] as const;

const LINKS = [
  // Epstein core connections
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 7], [0, 8],
  // Maxwell network
  [1, 5], [1, 9], [1, 2], [1, 4], [1, 16], [1, 7],
  // Financial
  [0, 13], [3, 11], [3, 14], [0, 18], [13, 18],
  // Institutional
  [0, 12], [0, 17], [7, 17],
  // Legal/enforcement
  [8, 15], [0, 15], [0, 19], [15, 19],
  // Recruitment
  [2, 16], [4, 6], [5, 6],
  // Cross-connections
  [10, 0], [3, 0], [9, 2],
] as const;

const TIER_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#991b1b',
  3: '#7f1d1d',
};

// ── Node component with hover ──
function NetworkNode({ position, color, size, index, name, onHover }: {
  position: [number, number, number];
  color: string;
  size: number;
  index: number;
  name: string;
  onHover: (name: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverProgress = useRef(0);
  const baseY = position[1];

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(name);
    document.body.style.cursor = 'pointer';
  }, [onHover, name]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover]);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    const hoverTarget = hovered ? 1 : 0;
    hoverProgress.current += (hoverTarget - hoverProgress.current) * Math.min(dt * 8, 1);
    const hp = hoverProgress.current;

    // Organic floating
    const phaseX = index * 0.9 + 0.5;
    const phaseY = index * 1.2;
    const phaseZ = index * 0.7 + 2.0;
    const floatX = position[0] + Math.sin(t * 0.25 + phaseX) * 0.06;
    const floatY = baseY + Math.sin(t * 0.35 + phaseY) * 0.10 + Math.cos(t * 0.2 + phaseY) * 0.04;
    const floatZ = position[2] + Math.cos(t * 0.3 + phaseZ) * 0.05;
    meshRef.current.position.set(floatX, floatY, floatZ);

    const breathe = 1 + Math.sin(t * 0.5 + index * 0.7) * 0.05;
    const hoverScale = 1 + hp * 0.5;
    meshRef.current.scale.setScalar(breathe * hoverScale);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + hp * 1.4;

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = 0.08 + Math.sin(t * 0.4 + index) * 0.04;
      glowMat.opacity = baseOpacity + hp * 0.3;
      glowRef.current.scale.setScalar(breathe * (3.0 + hp * 2.5));
      glowRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <>
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {hovered && meshRef.current && (
        <Html
          position={[
            meshRef.current.position.x,
            meshRef.current.position.y + size + 0.25,
            meshRef.current.position.z,
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(220,38,38,0.6)',
            borderRadius: '3px',
            padding: '5px 12px',
            fontFamily: '"Courier New", monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 16px rgba(220,38,38,0.25)',
            animation: 'fadeInLabel 0.2s ease-out',
          }}>
            <span style={{ color: '#dc2626', marginRight: '6px' }}>●</span>
            {name}
          </div>
        </Html>
      )}
    </>
  );
}

// ── Particle trails flowing along links ──
const PARTICLES_PER_LINK = 2;
const TOTAL_PARTICLES = LINKS.length * PARTICLES_PER_LINK;

function ParticleTrails() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particleData = useMemo(() => {
    return LINKS.flatMap(([a, b]) => {
      return Array.from({ length: PARTICLES_PER_LINK }, (_, pIdx) => ({
        from: new THREE.Vector3(...(NODES[a].pos as unknown as [number, number, number])),
        to: new THREE.Vector3(...(NODES[b].pos as unknown as [number, number, number])),
        speed: 0.12 + Math.random() * 0.18,
        offset: (pIdx / PARTICLES_PER_LINK) + Math.random() * 0.1,
      }));
    });
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particleData.forEach((p, i) => {
      const progress = ((t * p.speed + p.offset) % 1);
      const x = p.from.x + (p.to.x - p.from.x) * progress;
      const y = p.from.y + (p.to.y - p.from.y) * progress;
      const z = p.from.z + (p.to.z - p.from.z) * progress;
      dummy.position.set(x, y, z);
      const fade = Math.sin(progress * Math.PI);
      const scale = 0.012 + fade * 0.022;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TOTAL_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

// ── Atmosphere particles ──
function AtmosphereParticles() {
  const count = 400;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 8,
      speed: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      size: 0.008 + Math.random() * 0.015,
    })),
  []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3,
        p.z + Math.sin(t * p.speed * 0.5 + p.phase + 1) * 0.4,
      );
      const flicker = 0.5 + Math.sin(t * 0.8 + p.phase) * 0.5;
      dummy.scale.setScalar(p.size * flicker);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#dc2626" transparent opacity={0.15} depthWrite={false} />
    </instancedMesh>
  );
}

// ── All Links with pulse ──
function NetworkLinks() {
  const groupRef = useRef<THREE.Group>(null);

  const lineObjects = useMemo(() => {
    return LINKS.map(([a, b]) => {
      const points = [
        new THREE.Vector3(...(NODES[a].pos as unknown as [number, number, number])),
        new THREE.Vector3(...(NODES[b].pos as unknown as [number, number, number])),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: '#dc2626',
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      });
      return new THREE.Line(geometry, material);
    });
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mat = (child as THREE.Line).material as THREE.LineBasicMaterial;
      const pulse = Math.sin(t * 0.25 + i * 0.5) * 0.08;
      mat.opacity = 0.14 + pulse;
    });
  });

  return (
    <group ref={groupRef}>
      {lineObjects.map((lineObj, i) => (
        <primitive key={i} object={lineObj} />
      ))}
    </group>
  );
}

// ── Scene Controller — slow rotation, mouse parallax ──
function SceneController({ onNodeHover }: { onNodeHover: (name: string | null) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothMouse = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const prevPointer = useRef({ x: 0, y: 0 });

  useFrame(({ clock, pointer }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    const lerpFactor = 1 - Math.pow(0.05, dt);
    smoothMouse.current.x += (pointer.x - smoothMouse.current.x) * lerpFactor;
    smoothMouse.current.y += (pointer.y - smoothMouse.current.y) * lerpFactor;

    const dx = pointer.x - prevPointer.current.x;
    const dy = pointer.y - prevPointer.current.y;
    prevPointer.current.x = pointer.x;
    prevPointer.current.y = pointer.y;

    velocity.current.x += dx * 0.2;
    velocity.current.y += dy * 0.2;
    velocity.current.x *= 0.96;
    velocity.current.y *= 0.96;

    // Very slow auto-rotation
    const autoRotY = t * 0.04;
    const autoRotX = Math.sin(t * 0.03) * 0.08;

    const mouseX = smoothMouse.current.y * 0.25 + velocity.current.y * 0.6;
    const mouseY = smoothMouse.current.x * 0.35 + velocity.current.x * 0.6;

    const groupLerp = 1 - Math.pow(0.02, dt);
    groupRef.current.rotation.x += ((autoRotX + mouseX) - groupRef.current.rotation.x) * groupLerp;
    groupRef.current.rotation.y += ((autoRotY + mouseY) - groupRef.current.rotation.y) * groupLerp;
  });

  return (
    <group ref={groupRef}>
      {NODES.map((node, i) => (
        <NetworkNode
          key={node.id}
          position={node.pos as unknown as [number, number, number]}
          color={TIER_COLORS[node.tier]}
          size={node.size}
          index={i}
          name={node.name}
          onHover={onNodeHover}
        />
      ))}
      <NetworkLinks />
      <ParticleTrails />
      <AtmosphereParticles />
    </group>
  );
}

// ── CSS ──
const CSS = `
@keyframes fadeInLabel {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// ── Main component ──
export default function LandingHero3D({ onNodeHover }: { onNodeHover?: (name: string | null) => void }) {
  const handleHover = useCallback((name: string | null) => {
    onNodeHover?.(name);
  }, [onNodeHover]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />
        <pointLight position={[0, 0, 4]} intensity={0.4} color="#dc2626" />
        <pointLight position={[-3, -2, 2]} intensity={0.15} color="#4444ff" />

        <SceneController onNodeHover={handleHover} />
      </Canvas>
    </div>
  );
}
