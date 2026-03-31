# Visual Media Verification - Implementation Guide
## Tactical Recipes for Project Truth

**Purpose:** Concrete code patterns + configurations for integrating forensics into your existing stack

---

## I. QUICK INTEGRATION PATTERNS

### Pattern 1: Auto-Analysis on Upload (Minimal Changes)

```typescript
// /api/documents/upload/route.ts — Add to existing handler

import { analyzeVisualMedia } from '@/lib/forensics/analyzer';
import { quarantineStore } from '@/store/quarantineStore';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  // 1. Upload to GCS (existing code)
  const gcsPath = await uploadToGCS(file);

  // 2. NEW: Queue analysis job (non-blocking)
  analyzeVisualMedia(gcsPath, {
    image: file.type.startsWith('image/'),
    video: file.type.startsWith('video/'),
    pdf: file.type === 'application/pdf'
  }).then(results => {
    // 3. Store results in data_quarantine (not production)
    quarantineStore.addAnalysisResults({
      documentId: doc.id,
      forensicSignals: results,
      status: 'pending_review'
    });
  }).catch(err => {
    // Graceful fallback — upload succeeds even if analysis fails
    console.error('Forensic analysis failed:', err);
  });

  return { documentId: doc.id, gcsPath };
}
```

**Why This Works:**
- Doesn't block upload (async job)
- Graceful fallback (upload succeeds even if analysis fails)
- Results stored in quarantine for peer review
- Zero user friction

---

### Pattern 2: Face Detection + Auto-Blur (Privacy Protection)

```typescript
// /lib/forensics/face-privacy.ts

import vision from '@google-cloud/vision';
import sharp from 'sharp';

const client = new vision.ImageAnnotatorClient();

export async function autoBlurNonSuspects(
  imagePath: string,
  suspectIds: string[] // User-marked suspects
): Promise<Buffer> {
  // 1. Detect all faces
  const [result] = await client.faceDetection(imagePath);
  const faces = result.faceAnnotations || [];

  // 2. Identify which are suspects (simplified — use ML in production)
  const bystanders = faces.filter(face => {
    // Skip faces matching known suspects
    const isSuspect = suspectIds.some(id =>
      matchFaceToProfile(face, id) > 0.8
    );
    return !isSuspect;
  });

  // 3. Blur bystander faces
  let blurred = sharp(imagePath);
  for (const face of bystanders) {
    const { x, y, width, height } = face.boundingPoly.vertices.reduce(
      (b, v) => ({
        x: Math.min(b.x, v.x),
        y: Math.min(b.y, v.y),
        width: Math.max(v.x) - Math.min(b.x),
        height: Math.max(v.y) - Math.min(b.y)
      })
    );

    blurred = blurred.composite([{
      input: await generateBlurOverlay(width, height),
      left: x,
      top: y
    }]);
  }

  return blurred.toBuffer();
}

function generateBlurOverlay(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: '#000000'
    }
  })
    .blur(20)
    .toBuffer();
}
```

**Usage in Evidence Upload Flow:**
```typescript
// In document review panel
const anonymized = await autoBlurNonSuspects(imagePath, [suspectId]);
await saveToGCS(anonymized, 'anonymized-' + filename);
// Show journalist: "14 bystander faces blurred. Suspect marked."
```

---

### Pattern 3: ExifTool Extraction (Metadata Warning System)

```typescript
// /lib/forensics/exif.ts

import { execSync } from 'child_process';
import os from 'os';

export interface ExifData {
  camera?: string;
  timestamp?: Date;
  gpsLocation?: { lat: number; lon: number };
  software?: string;
  warnings: string[];
}

export function extractExif(imagePath: string): ExifData {
  try {
    const output = execSync(
      `exiftool -j "${imagePath}"`,
      { encoding: 'utf-8' }
    );

    const [data] = JSON.parse(output);
    const warnings = [];

    // Check for privacy leaks
    if (data.GPSLatitude && data.GPSLongitude) {
      warnings.push(
        `GPS location embedded: ${data.GPSLatitude}, ${data.GPSLongitude}`
      );
    }

    if (data.Make && data.Model) {
      warnings.push(
        `Camera: ${data.Make} ${data.Model} (can identify device owner)`
      );
    }

    if (data.Software) {
      warnings.push(
        `Edited with: ${data.Software} (may indicate manipulation)`
      );
    }

    return {
      camera: `${data.Make} ${data.Model}`,
      timestamp: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal)
        : undefined,
      gpsLocation: data.GPSLatitude
        ? { lat: data.GPSLatitude, lon: data.GPSLongitude }
        : undefined,
      software: data.Software,
      warnings
    };
  } catch (error) {
    return { warnings: ['Could not extract EXIF data'] };
  }
}
```

**In DocumentUploadFlow:**
```typescript
const exif = extractExif(file);

if (exif.warnings.length > 0) {
  toast.warning('⚠️ Privacy Alert', {
    description: exif.warnings.join('\n'),
    action: {
      label: 'Remove EXIF?',
      onClick: () => stripExifAndReupload(file)
    }
  });
}
```

---

### Pattern 4: Reverse Image Search (TinEye Integration)

```typescript
// /lib/forensics/reverse-search.ts

const TINEYE_API_KEY = process.env.TINEYE_API_KEY;

export interface ReverseSearchResult {
  firstAppeared: {
    url: string;
    date: Date;
  };
  instances: Array<{
    url: string;
    title: string;
    date?: Date;
  }>;
  modifications: Array<{
    url: string;
    type: 'Modification' | 'Exact Match';
  }>;
}

export async function reverseImageSearch(
  imagePath: string
): Promise<ReverseSearchResult> {
  const formData = new FormData();
  formData.append('image_upload', await readFile(imagePath));

  const response = await fetch('https://api.tineye.com/api/request/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TINEYE_API_KEY}`
    },
    body: formData
  });

  const data = await response.json();
  const results = data.results;

  // Sort by date to find origin
  const byDate = results
    .filter(r => r.publish_date)
    .sort((a, b) =>
      new Date(a.publish_date).getTime() -
      new Date(b.publish_date).getTime()
    );

  return {
    firstAppeared: {
      url: byDate[0]?.url || 'Unknown',
      date: new Date(byDate[0]?.publish_date || 0)
    },
    instances: results.map(r => ({
      url: r.url,
      title: r.title || r.domain,
      date: r.publish_date ? new Date(r.publish_date) : undefined
    })),
    modifications: results
      .filter(r => r.image_type === 'Modification')
      .map(r => ({
        url: r.url,
        type: 'Modification' as const
      }))
  };
}
```

**Display in ArchiveModal/DocumentCard:**
```typescript
{reverseSearchResults && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
    <h4 className="font-semibold text-yellow-800">
      Image Attribution
    </h4>
    <p className="text-sm text-yellow-700">
      First appeared: <a href={reverseSearchResults.firstAppeared.url}>
        {reverseSearchResults.firstAppeared.date.toLocaleDateString()}
      </a>
    </p>
    <p className="text-xs text-yellow-600 mt-2">
      Found in {reverseSearchResults.instances.length} other locations
    </p>
  </div>
)}
```

---

### Pattern 5: Whisper Audio Transcription (Video Analysis)

```typescript
// /lib/forensics/transcription.ts

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TranscriptResult {
  text: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }>;
  language: string;
  duration: number;
}

export async function transcribeVideo(
  videoPath: string,
  language?: string
): Promise<TranscriptResult> {
  // 1. Extract audio from video
  const audioPath = '/tmp/extracted-audio.wav';
  await execAsync(
    `ffmpeg -i "${videoPath}" -q:a 9 -n "${audioPath}" 2>/dev/null`
  );

  // 2. Run Whisper
  const outputJson = '/tmp/whisper-output.json';
  const whisperCmd = language
    ? `whisper "${audioPath}" --model large-v3-turbo --output_format json --output_dir /tmp --language ${language}`
    : `whisper "${audioPath}" --model large-v3-turbo --output_format json --output_dir /tmp`;

  await execAsync(whisperCmd);

  // 3. Parse results
  const result = JSON.parse(fs.readFileSync(outputJson, 'utf-8'));

  // Cleanup
  fs.unlinkSync(audioPath);
  fs.unlinkSync(outputJson);

  return {
    text: result.text,
    segments: result.segments || [],
    language: result.language,
    duration: result.duration || 0
  };
}
```

**Usage in Video Analysis:**
```typescript
// /api/documents/video/analyze
const transcript = await transcribeVideo(gcsPath, 'en');

// Store in quarantine
await quarantineStore.add({
  documentId: videoId,
  extractedText: transcript.text,
  audioSegments: transcript.segments,
  language: transcript.language,
  status: 'pending_review'
});

// Display to journalist
toast.success('Transcript Ready', {
  description: `${transcript.segments.length} segments extracted`
});
```

---

### Pattern 6: Deepfake Detection (InVID API)

```typescript
// /lib/forensics/deepfake.ts

export interface DeepfakeResult {
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    isFake: boolean;
    confidence: number;
    modelVerdicts: {
      xception: number;
      efficientnet: number;
      capsule: number;
      model4: number;
      model5: number;
    };
  }>;
  overallScore: number; // 0-100, >70 = synthetic
  recommendation: 'LIKELY_DEEPFAKE' | 'LIKELY_REAL' | 'AMBIGUOUS';
}

export async function checkDeepfakeInVID(
  videoPath: string
): Promise<DeepfakeResult> {
  // InVID API docs: https://www.invid-project.eu/tools/invid-deepfake-tracker/

  const formData = new FormData();
  formData.append('video', await readFile(videoPath));

  const response = await fetch('https://api.invid.udm.network/deepfake', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INVID_API_KEY}`
    },
    body: formData
  });

  const data = await response.json();

  // Parse ensemble results
  const frames = data.frames.map(f => ({
    frameNumber: f.frame_num,
    timestamp: f.timestamp,
    isFake: f.predictions.score > 0.5,
    confidence: f.predictions.score,
    modelVerdicts: {
      xception: f.models.xception,
      efficientnet: f.models.efficientnet,
      capsule: f.models.capsule,
      model4: f.models.model4,
      model5: f.models.model5
    }
  }));

  const avgScore = frames.reduce((sum, f) => sum + f.confidence, 0) / frames.length;

  return {
    frames,
    overallScore: Math.round(avgScore * 100),
    recommendation: avgScore > 0.7
      ? 'LIKELY_DEEPFAKE'
      : avgScore < 0.3
        ? 'LIKELY_REAL'
        : 'AMBIGUOUS'
  };
}
```

**Display Deepfake Warning:**
```typescript
const deepfakeResult = await checkDeepfakeInVID(videoPath);

if (deepfakeResult.recommendation === 'LIKELY_DEEPFAKE') {
  return (
    <div className="bg-red-900/50 border-2 border-red-600 p-4 rounded">
      <h3 className="text-red-200 font-bold flex items-center gap-2">
        ⚠️ SYNTHETIC MEDIA DETECTED
      </h3>
      <p className="text-red-100 text-sm mt-2">
        AI detected {deepfakeResult.frames.filter(f => f.isFake).length} of {deepfakeResult.frames.length} frames as synthetic
        (Confidence: {deepfakeResult.overallScore}%)
      </p>
      <details className="text-xs text-red-100 mt-2">
        <summary>Model Breakdown</summary>
        <pre className="text-xs overflow-auto mt-2">
          {JSON.stringify(deepfakeResult.frames[0].modelVerdicts, null, 2)}
        </pre>
      </details>
      <p className="text-red-100 text-xs mt-3 italic">
        Note: This is an AI signal, not a final verdict. Journalist review required.
      </p>
    </div>
  );
}
```

---

## II. COMMUNITY VERIFICATION FLOWS

### Pattern 7: Evidence Review Queue (Tier 2+)

```typescript
// /store/reviewQueueStore.ts

import { create } from 'zustand';

interface ReviewItem {
  id: string;
  documentId: string;
  forensicSignals: any; // Results from Pattern 1
  submittedBy: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'disputed';
  reviewers: Array<{
    userId: string;
    verdict: 'genuine' | 'fake' | 'ambiguous';
    reasoning: string;
    timestamp: Date;
  }>;
}

export const useReviewQueueStore = create<{
  items: ReviewItem[];
  fetchQueue: () => Promise<void>;
  submitReview: (itemId: string, verdict: string, reasoning: string) => Promise<void>;
  getApprovalStatus: (itemId: string) => 'unanimous' | 'disputed' | 'pending';
}>(set => ({
  items: [],

  fetchQueue: async () => {
    const response = await fetch('/api/review-queue?tier=2');
    const items = await response.json();
    set({ items });
  },

  submitReview: async (itemId, verdict, reasoning) => {
    await fetch(`/api/review-queue/${itemId}/review`, {
      method: 'POST',
      body: JSON.stringify({ verdict, reasoning })
    });

    // Refresh queue
    set(state => ({
      items: state.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: verdict === 'fake' ? 'disputed' : 'approved'
            }
          : item
      )
    }));
  },

  getApprovalStatus: (itemId: string) => {
    const item = useReviewQueueStore.getState().items.find(i => i.id === itemId);
    if (!item) return 'pending';

    const verdicts = item.reviewers.map(r => r.verdict);
    const genuine = verdicts.filter(v => v === 'genuine').length;
    const fake = verdicts.filter(v => v === 'fake').length;

    // Need 2+ Tier 2 approvals for "genuine"
    if (genuine >= 2) return 'unanimous';
    if (fake > 0) return 'disputed';
    return 'pending';
  }
}));
```

**UI Component:**
```typescript
// /components/ReviewQueueCard.tsx

export function ReviewQueueCard({ item }: { item: ReviewItem }) {
  const status = useReviewQueueStore(s =>
    s.getApprovalStatus(item.id)
  );

  return (
    <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
      <div className="flex justify-between">
        <div>
          <h4 className="font-semibold">{item.documentId}</h4>
          <p className="text-sm text-gray-600">
            Submitted {formatDistance(item.createdAt, new Date())} ago
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Display forensic signals */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          Deepfake Score: <span className="font-mono">
            {item.forensicSignals.deepfake_score}%
          </span>
        </div>
        <div>
          ELA Regions: <span className="font-mono">
            {item.forensicSignals.ela_regions?.length || 0}
          </span>
        </div>
      </div>

      {/* Review section */}
      <div className="mt-4 space-y-2">
        {item.reviewers.map(r => (
          <div key={r.userId} className="text-xs bg-white p-2 rounded">
            <span className="font-semibold">{r.verdict.toUpperCase()}:</span> {r.reasoning}
          </div>
        ))}
      </div>

      {/* My review button */}
      <ReviewButton itemId={item.id} />
    </div>
  );
}
```

---

### Pattern 8: Reputation Scoring for Reviewers

```typescript
// /lib/reputation.ts

interface ReviewAccuracy {
  correctVerifications: number;
  incorrectVerifications: number;
  overturned: number;
  accuracy: number; // 0-100
}

export async function calculateReviewerReputation(
  userId: string
): Promise<ReviewAccuracy> {
  const reviews = await db
    .from('reviews')
    .select('*')
    .eq('reviewer_id', userId);

  const verdicts = await Promise.all(
    reviews.data.map(async review => {
      // Did community consensus agree with this reviewer?
      const consensus = await getConsensusVerdict(review.item_id);

      return {
        correct: consensus === review.verdict,
        score: consensus === review.verdict ? 10 : -5
      };
    })
  );

  const score = verdicts.reduce((sum, v) => sum + v.score, 0);
  const accuracy = Math.round(
    (verdicts.filter(v => v.correct).length / verdicts.length) * 100
  );

  // Update reputation
  await db
    .from('user_profiles')
    .update({ reputation: score, review_accuracy: accuracy })
    .eq('id', userId);

  return {
    correctVerifications: verdicts.filter(v => v.correct).length,
    incorrectVerifications: verdicts.filter(v => !v.correct).length,
    overturned: 0,
    accuracy
  };
}
```

---

## III. DATABASE SCHEMA IMPLEMENTATION

### Create Forensics Tables

```sql
-- /docs/SPRINT_VISUAL_FORENSICS_MIGRATION.sql

-- Core forensics results
CREATE TABLE evidence_forensics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES evidence_archive(id) ON DELETE CASCADE,

  -- Image forensics
  exif_data JSONB,
  ela_detection JSONB, -- { editedRegions: [...] }
  reverse_search JSONB, -- { firstAppeared, instances, modifications }
  vision_labels JSONB, -- { objects, landmarks, safeSearch }

  -- Video forensics
  keyframes JSONB, -- { frameCount, extracted: [...] }
  deepfake_score FLOAT, -- 0-100
  deepfake_details JSONB, -- ensemble votes
  transcript TEXT,
  transcript_segments JSONB,

  -- Geolocation
  detected_location GEOMETRY(Point, 4326),
  location_confidence FLOAT,
  location_clues TEXT[],

  -- Analysis metadata
  analyzed_at TIMESTAMP,
  analyzer_version VARCHAR,
  processing_time_ms INT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evidence_forensics_evidence ON evidence_forensics(evidence_id);
CREATE INDEX idx_evidence_forensics_location ON evidence_forensics USING GIST(detected_location);

-- Community verdicts on forensic results
CREATE TABLE forensic_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forensic_id UUID REFERENCES evidence_forensics(id),
  reviewer_id UUID REFERENCES auth.users(id),

  verdict VARCHAR CHECK (verdict IN ('genuine', 'fake', 'ambiguous')),
  confidence FLOAT,
  reasoning TEXT,

  reputation_tier INT, -- 1-4, affects vote weight

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verdicts_forensic ON forensic_verdicts(forensic_id);
CREATE INDEX idx_verdicts_reviewer ON forensic_verdicts(reviewer_id);

-- Forensic analysis audit trail
CREATE TABLE forensic_analysis_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forensic_id UUID REFERENCES evidence_forensics(id),

  action VARCHAR, -- ANALYZED, DISPUTED, VERIFIED, REJECTED
  actor_id UUID REFERENCES auth.users(id),
  details JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE evidence_forensics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see forensics for their own network"
  ON evidence_forensics FOR SELECT
  USING (
    evidence_id IN (
      SELECT id FROM evidence_archive
      WHERE network_id IN (
        SELECT id FROM networks
        WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Tier 2+ can submit verdicts"
  ON forensic_verdicts FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    auth.jwt() ->> 'user_tier' >= '2'
  );
```

---

## IV. COST OPTIMIZATION

### How to Stay Under $1000/Month

```typescript
// /lib/forensics/cost-control.ts

interface AnalysisJob {
  documentId: string;
  mediaType: 'image' | 'video' | 'pdf';
  priority: 'free' | 'premium'; // users can pay for priority
}

export function selectAnalyzers(job: AnalysisJob) {
  // FREE TIER (included in GCP $300 credit):
  const freeAnalyzers = [
    'visionAPI',           // Google Vision (10K/month free)
    'documentAI',          // OCR (5K pages free)
    'whisper',             // Audio (open source, local)
    'exifTool',            // Metadata (open source)
    'katna'                // Keyframes (open source)
  ];

  // PAID TIER (for high-value evidence):
  const paidAnalyzers = [
    'tineEyeAPI',          // Reverse image search ($200-500/mo)
    'ampedsoftware',       // Professional forensics ($5K+)
    'sensityAI'            // Deepfake detection ($10K+)
  ];

  if (job.priority === 'premium') {
    return [...freeAnalyzers, ...paidAnalyzers];
  }

  // Budget mode: skip expensive tools
  return freeAnalyzers;
}

// Run analysis with cost tracking
export async function analyzeWithCostControl(
  job: AnalysisJob
): Promise<{ results: any; cost: number }> {
  const analyzers = selectAnalyzers(job);
  let totalCost = 0;

  // Vision API: $1.50 per 1000 calls, but 10K/month free
  if (analyzers.includes('visionAPI')) {
    totalCost += 0; // Free tier
  }

  // TinEye: $0.05 per search
  if (analyzers.includes('tineEyeAPI')) {
    totalCost += 0.05;
  }

  // Whisper: $0 (open source)
  if (analyzers.includes('whisper')) {
    totalCost += 0;
  }

  // ExifTool: $0
  if (analyzers.includes('exifTool')) {
    totalCost += 0;
  }

  return {
    results: await runAnalyzers(job, analyzers),
    cost: totalCost
  };
}
```

---

## V. COMMON PITFALLS & SOLUTIONS

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Blocking uploads on analysis** | 30-50% upload failure rate | Make analysis async (Pattern 1) |
| **Trusting AI verdict** | False positives on real evidence | Show confidence + require human review |
| **Exposing GPS in EXIF** | Privacy leak before stripping | Auto-warn + blur option (Pattern 2) |
| **Single reverse search tool** | Misses 30% of origins | Use TinEye + Google + Yandex |
| **Deepfake scores >90%** | Actually 15% false positive rate | Treat as signal, not verdict |
| **Community votes on technical data** | Crowds aren't experts | Weight by reputation + require Tier 2 |
| **Storing original + analyzed metadata** | GDPR issues + data bloat | Store only derived signals in quarantine |

---

## NEXT: PROTOTYPING ORDER

**Week 1:**
- [ ] Pattern 1: Auto-analysis on upload
- [ ] Pattern 2: Face blur
- [ ] Pattern 3: Exif extraction

**Week 2:**
- [ ] Pattern 4: Reverse image search
- [ ] Pattern 5: Whisper integration
- [ ] Update data_quarantine table

**Week 3:**
- [ ] Pattern 6: Deepfake detection (start with free InVID extension, add API later)
- [ ] Pattern 7: Review queue UI
- [ ] Test with Epstein network evidence

**Week 4:**
- [ ] Pattern 8: Reputation system
- [ ] Journalist feedback
- [ ] Polish + documentation

