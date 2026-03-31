# Visual Forensics Implementation Checklist for Project Truth
## Technical Integration Guide

**Purpose:** Quick reference for engineering team to implement forensic capabilities  
**Target Users:** Senior dev, forensics specialist, security team  
**Integration Timeline:** 6-12 weeks (MVP to production)

---

## PHASE 1: UPSTREAM SAFETY (Weeks 1-4)

### 1.1 CSAM Detection Integration

**Required Services:**
- [ ] Thorn Safer API account (or Hive for backup)
- [ ] NCMEC hash database access (free, requires ID verification)
- [ ] Cloudflare CSAM Scanning (built into Enterprise plan)
- [ ] Crisis hotline integration (UI widget)

**Code Structure:**
```typescript
// src/lib/csam.ts
import { checkHashAgainstNCMEC, reportToNCMEC } from '@thorn/api';
import crypto from 'crypto';

export async function isSuspectedCSAM(file: File): Promise<{
  isKnownCSAM: boolean;
  isSuspectedAI: boolean;
  confidence: number;
}> {
  const buffer = await file.arrayBuffer();
  const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
  
  // Check NCMEC database (most reliable)
  const knownCSAM = await checkHashAgainstNCMEC(hash);
  if (knownCSAM) {
    await reportToNCMEC(hash, getUserIP(), new Date());
    return { isKnownCSAM: true, isSuspectedAI: false, confidence: 1.0 };
  }
  
  // Check for synthetic/manipulated content (less reliable)
  const thornResult = await thornAnalyzeImage(buffer);
  return {
    isKnownCSAM: false,
    isSuspectedAI: thornResult.confidence > 0.6,
    confidence: thornResult.confidence
  };
}

// Upstream filter (before any human touches file)
async function uploadFileGateway(file: File, userId: string) {
  const csam = await isSuspectedCSAM(file);
  
  if (csam.isKnownCSAM) {
    logSecurityEvent('CSAM_DETECTED', { hash, userId, timestamp: new Date() });
    deleteFile(file);
    alertAdmins('CSAM detected and reported');
    throw new Error('This content violates platform policies');
  }
  
  if (csam.isSuspectedAI && csam.confidence > 0.8) {
    // Escalate to human expert, don't process
    flagForExpertReview(file, 'suspected_synthetic_csam', csam.confidence);
    throw new Error('Content flagged for review');
  }
  
  // Safe to process
  return processFile(file, userId);
}
```

**API Route:**
```typescript
// src/app/api/upload/check-csam/route.ts
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  const result = await isSuspectedCSAM(file);
  
  if (result.isKnownCSAM || result.confidence > 0.8) {
    // Log incident
    await supabase
      .from('security_incidents')
      .insert({
        type: 'csam_detection',
        severity: 'critical',
        details: { confidence: result.confidence },
        resolved: false
      });
    
    return Response.json({ blocked: true }, { status: 403 });
  }
  
  return Response.json({ blocked: false });
}
```

**Testing:**
- [ ] Test with known CSAM hash (NCMEC test suite)
- [ ] Test with clean images (ensure no false positives)
- [ ] Test with synthetic images (different models)
- [ ] Verify reporting to NCMEC works
- [ ] Verify incident logging in database

---

### 1.2 Content Warning System

**UI Component:**
```typescript
// src/components/ContentWarning.tsx
interface ContentWarningProps {
  contentType: 'violence' | 'exploitation' | 'graphic' | 'death';
  severity: 1 | 2 | 3; // 1=mild, 3=severe
  userHistory?: string[];
}

export function ContentWarning({ contentType, severity, userHistory }: ContentWarningProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const shouldShow = severity >= 2 || userHistory?.includes(contentType);
  
  if (!shouldShow) return <>{children}</>;
  
  return (
    <div className="border-l-4 border-red-600 bg-red-50 p-4 rounded">
      <div className="font-bold text-red-900">Content Warning</div>
      <p className="text-red-800 mt-2">
        This material contains {contentType === 'exploitation' ? 'depiction of child exploitation' : contentType}
      </p>
      
      {userHistory && userHistory.length > 2 && (
        <p className="text-red-700 mt-2 text-sm">
          You've declined similar content {userHistory.length} times recently.
          Consider taking a break or switching to lighter tasks.
        </p>
      )}
      
      <div className="mt-4 flex gap-4">
        <button onClick={() => setAcknowledged(true)} className="bg-red-600 text-white px-4 py-2 rounded">
          I'm Ready
        </button>
        <button className="border border-red-600 text-red-600 px-4 py-2 rounded">
          Assign to Someone Else
        </button>
        <a href="/wellness/crisis" className="border border-red-600 text-red-600 px-4 py-2 rounded">
          Talk to Counselor
        </a>
      </div>
    </div>
  );
}
```

---

## PHASE 2: FORENSIC TOOLS (Weeks 5-8)

### 2.1 EXIF Extraction & Analysis

**Implementation:**
```typescript
// src/lib/exif.ts
import ExifParser from 'exif-parser';

export async function extractEXIF(file: File) {
  const buffer = await file.arrayBuffer();
  const parser = new ExifParser(buffer);
  const result = parser.parse();
  
  return {
    timestamp: result.tags?.DateTime || null,
    gps: result.tags?.GPSLatitude && result.tags?.GPSLongitude ? {
      lat: result.tags.GPSLatitude,
      lng: result.tags.GPSLongitude
    } : null,
    camera: result.tags?.Model,
    software: result.tags?.Software,
    orientation: result.tags?.Orientation,
    thumbnail: result.thumbnail ? Buffer.from(result.thumbnail).toString('base64') : null
  };
}

// Red flags for forensics
export function analyzeEXIFAnomalies(exif: any, claimedDate: Date): string[] {
  const flags: string[] = [];
  
  if (exif.timestamp && Math.abs(new Date(exif.timestamp) - claimedDate) > 86400000) {
    flags.push(`TIMESTAMP_DISCREPANCY: EXIF shows ${exif.timestamp}, claim is ${claimedDate}`);
  }
  
  if (exif.software && !exif.software.match(/Canon|Nikon|Sony|iPhone|Pixel/)) {
    flags.push(`UNUSUAL_SOFTWARE: ${exif.software} (possible edit/generation)`);
  }
  
  if (!exif.gps && !exif.camera && !exif.orientation) {
    flags.push(`METADATA_STRIPPED: No camera data (common for official/scanned docs)`);
  }
  
  return flags;
}
```

**Database Storage:**
```sql
-- extensions/forensics.sql
CREATE TABLE image_forensics (
  id UUID PRIMARY KEY,
  image_id UUID REFERENCES evidence_archive(id),
  exif_data JSONB,
  anomalies TEXT[],
  ela_heatmap_url TEXT,
  shadow_analysis JSONB,
  geolocation_landmarks TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_image_forensics_image_id ON image_forensics(image_id);
```

---

### 2.2 Error Level Analysis (ELA) Integration

**Service Integration:**
```typescript
// src/lib/forensics/ela.ts
import fetch from 'node-fetch';
import FormData from 'form-data';

export async function analyzeWithELA(imageBuffer: Buffer): Promise<{
  heatmapUrl: string;
  anomalyRegions: { x: number; y: number; width: number; height: number; confidence: number }[];
  overallScore: number; // 0-1, 0=authentic, 1=likely edited
}> {
  // Use FotoForensics API
  const formData = new FormData();
  formData.append('image', imageBuffer, 'image.jpg');
  
  const response = await fetch('https://www.fotoforensics.com/api/ela/', {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });
  
  const result = await response.json();
  
  // Parse heatmap + extract suspicious regions
  return {
    heatmapUrl: result.heatmapUrl,
    anomalyRegions: detectBrightRegions(result.heatmap),
    overallScore: calculateForensicScore(result)
  };
}

function detectBrightRegions(heatmap: number[][]): Array<{x; y; width; height; confidence}> {
  // Scan heatmap for regions with compression artifact variance
  // Bright = likely edited
  const regions = [];
  const threshold = 200; // 0-255 scale
  
  for (let y = 0; y < heatmap.length; y += 32) {
    for (let x = 0; x < heatmap[0].length; x += 32) {
      const regionBrightness = heatmap.slice(y, y+32)
        .flatMap(row => row.slice(x, x+32))
        .reduce((a, b) => a + b) / (32 * 32);
      
      if (regionBrightness > threshold) {
        regions.push({
          x, y,
          width: 32, height: 32,
          confidence: regionBrightness / 255
        });
      }
    }
  }
  
  return regions;
}
```

---

### 2.3 Shadow Analysis (Bellingcat-Style Geolocation)

**Algorithm:**
```typescript
// src/lib/forensics/shadow-analysis.ts
export function analyzeShadowAngle(
  imageUrl: string,
  latitude: number,
  longitude: number,
  claimedTimestamp: Date
) {
  // 1. Extract shadows from image (OpenCV or ML model)
  const shadows = detectShadows(imageUrl);
  
  // 2. Measure shadow angle + length
  const shadowVector = calculateShadowVector(shadows);
  
  // 3. Calculate sun position at location/time
  const sunEphemeris = calculateSunPosition(latitude, longitude, claimedTimestamp);
  
  // 4. Compare: does shadow angle match sun position?
  const expectedShadowAngle = sunEphemeris.azimuth + 180; // opposite of sun
  const angleDifference = Math.abs(normalizeAngle(shadowVector.angle - expectedShadowAngle));
  
  return {
    isShadowConsistent: angleDifference < 15, // tolerance = 15 degrees
    expectedTime: calculateTimeFromSunPosition(shadowVector.angle),
    claimedTime: claimedTimestamp,
    timeDifference: calculateTimeDifference(expectedTime, claimedTime),
    confidence: 1 - (angleDifference / 180) // higher = more confident
  };
}

function calculateSunPosition(lat: number, lng: number, date: Date) {
  // Use SPA (Solar Position Algorithm) or library
  // Inputs: latitude, longitude, precise date/time
  // Outputs: sun altitude angle + azimuth angle
  
  // Example using solar-calc library
  const SolarCalc = require('solar-calc');
  const calc = new SolarCalc(date, lat, lng);
  
  return {
    altitude: calc.getAltitude(), // degrees above horizon
    azimuth: calc.getAzimuth()     // compass direction (0=N, 90=E, 180=S, 270=W)
  };
}
```

**UI for Reviewer:**
```typescript
// src/components/ShadowAnalysisPanel.tsx
export function ShadowAnalysisPanel({ imageUrl, geolocation, claimedTime }) {
  const analysis = analyzeShadowAngle(imageUrl, geolocation.lat, geolocation.lng, claimedTime);
  
  return (
    <div className="border border-blue-300 rounded p-4">
      <h3 className="font-bold">Shadow Analysis</h3>
      
      <div className="mt-2 bg-blue-50 p-3 rounded text-sm">
        <p>Claimed time: {claimedTime.toLocaleString()}</p>
        <p>Expected time (from shadows): {analysis.expectedTime.toLocaleString()}</p>
        <p className={analysis.isShadowConsistent ? 'text-green-700' : 'text-red-700'}>
          {analysis.isShadowConsistent ? '✓ Consistent' : '✗ Discrepancy: ' + 
           analysis.timeDifference.hours + 'h ' + analysis.timeDifference.minutes + 'm difference'}
        </p>
      </div>
      
      {/* Display shadow overlay visualization */}
      <ShadowVisualization imageUrl={imageUrl} analysis={analysis} />
      
      {/* Reviewer question */}
      <div className="mt-4 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
        <p className="font-bold">Your Analysis:</p>
        <select className="w-full p-2 border rounded mt-2">
          <option value="">-- Select --</option>
          <option value="consistent">Consistent with claimed time</option>
          <option value="morning">Suggests morning (earlier than claimed)</option>
          <option value="evening">Suggests evening (later than claimed)</option>
          <option value="unclear">Unclear / Unable to determine</option>
        </select>
      </div>
    </div>
  );
}
```

---

## PHASE 3: GAMIFICATION & QUALITY CONTROL (Weeks 9-12)

### 3.1 Calibration Question System

**Database Schema:**
```sql
CREATE TABLE calibration_questions (
  id UUID PRIMARY KEY,
  question_text TEXT NOT NULL,
  image_url TEXT,
  question_type TEXT, -- metadata, shadow, landmark, forgery
  difficulty INT (1-3),
  correct_answer TEXT,
  expert_annotations JSONB,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviewer_calibration_history (
  id UUID PRIMARY KEY,
  reviewer_id UUID REFERENCES auth.users(id),
  question_id UUID REFERENCES calibration_questions(id),
  reviewer_answer TEXT,
  is_correct BOOLEAN,
  confidence_score REAL,
  time_taken_seconds INT,
  answered_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviewer_accuracy ON reviewer_calibration_history(reviewer_id, is_correct);
```

**Implementation:**
```typescript
// src/lib/calibration.ts
export async function scoreCalibrationResponse(
  reviewerId: string,
  questionId: string,
  reviewerAnswer: string
): Promise<{
  isCorrect: boolean;
  feedback: string;
  partialCredit?: number;
  skillAssessment: Record<string, number>; // skill -> accuracy %
}> {
  const question = await supabase
    .from('calibration_questions')
    .select('*')
    .eq('id', questionId)
    .single();
  
  // 1. Exact match
  if (reviewerAnswer === question.correct_answer) {
    return {
      isCorrect: true,
      feedback: 'CORRECT! ' + question.expert_feedback,
      skillAssessment: await calculateSkillGains(reviewerId, question.question_type, true)
    };
  }
  
  // 2. Fuzzy match (for open-ended answers)
  const similarity = stringSimilarity(reviewerAnswer, question.correct_answer);
  if (similarity > 0.7) {
    return {
      isCorrect: true,
      feedback: 'CORRECT! (Partial match)',
      partialCredit: similarity,
      skillAssessment: await calculateSkillGains(reviewerId, question.question_type, true)
    };
  }
  
  // 3. Incorrect
  return {
    isCorrect: false,
    feedback: 'Incorrect. Expected: ' + question.correct_answer + '. ' + question.expert_feedback,
    skillAssessment: await calculateSkillGains(reviewerId, question.question_type, false)
  };
}

async function calculateSkillGains(reviewerId: string, skillType: string, correct: boolean) {
  const history = await supabase
    .from('reviewer_calibration_history')
    .select('is_correct')
    .eq('reviewer_id', reviewerId)
    .match({ question_type: skillType });
  
  const correct_count = history.filter(h => h.is_correct).length;
  const accuracy = correct_count / history.length;
  
  return {
    [skillType]: accuracy * 100
  };
}
```

**UI for Reviewer:**
```typescript
// src/components/EvidenceReviewTask.tsx
export function EvidenceReviewTask({ task }: { task: ReviewTask }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<null | any>(null);
  
  async function handleSubmit() {
    // Check if this is a calibration question (20% of tasks)
    const isCalibration = Math.random() < 0.2;
    
    if (isCalibration) {
      const result = await scoreCalibrationResponse(
        userId,
        task.id,
        userAnswer
      );
      
      setFeedback({
        ...result,
        type: 'calibration',
        xpGained: result.isCorrect ? 15 : -5
      });
      
      // Show skill assessment
      console.log('Your shadow analysis accuracy: ' + result.skillAssessment.shadow + '%');
    } else {
      // Regular evidence review (send to database for expert review)
      await recordEvidenceAnnotation(task.id, userAnswer);
      setFeedback({
        type: 'submitted',
        message: 'Thank you! Expert will review your analysis.'
      });
    }
  }
  
  return (
    <div>
      {!feedback && (
        <div>
          {/* Display evidence */}
          <EvidenceDisplay evidence={task.evidence} />
          
          {/* Ask question */}
          <div className="mt-4 bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
            <p className="font-bold">{task.question}</p>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full p-2 border rounded mt-2 h-24"
              placeholder="Type your analysis..."
            />
            <button onClick={handleSubmit} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
              Submit Analysis
            </button>
          </div>
        </div>
      )}
      
      {feedback && (
        <FeedbackPanel feedback={feedback} onContinue={() => {/* next task */}} />
      )}
    </div>
  );
}
```

---

### 3.2 XP & Leaderboard System

**Database:**
```sql
CREATE TABLE reviewer_stats (
  reviewer_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_xp INT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  accuracy_pct REAL,
  current_streak INT DEFAULT 0,
  longest_streak INT,
  last_review_date DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leaderboard (
  week_start DATE,
  reviewer_id UUID,
  xp_earned INT,
  reviews_completed INT,
  accuracy REAL,
  rank INT,
  PRIMARY KEY (week_start, reviewer_id)
);

CREATE INDEX idx_leaderboard_rank ON leaderboard(week_start, rank);
```

**XP Calculation:**
```typescript
export async function awardXP(
  reviewerId: string,
  action: 'review' | 'correct' | 'first_discovery' | 'calibration_train',
  metadata?: any
): Promise<number> {
  const xpMap = {
    review: 10,
    correct: 15,
    first_discovery: 25,
    calibration_train: 50
  };
  
  const xpGained = xpMap[action];
  
  // Update stats
  await supabase
    .from('reviewer_stats')
    .update({
      total_xp: (await getReviewerStats(reviewerId)).total_xp + xpGained,
      total_reviews: increment(),
      updated_at: new Date()
    })
    .eq('reviewer_id', reviewerId);
  
  // Update weekly leaderboard
  const weekStart = getWeekStart(new Date());
  await upsertLeaderboardEntry(reviewerId, weekStart, xpGained);
  
  return xpGained;
}
```

---

## PHASE 4: MENTAL HEALTH INFRASTRUCTURE (Weeks 10-12 parallel)

### 4.1 Mental Health Dashboard

**UI Component:**
```typescript
// src/components/WellnessDashboard.tsx
export function WellnessDashboard({ reviewerId }: { reviewerId: string }) {
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    // Fetch wellness metrics
    supabase
      .from('reviewer_wellness_logs')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .order('logged_at', { ascending: false })
      .limit(30)
      .then(data => {
        // Calculate trends
        const sleepTrend = calculateTrend(data.map(d => d.sleep_quality));
        const anxietyTrend = calculateTrend(data.map(d => d.anxiety_level));
        
        setStats({
          sleepQuality: data[0].sleep_quality,
          sleepTrend,
          anxietyLevel: data[0].anxiety_level,
          anxietyTrend,
          intrusiveThoughts: data.filter(d => d.intrusive_thoughts).length,
          daysSinceBreak: calculateDaysSinceBreak(data),
          recommendedAction: getRecommendation(sleepTrend, anxietyTrend)
        });
      });
  }, []);
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Sleep Quality */}
      <Card>
        <CardTitle>Sleep Quality</CardTitle>
        <div className="text-3xl font-bold">{stats.sleepQuality}/10</div>
        <TrendIndicator trend={stats.sleepTrend} />
      </Card>
      
      {/* Anxiety Level */}
      <Card className={stats.anxietyLevel > 7 ? 'border-2 border-red-500' : ''}>
        <CardTitle>Anxiety Level</CardTitle>
        <div className="text-3xl font-bold">{stats.anxietyLevel}/10</div>
        {stats.anxietyLevel > 7 && (
          <p className="text-red-600 text-sm mt-2">
            ⚠️ Your anxiety increased 30% this week. Consider taking 2 days off.
          </p>
        )}
      </Card>
      
      {/* Intrusive Thoughts */}
      <Card>
        <CardTitle>Intrusive Thoughts</CardTitle>
        <div>{stats.intrusiveThoughts} incidents this month</div>
        <a href="/wellness/counselor" className="text-blue-600 text-sm mt-2">
          Talk to counselor
        </a>
      </Card>
      
      {/* Break Recommendation */}
      {stats.daysSinceBreak > 14 && (
        <Card className="border-2 border-orange-500">
          <CardTitle>Recommended Break</CardTitle>
          <p>You haven't taken a break in {stats.daysSinceBreak} days.</p>
          <button className="mt-2 bg-orange-600 text-white px-3 py-1 rounded text-sm">
            Schedule Break
          </button>
        </Card>
      )}
    </div>
  );
}
```

---

## PHASE 5: TESTING & VALIDATION (Weeks 13-16)

### 5.1 Accuracy Baseline Testing

**Test Protocol:**
```typescript
// scripts/test-reviewer-accuracy.ts
async function runAccuracyTests() {
  const testSet = [
    {
      imageId: 'cal-001',
      type: 'metadata_anomaly',
      expectedAnswer: 'metadata_stripped',
      difficulty: 1,
      experts: ['Dr. Smith', 'Agent Jones'] // baseline
    },
    {
      imageId: 'cal-025',
      type: 'shadow_analysis',
      expectedAnswer: 'afternoon_6pm',
      difficulty: 2
    },
    // ... 30+ test cases
  ];
  
  const reviewers = await supabase.from('auth.users').select('id').neq('role', 'admin');
  
  for (const reviewer of reviewers) {
    const results = [];
    
    for (const test of testSet) {
      // Get reviewer's answer (simulate real task)
      const answer = await getReviewerAnswer(reviewer.id, test.imageId);
      
      const isCorrect = answer === test.expectedAnswer;
      const accuracy = calculateAccuracy(results);
      
      results.push({
        testId: test.imageId,
        reviewerId: reviewer.id,
        isCorrect,
        difficulty: test.difficulty,
        timestamp: new Date()
      });
    }
    
    // Report: Each reviewer's baseline accuracy
    console.log(`${reviewer.id}: ${calculateAccuracy(results).toFixed(1)}% accuracy`);
    
    // Flag if below threshold
    if (calculateAccuracy(results) < 0.60) {
      await supabase
        .from('reviewer_flags')
        .insert({
          reviewer_id: reviewer.id,
          reason: 'low_accuracy_baseline',
          severity: 'warning'
        });
    }
  }
}
```

---

## DEPLOYMENT CHECKLIST

- [ ] CSAM detection working (test with known hash)
- [ ] Content warnings display correctly
- [ ] EXIF extraction accurate
- [ ] ELA integration returns heatmaps
- [ ] Calibration questions scoring correctly
- [ ] XP awards registering
- [ ] Leaderboard calculating ranks
- [ ] Mental health dashboard pulling data
- [ ] Counselor chat widget functional
- [ ] All forensic data logging to audit trail
- [ ] Production keys configured (Thorn, NCMEC, etc.)
- [ ] Incident response playbook documented
- [ ] Legal review completed (defamation liability)
- [ ] Security audit passed (penetration testing)
- [ ] Beta testing with 5-10 reviewers (2 weeks)
- [ ] Final incident response drill

