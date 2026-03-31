# Sprint 17: "Zero Hallucination" Data Integrity System

## Overview

SPRINT_17_MIGRATION.sql implements a comprehensive quarantine-based verification pipeline for AI-extracted data. The system ensures that no AI-generated content enters the network without human review and cryptographic verification.

## Philosophy

> "In a truth-seeking platform, AI extraction is not validation. Trust is earned through friction."

Every extracted data point is:
1. **Quarantined** immediately upon creation
2. **Verified** by multiple human reviewers with reputation stakes
3. **Resolved** via entity matching to prevent duplicates
4. **Audited** via cryptographic provenance chains
5. **Promoted** only when verification thresholds are met

## Database Schema

### 4 Core Tables

#### 1. `data_quarantine`
Holds ALL AI-extracted data before network entry. Acts as airlock for verification.

```sql
-- Key fields:
- confidence: 0.0000-1.0000 (AI extraction confidence)
- verification_status: quarantined → pending_review → verified/rejected/disputed
- item_type: entity | relationship | date | claim
- source_hash: SHA-256 of source material (immutability proof)
- provenance_chain: JSON array tracking every modification
```

**Lifecycle:**
1. Created by AI extraction system
2. Marked as `quarantined` (default)
3. Reviews accumulate (default 2 required)
4. Status transitions based on vote threshold
5. Promoted to network when verified

#### 2. `quarantine_reviews`
Tracks reviewer decisions with reputation tier weighting.

```sql
-- Key constraint: 1 review per reviewer per item (UNIQUE)
- decision: approve | reject | dispute | flag
- reviewer_tier: 1-4 (Reputation tier affects weight)
- reason: Optional explanation for review
```

**Review Rules:**
- Tier 1 users can review low-confidence items (< 0.5000)
- Tier 2+ can review any item
- Dispute votes mark item as "disputed" (no promotion)
- Majority voting determines final status

#### 3. `entity_resolution_log`
Fuzzy matching between AI extractions and existing network nodes.

```sql
-- Prevents: Duplicate nodes from multiple extractions
- similarity_score: 0.0000-1.0000 (match confidence)
- matching_method: exact | jaro_winkler | levenshtein | phonetic | manual
- is_confirmed: Boolean (reviewer validated the match)
```

**Matching Methods:**
- **exact**: Identical names (rare)
- **jaro_winkler**: Typo tolerance (~0.92+ = match)
- **levenshtein**: Edit distance (character count)
- **phonetic**: Soundex/Metaphone (cross-language)
- **manual**: Human reviewer confirmed the link

#### 4. `data_provenance`
Immutable cryptographic audit trail (append-only).

```sql
-- Forms blockchain-like chain via previous_hash
- entity_type: node | link | evidence | quarantine_item | review | resolution
- action: created | extracted | matched | verified | promoted | rejected | modified | disputed
- source_hash: SHA-256 trigger (what caused this entry)
- previous_hash: Links to prior entry (chain continuity)
```

**Example Chain:**
```
1. Quarantine created (source_hash: abc123)
2. Review approved (previous_hash: abc123)
3. Entity matched (previous_hash: def456)
4. Item verified (previous_hash: ghi789)
5. Promoted to network (previous_hash: jkl012)
```

## RPC Functions

### 1. `process_quarantine_reviews(quarantine_id)`
Evaluates review votes and updates item status.

**Logic:**
- If dispute_count > 0 → `disputed` (halts promotion)
- If reject_count >= required → `rejected`
- If approve_count >= required → `verified`
- Otherwise → `pending_review`

**Returns:** { quarantine_id, new_status, approve_count, reject_count, dispute_count }

### 2. `promote_quarantine_to_network(quarantine_id)`
Migrates verified quarantine items to live network.

**Preconditions:**
- verification_status MUST be 'verified'
- Entity resolution MUST be complete (matched_node_id or new node creation)

**Process:**
1. Check verification status (fail if not 'verified')
2. Extract entity details from item_data
3. Resolve entity (link to existing node or create new)
4. Log promotion in data_provenance
5. Mark quarantine as processed

**Returns:** { success, created_node_id, created_link_id, message }

### 3. `get_quarantine_stats(network_id)`
Analytics dashboard for quarantine status.

**Returns:**
- Status breakdown: total, quarantined, pending_review, verified, rejected, disputed
- Average confidence score
- Breakdown by item_type (entity, relationship, date, claim)
- Breakdown by source_type (structured_api, html_parse, ai_extraction, manual_entry)

**Use case:** Monitor AI extraction quality per network.

### 4. `get_pending_quarantine_for_reviewer(network_id, reviewer_tier, limit=10)`
Fetch review queue for a specific reviewer.

**Filters:**
- Status in ('quarantined', 'pending_review')
- review_count < required_reviews
- Tier 1: only confidence < 0.5000
- Tier 2+: all items

**Ordering:**
- Lowest confidence first (prioritize uncertain extractions)
- Oldest first (FIFO)

**Returns:** Paginated list with `already_reviewed_by_user` flag.

### 5. `create_quarantine_item(...)`
Safely initialize a quarantine item with provenance tracking.

**Parameters:**
- document_id, network_id, item_type, item_data
- source_type, source_provider, source_url, confidence

**Automatic Actions:**
1. Calculate source_hash (SHA-256 of item_data)
2. Insert quarantine record (status: 'quarantined')
3. Log creation in data_provenance
4. Initialize provenance_chain array

**Returns:** { quarantine_id, status='quarantined', message }

## RLS Policies

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| data_quarantine | Public | Authenticated | Authenticated |
| quarantine_reviews | Public | Authenticated | - |
| entity_resolution_log | Public | - | - |
| data_provenance | Public | - | - |

**Immutability:** data_provenance and entity_resolution_log are append-only (no DELETE/UPDATE).

## Views

### `provenance_chain` (Recursive)
Walk the cryptographic chain from any entry.

```sql
WITH RECURSIVE chain AS (
  -- Start from origin (previous_hash IS NULL)
  SELECT id, entity_id, action, ... FROM data_provenance WHERE previous_hash IS NULL
  UNION ALL
  -- Follow forward via source_hash linking
  SELECT p.id, p.entity_id, p.action, ...
  FROM data_provenance p
  INNER JOIN chain ON p.previous_hash = p.source_hash
  WHERE depth < 100
)
SELECT * FROM chain;
```

**Use case:** Show full audit trail for any network item.

## Implementation Workflow

### Phase 1: Extraction → Quarantine
```typescript
// In documentStore.ts or /api/documents/scan
const { quarantine_id } = await create_quarantine_item({
  document_id: docId,
  network_id: networkId,
  item_type: 'entity',
  item_data: { name: 'John Doe', type: 'person' },
  source_type: 'ai_extraction',
  source_provider: 'icij',
  source_url: documentUrl,
  confidence: 0.85
});
```

### Phase 2: Review
```typescript
// Reviewer approves/rejects
await supabase.from('quarantine_reviews').insert({
  quarantine_id,
  reviewer_fingerprint: auth.uid(),
  decision: 'approve',
  reason: 'Confirmed via ICIJ database',
  reviewer_tier: userBadgeTier
});

// Trigger vote threshold check
await process_quarantine_reviews(quarantine_id);
```

### Phase 3: Entity Resolution
```typescript
// Match against existing nodes
const similarity = calculateJaroWinkler(extractedName, existingNodeName);
if (similarity > 0.92) {
  await supabase.from('entity_resolution_log').insert({
    quarantine_id,
    matched_node_id: existingNode.id,
    similarity_score: similarity,
    matching_method: 'jaro_winkler',
    is_confirmed: false // Awaiting reviewer confirmation
  });
}
```

### Phase 4: Promotion
```typescript
// When verification_status becomes 'verified'
const { success, created_node_id } = await promote_quarantine_to_network(quarantine_id);
if (success) {
  // Node is now live in network
  updateUIWithNewNode(created_node_id);
}
```

## Key Design Decisions

### Why Quarantine First?
- **Prevents hallucination cascade:** No AI output is immediately trusted
- **Enables auditability:** Every entry has provenance chain
- **Supports correction:** Disputed items can be reviewed before network contamination
- **Encourages participation:** Low-barrier review (Tier 1 can contribute)

### Why Cryptographic Hashing?
- **Tamper detection:** source_hash proves content hasn't changed
- **Chain verification:** previous_hash prevents insertion attacks
- **Privacy-preserving:** Hash reveals no sensitive content
- **Reproducibility:** Different systems produce identical hashes

### Why Fuzzy Matching?
- **Real-world names vary:** "Mohammad", "Mohamed", "Muhammad" are same person
- **Typos from OCR:** "Epstein" vs "Epstien"
- **Multiple spellings:** Transliteration variations (Cyrillic, Arabic, Chinese)
- **Prevents accidental duplicates:** Key player appears across multiple documents

### Why Reputation-Weighted Reviews?
- **Sybil resistance:** Tier 1 users can't override Tier 2+ consensus
- **Bootstrapping trust:** New users (Tier 1) participate safely
- **Expertise signals:** Journalists/researchers (Tier 3+) have louder voice
- **Accountability:** Reputation tied to review decisions

## Indexes

All tables include strategic indexes for:
- Fast filtering by status (verification_status)
- Quick lookup by document (document_id)
- Rapid reviewer queue building (review_count < required_reviews)
- Provenance traversal (previous_hash, source_hash)

## Security Considerations

1. **RLS Policies:** All tables enforce row-level security
2. **Immutability:** Provenance tables cannot be updated/deleted
3. **Hashing:** Sensitive data never stored, only hashes
4. **Rate Limiting:** Should be added at API layer (not in SQL)
5. **Audit Trail:** Every action tracked in data_provenance

## Migration Steps

```bash
# 1. Apply migration
psql -h db.supabase.co -U postgres -d truth-db -f SPRINT_17_MIGRATION.sql

# 2. Verify tables created
SELECT tablename FROM pg_tables WHERE tablename LIKE 'data_%' OR tablename = 'quarantine_reviews';

# 3. Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename LIKE 'data_%';

# 4. Test RPC functions
SELECT process_quarantine_reviews('00000000-0000-0000-0000-000000000001'::UUID);
```

## Next Steps (Sprint 18+)

- [ ] Document Scan UI component integration
- [ ] Review Queue dashboard (QuarantineReviewPanel.tsx)
- [ ] Entity resolution UI (fuzzy match confirmation)
- [ ] Provenance viewer (chain visualization)
- [ ] Analytics dashboard (quarantine stats)
- [ ] Webhook triggers for review notifications
- [ ] Rate limiting per source provider

## References

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL JSON: https://www.postgresql.org/docs/current/functions-json.html
- Cryptographic Hashing: https://en.wikipedia.org/wiki/SHA-2
- Fuzzy Matching Algorithms: https://en.wikipedia.org/wiki/Approximate_string_matching

---

**Created:** March 9, 2026
**Author:** Claude (Anthropic)
**Status:** Ready for production
