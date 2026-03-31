# PROJECT TRUTH - SECURITY FIX CHECKLIST

**Audit Date:** March 11, 2026
**Auditor:** Claude AI Security Audit Agent
**Status:** 🔴 BLOCKING SHIP - DO NOT DEPLOY WITHOUT FIXES

---

## 🔴 CRITICAL FIXES (Must complete before any production deployment)

### ✅ Fix #B1: Server-side Shard Encryption (COMPLETED)

**File:** `/apps/dashboard/src/app/api/collective-dms/route.ts`
**Status:** ✅ IMPLEMENTED
**Date Completed:** 11 March 2026

**What was implemented:**
- `deriveShardEncryptionKey()` — HMAC-SHA256 key derivation from SHARD_ENCRYPTION_KEY or SESSION_SECRET
- `encryptShardForStorage()` — AES-256-GCM encryption with random IV (IV prepended to ciphertext, base64 encoded)
- `decryptShardFromStorage()` — AES-256-GCM decryption (reverses the storage format)
- Automatic encryption in `create` action — all shard_data encrypted before Supabase insert
- Exported functions for use in cron/voice API routes

**Security properties:**
- Shards encrypted at rest in database (plaintext breach no longer exposes raw shards)
- Server-side key derivation prevents client-side key leakage
- Random IV per shard prevents deterministic encryption
- AES-256-GCM provides authenticated encryption (AEAD)

**Design:**
```
Client sends plaintext shard_data (hex) to /api/collective-dms with action: create
↓
Server calls encryptShardForStorage(shard_data)
  → Derives key: HMAC-SHA256(SHARD_ENCRYPTION_KEY, 'shard_encryption_v1')
  → Generates random IV (12 bytes)
  → Encrypts shard with AES-256-GCM
  → Returns base64(IV + ciphertext)
↓
Database stores encrypted data
↓
On red alarm (future): decryptShardFromStorage() reverses process
```

**Tests pending:**
- [ ] Encryption/decryption round-trip with various shard sizes
- [ ] IV uniqueness across multiple encryptions
- [ ] Key derivation consistency (HMAC always produces same key from same env var)
- [ ] Base64 encoding/decoding correctness
- [ ] Integration with Shamir combine during red alarm

---

### Fix #1: RLS Policies - Kolektif Kalkan (Bulgu #3)

**File:** `/docs/SPRINT_13_MIGRATION.sql`
**Current Status:** ❌ OPEN - All policies allow writes
**Est. Time:** 2-4 hours

**What to fix:**
```sql
-- BEFORE (lines 186-200): ALL POLICIES OPEN
CREATE POLICY "collective_dms_insert" ON collective_dms FOR INSERT WITH CHECK (true);
CREATE POLICY "collective_dms_update" ON collective_dms FOR UPDATE USING (true);

-- AFTER: Restrict to owners only
CREATE POLICY "collective_dms_insert" ON collective_dms
  FOR INSERT
  WITH CHECK (owner_fingerprint = current_user_id());

CREATE POLICY "collective_dms_update_owner" ON collective_dms
  FOR UPDATE
  USING (owner_fingerprint = current_user_id())
  WITH CHECK (owner_fingerprint = current_user_id());

-- For shards: holders can only update their own
CREATE POLICY "shards_update_holder" ON collective_dms_shards
  FOR UPDATE
  USING (holder_fingerprint = current_user_id())
  WITH CHECK (holder_fingerprint = current_user_id());
```

**Acceptance Criteria:**
- [ ] RLS policies updated in migration SQL
- [ ] Migration tested on local Supabase instance
- [ ] Verified: Other users cannot modify your DMS
- [ ] API route tests updated to validate RLS
- [ ] Documentation updated with security notes

**Testing Script:**
```typescript
// Should FAIL after fix:
const { error } = await supabase
  .from('collective_dms')
  .update({ status: 'cancelled' })
  .eq('id', 'victim_dms_id')
  .eq('owner_fingerprint', 'attacker_fingerprint');

// Should return: "new row violates row-level security policy"
```

---

### Fix #2: Fingerprint Authentication (Bulgu #4)

**Files:**
- `/api/collective-dms/route.ts` (line 72)
- `/api/dms/route.ts` (line 72, if exists)

**Current Status:** ❌ ACCEPTS ANY FINGERPRINT
**Est. Time:** 4-6 hours

**What to fix:**

1. **Create fingerprint verification middleware:**
```typescript
// lib/auth-middleware.ts
export async function verifyFingerprint(req: NextRequest): Promise<string | null> {
  // Option A: From JWT token
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.fingerprint;
    } catch {
      return null;
    }
  }

  // Option B: From secure cookie (httpOnly)
  const cookie = req.cookies.get('fingerprint')?.value;
  if (cookie) {
    // Validate cookie signature
    return validateCookie(cookie);
  }

  return null;
}
```

2. **Update API routes:**
```typescript
// /api/collective-dms/route.ts
export async function POST(req: NextRequest) {
  const fingerprint = await verifyFingerprint(req);
  if (!fingerprint) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { action, dms_id } = body;
  // fingerprint now comes from verified source, not body!

  switch (action) {
    case 'pause':
    case 'resume':
    case 'cancel':
      // fingerprint automatically used (from request, not body)
      const { error } = await supabase
        .from('collective_dms')
        .update({ status: newStatus })
        .eq('id', dms_id)
        .eq('owner_fingerprint', fingerprint); // VERIFIED
      break;
  }
}
```

**Acceptance Criteria:**
- [ ] Fingerprint comes from request context, not JSON body
- [ ] Invalid fingerprints return 401 Unauthorized
- [ ] API tests verify: attacker can't modify victim's DMS
- [ ] Documentation updated with auth flow
- [ ] JWT implementation or cookie validation working

**Security Test:**
```typescript
// After fix: This should FAIL
const response = await fetch('/api/collective-dms', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    action: 'cancel',
    fingerprint: 'victim_fingerprint', // Attacker tries this
    dms_id: 'victim_dms_id'
  })
});
// Should return: 401 Unauthorized (fingerprint not verified)
```

---

### Fix #3: Recovery Key Shamir Splitting (Bulgu #5)

**File:** `/lib/deadManSwitch.ts`
**Current Status:** ❌ KEY RETURNED UNPROTECTED
**Est. Time:** 6-8 hours

**What to fix:**

1. **Update `createDeadManSwitch()` to use Shamir:**
```typescript
import { shamirSplit } from './shamir';

export async function createDeadManSwitch(
  userId: string,
  input: DMSCreateInput,
  guarantorFingerprints: string[] // NEW: who holds key shards
): Promise<{ success: boolean; switchId?: string; recoveryKey?: string; error?: string }> {
  try {
    // 1. Generate encryption key
    const encryptionKey = await generateEncryptionKey();
    const keyString = await exportKey(encryptionKey);

    // 2. Encrypt the content
    const encryptedContent = await encryptData(input.content, encryptionKey);
    const contentHash = await hashData(input.content);

    // 3. SPLIT KEY WITH SHAMIR (NEW)
    const keyShards = shamirSplit(
      keyString,
      guarantorFingerprints.length, // N shards
      Math.ceil(guarantorFingerprints.length * 0.6) // M = 60% quorum
    );

    // 4. Insert DMS
    const { data: dms, error: dmsError } = await supabase
      .from('dead_man_switches')
      .insert({
        user_id: userId,
        encrypted_content: JSON.stringify(encryptedContent),
        content_hash: contentHash,
        // ... other fields
        recovery_key_shards: keyShards, // STORE SHARDS
      })
      .select('id')
      .single();

    if (dmsError) throw dmsError;

    // 5. DON'T RETURN KEY - it's only in shards now
    return {
      success: true,
      switchId: dms.id,
      // NOTE: Recovery key is NOT returned to client
      // It's distributed to guarantors via notification emails
    };

  } catch (err: any) {
    console.error('DMS creation error:', err);
    return { success: false, error: err.message };
  }
}
```

2. **Update `recoverContent()` to reconstruct from shards:**
```typescript
export async function recoverContent(
  switchId: string,
  userShards: ShamirShard[] // User provides their collected shards
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const { data: dms } = await supabase
      .from('dead_man_switches')
      .select('recovery_key_shards, encrypted_content, content_hash')
      .eq('id', switchId)
      .single();

    if (!dms) {
      return { success: false, error: 'Switch not found' };
    }

    // Reconstruct key from shards
    const keyString = shamirCombine(userShards);
    const encryptionKey = await importKey(keyString);

    // Decrypt content
    const encryptedContent: EncryptedData = JSON.parse(dms.encrypted_content);
    const content = await decryptData(encryptedContent, encryptionKey);

    // Verify hash
    const contentHash = await hashData(content);
    if (contentHash !== dms.content_hash) {
      return { success: false, error: 'Content integrity check failed' };
    }

    return { success: true, content };

  } catch (err: any) {
    console.error('Recovery error:', err);
    return { success: false, error: 'Recovery failed - invalid shards' };
  }
}
```

**Acceptance Criteria:**
- [ ] `createDeadManSwitch()` uses Shamir to split key
- [ ] Key shards stored in DB (encrypted at rest)
- [ ] Each guarantor notified with ONE shard only
- [ ] `recoverContent()` reconstructs key from M shards
- [ ] Comprehensive tests: split/recover/verify
- [ ] Runbook created: "How to recover if key is lost"

**Test Scenario:**
```typescript
// Scenario: 5 guarantors, need 3 shards to recover
const dms = await createDeadManSwitch(userId, input, [
  'guarantor_1', 'guarantor_2', 'guarantor_3', 'guarantor_4', 'guarantor_5'
]);

// Later: Only 3 guarantors respond with their shards
const shards = [shard_1, shard_2, shard_3];
const { success, content } = await recoverContent(dms.switchId, shards);

expect(success).toBe(true);
expect(content).toBe(original_content);
```

---

## 🟡 HIGH-PRIORITY FIXES (Complete within 1 sprint)

### Fix #4: Shamir Test Suite (Bulgu #2)

**File:** Create `/tests/shamir.test.ts`
**Current Status:** ❌ ZERO TESTS
**Est. Time:** 8 hours

**What to implement:**
```typescript
import { shamirSplit, shamirCombine, validateShard } from '@/lib/shamir';

describe('Shamir Secret Sharing', () => {
  describe('shamirSplit', () => {
    it('should split secret into N shards with threshold M', () => {
      const secret = 'Sensitive information...';
      const shards = shamirSplit(secret, 10, 6);

      expect(shards).toHaveLength(10);
      shards.forEach((shard, i) => {
        expect(shard.x).toBe(i + 1);
        expect(shard.data).toBeTruthy();
        expect(validateShard(shard)).toBe(true);
      });
    });

    it('should throw on invalid threshold', () => {
      expect(() => shamirSplit('secret', 10, 1)).toThrow();
      expect(() => shamirSplit('secret', 10, 11)).toThrow();
      expect(() => shamirSplit('secret', 1, 1)).toThrow();
    });
  });

  describe('shamirCombine', () => {
    it('should reconstruct secret from exactly M shards', () => {
      const secret = 'Test secret 123!@#';
      const shards = shamirSplit(secret, 10, 6);

      // Test with exact threshold
      const recovered = shamirCombine(shards.slice(0, 6));
      expect(recovered).toBe(secret);
    });

    it('should reconstruct with more than M shards', () => {
      const secret = 'Another test';
      const shards = shamirSplit(secret, 10, 6);

      // More than threshold should also work
      const recovered = shamirCombine(shards.slice(0, 8));
      expect(recovered).toBe(secret);
    });

    it('should fail with fewer than M shards', () => {
      const secret = 'Secret';
      const shards = shamirSplit(secret, 10, 6);

      expect(() => shamirCombine(shards.slice(0, 5))).toThrow();
    });

    it('should fail with duplicate shard x values', () => {
      const secret = 'Secret';
      const shards = shamirSplit(secret, 10, 6);

      // Duplicate shard (same x value)
      const duplicated = [shards[0], shards[1], shards[0]]; // shard[0] twice

      expect(() => shamirCombine(duplicated)).toThrow();
    });
  });

  describe('All M-of-N combinations', () => {
    // Test matrix: all valid (threshold, total) combinations
    const testCases = [
      [2, 3],   // 2-of-3
      [3, 5],   // 3-of-5
      [6, 10],  // 6-of-10 (default)
      [10, 15], // 10-of-15
      [128, 255], // Maximum (128-of-255)
    ];

    testCases.forEach(([threshold, total]) => {
      it(`should split/combine ${threshold}-of-${total}`, () => {
        const secret = `Secret for ${threshold}/${total}`;
        const shards = shamirSplit(secret, total, threshold);

        // Reconstruct with exactly threshold
        const recovered = shamirCombine(shards.slice(0, threshold));
        expect(recovered).toBe(secret);
      });
    });
  });

  describe('Large secrets', () => {
    it('should handle 1MB+ secrets', () => {
      const largSecret = 'x'.repeat(1024 * 1024); // 1MB
      const shards = shamirSplit(largSecret, 10, 6);

      const recovered = shamirCombine(shards.slice(0, 6));
      expect(recovered).toBe(largSecret);
    });
  });

  describe('Edge cases', () => {
    it('should handle binary data (base64 encoded)', () => {
      const buffer = new Uint8Array([0, 1, 255, 127, 64, 32, 16, 8, 4, 2, 1]);
      const base64 = btoa(String.fromCharCode(...buffer));

      const shards = shamirSplit(base64, 10, 6);
      const recovered = shamirCombine(shards.slice(0, 6));

      expect(recovered).toBe(base64);
    });

    it('should handle empty string (edge case)', () => {
      // This might be invalid but test it
      expect(() => shamirSplit('', 10, 6)).toThrow();
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Test file created with 20+ test cases
- [ ] All combinations (2-of-3 through 128-of-255) tested
- [ ] 100% code coverage for shamir.ts
- [ ] All tests pass
- [ ] Tests run in CI/CD pipeline

---

### Fix #5: PDF Metadata Stripping (Bulgu #7)

**File:** `/lib/crypto.ts` (lines 354-361)
**Current Status:** ❌ INCOMPLETE (only renames)
**Est. Time:** 4 hours

**What to fix:**
```typescript
// BEFORE (incomplete)
export async function stripPdfMetadata(file: File): Promise<File> {
  const cleanName = `document_${generateSecureId(8)}.pdf`;
  return new File([await file.arrayBuffer()], cleanName, { type: 'application/pdf' });
}

// AFTER (complete)
import { PDFDocument } from 'pdf-lib';

export async function stripPdfMetadata(file: File): Promise<File> {
  try {
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);

    // Remove ALL metadata
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));

    // Save clean PDF
    const cleanBytes = await pdfDoc.save();
    const cleanName = `document_${generateSecureId(8)}.pdf`;

    return new File(
      [cleanBytes],
      cleanName,
      { type: 'application/pdf' }
    );
  } catch (err) {
    console.error('PDF metadata stripping failed:', err);
    // Fallback: at least rename
    const cleanName = `document_${generateSecureId(8)}.pdf`;
    return new File([await file.arrayBuffer()], cleanName, { type: 'application/pdf' });
  }
}
```

**Install dependency:**
```bash
npm install pdf-lib
```

**Acceptance Criteria:**
- [ ] `pdf-lib` installed
- [ ] All PDF metadata fields stripped
- [ ] Test: Open stripped PDF → no Author/Creator visible
- [ ] Fallback handles errors gracefully
- [ ] File size impact acceptable (< 5% growth)

---

### Fix #6: Rate Limiting - Redis (Bulgu #6)

**File:** `/lib/rateLimit.ts`
**Current Status:** ❌ IN-MEMORY (resets on restart)
**Est. Time:** 6 hours

**What to fix:**
```typescript
// BEFORE (vulnerable)
const store = new Map<string, RateLimitEntry>();

// AFTER (distributed)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      options.maxRequests,
      `${options.windowMs}ms`
    ),
  });

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    allowed: success,
    remaining: remaining ?? 0,
    retryAfterMs: reset ? reset - Date.now() : null,
  };
}
```

**Setup:**
```bash
# 1. Get Upstash Redis credentials
# Sign up at https://console.upstash.com/

# 2. Add to .env.local
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 3. Install package
npm install @upstash/ratelimit @upstash/redis
```

**Acceptance Criteria:**
- [ ] Upstash Redis configured
- [ ] Rate limiter works across server restarts
- [ ] Multiple servers share same limit pool
- [ ] Performance impact acceptable (< 100ms latency)
- [ ] Tested with load testing tool

---

### Fix #7: Cron Job Authentication (Bulgu #9)

**Files:**
- `/api/dms/cron/route.ts` (if exists)
- `/api/collective-dms/cron/route.ts`

**Current Status:** ❌ NO AUTHENTICATION
**Est. Time:** 2 hours

**What to fix:**
```typescript
// /api/collective-dms/cron/route.ts

export async function POST(req: NextRequest) {
  // VERIFY CRON SECRET
  const cronSecret = req.headers.get('x-cron-secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid cron secret' },
      { status: 401 }
    );
  }

  // SECRET IS VALID - proceed with cron job
  try {
    const result = await checkAndTriggerSwitches();
    return NextResponse.json({
      success: true,
      triggered: result.triggered,
      errors: result.errors
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

**Setup:**
```bash
# 1. Generate secure cron secret
openssl rand -base64 32

# 2. Add to .env.local
CRON_SECRET=your_generated_secret_here

# 3. Configure your cron service (e.g., EasyCron, AWS EventBridge)
# Set header: X-Cron-Secret: your_generated_secret_here
# POST to: https://your-domain.com/api/collective-dms/cron
```

**Acceptance Criteria:**
- [ ] CRON_SECRET environment variable set
- [ ] Cron jobs send X-Cron-Secret header
- [ ] Requests without secret return 401
- [ ] Cron jobs still execute successfully

---

## 🟠 MEDIUM PRIORITY FIXES (3-month timeline)

### Fix #8: Input Validation Hardening (Bulgu #10)

**File:** `/api/evidence/submit/route.ts`
**Est. Time:** 4 hours

```typescript
// Add validation constants
const VALID_EVIDENCE_TYPES = new Set([
  'court_record',
  'official_document',
  'leaked_document',
  'financial_record',
  'witness_testimony',
  'news_major',
  'news_minor',
  'academic_paper',
  'social_media',
  'rumor',
  'inference',
]);

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_URL_LENGTH = 2048;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fingerprint, title, description, evidenceType, sourceUrl } = body;

  // Validate required fields
  if (!fingerprint?.trim() || !title?.trim() || !evidenceType?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Validate string lengths
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title too long (max ${MAX_TITLE_LENGTH} chars)` },
      { status: 400 }
    );
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} chars)` },
      { status: 400 }
    );
  }

  // Validate enum
  if (!VALID_EVIDENCE_TYPES.has(evidenceType)) {
    return NextResponse.json(
      { error: `Invalid evidenceType. Must be one of: ${Array.from(VALID_EVIDENCE_TYPES).join(', ')}` },
      { status: 400 }
    );
  }

  // Validate URL format if provided
  if (sourceUrl) {
    if (sourceUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    }
    try {
      new URL(sourceUrl); // Will throw if invalid
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
  }

  // Continue with validated data...
}
```

---

### Fix #9: Supabase Anon Key Permissions (Bulgu #8)

**File:** Supabase Dashboard (RLS configuration)
**Est. Time:** 2 hours

In Supabase Dashboard:
1. Go to Authentication → Policies
2. For each table, create explicit RLS policies:
   ```sql
   -- Example for public tables (SELECT only)
   CREATE POLICY "select_public" ON nodes
     FOR SELECT
     USING (true); -- Public read

   -- Write operations blocked for anon
   CREATE POLICY "insert_blocked" ON nodes
     FOR INSERT
     USING (false); -- Only service role can INSERT
   ```

---

## VERIFICATION CHECKLIST

After all fixes applied:

- [ ] **RLS Test:** Attempt to modify another user's DMS → 403/denied
- [ ] **Fingerprint Test:** POST without valid auth token → 401
- [ ] **Shamir Test:** split/combine round-trip succeeds
- [ ] **Key Recovery:** Can recover content from shards
- [ ] **PDF Test:** Stripped PDF has no Author metadata
- [ ] **Rate Limit Test:** Server restart doesn't reset counters
- [ ] **Cron Test:** Cron job requires valid secret
- [ ] **Input Test:** Oversized/invalid inputs rejected

---

## DEPLOYMENT STEPS

1. **Local verification** (dev environment):
   ```bash
   npm test -- --coverage lib/
   npm run lint
   npm run type-check
   ```

2. **Staging deployment**:
   ```bash
   git checkout security-fixes-branch
   npm run build
   npm run migrate:staging
   npm test:integration
   ```

3. **Security re-audit**:
   - Run through all CRITICAL fixes
   - Verify each finding is resolved
   - Document any deviations

4. **Production deployment**:
   ```bash
   git merge security-fixes-branch
   npm run migrate:production
   # Monitor logs for 24 hours
   ```

5. **Post-deployment**:
   - [ ] All API rate limits working
   - [ ] RLS policies enforced
   - [ ] No security warnings in logs
   - [ ] Cron jobs executing properly
   - [ ] Journalist access unchanged

---

## TIMELINE

**Week 1:** Fixes 1-3 (Critical path)
**Week 2:** Fix 4 (Shamir tests)
**Week 3:** Fixes 5-7 (High priority)
**Weeks 4-8:** Fixes 8-9 (Medium priority)

**Total Effort:** ~45 hours engineering time
**Blockers:** None (can work in parallel)
**Sign-off:** Security lead approval required

---

**Document Created:** 11 March 2026
**Last Updated:** 11 March 2026
**Next Review:** After each fix completion
