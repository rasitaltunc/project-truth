// ═══ SPRINT 16: TARA Protocol — Base Provider Class ═══
// Common functionality: rate limiting, caching, error handling

import type { SearchOptions, SearchResult, DocumentDetail } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Base class for all document providers
 * Provides rate limiting, caching, and error handling
 */
export abstract class BaseDocumentProvider {
  protected providerName: string;
  protected rateLimitMap: Map<string, number[]> = new Map();
  protected cache: Map<string, CacheEntry<unknown>> = new Map();
  protected readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  protected readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  protected readonly RATE_LIMIT_MAX = 30; // requests per minute

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * Check if rate limit is exceeded
   * Uses sliding window algorithm with in-memory Map
   */
  protected isRateLimited(key: string = 'global'): boolean {
    const now = Date.now();
    const requests = this.rateLimitMap.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW
    );

    if (validRequests.length >= this.RATE_LIMIT_MAX) {
      console.warn(
        `[DocumentProvider:${this.providerName}] Rate limit exceeded for key: ${key}`
      );
      return true;
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitMap.set(key, validRequests);

    return false;
  }

  /**
   * Get cached result if available and not expired
   */
  protected getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store result in cache with TTL
   */
  protected setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  protected clearCache(): void {
    this.cache.clear();
  }

  /**
   * Wrap API calls with error handling
   * Returns empty results on failure instead of throwing
   */
  protected async fetchWithErrorHandling<T>(
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`[DocumentProvider:${this.providerName}] ERROR:`, msg);
      return fallback;
    }
  }

  /**
   * Fetch JSON from URL with timeout
   */
  protected async fetchJson<T>(
    url: string,
    options?: RequestInit,
    timeout: number = 10000
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build cache key from query and options
   */
  protected getCacheKey(
    prefix: string,
    query: string,
    options?: SearchOptions
  ): string {
    const optionsStr = options
      ? JSON.stringify(options).replace(/\s+/g, '')
      : '';
    return `${prefix}:${query}:${optionsStr}`;
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract isAvailable(): boolean;
  abstract search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  abstract getDocument(externalId: string): Promise<DocumentDetail | null>;
}
