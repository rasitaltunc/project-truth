/**
 * Unit Tests: Crypto Utilities
 * Security Sprint S3
 *
 * Note: These tests require Web Crypto API (available in Node 15+ and browsers).
 * If running in Node, ensure globalThis.crypto is available.
 *
 * Run: npx jest src/lib/__tests__/crypto.test.ts
 */

import {
  generateEncryptionKey,
  exportKey,
  importKey,
  encryptData,
  decryptData,
  hashData,
  generateSecureId,
  generateToken,
} from '../crypto';

// Skip tests if Web Crypto API is not available
const hasCrypto = typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';
const describeIfCrypto = hasCrypto ? describe : describe.skip;

describeIfCrypto('Crypto Utilities', () => {
  // Key generation and export/import
  test('generateEncryptionKey creates a CryptoKey', async () => {
    const key = await generateEncryptionKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
  });

  test('exportKey and importKey round-trip', async () => {
    const key = await generateEncryptionKey();
    const exported = await exportKey(key);
    expect(typeof exported).toBe('string');
    expect(exported.length).toBeGreaterThan(0);

    const imported = await importKey(exported);
    expect(imported).toBeDefined();
    expect(imported.type).toBe('secret');
  });

  // Encryption/decryption
  test('encrypt and decrypt round-trip for string data', async () => {
    const key = await generateEncryptionKey();
    const plaintext = 'Hello, World! This is a secret message.';

    const encrypted = await encryptData(plaintext, key);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(plaintext);

    const decrypted = await decryptData(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  test('encrypt produces different ciphertext for same plaintext (IV uniqueness)', async () => {
    const key = await generateEncryptionKey();
    const plaintext = 'same message encrypted twice';

    const encrypted1 = await encryptData(plaintext, key);
    const encrypted2 = await encryptData(plaintext, key);

    // IVs should be different
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    // Ciphertexts should be different (because of different IVs)
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

    // Both should decrypt to the same plaintext
    const decrypted1 = await decryptData(encrypted1, key);
    const decrypted2 = await decryptData(encrypted2, key);
    expect(decrypted1).toBe(plaintext);
    expect(decrypted2).toBe(plaintext);
  });

  test('decrypt with wrong key throws error', async () => {
    const key1 = await generateEncryptionKey();
    const key2 = await generateEncryptionKey();
    const plaintext = 'secret data';

    const encrypted = await encryptData(plaintext, key1);

    await expect(decryptData(encrypted, key2)).rejects.toThrow();
  });

  test('handles unicode text', async () => {
    const key = await generateEncryptionKey();
    const plaintext = 'Türkçe: ğüşöçıİĞÜŞÖÇ 日本語 العربية 🔐';

    const encrypted = await encryptData(plaintext, key);
    const decrypted = await decryptData(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  test('handles empty string', async () => {
    const key = await generateEncryptionKey();
    const encrypted = await encryptData('', key);
    const decrypted = await decryptData(encrypted, key);
    expect(decrypted).toBe('');
  });

  // Hashing
  test('hashData is deterministic', async () => {
    const data = 'test data for hashing';
    const hash1 = await hashData(data);
    const hash2 = await hashData(data);
    expect(hash1).toBe(hash2);
  });

  test('hashData produces different hashes for different data', async () => {
    const hash1 = await hashData('message 1');
    const hash2 = await hashData('message 2');
    expect(hash1).not.toBe(hash2);
  });

  test('hashData returns hex string', async () => {
    const hash = await hashData('test');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

// These don't require Web Crypto
describe('Utility Functions', () => {
  test('generateSecureId returns string of correct length', () => {
    const id = generateSecureId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('generateSecureId with custom length', () => {
    const id = generateSecureId(32);
    expect(typeof id).toBe('string');
    expect(id.length).toBe(32);
  });

  test('generateToken returns non-empty string', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('generateSecureId produces unique values', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId());
    }
    expect(ids.size).toBe(100); // All should be unique
  });
});
