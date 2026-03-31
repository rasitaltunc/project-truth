import { create } from 'zustand';

export interface ConnectionItem {
    id: string;
    label: string;
    type: string;
    strength: number;
    img?: string | null;
    tier?: number;
    role?: string;
}

export interface EvidenceItem {
    id: string;
    title: string;
    evidence_type: string;
    description?: string;
    source_name: string;
    source_url?: string;
    source_date?: string;
    verification_status: string;
    is_primary_source?: boolean;
    country_tags?: string[];
    language?: string;
}

export interface TimelineEvent {
    id: string;
    event_date: string;
    event_type: string; // birth, death, arrest, conviction, meeting, travel, legal, media, other
    title: string;
    description?: string;
    location?: string;
    source_url?: string;
    is_verified?: boolean;
    importance?: string; // critical, high, normal, low
}

export interface EvidenceNode {
    id: string;
    label: string;
    img?: string | null;
    status: string;
    role: string;
    risk: number;
    tier?: number;
    connections?: ConnectionItem[];  // Array of connections
    evidence?: EvidenceItem[];       // Array of evidence
    timeline?: TimelineEvent[];      // Array of timeline events
    summary?: string;
    // New fields for Archive Modal
    verification_level?: 'unverified' | 'community' | 'journalist' | 'official';
    country_tags?: string[];
    nationality?: string;
    occupation?: string;
    birth_date?: string;
    death_date?: string;
    is_alive?: boolean;
}

interface AppState {
    isArchiveOpen: boolean;
    activeEvidence: EvidenceNode | null;
    openArchive: (node: any) => void;
    closeArchive: () => void;
}

export const useStore = create<AppState>((set) => ({
    isArchiveOpen: false,
    activeEvidence: null,
    openArchive: (node) => {
        set({
            isArchiveOpen: true,
            activeEvidence: {
                id: node.id,
                label: node.label,
                img: node.img,
                status: node.is_alive === false ? 'DECEASED' : 'ALIVE',
                role: node.type || node.role || 'UNKNOWN',
                risk: node.risk ?? 50,
                tier: node.tier,
                connections: node.connections || [],
                evidence: node.evidence || [],
                timeline: node.timeline || [],
                summary: node.summary || null,
                verification_level: node.verification_level || 'unverified',
                country_tags: node.country_tags || [],
                nationality: node.nationality,
                occupation: node.occupation,
                birth_date: node.birth_date,
                death_date: node.death_date,
                is_alive: node.is_alive,
            }
        });
    },
    closeArchive: () => {
        set({ isArchiveOpen: false, activeEvidence: null });
    },
}));
