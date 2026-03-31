# DOCUMENT PIPELINE IMPLEMENTATION GUIDE
## Ready-to-Implement Code for Project Truth

**Date:** March 22, 2026
**Audience:** Engineering team (Raşit, Alperen, Nebi)
**Status:** Production-ready code samples

---

## QUICK START: Add to Project Truth (30 Minute Integration)

### Step 1: Add Deduplication Check

```typescript
// src/lib/documentDeduplication.ts

import crypto from 'crypto';

export async function checkDocumentDuplicate(
  buffer: Buffer,
  supabaseAdmin: SupabaseClient
): Promise<{ isDuplicate: boolean; duplicateOf?: string; confidence: number }> {
  // Compute hash
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // Check exact matches
  const { data: exactMatches } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('content_hash', sha256)
    .limit(1);

  if (exactMatches && exactMatches.length > 0) {
    return {
      isDuplicate: true,
      duplicateOf: exactMatches[0].id,
      confidence: 1.0,
    };
  }

  // Check text similarity (for PDFs with different compression)
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, raw_text')
    .limit(50);

  if (docs && docs.length > 0) {
    const newText = await extractTextFromBuffer(buffer);
    for (const doc of docs) {
      const similarity = textSimilarity(newText, doc.raw_text || '');
      if (similarity > 0.95) {
        return {
          isDuplicate: true,
          duplicateOf: doc.id,
          confidence: similarity,
        };
      }
    }
  }

  return { isDuplicate: false, confidence: 0 };
}

function textSimilarity(text1: string, text2: string): number {
  const norm1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();

  if (norm1 === norm2) return 1.0;

  // Compute Jaccard similarity (simple token-based)
  const tokens1 = new Set(norm1.split(' '));
  const tokens2 = new Set(norm2.split(' '));
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;

  return intersection / union;
}
```

### Step 2: Add to Document Upload Route

```typescript
// src/app/api/documents/manual-upload/route.ts (modify POST handler)

export async function POST(req: NextRequest) {
  // ... existing validation code ...

  // ADD THIS:
  const { isDuplicate, duplicateOf, confidence } = await checkDocumentDuplicate(
    fileBuffer,
    supabaseAdmin
  );

  if (isDuplicate && confidence > 0.95) {
    return NextResponse.json({
      error: `This document is already in our system (${duplicateOf}). Skipping duplicate.`,
      status: 'duplicate',
      duplicateOf,
    }, { status: 409 });
  }

  // ... continue with rest of upload ...
}
```

### Step 3: Add Monitoring Endpoint

```typescript
// src/app/api/documents/pipeline-health/route.ts (NEW FILE)

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, scan_status, ocr_confidence, file_size, created_at, extracted_entities');

  const now = Date.now();
  const stats = {
    total: docs?.length || 0,
    scanned: (docs || []).filter(d => d.scan_status === 'scanned').length,
    dlq: (docs || []).filter(d => d.scan_status === 'dlq').length,
    failed: (docs || []).filter(d => d.scan_status === 'failed').length,
    pending: (docs || []).filter(d => !['scanned', 'dlq', 'failed'].includes(d.scan_status as string)).length,
    avgOCRConfidence: (docs || []).reduce((sum, d) => sum + ((d.ocr_confidence as number) || 0.5), 0) / Math.max(docs?.length || 1, 1),
    avgProcessingTime: calculateAverageTime(docs || []),
    costPerDoc: 0.0015 * 15,  // $0.0015 per page × avg 15 pages
    health: 'healthy' as 'healthy' | 'degraded' | 'critical',
  };

  // Determine health status
  const failureRate = stats.dlq / stats.total;
  if (failureRate > 0.2) {
    stats.health = 'critical';
  } else if (failureRate > 0.1 || stats.avgOCRConfidence < 0.7) {
    stats.health = 'degraded';
  }

  return NextResponse.json(stats);
}

function calculateAverageTime(docs: any[]): number {
  const times = docs
    .filter(d => d.created_at)
    .map(d => new Date(d.updated_at || d.created_at).getTime() - new Date(d.created_at).getTime());

  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
}
```

---

## INTERMEDIATE: Compound Documents

For PDFs with multiple documents inside:

```typescript
// src/lib/compoundDocuments.ts

import { pdf } from 'pdf-parse';

export interface DocumentSection {
  title: string;
  pages: number[];
  type: 'main' | 'exhibit' | 'appendix';
}

export async function detectDocumentSections(
  pdfBuffer: Buffer
): Promise<DocumentSection[]> {
  const data = await pdf(pdfBuffer);
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection | null = null;

  for (let pageNum = 0; pageNum < data.pages.length; pageNum++) {
    const pageText = data.pages[pageNum].text || '';

    // Detect new section
    if (pageText.match(/^EXHIBIT\s+([A-Z0-9]+)/im)) {
      if (currentSection) sections.push(currentSection);
      const match = pageText.match(/^EXHIBIT\s+([A-Z0-9]+)/im);
      currentSection = {
        title: `Exhibit ${match?.[1] || ''}`,
        pages: [pageNum],
        type: 'exhibit',
      };
    } else if (pageText.match(/^TABLE OF CONTENTS|^APPENDIX/im)) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: 'Main Document',
        pages: [pageNum],
        type: 'main',
      };
    } else if (currentSection) {
      currentSection.pages.push(pageNum);
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections.length > 0 ? sections : [{ title: 'Document', pages: Array.from({ length: data.pages.length }, (_, i) => i), type: 'main' }];
}

export async function splitCompoundDocument(
  pdfBuffer: Buffer,
  parentDocId: string,
  supabaseAdmin: SupabaseClient
): Promise<string[]> {
  const sections = await detectDocumentSections(pdfBuffer);

  if (sections.length === 1) {
    return [parentDocId];  // Not compound
  }

  const createdIds: string[] = [parentDocId];

  // Create child documents for exhibits
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];

    // Extract pages for this section
    const childPDF = await extractPagesFromPDF(pdfBuffer, section.pages);

    // Create document record
    const { data: childDoc } = await supabaseAdmin
      .from('documents')
      .insert({
        title: `${/* parent title */} - ${section.title}`,
        parent_document_id: parentDocId,
        page_range: `[${section.pages[0]}, ${section.pages[section.pages.length - 1]})`,
        document_type: section.type === 'exhibit' ? 'exhibit' : 'document',
        scan_status: 'pending',
      })
      .select('id')
      .single();

    if (childDoc?.id) {
      createdIds.push(childDoc.id);
    }
  }

  return createdIds;
}
```

---

## ADVANCED: Cost Optimization

Only full-OCR high-value documents:

```typescript
// src/lib/processingStrategy.ts

export async function determineProcessingStrategy(
  document: Document
): Promise<'full' | 'metadata_only' | 'skip'> {
  // Quick classification
  const { documentType, confidence } = await quickClassify(document);

  // High-value documents always get full treatment
  if (['court_filing', 'fbi_report', 'deposition'].includes(documentType) && confidence > 0.8) {
    return 'full';  // Cost: ~$0.02
  }

  // Medium-value documents
  if (confidence > 0.5) {
    return 'metadata_only';  // Cost: ~$0.00
  }

  // Low-value documents
  if (confidence < 0.3) {
    return 'skip';  // Cost: $0.00
  }

  return 'metadata_only';  // Default
}

async function quickClassify(doc: Document): Promise<{ documentType: string; confidence: number }> {
  // Use filename + metadata only (no OCR needed)
  const title = (doc.title || '').toLowerCase();
  const description = (doc.description || '').toLowerCase();
  const combined = `${title} ${description}`;

  if (combined.includes('court') || combined.includes('complaint') || combined.includes('indictment')) {
    return { documentType: 'court_filing', confidence: 0.9 };
  }
  if (combined.includes('fbi') || combined.includes('declassified')) {
    return { documentType: 'fbi_report', confidence: 0.95 };
  }
  if (combined.includes('deposition') || combined.includes('testimony')) {
    return { documentType: 'deposition', confidence: 0.85 };
  }

  return { documentType: 'unknown', confidence: 0.3 };
}
```

### Add to Process Wave Route

```typescript
// src/app/api/documents/process-wave/route.ts (modify POST)

const strategy = await determineProcessingStrategy(document);

switch (strategy) {
  case 'full':
    await ocrWithDocumentAI(document);
    await extractWithGroq(document);
    break;

  case 'metadata_only':
    // Just extract from metadata, no OCR
    await extractFromMetadata(document);
    break;

  case 'skip':
    // Move to quarantine without processing
    await supabaseAdmin
      .from('documents')
      .update({ scan_status: 'low_value', processed_at: new Date() })
      .eq('id', document.id);
    break;
}
```

---

## DATABASE SCHEMA ADDITIONS

```sql
-- Add deduplication and monitoring fields
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id),
  ADD COLUMN IF NOT EXISTS page_range INT4RANGE,
  ADD COLUMN IF NOT EXISTS dlq_reason TEXT,
  ADD COLUMN IF NOT EXISTS dlq_attempts INT DEFAULT 0;

-- Create index for deduplication
CREATE INDEX idx_documents_content_hash ON documents(content_hash);
CREATE INDEX idx_documents_parent_id ON documents(parent_document_id);

-- Dead Letter Queue table
CREATE TABLE IF NOT EXISTS document_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  reason TEXT NOT NULL,
  last_attempt TIMESTAMP DEFAULT now(),
  attempts INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  assigned_to UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_document_dlq_reason ON document_dlq(reason);
CREATE INDEX idx_document_dlq_document_id ON document_dlq(document_id);

-- Metrics rollup (for dashboard)
CREATE TABLE IF NOT EXISTS pipeline_metrics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour TIMESTAMP NOT NULL,
  documents_added INT,
  documents_scanned INT,
  avg_ocr_confidence FLOAT,
  avg_processing_time_ms FLOAT,
  dlq_count INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_metrics_hourly_time ON pipeline_metrics_hourly(hour DESC);
```

---

## MONITORING DASHBOARD (React Component)

```typescript
// src/components/PipelineMonitoring.tsx

import React, { useEffect, useState } from 'react';
import { BarChart, LineChart, PieChart } from 'recharts';

export function PipelineMonitoring() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/documents/pipeline-health');
      const data = await res.json();
      setStats(data);
      setLoading(false);
    }, 5000);  // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>Error loading metrics</div>;

  const statusColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Health Status */}
      <div className={`p-4 rounded text-white ${statusColor[stats.health]}`}>
        <h2 className="text-xl font-bold">Pipeline Status: {stats.health.toUpperCase()}</h2>
        <p>Documents: {stats.total} | Scanned: {stats.scanned} | DLQ: {stats.dlq} | Failed: {stats.failed}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard title="Avg OCR Confidence" value={`${(stats.avgOCRConfidence * 100).toFixed(1)}%`} />
        <MetricCard title="Avg Processing Time" value={`${(stats.avgProcessingTime / 1000).toFixed(1)}s`} />
        <MetricCard title="Cost per Document" value={`$${stats.costPerDoc.toFixed(4)}`} />
        <MetricCard title="Success Rate" value={`${((stats.scanned / stats.total) * 100).toFixed(1)}%`} />
      </div>

      {/* Progress Pie Chart */}
      <div>
        <h3>Processing Status</h3>
        <PieChart width={400} height={300} data={[
          { name: 'Scanned', value: stats.scanned },
          { name: 'Pending', value: stats.pending },
          { name: 'DLQ', value: stats.dlq },
          { name: 'Failed', value: stats.failed },
        ]} />
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded p-4">
      <h4 className="text-gray-600 text-sm">{title}</h4>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

---

## CRON JOB: Move to DLQ After 3 Failures

```typescript
// src/app/api/documents/dlq-sweep/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Scheduled cron job (runs every hour)
 * Moves permanently failed documents to DLQ
 * Configure with: vercel.json or external cron service
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find documents with 3+ failures
  const { data: failedDocs } = await supabaseAdmin
    .from('documents')
    .select('id, scan_status, dlq_attempts, updated_at')
    .eq('scan_status', 'failed')
    .gt('dlq_attempts', 2)
    .lt('updated_at', new Date(Date.now() - 3600000).toISOString());  // Older than 1 hour

  const moveToDLQCount = failedDocs?.length || 0;

  // Move to DLQ
  for (const doc of failedDocs || []) {
    await supabaseAdmin
      .from('document_dlq')
      .insert({
        document_id: doc.id,
        reason: 'max_retries_exceeded',
        attempts: doc.dlq_attempts,
        last_attempt: new Date(),
      });

    await supabaseAdmin
      .from('documents')
      .update({ scan_status: 'dlq' })
      .eq('id', doc.id);
  }

  return NextResponse.json({
    success: true,
    movedToDLQ: moveToDLQCount,
    message: `Moved ${moveToDLQCount} documents to DLQ`,
  });
}
```

---

## TESTING: Quick Verification

```typescript
// test/documentPipeline.test.ts

import { checkDocumentDuplicate } from '@/lib/documentDeduplication';
import { detectDocumentSections } from '@/lib/compoundDocuments';
import { determineProcessingStrategy } from '@/lib/processingStrategy';

describe('Document Pipeline', () => {
  test('detects exact duplicates', async () => {
    const buffer = Buffer.from('test pdf content');
    const result = await checkDocumentDuplicate(buffer, mockSupabase);
    expect(result.isDuplicate).toBe(true);
  });

  test('handles compound documents', async () => {
    const buffer = await readFile('sample-compound.pdf');
    const sections = await detectDocumentSections(buffer);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.some(s => s.type === 'exhibit')).toBe(true);
  });

  test('routes court filings to full processing', async () => {
    const doc = { title: 'COMPLAINT', description: 'Federal court filing' };
    const strategy = await determineProcessingStrategy(doc as any);
    expect(strategy).toBe('full');
  });

  test('skips low-confidence documents', async () => {
    const doc = { title: 'unknown', description: '' };
    const strategy = await determineProcessingStrategy(doc as any);
    expect(strategy).toBe('skip');
  });
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] Add `CRON_SECRET` environment variable (32 random chars)
- [ ] Set up hourly cron job (Vercel, AWS Lambda, or external)
- [ ] Create Supabase tables (SQL schema above)
- [ ] Add deduplication library to project
- [ ] Update document upload route with dedup check
- [ ] Deploy pipeline health endpoint
- [ ] Add monitoring dashboard to admin panel
- [ ] Set up alerting (email/Slack on critical failures)
- [ ] Test with sample documents (court filings, PDFs, images)
- [ ] Monitor for 48 hours before scaling

---

## NEXT PRIORITIES

1. **This week:** Deduplication + health endpoint (30 min each)
2. **Next week:** Compound document handler (2 hours)
3. **Sprint 20:** Cost optimization (1 hour)
4. **Sprint 21:** Advanced monitoring dashboard (3 hours)

