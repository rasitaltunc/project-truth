'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Foreground 3D nodes that float IN FRONT of the text.
 * Creates the "sandwich depth" effect:
 *   Back canvas (z:1) → Text (z:10) → This canvas (z:20)
 *
 * Only 4 nodes, no links, no interaction — ultra lightweight.
 * Slightly different rotation speed than back layer = parallax.
 */

const FRONT_NODES = [
  // Larger, closer to camera, positioned to cross text areas
  { pos: [-2.5, 0.8, 0.5], size: 0.25, speed: 0.7, phase: 0 },
  { pos: [3.0, -0.3, -0.3], size: 0.18, speed: 0.9, phase: 1.5 },
  { pos: [0.5, -2.0, 0.8], size: 0.15, speed: 1.1, phase: 3.0 },
  { pos: [-1.2, 2.2, -0.5], size: 0.12, speed: 0.8, phase: 4.5 },
];

function ForegroundNode({ pos, size, speed, phase }: {
  pos: number[];
  size: number;
  speed: number;
  phase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Organic floating — each node wanders independently
    const x = pos[0] + Math.sin(t * 0.2 * speed + phase) * 0.4;
    const y = pos[1] + Math.sin(t * 0.25 * speed + phase + 1) * 0.35 + Math.cos(t * 0.15 + phase) * 0.15;
    const z = pos[2] + Math.cos(t * 0.18 * speed + phase + 2) * 0.3;
    meshRef.current.position.set(x, y, z);

    // Breathing
    const breathe = 1 + Math.sin(t * 0.5 + phase) * 0.08;
    meshRef.current.scale.setScalar(breathe);

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 0.4 + phase) * 0.04;
      glowRef.current.scale.setScalar(breathe * 3.0);
      glowRef.current.position.copy(meshRef.current.position);
    }
  });

  return (
    <>
      <mesh ref={glowRef} position={pos as unknown as [number, number, number]}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color="#dc2626" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef} position={pos as unknown as [number, number, number]}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshStandardMaterial
          color="#dc2626"
          emissive="#dc2626"
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={0.75}
        />
      </mesh>
    </>
  );
}

function ForegroundScene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Slightly different rotation than back layer = parallax depth
    groupRef.current.rotation.y = t * 0.04;
    groupRef.current.rotation.x = Math.sin(t * 0.03) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {FRONT_NODES.map((node, i) => (
        <ForegroundNode key={i} {...node} />
      ))}
    </group>
  );
}

export default function HeroForegroundNodes() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
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
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 3]} intensity={0.2} color="#dc2626" />
        <ForegroundScene />
      </Canvas>
    </div>
  );
}
