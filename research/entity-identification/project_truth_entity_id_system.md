# PROJECT TRUTH: ENTITY IDENTIFICATION SYSTEM SPECIFICATION
## Practical Implementation Guide for John Smith Problem

**Date:** March 25, 2026
**Audience:** Claude, Raşit (founder)
**Context:** Aligns with Sprint 17 (Zero Hallucination) + Game Bible v5

---

## ARCHITECTURE DECISION

**Adopt: OpenSanctions Model + Peer Review Gate**

This is the ONLY published system that balances:
- Scientific rigor (Jaro-Winkler + LLM confidence scoring)
- Transparency (publishes merge logic, confidence scores, historical IDs)
- Scalability (automated + human review hybrid)
- Auditability (immutable referents array tracks all ID versions)

---

## SCHEMA: NODES TABLE (UPDATED)

```sql
-- CURRENT (pre-update)
CREATE TABLE nodes (
  id UUID PRIMARY KEY,
  network_id UUID REFERENCES networks(id),
  name TEXT NOT NULL,
  type VARCHAR(50),  -- 'person', 'organization', 'location'
  tier INTEGER,
  risk INTEGER
);

-- PROPOSED (post-update)
CREATE TABLE nodes (
  id UUID PRIMARY KEY,  -- canonical ID: truth-[network]-[uuid]
  network_id UUID REFERENCES networks(id),
  
  -- Core Identity
  name TEXT NOT NULL,   -- primary canonical name
  name_variants TEXT[] NOT NULL,  -- all variant names
  type VARCHAR(50),     -- 'person', 'organization', 'location'
  
  -- Source Tracking
  source_ids TEXT[] NOT NULL,  -- [pacer-18-cr-7993, icij-panama-12345]
  source_documents TEXT[] NOT NULL,  -- [case:2:18-cr-7993, dataset:panama-papers]
  referents TEXT[] NOT NULL,  -- historical IDs (OpenSanctions model)
  
  -- Disambiguation Fields
  birth_date DATE,
  birth_date_confidence DECIMAL(3,2),  -- 0.0-1.0
  address TEXT,
  address_confidence DECIMAL(3,2),
  occupation TEXT,
  occupation_confidence DECIMAL(3,2),
  
  -- Name Confidence Mapping
  name_confidence JSONB,  -- { "Jeffrey Epstein": 0.99, "J. Epstein": 0.85, "Jeff E.": 0.60 }
  weak_aliases TEXT[],  -- ambiguous names that could be other people
  
  -- Deduplication History
  merged_from_nodes UUID[],  -- nodes that were merged into this one
  merge_confidence DECIMAL(3,2),
  last_merge_at TIMESTAMP,
  
  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  first_seen_at TIMESTAMP,
  last_change_at TIMESTAMP,
  created_by_user_id UUID,
  
  -- Network Position
  tier INTEGER,
  risk INTEGER,
  
  -- Full-text search
  search_vector tsvector
);

CREATE INDEX idx_nodes_name_variants ON nodes USING GIN (name_variants);
CREATE INDEX idx_nodes_referents ON nodes USING GIN (referents);
CREATE INDEX idx_nodes_source_ids ON nodes USING GIN (source_ids);
```

---

## DEDUPLICATION ALGORITHM

### Phase 1: Automated Matching (12 minutes)
Runs immediately when node created or updated.

```
INPUT: new_node = { name, birth_date, occupation, address }
OUTPUT: [match_1(confidence=0.95), match_2(confidence=0.78), match_3(confidence=0.42)]

ALGORITHM:
1. Exact name match
   IF name == existing_node.name → confidence = 1.0

2. Fuzzy name match (Jaro-Winkler)
   score = jaro_winkler_distance(name, existing_node.name)
   IF score >= 0.90 → confidence = score * 0.9

3. Birth date match (±2 years tolerance)
   IF |birth_date - existing_node.birth_date| <= 2 years → +0.15 confidence
   ELSE IF conflicting dates → -0.30 confidence (penalize)

4. Address match (fuzzy street matching)
   score = fuzzy_match(address_street, existing_node.address_street)
   IF score >= 0.85 → +0.20 confidence

5. Occupation match (keyword matching)
   IF occupation_keywords overlap >= 70% → +0.10 confidence

6. Network inference (shared connections)
   shared_links = count(incoming/outgoing links in common)
   IF shared_links >= 3 → +0.20 confidence

COMPOSITE SCORE: confidence = sum(weighted factors) / total_weight
  - Exact name: weight 0.40
  - Fuzzy name: weight 0.30
  - Birth date: weight 0.15
  - Address: weight 0.10
  - Occupation: weight 0.05
```

### Phase 2: Confidence Threshold Gate
```
IF confidence >= 0.85:
  → Auto-merge (low-risk, high-confidence matches)
  → Create merge record
  → Add to referents array
  → Email Tier 2+ users of merge (notification, not decision)

ELSE IF 0.70 <= confidence < 0.85:
  → Flag for review (medium-confidence matches)
  → Add to "Peer Review Queue"
  → Require 1 Tier 2 approval before merge
  → Track accuracy (measure if human agrees with AI)

ELSE:
  → Discard (low-confidence, too noisy)
  → Log for debugging
```

### Phase 3: Peer Review (24-72 hours)
For flagged matches, show reviewers:
```
MATCH CANDIDATE:
Node A: Jeffrey Epstein
  - Source: PACER case 2:18-cr-7993
  - Birth date: 1953-01-20 (confidence: 1.0)
  - Address: 9 East 71st St, New York (confidence: 0.92)
  - Occupation: financier (confidence: 0.85)

Node B: Jeffrey Epstein
  - Source: ICIJ Panama Papers
  - Birth date: [not found]
  - Address: 91 Mount Street, London (confidence: 0.78)
  - Occupation: financier/shell company owner (confidence: 0.90)

ALGORITHM CONFIDENCE: 0.82 (medium)
RECOMMENDATION: Could be same person, confirm with documents

[APPROVE MERGE] [REJECT MERGE] [KEEP SEPARATE]
```

---

## IMPLEMENTATION CHECKLIST

### Database Migration (Week 1)
- [ ] Add new columns to nodes table (name_variants, referents, source_ids, etc.)
- [ ] Create deduplication_queue table
- [ ] Create merge_history table (immutable audit log)
- [ ] Backfill name_confidence for existing nodes (default 1.0 for canonical names)
- [ ] Create indexes for full-text search

### API Routes (Week 2)
- [ ] `POST /api/entities/merge-review` — Show pending merges
- [ ] `POST /api/entities/[id]/merge` — Accept/reject merge
- [ ] `GET /api/entities/[id]/referents` — List all historical IDs
- [ ] `GET /api/entities/search` — Query with confidence filtering
- [ ] `GET /api/entities/[id]/merge-history` — Audit trail

### UI Components (Week 3)
- [ ] NodeProfile.tsx — Show name_variants, referents, source_ids, confidence scores
- [ ] DeduplicationReviewQueue.tsx — Peer review interface
- [ ] EntitySearchWithAlternatives.tsx — Show fuzzy matches with confidence
- [ ] ReferentsBadge.tsx — "Also known as: [Epstein, Jeff E., J. Epstein]"

### QA & Testing (Week 4)
- [ ] Jaro-Winkler accuracy test (100 real name pairs)
- [ ] Merge accuracy rate (manual spot-check, target >= 95%)
- [ ] Performance test (can match 1000 new entities/day)
- [ ] Referents array integrity (no orphaned IDs)

---

## HANDLING THE "JOHN SMITH" PROBLEM

### Scenario: 50 people named "John Smith" in different cases

```
Database state:
  Node 1: "John Smith" (age 45, contractor, Texas)
  Node 2: "John Smith" (age 32, banker, New York)
  Node 3: "John Smith" (age 67, retired, Florida)
  Node 4: "John Smith" (age 45, contractor, Texas) ← duplicate of Node 1
  Node 5: "John Robert Smith" (age 45, contractor, Texas) ← likely Node 1

When user searches "John Smith":
  Results:
    [×] Node 1: "John Smith" (45, contractor, TX) 
        Also known as: J. Smith, John R. Smith
        Confidence variants: { "John Smith": 1.0, "John Robert Smith": 0.95 }
    
    [×] Node 2: "John Smith" (32, banker, NY)
        Also known as: J.S.
        Confidence variants: { "John Smith": 1.0, "J.S.": 0.70 }
    
    [×] Node 3: "John Smith" (67, retired, FL)
        Also known as: [none]
        Confidence variants: { "John Smith": 1.0 }

When Node 4 added (duplicate):
  Algorithm: confidence = 0.99 (exact name + same age + same occupation + same address)
  Action: Auto-merge
    - Node 4 → merged into Node 1
    - Node 1.referents = ["pacer-18-cv-4567", "pacer-18-cv-7890"]
    - Node 1.source_ids = ["pacer-18-cv-4567", "pacer-18-cv-7890"]
    - Notification to users: "John Smith (contractor, TX) merged from 2 cases"

When Node 5 added ("John Robert Smith"):
  Algorithm: confidence = 0.92 (fuzzy match 0.88 + birth date 1.0 + address 0.95)
  Action: Flag for review
    - Added to peer review queue
    - Tier 2 user sees: "Is 'John Robert Smith' same as 'John Smith'?"
    - If approved: merged, confidence_variants updated
    - If rejected: kept separate, Node 5.name_confidence["John Robert Smith"] = 1.0
```

---

## CONFIDENCE SCORING FOR AI SYSTEMS

### When your Groq AI suggests an entity:
```
AI extraction: "Jeffrey Epstein mentioned"

LOOKUP:
  - Exact match found: truth-epstein-j
  - Confidence: 1.0 (definitive, internal schema)
  - Present to user as: "DEFINITIVE MATCH"

AI extraction: "J. Epstein"

LOOKUP:
  - Fuzzy match found: truth-epstein-j
  - Confidence in name variant: 0.85
  - Present to user as: "LIKELY MATCH (85% confidence) [Confirm?]"

AI extraction: "Epstein J."

LOOKUP:
  - Weak alias found: truth-epstein-j
  - Confidence in weak alias: 0.60
  - Present to user as: "UNCERTAIN - Could be Jeffrey or other Epstein [Help us!]"
```

---

## TRANSPARENCY & PUBLIC EXPOSURE

### Public Node Page
```
Node: Jeffrey Epstein
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Name: Jeffrey Epstein
Also Known As: Jeff Epstein, J. Epstein

Birth Date: January 20, 1953 (confident)
Address: 9 East 71st St, New York (from PACER)
Occupation: Financier (mentioned in 12 documents)

───────────────────────────
Sources:
  • PACER case 2:18-cr-7993 [Federal indictment]
  • ICIJ Panama Papers [corporate registration]
  • OFAC sanctions list [government list]

───────────────────────────
Historical IDs (Referents):
  • truth-epstein-j (current)
  • pacer-18-cr-7993
  • icij-panama-12345
  • ofac-20181106

───────────────────────────
Name Confidence:
  "Jeffrey Epstein": 99% ✓✓✓ [11 direct matches]
  "Jeff Epstein": 85% ✓✓ [3 document refs]
  "J. Epstein": 60% ✓ [weak alias, could be other]

───────────────────────────
Recent Changes:
  Mar 22: Merged from 2 duplicate entries
  Mar 15: Added ICIJ Panama Papers source
  Mar 10: Birth date confirmed from court record
```

### Monthly Deduplication Report (Public)
```
March 2026 Deduplication Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total new entities: 427
Auto-merged (confidence >= 0.85): 12
Peer-reviewed (0.70-0.85 confidence): 8
Manual review rejected: 1
False positive rate: 0.8% ← lower is better

Merge confidence distribution:
  >= 0.95: 78%
  0.90-0.95: 18%
  0.85-0.90: 4%

```

---

## RISK MITIGATION: FALSE POSITIVES

**Problem:** "John Smith" contractor merges with "John Smith" banker by accident

**Prevention Layers:**
1. **Birth date conflict:** Score penalty of -0.30 (moves from 0.85→0.55)
2. **Address mismatch:** "Texas" vs "New York" = conflict, score penalty -0.25
3. **Occupation divergence:** "contractor" vs "banker" = semantic mismatch, -0.15
4. **Manual review gate:** Anything below 0.85 requires human approval
5. **Audit trail:** Every merge logged with user who approved + timestamp
6. **Rollback capability:** If merge wrong, can un-merge with one click (referents array enables this)

**Worst Case (Merge Approved, Later Found Wrong):**
```
→ Create "demerge" record in merge_history
→ Restore separate nodes
→ Notify original users who saw merged version
→ Log user who approved incorrect merge (for QA)
→ Run deduplication audit on affected edges (other nodes might be wrong too)
```

---

## INTEGRATION WITH OTHER SYSTEMS

### OpenSanctions API Integration
```python
def maybe_link_to_opensanctions(node):
    """When creating node, check if it exists in OpenSanctions"""
    
    os_result = opensanctions_api.search(
        name=node.name,
        birth_date=node.birth_date,
        threshold=0.80
    )
    
    if os_result.confidence >= 0.90:
        # High confidence match
        node.external_references.append({
            "system": "opensanctions",
            "id": os_result.id,  # e.g., "nk-epstein-j"
            "confidence": os_result.confidence,
            "source": "automatic_lookup"
        })
    
    elif 0.70 <= os_result.confidence < 0.90:
        # Medium confidence - flag for review
        add_to_review_queue({
            "candidate_node": node.id,
            "external_match": os_result.id,
            "confidence": os_result.confidence,
            "source": "opensanctions"
        })
```

### CourtListener API Integration
```python
def link_to_courtlistener(case_number, party_name):
    """Before creating node, check CourtListener for party"""
    
    cl_party = courtlistener_api.get_party(
        case_number=case_number,
        name=party_name
    )
    
    if cl_party:
        return {
            "canonical_id": node.id,
            "source_id": cl_party.id,
            "source_system": "courtlistener",
            "confidence": 1.0  # Trust CL for official party data
        }
```

---

## GLOSSARY FOR CLAUDE

**Canonical ID:** The "main" ID for an entity (e.g., `truth-epstein-j`). All queries resolve to this.

**Referents:** Array of all IDs that map to the canonical ID. Used for forwarding old references.

**Confidence Score:** 0.0-1.0 probability that two entities are the same person.
- 0.95-1.0: Very confident (auto-merge)
- 0.85-0.95: Confident (merge with notification)
- 0.70-0.85: Moderate (peer review required)
- <0.70: Low (discard suggestion)

**Jaro-Winkler Distance:** String similarity metric (0.0 = completely different, 1.0 = identical). Works well for names with typos.

**Name Variant:** Different ways same person can be referred to (John Smith, J. Smith, John Robert Smith).

**Weak Alias:** Name variant that is ambiguous (could refer to multiple people).

**Merge History:** Immutable log of when two entities were combined and who approved it.

**Demerge:** Undoing a merge when it was incorrect.

---

## WHEN TO USE THIS (DECISION TREE)

```
I have a "duplicate" problem:
  ↓
Is it an EXACT match? (same name + same case)
  YES → Auto-merge confidence 1.0
  NO → Continue
  
Is it a FUZZY match? (same name, different cases, might be same person)
  YES → Run algorithm, confidence score emerges
  NO → Stop, not a duplication problem

Confidence >= 0.85?
  YES → Auto-merge + notification
  NO → Flag for peer review

Peer reviewer approved merge?
  YES → Merge + update referents
  NO → Keep separate, log decision

Entity found in OpenSanctions?
  YES → Link automatically (confidence >= 0.90)
  MAYBE → Flag for review (0.70-0.90)
  NO → Create new node

Later found to be wrong merge?
  → Demerge + audit + learn
```

---

## SUCCESS METRICS (Measure These)

- **Merge accuracy:** >= 95% (manual spot check)
- **False positive rate:** <= 2% (merges that shouldn't have happened)
- **False negative rate:** <= 5% (duplicates that weren't caught)
- **User trust:** % of Tier 2 users who check/approve merges
- **Processing speed:** New entities matched within 5 minutes
- **Audit trail completeness:** 100% of merges logged with approver + timestamp

---

**Ownership:** Claude (research/design), Raşit (architecture decisions), Tier 2+ users (peer review)
**Timeline:** Design complete, implementation in next sprint
**Related:** Sprint 17 (Zero Hallucination), Game Bible v5 (Staking/Consensus), CLAUDE.md (Unique Code System)

