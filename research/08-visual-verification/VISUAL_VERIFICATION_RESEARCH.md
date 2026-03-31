# Visual Media Verification & Information Extraction Research
## For Project Truth: Investigative Journalism Network Platform

**Date:** March 13, 2026
**Context:** Building community-driven evidence verification system for criminal/corruption network mapping
**Philosophy:** AI assists humans; humans verify truth. Never let AI be the judge.

---

## EXECUTIVE SUMMARY

Building a visual verification system for Project Truth requires a **multi-layered approach** combining:

1. **Automated Analysis** (AI extracts what's visible: faces, objects, text, location clues)
2. **Human Verification** (Journalists/experts assess trustworthiness)
3. **Community Review** (Peer consensus on authenticity and relevance)
4. **Ethical Guardrails** (Privacy protection, bias mitigation, transparency)

The goal is creating a "signal, not judgment" system where AI whispers "I see X with Y% confidence" and humans decide what to believe.

---

## PART 1: IMAGE VERIFICATION & FORENSICS

### 1.1 Deepfake Detection (2026 State of Art)

**Current Status:** Multi-modal detection is the gold standard. Analyzing audio + video simultaneously achieves 90%+ accuracy against most synthetic media.

#### Leading Tools

| Tool | Accuracy | Cost | Use Case | Integration |
|------|----------|------|----------|-------------|
| **Sensity AI** | 95%+ | $10K-50K/yr | Enterprise deepfake detection | API (rate-limited) |
| **Amped Authenticate** | Professional-grade | $5K-15K | Photo + video forensics | Desktop + API |
| **InVID-WeVerify** | 85-90% (5 CNN ensemble) | Free (browser ext) | Journalist toolkit | Chrome extension |
| **TrueMedia** | 90%+ | Enterprise pricing | Real-time video verification | API + web interface |
| **C2PA Standard** | N/A (provenance) | Free (standard) | Content authentication | SDK + ecosystem |

**Key Innovation - 2026:** **C2PA (Coalition for Content Provenance and Authenticity)** emerging as standard. Media with cryptographic signatures proving origin + no tampering = fastest verification method.

**Recommendation for Project Truth:**
- Start with **InVID-WeVerify** (free, proven, journalist-trusted)
- Add **C2PA verification** (cost-effective signal: cryptographic proof)
- Escalate to **Amped Authenticate** only for disputed high-stakes evidence (Tier 2+ review)

**Architecture Example:**
```typescript
// AI suggests: "This looks like a deepfake with 78% confidence"
// System shows journalist: "⚠️ SYNTHETIC MEDIA DETECTED"
// Community then votes: "Fake" / "Real" / "Unclear"
// Final status: User consensus + forensic confidence
```

---

### 1.2 EXIF Metadata Analysis

**Critical Finding:** Most metadata survives first share, destroyed by social media reupload. Treat as one signal, not proof.

#### Tools & Workflow

| Tool | Purpose | Free | Integration |
|------|---------|------|-------------|
| **ExifTool** | CLI metadata extraction (camera, GPS, timestamp, software) | Yes | CLI/batch |
| **Forensically** (Zoom.us) | ELA + clone detection + noise analysis | Yes | Browser (no install) |
| **FotoForensics** | Quick ELA checks for recompression artifacts | Yes | Browser |
| **Metadata2Go** | Visual EXIF viewer + download | Yes | Browser |
| **JPEGsnoop** | Compression artifact analysis | Yes | CLI |

#### Error Level Analysis (ELA) Explained

When image is edited, recompressed sections show different error patterns than original. ELA amplifies these differences = edited region glows.

**Limitations:**
- Missing after Twitter/Instagram/TikTok upload
- Forged cameras can be added to metadata
- ELA false-positives on legitimate crop/contrast edits

**Workflow for Project Truth:**
1. User uploads image → auto-extract EXIF (ExifTool)
2. Show timestamp, camera model, GPS location
3. Alert if GPS present: "Journalist can anonymize GPS before upload"
4. Run ELA, show "Edited regions detected" (not "FAKE")
5. Community flag suspicious patterns

**Implementation:**
```typescript
// /api/documents/analyze-image
POST { imageFile }
→ {
    exif: { camera, timestamp, gps: "STRIP BEFORE UPLOAD" },
    ela: { editedRegions: [{ x, y, confidence }] },
    confidence: "95% likely edited at these coordinates"
  }
```

---

### 1.3 Reverse Image Search (Cross-Verification)

**Purpose:** Did this image appear elsewhere online? Is it misattributed?

#### Tools Comparison

| Tool | Strength | When to Use |
|------|----------|------------|
| **TinEye** | Finding image ORIGIN + modification history | Determine first appearance date |
| **Google Lens** | Largest index + contextual search | General verification |
| **Yandex** | Face recognition (Eastern European specialist) | Identifying individuals in photos |
| **PimEyes** | Face search (privacy-focused) | Identity verification |

**Pro Tip:** Never rely on single tool. Multi-engine cross-check (TinEye + Google + Yandex) = strong signal.

**Project Truth Integration:**
```typescript
// User uploads portrait of suspect
// System auto-runs: TinEye + Google Lens + Yandex
// Results: "Image first appeared March 15 on twitter.com/user/photo"
// "15 other websites reused this image"
// "Yandex found matching face in 3 other contexts"
→ Helps authenticate OR flag misattribution
```

---

## PART 2: VIDEO VERIFICATION & CONTENT ANALYSIS

### 2.1 Video Deepfake Detection

**Architecture:** Frame extraction → Face detection → 5-model ensemble CNN → Consensus

#### InVID-WeVerify Deep Dive

**What it does:**
- Breaks video into frames
- Detects faces via CNN
- Runs 5 ensemble detectors:
  - Xception (XceptionNet architecture)
  - EfficientNet-B4
  - Capsule-Forensics++
  - 2 proprietary lightweight models
- Consensus vote = deepfake score

**Accuracy:** 85-90% on standard deepfakes, lower on state-of-art GAN video

**Cost:** FREE (Chrome extension + API)

**Integration for Project Truth:**
```typescript
// Video uploaded
// /api/documents/video/deepfake-check
POST { videoFile }
→ Process via InVID API
→ Return frame-by-frame scores
→ Flag HIGH RISK frames (>80% synthetic)
→ Show journalist: "Frames 120-145 appear synthetic"
```

### 2.2 Speech-to-Text & Audio Analysis

**Current Best (2025-2026):** OpenAI Whisper + Whisper Large V3 Turbo

#### Tools

| Tool | Accuracy | Speed | Cost | Notes |
|------|----------|-------|------|-------|
| **Whisper Large V3 Turbo** | 98%+ (multilingual) | 5.4x faster than v3 | Free (open source) | 680K hours training data |
| **Voxtral (Mistral)** | Outperforms Whisper | Faster | Proprietary (not open) | 24B + 3B variants |
| **WhisperX** | As Whisper + speaker diarization | Slower | Free (open source) | Word-level timestamps |
| **DeepSpeech (Mozilla)** | 85-90% | Fast | DEPRECATED | Don't use |

**Recommendation:** Use **Whisper Large V3 Turbo** + **WhisperX** for speaker identification

**Privacy:** Runs locally (no upload to OpenAI unless you use their API)

**Project Truth Implementation:**
```typescript
// Video uploaded → extract audio → Whisper transcription
// Results with confidence scores:
{
  transcript: "The money went to...",
  confidence: 0.96,
  speakers: [
    { name: "Speaker 1", timeRange: "0:00-2:45" },
    { name: "Speaker 2", timeRange: "2:45-5:00" }
  ]
}
// Community can verify transcript accuracy
// AI extracts key quotes → annotation system
```

### 2.3 Key Frame Extraction & Scene Analysis

**Purpose:** Summarize 1-hour video into 10-20 representative frames

#### Tools

| Tool | Method | Free | Integration |
|------|--------|------|-------------|
| **Katna** | ML-based keyframe detection | Yes | Python library |
| **video-keyframe-detector** (GitHub) | Frame difference + peak estimation | Yes | Python CLI |
| **FFmpeg** | Manual scene cut detection | Yes | CLI |
| **Deep Learning (ArXiv 2506)** | CNN-based semantic keyframe extraction | Research | Python |

**How it Works:**
- Identifies frames with largest visual changes (scene cuts)
- Excludes redundant frames (same scene, no change)
- Produces ~10-15 frames summarizing entire video

**For Project Truth:**
```typescript
// Journalist uploads 45-min investigative video
// System extracts 15 keyframes
// Shows thumbnails + timestamps
// Journalist can click to review full context
// Community annotates what's happening in each frame
→ Dramatically speeds evidence review
```

### 2.4 Object Detection & Tracking Across Frames

**Use Case:** "Show me every time this car appears in the video" or "Track person's movements"

#### Tools

| Framework | Capability | Free |
|-----------|-----------|------|
| **YOLOv8 (Ultralytics)** | Real-time object detection + tracking | Yes |
| **DeepSORT** | Multi-object tracking with appearance model | Yes |
| **ByteTrack** | Lightweight tracking (works when detections fail) | Yes |

**Spatio-Temporal Analysis Pipeline:**
1. Extract keyframes (every 2 sec)
2. Detect all objects in each frame (YOLO)
3. Link detections across frames using IoU + appearance (ByteTrack)
4. Output: "Object trajectory" (position, ID, confidence per frame)

**Project Truth Implementation:**
```typescript
// Video of protest with suspicious vehicle
// User queries: "Find all instances of white van"
// System returns:
{
  detections: [
    { frame: 45, bbox: [x,y,w,h], confidence: 0.92 },
    { frame: 87, bbox: [x,y,w,h], confidence: 0.88 },
    { frame: 145, bbox: [x,y,w,h], confidence: 0.95 }
  ],
  trajectory: "Vehicle enters frame at 0:45, exits at 3:12"
}
→ Helps verify vehicle identity, timeline
```

---

## PART 3: INFORMATION EXTRACTION FROM IMAGES

### 3.1 Optical Character Recognition (OCR)

**Your Infrastructure Already Has This:** Google Document AI + Vision AI (Sprint GCS)

#### Capabilities You Own
- **Document AI:** PDFs → structured data (text, tables, forms)
- **Vision AI:** Images → text + description + label detection
- Both available via `/api/documents/ocr` + `/api/documents/vision`

#### What to Extract
- License plates, ID documents
- Signs, billboards, address text
- Meeting notes on whiteboards
- Financial documents, receipts

**⚠️ Privacy Caveat:** Be careful extracting readable ID numbers. Blur/redact before storing.

---

### 3.2 General Object & Scene Understanding

**Google Vision API provides:**
- **Label Detection:** "Person", "Meeting", "Outdoor"
- **Object Detection:** Bounding boxes + confidence
- **Landmark Detection:** Buildings, monuments
- **Logo Detection:** Company logos
- **Explicit Content Detection:** Gore, violence levels

**For Project Truth:**
```typescript
// Screenshot of protest uploaded
// Vision API returns:
{
  labels: ["Protest", "Crowd", "Police"],
  objects: [
    { name: "Person", confidence: 0.98, count: 47 },
    { name: "Vehicle", confidence: 0.95, count: 3 }
  ],
  landmarks: ["Government Building"],
  explicitContent: "Violence: LIKELY"
}
// AI suggests: "High-risk content. Journalist review recommended"
```

---

## PART 4: BELLINGCAT OSINT METHODOLOGY

### 4.1 Geolocation Verification (From Known Landmark)

**Core Principle:** Look for unique, unchanging features in image

#### Step-by-Step Workflow

1. **Identify landmarks** (unusual building, fountain, street sign, tram track)
2. **Use OpenStreetMap Search Tool** (Bellingcat's free tool)
3. **Cross-check with Google Maps/Street View** at suspected location
4. **Verify temporal clues** (shadows, sun angle, seasonal plants)
5. **Run reverse image search** (TinEye, Google) to find other instances

**Tools:**
- OpenStreetMap (free, searchable landmarks)
- Google Maps + Street View
- Sun.Calc.org (shadow angle from time/date/location)
- ShadowTrack (automated sun position analysis)

**Project Truth Implementation:**
```
User uploads: "Photo of secret meeting location"
System suggests:
- "This building is visible on OSM at coordinates [X,Y]"
- "Street sign partially visible: matches [City/Street]"
- "Sun angle suggests afternoon in Northern Hemisphere"
- "TinEye shows 4 other versions of this photo"
→ Geolocation confidence: 85%
→ Journalist can visit to verify
```

### 4.2 Chronolocation (When Was This Taken?)

**Clues:**
- EXIF timestamp (unreliable, can be forged)
- Seasonal plants (winter/spring/summer/fall)
- Shadows (sun height = time of day)
- Event context (protest date known from news)
- Vehicle license plate format (changed annually in some countries)
- Clothing/fashion (outdated styles)
- Building state (construction/renovation timeline)

**Tools:**
- Sun.Calc.org (shadow angle)
- Reverse image search (when did this image first appear online?)
- News archives (was there an event on this date?)

---

## PART 5: ETHICAL FRAMEWORK FOR FACE DETECTION

### 5.1 Your Current Policy (Recommended)

You already made the right choice: **Google Vision API does NOT do face recognition** (only face detection).

| Capability | You Have | Status | Why |
|-----------|----------|--------|-----|
| Face Detection | Yes | Via Vision API | Detect presence + emotion/expression |
| Face Recognition | No | Intentionally excluded | Privacy + bias concerns |
| Biometric Matching | No | Not available | GDPR Article 9 (sensitive data) |

### 5.2 GDPR Compliance Framework

**Key Points:**
- Facial data = sensitive biometric data (GDPR Article 9)
- Generally prohibited unless specific exception applies
- Must do Data Protection Impact Assessment (DPIA)
- Users must have explicit informed consent
- Right to erasure applies to all facial data

**For Project Truth (Journalism Context):**

```
Public Interest Exception (GDPR Recital 50):
"Processing for investigative journalism may be justified by
public interest in a democratic society"

But you still must:
1. Minimize facial data collection
2. Don't use for mass identification
3. Blur faces of non-suspects
4. Allow users to request deletion
5. Conduct DPIA + publish summary
```

### 5.3 Implementation Rules

✅ **ALLOWED:**
- Face detection for criminal suspects (public record)
- Blur faces of bystanders in protest photos
- Emotion detection for interview analysis ("witness seemed nervous")
- Flag if same person appears in multiple photos

❌ **NOT ALLOWED:**
- Mass facial surveillance of crowds
- Identification of individuals in background
- Selling facial data to governments
- Sharing biometric data with third parties without consent
- Using on children

**Code Example:**
```typescript
// Image contains 15 faces
// User marks 1 as "Suspect X"
// System auto-blurs other 14 faces
// Only marked face kept for identification

const result = await visionAPI.detectFaces(image);
const suspectFaces = await getUserMarkedFaces();
const bystanders = result.faces.filter(f =>
  !suspectFaces.some(s => distanceBetween(f, s) < 0.1)
);

// Blur bystander faces before storage
const anonymized = blurFaces(image, bystanders);
await saveToDatabase(anonymized);
```

---

## PART 6: COMMUNITY-BASED VERIFICATION

### 6.1 Best Practices from Bellingcat + IFCN

**Key Insight:** Professional fact-checkers + crowd verification achieve higher accuracy than either alone

#### The "Signal, Not Judgment" Model

1. **AI analyzes** → Outputs signals: "78% face match", "ELA detected editing", "First appeared March 10"
2. **Journalist reviews** → Applies context: "This is from the suspect's known location" + "Timeline matches arrest"
3. **Community votes** → Consensus: "VERIFIED / DISPUTED / UNRESOLVED"
4. **Final status** = AI signals + expert judgment + crowd consensus

**Prevents:**
- AI false positives (100% synthetic rating of real video due to compression)
- Journalism gatekeeping (community catches blind spots)
- Manipulation (peer review catches bad actors)

### 6.2 Tier-Based Review System

```
Tier 1 (Individual Analyst):
- Anyone can upload evidence
- System auto-analyzes (forensics, geolocation, OCR)
- User annotates what they found

Tier 2 (Verified Journalist):
- Can approve/reject evidence
- Gets reputation for accurate reviews
- Peer nominates (Tier 1 can't promote self)

Tier 3 (Expert Community):
- Specialized reviewers (legal experts, financial analysts, etc.)
- Can mark as "verified" vs "disputed"
- Community votes decide final status

Final Status Options:
- ✅ VERIFIED (2+ Tier 2 approvals + no disputes)
- ⚠️ DISPUTED (conflicting evidence)
- 🔄 UNRESOLVED (needs expert review)
- ❌ REJECTED (proven fake/misattributed)
```

### 6.3 Reputation System for Verification Accuracy

**Reward accurate reviewers:**
- +5 reputation for flagging fake evidence
- +3 reputation for expert annotation
- +1 reputation for basic fact-check
- -10 reputation for approving proven fakes (incentivizes care)

**Prevents gaming:**
- Reputation must come from different users (can't upvote self)
- Peer review randomized (don't know which expert is reviewing)
- Slashing (lose reputation if peer overturns your decision)

---

## PART 7: HUMAN-AI COLLABORATION BEST PRACTICES

### 7.1 What Journalists Actually Want (2025 Research)

**Finding:** Fact-checkers don't want full automation. They want AI that:
1. Reduces manual search time by 70-80%
2. Shows its sources (so human can verify)
3. Explains confidence levels
4. Flags check-worthy claims automatically
5. Remains fully transparent (explainability)

**Anti-Pattern:** Black-box AI that says "This is 87% false" with no explanation.

### 7.2 Explainability Requirements for Project Truth

Every AI verdict must show:
```
DEEPFAKE DETECTION: 78% confidence
├─ Xception model: FAKE (95% confidence)
├─ EfficientNet: REAL (45% confidence)
├─ Capsule: AMBIGUOUS (52% confidence)
├─ Model 4: FAKE (88% confidence)
├─ Model 5: REAL (60% confidence)
└─ Consensus: LIKELY SYNTHETIC (3 of 5 flags)

Explainer: "Video shows digital artifacts typical of facial swap synthesis.
Audio appears authentic. Recommend further forensic review."
```

**Not:** "AI says FAKE" (useless).

### 7.3 Conditional Automation

```
High confidence (>90%):
- Can auto-flag for review
- Still requires human approval before publishing

Medium confidence (60-90%):
- Show AI analysis + ask journalist: "Does this match context?"
- Journalist makes final call

Low confidence (<60%):
- Show all signals
- Journalist decides independently
```

---

## PART 8: ARCHITECTURE RECOMMENDATIONS FOR PROJECT TRUTH

### 8.1 Microservices Pipeline

```
User Upload
    ↓
[Analysis Queue]
    ├─ /api/documents/analyze-image
    │   ├─ EXIF extraction (ExifTool)
    │   ├─ Vision API (labels, objects, faces)
    │   ├─ ELA analysis (FotoForensics via browser)
    │   └─ Reverse image search (TinEye API)
    │
    ├─ /api/documents/video/analyze
    │   ├─ Frame extraction (FFmpeg)
    │   ├─ Keyframe extraction (Katna)
    │   ├─ Deepfake detection (InVID API)
    │   ├─ Speech-to-text (Whisper)
    │   └─ Object tracking (YOLO)
    │
    └─ /api/documents/ocr
        ├─ Document AI (PDFs)
        ├─ Vision API (screenshots)
        └─ Text extraction + redaction

    ↓
[Store Results in data_quarantine]
    ├─ extracted_text
    ├─ detected_objects
    ├─ deepfake_score
    ├─ geolocation_candidates
    ├─ audio_transcript
    └─ forensic_signals

    ↓
[Community Review]
    ├─ VerifyButton: Approve finding
    ├─ DisputeButton: Disagree with AI
    ├─ ContextButton: Add journalist note
    └─ VoteButton: Community consensus

    ↓
[Final Verdict]
    └─ VERIFIED / DISPUTED / UNRESOLVED
```

### 8.2 Database Schema Extension

```sql
-- Analysis Results Table
evidence_analysis (
  id UUID PRIMARY KEY,
  evidence_id UUID -> evidence_archive.id,

  -- Image Forensics
  exif_data JSONB,           -- metadata
  ela_regions JSONB,         -- edited zones
  reverse_search JSONB,      -- TinEye + Google + Yandex results
  vision_labels JSONB,       -- objects, scenes, landmarks

  -- Video Forensics
  keyframes JSONB,           -- extracted frames
  deepfake_score FLOAT,      -- ensemble CNN result
  transcript TEXT,           -- Whisper output
  object_tracks JSONB,       -- tracked objects

  -- Geolocation
  detected_location GEOMETRY,
  location_confidence FLOAT,

  -- Community Review
  reviewer_verdicts JSONB,   -- VERIFIED / DISPUTED / UNRESOLVED
  reputation_impact INT,     -- +5/-10 for reviewer accuracy

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Audit Trail
analysis_audit_log (
  id UUID PRIMARY KEY,
  analysis_id UUID,
  action VARCHAR,            -- ANALYZED / DISPUTED / VERIFIED
  actor_id UUID,
  reason TEXT,
  confidence FLOAT,
  created_at TIMESTAMP
);
```

### 8.3 Cost Estimation (Monthly)

| Service | Monthly Cost | Usage |
|---------|-------------|-------|
| Google Vision API | $0-30 | 10K+ requests free tier |
| Document AI | $1-5 | 5K+ pages free tier |
| Google Cloud Storage | $15-50 | 100GB+ video storage |
| InVID API | $50-200 | Deepfake detection (if not using free browser ext) |
| Whisper (local) | $0 | Open source, runs on your server |
| TinEye API | $200-500 | Reverse image search volume |
| Supabase (compute) | $50-200 | Database queries for verification |
| **Total** | **$315-985** | Scaling for 1000s of submissions/month |

---

## PART 9: TOOLS SELECTION SUMMARY

### Quick Reference: What to Implement When

**Sprint 1 (MVP):**
- Vision API object detection (already have GCP)
- ExifTool metadata extraction
- TinEye reverse image search
- Whisper audio transcription
- Community voting system

**Sprint 2:**
- InVID-WeVerify integration (browser extension + API)
- Keyframe extraction (Katna)
- YOLO object tracking
- Geolocation assistant (OpenStreetMap hints)

**Sprint 3 (Advanced):**
- C2PA standard verification
- Amped Authenticate deepfake detection (if budget allows)
- Speaker diarization (WhisperX)
- Automated GDPR compliance (face blur)

**Sprint 4+ (Polish):**
- Reputation leaderboard for verifiers
- Expert community specialization
- Citation system (journalist → source chain)
- Archival integration (Internet Archive, DocumentCloud)

---

## PART 10: RED FLAGS & FAILURE MODES

### ⚠️ Common Mistakes to Avoid

1. **"AI Says Deepfake = Must Be Fake"**
   - Reality: 15% false positive rate even in best tools
   - Solution: Show AI confidence + require human review

2. **Relying on Metadata Alone**
   - Reality: All metadata destroyed by social media share
   - Solution: Treat metadata as one signal among many

3. **Face Recognition Without Consent**
   - Reality: Violates GDPR + creates bias issues
   - Solution: Only detect + blur, never identify automatically

4. **Trusting Single Reverse Search Tool**
   - Reality: TinEye ≠ Google ≠ Yandex
   - Solution: Cross-check all three

5. **Deepfake Detection on Compressed Video**
   - Reality: Compression artifacts confuse detectors
   - Solution: Get highest-quality source material

6. **Community Vote = Truth**
   - Reality: Crowds can be manipulated / lack expertise
   - Solution: Weight votes by reputation + require expert sign-off

### ✅ Success Indicators

- AI helps journalists find evidence 70% faster
- Community challenges <10% of AI verdicts (good calibration)
- No false positives on verified authentic evidence
- <100ms response time for basic analysis
- Journalists trust the system (NPS >50)

---

## REFERENCES & SOURCES

### Deepfake Detection & Forensics
- [Sensity AI: Best Deepfake Detection 2026](https://sensity.ai/)
- [CloudSEK Deepfake Detection Tools Guide](https://www.cloudsek.com/knowledge-base/best-ai-deepfake-detection-tools)
- [Amped Authenticate Professional Forensics](https://ampedsoftware.com/authenticate)
- [Deepfake Media Forensics Review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11943306/)
- [Detecting Anti-Forensic Deepfakes (Frontiers 2025)](https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2025.1720525/full)

### Bellingcat OSINT Techniques
- [Bellingcat Online Investigation Toolkit](https://bellingcat.gitbook.io/toolkit)
- [Bellingcat OpenStreetMap Geolocation Tool](https://www.bellingcat.com/resources/how-tos/2023/05/08/finding-geolocation-leads-with-bellingcats-openstreetmap-search-tool/)
- [OSINT Geolocation Techniques Guide](https://www.neotas.com/osint-sources-geolocation-osint/)

### Video Verification Tools
- [InVID WeVerify Chrome Extension](https://chromewebstore.google.com/detail/fake-news-debunker-by-inv/mhccpoafgdgbhnjfhkcmgknndkeenfhe)
- [Columbia Journalism Review: Deepfake Detection 2025](https://www.cjr.org/tow_center/what-journalists-should-know-about-deepfake-detection-technology-in-2025-a-non-technical-guide.php)
- [AI Video Detector: Journalist Guide 2025](https://www.aivideodetector.org/blog/journalists-ai-video-verification-2025)

### Image Forensics Tools
- [EBU Spotlight: EXIF & ELA Forensics](https://spotlight.ebu.ch/p/unmasking-image-manipulation-with)
- [EXIF Metadata Analysis Guide](https://imagezo.com/detect-altered-exif-location-in-image-metadata/)
- [ExifTool CLI Reference](https://exiftool.org/)
- [Photo Forensics Tools 2025](https://sider.ai/blog/ai-tools/best-photo-forensics-tools-to-catch-image-manipulation-in-2025)

### Reverse Image Search
- [TinEye Reverse Image Search](https://tineye.com/)
- [Reverse Image Search Comparison Guide](https://www.ucartz.com/blog/reverse-image-search-guide/)
- [Best Reverse Search Tools 2025](https://socialcatfish.com/scamfish/best-reverse-image-search-tools/)

### Speech-to-Text & Audio
- [OpenAI Whisper Project](https://openai.org/index/whisper)
- [Whisper GitHub Repository](https://github.com/openai/whisper)
- [Whisper Large V3 (Hugging Face)](https://huggingface.co/openai/whisper-large-v3)
- [Voxtral by Mistral AI](https://mistral.ai/news/voxtral)
- [Open Source STT Benchmarks 2025](https://modal.com/blog/open-source-stt)

### Video Analysis & Tracking
- [YOLOv8 Object Tracking](https://docs.ultralytics.com/modes/track/)
- [Key Frame Detection Deep Learning](https://www.intechopen.com/chapters/71081)
- [Video Object Detection via Temporal Aggregation](https://www.ecva.net/papers/eccv_2020/papers_ECCV/papers/123590154.pdf)
- [Katna: Automated Keyframe Extraction](https://github.com/keplerlab/katna)

### Ethical Frameworks & Privacy
- [Google's Facial Recognition Approach](https://ai.google/responsibility/facial-recognition/)
- [GDPR and Facial Recognition Analysis](https://www.gdpr-advisor.com/gdpr-and-facial-recognition-privacy-implications-and-legal-considerations/)
- [Ethics of Computer Vision Overview](https://www.xenonstack.com/blog/ethical-considerations-in-computer-vision)
- [Facial Recognition Ethics & Surveillance (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8320316/)

### Human-AI Collaboration
- [Co-Designing Fact-Checking Solutions (AI & Ethics Journal 2024)](https://link.springer.com/article/10.1007/s43681-024-00619-y)
- [AI in Nordic Fact-Checking Practices (2024)](https://journals.sagepub.com/doi/10.1177/27523543241288846)
- [Role of Explainability in Human-AI Disinformation Detection (FAccT 2024)](https://facctconference.org/static/papers24/facct24-146.pdf)
- [AI-Powered Fact Checking at Scale](https://www.pressmaster.ai/article/how-fact-checking-automation-works)

---

## NEXT STEPS FOR PROJECT TRUTH

1. **Documentation Review:** Share this doc with journalist advisory board
2. **Tool Testing:** Set up local instances of ExifTool, Katna, Whisper
3. **API Planning:** Design `/api/documents/analyze` microservice architecture
4. **Community Design:** Sketch out reputation + verification UI
5. **Ethical Audit:** Run GDPR impact assessment for face detection
6. **Prototype:** Build MVP with Vision API + TinEye + basic voting

**Goal:** "AI whispers signals, humans decide truth."

