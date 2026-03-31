/**
 * pdfSanitizer.ts — Unit Tests
 * Sprint R3 "Cephane" — PDF Dezenfeksiyon Pipeline
 *
 * Test stratejisi:
 * - computeSHA256: Gerçek hash hesaplama (mock gereksiz)
 * - ghostscript/qpdf/pdftotext: child_process mocklanır
 * - sanitizePDF: Tam pipeline testi (mocklanmış araçlarla)
 * - sanitizeBatch: Çoklu dosya + hata izolasyonu
 * - checkSanitizerHealth: Versiyon kontrolleri
 * - Redaksiyon tespiti: Metin farkı analizi
 * - Edge case'ler: Boş dosya, büyük dosya, araç yoksa fallback
 */

import { vi, type Mock, type MockedFunction } from 'vitest';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';

// ─── Mocking Strategy ────────────────────────────────────
// child_process.execFile ve fs/promises mocklanır
// Gerçek crypto (SHA-256) korunur — deterministik, mock gereksiz

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue('/tmp/truth-sanitize-test123'),
  rmdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('util', async () => {
  const actual = await vi.importActual<typeof import('util')>('util');
  return {
    ...actual,
    promisify: (fn: typeof execFile) => {
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          const mockFn = fn as unknown as Mock;
          try {
            const result = mockFn(...args);
            if (result && typeof result.then === 'function') {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (err) {
            reject(err);
          }
        });
      };
    },
  };
});

// Import AFTER mocks are set up
import {
  computeSHA256,
  sanitizePDF,
  sanitizeBatch,
  checkSanitizerHealth,
} from '../pdfSanitizer';
import type { SanitizationResult } from '../pdfSanitizer';

const mockExecFile = execFile as unknown as Mock;
const mockWriteFile = writeFile as MockedFunction<typeof writeFile>;
const mockReadFile = readFile as MockedFunction<typeof readFile>;
const mockUnlink = unlink as MockedFunction<typeof unlink>;
const mockMkdtemp = mkdtemp as MockedFunction<typeof mkdtemp>;

// ─── Test Data ───────────────────────────────────────────

// Minimal valid PDF (header only — enough for testing)
const FAKE_PDF = Buffer.from('%PDF-1.7\ntest content\n%%EOF');
const SANITIZED_PDF = Buffer.from('%PDF-1.7\nsanitized content\n%%EOF');

// Known SHA-256 hash for FAKE_PDF
const FAKE_PDF_HASH = computeSHA256(FAKE_PDF);

// ─── Helper ──────────────────────────────────────────────

function setupSuccessfulPipeline() {
  // mkdtemp
  mockMkdtemp.mockResolvedValue('/tmp/truth-sanitize-test123');

  // writeFile — always succeeds
  mockWriteFile.mockResolvedValue(undefined);

  // Ghostscript — success
  // QPDF check — success
  // QPDF repair — success
  // pdftotext original — returns text
  // pdftotext sanitized — returns same text (no redaction)
  let execCallIndex = 0;

  mockExecFile.mockImplementation(
    (cmd: string, args: string[], _opts: unknown, callback?: Function) => {
      // promisify pattern — no callback, return promise-like
      // Our mock of promisify handles this differently

      if (cmd === 'gs') {
        return Promise.resolve({ stdout: '', stderr: '' });
      }
      if (cmd === 'qpdf' && args?.includes('--check')) {
        return Promise.resolve({ stdout: 'checking file.pdf\n', stderr: '' });
      }
      if (cmd === 'qpdf') {
        return Promise.resolve({ stdout: '', stderr: '' });
      }
      if (cmd === 'pdftotext') {
        return Promise.resolve({ stdout: 'test content line 1\ntest content line 2\n', stderr: '' });
      }
      if (cmd === 'which') {
        return Promise.resolve({ stdout: '/usr/bin/pdftotext\n', stderr: '' });
      }

      return Promise.resolve({ stdout: '', stderr: '' });
    },
  );

  // readFile — return sanitized PDF for output files
  mockReadFile.mockImplementation((path: unknown) => {
    const p = String(path);
    if (p.includes('final_output') || p.includes('gs_output')) {
      return Promise.resolve(SANITIZED_PDF);
    }
    return Promise.resolve(FAKE_PDF);
  });
}

// ─── Tests ───────────────────────────────────────────────

describe('pdfSanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation();
    vi.spyOn(console, 'warn').mockImplementation();
    vi.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════
  // 1. computeSHA256
  // ═══════════════════════════════════════════════════════

  describe('computeSHA256', () => {
    it('should return consistent hash for same input', () => {
      const hash1 = computeSHA256(FAKE_PDF);
      const hash2 = computeSHA256(FAKE_PDF);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = computeSHA256(FAKE_PDF);
      const hash2 = computeSHA256(SANITIZED_PDF);
      expect(hash1).not.toBe(hash2);
    });

    it('should return valid hex string of 64 chars', () => {
      const hash = computeSHA256(FAKE_PDF);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty buffer', () => {
      const hash = computeSHA256(Buffer.alloc(0));
      // SHA-256 of empty string is well-known
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle large buffer', () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'A'); // 10MB
      const hash = computeSHA256(largeBuffer);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 2. sanitizePDF — Başarılı Pipeline
  // ═══════════════════════════════════════════════════════

  describe('sanitizePDF — successful pipeline', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('should return SanitizationResult with all fields', async () => {
      const result = await sanitizePDF(FAKE_PDF);

      expect(result).toBeDefined();
      expect(result.sanitizedBuffer).toBeInstanceOf(Buffer);
      expect(result.originalHash).toBe(FAKE_PDF_HASH);
      expect(result.sanitizedHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.originalSize).toBe(FAKE_PDF.length);
      expect(result.sanitizedSize).toBeGreaterThan(0);
      expect(typeof result.ghostscriptSuccess).toBe('boolean');
      expect(typeof result.qpdfSuccess).toBe('boolean');
      expect(result.redactionReport).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should mark ghostscript as successful', async () => {
      const result = await sanitizePDF(FAKE_PDF);
      expect(result.ghostscriptSuccess).toBe(true);
    });

    it('should mark qpdf as successful', async () => {
      const result = await sanitizePDF(FAKE_PDF);
      expect(result.qpdfSuccess).toBe(true);
    });

    it('should produce different hash when content changes', async () => {
      const result = await sanitizePDF(FAKE_PDF);
      // Sanitized buffer is different from original
      if (result.sanitizedBuffer.equals(FAKE_PDF)) {
        expect(result.originalHash).toBe(result.sanitizedHash);
      } else {
        expect(result.originalHash).not.toBe(result.sanitizedHash);
      }
    });

    it('should create temp directory', async () => {
      await sanitizePDF(FAKE_PDF);
      expect(mockMkdtemp).toHaveBeenCalledWith(expect.stringContaining('truth-sanitize-'));
    });

    it('should write input file to temp dir', async () => {
      await sanitizePDF(FAKE_PDF);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('input.pdf'),
        FAKE_PDF,
      );
    });

    it('should cleanup temp files', async () => {
      await sanitizePDF(FAKE_PDF);
      // unlink should be called for input, gs_output, final_output
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════
  // 3. sanitizePDF — Ghostscript Hatası
  // ═══════════════════════════════════════════════════════

  describe('sanitizePDF — ghostscript failure', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('should fallback gracefully when ghostscript fails', async () => {
      mockExecFile.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gs') {
          return Promise.reject(new Error('Ghostscript not found'));
        }
        if (cmd === 'qpdf' && args?.includes('--check')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (cmd === 'qpdf') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (cmd === 'pdftotext') {
          return Promise.resolve({ stdout: 'same text\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await sanitizePDF(FAKE_PDF);
      expect(result.ghostscriptSuccess).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      // Pipeline should still complete
      expect(result.sanitizedBuffer).toBeDefined();
    });

    it('should include ghostscript warning in warnings array', async () => {
      mockExecFile.mockImplementation((cmd: string) => {
        if (cmd === 'gs') {
          return Promise.reject(new Error('gs: command not found'));
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      mockReadFile.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('final_output') || p.includes('gs_output')) {
          return Promise.resolve(FAKE_PDF);
        }
        return Promise.resolve(FAKE_PDF);
      });

      const result = await sanitizePDF(FAKE_PDF);
      expect(result.warnings.some(w => w.includes('Ghostscript'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 4. sanitizePDF — QPDF Hatası
  // ═══════════════════════════════════════════════════════

  describe('sanitizePDF — qpdf failure', () => {
    it('should use ghostscript output when qpdf fails', async () => {
      setupSuccessfulPipeline();

      mockExecFile.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gs') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (cmd === 'qpdf') {
          return Promise.reject(new Error('QPDF repair failed'));
        }
        if (cmd === 'pdftotext') {
          return Promise.resolve({ stdout: 'text\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      // readFile: gs_output exists, final_output does not
      mockReadFile.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('final_output')) {
          return Promise.reject(new Error('ENOENT'));
        }
        if (p.includes('gs_output')) {
          return Promise.resolve(SANITIZED_PDF);
        }
        return Promise.resolve(FAKE_PDF);
      });

      const result = await sanitizePDF(FAKE_PDF);
      expect(result.qpdfSuccess).toBe(false);
      expect(result.sanitizedBuffer).toBeDefined();
      expect(result.sanitizedBuffer.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 5. Redaksiyon Tespiti
  // ═══════════════════════════════════════════════════════

  describe('sanitizePDF — redaction detection', () => {
    it('should detect failed redactions when text differs significantly', async () => {
      setupSuccessfulPipeline();

      // Original has 200+ extra chars that get cleaned
      const originalText = 'visible text\n' + 'hidden secret text '.repeat(20) + '\n';
      const sanitizedText = 'visible text\n';

      let pdftotextCallCount = 0;
      mockExecFile.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gs') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'qpdf') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'pdftotext') {
          pdftotextCallCount++;
          // First call = original, second call = sanitized
          if (pdftotextCallCount <= 1) {
            return Promise.resolve({ stdout: originalText, stderr: '' });
          }
          return Promise.resolve({ stdout: sanitizedText, stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await sanitizePDF(FAKE_PDF);
      expect(result.redactionReport.failedRedactionsDetected).toBe(true);
      expect(result.redactionReport.failedRedactionCount).toBeGreaterThan(0);
    });

    it('should NOT report redaction when text is same', async () => {
      setupSuccessfulPipeline();

      const result = await sanitizePDF(FAKE_PDF);
      expect(result.redactionReport.failedRedactionsDetected).toBe(false);
      expect(result.redactionReport.failedRedactionCount).toBe(0);
    });

    it('should never include actual text content in report', async () => {
      setupSuccessfulPipeline();

      const secretText = 'TOP_SECRET_CONTENT_THAT_MUST_NEVER_LEAK';
      let pdftotextCallCount = 0;
      mockExecFile.mockImplementation((cmd: string) => {
        if (cmd === 'gs') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'qpdf') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'pdftotext') {
          pdftotextCallCount++;
          if (pdftotextCallCount <= 1) {
            return Promise.resolve({ stdout: secretText.repeat(10), stderr: '' });
          }
          return Promise.resolve({ stdout: 'clean text\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await sanitizePDF(FAKE_PDF);
      const reportJson = JSON.stringify(result.redactionReport);

      // TRUTH ANAYASASI: İçerik ASLA dahil edilmez
      expect(reportJson).not.toContain('TOP_SECRET');
      expect(reportJson).not.toContain(secretText);
    });

    it('should gracefully handle pdftotext not being available', async () => {
      setupSuccessfulPipeline();

      mockExecFile.mockImplementation((cmd: string) => {
        if (cmd === 'gs') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'qpdf') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'pdftotext') return Promise.reject(new Error('pdftotext not found'));
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      // Should NOT throw — redaction detection is optional
      const result = await sanitizePDF(FAKE_PDF);
      expect(result).toBeDefined();
      expect(result.redactionReport.failedRedactionsDetected).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 6. sanitizeBatch
  // ═══════════════════════════════════════════════════════

  describe('sanitizeBatch', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('should process multiple files', async () => {
      const files = [
        { name: 'doc1.pdf', buffer: FAKE_PDF },
        { name: 'doc2.pdf', buffer: FAKE_PDF },
        { name: 'doc3.pdf', buffer: FAKE_PDF },
      ];

      const results = await sanitizeBatch(files);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.result !== null)).toBe(true);
    });

    it('should isolate errors between files', async () => {
      let callCount = 0;

      // Fail on second file
      const origImpl = mockExecFile.getMockImplementation();
      mockExecFile.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gs') {
          callCount++;
          if (callCount === 2) {
            return Promise.reject(new Error('Simulated failure'));
          }
        }
        return origImpl!(cmd, args);
      });

      // Make readFile always return something for fallback
      mockReadFile.mockResolvedValue(FAKE_PDF);

      const files = [
        { name: 'ok1.pdf', buffer: FAKE_PDF },
        { name: 'fail.pdf', buffer: FAKE_PDF },
        { name: 'ok2.pdf', buffer: FAKE_PDF },
      ];

      const results = await sanitizeBatch(files);
      expect(results).toHaveLength(3);
      // First and third should succeed (even with GS failure, pipeline has fallback)
      expect(results[0].result).not.toBeNull();
      expect(results[2].result).not.toBeNull();
    });

    it('should call onProgress callback', async () => {
      const progressCalls: Array<[number, number, string]> = [];
      const onProgress = (current: number, total: number, name: string) => {
        progressCalls.push([current, total, name]);
      };

      const files = [
        { name: 'a.pdf', buffer: FAKE_PDF },
        { name: 'b.pdf', buffer: FAKE_PDF },
      ];

      await sanitizeBatch(files, onProgress);
      expect(progressCalls).toEqual([
        [1, 2, 'a.pdf'],
        [2, 2, 'b.pdf'],
      ]);
    });

    it('should handle empty file list', async () => {
      const results = await sanitizeBatch([]);
      expect(results).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 7. checkSanitizerHealth
  // ═══════════════════════════════════════════════════════

  describe('checkSanitizerHealth', () => {
    it('should return all available when tools are installed', async () => {
      mockExecFile.mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'gs' && args?.includes('--version')) {
          return Promise.resolve({ stdout: '10.02.1\n', stderr: '' });
        }
        if (cmd === 'qpdf' && args?.includes('--version')) {
          return Promise.resolve({ stdout: 'qpdf version 11.6.3\n', stderr: '' });
        }
        if (cmd === 'pdftotext') {
          return Promise.reject(new Error('version flag fails'));
        }
        if (cmd === 'which') {
          return Promise.resolve({ stdout: '/usr/bin/pdftotext\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const health = await checkSanitizerHealth();
      expect(health.ghostscriptAvailable).toBe(true);
      expect(health.ghostscriptVersion).toBe('10.02.1');
      expect(health.qpdfAvailable).toBe(true);
      expect(health.qpdfVersion).toBe('qpdf version 11.6.3');
      expect(health.pdftotextAvailable).toBe(true);
    });

    it('should return unavailable when tools are missing', async () => {
      mockExecFile.mockRejectedValue(new Error('command not found'));

      const health = await checkSanitizerHealth();
      expect(health.ghostscriptAvailable).toBe(false);
      expect(health.ghostscriptVersion).toBeNull();
      expect(health.qpdfAvailable).toBe(false);
      expect(health.qpdfVersion).toBeNull();
    });

    it('should handle partial availability', async () => {
      mockExecFile.mockImplementation((cmd: string) => {
        if (cmd === 'gs') {
          return Promise.resolve({ stdout: '10.02.1\n', stderr: '' });
        }
        // qpdf, pdftotext, AND which all fail
        return Promise.reject(new Error('not found'));
      });

      const health = await checkSanitizerHealth();
      expect(health.ghostscriptAvailable).toBe(true);
      expect(health.qpdfAvailable).toBe(false);
      expect(health.pdftotextAvailable).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 8. Edge Cases
  // ═══════════════════════════════════════════════════════

  describe('edge cases', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('should handle zero-byte PDF', async () => {
      mockReadFile.mockResolvedValue(Buffer.alloc(0));

      // Should not throw — graceful handling
      const result = await sanitizePDF(Buffer.alloc(0));
      expect(result).toBeDefined();
      expect(result.originalSize).toBe(0);
    });

    it('should compute processing time', async () => {
      const result = await sanitizePDF(FAKE_PDF);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should have redactionReport with correct shape', async () => {
      const result = await sanitizePDF(FAKE_PDF);
      const report = result.redactionReport;

      expect(typeof report.failedRedactionsDetected).toBe('boolean');
      expect(typeof report.failedRedactionCount).toBe('number');
      expect(Array.isArray(report.affectedPages)).toBe(true);
      expect(Array.isArray(report.details)).toBe(true);
    });

    it('should always return sanitizedBuffer even on total failure', async () => {
      // Everything fails
      mockExecFile.mockRejectedValue(new Error('all tools broken'));
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      // writeFile for fallback still works
      mockWriteFile.mockResolvedValue(undefined);

      // The pipeline should still return the original buffer as last resort
      const result = await sanitizePDF(FAKE_PDF);
      expect(result.sanitizedBuffer).toBeDefined();
      expect(result.sanitizedBuffer.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 9. Security — Truth Anayasası Uyumluluk
  // ═══════════════════════════════════════════════════════

  describe('Truth Anayasası compliance', () => {
    beforeEach(() => {
      setupSuccessfulPipeline();
    });

    it('should never store redacted content in result object', async () => {
      const sensitiveContent = 'VICTIM_NAME_JANE_DOE_SSN_123456789';

      let pdftotextCallCount = 0;
      mockExecFile.mockImplementation((cmd: string) => {
        if (cmd === 'gs') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'qpdf') return Promise.resolve({ stdout: '', stderr: '' });
        if (cmd === 'pdftotext') {
          pdftotextCallCount++;
          if (pdftotextCallCount <= 1) {
            return Promise.resolve({ stdout: sensitiveContent.repeat(10), stderr: '' });
          }
          return Promise.resolve({ stdout: 'redacted\n', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await sanitizePDF(FAKE_PDF);

      // Deep check — serialize entire result except buffers
      const resultWithoutBuffers = {
        ...result,
        sanitizedBuffer: '[BUFFER]',
      };
      const serialized = JSON.stringify(resultWithoutBuffers);

      expect(serialized).not.toContain('VICTIM_NAME');
      expect(serialized).not.toContain('JANE_DOE');
      expect(serialized).not.toContain('SSN_123456789');
    });

    it('should use SAFER mode in ghostscript', async () => {
      await sanitizePDF(FAKE_PDF);

      // Find the gs call
      const gsCalls = mockExecFile.mock.calls.filter(
        (call: unknown[]) => call[0] === 'gs'
      );

      if (gsCalls.length > 0) {
        const gsArgs = gsCalls[0][1] as string[];
        expect(gsArgs).toContain('-dSAFER');
        expect(gsArgs).toContain('-dBATCH');
        expect(gsArgs).toContain('-dNOPAUSE');
      }
    });

    it('should set timeout on all external processes', async () => {
      await sanitizePDF(FAKE_PDF);

      // All execFile calls should have timeout option
      const calls = mockExecFile.mock.calls;
      for (const call of calls) {
        const opts = call[2] as { timeout?: number } | undefined;
        if (opts && typeof opts === 'object') {
          expect(opts.timeout).toBeDefined();
          expect(opts.timeout).toBeGreaterThan(0);
          expect(opts.timeout).toBeLessThanOrEqual(120_000);
        }
      }
    });
  });
});
