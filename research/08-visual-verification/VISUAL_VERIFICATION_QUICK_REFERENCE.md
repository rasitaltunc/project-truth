# Visual Verification - Quick Reference Card
## Cheat Sheet for Project Truth

Print this. Keep it near your desk.

---

## ONE-LINE ANSWERS

**Q: Best deepfake detector?**
A: InVID-WeVerify (free) or Sensity ($$$ but 95% accurate)

**Q: Best image metadata?**
A: ExifTool (CLI) + Forensically.com (browser)

**Q: Best reverse image search?**
A: TinEye for origins, Google Lens for index size, Yandex for faces

**Q: Best video transcription?**
A: Whisper Large V3 Turbo (98% accurate, free, local)

**Q: Best geolocation?**
A: OpenStreetMap + Google Street View + Sun.Calc.org

**Q: Best object tracking?**
A: YOLOv8 (real-time) or ByteTrack (robust)

**Q: Best key frames?**
A: Katna (ML-based)

**Q: Scariest deepfake detector weakness?**
A: 15% false positive rate — never trust >1 model

**Q: How do we prevent privacy leaks?**
A: Auto-blur bystander faces + warn on GPS + delete after 90 days

**Q: Who decides if evidence is real?**
A: Journalists (using AI signals) + community (peer review) + reputation system (weighted voting)

---

## TOOL COST SUMMARY

```
FREE TIER (MVP):
  Google Vision API       $0 (10K/month free)
  Google Document AI      $0 (5K pages free)
  ExifTool               $0 (open source)
  Whisper                $0 (open source, local)
  Forensically.com       $0 (web tool)
  Katna                  $0 (open source)
  YOLOv8                 $0 (open source)
  OpenStreetMap          $0
  Google Street View     $0

PAID (Per-use):
  TinEye                 $0.05 per search
  GCS Storage            $0.20/GB/month
  Supabase               $50-200/month

ENTERPRISE (Optional):
  Sensity AI             $500-2000/month
  Amped Authenticate     $400-1250/month
  Voxtral                Proprietary
```

**Launch Total:** $75-335/month (no enterprise tools)

---

## DECISION TREE (Quick Version)

```
IMAGE → Fake? → Forensically.com (ELA) → Show score, journalist decides
     → Where? → Google Maps + Sun.Calc.org
     → Appeared elsewhere? → TinEye + Google + Yandex
     → Who? → Google Vision (detect) + Yandex (search)
     → Edited? → ExifTool (metadata) + ELA

VIDEO → Deepfake? → InVID-WeVerify (free) or Sensity ($$)
     → Transcript? → Whisper Large V3 Turbo
     → Key moments? → Katna
     → Track object? → YOLOv8

ALWAYS → Journalist reviews → Community votes → Final status
```

---

## ARCHITECTURE IN 5 MINUTES

```
1. User uploads evidence
   ↓
2. System queues analysis (async, non-blocking)
   ├─ Vision API (objects, labels)
   ├─ ExifTool (metadata)
   ├─ Deepfake (if video)
   └─ Whisper (if video)
   ↓
3. Results stored in data_quarantine (not production yet)
   ↓
4. Journalist reviews + adds context
   ↓
5. Community votes (GENUINE/FAKE/AMBIGUOUS)
   ↓
6. Reputation system weights votes
   ↓
7. Final status: VERIFIED/DISPUTED/UNRESOLVED
   ↓
8. Update evidence_archive with verification_level
```

---

## THE THREE-LAYER VERIFICATION MODEL

```
LAYER 1 (AI):
  Signals: "78% deepfake score", "ELA shows editing", "Found at [URL]"
  Confidence: Shows math (5 models, 3 say fake, 2 say real)
  Role: Extract information, not decide truth

LAYER 2 (Journalist):
  Input: Applies context ("matches suspect's known location")
  Judgment: "This signal makes sense with my investigation"
  Authority: Can approve/reject evidence for their network
  Reputation: +5 for accurate review, -10 for sloppy work

LAYER 3 (Community):
  Vote: GENUINE / FAKE / AMBIGUOUS
  Weighting: Tier 2+ votes count more (they have reputation)
  Consensus: 2+ Tier 2 approvals = VERIFIED
  Dispute: Any disagreement = DISPUTED status
```

---

## WHAT NOT TO DO

❌ Auto-tag as "FAKE"
❌ Identify faces without consent
❌ Trust single deepfake detector
❌ Block uploads while analyzing
❌ Show AI verdict without confidence
❌ Store metadata forever
❌ Let community votes override expertise

---

## WHAT TO DO

✅ Show confidence scores
✅ Detect (never identify) faces
✅ Use 5-model ensemble
✅ Async analysis (non-blocking)
✅ Show model breakdown + reasoning
✅ Auto-delete after 90 days
✅ Weight votes by reputation + expertise

---

## TEAM ROLES & RESPONSIBILITIES

**Raşit (Product Vision):**
- Approve architecture approach
- Decide MVP scope vs nice-to-have
- Allocate GCP budget
- Make final call on "publish or delay"

**Engineer (Implementation):**
- Set up analysis queue
- Integrate Vision API + ExifTool
- Build forensics UI panel
- Implement reputation system

**Journalist (Testing & Feedback):**
- Review AI signals early
- Catch false positives
- Provide journalist feedback
- Help calibrate confidence thresholds

**Community (Peer Review):**
- Vote on evidence authenticity
- Build reputation
- Catch errors journalists missed
- Provide oversight

---

## QUICK IMPLEMENTATION CHECKLIST

### Week 1-2
- [ ] Create data_quarantine table
- [ ] Set up Vision API + ExifTool
- [ ] Build forensics results panel (read-only)
- [ ] Create community voting component

### Week 3-4
- [ ] Add video support (Whisper)
- [ ] Add deepfake detection (InVID test)
- [ ] Build reputation tracking
- [ ] Show confidence scores

### Week 5-6
- [ ] Add TinEye reverse search
- [ ] Add geolocation hints
- [ ] Beta test with journalists
- [ ] Collect feedback

### Week 7-8
- [ ] Fix bugs from feedback
- [ ] GDPR legal review
- [ ] Optimize performance
- [ ] Launch

---

## GDPR COMPLIANCE CHECKLIST

✅ Face detection only (no identification)
✅ Auto-blur bystander faces
✅ Warn before extracting GPS
✅ Consent from users
✅ Data deletion after 90 days
✅ Audit log for all reviews
✅ DPIA (Data Protection Impact Assessment) drafted
✅ Privacy policy updated
✅ Legal review of journalist shield laws

---

## COST CONTROL KNOBS

If costs exceed budget:

1. **Turn off TinEye** — Use free Google Lens instead (slightly less accurate)
2. **Reduce retention** — Delete forensics after 30 days instead of 90
3. **Sample analysis** — Analyze 50% of evidence instead of 100%
4. **Skip enterprise tools** — Use free tools only
5. **Batch processing** — Run expensive analysis during off-peak hours

Default: MVP should stay <$300/month. If you hit $500/month, implement above.

---

## QUALITY GATES

**Safe to use without human review:**
- Metadata warnings ("GPS found")
- Object detection ("5 people, 2 vehicles")
- ELA results ("edited at coordinates X,Y")
- Reverse search ("first appeared March 10")

**Requires Tier 2 expert review:**
- Deepfake score 40-60% (ambiguous range)
- Multiple reverse search results (which is origin?)
- Geolocation candidate list (which location matches?)

**Never trust (human decision only):**
- Face identification
- Guilt/innocence verdict
- Publishing decision
- Source attribution

---

## WHEN DEEPFAKE DETECTION FAILS

**Common false positives:**
- Video compression artifacts (looks like synthetic)
- Old video (detection trained on newer codecs)
- Very low quality (noise confuses models)

**Fix:** Show model breakdown. If 2/5 models say fake + compression artifacts, flag as "AMBIGUOUS" not "FAKE".

**When you're unsure:** Escalate to Tier 2 + ask community. Consensus beats AI.

---

## REPUTATION SYSTEM QUICK START

```
New user (Tier 1):
  Reputation: 0
  Can upload, vote, comment
  Cannot approve evidence

After 10 accurate reviews:
  Reputation: +50
  Auto-promote to Tier 2
  Can now approve evidence
  Votes count as 2x weight

If you approve fake evidence:
  Reputation: -10
  (Incentivizes care)

If peer overturns your verdict:
  Reputation: -5
  (Learn from feedback)

Leaderboard:
  Top reviewers get visible badge
  (Incentivizes participation)
```

---

## ONE-PAGER FOR JOURNALISTS

**The AI System Will:**
- Extract metadata (what camera, when, where)
- Flag potential editing
- Find where image appeared first
- Transcribe video audio
- Detect objects and scenes
- Score deepfake likelihood

**The AI System Will NOT:**
- Tell you if someone is guilty
- Decide if evidence is publishable
- Prove anything in court
- Replace your judgment

**Your Job:**
1. Review AI signals
2. Apply journalistic context
3. Verify independently
4. Decide whether to publish
5. Community provides peer review

**The Bottom Line:**
AI is 85% accurate. You are the final editor.

---

## FINAL THOUGHT

**If you remember nothing else, remember this:**

> AI signals, humans decide, community watches.

That's the entire philosophy of this system. Everything flows from that principle.

---

**Print this. Reference this. You're all set.**

