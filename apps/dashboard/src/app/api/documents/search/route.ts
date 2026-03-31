/**
 * /api/documents/search
 * GET: Federated search across external document providers + local Supabase
 * Uses real provider registry (ICIJ, OpenSanctions, CourtListener)
 * Falls back to local Supabase documents table if external providers return nothing
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { searchAll, getProviderStatus } from '@/lib/documentProviders';
import type { SourceType } from '@/lib/documentProviders/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  const blocked = applyRateLimit(req, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const networkId = searchParams.get('network_id');
    const providersParam = searchParams.get('providers');
    const providerFilter: SourceType[] | undefined = providersParam
      ? (providersParam.split(',') as SourceType[])
      : undefined;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // ── SECURITY: Input validation & sanitization ──
    // 1. Length limit — prevent DoS via absurdly long queries
    if (query.length > 200) {
      return NextResponse.json(
        { error: 'Query too long. Maximum 200 characters.' },
        { status: 400 }
      );
    }

    // 2. Sanitize query for PostgREST filter interpolation
    //    PostgREST .or() filter uses comma-separated conditions.
    //    Characters like , ( ) . could manipulate the filter syntax.
    //    Strip all PostgREST-special characters to prevent filter injection.
    const sanitizedQuery = query.replace(/[,().%\\]/g, ' ').trim();
    if (sanitizedQuery.length === 0) {
      return NextResponse.json(
        { error: 'Query contains only special characters' },
        { status: 400 }
      );
    }

    // 3. Limit parameter bounds
    const safeLimitRaw = parseInt(searchParams.get('limit') || '20');
    const safeLimit = Math.max(1, Math.min(safeLimitRaw, 100));

    // Get provider availability status for UI feedback
    const providerStatus = getProviderStatus();
    const availableProviders = Object.entries(providerStatus)
      .filter(([, available]) => available)
      .map(([name]) => name);

    // Search external providers in parallel
    let externalResults: Array<{
      externalId: string;
      title: string;
      description?: string;
      date?: string;
      source: string;
      url?: string;
      documentType: string;
      relevanceScore?: number;
      metadata?: Record<string, unknown>;
    }> = [];

    try {
      const results = await searchAll(sanitizedQuery, providerFilter);
      externalResults = results;
    } catch (err) {
      console.warn('External provider search failed:', err);
    }

    // Also search local Supabase documents (always, as a supplementary source)
    let localResults: Array<{
      externalId: string;
      title: string;
      description?: string;
      date?: string;
      source: string;
      url?: string;
      documentType: string;
      relevanceScore?: number;
      metadata?: Record<string, unknown>;
    }> = [];

    try {
      // SECURITY: Use sanitizedQuery (PostgREST-special chars stripped)
      let localQuery = supabaseAdmin
        .from('documents')
        .select('id, title, description, document_type, source_type, external_url, date_filed, date_uploaded, scan_status, metadata')
        .eq('is_public', true)
        .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
        .order('date_uploaded', { ascending: false })
        .limit(safeLimit);

      if (networkId) {
        localQuery = localQuery.eq('network_id', networkId);
      }

      const { data: localDocs } = await localQuery;

      if (localDocs && localDocs.length > 0) {
        localResults = localDocs.map((doc: Record<string, unknown>) => ({
          externalId: doc.id as string,
          title: doc.title as string,
          description: (doc.description as string) || `${doc.document_type} — ${doc.source_type}`,
          date: (doc.date_filed as string) || (doc.date_uploaded as string),
          source: 'local' as const,
          url: doc.external_url as string | undefined,
          documentType: doc.document_type as string,
          relevanceScore: 0.6, // Local results have moderate relevance
          metadata: {
            scan_status: doc.scan_status,
            source_type: doc.source_type,
            ...(doc.metadata as Record<string, unknown> || {}),
          },
        }));
      }
    } catch (localErr) {
      // Local search is optional — don't fail the whole request
      console.warn('Local document search failed:', localErr);
    }

    // Merge: external first (higher relevance), then local
    const allResults = [...externalResults, ...localResults];

    // Deduplicate by title (case-insensitive)
    const seen = new Set<string>();
    const deduped = allResults.filter((r) => {
      const key = r.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by relevance
    deduped.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return NextResponse.json({
      results: deduped.slice(0, safeLimit),
      providers_searched: availableProviders,
      local_results_count: localResults.length,
      external_results_count: externalResults.length,
      query,
    });
  } catch (error: any) {
    console.error('GET /api/documents/search error:', error?.message || error);
    // Return empty results instead of crashing
    return NextResponse.json({
      results: [],
      providers_searched: [],
      query: '',
      warning: 'Search encountered an error',
    });
  }
}
