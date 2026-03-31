'use client';

import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// ── Mini network data — real Epstein names for "this is real" effect ──
const NODES = [
  { id: 0, pos: [0, 0, 0], tier: 1, size: 0.18, name: 'Jeffrey Epstein' },
  { id: 1, pos: [1.8, 0.6, 0.3], tier: 2, size: 0.14, name: 'Ghislaine Maxwell' },
  { id: 2, pos: [-1.5, 0.9, -0.4], tier: 2, size: 0.14, name: 'Jean-Luc Brunel' },
  { id: 3, pos: [0.8, -1.3, 0.5], tier: 2, size: 0.13, name: 'Les Wexner' },
  { id: 4, pos: [-1.0, -0.8, 0.6], tier: 3, size: 0.10, name: 'Sarah Kellen' },
  { id: 5, pos: [2.2, -0.5, -0.3], tier: 3, size: 0.10, name: 'Nadia Marcinkova' },
  { id: 6, pos: [-2.0, -0.2, 0.2], tier: 3, size: 0.10, name: 'Adriana Ross' },
  { id: 7, pos: [0.3, 1.8, -0.5], tier: 3, size: 0.10, name: 'Prince Andrew' },
  { id: 8, pos: [-0.5, -1.8, -0.3], tier: 3, size: 0.09, name: 'Alan Dershowitz' },
  { id: 9, pos: [1.2, 1.2, 0.6], tier: 3, size: 0.09, name: 'Peter Nygård' },
] as const;

const LINKS = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 5], [1, 9], [2, 6], [2, 7],
  [3, 5], [3, 8], [4, 6], [4, 8],
  [7, 9], [1, 3],
] as const;

const TIER_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#991b1b',
  3: '#7f1d1d',
};

// ── 3D Title — Canvas-to-Texture for real Z-buffer depth ──
// Fix: textBaseline 'alphabetic' + measureText metrics for accurate glyph positioning
// Fix: Power-of-2 canvas (4096×1024) for GPU optimization
// Fix: alphaTest to prevent transparent pixels from writing to depth buffer
function HeroTitle({ title }: { title: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const w = 4096;
    const h = 1024; // Power-of-2 for GPU optimization
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    const fontSize = 155; // Fits within canvas width with glow margin

    // Use 'alphabetic' baseline + measureText for accurate vertical centering
    // 'middle' baseline uses em-square center which misaligns W, M, and other wide caps
    const fontStr = `normal ${fontSize}px Georgia, serif`;
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Measure actual glyph bounds for pixel-perfect vertical centering
    const metrics = ctx.measureText(title);
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
    // Visual center: place alphabetic baseline so text is visually centered
    const textY = (h / 2) + (ascent - descent) / 2;

    // Pass 1: Red glow
    ctx.save();
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(220, 38, 38, 0.35)';
    ctx.shadowBlur = 60;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, textY);
    ctx.restore();

    // Pass 2: Crisp text on top
    ctx.save();
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, textY);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [title]);

  // Plane covers ~85% of visible width at camera z=5.5, fov=45
  // Visible width ≈ 8.1 units, so 8.5 = 105% (text only fills ~75% of canvas)
  const planeWidth = 9.8; // Larger plane = text appears bigger on screen
  const planeHeight = planeWidth * (1024 / 4096); // Aspect ratio match

  return (
    <mesh ref={meshRef} position={[0, 0.15, 0]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite
        depthTest
        alphaTest={0.01} // Discard transparent pixels from depth buffer
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ── Single Node with hover + label ──
function NetworkNode({ position, color, size, index, name, onHover }: {
  position: [number, number, number];
  color: string;
  size: number;
  index: number;
  name: string;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverProgress = useRef(0);
  const baseY = position[1];

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(true);
    document.body.style.cursor = 'pointer';
  }, [onHover]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    onHover(false);
    document.body.style.cursor = 'default';
  }, [onHover]);

  useFrame(({ clock }, delta) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    const hoverTarget = hovered ? 1 : 0;
    hoverProgress.current += (hoverTarget - hoverProgress.current) * Math.min(dt * 8, 1);
    const hp = hoverProgress.current;

    // Organic multi-axis floating
    const phaseX = index * 0.9 + 0.5;
    const phaseY = index * 1.2;
    const phaseZ = index * 0.7 + 2.0;
    const floatX = position[0] + Math.sin(t * 0.3 + phaseX) * 0.05;
    const floatY = baseY + Math.sin(t * 0.4 + phaseY) * 0.12 + Math.cos(t * 0.25 + phaseY) * 0.04;
    const floatZ = position[2] + Math.cos(t * 0.35 + phaseZ) * 0.04;
    meshRef.current.position.set(floatX, floatY, floatZ);

    const breathe = 1 + Math.sin(t * 0.6 + index * 0.7) * 0.06 + Math.sin(t * 1.1 + index * 1.3) * 0.03;
    const hoverScale = 1 + hp * 0.4;
    meshRef.current.scale.setScalar(breathe * hoverScale);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.6 + hp * 1.2;

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = 0.10 + Math.sin(t * 0.5 + index) * 0.06 + Math.sin(t * 1.3 + index * 2) * 0.03;
      glowMat.opacity = baseOpacity + hp * 0.25;
      glowRef.current.scale.setScalar(breathe * (2.8 + hp * 2.0));
      glowRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <>
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
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
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {hovered && meshRef.current && (
        <Html
          position={[
            meshRef.current.position.x,
            meshRef.current.position.y + size + 0.22,
            meshRef.current.position.z,
          ]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(220,38,38,0.6)',
            borderRadius: '4px',
            padding: '4px 10px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#e5e5e5',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 12px rgba(220,38,38,0.3)',
            animation: 'fadeInLabel 0.2s ease-out',
          }}>
            <span style={{ color: '#dc2626', marginRight: '6px' }}>&#9679;</span>
            {name}
          </div>
        </Html>
      )}
    </>
  );
}

// ── Particle System — lights flowing along links ──
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
        speed: 0.15 + Math.random() * 0.2,
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
      const scale = 0.015 + fade * 0.025;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TOTAL_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ff4444" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

// ── All Links ──
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
        opacity: 0.2,
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
      const pulse = Math.sin(t * 0.3 + i * 0.7) * 0.1 + Math.sin(t * 0.8 + i * 1.3) * 0.04;
      mat.opacity = 0.18 + pulse;
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

// ── Scene Controller — network rotates, title stays fixed ──
function SceneController({ title }: { title: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [, setAnyHovered] = useState(false);

  const smoothMouse = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const prevPointer = useRef({ x: 0, y: 0 });

  const handleNodeHover = useCallback((hovered: boolean) => {
    setAnyHovered(hovered);
  }, []);

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

    velocity.current.x += dx * 0.3;
    velocity.current.y += dy * 0.3;
    velocity.current.x *= 0.95;
    velocity.current.y *= 0.95;

    const autoRotY = t * 0.06;
    const autoRotX = Math.sin(t * 0.04) * 0.12;
    const autoRotZ = Math.sin(t * 0.03 + 1.5) * 0.03;

    const mouseX = smoothMouse.current.y * 0.35 + velocity.current.y * 0.8;
    const mouseY = smoothMouse.current.x * 0.5 + velocity.current.x * 0.8;

    const targetRotX = autoRotX + mouseX;
    const targetRotY = autoRotY + mouseY;
    const targetRotZ = autoRotZ;

    const groupLerp = 1 - Math.pow(0.02, dt);
    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * groupLerp;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * groupLerp;
    groupRef.current.rotation.z += (targetRotZ - groupRef.current.rotation.z) * groupLerp;
  });

  return (
    <>
      {/* ── Title: FIXED in world space — doesn't rotate ── */}
      <HeroTitle title={title} />

      {/* ── Network: ROTATES around the title ── */}
      <group ref={groupRef}>
        {NODES.map((node, i) => (
          <NetworkNode
            key={node.id}
            position={node.pos as unknown as [number, number, number]}
            color={TIER_COLORS[node.tier]}
            size={node.size}
            index={i}
            name={node.name}
            onHover={handleNodeHover}
          />
        ))}
        <NetworkLinks />
        <ParticleTrails />
      </group>
    </>
  );
}

// ── CSS for label animation ──
const LABEL_CSS = `
@keyframes fadeInLabel {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// ── Main exported component ──
export default function HeroNetwork3D({ title = 'See What Power Hides' }: { title?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: LABEL_CSS }} />
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />
        <pointLight position={[0, 0, 3]} intensity={0.3} color="#dc2626" />

        <SceneController title={title} />
      </Canvas>
    </div>
  );
}
