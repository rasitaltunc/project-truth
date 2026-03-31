/**
 * CourtListener RECAP Toplu İndirme Modülü
 * Sprint R3 — "Cephane" (Hedefli Belge Tarama)
 *
 * TRUTH ANAYASASI:
 * - Sadece kamuya açık belgeler indirilir (RECAP Archive = zaten herkese açık)
 * - Her belgenin kaynağı, tarihi ve CourtListener ID'si kaydedilir
 * - Mühürlü (sealed) belgeler ASLA indirilmeye çalışılmaz
 *
 * Hedef: United States v. Ghislaine Maxwell
 * - SDNY Docket: 1:20-cr-00330
 * - CourtListener Docket ID: 17318376
 * - Hakim: Alison J. Nathan
 *
 * Rate Limit: 5000 req/saat (Token auth ile)
 * Maliyet: $0 (RECAP Archive ücretsiz)
 */

// ─── Types ────────────────────────────────────────────

export interface RECAPDocument {
  /** CourtListener RECAP document ID */
  recapDocId: number;
  /** Docket entry number */
  entryNumber: number | null;
  /** Filing description */
  description: string;
  /** Filing date (YYYY-MM-DD) */
  dateFiled: string | null;
  /** Court name */
  court: string;
  /** Docket number (e.g., "1:20-cr-00330") */
  docketNumber: string;
  /** Case name */
  caseName: string;
  /** Direct URL to document on CourtListener */
  absoluteUrl: string;
  /** PDF file size in bytes (null if unknown) */
  fileSize: number | null;
  /** Whether the PDF is available for download */
  isAvailable: boolean;
  /** Short description (filing type) */
  shortDescription: string | null;
}

export interface BulkFetchResult {
  /** Total documents found */
  totalFound: number;
  /** Documents successfully listed */
  documents: RECAPDocument[];
  /** Number of pages fetched */
  pagesFetched: number;
  /** Errors during fetch */
  errors: string[];
  /** Fetch duration (ms) */
  durationMs: number;
}

export interface DocumentDownloadResult {
  /** RECAP document ID */
  recapDocId: number;
  /** Downloaded content (text for opinions, null for PDFs) */
  textContent: string | null;
  /** PDF buffer (for actual PDF files) */
  pdfBuffer: Buffer | null;
  /** Was download successful */
  success: boolean;
  /** Error message if failed */
  error: string | null;
  /** Content type returned by server */
  contentType: string | null;
  /** File size in bytes */
  size: number;
}

// ─── Constants ────────────────────────────────────────

const COURTLISTENER_BASE = 'https://www.courtlistener.com';
const API_BASE = `${COURTLISTENER_BASE}/api/rest/v4`;

// Maxwell dava bilgileri — araştırmayla doğrulanmış
export const MAXWELL_CASE = {
  docketId: 17318376,
  docketNumber: '1:20-cr-00330',
  caseName: 'United States v. Maxwell',
  court: 'Southern District of New York',
  courtId: 'nysd',
  judge: 'Alison J. Nathan',
} as const;

// Rate limit: 5000/saat = ~83/dakika, güvenli tarafta kalmak için 60/dakika
const REQUESTS_PER_MINUTE = 60;
const REQUEST_INTERVAL_MS = Math.ceil(60_000 / REQUESTS_PER_MINUTE); // ~1000ms

// ─── Rate Limiter ─────────────────────────────────────

let lastRequestTime = 0;

async function rateLimitedFetch(
  url: string,
  apiKey: string,
  timeoutMs: number = 15_000,
): Promise<Response> {
  // Minimum bekleme süresi
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    // 429 Too Many Requests — bekle ve tekrar dene
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      console.warn(`[CourtListener] Rate limited. Waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      lastRequestTime = Date.now();
      // Tek retry
      return fetch(url, {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Accept': 'application/json',
        },
      });
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── RECAP Document List ──────────────────────────────

/**
 * Maxwell davasının tüm RECAP belgelerini listele.
 *
 * CourtListener API v4: type=rd (RECAP Documents — düz liste)
 * Sayfalama ile tüm sonuçları toplar.
 *
 * @param apiKey — CourtListener API Token
 * @param maxPages — Maksimum sayfa sayısı (güvenlik sınırı)
 * @param onProgress — İlerleme callback'i
 */
export async function listMaxwellDocuments(
  apiKey: string,
  maxPages: number = 50,
  onProgress?: (page: number, totalSoFar: number) => void,
): Promise<BulkFetchResult> {
  const startTime = Date.now();
  const documents: RECAPDocument[] = [];
  const errors: string[] = [];
  let totalFound = 0;
  let pagesFetched = 0;

  try {
    // İlk sayfa
    let url: string | null = `${API_BASE}/search/?` + new URLSearchParams({
      q: `docket_id:${MAXWELL_CASE.docketId}`,
      type: 'rd',
      format: 'json',
      page_size: '20', // CourtListener max page size for search
      order_by: 'dateFiled asc',
    }).toString();

    while (url && pagesFetched < maxPages) {
      pagesFetched++;

      try {
        const response = await rateLimitedFetch(url, apiKey);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          errors.push(`Sayfa ${pagesFetched}: HTTP ${response.status} — ${errorText.slice(0, 200)}`);
          break;
        }

        const data = await response.json() as {
          count?: number;
          next?: string | null;
          results?: Array<Record<string, unknown>>;
        };

        totalFound = data.count || totalFound;

        if (data.results) {
          for (const result of data.results) {
            const doc = parseRECAPResult(result);
            if (doc) {
              documents.push(doc);
            }
          }
        }

        onProgress?.(pagesFetched, documents.length);

        // Sonraki sayfa
        url = data.next || null;

      } catch (err) {
        const error = err as Error;
        errors.push(`Sayfa ${pagesFetched}: ${error.message}`);
        // Devam et — tek sayfa hatası pipeline'ı durdurmasın
        break; // Ama ağ hatası ise dur (next URL bozuk olabilir)
      }
    }
  } catch (err) {
    const error = err as Error;
    errors.push(`Genel hata: ${error.message}`);
  }

  return {
    totalFound,
    documents,
    pagesFetched,
    errors,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Belirli bir docket'ın tüm RECAP belgelerini Search API ile çek.
 *
 * NOT: docket-entries endpoint'i kısıtlı erişimli (403).
 * Search API type=rd herkese açık ve aynı veriyi döndürür.
 *
 * Strateji: Hem docket_id ile, hem case name ile arama yap.
 * İkisini birleştir ve deduplicate et.
 */
export async function listDocketEntries(
  apiKey: string,
  docketId: number = MAXWELL_CASE.docketId,
  onProgress?: (fetched: number) => void,
): Promise<BulkFetchResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Strateji 1: docket_id ile arama (en kesin)
  console.log(`[BulkList] Strateji 1: docket_id:${docketId} ile arama...`);
  const result1 = await listMaxwellDocuments(
    apiKey,
    50,
    (page, total) => onProgress?.(total),
  );
  errors.push(...result1.errors);

  // Strateji 2: case name ile arama (docket_id sonuç vermezse)
  if (result1.documents.length === 0) {
    console.log('[BulkList] docket_id sonuç vermedi, case name ile deneniyor...');

    const searchQueries = [
      'Maxwell',
      '"United States v. Maxwell"',
      '"Ghislaine Maxwell" SDNY',
    ];

    for (const query of searchQueries) {
      try {
        const url = `${API_BASE}/search/?` + new URLSearchParams({
          q: query,
          type: 'rd',
          format: 'json',
          page_size: '20',
          court: 'nysd',
        }).toString();

        const response = await rateLimitedFetch(url, apiKey);

        if (response.ok) {
          const data = await response.json() as {
            count?: number;
            next?: string | null;
            results?: Array<Record<string, unknown>>;
          };

          if (data.results && data.results.length > 0) {
            console.log(`[BulkList] "${query}" ile ${data.count || data.results.length} sonuç bulundu`);

            const docs: RECAPDocument[] = [];
            for (const r of data.results) {
              const doc = parseRECAPResult(r);
              if (doc) docs.push(doc);
            }

            // Sayfalama ile devam
            let nextUrl = data.next;
            let pageCount = 1;
            while (nextUrl && pageCount < 50) {
              pageCount++;
              try {
                const nextResp = await rateLimitedFetch(nextUrl, apiKey);
                if (!nextResp.ok) break;
                const nextData = await nextResp.json() as {
                  next?: string | null;
                  results?: Array<Record<string, unknown>>;
                };
                if (nextData.results) {
                  for (const r of nextData.results) {
                    const doc = parseRECAPResult(r);
                    if (doc) docs.push(doc);
                  }
                }
                onProgress?.(docs.length);
                nextUrl = nextData.next || null;
              } catch {
                break;
              }
            }

            if (docs.length > 0) {
              return {
                totalFound: data.count || docs.length,
                documents: docs,
                pagesFetched: pageCount,
                errors,
                durationMs: Date.now() - startTime,
              };
            }
          }
        } else {
          errors.push(`Search "${query}": HTTP ${response.status}`);
        }
      } catch (err) {
        errors.push(`Search "${query}": ${(err as Error).message}`);
      }
    }
  }

  // Strateji 3: Opinions (type=o) ile dene — PDF olmasa da metin var
  if (result1.documents.length === 0) {
    console.log('[BulkList] RECAP sonuç yok, opinions (type=o) deneniyor...');
    try {
      const url = `${API_BASE}/search/?` + new URLSearchParams({
        q: '"Ghislaine Maxwell"',
        type: 'o',
        format: 'json',
        page_size: '20',
        court: 'nysd',
      }).toString();

      const response = await rateLimitedFetch(url, apiKey);
      if (response.ok) {
        const data = await response.json() as {
          count?: number;
          results?: Array<Record<string, unknown>>;
        };

        if (data.results && data.results.length > 0) {
          console.log(`[BulkList] Opinions: ${data.count} sonuç`);

          const docs: RECAPDocument[] = [];
          for (const r of data.results) {
            const id = (r.cluster_id as number) || (r.id as number);
            if (!id) continue;

            docs.push({
              recapDocId: id,
              entryNumber: null,
              description: (r.caseName as string) || (r.case_name as string) || 'Unknown',
              dateFiled: (r.dateFiled as string) || (r.date_filed as string) || null,
              court: (r.court as string) || MAXWELL_CASE.court,
              docketNumber: (r.docketNumber as string) || (r.docket_number as string) || '',
              caseName: (r.caseName as string) || (r.case_name as string) || '',
              absoluteUrl: r.absolute_url
                ? `${COURTLISTENER_BASE}${r.absolute_url}`
                : `${COURTLISTENER_BASE}/opinion/${id}/`,
              fileSize: null,
              isAvailable: true, // Opinions always have text content
              shortDescription: 'opinion',
            });
          }

          return {
            totalFound: data.count || docs.length,
            documents: docs,
            pagesFetched: 1,
            errors: [...errors, 'NOT: RECAP belgeleri bulunamadı, opinions kullanıldı'],
            durationMs: Date.now() - startTime,
          };
        }
      }
    } catch (err) {
      errors.push(`Opinions search: ${(err as Error).message}`);
    }
  }

  return {
    totalFound: result1.totalFound,
    documents: result1.documents,
    pagesFetched: result1.pagesFetched,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// ─── Parse Helpers ────────────────────────────────────

function parseRECAPResult(raw: Record<string, unknown>): RECAPDocument | null {
  try {
    const id = (raw.id as number) || (raw.recap_doc_id as number);
    if (!id) return null;

    return {
      recapDocId: id,
      entryNumber: (raw.entry_number as number) || (raw.entryNumber as number) || null,
      description: (raw.description as string) || (raw.short_description as string) || 'No description',
      dateFiled: (raw.dateFiled as string) || (raw.date_filed as string) || null,
      court: (raw.court as string) || (raw.court_id as string) || MAXWELL_CASE.court,
      docketNumber: (raw.docketNumber as string) || (raw.docket_number as string) || MAXWELL_CASE.docketNumber,
      caseName: (raw.caseName as string) || (raw.case_name as string) || MAXWELL_CASE.caseName,
      absoluteUrl: raw.absolute_url
        ? `${COURTLISTENER_BASE}${raw.absolute_url}`
        : `${COURTLISTENER_BASE}/api/rest/v4/recap-documents/${id}/`,
      fileSize: (raw.file_size as number) || null,
      isAvailable: (raw.is_available as boolean) || false,
      shortDescription: (raw.short_description as string) || null,
    };
  } catch {
    return null;
  }
}

// ─── Özet Raporu ──────────────────────────────────────

export function generateBulkReport(result: BulkFetchResult): string {
  const available = result.documents.filter(d => d.isAvailable);
  const totalSizeMB = available.reduce((sum, d) => sum + (d.fileSize || 0), 0) / (1024 * 1024);

  const lines = [
    '═══════════════════════════════════════════════════════',
    '  COURTLISTENER RECAP — MAXWELL DAVA BELGELERİ',
    '═══════════════════════════════════════════════════════',
    `  Dava: ${MAXWELL_CASE.caseName}`,
    `  Docket: ${MAXWELL_CASE.docketNumber}`,
    `  Mahkeme: ${MAXWELL_CASE.court}`,
    '───────────────────────────────────────────────────────',
    `  Toplam belge: ${result.totalFound}`,
    `  İndirilebilir: ${available.length}`,
    `  İndirilemeyen: ${result.documents.length - available.length}`,
    `  Tahmini boyut: ${totalSizeMB.toFixed(1)} MB`,
    `  Sayfa sayısı: ${result.pagesFetched}`,
    `  Süre: ${(result.durationMs / 1000).toFixed(1)}s`,
  ];

  if (result.errors.length > 0) {
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`  Hatalar (${result.errors.length}):`);
    for (const err of result.errors.slice(0, 5)) {
      lines.push(`    ⚠ ${err}`);
    }
  }

  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}
