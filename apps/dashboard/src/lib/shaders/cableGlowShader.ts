/**
 * Cable Glow Shader — Sprint 6B "Epistemolojik Katman"
 * GLSL vertex + fragment shader for animated link cables.
 *
 * Normal mode: static colored cables
 * Epistemological mode: electric pulse animation (evidence-driven)
 */

// ═══════════════════════════════════════════
// GLSL SHADER STRINGS
// ═══════════════════════════════════════════

export const CABLE_VERTEX_SHADER = `
attribute float linePosition;
varying float vLinePos;
void main() {
    vLinePos = linePosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CABLE_FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColor;
uniform float uBaseOpacity;
uniform float uPulseIntensity;
uniform float uPulseWidth;
uniform float uPulseSpeed;
uniform float uPulseCount;
uniform float uPhaseOffset;
uniform float uHighlightDim;
uniform float uEpMode;
varying float vLinePos;

void main() {
    // ══ BASE: ip her zaman görünür ══
    float opacity = uBaseOpacity + 0.1;

    // ══ PULSE: sadece epistemolojik modda ══
    if (uEpMode > 0.5) {
        float maxPulse = 0.0;
        for (float n = 0.0; n < 3.0; n++) {
            if (n >= uPulseCount) break;

            // Pulse pozisyonu: tek yön, source→target (elektrik akımı)
            float pulsePos = fract(uTime * uPulseSpeed + uPhaseOffset + n * (1.0 / uPulseCount));

            // Mesafe
            float dist = abs(vLinePos - pulsePos);

            // ══ KESKİN AKIM: smoothstep ile net kenar ══
            // İç çekirdek: parlak beyaz nokta
            float core = smoothstep(uPulseWidth, 0.0, dist);
            // Dış hale: çok kısa, hafif glow
            float halo = smoothstep(uPulseWidth * 3.0, uPulseWidth * 0.5, dist) * 0.3;

            maxPulse = max(maxPulse, core + halo);
        }
        opacity += maxPulse * uPulseIntensity;
    }

    // Lens/Highlight dim — AdditiveBlending karanlık bg'de agresif taban gerekli
    opacity *= uHighlightDim;
    opacity = clamp(opacity, 0.02, 1.0);

    // ══ PULSE RENGİ: çekirdekte beyaza yaklaş (elektrik parıltısı) ══
    vec3 finalColor = uColor;
    if (uEpMode > 0.5) {
        float maxPulse2 = 0.0;
        for (float n = 0.0; n < 3.0; n++) {
            if (n >= uPulseCount) break;
            float pulsePos = fract(uTime * uPulseSpeed + uPhaseOffset + n * (1.0 / uPulseCount));
            float dist = abs(vLinePos - pulsePos);
            float core = smoothstep(uPulseWidth, 0.0, dist);
            maxPulse2 = max(maxPulse2, core);
        }
        // Çekirdekte renk beyaza doğru kayar (elektrik parıltısı)
        finalColor = mix(uColor, vec3(1.0), maxPulse2 * 0.6);
    }

    gl_FragColor = vec4(finalColor, opacity);
}
`;

// ═══════════════════════════════════════════
// UNIFORM DEFAULTS
// ═══════════════════════════════════════════

export interface CableGlowUniforms {
  uTime: { value: number };
  uColor: { value: { x: number; y: number; z: number } };
  uBaseOpacity: { value: number };
  uPulseIntensity: { value: number };
  uPulseWidth: { value: number };
  uPulseSpeed: { value: number };
  uPulseCount: { value: number };
  uPhaseOffset: { value: number };
  uHighlightDim: { value: number };
  uEpMode: { value: number };
}

export function createCableGlowUniforms(config: {
  color: { r: number; g: number; b: number };
  baseOpacity: number;
  pulseIntensity: number;
  pulseSpeed: number;
  pulseCount: number;
  phaseOffset: number;
}): CableGlowUniforms {
  return {
    uTime: { value: 0.0 },
    uColor: { value: { x: config.color.r, y: config.color.g, z: config.color.b } },
    uBaseOpacity: { value: config.baseOpacity },
    uPulseIntensity: { value: config.pulseIntensity },
    uPulseWidth: { value: 0.035 },
    uPulseSpeed: { value: config.pulseSpeed },
    uPulseCount: { value: config.pulseCount },
    uPhaseOffset: { value: config.phaseOffset },
    uHighlightDim: { value: 1.0 },
    uEpMode: { value: 0.0 },
  };
}
