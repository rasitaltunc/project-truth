// ═══════════════════════════════════════════════════════
// CHECK-IN ORCHESTRATOR — Test Suite
// ═══════════════════════════════════════════════════════
//
// Test Bölümleri:
//   1. Normal Check-in Akışı
//   2. Duress PIN Tespiti
//   3. Duress Word Tespiti
//   4. Çifte Duress (PIN + Word)
//   5. Yanlış PIN Red
//   6. Cihaz Doğrulama
//   7. Streak Hesaplama
//   8. Zaman Hesaplama (getTimeUntilNextCheckIn)
//   9. Edge Cases
//  10. Entegrasyon Senaryoları
// ═══════════════════════════════════════════════════════

import {
    orchestrateCheckIn,
    calculateStreak,
    getTimeUntilNextCheckIn,
    type CheckInInput,
    type CheckInVerdict,
} from '../checkInOrchestrator';

// ─── Yardımcı ────────────────────────────────────────

const baseInput: CheckInInput = {
    enteredPin: '7429',
    normalPin: '7429',
    message: 'İyiyim, kahve içiyorum',
    duressWords: ['çay', 'güzel'],
    deviceScore: 0.95,
};

function makeInput(overrides: Partial<CheckInInput>): CheckInInput {
    return { ...baseInput, ...overrides };
}

// ─── BÖLÜM 1: Normal Check-in ───────────────────────

describe('BÖLÜM 1: Normal Check-in', () => {
    test('doğru PIN + normal mesaj → proceed', () => {
        const result = orchestrateCheckIn(baseInput);
        expect(result.verdict).toBe('proceed');
        expect(result.reason).toBe('normal_checkin');
    });

    test('doğru PIN + mesaj yok → proceed', () => {
        const result = orchestrateCheckIn(makeInput({ message: null }));
        expect(result.verdict).toBe('proceed');
    });

    test('doğru PIN + boş mesaj → proceed', () => {
        const result = orchestrateCheckIn(makeInput({ message: '' }));
        expect(result.verdict).toBe('proceed');
    });

    test('doğru PIN + boş duress listesi → proceed', () => {
        const result = orchestrateCheckIn(makeInput({ duressWords: [] }));
        expect(result.verdict).toBe('proceed');
    });
});

// ─── BÖLÜM 2: Duress PIN ────────────────────────────

describe('BÖLÜM 2: Duress PIN', () => {
    test('duress PIN (son rakam +1) → duress_alarm', () => {
        const result = orchestrateCheckIn(makeInput({ enteredPin: '7420' })); // 9+1=0
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_pin');
            expect(result.silentAlarm).toBe(true);
        }
    });

    test('duress PIN + normal mesaj → duress_pin (sadece PIN)', () => {
        const result = orchestrateCheckIn(makeInput({
            enteredPin: '7420',
            message: 'Her şey normal, kahve içiyorum',
        }));
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_pin');
        }
    });
});

// ─── BÖLÜM 3: Duress Word ───────────────────────────

describe('BÖLÜM 3: Duress Word', () => {
    test('normal PIN + duress kelime → duress_alarm (word)', () => {
        const result = orchestrateCheckIn(makeInput({
            message: 'İyiyim, çay içiyorum',
        }));
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_word');
            expect(result.silentAlarm).toBe(true);
        }
    });

    test('normal PIN + "güzel" kelimesi → duress_alarm', () => {
        const result = orchestrateCheckIn(makeInput({
            message: 'Hava güzel bugün',
        }));
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_word');
        }
    });
});

// ─── BÖLÜM 4: Çifte Duress ──────────────────────────

describe('BÖLÜM 4: Çifte Duress (PIN + Word)', () => {
    test('duress PIN + duress kelime → duress_both', () => {
        const result = orchestrateCheckIn(makeInput({
            enteredPin: '7420',
            message: 'İyiyim, çay içiyorum',
        }));
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_both');
            expect(result.silentAlarm).toBe(true);
        }
    });
});

// ─── BÖLÜM 5: Yanlış PIN ────────────────────────────

describe('BÖLÜM 5: Yanlış PIN', () => {
    test('yanlış PIN → reject', () => {
        const result = orchestrateCheckIn(makeInput({ enteredPin: '0000' }));
        expect(result.verdict).toBe('reject');
        expect(result.reason).toBe('invalid_pin');
    });

    test('yanlış PIN + duress kelime → reject (PIN öncelikli)', () => {
        const result = orchestrateCheckIn(makeInput({
            enteredPin: '9999',
            message: 'İyiyim, çay içiyorum',
        }));
        expect(result.verdict).toBe('reject');
        // Yanlış PIN durumunda mesaj kontrol edilmez
    });

    test('boş PIN → reject', () => {
        const result = orchestrateCheckIn(makeInput({ enteredPin: '' }));
        expect(result.verdict).toBe('reject');
    });
});

// ─── BÖLÜM 6: Cihaz Doğrulama ───────────────────────

describe('BÖLÜM 6: Cihaz Kontrolü', () => {
    test('bilinen cihaz (0.95) → proceed', () => {
        const result = orchestrateCheckIn(makeInput({ deviceScore: 0.95 }));
        expect(result.verdict).toBe('proceed');
    });

    test('bilinmeyen cihaz (0.5) → device_warning', () => {
        const result = orchestrateCheckIn(makeInput({ deviceScore: 0.5 }));
        expect(result.verdict).toBe('device_warning');
        if (result.verdict === 'device_warning') {
            expect(result.reason).toBe('unknown_device');
            expect(result.proceedAnyway).toBe(true);
        }
    });

    test('sınırda cihaz (0.75) → proceed', () => {
        const result = orchestrateCheckIn(makeInput({ deviceScore: 0.75 }));
        expect(result.verdict).toBe('proceed');
    });

    test('sınır altı cihaz (0.749) → device_warning', () => {
        const result = orchestrateCheckIn(makeInput({ deviceScore: 0.749 }));
        expect(result.verdict).toBe('device_warning');
    });

    test('cihaz skoru undefined → cihaz kontrolü atlanır', () => {
        const result = orchestrateCheckIn(makeInput({ deviceScore: undefined }));
        expect(result.verdict).toBe('proceed');
    });

    test('duress + bilinmeyen cihaz → duress_alarm (cihaz uyarısı override edilmez)', () => {
        const result = orchestrateCheckIn(makeInput({
            enteredPin: '7420',
            deviceScore: 0.3,
        }));
        expect(result.verdict).toBe('duress_alarm');
        // Duress her zaman öncelikli — cihaz uyarısı zorlayıcıya bilgi sızdırabilir
    });

    test('özel threshold (0.9)', () => {
        const result = orchestrateCheckIn(makeInput({
            deviceScore: 0.85,
            deviceThreshold: 0.9,
        }));
        expect(result.verdict).toBe('device_warning');
    });
});

// ─── BÖLÜM 7: Streak Hesaplama ──────────────────────

describe('BÖLÜM 7: Streak', () => {
    const now = new Date();

    function hoursAgo(hours: number): Date {
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }

    test('boş check-in → streak 0', () => {
        const result = calculateStreak([], 24);
        expect(result.currentStreak).toBe(0);
        expect(result.level).toBe('beginner');
    });

    test('tek check-in → streak 1', () => {
        const result = calculateStreak([now], 24);
        expect(result.currentStreak).toBe(1);
        expect(result.streakMessage).toBe('1 gün güvendesiniz');
    });

    test('3 ardışık günlük check-in → streak 3', () => {
        const dates = [now, hoursAgo(24), hoursAgo(48)];
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(3);
        expect(result.streakMessage).toBe('3 gün güvendesiniz');
    });

    test('kırık zincir → streak son kesintisiz bölüm', () => {
        // 3 günlük ardışık + 72 saat boşluk + 2 günlük
        const dates = [
            now,
            hoursAgo(24),
            hoursAgo(48),
            hoursAgo(120), // 72 saat boşluk (48+72=120)
            hoursAgo(144),
        ];
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(3); // Son 3 ardışık
    });

    test('tolerance: %50 gecikme hala sayılır', () => {
        // 24 saat aralık, 36 saatlik gap (24 * 1.5 = 36) → hala geçerli
        const dates = [now, hoursAgo(35)]; // 35 saat < 36 saat tolerance
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(2);
    });

    test('tolerance aşıldı → zincir kırılır', () => {
        // 24 saat aralık, 37 saatlik gap (> 36 saat tolerance)
        const dates = [now, hoursAgo(37)];
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(1);
    });

    test('level: beginner (< 7)', () => {
        const dates = [now, hoursAgo(24), hoursAgo(48)];
        expect(calculateStreak(dates, 24).level).toBe('beginner');
    });

    test('level: consistent (7-29)', () => {
        const dates = Array.from({ length: 10 }, (_, i) => hoursAgo(i * 24));
        expect(calculateStreak(dates, 24).level).toBe('consistent');
    });

    test('level: veteran (30-179)', () => {
        const dates = Array.from({ length: 45 }, (_, i) => hoursAgo(i * 24));
        expect(calculateStreak(dates, 24).level).toBe('veteran');
    });

    test('level: legendary (180+)', () => {
        const dates = Array.from({ length: 200 }, (_, i) => hoursAgo(i * 24));
        expect(calculateStreak(dates, 24).level).toBe('legendary');
    });

    test('sırasız tarihler doğru sıralanır', () => {
        const dates = [hoursAgo(48), now, hoursAgo(24)]; // Karışık sıra
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(3);
    });
});

// ─── BÖLÜM 8: Zaman Hesaplama ───────────────────────

describe('BÖLÜM 8: getTimeUntilNextCheckIn', () => {
    test('12 saat önce check-in, 24 saat aralık → 12 saat kaldı', () => {
        const lastCheckIn = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const result = getTimeUntilNextCheckIn(lastCheckIn, 24);
        expect(result.isOverdue).toBe(false);
        expect(result.hoursLeft).toBeGreaterThanOrEqual(11);
        expect(result.hoursLeft).toBeLessThanOrEqual(12);
        // 12/24 = 0.5 → tam sınırda, safe veya warning olabilir
        expect(['safe', 'warning']).toContain(result.urgencyLevel);
    });

    test('20 saat önce check-in, 24 saat aralık → urgent', () => {
        const lastCheckIn = new Date(Date.now() - 20 * 60 * 60 * 1000);
        const result = getTimeUntilNextCheckIn(lastCheckIn, 24);
        expect(result.isOverdue).toBe(false);
        expect(result.urgencyLevel).toBe('urgent');
    });

    test('25 saat önce check-in, 24 saat aralık → overdue', () => {
        const lastCheckIn = new Date(Date.now() - 25 * 60 * 60 * 1000);
        const result = getTimeUntilNextCheckIn(lastCheckIn, 24);
        expect(result.isOverdue).toBe(true);
        expect(result.overdueHours).toBeGreaterThanOrEqual(1);
        expect(result.urgencyLevel).toBe('overdue');
    });

    test('az önce check-in → safe, çok zaman var', () => {
        const lastCheckIn = new Date(Date.now() - 1000); // 1 saniye önce
        const result = getTimeUntilNextCheckIn(lastCheckIn, 24);
        expect(result.isOverdue).toBe(false);
        expect(result.hoursLeft).toBe(23);
        expect(result.urgencyLevel).toBe('safe');
    });

    test('tam yarıda → warning geçişi', () => {
        const lastCheckIn = new Date(Date.now() - 12.5 * 60 * 60 * 1000);
        const result = getTimeUntilNextCheckIn(lastCheckIn, 24);
        expect(result.urgencyLevel).toBe('warning');
    });
});

// ─── BÖLÜM 9: Edge Cases ────────────────────────────

describe('BÖLÜM 9: Edge Cases', () => {
    test('tüm duress yolları silentAlarm: true', () => {
        const cases: Partial<CheckInInput>[] = [
            { enteredPin: '7420' },                              // duress PIN
            { message: 'İyiyim, çay içtim' },                   // duress word
            { enteredPin: '7420', message: 'İyiyim, çay içtim' }, // both
        ];

        for (const overrides of cases) {
            const result = orchestrateCheckIn(makeInput(overrides));
            expect(result.verdict).toBe('duress_alarm');
            if (result.verdict === 'duress_alarm') {
                expect(result.silentAlarm).toBe(true);
            }
        }
    });

    test('proceed verdict\'te silentAlarm yok', () => {
        const result = orchestrateCheckIn(baseInput);
        expect(result.verdict).toBe('proceed');
        expect((result as any).silentAlarm).toBeUndefined();
    });

    test('reject verdict\'te silentAlarm yok', () => {
        const result = orchestrateCheckIn(makeInput({ enteredPin: '0000' }));
        expect(result.verdict).toBe('reject');
        expect((result as any).silentAlarm).toBeUndefined();
    });

    test('streak: null dates → 0', () => {
        const result = calculateStreak(null as any, 24);
        expect(result.currentStreak).toBe(0);
    });
});

// ─── BÖLÜM 10: Entegrasyon Senaryoları ──────────────

describe('BÖLÜM 10: Gerçek Dünya Senaryoları', () => {
    test('Senaryo: Gazeteci normal check-in yapıyor', () => {
        const result = orchestrateCheckIn({
            enteredPin: '4567',
            normalPin: '4567',
            message: 'Her şey yolunda, kahve molasındayım',
            duressWords: ['çay', 'soğuk'],
            deviceScore: 0.98,
        });
        expect(result.verdict).toBe('proceed');
    });

    test('Senaryo: Gazeteci silah zoruyla check-in yapıyor (duress PIN)', () => {
        const result = orchestrateCheckIn({
            enteredPin: '4568', // 7+1=8
            normalPin: '4567',
            message: 'Her şey yolunda',
            duressWords: ['çay'],
            deviceScore: 0.98,
        });
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_pin');
        }
    });

    test('Senaryo: Gazeteci baskı altında duress kelime kullanıyor', () => {
        const result = orchestrateCheckIn({
            enteredPin: '4567',
            normalPin: '4567',
            message: 'Güvenli bir yerdeyim, çay içiyorum', // "çay" = duress
            duressWords: ['çay'],
            deviceScore: 0.98,
        });
        expect(result.verdict).toBe('duress_alarm');
        if (result.verdict === 'duress_alarm') {
            expect(result.reason).toBe('duress_word');
        }
    });

    test('Senaryo: Birisi gazetecinin telefonunu çalmış (bilinmeyen cihaz)', () => {
        const result = orchestrateCheckIn({
            enteredPin: '4567',
            normalPin: '4567',
            message: 'İyiyim',
            duressWords: ['çay'],
            deviceScore: 0.3, // Tamamen farklı cihaz
        });
        expect(result.verdict).toBe('device_warning');
    });

    test('Senaryo: Gazeteci yeni telefon aldı (kısmen farklı cihaz)', () => {
        const result = orchestrateCheckIn({
            enteredPin: '4567',
            normalPin: '4567',
            message: 'İyiyim, kahve içiyorum',
            duressWords: ['çay'],
            deviceScore: 0.6, // Kısmen farklı
        });
        expect(result.verdict).toBe('device_warning');
        if (result.verdict === 'device_warning') {
            expect(result.proceedAnyway).toBe(true);
            // UI: "Yeni cihaz tespit edildi. Devam etmek istiyor musunuz?"
        }
    });

    test('Senaryo: Zorlayıcı yanlış PIN giriyor → reddedilir', () => {
        const result = orchestrateCheckIn({
            enteredPin: '1111',
            normalPin: '4567',
            message: 'Check in',
            duressWords: ['çay'],
            deviceScore: 0.3,
        });
        expect(result.verdict).toBe('reject');
    });

    test('Senaryo: 200 günlük streak', () => {
        const now = new Date();
        const dates = Array.from({ length: 200 }, (_, i) =>
            new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        );
        const result = calculateStreak(dates, 24);
        expect(result.currentStreak).toBe(200);
        expect(result.level).toBe('legendary');
        expect(result.streakMessage).toBe('200 gün güvendesiniz');
    });
});
