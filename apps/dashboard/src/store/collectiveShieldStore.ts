// ═══════════════════════════════════════════════════════
// SPRINT 13: KOLEKTİF KALKAN STORE
// Zustand — local-first, API-synced
// ═══════════════════════════════════════════════════════
//
// ⚠️ SECURITY TODO CST1: Recovery Key Exposure
// createCollectiveShield() fonksiyonu AES-256 master key'i (recoveryKey)
// doğrudan return ediyor. Bu key:
// 1. Zustand state'te kalıyor (DevTools'da görünür)
// 2. Tarayıcı belleğinde düz metin olarak duruyor
// 3. console.log ile sızabilir
//
// İdeal çözüm:
// 1. Key'i sadece bir kez, modal'da göster (clipboard copy butonu)
// 2. Modal kapandıktan sonra state'ten SİL (set({ recoveryKey: null }))
// 3. Key'i asla localStorage/sessionStorage'a yazma
// 4. Mümkünse key'i Uint8Array olarak tut, string'e çevirme
// Öncelik: Yüksek (release öncesi en az modal-only gösterim yapılmalı)
//

import { create } from 'zustand';
import { shamirSplit, shamirCombine, createProofOfLifeHash, type ShamirShard } from '@/lib/shamir';
import { generateEncryptionKey, exportKey, encryptData, hashData } from '@/lib/crypto';

// ─── Types ──────────────────────────────────────────────

export interface CollectiveDMS {
  id: string;
  name: string;
  description?: string;
  status: 'pending_guarantors' | 'active' | 'silent_alarm' | 'yellow_alarm' | 'red_alarm' | 'paused' | 'cancelled' | 'recovered';
  total_shards: number;
  threshold: number;
  checkin_interval_hours: number;
  last_checkin: string;
  approved_guarantors: number;
  required_guarantors: number;
  country_code?: string;
  risk_score?: number;
  created_at: string;
  updated_at: string;
  triggered_at?: string;
  silent_alarm_at?: string;
  yellow_alarm_at?: string;
  red_alarm_at?: string;
}

export interface HeldShard {
  shard_id: string;
  collective_dms_id: string;
  dms_name: string;
  dms_owner_name: string;
  dms_status: string;
  shard_x: number;
  is_guarantor: boolean;
  guarantor_approved: boolean;
  has_verified_content: boolean;
  status: string;
  created_at: string;
}

export interface CollectiveAlert {
  id: string;
  collective_dms_id: string;
  alert_level: 'silent' | 'yellow' | 'red' | 'resolved' | 'false_alarm';
  trigger_reason: string;
  missed_checkin_hours?: number;
  guarantor_votes: Array<{ fingerprint: string; vote: string; voted_at: string }>;
  votes_unreachable: number;
  votes_safe: number;
  created_at: string;
}

export interface GuarantorCandidate {
  fingerprint: string;
  display_name: string;
}

interface CollectiveShieldState {
  // Data
  ownDms: CollectiveDMS[];
  heldShards: HeldShard[];
  chainLength: number;
  activeAlerts: CollectiveAlert[];

  // UI State
  isLoading: boolean;
  error: string | null;
  panelOpen: boolean;
  activeTab: 'my_shields' | 'held_shards' | 'alerts';

  // Create flow
  isCreating: boolean;
  createStep: 'form' | 'guarantors' | 'distributing' | 'done';

  // Actions
  fetchAll: (fingerprint: string) => Promise<void>;
  createCollectiveShield: (params: {
    fingerprint: string;
    displayName: string;
    content: string;
    name: string;
    description?: string;
    totalShards?: number;
    threshold?: number;
    checkinIntervalHours?: number;
    countryCode?: string;
    guarantors: GuarantorCandidate[];
    allHolders: GuarantorCandidate[];
  }) => Promise<{ success: boolean; dmsId?: string; recoveryKey?: string; error?: string }>;
  checkIn: (fingerprint: string, dmsId: string) => Promise<void>;
  approveGuarantor: (fingerprint: string, dmsId: string) => Promise<void>;
  voteOnAlert: (fingerprint: string, alertId: string, vote: 'unreachable' | 'safe') => Promise<void>;
  verifyContent: (fingerprint: string, dmsId: string) => Promise<void>;
  pauseShield: (fingerprint: string, dmsId: string) => Promise<void>;
  resumeShield: (fingerprint: string, dmsId: string) => Promise<void>;
  cancelShield: (fingerprint: string, dmsId: string) => Promise<void>;

  // UI Actions
  setPanelOpen: (open: boolean) => void;
  setActiveTab: (tab: 'my_shields' | 'held_shards' | 'alerts') => void;
  clearError: () => void;
}

// ─── Store ──────────────────────────────────────────────

export const useCollectiveShieldStore = create<CollectiveShieldState>((set, get) => ({
  // Initial state
  ownDms: [],
  heldShards: [],
  chainLength: 0,
  activeAlerts: [],
  isLoading: false,
  error: null,
  panelOpen: false,
  activeTab: 'my_shields',
  isCreating: false,
  createStep: 'form',

  // ═══ FETCH ALL DATA ═══
  fetchAll: async (fingerprint) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/collective-dms', {
        headers: { 'X-User-Fingerprint': fingerprint },
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Veri alınamadı');

      set({
        ownDms: data.own_dms || [],
        heldShards: data.held_shards || [],
        chainLength: data.chain_length || 0,
        activeAlerts: data.active_alerts || [],
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  // ═══ CREATE COLLECTIVE SHIELD ═══
  createCollectiveShield: async (params) => {
    set({ isCreating: true, createStep: 'form', error: null });

    try {
      const {
        fingerprint, displayName, content, name, description,
        totalShards = 10, threshold = 6, checkinIntervalHours = 168,
        countryCode, guarantors, allHolders,
      } = params;

      // Adım 1: İçeriği şifrele
      set({ createStep: 'guarantors' });
      const key = await generateEncryptionKey();
      const keyBase64 = await exportKey(key);
      const encrypted = await encryptData(content, key);
      const contentHash = await hashData(content);

      // Adım 2: Key'i Shamir ile parçala
      set({ createStep: 'distributing' });
      const shards = shamirSplit(keyBase64, totalShards, threshold);

      // Shard dağıtımı: kefiller + rastgele üyeler
      const guarantorFingerprints = guarantors.map(g => g.fingerprint);
      const shardDistribution = allHolders.slice(0, totalShards).map((holder, i) => ({
        fingerprint: holder.fingerprint,
        display_name: holder.display_name,
        shard_x: shards[i].x,
        shard_data: shards[i].data,
        is_guarantor: guarantorFingerprints.includes(holder.fingerprint),
      }));

      // Adım 3: API'ye gönder
      const res = await fetch('/api/collective-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          fingerprint,
          display_name: displayName,
          encrypted_content: JSON.stringify(encrypted),
          content_hash: contentHash,
          name,
          description,
          total_shards: totalShards,
          threshold,
          checkin_interval_hours: checkinIntervalHours,
          country_code: countryCode,
          guarantor_fingerprints: guarantorFingerprints,
          shard_distribution: shardDistribution,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      set({ createStep: 'done', isCreating: false });

      // Refresh
      await get().fetchAll(fingerprint);

      return {
        success: true,
        dmsId: data.dms_id,
        recoveryKey: keyBase64, // Kullanıcıya göster, tek şans!
      };
    } catch (err: any) {
      set({ isCreating: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  // ═══ CHECK-IN ═══
  checkIn: async (fingerprint, dmsId) => {
    try {
      // SECURITY CST2: Client artık hash hesaplamıyor.
      // Server-side check-in handler:
      // 1. Son bloğun gerçek hash'ini DB'den çeker
      // 2. Yeni blok hash'ini server-side hesaplar (createProofOfLifeHash)
      // 3. Client-supplied block_hash ve prev_hash KULLANILMAZ
      // Bu sayede client manipülasyonu imkansız.
      const res = await fetch('/api/collective-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          fingerprint,
          dms_id: dmsId,
          // block_hash ve prev_hash artık gönderilmiyor — server hesaplar
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // Refresh
      await get().fetchAll(fingerprint);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ═══ APPROVE GUARANTOR ═══
  approveGuarantor: async (fingerprint, dmsId) => {
    try {
      const res = await fetch('/api/collective-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_guarantor', fingerprint, dms_id: dmsId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await get().fetchAll(fingerprint);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ═══ VOTE ON ALERT ═══
  voteOnAlert: async (fingerprint, alertId, vote) => {
    try {
      const res = await fetch('/api/collective-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', fingerprint, alert_id: alertId, vote }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await get().fetchAll(fingerprint);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ═══ VERIFY CONTENT ═══
  verifyContent: async (fingerprint, dmsId) => {
    try {
      const res = await fetch('/api/collective-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_content', fingerprint, dms_id: dmsId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await get().fetchAll(fingerprint);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ═══ PAUSE / RESUME / CANCEL ═══
  pauseShield: async (fingerprint, dmsId) => {
    const res = await fetch('/api/collective-dms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', fingerprint, dms_id: dmsId }),
    });
    if (res.ok) await get().fetchAll(fingerprint);
  },

  resumeShield: async (fingerprint, dmsId) => {
    const res = await fetch('/api/collective-dms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume', fingerprint, dms_id: dmsId }),
    });
    if (res.ok) await get().fetchAll(fingerprint);
  },

  cancelShield: async (fingerprint, dmsId) => {
    const res = await fetch('/api/collective-dms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', fingerprint, dms_id: dmsId }),
    });
    if (res.ok) await get().fetchAll(fingerprint);
  },

  // ═══ UI ACTIONS ═══
  setPanelOpen: (open) => set({ panelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearError: () => set({ error: null }),
}));

// ─── Helpers ────────────────────────────────────────────

export function getStatusLabel(status: string): { text: string; color: string } {
  const map: Record<string, { text: string; color: string }> = {
    pending_guarantors: { text: 'KEFİL BEKLENİYOR', color: '#f59e0b' },
    active: { text: 'AKTİF', color: '#22c55e' },
    silent_alarm: { text: 'SESSİZ ALARM', color: '#f59e0b' },
    yellow_alarm: { text: 'SARI ALARM', color: '#eab308' },
    red_alarm: { text: 'KIRMIZI ALARM', color: '#ef4444' },
    paused: { text: 'DURAKLATILDI', color: '#6b7280' },
    cancelled: { text: 'İPTAL', color: '#6b7280' },
    recovered: { text: 'KURTARILDI', color: '#8b5cf6' },
  };
  return map[status] || { text: status.toUpperCase(), color: '#6b7280' };
}

export function getAlertLevelLabel(level: string): { text: string; color: string; icon: string } {
  const map: Record<string, { text: string; color: string; icon: string }> = {
    silent: { text: 'SESSİZ ALARM', color: '#f59e0b', icon: 'bell' },
    yellow: { text: 'SARI ALARM', color: '#eab308', icon: 'alert-triangle' },
    red: { text: 'KIRMIZI ALARM', color: '#ef4444', icon: 'alert-octagon' },
    resolved: { text: 'ÇÖZÜLDÜ', color: '#22c55e', icon: 'check-circle' },
    false_alarm: { text: 'SAHTE ALARM', color: '#6b7280', icon: 'x-circle' },
  };
  return map[level] || { text: level.toUpperCase(), color: '#6b7280', icon: 'help-circle' };
}

export function getTimeUntilNextCheckin(dms: CollectiveDMS): { hours: number; isOverdue: boolean } {
  const lastCheckin = new Date(dms.last_checkin).getTime();
  const deadline = lastCheckin + dms.checkin_interval_hours * 60 * 60 * 1000;
  const now = Date.now();
  const hoursLeft = Math.floor((deadline - now) / (1000 * 60 * 60));
  return { hours: Math.abs(hoursLeft), isOverdue: hoursLeft < 0 };
}
