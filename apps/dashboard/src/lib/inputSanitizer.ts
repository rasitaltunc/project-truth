/**
 * Input Sanitization Utilities
 * SECURITY: Centralized validation for query params across all API routes.
 *
 * Why:
 * - PostgREST filter injection via commas/parens in user input
 * - Unbounded limit/offset → memory exhaustion DoS
 * - NaN propagation from parseInt on garbage input
 */

/**
 * Clamp a pagination limit to safe bounds.
 * @param raw - Raw string from searchParams
 * @param defaultVal - Default if missing/NaN (default: 20)
 * @param max - Maximum allowed (default: 100)
 */
export function safeLimit(raw: string | null, defaultVal = 20, max = 100): number {
  const parsed = parseInt(raw || String(defaultVal), 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.max(1, Math.min(parsed, max));
}

/**
 * Clamp a pagination offset to safe bounds.
 * @param raw - Raw string from searchParams
 * @param max - Maximum allowed offset (default: 10000)
 */
export function safeOffset(raw: string | null, max = 10000): number {
  const parsed = parseInt(raw || '0', 10);
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(parsed, max));
}

/**
 * Clamp a page number to safe bounds.
 * @param raw - Raw string from searchParams
 * @param max - Maximum page (default: 1000)
 */
export function safePage(raw: string | null, max = 1000): number {
  const parsed = parseInt(raw || '1', 10);
  if (isNaN(parsed)) return 1;
  return Math.max(1, Math.min(parsed, max));
}

/**
 * Sanitize a string for use in PostgREST .or()/.ilike() filter interpolation.
 * Strips characters that could manipulate the filter syntax:
 * - commas (,) — separate filter conditions
 * - parentheses () — group conditions
 * - dots (.) — field access
 * - percent (%) — already used as wildcard wrapper
 * - backslash (\) — escape sequences
 */
export function sanitizeForPostgrest(input: string, maxLength = 200): string {
  return input.replace(/[,().%\\]/g, ' ').trim().substring(0, maxLength);
}

/**
 * Validate UUID format.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

// ─── Verification Desk v2: Text Sanitization ────────────────────────

/**
 * Strip HTML tags and dangerous content from user-submitted text.
 * Used for reasoning fields, corrections, feedback — anywhere user text
 * will be rendered in the UI or stored in DB.
 *
 * We do NOT use DOMPurify (would add 60KB+ to bundle) — instead we strip
 * all HTML tags and dangerous patterns server-side. This is sufficient because
 * React already escapes JSX text content (XSS via innerHTML is not used).
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip javascript: protocol
    .replace(/javascript:/gi, '')
    // Strip on* event handlers that might survive tag stripping
    .replace(/on\w+\s*=/gi, '')
    // Strip data: URIs (potential payload vectors)
    .replace(/data:[^,]*,/gi, '')
    // Normalize whitespace (collapse multiple spaces/newlines)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize a reasoning/justification field.
 * More permissive — allows newlines for multi-paragraph reasoning.
 */
export function sanitizeReasoning(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:[^,]*,/gi, '')
    .trim()
    .substring(0, maxLength);
}

/**
 * Validate and sanitize a correction entry.
 * Returns null if invalid.
 */
export function sanitizeCorrection(correction: {
  field_name: string;
  original_value: string;
  corrected_value: string;
  correction_reasoning: string;
}): typeof correction | null {
  if (!correction || typeof correction !== 'object') return null;

  const fieldName = sanitizeText(correction.field_name, 100);
  const originalValue = sanitizeText(correction.original_value, 1000);
  const correctedValue = sanitizeText(correction.corrected_value, 1000);
  const reasoning = sanitizeReasoning(correction.correction_reasoning, 2000);

  // All fields must be non-empty
  if (!fieldName || !correctedValue || !reasoning) return null;

  return {
    field_name: fieldName,
    original_value: originalValue,
    corrected_value: correctedValue,
    correction_reasoning: reasoning,
  };
}
