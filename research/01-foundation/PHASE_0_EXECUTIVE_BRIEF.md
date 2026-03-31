# PHASE 0 EXECUTIVE BRIEF
## Project Truth: Legal & Safety Foundation Before Launch

**Prepared:** March 13, 2026
**Status:** COMPLETE & READY FOR ACTION
**Classification:** FOUNDATION SECURITY — Strategic Decisions Required

---

## EXECUTIVE SUMMARY

Project Truth is ready to launch the **Epstein network** (Phase 1) but MUST resolve 8 critical legal/ethical areas first. This brief summarizes decision points, costs, and timeline.

**Key Finding:** The platform's verification system (official/journalistic/community tiers) + transparent methodology + community dispute mechanism provides **strong legal defensibility** against defamation claims—but only if implemented correctly.

---

## THE 8 CRITICAL AREAS & STATUS

### 1. CLAIM VS EVIDENCE — VISUAL/UI DISTINCTION ✅ READY
**What it is:** Preventing legal liability by showing evidence (not claims)

**Current state:** Platform already uses color-coding + source linking in archive modal

**What's needed:**
- Extend system to main 3D visualization
- Add confidence score to each link
- Implement dispute/counter-evidence system
- Cost: 2-3 weeks development + legal review

**Risk if not done:** Platform could be seen as "making claims" → defamation liability

**Recommendation:** IMPLEMENT BEFORE LAUNCH (not optional)

---

### 2. DEFAMATION / LIBEL PROTECTION ✅ STRATEGY READY
**What it is:** Legal framework protecting against defamation lawsuits

**Current state:** None documented; relies on accident

**What's needed:**
- Incorporate in Delaware (Section 230 protection)
- Hire media law counsel ($3,000-5,000)
- Document "platform, not publisher" strategy
- Implement safe harbor procedures
- Cost: $3,000-5,000 initial + $2,000-5,000/month ongoing

**Risk if not done:** Sued for defamation; Section 230 doesn't apply retroactively; liability exposure unlimited

**Recommendation:** HIRE LAWYER IMMEDIATELY (can't launch without)

---

### 3. MODERATION POLICY ✅ FRAMEWORK READY
**What it is:** Who decides what gets removed and how appeals work

**Current state:** None documented

**What's needed:**
- Three-tier system: Automatic filtering → Community flags → Human review
- Train moderation team (1-2 people initially)
- Document appeals process
- Set SLAs (24-48 hours)
- Cost: $2,000-3,000 setup + $8,000-15,000/month for staff

**Risk if not done:** Arbitrary removals → lose user trust + legal exposure

**Recommendation:** DOCUMENT & STAFF BEFORE LAUNCH

---

### 4. DATA PROTECTION (GDPR, KVKK) ⚠️ CRITICAL
**What it is:** Legal compliance for handling personal data

**Current state:** Supabase using; no formal assessment

**What's needed:**
- GDPR: Legitimate interest assessment + Data Subject Rights API
- KVKK: If serving Turkish users, separate consent needed + data localization
- Privacy Policy tailored to both frameworks
- Data Processing Agreement (with Supabase)
- Cost: $3,000-7,000 legal review + engineering to implement API

**Risk if not done:**
- GDPR: Fines up to 6% of revenue
- KVKK: Fines + platform access blocking in Turkey

**Recommendation:** CRITICAL BEFORE LAUNCH (especially if Turkey target)

---

### 5. SAFE HARBOR & RESPONSIBLE DISCLOSURE ✅ READY
**What it is:** When platform discovers crime, what's the legal obligation?

**Current state:** None documented

**What's needed:**
- CSAM reporting procedure (NCMEC) — MANDATORY
- Law enforcement request procedure
- Whistleblower protection policy
- Responsible disclosure framework (Tier 1-5 crimes)
- Cost: $1,000 legal review

**Risk if not done:**
- Failure to report CSAM: Criminal liability
- Inadequate procedures: Legal exposure if someone harms based on platform misuse

**Recommendation:** DOCUMENT BEFORE LAUNCH

---

### 6. TERMS OF SERVICE ✅ TEMPLATE READY
**What it is:** Legal agreement users accept before using platform

**Current state:** None

**What's needed:**
- ToS draft (provided in Phase 0 research)
- Privacy Policy draft (jurisdiction-specific)
- Moderation Policy (published)
- Editorial Policy (published)
- Legal review ($2,000-3,000)
- Cost: $2,000-3,000 legal review

**Risk if not done:** No legal agreement = platform unprotected; users not bound

**Recommendation:** IMPLEMENT BEFORE LAUNCH

---

### 7. EDITORIAL STANDARDS ✅ FRAMEWORK READY
**What it is:** Quality control for verification (verification layers, corrections, retractions)

**Current state:** Ad-hoc; no documented process

**What's needed:**
- SPJ/GIJN standards training for team
- Verification checklist (Tier 1/2/3 evidence)
- Correction/retraction procedure
- Red flags checklist
- Quarterly audit process
- Cost: $500-1,000 training + staff time

**Risk if not done:** Low-quality verification damages credibility + legal exposure

**Recommendation:** IMPLEMENT BEFORE LAUNCH

---

### 8. INSURANCE & LEGAL ENTITY ⚠️ MUST FINALIZE
**What it is:** Corporate structure + liability insurance

**Current state:** None

**What's needed:**
- **Corporation:** Delaware LLC (fastest, clearest)
  - Cost: $500-2,000 one-time
- **Insurance:** Media liability ($2M/$5M) + cyber liability
  - Cost: $15,000-25,000/year
- **Counsel:** General media law on retainer
  - Cost: $2,000-5,000/month
- Timeline: 30-45 days to complete

**Risk if not done:**
- No legal entity = personal liability (lawsuits against founders)
- No insurance = bankruptcy on single claim
- No counsel = can't respond to legal threats

**Recommendation:** COMPLETE BEFORE PUBLIC LAUNCH (can do beta with minimal; must finish before press)

---

---

## DECISION MATRIX

### Critical Path to Launch

| Area | Effort | Cost | Timeline | Blocker? |
|------|--------|------|----------|----------|
| 1. Claim vs Evidence UI | Medium | $0 | 2-3 weeks | YES |
| 2. Defamation Legal | Medium | $3-5K + $2-5K/mo | Start now | YES |
| 3. Moderation Policy | Medium | $2-3K + $8-15K/mo | 2 weeks | YES |
| 4. Data Protection (GDPR/KVKK) | Medium | $3-7K + engineering | 3-4 weeks | YES* |
| 5. Safe Harbor Procedures | Low | $1K | 1 week | NO** |
| 6. Terms of Service | Low | $2-3K | 1 week | YES |
| 7. Editorial Standards | Low | $500-1K | 2 weeks | NO** |
| 8. Insurance & Legal | High | $15-25K/yr + $2-5K/mo | 30-45 days | YES |

*YES if serving EU/Turkey users; NO if US-only initially
**NO = nice to have, not blocking; but recommended

---

## RECOMMENDED LAUNCH APPROACH

### Phase 0A: Foundation (Now → 2 weeks)
**Must complete before coding/design decisions:**
1. Incorporate Delaware LLC
2. Hire media law counsel
3. Assess GDPR/KVKK requirements
4. Start insurance quotes

**Cost:** $3,000-5,000
**Effort:** Raşit's time (~8 hours/week)

### Phase 0B: Design & Compliance (Week 2-6)
**Code implementation + legal review runs parallel:**
1. Implement verification layer UI (official/journalistic/community)
2. Build dispute system + appeals
3. Draft ToS/Privacy/Moderation/Editorial policies
4. Implement GDPR rights API
5. Set up moderation team training
6. Complete insurance procurement

**Cost:** $8,000-15,000 (legal) + $15,000-25,000 (insurance)
**Effort:** Full team + external counsel

### Phase 0C: Beta Testing (Week 6-10)
**Internal testing + journalist feedback:**
1. Beta test with 5-10 journalists (Bellingcat, ICIJ contacts?)
2. Legal review of sample network (Epstein)
3. Scenario testing (defamation, GDPR request, CSAM report)
4. Moderation team mock exercises
5. Publish transparency page + legal notices

**Cost:** $3,000-5,000 (additional legal)
**Effort:** Full team + external counsel

### Phase 0D: Public Launch (Week 10-12)
**Press release + public availability:**
1. Public launch announcement
2. Publish all legal docs + transparency page
3. Moderation team standing by (24/7 on-call)
4. Legal counsel on standby
5. Monitoring + incident response

**Cost:** Covered by above
**Effort:** Full team + counsel available

---

---

## COST SUMMARY

### Pre-Launch Costs (One-time)

| Item | Cost |
|------|------|
| Delaware incorporation | $500-2,000 |
| Legal counsel (ToS, Privacy, Moderation policies) | $5,000-8,000 |
| Defamation legal review (sample network) | $3,000-5,000 |
| GDPR/KVKK assessment + engineering | $3,000-7,000 |
| Media liability insurance | $15,000-25,000 |
| Cyber liability insurance | $5,000-10,000 |
| Moderation team hiring | $2,000-3,000 |
| **TOTAL** | **$38,500-60,000** |

### Monthly Ongoing Costs

| Item | Cost |
|------|------|
| General counsel (retainer) | $2,000-5,000 |
| Moderation team (1-2 people) | $8,000-15,000 |
| Insurance (media + cyber) | $1,500-2,500 |
| GDPR/KVKK specialist (if serving those users) | $2,000-5,000 |
| **TOTAL** | **$13,500-27,500/month** |

**Note:** Scales with user base. At launch, could be $10-15K/month for lean operation.

---

---

## RISK SUMMARY

### High Risk (Can't Launch Without)

**1. No Legal Entity**
- Defamation lawsuits target founders personally
- No Section 230 protection
- Unlimited liability exposure
- Fix: Incorporate Delaware LLC

**2. Verification System Ambiguous**
- Platform's claims might be seen as publisher claims
- Defamation liability
- Fix: Clear official/journalistic/community tiers + source links

**3. No Moderation / Appeals**
- Users remove false evidence → credibility damaged
- Users can't dispute → unfair treatment
- No way to handle GDPR requests
- Fix: Three-tier moderation system

### Medium Risk (Should Have Before Launch)

**4. Data Protection Noncompliance**
- GDPR fines up to 6% of revenue
- KVKK fines + Turkey blocking
- Fix: Privacy Policy + GDPR API + data localization if needed

**5. No ToS / Insurance**
- No legal agreement with users
- No liability insurance for lawsuits
- Fix: Draft ToS ($2K legal) + insurance ($15-25K/year)

**6. Undocumented Procedures**
- How to handle CSAM report? (mandatory legal requirement)
- How to handle police request? (legal requirement)
- How to handle user rights requests? (GDPR/KVKK mandatory)
- Fix: Document procedures + staff training

### Lower Risk (Nice to Have)

**7. No Editorial Standards**
- Quality control lacking
- Damage to reputation (slow)
- Fix: SPJ/GIJN training

**8. Funding Transparency Missing**
- Trust issue (not illegal; ethical)
- Fix: Publish funding sources + conflicts of interest

---

---

## COMPETITIVE ADVANTAGE

Project Truth's combination of:

✅ **Clear verification tiers** (official/journalistic/community/disputed)
✅ **Source transparency** (link to every claim)
✅ **Community dispute system** (anyone can challenge)
✅ **Visible methodology** (show your work)

...creates a **unique defensibility** that neither Wikipedia, Bellingcat, Aleph, nor Maltego offers.

**Legal advantage:** Every claim is *sourced, categorized, disputable, and transparent*. Courts will see this as responsible journalism, not reckless platform.

**Adoption advantage:** Journalists see trust signals (methodology + peer review). Academics appreciate transparency (sources + data).

---

---

## DECISION CHECKLIST FOR LEADERSHIP

### Must decide NOW:

- [ ] **Jurisdiction:** US-only initially? Or EU/Turkey from start?
  - Implication: GDPR/KVKK compliance needed if yes
  - Recommendation: US launch → EU later

- [ ] **Business model:** Freemium? API licensing? Membership?
  - Implication: ToS pricing terms + payment processing
  - Recommendation: Free for launch; monetize later

- [ ] **Funding transparency:** Public or private funding?
  - Implication: Publish funders or keep private
  - Recommendation: Public (builds trust)

- [ ] **Conflict of interest:** Any founders with financial interest in named companies?
  - Implication: Must disclose + recuse from moderation
  - Recommendation: Audit now; document

- [ ] **Staffing:** Full-time moderation team or volunteer?
  - Implication: Cost + liability ($8-15K/mo vs. volunteer risk)
  - Recommendation: At least 1 FT moderator + founder oversight

### Must complete BEFORE launch:

- [ ] Incorporate Delaware LLC
- [ ] Hire media law counsel
- [ ] Assess GDPR/KVKK requirements
- [ ] Implement verification tiers UI
- [ ] Build dispute system
- [ ] Draft ToS + Privacy Policy
- [ ] Procure media liability insurance
- [ ] Train moderation team
- [ ] Document procedures (moderation, CSAM, police requests)

### Timeline:

**Now (March 13):** Make jurisdiction + funding decisions
**March 13-27:** Incorporate + hire counsel + complete legal documents
**March 27 - April 3:** UI implementation + insurance procurement
**April 3-10:** Beta testing + scenario drills
**April 10-15:** Final adjustments + press prep
**April 15+:** Public launch

---

---

## FAQ FOR LEADERSHIP

**Q: Can we launch without all this?**
A: Legally? Yes. Safely? No. You'll face defamation lawsuits, GDPR fines, and operational crises. Recommended you complete at least items 1-3 and 6-8 before public launch.

**Q: How much does this add to budget?**
A: $38-60K pre-launch + $13-28K/month ongoing. At Platform's revenue level, this is ~20% of operating budget (normal for media platforms).

**Q: Can we cut corners?**
A: No. The specific weak points:
- Can't launch without legal entity (personal liability)
- Can't skip moderation (trust + liability)
- Can't ignore GDPR/KVKK (fines are real)
- Can't skip insurance (one lawsuit bankrupts you)

**Q: Why not wait until we're bigger to do this?**
A: Starting small is good. But you need the *framework* from day one. Much harder to retrofit later.

**Q: What if we only launch in US?**
A: Still need #1-3 and #6-8. #4 (GDPR/KVKK) can wait if truly US-only, but this limits growth.

---

---

## SUCCESS CRITERIA

You'll know Phase 0 is complete when:

✅ Incorporated as Delaware LLC
✅ Media law counsel hired (on retainer)
✅ Insurance procured (media + cyber)
✅ Verification tiers UI implemented
✅ Dispute/appeal system live
✅ ToS + Privacy Policy published
✅ Moderation team trained + on-call
✅ CSAM/law enforcement procedures documented
✅ Transparency page published (funding + policies + conflict of interest)
✅ Sample network (Epstein) legally reviewed
✅ Beta test completed with journalists

---

**PHASE 0 COMPLETE.**

**Next step: Review with legal counsel. Then execute.**

