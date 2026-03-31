// ═══ SPRINT 16: TARA Protocol — OpenSanctions Provider ═══
// Searches sanctions lists, PEPs (Politically Exposed Persons), and company ownership
// REQUIRES API KEY — get one at https://www.opensanctions.org/api/

import { BaseDocumentProvider } from './base';
import type { SearchOptions, SearchResult, DocumentDetail, DocumentProvider } from './types';

interface OpenSanctionsEntity {
  id?: string;
  caption?: string;
  name?: string;
  schema?: string;
  properties?: Record<string, string[]>;
  datasets?: string[];
  referents?: string[];
  target?: boolean;
  first_seen?: string;
  last_seen?: string;
  last_change?: string;
  score?: number;
  match?: boolean;
  features?: Record<string, unknown>;
}

interface OpenSanctionsSearchResponse {
  responses?: Record<string, {
    status: number;
    results: OpenSanctionsEntity[];
    total?: { value: number; relation: string };
  }>;
  results?: OpenSanctionsEntity[];
  total?: { value: number; relation: string };
  limit?: number;
  offset?: number;
}

export class OpenSanctionsProvider extends BaseDocumentProvider implements DocumentProvider {
  private readonly baseUrl = 'https://api.opensanctions.org';
  public readonly displayName = 'OpenSanctions';

  constructor() {
    super('opensanctions');
  }

  name = 'opensanctions' as const;

  getDisplayName(): string {
    return this.displayName;
  }

  private getApiKey(): string | null {
    return typeof process !== 'undefined'
      ? process.env?.OPENSANCTIONS_API_KEY || null
      : null;
  }

  isAvailable(): boolean {
    // OpenSanctions API requires an API key
    const key = this.getApiKey();
    if (!key) {
      return false;
    }
    return true;
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('[DocumentProvider:opensanctions] No API key — skipping search');
      return [];
    }

    if (this.isRateLimited('opensanctions-search')) {
      return [];
    }

    const cacheKey = this.getCacheKey('opensanctions-search', query, options);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.fetchWithErrorHandling(
      async () => {
        const limit = options?.limit || 20;

        // Primary: POST /match/default with JSON body (yente API)
        try {
          const url = `${this.baseUrl}/match/default`;
          const response = await this.fetchJson<OpenSanctionsSearchResponse>(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${apiKey}`,
              },
              body: JSON.stringify({
                queries: {
                  q0: {
                    schema: 'Thing',
                    properties: {
                      name: [query],
                    },
                  },
                },
              }),
            },
            15000
          );

          // Match endpoint returns { responses: { q0: { results: [...] } } }
          const q0Results = response?.responses?.['q0']?.results || [];
          if (q0Results.length > 0) {
            return this.mapEntitiesToSearchResults(q0Results);
          }
        } catch (matchError) {
          console.warn('[DocumentProvider:opensanctions] Match endpoint failed, trying search');
        }

        // Fallback: GET /search/default?q=...
        try {
          const url = new URL(`${this.baseUrl}/search/default`);
          url.searchParams.set('q', query);
          url.searchParams.set('limit', String(limit));

          const response = await this.fetchJson<OpenSanctionsSearchResponse>(
            url.toString(),
            {
              method: 'GET',
              headers: {
                'Authorization': `ApiKey ${apiKey}`,
              },
            },
            10000
          );

          const entities = response.results || [];
          return this.mapEntitiesToSearchResults(entities);
        } catch (searchError) {
          throw new Error('All OpenSanctions endpoints failed');
        }
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

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    if (this.isRateLimited('opensanctions-document')) {
      return null;
    }

    const cacheKey = this.getCacheKey('opensanctions-doc', externalId);
    const cached = this.getFromCache<DocumentDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.fetchWithErrorHandling(
      async () => {
        const url = `${this.baseUrl}/entities/${externalId}`;
        const entity = await this.fetchJson<OpenSanctionsEntity>(url, {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${apiKey}`,
          },
        });

        if (!entity || (!entity.caption && !entity.name)) {
          return null;
        }

        const name = entity.caption || entity.name || 'Unknown';

        // Build raw content from all entity properties (no size cap)
        const rawContentParts: string[] = [];
        rawContentParts.push(`=== OpenSanctions Entity Record ===`);
        rawContentParts.push(`Name: ${name}`);
        if (entity.schema) rawContentParts.push(`Schema: ${entity.schema}`);
        if (entity.target) rawContentParts.push(`⚠ SANCTIONS TARGET`);
        if (entity.first_seen) rawContentParts.push(`First Seen: ${entity.first_seen}`);
        if (entity.last_seen) rawContentParts.push(`Last Seen: ${entity.last_seen}`);
        if (entity.last_change) rawContentParts.push(`Last Change: ${entity.last_change}`);

        // All properties (nationality, aliases, addresses, etc.)
        if (entity.properties && Object.keys(entity.properties).length > 0) {
          rawContentParts.push(`\n--- Properties ---`);
          for (const [key, values] of Object.entries(entity.properties)) {
            if (values && values.length > 0) {
              rawContentParts.push(`${key}: ${values.join(', ')}`);
            }
          }
        }

        // Datasets
        if (entity.datasets && entity.datasets.length > 0) {
          rawContentParts.push(`\n--- Datasets ---`);
          entity.datasets.forEach((ds) => rawContentParts.push(`- ${ds}`));
        }

        // Referents (other entity IDs this entity is linked to)
        if (entity.referents && entity.referents.length > 0) {
          rawContentParts.push(`\n--- Referents ---`);
          entity.referents.forEach((ref) => rawContentParts.push(`- ${ref}`));
        }

        rawContentParts.push(`\nSource URL: https://www.opensanctions.org/entities/${externalId}/`);

        const detail: DocumentDetail = {
          externalId: externalId,
          title: name,
          description: this.buildEntityDescription(entity),
          date: entity.last_seen || entity.first_seen,
          source: 'opensanctions',
          url: `https://www.opensanctions.org/entities/${externalId}/`,
          documentType: 'other',
          metadata: {
            schema: entity.schema,
            target: entity.target,
            datasets: entity.datasets,
          },
          rawContent: rawContentParts.join('\n'),
          relatedEntities: [],
        };

        return detail;
      },
      null
    );

    if (result) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Map OpenSanctions entities to our SearchResult format
   */
  private mapEntitiesToSearchResults(entities: OpenSanctionsEntity[]): SearchResult[] {
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities
      .filter((e) => e && (e.caption || e.name) && e.id)
      .map((entity) => {
        // Use score from API if available, or compute relevance
        const rawScore = entity.score || 0;
        let relevanceScore = rawScore > 1 ? rawScore / 100 : rawScore;

        // Boost for sanctions targets
        if (entity.target) relevanceScore = Math.min(relevanceScore + 0.15, 1.0);

        relevanceScore = Math.max(relevanceScore, 0.5); // Floor

        const name = entity.caption || entity.name || 'Unknown Entity';

        return {
          externalId: entity.id || '',
          title: name,
          description: this.buildEntityDescription(entity),
          date: entity.last_seen || entity.first_seen,
          source: 'opensanctions' as const,
          url: `https://www.opensanctions.org/entities/${entity.id}/`,
          documentType: 'other' as const,
          relevanceScore,
          metadata: {
            schema: entity.schema,
            target: entity.target,
            datasets: entity.datasets,
          },
        };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  /**
   * Build human-readable description from entity data
   */
  private buildEntityDescription(entity: OpenSanctionsEntity): string {
    const parts: string[] = [];

    if (entity.schema) {
      parts.push(`Type: ${entity.schema}`);
    }

    if (entity.target) {
      parts.push('⚠ Sanctions Target');
    }

    // Extract countries from properties
    const countries = entity.properties?.country || entity.properties?.nationality || [];
    if (countries.length > 0) {
      parts.push(`Countries: ${countries.join(', ')}`);
    }

    // Extract aliases
    const aliases = entity.properties?.alias || [];
    if (aliases.length > 0) {
      parts.push(`Aliases: ${aliases.slice(0, 3).join(', ')}`);
    }

    if (entity.datasets && entity.datasets.length > 0) {
      parts.push(`Datasets: ${entity.datasets.slice(0, 3).join(', ')}`);
    }

    if (entity.score !== undefined) {
      parts.push(`Score: ${Math.round(entity.score * 100) / 100}`);
    }

    return parts.join(' | ');
  }
}
