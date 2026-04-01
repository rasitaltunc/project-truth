// ============================================
// TRUTH PROTOCOL - Cryptographic Utilities
// Client-side encryption for sensitive data
// ============================================
//
// ✅ SECURITY B4 RESOLVED: Envelope Encryption (Phase I DMS)
// Artık kullanıcının master passphrase'i ile Argon2id key derivation kullanılıyor.
// DEK (Data Encryption Key) dosyayı şifreler, KEK (Key Encryption Key) DEK'i şifreler.
// Server ASLA plaintext görmez — zero-knowledge mimari.
//
// Kütüphane: hash-wasm (v4.12.0) — WASM-based, browser + Node.js uyumlu
// OWASP Önerisi: Argon2id, memory=64MB, iterations=3, parallelism=4
//

// ============================================
// ARGON2ID KEY DERIVATION (Phase I DMS)
// ============================================
// "Gazetecinin parolası, anahtara dönüşür."
//
// Argon2id: Memory-hard, GPU/ASIC dayanıklı, OWASP önerisi.
// Neden Argon2id (hybrid)?
//   - Argon2i: Side-channel resistant ama GPU'ya zayıf
//   - Argon2d: GPU'ya güçlü ama side-channel'a zayıf
//   - Argon2id: İkisinin en iyisi — ilk geçiş data-independent, sonrası data-dependent
//
// Parametreler (OWASP 2024 minimum önerileri):
//   memory: 65536 KB (64 MB) — GPU saldırısını pahalılaştırır
//   iterations: 3 — brute-force'u yavaşlatır
//   parallelism: 4 — modern CPU lane sayısı
//   hashLength: 32 byte — AES-256 key uzunluğu
//   salt: 32 byte — crypto.getRandomValues() ile üretilir

/**
 * Argon2id ile passphrase'den kriptografik anahtar türetir.
 *
 * @param passphrase - Kullanıcının master parolası (UTF-8 string)
 * @param salt - 32 byte salt (verilmezse yeni üretilir). Base64 encoded.
 * @returns {key: CryptoKey (AES-256-GCM), salt: string (base64)}
 *
 * Güvenlik notları:
 * - Boş passphrase kabul EDİLMEZ (gazetecinin hayatı buna bağlı)
 * - Salt DB'ye açık kaydedilir (standart kriptografik uygulama, gizli değil)
 * - Aynı passphrase + aynı salt = aynı key (deterministic — zorunlu)
 */
export async function deriveKeyFromPassphrase(
    passphrase: string,
    salt?: string
): Promise<{ key: CryptoKey; salt: string; rawKeyHash: string }> {
    // ── Girdi doğrulama ─────────────────────────────
    if (!passphrase || passphrase.length === 0) {
        throw new Error('Passphrase boş olamaz — güvenlik gereksinimi');
    }

    // ── Salt üret veya mevcut olanı kullan ──────────
    let saltBytes: Uint8Array;
    if (salt) {
        saltBytes = base64ToUint8Array(salt);
    } else {
        saltBytes = new Uint8Array(32);
        crypto.getRandomValues(saltBytes);
    }

    // ── Argon2id hash üret ──────────────────────────
    // hash-wasm lazy import — tree-shaking ve bundle size optimizasyonu
    const { argon2id } = await import('hash-wasm');

    const hashResult = await argon2id({
        password: passphrase,
        salt: saltBytes,
        parallelism: 4,
        iterations: 3,
        memorySize: 65536, // 64 MB
        hashLength: 32,    // 256 bit = AES-256 key
        outputType: 'binary',
    });

    // ── Raw bytes'tan CryptoKey oluştur ─────────────
    // hashResult zaten Uint8Array (outputType: 'binary')
    // Doğrudan kullanıyoruz — gereksiz kopya oluşturmuyoruz
    const keyBytes = hashResult instanceof Uint8Array
        ? hashResult
        : new Uint8Array(hashResult);

    // ArrayBuffer olarak al — TypeScript BufferSource uyumluluğu için
    const keyBuffer = keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength
    ) as ArrayBuffer;

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM', length: 256 },
        true,  // extractable — Shamir split için gerekli
        ['encrypt', 'decrypt']
    );

    // ── Doğrulama hash'i üret ───────────────────────
    // rawKeyHash: Türetilen key'in SHA-256 hash'i
    // Kullanım: verifyPassphrase() karşılaştırması için
    // NOT: Key'in kendisi DEĞİL, hash'i saklanır (ek güvenlik katmanı)
    const keyHashBuffer = await crypto.subtle.digest('SHA-256', keyBuffer);
    const rawKeyHash = arrayBufferToHex(keyHashBuffer);

    // ── Hassas veriyi bellekten sil ─────────────────
    // keyBytes artık CryptoKey içinde — dış referansı temizle
    // importKey() ve digest() byte'ları kopyalar, orijinal güvenle silinebilir
    keyBytes.fill(0);

    const saltBase64 = uint8ArrayToBase64(saltBytes);

    return { key: cryptoKey, salt: saltBase64, rawKeyHash };
}

/**
 * Passphrase'in doğruluğunu kontrol eder.
 * Timing-safe karşılaştırma ile yan kanal saldırısını önler.
 *
 * @param passphrase - Kontrol edilecek parola
 * @param salt - Orijinal salt (base64)
 * @param expectedKeyHash - Orijinal key'in SHA-256 hash'i (hex)
 * @returns true ise parola doğru
 */
export async function verifyPassphrase(
    passphrase: string,
    salt: string,
    expectedKeyHash: string
): Promise<boolean> {
    if (!passphrase || !salt || !expectedKeyHash) {
        return false;
    }

    try {
        const { rawKeyHash } = await deriveKeyFromPassphrase(passphrase, salt);

        // ── Timing-safe karşılaştırma ───────────────
        // String karşılaştırmasında erken çıkış (early exit) yan kanal saldırısına
        // kapı açar. Sabit zamanlı karşılaştırma yapıyoruz.
        return timingSafeEqual(rawKeyHash, expectedKeyHash);
    } catch {
        return false;
    }
}

/**
 * Timing-safe string karşılaştırma.
 * Uzunluk farkında bile sabit zamanda yanıt verir.
 * HMAC-based karşılaştırma yerine XOR-based — hex string'ler için yeterli.
 */
function timingSafeEqual(a: string, b: string): boolean {
    // Sabit zamanlı karşılaştırma: uzunluk farkı olsa bile aynı sürede cevap ver
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return a.length === b.length;

    let result = a.length ^ b.length; // uzunluk farkı varsa zaten ≠0
    for (let i = 0; i < maxLen; i++) {
        // Dizin taşması durumunda 0 döner — sabit zamanlı kalır
        const ca = i < a.length ? a.charCodeAt(i) : 0;
        const cb = i < b.length ? b.charCodeAt(i) : 0;
        result |= ca ^ cb;
    }
    return result === 0;

    // NOT: Eski implementasyon (a ^ a) XOR bug'ı düzeltildi (27 Mart 2026).
    // Eski kod uzunluk farkında a'yı kendisiyle karşılaştırıyordu
    // (a.charCodeAt(i) ^ a.charCodeAt(i) = her zaman 0) — timing leak riski.
}

// ============================================
// ENVELOPE ENCRYPTION PIPELINE (Phase I DMS — Task 2)
// ============================================
// "Gazetecinin belgesi, iki katmanlı şifrelemeyle korunur."
//
// Mimari: DEK/KEK Envelope Encryption
//   DEK (Data Encryption Key)  → Dosyayı şifreler (AES-256-GCM)
//   KEK (Key Encryption Key)   → DEK'i şifreler (Argon2id'den türetilir)
//   Server ASLA plaintext veya DEK görmez — zero-knowledge.
//
// Pipeline:
//   Şifreleme: DEK üret → dosya şifrele → KEK türet → DEK şifrele → hash → wipe
//   Çözme:     KEK türet → DEK çöz → dosya çöz → hash doğrula → wipe
//

/**
 * Şifrelenmiş belge paketi.
 * Tüm alanlar base64/hex string — ArrayBuffer referansı TUTULMAZ.
 */
export interface EncryptedBundle {
    /** Şifreli dosya verisi (base64, AES-256-GCM DEK ile) */
    encryptedFile: string;
    /** Dosya şifreleme IV'si (base64, 12 byte) */
    fileIv: string;
    /** Şifreli DEK (base64, AES-256-GCM KEK ile) */
    encryptedDEK: string;
    /** DEK şifreleme IV'si (base64, 12 byte) */
    dekIv: string;
    /** Argon2id salt (base64, 32 byte) — DB'ye açık kaydedilir */
    salt: string;
    /** SHA-256 hash of plaintext file (hex, 64 char) — bütünlük doğrulama */
    contentHash: string;
    /** Dosya metadata (şifrelenmemiş — dosya geri oluşturma için gerekli) */
    metadata: FileMetadata;
}

/**
 * Bütünlük doğrulama hatası.
 * contentHash eşleşmezse fırlatılır — belge değiştirilmiş olabilir.
 */
export class IntegrityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IntegrityError';
    }
}

/**
 * Bir dosyayı passphrase ile şifreler (DEK/KEK envelope encryption).
 *
 * Adımlar:
 * 1. DEK üret (256-bit, crypto.getRandomValues)
 * 2. Dosyayı DEK ile şifrele (AES-256-GCM, random 96-bit IV)
 * 3. Passphrase'den KEK türet (Argon2id)
 * 4. DEK'i KEK ile şifrele (AES-256-GCM, ayrı IV)
 * 5. SHA-256 hash (düz metin dosyanın, doğrulama için)
 * 6. DEK ve KEK'i bellekten sil
 *
 * @param file - Şifrelenecek dosya
 * @param passphrase - Kullanıcının master parolası
 * @returns EncryptedBundle — tüm parçalar string olarak (güvenli serileştirme)
 */
export async function encryptDocument(
    file: File,
    passphrase: string
): Promise<EncryptedBundle> {
    // ── Girdi doğrulama ─────────────────────────────
    if (!file || file.size === 0) {
        throw new Error('Dosya boş olamaz');
    }
    if (!passphrase || passphrase.length === 0) {
        throw new Error('Passphrase boş olamaz — güvenlik gereksinimi');
    }

    // ── 1. DEK üret (Data Encryption Key) ───────────
    // 32 byte = 256 bit, rastgele, tek kullanımlık
    const dekRawBytes = new Uint8Array(32);
    crypto.getRandomValues(dekRawBytes);

    const dekBuffer = dekRawBytes.buffer.slice(
        dekRawBytes.byteOffset,
        dekRawBytes.byteOffset + dekRawBytes.byteLength
    ) as ArrayBuffer;

    const dek = await crypto.subtle.importKey(
        'raw',
        dekBuffer,
        { name: 'AES-GCM', length: 256 },
        true,  // extractable — KEK ile şifreleme için export edilecek
        ['encrypt', 'decrypt']
    );

    // ── 2. Dosyayı DEK ile şifrele ─────────────────
    const fileArrayBuffer = await file.arrayBuffer();
    const fileIv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit GCM IV

    const encryptedFileBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: fileIv },
        dek,
        fileArrayBuffer
    );

    // ── 3. SHA-256 hash (plaintext'in, doğrulama için) ──
    const contentHashBuffer = await crypto.subtle.digest('SHA-256', fileArrayBuffer);
    const contentHash = arrayBufferToHex(contentHashBuffer);

    // ── 4. KEK türet (Key Encryption Key, Argon2id) ──
    const kekResult = await deriveKeyFromPassphrase(passphrase);
    const kek = kekResult.key;
    const salt = kekResult.salt;

    // ── 5. DEK'i KEK ile şifrele ───────────────────
    const dekExported = await crypto.subtle.exportKey('raw', dek);
    const dekIv = crypto.getRandomValues(new Uint8Array(12)); // Ayrı IV!

    const encryptedDEKBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: dekIv },
        kek,
        dekExported
    );

    // ── 6. Bundle oluştur (tüm binary → string) ────
    const bundle: EncryptedBundle = {
        encryptedFile: arrayBufferToBase64(encryptedFileBuffer),
        fileIv: arrayBufferToBase64(fileIv),
        encryptedDEK: arrayBufferToBase64(encryptedDEKBuffer),
        dekIv: arrayBufferToBase64(dekIv),
        salt,
        contentHash,
        metadata: {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
        },
    };

    // ── 7. Hassas verileri bellekten sil ────────────
    // DEK raw bytes
    secureWipe(dekRawBytes);
    // DEK exported bytes
    secureWipe(new Uint8Array(dekExported));

    return bundle;
}

/**
 * Şifreli belgeyi passphrase ile çözer (ters envelope pipeline).
 *
 * Adımlar:
 * 1. Passphrase + salt → Argon2id → KEK
 * 2. KEK ile encryptedDEK'i çöz → DEK
 * 3. DEK ile encryptedFile'ı çöz → plaintext
 * 4. SHA-256 hash doğrula (contentHash ile karşılaştır)
 * 5. Eşleşmezse: IntegrityError fırlat
 *
 * @param bundle - encryptDocument() çıktısı
 * @param passphrase - Kullanıcının master parolası
 * @returns Orijinal File nesnesi
 * @throws IntegrityError — hash eşleşmezse (belge değiştirilmiş)
 * @throws Error — yanlış passphrase (decrypt başarısız)
 */
export async function decryptDocument(
    bundle: EncryptedBundle,
    passphrase: string
): Promise<File> {
    // ── Girdi doğrulama ─────────────────────────────
    if (!bundle) {
        throw new Error('Bundle boş olamaz');
    }
    if (!passphrase || passphrase.length === 0) {
        throw new Error('Passphrase boş olamaz — güvenlik gereksinimi');
    }

    // ── 1. KEK türet (aynı salt ile — deterministic) ──
    const kekResult = await deriveKeyFromPassphrase(passphrase, bundle.salt);
    const kek = kekResult.key;

    // ── 2. DEK'i çöz ───────────────────────────────
    const encryptedDEKBuffer = base64ToArrayBuffer(bundle.encryptedDEK);
    const dekIv = base64ToArrayBuffer(bundle.dekIv);

    let dekRawBuffer: ArrayBuffer;
    try {
        dekRawBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(dekIv) },
            kek,
            encryptedDEKBuffer
        );
    } catch {
        throw new Error('Passphrase yanlış veya bundle bozuk — DEK çözülemedi');
    }

    // DEK'i CryptoKey olarak import et
    const dek = await crypto.subtle.importKey(
        'raw',
        dekRawBuffer,
        { name: 'AES-GCM', length: 256 },
        false, // extractable değil — sadece decrypt için
        ['decrypt']
    );

    // ── 3. Dosyayı çöz ─────────────────────────────
    const encryptedFileBuffer = base64ToArrayBuffer(bundle.encryptedFile);
    const fileIv = base64ToArrayBuffer(bundle.fileIv);

    let decryptedFileBuffer: ArrayBuffer;
    try {
        decryptedFileBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(fileIv) },
            dek,
            encryptedFileBuffer
        );
    } catch {
        throw new Error('DEK geçersiz veya dosya bozuk — dosya çözülemedi');
    }

    // ── 4. Bütünlük doğrulama (SHA-256) ────────────
    const verifyHashBuffer = await crypto.subtle.digest('SHA-256', decryptedFileBuffer);
    const verifyHash = arrayBufferToHex(verifyHashBuffer);

    if (verifyHash !== bundle.contentHash) {
        // Temizle ve hata fırlat
        secureWipe(new Uint8Array(dekRawBuffer));
        throw new IntegrityError(
            'Belge bütünlüğü doğrulanamadı — contentHash eşleşmiyor. ' +
            'Belge değiştirilmiş olabilir.'
        );
    }

    // ── 5. File nesnesini geri oluştur ──────────────
    const file = new File(
        [decryptedFileBuffer],
        bundle.metadata.name,
        {
            type: bundle.metadata.type,
            lastModified: bundle.metadata.lastModified,
        }
    );

    // ── 6. Hassas veriyi temizle ────────────────────
    secureWipe(new Uint8Array(dekRawBuffer));

    return file;
}

/**
 * Hassas veriyi bellekten güvenle siler.
 *
 * İki aşamalı silme:
 * 1. crypto.getRandomValues ile rastgele veri yaz (bellek izini kır)
 * 2. Sıfırla (bilinen temiz durum)
 *
 * NOT: JavaScript GC garantisi vermez — bu "en iyi çaba" yaklaşımıdır.
 * Ama Web Crypto API anahtarları GC'den bağımsız olarak yönetir,
 * bu yüzden CryptoKey referanslarını null'lamak da önemlidir.
 *
 * @param buffer - Temizlenecek Uint8Array (TypedArray)
 */
export function secureWipe(buffer: Uint8Array): void {
    if (!buffer || buffer.length === 0) return;

    // Aşama 1: Rastgele veri yaz (bellek izini kır)
    // Web Crypto getRandomValues: max 65536 byte per call
    const CHUNK = 65536;
    for (let offset = 0; offset < buffer.length; offset += CHUNK) {
        const end = Math.min(offset + CHUNK, buffer.length);
        crypto.getRandomValues(buffer.subarray(offset, end));
    }

    // Aşama 2: Sıfırla (bilinen temiz durum)
    buffer.fill(0);
}

// ============================================
// KEY GENERATION & MANAGEMENT
// ============================================

/**
 * Generate a new AES-256-GCM key for encryption
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Export key to base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
}

/**
 * Import key from base64 string
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// ============================================
// ENCRYPTION & DECRYPTION
// ============================================

export interface EncryptedData {
    ciphertext: string;  // Base64 encoded
    iv: string;          // Base64 encoded initialization vector
    tag?: string;        // For verification
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(
    data: string | ArrayBuffer,
    key: CryptoKey
): Promise<EncryptedData> {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Convert string to ArrayBuffer if needed
    const dataBuffer = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        dataBuffer
    );

    return {
        ciphertext: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv)
    };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
    encryptedData: EncryptedData,
    key: CryptoKey
): Promise<string> {
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(iv)
        },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt a file
 */
export async function encryptFile(
    file: File,
    key: CryptoKey
): Promise<{ encrypted: EncryptedData; metadata: FileMetadata }> {
    const arrayBuffer = await file.arrayBuffer();
    const encrypted = await encryptData(arrayBuffer, key);

    const metadata: FileMetadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
    };

    return { encrypted, metadata };
}

/**
 * Decrypt a file
 */
export async function decryptFile(
    encryptedData: EncryptedData,
    metadata: FileMetadata,
    key: CryptoKey
): Promise<File> {
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(iv)
        },
        key,
        ciphertext
    );

    return new File([decrypted], metadata.name, {
        type: metadata.type,
        lastModified: metadata.lastModified
    });
}

// ============================================
// HASHING
// ============================================

/**
 * Generate SHA-256 hash of data
 */
export async function hashData(data: string | ArrayBuffer): Promise<string> {
    const dataBuffer = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data;

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return arrayBufferToHex(hashBuffer);
}

/**
 * Generate SHA-256 hash of a file
 */
export async function hashFile(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    return hashData(arrayBuffer);
}

// ============================================
// DIGITAL SIGNATURES (for future use)
// ============================================

/**
 * Generate ECDSA key pair for signing
 */
export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
    );
}

/**
 * Sign data with private key
 */
export async function signData(
    data: string | ArrayBuffer,
    privateKey: CryptoKey
): Promise<string> {
    const dataBuffer = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data;

    const signature = await crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: 'SHA-256'
        },
        privateKey,
        dataBuffer
    );

    return arrayBufferToBase64(signature);
}

/**
 * Verify signature with public key
 */
export async function verifySignature(
    data: string | ArrayBuffer,
    signature: string,
    publicKey: CryptoKey
): Promise<boolean> {
    const dataBuffer = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data;

    const signatureBuffer = base64ToArrayBuffer(signature);

    return await crypto.subtle.verify(
        {
            name: 'ECDSA',
            hash: 'SHA-256'
        },
        publicKey,
        signatureBuffer,
        dataBuffer
    );
}

// ============================================
// SECURE RANDOM
// ============================================

/**
 * Generate cryptographically secure random string
 */
export function generateSecureId(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length / 2));
    return arrayBufferToHex(bytes);
}

/**
 * Generate secure token
 */
export function generateToken(): string {
    return generateSecureId(64);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export interface FileMetadata {
    name: string;
    type: string;
    size: number;
    lastModified: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function arrayBufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============================================
// METADATA STRIPPING
// ============================================

/**
 * Strip EXIF and other metadata from images
 * Creates a clean copy by redrawing the image
 */
export async function stripImageMetadata(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            // Create canvas with same dimensions
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw image (this strips all metadata)
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);

            // Convert back to file
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Could not create blob'));
                        return;
                    }
                    // Generate new filename to avoid any correlation
                    const cleanName = `evidence_${generateSecureId(8)}.${file.type.split('/')[1] || 'jpg'}`;
                    resolve(new File([blob], cleanName, { type: file.type }));
                },
                file.type,
                0.95 // Quality
            );

            URL.revokeObjectURL(url);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load image'));
        };

        img.src = url;
    });
}

/**
 * Strip metadata from PDF (full — removes Author, Creator, Title, dates, etc.)
 * Uses pdf-lib to clear all standard PDF metadata fields.
 * Falls back to filename-only strip if pdf-lib fails (encrypted/corrupted PDF).
 *
 * SECURITY: Critical for journalist protection — prevents identity exposure via
 * PDF Author/Creator fields, creation dates, and software fingerprints.
 */
export async function stripPdfMetadata(file: File): Promise<File> {
    const cleanName = `document_${generateSecureId(8)}.pdf`;
    try {
        // Dynamic import to avoid bundling pdf-lib when not needed
        const { PDFDocument } = await import('pdf-lib');
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

        // Clear all standard PDF metadata fields
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setCreator('');
        pdfDoc.setProducer('');
        pdfDoc.setCreationDate(new Date(0)); // Epoch — no real date
        pdfDoc.setModificationDate(new Date(0));

        // Save as new PDF (also removes incremental update metadata)
        const cleanedBytes = await pdfDoc.save();
        return new File([cleanedBytes as BlobPart], cleanName, { type: 'application/pdf' });
    } catch {
        // If pdf-lib fails (encrypted, corrupted), fall back to filename-only strip
        // Better to upload with cleaned name than fail entirely
        console.warn('[stripPdfMetadata] pdf-lib failed, falling back to filename-only strip');
        return new File([await file.arrayBuffer()], cleanName, { type: 'application/pdf' });
    }
}

/**
 * Create a clean copy of any file (strips filename metadata)
 */
export async function createCleanFileCopy(file: File): Promise<File> {
    const extension = file.name.split('.').pop() || '';
    const cleanName = `file_${generateSecureId(8)}.${extension}`;
    return new File([await file.arrayBuffer()], cleanName, { type: file.type });
}

// ============================================
// SECURE SUBMISSION PACKAGE
// ============================================

export interface SecureSubmission {
    // Encrypted evidence data
    encryptedContent?: EncryptedData;
    encryptedFiles?: {
        encrypted: EncryptedData;
        metadata: FileMetadata;
        hash: string;
    }[];

    // Verification
    contentHash: string;
    timestamp: number;
    signature?: string;

    // Metadata (unencrypted for indexing)
    submissionId: string;
    submitterId: string;  // Anonymous ID
}

/**
 * Create a secure submission package
 */
export async function createSecureSubmission(
    content: string,
    files: File[],
    submitterId: string,
    encryptionKey?: CryptoKey
): Promise<SecureSubmission> {
    const submissionId = generateSecureId(32);
    const timestamp = Date.now();

    // Hash the content
    const contentHash = await hashData(content + timestamp.toString());

    // If encryption key provided, encrypt content
    let encryptedContent: EncryptedData | undefined;
    if (encryptionKey) {
        encryptedContent = await encryptData(content, encryptionKey);
    }

    // Process files
    const encryptedFiles: SecureSubmission['encryptedFiles'] = [];
    for (const file of files) {
        // Strip metadata from images
        let cleanFile = file;
        if (file.type.startsWith('image/')) {
            cleanFile = await stripImageMetadata(file);
        } else if (file.type === 'application/pdf') {
            cleanFile = await stripPdfMetadata(file);
        } else {
            cleanFile = await createCleanFileCopy(file);
        }

        // Hash the file
        const fileHash = await hashFile(cleanFile);

        // Encrypt if key provided
        if (encryptionKey) {
            const { encrypted, metadata } = await encryptFile(cleanFile, encryptionKey);
            encryptedFiles.push({ encrypted, metadata, hash: fileHash });
        } else {
            encryptedFiles.push({
                encrypted: { ciphertext: '', iv: '' },
                metadata: {
                    name: cleanFile.name,
                    type: cleanFile.type,
                    size: cleanFile.size,
                    lastModified: cleanFile.lastModified
                },
                hash: fileHash
            });
        }
    }

    return {
        encryptedContent,
        encryptedFiles: encryptedFiles.length > 0 ? encryptedFiles : undefined,
        contentHash,
        timestamp,
        submissionId,
        submitterId
    };
}
