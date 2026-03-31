/**
 * /api/documents/bulk-list
 * GET: Maxwell davasının tüm RECAP belgelerini listele (indirmeden)
 *
 * Bu endpoint belgeleri İNDİRMEZ — sadece listeler.
 * İndirme kararı insana aittir (Truth Anayasası: kontrollü süreç).
 *
 * Sprint R3: "Cephane" (Hedefli Belge Tarama)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  listDocketEntries,
  generateBulkReport,
  MAXWELL_CASE,
} from '@/lib/courtlistenerBulk';

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.COURTLISTENER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'COURTLISTENER_API_KEY not configured' },
        { status: 503 }
      );
    }

    // Query params
    const { searchParams } = new URL(req.url);
    const docketId = parseInt(searchParams.get('docketId') || String(MAXWELL_CASE.docketId), 10);

    console.log(`[BulkList] Starting RECAP document listing for docket ${docketId}...`);

    const result = await listDocketEntries(
      apiKey,
      docketId,
      (fetched) => {
        if (fetched % 50 === 0) {
          console.log(`[BulkList] ${fetched} documents listed so far...`);
        }
      }
    );

    const report = generateBulkReport(result);
    console.log(report);

    // İndirilebilir belgeleri filtrele
    const available = result.documents.filter(d => d.isAvailable);
    const unavailable = result.documents.filter(d => !d.isAvailable);

    return NextResponse.json({
      case: MAXWELL_CASE,
      summary: {
        totalDocuments: result.totalFound,
        availableForDownload: available.length,
        unavailable: unavailable.length,
        estimatedSizeMB: Math.round(
          available.reduce((sum, d) => sum + (d.fileSize || 0), 0) / (1024 * 1024) * 10
        ) / 10,
        fetchDurationMs: result.durationMs,
        pagesFetched: result.pagesFetched,
        errors: result.errors,
      },
      // Sadece indirilebilir belgeleri döndür
      documents: available.map(d => ({
        recapDocId: d.recapDocId,
        entryNumber: d.entryNumber,
        description: d.description,
        dateFiled: d.dateFiled,
        fileSize: d.fileSize,
        shortDescription: d.shortDescription,
        url: d.absoluteUrl,
      })),
    });
  } catch (error) {
    console.error('[BulkList] Error:', error);
    return NextResponse.json(
      { error: 'Bulk listing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
