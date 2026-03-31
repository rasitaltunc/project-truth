// ═══════════════════════════════════════════════════════════════
// SPRINT 14A v4 — FIBER OPTIC LIVE WALL SHADER SYSTEM
// Energy flows through wireframe lines. No particles floating in air —
// the wall itself is alive, a pulsing structure.
// Museum exhibition tunnel aesthetic: cylindrical, cinematic, premium.
// ═══════════════════════════════════════════════════════════════

// ── FIBER TUNNEL VERTEX SHADER ──
// Shared vertex shader for cylinder + floor
export const tunnelVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// ── FIBER TUNNEL FRAGMENT SHADER ──
// Wireframe lines carry energy. When pulse passes, wire glows,
// then fades. Multiple waves = organic aliveness.
export const tunnelFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBootProgress;
  uniform vec3 uCorridorColor;
  uniform vec3 uAccentColor;
  uniform float uCameraZ;
  uniform float uTunnelLength;
  uniform float uGridDensity;
  uniform float uPulseSpeed;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // ── Grid Lines ──
    // Ring lines (perpendicular to tunnel, structural ribs)
    float ringCount = uGridDensity;
    // Longitudinal lines (along tunnel, fiber cables)
    float lineCount = uGridDensity * 1.5;
    float wireWidth = 0.018;
    float thinWireWidth = wireWidth * 0.6;

    // Ring line distance
    float ringPhase = fract(vUv.y * ringCount);
    float ringDist = min(ringPhase, 1.0 - ringPhase);
    float onRing = 1.0 - smoothstep(0.0, wireWidth, ringDist);

    // Fine sub-rings (detail layer)
    float subRingPhase = fract(vUv.y * ringCount * 3.0);
    float subRingDist = min(subRingPhase, 1.0 - subRingPhase);
    float onSubRing = (1.0 - smoothstep(0.0, thinWireWidth * 0.4, subRingDist)) * 0.2;

    // Longitudinal line distance
    float linePhase = fract(vUv.x * lineCount);
    float lineDist = min(linePhase, 1.0 - linePhase);
    float onLine = 1.0 - smoothstep(0.0, thinWireWidth, lineDist);

    // Combined wire mask
    float onWire = max(onRing, max(onLine, onSubRing));

    // ── DUAL-LAYER ENERGY SYSTEM ──
    // Layer 1: Sine waves (soft, organic)
    // Layer 2: Triangle waves (sharp, digital)
    // Layer 3: Gaussian burst (large, dramatic)
    float v = vUv.y;
    float ps = uPulseSpeed;

    // SINE layer — organic, slow
    float s1 = sin(v * 8.0 - uTime * ps * 1.8) * 0.5 + 0.5;
    float s2 = sin(v * 5.0 - uTime * ps * 2.5 + 1.57) * 0.5 + 0.5;
    float sineLayer = max(s1, s2);
    sineLayer = pow(sineLayer, 3.0); // Sharpen (prominent peaks)

    // TRIANGLE layer — digital, fast
    float t1 = 1.0 - abs(2.0 * fract(v * 6.0 - uTime * ps * 2.0) - 1.0);
    float t2 = 1.0 - abs(2.0 * fract(v * 4.0 - uTime * ps * 3.0 + 0.33) - 1.0);
    float triLayer = max(t1, t2);
    triLayer = pow(triLayer, 4.0); // Even sharper

    // GAUSSIAN BURST — every 5 sec, large dramatic wave
    float burstPos = fract(uTime * 0.2) * 1.3 - 0.15;
    float burst = exp(-pow((v - burstPos) * 6.0, 2.0)) * 0.7;

    // Combine: 50% sine + 30% triangle + 20% burst
    float pulseEnergy = sineLayer * 0.5 + triLayer * 0.3 + burst;

    // Slow breathing wave (ambient aliveness)
    float breathe = sin(v * 6.283 * 2.0 - uTime * 0.6) * 0.5 + 0.5;
    breathe *= 0.08;

    float energy = clamp(pulseEnergy + breathe, 0.0, 1.0);

    // ── Ring Flash Effect ──
    // When pulse reaches a ring, ENTIRE RING burns
    float ringFlash = onRing * pulseEnergy * 0.9;

    // ── Wire Glow ──
    float baseGlow = 0.05; // Wires always slightly visible
    float wireGlow = onWire * (baseGlow + energy * 0.95);

    // Light bleeding from wires (nearby pixels slightly illuminated — premium glow)
    float bleedGlow = (1.0 - onWire) * pulseEnergy * 0.04;

    float totalGlow = wireGlow + bleedGlow + ringFlash;

    // ── Color ──
    vec3 dimColor = uCorridorColor * 0.4;
    vec3 brightColor = uAccentColor;
    vec3 color = mix(dimColor, brightColor, energy * 0.75);

    // Ring flash brighter
    color += uAccentColor * ringFlash * 0.5;

    // ── Boot-Up Reveal ──
    // Camera-centric reveal: expands outward from camera during boot
    float reveal = smoothstep(0.0, 0.8, uBootProgress);
    // Pixels near camera appear FIRST, distant ones last
    float dist = abs(vWorldPos.z - uCameraZ);
    float maxDist = uTunnelLength * 0.42;
    float revealRadius = reveal * maxDist * 1.3; // Visibility diameter expands as boot progresses
    float revealWave = smoothstep(revealRadius, revealRadius - 8.0, dist);
    // When boot completes, EVERYTHING visible
    revealWave = max(revealWave, reveal);

    // Scan ring during boot (expands from camera)
    float bootScan = 0.0;
    if (uBootProgress < 1.0) {
      float scanDist = uBootProgress * maxDist * 1.2;
      bootScan = smoothstep(scanDist - 2.0, scanDist, dist) *
                 smoothstep(scanDist + 2.0, scanDist, dist);
    }

    // ── Distance Fade ──
    float distFade = 1.0 - smoothstep(8.0, maxDist, dist);
    // Boost nearby elements
    float nearBoost = 1.0 + smoothstep(20.0, 0.0, dist) * 0.5;

    // ── CRT Scan Line (very subtle) ──
    float scanline = 0.97 + sin(vUv.y * 400.0 + uTime * 1.5) * 0.03;

    // ── Final Calculation ──
    float alpha = totalGlow * revealWave * distFade * nearBoost;
    color *= scanline;
    color += uAccentColor * bootScan * 3.0; // Boot scan glow

    gl_FragColor = vec4(color * totalGlow * nearBoost, alpha);
  }
`;

// ── FIBER FLOOR FRAGMENT SHADER ──
// Perspective grid + energy lines
export const tunnelFloorFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uBootProgress;
  uniform vec3 uCorridorColor;
  uniform vec3 uAccentColor;
  uniform float uCameraZ;
  uniform float uTunnelLength;
  uniform float uPulseSpeed;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    float depth = vWorldPos.z - uCameraZ;
    float dist = abs(depth);
    float maxDist = uTunnelLength * 0.42;
    float fog = 1.0 - smoothstep(5.0, maxDist, dist);

    // Perspective grid
    vec2 gridUv = vec2(vWorldPos.x * 1.5, vWorldPos.z * 0.25);
    vec2 grid = abs(fract(gridUv) - 0.5);
    float gridX = 1.0 - smoothstep(0.0, 0.02, grid.x);
    float gridZ = 1.0 - smoothstep(0.0, 0.02, grid.y);
    float lines = max(gridX, gridZ);

    // Center line
    float centerLine = 1.0 - smoothstep(0.0, 0.015, abs(vWorldPos.x));

    // Energy pulses (synchronized with tunnel shader)
    float v = vUv.y;
    float ps = uPulseSpeed;
    float p1 = exp(-pow((fract(v * 4.0 - uTime * ps * 0.6) - 0.5) * 8.0, 2.0));
    float p2 = exp(-pow((fract(v * 3.0 - uTime * ps * 0.85 + 0.33) - 0.5) * 6.0, 2.0));
    float energy = max(p1, p2);

    // Energy in wires
    float wireEnergy = lines * (0.04 + energy * 0.6);
    float centerEnergy = centerLine * (0.15 + energy * 0.5);

    vec3 color = uCorridorColor * 0.3 * wireEnergy;
    color += uAccentColor * centerEnergy * 0.4;
    color += uAccentColor * energy * lines * 0.2;

    float alpha = (wireEnergy + centerEnergy) * fog * smoothstep(0.0, 0.8, uBootProgress);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Floor vertex shader (same as tunnel vertex)
export const tunnelFloorVertexShader = tunnelVertexShader;

// Particle shaders removed — enerji artık wire'ların İÇİNDE

// ── CORRIDOR THEME COLOR PALETTES ──
export const CORRIDOR_THEMES = {
  evidence: {
    name: 'EVIDENCE CORRIDOR',
    corridorColor: [0.55, 0.08, 0.12] as const,    // Deep burgundy (premium, not flat)
    accentColor: [1.0, 0.35, 0.30] as const,        // Warm red-orange (vibrant)
    particleColors: ['#ef4444', '#dc2626', '#ff6b6b', '#991b1b'],
    fogDensity: 0.015,
    pulseSpeed: 0.3,
    gridDensity: 8.0,
  },
  court: {
    name: 'COURT CORRIDOR',
    corridorColor: [0.55, 0.15, 0.15] as const,
    accentColor: [0.85, 0.65, 0.35] as const,
    particleColors: ['#8b4513', '#d4a574', '#ef4444', '#f59e0b'],
    fogDensity: 0.02,
    pulseSpeed: 0.15,
    gridDensity: 6.0,
  },
  finance: {
    name: 'MONEY FLOW CORRIDOR',
    corridorColor: [0.08, 0.23, 0.37] as const,
    accentColor: [0.13, 0.72, 0.33] as const,
    particleColors: ['#22c55e', '#10b981', '#3b82f6', '#06b6d4'],
    fogDensity: 0.012,
    pulseSpeed: 0.4,
    gridDensity: 10.0,
  },
  press: {
    name: 'PRESS CORRIDOR',
    corridorColor: [0.6, 0.6, 0.6] as const,
    accentColor: [1.0, 1.0, 1.0] as const,
    particleColors: ['#e5e5e5', '#a3a3a3', '#ffffff', '#d4d4d4'],
    fogDensity: 0.01,
    pulseSpeed: 0.2,
    gridDensity: 6.0,
  },
  darkroom: {
    name: 'LEAK CORRIDOR',
    corridorColor: [0.30, 0.11, 0.58] as const,
    accentColor: [0.66, 0.33, 0.97] as const,
    particleColors: ['#a855f7', '#7c3aed', '#c084fc', '#4c1d95'],
    fogDensity: 0.025,
    pulseSpeed: 0.1,
    gridDensity: 12.0,
  },
  intelligence: {
    name: 'INTELLIGENCE CORRIDOR',
    corridorColor: [0.04, 0.35, 0.20] as const,
    accentColor: [0.0, 1.0, 0.5] as const,
    particleColors: ['#00ff80', '#10b981', '#22c55e', '#059669'],
    fogDensity: 0.018,
    pulseSpeed: 0.35,
    gridDensity: 14.0,
  },
} as const;

export type CorridorThemeKey = keyof typeof CORRIDOR_THEMES;

// ── THEME → EVIDENCE TYPE MAPPING ──
export const THEME_EVIDENCE_FILTER: Record<CorridorThemeKey, string[] | null> = {
  evidence: null,
  court: ['court_record', 'official_document', 'testimony', 'witness_testimony'],
  finance: ['financial_record', 'flight_record'],
  press: ['news_major', 'social_media', 'academic_paper'],
  darkroom: ['leaked_document', 'photograph', 'rumor'],
  intelligence: ['inference', 'leaked_document', 'witness_testimony', 'flight_record'],
};

export function isEvidenceVisibleInTheme(evidenceType: string, theme: CorridorThemeKey): boolean {
  const filter = THEME_EVIDENCE_FILTER[theme];
  if (!filter) return true;
  return filter.includes(evidenceType);
}

export function isThemeAvailable(
  theme: CorridorThemeKey,
  evidences: Array<{ evidenceType: string }>
): boolean {
  const filter = THEME_EVIDENCE_FILTER[theme];
  if (!filter) return true;
  return evidences.some(ev => filter.includes(ev.evidenceType));
}
