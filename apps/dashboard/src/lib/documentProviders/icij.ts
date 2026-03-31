// ═══ SPRINT 16: TARA Protocol — ICIJ Offshore Leaks Provider ═══
// Queries ICIJ offshore leaks database (Panama Papers, Paradise Papers, etc.)
// Uses the Reconciliation API (POST /api/v1/reconcile)
// NO AUTH required - public API

import { BaseDocumentProvider } from './base';
import type { SearchOptions, SearchResult, DocumentDetail, DocumentProvider } from './types';

// W3C Reconciliation API response types
interface ReconcileCandidate {
  id?: string;
  name?: string;
  score?: number;
  match?: boolean;
  type?: Array<{ id: string; name: string }>;
  description?: string;
}

interface ReconcileResult {
  result?: ReconcileCandidate[];
}

interface ReconcileBatchResponse {
  [key: string]: ReconcileResult;
}

// Legacy entity type for document detail
interface ICIJEntity {
  id?: string;
  name?: string;
  countries?: string[];
  type?: string;
  sourceID?: string;
  node_id?: string;
  url?: string;
  addresses?: string[];
  description?: string;
  incorporation_date?: string;
  jurisdiction?: string;
  officers?: Array<{ name: string; position?: string }>;
  intermediaries?: Array<{ name: string; position?: string }>;
}

export class ICIJProvider extends BaseDocumentProvider implements DocumentProvider {
  private readonly baseUrl = 'https://offshoreleaks.icij.org/api/v1';
  public readonly displayName = 'ICIJ Offshore Leaks';

  constructor() {
    super('icij');
  }

  name = 'icij' as const;

  getDisplayName(): string {
    return this.displayName;
  }

  isAvailable(): boolean {
    return true; // ICIJ Reconciliation API requires no authentication
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    if (this.isRateLimited('icij-search')) {
      return [];
    }

    const cacheKey = this.getCacheKey('icij-search', query, options);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.fetchWithErrorHandling(
      async () => {
        // Use W3C Reconciliation API — search across all entity types
        const entityTypes = ['Entity', 'Officer', 'Intermediary', 'Address'];
        const allCandidates: ReconcileCandidate[] = [];

        // Build batch queries — one per entity type
        const queries: Record<string, { query: string; type?: string; limit?: number }> = {};
        entityTypes.forEach((type, i) => {
          queries[`q${i}`] = {
            query: query,
            type: type,
            limit: 10,
          };
        });

        try {
          const url = `${this.baseUrl}/reconcile`;
          const response = await this.fetchJson<ReconcileBatchResponse>(
            url,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ queries }),
            },
            15000
          );

          // Collect results from all query responses
          for (const key of Object.keys(response)) {
            const queryResult = response[key];
            if (queryResult?.result && Array.isArray(queryResult.result)) {
              allCandidates.push(...queryResult.result);
            }
          }
        } catch (batchError) {
          // Fallback: try single query (simpler format)
          console.warn(
            '[DocumentProvider:icij] Batch query failed, trying single query'
          );

          try {
            const url = `${this.baseUrl}/reconcile`;
            const singleResponse = await this.fetchJson<ReconcileResult>(
              url,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
              },
              15000
            );

            if (singleResponse?.result && Array.isArray(singleResponse.result)) {
              allCandidates.push(...singleResponse.result);
            }
          } catch (singleError) {
            throw new Error('All ICIJ reconciliation endpoints failed');
          }
        }

        return this.mapCandidatesToSearchResults(allCandidates);
      },
      []
    );

    this.setCache(cacheKey, results);
    return results;
  }

  async getDocument(externalId: string): Promise<DocumentDetail | null> {
    if (!externalId || externalId.trim().length === 0) {
      return null;
    }

    if (this.isRateLimited('icij-document')) {
      return null;
    }

    const cacheKey = this.getCacheKey('icij-doc', externalId);
    const cached = this.getFromCache<DocumentDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    let entityName = externalId;
    let entityType = 'Entity';
    let jurisdiction = '';
    let incDate = '';
    let closedDate = '';
    let officers: string[] = [];
    let addresses: string[] = [];
    let dataSource = '';

    // Fetch real data from the ICIJ node page
    try {
      const pageUrl = `https://offshoreleaks.icij.org/nodes/${externalId}`;
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TruthPlatform/1.0; Research)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();

        // Extract entity name from h1 or page structure
        const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (nameMatch) {
          const name = nameMatch[1].replace(/<[^>]+>/g, '').trim();
          if (name && name.length > 0 && name !== externalId) {
            entityName = name;
          }
        }

        // Entity type
        const typeMatch = html.match(/(ENTITY|OFFICER|INTERMEDIARY|ADDRESS):/i);
        if (typeMatch) entityType = typeMatch[1].trim();

        // Jurisdiction
        const regMatch = html.match(/REGISTERED IN:[\s\S]*?<[^>]*>([^<]+)<\/[^>]*>/i);
        if (regMatch) jurisdiction = regMatch[1].trim();

        // Dates
        const incMatch = html.match(/Incorporated:[\s\S]*?([\d]{2}-[A-Z]{3}-[\d]{4})/i);
        if (incMatch) incDate = incMatch[1];

        const closedMatch = html.match(/Closed:[\s\S]*?([\d]{2}-[A-Z]{3}-[\d]{4})/i);
        if (closedMatch) closedDate = closedMatch[1];

        // Officers
        const officerSection = html.match(/Officer[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
        if (officerSection) {
          const rows = officerSection[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          for (const row of rows) {
            const cells = row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            const cellTexts: string[] = [];
            for (const cell of cells) {
              const text = cell[1].replace(/<[^>]+>/g, '').trim();
              if (text) cellTexts.push(text);
            }
            if (cellTexts.length >= 1) officers.push(cellTexts.join(' - '));
          }
        }

        // Addresses
        const addrSection = html.match(/Address[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
        if (addrSection) {
          const rows = addrSection[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          for (const row of rows) {
            const text = row[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (text) addresses.push(text);
          }
        }

        // Data source
        const sourceMatch = html.match(/(Panama Papers|Paradise Papers|Pandora Papers|Bahamas Leaks|Offshore Leaks)/i);
        if (sourceMatch) dataSource = sourceMatch[1];
      }
    } catch (err) {
      console.warn('[ICIJ] Node page fetch failed for', externalId, err);
    }

    // Build rich description
    const descParts: string[] = [];
    descParts.push(`ICIJ Offshore Leaks — ${entityType}`);
    if (jurisdiction) descParts.push(`Kayıtlı: ${jurisdiction}`);
    if (incDate) descParts.push(`Kuruluş: ${incDate}`);
    if (closedDate) descParts.push(`Kapanış: ${closedDate}`);
    if (officers.length > 0) descParts.push(`Yetkililer: ${officers.join('; ')}`);
    if (addresses.length > 0) descParts.push(`Adres: ${addresses.join('; ')}`);
    if (dataSource) descParts.push(`Kaynak: ${dataSource}`);

    // Build raw content from all scraped data (no size cap)
    const rawContentParts: string[] = [];
    rawContentParts.push(`=== ICIJ Offshore Leaks Record ===`);
    rawContentParts.push(`Entity: ${entityName}`);
    rawContentParts.push(`Type: ${entityType}`);
    if (jurisdiction) rawContentParts.push(`Jurisdiction: ${jurisdiction}`);
    if (incDate) rawContentParts.push(`Incorporation Date: ${incDate}`);
    if (closedDate) rawContentParts.push(`Closed Date: ${closedDate}`);
    if (dataSource) rawContentParts.push(`Data Source: ${dataSource}`);
    if (officers.length > 0) {
      rawContentParts.push(`\n--- Officers/Directors ---`);
      officers.forEach((o, i) => rawContentParts.push(`${i + 1}. ${o}`));
    }
    if (addresses.length > 0) {
      rawContentParts.push(`\n--- Registered Addresses ---`);
      addresses.forEach((a, i) => rawContentParts.push(`${i + 1}. ${a}`));
    }
    rawContentParts.push(`\nSource URL: https://offshoreleaks.icij.org/nodes/${externalId}`);

    const detail: DocumentDetail = {
      externalId,
      title: entityName,
      description: descParts.join(' | '),
      source: 'icij',
      url: `https://offshoreleaks.icij.org/nodes/${externalId}`,
      documentType: 'leaked',
      date: incDate || closedDate || undefined,
      metadata: {
        entityType,
        jurisdiction,
        incorporationDate: incDate,
        closedDate,
        officers,
        addresses,
        dataSource,
      },
      rawContent: rawContentParts.join('\n'),
      relatedEntities: [],
    };

    this.setCache(cacheKey, detail);
    return detail;
  }

  /**
   * Map W3C Reconciliation candidates to our SearchResult format
   */
  private mapCandidatesToSearchResults(candidates: ReconcileCandidate[]): SearchResult[] {
    if (!Array.isArray(candidates)) {
      return [];
    }

    // Deduplicate by id
    const seen = new Set<string>();

    return candidates
      .filter((c) => {
        if (!c || !c.name || !c.id) return false;
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      })
      .map((candidate) => {
        // Map reconciliation score (0-100) to our relevance score (0-1)
        const rawScore = candidate.score || 0;
        const relevanceScore = Math.min(rawScore / 100, 1.0);

        // Extract type info
        const entityType = candidate.type?.[0]?.name || 'Unknown';
        const typeId = candidate.type?.[0]?.id || '';

        return {
          externalId: candidate.id || '',
          title: candidate.name || 'Unknown Entity',
          description: this.buildCandidateDescription(candidate, entityType),
          source: 'icij' as const,
          url: `https://offshoreleaks.icij.org/nodes/${candidate.id}`,
          documentType: this.mapEntityTypeToDocumentType(typeId),
          relevanceScore: Math.max(relevanceScore, 0.5), // Floor at 0.5 for ICIJ
          metadata: {
            type: entityType,
            score: rawScore,
            match: candidate.match,
          },
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Build description from reconciliation candidate
   */
  private buildCandidateDescription(candidate: ReconcileCandidate, entityType: string): string {
    const parts: string[] = [];

    parts.push(`Type: ${entityType}`);

    if (candidate.description) {
      parts.push(candidate.description);
    }

    if (candidate.score !== undefined) {
      parts.push(`Match Score: ${Math.round(candidate.score)}%`);
    }

    if (candidate.match) {
      parts.push('✓ Strong Match');
    }

    return parts.join(' | ');
  }

  /**
   * Map ICIJ entity types to our DocumentType enum
   */
  private mapEntityTypeToDocumentType(
    icijType?: string
  ): 'financial' | 'leaked' | 'other' {
    if (!icijType) {
      return 'other';
    }

    const typeStr = icijType.toLowerCase();

    if (
      typeStr.includes('address') ||
      typeStr.includes('intermediary') ||
      typeStr.includes('officer')
    ) {
      return 'financial';
    }

    if (typeStr.includes('entity') || typeStr.includes('company')) {
      return 'financial';
    }

    return 'leaked';
  }
}
