// ═══════════════════════════════════════════════════════
// SHAMIR'S SECRET SHARING — Kolektif Kalkan Protokolü
// Sprint 13: Gazeteci dokunulmazlığını dünyaya kazandır
// ═══════════════════════════════════════════════════════
// "Bir gazeteciyi susturduğun anda, belgeleri binlerce kişiye ulaşır."
//
// Bu modül AES-256 key'ini N parçaya böler.
// M-of-N threshold: N parçanın M tanesi birleşince key restore edilir.
// Galois Field GF(256) üzerinde polynomial interpolation.
//
// ✅ SECURITY S2 RESOLVED: Shard Reconstruction Verification
// shamirCombine() artık contentHash varsa SHA-256 doğrulama yapıyor.
// Yanlış shard'lar ShardIntegrityError fırlatır (sessizce çöp üretmek yerine).
// shamirSplitWithHash() otomatik hash hesaplar.
//
// ⚠️ SECURITY TODO S4: Shard MAC (Message Authentication Code)
// Her shard'a HMAC-SHA256 MAC ekle. Depolama sırasında bit-flip saldırısı
// yapılırsa shamirCombine yanlış sonuç üretir ama hata vermez.
// Çözüm: Her shard'ı {x, data, mac} olarak sakla. Combine öncesi MAC doğrula.
// NOT: AES-GCM encryption (CD1 fix) kısmen koruyucu — ama şifreleme
// katmanı çıkarılırsa (future refactor) MAC yokluğu kritik olur.
// Öncelik: Orta (AES-GCM integrity check mevcut durumda yeterli)
//
// ═══════════════════════════════════════════════════════

// ─── GF(256) Aritmetik ─────────────────────────────────
// AES'in kullandığı aynı alan: x^8 + x^4 + x^3 + x + 1 (0x11B)

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

// Lookup table'ları oluştur (bir kez, modül yüklendiğinde)
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = x ^ (x << 1) ^ (x >= 128 ? 0x11b : 0);
    x &= 0xff;
  }
  EXP_TABLE[255] = EXP_TABLE[0]; // wrap
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('GF(256) sıfıra bölme hatası');
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] - LOG_TABLE[b] + 255) % 255];
}

// ─── Cryptographically Secure Random ────────────────────
// SECURITY S1: Math.random() fallback KALDIRILDI.
// Gazetecilerin hayatı bu RNG'ye bağlı — zayıf random kabul edilemez.
// Node.js 19+ ve tüm modern tarayıcılarda crypto.getRandomValues global.
// Next.js server-side (Edge/Node runtime) da destekler.

function getSecureCrypto(): Crypto {
  // Tarayıcı veya Node.js 19+ global crypto
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    return globalThis.crypto;
  }
  // Node.js < 19 fallback — node:crypto modülünden webcrypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto');
    if (nodeCrypto.webcrypto) {
      return nodeCrypto.webcrypto as Crypto;
    }
  } catch {
    // require başarısız olabilir (tarayıcı ortamı)
  }
  // Hiçbir güvenli kaynak yoksa — İŞLEMİ DURDUR, Math.random() KULLANMA
  throw new Error(
    'CRITICAL: Kriptografik olarak güvenli random kaynak bulunamadı. ' +
    'Node.js 19+ veya modern tarayıcı gerekli. Math.random() ASLA kullanılmayacak.'
  );
}

function secureRandom(max: number): number {
  const c = getSecureCrypto();
  const arr = new Uint8Array(1);
  // Bias-free random: reject values >= largest multiple of max
  const limit = 256 - (256 % max);
  let val: number;
  do {
    c.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % max;
}

function secureRandomByte(): number {
  const c = getSecureCrypto();
  const arr = new Uint8Array(1);
  c.getRandomValues(arr);
  return arr[0];
}

// ─── Polynomial Evaluation ──────────────────────────────

/**
 * Polynomial'ı GF(256)'da değerlendir
 * coeffs[0] = secret, coeffs[1..threshold-1] = rastgele
 * P(x) = coeffs[0] + coeffs[1]*x + coeffs[2]*x^2 + ...
 */
function evaluatePolynomial(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = gfMul(result, x) ^ coeffs[i];
  }
  return result;
}

// ─── Lagrange Interpolation ─────────────────────────────

/**
 * Lagrange interpolasyonu ile f(0) = secret'ı kurtarır
 * points: [{ x, y }] — en az threshold kadar nokta gerekli
 */
function lagrangeInterpolate(points: Array<{ x: number; y: number }>): number {
  let secret = 0;
  const k = points.length;

  for (let i = 0; i < k; i++) {
    let numerator = 1;
    let denominator = 1;

    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      // f(0) istiyoruz → "0 - xj" = xj (GF'de negasyon = kendisi)
      numerator = gfMul(numerator, points[j].x);
      denominator = gfMul(denominator, points[i].x ^ points[j].x);
    }

    const lagrange = gfMul(points[i].y, gfDiv(numerator, denominator));
    secret = secret ^ lagrange;
  }

  return secret;
}

// ─── Public API ─────────────────────────────────────────

export interface ShamirShard {
  /** Shard index (1-255, asla 0 değil) */
  x: number;
  /** Şifrelenmiş veri parçası (hex encoded) */
  data: string;
  /** Oluşturma zamanı */
  created_at: string;
  /** SHA-256 hash of original secret (S2 fix — reconstruct doğrulama) */
  contentHash?: string;
}

/**
 * Shard birleştirme bütünlük hatası.
 * shamirCombine() sonucu hash doğrulamasını geçemezse fırlatılır.
 * Nedenler: yanlış shard, eksik threshold, bozuk veri.
 */
export class ShardIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShardIntegrityError';
  }
}

export interface ShamirConfig {
  /** Toplam parça sayısı (N) — kaç kişiye dağıtılacak */
  totalShards: number;
  /** Eşik değer (M) — kaç parça birleşince açılır */
  threshold: number;
}

/**
 * Secret'ı (AES-256 key, base64 string) N parçaya böler.
 * M-of-N: threshold kadar parça birleşince secret kurtarılır.
 *
 * @param secret - Base64 encoded AES-256 key
 * @param totalShards - Toplam parça sayısı (N) — max 255
 * @param threshold - Eşik değer (M) — min 2, max N
 * @returns N adet ShamirShard
 */
export function shamirSplit(
  secret: string,
  totalShards: number,
  threshold: number,
  contentHash?: string
): ShamirShard[] {
  // Validasyon
  if (threshold < 2) throw new Error('Threshold en az 2 olmalı');
  if (threshold > totalShards) throw new Error('Threshold, toplam shard sayısını aşamaz');
  if (totalShards > 255) throw new Error('Maksimum 255 shard desteklenir');

  // Secret'ı byte dizisine çevir
  const secretBytes = base64ToBytes(secret);

  // ── KRİTİK: Her byte için TEK polinom oluştur ──────────────
  // Shamir'in temel prensibi: Aynı polinomun farklı noktalarında
  // değerlendirme yapılır. Her shard farklı x'te aynı P(x)'i değerlendirir.
  // YANLIŞ: Her shard için yeni random katsayılar → farklı polinomlar → çöp
  // DOĞRU: Bir kez random katsayı üret, tüm shardlarda aynı polinomu kullan
  const polynomials: number[][] = [];
  for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
    const coeffs = new Array(threshold);
    coeffs[0] = secretBytes[byteIdx]; // Sabit terim = secret byte
    for (let c = 1; c < threshold; c++) {
      coeffs[c] = secureRandomByte(); // Rastgele katsayılar (BİR KERE)
    }
    polynomials.push(coeffs);
  }

  // ── Her shard'ı oluştur: aynı polinomları farklı x'lerde değerlendir ──
  const shards: ShamirShard[] = [];
  for (let s = 0; s < totalShards; s++) {
    const x = s + 1; // x değerleri 1'den başlar (0 = secret)
    const shardBytes = new Uint8Array(secretBytes.length);

    for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
      shardBytes[byteIdx] = evaluatePolynomial(polynomials[byteIdx], x);
    }

    shards.push({
      x,
      data: bytesToHex(shardBytes),
      created_at: new Date().toISOString(),
      ...(contentHash ? { contentHash } : {}),
    });
  }

  return shards;
}

/**
 * M adet shard'ı birleştirerek secret'ı kurtarır.
 * S2 FIX: contentHash varsa, kurtarılan secret'ın SHA-256'sını doğrular.
 * Eşleşmezse ShardIntegrityError fırlatır.
 *
 * @param shards - En az threshold kadar ShamirShard
 * @returns Base64 encoded AES-256 key (orijinal secret)
 * @throws ShardIntegrityError — hash doğrulaması başarısızsa
 */
export async function shamirCombine(shards: ShamirShard[]): Promise<string> {
  if (shards.length < 2) throw new Error('En az 2 shard gerekli');

  // ── SECURITY: Validate each shard before processing ──
  // Prevents: invalid x values, corrupted hex data, tampered shards
  for (let i = 0; i < shards.length; i++) {
    if (!validateShard(shards[i])) {
      throw new ShardIntegrityError(
        `Geçersiz shard [${i}]: format doğrulaması başarısız. ` +
        'x değeri 1-255 aralığında, data geçerli hex olmalı.'
      );
    }
  }

  // X değerlerinin benzersiz olduğunu kontrol et
  const xValues = new Set(shards.map(s => s.x));
  if (xValues.size !== shards.length) {
    throw new ShardIntegrityError(
      `Tekrarlanan shard x değerleri tespit edildi (${shards.length} shard, ${xValues.size} benzersiz x). ` +
      'Her shard benzersiz bir x değerine sahip olmalı.'
    );
  }

  // Tüm shard'ların aynı uzunlukta olduğunu kontrol et
  const shardBytes = shards.map(s => hexToBytes(s.data));
  const secretLength = shardBytes[0].length;
  if (!shardBytes.every(b => b.length === secretLength)) {
    throw new Error('Shard uzunlukları tutarsız');
  }

  // Her byte pozisyonu için Lagrange interpolasyonu
  const secretBytes = new Uint8Array(secretLength);

  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    const points = shards.map((shard, i) => ({
      x: shard.x,
      y: shardBytes[i][byteIdx],
    }));
    secretBytes[byteIdx] = lagrangeInterpolate(points);
  }

  const recovered = bytesToBase64(secretBytes);

  // ── S2 FIX: Hash doğrulama ─────────────────────────────
  // contentHash varsa, kurtarılan secret'ın hash'ini karşılaştır.
  // Eşleşmezse: yanlış shard'lar, eksik threshold, veya bozuk veri.
  const expectedHash = shards.find(s => s.contentHash)?.contentHash;
  if (expectedHash) {
    const recoveredBytes = base64ToBytes(recovered);
    const recoveredBuffer = recoveredBytes.buffer.slice(
      recoveredBytes.byteOffset,
      recoveredBytes.byteOffset + recoveredBytes.byteLength
    ) as ArrayBuffer;
    const hashBuffer = await getSubtleCrypto().digest('SHA-256', recoveredBuffer);
    const hash = bytesToHex(new Uint8Array(hashBuffer));
    if (hash !== expectedHash) {
      throw new ShardIntegrityError(
        'Shard birleştirme doğrulaması başarısız — kurtarılan secret hash\'i eşleşmiyor. ' +
        'Olası nedenler: yanlış shard, yetersiz threshold, bozuk veri.'
      );
    }
  }

  return recovered;
}

/**
 * Shard'ın geçerli olup olmadığını doğrular (format kontrolü)
 */
export function validateShard(shard: ShamirShard): boolean {
  // Null/undefined guard — saldırgan veya bozuk veri
  if (!shard || typeof shard !== 'object') return false;
  if (!shard.x || shard.x < 1 || shard.x > 255) return false;
  if (!shard.data || shard.data.length === 0) return false;
  if (!shard.created_at) return false;

  // Hex format kontrolü — sadece [0-9a-f] karakterleri, çift uzunluk
  if (!/^[0-9a-f]+$/.test(shard.data)) return false;
  if (shard.data.length % 2 !== 0) return false;

  return true;
}

/**
 * Proof-of-Life zinciri için blok hash'i oluşturur
 * Her check-in önceki bloğa bağlı (blockchain mantığı)
 */
export async function createProofOfLifeHash(
  userId: string,
  previousHash: string,
  timestamp: string
): Promise<string> {
  const payload = `${userId}:${previousHash}:${timestamp}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const dataBuffer = data.buffer.slice(
    data.byteOffset, data.byteOffset + data.byteLength
  ) as ArrayBuffer;

  const hashBuffer = await getSubtleCrypto().digest('SHA-256', dataBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  return bytesToHex(hashArray);
}

/**
 * Proof-of-Life zincirini doğrular
 * Kırılma noktası varsa index'ini döner, yoksa -1
 */
export async function verifyProofOfLifeChain(
  chain: Array<{ user_id: string; block_hash: string; prev_hash: string; created_at: string }>
): Promise<{ valid: boolean; breakPoint: number }> {
  for (let i = 1; i < chain.length; i++) {
    const expected = await createProofOfLifeHash(
      chain[i].user_id,
      chain[i - 1].block_hash,
      chain[i].created_at
    );
    if (expected !== chain[i].block_hash) {
      return { valid: false, breakPoint: i };
    }
    if (chain[i].prev_hash !== chain[i - 1].block_hash) {
      return { valid: false, breakPoint: i };
    }
  }
  return { valid: true, breakPoint: -1 };
}

// ─── SubtleCrypto Helper ────────────────────────────────

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  try {
    const nodeCrypto = require('node:crypto');
    return nodeCrypto.webcrypto.subtle;
  } catch {
    throw new Error('CRITICAL: crypto.subtle bulunamadı. SHA-256 hash üretilemiyor.');
  }
}

/**
 * Secret'ın SHA-256 hash'ini hesaplar (shard contentHash için).
 * Base64 encoded secret → byte'lar → SHA-256 → hex string
 */
export async function hashSecret(secret: string): Promise<string> {
  const secretBytes = base64ToBytes(secret);
  const secretBuffer = secretBytes.buffer.slice(
    secretBytes.byteOffset,
    secretBytes.byteOffset + secretBytes.byteLength
  ) as ArrayBuffer;
  const hashBuffer = await getSubtleCrypto().digest('SHA-256', secretBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * shamirSplit wrapper — contentHash otomatik hesaplar (async).
 * Doğrudan shamirSplit() senkron kalır, bu fonksiyon hash'i önceden hesaplar.
 */
export async function shamirSplitWithHash(
  secret: string,
  totalShards: number,
  threshold: number
): Promise<ShamirShard[]> {
  const contentHash = await hashSecret(secret);
  return shamirSplit(secret, totalShards, threshold, contentHash);
}

// ─── Encoding Utilities ─────────────────────────────────

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js fallback
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa !== 'undefined') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
