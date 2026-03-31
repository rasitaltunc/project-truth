// ═══ SPRINT 16: TARA Protocol — Manual Upload Provider ═══
// Placeholder for documents uploaded directly to the platform
// These are stored in Supabase and not searched here
// This provider exists for completeness in the provider registry

import type { SearchOptions, SearchResult, DocumentDetail, DocumentProvider } from './types';

export class ManualProvider implements DocumentProvider {
  name = 'manual' as const;
  displayName = 'Manual Upload';

  getDisplayName(): string {
    return this.displayName;
  }

  isAvailable(): boolean {
    return true;
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Manual uploads are stored in Supabase, not searched here
    // This method exists for interface compliance
    return [];
  }

  async getDocument(externalId: string): Promise<DocumentDetail | null> {
    // Manual uploads are already in our database
    // This provider doesn't fetch them
    return null;
  }
}
