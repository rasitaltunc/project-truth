/**
 * CourtListener Engine — Gerçek mahkeme belgelerini çeker
 *
 * API: https://www.courtlistener.com/api/rest/v4/
 * Free tier: 100 req/day (unauthenticated), 5000 req/hr (with token)
 *
 * Bu motor, mahkeme belgelerini çekip evidence_archive'a "court" source_of_truth
 * olarak yazar. Topluluk katkısı DEĞİLDİR — resmi kayıttır.
 */

const BASE_URL = 'https://www.courtlistener.com/api/rest/v4';

interface CourtCase {
    id: number;
    case_name: string;
    court: string;
    docket_number: string;
    date_filed: string;
    url: string;
}

interface CourtDocument {
    id: number;
    document_number: string;
    description: string;
    date_filed: string;
    plain_text?: string;
    page_count?: number;
    filepath_local?: string;
    absolute_url?: string;
}

interface DocketEntry {
    entry_number: number;
    date_filed: string;
    description: string;
    recap_documents: CourtDocument[];
}

export interface CourtEvidence {
    title: string;
    description: string;
    source_name: string;
    source_url: string;
    source_date: string;
    evidence_type: 'legal';
    court_case_id: number;
    docket_number: string;
    court: string;
    document_number?: string;
    plain_text_preview?: string;
}

// ═══ HEADERS ═══
function getHeaders(): Record<string, string> {
    const token = process.env.COURTLISTENER_API_TOKEN;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }
    return headers;
}

// ═══ SEARCH CASES ═══
export async function searchCases(query: string, court?: string, limit = 20): Promise<CourtCase[]> {
    const params = new URLSearchParams({
        q: query,
        type: 'r', // RECAP/dockets
    });
    if (court) params.append('court', court);
    params.append('page_size', String(limit));

    const url = `${BASE_URL}/search/?${params}`;

    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        throw new Error(`CourtListener API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((r: any) => ({
        id: r.docket_id || r.id,
        case_name: r.caseName || r.case_name || 'Unknown',
        court: r.court || r.court_id || '',
        docket_number: r.docketNumber || r.docket_number || '',
        date_filed: r.dateFiled || r.date_filed || '',
        url: r.absolute_url
            ? `https://www.courtlistener.com${r.absolute_url}`
            : `https://www.courtlistener.com/docket/${r.docket_id || r.id}/`,
    }));
}

// ═══ GET DOCKET ENTRIES ═══
export async function getDocketEntries(docketId: number): Promise<DocketEntry[]> {
    const url = `${BASE_URL}/docket-entries/?docket=${docketId}&page_size=50`;

    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
        throw new Error(`CourtListener docket error: ${res.status}`);
    }

    const data = await res.json();
    const results = data.results || [];

    return results.map((entry: any) => ({
        entry_number: entry.entry_number,
        date_filed: entry.date_filed,
        description: entry.description || '',
        recap_documents: (entry.recap_documents || []).map((doc: any) => ({
            id: doc.id,
            document_number: doc.document_number || '',
            description: doc.description || entry.description || '',
            date_filed: doc.date_filed || entry.date_filed,
            plain_text: doc.plain_text || '',
            page_count: doc.page_count,
            filepath_local: doc.filepath_local,
            absolute_url: doc.absolute_url
                ? `https://www.courtlistener.com${doc.absolute_url}`
                : undefined,
        })),
    }));
}

// ═══ CONVERT TO EVIDENCE ═══
export function convertToEvidence(
    caseName: string,
    court: string,
    docketNumber: string,
    caseId: number,
    caseUrl: string,
    entries: DocketEntry[],
    maxDocs = 20,
): CourtEvidence[] {
    const evidence: CourtEvidence[] = [];

    for (const entry of entries) {
        if (evidence.length >= maxDocs) break;

        // Entry with documents
        if (entry.recap_documents.length > 0) {
            for (const doc of entry.recap_documents) {
                if (evidence.length >= maxDocs) break;

                evidence.push({
                    title: `[${docketNumber}] ${doc.description || entry.description}`.substring(0, 200),
                    description: doc.plain_text
                        ? doc.plain_text.substring(0, 500) + (doc.plain_text.length > 500 ? '...' : '')
                        : `Mahkeme belgesi: ${entry.description}`,
                    source_name: `CourtListener / ${court.toUpperCase()}`,
                    source_url: doc.absolute_url || caseUrl,
                    source_date: doc.date_filed || entry.date_filed,
                    evidence_type: 'legal',
                    court_case_id: caseId,
                    docket_number: docketNumber,
                    court: court,
                    document_number: doc.document_number,
                    plain_text_preview: doc.plain_text?.substring(0, 1000),
                });
            }
        } else if (entry.description) {
            // Entry without documents (just docket text)
            evidence.push({
                title: `[${docketNumber}] ${entry.description}`.substring(0, 200),
                description: `Docket entry #${entry.entry_number}: ${entry.description}`,
                source_name: `CourtListener / ${court.toUpperCase()}`,
                source_url: caseUrl,
                source_date: entry.date_filed,
                evidence_type: 'legal',
                court_case_id: caseId,
                docket_number: docketNumber,
                court: court,
            });
        }
    }

    return evidence;
}

// ═══ FULL PIPELINE: Search → Fetch → Convert ═══
export async function fetchCourtEvidence(
    searchQuery: string,
    court?: string,
    maxCases = 3,
    maxDocsPerCase = 10,
): Promise<CourtEvidence[]> {
    // 1. Search cases
    const cases = await searchCases(searchQuery, court, maxCases);
    if (cases.length === 0) {
        return [];
    }

    // 2. Fetch entries for each case
    const allEvidence: CourtEvidence[] = [];

    for (const c of cases) {
        try {
            const entries = await getDocketEntries(c.id);
            const evidence = convertToEvidence(
                c.case_name,
                c.court,
                c.docket_number,
                c.id,
                c.url,
                entries,
                maxDocsPerCase,
            );
            allEvidence.push(...evidence);

            // Rate limiting: small delay between cases
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            // Error fetching case, continue with next one
        }
    }

    return allEvidence;
}
