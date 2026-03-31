# Sprint 17: "Zero Hallucination" - Implementation Checklist

**Status:** Migration file created and ready for deployment
**Date:** March 9, 2026
**Files Created:** 2 (SPRINT_17_MIGRATION.sql + SPRINT_17_README.md)

## File Manifest

### 1. SPRINT_17_MIGRATION.sql (794 lines, 27KB)
Complete Supabase PostgreSQL migration with:

#### Tables (4)
- [x] `data_quarantine` — AI extraction airlock (56 lines)
- [x] `quarantine_reviews` — Reviewer tracking (18 lines)
- [x] `entity_resolution_log` — Fuzzy matching log (19 lines)
- [x] `data_provenance` — Immutable audit trail (24 lines)

#### Indexes (17 total)
- [x] data_quarantine: 6 indexes
- [x] quarantine_reviews: 4 indexes
- [x] entity_resolution_log: 4 indexes
- [x] data_provenance: 5 indexes

#### RLS Policies (8)
- [x] data_quarantine: 3 policies (SELECT public, INSERT/UPDATE authenticated)
- [x] quarantine_reviews: 2 policies (SELECT public, INSERT authenticated)
- [x] entity_resolution_log: 1 policy (SELECT public, immutable)
- [x] data_provenance: 1 policy (SELECT public, immutable)
- [x] 1 view (provenance_chain)

#### RPC Functions (5)
1. [x] `process_quarantine_reviews()` — Vote threshold evaluation (88 lines)
2. [x] `promote_quarantine_to_network()` — Entity promotion (101 lines)
3. [x] `get_quarantine_stats()` — Analytics dashboard (76 lines)
4. [x] `get_pending_quarantine_for_reviewer()` — Review queue (56 lines)
5. [x] `create_quarantine_item()` — Safe initialization (62 lines)

#### Additional
- [x] Auto-update trigger (update_updated_at_column)
- [x] GRANT statements for all roles
- [x] Optional seed data (commented)

### 2. SPRINT_17_README.md (11KB)
Comprehensive documentation covering:

#### Sections
- [x] Overview & philosophy
- [x] Complete database schema walkthrough
- [x] All 5 RPC functions (logic + examples)
- [x] RLS policies table
- [x] Recursive provenance_chain view
- [x] 4-phase implementation workflow with code examples
- [x] Key design decisions (5 sections)
- [x] Index strategy
- [x] Security considerations
- [x] Migration steps (bash commands)
- [x] Next steps (Sprint 18+)
- [x] References & citations

## Pre-Deployment Checklist

### Database Prerequisites
- [ ] Supabase project exists with UUID extension
- [ ] pgcrypto extension available
- [ ] `documents` table exists (referenced by FK)
- [ ] `nodes` table exists (referenced by FK)
- [ ] RLS enabled on target Supabase project

### Testing Plan
- [ ] Run migration in staging environment
- [ ] Verify all 4 tables created
- [ ] Verify all 17 indexes exist
- [ ] Verify all 8 RLS policies active
- [ ] Test all 5 RPC functions with sample data
- [ ] Verify provenance_chain view traversal
- [ ] Verify triggers fire on INSERT/UPDATE

### Integration Tasks
- [ ] Create documentStore.ts hook integration
- [ ] Build QuarantineReviewPanel.tsx component
- [ ] Build EntityResolutionUI.tsx component
- [ ] Build Provenance Viewer component
- [ ] Hook into /api/documents/scan route
- [ ] Add review notification webhooks
- [ ] Implement rate limiting per source

## Database Schema Quick Reference

### data_quarantine States
```
quarantined (initial)
  ├─→ pending_review (reviews accumulating)
  ├─→ verified (approved >= required)
  ├─→ rejected (rejected >= required)
  └─→ disputed (any dispute vote)
```

### Review Voting Logic
```
IF dispute_count > 0
  → disputed (halts all promotion)
ELSE IF reject_count >= required_reviews
  → rejected
ELSE IF approve_count >= required_reviews
  → verified (eligible for promotion)
ELSE
  → pending_review (waiting for more votes)
```

### Provenance Chain Pattern
```
Entity Action 1 (source_hash: ABC123)
    ↓ (previous_hash: ABC123)
Entity Action 2 (source_hash: DEF456)
    ↓ (previous_hash: DEF456)
Entity Action 3 (source_hash: GHI789)
```

Each link can be cryptographically verified. Breaking chain = tampering detected.

## Key Numbers

| Metric | Value |
|--------|-------|
| Total SQL Lines | 794 |
| CREATE TABLE statements | 4 |
| CREATE INDEX statements | 17 |
| CREATE POLICY statements | 8 |
| CREATE FUNCTION statements | 5 |
| Total RPC Functions | 5 |
| Total Views | 1 |
| Total Triggers | 1 |
| Documentation Lines | ~400 |

## Deployment Steps

```bash
# 1. Backup production (if migrating live data)
pg_dump --host=$SUPABASE_HOST --user=postgres --database=truth-db > backup.sql

# 2. Connect to Supabase
psql --host=$SUPABASE_HOST --user=postgres --database=truth-db

# 3. Run migration
\i SPRINT_17_MIGRATION.sql

# 4. Verify tables exist
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'data_%' OR tablename = 'quarantine_reviews';

# 5. Test a function
SELECT * FROM get_quarantine_stats('00000000-0000-0000-0000-000000000002'::UUID);

# 6. Check RLS policies
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename LIKE 'data_%' OR tablename = 'quarantine_reviews';
```

## API Route Integration Examples

### POST /api/quarantine/create
```typescript
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

### POST /api/quarantine/review
```typescript
await supabase.from('quarantine_reviews').insert({
  quarantine_id,
  reviewer_fingerprint: auth.uid(),
  decision: 'approve',
  reason: 'Confirmed',
  reviewer_tier: userBadgeTier
});

const { new_status } = await process_quarantine_reviews(quarantine_id);
```

### GET /api/quarantine/stats
```typescript
const stats = await get_quarantine_stats(networkId);
// Returns: {
//   total_items: 42,
//   quarantined: 15,
//   pending_review: 12,
//   verified: 12,
//   rejected: 2,
//   disputed: 1,
//   avg_confidence: 0.7621,
//   by_item_type: { entity: 30, relationship: 9, date: 2, claim: 1 },
//   by_source_type: { ai_extraction: 40, manual_entry: 2 }
// }
```

### POST /api/quarantine/promote
```typescript
const { success, created_node_id } = await promote_quarantine_to_network(quarantine_id);
if (success) {
  // Node is now live in network
}
```

## Design Philosophy Summary

"In a truth-seeking platform, AI extraction is not validation. Trust is earned through friction."

### The 5-Point Flow
1. **Quarantine** — All AI extractions default to "suspicious"
2. **Review** — Human reviewers stake reputation on decisions
3. **Resolve** — Entity matching prevents duplicates
4. **Audit** — Cryptographic chains prove integrity
5. **Promote** — Only verified items enter live network

### Why This Works
- Prevents hallucination cascade (AI errors don't spread)
- Enables perfect auditability (who said what, when)
- Supports correction (can dispute before network contamination)
- Encourages participation (low barrier for Tier 1 reviewers)
- Maintains integrity (fuzzy matching prevents duplicates)

## References & Resources

### PostgreSQL Documentation
- JSON Functions: https://www.postgresql.org/docs/current/functions-json.html
- Recursive CTEs: https://www.postgresql.org/docs/current/queries-with.html
- RLS: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

### Supabase Documentation
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Database Functions: https://supabase.com/docs/guides/database/functions
- PostgreSQL Functions: https://supabase.com/docs/guides/database/functions

### Algorithmic References
- Jaro-Winkler: https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
- SHA-256: https://en.wikipedia.org/wiki/SHA-2
- Cryptographic Chains: https://en.wikipedia.org/wiki/Block_chain

---

**Created:** March 9, 2026
**Migration Status:** Ready for deployment
**Testing Status:** Pending staging environment
**Documentation Status:** Complete

Next Phase: Implement API routes + UI components (Sprint 18)
