/**
 * ═══════════════════════════════════════════════════════════════
 * ENVELOPE ENCRYPTION PIPELINE — KRİTİK GÜVENLİK TESTLERİ
 * ═══════════════════════════════════════════════════════════════
 *
 * BU TEST DOSYASI İNSANLARIN HAYATINI KORUYAN KOD İÇİNDİR.
 *
 * DEK/KEK envelope encryption, gazetecilerin belgelerini
 * iki katmanlı şifrelemeyle korur. Yanlış şifreleme = erişilemez belgeler.
 * Bozuk çözme = sahte güvenlik yanılsaması.
 *
 * Bu testler şunu garanti eder:
 * 1. Şifreleme → Çözme round-trip her dosya tipi için çalışır
 * 2. Yanlış passphrase ile çözme KESİNLİKLE başarısız olur
 * 3. Bozuk ciphertext ile çözme başarısız olur
 * 4. contentHash uyuşmazlığı IntegrityError fırlatır
 * 5. secureWipe sonrası buffer tamamen sıfır olur
 * 6. Metadata korunur (dosya adı, tip, boyut)
 * 7. Aynı dosya + aynı passphrase = FARKLI ciphertext (IV rastgele)
 * 8. Büyük dosyalar (1MB+) sorunsuz çalışır
 * 9. Unicode passphrase + dosya adı sorunsuz çalışır
 * 10. DEK ve KEK birbirinden bağımsız (DEK rastgele, KEK Argon2id)
 *
 * Çalıştır: npx jest src/lib/__tests__/encryption-pipeline.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import {
    encryptDocument,
    decryptDocument,
    secureWipe,
    IntegrityError,
    EncryptedBundle,
} from '../crypto';

// Argon2id memory-hard — test ortamında yavaş olabilir
// Vitest: use vi.setConfig instead of jest.setTimeout
import { vi } from 'vitest';
vi.setConfig({ testTimeout: 60000 });

// ═════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═════════════════════════════════════════════════════════════

/** Belirli boyutta rastgele içerikli test dosyası oluşturur */
function createTestFile(
    content: string | Uint8Array,
    name: string = 'test.txt',
    type: string = 'text/plain'
): File {
    const data = typeof content === 'string'
        ? new TextEncoder().encode(content)
        : content;
    return new File([data], name, { type, lastModified: Date.now() });
}

/** Büyük Uint8Array'e rastgele veri doldurur (65536 byte chunk'lar halinde) */
function fillRandom(buffer: Uint8Array): void {
    const CHUNK = 65536; // Web Crypto getRandomValues limiti
    for (let offset = 0; offset < buffer.length; offset += CHUNK) {
        const end = Math.min(offset + CHUNK, buffer.length);
        crypto.getRandomValues(buffer.subarray(offset, end));
    }
}

/** Belirli byte boyutunda rastgele dosya oluşturur */
function createRandomFile(sizeBytes: number, name: string = 'random.bin'): File {
    const data = new Uint8Array(sizeBytes);
    fillRandom(data);
    return new File([data], name, { type: 'application/octet-stream', lastModified: Date.now() });
}

/** İki File'ın byte-level eşit olduğunu doğrular */
async function filesAreEqual(a: File, b: File): Promise<boolean> {
    if (a.size !== b.size) return false;
    const bufA = new Uint8Array(await a.arrayBuffer());
    const bufB = new Uint8Array(await b.arrayBuffer());
    for (let i = 0; i < bufA.length; i++) {
        if (bufA[i] !== bufB[i]) return false;
    }
    return true;
}

// ═════════════════════════════════════════════════════════════
// BÖLÜM 1: TEMEL ROUND-TRIP
// "Şifrele → Çöz → Aynı dosya geri gelsin"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Temel Round-Trip', () => {
    test('Basit metin dosyası round-trip', async () => {
        const originalContent = 'Bu bir gizli belgedir. Gazeteci hayatı buna bağlı.';
        const file = createTestFile(originalContent);
        const passphrase = 'güvenli-parola-123!';

        const bundle = await encryptDocument(file, passphrase);
        const recovered = await decryptDocument(bundle, passphrase);

        // İçerik doğrulama
        const recoveredText = await recovered.text();
        expect(recoveredText).toBe(originalContent);

        // Metadata doğrulama
        expect(recovered.name).toBe(file.name);
        expect(recovered.type).toBe(file.type);
        expect(recovered.size).toBe(file.size);
    });

    test('Bundle tüm alanları içeriyor', async () => {
        const file = createTestFile('test');
        const bundle = await encryptDocument(file, 'test-pass');

        expect(bundle.encryptedFile).toBeDefined();
        expect(bundle.encryptedFile.length).toBeGreaterThan(0);

        expect(bundle.fileIv).toBeDefined();
        expect(bundle.fileIv.length).toBeGreaterThan(0);

        expect(bundle.encryptedDEK).toBeDefined();
        expect(bundle.encryptedDEK.length).toBeGreaterThan(0);

        expect(bundle.dekIv).toBeDefined();
        expect(bundle.dekIv.length).toBeGreaterThan(0);

        expect(bundle.salt).toBeDefined();
        expect(bundle.salt.length).toBeGreaterThan(0);

        expect(bundle.contentHash).toBeDefined();
        expect(bundle.contentHash).toMatch(/^[0-9a-f]{64}$/);

        expect(bundle.metadata).toBeDefined();
        expect(bundle.metadata.name).toBe('test.txt');
        expect(bundle.metadata.type).toBe('text/plain');
    });

    test('Boş passphrase reddedilir (encryptDocument)', async () => {
        const file = createTestFile('test');
        await expect(encryptDocument(file, '')).rejects.toThrow('Passphrase boş olamaz');
    });

    test('Boş passphrase reddedilir (decryptDocument)', async () => {
        const file = createTestFile('test');
        const bundle = await encryptDocument(file, 'valid-pass');
        await expect(decryptDocument(bundle, '')).rejects.toThrow('Passphrase boş olamaz');
    });

    test('Null/undefined bundle reddedilir', async () => {
        await expect(decryptDocument(null as any, 'pass')).rejects.toThrow('Bundle boş olamaz');
        await expect(decryptDocument(undefined as any, 'pass')).rejects.toThrow('Bundle boş olamaz');
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 2: GÜVENLİK — YANLIŞ PASSPHRASE
// "Yanlış parola ile ASLA çözülememeli"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Yanlış Passphrase Reddi', () => {
    test('Yanlış passphrase → hata fırlatır', async () => {
        const file = createTestFile('Gizli içerik');
        const bundle = await encryptDocument(file, 'doğru-parola');

        await expect(
            decryptDocument(bundle, 'yanlış-parola')
        ).rejects.toThrow();
    });

    test('Benzer passphrase (1 karakter fark) → hata', async () => {
        const file = createTestFile('Önemli belge');
        const bundle = await encryptDocument(file, 'passphrase1');

        await expect(
            decryptDocument(bundle, 'passphrase2')
        ).rejects.toThrow();
    });

    test('Boşluklu passphrase farkı → hata', async () => {
        const file = createTestFile('test');
        const bundle = await encryptDocument(file, 'my password');

        await expect(
            decryptDocument(bundle, 'my  password') // çift boşluk
        ).rejects.toThrow();
    });

    test('Case-sensitive passphrase', async () => {
        const file = createTestFile('test');
        const bundle = await encryptDocument(file, 'MyPassword');

        await expect(
            decryptDocument(bundle, 'mypassword')
        ).rejects.toThrow();
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 3: GÜVENLİK — BOZUK BUNDLE
// "Değiştirilmiş veri reddedilmeli"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Bozuk Bundle Reddi', () => {
    test('Bozuk encryptedFile → decrypt hatası', async () => {
        const file = createTestFile('Gizli');
        const bundle = await encryptDocument(file, 'test-pass');

        // encryptedFile'ı boz
        const tampered = { ...bundle, encryptedFile: bundle.encryptedFile + 'BOZUK' };

        await expect(
            decryptDocument(tampered, 'test-pass')
        ).rejects.toThrow();
    });

    test('Bozuk encryptedDEK → decrypt hatası', async () => {
        const file = createTestFile('Gizli');
        const bundle = await encryptDocument(file, 'test-pass');

        // DEK'i boz
        const tampered = { ...bundle, encryptedDEK: 'TAMAMEN_BOZUK_BASE64==' };

        await expect(
            decryptDocument(tampered, 'test-pass')
        ).rejects.toThrow();
    });

    test('Yanlış salt → decrypt hatası (farklı KEK türetilir)', async () => {
        const file = createTestFile('Gizli');
        const bundle = await encryptDocument(file, 'test-pass');

        // Farklı salt oluştur
        const fakeSalt = new Uint8Array(32);
        crypto.getRandomValues(fakeSalt);
        let binary = '';
        for (let i = 0; i < fakeSalt.length; i++) {
            binary += String.fromCharCode(fakeSalt[i]);
        }
        const fakeSaltBase64 = btoa(binary);

        const tampered = { ...bundle, salt: fakeSaltBase64 };

        await expect(
            decryptDocument(tampered, 'test-pass')
        ).rejects.toThrow();
    });

    test('Değiştirilmiş contentHash → IntegrityError', async () => {
        const file = createTestFile('Orijinal içerik');
        const bundle = await encryptDocument(file, 'test-pass');

        // Hash'i değiştir — dosya doğru çözülür ama hash eşleşmez
        const tampered = {
            ...bundle,
            contentHash: 'a'.repeat(64), // sahte hash
        };

        await expect(
            decryptDocument(tampered, 'test-pass')
        ).rejects.toThrow(IntegrityError);
    });

    test('IntegrityError doğru mesajı taşır', async () => {
        const file = createTestFile('İçerik');
        const bundle = await encryptDocument(file, 'pass');

        const tampered = { ...bundle, contentHash: 'b'.repeat(64) };

        try {
            await decryptDocument(tampered, 'pass');
            fail('IntegrityError fırlatılmalıydı');
        } catch (err) {
            expect(err).toBeInstanceOf(IntegrityError);
            expect((err as IntegrityError).message).toContain('bütünlüğü doğrulanamadı');
            expect((err as IntegrityError).name).toBe('IntegrityError');
        }
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 4: FARKLI DOSYA TİPLERİ
// "PDF, JPEG, DOCX — her format çalışmalı"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Farklı Dosya Tipleri', () => {
    const fileTypes = [
        { name: 'document.txt', type: 'text/plain' },
        { name: 'report.pdf', type: 'application/pdf' },
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'evidence.png', type: 'image/png' },
        { name: 'transcript.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'data.json', type: 'application/json' },
        { name: 'archive.zip', type: 'application/zip' },
        { name: 'video.mp4', type: 'video/mp4' },
    ];

    test.each(fileTypes)('$name ($type) round-trip', async ({ name, type }) => {
        // 1KB rastgele içerik
        const content = new Uint8Array(1024);
        crypto.getRandomValues(content);

        const file = new File([content], name, { type, lastModified: Date.now() });
        const passphrase = 'multi-type-test-' + name;

        const bundle = await encryptDocument(file, passphrase);
        const recovered = await decryptDocument(bundle, passphrase);

        // Metadata doğrula
        expect(recovered.name).toBe(name);
        expect(recovered.type).toBe(type);
        expect(recovered.size).toBe(file.size);

        // İçerik doğrula
        expect(await filesAreEqual(file, recovered)).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 5: SINIR DURUMLAR (Edge Cases)
// "1 byte'dan 1 MB'a — her boyut çalışmalı"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Sınır Durumlar', () => {
    test('1 byte dosya', async () => {
        const file = createTestFile(new Uint8Array([0x42]));
        const bundle = await encryptDocument(file, 'tiny-file');
        const recovered = await decryptDocument(bundle, 'tiny-file');

        expect(recovered.size).toBe(1);
        const buf = new Uint8Array(await recovered.arrayBuffer());
        expect(buf[0]).toBe(0x42);
    });

    test('100 byte dosya', async () => {
        const file = createRandomFile(100);
        const bundle = await encryptDocument(file, 'small-file');
        const recovered = await decryptDocument(bundle, 'small-file');
        expect(await filesAreEqual(file, recovered)).toBe(true);
    });

    test('10 KB dosya', async () => {
        const file = createRandomFile(10 * 1024);
        const bundle = await encryptDocument(file, 'medium-file');
        const recovered = await decryptDocument(bundle, 'medium-file');
        expect(await filesAreEqual(file, recovered)).toBe(true);
    });

    test('1 MB dosya', async () => {
        const file = createRandomFile(1024 * 1024);
        const bundle = await encryptDocument(file, 'large-file');
        const recovered = await decryptDocument(bundle, 'large-file');
        expect(await filesAreEqual(file, recovered)).toBe(true);
    });

    test('Çok kısa passphrase (1 karakter)', async () => {
        const file = createTestFile('test');
        const bundle = await encryptDocument(file, 'x');
        const recovered = await decryptDocument(bundle, 'x');
        expect(await recovered.text()).toBe('test');
    });

    test('Çok uzun passphrase (5000 karakter)', async () => {
        const file = createTestFile('test');
        const longPass = 'a'.repeat(5000);
        const bundle = await encryptDocument(file, longPass);
        const recovered = await decryptDocument(bundle, longPass);
        expect(await recovered.text()).toBe('test');
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 6: UNICODE DESTEĞI
// "Dünya gazetecileri her dilde belge ve parola kullanır"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Unicode', () => {
    test('Türkçe passphrase + Türkçe içerik', async () => {
        const file = createTestFile('İstanbul\'da gizli toplantı yapıldı. Özel belgeler var.');
        const bundle = await encryptDocument(file, 'güvenli_şifre_özel');
        const recovered = await decryptDocument(bundle, 'güvenli_şifre_özel');
        expect(await recovered.text()).toBe('İstanbul\'da gizli toplantı yapıldı. Özel belgeler var.');
    });

    test('Arapça passphrase', async () => {
        const file = createTestFile('Arabic content test');
        const bundle = await encryptDocument(file, 'كلمة المرور السرية');
        const recovered = await decryptDocument(bundle, 'كلمة المرور السرية');
        expect(await recovered.text()).toBe('Arabic content test');
    });

    test('CJK passphrase', async () => {
        const file = createTestFile('CJK content test');
        const bundle = await encryptDocument(file, '安全なパスワード');
        const recovered = await decryptDocument(bundle, '安全なパスワード');
        expect(await recovered.text()).toBe('CJK content test');
    });

    test('Emoji passphrase', async () => {
        const file = createTestFile('emoji test');
        const bundle = await encryptDocument(file, '🔐🛡️💪🏽');
        const recovered = await decryptDocument(bundle, '🔐🛡️💪🏽');
        expect(await recovered.text()).toBe('emoji test');
    });

    test('Unicode dosya adı korunur', async () => {
        const file = createTestFile('test', 'belge_özel_şifrelı.txt');
        const bundle = await encryptDocument(file, 'pass');
        const recovered = await decryptDocument(bundle, 'pass');
        expect(recovered.name).toBe('belge_özel_şifrelı.txt');
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 7: KRİPTOGRAFİK ÖZELLİKLER
// "Her şifreleme benzersiz olmalı (IV rastgele)"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Kriptografik Özellikler', () => {
    test('Aynı dosya + aynı passphrase = FARKLI ciphertext', async () => {
        const file1 = createTestFile('Aynı içerik');
        const file2 = createTestFile('Aynı içerik');
        const passphrase = 'same-pass';

        const bundle1 = await encryptDocument(file1, passphrase);
        const bundle2 = await encryptDocument(file2, passphrase);

        // IV'ler farklı olmalı
        expect(bundle1.fileIv).not.toBe(bundle2.fileIv);
        expect(bundle1.dekIv).not.toBe(bundle2.dekIv);

        // Salt farklı olmalı (her seferinde yeni Argon2id salt)
        expect(bundle1.salt).not.toBe(bundle2.salt);

        // Ciphertext farklı olmalı
        expect(bundle1.encryptedFile).not.toBe(bundle2.encryptedFile);
        expect(bundle1.encryptedDEK).not.toBe(bundle2.encryptedDEK);

        // Ama contentHash AYNI olmalı (aynı plaintext)
        expect(bundle1.contentHash).toBe(bundle2.contentHash);
    });

    test('DEK her seferinde farklı (rastgele üretiliyor)', async () => {
        const file = createTestFile('test');

        // İki şifreleme — farklı DEK'ler üretilmeli
        const bundle1 = await encryptDocument(file, 'pass');
        const bundle2 = await encryptDocument(file, 'pass');

        // encryptedDEK farklı olmalı (farklı DEK + farklı KEK salt + farklı IV)
        expect(bundle1.encryptedDEK).not.toBe(bundle2.encryptedDEK);
    });

    test('contentHash deterministik (aynı dosya = aynı hash)', async () => {
        const content = 'Deterministik hash testi';
        const file1 = createTestFile(content);
        const file2 = createTestFile(content);

        const bundle1 = await encryptDocument(file1, 'pass1');
        const bundle2 = await encryptDocument(file2, 'pass2'); // farklı passphrase bile olsa

        expect(bundle1.contentHash).toBe(bundle2.contentHash);
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 8: secureWipe
// "Hassas veri bellekten tamamen silinmeli"
// ═════════════════════════════════════════════════════════════

describe('secureWipe: Bellek Temizleme', () => {
    test('Wipe sonrası buffer tamamen sıfır', () => {
        const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        secureWipe(buffer);

        for (let i = 0; i < buffer.length; i++) {
            expect(buffer[i]).toBe(0);
        }
    });

    test('Büyük buffer (1 MB) wipe', () => {
        const buffer = new Uint8Array(1024 * 1024);
        fillRandom(buffer);

        // Wipe öncesi sıfır olmadığını doğrula
        let hasNonZero = false;
        for (let i = 0; i < 100; i++) {
            if (buffer[i] !== 0) {
                hasNonZero = true;
                break;
            }
        }
        expect(hasNonZero).toBe(true);

        // Wipe
        secureWipe(buffer);

        // Her byte sıfır olmalı
        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] !== 0) {
                fail(`Byte ${i} sıfır değil: ${buffer[i]}`);
                return;
            }
        }
    });

    test('Boş buffer wipe → hata fırlatmaz', () => {
        expect(() => secureWipe(new Uint8Array(0))).not.toThrow();
        expect(() => secureWipe(null as any)).not.toThrow();
        expect(() => secureWipe(undefined as any)).not.toThrow();
    });

    test('32 byte key-size buffer wipe', () => {
        const keyBuffer = new Uint8Array(32);
        crypto.getRandomValues(keyBuffer);
        secureWipe(keyBuffer);

        const allZero = keyBuffer.every(b => b === 0);
        expect(allZero).toBe(true);
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 9: STRES TESTİ
// "20 farklı senaryo, hepsi doğru round-trip"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Stres Testi (20 Round-Trip)', () => {
    test('20 farklı dosya + passphrase kombinasyonu', async () => {
        const scenarios = [
            { content: 'simple text', pass: 'simple', name: 'a.txt' },
            { content: 'with spaces in it', pass: 'spaces pass', name: 'b.txt' },
            { content: 'UPPERCASE', pass: 'UPPER_PASS', name: 'C.TXT' },
            { content: 'türkçe içerik ğüşöçı', pass: 'türkçe_parola', name: 'belge.txt' },
            { content: '日本語テスト', pass: '日本語パスワード', name: 'test.txt' },
            { content: '🔐💪🌍', pass: '🔐🛡️', name: 'emoji.txt' },
            { content: '!@#$%^&*()', pass: '!@#$%^&*()', name: 'special.txt' },
            { content: 'a', pass: 'x', name: 'tiny.txt' },
            { content: 'b'.repeat(10000), pass: 'long-content', name: 'big.txt' },
            { content: 'mixed Türkçe English عربي 中文', pass: 'mixed_parola', name: 'mixed.txt' },
        ];

        // 10 metin + 10 rastgele binary = 20 toplam
        let successCount = 0;

        // Metin dosyalar
        for (const { content, pass, name } of scenarios) {
            const file = createTestFile(content, name);
            const bundle = await encryptDocument(file, pass);
            const recovered = await decryptDocument(bundle, pass);

            expect(await recovered.text()).toBe(content);
            expect(recovered.name).toBe(name);

            // Yanlış passphrase reddi
            await expect(decryptDocument(bundle, pass + '_wrong')).rejects.toThrow();

            successCount++;
        }

        // Binary dosyalar (farklı boyutlar)
        const binarySizes = [1, 10, 100, 512, 1024, 2048, 4096, 8192, 16384, 32768];
        for (const size of binarySizes) {
            const file = createRandomFile(size, `random_${size}.bin`);
            const pass = `binary-test-${size}`;

            const bundle = await encryptDocument(file, pass);
            const recovered = await decryptDocument(bundle, pass);

            expect(await filesAreEqual(file, recovered)).toBe(true);

            successCount++;
        }

        expect(successCount).toBe(20);
    });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 10: PERFORMANS
// "Kabul edilebilir sürede çalışmalı"
// ═════════════════════════════════════════════════════════════

describe('Envelope Encryption: Performans', () => {
    test('Küçük dosya encrypt+decrypt < 10 saniye', async () => {
        const file = createTestFile('Performans testi');
        const start = Date.now();

        const bundle = await encryptDocument(file, 'perf-test');
        await decryptDocument(bundle, 'perf-test');

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(10000);
        console.log(`  Encrypt+Decrypt (küçük dosya): ${duration}ms`);
    });

    test('1 MB dosya encrypt+decrypt < 15 saniye', async () => {
        const file = createRandomFile(1024 * 1024);
        const start = Date.now();

        const bundle = await encryptDocument(file, 'perf-large');
        await decryptDocument(bundle, 'perf-large');

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(15000);
        console.log(`  Encrypt+Decrypt (1 MB): ${duration}ms`);
    });
});
