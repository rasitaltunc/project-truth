// ═══════════════════════════════════════════════════════
// DURESS CODE SİSTEMİ — "Zorla Check-in Savunması"
// ═══════════════════════════════════════════════════════
//
// "Gazeteci silah zoruyla check-in yapsa bile, biz biliriz."
//
// Duress (zorlama) kodu, kullanıcının baskı altında olduğunu
// gizlice bildirmesini sağlar. Dışarıdan bakıldığında her şey
// normal görünür — timer sıfırlanır, yeşil onay gösterilir.
// Ama arka planda sessiz alarm tetiklenir.
//
// İki mekanizma:
// 1. PIN Shift: Normal PIN'in son rakamı +1 (örn: 7429 → 7430)
// 2. Duress Word: Mesajda gizli kelime (örn: "çay" yerine "kahve")
//
// KRİTİK: Zorlayıcı HİÇBİR fark görmemeli. Timing, UI, response
// her şey aynı olmalı. Timing-safe karşılaştırma zorunlu.
// ═══════════════════════════════════════════════════════

// ─── PIN Shift Sistemi ──────────────────────────────────

/**
 * Normal PIN'den duress PIN üretir.
 * Kural: Son rakam +1 (9 → 0, wrap-around)
 *
 * Örnekler:
 *   "7429" → "7420"   (9+1 = 0, wrap)
 *   "1234" → "1235"
 *   "0000" → "0001"
 *   "9999" → "9990"
 *
 * @param normalPin - Kullanıcının normal PIN'i (sadece rakamlar)
 * @returns Duress PIN (aynı uzunluk)
 * @throws Error — boş veya sayısal olmayan PIN
 */
export function generateDuressPin(normalPin: string): string {
    if (!normalPin || normalPin.length === 0) {
        throw new Error('PIN boş olamaz');
    }
    if (!/^\d+$/.test(normalPin)) {
        throw new Error('PIN sadece rakam içermeli');
    }

    const lastDigit = parseInt(normalPin[normalPin.length - 1], 10);
    const duressDigit = (lastDigit + 1) % 10;

    return normalPin.slice(0, -1) + duressDigit.toString();
}

/**
 * Girilen PIN'in duress (zorlama) PIN'i olup olmadığını kontrol eder.
 * Timing-safe: Normal ve duress karşılaştırma AYNI sürede yapılır.
 *
 * @param enteredPin - Kullanıcının girdiği PIN
 * @param normalPin - Kayıtlı normal PIN
 * @returns true ise zorlama altında
 */
export function isDuressPin(enteredPin: string, normalPin: string): boolean {
    if (!enteredPin || !normalPin) return false;

    const duressPin = generateDuressPin(normalPin);
    return timingSafeStringEqual(enteredPin, duressPin);
}

/**
 * Girilen PIN'in normal (doğru) PIN olup olmadığını kontrol eder.
 * Timing-safe karşılaştırma.
 *
 * @param enteredPin - Kullanıcının girdiği PIN
 * @param normalPin - Kayıtlı normal PIN
 * @returns true ise doğru PIN
 */
export function isNormalPin(enteredPin: string, normalPin: string): boolean {
    if (!enteredPin || !normalPin) return false;

    return timingSafeStringEqual(enteredPin, normalPin);
}

/**
 * PIN doğrulama sonucu.
 * Timing-safe: Her üç durum da AYNI sürede hesaplanır.
 */
export type PinCheckResult =
    | { type: 'normal' }    // Doğru PIN, normal check-in
    | { type: 'duress' }    // Duress PIN, sessiz alarm tetikle
    | { type: 'invalid' };  // Yanlış PIN, reddet

/**
 * Girilen PIN'i kontrol eder — normal, duress, veya geçersiz.
 *
 * KRİTİK: Bu fonksiyon her üç durumda da AYNI sürede çalışmalı.
 * Timing saldırısı ile duress tespit edilmesini önleriz.
 *
 * @param enteredPin - Kullanıcının girdiği PIN
 * @param normalPin - Kayıtlı normal PIN
 * @returns PinCheckResult
 */
export function checkPin(enteredPin: string, normalPin: string): PinCheckResult {
    if (!enteredPin || !normalPin) {
        return { type: 'invalid' };
    }

    // Her iki karşılaştırmayı da HER ZAMAN yap (timing-safe)
    const isNormal = timingSafeStringEqual(enteredPin, normalPin);
    const duressPin = generateDuressPin(normalPin);
    const isDuress = timingSafeStringEqual(enteredPin, duressPin);

    // Sonuçları tek seferde değerlendir
    if (isNormal) return { type: 'normal' };
    if (isDuress) return { type: 'duress' };
    return { type: 'invalid' };
}

// ─── Duress Word Sistemi ────────────────────────────────

/**
 * Varsayılan duress kelime çiftleri.
 * Normal kelime check-in mesajında kullanılır.
 * Duress kelime, baskı altında kullanılır.
 *
 * Mantık: Doğal dilde fark edilmez bir değişiklik.
 * "İyiyim, kahve içiyorum" (normal) vs "İyiyim, çay içiyorum" (duress)
 */
export const DEFAULT_DURESS_PAIRS: Array<{ normal: string; duress: string }> = [
    { normal: 'kahve', duress: 'çay' },
    { normal: 'iyi', duress: 'güzel' },
    { normal: 'tamam', duress: 'oldu' },
    { normal: 'merhaba', duress: 'selam' },
    { normal: 'evet', duress: 'tabii' },
];

/**
 * Rastgele bir duress kelime çifti üretir (varsayılan havuzdan).
 *
 * @returns { normalWord, duressWord } — kullanıcıya gösterilecek çift
 */
export function generateDuressWordPair(): { normalWord: string; duressWord: string } {
    const idx = Math.floor(Math.random() * DEFAULT_DURESS_PAIRS.length);
    const pair = DEFAULT_DURESS_PAIRS[idx];
    return { normalWord: pair.normal, duressWord: pair.duress };
}

/**
 * Mesaj içinde duress kelimesi olup olmadığını kontrol eder.
 * Case-insensitive, Türkçe karakter duyarlı.
 *
 * @param message - Check-in mesajı
 * @param duressWords - Kullanıcının tanımladığı duress kelimeleri
 * @returns true ise mesajda duress kelimesi var
 */
export function isDuressWord(message: string, duressWords: string[]): boolean {
    if (!message || !duressWords || duressWords.length === 0) return false;

    const lowerMessage = message.toLocaleLowerCase('tr-TR');

    for (const word of duressWords) {
        if (!word) continue;
        const lowerWord = word.toLocaleLowerCase('tr-TR');
        if (lowerMessage.includes(lowerWord)) return true;
    }

    return false;
}

/**
 * Check-in mesajını kontrol eder — normal veya duress.
 *
 * @param message - Check-in mesajı (opsiyonel)
 * @param duressWords - Kullanıcının duress kelimeleri
 * @returns 'normal' | 'duress' | 'no_message'
 */
export function checkMessage(
    message: string | undefined | null,
    duressWords: string[]
): 'normal' | 'duress' | 'no_message' {
    if (!message || message.trim().length === 0) return 'no_message';
    if (isDuressWord(message, duressWords)) return 'duress';
    return 'normal';
}

// ─── Timing-Safe Karşılaştırma ──────────────────────────

/**
 * Timing-safe string karşılaştırma.
 * XOR-based, sabit zamanlı. Yan kanal saldırısını önler.
 *
 * NOT: Zorlayıcı timing farkından duress tespiti yapamamalı.
 * Normal check-in ve duress check-in AYNI sürede cevap vermeli.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        // Uzunluk farkında bile sabit zamanlı cevap
        let result = 1;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ a.charCodeAt(i);
        }
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ─── Duress Check-in Handler ────────────────────────────

/**
 * Duress check-in işlemi.
 * UI'da: Normal check-in gibi görünür (timer sıfırlanır, yeşil onay).
 * Backend'de: Sessiz alarm gönderilir (kefillere bildirim).
 *
 * KRİTİK: Bu fonksiyon normal check-in ile AYNI response formatında
 * ve AYNI sürede cevap vermeli.
 *
 * @param userId - Kullanıcı ID
 * @param switchId - DMS switch ID
 * @param recipients - Alarm alıcıları (kefiller)
 * @returns Normal check-in ile aynı format ({ success: true })
 */
export async function handleDuressCheckin(
    userId: string,
    switchId: string,
    recipients: Array<{ type: string; value?: string; name?: string }>,
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Sessiz alarm gönder (arka planda, fire-and-forget)
        // Email gönderimi asenkron — kullanıcıya gecikme hissettirmez
        sendSilentAlarm(userId, switchId, recipients).catch((err) => {
            // Alarm gönderilemese bile check-in başarılı görünmeli
            console.error('[DURESS] Sessiz alarm gönderilemedi:', err);
        });

        // 2. Normal check-in ile AYNI response
        return { success: true };

    } catch {
        // Hata durumunda bile normal görünsün
        return { success: true };
    }
}

/**
 * Sessiz alarm — kefillere "bu kişi baskı altında" bildirimi.
 * Fire-and-forget: Ana akışı bloklamaz.
 */
async function sendSilentAlarm(
    userId: string,
    switchId: string,
    recipients: Array<{ type: string; value?: string; name?: string }>,
): Promise<void> {
    // Email modülü lazy import (server-side only)
    try {
        const { sendEmail, dmsAlertEmail } = await import('./email');

        for (const recipient of recipients) {
            if (!recipient.value) continue;

            const template = dmsAlertEmail({
                switchName: `Sessiz Alarm — Switch ${switchId.slice(0, 8)}`,
                recipientName: recipient.name || 'Kefil',
                contentPreview: undefined,
                triggerReason:
                    'DURESS ALGILANDI: Kullanıcı baskı altında check-in yaptı. ' +
                    'Bu bir sessiz alarm bildirimidir. Kullanıcıyla iletişime geçin.',
            });
            template.to = recipient.value;
            await sendEmail(template);
        }
    } catch (err) {
        // Email modülü yoksa (test ortamı vb.) sessizce geç
        console.error('[DURESS] Email gönderimi başarısız:', err);
    }
}
