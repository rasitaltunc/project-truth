# PROJECT TRUTH CONSTITUTIONAL FRAMEWORK
## Actionable Implementation Guide (Based on 10 Platform Precedents)

**Status:** Finalized Framework | Ready for Board Adoption
**Date:** March 14, 2026
**Prepared by:** Media Law Comparative Research
**For:** Raşit Altunç & Project Truth Founding Board

---

## SECTION 1: IMMEDIATE ACTIONS (Before Launch)

### Action 1.1: Legal Entity Formation

**Decision Required:** Multi-tier structure (Recommended)

```
STRUCTURE:
├── Primary: US 501(c)(3) Delaware LLC (Editorial Entity)
│   ├── Board: 3-5 directors including Raşit
│   ├── Holdings: Editorial decisions, journalist contracts, insurance
│   ├── Published as: "Project Truth, Inc."
│   └── Liability: Holds media liability insurance ($2-5M annual)
│
├── Secondary: EU Stichting (Platform/Technical Entity)
│   ├── Jurisdiction: Netherlands or Germany
│   ├── Holdings: Infrastructure, code, technical systems
│   ├── Defense: "Platform provider" legal position (if needed)
│   └── Servers: EU jurisdiction (GDPR compliant)
│
└── Tertiary: IPFS/Arweave Integration (Decentralized Archive)
    ├── No central control
    ├── Content replicated worldwide
    ├── No shutdown possible
    └── Mirrors maintained by volunteer community
```

**Timeline:** April 2026 (month before launch)
**Budget:** ~$2-3K legal fees (Delaware incorporation + EU stichting setup)
**Owner:** Raşit (with media law advisor)

**Action Items:**
- [ ] Consult media law firm (Reporters Committee for Freedom of the Press — offers pro-bono counsel)
- [ ] Draft bylaws for US entity (template from Reporters Committee)
- [ ] Register Delaware LLC (online, 1 day)
- [ ] Establish EU stichting (2-4 weeks, use incorporation service)
- [ ] Open bank account (US + EU)
- [ ] Document ownership structure (who owns what, voting rights)

---

### Action 1.2: Insurance & Legal Counsel

**Decision Required:** Insurance provider and retainer firm

| Component | Provider | Cost | Timeline |
|-----------|----------|------|----------|
| Media Liability Insurance | Media expense program (MSLF, DLJ, Chubb) | $3-5K/month | 2 weeks |
| Retainer Counsel | Reporters Committee + local firm | $5-10K/month | 2 weeks |
| Legal Review Pipeline | Counsel contract | Included | On-demand |

**Action Items:**
- [ ] Request media liability quotes from 3 providers (mention: investigative journalism, named individuals)
- [ ] Interview retainer counsel (minimum: experience defending investigative journalism)
- [ ] Draft legal review SLA (Service Level Agreement): "All person-specific allegations reviewed within 10 business days"
- [ ] Create legal review checklist (used for every article before publication)
- [ ] Document counsel authority: Can they recommend not publishing something? (Answer: Yes)

**Budget Allocation (Annual):**
```
Media Liability Insurance: $60,000/year
Retainer Counsel: $100,000/year (or $10K per-investigation)
Litigation Reserve: $200,000/year (contingency)
Total: $360,000/year (priority budget item)
```

---

### Action 1.3: Editorial Standards Documentation

**Decision Required:** Adopt, publish, and enforce editorial standards

**Minimum Document Length:** 5-10 pages, publicly available

**Required Sections:**

1. **Verification Standard** ✓ (Already drafted in constitutional framework)
   - Definition of evidence tiers (Tier 1-4)
   - Publication threshold (evidence_confidence_score ≥ 0.75)
   - When can we publish? (Tier 1 + Tier 2 OR multiple Tier 3)

2. **Presumption of Innocence Protocol** ✓ (Drafted)
   - Language requirements ("alleged," "appears to," "connected to")
   - Three-tier distinction (involvement/investigation/legal finding)
   - NLP filter implementation (catch violations)

3. **Right of Response Procedure** ✓ (Drafted)
   - 48-72 hour notice requirement
   - How to notify subjects (email + certified mail for prominent figures)
   - What if no response? (Default: "did not respond to request for comment")
   - Publishing response even if contradictory

4. **Correction & Retraction Policy** ✓ (Drafted)
   - Four-level hierarchy (retraction/correction/editor's note/transparency note)
   - Public log (visible on every article)
   - Notification of affected parties
   - Documentation of error source

5. **Source Protection Principles** ✓ (Drafted)
   - Encryption standard (Signal + AES-256)
   - Threat assessment (1-5 scale)
   - Dead Man Switch activation (journalist missing 30+ days)
   - No subpoena cooperation (will go to jail rather than reveal source)

6. **Funding Transparency** ✓ (Drafted)
   - All donors >$10K publicly named
   - Annual report published
   - No corporate sponsors
   - Editorial independence guaranteed in bylaws

7. **Conflict of Interest Policy**
   - Journalists cannot investigate organizations they have financial ties to
   - Board members recused from investigations affecting their companies
   - Spouse/family member restrictions
   - Example: "If journalist's brother works at Bank X, cannot investigate Bank X"

8. **Correction Mechanism**
   - Public form: readers can flag errors
   - Response required within 5 business days
   - Minor corrections auto-generated (NLP-detected errors)
   - Major retractions require legal counsel sign-off

**Action Items:**
- [ ] Draft editorial standards (5-10 pages)
- [ ] Share with media counsel for legal review
- [ ] Publish on website (transparency/about page)
- [ ] Train editorial team on standards (monthly refresher)
- [ ] Create checklist (used before every publication)
- [ ] Annual review (update standards based on lessons learned)

---

### Action 1.4: Data Security Architecture Review

**Decision Required:** Approve data security model (already mostly implemented)

**Current State (Good):**
- ✓ Documents encrypted at rest (AES-256, Supabase)
- ✓ Encrypted in transit (TLS 1.3, HTTPS only)
- ✓ Source identification redacted (documents processed)
- ✓ Audit logging (who accessed what, when)

**Gaps to Address:**
- [ ] Metadata stripping: Automatic + mandatory (currently user-optional)
  - **Action:** Implement automatic EXIF removal + document normalization pre-OCR
  - **Timeline:** 2 weeks engineering
  - **Owner:** Infrastructure team

- [ ] Source communication logging: Currently logs exist
  - **Action:** Verify deletion policy (30-day auto-delete after investigation published)
  - **Timeline:** 1 week engineering
  - **Owner:** Infrastructure team

- [ ] Access control: Currently RLS policies exist
  - **Action:** Implement strict role-based access (investigation_admin > contributor > viewer)
  - **Timeline:** Already implemented (badge_tier system)
  - **Status:** ✓ Done

- [ ] Threat assessment: Not yet implemented
  - **Action:** Add node.threat_level field (1-5 scale)
  - **Workflow:** Journalist assigns before publication
  - **Timeline:** 1 week database + UI
  - **Owner:** Product team

- [ ] Encrypted backup: Not yet implemented
  - **Action:** Daily encrypted backup to geographic redundancy (GCS + Arweave)
  - **Timeline:** 2 weeks infrastructure
  - **Owner:** Infrastructure team

**Action Items:**
- [ ] Run data security audit (hire external firm, ~$15K)
- [ ] Implement gap fixes (above)
- [ ] Document data retention policy (written policy, not code)
- [ ] Create journalist onboarding (explains security protocols)
- [ ] Annual security review (penetration test, ~$20K)

**Budget:** $50K annually (audit + testing + fixes)

---

### Action 1.5: Threat Modeling & Resilience

**Decision Required:** How to survive pressure (legal + political)?

**Threat Scenarios:**

| Scenario | Likelihood | Mitigation |
|----------|-----------|-----------|
| Government subpoena for source | High | Lawyer refuses, willing to jail; source encryption absolute |
| DDoS attack on main site | High | Cloudflare (Enterprise) + Project Galileo (apply, free) |
| DMCA takedown notice | Medium | Comply within 24hrs; counter-notice if meritorious |
| Defamation lawsuit | Medium | Insurance covers legal; truth defense = documents themselves |
| Journalist arrested | Low | Dead Man Switch activated; international media notified; pre-arranged legal representation |
| Server seizure (EU) | Low | IPFS backup survives; Tor mirror activated; content in 10+ jurisdictions |
| Corporate pressure | Medium | Funding structure prevents; advisory board governance |

**Action Items:**
- [ ] Document threat model (this table, internally circulated)
- [ ] Create crisis communication plan (who speaks to media if disaster?)
- [ ] Establish advisory board (3-5 people: journalists, lawyers, technologists)
- [ ] Test Dead Man Switch (simulation annually)
- [ ] Test backup recovery (can we restore from Arweave in 24hrs?)
- [ ] Identify safe jurisdictions for server relocation (if main location under threat)

---

## SECTION 2: LAUNCH STANDARDS (Before Publishing First Investigation)

### Requirement 2.1: Pre-Publication Legal Review Checklist

**Every investigation must pass this checklist before publication:**

```
PROJECT TRUTH PRE-PUBLICATION LEGAL CHECKLIST
==============================================

[ ] VERIFICATION STANDARD
    [ ] Minimum evidence_confidence_score: 0.75
    [ ] Each person-specific claim has: (Tier 1 + Tier 2) OR (Tier 3 + Tier 3 + Tier 3)
    [ ] Forensic chain maintained: document origin → extraction → claim link
    [ ] Expert verification (if scientific claim): external expert opinion obtained

[ ] PRESUMPTION OF INNOCENCE
    [ ] No use of: "is guilty," "perpetrator," "criminal"
    [ ] Language uses: "alleged," "appears to," "connected to," "evidence indicates"
    [ ] Clear distinction between: involvement (fact) vs. guilt (legal conclusion)
    [ ] No character attacks; only specific acts documented

[ ] RIGHT OF RESPONSE
    [ ] All named individuals identified (list attached)
    [ ] Response letters drafted and ready to send
    [ ] 48-72 hour response window scheduled
    [ ] Delivery method: Email + certified mail (for prominent figures)
    [ ] Response deadline documented (publication will happen on specific date/time regardless)
    [ ] Responses received: [list] | No response: [list]
    [ ] All received responses will be published in full

[ ] SOURCE PROTECTION
    [ ] All sources encrypted (Signal communication + redacted names)
    [ ] Threat assessment completed for each source (1-5 scale)
    [ ] Sources with threat level 4+: identity will NOT be published
    [ ] Source deletion schedule: 30 days after publication
    [ ] Dead Man Switch activated (if high-risk source)

[ ] POTENTIAL DEFAMATION
    [ ] Media counsel has reviewed (signature: __________)
    [ ] No reckless statements; all claims supported by evidence
    [ ] Truth defense solid (documents themselves prove claims)
    [ ] Insurance coverage confirmed for this investigation ($2-5M)
    [ ] Counsel approval: __________ (date)

[ ] FACTUAL ACCURACY
    [ ] All dates fact-checked (cross-reference: official records vs. documents)
    [ ] All names spelling verified (3 sources)
    [ ] All numbers: financial figures verified with original documents
    [ ] All quotes: exact match to source (provide source document with quote highlighted)
    [ ] Typo/grammar: professional editor review
    [ ] Links: all URLs tested (none broken)

[ ] TRANSPARENCY
    [ ] Funding sources of this investigation disclosed (if applicable)
    [ ] Methodology section explains: how we verified, what we found, what we don't know
    [ ] Conflicts of interest: none identified (or disclosed)
    [ ] Data sources listed (court records, government databases, leaked documents)

[ ] CORRECTIONS MECHANISM
    [ ] Correction form linked on article (public)
    [ ] Correction log attached to article (if any previous errors)
    [ ] Error notification plan (who gets emailed if correction needed?)

[ ] FINAL APPROVAL
    [ ] Editor-in-Chief approval: __________ (date)
    [ ] Media counsel approval: __________ (date)
    [ ] Investigation lead journalist approval: __________ (date)
    [ ] Publication date/time locked: __________
    [ ] Right of response deadline: __________ (before publication)

APPROVED FOR PUBLICATION: __________ (date/time)
PUBLISHED: __________ (date/time)
```

**Process:**
- Editor fills checklist
- Counsel reviews checklist + investigation
- After approval, publication cannot be delayed more than 48 hours
- Checklist becomes part of investigation record (auditable)

---

### Requirement 2.2: Correction Mechanism Implementation

**Public-Facing:**
- Correction form on every article (linked at top)
- Form asks: "What's wrong?" + "Your email" (for follow-up)
- Auto-reply: "We received your correction suggestion. Response within 5 business days."

**Internal Process:**
1. Correction flagged (auto-email to editorial team)
2. Curator investigates (is it valid?)
3. If minor (spelling, broken link): Fixed immediately, logged
4. If factual: Editor determines if correction or retraction
5. Legal counsel reviews (if person-specific claim affected)
6. Public response published (either correction or explanation why not correcting)
7. Submitter notified (email with response)

**Public Log:**
- Corrections/retractions visible on article
- Separate "Corrections Log" page (aggregate of all corrections)
- Quarterly report (what we got wrong, what we learned)

**Implementation:**
- Typeform + Zapier integration (fast, no code)
- Supabase table: correction_submissions (auto-log every submission)
- Auto-email workflow (Resend library, already implemented)

---

### Requirement 2.3: Right of Response Implementation

**Workflow (Automated):**

```
Investigation Complete
    ↓
Extract all named individuals (NER + manual review)
    ↓
Generate response letters (auto-template, personalized)
    ↓
Send email + certified mail (prominent figures only)
    ↓
Track delivery + opening (Mailgun + Postmark)
    ↓
Wait 48-72 hours (configurable)
    ↓
If response received → publish in full alongside article
    ↓
If no response → note: "[Name] did not respond to request for comment before publication"
    ↓
If response after publication → add Editor's note + publish response
    ↓
PUBLISH (regardless of responses)
```

**Implementation:**
- Platform feature: investigation.named_subjects (list with status tracking)
- Table: response_tracking (when sent, when opened, response received)
- Email template (personalized, professional, 48-72 hr deadline clear)
- Logistics: Postmark for certified mail tracking + signature

---

## SECTION 3: ONGOING OPERATIONS

### Requirement 3.1: Editorial Governance

**Monthly:**
- [ ] Editorial meeting (review investigations in progress)
- [ ] Standards review (any violations?)
- [ ] Correction analysis (what kinds of errors are we making?)

**Quarterly:**
- [ ] Financial reporting (funding transparency)
- [ ] Correction log review (lessons learned)
- [ ] Security audit (any breaches?)
- [ ] Feedback analysis (reader corrections, suggestions)

**Annually:**
- [ ] Editorial standards update (based on lessons learned)
- [ ] Independent audit (external firm reviews all published investigations)
- [ ] Security penetration test
- [ ] Insurance renewal
- [ ] Board meeting (governance, strategic direction)

---

### Requirement 3.2: Journalist Onboarding

**Every new journalist must complete:**

1. **Security Training (4 hours)**
   - Signal setup + encryption
   - Document handling protocols
   - Threat assessment
   - Dead Man Switch explanation
   - Tor browser basics (if operating in hostile environment)

2. **Editorial Standards Training (2 hours)**
   - Project Truth's presumption of innocence protocol
   - Evidence tiers (what counts as Tier 1?)
   - Correction policy (how do we fix errors?)
   - Right of response procedure
   - Defamation concerns (what can we say, what can't we?)

3. **Data Security Training (2 hours)**
   - How we handle documents
   - Where we store them
   - Access controls
   - What happens to documents after investigation
   - Metadata handling (automatic stripping)

4. **Certification:**
   - Sign agreement: "I understand and will follow Project Truth editorial standards"
   - Annual refresher

---

### Requirement 3.3: Advisory Board Structure

**Purpose:** External accountability + governance

**Composition (5 members):**
1. Raşit Altunç (Executive Director)
2. Investigative journalist (external, 3+ major investigations)
3. Media lawyer (experienced in First Amendment + international)
4. Technologist (security/privacy expertise)
5. Ethicist or academic (keeps team grounded in principles)

**Authority:**
- Can recommend NOT publishing something (final say with Raşit)
- Review editorial standards annually
- Approve legal structure changes
- Resolve conflicts of interest
- Public-facing role (name + bio on website)

**Meetings:** Quarterly

**Compensation:** Honorarium ($5K/year) or purely volunteer (your choice)

---

## SECTION 4: FINANCIAL MODEL

### Funding Strategy (Recommended)

**Revenue Model: Donation-Only**
- No advertising (compromises editorial independence)
- No corporate sponsorship (prevents conflicts)
- No paywalls (public records shouldn't be behind paywall)
- Donations encouraged (Stripe + encrypted donor options)
- Grant funding from journalism nonprofits (MacArthur, Knight, Ford, Open Society)

**Budget (Annual, Year 1):**

```
PERSONNEL
  - Executive Director (Raşit): $0 (volunteer) or $50K (if full-time)
  - 2 Investigative Journalists: $120K ($60K each)
  - 1 Data Scientist/OCR: $80K
  - 1 Infrastructure Engineer: $80K
  - Part-time legal counsel: $100K
  Subtotal: $380K (if Raşit volunteer); $430K (if Raşit paid)

OPERATIONS
  - Server/hosting (GCP + Cloudflare + backups): $50K
  - Insurance (media liability): $60K
  - Software licenses: $20K
  - Equipment/office: $30K
  Subtotal: $160K

LEGAL & COMPLIANCE
  - Retainer counsel: $100K (or event-based $10K per investigation)
  - Litigation reserve: $200K (contingency)
  - Insurance deductible reserve: $50K
  Subtotal: $350K

RESEARCH & DEVELOPMENT
  - Document AI processing: $10K (initial; scales with investigations)
  - Satellite imagery: $5K (optional, for geographic investigations)
  - Data purchases (business registries, etc.): $15K
  Subtotal: $30K

TOTAL YEAR 1: $920K - $970K
```

**Funding Sources (Year 1):**
- MacArthur Foundation grant: $250K
- Knight Foundation grant: $200K
- Ford Foundation grant: $150K
- Donations: $150K
- Other grants (Sandler, Open Society): $170K
- **Total:** ~$920K ✓

**Sustainability (Year 2+):**
- Establish annual fundraising ($500K+ target)
- Grant pipeline (apply annually)
- Donor base building (monthly donors)
- No requirement for profitability (nonprofit structure)
- Break-even or small surplus acceptable

---

## SECTION 5: LAUNCH CHECKLIST

**Before publishing first investigation:**

- [ ] **Legal** (Week 1-2)
  - [ ] Delaware LLC formed
  - [ ] EU stichting formed
  - [ ] Media liability insurance approved
  - [ ] Retainer counsel engaged
  - [ ] Editorial standards document published

- [ ] **Technical** (Week 2-3)
  - [ ] Metadata stripping implemented
  - [ ] Threat level field added
  - [ ] Correction form deployed
  - [ ] Right of response workflow tested
  - [ ] Encrypted backup configured

- [ ] **Operational** (Week 3-4)
  - [ ] Journalists onboarded (3+ people)
  - [ ] Editorial standards training completed
  - [ ] Security training completed
  - [ ] Legal review checklist created
  - [ ] Pre-publication workflow tested (dry run)

- [ ] **Public** (Week 4)
  - [ ] Website redesign (transparency pages)
  - [ ] Editorial standards published
  - [ ] Funding sources published
  - [ ] Team bios + photos published
  - [ ] Correction form visible

- [ ] **Investigation** (Weeks 5-8)
  - [ ] Investigation 1 selected
  - [ ] Research completed
  - [ ] Legal review passed
  - [ ] Right of response completed
  - [ ] Publication scheduled
  - [ ] **LAUNCH**

**Total Timeline:** 6-8 weeks before first publication

---

## SECTION 6: POST-LAUNCH OPERATIONS

### Months 1-6 After Launch

**Weekly:**
- Editorial meeting (investigations in progress)
- Correction reviews
- Feedback triage

**Monthly:**
- Legal review of all published items
- Security log review
- Financial statement

**Quarterly:**
- Full audit (of all published items)
- Editorial standards refresh
- Journalist training update

### Months 6-12 After Launch

**Strategic Review:**
- What investigations performed well? (readership, impact)
- What editorial standards needed adjustment?
- What security issues emerged?
- What legal threats?
- How sustainable is funding?

**Year 2 Planning:**
- Set publication targets (X investigations per year)
- Expand team (hire more journalists, editors)
- International expansion (journalists in multiple countries)
- Expand networks (not just one topic)

---

## SECTION 7: SUCCESS METRICS

**By end of Year 1, Project Truth should have:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Investigations published | 3-5 | Count completed investigations |
| Journalist safety | 100% | No journalist arrested, threatened, or harmed |
| Corrections required | <5% of claims | Audit ratio of corrections to original claims |
| Source protection | Perfect | No source identity revealed |
| Insurance claims | $0 | Defenses successful (truth, right of response) |
| Legal challenges | <3 | Lawsuits filed against investigations |
| Journalist recruitment | 5-10 interested | Applications received for future openings |
| Funding secured | $1M+ | Grant approvals + donations |
| Public awareness | 10K+ readers per article | Traffic, social media engagement |
| International reach | 5+ countries | Readers accessing from multiple regions |

---

## CONCLUSION: THE CONSTITUTIONAL MOMENT

Project Truth's first 6 months will establish its reputation for:
1. **Verification rigor** (people trust investigations because process is transparent)
2. **Ethical journalism** (sources are protected, corrections are public)
3. **Resilience** (survives legal pressure + DDoS + government threats)

By adopting this constitutional framework — grounded in lessons from 10 precedent platforms — Project Truth enters the investigative journalism field not as an experiment, but as a **responsible, well-governed institution**.

The difference between a platform that lasts 2 years and one that lasts 20+ years is **constitutional clarity** established on Day 1.

---

**Document Status:** Complete & Ready for Implementation
**Approval Required:** Raşit Altunç
**Next Step:** Board presentation + adoption vote (target: April 2026)

