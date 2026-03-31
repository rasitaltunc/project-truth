'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTruthRealtime } from '@/hooks/useTruthRealtime';

/**
 * Data interface for truth page
 */
export interface TruthData {
  nodes: any[];
  setNodes: (value: any[]) => void;
  links: any[];
  setLinks: (value: any[]) => void;
  loading: boolean;
  activeNetworkId: string;
  isRealtimeConnected: boolean;
}

/**
 * Hook to manage data fetching and realtime subscriptions
 * Extracted from truth/page.tsx lines 125-127, 241-263, 227-238, 158-162
 */
export function useTruthData(): TruthData {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📋 Reliable networkId — works for both real DB and mock data
  const activeNetworkId = useMemo(() => {
    const fromNode = nodes.find(n => n.network_id)?.network_id;
    return fromNode || 'epstein-network'; // fallback for mock data
  }, [nodes]);

  // 🔴 REALTIME
  const { isConnected: isRealtimeConnected } = useTruthRealtime({
    enabled: true,
    onNodeChange: (event) => {
      if (event.type === 'INSERT' && event.data) setNodes(prev => [...prev, event.data]);
      else if (event.type === 'UPDATE' && event.data) setNodes(prev => prev.map(n => n.id === event.data.id ? event.data : n));
      else if (event.type === 'DELETE' && event.data) setNodes(prev => prev.filter(n => n.id !== event.data.id));
    },
    onLinkChange: (event) => {
      if (event.type === 'INSERT' && event.data) setLinks(prev => [...prev, event.data]);
      else if (event.type === 'DELETE' && event.data) setLinks(prev => prev.filter(l => !(l.source === event.data.source && l.target === event.data.target)));
    },
  });

  // DATA FETCH (with 5s safety timeout)
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.warn('⏱️ API timeout - force loading off');
      setLoading(false);
    }, 5000);

    fetch('/api/truth')
      .then(res => res.json())
      .then(data => {
        clearTimeout(safetyTimeout);
        setNodes(data.nodes || []);
        setLinks(data.links || []);
        setLoading(false);
      })
      .catch(e => {
        clearTimeout(safetyTimeout);
        console.error('API Error:', e);
        setLoading(false);
      });

    return () => clearTimeout(safetyTimeout);
  }, []);

  return {
    nodes,
    setNodes,
    links,
    setLinks,
    loading,
    activeNetworkId,
    isRealtimeConnected,
  };
}
