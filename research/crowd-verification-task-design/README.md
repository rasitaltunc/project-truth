# CROWD-SOURCED LEGAL DOCUMENT VERIFICATION TASK DESIGN
## Complete Research Package

**Delivered:** March 25, 2026
**Research Scope:** 10 world-leading platforms + 50+ academic sources
**Deliverable Type:** Specific, tested task design patterns ready for implementation
**Total Size:** 2,579 lines, 112KB, 5 markdown documents

---

## DOCUMENTS IN THIS PACKAGE

### 1. **EXECUTIVE_SUMMARY.md** (Start here)
**Length:** 13KB (349 lines)
**For:** Quick orientation (15 minute read)
**Contains:**
- The core insight (micro-narratives > micro-tasks)
- 7 core principles (in priority order)
- 4 task templates overview
- Why this works (evidence from 10 platforms)
- Anti-gaming mechanics
- Implementation phases at a glance
- Critical success factors checklist
- Failure modes to avoid

**Start with this.** Defines the whole approach.

---

### 2. **CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md** (Deep dive)
**Length:** 28KB (691 lines)
**For:** Understanding the research (45 minute read)
**Contains:**
- **Platform-by-platform breakdown** (10 platforms, 2-3KB each):
  - Zooniverse (Galaxy Zoo + Snapshot Serengeti)
  - Wikipedia Articles for Deletion
  - ICIJ Datashare
  - Bellingcat Open Source Investigations
  - Fact-Checking Organizations (Snopes, Full Fact, Teyit)
  - DocumentCloud
  - Ushahidi / CrisisMappers
  - reCAPTCHA / hCAPTCHA
  - Amazon Mechanical Turk
  - FoldIt / EyeWire

- For each platform:
  - Exact task format (what users see)
  - Duration per task
  - Engagement mechanics
  - Quality control method
  - Key insights for your use case

- **Synthesis section:** Task design patterns extracted
- **Implementation roadmap:** Overview of phases
- **Comparison matrix:** All platforms vs. each other
- **References:** All sources cited

**Read this to understand WHERE these insights come from.**

---

### 3. **TASK_FORMAT_TEMPLATES.md** (Copy-paste code)
**Length:** 26KB (772 lines)
**For:** Engineering implementation (60 minute read)
**Contains:**
- **5 ready-to-use task templates:**
  1. Existence Verification (Tier 1, easiest)
  2. Detail Matching (Tier 1-2, conditional)
  3. Relationship Verification (Tier 2+, harder)
  4. Expert Review (Tier 3, dispute resolution)
  5. Quick Feedback Loop (post-task)

- For each template:
  - UI mockup (HTML rendering)
  - React component skeleton code
  - Quality control specifics
  - Expected performance metrics
  - When/how to use it

- **Anti-gaming measures** (implementation checklist):
  - Honeypot strategy (code)
  - Rate limiting (code)
  - Streak system (code)
  - Accuracy monitoring (code)

- **Database schema** (SQL) — ready to adapt
- **Task generation algorithm** (Python pseudocode)
- **Success metrics** (table)

**Use this to BUILD the system.**

---

### 4. **IMPLEMENTATION_ROADMAP.md** (Sprint-by-sprint plan)
**Length:** 14KB (455 lines)
**For:** Product/project planning (45 minute read)
**Contains:**
- **5 implementation phases:**
  - **Phase 1 (MVP):** Existence + Detail Match (Sprint 20-21, 2-3 weeks)
  - **Phase 2:** Relationships (Sprint 22-23, 2 weeks)
  - **Phase 3:** Expert Review (Sprint 24, 1-2 weeks)
  - **Phase 4:** Gamification (Sprint 25-26, 2 weeks)
  - **Phase 5+:** Advanced features (optional, only if MVP succeeds)

- For each phase:
  - Clear deliverables
  - Database changes required
  - Success criteria (go/no-go decision points)
  - Timeline

- **Risk mitigation** (5 scenarios + solutions):
  - Low engagement
  - Low accuracy
  - Gaming/manipulation
  - Task bottleneck
  - Expert bottleneck

- **Resource allocation:**
  - Developer time estimates
  - Product time estimates
  - Ongoing maintenance

- **Launch checklist:**
  - Code
  - Database
  - Product
  - Monitoring

- **Integration guide:** Where this lives in codebase

**Use this to PLAN the rollout.**

---

### 5. **SOURCES_AND_CITATIONS.md** (Academic backing)
**Length:** 23KB (312 lines)
**For:** Verification and deeper reading (60 minute read for full sources)
**Contains:**
- **All 50+ sources organized by:**
  - Zooniverse (official docs + research papers)
  - Wikipedia (policies + academic analysis)
  - ICIJ Datashare (docs + blog posts)
  - Bellingcat (official + community info)
  - Fact-checking orgs (Snopes, Full Fact, Teyit)
  - DocumentCloud
  - FoldIt / EyeWire (gamification research)
  - Ushahidi
  - reCAPTCHA / hCAPTCHA
  - Amazon MTurk
  - Academic research (micro-tasks, gamification, crowdsourcing)

- **For each source:** Full citation with clickable links

- **Key findings summary** (by principle):
  - Context reduces quit rate
  - Consensus > voting
  - Reputation > money
  - Task duration matters
  - Honeypots catch gaming
  - Gamification sustains, doesn't attract

**Use this to verify sources and go deeper on specific topics.**

---

## HOW TO USE THIS PACKAGE

### If you have 15 minutes:
1. Read EXECUTIVE_SUMMARY.md
2. Look at Figure 1 (task template visuals)
3. Skim the "7 Core Principles" section

### If you have 1 hour:
1. Read EXECUTIVE_SUMMARY.md (15 min)
2. Skim CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md (30 min — at least read 3 platforms)
3. Glance at TASK_FORMAT_TEMPLATES.md (15 min — look at Template 1 & 2)

### If you're engineering (2+ hours):
1. EXECUTIVE_SUMMARY.md (15 min — understand the approach)
2. TASK_FORMAT_TEMPLATES.md (60 min — understand the code)
3. IMPLEMENTATION_ROADMAP.md integration section (15 min)
4. Reference CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md as needed for specific platform patterns

### If you're product/planning:
1. EXECUTIVE_SUMMARY.md (15 min)
2. IMPLEMENTATION_ROADMAP.md (45 min — all phases + risk mitigation)
3. CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md (30 min — understand what's worked elsewhere)

### If you're fact-checking the research:
1. SOURCES_AND_CITATIONS.md (cross-reference all claims)
2. Click through to original sources (all hyperlinked)
3. Cross-check with CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md

---

## KEY STATISTICS

| Metric | Value |
|--------|-------|
| **Platforms analyzed** | 10 major systems |
| **Academic sources** | 50+ papers and case studies |
| **Total words** | ~14,000 |
| **Lines of code/SQL shown** | 200+ |
| **Task templates provided** | 5 (with full mockups + code) |
| **Implementation phases** | 5 (MVP to advanced) |
| **Time to read (executive)** | 15 minutes |
| **Time to read (full)** | 4-5 hours |
| **Time to implement MVP** | 40-50 developer hours |

---

## CORE RECOMMENDATIONS

### Must Do (Non-negotiable)
1. **Use context in every task** — Show why verification matters
2. **Implement 3-person consensus** — Prevents single-person error
3. **Add honeypots every 10 tasks** — Detects gaming
4. **Provide real-time feedback** — Users must know if they're right
5. **Create escalation path** — For disputed verifications
6. **NO financial incentives** — Use reputation only

### Should Do (High Impact)
1. Start with Template 1 (Existence) only
2. Measure obsessively (accuracy, quit rate, honeypot performance)
3. Iterate fast on feedback
4. Invite 10 beta users first (not 100)
5. Add Tier 2 unlock after 20 correct verifications

### Nice To Have (Later)
1. Leaderboards (Phase 4)
2. Multi-case expansion (Phase 5)
3. User-proposed tasks (future)
4. Gamified achievements (Phase 4)

---

## CRITICAL SUCCESS METRICS

Track these from day 1:

1. **Task Completion Rate** (target: >90%)
   - % of users who submit response (vs. abandon)

2. **Accuracy** (target: 85%+)
   - 3-person consensus agreement rate

3. **Quit Rate** (target: <10%)
   - % who start session but don't complete 5 tasks

4. **Honeypot Accuracy** (target: >80%)
   - % of users who pass the known-answer checks

5. **Session Duration** (target: 45-90 sec per task)
   - Faster = gaming; slower = overthinking

6. **User Retention** (target: 40%+)
   - % who return for session 2+

---

## QUESTIONS TO ASK BEFORE LAUNCHING

1. **Seed tasks:** Maxwell trial only (100 docs) OR expand to Panama Papers immediately?

2. **User recruitment:** Existing community (investigationGameStore) OR cold outreach (journalists, Bellingcat followers)?

3. **Expert pool:** Who are your first 5-10 Tier 3 experts? Internal or external?

4. **Legal review:** Have compliance/legal reviewed implications?

5. **Timeline:** Which sprint? (Assumed Sprint 20, but can shift)

6. **Scope:** Should Phase 2 include "user-proposed connections"?

---

## NEXT STEPS

1. **Share this package** with engineering + product + legal
2. **Answer the 6 questions** above
3. **Schedule kickoff** for chosen sprint (recommend Sprint 20)
4. **Start with Template 1 only** (Existence Verification)
5. **Invite 10 beta users** (internal team)
6. **Measure everything** (dashboard from day 1)
7. **Iterate based on data** (not assumption)

---

## DOCUMENT GLOSSARY

| Term | Meaning | Where to Learn |
|------|---------|---|
| **Consensus** | 3+ people agree on same task → accepted | CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md |
| **Honeypot** | Secret known-answer task to catch cheating | TASK_FORMAT_TEMPLATES.md |
| **Escalation** | When disagreement detected → expert review | IMPLEMENTATION_ROADMAP.md |
| **Tier 1/2/3** | User progression levels (Tier 3 = experts) | EXECUTIVE_SUMMARY.md |
| **Micro-narrative** | Task with context (not isolated fact) | EXECUTIVE_SUMMARY.md |
| **Rate limiting** | Max 30 tasks per session | TASK_FORMAT_TEMPLATES.md |
| **Reputation > Money** | Recognition better than payment for quality | CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md |
| **Streak bonus** | Extra points for correct answers in a row | TASK_FORMAT_TEMPLATES.md |

---

## FILE MANIFEST

```
research/
├── README.md (this file)
├── EXECUTIVE_SUMMARY.md
│   └── 7 principles, 4 templates, critical success factors
├── CROWD_VERIFICATION_TASK_DESIGN_ANALYSIS.md
│   └── 10 platforms, comparison matrix, synthesis
├── TASK_FORMAT_TEMPLATES.md
│   └── 5 React templates, code, database schema, algorithms
├── IMPLEMENTATION_ROADMAP.md
│   └── 5 phases, risk mitigation, resource allocation, timeline
└── SOURCES_AND_CITATIONS.md
    └── 50+ sources with hyperlinks, key findings
```

---

## ABOUT THIS RESEARCH

**Methodology:**
- Searched 10 world-leading platforms (Zooniverse, Wikipedia, ICIJ, Bellingcat, etc.)
- Reviewed 50+ academic papers (citizen science, micro-tasks, gamification)
- Extracted specific patterns (what works, what doesn't, why)
- Synthesized into 4 ready-to-implement task templates

**Validation:**
- Each template cross-referenced against 3+ platforms that succeeded
- Failure modes identified from platforms that tried and failed
- Cognitive science backing (fatigue, consensus, reputation)
- Legal compliance considered (no crowd fact-checking; verification only)

**Limitations:**
- Focused on document/entity verification (not fact-checking)
- Assumes existing user base (not cold audience)
- Based on public information (not proprietary platform research)
- Recommendations are patterns, not guarantees (test everything)

---

## FINAL THOUGHT

> **Effective verification tasks are not micro-tasks of isolated facts, but "micro-narratives" that place users in a story context.**

Build that narrative. Show why each verification matters. Create a community around a real investigation. Measure obsessively. Iterate fast.

The patterns here are proven. 35,000 people verified satellite images for Bellingcat. 10.8 million classifications came through Zooniverse. 40,000 crisis reports became 4,000 mapped events in Haiti.

You have everything you need. Now build it.

---

**Created:** March 25, 2026
**For:** Project Truth Investigation Platform
**Status:** Ready for implementation
**Next:** Schedule Sprint 20 kickoff

---

**END OF README**
