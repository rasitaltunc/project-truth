// ==========================================
// PROJECT TRUTH - COURTLISTENER SEARCH
// GET /api/ingestion/search?q=epstein&limit=20
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, GENERAL_RATE_LIMIT } from '@/lib/rateLimit';
import { safeErrorResponse } from '@/lib/errorHandler';
import { safeLimit } from '@/lib/inputSanitizer';
import {
  searchDocuments,
  searchEpsteinDocuments,
  getGiuffreMaxwellDocuments,
  getJanuary2024Unsealings,
} from '@/lib/ingestion/court-listener';

export async function GET(request: NextRequest) {
  const blocked = applyRateLimit(request, GENERAL_RATE_LIMIT);
  if (blocked) return blocked;
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const preset = searchParams.get('preset');
  const limit = safeLimit(searchParams.get('limit'));

  try {
    let results;

    // Preset searches
    if (preset === 'giuffre-maxwell') {
      results = await getGiuffreMaxwellDocuments(limit);
      return NextResponse.json({
        success: true,
        preset: 'Giuffre v. Maxwell',
        count: results.length,
        documents: results,
      });
    }

    if (preset === 'epstein') {
      results = await searchEpsteinDocuments(limit);
      return NextResponse.json({
        success: true,
        preset: 'Jeffrey Epstein (all)',
        count: results.length,
        documents: results,
      });
    }

    if (preset === 'jan2024') {
      results = await getJanuary2024Unsealings();
      return NextResponse.json({
        success: true,
        preset: 'January 2024 Unsealings',
        count: results.length,
        documents: results,
      });
    }

    // Custom query
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing query parameter. Use ?q=search_term or ?preset=giuffre-maxwell|epstein|jan2024',
      }, { status: 400 });
    }

    const searchResult = await searchDocuments(query, limit);

    return NextResponse.json({
      success: true,
      query,
      totalCount: searchResult.count,
      returnedCount: searchResult.results.length,
      documents: searchResult.results,
      pagination: {
        next: searchResult.next,
        previous: searchResult.previous,
      },
    });

  } catch (error) {
    console.error('Search error:', error);
    return safeErrorResponse('GET /api/ingestion/search', error);
  }
}
