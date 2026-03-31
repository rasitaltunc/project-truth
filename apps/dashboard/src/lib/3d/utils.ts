/**
 * 3D utility functions — Sprint 18 "Çelik İskelet"
 * Extracted from Truth3DScene.tsx
 */

import type * as THREE_TYPES from 'three';

/** Quadratic Bezier: P0*(1-t)² + P1*2t(1-t) + P2*t² */
export function quadraticBezier(
  p0: THREE_TYPES.Vector3,
  p1: THREE_TYPES.Vector3,
  p2: THREE_TYPES.Vector3,
  t: number
): THREE_TYPES.Vector3 {
  const mt = 1 - t;
  return p0.clone().multiplyScalar(mt * mt)
    .add(p1.clone().multiplyScalar(2 * mt * t))
    .add(p2.clone().multiplyScalar(t * t));
}

/** Ease in-out cubic */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ═══════════════════════════════════════════
// CAMERA DEFAULTS
// ═══════════════════════════════════════════

export const CAMERA_DEFAULTS = {
  fov: 60,
  near: 0.1,
  far: 2000,
  position: { x: 0, y: 30, z: 130 },
} as const;

export const ORBIT_DEFAULTS = {
  enableDamping: true,
  dampingFactor: 0.08,
  rotateSpeed: 0.5,
  zoomSpeed: 0.8,
  minDistance: 15,
  maxDistance: 500,
  autoRotate: true,
  autoRotateSpeed: 0.15,
} as const;

// ═══════════════════════════════════════════
// ANIMATION CONSTANTS
// ═══════════════════════════════════════════

export const CINEMATIC_ZOOM_SPEED = 0.015;
export const CINEMATIC_FADE_SPEED = 0.04;
export const CORRIDOR_ENTER_SPEED = 0.025;
export const CORRIDOR_EXIT_SPEED = 0.04;
export const CORRIDOR_CAM_DISTANCE = 12;
export const CORRIDOR_CAM_HEIGHT = 3;
export const LERP_SPEED = 0.06;

export const DRAG_THRESHOLD = 5;
export const CLICK_MAX_TIME = 400;

// ═══════════════════════════════════════════
// ANNOTATION ANIMATION CONSTANTS
// ═══════════════════════════════════════════

export const ANNOTATION_STAGGER_DELAY = 180; // ms between each badge
export const ANNOTATION_FADE_DURATION = 40; // ~667ms per badge
export const ANNOTATION_INITIAL_DELAY = 900; // after highlight animation

// ═══════════════════════════════════════════
// SCENE CONFIG
// ═══════════════════════════════════════════

export const SCENE_CONFIG = {
  fog: { color: 0x030303, density: 0.002 },
  ambientLight: { intensity: 0.4 },
  pointLights: [
    { color: 0xff2020, intensity: 0.3, position: { x: 50, y: 50, z: 50 } },
    { color: 0x2020ff, intensity: 0.2, position: { x: -50, y: -30, z: -50 } },
  ],
  particles: { count: 200, spreadRadius: 200 },
  renderer: {
    toneMapping: 'ACESFilmic',
    toneMappingExposure: 1.2,
  },
} as const;
