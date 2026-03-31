import { http, HttpResponse } from 'msw';

/**
 * MSW Handlers — Sahte API Yanıtları
 *
 * Bu handler'lar E2E testlerde gerçek API'ler yerine çalışır.
 * Supabase, Groq ve diğer dış servislerin yerine geçer.
 *
 * Neden? Testler:
 * 1. Hızlı olmalı (gerçek API = yavaş)
 * 2. Tutarlı olmalı (gerçek veri = değişken)
 * 3. Ücretsiz olmalı (Groq kotası = sınırlı)
 * 4. Bağımsız olmalı (internet yoksa da çalışmalı)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';

// ─── Epstein Network Mock Data ──────────────────────────────
const mockNodes = [
  {
    id: 'node-001',
    name: 'Jeffrey Epstein',
    type: 'person',
    tier: 1,
    risk: 100,
    description: 'Financier convicted of sex trafficking',
    nationality: 'American',
    occupation: 'Financier',
    birth_date: '1953-01-20',
    death_date: '2019-08-10',
    verification_level: 'official',
    country_tags: ['USA', 'USVI'],
    image_url: null,
    network_id: 'epstein-network',
  },
  {
    id: 'node-002',
    name: 'Ghislaine Maxwell',
    type: 'person',
    tier: 1,
    risk: 95,
    description: 'Convicted of sex trafficking and conspiracy',
    nationality: 'British',
    occupation: 'Socialite',
    birth_date: '1961-12-25',
    death_date: null,
    verification_level: 'official',
    country_tags: ['USA', 'GBR', 'FRA'],
    image_url: null,
    network_id: 'epstein-network',
  },
  {
    id: 'node-003',
    name: 'Little St. James Island',
    type: 'location',
    tier: 2,
    risk: 80,
    description: 'Private island in the US Virgin Islands',
    nationality: null,
    occupation: null,
    birth_date: null,
    death_date: null,
    verification_level: 'official',
    country_tags: ['USVI'],
    image_url: null,
    network_id: 'epstein-network',
  },
];

const mockLinks = [
  {
    id: 'link-001',
    source_id: 'node-001',
    target_id: 'node-002',
    relationship: 'associate',
    description: 'Close associate and co-conspirator',
    evidence_type: 'court_record',
    confidence_level: 0.99,
    source_hierarchy: 'primary',
    evidence_count: 47,
    network_id: 'epstein-network',
  },
  {
    id: 'link-002',
    source_id: 'node-001',
    target_id: 'node-003',
    relationship: 'owner',
    description: 'Property owner',
    evidence_type: 'official_document',
    confidence_level: 0.99,
    source_hierarchy: 'primary',
    evidence_count: 12,
    network_id: 'epstein-network',
  },
];

const mockNetworks = [
  {
    id: 'epstein-network',
    name: 'Epstein Network',
    description: 'Jeffrey Epstein trafficking network investigation',
    node_count: 3,
    link_count: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// ─── Supabase REST API Handlers ─────────────────────────────
export const handlers = [
  // Networks list
  http.get(`${SUPABASE_URL}/rest/v1/networks`, () => {
    return HttpResponse.json(mockNetworks);
  }),

  // Nodes list (with query params)
  http.get(`${SUPABASE_URL}/rest/v1/nodes`, ({ request }) => {
    const url = new URL(request.url);
    const networkId = url.searchParams.get('network_id');
    const filtered = networkId
      ? mockNodes.filter(n => n.network_id === networkId)
      : mockNodes;
    return HttpResponse.json(filtered);
  }),

  // Links list
  http.get(`${SUPABASE_URL}/rest/v1/links`, ({ request }) => {
    const url = new URL(request.url);
    const networkId = url.searchParams.get('network_id');
    const filtered = networkId
      ? mockLinks.filter(l => l.network_id === networkId)
      : mockLinks;
    return HttpResponse.json(filtered);
  }),

  // Evidence archive
  http.get(`${SUPABASE_URL}/rest/v1/evidence_archive`, () => {
    return HttpResponse.json([]);
  }),

  // Node query stats
  http.get(`${SUPABASE_URL}/rest/v1/node_query_stats`, () => {
    return HttpResponse.json([]);
  }),

  // Investigations
  http.get(`${SUPABASE_URL}/rest/v1/investigations`, () => {
    return HttpResponse.json([]);
  }),

  // Supabase RPC calls
  http.post(`${SUPABASE_URL}/rest/v1/rpc/:functionName`, () => {
    return HttpResponse.json([]);
  }),

  // ─── Groq AI API ────────────────────────────────────────
  http.post('https://api.groq.com/openai/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'mock-chat-001',
      object: 'chat.completion',
      model: 'llama-3.3-70b-versatile',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              answer: 'This is a mock AI response for testing purposes.',
              highlightNodeIds: ['node-001'],
              annotations: [],
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
  }),

  // ─── Internal API Routes ───────────────────────────────
  // Chat endpoint
  http.post('/api/chat', () => {
    return HttpResponse.json({
      answer: 'This is a mock AI response for testing.',
      highlightNodeIds: ['node-001'],
      annotations: [],
    });
  }),

  // Node stats
  http.post('/api/node-stats', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/node-stats', () => {
    return HttpResponse.json([]);
  }),

  // Intent classify
  http.post('/api/intent-classify', () => {
    return HttpResponse.json({
      mode: 'full_network',
      confidence: 0.9,
      suggestMode: false,
    });
  }),

  // Daily question
  http.get('/api/daily-question', () => {
    return HttpResponse.json({
      question: 'What role did financial institutions play in the Epstein network?',
      category: 'finance',
    });
  }),

  // Gap analysis
  http.get('/api/node-stats/gaps', () => {
    return HttpResponse.json({
      gaps: [],
      suggestions: [],
    });
  }),

  // Documents
  http.get('/api/documents', () => {
    return HttpResponse.json([]);
  }),

  // Badge/reputation
  http.get('/api/badge', () => {
    return HttpResponse.json({
      tier: 1,
      reputation: 0,
      badges: [],
    });
  }),

  // Board layout
  http.get('/api/board', () => {
    return HttpResponse.json(null);
  }),
];
