// ═══ SPRINT 16: TARA Protocol — Provider Registry ═══
// Central registry for all document providers
// Provides unified search interface across all sources

import type { SearchOptions, SearchResult, DocumentDetail, SourceType, DocumentProvider } from './types';
import { ICIJProvider } from './icij';
import { OpenSanctionsProvider } from './opensanctions';
import { CourtListenerProvider } from './courtlistener';
import { ManualProvider } from './manual';

/**
 * Registry of all available document providers
 */
const providers = new Map<SourceType, DocumentProvider>([
  ['icij', new ICIJProvider()],
  ['opensanctions', new OpenSanctionsProvider()],
  ['courtlistener', new CourtListenerProvider()],
  ['manual', new ManualProvider()],
]);

/**
 * Get a specific provider by name
 * Returns null if provider not found or unavailable
 */
export function getProvider(name: SourceType): DocumentProvider | null {
  const provider = providers.get(name);
  if (!provider) {
    console.warn(`[DocumentProvider:registry] Provider "${name}" not found`);
    return null;
  }

  if (!provider.isAvailable()) {
    console.warn(`[DocumentProvider:registry] Provider "${name}" is not available`);
    return null;
  }

  return provider;
}

/**
 * Get all available providers
 * Filters out providers that are not available (e.g., missing API keys)
 */
export function getAllProviders(): DocumentProvider[] {
  return Array.from(providers.values()).filter((provider) =>
    provider.isAvailable()
  );
}

/**
 * Search all available providers in parallel
 * Returns merged and sorted results by relevanceScore
 *
 * @param query - Search query string
 * @param providerFilter - Optional list of provider names to search (defaults to all available)
 * @param options - Search options (pagination, filters, etc.)
 * @returns Combined search results from all providers, sorted by relevance
 */
export async function searchAll(
  query: string,
  providerFilter?: SourceType[],
  options?: SearchOptions
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Determine which providers to use
  const providersToSearch = providerFilter
    ? providerFilter
        .map((name) => getProvider(name))
        .filter((p) => p !== null) as DocumentProvider[]
    : getAllProviders();

  if (providersToSearch.length === 0) {
    console.warn('[DocumentProvider:searchAll] No available providers');
    return [];
  }

  try {
    // Search all providers in parallel
    const searchPromises = providersToSearch.map((provider) =>
      provider
        .search(query, options)
        .catch((error) => {
          console.error(
            `[DocumentProvider:searchAll] Error searching ${provider.name}:`,
            error
          );
          return [];
        })
    );

    const allResults = await Promise.all(searchPromises);

    // Merge results from all providers
    const merged = allResults.flat();

    // Deduplicate by title (case-insensitive)
    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];

    for (const result of merged) {
      const key = result.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    // Sort by relevance score (descending)
    deduplicated.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      return scoreB - scoreA;
    });

    return deduplicated;
  } catch (error) {
    console.error('[DocumentProvider:searchAll] Fatal error during search:', error);
    return [];
  }
}

/**
 * Get document details from a specific provider
 *
 * @param source - Provider source type
 * @param externalId - Document ID from that provider
 * @returns Full document details or null
 */
export async function getDocument(
  source: SourceType,
  externalId: string
): Promise<DocumentDetail | null> {
  const provider = getProvider(source);
  if (!provider) {
    return null;
  }

  try {
    return await provider.getDocument(externalId);
  } catch (error) {
    console.error(
      `[DocumentProvider:getDocument] Error fetching from ${source}:`,
      error
    );
    return null;
  }
}

/**
 * Check which providers are available
 * Useful for UI to show/hide provider-specific features
 *
 * @returns Map of provider names to availability status
 */
export function getProviderStatus(): Record<SourceType, boolean> {
  return {
    icij: getProvider('icij') !== null,
    opensanctions: getProvider('opensanctions') !== null,
    courtlistener: getProvider('courtlistener') !== null,
    documentcloud: false, // Not implemented yet
    community: false, // Not implemented yet
    manual: getProvider('manual') !== null,
  };
}

/**
 * Get display name for a provider
 *
 * @param source - Provider source type
 * @returns Human-readable provider name
 */
export function getProviderDisplayName(source: SourceType): string {
  const provider = providers.get(source);
  if (!provider) {
    return source;
  }

  // Access displayName property if available
  const typed = provider as unknown as { displayName?: string; getDisplayName?(): string };
  if (typed.displayName) {
    return typed.displayName;
  }
  if (typed.getDisplayName) {
    return typed.getDisplayName();
  }

  return source;
}
