'use client';

/**
 * Research Notebook Store (Sprint KEŞFET Redesign)
 * localStorage-based research notes — NO network writes
 * "Merak et, araştır, not al — ama ağa sadece gerçek belgeler girebilir."
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────

export interface ResearchNote {
  id: string;
  query: string;
  source: string; // icij | opensanctions | courtlistener
  externalId: string;
  title: string;
  description?: string;
  url?: string;
  documentType?: string;
  relevanceScore?: number;
  savedAt: string; // ISO timestamp
  userNote?: string;
  crossRefMatch?: string; // matched node name (if any)
  crossRefScore?: number; // match score 0-1
  tags?: string[];
}

interface ResearchState {
  notes: ResearchNote[];
  infoBannerDismissed: boolean;

  // Actions
  saveToNotebook: (note: Omit<ResearchNote, 'id' | 'savedAt'>) => void;
  removeFromNotebook: (id: string) => void;
  updateNote: (id: string, updates: Partial<ResearchNote>) => void;
  clearNotebook: () => void;
  isInNotebook: (externalId: string, source: string) => boolean;
  dismissInfoBanner: () => void;
  exportNotebook: () => string; // JSON string
}

// ─── Helpers ──────────────────────────────────────────────

const STORAGE_KEY = 'truth-research-notebook';
const BANNER_KEY = 'truth-research-banner-dismissed';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage(): ResearchNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notes: ResearchNote[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn('[ResearchStore] localStorage save failed:', e);
  }
}

function loadBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BANNER_KEY) === 'true';
}

// ─── Store ────────────────────────────────────────────────

export const useResearchStore = create<ResearchState>()(
  devtools(
    (set, get) => ({
      notes: loadFromStorage(),
      infoBannerDismissed: loadBannerDismissed(),

      saveToNotebook: (noteData) => {
        const note: ResearchNote = {
          ...noteData,
          id: generateId(),
          savedAt: new Date().toISOString(),
        };
        const updated = [note, ...get().notes];
        saveToStorage(updated);
        set({ notes: updated });
      },

      removeFromNotebook: (id) => {
        const updated = get().notes.filter((n) => n.id !== id);
        saveToStorage(updated);
        set({ notes: updated });
      },

      updateNote: (id, updates) => {
        const updated = get().notes.map((n) =>
          n.id === id ? { ...n, ...updates } : n
        );
        saveToStorage(updated);
        set({ notes: updated });
      },

      clearNotebook: () => {
        saveToStorage([]);
        set({ notes: [] });
      },

      isInNotebook: (externalId, source) => {
        return get().notes.some(
          (n) => n.externalId === externalId && n.source === source
        );
      },

      dismissInfoBanner: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(BANNER_KEY, 'true');
        }
        set({ infoBannerDismissed: true });
      },

      exportNotebook: () => {
        const notes = get().notes;
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            noteCount: notes.length,
            notes,
          },
          null,
          2
        );
      },
    }),
    { name: 'research-store' }
  )
);
