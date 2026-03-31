/**
 * Google Cloud Storage Wrapper
 * Sprint GCS — "Silah Yükseltmesi"
 *
 * Dosya yükleme, signed URL, silme işlemleri.
 * GCS yoksa veya hata verirse null döner — caller Supabase fallback yapmalı.
 */

import { Storage } from '@google-cloud/storage';

// ─── Configuration ────────────────────────────────────

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'truth-evidence-files';

let _storage: Storage | null = null;

function getStorage(): Storage | null {
  if (_storage) return _storage;

  // Service account key can be provided as JSON string or file path
  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!GCP_PROJECT_ID) {
    console.warn('[GCS] GCP_PROJECT_ID not set — GCS disabled');
    return null;
  }

  try {
    if (keyJson) {
      const credentials = JSON.parse(keyJson);
      _storage = new Storage({ projectId: GCP_PROJECT_ID, credentials });
    } else if (keyFile) {
      _storage = new Storage({ projectId: GCP_PROJECT_ID, keyFilename: keyFile });
    } else {
      // Try Application Default Credentials (e.g. Cloud Run)
      _storage = new Storage({ projectId: GCP_PROJECT_ID });
    }
    return _storage;
  } catch (err) {
    console.error('[GCS] Failed to initialize Storage client:', err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────

export interface GCSUploadResult {
  path: string;       // GCS object path (e.g. "documents/abc/file.pdf")
  publicUrl: string;  // Direct URL (for uniform public buckets)
  bucket: string;
}

/**
 * Check if GCS is configured and available
 */
export function isGCSAvailable(): boolean {
  return !!GCP_PROJECT_ID && !!getStorage();
}

/**
 * Upload a file buffer to GCS
 */
export async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = 'documents'
): Promise<GCSUploadResult | null> {
  const storage = getStorage();
  if (!storage) return null;

  const objectPath = `${folder}/${filename}`;

  try {
    const bucket = storage.bucket(GCS_BUCKET_NAME);

    // Ensure bucket exists (create if not — first run)
    const [exists] = await bucket.exists();
    if (!exists) {
      console.log(`[GCS] Creating bucket: ${GCS_BUCKET_NAME}`);
      await storage.createBucket(GCS_BUCKET_NAME, {
        location: process.env.GCP_REGION || 'europe-west1',
        storageClass: 'STANDARD',
      });
    }

    const file = bucket.file(objectPath);

    await file.save(buffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
      resumable: false, // Small files don't need resumable
    });

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${objectPath}`;

    console.log(`[GCS] Uploaded: ${objectPath} (${buffer.length} bytes)`);

    return {
      path: objectPath,
      publicUrl,
      bucket: GCS_BUCKET_NAME,
    };
  } catch (err) {
    console.error('[GCS] Upload failed:', err);
    return null;
  }
}

/**
 * Generate a signed URL for temporary access.
 * F2 FIX: Default TTL reduced from 60 min to 15 min (security hardening).
 * Max allowed: 15 minutes. Requests for longer TTLs are silently capped.
 */
export async function getSignedUrl(
  objectPath: string,
  expirationMinutes: number = 15
): Promise<string | null> {
  // F2 FIX: Cap expiration to 15 minutes max — prevents excessive TTLs
  const cappedMinutes = Math.min(expirationMinutes, 15);
  const storage = getStorage();
  if (!storage) return null;

  try {
    const [url] = await storage
      .bucket(GCS_BUCKET_NAME)
      .file(objectPath)
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + cappedMinutes * 60 * 1000,
      });

    return url;
  } catch (err) {
    console.error('[GCS] Signed URL generation failed:', err);
    return null;
  }
}

/**
 * Download a file from GCS as Buffer
 */
export async function downloadFromGCS(objectPath: string): Promise<Buffer | null> {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const [buffer] = await storage
      .bucket(GCS_BUCKET_NAME)
      .file(objectPath)
      .download();

    return buffer;
  } catch (err) {
    console.error('[GCS] Download failed:', err);
    return null;
  }
}

/**
 * Delete a file from GCS
 */
export async function deleteFromGCS(objectPath: string): Promise<boolean> {
  const storage = getStorage();
  if (!storage) return false;

  try {
    await storage
      .bucket(GCS_BUCKET_NAME)
      .file(objectPath)
      .delete();

    console.log(`[GCS] Deleted: ${objectPath}`);
    return true;
  } catch (err) {
    console.error('[GCS] Delete failed:', err);
    return false;
  }
}

/**
 * Get public URL for an object (for uniform public buckets)
 */
export function getPublicUrl(objectPath: string): string {
  return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${objectPath}`;
}
