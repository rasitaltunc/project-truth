// ═══════════════════════════════════════════════════════
// CHECK-IN ORCHESTRATOR — "Tek Dokunuşla Güvenlik"
// ═══════════════════════════════════════════════════════
//
// Tüm check-in adımlarını tek akışta birleştirir:
// 1. PIN doğrulama (normal/duress/invalid)
// 2. Mesaj kontrolü (duress kelime tespiti)
// 3. Cihaz doğrulama (bilinen/bilinmeyen)
// 4. Sonuç: proceed / duress_alarm / reject / device_warning
//
// KRİTİK: Duress durumunda UI normal görünmeli.
// Zorlayıcı hiçbir fark görmemeli.
// ═══════════════════════════════════════════════════════

import { checkPin, checkMessage, type PinCheckResult } from './duressCode';

// ─── Tipler ──────────────────────────────────────────

export interface CheckInInput {
    /** Kullanıcının girdiği PIN */
    enteredPin: string;
    /** Kayıtlı normal PIN */
    normalPin: string;
    /** Check-in mesajı (opsiyonel) */
    message?: string | null;
    /** Kullanıcının duress kelimeleri */
    duressWords: string[];
    /** Cihaz benzerlik skoru (0.0-1.0), deviceFingerprint.ts'ten */
    deviceScore?: number;
    /** Bilinen cihaz threshold */
    deviceThreshold?: number;
}

export type CheckInVerdict =
    | { verdict: 'proceed'; reason: 'normal_checkin' }
    | { verdict: 'duress_alarm'; reason: 'duress_pin' | 'duress_word' | 'duress_both'; silentAlarm: true }
    | { verdict: 'reject'; reason: 'invalid_pin' }
    | { verdict: 'device_warning'; reason: 'unknown_device'; proceedAnyway: true };

/**
 * Check-in akışını orkestra eder.
 *
 * Karar matrisi:
 * ┌────────────┬────────────┬────────────────────┐
 * │ PIN        │ Message    │ Sonuç              │
 * ├────────────┼────────────┼────────────────────┤
 * │ invalid    │ *          │ reject             │
 * │ duress     │ normal     │ duress_alarm (pin) │
 * │ normal     │ duress     │ duress_alarm (word)│
 * │ duress     │ duress     │ duress_alarm (both)│
 * │ normal     │ normal/no  │ proceed            │
 * └────────────┴────────────┴────────────────────┘
 *
 * Cihaz kontrolü proceed/duress sonrasında uygulanır:
 * - Bilinmeyen cihaz + normal check-in → device_warning
 * - Bilinmeyen cihaz + duress → duress_alarm (cihaz uyarısı tetiklemez)
 *
 * @param input - Check-in parametreleri
 * @returns CheckInVerdict
 */
export function orchestrateCheckIn(input: CheckInInput): CheckInVerdict {
    const {
        enteredPin,
        normalPin,
        message,
        duressWords,
        deviceScore,
        deviceThreshold = 0.75,
    } = input;

    // Adım 1: PIN kontrolü
    const pinResult: PinCheckResult = checkPin(enteredPin, normalPin);

    // Yanlış PIN → hemen reddet
    if (pinResult.type === 'invalid') {
        return { verdict: 'reject', reason: 'invalid_pin' };
    }

    // Adım 2: Mesaj kontrolü
    const messageResult = checkMessage(message, duressWords);

    // Adım 3: Duress tespiti (PIN veya mesaj)
    const isPinDuress = pinResult.type === 'duress';
    const isMessageDuress = messageResult === 'duress';

    if (isPinDuress && isMessageDuress) {
        return { verdict: 'duress_alarm', reason: 'duress_both', silentAlarm: true };
    }
    if (isPinDuress) {
        return { verdict: 'duress_alarm', reason: 'duress_pin', silentAlarm: true };
    }
    if (isMessageDuress) {
        return { verdict: 'duress_alarm', reason: 'duress_word', silentAlarm: true };
    }

    // Adım 4: Cihaz kontrolü (sadece normal check-in'de)
    if (deviceScore !== undefined && deviceScore < deviceThreshold) {
        return { verdict: 'device_warning', reason: 'unknown_device', proceedAnyway: true };
    }

    // Her şey normal
    return { verdict: 'proceed', reason: 'normal_checkin' };
}

// ─── Streak Hesaplama ────────────────────────────────

export interface StreakInfo {
    /** Ardışık check-in sayısı */
    currentStreak: number;
    /** Mesaj: "42 gün güvendesiniz" */
    streakMessage: string;
    /** Streak seviyesi (UI renklendirme için) */
    level: 'beginner' | 'consistent' | 'veteran' | 'legendary';
}

/**
 * Check-in streak'ini hesaplar.
 *
 * @param checkInDates - Son check-in tarihleri (yeniden eskiye sıralı)
 * @param intervalHours - Check-in aralığı (saat)
 * @returns StreakInfo
 */
export function calculateStreak(
    checkInDates: Date[],
    intervalHours: number
): StreakInfo {
    if (!checkInDates || checkInDates.length === 0) {
        return { currentStreak: 0, streakMessage: 'Henüz check-in yapılmadı', level: 'beginner' };
    }

    // Tarihleri yeniden eskiye sırala
    const sorted = [...checkInDates].sort((a, b) => b.getTime() - a.getTime());

    let streak = 1; // En az 1 (en son check-in)
    const toleranceMs = intervalHours * 60 * 60 * 1000 * 1.5; // %50 tolerans

    for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i].getTime() - sorted[i + 1].getTime();
        if (gap <= toleranceMs) {
            streak++;
        } else {
            break; // Zincir kırıldı
        }
    }

    const level = getStreakLevel(streak);
    const streakMessage = formatStreakMessage(streak);

    return { currentStreak: streak, streakMessage, level };
}

function getStreakLevel(streak: number): StreakInfo['level'] {
    if (streak >= 180) return 'legendary';  // 6 ay+
    if (streak >= 30) return 'veteran';      // 1 ay+
    if (streak >= 7) return 'consistent';    // 1 hafta+
    return 'beginner';
}

function formatStreakMessage(streak: number): string {
    if (streak === 0) return 'Henüz check-in yapılmadı';
    if (streak === 1) return '1 gün güvendesiniz';
    return `${streak} gün güvendesiniz`;
}

// ─── Haptic Feedback ─────────────────────────────────

/**
 * Check-in sonrasında haptic feedback.
 * Tarayıcı desteklemiyorsa sessizce geçer.
 *
 * @param success - Başarılı mı?
 */
export function triggerHaptic(success: boolean): void {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    try {
        if (success) {
            navigator.vibrate(50); // Kısa, memnuniyet verici
        } else {
            navigator.vibrate([100, 50, 100]); // Çift titreşim, hata
        }
    } catch {
        // Sessizce geç
    }
}

// ─── Check-in Saati Hatırlatma ───────────────────────

/**
 * Bir sonraki check-in'e kalan süreyi hesaplar.
 *
 * @param lastCheckIn - Son check-in zamanı
 * @param intervalHours - Aralık (saat)
 * @returns { hoursLeft, minutesLeft, isOverdue, overdueHours }
 */
export function getTimeUntilNextCheckIn(
    lastCheckIn: Date,
    intervalHours: number
): {
    hoursLeft: number;
    minutesLeft: number;
    isOverdue: boolean;
    overdueHours: number;
    urgencyLevel: 'safe' | 'warning' | 'urgent' | 'overdue';
} {
    const now = Date.now();
    const deadline = lastCheckIn.getTime() + (intervalHours * 60 * 60 * 1000);
    const remainingMs = deadline - now;

    if (remainingMs <= 0) {
        const overdueMs = Math.abs(remainingMs);
        return {
            hoursLeft: 0,
            minutesLeft: 0,
            isOverdue: true,
            overdueHours: Math.floor(overdueMs / (60 * 60 * 1000)),
            urgencyLevel: 'overdue',
        };
    }

    const hoursLeft = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutesLeft = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    let urgencyLevel: 'safe' | 'warning' | 'urgent' | 'overdue';
    const remainingRatio = remainingMs / (intervalHours * 60 * 60 * 1000);

    if (remainingRatio > 0.5) {
        urgencyLevel = 'safe';
    } else if (remainingRatio > 0.25) {
        urgencyLevel = 'warning';
    } else {
        urgencyLevel = 'urgent';
    }

    return { hoursLeft, minutesLeft, isOverdue: false, overdueHours: 0, urgencyLevel };
}
