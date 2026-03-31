# Confidence Scoring: Quick Reference Card
## For Product, Engineering & Legal Teams

---

## THE PROBLEM IN 30 SECONDS

**Current State:**
```
All entities: confidence = 0.85-0.95 (broken signal)
Users: Can't tell sworn testimony from address book
Network: Visual noise, no differentiation
Legal: LLM overconfidence embedded in platform
```

**Root Cause:** LLMs are overconfident. Asking them to rate their own confidence doesn't help.

**Solution:** Calculate confidence externally using 8 independent signals + NATO standards.

---

## THE SOLUTION IN 60 SECONDS

**8-Signal Composite Scoring:**

1. **Document Source Type** (30% weight)
   - Sworn testimony = 0.95 baseline
   - Address book = 0.25 baseline

2. **NATO Admiralty Code** (25% weight)
   - A1 (completely reliable + confirmed) = 0.95
   - D6 (not reliable + unjudged) = 0.15

3. **Mention Frequency** (15% weight)
   - Appears 10+ chunks = 1.0
   - Appears 1 chunk = 0.1

4. **Cross-Reference** (10% weight)
   - Exists in external DB = +0.70
   - Not found = +0.00

5. **Corroboration** (10% weight)
   - 3+ sources confirm = 1.0
   - 0 sources = 0.0

6. **Temporal Consistency** (5% weight)
   - Consistent dates across 9+ years = 0.85
   - Single isolated mention = 0.05

7. **Entity Type Likelihood** (5% weight)
   - "John Smith" (person) = 0.8
   - "XYZ Company Inc" (org) = 0.9
   - "Unknown #3" (anonymous) = 0.3

**Final Score = weighted average of all 7 signals**

**Result: Scores now range 0.10-0.95 with actual meaning**

---

## CONFIDENCE TIERS

| Score | Tier | Quarantine | Network | Meaning |
|-------|------|-----------|---------|---------|
| 0.90+ | HIGH | Auto-Approved | Prominent | Proven fact |
| 0.70-0.89 | MODERATE | Peer Review | Visible | Likely true |
| 0.50-0.69 | LOW | Expert Review | Visible | Uncertain |
| <0.50 | SPECULATIVE | Hold | Hidden | Pure speculation |

---

## REAL EXAMPLES

**Ghislaine Maxwell (0.94)** ✓
- Sworn testimony + confirmed + external DB match
- **Result:** Bright red, large node, always visible

**Jean-Luc Brunel (0.60)**
- News article + limited corroboration
- **Result:** Yellow, medium node, "review needed" flag

**Unknown Victim #3 (0.15)**
- Address book mention only
- **Result:** Hidden by default, gray if shown, clearly speculative

---

## IMPLEMENTATION

**Timeline:** 2 weeks (4 phases)

**Phase 1:** Database schema (1-2 days)
- Add columns for NATO grades, signals
- Backfill existing entities

**Phase 2:** Scoring library (2-3 days)
- TypeScript implementation
- Unit tests

**Phase 3:** Integration (2-3 days)
- Quarantine system update
- 3D visualization update

**Phase 4:** Testing & deployment (2-3 days)
- User acceptance testing
- Production rollout

---

## BENEFITS

**For Users:**
- Can now distinguish high-signal from noise
- Hover card explains confidence breakdown
- Filter by confidence level

**For Network:**
- 3D visualization shows true evidence hierarchy
- Nodes sized/colored by confidence, not arbitrary
- Relationships weighted by corroboration

**For Quarantine:**
- Auto-approve high-confidence sworn testimony (saves time)
- Flag medium confidence for peer review (appropriate rigor)
- Reject low-confidence speculation (quality control)

**For Legal:**
- "We used NATO-standard grading" = defensible methodology
- Transparent scoring = no hidden bias
- Audit trail shows why each score

---

## NATO ADMIRALTY CODE MATRIX

Quick lookup:

```
        Info: 1 (Confirmed)  2 (Prob True)  3 (Possible)  4 (Doubtful)  5 (Improbable) 6 (Unjudged)
Source: A (Completely Reliable)    0.95          0.93          0.90          0.70          0.40        0.30
        B (Usually Reliable)       0.88          0.85          0.80          0.60          0.35        0.25
        C (Fairly Reliable)        0.80          0.75          0.70          0.50          0.30        0.20
        D (Not Usually Reliable)   0.70          0.60          0.50          0.35          0.20        0.15
        E (Unreliable)             0.45          0.35          0.25          0.15          0.10        0.05
        F (Cannot Judge)           0.30          0.25          0.20          0.15          0.10        0.05
```

---

## CHECKLIST FOR LAUNCH

Engineering:
- [ ] Database migrations applied
- [ ] Scoring library implemented & tested
- [ ] Quarantine route updated
- [ ] 3D visualization updated
- [ ] Confidence stored in database
- [ ] No regressions in existing features

Product:
- [ ] User documentation updated
- [ ] Landing page mentions confidence tiers
- [ ] Tutorial explains "why this entity is high/low confidence"
- [ ] Filter UI for confidence slider works

Legal:
- [ ] Review methodology documentation
- [ ] Approve NATO Admiralty mapping
- [ ] Confirm defensibility for court usage
- [ ] Update privacy policy if needed

---

## FAQ

**Q: What if my entity doesn't fit these categories?**
A: The algorithm handles all types. Just map your document type to the closest category, and let signals do the work.

**Q: Can users manually override confidence?**
A: Not permanently. But they can flag entities for expert review, which updates the database.

**Q: What about AI-generated false entities?**
A: Low mention frequency + no external DB match = automatic low confidence. Catches hallucinations.

**Q: How do I update confidence if new evidence comes in?**
A: Recompute: if same entity gets new mention, mention_frequency increases → confidence rises automatically.

**Q: Is this legally defensible?**
A: Yes. NATO Admiralty Code is military standard. 8-signal composite is transparent & auditable.

---

## ROLLOUT TIMELINE

**Week 1:** Prepare (schema, library, tests)
**Week 2:** Deploy (quarantine, 3D viz, backfill)
**Week 3:** Polish (documentation, user edu, edge cases)
**Week 4:** Launch (production, monitor, feedback loop)

---

## CONTACT

**Questions about:**
- **Implementation:** Engineering team
- **Product strategy:** Product team
- **Legal implications:** Legal team
- **User education:** Marketing team

---

## KEY INSIGHT

> "Confidence isn't about how sure the AI is. It's about how well-documented the fact is."

This system measures evidence quality, not LLM certainty.

---

**Status:** Ready for implementation
**Date:** March 22, 2026
**Next Step:** Engineering kickoff meeting

