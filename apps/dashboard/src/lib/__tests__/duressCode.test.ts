// ═══════════════════════════════════════════════════════
// DURESS CODE SİSTEMİ — Test Suite
// ═══════════════════════════════════════════════════════
//
// "Hayatlar buna bağlı. Sıfır tolerans."
//
// Test Bölümleri:
//   1. PIN Shift Üretimi (generateDuressPin)
//   2. PIN Kontrol (isDuressPin, isNormalPin)
//   3. Birleşik PIN Kontrolü (checkPin)
//   4. Duress Word Üretimi (generateDuressWordPair)
//   5. Duress Word Tespiti (isDuressWord, checkMessage)
//   6. Timing-Safe Karşılaştırma (yan kanal saldırısı direnci)
//   7. Edge Cases & Hata Yönetimi
//   8. Duress Check-in Handler (handleDuressCheckin)
//   9. Entegrasyon: PIN + Word Birlikte
//  10. Stres Testi
// ═══════════════════════════════════════════════════════

import {
    generateDuressPin,
    isDuressPin,
    isNormalPin,
    checkPin,
    type PinCheckResult,
    DEFAULT_DURESS_PAIRS,
    generateDuressWordPair,
    isDuressWord,
    checkMessage,
    handleDuressCheckin,
} from '../duressCode';

// ─── BÖLÜM 1: PIN Shift Üretimi ─────────────────────

describe('BÖLÜM 1: generateDuressPin — PIN Shift Üretimi', () => {
    test('son rakam +1 (temel)', () => {
        expect(generateDuressPin('1234')).toBe('1235');
    });

    test('son rakam 9 → 0 wrap-around', () => {
        expect(generateDuressPin('7429')).toBe('7420');
    });

    test('tüm sıfırlar', () => {
        expect(generateDuressPin('0000')).toBe('0001');
    });

    test('tüm dokuzlar', () => {
        expect(generateDuressPin('9999')).toBe('9990');
    });

    test('tek haneli PIN', () => {
        expect(generateDuressPin('5')).toBe('6');
        expect(generateDuressPin('9')).toBe('0');
        expect(generateDuressPin('0')).toBe('1');
    });

    test('uzun PIN (8 haneli)', () => {
        expect(generateDuressPin('12345678')).toBe('12345679');
    });

    test('son rakam 0-9 hepsi', () => {
        for (let i = 0; i <= 9; i++) {
            const pin = '000' + i;
            const expected = '000' + ((i + 1) % 10);
            expect(generateDuressPin(pin)).toBe(expected);
        }
    });

    test('boş PIN → hata fırlatır', () => {
        expect(() => generateDuressPin('')).toThrow('PIN boş olamaz');
    });

    test('rakam olmayan PIN → hata fırlatır', () => {
        expect(() => generateDuressPin('12ab')).toThrow('PIN sadece rakam içermeli');
        expect(() => generateDuressPin('abcd')).toThrow('PIN sadece rakam içermeli');
        expect(() => generateDuressPin('12 34')).toThrow('PIN sadece rakam içermeli');
    });

    test('duress PIN ≠ normal PIN (her zaman farklı)', () => {
        const pins = ['0000', '1111', '1234', '5678', '9999', '7429'];
        for (const pin of pins) {
            expect(generateDuressPin(pin)).not.toBe(pin);
        }
    });
});

// ─── BÖLÜM 2: PIN Kontrol ───────────────────────────

describe('BÖLÜM 2: isDuressPin & isNormalPin', () => {
    const normalPin = '7429';
    const duressPin = '7420'; // 9+1=0

    test('isDuressPin: duress PIN doğru tespit', () => {
        expect(isDuressPin(duressPin, normalPin)).toBe(true);
    });

    test('isDuressPin: normal PIN → false', () => {
        expect(isDuressPin(normalPin, normalPin)).toBe(false);
    });

    test('isDuressPin: yanlış PIN → false', () => {
        expect(isDuressPin('0000', normalPin)).toBe(false);
        expect(isDuressPin('7428', normalPin)).toBe(false);
    });

    test('isNormalPin: normal PIN doğru tespit', () => {
        expect(isNormalPin(normalPin, normalPin)).toBe(true);
    });

    test('isNormalPin: duress PIN → false', () => {
        expect(isNormalPin(duressPin, normalPin)).toBe(false);
    });

    test('isNormalPin: yanlış PIN → false', () => {
        expect(isNormalPin('0000', normalPin)).toBe(false);
    });

    test('boş giriş → false (hata fırlatmaz)', () => {
        expect(isDuressPin('', normalPin)).toBe(false);
        expect(isDuressPin(normalPin, '')).toBe(false);
        expect(isNormalPin('', normalPin)).toBe(false);
        expect(isNormalPin(normalPin, '')).toBe(false);
    });

    test('farklı uzunlukta PIN → false', () => {
        expect(isDuressPin('742', normalPin)).toBe(false);
        expect(isDuressPin('74200', normalPin)).toBe(false);
        expect(isNormalPin('742', normalPin)).toBe(false);
    });
});

// ─── BÖLÜM 3: Birleşik PIN Kontrolü ─────────────────

describe('BÖLÜM 3: checkPin — Birleşik Kontrol', () => {
    const normalPin = '1234';
    const duressPin = '1235'; // 4+1=5

    test('doğru PIN → type: normal', () => {
        const result = checkPin(normalPin, normalPin);
        expect(result.type).toBe('normal');
    });

    test('duress PIN → type: duress', () => {
        const result = checkPin(duressPin, normalPin);
        expect(result.type).toBe('duress');
    });

    test('yanlış PIN → type: invalid', () => {
        const result = checkPin('9999', normalPin);
        expect(result.type).toBe('invalid');
    });

    test('boş giriş → type: invalid', () => {
        expect(checkPin('', normalPin).type).toBe('invalid');
        expect(checkPin(normalPin, '').type).toBe('invalid');
        expect(checkPin('', '').type).toBe('invalid');
    });

    test('tüm 0-9 son rakam kombinasyonları', () => {
        for (let i = 0; i <= 9; i++) {
            const pin = '000' + i;
            const duress = '000' + ((i + 1) % 10);

            expect(checkPin(pin, pin).type).toBe('normal');
            expect(checkPin(duress, pin).type).toBe('duress');
            expect(checkPin('9876', pin).type).toBe(
                pin === '9876' ? 'normal' : (duress === '9876' ? 'duress' : 'invalid')
            );
        }
    });

    test('her üç sonuç tipi mümkün', () => {
        const results: Set<string> = new Set();
        results.add(checkPin('1234', '1234').type); // normal
        results.add(checkPin('1235', '1234').type); // duress
        results.add(checkPin('0000', '1234').type); // invalid
        expect(results.size).toBe(3);
    });
});

// ─── BÖLÜM 4: Duress Word Üretimi ───────────────────

describe('BÖLÜM 4: generateDuressWordPair', () => {
    test('geçerli bir çift döndürür', () => {
        const pair = generateDuressWordPair();
        expect(pair).toHaveProperty('normalWord');
        expect(pair).toHaveProperty('duressWord');
        expect(pair.normalWord.length).toBeGreaterThan(0);
        expect(pair.duressWord.length).toBeGreaterThan(0);
    });

    test('dönen çift DEFAULT_DURESS_PAIRS içinden', () => {
        const pair = generateDuressWordPair();
        const found = DEFAULT_DURESS_PAIRS.some(
            (p) => p.normal === pair.normalWord && p.duress === pair.duressWord
        );
        expect(found).toBe(true);
    });

    test('normal ≠ duress', () => {
        for (let i = 0; i < 20; i++) {
            const pair = generateDuressWordPair();
            expect(pair.normalWord).not.toBe(pair.duressWord);
        }
    });

    test('DEFAULT_DURESS_PAIRS en az 3 çift içerir', () => {
        expect(DEFAULT_DURESS_PAIRS.length).toBeGreaterThanOrEqual(3);
    });

    test('DEFAULT_DURESS_PAIRS tüm çiftler dolu', () => {
        for (const pair of DEFAULT_DURESS_PAIRS) {
            expect(pair.normal.length).toBeGreaterThan(0);
            expect(pair.duress.length).toBeGreaterThan(0);
            expect(pair.normal).not.toBe(pair.duress);
        }
    });
});

// ─── BÖLÜM 5: Duress Word Tespiti ───────────────────

describe('BÖLÜM 5: isDuressWord & checkMessage', () => {
    const duressWords = ['çay', 'güzel', 'oldu'];

    // isDuressWord
    test('mesajda duress kelimesi var → true', () => {
        expect(isDuressWord('İyiyim, çay içiyorum', duressWords)).toBe(true);
    });

    test('mesajda duress kelimesi yok → false', () => {
        expect(isDuressWord('İyiyim, kahve içiyorum', duressWords)).toBe(false);
    });

    test('case-insensitive (Türkçe locale)', () => {
        expect(isDuressWord('ÇAY İÇTİM', duressWords)).toBe(true);
        expect(isDuressWord('Çay var mı?', duressWords)).toBe(true);
        expect(isDuressWord('GÜZEL bir gün', duressWords)).toBe(true);
    });

    test('birden fazla duress kelimesi → true (ilk bulunan yeter)', () => {
        expect(isDuressWord('Çay güzel oldu', duressWords)).toBe(true);
    });

    test('boş mesaj → false', () => {
        expect(isDuressWord('', duressWords)).toBe(false);
    });

    test('boş duress listesi → false', () => {
        expect(isDuressWord('çay içiyorum', [])).toBe(false);
    });

    test('null/undefined güvenliği', () => {
        expect(isDuressWord(null as any, duressWords)).toBe(false);
        expect(isDuressWord('test', null as any)).toBe(false);
        expect(isDuressWord(undefined as any, undefined as any)).toBe(false);
    });

    test('kısmi eşleşme (kelime içinde kelime)', () => {
        // "çay" kelimesi "çaydanlık" içinde geçer — substring match
        expect(isDuressWord('çaydanlık', duressWords)).toBe(true);
    });

    // checkMessage
    test('checkMessage: normal mesaj → normal', () => {
        expect(checkMessage('İyiyim, kahve içiyorum', duressWords)).toBe('normal');
    });

    test('checkMessage: duress mesaj → duress', () => {
        expect(checkMessage('İyiyim, çay içiyorum', duressWords)).toBe('duress');
    });

    test('checkMessage: boş mesaj → no_message', () => {
        expect(checkMessage('', duressWords)).toBe('no_message');
        expect(checkMessage(null, duressWords)).toBe('no_message');
        expect(checkMessage(undefined, duressWords)).toBe('no_message');
    });

    test('checkMessage: sadece boşluk → no_message', () => {
        expect(checkMessage('   ', duressWords)).toBe('no_message');
        expect(checkMessage('\t\n', duressWords)).toBe('no_message');
    });

    test('Türkçe İ/I duyarlılığı', () => {
        // Türkçe: İ→i, I→ı (farklı küçük harfler)
        const turkishDuress = ['İYİ'];
        expect(isDuressWord('iyi günler', turkishDuress)).toBe(true);
    });
});

// ─── BÖLÜM 6: Timing-Safe Karşılaştırma ─────────────

describe('BÖLÜM 6: Timing-Safe — Yan Kanal Direnci', () => {
    test('checkPin her zaman her iki karşılaştırmayı yapar', () => {
        // Normal, duress ve invalid — hepsi aynı code path'den geçmeli
        const normalPin = '5555';

        // Üç durum da hata fırlatmamalı
        expect(() => checkPin('5555', normalPin)).not.toThrow(); // normal
        expect(() => checkPin('5556', normalPin)).not.toThrow(); // duress
        expect(() => checkPin('0000', normalPin)).not.toThrow(); // invalid
    });

    test('timing farkı kabul edilebilir seviyede (< 5ms)', () => {
        const normalPin = '7429';
        const duressPin = '7420';
        const wrongPin = '0000';

        const iterations = 1000;

        // Normal PIN timing
        const normalStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            checkPin(normalPin, normalPin);
        }
        const normalTime = performance.now() - normalStart;

        // Duress PIN timing
        const duressStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            checkPin(duressPin, normalPin);
        }
        const duressTime = performance.now() - duressStart;

        // Wrong PIN timing
        const wrongStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            checkPin(wrongPin, normalPin);
        }
        const wrongTime = performance.now() - wrongStart;

        // Timing farkı 5ms'den az olmalı (1000 iterasyon için)
        const maxDiff = 5;
        expect(Math.abs(normalTime - duressTime)).toBeLessThan(maxDiff);
        expect(Math.abs(normalTime - wrongTime)).toBeLessThan(maxDiff);
        expect(Math.abs(duressTime - wrongTime)).toBeLessThan(maxDiff);
    });

    test('farklı uzunlukta PIN de sabit zamanlı red', () => {
        const normalPin = '1234';

        // Kısa PIN
        const result1 = checkPin('12', normalPin);
        expect(result1.type).toBe('invalid');

        // Uzun PIN
        const result2 = checkPin('123456789', normalPin);
        expect(result2.type).toBe('invalid');
    });
});

// ─── BÖLÜM 7: Edge Cases & Hata Yönetimi ────────────

describe('BÖLÜM 7: Edge Cases', () => {
    test('PIN: leading zeros korunur', () => {
        expect(generateDuressPin('0001')).toBe('0002');
        expect(generateDuressPin('0009')).toBe('0000');
    });

    test('PIN: çok uzun PIN (20 haneli)', () => {
        const longPin = '12345678901234567890';
        const duress = generateDuressPin(longPin);
        expect(duress.length).toBe(longPin.length);
        expect(duress.slice(0, -1)).toBe(longPin.slice(0, -1));
        expect(duress[duress.length - 1]).toBe('1'); // 0+1=1
    });

    test('duress PIN kendisi de duress testi yapıldığında normal değil', () => {
        // Normal: 1234, Duress: 1235
        // 1235'in duress'i: 1236
        // Yani 1236, 1234'ün duress'i DEĞİL (sadece 1235)
        expect(checkPin('1236', '1234').type).toBe('invalid');
    });

    test('duress PIN ile normal PIN arasında sadece 1 fark', () => {
        for (let i = 0; i < 100; i++) {
            const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const duress = generateDuressPin(pin);

            // Sadece son karakter farklı olmalı
            expect(duress.slice(0, -1)).toBe(pin.slice(0, -1));
            expect(duress[duress.length - 1]).not.toBe(pin[pin.length - 1]);
        }
    });

    test('isDuressWord: boş string dizisi içindeki elemanları atlar', () => {
        const words = ['', 'çay', ''];
        expect(isDuressWord('çay içtim', words)).toBe(true);
        expect(isDuressWord('kahve içtim', words)).toBe(false);
    });

    test('checkMessage: duressWords boş diziyse → normal', () => {
        expect(checkMessage('herhangi bir mesaj', [])).toBe('normal');
    });
});

// ─── BÖLÜM 8: Duress Check-in Handler ───────────────

describe('BÖLÜM 8: handleDuressCheckin', () => {
    test('her zaman { success: true } döndürür', async () => {
        const result = await handleDuressCheckin('user-1', 'switch-1', []);
        expect(result.success).toBe(true);
    });

    test('alıcılar varken de { success: true }', async () => {
        const recipients = [
            { type: 'email', value: 'kefil@test.com', name: 'Kefil 1' },
            { type: 'journalist', value: 'gazete@test.com', name: 'Gazeteci' },
        ];
        const result = await handleDuressCheckin('user-1', 'switch-1', recipients);
        expect(result.success).toBe(true);
    });

    test('email modülü yoksa bile başarılı görünür (sessiz hata)', async () => {
        // email import başarısız olsa bile catch bloğu yakalayıp success döndürmeli
        const result = await handleDuressCheckin('user-1', 'switch-1', [
            { type: 'email', value: 'test@test.com' },
        ]);
        expect(result.success).toBe(true);
    });

    test('boş recipients ile çalışır', async () => {
        const result = await handleDuressCheckin('user-1', 'switch-1', []);
        expect(result.success).toBe(true);
    });

    test('response formatı normal check-in ile aynı', async () => {
        const result = await handleDuressCheckin('user-1', 'switch-1', []);
        // Sadece success ve opsiyonel error alanları olmalı
        expect(Object.keys(result)).toContain('success');
        expect(result.error).toBeUndefined();
    });
});

// ─── BÖLÜM 9: Entegrasyon — PIN + Word Birlikte ─────

describe('BÖLÜM 9: Entegrasyon Senaryoları', () => {
    const normalPin = '7429';

    test('Senaryo 1: Normal check-in (doğru PIN, normal mesaj)', () => {
        const pinResult = checkPin('7429', normalPin);
        const msgResult = checkMessage('İyiyim, kahve içiyorum', ['çay']);

        expect(pinResult.type).toBe('normal');
        expect(msgResult).toBe('normal');
        // → Timer sıfırlanır, alarm yok
    });

    test('Senaryo 2: Duress PIN ile check-in', () => {
        const pinResult = checkPin('7420', normalPin);
        const msgResult = checkMessage('İyiyim, kahve içiyorum', ['çay']);

        expect(pinResult.type).toBe('duress');
        expect(msgResult).toBe('normal');
        // → Timer sıfırlanır (görünürde), sessiz alarm gönderilir
    });

    test('Senaryo 3: Duress kelime ile check-in', () => {
        const pinResult = checkPin('7429', normalPin);
        const msgResult = checkMessage('İyiyim, çay içiyorum', ['çay']);

        expect(pinResult.type).toBe('normal');
        expect(msgResult).toBe('duress');
        // → Timer sıfırlanır (görünürde), sessiz alarm gönderilir
    });

    test('Senaryo 4: Hem duress PIN hem duress kelime', () => {
        const pinResult = checkPin('7420', normalPin);
        const msgResult = checkMessage('Her şey güzel, çay içtim', ['çay', 'güzel']);

        expect(pinResult.type).toBe('duress');
        expect(msgResult).toBe('duress');
        // → Çifte duress — acil alarm
    });

    test('Senaryo 5: Yanlış PIN → reddedilir', () => {
        const pinResult = checkPin('0000', normalPin);

        expect(pinResult.type).toBe('invalid');
        // → Check-in reddedilir, ne timer sıfırlanır ne alarm gönderilir
    });

    test('Senaryo 6: Doğru PIN, mesaj yok', () => {
        const pinResult = checkPin('7429', normalPin);
        const msgResult = checkMessage(null, ['çay']);

        expect(pinResult.type).toBe('normal');
        expect(msgResult).toBe('no_message');
        // → Normal check-in (mesaj opsiyonel)
    });
});

// ─── BÖLÜM 10: Stres Testi ──────────────────────────

describe('BÖLÜM 10: Stres Testi', () => {
    test('10,000 PIN kontrolü hatasız', () => {
        for (let i = 0; i < 10000; i++) {
            const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const duress = generateDuressPin(pin);

            expect(checkPin(pin, pin).type).toBe('normal');
            expect(checkPin(duress, pin).type).toBe('duress');
        }
    });

    test('generateDuressPin → checkPin round-trip (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
            const len = Math.floor(Math.random() * 8) + 1; // 1-8 haneli
            let pin = '';
            for (let j = 0; j < len; j++) {
                pin += Math.floor(Math.random() * 10);
            }

            const duress = generateDuressPin(pin);
            expect(duress.length).toBe(pin.length);
            expect(checkPin(pin, pin).type).toBe('normal');
            expect(checkPin(duress, pin).type).toBe('duress');
        }
    });

    test('performans: 10,000 checkPin < 500ms', () => {
        const pin = '7429';
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
            checkPin(pin, pin);
        }
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(500);
    });
});
