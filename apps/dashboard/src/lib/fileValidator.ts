// ═══════════════════════════════════════════
// F1 FIX: Magic Bytes File Validator
// Validates actual file content, NOT just Content-Type header
// Prevents MIME type spoofing attacks
// ═══════════════════════════════════════════

/**
 * Magic byte signatures for allowed file types.
 * Each entry: { mime, offsets: [{ offset, bytes }] }
 * Some formats have multiple valid signatures.
 */
const MAGIC_SIGNATURES: Array<{
  mime: string;
  signatures: Array<{ offset: number; bytes: number[] }>;
}> = [
  // JPEG: FF D8 FF
  {
    mime: 'image/jpeg',
    signatures: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: 'image/png',
    signatures: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  },
  // GIF87a / GIF89a
  {
    mime: 'image/gif',
    signatures: [
      { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
      { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
    ],
  },
  // WebP: RIFF....WEBP
  {
    mime: 'image/webp',
    signatures: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
      // bytes 8-11 should be WEBP — checked separately
    ],
  },
  // TIFF: II*\0 (little-endian) or MM\0* (big-endian)
  {
    mime: 'image/tiff',
    signatures: [
      { offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00] }, // Little-endian
      { offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a] }, // Big-endian
    ],
  },
  // PDF: %PDF
  {
    mime: 'application/pdf',
    signatures: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  },
  // MP4: ftyp at offset 4
  {
    mime: 'video/mp4',
    signatures: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ftyp
  },
  // WebM: EBML header (1A 45 DF A3)
  {
    mime: 'video/webm',
    signatures: [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  },
];

/**
 * Check if a buffer matches a specific byte signature
 */
function matchesSignature(
  buffer: Uint8Array,
  offset: number,
  expected: number[]
): boolean {
  if (buffer.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[offset + i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Detect the actual MIME type from file magic bytes.
 * Returns the detected MIME type or null if unrecognized.
 */
export function detectMimeFromBytes(buffer: Buffer | Uint8Array): string | null {
  if (!buffer || buffer.length < 8) return null;

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  for (const entry of MAGIC_SIGNATURES) {
    // WebP special case: check RIFF + WEBP
    if (entry.mime === 'image/webp') {
      if (
        matchesSignature(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
        matchesSignature(bytes, 8, [0x57, 0x45, 0x42, 0x50])
      ) {
        return 'image/webp';
      }
      continue;
    }

    // Normal check: any signature matches
    for (const sig of entry.signatures) {
      if (matchesSignature(bytes, sig.offset, sig.bytes)) {
        return entry.mime;
      }
    }
  }

  return null;
}

/**
 * Validate that a file's magic bytes match its claimed MIME type.
 * Returns { valid, detectedMime, error? }
 *
 * @param buffer File content as Buffer
 * @param claimedMime The Content-Type header value
 * @param allowedMimes Optional whitelist of allowed MIME types
 */
export function validateFileMagic(
  buffer: Buffer,
  claimedMime: string,
  allowedMimes?: string[]
): {
  valid: boolean;
  detectedMime: string | null;
  error?: string;
} {
  const detectedMime = detectMimeFromBytes(buffer);

  // No magic bytes recognized — reject unknown file types
  if (!detectedMime) {
    return {
      valid: false,
      detectedMime: null,
      error: 'Dosya türü tanınamadı. Desteklenen formatlar: JPG, PNG, GIF, WebP, TIFF, PDF, MP4, WebM',
    };
  }

  // Check if detected MIME is in allowed list
  if (allowedMimes && !allowedMimes.includes(detectedMime)) {
    return {
      valid: false,
      detectedMime,
      error: `Dosya içeriği desteklenmeyen formatta: ${detectedMime}`,
    };
  }

  // Check if claimed MIME matches detected MIME
  // Allow some equivalencies (e.g., image/jpg → image/jpeg)
  const normalizedClaimed = normalizeMime(claimedMime);
  const normalizedDetected = normalizeMime(detectedMime);

  if (normalizedClaimed !== normalizedDetected) {
    return {
      valid: false,
      detectedMime,
      error: `MIME türü uyuşmazlığı: header "${claimedMime}" ama dosya içeriği "${detectedMime}"`,
    };
  }

  return { valid: true, detectedMime };
}

/**
 * Normalize common MIME type aliases
 */
function normalizeMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'video/x-matroska': 'video/webm', // close enough for our purposes
  };
  return map[mime] || mime;
}
