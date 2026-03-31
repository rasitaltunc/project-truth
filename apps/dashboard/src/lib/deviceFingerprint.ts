// ═══════════════════════════════════════════════════════
// DEVICE FINGERPRINT SİSTEMİ — "Cihaz Kimlik Doğrulama"
// ═══════════════════════════════════════════════════════
//
// DMS check-in sırasında cihazın tanınıp tanınmadığını belirler.
// Mevcut auth.ts fingerprint'inden FARKLI: Burada sinyal bazlı
// fuzzy matching var — tek hash yerine her sinyalin ağırlıklı
// karşılaştırması yapılır.
//
// Neden? OS güncellemesi veya tarayıcı güncellemesi YALNIZ BAŞINA
// cihazı "bilinmeyen" yapmamalı. GPU + screen + timezone aynıysa
// muhtemelen aynı cihazdır.
//
// Sinyaller ve Ağırlıklar:
//   screen   (0.15) — genişlik, yükseklik, pixelRatio, colorDepth
//   os       (0.10) — platform + userAgent
//   browser  (0.05) — engine + version (sık değişir, düşük ağırlık)
//   timezone (0.15) — Intl timezone
//   webgl    (0.25) — GPU renderer (yüksek entropi, nadiren değişir)
//   canvas   (0.20) — rendering hash (donanımsal)
//   audio    (0.10) — AudioContext fingerprint
//
// Threshold: 0.75+ = aynı cihaz, altı = bilinmeyen cihaz uyarısı
// ═══════════════════════════════════════════════════════

// ─── Tipler ──────────────────────────────────────────

export interface DeviceSignals {
    screen: {
        width: number;
        height: number;
        pixelRatio: number;
        colorDepth: number;
    };
    os: string;       // navigator.platform + parsed OS from UA
    browser: string;  // engine + version
    timezone: string; // e.g. "Europe/Istanbul"
    webgl: string;    // GPU renderer string
    canvas: string;   // canvas toDataURL hash
    audio: string;    // AudioContext fingerprint hash
}

export interface DeviceFingerprint {
    /** SHA-256 hash of all signals combined */
    hash: string;
    /** Individual signals for fuzzy comparison */
    signals: DeviceSignals;
    /** ISO timestamp of fingerprint generation */
    generatedAt: string;
    /** Optional user-friendly device name */
    deviceName?: string;
}

/** Sinyal ağırlıkları — toplamı 1.0 */
export const SIGNAL_WEIGHTS: Record<keyof DeviceSignals, number> = {
    screen:   0.15,
    os:       0.10,
    browser:  0.05,
    timezone: 0.15,
    webgl:    0.25,
    canvas:   0.20,
    audio:    0.10,
};

/** 0.75+ = bilinen cihaz */
export const KNOWN_DEVICE_THRESHOLD = 0.75;

// ─── Signal Collectors (Test edilebilir, inject edilebilir) ──

/**
 * Browser API'lerinden sinyalleri toplar.
 * Node.js test ortamı için mocklanabilir.
 */
export interface SignalCollector {
    collectScreen(): { width: number; height: number; pixelRatio: number; colorDepth: number };
    collectOS(): string;
    collectBrowser(): string;
    collectTimezone(): string;
    collectWebGL(): string;
    collectCanvas(): string;
    collectAudio(): Promise<string>;
}

/**
 * Varsayılan browser signal collector.
 * Gerçek ortamda browser API'lerini kullanır.
 */
export class BrowserSignalCollector implements SignalCollector {
    collectScreen() {
        if (typeof window === 'undefined' || !window.screen) {
            return { width: 0, height: 0, pixelRatio: 1, colorDepth: 24 };
        }
        return {
            width: window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio || 1,
            colorDepth: window.screen.colorDepth || 24,
        };
    }

    collectOS(): string {
        if (typeof navigator === 'undefined') return 'unknown';
        const platform = navigator.platform || 'unknown';
        const ua = navigator.userAgent || '';

        // Parse OS from UA
        if (ua.includes('Windows NT 10')) return `${platform}|Windows 10`;
        if (ua.includes('Windows NT 11')) return `${platform}|Windows 11`;
        if (ua.includes('Mac OS X')) {
            const match = ua.match(/Mac OS X (\d+[._]\d+)/);
            return `${platform}|macOS ${match ? match[1].replace('_', '.') : 'unknown'}`;
        }
        if (ua.includes('Linux')) return `${platform}|Linux`;
        if (ua.includes('Android')) return `${platform}|Android`;
        if (ua.includes('iOS') || ua.includes('iPhone')) return `${platform}|iOS`;

        return `${platform}|unknown`;
    }

    collectBrowser(): string {
        if (typeof navigator === 'undefined') return 'unknown';
        const ua = navigator.userAgent || '';

        if (ua.includes('Firefox/')) {
            const match = ua.match(/Firefox\/(\d+)/);
            return `Gecko|Firefox ${match ? match[1] : 'unknown'}`;
        }
        if (ua.includes('Edg/')) {
            const match = ua.match(/Edg\/(\d+)/);
            return `Blink|Edge ${match ? match[1] : 'unknown'}`;
        }
        if (ua.includes('Chrome/')) {
            const match = ua.match(/Chrome\/(\d+)/);
            return `Blink|Chrome ${match ? match[1] : 'unknown'}`;
        }
        if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            return `WebKit|Safari ${match ? match[1] : 'unknown'}`;
        }

        return 'unknown|unknown';
    }

    collectTimezone(): string {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return 'unknown';
        }
    }

    collectWebGL(): string {
        if (typeof document === 'undefined') return 'no-webgl';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'no-webgl';

            const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return 'webgl-no-debug';

            const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
            const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';

            return `${vendor}|${renderer}`;
        } catch {
            return 'webgl-error';
        }
    }

    collectCanvas(): string {
        if (typeof document === 'undefined') return 'no-canvas';
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            if (!ctx) return 'no-canvas-ctx';

            // Sabit metin + şekil — cihazlar arası küçük rendering farkları
            ctx.textBaseline = 'alphabetic';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('DMS-FP-2026', 2, 15);
            ctx.fillStyle = 'rgba(102,204,0,0.7)';
            ctx.fillText('DMS-FP-2026', 4, 17);

            return canvas.toDataURL();
        } catch {
            return 'canvas-error';
        }
    }

    async collectAudio(): Promise<string> {
        if (typeof window === 'undefined' || !window.AudioContext) return 'no-audio';
        try {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const analyser = ctx.createAnalyser();
            const gain = ctx.createGain();
            const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);

            gain.gain.value = 0; // Ses çıkarma
            oscillator.type = 'triangle';
            oscillator.frequency.value = 10000;

            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start(0);

            // Kısa süre çalıştır
            await new Promise((resolve) => setTimeout(resolve, 100));

            const data = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(data);

            oscillator.stop();
            await ctx.close();

            // İlk 30 değeri hash — cihaz donanımına bağlı
            const slice = Array.from(data.slice(0, 30)).map((v) => v.toFixed(2)).join(',');
            return slice;
        } catch {
            return 'audio-error';
        }
    }
}

// ─── Core Functions ──────────────────────────────────

/**
 * Cihaz fingerprint'i üretir.
 * Tüm sinyalleri toplar, SHA-256 ile hash'ler.
 *
 * @param collector - Signal collector (test için mock, prod için BrowserSignalCollector)
 * @returns DeviceFingerprint
 */
export async function generateDeviceFingerprint(
    collector: SignalCollector = new BrowserSignalCollector()
): Promise<DeviceFingerprint> {
    const screen = collector.collectScreen();
    const os = collector.collectOS();
    const browser = collector.collectBrowser();
    const timezone = collector.collectTimezone();
    const webgl = collector.collectWebGL();
    const canvas = collector.collectCanvas();
    const audio = await collector.collectAudio();

    const signals: DeviceSignals = {
        screen,
        os,
        browser,
        timezone,
        webgl,
        canvas,
        audio,
    };

    // Tüm sinyalleri birleştirip hash'le
    const combined = [
        `${screen.width}x${screen.height}x${screen.pixelRatio}x${screen.colorDepth}`,
        os,
        browser,
        timezone,
        webgl,
        canvas,
        audio,
    ].join('|');

    const hash = await sha256(combined);

    return {
        hash,
        signals,
        generatedAt: new Date().toISOString(),
        deviceName: generateDeviceName(signals),
    };
}

/**
 * İki fingerprint'i sinyal bazlı karşılaştırır.
 * Ağırlıklı skor: 0.0 (tamamen farklı) — 1.0 (aynı cihaz)
 *
 * Her sinyal kendi karşılaştırma fonksiyonuna sahip:
 * - screen: 4 alan karşılaştırması (her biri 0.25 katkı)
 * - string sinyaller: exact match veya similarity
 *
 * @param stored - Kayıtlı cihaz fingerprint'i
 * @param current - Şu anki cihaz fingerprint'i
 * @returns 0.0-1.0 arası benzerlik skoru
 */
export function compareFingerprints(
    stored: DeviceFingerprint,
    current: DeviceFingerprint
): number {
    const s1 = stored.signals;
    const s2 = current.signals;

    let totalScore = 0;

    // Screen karşılaştırma (4 alan)
    const screenScore = compareScreen(s1.screen, s2.screen);
    totalScore += screenScore * SIGNAL_WEIGHTS.screen;

    // String sinyaller — exact match = 1.0, different = 0.0
    // OS: platform kısmı aynıysa 0.5, tam eşleşme 1.0
    totalScore += compareStringSignal(s1.os, s2.os) * SIGNAL_WEIGHTS.os;

    // Browser: engine aynıysa 0.5, tam eşleşme 1.0 (sık değişir)
    totalScore += compareStringSignal(s1.browser, s2.browser) * SIGNAL_WEIGHTS.browser;

    // Timezone: exact match only
    totalScore += (s1.timezone === s2.timezone ? 1.0 : 0.0) * SIGNAL_WEIGHTS.timezone;

    // WebGL: exact match (GPU nadiren değişir)
    totalScore += (s1.webgl === s2.webgl ? 1.0 : 0.0) * SIGNAL_WEIGHTS.webgl;

    // Canvas: exact match (donanımsal)
    totalScore += (s1.canvas === s2.canvas ? 1.0 : 0.0) * SIGNAL_WEIGHTS.canvas;

    // Audio: exact match (donanımsal)
    totalScore += (s1.audio === s2.audio ? 1.0 : 0.0) * SIGNAL_WEIGHTS.audio;

    return Math.round(totalScore * 1000) / 1000; // 3 decimal precision
}

/**
 * Fingerprint'in bilinen bir cihaza ait olup olmadığını kontrol eder.
 * Threshold: 0.75+
 */
export function isKnownDeviceScore(score: number): boolean {
    return score >= KNOWN_DEVICE_THRESHOLD;
}

// ─── Screen Karşılaştırma ────────────────────────────

function compareScreen(
    a: DeviceSignals['screen'],
    b: DeviceSignals['screen']
): number {
    let matches = 0;
    if (a.width === b.width) matches++;
    if (a.height === b.height) matches++;
    if (a.pixelRatio === b.pixelRatio) matches++;
    if (a.colorDepth === b.colorDepth) matches++;
    return matches / 4;
}

// ─── String Sinyal Karşılaştırma ─────────────────────

/**
 * Pipe-separated string sinyallerini karşılaştırır.
 * Format: "part1|part2"
 * - Tam eşleşme: 1.0
 * - İlk kısım (platform/engine) aynı: 0.5
 * - Hiç eşleşme yok: 0.0
 */
function compareStringSignal(a: string, b: string): number {
    if (a === b) return 1.0;

    const partsA = a.split('|');
    const partsB = b.split('|');

    // İlk kısım eşleşmesi (platform veya engine)
    if (partsA[0] && partsB[0] && partsA[0] === partsB[0]) {
        return 0.5;
    }

    return 0.0;
}

// ─── Yardımcılar ─────────────────────────────────────

/**
 * SHA-256 hash (hex string).
 * Browser'da crypto.subtle, SSR'da fallback.
 */
async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    try {
        const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
        // Fallback: basit hash (güvenlik açısından daha zayıf, ama SSR'da çalışır)
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
}

/**
 * Sinyallerden otomatik cihaz ismi üretir.
 * Örnek: "macOS — Chrome 120 — 1920x1080"
 */
function generateDeviceName(signals: DeviceSignals): string {
    const parts: string[] = [];

    // OS
    const osParts = signals.os.split('|');
    if (osParts[1] && osParts[1] !== 'unknown') {
        parts.push(osParts[1]);
    }

    // Browser
    const browserParts = signals.browser.split('|');
    if (browserParts[1] && browserParts[1] !== 'unknown') {
        parts.push(browserParts[1]);
    }

    // Screen
    if (signals.screen.width > 0) {
        parts.push(`${signals.screen.width}x${signals.screen.height}`);
    }

    return parts.length > 0 ? parts.join(' — ') : 'Bilinmeyen Cihaz';
}

// ─── Supabase Entegrasyon (İleride Aktif) ────────────

/**
 * Cihazı kullanıcının bilinen cihazlar listesine kaydet.
 * NOT: Bu fonksiyon Supabase bağımlı — integration aşamasında aktif edilecek.
 *
 * @param userId - Kullanıcı fingerprint/ID
 * @param fingerprint - Cihaz fingerprint'i
 */
export async function registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint
): Promise<{ success: boolean; error?: string }> {
    try {
        // Lazy import — sadece çağrıldığında yükle
        const { createClient } = await import('@supabase/supabase-js');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return { success: false, error: 'Supabase credentials missing' };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from('user_devices').upsert({
            user_fingerprint: userId,
            device_fingerprint: fingerprint.hash,
            device_name: fingerprint.deviceName,
            signals: fingerprint.signals,
            last_seen: new Date().toISOString(),
        }, {
            onConflict: 'user_fingerprint,device_fingerprint',
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Kullanıcının kayıtlı cihazlarını getir ve mevcut cihazla karşılaştır.
 * En yüksek skor 0.75+ ise bilinen cihaz.
 *
 * @param userId - Kullanıcı fingerprint/ID
 * @param currentFingerprint - Şu anki cihaz fingerprint'i
 * @returns { isKnown, bestScore, matchedDeviceId }
 */
export async function isKnownDevice(
    userId: string,
    currentFingerprint: DeviceFingerprint
): Promise<{ isKnown: boolean; bestScore: number; matchedDeviceId?: string }> {
    try {
        const { createClient } = await import('@supabase/supabase-js');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return { isKnown: false, bestScore: 0 };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: devices, error } = await supabase
            .from('user_devices')
            .select('id, device_fingerprint, signals')
            .eq('user_fingerprint', userId);

        if (error || !devices || devices.length === 0) {
            return { isKnown: false, bestScore: 0 };
        }

        let bestScore = 0;
        let matchedDeviceId: string | undefined;

        for (const device of devices) {
            // Hash match = kesin aynı cihaz
            if (device.device_fingerprint === currentFingerprint.hash) {
                return { isKnown: true, bestScore: 1.0, matchedDeviceId: device.id };
            }

            // Sinyal bazlı fuzzy match
            if (device.signals) {
                const storedFp: DeviceFingerprint = {
                    hash: device.device_fingerprint,
                    signals: device.signals as DeviceSignals,
                    generatedAt: '',
                };
                const score = compareFingerprints(storedFp, currentFingerprint);
                if (score > bestScore) {
                    bestScore = score;
                    matchedDeviceId = device.id;
                }
            }
        }

        return {
            isKnown: isKnownDeviceScore(bestScore),
            bestScore,
            matchedDeviceId: bestScore >= KNOWN_DEVICE_THRESHOLD ? matchedDeviceId : undefined,
        };
    } catch {
        return { isKnown: false, bestScore: 0 };
    }
}
