// ═══ SPRINT 16: TARA Protocol — CourtListener Provider ═══
// Searches US court opinions and docket entries via CourtListener REST API v4
// API Key required (COURTLISTENER_API_KEY environment variable)
// Auth: Token-based (Authorization: Token <key>)

import { BaseDocumentProvider } from './base';
import type { SearchOptions, SearchResult, DocumentDetail, DocumentProvider } from './types';

interface CourtListenerSearchResult {
  absolute_url?: string;
  caseName?: string;
  case_name?: string;
  caseNameShort?: string;
  court?: string;
  court_id?: string;
  court_citation_string?: string;
  dateFiled?: string;
  date_filed?: string;
  docketNumber?: string;
  docket_number?: string;
  id?: number;
  cluster_id?: number;
  snippet?: string;
  suitNature?: string;
  judge?: string;
  status?: string;
  citation?: string[];
  sibling_ids?: number[];
}

interface CourtListenerSearchResponse {
  count?: number;
  next?: string;
  previous?: string;
  results?: CourtListenerSearchResult[];
}

export class CourtListenerProvider
  extends BaseDocumentProvider
  implements DocumentProvider
{
  private readonly baseUrl = 'https://www.courtlistener.com/api/rest/v4';
  public readonly displayName = 'CourtListener';

  constructor() {
    super('courtlistener');
  }

  name = 'courtlistener' as const;

  // Read API key dynamically (not cached in constructor)
  private getApiKey(): string {
    return process.env.COURTLISTENER_API_KEY || '';
  }

  getDisplayName(): string {
    return this.displayName;
  }

  isAvailable(): boolean {
    return this.getApiKey().length > 0;
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      console.warn('[DocumentProvider:courtlistener] API key not configured');
      return [];
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    if (this.isRateLimited('courtlistener-search')) {
      return [];
    }

    const cacheKey = this.getCacheKey('courtlistener-search', query, options);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.fetchWithErrorHandling(
      async () => {
        const limit = options?.limit || 20;

        // Use the unified search endpoint
        const url = new URL(`${this.baseUrl}/search/`);
        url.searchParams.set('q', query);
        url.searchParams.set('type', 'o'); // opinions
        url.searchParams.set('format', 'json');
        url.searchParams.set('page_size', String(limit));

        const response = await this.fetchJsonAuthed<CourtListenerSearchResponse>(
          url.toString()
        );

        const results = response.results || [];
        return results
          .filter((r) => r && (r.caseName || r.case_name) && (r.id || r.cluster_id))
          .map((result) => {
            const caseName = result.caseName || result.case_name || 'Unknown Case';
            const dateFiled = result.dateFiled || result.date_filed;
            const docketNumber = result.docketNumber || result.docket_number;
            const id = String(result.cluster_id || result.id);

            return {
              externalId: id,
              title: caseName,
              description: this.buildDescription(result),
              date: dateFiled,
              source: 'courtlistener' as const,
              url: result.absolute_url
                ? `https://www.courtlistener.com${result.absolute_url}`
                : `https://www.courtlistener.com/opinion/${id}/`,
              documentType: 'court_record' as const,
              relevanceScore: 0.85,
              metadata: {
                court: result.court || result.court_id,
                docketNumber,
                judge: result.judge,
                status: result.status,
                snippet: result.snippet,
              },
            };
          });
      },
      []
    );

    this.setCache(cacheKey, results);
    return results;
  }

  async getDocument(externalId: string): Promise<DocumentDetail | null> {
    if (!this.isAvailable()) {
      return null;
    }

    if (!externalId || externalId.trim().length === 0) {
      return null;
    }

    if (this.isRateLimited('courtlistener-document')) {
      return null;
    }

    const cacheKey = this.getCacheKey('courtlistener-doc', externalId);
    const cached = this.getFromCache<DocumentDetail>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.fetchWithErrorHandling(
      async () => {
        // Try as opinion cluster
        const url = `${this.baseUrl}/clusters/${externalId}/?format=json`;
        const data = await this.fetchJsonAuthed<Record<string, unknown>>(url);

        if (data && (data.case_name || data.caseName)) {
          // Fetch full opinion text (no size cap)
          let rawContent: string | undefined;
          try {
            const subOpinions = data.sub_opinions as string[] | undefined;
            if (subOpinions && subOpinions.length > 0) {
              // sub_opinions contains URLs to opinion resources
              const opinionTexts: string[] = [];
              for (const opUrl of subOpinions.slice(0, 5)) { // max 5 opinions
                try {
                  const opId = opUrl.replace(/\/$/, '').split('/').pop();
                  if (!opId) continue;
                  const opData = await this.fetchJsonAuthed<Record<string, unknown>>(
                    `${this.baseUrl}/opinions/${opId}/?format=json`
                  );
                  const plainText = (opData.plain_text as string) || '';
                  const htmlText = (opData.html_lawbox as string) || (opData.html_columbia as string) || (opData.html as string) || '';
                  if (plainText) {
                    opinionTexts.push(plainText); // Full text, no cap
                  } else if (htmlText) {
                    // Strip HTML tags for raw content
                    opinionTexts.push(htmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
                  }
                } catch {
                  // Skip individual opinion fetch failures
                }
              }
              if (opinionTexts.length > 0) {
                const caseName = (data.case_name || data.caseName) as string;
                const rawParts: string[] = [];
                rawParts.push(`=== CourtListener Court Record ===`);
                rawParts.push(`Case: ${caseName}`);
                rawParts.push(`Court: ${data.court || 'Unknown'}`);
                if (data.date_filed) rawParts.push(`Filed: ${data.date_filed}`);
                if (data.judges) rawParts.push(`Judges: ${data.judges}`);
                if (data.docket_number) rawParts.push(`Docket: ${data.docket_number}`);
                rawParts.push(`\n--- Opinion Text ---\n`);
                rawParts.push(opinionTexts.join('\n\n--- Next Opinion ---\n\n'));
                rawContent = rawParts.join('\n');
              }
            }
          } catch {
            // rawContent stays undefined — fallback to old pipeline
          }

          const detail: DocumentDetail = {
            externalId,
            title: (data.case_name || data.caseName) as string,
            description: `Court: ${data.court || 'Unknown'} | Filed: ${data.date_filed || 'Unknown'}`,
            date: data.date_filed as string | undefined,
            source: 'courtlistener',
            url: `https://www.courtlistener.com/opinion/${externalId}/`,
            documentType: 'court_record',
            metadata: {
              court: data.court,
              judges: data.judges,
            },
            rawContent,
            relatedEntities: [],
          };
          return detail;
        }

        return null;
      },
      null
    );

    if (result) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Fetch JSON with CourtListener API authentication
   * CourtListener uses Token auth (not Bearer)
   */
  private async fetchJsonAuthed<T>(
    url: string,
    timeout: number = 15000
  ): Promise<T> {
    return this.fetchJson<T>(
      url,
      {
        headers: {
          'Authorization': `Token ${this.getApiKey()}`,
        },
      },
      timeout
    );
  }

  private buildDescription(result: CourtListenerSearchResult): string {
    const parts: string[] = [];

    if (result.court || result.court_id) {
      parts.push(`Court: ${result.court || result.court_id}`);
    }

    const dateFiled = result.dateFiled || result.date_filed;
    if (dateFiled) {
      parts.push(`Filed: ${dateFiled}`);
    }

    const docketNumber = result.docketNumber || result.docket_number;
    if (docketNumber) {
      parts.push(`Docket: ${docketNumber}`);
    }

    if (result.judge) {
      parts.push(`Judge: ${result.judge}`);
    }

    if (result.snippet) {
      // Clean HTML from snippet
      const cleanSnippet = result.snippet.replace(/<[^>]+>/g, '').substring(0, 120);
      if (cleanSnippet) parts.push(cleanSnippet);
    }

    return parts.join(' | ');
  }
}
