/**
 * Investigation Game Store (Sprint G1 — "Temel Motor")
 * Manages the gamified investigation review system
 *
 * Radical Transparency: All data, all decisions, all metrics — publicly visible
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────

export interface TaskData {
  quarantine_id?: string;
  item_type: string;
  entity_name: string;
  entity_type: string;
  confidence: number;
  source_type: string;
  source_provider?: string;
  source_url?: string;
  raw_data: Record<string, unknown>;
  // Verification Desk v2: Source citation for spotlight
  source_sentence?: string;
  source_page?: number | null;
  // Relationship-specific
  source_entity?: string;
  target_entity?: string;
  relationship_type?: string;
  // Date-specific
  date_value?: string;
  date_context?: string;
}

/** Verification Desk v2: Spotlight data from API */
export interface SpotlightData {
  mode: 'normal' | 'honeypot' | 'none';
  source_sentence: string;
  source_page: number | null;
  honeypot_target_section: string | null;
}

/** Verification Desk v2: 3-layer review phases */
export type ReviewPhase = 'blind' | 'compare' | 'verify' | 'complete';

export interface InvestigationTask {
  id: string;
  task_type: string;
  difficulty: number;
  role_affinity: string;
  task_data: TaskData;
  context_data: Record<string, unknown>;
  is_calibration: boolean;
  required_reviews: number;
  completed_count: number;
  trace_id: string;
  // Verification Desk v2
  spotlight: SpotlightData;
  entity_document_mismatch: boolean;
  risk_level: 'standard' | 'high';
  cooling_expires_at: string | null;
  composite_confidence: number | null;
}

export interface DocumentContext {
  id: string;
  title: string;
  document_type: string;
  source_name: string;
  source_url: string;
  page_count: number;
  // OCR text for fosforlu kalem system
  text_content?: string | null;
  has_full_text?: boolean;
  has_file?: boolean;
  file_url?: string | null;
}

/** Fosforlu kalem stroke data — normalized bounding boxes for consensus matching */
export interface HighlightSubmission {
  page: number;
  canvas_width: number;
  canvas_height: number;
  strokes: Array<{
    color: string;
    /** Normalized bbox (0-1 range relative to canvas) */
    nx: number;
    ny: number;
    nw: number;
    nh: number;
  }>;
}

export interface ProvenanceEntry {
  action_type: string;
  actor_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
  trace_id: string;
}

export interface ExistingReview {
  reviewer: string;
  response: { decision: string; details?: unknown };
  response_time_ms: number;
  reasoning: string;
  confidence: number;
  trace_id: string;
  created_at: string;
}

export interface InvestigatorProfile {
  tier: string;
  xp: number;
  streak_days: number;
  calibration_accuracy: number;
  trust_weight: number;
  trust_weight_formula: string;
  total_tasks_completed: number;
}

export interface CalibrationResult {
  is_correct: boolean;
  known_answer: Record<string, unknown>;
  message: string;
}

export interface ConsensusResult {
  decision: string;
  confidence: number;
  total_reviews: number;
}

export interface PlatformMetrics {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: string;
  active_investigators: number;
  total_disputes: number;
  open_disputes: number;
}

// ─── Store Interface ─────────────────────────────────────────────────

/** Verification Desk v2: Phase-specific responses stored locally before final submit */
export interface PhaseResponse {
  phase: ReviewPhase;
  decision?: 'approve' | 'reject' | 'dispute' | 'skip';
  reasoning?: string;
  confidence?: number;
  rejected_spotlight?: boolean;
  found_correct_section?: boolean;
  corrections?: Array<{
    field_name: string;
    original_value: string;
    corrected_value: string;
    correction_reasoning: string;
  }>;
  // Katman 3: Kaynak doğrulama
  source_found?: boolean;
  hallucination_flags?: string[];
  timestamp: number;
}

interface InvestigationGameState {
  // Panel state (right sidebar — task wallet)
  isOpen: boolean;
  activeTab: 'task' | 'profile' | 'transparency' | 'disputes';

  // Desk state (center screen — main investigation workspace)
  isDeskOpen: boolean;

  // Current task
  currentTask: InvestigationTask | null;
  documentContext: DocumentContext | null;
  provenance: ProvenanceEntry[];
  existingReviews: ExistingReview[];
  isLoadingTask: boolean;
  noTasksAvailable: boolean;

  // Verification Desk v2: Review phase state
  reviewPhase: ReviewPhase;
  phaseResponses: PhaseResponse[];
  reviewsHidden: boolean;

  // Error state
  hasError: boolean;
  errorMessage: string | null;

  // Profile
  profile: InvestigatorProfile | null;

  // Submission state
  isSubmitting: boolean;
  lastCalibration: CalibrationResult | null;
  lastConsensus: ConsensusResult | null;

  // Platform metrics
  metrics: PlatformMetrics | null;

  // Task generation
  isGenerating: boolean;
  generationResult: { generated: number; total_quarantine: number } | null;

  // Stats
  sessionTasksCompleted: number;
  sessionCorrect: number;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  openDesk: () => void;
  closeDesk: () => void;
  setTab: (tab: 'task' | 'profile' | 'transparency' | 'disputes') => void;
  fetchNextTask: (networkId: string, fingerprint: string, role?: string) => Promise<void>;

  // Verification Desk v2: Phase progression
  advancePhase: () => void;
  savePhaseResponse: (response: Omit<PhaseResponse, 'timestamp'>) => void;
  resetReviewState: () => void;

  submitReview: (params: {
    taskId: string;
    fingerprint: string;
    decision: 'approve' | 'reject' | 'dispute' | 'skip';
    reasoning: string;
    confidence?: number;
    evidenceRefs?: string[];
    highlightData?: HighlightSubmission | null;
    // Verification Desk v2
    phaseResponses?: PhaseResponse[];
    rejectedSpotlight?: boolean;
    foundCorrectSection?: boolean;
    corrections?: Array<{
      field_name: string;
      original_value: string;
      corrected_value: string;
      correction_reasoning: string;
    }>;
  }) => Promise<boolean>;
  generateTasks: (networkId: string) => Promise<void>;
  fetchProfile: (fingerprint: string) => Promise<void>;
  fetchMetrics: (networkId: string) => Promise<void>;
  clearCalibration: () => void;
  clearConsensus: () => void;
  clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useInvestigationGameStore = create<InvestigationGameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isOpen: false,
      isDeskOpen: false,
      activeTab: 'task',
      currentTask: null,
      documentContext: null,
      provenance: [],
      existingReviews: [],
      isLoadingTask: false,
      noTasksAvailable: false,
      // Verification Desk v2
      reviewPhase: 'blind',
      phaseResponses: [],
      reviewsHidden: true,
      hasError: false,
      errorMessage: null,
      profile: null,
      isSubmitting: false,
      lastCalibration: null,
      lastConsensus: null,
      metrics: null,
      isGenerating: false,
      generationResult: null,
      sessionTasksCompleted: 0,
      sessionCorrect: 0,

      openPanel: () => set({ isOpen: true }),
      closePanel: () => set({ isOpen: false }),
      openDesk: () => set({ isDeskOpen: true }),
      closeDesk: () => set({ isDeskOpen: false }),
      setTab: (tab) => set({ activeTab: tab }),

      // Verification Desk v2: Phase progression (blind → compare → verify → complete)
      advancePhase: () => {
        const { reviewPhase } = get();
        const phaseOrder: ReviewPhase[] = ['blind', 'compare', 'verify', 'complete'];
        const currentIndex = phaseOrder.indexOf(reviewPhase);
        if (currentIndex < phaseOrder.length - 1) {
          const nextPhase = phaseOrder[currentIndex + 1];
          set({
            reviewPhase: nextPhase,
            // Reveal reviews when leaving blind phase
            reviewsHidden: nextPhase === 'blind',
          });
        }
      },

      savePhaseResponse: (response) => {
        const { phaseResponses } = get();
        set({
          phaseResponses: [
            ...phaseResponses,
            { ...response, timestamp: Date.now() },
          ],
        });
      },

      resetReviewState: () => set({
        reviewPhase: 'blind',
        phaseResponses: [],
        reviewsHidden: true,
        lastCalibration: null,
        lastConsensus: null,
      }),

      fetchNextTask: async (networkId, fingerprint, role) => {
        // Reset review state for new task
        set({
          isLoadingTask: true,
          noTasksAvailable: false,
          lastCalibration: null,
          lastConsensus: null,
          hasError: false,
          errorMessage: null,
          reviewPhase: 'blind',
          phaseResponses: [],
          reviewsHidden: true,
        });
        try {
          const params = new URLSearchParams({
            network_id: networkId,
            fingerprint,
            // Always start with blind phase for anti-bias
            phase: 'blind',
            ...(role ? { role } : {}),
          });
          const res = await fetch(`/api/game/tasks?${params}`);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to fetch tasks (${res.status})`;
            set({
              isLoadingTask: false,
              hasError: true,
              errorMessage: errorMsg,
              currentTask: null,
            });
            console.error('[InvestigationGame] fetchNextTask error:', errorMsg);
            return;
          }

          const data = await res.json();

          if (!data.task) {
            set({
              currentTask: null,
              noTasksAvailable: true,
              isLoadingTask: false,
              hasError: false,
            });
            return;
          }

          set({
            currentTask: data.task,
            documentContext: data.document || null,
            provenance: data.provenance || [],
            existingReviews: data.existing_reviews || [],
            profile: data.profile || null,
            isLoadingTask: false,
            hasError: false,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching tasks';
          console.error('[InvestigationGame] fetchNextTask error:', err);
          set({
            isLoadingTask: false,
            hasError: true,
            errorMessage: errorMsg,
            currentTask: null,
          });
        }
      },

      submitReview: async (params) => {
        set({ isSubmitting: true, hasError: false, errorMessage: null });
        try {
          const res = await fetch('/api/game/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: params.taskId,
              fingerprint: params.fingerprint,
              decision: params.decision,
              reasoning: params.reasoning,
              confidence: params.confidence,
              evidence_refs: params.evidenceRefs,
              highlight_data: params.highlightData || null,
              // Verification Desk v2
              phase_responses: params.phaseResponses || get().phaseResponses,
              rejected_spotlight: params.rejectedSpotlight,
              found_correct_section: params.foundCorrectSection,
              corrections: params.corrections,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to submit review (${res.status})`;
            console.error('[InvestigationGame] submitReview error:', errorMsg);
            set({
              isSubmitting: false,
              hasError: true,
              errorMessage: errorMsg,
            });
            return false;
          }

          const data = await res.json();

          const state = get();
          const newCompleted = state.sessionTasksCompleted + 1;
          const newCorrect = data.calibration?.is_correct
            ? state.sessionCorrect + 1
            : state.sessionCorrect;

          set({
            isSubmitting: false,
            profile: data.profile || state.profile,
            lastCalibration: data.calibration || null,
            lastConsensus: data.consensus || null,
            sessionTasksCompleted: newCompleted,
            sessionCorrect: newCorrect,
            hasError: false,
          });

          return true;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error submitting review';
          console.error('[InvestigationGame] submitReview error:', err);
          set({
            isSubmitting: false,
            hasError: true,
            errorMessage: errorMsg,
          });
          return false;
        }
      },

      generateTasks: async (networkId) => {
        set({ isGenerating: true, generationResult: null, hasError: false, errorMessage: null });
        try {
          const res = await fetch('/api/game/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ network_id: networkId, limit: 100 }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to generate tasks (${res.status})`;
            console.error('[InvestigationGame] generateTasks error:', errorMsg);
            set({
              isGenerating: false,
              hasError: true,
              errorMessage: errorMsg,
            });
            return;
          }

          const data = await res.json();
          set({
            isGenerating: false,
            generationResult: {
              generated: data.generated || 0,
              total_quarantine: data.total_quarantine || 0,
            },
            hasError: false,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error generating tasks';
          console.error('[InvestigationGame] generateTasks error:', err);
          set({
            isGenerating: false,
            hasError: true,
            errorMessage: errorMsg,
          });
        }
      },

      fetchProfile: async (fingerprint) => {
        set({ hasError: false, errorMessage: null });
        try {
          const res = await fetch(`/api/game/profile?fingerprint=${encodeURIComponent(fingerprint)}`);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to fetch profile (${res.status})`;
            console.error('[InvestigationGame] fetchProfile error:', errorMsg);
            set({
              hasError: true,
              errorMessage: errorMsg,
            });
            return;
          }

          const data = await res.json();
          set({
            profile: data.profile || null,
            hasError: false,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching profile';
          console.error('[InvestigationGame] fetchProfile error:', err);
          set({
            hasError: true,
            errorMessage: errorMsg,
          });
        }
      },

      fetchMetrics: async (networkId) => {
        set({ hasError: false, errorMessage: null });
        try {
          const res = await fetch(`/api/game/transparency?view=metrics&network_id=${networkId}`);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || `Failed to fetch metrics (${res.status})`;
            console.error('[InvestigationGame] fetchMetrics error:', errorMsg);
            set({
              hasError: true,
              errorMessage: errorMsg,
            });
            return;
          }

          const data = await res.json();
          set({
            metrics: data.live || null,
            hasError: false,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error fetching metrics';
          console.error('[InvestigationGame] fetchMetrics error:', err);
          set({
            hasError: true,
            errorMessage: errorMsg,
          });
        }
      },

      clearCalibration: () => set({ lastCalibration: null }),
      clearConsensus: () => set({ lastConsensus: null }),
      clearError: () => set({ hasError: false, errorMessage: null }),
    }),
    { name: 'investigation-game-store' }
  )
);
