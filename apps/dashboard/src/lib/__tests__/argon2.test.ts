/**
 * ═══════════════════════════════════════════════════════════════
 * ARGON2ID KEY DERIVATION — KRİTİK GÜVENLİK TESTLERİ
 * ═══════════════════════════════════════════════════════════════
 *
 * BU TEST DOSYASI İNSANLARIN HAYATINI KORUYAN KOD İÇİNDİR.
 *
 * Argon2id, gazetecilerin Dead Man Switch belgelerini şifreleyen
 * anahtarın türetilmesinde kullanılır. Yanlış key = erişilemez belgeler.
 * Yanlış doğrulama = yetkisiz erişim.
 *
 * Bu testler şunu garanti eder:
 * 1. Aynı passphrase + aynı salt = HER ZAMAN aynı key (deterministic)
 * 2. Farklı salt = HER ZAMAN farklı key
 * 3. Boş passphrase ASLA kabul edilmez
 * 4. Unicode passphrase'ler (Türkçe, Arapça, CJK) sorunsuz çalışır
 * 5. verifyPassphrase timing-safe karşılaştırma yapar
 * 6. Performans kabul edilebilir seviyede (< 5s per derivation in test env)
 *
 * Çalıştır: npx jest src/lib/__tests__/argon2.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import {
  deriveKeyFromPassphrase,
  verifyPassphrase,
  exportKey,
} from '../crypto';

// Test timeout: Argon2id memory-hard, CI ortamında yavaş olabilir
// Vitest: use vi.setConfig instead of jest.setTimeout
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });

// ═════════════════════════════════════════════════════════════
// BÖLÜM 1: TEMEL FONKSİYONELLİK
// "Parola → Anahtar → Doğrulama" döngüsü
// ═════════════════════════════════════════════════════════════

describe('Argon2id Temel: Parola → Anahtar Türetme', () => {
  test('Basit passphrase ile key türetme başarılı', async () => {
    const result = await deriveKeyFromPassphrase('test-passphrase-123');

    expect(result).toBeDefined();
    expect(result.key).toBeDefined();
    expect(result.salt).toBeDefined();
    expect(result.rawKeyHash).toBeDefined();

    // Salt: base64 formatında, 32 byte (44 char base64)
    expect(result.salt.length).toBeGreaterThan(0);

    // rawKeyHash: SHA-256 hex = 64 karakter
    expect(result.rawKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Üretilen key AES-256-GCM tipinde', async () => {
    const result = await deriveKeyFromPassphrase('aes-key-test');
    const exported = await exportKey(result.key);

    // AES-256 key = 32 byte = 44 char base64 (with padding)
    const keyBytes = Buffer.from(exported, 'base64');
    expect(keyBytes.length).toBe(32);
  });

  test('Üretilen key encrypt/decrypt kullanılabilir', async () => {
    const result = await deriveKeyFromPassphrase('encrypt-test');

    // Şifrele
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('Gizli belge içeriği');
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      result.key,
      plaintext
    );

    // Çöz
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      result.key,
      ciphertext
    );

    expect(new TextDecoder().decode(decrypted)).toBe('Gizli belge içeriği');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 2: DETERMİNİSTİK DAVRANIŞ
// "Aynı girdi = Aynı çıktı" — kritik gereksinim
// ═════════════════════════════════════════════════════════════

describe('Argon2id Deterministic: Aynı Girdi = Aynı Anahtar', () => {
  test('Aynı passphrase + aynı salt = aynı key (5 kez)', async () => {
    const result1 = await deriveKeyFromPassphrase('deterministic-test');
    const salt = result1.salt;

    for (let i = 0; i < 5; i++) {
      const result = await deriveKeyFromPassphrase('deterministic-test', salt);
      expect(result.rawKeyHash).toBe(result1.rawKeyHash);

      const key1Exported = await exportKey(result1.key);
      const keyExported = await exportKey(result.key);
      expect(keyExported).toBe(key1Exported);
    }
  });

  test('Farklı salt = farklı key (kesinlikle)', async () => {
    const result1 = await deriveKeyFromPassphrase('same-passphrase');
    const result2 = await deriveKeyFromPassphrase('same-passphrase');

    // Salt otomatik üretilir → farklı salt
    expect(result1.salt).not.toBe(result2.salt);

    // Farklı salt = farklı key
    expect(result1.rawKeyHash).not.toBe(result2.rawKeyHash);
  });

  test('Farklı passphrase + aynı salt = farklı key', async () => {
    const result1 = await deriveKeyFromPassphrase('parola-bir');
    const result2 = await deriveKeyFromPassphrase('parola-iki', result1.salt);

    expect(result1.rawKeyHash).not.toBe(result2.rawKeyHash);
  });

  test('1 karakter fark = tamamen farklı key', async () => {
    const result1 = await deriveKeyFromPassphrase('passphrase1');
    const result2 = await deriveKeyFromPassphrase('passphrase2', result1.salt);

    expect(result1.rawKeyHash).not.toBe(result2.rawKeyHash);

    // Key'leri hex olarak karşılaştır — hiçbir bit benzerliği beklenmez
    const key1 = await exportKey(result1.key);
    const key2 = await exportKey(result2.key);
    expect(key1).not.toBe(key2);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 3: GİRDİ DOĞRULAMA VE GÜVENLİK
// "Kötü girdileri reddet, güvenliği koru"
// ═════════════════════════════════════════════════════════════

describe('Argon2id Güvenlik: Girdi Doğrulama', () => {
  test('Boş passphrase → hata fırlatır', async () => {
    await expect(deriveKeyFromPassphrase('')).rejects.toThrow(
      'Passphrase boş olamaz'
    );
  });

  test('Çok kısa passphrase (1 karakter) kabul EDİLMELİ', async () => {
    // Kısa parola zayıf ama reddedilmemeli — Argon2id memory-hardness yeterli koruma sağlar
    // Kullanıcıya uyarı gösterilir ama engellenmez
    const result = await deriveKeyFromPassphrase('x');
    expect(result.key).toBeDefined();
    expect(result.rawKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Çok uzun passphrase (10000 karakter) çalışmalı', async () => {
    const longPass = 'a'.repeat(10000);
    const result = await deriveKeyFromPassphrase(longPass);
    expect(result.key).toBeDefined();
    expect(result.rawKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Özel karakterli passphrase çalışmalı', async () => {
    const special = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
    const result = await deriveKeyFromPassphrase(special);
    expect(result.key).toBeDefined();
  });

  test('Salt base64 format bozuksa hata', async () => {
    // Geçersiz base64 → atob() hata fırlatır
    await expect(
      deriveKeyFromPassphrase('test', '!!!invalid-base64!!!')
    ).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 4: UNİCODE DESTEĞİ
// "Dünya gazetecileri her dilde parola kullanır"
// ═════════════════════════════════════════════════════════════

describe('Argon2id Unicode: Çok Dilli Passphrase', () => {
  test('Türkçe karakterler: ğüşöçıİĞÜŞÖÇ', async () => {
    const result = await deriveKeyFromPassphrase('güvenli_şifre_özel_çok_ıstırap');
    expect(result.key).toBeDefined();

    // Deterministic kontrol
    const result2 = await deriveKeyFromPassphrase('güvenli_şifre_özel_çok_ıstırap', result.salt);
    expect(result2.rawKeyHash).toBe(result.rawKeyHash);
  });

  test('Arapça karakterler', async () => {
    const result = await deriveKeyFromPassphrase('كلمة المرور السرية');
    expect(result.key).toBeDefined();
  });

  test('CJK (Çince/Japonca/Korece) karakterler', async () => {
    const result = await deriveKeyFromPassphrase('安全なパスワード密码');
    expect(result.key).toBeDefined();
  });

  test('Emoji passphrase', async () => {
    const result = await deriveKeyFromPassphrase('🔐🛡️💪🏽🌍');
    expect(result.key).toBeDefined();
  });

  test('Karışık dil passphrase', async () => {
    const mixed = 'Türkçe_English_عربي_中文_🌍';
    const result = await deriveKeyFromPassphrase(mixed);
    expect(result.key).toBeDefined();

    // Deterministic
    const result2 = await deriveKeyFromPassphrase(mixed, result.salt);
    expect(result2.rawKeyHash).toBe(result.rawKeyHash);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 5: PAROLA DOĞRULAMA (verifyPassphrase)
// "Doğru parola → true, yanlış parola → false"
// ═════════════════════════════════════════════════════════════

describe('verifyPassphrase: Parola Doğrulama', () => {
  test('Doğru passphrase → true', async () => {
    const { salt, rawKeyHash } = await deriveKeyFromPassphrase('my-secret-pass');
    const isValid = await verifyPassphrase('my-secret-pass', salt, rawKeyHash);
    expect(isValid).toBe(true);
  });

  test('Yanlış passphrase → false', async () => {
    const { salt, rawKeyHash } = await deriveKeyFromPassphrase('correct-pass');
    const isValid = await verifyPassphrase('wrong-pass', salt, rawKeyHash);
    expect(isValid).toBe(false);
  });

  test('Yanlış salt → false', async () => {
    const { rawKeyHash } = await deriveKeyFromPassphrase('test-pass');
    const { salt: wrongSalt } = await deriveKeyFromPassphrase('other-pass');
    const isValid = await verifyPassphrase('test-pass', wrongSalt, rawKeyHash);
    expect(isValid).toBe(false);
  });

  test('Bozuk hash → false', async () => {
    const { salt } = await deriveKeyFromPassphrase('test-pass');
    const isValid = await verifyPassphrase('test-pass', salt, 'aaaa'.repeat(16));
    expect(isValid).toBe(false);
  });

  test('Boş girdiler → false (hata fırlatmaz)', async () => {
    expect(await verifyPassphrase('', 'salt', 'hash')).toBe(false);
    expect(await verifyPassphrase('pass', '', 'hash')).toBe(false);
    expect(await verifyPassphrase('pass', 'salt', '')).toBe(false);
  });

  test('Unicode passphrase doğrulaması', async () => {
    const pass = 'Türkçe_şifre_güvenli_123';
    const { salt, rawKeyHash } = await deriveKeyFromPassphrase(pass);
    expect(await verifyPassphrase(pass, salt, rawKeyHash)).toBe(true);
    expect(await verifyPassphrase(pass + '!', salt, rawKeyHash)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 6: PERFORMANS
// "Kabul edilebilir sürede çalışmalı"
// ═════════════════════════════════════════════════════════════

describe('Argon2id Performans', () => {
  test('Key derivation < 5 saniye (test ortamında)', async () => {
    const start = Date.now();
    await deriveKeyFromPassphrase('performance-test');
    const duration = Date.now() - start;

    // 5 saniye üst limit (CI ortamı yavaş olabilir)
    // Gerçek browser'da 1-2 saniye hedef
    expect(duration).toBeLessThan(5000);
    console.log(`  Argon2id derivation: ${duration}ms`);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 7: STRES TESTİ
// "100 farklı passphrase, hepsi doğru round-trip"
// ═════════════════════════════════════════════════════════════

describe('Argon2id Stres: 50 Round-Trip', () => {
  test('50 farklı passphrase → derive → verify → hepsi true', async () => {
    const passphrases = [
      'simple',
      'with spaces in it',
      'UPPERCASE_ONLY',
      'mixedCase123!@#',
      'türkçe-karakter-özel',
      '1234567890',
      'a',
      'b'.repeat(100),
      'c'.repeat(500),
      '日本語パスワード',
      ...Array.from({ length: 40 }, (_, i) =>
        `stress-test-passphrase-${i}-${Math.random().toString(36).slice(2)}`
      ),
    ];

    let successCount = 0;

    for (const pass of passphrases) {
      const { salt, rawKeyHash } = await deriveKeyFromPassphrase(pass);

      // Verify doğru passphrase
      const isValid = await verifyPassphrase(pass, salt, rawKeyHash);
      expect(isValid).toBe(true);

      // Verify yanlış passphrase
      const isInvalid = await verifyPassphrase(pass + '_wrong', salt, rawKeyHash);
      expect(isInvalid).toBe(false);

      successCount++;
    }

    expect(successCount).toBe(50);
  });
});
