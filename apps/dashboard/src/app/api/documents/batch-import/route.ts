/**
 * /api/documents/batch-import
 *
 * ═══ DEVRE DIŞI — TEMİZ BAŞLANGIÇ POLİTİKASI (2026-03-23) ═══
 *
 * Metadata-only import devre dışı bırakıldı.
 * Sebep: Dosyasız belgeler sistemi kirletir. OCR yapılamaz, scoring engine
 * çalışamaz, HalluGraph doğrulama yapamaz, kullanıcı orijinal belgeyi göremez.
 *
 * Truth Anayasası #8: "Yanlış veri, eksik veriden her zaman daha tehlikelidir."
 *
 * Belge eklemenin TEK yolu: /api/documents/manual-upload
 * → Gerçek dosya yüklenmeli → Dezenfeksiyon → OCR → Tarama → Scoring → Doğrulama
 */

import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// DISABLED — Both GET and POST return 410 Gone
// ═══════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json(
    {
      error: 'ENDPOINT_DISABLED',
      message: 'Batch import devre dışı bırakıldı. Temiz Başlangıç Politikası: dosyasız belge kabul edilmez.',
      reason: 'Metadata-only belgeler sistemi kirletir. OCR, scoring, HalluGraph hiçbiri çalışamaz.',
      alternative: '/api/documents/manual-upload',
      policy: 'Truth Anayasası #8: Yanlış veri, eksik veriden her zaman daha tehlikelidir.',
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'ENDPOINT_DISABLED',
      message: 'Batch import devre dışı bırakıldı. Temiz Başlangıç Politikası: dosyasız belge kabul edilmez.',
      reason: 'Metadata-only belgeler sistemi kirletir. OCR, scoring, HalluGraph hiçbiri çalışamaz.',
      alternative: '/api/documents/manual-upload',
      policy: 'Truth Anayasası #8: Yanlış veri, eksik veriden her zaman daha tehlikelidir.',
    },
    { status: 410 }
  );
}

// ═══════════════════════════════════════════════════
// LEGACY CODE BELOW — kept as comment for reference
// Document type classifier functions preserved for
// future use when real file-based batch import is built (R3 sprint).
// ═══════════════════════════════════════════════════

/*
LEGACY INTERFACES & FUNCTIONS (commented out):

interface CourtListenerDoc {
  recapDocId: number; entryNumber: number; description: string;
  dateFiled: string | null; fileSize: number | null;
  shortDescription: string | null; url: string;
}

interface CaseInfo {
  docketId: number; docketNumber: string; caseName: string;
  court: string; courtId: string; judge: string;
}

classifyDocumentType(doc) — Maps description keywords to document_type
classifySubCategory(doc) — Maps description keywords to sub_category
calculatePriority(doc) — Priority scoring (indictment=98, transcript=95, etc.)
buildTitle(doc, caseInfo) — Builds display title from shortDescription/description

Full source preserved in git history: commit before 2026-03-23
*/
