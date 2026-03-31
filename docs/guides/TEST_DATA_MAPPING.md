# AI-OS PROJECT TRUTH — TEST DATA MAPPING GUIDE

## Quick Reference for Test Scenarios

### Network Query Tests

**1. All Nodes in Network**
```sql
SELECT * FROM nodes WHERE network_id = (SELECT id FROM networks WHERE slug = 'epstein-network');
-- Expected: 40 rows
```

**2. All Links in Network**
```sql
SELECT l.*, n1.name as source_name, n2.name as target_name
FROM links l
JOIN nodes n1 ON l.source_id = n1.id
JOIN nodes n2 ON l.target_id = n2.id
WHERE l.network_id = (SELECT id FROM networks WHERE slug = 'epstein-network');
-- Expected: 57 rows
```

### Risk Assessment Tests

**1. High-Risk Nodes (risk >= 80)**
```
- Jeffrey Epstein (95)
- Little St. James Island (95)
- Lolita Express (90)
- MC2 Model Management (80)
- Palm Beach Residence (80)
- The Black Book (85)
-- Expected: 6 nodes
```

**2. Critical Path (Epstein → Ghislaine → Victims)**
```
- Jeffrey Epstein (95) → Ghislaine Maxwell (75) → Virginia Giuffre (30)
- Jeffrey Epstein (95) → Ghislaine Maxwell (75) → Annie Farmer (20)
- Jeffrey Epstein (95) → Jean-Luc Brunel (70) → MC2 Model Management (80)
-- Test path strength calculation
```

### Verification Level Tests

**1. Official Verification (16 nodes)**
```
- Jeffrey Epstein, Ghislaine Maxwell, Virginia Giuffre, Courtney Wild, Annie Farmer, Sarah Kellen
- Nadia Marcinkova, Alan Dershowitz, Prince Andrew, Joi Ito, Alexander Acosta, Adriana Ross
- Little St. James Island, 9 East 71st Street NYC, Lolita Express, The Black Book
```

**2. Journalist Verification (15 nodes)**
```
- Sarah Ransome, Sarah Kellen, Les Wexner, Glenn Dubin, MIT Media Lab, etc.
-- Lower confidence, requires corroboration
```

### Geographic Filtering Tests

**1. USA Nodes (25 nodes)**
- All except: Prince Andrew (GBR), Jean-Luc Brunel (FRA), 22 Avenue Foch (FRA), etc.

**2. Multi-Country Nodes**
- Ghislaine Maxwell: [USA, GBR, FRA]
- Virginia Giuffre: [USA, AUS, GBR]
- Lolita Express: [USA, VIR]

**3. Single-Country Nodes (Query optimization test)**
```sql
SELECT COUNT(*) FROM nodes WHERE array_length(country_tags, 1) = 1;
-- Expected: ~15 nodes
```

### Evidence & Confidence Tests

**1. Highest Confidence Links (confidence >= 0.95)**
```
- Virginia Giuffre → Jeffrey Epstein (0.95)
- JP Morgan Chase → Jeffrey Epstein (0.98)
- Little St. James Island → Jeffrey Epstein (0.99)
- 9 East 71st Street NYC → Jeffrey Epstein (0.99)
- Lolita Express → Jeffrey Epstein (0.99)
- L Brands → Les Wexner (0.99)
- Alexander Acosta → Jeffrey Epstein (0.99)
- Lolita Express → Little St. James Island (0.96)
-- Expected: 8 links
```

**2. Primary Source Links**
```sql
SELECT COUNT(*) FROM links WHERE source_hierarchy = 'primary';
-- Expected: ~35 links (61%)
```

**3. Secondary Source Links**
```sql
SELECT COUNT(*) FROM links WHERE source_hierarchy = 'secondary';
-- Expected: ~15 links (26%)
```

**4. Tertiary Source Links (weaker evidence)**
```sql
SELECT COUNT(*) FROM links WHERE source_hierarchy = 'tertiary';
-- Expected: ~7 links (13%)
```

### Evidence Type Distribution Tests

**1. Court Records (18)**
- Virginia Giuffre → Jeffrey Epstein, Alan Dershowitz, Ghislaine Maxwell
- Annie Farmer → Jeffrey Epstein, Ghislaine Maxwell
- Maria Farmer → Jeffrey Epstein, Ghislaine Maxwell
- Jeffrey Epstein → Ghislaine Maxwell, Les Wexner, Alan Dershowitz, Jean-Luc Brunel
- Alexander Acosta → Jeffrey Epstein, Alan Dershowitz
- Glenn Dubin → Jeffrey Epstein
- Adriana Ross → Jeffrey Epstein
- MC2 Model Management → Jeffrey Epstein
- The Black Book → Jeffrey Epstein
- Ghislaine Maxwell inner circle: Sarah Kellen, Nadia Marcinkova, Lesley Groff

**2. Official Documents (15)**
- Little St. James Island → Jeffrey Epstein, Ghislaine Maxwell
- 9 East 71st Street NYC → Jeffrey Epstein, Les Wexner, Ghislaine Maxwell
- Zorro Ranch → Jeffrey Epstein
- Palm Beach Residence → Jeffrey Epstein
- Lolita Express: Jeffrey Epstein, Bill Clinton, Prince Andrew, Ghislaine Maxwell, Little St. James
- Gulfstream IV → Jeffrey Epstein
- L Brands: Les Wexner, Jeffrey Epstein
- MIT Media Lab: Jeffrey Epstein, Joi Ito
- 22 Avenue Foch → Jeffrey Epstein
- Eva Dubin → Jeffrey Epstein, Glenn Dubin
- The Black Book → Ghislaine Maxwell

**3. Financial Records (5)**
- JP Morgan Chase → Jeffrey Epstein
- Deutsche Bank → Jeffrey Epstein
- L Brands → Jeffrey Epstein
- All "financial" relationship types

**4. Witness Testimony (10)**
- Virginia Giuffre → Prince Andrew, Alan Dershowitz (implied)
- Sarah Ransome → Little St. James Island
- Courtney Wild → Palm Beach Residence
- Annie Farmer → Zorro Ranch
- Maria Farmer: Jeffrey Epstein, Ghislaine Maxwell, Les Wexner, NYC Townhouse
- MC2 Model Management → Ghislaine Maxwell
- Adriana Ross → Ghislaine Maxwell

### Relationship Type Tests

**1. Victim Relationships**
```
- Virginia Giuffre, Sarah Ransome, Courtney Wild, Annie Farmer, Maria Farmer
-- Each has at least 2 victim links to perpetrators
```

**2. Financial Relationships**
```
- JP Morgan Chase → Jeffrey Epstein
- Deutsche Bank → Jeffrey Epstein
- L Brands → Jeffrey Epstein
- MIT Media Lab → Jeffrey Epstein
-- Test financial flow reconstruction
```

**3. Ownership Relationships**
```
- Little St. James Island → Jeffrey Epstein (0.99 confidence)
- 9 East 71st Street NYC → Jeffrey Epstein (0.99 confidence)
- Zorro Ranch → Jeffrey Epstein (0.97 confidence)
- Palm Beach Residence → Jeffrey Epstein (0.98 confidence)
- Lolita Express → Jeffrey Epstein (0.99 confidence)
- Gulfstream IV → Jeffrey Epstein (0.97 confidence)
- L Brands → Les Wexner (0.99 confidence)
- MC2 Model Management → Jean-Luc Brunel (0.95 confidence)
-- Test property graph queries
```

**4. Travel Relationships**
```
- Sarah Ransome → Little St. James Island
- Courtney Wild → Palm Beach Residence
- Annie Farmer → Zorro Ranch
- Maria Farmer → 9 East 71st Street NYC
- Lolita Express → Bill Clinton, Prince Andrew, Ghislaine Maxwell, Little St. James
-- Test timeline reconstruction
```

### Temporal Range Tests

**1. Living Persons (is_alive = true)**
```
Expected: 38 nodes (all except Jeffrey Epstein and Jean-Luc Brunel)
```

**2. By Birth Year**
```
- 1930s-1950s: Jeffrey Epstein (1953), Les Wexner (1937), Alan Dershowitz (1938)
- 1960s: Prince Andrew (1960), Ghislaine Maxwell (1961), Eva Dubin (1961), Joi Ito (1966)
- 1970s-1990s: All victims (1979-1990), all assistants
-- Test age-range queries
```

**3. Deceased Timeline**
```
- Jean-Luc Brunel: 2022-02-19 (74 years old)
- Jeffrey Epstein: 2019-08-10 (66 years old)
```

### Complexity Queries

**1. 2-Hop Paths from Epstein**
```
Epstein → Ghislaine Maxwell → [Sarah Kellen, Nadia Marcinkova, Lesley Groff, Juan Pablo Soto]
Epstein → Jean-Luc Brunel → MC2 Model Management
Epstein → Les Wexner → L Brands
-- Expected: ~20 2-hop paths
```

**2. Money Trail**
```
JP Morgan Chase → Jeffrey Epstein → [Les Wexner, Jean-Luc Brunel, Victims]
Deutsche Bank → Jeffrey Epstein → (same as above)
L Brands → Les Wexner (tied to Epstein)
-- Test financial network reconstruction
```

**3. Victim Network**
```
Virginia Giuffre (4 links):
  → Jeffrey Epstein, Ghislaine Maxwell, Prince Andrew, Alan Dershowitz
Annie Farmer (3 links):
  → Jeffrey Epstein, Ghislaine Maxwell, Zorro Ranch
Courtney Wild (3 links):
  → Jeffrey Epstein, Palm Beach, Alexander Acosta
-- Expected: 5 victims with average 3 connections each
```

**4. Key Infrastructure**
```
Little St. James Island (3 links):
  ← Jeffrey Epstein (ownership, 0.99)
  ← Prince Andrew (travel, 0.80)
  ← Ghislaine Maxwell (associate, 0.91)
-- Location serves as nexus for multiple relationship types
```

### Strength Distribution Tests

**1. Very Strong (strength >= 90)**
```
Virginia Giuffre → Jeffrey Epstein (95)
Virginia Giuffre → Ghislaine Maxwell (90)
JP Morgan Chase → Jeffrey Epstein (90)
MC2 Model Management → Jeffrey Epstein (90)
Lolita Express → Jeffrey Epstein (99)
9 East 71st Street NYC → Jeffrey Epstein (99)
L Brands → Les Wexner (95)
Little St. James Island → Jeffrey Epstein (95)
MC2 Model Management → Jean-Luc Brunel (95)
-- Expected: 9 links
```

**2. Moderate (strength 70-85)**
```
Virginia Giuffre → Prince Andrew (85)
Courtney Wild → Jeffrey Epstein (80)
Joi Ito (80) → MIT Media Lab
-- Test middle-confidence filtering
```

**3. Weak (strength <= 50)**
```
Bill Gates → Jeffrey Epstein (55)
Kevin Spacey → Jeffrey Epstein (50)
JP Morgan Chase → Deutsche Bank (40)
-- Inference/tertiary evidence
```

### Data Completeness Tests

**1. Nodes with All Fields Populated**
```
SELECT COUNT(*) FROM nodes
WHERE name IS NOT NULL
AND type IS NOT NULL
AND tier IS NOT NULL
AND country_tags IS NOT NULL
AND verification_level IS NOT NULL;
-- Expected: 40 (100%)
```

**2. Nodes with Birth Dates**
```
SELECT COUNT(*) FROM nodes WHERE birth_date IS NOT NULL;
-- Expected: ~25 (62%)
```

**3. Nodes with Death Dates**
```
SELECT COUNT(*) FROM nodes WHERE death_date IS NOT NULL;
-- Expected: 2 (Jeffrey Epstein, Jean-Luc Brunel)
```

**4. Evidence Archive Records**
```
SELECT COUNT(*) FROM evidence_archive;
-- Expected: 12+
```

**5. Complete Links**
```
SELECT COUNT(*) FROM links
WHERE source_id IS NOT NULL
AND target_id IS NOT NULL
AND relationship_type IS NOT NULL
AND evidence_type IS NOT NULL
AND confidence_level IS NOT NULL;
-- Expected: 57 (100%)
```

---

## Testing Strategies

### 1. Network Visualization Test
- Load all 40 nodes and 57 links
- Verify tier coloring (1-5)
- Verify risk intensity (0-100)
- Verify verification badges (official/journalist/community)

### 2. View Mode Tests (Sprint 7)
- **full_network**: Show all 40 nodes, 57 links
- **main_story**: Focus on Epstein + 5 core victims (8-10 nodes, ~15 links)
- **follow_money**: JP Morgan → Deutsche Bank → Epstein path (3-5 nodes, 3 links)
- **evidence_map**: Nodes with evidence_count > 5 (~15 nodes)
- **timeline**: Filter by birth_date/death_date ranges

### 3. Search/Filter Tests
- Search "victim": Returns 5 victims with relevant links
- Search "organization": Returns 6 organizations
- Country filter [USA]: Returns 25 nodes
- Verification "official": Returns 16 nodes
- Risk >= 80: Returns 6 high-risk nodes

### 4. Aggregation Tests
- Total evidence count: Sum of all evidence_count fields
- Network density: 57 links / (40 * 39 / 2) = 7.3% density
- Average node degree: (57 * 2) / 40 = 2.85 connections
- Risk variance: Std dev of risk scores across nodes

### 5. Performance Tests
- Query all 40 nodes: < 100ms
- Query all 57 links with joins: < 200ms
- Geographic filter on country_tags: < 150ms
- Full network render: < 500ms (web)

---

## Known Limitations & Gaps

1. **Evidence URLs**: Some NULL (68 documents don't have URLs)
2. **Timeline Events**: Only birth/death dates present, no intermediate events
3. **Link Evidence Timeline**: Not seeded (Sprint 6C specific)
4. **Annotations**: No DECEASED/RECRUITER/VICTIM tags present
5. **Badge System**: No user badges assigned (Sprint 6A feature)
6. **Investigation Data**: No investigation records (Sprint 4)

---

**Document Version:** 1.0
**Last Updated:** March 8, 2026
**Database State:** Post-Sprint 11 (i18n completed)
