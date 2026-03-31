// ==========================================
// PROJECT TRUTH - COURTLISTENER API
// Epstein/Maxwell mahkeme belgelerini çekmek için
// ==========================================

import { CourtListenerDocument, CourtListenerSearchResult } from './types';

const COURTLISTENER_API_TOKEN = process.env.COURTLISTENER_API_TOKEN;
const COURTLISTENER_BASE_URL = 'https://www.courtlistener.com/api/rest/v3';

/**
 * CourtListener API'ye authenticated request gönder
 */
async function fetchCourtListener(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!COURTLISTENER_API_TOKEN) {
    throw new Error('COURTLISTENER_API_TOKEN is not set');
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${COURTLISTENER_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${COURTLISTENER_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`CourtListener API error: ${response.status} - ${error}`);
  }

  return response;
}

/**
 * Dava adına göre belge ara
 * @param query - Arama sorgusu (örn: "Epstein", "Giuffre v Maxwell")
 * @param limit - Maksimum sonuç sayısı
 */
export async function searchDocuments(
  query: string,
  limit: number = 20
): Promise<CourtListenerSearchResult> {
  const params = new URLSearchParams({
    q: query,
    type: 'r',  // RECAP documents
    order_by: 'dateFiled desc',
  });

  const response = await fetchCourtListener(`/search/?${params}`);
  const data = await response.json();

  // Sonuçları sınırla
  return {
    count: data.count,
    next: data.next,
    previous: data.previous,
    results: data.results?.slice(0, limit) || [],
  };
}

/**
 * Belirli bir docket (dava dosyası) getir
 * @param docketId - Docket ID
 */
export async function getDocket(docketId: number): Promise<any> {
  const response = await fetchCourtListener(`/dockets/${docketId}/`);
  return response.json();
}

/**
 * Belirli bir docket'ın tüm belgelerini getir
 * @param docketId - Docket ID
 */
export async function getDocketDocuments(docketId: number): Promise<CourtListenerDocument[]> {
  const response = await fetchCourtListener(`/recap-documents/?docket=${docketId}`);
  const data = await response.json();
  return data.results || [];
}

/**
 * Giuffre v. Maxwell davasının belgelerini getir
 * Bu, Epstein araştırması için en önemli kaynak
 */
export async function getGiuffreMaxwellDocuments(
  limit: number = 100
): Promise<CourtListenerDocument[]> {
  // Giuffre v. Maxwell dava numarası: 1:15-cv-07433 (SDNY)
  const searchResult = await searchDocuments(
    'Giuffre Maxwell 15-cv-07433',
    limit
  );

  return searchResult.results;
}

/**
 * Epstein ile ilgili tüm belgeleri ara
 */
export async function searchEpsteinDocuments(
  limit: number = 100
): Promise<CourtListenerDocument[]> {
  const searchResult = await searchDocuments(
    'Jeffrey Epstein',
    limit
  );

  return searchResult.results;
}

/**
 * PDF dosyasını indir (eğer erişilebilirse)
 * @param document - CourtListener document objesi
 */
export async function downloadDocumentPDF(
  document: CourtListenerDocument
): Promise<ArrayBuffer | null> {
  if (!document.filepath_pdf_url) {
    console.warn(`No PDF URL for document ${document.id}`);
    return null;
  }

  try {
    const response = await fetchCourtListener(document.filepath_pdf_url);
    return response.arrayBuffer();
  } catch (error) {
    console.error(`Failed to download PDF for document ${document.id}:`, error);
    return null;
  }
}

/**
 * API bağlantısını test et
 */
export async function testCourtListenerAPI(): Promise<{
  success: boolean;
  message: string;
  sampleResults?: number;
}> {
  if (!COURTLISTENER_API_TOKEN) {
    return {
      success: false,
      message: 'COURTLISTENER_API_TOKEN is not set',
    };
  }

  try {
    // Basit bir arama yap
    const results = await searchDocuments('Epstein', 5);

    return {
      success: true,
      message: `API connected! Found ${results.count} total documents.`,
      sampleResults: results.results.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Belirli tarih aralığındaki belgeleri getir
 */
export async function getDocumentsByDateRange(
  query: string,
  startDate: string,
  endDate: string,
  limit: number = 50
): Promise<CourtListenerDocument[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'r',
    filed_after: startDate,
    filed_before: endDate,
    order_by: 'dateFiled desc',
  });

  const response = await fetchCourtListener(`/search/?${params}`);
  const data = await response.json();

  return data.results?.slice(0, limit) || [];
}

/**
 * 2024 Ocak unsealing belgelerini getir
 * (Giuffre v. Maxwell John Doe listesi)
 */
export async function getJanuary2024Unsealings(): Promise<CourtListenerDocument[]> {
  return getDocumentsByDateRange(
    'Giuffre Maxwell unseal',
    '2024-01-01',
    '2024-01-31',
    200
  );
}
