# Quick Reference: How Court Systems Identify Entities
## Answers to Your 8 Questions

---

### 1. How do US federal courts (PACER/ECF) identify parties?

**Reality:** No unique person IDs. Uses party name + case number.

**Party Designations:**
- "Plaintiff 1" / "Defendant 2"
- "Defendant 1-A" (co-defendant)

**Case Number Format:** `2:18-cr-7993`
- 2 = Second Circuit
- 18 = Year (2018)
- cr = Criminal
- 7993 = Sequential number

**Problem:** Same person in 2 different cases = 2 separate records (unlinked by PACER)

---

### 2. How does CourtListener/RECAP handle entity disambiguation?

**Method:**
1. Ingests raw PACER party names
2. Assigns internal IDs via deduplication
3. Maintains referents array (all variant IDs for same person)
4. Uses fuzzy matching + human review

**API Endpoints:**
- `/api/rest/v3/people/` — persons
- `/api/rest/v3/parties/` — parties per case

**What's Not Exposed:**
- Matching algorithms (proprietary)
- Confidence scores (used internally only)
- Cross-jurisdiction linking (each state separate)

---

### 3. What identifiers exist WITHIN court documents?

**Unique-at-Document Level:**
| ID | Format | Scope |
|----|--------|-------|
| Case Number | 2:18-cv-03224 | Entire case |
| Docket Entry | 1, 23, 145 | Specific filing |
| Party Designation | "Defendant 1" | This case only |
| Accession Number | 118903244034 | PACER internal |
| Redaction Code | "Doe-123" | Sealed parties |

**Disambiguation Data (Mostly Redacted):**
- Birth date ✗ (redacted)
- SSN ✗ (redacted)
- Address ✗ (redacted)
- Driver's license ✗ (redacted)
- Occupation ✓ (usually public)
- Attorney name ✓ (often useful)
- Phone number ✗ (rarely included)
- Email ✓ (more common now)

---

### 4. How do Westlaw/LexisNexis handle multiple John Smiths?

**What We Know:**
- Proprietary deduplication (not published)
- Field indexing: Name, jurisdiction, case type, date
- Entity matching happens pre-indexing
- Confidence scores used internally (not exposed)

**Key Limitation:**
- Treat each state/jurisdiction separately
- Requires separate searches for same name across states

**What's NOT Available:** Methodology, API access to matching logic

---

### 5. International courts (ICC, ECHR, ICJ) — unique identifiers?

**Answer: NO unified system. Each court separate.**

**ICC (International Criminal Court):**
- Case-specific IDs only
- Heavy witness redaction ("Witness X", "Protection #123")
- No public person-to-person linking

**ECHR (European Court of Human Rights):**
- Case-based ID: `App. no. 12345/18`
- Applicant names usually public (sometimes redacted)
- No cross-case person linking

**ICJ (International Court of Justice):**
- State-based (not person-based)
- Case name + year = identifier

---

### 6. ICIJ entity resolution methodology?

**Their Approach:**
1. OCR documents
2. Extract name + address + company
3. Manual journalist review
4. Merge duplicates by hand
5. Store document reference (file path + page number)

**"John Smith" Solution:**
- Name + Address + Company = entity fingerprint
- Fuzzy address matching (handles typos)
- Network inference (shared company/address = likely same person)

**Critical Limitation:**
- No published ID system
- No API; database-specific IDs only
- Non-scalable but ~99% accurate

---

### 7. How investigative journalism DBs identify entities?

**ICIJ Offshore Leaks Database:**
- Entity pages at: `offshoreleaks.icij.org/nodes/[type]/[id]`
- Query by: Name, location, company (no direct ID search)
- Internal IDs only (can't look up by ID)

**OpenSanctions (Different, More Systematic):**
- NK-IDs (canonical, e.g., `nk-a1b2c3d4e5f6`)
- Q-IDs (Wikidata, e.g., `Q12345678`)
- Source IDs (pre-dedup, e.g., `ofac-1234`)
- Referents array tracks all historical IDs

**OCCRP Aleph:**
- Mentioned in CLAUDE.md
- Documentation sparse online
- Uses FollowTheMoney (FtM) schema

---

### 8. Universal person identifier systems?

**Summary: NONE exist for legal/court persons**

| System | Scope | Format | Users |
|--------|-------|--------|-------|
| **LEI** | Organizations ONLY | 20-char alphanumeric | 4M entities |
| **ORCID** | Researchers only | 16-digit number | 11M researchers |
| **Wikidata** | Notable people only | Q + number | 102M entities |
| **VIAF** | Historical figures mainly | Numeric ID | 65M identities |
| **Tax ID** | US persons + orgs | 9-digit SSN/EIN | Universal (redacted) |
| **Passport** | International | Country-specific | Non-universal |
| **Driver License** | State-specific | Format varies | Non-universal |

**Why no universal person ID?**
- Privacy laws (GDPR, CCPA)
- Governments don't share person registries
- Identity theft concerns
- Multiple valid identities (married name, etc.)

---

## OpenSanctions: THE TRANSPARENT SYSTEM

### ID Structure
**Two-tier system:**

1. **Canonical ID** (after deduplication)
   - NK-ID: `nk-epstein-j` (randomly generated)
   - Q-ID: `Q5389410` (Wikidata, if well-known)

2. **Source IDs** (before deduplication)
   - Format: `[DATASET]-[ID]`
   - Examples: `ofac-20181106`, `eu-fsf-epstein-j`

### Referents Array
```json
{
  "id": "nk-epstein-j",
  "referents": [
    "ofac-20181106",
    "eu-fsf-epstein-j",
    "icij-panama-12345",
    "fbi-wanted-9876"
  ]
}
```
Tracks all IDs that map to this person.

### Deduplication Timeline
- **Ingestion:** New data enters system
- **12-72 hours:** Deduplication process runs
  - Scoring algorithm (Jaro-Winkler)
  - LLM-assisted review for uncertain matches
  - Confidence >= 0.85 = auto-merge
  - Below 0.85 = human review
- **Result:** Entities merged, referents array updated

### Confidence Thresholds
- **>= 0.85:** Auto-merge
- **0.70-0.85:** Peer review required
- **< 0.70:** Discard suggestion

### Their Dedup Strategy: "Selective Heuristics"
- Never invent data (if conflict, mark uncertain)
- Conservative approach (prefers false negative to false positive)
- Publish confidence scores (only system that does)

---

## What Works in Practice

**BEST (Most Published + Scalable):**
OpenSanctions model:
- Transparent methodology
- LLM-assisted review
- Confidence scoring
- Referents array for historical IDs
- Production-proven

**MOST ACCURATE (Least Scalable):**
ICIJ/Casework model:
- Human journalist curation
- Document-level provenance
- ~99% accuracy
- Can't scale beyond editorial team

**HYBRID (Recommended for Project Truth):**
OpenSanctions + Peer Review:
- Automated matching (Jaro-Winkler)
- Confidence threshold gate
- Human peer review for gray area
- Public transparency on confidence scores

---

## For Project Truth Implementation

### Database Columns (Minimum)
```sql
nodes table:
  - id (canonical UUID)
  - name_variants TEXT[] (all variant names)
  - referents TEXT[] (historical IDs)
  - source_ids TEXT[] (original data source IDs)
  - name_confidence JSONB (confidence per variant)
  - merge_confidence DECIMAL (0.0-1.0)
  - merged_from_nodes UUID[] (provenance)
```

### Algorithm (Simple Version)
```
IF exact_name_match:
  confidence = 1.0 → auto-merge
ELSE IF fuzzy_match (Jaro-Winkler >= 0.90):
  score = jaro_winkler_distance
  IF birth_date_matches: +0.15
  IF address_matches: +0.20
  IF occupation_matches: +0.10
  IF confidence >= 0.85: auto-merge
  ELIF confidence >= 0.70: queue for peer review
```

### What Confidence Scores Mean
- **1.0:** Definitive (exact match)
- **0.95-1.0:** Very confident (auto-merge)
- **0.85-0.95:** Confident (merge + notification)
- **0.70-0.85:** Moderate (peer review required)
- **< 0.70:** Low confidence (discard)

---

## Key Takeaways

1. **No universal person ID exists globally** — every system uses local deduplication

2. **PACER doesn't link duplicate parties** — same person in 2 cases = 2 separate records

3. **CourtListener de-duplicates post-ingest** — using fuzzy matching + human review

4. **OpenSanctions is the only published methodology** — everyone else uses proprietary algorithms

5. **Confidence scoring is crucial** — never trust AI dedup at 100%; always expose confidence

6. **Referents array is your friend** — lets you track all ID aliases for backward compatibility

7. **Multi-source correlation is best** — PACER + ICIJ + OpenSanctions together > any single source

8. **Privacy prevents perfection** — PACER redacts birth dates, SSNs, addresses; you'll have gaps

---

## Files to Read (Priority Order)

**For Quick Understanding (30 min):**
- This file (QUICK_REFERENCE.md)
- Section "OpenSanctions: THE TRANSPARENT SYSTEM" above

**For Implementation (2 hours):**
- project_truth_entity_id_system.md (SQL + algorithm + checklist)

**For Deep Dive (4 hours):**
- entity_identification_research.md (all 8 research questions + sources)

---

**Context:** Research for Project Truth entity deduplication system
**Date:** March 25, 2026
**Relevant to:** Sprint 17 (Zero Hallucination), Game Bible v5, CLAUDE.md Unique Code System

