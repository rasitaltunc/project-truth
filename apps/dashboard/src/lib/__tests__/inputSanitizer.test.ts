/**
 * ═══════════════════════════════════════════════════════════════
 * INPUT SANITIZER — GÜVENLİK TESTLERİ
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu testler API route'larına gelen her input'un güvenli olduğunu garanti eder.
 * PostgREST filter injection, DoS via unbounded pagination, XSS ve NaN
 * propagation gibi saldırı vektörlerini test eder.
 *
 * Çalıştır: npx vitest run src/lib/__tests__/inputSanitizer.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, test, expect } from 'vitest';
import {
  safeLimit,
  safeOffset,
  safePage,
  sanitizeForPostgrest,
  isValidUUID,
  sanitizeText,
  sanitizeReasoning,
  sanitizeCorrection,
} from '../inputSanitizer';

// ═════════════════════════════════════════════════════════════
// BÖLÜM 1: safeLimit — Pagination limit clamping
// ═════════════════════════════════════════════════════════════

describe('safeLimit', () => {
  test('null input → default value (20)', () => {
    expect(safeLimit(null)).toBe(20);
  });

  test('empty string → default value', () => {
    expect(safeLimit('')).toBe(20);
  });

  test('valid number string → parsed', () => {
    expect(safeLimit('50')).toBe(50);
  });

  test('exceeds max (100) → clamped to max', () => {
    expect(safeLimit('999')).toBe(100);
  });

  test('zero → clamped to 1 (minimum)', () => {
    expect(safeLimit('0')).toBe(1);
  });

  test('negative → clamped to 1', () => {
    expect(safeLimit('-5')).toBe(1);
  });

  test('NaN string → default', () => {
    expect(safeLimit('abc')).toBe(20);
  });

  test('float → truncated to integer', () => {
    expect(safeLimit('10.7')).toBe(10);
  });

  test('custom default and max', () => {
    expect(safeLimit(null, 10, 50)).toBe(10);
    expect(safeLimit('75', 10, 50)).toBe(50);
  });

  test('DoS: extremely large number → clamped', () => {
    expect(safeLimit('999999999')).toBe(100);
  });

  test('injection attempt: "50,id.eq.1"', () => {
    // parseInt stops at first non-digit, returning 50
    expect(safeLimit('50,id.eq.1')).toBe(50);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 2: safeOffset — Pagination offset clamping
// ═════════════════════════════════════════════════════════════

describe('safeOffset', () => {
  test('null input → 0', () => {
    expect(safeOffset(null)).toBe(0);
  });

  test('valid offset → parsed', () => {
    expect(safeOffset('100')).toBe(100);
  });

  test('exceeds max (10000) → clamped', () => {
    expect(safeOffset('50000')).toBe(10000);
  });

  test('negative → clamped to 0', () => {
    expect(safeOffset('-10')).toBe(0);
  });

  test('NaN → 0', () => {
    expect(safeOffset('xyz')).toBe(0);
  });

  test('custom max', () => {
    expect(safeOffset('200', 100)).toBe(100);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 3: safePage — Page number clamping
// ═════════════════════════════════════════════════════════════

describe('safePage', () => {
  test('null input → 1', () => {
    expect(safePage(null)).toBe(1);
  });

  test('valid page → parsed', () => {
    expect(safePage('5')).toBe(5);
  });

  test('zero → clamped to 1', () => {
    expect(safePage('0')).toBe(1);
  });

  test('exceeds max (1000) → clamped', () => {
    expect(safePage('9999')).toBe(1000);
  });

  test('negative → clamped to 1', () => {
    expect(safePage('-3')).toBe(1);
  });

  test('NaN → 1', () => {
    expect(safePage('page')).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 4: sanitizeForPostgrest — Filter injection prevention
// ═════════════════════════════════════════════════════════════

describe('sanitizeForPostgrest', () => {
  test('normal text → unchanged', () => {
    expect(sanitizeForPostgrest('jeffrey epstein')).toBe('jeffrey epstein');
  });

  test('commas stripped (filter separator)', () => {
    expect(sanitizeForPostgrest('name,eq.test')).toBe('name eq test');
  });

  test('parentheses stripped (grouping)', () => {
    expect(sanitizeForPostgrest('or(name.eq.test)')).toBe('or name eq test');
  });

  test('dots stripped (field access)', () => {
    expect(sanitizeForPostgrest('users.email')).toBe('users email');
  });

  test('percent stripped (wildcard)', () => {
    expect(sanitizeForPostgrest('%admin%')).toBe('admin');
  });

  test('backslash stripped (escape)', () => {
    expect(sanitizeForPostgrest('test\\injection')).toBe('test injection');
  });

  test('complex injection → fully sanitized', () => {
    const injection = 'name.eq.admin),or(role.eq.superadmin';
    const result = sanitizeForPostgrest(injection);
    expect(result).not.toContain(',');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).not.toContain('.');
  });

  test('max length enforced (default 200)', () => {
    const longInput = 'a'.repeat(500);
    expect(sanitizeForPostgrest(longInput).length).toBeLessThanOrEqual(200);
  });

  test('custom max length', () => {
    const input = 'a'.repeat(100);
    expect(sanitizeForPostgrest(input, 50).length).toBeLessThanOrEqual(50);
  });

  test('whitespace trimmed', () => {
    expect(sanitizeForPostgrest('  hello  ')).toBe('hello');
  });

  test('Turkish characters preserved', () => {
    expect(sanitizeForPostgrest('güvenli şifre')).toBe('güvenli şifre');
  });

  test('Unicode preserved', () => {
    expect(sanitizeForPostgrest('日本語テスト')).toBe('日本語テスト');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 5: isValidUUID — Format validation
// ═════════════════════════════════════════════════════════════

describe('isValidUUID', () => {
  test('valid UUID v4 → true', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  test('valid UUID uppercase → true', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  test('empty string → false', () => {
    expect(isValidUUID('')).toBe(false);
  });

  test('random string → false', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  test('too short → false', () => {
    expect(isValidUUID('550e8400-e29b-41d4')).toBe(false);
  });

  test('injection attempt → false', () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000' OR 1=1--")).toBe(false);
  });

  test('nil UUID → true (valid format)', () => {
    expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 6: sanitizeText — XSS prevention
// ═════════════════════════════════════════════════════════════

describe('sanitizeText', () => {
  test('normal text → unchanged', () => {
    expect(sanitizeText('This is a test')).toBe('This is a test');
  });

  test('HTML tags stripped', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  test('nested HTML stripped', () => {
    expect(sanitizeText('<div><b>bold</b></div>')).toBe('bold');
  });

  test('javascript: protocol stripped', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });

  test('onclick handler stripped', () => {
    expect(sanitizeText('onclick=alert(1)')).toBe('alert(1)');
  });

  test('data: URI stripped', () => {
    expect(sanitizeText('data:text/html,<script>alert(1)</script>')).toBe('alert(1)');
  });

  test('whitespace normalized', () => {
    expect(sanitizeText('hello    world\n\ntest')).toBe('hello world test');
  });

  test('max length enforced', () => {
    const long = 'a'.repeat(5000);
    expect(sanitizeText(long).length).toBeLessThanOrEqual(2000);
  });

  test('custom max length', () => {
    const text = 'a'.repeat(200);
    expect(sanitizeText(text, 50).length).toBeLessThanOrEqual(50);
  });

  test('null → empty string', () => {
    expect(sanitizeText(null as unknown as string)).toBe('');
  });

  test('number → empty string', () => {
    expect(sanitizeText(123 as unknown as string)).toBe('');
  });

  test('Turkish text preserved', () => {
    const turkish = 'Güvenli belge içeriği şüpheli değil';
    expect(sanitizeText(turkish)).toBe(turkish);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 7: sanitizeReasoning — Multi-line text with newlines
// ═════════════════════════════════════════════════════════════

describe('sanitizeReasoning', () => {
  test('preserves newlines (unlike sanitizeText)', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const result = sanitizeReasoning(input);
    // sanitizeReasoning does NOT collapse whitespace
    expect(result).toContain('\n');
  });

  test('HTML tags stripped', () => {
    expect(sanitizeReasoning('<b>Important</b> finding')).toBe('Important finding');
  });

  test('max length 5000', () => {
    const long = 'a'.repeat(10000);
    expect(sanitizeReasoning(long).length).toBeLessThanOrEqual(5000);
  });

  test('null → empty', () => {
    expect(sanitizeReasoning(null as unknown as string)).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 8: sanitizeCorrection — Compound object validation
// ═════════════════════════════════════════════════════════════

describe('sanitizeCorrection', () => {
  test('valid correction → sanitized object', () => {
    const result = sanitizeCorrection({
      field_name: 'occupation',
      original_value: 'Financier',
      corrected_value: 'Convicted sex offender',
      correction_reasoning: 'Court records show conviction',
    });

    expect(result).not.toBeNull();
    expect(result!.field_name).toBe('occupation');
    expect(result!.corrected_value).toBe('Convicted sex offender');
  });

  test('HTML in fields → stripped', () => {
    const result = sanitizeCorrection({
      field_name: '<script>alert(1)</script>name',
      original_value: 'old',
      corrected_value: 'new',
      correction_reasoning: 'Because <b>evidence</b>',
    });

    expect(result).not.toBeNull();
    expect(result!.field_name).not.toContain('<script>');
    expect(result!.correction_reasoning).not.toContain('<b>');
  });

  test('empty corrected_value → null (invalid)', () => {
    const result = sanitizeCorrection({
      field_name: 'name',
      original_value: 'old',
      corrected_value: '',
      correction_reasoning: 'reason',
    });

    expect(result).toBeNull();
  });

  test('empty reasoning → null (invalid)', () => {
    const result = sanitizeCorrection({
      field_name: 'name',
      original_value: 'old',
      corrected_value: 'new',
      correction_reasoning: '',
    });

    expect(result).toBeNull();
  });

  test('null input → null', () => {
    expect(sanitizeCorrection(null as unknown as Parameters<typeof sanitizeCorrection>[0])).toBeNull();
  });

  test('non-object → null', () => {
    expect(sanitizeCorrection('string' as unknown as Parameters<typeof sanitizeCorrection>[0])).toBeNull();
  });
});
