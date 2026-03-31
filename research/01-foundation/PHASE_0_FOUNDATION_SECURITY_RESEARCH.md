# PHASE 0 — FOUNDATION SECURITY & LEGAL RESEARCH
## Project Truth: Pre-Launch Legal, Ethical, & Compliance Blueprint

**Research Date:** March 13, 2026
**Status:** COMPLETE & ACTIONABLE
**Scope:** 8 critical areas for investigative journalism platform
**Classification:** FOUNDATION SECURITY — Read Before Launch

---

## TABLE OF CONTENTS

1. Claim vs Evidence — Visual/UI Distinction
2. Defamation / Libel Protection
3. Moderation Policy Framework
4. Data Protection (GDPR, KVKK)
5. Safe Harbor & Responsible Disclosure
6. Terms of Service Template
7. Editorial Standards
8. Insurance & Legal Entity

---

# RESEARCH AREA 1: CLAIM VS EVIDENCE — VISUAL/UI DISTINCTION

## The Problem

Project Truth displays networks of individuals connected by alleged relationships. The platform must distinguish between:
- **Verified facts** (court documents, official records)
- **Journalistic findings** (reported by journalists but not court-proven)
- **Community claims** (alleged by users, unverified)
- **Disputed information** (actively refuted)

Failure to distinguish = potential defamation liability.

## How Existing Platforms Handle This

### Wikipedia: The Gold Standard
**System:** Editorial labels + source citations

**Visual markers:**
- ✅ Blue citations with "cite" link
- ⚠️ "Citation needed" tags in orange
- 🔴 "Disputed claim" banner (red box, top of article)
- 🟡 "Needs update" label (yellow)
- 📌 "Unsourced statement" (in italics, discussion page link)

**How it works:**
Every factual claim links to a citation. If missing, automatic template appears.

**Result:** Reader always sees the trust status immediately.

**For Project Truth:** Adapt Wikipedia's clarity model to network visualization.

---

### Bellingcat: The Methodology-First Approach
**System:** Transparent methodology + limitations statement

**Structural elements:**
1. **"Sources and methods" section** — Always disclosed upfront
2. **"Limitations" section** — What they *cannot* verify
3. **Hyperlinked sources** — Every claim traces to original document
4. **Methodology documentation** — Shows the investigation process
5. **Community verification** — Others can replicate

**Example from Bellingcat investigation:**
```
CLAIM: Person X met Person Y in Location Z on Date D

EVIDENCE:
- Primary: [Court document link] dated [Date]
- Supporting: [News article link] dated [Date]
- Image: [Geolocation analysis link] with [methodology explanation]

LIMITATIONS:
- Cannot determine exact time of meeting (document shows date only)
- No photographic evidence of both parties present simultaneously
- Third-party account reported after 6 months

METHODOLOGY:
- Cross-referenced public records database with [link]
- Applied reverse image search to [image file]
- Analyzed metadata using [tool link]
```

**Result:** Reader sees not just "fact" but "here's how we know" and "here's what we can't verify."

**For Project Truth:** Build annotation system showing evidence type + source + methodology + limitations for each connection.

---

### ICIJ/Datashare: The Automatic + Manual Verification Model
**System:** Multi-layer verification with human judgment

**Layers:**
1. **Automatic:** Geocoding, named entity extraction, linguistic analysis
2. **Manual:** Staff spot-checks on edge cases
3. **Peer:** Journalist team feedback and incorporation
4. **Transparent:** Document all limitations

**Result:** Very slow publication (months) but unassailable accuracy.

**For Project Truth:** Implement ICIJ's multi-layer verification for high-stakes connections (tier 1 nodes).

---

### DocumentCloud: The Annotation Model
**System:** Journalists annotate documents in public; readers see work product

**Features:**
- Highlight sections with explanatory notes
- Fact-check within documents
- Embed verified excerpts only in published work
- Readers can access original documents

**Result:** Transparency through showing the work (not hiding behind interpretation).

**For Project Truth:** Adopt DocumentCloud's "show the annotation" approach — don't just say "connected," show the document excerpt proving it.

---

## RECOMMENDED UI/VISUAL SYSTEM FOR PROJECT TRUTH

### 1. Node Color-Coding (Verification Level)

```
🟦 OFFICIAL (Blue)
  └─ Court documents, official registries, government records
  └─ No dispute; public record
  └─ Example: "John Smith is registered Director of ABC Corp"
             (source: corporate registry document)

🟩 JOURNALISTIC (Green)
  └─ Reported by credentialed journalists
  └─ Not yet court-verified but editorially reviewed
  └─ Example: "Jane Doe met Person X in Location Y"
             (source: Bellingcat investigation + methodology disclosed)

🟨 COMMUNITY (Yellow)
  └─ Alleged by community members
  └─ Unverified but documented
  └─ Example: "Person X attended conference Z"
             (source: social media screenshot, not confirmed)

🔴 DISPUTED (Red)
  └─ Actively refuted by credible source
  └─ Shows both claim and refutation
  └─ Example: "Person A worked at Company B"
             DISPUTED: Company B issued statement denying employment
```

### 2. Link Indicators (Evidence Type & Confidence)

```
═══ TRIPLE LINE = Primary source (court/official)
    └─ Confidence: 95%+
    └─ Example: Marriage certificate, court docket

══ DOUBLE LINE = Secondary source (journalism/credible)
    └─ Confidence: 70-90%
    └─ Example: News article with attribution

= SINGLE LINE = Tertiary/community source
    └─ Confidence: <70%
    └─ Example: Social media, user contribution

~ DOTTED LINE = Disputed/conflicting evidence
    └─ Shows connection but flags disagreement
    └─ Example: Company says "contractor" vs. evidence says "employee"
```

### 3. Hover/Click Information Panel (Evidence Details)

When user hovers over a link, show:

```
RELATIONSHIP: Director of
SINCE: 2015-03-21  |  UNTIL: 2021-12-31
SOURCE TYPE: Official Registry
CONFIDENCE: 95%

PRIMARY EVIDENCE:
├─ Companies Registry Document (Filed: Mar 21, 2015)
│  └─ [View excerpt from document]
│  └─ [Link to full document on CourtListener]
│  └─ Pages: 1-2
├─ SEC Filing (Form 10-K, Aug 15, 2019)
│  └─ [View excerpt]
│  └─ [Link to SEC]

METHODOLOGY:
├─ Extracted from public corporate registry (X database)
├─ Cross-referenced with SEC filings
├─ Dates verified against company timeline

VERIFICATION LEVEL:
├─ Community votes: 47 support, 2 dispute
├─ Expert review: 3 journalists verified
├─ Disputed by: [none]

CAN YOU HELP?
├─ [Add additional evidence]
├─ [Challenge this relationship]
├─ [Report as inaccurate]
```

### 4. Archive Modal Detail Tabs

**Evidence Tab Structure:**

```
EVIDENCE (47 items)

PRIMARY SOURCES (12)
├─ Court Document — "Deed of Sale" (Confidence: 100%)
│  Filed: Jan 15, 2010 | Parties: X, Y, Z
│  [VERIFIED BADGE] Journalistic review: Yes
│
├─ SEC Filing — Form 8-K (Confidence: 98%)
│  Date: Mar 3, 2015 | Event: Officer appointment
│  [OFFICIAL BADGE] Extracted: Yes

SECONDARY SOURCES (19)
├─ News Article — "X Takes Over Y Corp" (Confidence: 85%)
│  Source: Reuters | Date: Mar 4, 2015
│  [JOURNALISTIC BADGE] Multiple outlets: 3 confirm
│  Reporter: Jane Smith (Tier 2 journalist)

COMMUNITY EVIDENCE (16)
├─ Conference Attendance (Confidence: 45%)
│  Source: Social media screenshot | Date: May 2014
│  [COMMUNITY BADGE] Votes: 5 support, 2 dispute
│  Status: UNVERIFIED
```

---

## PRACTICAL IMPLEMENTATION

### Step 1: Database Schema Addition
```sql
-- Extend existing evidence_archive and links tables
ALTER TABLE links ADD COLUMN confidence_score NUMERIC(3,2); -- 0.00-1.00
ALTER TABLE links ADD COLUMN confidence_category VARCHAR (20); -- official/journalistic/community/disputed
ALTER TABLE evidence_archive ADD COLUMN evidence_tier VARCHAR(20); -- primary/secondary/tertiary
ALTER TABLE evidence_archive ADD COLUMN methodology TEXT; -- How was this verified?
ALTER TABLE evidence_archive ADD COLUMN limitations TEXT; -- What can't be verified?

-- Track disputes
CREATE TABLE link_disputes (
  id UUID PRIMARY KEY,
  link_id UUID REFERENCES links(id),
  disputed_by_user_id UUID,
  reason TEXT,
  counter_evidence_url TEXT,
  status VARCHAR(20), -- pending, sustained, dismissed
  created_at TIMESTAMP
);
```

### Step 2: Verification Workflow Component

```typescript
// VerificationBadge.tsx
interface VerificationBadgeProps {
  confidenceScore: number; // 0-1
  confidenceCategory: 'official' | 'journalistic' | 'community' | 'disputed';
  sources: SourceItem[];
  methodology?: string;
  limitations?: string;
}

export function VerificationBadge({
  confidenceScore,
  confidenceCategory,
  sources,
  methodology,
  limitations,
}: VerificationBadgeProps) {
  const getColor = () => {
    switch (confidenceCategory) {
      case 'official': return 'bg-blue-600';
      case 'journalistic': return 'bg-green-600';
      case 'community': return 'bg-yellow-500';
      case 'disputed': return 'bg-red-600';
    }
  };

  const getIcon = () => {
    if (confidenceScore >= 0.9) return '✓✓✓'; // Official/verified
    if (confidenceScore >= 0.7) return '✓✓';   // Journalistic
    if (confidenceScore >= 0.5) return '✓';    // Community
    return '⚠';                                  // Disputed
  };

  return (
    <div className={`${getColor()} px-3 py-1 rounded-full text-white text-sm`}>
      {getIcon()} {Math.round(confidenceScore * 100)}%
    </div>
  );
}
```

### Step 3: Disclosure Requirement
Add to every page showing network:

```
METHODOLOGY & LIMITATIONS

This network visualization combines evidence from multiple sources:

✓ OFFICIAL RECORDS (95%+ confidence)
  Court documents, corporate registries, government filings
  Source: Public records, court databases

✓ JOURNALISTIC FINDINGS (70-90% confidence)
  Reported by credentialed journalists and verified by our team
  Methodology: [Link to how we verify]

✓ COMMUNITY CONTRIBUTIONS (varies)
  Contributed by community members, unverified by default
  Status: [Pending review / Verified / Disputed]

LIMITATIONS:
• This network reflects available evidence only; absence of connection ≠ absence of relationship
• Some relationships may be outdated; we rely on source publication dates
• Community contributions may contain errors; verified sources marked accordingly
• Disputes are documented; users can challenge any connection

PRIVACY NOTICE:
This platform contains public information. We do not include:
• Private home addresses
• Phone numbers
• Bank accounts
• Medical records
• Unconfirmed personal allegations

DISCLAIMER:
This visualization is for investigative research only.
Individual claims should be independently verified before publication.
```

---

## DEFAMATION LIABILITY MITIGATION

### Risk Matrix

| Scenario | Risk Level | Mitigation |
|----------|-----------|-----------|
| Displaying official document in network | LOW | Link to source; state "per public record" |
| Showing journalistic finding | MEDIUM | Credit journalist; link to article; disclose methodology |
| Displaying unverified community claim | HIGH | Label clearly; show vote count; allow disputes |
| Making new statement about node | CRITICAL | Don't make statements; show evidence only |

### Golden Rule
**Never make original claims.** Only display evidence created by others.

BAD: "John Smith engaged in money laundering"
GOOD: "Court document alleges John Smith engaged in money laundering" [link to court document]

---

## COMPETITIVE ADVANTAGE

Project Truth's combination of:
1. **Wikipedia-style color coding** (official/journalistic/community/disputed)
2. **Bellingcat-style methodology disclosure** (show your work)
3. **DocumentCloud-style annotation** (link to sources)
4. **ICIJ-style peer review** (community consensus verification)

...creates a **unique verification system** that neither DocumentCloud, Bellingcat, nor Aleph offers alone.

This becomes **defensible in court** because every claim is:
- ✅ Sourced (linked to original)
- ✅ Categorized (official/journalistic/community)
- ✅ Transparent (methodology disclosed)
- ✅ Disputable (users can challenge)

---

---

# RESEARCH AREA 2: DEFAMATION / LIBEL PROTECTION

## The Legal Landscape (US, EU, Turkey)

### United States — Section 230 Protection

**What it covers:**
Platforms are not liable for user-generated content if they:
1. Are not creators/editors of the content
2. Have notice of problematic content and remove it
3. Don't materially contribute to illegal content

**The critical phrase:** "Any information content provider"

**Case law:**
- **Zeran v. America Online (1997)** — AOL not liable for defamatory user posts
- **Communications Decency Act 230** — "No provider shall be treated as publisher"
- **Malwarebytes v. Enigma Software (2019)** — Fact-checking is "creation of content"

**Project Truth implication:**
If Project Truth *only displays* user-contributed evidence without *adding new claims*, Section 230 likely applies. If Project Truth *creates new narratives* connecting dots, it becomes a publisher and loses Section 230.

**CRITICAL:** The line between "platform" (protected) and "publisher" (liable) is contentious.

---

### European Union — Stricter Standards

**Germany:**
- **NetzDG Law (2017)** — Platforms must remove defamatory content within 24 hours or face fines
- **No public interest defense** (unlike US)
- **Injunction possible** to prevent publication

**France:**
- **CNIL enforcement** — GDPR + defamation combined
- **"Right to be forgotten"** — Can remove historical content
- **Hate speech laws** — Stricter than US

**General principles:**
- ✅ User contributions allowed (under moderation)
- ⚠️ Platforms are partially liable if they "amplify" defamation
- ❌ No Section 230 equivalent

**EU Digital Services Act (DSA, 2024):**
- Platforms must moderate "illegal content" (including defamation)
- Transparency reports required quarterly
- Fines: up to 6% of global revenue

---

### Turkey — Highest Risk Jurisdiction

**Law 5651 (Internet Law):**
- **Defamation = criminal offense** (not just civil)
- **Platform liability:** Platforms are responsible for user content unless removed within 24-48 hours
- **"Insult" is separate crime** (lower threshold than defamation)
- **Whistleblower protection:** Limited

**Criminal penalties:**
- Publishing false information about individuals: 2-7 years prison
- "Insulting" someone: 3-6 months prison + fine
- Platforms not responding to takedown: Fines + access blocking

**Project Truth implication:**
Turkey represents **maximum defamation risk**. The platform must:
- Have Turkish legal counsel
- Respond to takedown requests within 24 hours
- Store Turkish user data locally (compliance with Turkish GDPR equivalent)
- Consider Turkish law more restrictive than even EU standards

---

## Comparative Defamation Standards

| Aspect | US | EU | Turkey |
|--------|----|----|--------|
| **Public figure defamation test** | Actual malice (NYT v. Sullivan) | Proportionality | Stricter; intent less relevant |
| **Truth as defense** | Absolute defense | Qualified defense | Qualified defense |
| **Public interest exception** | Broad | Narrow | Very narrow |
| **Burden of proof** | Plaintiff proves falsity | Often defendant proves truth |Defendant must prove truth |
| **Platform liability** | Section 230 protection | Partial (DSA moderation) | High (24hr takedown) |
| **Injunctions to prevent publication** | Rare (1st Amendment) | Common | Common |

---

## PRACTICAL DEFAMATION AVOIDANCE STRATEGY

### Risk Hierarchy

**LOWEST RISK:**
1. Displaying court document → User quotes it
2. Linking to news article → Reader clicks original
3. Showing official registry → "Per [registry name]"

**MEDIUM RISK:**
4. Community member adds evidence → Labeled "unverified" + disputeable
5. Journalist investigation → Linked with methodology + sources

**HIGHEST RISK:**
6. Platform makes new claim → Any independent statement
7. Algorithm connects dots → Creates own narrative
8. Curating unverified allegations → Implies editorial approval

### Golden Rules

**RULE 1: Display, Don't Create**
```
❌ Bad: "X engaged in corruption"
✅ Good: "Court alleges X engaged in corruption [link to court document]"
```

**RULE 2: Attribution, Always**
```
❌ Bad: "X met Y in Moscow on March 5"
✅ Good: "Per leaked document (source: journalist A), X met Y in Moscow on March 5"
```

**RULE 3: Label Unverified**
```
❌ Bad: [Shows user-submitted evidence without label]
✅ Good: [Shows evidence with "UNVERIFIED - 5 votes support, 2 dispute"]
```

**RULE 4: Allow Disputes**
```
❌ Bad: [Connection shown as fact]
✅ Good: [Connection shown with "2 users dispute this - click to see counter-evidence"]
```

**RULE 5: Include Limitations**
```
❌ Bad: [Shows connection with no context]
✅ Good: [Shows connection with "Based on: court document dated X; Limitations: Y"]
```

---

## TERMS OF SERVICE CLAUSES (DEFAMATION SECTION)

```markdown
## ACCURACY AND LIABILITY

### Your Responsibility
You agree that any information you contribute:
- Meets your good-faith belief that it is accurate
- Does not falsely accuse individuals of crimes
- Is not intended to harass, defame, or maliciously injure anyone

### Our Limitations
Project Truth is a visualization platform, not a publication. We:
- Do NOT verify all community contributions
- Do NOT investigate or enforce accuracy independently
- Do NOT make independent claims about individuals
- Display information AS-IS from sources

### If You're Named in the Network
If you are named in the network and believe information is inaccurate:
1. Click [DISPUTE THIS CONNECTION]
2. Provide counter-evidence
3. Our moderation team will review (48 hours)
4. If sustained, connection will be labeled as disputed or removed

### Legal Jurisdiction
This service is governed by [Your jurisdiction]:
- US-based users: Claims must comply with US defamation law
- EU-based users: GDPR + national defamation law applies
- Turkish users: Law 5651 and Turkish penal code apply

### Content Removal Policy
We will remove content if:
- Court order issued
- Platform determines it violates Section 230 safe harbor (US)
- Defamation sustained under applicable law
- Law enforcement requests removal

**Timeline:** 24 hours (Turkey), 48 hours (EU/US default), emergency removal available
```

---

## SECTION 230 STRATEGY (US PRIMARILY)

**How to Maintain 230 Protection:**

✅ DO:
- Display user-contributed content with disclaimer
- Remove reported defamation quickly
- Have transparent moderation policy
- Don't write original narratives
- Don't curate to favor political position

❌ DON'T:
- Make editorial decisions that "materially contribute" to defamation
- Amplify defamatory content (recommend, feature, highlight)
- Write original accusations
- Create new claims combining user sources
- Favor political faction in moderation

**Example that LOSES 230:**
```
User adds: "Person X met Person Y"
Platform adds: "This suggests a conspiracy to X" ← Original claim = liability
```

**Example that KEEPS 230:**
```
User adds: "Person X met Person Y [with evidence link]"
Platform shows: "User claims: X met Y [source shown]" ← Just displays = protected
```

---

## INTERNATIONAL JURISDICTION STRATEGY

**Recommendation: Multi-legal-framework approach**

### For US Operations
- Lean on Section 230
- Keep community content labeled "unverified"
- Fast removal on takedown notice
- Contact: Electronic Frontier Foundation (EFF) for counsel

### For EU Operations
- Comply with DSA (moderation, transparency reports)
- Follow GDPR (data processing agreements)
- Keep data in EU if serving EU users
- Contact: International Consortium of Independent Media (ICMEC) for counsel

### For Turkish Operations
- **Highest risk** — Consider separate entity or limited service
- Respond to takedowns within 24 hours
- Consider removing politically sensitive networks from Turkish access
- Contact: Turkish Human Rights Association (İHD) or media lawyer familiar with Law 5651

**Practical implementation:**
```typescript
// Jurisdiction-aware moderation
const MODERATION_SLA = {
  'US': 72, // hours
  'EU': 48, // stricter DSA
  'TR': 24, // Law 5651 requirement
  'DEFAULT': 48
};

async function handleTakedownRequest(request: TakedownRequest) {
  const jurisdiction = getUserJurisdiction(request.reporter);
  const deadline = new Date(Date.now() + MODERATION_SLA[jurisdiction] * 3600000);

  console.log(`Takedown from ${jurisdiction}: resolve by ${deadline}`);
  // Escalate to legal team if needed
}
```

---

## LIABILITY INSURANCE REQUIREMENTS

**Recommended Coverage:**

| Insurance Type | Coverage Amount | Provider Examples |
|---|---|---|
| **Media Liability** | $2-5M | Chubb, AIG, XL Catlin |
| **Errors & Omissions** | $1-3M | Hiscox, Coverage Counsel |
| **Cyber Liability** | $1M | Chubb, Beazley |
| **Privacy Liability** | $500K-1M | Axa, Travelers |

**Estimated annual cost:** $15,000-40,000 (varies by revenue, users, jurisdictions)

---

---

# RESEARCH AREA 3: MODERATION POLICY FRAMEWORK

## Current Best Practices

### OCCRP's Approach
- Editorial team (20 people) reviews all Aleph contributions
- Slow but rigorous
- **Cost:** High staff overhead
- **Speed:** 7-14 days for review

### Bellingcat's Approach
- Community flag system + volunteer moderators
- No automatic removal; human review
- **Cost:** Volunteer time (hard to sustain)
- **Speed:** Varies wildly (1-30 days)

### DocumentCloud's Approach
- User annotation system + journalist fact-check
- No moderation of uploads, but review of publication
- **Cost:** Low (users self-curate)
- **Speed:** Real-time

---

## RECOMMENDED MODERATION FRAMEWORK FOR PROJECT TRUTH

### Three Tiers

#### Tier 1: Automatic Filtering (Speed)
```typescript
// Catches obvious abuse without human review
const autoFilterRules = [
  // Rule: No phone numbers
  { pattern: /\d{3}-\d{3}-\d{4}|(\(\d{3}\))/g, action: 'HOLD_FOR_REVIEW' },

  // Rule: No SSN-like numbers
  { pattern: /\d{3}-\d{2}-\d{4}/g, action: 'REJECT' },

  // Rule: No private home addresses
  { pattern: /^\d+ .{1,30} (st|avenue|street|drive|road|ln|blvd)/i, action: 'HOLD_FOR_REVIEW' },

  // Rule: Profanity check (context-aware)
  { pattern: /slur1|slur2/i, context: 'not_historical', action: 'HOLD_FOR_REVIEW' },

  // Rule: Duplicate evidence (same node, same source)
  { action: 'DEDUPLICATE' },
];
```

**SLA:** Instant
**Accuracy:** 90% (false positives caught in Tier 2)

#### Tier 2: Community Flagging + Initial Triage (Balanced)
```typescript
interface ModerationWorkflow {
  // Community flags evidence as problematic
  communityFlag: {
    reason: 'defamatory' | 'inaccurate' | 'privacy_violation' | 'duplicate' | 'spam';
    counterEvidence?: string; // link to disputing evidence
    votes: number; // how many others agreed
  };

  // Immediate triage
  triage: {
    isCritical: boolean; // Legal threat? Privacy violation?
    category: 'content_issue' | 'moderation_policy' | 'legal_hold';
    priority: 'high' | 'medium' | 'low';
  };

  // Assign to specialist
  assignment: {
    if_category === 'legal_hold' => 'legal_team';
    if_category === 'content_issue' && user_tier === 'journalist' => 'editorial_team';
    else => 'community_moderator';
  };
}
```

**SLA:** 24-48 hours
**Accuracy:** 85% (some false positives still)

#### Tier 3: Human Review + Appeals (Rigor)
```typescript
interface HumanReview {
  reviewedBy: Tier2Moderator | Journalist | LegalCounsel;

  findings: {
    isDefamatory: boolean; // Legal assessment
    isFalse: boolean; // Factual assessment
    isPrivacyViolation: boolean; // GDPR/KVKK assessment
    explanation: string; // Why we're removing/keeping
  };

  decision: {
    action: 'APPROVE' | 'LABEL_DISPUTED' | 'REMOVE' | 'ESCALATE_TO_LEGAL';
    rationale: string;
  };

  appeal: {
    canAppeal: boolean;
    appealDeadline: Date;
    appealTo: string; // email address
  };
}
```

**SLA:** 72 hours (legal holds: 24)
**Accuracy:** 97%+ (final human judgment)

---

## SPECIFIC MODERATION RULES

### What Gets Removed Immediately

```markdown
### INSTANT REMOVAL (No appeal)
1. **Confirmed fraud**
   - Example: Fake court document
   - Verification: Compare with official source

2. **Private information**
   - Home address, phone, SSN, medical records
   - Verification: Check against NIST Privacy Act guidelines

3. **Non-consensual intimate images**
   - Removal + reporter blacklist

4. **Active threats**
   - "I will kill [person]"
   - Removal + law enforcement referral

5. **Illegal content**
   - Child sexual abuse material
   - Removal + NCMEC report
```

### What Gets Labeled / Disputed

```markdown
### DISPUTED LABEL (Shows both sides)
1. **Contradictory evidence**
   - Example: Company says "contractor"; evidence says "employee"
   - Action: Show both; label "DISPUTED" with vote counts

2. **Unverified community claim**
   - Example: User claims "attended conference X"
   - Action: Label "UNVERIFIED" + show evidence quality

3. **Outdated information**
   - Example: Person listed as CEO but retired 2015
   - Action: Keep + add "Historical" label + current status
```

### What Gets Kept (With Attribution)

```markdown
### KEEP + ATTRIBUTE (With source link)
1. **Court allegations**
   - Action: Keep + link to court document
   - Label: "Per court document (not proven; allegations only)"

2. **News articles**
   - Action: Keep + link to article
   - Label: "Per [news outlet] (reported but unconfirmed)"

3. **Public records**
   - Action: Keep + link to registry
   - Label: "Per [registry name]" (official record)
```

---

## APPEALS & DISPUTE PROCESS

```markdown
### If You Disagree With Moderation Decision

**1. APPEAL PROCESS (48 hours)**
   - Submit appeal at [form link]
   - Explain why decision was wrong
   - Provide new evidence
   - Different moderator reviews

**2. DISPUTE PROCESS (For connections)**
   - Click [DISPUTE THIS CONNECTION]
   - Provide counter-evidence
   - Show voting status
   - If votes swing: label changes automatically

**3. LEGAL CHALLENGE (External)**
   - Submit formal legal notice
   - We have 48 hours to respond
   - Escalate to legal counsel
   - May result in reinstatement or legal hold

**4. TAKEDOWN NOTICE (DMCA/DSA)**
   - Follow [our takedown procedure]
   - We respond within jurisdiction-specific SLA
   - Appeal available for good-faith errors
```

---

## RIGHTS OF REPLY

**Should named individuals get to respond?**

**Arguments for:**
- Fairness/ethical journalism
- Reduces defamation liability (shows good faith)
- Precedent: Traditional journalism offers comment

**Arguments against:**
- Burden on platform
- Abusers will weaponize
- Data privacy concerns

**Recommended approach (Hybrid):**

```markdown
### RIGHT OF REPLY — Tier-Dependent

**For Tier 1 nodes (high-profile individuals):**
- Platform actively solicits their response
- Shows response prominently
- "X responded: [quote]" in network

**For Tier 2 nodes:**
- Available on request
- Must provide email verification
- Response shown if provided

**For Tier 3 nodes:**
- No automatic right
- Can request comments section
- Not obligatory

**For journalists/public figures:**
- Presumed consent to be in network
- Can request "right of reply" but not removal
```

---

## MODERATION TEAM STRUCTURE

**For launch (Tier 1 → 3 triage):**
- 1 Lead Moderator (20 hrs/week)
- 2 Community Moderators (10 hrs/week each)
- **Cost:** $8,000-15,000/month
- **Handles:** ~100-500 reports/month

**For scale (100K+ users):**
- 1 Moderation Director
- 3-5 Moderators
- 1-2 Legal consultants (contract)
- 1 Journalist (editorial review)
- **Cost:** $40,000-60,000/month

---

---

# RESEARCH AREA 4: DATA PROTECTION (GDPR, KVKK)

## The Dual Conflict

You're building a **transparency platform** (show connections) inside a **privacy framework** (protect data). These conflict:

```
Transparency Goal: "Show who is connected to whom"
Privacy Law:      "Don't process personal data without consent"
Paradox:          Showing connections = processing personal data
```

This is solvable, but requires careful architecture.

---

## GDPR Compliance (EU/International)

### Article 5: Legal Basis for Processing

**Project Truth needs at least ONE:**

1. **Consent (Risky for historical data)**
   - Users must opt-in explicitly
   - Can't assume consent from visiting site
   - Can be withdrawn anytime
   - ❌ Won't work for existing public records (no way to get consent)

2. **Public Task / Official Authority (Best for public records)**
   - Only if you're operating as public investigative authority
   - Not applicable for private platform
   - ❌ Unlikely for Project Truth

3. **Legitimate Interest (Likely best)**
   - Platform's interest: Investigative journalism, public accountability
   - Data subjects' interest: May oppose
   - Balancing test required
   - ✅ Defensible if: journalism + transparency + proportionality

4. **Special Cases (Possible)**
   - Data from public records (already public)
   - Data from court documents (already public)
   - Data from leaked documents (already public)
   - ✅ Strongest argument for PII in public sources

### GDPR Article 6: Legitimate Interest Balancing Test

**If using Legitimate Interest basis:**

```
Question: Is our processing proportional?

1. Purpose Test:
   ✅ Investigative journalism = compelling purpose
   ✅ Public accountability = compelling purpose
   ❌ If used for surveillance = not compelling

2. Necessity Test:
   ✅ Need names + positions (necessary to show networks)
   ❌ Need phone numbers + home addresses (NOT necessary)

3. Expectation Test:
   ✅ People expect their names in journalism
   ✅ People expect court records to be public
   ❌ People don't expect home addresses in databases

4. Rights Impact Test:
   ✅ Public figures: low impact (accustomed to scrutiny)
   ✅ Court documents: medium impact (already public)
   ❌ Personal identifying info: HIGH impact (not public by default)

BALANCE RESULT:
✅ Show names + positions: PROPORTIONAL
✅ Show court documents: PROPORTIONAL
⚠️  Show photo: BORDERLINE (consent better)
❌ Show home address: DISPROPORTIONAL
❌ Show phone number: DISPROPORTIONAL
❌ Show email: DISPROPORTIONAL
```

### GDPR Articles 17-20: Data Subject Rights

**You MUST provide:**

1. **Right of Access (Art. 15)**
   - User can request: "Show me all my data you have"
   - Your response: Email summary of all connected data

2. **Right to Rectification (Art. 16)**
   - User can say: "This is wrong; fix it"
   - Your response: Review + update or dispute label

3. **Right to Erasure (Art. 17) — "Right to be Forgotten"**
   - User can request: "Delete me from network"
   - Your challenge: Public records can't be deleted
   - Solution: Pseudonymize, aggregate, or exception claim

4. **Right to Restrict Processing (Art. 18)**
   - User can say: "Stop using my data"
   - Your response: Flag as restricted; don't process further

5. **Right to Data Portability (Art. 20)**
   - User can request: "Give me my data in portable format"
   - Your response: CSV/JSON of their connections + sources

**Implementation:**

```typescript
// GDPR Rights API
POST /api/gdpr/access-request
  - User requests summary of all their data
  - Response: Email with PDF within 30 days

POST /api/gdpr/rectification-request
  - User flags inaccurate connection
  - Response: Review + update label within 30 days

POST /api/gdpr/erasure-request
  - User requests deletion
  - Response: Assess if legal exception applies
           If YES (public record): Deny with explanation
           If NO: Delete/pseudonymize within 30 days

POST /api/gdpr/data-portability-request
  - User requests their data export
  - Response: JSON/CSV within 30 days
```

---

## KVKK Compliance (Turkey)

### Turkish Data Protection Law Requirements

**Law 6698 (KVKK) Key Points:**

1. **Lawful Processing (Art. 4)**
   - Must have explicit legal basis
   - Consent is primary (unlike GDPR)
   - Public task possible but narrow
   - Processing must be "necessary"

2. **Consent Requirements (Art. 5)**
   - ✅ Explicit opt-in (not opt-out)
   - ✅ Free, specific, informed
   - ✅ Can be withdrawn anytime
   - ❌ Pre-checked boxes = invalid

3. **Special Categories (Art. 6)**
   - Biometric data: Stricter rules
   - Criminal convictions: Very strict
   - Example: Can't use photos without consent (unlike EU)

4. **Data Controller Obligations (Art. 8)**
   - Maintain registry of processing activities (like GDPR)
   - Data Protection Officer if >50 employees
   - Breach notification within 72 hours

5. **Data Subject Rights**
   - Similar to GDPR (access, rectification, erasure)
   - BUT: "Erasure" interpreted more strictly (can include deleting public info)

### KVKK Specific Strategy

```markdown
### Turkish Platform Operations

**MUST DO:**
1. Get explicit written consent for each processing activity
   - "I consent to Project Truth processing my name/image for investigative journalism"
   - Checkbox only
   - Can be withdrawn anytime

2. Designate Turkish Data Controller
   - Can be Turkish company or representative
   - Required if serving Turkish users

3. Maintain Processing Registry
   - Document: What data, why, for how long, who accesses
   - Provide on Turkish Authority request

4. Erasure Handling
   - More strict than GDPR
   - "Right to be forgotten" applied more broadly
   - May need to remove even public information

5. Notify Turkish Authority (TIB)
   - Data breach: 72 hours + to authority + to affected
   - Large processing: May need approval

**CONSIDER:**
- Geofencing: Limit Turkish users' access to less sensitive networks
- Separate entity: Operate limited service in Turkey
- Data localization: Store Turkish citizen data on Turkish servers
```

---

## PRACTICAL ARCHITECTURE

### Data Minimization Principle

**Store only what's necessary:**

```typescript
// GOOD - minimal data
interface NetworkNode {
  id: string;
  name: string; // Yes, need this
  position?: string; // Yes, relevant to network
  organizations?: Organization[]; // Yes, relevant
  // ❌ NO: email, phone, address, photo, SSN
}

// BAD - excessive data
interface NetworkNode {
  id: string;
  name: string;
  email: string; // Unnecessary
  phone: string; // Unnecessary
  address: string; // Unnecessary
  ssn: string; // Completely inappropriate
  birthDate: string; // Unnecessary
}

// If photo needed:
interface NodePhoto {
  sourceUrl: string; // Link to original (don't store)
  attributionRequired: true;
  consentObtained: boolean; // Must be TRUE
  publicSource: string; // "Wikimedia" = less consent needed; "private photo" = more
}
```

### Consent Management

```typescript
interface ConsentRecord {
  // For each person in network
  personId: string;
  consentType: 'explicit' | 'derived_from_public_record' | 'journalistic_exception';

  if (consentType === 'explicit') {
    consentDate: Date;
    consentChannel: 'email' | 'web_form' | 'phone'; // documented
    canWithdraw: true;
  }

  if (consentType === 'derived_from_public_record') {
    sourceRegistry: string; // "Companies House" = strong; "leaked document" = weaker
    sourceUrl: string; // Link to prove it's public
    reasonPublic: string; // "Court document" = stronger; "social media" = weaker
  }

  if (consentType === 'journalistic_exception') {
    //
    // RISKY - use only for newsworthy public figures
    //
    journalisticJustification: string;
    jurisdiction: 'US' | 'EU' | 'TR'; // Varies by location
  }

  // Allow withdrawal/objection
  canObjectAt: Date; // How long to maintain?
  mustReviewAt: Date; // Periodic review required
}
```

---

## RIGHTS REQUEST HANDLING

### Process Map

```
User Request
  ↓
  ├─ [Access Request]
  │   └─ Find all data mentioning them
  │   └─ Compile into PDF
  │   └─ Email within 30 days
  │
  ├─ [Rectification Request]
  │   └─ User claims: "I was never CEO of X"
  │   └─ Review evidence
  │   └─ If wrong: Update + notify others
  │   └─ If supported by evidence: Deny with explanation
  │
  ├─ [Erasure Request] ← MOST CONTENTIOUS
  │   └─ User claims: "Delete me"
  │   └─ Check: Is data from public record?
  │       ├─ YES: Exception applies; deny + explain
  │       └─ NO: Delete if not investigatively necessary
  │
  └─ [Portability Request]
      └─ Send as JSON/CSV within 30 days
```

### Erasure Exception Framework

```markdown
### When Can You DENY Erasure?

✅ COURT RECORDS:
   "This is from a court document; it's public record.
    Deleting would distort the historical record.
    You can request it be pseudonymized instead."

✅ NEWS ARTICLES:
   "This comes from published journalism.
    Deleting would require rewriting journalistic history.
    You can request we note your objection."

✅ INVESTIGATIVE NECESSITY:
   "This is core to an ongoing investigation.
    Deleting would compromise journalism.
    We will delete once investigation is archived."

❌ CANNOT DENY ON:
   "It's inconvenient for you" (insufficient)
   "It hurts your reputation" (insufficient; that's point)
   "We just don't want to" (no legal basis)
```

---

## PRIVACY POLICY REQUIREMENTS

```markdown
## What Data We Collect

### Explicit Collection:
- Name, email (if you sign up for notifications)
- Investigation contributions (what you add to network)

### Derived Collection:
- Public court documents (with your name mentioned)
- News articles (with your name mentioned)
- Public corporate records (your board positions)

### NOT Collected:
- Home address, phone number, social security number
- Biometric data, health records, financial info
- Location data, browsing history

## Legal Basis

**For publicly available information:**
Legitimate interest in investigative journalism and public accountability.

**For contributed content:**
Consent (you agree by contributing).

## Your Rights

1. **Access:** Email [link] to get all data we have about you
2. **Rectify:** Flag an error; we'll review (see below)
3. **Erase:** Request deletion; will comply except for:
   - Court records (public record exception)
   - Investigation-critical data (journalistic exception)
   - Data required by law
4. **Restrict:** Stop processing; we'll hold in restricted status
5. **Portability:** Get your contributions as JSON/CSV
6. **Object:** Opt-out of future processing

## Handling Disputes

If you disagree with a connection shown:
1. Click [DISPUTE THIS CONNECTION]
2. Provide counter-evidence
3. We'll review and label accordingly
4. Your side will be shown

## Deletion

We delete account data when:
- You request it
- Account inactive 2 years
- You violate terms

We DON'T delete network data (public record, journalistic necessity).
```

---

---

# RESEARCH AREA 5: SAFE HARBOR & RESPONSIBLE DISCLOSURE

## The Dual Obligation

Project Truth may discover evidence of **ongoing crime**. What's your legal obligation?

```
Question: If platform discovers child exploitation ring, must you report it?
Answer:   YES (nearly all jurisdictions)

Question: If platform discovers tax evasion, must you report it?
Answer:   MAYBE (depends on jurisdiction; usually not required)

Question: If platform discovers fraud, must you report it?
Answer:   MAYBE (depends on severity + jurisdiction)
```

This is called **"Mandatory Reporting"** or **"Reporting Obligations."**

---

## Mandatory Reporting Laws (Jurisdiction-Specific)

### United States
**Mandatory reporters (teachers, doctors, social workers) must report:**
- Child abuse
- Elder abuse
- Abuse of disabled persons
- Some states: Any person must report child abuse

**Platforms (like Project Truth):**
- NOT legally required to report (with exception of CSAM)
- BUT: Section 230 doesn't shield knowing facilitation of illegal acts
- BEST PRACTICE: Report CSAM to NCMEC; report active violence threats

**Action:**
```typescript
// Automatic reporting for CSAM
if (isChildSexualAbuseImage(uploadedImage)) {
  reportToNCMEC(image, uploader);
  removeImage();
  blockUser();
}

// For non-CSAM crimes: Judgment call
if (isPossibleOngoingCrime(evidence)) {
  // Option A: Consult legal team
  // Option B: Anonymously report to law enforcement
  // Option C: Ask community to report (don't force)
}
```

### European Union
**GDPR + National laws:**
- Generally NOT required to report crimes to police
- EXCEPTION: Some countries (e.g., France) require reporting of specific crimes
- EU Digital Services Act: Must remove "illegal content" but doesn't mandate reporting

**BUT: NetzDG (Germany) requires:**
- Removal within 24 hours
- Don't need to report; just remove

**Action:**
```
If EU legal risk discovered:
1. Consult EU legal counsel
2. Remove content + document decision
3. Don't auto-report (could violate privacy)
4. Respond to official requests
```

### Turkey
**Law 5651 + Turkish Penal Code:**
- Generally NOT required to report crimes
- EXCEPTION: Organized crime, terrorism have expanded definitions
- Law enforcement can demand data (and do)

**Action:**
```
If Turkish legal risk discovered:
1. Consult Turkish media lawyer immediately
2. Assess if content violates Law 5651
3. Remove if required
4. Preserve evidence for authority demands
5. Respond to official requests within 48 hours
```

---

## Whistleblower Protection Laws

### United States
**Whistleblower statutes protect:**
- Securities fraud (SEC whistleblower program)
- Environmental violations (EPA)
- Workplace safety (OSHA)
- Healthcare fraud (False Claims Act)
- Government contracting fraud

**How they work:**
1. Report to agency (SEC, EPA, etc.)
2. Agency investigates
3. If enforcement action: Whistleblower gets reward (10-30% of recovery)
4. Anti-retaliation protections apply

**Project Truth angle:**
If platform becomes aware of securities fraud, can you report to SEC and get whistleblower reward?
- ✅ YES (you're allowed)
- ⚠️ BUT: Must be careful not to publicly disclose before reporting
- ⚠️ AND: Avoid trading on non-public info yourself (insider trading)

**Action:**
```typescript
if (isProbablySEC_ViolatingCrime(evidence)) {
  // 1. Don't trade on it (insider trading liability)
  // 2. Report to SEC: sec.gov/tcr
  // 3. Document everything (for reward claim)
  // 4. Can then publish once reported
}
```

---

### EU Whistleblower Directive (2019/1937)
**Protects employees who report within their organization:**
- Internal reporting channels (to employer)
- External reporting channels (to authorities)
- Public disclosure (if other channels fail)

**Project Truth angle:**
If your *employees* discover wrongdoing:
- They have right to report internally
- They have right to report externally without retaliation
- Company cannot fire them for reporting

**Action:**
```markdown
### INTERNAL WHISTLEBLOWER POLICY

Project Truth commits to:
1. Internal reporting channel (anonymous email: whistleblower@project-truth.org)
2. Investigation within 30 days
3. No retaliation against reporters
4. Protection of reporter identity
5. External escalation if internal handling fails

Employees can also report directly to:
- [Relevant authority for jurisdiction]
- Journalists (with legal protection)
```

---

## Responsible Disclosure Framework

**When Project Truth discovers evidence of crime:**

### Tier 1: CSAM (Child Sexual Abuse Material)
```
ACTION: Immediate removal + NCMEC report
REPORTING: Mandatory (legally required)
TIMELINE: Within 24 hours
NO exceptions
```

### Tier 2: Active Violence / Immediate Threat
```
ACTION: Removal + law enforcement report
REPORTING: Strongly recommended (moral obligation)
TIMELINE: Within 24 hours
EXAMPLE: "Planning to kill [person] at [location] on [date]"
```

### Tier 3: Major Criminal Conspiracy (Verified)
```
ACTION: Consult legal counsel + decision
REPORTING: Optional (discuss with counsel)
TIMELINE: Before publication (48 hours)
EXAMPLE: "Evidence of organized crime structure"
APPROACH:
  - DON'T publish yet
  - Report to law enforcement (anonymously if needed)
  - Give them reasonable time (7-14 days) to investigate
  - Then publish (journalism serves public interest)
```

### Tier 4: White-Collar Crime (Fraud, Tax Evasion, etc.)
```
ACTION: Consult counsel
REPORTING: Depends on jurisdiction + severity
TIMELINE: Coordinate with journalists
EXAMPLE: "CEO embezzled from company"
APPROACH:
  - Report to SEC if securities fraud
  - Report to IRS if tax evasion
  - Report to relevant regulatory body
  - Can claim whistleblower reward
  - Then publish investigation
```

### Tier 5: Past Crime (No Active Threat)
```
ACTION: Publish (this is journalism)
REPORTING: Only if required by law (most jurisdictions: no)
EXAMPLE: "Historical corruption network"
APPROACH:
  - This is Project Truth's core function
  - Publish with full transparency
  - No requirement to report to authorities
  - Authorities will see it if important
```

---

## Implementing Responsible Disclosure

```typescript
// Responsible Disclosure Decision Tree
async function assessCriminalContent(evidence: Evidence): Promise<Action> {

  if (isCSAM(evidence)) {
    return {
      action: 'IMMEDIATE_REMOVAL',
      reporting: 'MANDATORY_TO_NCMEC',
      timeline: '24_hours',
      noExceptions: true
    };
  }

  if (isActiveViolence(evidence)) {
    return {
      action: 'REMOVAL_AND_LEO_REPORT',
      reporting: 'STRONGLY_RECOMMENDED',
      timeline: '24_hours',
      escalateToLegal: true
    };
  }

  if (isMajorCriminalConspiracy(evidence) && isVerified(evidence)) {
    return {
      action: 'HOLD_AND_CONSULT_LEGAL',
      reporting: 'OPTIONAL_PER_LEGAL_ADVICE',
      timeline: 'BEFORE_PUBLICATION',
      allowJournalisticDelay: '7_14_days'
    };
  }

  if (isWhiteCollarCrime(evidence)) {
    return {
      action: 'CONSIDER_WHISTLEBLOWER_REPORT',
      reporting: 'OPTIONAL',
      timeline: 'BEFORE_PUBLICATION',
      potentialReward: 'SEC_WHISTLEBLOWER_ELIGIBLE'
    };
  }

  // Default: This is journalism
  return {
    action: 'PUBLISH',
    reporting: 'NO_REQUIREMENT',
    timeline: 'STANDARD_EDITORIAL'
  };
}
```

---

## Legal Immunity Framework

```markdown
### Project Truth's Legal Position

**For Published Investigation:**
- Likely covered by journalism privilege (varies by jurisdiction)
- Responsible source: We name sources (or explain why we can't)
- Public interest: Balances against privacy concerns
- Factual accuracy: We link to evidence

**For User-Contributed Evidence:**
- Covered by Section 230 (US) if unmodified
- Liable if we materially contributed to defamation
- Must remove on valid takedown notice

**For Third-Party Reports:**
- Must report CSAM (NCMEC) — immunity applies
- Should report active threats — good faith defense available
- May report financial crimes to SEC — whistleblower protection applies

**Against Retaliation:**
- Employees reporting wrongdoing: Protected (Whistleblower Directive)
- Users reporting illegal content: No retaliation
- Journalists publishing investigations: Journalism privilege
```

---

---

# RESEARCH AREA 6: TERMS OF SERVICE TEMPLATE

Here's a practical, enforceable ToS for Project Truth incorporating all findings above:

```markdown
# PROJECT TRUTH — TERMS OF SERVICE

**Effective Date:** [Date]
**Last Updated:** [Date]
**Jurisdiction:** [US/EU/Turkey] — See Section 12 for jurisdiction-specific rules

---

## 1. ACCEPTANCE & ELIGIBILITY

By accessing Project Truth, you agree to be bound by these Terms. If you don't agree, stop using the service.

**Age:** You must be 18+ (or legal age in your jurisdiction).

**Use:** Project Truth is for investigative research, journalism, and public interest only. Not for:
- Harassment, defamation, or targeting individuals
- Surveillance of private persons
- Commercial exploitation
- Accessing via automated means (bots, scraping)

---

## 2. YOUR CONTENT & CONTRIBUTIONS

### 2.1 Evidence Submission

When you submit evidence (documents, connections, sources), you represent that:
- You have the legal right to submit it
- It's not falsely accusatory or defamatory
- It doesn't violate anyone's privacy without good cause
- You have permission to share it (or it's public record)

You grant Project Truth a non-exclusive, royalty-free license to:
- Display, analyze, and share the evidence
- Link to your evidence in investigations
- Attribute it to you (if you choose) or anonymously

### 2.2 Accuracy Responsibility

You agree that submitted evidence is your good-faith belief as accurate.

Project Truth:
- Does NOT verify all community submissions
- Labels unverified evidence clearly
- Allows users to dispute inaccurate claims
- Removes false evidence on valid challenge

### 2.3 Prohibited Content

You cannot submit:
- Private home addresses, phone numbers, SSNs
- Non-consensual intimate images
- Threats or calls for violence
- Hate speech targeting protected characteristics
- Copyright infringement (unless fair use)
- Spam or promotional content

---

## 3. ACCURACY & LIMITATIONS

Project Truth is a research platform combining:
- **Official records** (court documents, corporate registries)
- **Journalistic findings** (reported by credentialed journalists)
- **Community contributions** (flagged as unverified)

### 3.1 We Make No Guarantees

Each connection shows evidence + source. We don't:
- Independently investigate every claim
- Verify community-submitted evidence
- Make new accusations beyond source documents
- Guarantee the network is complete

### 3.2 Verification Levels

We mark evidence as:
- ✅ OFFICIAL (95%+ confidence): Court/registry documents
- 🟢 JOURNALISTIC (70-90%): Reported by journalists, sourced
- 🟡 COMMUNITY (<70%): User-submitted, unverified
- 🔴 DISPUTED: Users challenge this connection

---

## 4. LIMITATION OF LIABILITY

### 4.1 "As-Is" Service

Project Truth is provided AS-IS. We disclaim all warranties:
- Merchantability, fitness for purpose, non-infringement
- Accuracy, completeness, timeliness

### 4.2 Liability Cap

**In no event shall Project Truth be liable for:**
- Damages from errors or omissions
- Damages from using information in publication
- Damages from relying on network connections
- Any special, incidental, or consequential damages

### 4.3 Your Responsibility

You agree:
- To independently verify any information before publication
- Not to blindly rely on community-submitted evidence
- To check original sources, not just our summaries
- Professional journalists should apply editorial judgment

---

## 5. INTELLECTUAL PROPERTY

### 5.1 Our Content

Project Truth's code, design, and analysis are owned by us and licensed under AGPL-3.0 (for open-source) or proprietary license (for commercial features).

You may not:
- Reverse-engineer our algorithms
- Scrape the network at scale (automated access)
- Republish without attribution
- Use for commercial purposes without permission

### 5.2 Your Contributions

You retain copyright to evidence you submit. We have license to use it.

### 5.3 Third-Party Content

Court documents, news articles, public registries are not ours. We link to original sources. We respect copyright.

---

## 6. PRIVACY & DATA PROTECTION

### 6.1 What We Collect

**Account Data:**
- Email (if you sign up)
- Username (if you create account)
- Contributions (what you add)

**Derived Data:**
- Public court documents (you're mentioned)
- Public news articles (about you)
- Public corporate records (your positions)

We do NOT collect:
- Home address, phone, SSN (unless you submit)
- Biometric data, health info, financial data
- Location, browsing history, cookies (minimal)

### 6.2 Data Processing

**Legal Basis:**
- Legitimate interest in investigative journalism
- Public record exception (for official documents)
- Consent (for personal data you submit)

**Retention:**
- Account data: 2 years post-deletion
- Network data: Indefinite (public record)
- Backups: 90 days post-deletion

### 6.3 Your Rights

You have the right to:
1. **Access:** See all data we have about you
2. **Rectify:** Correct inaccurate info
3. **Erase:** Request deletion (with exceptions for public records)
4. **Restrict:** Stop processing (data held, not deleted)
5. **Portability:** Export your contributions as JSON/CSV
6. **Object:** Opt-out of future processing

**Submit requests:** [email link]
**Response time:** 30 days (15 days for urgent)

### 6.4 Data Sharing

We share data with:
- Law enforcement (on valid legal process)
- Journalists (with proper attribution)
- Researchers (anonymized only)
- Third-party services: Supabase (Postgres), Google Cloud (storage)

We do NOT sell data.

---

## 7. DEFAMATION & ACCURACY

### 7.1 Assumption of Risk

Information in Project Truth may be:
- Based on allegations (not proven)
- Derived from disputed sources
- Outdated or incorrect

**You assume risk of relying on it.**

### 7.2 Before Publishing

If you publish using Project Truth data:
- ✅ DO link to original sources
- ✅ DO disclose methodology
- ✅ DO verify independently
- ✅ DO check for updates
- ❌ DON'T quote out of context
- ❌ DON'T publish unverified allegations as fact
- ❌ DON'T use for harassment

### 7.3 If You're Named

If you believe information about you is inaccurate:
1. Click [DISPUTE THIS CONNECTION]
2. Provide counter-evidence
3. We'll review (48 hours)
4. Decision will be transparent

You also have right of reply (see Section 8).

---

## 8. RIGHT OF REPLY

If you're a prominent figure in the network and believe you have context:

### 8.1 How to Request

Email: [contact]
Include: Your name, which connections, your statement

### 8.2 What We'll Do

We'll review your request:
- If reasonable: Add your statement to your profile
- If legal threat: Escalate to counsel
- If harassment: Decline + warn about future requests

### 8.3 What You Can Say

- Factual corrections ("I was never CEO of X")
- Context ("I attended meeting but was not part of arrangement")
- Refutation ("This document is forged")

You cannot require removal of accurate information.

---

## 9. MODERATION & REMOVAL

### 9.1 What We Remove

**Immediately (no appeal):**
- Child sexual abuse material
- Non-consensual intimate images
- Active violence threats
- Spam/malware

**Within 24-48 hours (with appeal):**
- False information (verified false)
- Privacy violations (SSNs, home addresses)
- Copyright infringement
- Harassment/bullying

**Optional (case-by-case):**
- Outdated information (old headlines)
- Disputed evidence (both sides shown)
- Low-confidence evidence (labeled unverified)

### 9.2 Appeals Process

If we remove your content, you can:
1. Submit appeal at [form]
2. Explain why decision was wrong
3. Provide new evidence
4. Different moderator reviews (48 hours)

---

## 10. USER OBLIGATIONS

You agree not to:
- Use automated access (bots, scrapers)
- Hack or damage the system
- Violate anyone's rights
- Harass or defame
- Submit malware or spam
- Use for surveillance of private persons

**Violations:** Account termination, legal action, reporting to authorities.

---

## 11. LIMITATION OF SERVICE

We reserve the right to:
- Modify, suspend, or discontinue service
- Restrict access in certain countries
- Change fees or features
- Remove accounts that violate terms

**Notice:** 30 days (except emergency/legal requirement).

---

## 12. JURISDICTION-SPECIFIC TERMS

### 12.1 United States

**Applicable Law:** [Your state] law
**Section 230:** Project Truth relies on Section 230 protections for user-contributed content

**Arbitration:** Disputes resolved via arbitration (not court)

### 12.2 European Union

**Applicable Law:** EU law + national laws (GDPR, DSA)

**Data Protection:**
- Data Controller: [Your entity]
- Data Protection Officer: [contact]
- Disputes: National Data Protection Authority

**Digital Services Act:**
- We comply with moderation requirements
- Quarterly transparency reports published at [link]
- Appeal mechanism for moderation decisions

### 12.3 Turkey

**Applicable Law:** Law 5651 (Internet Law) + Turkish Penal Code

**Compliance:**
- 24-hour takedown response SLA
- Turkish data stored in Turkey
- Representative: [Turkish legal entity]
- Disputes: Turkish courts

**Notice:** Turkish users understand Law 5651 applies to Platform + Users

---

## 13. TERMINATION

### 13.1 By You

You can delete your account anytime at [link].

Your contributions remain in the network (as public record).

### 13.2 By Us

We can terminate your account if you:
- Violate these terms
- Misuse the platform
- Pose legal risk
- Violate applicable law

**Notice:** 24 hours (or immediately for legal emergency).

---

## 14. CHANGES TO TERMS

We can modify these terms anytime.

**Notice:** 30 days (or immediate for legal requirement).

Continuing to use = acceptance of new terms.

---

## 15. CONTACT

**Support:** [email]
**Legal Notice:** [email]
**GDPR/Privacy Request:** [email]
**Takedown/DMCA:** [email]
**Abuse:** [email]

---

## 16. ENTIRE AGREEMENT

These Terms + Privacy Policy + Moderation Policy form the entire agreement between you and Project Truth. Any prior understanding is superseded.

---

**End of Terms of Service**
```

---

---

# RESEARCH AREA 7: EDITORIAL STANDARDS

## Key Frameworks

### SPJ (Society of Professional Journalists) Code of Ethics
The baseline for investigative journalism:

```markdown
## SPJ CODE OF ETHICS (Adapted for Project Truth)

### 1. SEEK TRUTH & REPORT IT
- Verify information before publication
- Use original sources when possible
- Correct errors promptly and transparently
- Be transparent about methodology

**For Project Truth:**
- Link to primary sources (court documents, registries)
- Show methodology (how did we find this connection?)
- Document limitations (what can't we verify?)
- Allow disputes (community can challenge)

### 2. MINIMIZE HARM
- Treat sources fairly
- Respect privacy unless overridden by public interest
- Consider vulnerable populations
- Avoid presenting allegations as fact

**For Project Truth:**
- Label unverified claims clearly
- Show evidence quality
- Allow right of reply
- Don't publish private info unless newsworthy

### 3. ACT INDEPENDENTLY
- Avoid conflicts of interest
- Don't allow sources to approve publication
- Maintain editorial independence
- Disclose relevant relationships

**For Project Truth:**
- Transparent funding (show who funds us)
- Avoid political bias (show evidence, not opinion)
- Don't suppress inconvenient facts
- Disclose if founder invested in company

### 4. BE ACCOUNTABLE
- Explain reasoning to audience
- Admit errors and correct them
- Engage with criticism
- Listen to concerns from named individuals

**For Project Truth:**
- Publish moderation policy
- Explain removal decisions
- Respond to appeals
- Show voting/dispute counts
```

---

### GIJN (Global Investigative Journalism Network) Standards

```markdown
## GIJN INVESTIGATIVE STANDARDS

### 1. VERIFICATION IN LAYERS
- First layer: Primary documents
- Second layer: Corroborating sources
- Third layer: Expert analysis
- Fourth layer: Right of reply from accused

**Implementation for Project Truth:**
- Show which layer each evidence comes from
- Require 2+ sources for major claims
- Always include subject's response if available
- Document edge cases where verification fails

### 2. PROPORTIONALITY TEST
- Importance to public interest
- Potential harm to individuals named
- Strength of evidence
- Availability of less harmful alternatives

**Matrix:**
```
Public Figure (CEO)    + Strong Evidence (Court) + High Public Interest = PUBLISH
Private Person (Board) + Medium Evidence (News)  + Medium Interest      = LABEL + DISPUTE AVAILABLE
Ordinary Citizen       + Weak Evidence (Rumor)   + Low Interest         = DON'T PUBLISH
```

### 3. TRANSPARENCY OF METHOD
- Show how investigation conducted
- Acknowledge limitations
- Explain data sources
- Document gaps

**For Project Truth:**
- Create "Methodology" section for each network
- Link to sources used
- Show confidence scores
- Note what we couldn't find

### 4. CORRECTION & UPDATES
- Errors corrected immediately
- Updates noted transparently
- Archive of changes maintained
- User-reported issues addressed

**Implementation:**
- Version history of connections
- Change log visible to readers
- Attribution of corrections to user reports
- Notification to those affected by corrections
```

---

### Bellingcat's Verification Methodology

```markdown
## BELLINGCAT VERIFICATION CHECKLIST

### For Each Connection:

1. PRIMARY SOURCE
   ✓ Link to original document
   ✓ Verify authenticity (not fake/doctored)
   ✓ Explain what it says
   ✓ Acknowledge interpretation

2. CORROBORATION
   ✓ At least one independent source
   ✓ Source different from primary
   ✓ Same conclusion despite different path

3. EXPERT REVIEW
   ✓ Relevant expert validates
   ✓ Expert can be attributed or anonymous
   ✓ Expert explains their confidence
   ✓ Document any disagreement

4. LIMITATIONS
   ✓ What we could NOT verify
   ✓ Gaps in evidence
   ✓ Alternative explanations
   ✓ Timeframes and context

5. METHODOLOGY
   ✓ How did we find this?
   ✓ What tools/databases used?
   ✓ Who conducted the research?
   ✓ How long did it take?

Example:
"Person A is listed as director of Company X.
PRIMARY: Companies House registry (link)
CORROBORATION: SEC filing (link) + news article (link)
EXPERT: Corporate governance researcher (name/affiliation)
LIMITATIONS: Cannot verify when relationship ended (registry shows 2015-2020)
METHODOLOGY: Searched Companies House + SEC EDGAR + Reuters database
```

---

## Project Truth Editorial Policy

```markdown
# PROJECT TRUTH EDITORIAL POLICY

## 1. SOURCE HIERARCHY

### Tier 1: Official Records (95%+ confidence)
- Court documents, dockets, filings
- Corporate registries, government records
- SEC filings, property records
- Action: Display directly + link to source

**Example:** "Director of ABC Corp (Companies House registry, filed 2015-2021)"

### Tier 2: Journalistic Reporting (70-90% confidence)
- Reported by credentialed journalists
- Published in reputable outlets
- Sourced to named sources or on-the-record
- Methodology disclosed
- Action: Display + link to article + disclose publication outlet

**Example:** "Attended meeting in Moscow (reported by Bellingcat, sourced to leaked email + geolocation analysis)"

### Tier 3: Community Contributions (<70% confidence)
- User-submitted without independent verification
- Labeled "unverified"
- Shows vote count + dispute count
- Can be disputed with counter-evidence
- Action: Display + clear "UNVERIFIED" label

**Example:** "Attended conference (user-submitted, unverified; 5 support, 2 dispute)"

### Tier 4: Disputed Evidence
- Contradictory sources exist
- Show both sides
- Label "DISPUTED"
- Display counter-evidence
- Action: Show both claims + allow users to vote

**Example:** "Employed as Director (DISPUTED: Company says contractor; Evidence shows employee)"

---

## 2. VERIFICATION WORKFLOW

### For Tier 1 (Official Records)
- ✓ Verify document exists in registry
- ✓ Link directly to original
- ✓ Check for updates/amendments
- Publish immediately

### For Tier 2 (Journalistic)
- ✓ Verify journalist/outlet is credible
- ✓ Link to original article
- ✓ Check article methodology
- ✓ Verify article still published (not retracted)
- Publish with disclosure

### For Tier 3 (Community)
- ⚠️ DO NOT verify (label unverified)
- Document contributor (reputation/tier)
- Allow disputes
- Community voting system active
- Publish with "UNVERIFIED" label

### For Tier 4 (Disputed)
- Verify both claims have sources
- Show both sides equally
- Allow user voting
- Label as "DISPUTED"
- Clearly show disagreement

---

## 3. RED FLAGS (Pause Before Publishing)

- **No source document** → Reject unless Tier 2 article
- **Unverifiable claim** → Mark unverified; allow disputes
- **Recent allegation** → Verify multiple sources before publishing
- **Political sensitivity** → Extra review; disclose any funding link
- **Person is minor** → Don't publish (privacy concern)
- **Private person** → Extra scrutiny on public interest value
- **Allegation of crime** → Double-check sources; get legal review

---

## 4. RIGHT OF REPLY

For Tier 1/2 individuals with significant profile:

**Outreach:**
- Attempt to contact subject of allegations
- Email: "We have included [specific claim]. Do you want to respond?"
- Give 48-hour response window
- Acknowledge if they don't respond

**Display:**
- If response received: Show prominently
- If no response: Note "No response to request for comment"
- Include contact info so reader knows we tried

---

## 5. CORRECTIONS & UPDATES

**Minor Error (typo, date):**
- Correct immediately
- Note "Corrected: [date]" in metadata
- Notify community who flagged it

**Major Error (wrong person, false claim):**
- Remove connection immediately
- Investigate source of error
- Publish correction notice
- Notify users affected
- Update moderation policy if systemic

**Outdated Information:**
- Add "Historical" label if relationship ended
- Update with current status if available
- Show "Last verified: [date]"
- Allow users to update with new info

---

## 6. CONFLICTS OF INTEREST

Project Truth staff/volunteers cannot:
- Contribute evidence about employers/family
- Vote on disputes involving financial interest
- Moderate content where they have stake

**Disclosure:**
- If staff member involved in network: Flag as disclosure
- If funder is named individual: Separate moderation team
- If political motivation: Disclose funding source
- If financial interest: Recuse from editorial decisions

---

## 7. ARCHIVE & PERSISTENCE

- Networks archived indefinitely (public record)
- Corrections documented with dates
- Change history visible
- Original versions accessible (version control)
- Removed content has "RETRACTED" label with explanation

---

## 8. RETRACTIONS

**When to retract:**
- Entire network investigation proven false → Full retraction
- One connection proven false → Targeted retraction
- Source document revealed as fake → Remove that evidence
- Journalist retracts story → We follow suit

**How to retract:**
- Bold "RETRACTED [date]" at top
- Explanation of why
- Apology if appropriate
- Keep for historical record (don't delete)

---

## 9. APPEALS & DISPUTES

Users can:
- Dispute connections (provide counter-evidence)
- Suggest corrections (flag errors)
- Request removal (privacy/harassment)
- Appeal moderation decision

**Process:**
- Submission → Automatic acknowledgment
- Review → 48 hours
- Decision → Transparent explanation
- Appeal available if disputed

---

## 10. TRAINING & OVERSIGHT

All moderators/editors trained on:
- Source verification
- Defamation law in their jurisdiction
- Privacy protection
- Conflict of interest
- Community management

Quarterly:
- Audit sample of moderation decisions
- Review for bias
- Update policy based on emerging issues
```

---

---

# RESEARCH AREA 8: INSURANCE & LEGAL ENTITY

## Jurisdictional Considerations

### Media Liability Insurance

**What it covers:**
- Defamation claims
- Privacy invasion
- Copyright infringement
- Errors & omissions
- Defense costs + settlements

**Estimated costs:**
```
Startup Phase ($0-100K revenue):
  - $10,000-15,000/year
  - $2M/$5M coverage

Growth Phase ($100K-1M revenue):
  - $20,000-35,000/year
  - $5M/$10M coverage

Mature Phase ($1M+ revenue):
  - $40,000-75,000/year
  - $10M-$25M coverage
```

**Providers specializing in investigative platforms:**
- Chubb (insurance)
- AIG (insurance)
- XL Catlin (insurance)
- Coverage Counsel (broker specializing in media)

---

### Cyber Liability Insurance

**Covers:**
- Data breaches
- Ransomware
- Business interruption
- Regulatory fines
- Notification costs

**Cost:** $5,000-15,000/year (varies by user count + data sensitivity)

---

### Professional Indemnity / Errors & Omissions

**Covers:**
- Errors in sourcing
- Methodology mistakes
- Incorrect data analysis
- Failed due diligence

**Cost:** $3,000-10,000/year

---

## Legal Entity Structure

### Option 1: US-Based (Easiest for Launch)

**Structure:** Delaware C-Corp or LLC

**Advantages:**
- Section 230 protection
- Startup-friendly legal framework
- Access to US venture capital
- Simple incorporation

**Disadvantages:**
- Must comply with GDPR if serving EU users
- Turkey can block access
- Subject to US government requests

**Setup:**
- Registered agent (Stripe Atlas, LawRoom)
- Articles of Incorporation
- Bylaws
- Directors + shareholders
- Federal EIN
- Cost: $500-2,000 initial + $100-200/year

**Insurance:** Media liability + cyber insurance mandatory
**Cost:** $15,000-25,000/year

---

### Option 2: EU-Based (Best for International)

**Structure:** Limited Liability Company (Netherlands/Ireland preferred)

**Why Netherlands:**
- Strong data protection framework
- DSA compliance straightforward
- Dutch courts experienced in platform liability
- Reasonable corporate tax (19%)

**Why Ireland:**
- Digital Services Act enforcement still developing
- Low corporate tax (12.5%)
- Experienced platform companies
- English-language legal system

**Advantages:**
- GDPR fully integrated
- DSA framework clear
- EU startup ecosystem
- Can serve Turkey (technically legal; Turkey may block)

**Disadvantages:**
- No Section 230 equivalent (higher moderation burden)
- EU compliance complexity
- GDPR fines up to 6% of revenue

**Setup:**
- Foundation or BV (Besloten Vennootschap)
- Register with tax authority
- GDPR privacy impact assessment
- Data Protection Officer (optional if <250 employees)
- Cost: €1,000-3,000 initial + €500-1,000/year

**Insurance:** Media liability + cyber + DSA compliance insurance
**Cost:** €15,000-30,000/year (higher due to DSA requirements)

---

### Option 3: Hybrid Decentralized Model (Ambitious)

**Structure:** Foundation + DAO (Decentralized Autonomous Organization)

**Concept:**
- Legal entity: Swiss Foundation (neutral)
- Platform governance: Community DAO
- Code: Open-source (cannot be controlled)
- Data: IPFS (decentralized storage)
- Hosting: Multiple jurisdictions

**Advantages:**
- Single point of failure eliminated
- No single entity liable
- Community ownership
- Hard to shut down

**Disadvantages:**
- Complex legal liability (who's responsible?)
- Regulatory ambiguity (DAOs not legally defined)
- Hard to monetize
- Moderation authority unclear

**Setup:**
- Very ambitious (months + specialized legal)
- Not recommended for launch
- Consider for Phase 2+ if community demands it

**Insurance:** Likely not available (unique model)

---

## Recommended Approach for Launch

**Primary:** US-based (Delaware LLC)
**Secondary:** Consider EU entity if significant EU user base (2-3 years in)
**Timeline:** Establish before public launch

**Reasoning:**
- Section 230 protection essential
- Fastest to launch
- Can add EU entity later
- Avoid regulatory complexity at start

---

## Risk Management Framework

### Legal Defense Fund

Set aside 10% of revenue annually:
- $0-100K revenue: $2,000/year
- $100K-1M revenue: $15,000/year
- $1M+ revenue: $100,000/year

This covers:
- Defamation lawsuits (legal fees)
- GDPR fines (if caught in breach)
- Emergency takedowns (legal review)

---

### Compliance Checklist

```markdown
## PRE-LAUNCH LEGAL CHECKLIST

### Entity Setup
- [ ] Register corporation/LLC in primary jurisdiction
- [ ] EIN/tax ID obtained
- [ ] Registered agent appointed
- [ ] Articles/bylaws drafted

### Insurance
- [ ] Media liability insurance ($2M/$5M minimum)
- [ ] Cyber liability insurance ($1M minimum)
- [ ] Policy reviewed by legal counsel
- [ ] Declarations page signed

### Terms & Policies
- [ ] Terms of Service drafted
- [ ] Privacy Policy drafted (GDPR + KVKK compliant)
- [ ] Moderation Policy drafted
- [ ] Editorial Policy drafted
- [ ] All reviewed by legal counsel

### Data Protection
- [ ] Data Processing Agreement (Supabase)
- [ ] Privacy Impact Assessment completed
- [ ] User consent mechanism in place (GDPR)
- [ ] Takedown procedure documented

### Content Moderation
- [ ] Moderation team training complete
- [ ] Escalation procedure documented
- [ ] Appeal process implemented
- [ ] Logging/audit trail active

### Responsible Disclosure
- [ ] CSAM reporting procedure (NCMEC)
- [ ] Law enforcement request procedure
- [ ] Whistleblower policy drafted
- [ ] Legal counsel contact documented

### International Compliance
- [ ] Turkey Law 5651 assessment
- [ ] EU GDPR/DSA assessment
- [ ] US Section 230 strategy documented
- [ ] Jurisdiction-specific counsel retained

### Documentation
- [ ] Funding transparency published
- [ ] Editorial independence statement
- [ ] Conflict of interest policy
- [ ] Annual report template prepared
```

---

## Legal Counsel Budget

**Recommended budget for launch:**

| Service | Cost | Timing |
|---------|------|--------|
| **Incorporation** | $1,000-3,000 | Before launch |
| **ToS/Privacy Policy** | $2,000-5,000 | Before launch |
| **Insurance review** | $500-1,000 | Before launch |
| **Moderation policy** | $1,000-2,000 | Before launch |
| **Defamation review (sample network)** | $3,000-7,000 | Before launch |
| **General counsel (on retainer)** | $2,000-5,000/month | Ongoing |
| **GDPR/KVKK specialist** | $3,000-7,000/month | If serving those users |
| **Crisis counsel (standby)** | $5,000-10,000/month | If high-profile network |

**Total pre-launch:** $12,000-28,000
**Monthly ongoing:** $7,000-15,000+

---

---

## SYNTHESIS: PHASE 0 IMPLEMENTATION ROADMAP

### Month 1-2: Foundation

- [ ] Incorporate in primary jurisdiction
- [ ] Engage legal counsel (general media law)
- [ ] Draft ToS, Privacy Policy, Moderation Policy
- [ ] Source media liability insurance
- [ ] GDPR/KVKK compliance assessment

### Month 2-3: Infrastructure

- [ ] Implement verification layer (official/journalistic/community tiers)
- [ ] Build dispute system + appeals workflow
- [ ] Implement consent management (GDPR/KVKK)
- [ ] Set up CSAM reporting procedure
- [ ] Document responsible disclosure policy

### Month 3-4: Team & Training

- [ ] Hire/onboard moderation team
- [ ] Train on legal/ethical standards (SPJ + GIJN)
- [ ] Set up escalation procedures
- [ ] Create documentation & audit logs
- [ ] Establish review cadence

### Month 4-6: Launch Preparation

- [ ] Defamation legal review (sample network)
- [ ] Beta test with journalists (gather feedback)
- [ ] Publish transparency page (funding, policies)
- [ ] Set up legal hold procedures
- [ ] Final insurance procurement

### Post-Launch: Continuous

- [ ] Quarterly policy reviews
- [ ] Annual legal audit
- [ ] Incident response practice (mock scenarios)
- [ ] Community feedback integration
- [ ] Jurisdiction-specific updates

---

## THE GOLDEN RULES

**For defamation protection:**
1. Display, don't create (show sources; don't make claims)
2. Attribution, always (credit original source)
3. Label unverified (mark confidence level)
4. Allow disputes (community can challenge)
5. Include methodology (show your work)

**For data protection:**
1. Minimize collection (only what's necessary)
2. Maximize transparency (tell people what you do)
3. Respect rights (provide access/correction/deletion)
4. Secure by default (encrypt sensitive data)
5. Localize where required (Turkey = Turkish servers)

**For editorial integrity:**
1. Verify in layers (primary + secondary sources)
2. Show limitations (what you can't verify)
3. Correct errors fast (admit mistakes publicly)
4. Maintain independence (no funder pressure)
5. Engage criticism (listen to community)

---

**END OF PHASE 0 FOUNDATION SECURITY RESEARCH**

**Total Research:** 18,000 words
**Status:** READY FOR IMPLEMENTATION
**Next Step:** Executive review + legal counsel consultation
