// ═══════════════════════════════════════════════════════
// DEVICE FINGERPRINT SİSTEMİ — Test Suite
// ═══════════════════════════════════════════════════════
//
// Browser API'leri mock SignalCollector ile simüle edilir.
// Node.js ortamında WebGL/Canvas/AudioContext yoktur — bu testler
// SignalCollector interface'i üzerinden çalışır.
//
// Test Bölümleri:
//   1. Fingerprint Üretimi (generateDeviceFingerprint)
//   2. Aynı Cihaz Tespiti (compareFingerprints)
//   3. Farklı Screen Boyutu
//   4. Tamamen Farklı Sinyaller
//   5. Kısmi Değişiklikler (OS/Browser güncelleme)
//   6. Graceful Fallback (WebGL/Canvas yok)
//   7. Threshold & isKnownDeviceScore
//   8. Cihaz İsmi Üretimi
//   9. Edge Cases
//  10. Stres Testi
// ═══════════════════════════════════════════════════════

import {
    generateDeviceFingerprint,
    compareFingerprints,
    isKnownDeviceScore,
    KNOWN_DEVICE_THRESHOLD,
    SIGNAL_WEIGHTS,
    type DeviceFingerprint,
    type DeviceSignals,
    type SignalCollector,
} from '../deviceFingerprint';

// ─── Mock Signal Collector ───────────────────────────

function createMockCollector(overrides: Partial<DeviceSignals> = {}): SignalCollector {
    const defaults: DeviceSignals = {
        screen: { width: 1920, height: 1080, pixelRatio: 2, colorDepth: 24 },
        os: 'MacIntel|macOS 14.2',
        browser: 'Blink|Chrome 120',
        timezone: 'Europe/Istanbul',
        webgl: 'Apple|Apple M1 Pro',
        canvas: 'data:image/png;base64,MOCK_CANVAS_HASH_ABC123',
        audio: '-45.23,-32.11,-28.99,-19.44,-15.67',
    };

    const signals = { ...defaults, ...overrides };

    return {
        collectScreen: () => signals.screen,
        collectOS: () => signals.os,
        collectBrowser: () => signals.browser,
        collectTimezone: () => signals.timezone,
        collectWebGL: () => signals.webgl,
        collectCanvas: () => signals.canvas,
        collectAudio: async () => signals.audio,
    };
}

/** İki fingerprint'i aynı mock sinyallerle oluştur */
async function createFingerprintPair(
    overridesA: Partial<DeviceSignals> = {},
    overridesB: Partial<DeviceSignals> = {}
): Promise<[DeviceFingerprint, DeviceFingerprint]> {
    const fpA = await generateDeviceFingerprint(createMockCollector(overridesA));
    const fpB = await generateDeviceFingerprint(createMockCollector(overridesB));
    return [fpA, fpB];
}

// ─── BÖLÜM 1: Fingerprint Üretimi ───────────────────

describe('BÖLÜM 1: generateDeviceFingerprint — Üretim', () => {
    test('geçerli DeviceFingerprint döndürür', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector());

        expect(fp.hash).toBeDefined();
        expect(fp.hash.length).toBeGreaterThan(0);
        expect(fp.signals).toBeDefined();
        expect(fp.generatedAt).toBeDefined();
        expect(new Date(fp.generatedAt).getTime()).not.toBeNaN();
    });

    test('hash hex formatında', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector());
        expect(fp.hash).toMatch(/^[a-f0-9]+$/);
    });

    test('tüm sinyal alanları dolu', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector());
        const s = fp.signals;

        expect(s.screen.width).toBe(1920);
        expect(s.screen.height).toBe(1080);
        expect(s.screen.pixelRatio).toBe(2);
        expect(s.screen.colorDepth).toBe(24);
        expect(s.os).toBe('MacIntel|macOS 14.2');
        expect(s.browser).toBe('Blink|Chrome 120');
        expect(s.timezone).toBe('Europe/Istanbul');
        expect(s.webgl).toBe('Apple|Apple M1 Pro');
        expect(s.canvas).toContain('MOCK_CANVAS_HASH');
        expect(s.audio).toContain('-45.23');
    });

    test('deviceName üretilir', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector());
        expect(fp.deviceName).toBeDefined();
        expect(fp.deviceName!.length).toBeGreaterThan(0);
    });
});

// ─── BÖLÜM 2: Aynı Cihaz Tespiti ───────────────────

describe('BÖLÜM 2: Aynı Cihaz — Tam Eşleşme', () => {
    test('aynı sinyallerle üretilen iki fingerprint → skor 1.0', async () => {
        const [fp1, fp2] = await createFingerprintPair();
        const score = compareFingerprints(fp1, fp2);
        expect(score).toBe(1.0);
    });

    test('aynı sinyallerle üretilen hash aynı', async () => {
        const [fp1, fp2] = await createFingerprintPair();
        expect(fp1.hash).toBe(fp2.hash);
    });

    test('skor 1.0 → isKnownDeviceScore true', () => {
        expect(isKnownDeviceScore(1.0)).toBe(true);
    });
});

// ─── BÖLÜM 3: Farklı Screen Boyutu ──────────────────

describe('BÖLÜM 3: Farklı Screen Boyutu', () => {
    test('farklı genişlik → skor < 1.0', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { screen: { width: 2560, height: 1080, pixelRatio: 2, colorDepth: 24 } }
        );
        const score = compareFingerprints(fp1, fp2);
        expect(score).toBeLessThan(1.0);
    });

    test('sadece pixelRatio farklı → skor yüksek (0.75+)', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { screen: { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 } }
        );
        const score = compareFingerprints(fp1, fp2);
        // Screen'in 4 alanından 3'ü aynı → screen skor 0.75
        // Diğer tüm sinyaller aynı → yüksek toplam skor
        expect(score).toBeGreaterThan(0.9);
    });

    test('tamamen farklı screen → screen katkısı 0', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { screen: { width: 800, height: 600, pixelRatio: 1, colorDepth: 16 } }
        );
        const score = compareFingerprints(fp1, fp2);
        // Screen 0, diğerleri 1.0 → 1.0 - 0.15 = 0.85
        expect(score).toBe(1.0 - SIGNAL_WEIGHTS.screen);
    });
});

// ─── BÖLÜM 4: Tamamen Farklı Sinyaller ──────────────

describe('BÖLÜM 4: Tamamen Farklı Cihaz', () => {
    test('hiçbir sinyal eşleşmiyor → skor ≈ 0.0', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            {
                screen: { width: 800, height: 600, pixelRatio: 1, colorDepth: 16 },
                os: 'Win32|Windows 10',
                browser: 'Gecko|Firefox 115',
                timezone: 'America/New_York',
                webgl: 'NVIDIA|GeForce RTX 3080',
                canvas: 'data:image/png;base64,TOTALLY_DIFFERENT',
                audio: '-10.00,-5.00,-2.00,-1.00,-0.50',
            }
        );
        const score = compareFingerprints(fp1, fp2);
        expect(score).toBeLessThan(0.5);
    });

    test('tamamen farklı → isKnownDeviceScore false', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            {
                screen: { width: 800, height: 600, pixelRatio: 1, colorDepth: 16 },
                os: 'Linux|Ubuntu',
                browser: 'Gecko|Firefox 100',
                timezone: 'Asia/Tokyo',
                webgl: 'Intel|UHD 630',
                canvas: 'different_canvas',
                audio: 'different_audio',
            }
        );
        const score = compareFingerprints(fp1, fp2);
        expect(isKnownDeviceScore(score)).toBe(false);
    });
});

// ─── BÖLÜM 5: Kısmi Değişiklikler ───────────────────

describe('BÖLÜM 5: OS/Browser Güncelleme Toleransı', () => {
    test('sadece browser version değişti → skor yüksek (aynı cihaz)', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { browser: 'Blink|Chrome 121' } // 120 → 121
        );
        const score = compareFingerprints(fp1, fp2);
        // Browser engine aynı → 0.5 * 0.05 = 0.025 kayıp
        // Toplam: 1.0 - 0.025 = 0.975
        expect(score).toBeGreaterThan(0.95);
        expect(isKnownDeviceScore(score)).toBe(true);
    });

    test('sadece OS version değişti → skor yüksek', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { os: 'MacIntel|macOS 15.0' } // 14.2 → 15.0
        );
        const score = compareFingerprints(fp1, fp2);
        // OS platform aynı → 0.5 * 0.10 = 0.05 kayıp
        expect(score).toBeGreaterThan(0.9);
        expect(isKnownDeviceScore(score)).toBe(true);
    });

    test('hem OS hem browser değişti → hala bilinen cihaz', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            {
                os: 'MacIntel|macOS 15.0',
                browser: 'Blink|Chrome 122',
            }
        );
        const score = compareFingerprints(fp1, fp2);
        // OS: 0.5, Browser: 0.5 → küçük kayıp
        expect(score).toBeGreaterThan(0.9);
        expect(isKnownDeviceScore(score)).toBe(true);
    });

    test('tamamen farklı browser (Chrome → Firefox) → skor düşer ama hala tolere edilebilir', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { browser: 'Gecko|Firefox 120' }
        );
        const score = compareFingerprints(fp1, fp2);
        // Browser tamamen farklı (0.0) → 0.05 kayıp
        expect(score).toBe(1.0 - SIGNAL_WEIGHTS.browser);
        expect(isKnownDeviceScore(score)).toBe(true);
    });

    test('timezone değişikliği (seyahat) → skor düşer', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { timezone: 'America/Los_Angeles' }
        );
        const score = compareFingerprints(fp1, fp2);
        // Timezone 0.15 kayıp
        expect(score).toBe(1.0 - SIGNAL_WEIGHTS.timezone);
        expect(isKnownDeviceScore(score)).toBe(true); // hala 0.85 > 0.75
    });

    test('WebGL değişikliği (yeni GPU/driver) → büyük skor düşüşü', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { webgl: 'NVIDIA|GeForce RTX 4090' }
        );
        const score = compareFingerprints(fp1, fp2);
        // WebGL 0.25 kayıp → 0.75
        expect(score).toBe(1.0 - SIGNAL_WEIGHTS.webgl);
        expect(isKnownDeviceScore(score)).toBe(true); // tam sınırda
    });

    test('WebGL + canvas değişti → threshold altı', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            {
                webgl: 'Intel|UHD 630',
                canvas: 'different_canvas_data',
            }
        );
        const score = compareFingerprints(fp1, fp2);
        // WebGL 0.25 + Canvas 0.20 = 0.45 kayıp → 0.55
        expect(score).toBeLessThan(KNOWN_DEVICE_THRESHOLD);
        expect(isKnownDeviceScore(score)).toBe(false);
    });
});

// ─── BÖLÜM 6: Graceful Fallback ─────────────────────

describe('BÖLÜM 6: WebGL/Canvas Desteklenmeyen Ortam', () => {
    test('WebGL yok → fingerprint üretilir', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            webgl: 'no-webgl',
        }));
        expect(fp.hash).toBeDefined();
        expect(fp.signals.webgl).toBe('no-webgl');
    });

    test('Canvas yok → fingerprint üretilir', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            canvas: 'no-canvas',
        }));
        expect(fp.hash).toBeDefined();
        expect(fp.signals.canvas).toBe('no-canvas');
    });

    test('Audio yok → fingerprint üretilir', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            audio: 'no-audio',
        }));
        expect(fp.hash).toBeDefined();
        expect(fp.signals.audio).toBe('no-audio');
    });

    test('tüm ileri sinyaller yok → hala çalışır', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            webgl: 'no-webgl',
            canvas: 'no-canvas',
            audio: 'no-audio',
        }));
        expect(fp.hash).toBeDefined();
        expect(fp.signals.screen.width).toBe(1920); // Temel sinyaller hala var
    });

    test('her iki cihazda da WebGL yok → eşleşme (aynı fallback)', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            { webgl: 'no-webgl' },
            { webgl: 'no-webgl' }
        );
        const score = compareFingerprints(fp1, fp2);
        expect(score).toBe(1.0);
    });

    test('bir cihazda WebGL var, diğerinde yok → düşük skor', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { webgl: 'no-webgl' }
        );
        const score = compareFingerprints(fp1, fp2);
        expect(score).toBe(1.0 - SIGNAL_WEIGHTS.webgl);
    });
});

// ─── BÖLÜM 7: Threshold & isKnownDeviceScore ────────

describe('BÖLÜM 7: Threshold Kontrol', () => {
    test('KNOWN_DEVICE_THRESHOLD = 0.75', () => {
        expect(KNOWN_DEVICE_THRESHOLD).toBe(0.75);
    });

    test('skor 0.75 → bilinen', () => {
        expect(isKnownDeviceScore(0.75)).toBe(true);
    });

    test('skor 0.749 → bilinmeyen', () => {
        expect(isKnownDeviceScore(0.749)).toBe(false);
    });

    test('skor 0.0 → bilinmeyen', () => {
        expect(isKnownDeviceScore(0.0)).toBe(false);
    });

    test('skor 1.0 → bilinen', () => {
        expect(isKnownDeviceScore(1.0)).toBe(true);
    });

    test('ağırlıkların toplamı 1.0', () => {
        const total = Object.values(SIGNAL_WEIGHTS).reduce((sum, w) => sum + w, 0);
        expect(Math.round(total * 100) / 100).toBe(1.0);
    });
});

// ─── BÖLÜM 8: Cihaz İsmi Üretimi ───────────────────

describe('BÖLÜM 8: Device Name', () => {
    test('macOS + Chrome + Full HD', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector());
        expect(fp.deviceName).toContain('macOS');
        expect(fp.deviceName).toContain('Chrome');
        expect(fp.deviceName).toContain('1920x1080');
    });

    test('Windows + Firefox', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            os: 'Win32|Windows 10',
            browser: 'Gecko|Firefox 120',
        }));
        expect(fp.deviceName).toContain('Windows 10');
        expect(fp.deviceName).toContain('Firefox 120');
    });

    test('unknown OS → "Bilinmeyen Cihaz" veya sadece diğer parçalar', async () => {
        const fp = await generateDeviceFingerprint(createMockCollector({
            os: 'unknown|unknown',
            browser: 'unknown|unknown',
            screen: { width: 0, height: 0, pixelRatio: 1, colorDepth: 24 },
        }));
        // En az boş olmayan bir isim olmalı
        expect(fp.deviceName).toBeDefined();
    });
});

// ─── BÖLÜM 9: Edge Cases ────────────────────────────

describe('BÖLÜM 9: Edge Cases', () => {
    test('skor her zaman 0.0 ile 1.0 arasında', async () => {
        const testCases: Partial<DeviceSignals>[] = [
            {},
            { screen: { width: 0, height: 0, pixelRatio: 0, colorDepth: 0 } },
            { os: '', browser: '', timezone: '', webgl: '', canvas: '', audio: '' },
            { webgl: 'no-webgl', canvas: 'no-canvas', audio: 'no-audio' },
        ];

        const baseFp = await generateDeviceFingerprint(createMockCollector());

        for (const overrides of testCases) {
            const fp2 = await generateDeviceFingerprint(createMockCollector(overrides));
            const score = compareFingerprints(baseFp, fp2);
            expect(score).toBeGreaterThanOrEqual(0.0);
            expect(score).toBeLessThanOrEqual(1.0);
        }
    });

    test('compareFingerprints simetriktir (A,B) = (B,A)', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            {},
            { browser: 'Gecko|Firefox 120', timezone: 'Asia/Tokyo' }
        );
        const scoreAB = compareFingerprints(fp1, fp2);
        const scoreBA = compareFingerprints(fp2, fp1);
        expect(scoreAB).toBe(scoreBA);
    });

    test('pipe-separated string karşılaştırma: aynı engine farklı version', async () => {
        const [fp1, fp2] = await createFingerprintPair(
            { os: 'MacIntel|macOS 14.0' },
            { os: 'MacIntel|macOS 15.0' }
        );
        const score = compareFingerprints(fp1, fp2);
        // Platform aynı (MacIntel) → 0.5 kısmi eşleşme
        // OS ağırlığı 0.10, kayıp 0.5 * 0.10 = 0.05
        expect(score).toBe(1.0 - 0.5 * SIGNAL_WEIGHTS.os);
    });
});

// ─── BÖLÜM 10: Stres Testi ──────────────────────────

describe('BÖLÜM 10: Stres Testi', () => {
    test('100 fingerprint üretimi hatasız', async () => {
        for (let i = 0; i < 100; i++) {
            const fp = await generateDeviceFingerprint(createMockCollector({
                screen: {
                    width: 800 + (i * 10),
                    height: 600 + (i * 5),
                    pixelRatio: 1 + (i % 3),
                    colorDepth: 24,
                },
            }));
            expect(fp.hash).toBeDefined();
            expect(fp.hash.length).toBeGreaterThan(0);
        }
    });

    test('1000 karşılaştırma hatasız ve tutarlı', async () => {
        const baseFp = await generateDeviceFingerprint(createMockCollector());

        for (let i = 0; i < 1000; i++) {
            const fp2 = await generateDeviceFingerprint(createMockCollector({
                screen: {
                    width: 1920,
                    height: 1080,
                    pixelRatio: 2,
                    colorDepth: 24,
                },
            }));
            const score = compareFingerprints(baseFp, fp2);
            expect(score).toBe(1.0); // Aynı sinyaller → her zaman 1.0
        }
    });

    test('performans: 1000 fingerprint üretimi < 3s', async () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            await generateDeviceFingerprint(createMockCollector());
        }
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(3000);
    });
});
