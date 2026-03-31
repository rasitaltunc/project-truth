// ============================================
// PROJECT TRUTH: REALTIME HOOK
// apps/dashboard/src/hooks/useTruthRealtime.ts
// ============================================
// 🔧 FIX: Refs for callbacks to prevent infinite re-render loop
// ============================================

'use client';

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseReady } from '@/lib/supabaseClient';
import { useTruthStore, NetworkNode, NetworkLink } from '@/store/truthStore';

// ============================================
// TYPES
// ============================================
type EventType = 'INSERT' | 'UPDATE' | 'DELETE';

interface RealtimeEvent<T> {
  type: EventType;
  table: string;
  data: T;
  oldData?: T;
}

interface UseTruthRealtimeOptions {
  onNodeChange?: (event: RealtimeEvent<any>) => void;
  onLinkChange?: (event: RealtimeEvent<any>) => void;
  enabled?: boolean;
}

// ============================================
// TRANSFORM HELPERS
// ============================================
function transformRealtimeNode(node: any): NetworkNode {
  return {
    id: node.id,
    label: node.name,
    img: node.image_url,
    type: node.type || node.role,
    tier: node.tier,
    risk: node.risk,
    is_alive: node.is_alive,
    role: node.role,
    summary: node.summary,
  };
}

function transformRealtimeLink(link: any): NetworkLink {
  return {
    source: link.source_id,
    target: link.target_id,
    strength: link.strength,
    type: link.relationship_type,
    description: link.description,
  };
}

// ============================================
// HOOK
// ============================================
export function useTruthRealtime(options: UseTruthRealtimeOptions = {}) {
  const { enabled = true } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ⚡ USE REFS for callbacks - prevents infinite re-render loop!
  // Without refs: inline callbacks → new reference every render → useCallback changes →
  // effect re-runs → channel recreated → setRealtimeConnected → re-render → INFINITE LOOP
  const onNodeChangeRef = useRef(options.onNodeChange);
  const onLinkChangeRef = useRef(options.onLinkChange);
  onNodeChangeRef.current = options.onNodeChange;
  onLinkChangeRef.current = options.onLinkChange;

  // Store actions (these are stable from zustand, but ref for safety)
  const storeRef = useRef(useTruthStore.getState());
  storeRef.current = useTruthStore.getState();

  // Setup subscription - ONLY depends on `enabled`
  useEffect(() => {
    if (!enabled || !isSupabaseReady() || !supabase) {
      return;
    }

    const channel = supabase
      .channel('truth-network-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nodes' },
        (payload: any) => {
          const eventType = payload.eventType as EventType;
          const newData = payload.new;
          const oldData = payload.old;

          const transformedNew = newData ? transformRealtimeNode(newData) : null;
          const transformedOld = oldData ? transformRealtimeNode(oldData) : null;

          // Update zustand store
          const store = storeRef.current;
          switch (eventType) {
            case 'INSERT':
              if (transformedNew) store.addNode(transformedNew);
              break;
            case 'UPDATE':
              if (transformedNew) store.updateNode(transformedNew.id, transformedNew);
              break;
            case 'DELETE':
              if (transformedOld) store.removeNode(transformedOld.id);
              break;
          }

          // Call external callback via ref (no re-render trigger)
          onNodeChangeRef.current?.({
            type: eventType,
            table: 'nodes',
            data: transformedNew || transformedOld,
            oldData: eventType === 'UPDATE' ? transformedOld : undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'links' },
        (payload: any) => {
          const eventType = payload.eventType as EventType;
          const newData = payload.new;
          const oldData = payload.old;

          const transformedNew = newData ? transformRealtimeLink(newData) : null;
          const transformedOld = oldData ? transformRealtimeLink(oldData) : null;

          const store = storeRef.current;
          switch (eventType) {
            case 'INSERT':
              if (transformedNew) store.addLink(transformedNew);
              break;
            case 'DELETE':
              if (transformedOld) store.removeLink(transformedOld.source, transformedOld.target);
              break;
          }

          onLinkChangeRef.current?.({
            type: eventType,
            table: 'links',
            data: transformedNew || transformedOld,
            oldData: eventType === 'UPDATE' ? transformedOld : undefined,
          });
        }
      )
      .subscribe((status) => {
        // Use getState/setState directly to avoid re-render trigger
        useTruthStore.getState().setRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        useTruthStore.getState().setRealtimeConnected(false);
      }
    };
  }, [enabled]); // ✅ ONLY depends on `enabled` - no callback deps!

  return {
    isConnected: useTruthStore((state) => state.isRealtimeConnected),
    channel: channelRef.current,
  };
}

export default useTruthRealtime;
