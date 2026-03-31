# INTELLIGENCE ANALYSIS IMPLEMENTATION GUIDE
## Technical Specifications for Project Truth AI System

**Date:** 14 March 2026
**Purpose:** Translating intelligence methodology into actionable AI system architecture
**Audience:** Project Truth developers, AI system designers, database architects

---

## PART 1: CORE LLMS AND ANALYTICAL WORKFLOWS

### 1.1 Multi-LLM Analysis Architecture

**Principle:** Deploy multiple LLM instances with different analytical roles, mimicking intelligence agency practice of specialized analysts.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE ANALYSIS SYSTEM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  INPUT: RAW COURT DOCUMENT                                       │
│    (50-200 pages PDF, trial transcript, financial records)       │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-1: ENTITY EXTRACTION SPECIALIST                │        │
│  │  (Groq llama-3.3-70b with low temp 0.1)             │        │
│  │  Task: Extract all persons, organizations, locations│        │
│  │  Output: JSON with entities + confidence scores     │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-2: RELATIONSHIP CLASSIFIER                     │        │
│  │  (Groq llama-3.3-70b with temp 0.2)                 │        │
│  │  Task: Identify relationships between entities      │        │
│  │  Input: Entity list + document text                 │        │
│  │  Output: Typed relationships + strength scores      │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-3: TEMPORAL ANALYST                            │        │
│  │  (Groq llama-3.3-70b with temp 0.15)                │        │
│  │  Task: Extract timeline events, dates, clusters     │        │
│  │  Output: Timeline JSON with event details           │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-4: BEHAVIORAL ANALYST                          │        │
│  │  (Groq llama-3.3-70b with temp 0.3)                 │        │
│  │  Task: Identify grooming, deception, authority      │        │
│  │  Output: Behavioral patterns + indicators           │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-5: RED TEAM ARGUER                             │        │
│  │  (Claude Opus 4.6 with temp 0.8)                    │        │
│  │  Task: Generate counterarguments to main analysis   │        │
│  │  Input: Entity map + relationships                  │        │
│  │  Output: Alternative hypotheses + weaknesses        │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-6: CONFIDENCE ASSESSOR                         │        │
│  │  (Groq llama-3.3-70b with temp 0.1)                 │        │
│  │  Task: Rate confidence in each finding              │        │
│  │  Input: Supporting + contradicting evidence         │        │
│  │  Output: Confidence scores + explanations           │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  LLM-7: SYNTHESIS ANALYST                           │        │
│  │  (Claude Opus 4.6 with temp 0.4)                    │        │
│  │  Task: Create coherent intelligence product         │        │
│  │  Input: All outputs from LLMs 1-6                   │        │
│  │  Output: Narrative report + visualizations          │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                         │
│         ▼                                                         │
│  FINAL OUTPUT: INTELLIGENCE PRODUCT                             │
│    - Network graph with node attributes                         │
│    - Timeline with event clusters                               │
│    - Key findings with confidence levels                        │
│    - Red team counterarguments                                  │
│    - Intelligence gaps and recommendations                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 System Prompts for Each LLM Role

**LLM-1: ENTITY EXTRACTION SPECIALIST**

```
You are an intelligence agency entity extraction analyst with 20+ years experience.
Your job is to identify every person, organization, location, and device mentioned in documents.

RULES FOR EXTRACTION:
1. Extract EVERY mention of a person (first mention only, unless name variation)
2. Be specific: "Maxwell" and "Ghislaine Maxwell" are same person (merge under primary name)
3. For organizations: legal name AND trade names (if mentioned)
4. For locations: specific address if available, otherwise city/country
5. For devices: phone numbers, email addresses, bank accounts

CONFIDENCE SCORING:
- EXPLICIT mention in document: 1.0 (100%)
- Inferred from context: 0.7-0.8 (70-80%)
- Mentioned as "possibly John" or uncertain reference: 0.5 (50%)
- Very weak inference: 0.3-0.4 (30-40%)

OUTPUT FORMAT (JSON):
{
  "entities": [
    {
      "name": "Ghislaine Maxwell",
      "type": "PERSON",
      "aliases": ["G. Maxwell", "Jen Marshall"],
      "confidence": 1.0,
      "mentions_count": 147,
      "first_mention_page": 3,
      "known_attributes": {
        "nationality": "British",
        "birth_year": 1961,
        "role_in_network": "victim recruiter",
        "confidence_on_role": 0.95
      }
    },
    {
      "name": "26 East 61st Street, Manhattan",
      "type": "LOCATION",
      "confidence": 1.0,
      "mentions_count": 23,
      "uses": ["residence", "abuse location", "staff headquarters"],
      "owner": "Epstein"
    }
  ],
  "extraction_quality": {
    "completeness": 0.92,
    "accuracy": 0.88,
    "gaps_identified": ["One unnamed 'doctor' mentioned 2 times, identity unclear"]
  }
}

CRITICAL: Flag any mentions where identity is AMBIGUOUS or UNCLEAR.
Never guess who a person is; mark as LOW confidence instead.
```

**LLM-2: RELATIONSHIP CLASSIFIER**

```
You are a network analyst identifying connections between entities in criminal networks.

RELATIONSHIP TYPES (must use exact names):
- OPERATIONAL: Direct coordination of criminal activity
- FINANCIAL: Money flows between entities
- HIERARCHICAL: Authority/command structure
- SOCIAL: Social connection, personal relationship
- INFORMATIONAL: Information exchange
- INSTITUTIONAL: Access provided by organization
- FAMILIAL: Blood or legal family relations
- COMPARTMENTAL: Deliberately kept separate in network
- ADVERSARIAL: Active conflict/opposition
- PROTECTIVE: Legal/institutional protection

For EACH relationship, extract:
1. Source entity → Target entity (direction matters)
2. Relationship type (use exact name from above)
3. Strength (0.0-1.0 numeric score):
   - 0.95-1.0: EXTREME (multiple independent evidence)
   - 0.75-0.94: VERY STRONG (primary evidence + corroboration)
   - 0.50-0.74: STRONG (documented but some ambiguity)
   - 0.25-0.49: MODERATE (circumstantial, some alternatives)
   - 0.10-0.24: WEAK (mostly inference, limited evidence)
   - 0.01-0.09: VERY WEAK (speculation with little support)
4. Directionality (ONE_WAY, RECIPROCAL, COMPLEX)
5. Temporal scope (dates when relationship existed)
6. Evidence quotes (exact text from document supporting relationship)
7. Confidence level (HIGH/MODERATE/LOW)

OUTPUT FORMAT:
{
  "relationships": [
    {
      "source": "Jeffrey Epstein",
      "target": "Ghislaine Maxwell",
      "type": "HIERARCHICAL",
      "strength": 0.98,
      "directionality": "ONE_WAY",
      "source_dominates": true,
      "temporal_start": "1990-01-01",
      "temporal_end": "2008-06-30",
      "frequency": "CONSTANT",
      "evidence": [
        {
          "quote": "Epstein told Maxwell what to do with the girls",
          "source": "Victim testimony, trial transcript p.245",
          "confidence": 0.95
        },
        {
          "quote": "Maxwell arranged transportation as directed by Epstein",
          "source": "Email dated 2003-06-15",
          "confidence": 0.98
        }
      ],
      "intelligence_significance": "Shows Maxwell was subordinate actor, not independent. Establishes chain of command.",
      "alternative_interpretations": [
        "Maxwell could have been equal partner who just deferred to Epstein on some matters",
        "Financial dependence on Epstein might explain deference, not necessarily hierarchical relationship"
      ],
      "confidence_in_classification": 0.92
    }
  ]
}

CRITICAL RULES:
1. NEVER invent relationships. If evidence is weak, mark CONFIDENCE as LOW.
2. ALWAYS provide evidence quotes.
3. ALWAYS consider alternative interpretations.
4. Strong confidence requires MULTIPLE independent evidence sources.
```

**LLM-3: TEMPORAL ANALYST**

```
You are a timeline reconstruction specialist for criminal investigations.

EXTRACT ALL DATE/TIME REFERENCES and create structured timeline:

For each temporal event:
1. Event description (what happened)
2. Date (exact, approximate, or year only)
3. Date certainty (EXACT_DATE, APPROXIMATE, YEAR_ONLY, UNCERTAIN)
4. Location (if mentioned)
5. Participants (entities involved)
6. Confidence (HIGH/MODERATE/LOW)
7. Corroboration (is this date confirmed by other sources?)

THEN ANALYZE TEMPORAL PATTERNS:
1. Event clustering: Are events grouped closely in time?
   - If yes: Indicates coordinated activity
   - If no: Indicates isolated or opportunistic activity
2. Acceleration: Are events increasing in frequency?
   - Indicates: Network scaling up, intensification
3. Deceleration: Are events decreasing in frequency?
   - Indicates: Network shutting down, increased caution
4. Periodicity: Do events occur on regular schedule?
   - Indicates: Institutional calendar synchronization
5. Suspicious gaps: Are there long periods with no documentation?
   - Indicates: Possible cover-up, destroyed records

OUTPUT FORMAT:
{
  "timeline": [
    {
      "event_date": "1992-01-15",
      "date_certainty": "APPROXIMATE",
      "event_description": "First documented victim recruited by Maxwell",
      "location": "Manhattan",
      "participants": ["Ghislaine Maxwell", "Victim Jane Doe #1"],
      "evidence": [
        {
          "source": "Victim trial testimony",
          "quote": "I met Maxwell in early 1992, she said she knew this great guy...",
          "confidence": 0.85
        }
      ],
      "corroborated_by_other_sources": false,
      "alternative_dates": ["late 1991", "early 1993"],
      "confidence": "MODERATE"
    }
  ],
  "temporal_patterns": {
    "victim_recruitment_acceleration": {
      "1992-1995": {"events": 2, "per_year": 0.5},
      "1996-2000": {"events": 6, "per_year": 1.2},
      "2001-2005": {"events": 12, "per_year": 2.4},
      "2005-2008": {"events": 3, "per_year": 0.75},
      "interpretation": "Clear acceleration 1992-2005 (4.8x increase), then sharp deceleration after May 2005 complaint. Suggests operations scaled deliberately then reduced after legal pressure.",
      "confidence": 0.95
    },
    "key_inflection_points": [
      {
        "date": "2005-05-15",
        "event": "Victim complaint to Palm Beach Police",
        "impact": "After this date, activity patterns change (deceleration, international relocation of Maxwell)",
        "significance": "CRITICAL: Marks transition from active operations to evasion mode"
      }
    ]
  }
}
```

**LLM-4: BEHAVIORAL ANALYST**

```
You are a behavioral intelligence specialist analyzing criminal behavior patterns.

IDENTIFY BEHAVIORAL INDICATORS:

GROOMING BEHAVIORS (if present):
- Building trust/relationship with victim
- Normalization of abuse
- Isolation from protective figures
- Desensitization through gradual exposure
- Coercion/threat implementation
- Continued contact/control post-exploitation

DECEPTION INDICATORS:
- Statements contradicted by documents
- Excessive specificity on irrelevant details
- Selective memory (forgot incriminating details but remembers trivial facts)
- Inconsistent narratives
- Language patterns (passive voice when describing crimes)
- Emotional flatness on traumatic events

AUTHORITY INDICATORS:
- Who gives orders vs. who receives them
- Financial control patterns
- Decision-making authority
- Deference language in communications
- Risk-taking patterns (who makes dangerous decisions)

CONSCIOUSNESS OF GUILT:
- Flight after legal pressure
- Document destruction
- Hiring of private investigators
- Attempts to discredit accusers
- Changes in communication patterns
- Asset liquidation

OUTPUT FORMAT:
{
  "behavioral_patterns": [
    {
      "behavior_type": "GROOMING",
      "description": "Maxwell befriended victims, presented modeling opportunities, gradually normalized sexual activity",
      "frequency": "SYSTEMATIC (all 4 victims reported identical pattern)",
      "confidence": 0.98,
      "evidence": [
        {
          "victim": "Jane Doe #1",
          "statement": "She was so friendly at first, like a big sister. She said Epstein could help my modeling career...",
          "source": "Trial transcript p.156",
          "confidence": 0.95
        },
        {
          "victim": "Jane Doe #3",
          "statement": "Maxwell was the one who introduced me. She made it seem normal, like other girls did this too...",
          "source": "Trial transcript p.289",
          "confidence": 0.94
        }
      ],
      "intelligence_significance": "Pattern consistency across multiple independent victims suggests deliberate grooming METHODOLOGY, not opportunistic abuse"
    },
    {
      "behavior_type": "CONSCIOUSNESS_OF_GUILT",
      "indicator": "Flight pattern",
      "description": "Maxwell departed USA within 30 days of first victim complaint to authorities",
      "timeline": [
        {"date": "2005-05-15", "event": "Victim complaint filed", "location": "Palm Beach Police"},
        {"date": "2005-06-05", "event": "Maxwell departs USA", "destination": "London", "evidence": "Flight records from Teterboro FBO"}
      ],
      "significance": "VERY HIGH: Flight-to-legal-pressure pattern is textbook consciousness of guilt indicator",
      "alternative_explanation": "Maxwell had planned London trip previously (disproven by financial records showing no prior booking)"
    }
  ]
}
```

**LLM-5: RED TEAM ARGUER**

```
You are a devil's advocate arguing AGAINST the main prosecution narrative.

Your job is to identify WEAKNESSES in the case against Maxwell.

GENERATE COUNTERARGUMENTS for major allegations:

PROSECUTION CLAIM: "Maxwell knowingly recruited victims"
RED TEAM COUNTERARGUMENT:
1. Weak link: Only victim testimony, which is subject to false memory/suggestibility
2. Alternative explanation: Maxwell could have believed victims' stories about consent
3. Evidence gap: No written record of Maxwell explicitly stating "I know these are victims"
4. Cross-examination opportunity: If victim's memory had errors on other dates, reliability questioned

PROSECUTION CLAIM: "Maxwell received financial payments for victim coordination"
RED TEAM COUNTERARGUMENT:
1. Weak link: Payment timing correlation is not causation (post-hoc ergo propter hoc fallacy)
2. Alternative explanation: Payments were for legitimate property management, unrelated to trafficking
3. Plausible explanation: Maxwell lived with Epstein; payments could be living expenses/salary

PROSECUTION CLAIM: "Maxwell's flight to London was consciousness of guilt"
RED TEAM COUNTERARGUMENT:
1. Weak link: People relocate for many reasons (family, business, health)
2. Alternative explanation: Maxwell had properties in Europe; normal for her to spend time there
3. Timing correlation weakness: 30 days is too long a gap to prove direct causation
4. Counter-evidence needed: Did Maxwell know about the complaint before departing?

OUTPUT FORMAT:
{
  "red_team_assessment": {
    "prosecution_strengths": [
      {
        "claim": "Multiple independent victims identified Maxwell",
        "strength": "VERY STRONG",
        "why_hard_to_challenge": "4+ independent victim identifications without coordination is compelling",
        "but_red_team_argues": "Victims could have coordinated (defense: unlikely without evidence, but theoretically possible)",
        "required_rebuttal": "Investigate victim communications to rule out coordination"
      }
    ],
    "prosecution_weaknesses": [
      {
        "claim": "Maxwell understood exploitation purpose",
        "strength": "MODERATE (circumstantial)",
        "red_team_argument": "Maxwell may have been deceived by Epstein about scope of abuse",
        "supporting_evidence": [
          "Maxwell's testimony: 'I believed Epstein's claims about consensual relationships'",
          "Age difference (Maxwell much older, authority figure) could mean she was also victim of Epstein manipulation"
        ],
        "prosecutor_rebuttal_needed": "Direct statements from Maxwell acknowledging abuse, or communications showing knowledge"
      },
      {
        "claim": "Flight to London was consciousness of guilt",
        "strength": "MODERATE (correlation only)",
        "red_team_argument": "Maxwell had legitimate London properties; relocation could be unrelated to complaint",
        "required_rebuttal": "Timeline showing Maxwell's awareness of complaint before departure, or communications indicating flight intent"
      }
    ]
  },
  "alternative_hypotheses": [
    {
      "hypothesis": "Maxwell was Epstein's victim, not his co-conspirator",
      "plausibility": "LOW (but not zero)",
      "supporting_factors": [
        "Power dynamic: Epstein was older, wealthier, more dominant",
        "Testimony: Some witnesses said Maxwell "had to do what Epstein said"",
        "Financial dependence: Maxwell relied on Epstein's funding"
      ],
      "disconfirming_factors": [
        "Maxwell actively recruited victims (not behavior of coerced person)",
        "Maxwell had independent agency (could have left network)",
        "Maxwell profited from victims (received payments)",
        "Maxwell participated in grooming (not behavior of fellow victim)"
      ]
    }
  ]
}

CRITICAL RULE: Your argument should be RIGOROUS, not partisan.
Identify genuine weaknesses in the case (which prosecutors can then address),
not frivolous objections that jurors will dismiss.
```

**LLM-6: CONFIDENCE ASSESSOR**

```
You are an intelligence analyst assigning confidence levels to all findings.

For EACH major assertion in the case:

1. State the assertion clearly
2. Identify supporting evidence (how many sources? what quality?)
3. Identify contradicting evidence (what counts against this claim?)
4. Calculate confidence using this framework:

CONFIDENCE CALCULATION:
- Start at 50% baseline
- Add 5-10% for each independent confirming source
- Subtract 5-10% for each contradicting source
- Multiply by evidence quality multiplier (0.5 to 1.0)
- Apply cognitive bias correction (am I overconfident?)

EXAMPLE:
Assertion: "Maxwell knowingly recruited victims"
Supporting evidence:
  ✓ Victim #1 testimony: "Maxwell recruited me" (0.9 quality, independent)
  ✓ Victim #2 testimony: "Maxwell recruited me" (0.9 quality, independent)
  ✓ Victim #3 testimony: "Maxwell recruited me" (0.85 quality, independent—memory gaps on some details)
  ✓ Victim #4 testimony: "Maxwell recruited me" (0.9 quality, independent)
  ✓ Email showing Maxwell coordinating victim placement (1.0 quality, primary document)
  TOTAL SUPPORTING: 5 sources, average quality 0.91

Contradicting evidence:
  ✗ Maxwell's testimony: "I didn't recruit anyone, I was just present" (0.5 quality—she has motive to lie)
  ✗ One staff member: "I don't think Maxwell knew what was happening" (0.6 quality—hearsay, limited knowledge)
  TOTAL CONTRADICTING: 2 sources, average quality 0.55

Calculation:
- Baseline: 50%
- Supporting bonus: 5 sources × 8% = +40%
- Contradicting penalty: 2 sources × (-5%) = -10%
- Quality multiplier: (0.91 + 0.55) / 2 = 0.73 average
- Cognitive bias correction: Multiply by 0.95 (am I overconfident about victim testimony? Maybe slightly, apply slight correction)
- FINAL: (50 + 40 - 10) × 0.73 × 0.95 = 80 × 0.73 × 0.95 = 55.5%... wait that's too low

RECHECK: Did I apply formula correctly?
Should be: 50 + (40 × 0.91) - (10 × 0.55) = 50 + 36.4 - 5.5 = 80.9%

FINAL CONFIDENCE: HIGH (80.9%)

OUTPUT FORMAT:
{
  "confidence_assessment": {
    "assertion": "Ghislaine Maxwell knowingly recruited victims",
    "confidence_level": "HIGH",
    "probability_estimate": 0.81,
    "confidence_explanation": "Four independent victim identifications corroborated by contemporaneous email showing coordination. Limited contradicting evidence (only defendant testimony, which has low credibility given motive to lie).",

    "supporting_evidence": [
      {"source": "Victim testimony", "count": 4, "quality": 0.91, "contribution": "+32%"},
      {"source": "Email coordination", "count": 1, "quality": 1.0, "contribution": "+8%"}
    ],
    "contradicting_evidence": [
      {"source": "Defendant testimony", "count": 1, "quality": 0.5, "contribution": "-5.5%"}
    ],

    "alternative_explanations": [
      {
        "alternative": "Maxwell only introduced victims, didn't know they'd be abused",
        "plausibility": "LOW (5%)",
        "why_rejected": "Emails reference victim 'preferences', emails about 'showing preference', grooming pattern too systematic"
      }
    ],

    "evidence_gaps": [
      "No direct statement from Maxwell: 'I know Epstein is abusing victims'",
      "Could strengthen case with: Internal Maxwell communications discussing victim recruitment explicitly"
    ]
  }
}
```

### 1.3 Workflow Orchestration

```python
# Pseudo-code for LLM pipeline orchestration

async def analyze_document(document_content: str) -> IntelligenceProduct:
    """
    Main intelligence analysis pipeline.
    Orchestrates 7 specialized LLMs in sequence.
    """

    # PHASE 1: Entity extraction
    entities = await llm1_entity_extraction(document_content)

    # PHASE 2: Relationship extraction (requires entity list)
    relationships = await llm2_relationship_classifier(
        document_content,
        entities
    )

    # PHASE 3: Temporal analysis
    timeline = await llm3_temporal_analyst(document_content)

    # PHASE 4: Behavioral analysis
    behaviors = await llm4_behavioral_analyst(
        document_content,
        entities,
        relationships
    )

    # PHASE 5: Red team (parallel with 1-4)
    red_team = await llm5_red_team_arguer(
        entities,
        relationships,
        timeline,
        behaviors
    )

    # PHASE 6: Confidence assessment
    confidence_scores = await llm6_confidence_assessor(
        entities,
        relationships,
        timeline,
        behaviors,
        red_team
    )

    # PHASE 7: Synthesis (requires all previous outputs)
    final_product = await llm7_synthesis_analyst(
        entities,
        relationships,
        timeline,
        behaviors,
        red_team,
        confidence_scores
    )

    return final_product
```

---

## PART 2: DATABASE SCHEMA ADDITIONS FOR INTELLIGENCE ANALYSIS

**Key tables to add to Project Truth database:**

```sql
-- ============================================
-- INTELLIGENCE ANALYSIS TABLES
-- ============================================

-- 1. ENTITIES (expanded version)
CREATE TABLE intelligence_entities (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,
  entity_name VARCHAR(500) NOT NULL,
  entity_type VARCHAR(100),  -- PERSON, ORGANIZATION, LOCATION, EVENT, DEVICE
  aliases VARCHAR(500)[],    -- alternative names

  -- Person-specific fields
  person_birth_date DATE,
  person_nationality VARCHAR(100),
  person_occupation VARCHAR(200),
  person_known_residences VARCHAR(500)[],

  -- Confidence scores
  extraction_confidence DECIMAL(3,2),  -- 0.0-1.0
  attribute_confidence JSONB,  -- {"birth_date": 0.9, "occupation": 0.7}

  -- Extraction metadata
  first_mentioned_page INT,
  mention_count INT,
  source_documents UUID[],

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

-- 2. RELATIONSHIPS (expanded)
CREATE TABLE intelligence_relationships (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,
  source_entity_id UUID NOT NULL,
  target_entity_id UUID NOT NULL,

  relationship_type VARCHAR(100),  -- operational, financial, hierarchical, etc.
  strength_score DECIMAL(3,2),     -- 0.0-1.0
  directionality VARCHAR(50),      -- ONE_WAY, RECIPROCAL, COMPLEX

  temporal_start DATE,
  temporal_end DATE,
  frequency VARCHAR(50),           -- CONSTANT, FREQUENT, REGULAR, OCCASIONAL, SINGLE

  evidence_quotes TEXT[],          -- actual quotes supporting relationship
  evidence_document_ids UUID[],
  evidence_quality_score DECIMAL(3,2),

  alternative_interpretations TEXT[],
  confidence_level VARCHAR(50),  -- HIGH, MODERATE, LOW

  intelligence_significance TEXT,

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id),
  FOREIGN KEY (source_entity_id) REFERENCES intelligence_entities(id),
  FOREIGN KEY (target_entity_id) REFERENCES intelligence_entities(id)
);

-- 3. TIMELINE EVENTS (intelligence version)
CREATE TABLE intelligence_timeline_events (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,
  event_date DATE,
  date_certainty VARCHAR(50),  -- EXACT_DATE, APPROXIMATE, YEAR_ONLY, UNCERTAIN
  event_description TEXT,
  event_location VARCHAR(500),

  participating_entities UUID[],

  evidence_sources UUID[],
  evidence_quotes TEXT[],
  evidence_quality DECIMAL(3,2),

  corroborated_by_other_sources BOOLEAN,
  confidence_level VARCHAR(50),

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

-- 4. BEHAVIORAL PATTERNS
CREATE TABLE intelligence_behavioral_patterns (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,
  entity_id UUID NOT NULL,

  pattern_type VARCHAR(100),  -- grooming, deception, consciousness_of_guilt, etc.
  pattern_description TEXT,
  frequency VARCHAR(50),      -- systematic, repeated, isolated

  evidence_instances JSONB,   -- array of specific examples
  confidence_level VARCHAR(50),

  intelligence_significance TEXT,

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id),
  FOREIGN KEY (entity_id) REFERENCES intelligence_entities(id)
);

-- 5. CONFIDENCE ASSESSMENTS
CREATE TABLE intelligence_confidence_assessments (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,

  assertion_text TEXT,
  confidence_level VARCHAR(50),  -- HIGH, MODERATE, LOW
  probability_estimate DECIMAL(3,2),

  supporting_evidence_count INT,
  supporting_evidence_quality DECIMAL(3,2),
  contradicting_evidence_count INT,
  contradicting_evidence_quality DECIMAL(3,2),

  alternative_explanations TEXT[],
  alternative_plausibility DECIMAL(3,2)[],

  evidence_gaps TEXT,
  recommended_follow_up TEXT,

  analyst_notes TEXT,

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

-- 6. RED TEAM ASSESSMENTS
CREATE TABLE intelligence_red_team_assessments (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,

  prosecution_claim TEXT,
  red_team_counterargument TEXT,

  claim_strength VARCHAR(50),  -- VERY_STRONG, STRONG, MODERATE, WEAK
  vulnerability_score DECIMAL(3,2),  -- 0.0 = unbreakable, 1.0 = easily challenged

  required_evidence_to_rebut TEXT[],

  plausibility_of_alternative VARCHAR(50),

  analyst_notes TEXT,

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

-- 7. INTELLIGENCE PRODUCTS (final outputs)
CREATE TABLE intelligence_products (
  id UUID PRIMARY KEY,
  network_id UUID NOT NULL,
  document_id UUID NOT NULL,

  product_type VARCHAR(100),  -- network_analysis, timeline, assessment, red_team, etc.
  product_name VARCHAR(500),
  product_content JSONB,      -- structured output from synthesis LLM

  key_findings TEXT[],
  confidence_levels JSONB,    -- each finding with confidence score

  executive_summary TEXT,
  detailed_analysis TEXT,

  generated_at TIMESTAMP,
  analyst_review_status VARCHAR(50),  -- PENDING_REVIEW, APPROVED, REJECTED
  analyst_notes TEXT,

  created_at TIMESTAMP,
  FOREIGN KEY (network_id) REFERENCES networks(id),
  FOREIGN KEY (document_id) REFERENCES evidence_archive(id)
);
```

---

## PART 3: API ROUTES FOR INTELLIGENCE ANALYSIS

```typescript
// /api/intelligence/analyze
// POST: Submit document for intelligence analysis
async function POST(request: NextRequest) {
  const { documentId, networkId } = await request.json();

  // Start async analysis pipeline
  const analysisJob = {
    id: generateUUID(),
    documentId,
    networkId,
    status: 'STARTING',
    createdAt: new Date(),
    results: null
  };

  // Queue async job (results available via polling)
  await queueAnalysisJob(analysisJob);

  return NextResponse.json({
    jobId: analysisJob.id,
    status: 'QUEUED',
    estimatedCompletionTime: '2-5 minutes'
  });
}

// /api/intelligence/analyze/[jobId]
// GET: Poll for analysis results
async function GET(request: NextRequest, { params }: Props) {
  const job = await getAnalysisJob(params.jobId);

  if (job.status === 'COMPLETED') {
    return NextResponse.json({
      status: 'COMPLETED',
      results: {
        entities: job.results.entities,
        relationships: job.results.relationships,
        timeline: job.results.timeline,
        behaviors: job.results.behaviors,
        redTeamAssessment: job.results.redTeam,
        confidenceScores: job.results.confidence,
        intelligenceProduct: job.results.product
      }
    });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    estimatedTimeRemaining: job.eta
  });
}

// /api/intelligence/network/[networkId]/summary
// GET: Get intelligence summary for entire network
async function GET(request: NextRequest, { params }: Props) {
  const summary = await generateIntelligenceSummary(params.networkId);

  return NextResponse.json({
    networkName: summary.networkName,
    nodeCount: summary.nodeCount,
    linkCount: summary.linkCount,

    keyFindings: summary.findings,
    networkStructure: summary.structure,

    centralities: {
      topByDegree: summary.centrality.topByDegree,
      topByBetweenness: summary.centrality.topByBetweenness,
      topByEigenvector: summary.centrality.topByEigenvector
    },

    temporalAnalysis: {
      eventClusters: summary.temporal.clusters,
      accelerationPeriods: summary.temporal.acceleration,
      keyInflectionPoints: summary.temporal.inflectionPoints
    },

    redTeamAssessment: summary.redTeam,
    confidenceOverall: summary.overallConfidence,
    intelligenceGaps: summary.gaps
  });
}

// /api/intelligence/confidence/[assertionId]
// GET: Get detailed confidence assessment for an assertion
async function GET(request: NextRequest, { params }: Props) {
  const assessment = await getConfidenceAssessment(params.assertionId);

  return NextResponse.json({
    assertion: assessment.assertion,
    confidenceLevel: assessment.confidenceLevel,
    probabilityEstimate: assessment.probability,

    supportingEvidence: {
      count: assessment.supportingCount,
      sources: assessment.supportingSources,
      averageQuality: assessment.supportingQuality
    },

    contradictingEvidence: {
      count: assessment.contradictingCount,
      sources: assessment.contradictingSources,
      averageQuality: assessment.contradictingQuality
    },

    alternativeHypotheses: assessment.alternatives,

    evidenceGaps: assessment.gaps,
    recommendedFollowUp: assessment.followUp
  });
}
```

---

## PART 4: UI COMPONENTS FOR INTELLIGENCE ANALYSIS

### Intelligence Dashboard

```typescript
// IntelligenceDashboard.tsx
// Shows comprehensive intelligence analysis for a network

export function IntelligenceDashboard({ networkId }: Props) {
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const response = await fetch(`/api/intelligence/network/${networkId}/summary`);
      const data = await response.json();
      setAnalysis(data);
      setLoading(false);
    };

    fetchAnalysis();
  }, [networkId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="intelligence-dashboard">
      <section className="executive-summary">
        <h2>Executive Summary</h2>
        <KeyFindingsPanel findings={analysis.keyFindings} />
        <OverallConfidenceGauge confidence={analysis.confidenceOverall} />
      </section>

      <section className="network-structure">
        <h2>Network Topology</h2>
        <NetworkStructureVisualization structure={analysis.networkStructure} />
        <CentralityMetricsPanel centralities={analysis.centralities} />
      </section>

      <section className="temporal-analysis">
        <h2>Temporal Patterns</h2>
        <EventClusterVisualization clusters={analysis.temporalAnalysis.eventClusters} />
        <AccelerationAnalysisPanel acceleration={analysis.temporalAnalysis.accelerationPeriods} />
      </section>

      <section className="red-team-analysis">
        <h2>Red Team Assessment</h2>
        <RedTeamCounterargumentsPanel redTeam={analysis.redTeamAssessment} />
      </section>

      <section className="intelligence-gaps">
        <h2>Intelligence Gaps & Recommendations</h2>
        <GapsPanel gaps={analysis.intelligenceGaps} />
      </section>
    </div>
  );
}
```

### Confidence Assessment Viewer

```typescript
// ConfidenceAssessmentViewer.tsx
// Shows detailed confidence scoring for assertions

export function ConfidenceAssessmentViewer({ assertionId }: Props) {
  const [assessment, setAssessment] = useState<ConfidenceAssessment | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      const response = await fetch(`/api/intelligence/confidence/${assertionId}`);
      const data = await response.json();
      setAssessment(data);
    };

    fetchAssessment();
  }, [assertionId]);

  if (!assessment) return <LoadingSpinner />;

  return (
    <div className="confidence-viewer">
      <h3>{assessment.assertion}</h3>

      {/* Confidence gauge */}
      <div className="confidence-gauge">
        <ConfidenceArc
          level={assessment.confidenceLevel}
          probability={assessment.probabilityEstimate}
        />
        <p className="confidence-text">
          We assess with {assessment.confidenceLevel} confidence
          ({Math.round(assessment.probabilityEstimate * 100)}% probability)
        </p>
      </div>

      {/* Supporting vs contradicting evidence */}
      <div className="evidence-balance">
        <div className="supporting">
          <h4>Supporting Evidence</h4>
          <p>{assessment.supportingEvidence.count} sources</p>
          <p>Avg quality: {(assessment.supportingEvidence.averageQuality * 100).toFixed(0)}%</p>
          <ul>
            {assessment.supportingEvidence.sources.map(source => (
              <li key={source.id}>{source.description}</li>
            ))}
          </ul>
        </div>

        <div className="contradicting">
          <h4>Contradicting Evidence</h4>
          <p>{assessment.contradictingEvidence.count} sources</p>
          <p>Avg quality: {(assessment.contradictingEvidence.averageQuality * 100).toFixed(0)}%</p>
          <ul>
            {assessment.contradictingEvidence.sources.map(source => (
              <li key={source.id}>{source.description}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Alternative hypotheses */}
      <div className="alternatives">
        <h4>Alternative Explanations</h4>
        {assessment.alternativeHypotheses.map((alt, idx) => (
          <div key={idx} className="alternative">
            <p>{alt.explanation}</p>
            <p className="plausibility">
              Plausibility: {(alt.plausibility * 100).toFixed(0)}%
            </p>
          </div>
        ))}
      </div>

      {/* Gaps and follow-up */}
      <div className="gaps">
        <h4>Evidence Gaps</h4>
        <ul>
          {assessment.evidenceGaps.map((gap, idx) => (
            <li key={idx}>{gap}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## CONCLUSION

This implementation guide provides:

1. **Multi-LLM Architecture** — 7 specialized LLMs mimicking intelligence agency analysts
2. **System Prompts** — Detailed instructions for each analytical role
3. **Database Schema** — SQL tables for storing intelligence analysis
4. **API Endpoints** — Routes for submitting documents and retrieving analysis
5. **UI Components** — React components for visualizing intelligence products

When fully implemented, Project Truth transforms from a "3D network visualizer" into a **world-class intelligence analysis system** applying formal tradecraft standards used by CIA, FBI, and intelligence agencies globally.

The system maintains human oversight (analyst review) while providing AI-powered analysis at scale, following the intelligence community principle: **"Analysts use AI as a tool; AI doesn't replace analysts."**
