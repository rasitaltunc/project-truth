/**
 * ═══════════════════════════════════════════════════════════════
 * SHAMIR'S SECRET SHARING — KRİTİK GÜVENLİK TESTLERİ
 * ═══════════════════════════════════════════════════════════════
 *
 * BU TEST DOSYASI İNSANLARIN HAYATINI KORUYAN KOD İÇİNDİR.
 *
 * Shamir's Secret Sharing gazetecilerin Dead Man Switch belgelerinin
 * şifreleme anahtarlarını parçalara böler. Bir gazeteciye bir şey
 * olduğunda, yeterli sayıda parça birleşerek belgeleri açar.
 *
 * Bu testler şunu garanti eder:
 * 1. Parçalar birleştiğinde HER ZAMAN doğru anahtar çıkar
 * 2. Yetersiz parça ile ASLA doğru anahtar çıkmaz
 * 3. Bozuk parçalar tespit edilir
 * 4. Proof-of-Life zinciri kırılma noktasını doğru gösterir
 *
 * Çalıştır: npx jest src/lib/__tests__/shamir.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import {
  shamirSplit,
  shamirCombine,
  shamirSplitWithHash,
  hashSecret,
  validateShard,
  createProofOfLifeHash,
  verifyProofOfLifeChain,
  ShamirShard,
  ShardIntegrityError,
} from '../shamir';

// ─── Helper: Base64 encode (simulating real AES-256 key) ────
function randomBase64Key(byteLength: number = 32): string {
  const bytes = new Uint8Array(byteLength);
  // Use crypto for real randomness
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for test env
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Buffer.from(bytes).toString('base64');
}

// ─── Helper: Get all k-combinations from array ─────────────
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = combinations(arr.slice(i + 1), k - 1);
    for (const combo of rest) {
      result.push([arr[i], ...combo]);
    }
  }
  return result;
}

// ═════════════════════════════════════════════════════════════
// BÖLÜM 1: TEMEL FONKSİYONELLİK
// "Parçala ve birleştir — her zaman doğru sonuç"
// ═════════════════════════════════════════════════════════════

describe('Shamir Temel: Parçala ve Birleştir', () => {
  test('3-of-5: Gerçek AES-256 key round-trip', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);
    expect(shards).toHaveLength(5);

    const recovered = await shamirCombine(shards.slice(0, 3));
    expect(recovered).toBe(key);
  });

  test('6-of-10: Kolektif Kalkan senaryosu (gerçek kullanım)', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 10, 6);
    expect(shards).toHaveLength(10);

    const recovered = await shamirCombine(shards.slice(0, 6));
    expect(recovered).toBe(key);
  });

  test('2-of-2: Minimum konfigürasyon', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 2, 2);
    expect(shards).toHaveLength(2);

    const recovered = await shamirCombine(shards);
    expect(recovered).toBe(key);
  });

  test('5-of-5: Tüm parçalar gerekli', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 5);
    const recovered = await shamirCombine(shards);
    expect(recovered).toBe(key);
  });

  test('Boş string secret', async () => {
    const shards = shamirSplit('', 3, 2);
    expect(shards).toHaveLength(3);
    const recovered = await shamirCombine(shards.slice(0, 2));
    expect(recovered).toBe('');
  });

  test('Farklı byte uzunlukları (16, 24, 32, 48 byte)', async () => {
    for (const len of [16, 24, 32, 48]) {
      const key = randomBase64Key(len);
      const shards = shamirSplit(key, 4, 3);
      const recovered = await shamirCombine(shards.slice(0, 3));
      expect(recovered).toBe(key);
    }
  });

  test('Uzun secret (256 byte base64 key)', async () => {
    const key = randomBase64Key(256);
    const shards = shamirSplit(key, 5, 3);
    const recovered = await shamirCombine(shards.slice(0, 3));
    expect(recovered).toBe(key);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 2: TÜM KOMBİNASYON TESTİ
// "Hangi 3 parçayı birleştirirsen birleştir, aynı anahtar çıkmalı"
// ═════════════════════════════════════════════════════════════

describe('Shamir Kombinasyonlar: Her Alt Küme Aynı Sonucu Vermeli', () => {
  test('3-of-5: Tüm C(5,3)=10 kombinasyonu test et', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);
    const allCombos = combinations(shards, 3);

    expect(allCombos).toHaveLength(10);

    for (const combo of allCombos) {
      const recovered = await shamirCombine(combo);
      expect(recovered).toBe(key);
    }
  });

  test('3-of-6: Tüm C(6,3)=20 kombinasyonu test et', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 6, 3);
    const allCombos = combinations(shards, 3);

    expect(allCombos).toHaveLength(20);

    for (const combo of allCombos) {
      expect(await shamirCombine(combo)).toBe(key);
    }
  });

  test('Parçaların sırası sonucu etkilememeli', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);
    const selected = [shards[4], shards[0], shards[2]];

    expect(await shamirCombine(selected)).toBe(key);

    const shuffled = [shards[2], shards[4], shards[0]];
    expect(await shamirCombine(shuffled)).toBe(key);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 3: EŞİK DEĞERİ GÜVENLİĞİ
// "Yetersiz parça ile ASLA doğru anahtar çıkmamalı"
// ═════════════════════════════════════════════════════════════

describe('Shamir Eşik Güvenliği: Yetersiz Parça = Yanlış Sonuç', () => {
  test('2 parça ile 3-of-5 secret kurtarılamaz', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    const wrongResult = await shamirCombine(shards.slice(0, 2));
    expect(wrongResult).not.toBe(key);
  });

  test('5 parça ile 6-of-10 secret kurtarılamaz', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 10, 6);

    const wrongResult = await shamirCombine(shards.slice(0, 5));
    expect(wrongResult).not.toBe(key);
  });

  test('4 parça ile 5-of-5 secret kurtarılamaz', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 5);

    const wrongResult = await shamirCombine(shards.slice(0, 4));
    expect(wrongResult).not.toBe(key);
  });

  test('Tek parça ile hiçbir şey kurtarılamaz (hata fırlatmalı)', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    await expect(shamirCombine([shards[0]])).rejects.toThrow('En az 2 shard gerekli');
  });

  test('Boş dizi ile hata fırlatmalı', async () => {
    await expect(shamirCombine([])).rejects.toThrow('En az 2 shard gerekli');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 4: RANDOMNESS GARANTİSİ
// "Aynı secret iki kez bölündüğünde farklı parçalar çıkmalı"
// ═════════════════════════════════════════════════════════════

describe('Shamir Randomness: Her Bölme Benzersiz', () => {
  test('Aynı secret iki kez bölünce farklı shard verisi üretir', async () => {
    const key = randomBase64Key(32);
    const shards1 = shamirSplit(key, 5, 3);
    const shards2 = shamirSplit(key, 5, 3);

    let anyDifferent = false;
    for (let i = 0; i < 5; i++) {
      if (shards1[i].data !== shards2[i].data) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);

    expect(await shamirCombine(shards1.slice(0, 3))).toBe(key);
    expect(await shamirCombine(shards2.slice(0, 3))).toBe(key);
  });

  test('100 farklı bölme — hiçbiri aynı shard üretmemeli', () => {
    const key = randomBase64Key(32);
    const seenDataSets = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const shards = shamirSplit(key, 3, 2);
      const signature = shards.map(s => s.data).join('|');
      expect(seenDataSets.has(signature)).toBe(false);
      seenDataSets.add(signature);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 5: BOZUK SHARD TESPİTİ
// "Değiştirilmiş veya bozuk parça ile yanlış sonuç"
// ═════════════════════════════════════════════════════════════

describe('Shamir Bozuk Shard: Tahrifat Tespiti', () => {
  test('Bir shard verisi değiştirilince yanlış sonuç çıkar', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    const corruptedShard: ShamirShard = {
      ...shards[0],
      data: shards[0].data.substring(0, 2) +
            (shards[0].data[2] === 'f' ? '0' : 'f') +
            shards[0].data.substring(3),
    };

    const wrongResult = await shamirCombine([corruptedShard, shards[1], shards[2]]);
    expect(wrongResult).not.toBe(key);
  });

  test('Shard x değeri değiştirilince yanlış sonuç çıkar', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    const corruptedShard: ShamirShard = {
      ...shards[0],
      x: 200,
    };

    const wrongResult = await shamirCombine([corruptedShard, shards[1], shards[2]]);
    expect(wrongResult).not.toBe(key);
  });

  test('Aynı shard iki kez kullanılırsa hata fırlatmalı', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    await expect(
      shamirCombine([shards[0], shards[0], shards[0]])
    ).rejects.toThrow('Tekrarlanan shard x değerleri');
  });

  test('Farkli secretlardan gelen shardlar karistirilirsa yanlis sonuc', async () => {
    const key1 = randomBase64Key(32);
    const key2 = randomBase64Key(32);
    const shards1 = shamirSplit(key1, 5, 3);
    const shards2 = shamirSplit(key2, 5, 3);

    const mixedResult = await shamirCombine([shards1[0], shards1[1], shards2[2]]);
    expect(mixedResult).not.toBe(key1);
    expect(mixedResult).not.toBe(key2);
  });

  test('Uzunlugu tutarsiz shardlar hata firlatmali', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3);

    const shortShard: ShamirShard = {
      ...shards[0],
      data: shards[0].data.substring(0, 4),
    };

    await expect(
      shamirCombine([shortShard, shards[1], shards[2]])
    ).rejects.toThrow('Shard uzunlukları tutarsız');
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 6: SHARD DOĞRULAMA
// ═════════════════════════════════════════════════════════════

describe('Shamir Shard Doğrulama: validateShard()', () => {
  test('Geçerli shard → true', () => {
    const shards = shamirSplit(randomBase64Key(32), 3, 2);
    for (const shard of shards) {
      expect(validateShard(shard)).toBe(true);
    }
  });

  test('null/undefined → false (çökmemeli)', () => {
    expect(validateShard(null as any)).toBe(false);
    expect(validateShard(undefined as any)).toBe(false);
  });

  test('Boş obje → false', () => {
    expect(validateShard({} as any)).toBe(false);
  });

  test('x=0 (geçersiz, secret noktası) → false', () => {
    expect(validateShard({ x: 0, data: 'aabb', created_at: new Date().toISOString() })).toBe(false);
  });

  test('x=256 (aralık dışı) → false', () => {
    expect(validateShard({ x: 256, data: 'aabb', created_at: new Date().toISOString() })).toBe(false);
  });

  test('x=-1 (negatif) → false', () => {
    expect(validateShard({ x: -1, data: 'aabb', created_at: new Date().toISOString() })).toBe(false);
  });

  test('Boş data → false', () => {
    expect(validateShard({ x: 1, data: '', created_at: new Date().toISOString() })).toBe(false);
  });

  test('Geçersiz hex data → false', () => {
    expect(validateShard({ x: 1, data: 'ZZZZ', created_at: new Date().toISOString() })).toBe(false);
  });

  test('created_at eksik → false', () => {
    expect(validateShard({ x: 1, data: 'aabb' } as any)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 7: GİRDİ DOĞRULAMA VE HATA YÖNETİMİ
// ═════════════════════════════════════════════════════════════

describe('Shamir Girdi Doğrulama: Hatalı Parametreler', () => {
  test('threshold < 2 → hata', () => {
    expect(() => shamirSplit('secret', 5, 1)).toThrow('Threshold en az 2 olmalı');
  });

  test('threshold > totalShards → hata', () => {
    expect(() => shamirSplit('secret', 3, 5)).toThrow('Threshold, toplam shard sayısını aşamaz');
  });

  test('totalShards > 255 → hata', () => {
    expect(() => shamirSplit('secret', 256, 2)).toThrow('Maksimum 255 shard');
  });

  test('totalShards = 255 → çalışmalı (maksimum sınır)', async () => {
    const key = randomBase64Key(4);
    const shards = shamirSplit(key, 255, 2);
    expect(shards).toHaveLength(255);

    const recovered = await shamirCombine([shards[0], shards[254]]);
    expect(recovered).toBe(key);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 8: X DEĞERİ BENZERSİZLİĞİ VE YAPI
// ═════════════════════════════════════════════════════════════

describe('Shamir Yapısal Kontroller', () => {
  test('Her shard benzersiz x değerine sahip (1-N)', () => {
    const shards = shamirSplit(randomBase64Key(32), 10, 5);
    const xValues = shards.map(s => s.x);
    const uniqueX = new Set(xValues);

    expect(uniqueX.size).toBe(10);

    // x değerleri 1'den başlamalı, 0 olmamalı
    for (const x of xValues) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(255);
    }
  });

  test('Tum shardlar ayni data uzunluguna sahip', () => {
    const shards = shamirSplit(randomBase64Key(32), 5, 3);
    const lengths = shards.map(s => s.data.length);
    const uniqueLengths = new Set(lengths);
    expect(uniqueLengths.size).toBe(1); // Hepsi aynı uzunluk
  });

  test('Shard data hex formatında', () => {
    const shards = shamirSplit(randomBase64Key(32), 5, 3);
    for (const shard of shards) {
      expect(shard.data).toMatch(/^[0-9a-f]+$/);
    }
  });

  test('created_at geçerli ISO tarih', () => {
    const before = Date.now();
    const shards = shamirSplit(randomBase64Key(32), 3, 2);
    const after = Date.now();

    for (const shard of shards) {
      const ts = new Date(shard.created_at).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 9: STRES TESTİ
// "500 rastgele secret, farklı konfigürasyonlar"
// ═════════════════════════════════════════════════════════════

describe('Shamir Stres Testi: 500 Rastgele Round-Trip', () => {
  test('500 farklı random AES key, farklı N/M kombinasyonları', async () => {
    let successCount = 0;

    for (let i = 0; i < 500; i++) {
      const byteLen = [16, 24, 32][i % 3];
      const key = randomBase64Key(byteLen);

      const totalShards = (i % 8) + 3;
      const threshold = Math.max(2, Math.min(totalShards, (i % (totalShards - 1)) + 2));

      const shards = shamirSplit(key, totalShards, threshold);
      expect(shards).toHaveLength(totalShards);

      const shuffled = [...shards].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, threshold);

      const recovered = await shamirCombine(selected);
      expect(recovered).toBe(key);
      successCount++;
    }

    expect(successCount).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 10: PROOF-OF-LIFE ZİNCİRİ
// "Gazetecinin canlılık kanıtı zinciri"
// ═════════════════════════════════════════════════════════════

describe('Proof-of-Life Zinciri', () => {
  test('Tek blok hash oluşturma', async () => {
    const hash = await createProofOfLifeHash(
      'user-123',
      'genesis',
      '2026-03-12T10:00:00Z'
    );

    expect(hash).toBeTruthy();
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex karakter
  });

  test('Aynı girdi → aynı hash (deterministik)', async () => {
    const hash1 = await createProofOfLifeHash('user-1', 'prev-hash', '2026-01-01T00:00:00Z');
    const hash2 = await createProofOfLifeHash('user-1', 'prev-hash', '2026-01-01T00:00:00Z');
    expect(hash1).toBe(hash2);
  });

  test('Farklı girdi → farklı hash', async () => {
    const hash1 = await createProofOfLifeHash('user-1', 'prev-hash', '2026-01-01T00:00:00Z');
    const hash2 = await createProofOfLifeHash('user-2', 'prev-hash', '2026-01-01T00:00:00Z');
    const hash3 = await createProofOfLifeHash('user-1', 'different', '2026-01-01T00:00:00Z');
    const hash4 = await createProofOfLifeHash('user-1', 'prev-hash', '2026-01-02T00:00:00Z');

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).not.toBe(hash4);
  });

  test('Geçerli zincir → valid: true, breakPoint: -1', async () => {
    // Zincir oluştur
    const chain = [];
    const userId = 'journalist-42';

    // Genesis blok
    const genesisHash = await createProofOfLifeHash(userId, 'genesis', '2026-01-01T00:00:00Z');
    chain.push({
      user_id: userId,
      block_hash: genesisHash,
      prev_hash: 'genesis',
      created_at: '2026-01-01T00:00:00Z',
    });

    // 9 blok daha ekle
    for (let i = 1; i <= 9; i++) {
      const timestamp = `2026-01-0${Math.min(i + 1, 9)}T00:00:00Z`;
      const prevHash = chain[i - 1].block_hash;
      const blockHash = await createProofOfLifeHash(userId, prevHash, timestamp);

      chain.push({
        user_id: userId,
        block_hash: blockHash,
        prev_hash: prevHash,
        created_at: timestamp,
      });
    }

    const result = await verifyProofOfLifeChain(chain);
    expect(result.valid).toBe(true);
    expect(result.breakPoint).toBe(-1);
  });

  test('Bozuk zincir → kırılma noktası tespit edilmeli', async () => {
    const userId = 'journalist-99';
    const chain = [];

    // 5 blok oluştur
    const hash0 = await createProofOfLifeHash(userId, 'genesis', '2026-01-01T00:00:00Z');
    chain.push({ user_id: userId, block_hash: hash0, prev_hash: 'genesis', created_at: '2026-01-01T00:00:00Z' });

    for (let i = 1; i < 5; i++) {
      const ts = `2026-01-0${i + 1}T00:00:00Z`;
      const prevHash = chain[i - 1].block_hash;
      const bh = await createProofOfLifeHash(userId, prevHash, ts);
      chain.push({ user_id: userId, block_hash: bh, prev_hash: prevHash, created_at: ts });
    }

    // Blok 3'ün hash'ini boz (saldırgan değiştirdi)
    chain[3].block_hash = 'tampered_hash_00000000000000000000000000000000000000000000000000';

    const result = await verifyProofOfLifeChain(chain);
    expect(result.valid).toBe(false);
    // Kırılma ya 3'te ya 4'te olur (3 bozuk, 4'ün prev_hash'i tutmaz)
    expect(result.breakPoint).toBeGreaterThanOrEqual(3);
    expect(result.breakPoint).toBeLessThanOrEqual(4);
  });

  test('prev_hash zinciri kırıksa tespit edilmeli', async () => {
    const userId = 'journalist-77';
    const chain = [];

    const hash0 = await createProofOfLifeHash(userId, 'genesis', '2026-01-01T00:00:00Z');
    chain.push({ user_id: userId, block_hash: hash0, prev_hash: 'genesis', created_at: '2026-01-01T00:00:00Z' });

    const hash1 = await createProofOfLifeHash(userId, hash0, '2026-01-02T00:00:00Z');
    chain.push({ user_id: userId, block_hash: hash1, prev_hash: hash0, created_at: '2026-01-02T00:00:00Z' });

    const hash2 = await createProofOfLifeHash(userId, hash1, '2026-01-03T00:00:00Z');
    // prev_hash'i yanlış yaz (hash0 yerine farklı bir şey)
    chain.push({ user_id: userId, block_hash: hash2, prev_hash: 'wrong_prev_hash', created_at: '2026-01-03T00:00:00Z' });

    const result = await verifyProofOfLifeChain(chain);
    expect(result.valid).toBe(false);
    expect(result.breakPoint).toBe(2);
  });

  test('Tek blokluk zincir → geçerli', async () => {
    const chain = [{
      user_id: 'test',
      block_hash: await createProofOfLifeHash('test', 'genesis', '2026-01-01T00:00:00Z'),
      prev_hash: 'genesis',
      created_at: '2026-01-01T00:00:00Z',
    }];

    const result = await verifyProofOfLifeChain(chain);
    expect(result.valid).toBe(true);
    expect(result.breakPoint).toBe(-1);
  });

  test('Boş zincir → geçerli', async () => {
    const result = await verifyProofOfLifeChain([]);
    expect(result.valid).toBe(true);
    expect(result.breakPoint).toBe(-1);
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 11: ENTEGRASYON TESTİ
// "Gerçek senaryo: AES key üret → Shamir ile böl → birleştir"
// ═════════════════════════════════════════════════════════════

describe('Entegrasyon: Gerçek DMS Senaryosu', () => {
  test('AES-256 key → 10 shard → 6 birleştir → orijinal key', async () => {
    const aesKeyBase64 = randomBase64Key(32);

    const shards = shamirSplit(aesKeyBase64, 10, 6);
    expect(shards).toHaveLength(10);

    for (const shard of shards) {
      expect(validateShard(shard)).toBe(true);
    }

    const selectedIndices = [0, 2, 4, 6, 8, 9];
    const selectedShards = selectedIndices.map(i => shards[i]);

    const recoveredKey = await shamirCombine(selectedShards);
    expect(recoveredKey).toBe(aesKeyBase64);
  });

  test('Base64 key byte-perfect round-trip (padding dahil)', async () => {
    const keys = [
      Buffer.from(new Uint8Array(31)).toString('base64'),
      Buffer.from(new Uint8Array(32)).toString('base64'),
      Buffer.from(new Uint8Array(33)).toString('base64'),
    ];

    for (const key of keys) {
      const shards = shamirSplit(key, 4, 3);
      const recovered = await shamirCombine(shards.slice(0, 3));
      expect(recovered).toBe(key);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// BÖLÜM 12: S2 FIX — HASH DOĞRULAMA TESTLERİ
// "shamirSplitWithHash + shamirCombine bütünlük doğrulama"
// ═════════════════════════════════════════════════════════════

describe('Shamir S2 Fix: Hash Doğrulama', () => {
  test('shamirSplitWithHash contentHash ekler', async () => {
    const key = randomBase64Key(32);
    const shards = await shamirSplitWithHash(key, 5, 3);

    for (const shard of shards) {
      expect(shard.contentHash).toBeDefined();
      expect(shard.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }

    // Tüm shard'ların contentHash'i aynı olmalı
    const hashes = new Set(shards.map(s => s.contentHash));
    expect(hashes.size).toBe(1);
  });

  test('Hash ile split → doğru combine → başarılı', async () => {
    const key = randomBase64Key(32);
    const shards = await shamirSplitWithHash(key, 5, 3);

    const recovered = await shamirCombine(shards.slice(0, 3));
    expect(recovered).toBe(key);
  });

  test('Hash ile split → yanlış shard → ShardIntegrityError', async () => {
    const key = randomBase64Key(32);
    const shards = await shamirSplitWithHash(key, 5, 3);

    // Shard data boz
    const corrupted: ShamirShard = {
      ...shards[0],
      data: shards[0].data.substring(0, 2) +
            (shards[0].data[2] === 'f' ? '0' : 'f') +
            shards[0].data.substring(3),
    };

    await expect(
      shamirCombine([corrupted, shards[1], shards[2]])
    ).rejects.toThrow(ShardIntegrityError);
  });

  test('Hash ile split → yetersiz parça → ShardIntegrityError', async () => {
    const key = randomBase64Key(32);
    const shards = await shamirSplitWithHash(key, 5, 3);

    // 2 shard (threshold=3) → yanlış sonuç → hash uyuşmaz
    await expect(
      shamirCombine(shards.slice(0, 2))
    ).rejects.toThrow(ShardIntegrityError);
  });

  test('Hash ile split → farklı secret shardları karışık → ShardIntegrityError', async () => {
    const key1 = randomBase64Key(32);
    const key2 = randomBase64Key(32);
    const shards1 = await shamirSplitWithHash(key1, 5, 3);
    const shards2 = await shamirSplitWithHash(key2, 5, 3);

    await expect(
      shamirCombine([shards1[0], shards1[1], shards2[2]])
    ).rejects.toThrow(ShardIntegrityError);
  });

  test('hashSecret() deterministik', async () => {
    const key = randomBase64Key(32);
    const hash1 = await hashSecret(key);
    const hash2 = await hashSecret(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  test('hashSecret() farklı secret → farklı hash', async () => {
    const hash1 = await hashSecret(randomBase64Key(32));
    const hash2 = await hashSecret(randomBase64Key(32));
    expect(hash1).not.toBe(hash2);
  });

  test('Hash olmadan split → combine doğrulama atlanır', async () => {
    const key = randomBase64Key(32);
    const shards = shamirSplit(key, 5, 3); // hash YOK

    // contentHash olmadığı için doğrulama yapılmaz
    expect(shards[0].contentHash).toBeUndefined();

    const recovered = await shamirCombine(shards.slice(0, 3));
    expect(recovered).toBe(key);
  });

  test('10 round-trip shamirSplitWithHash', async () => {
    for (let i = 0; i < 10; i++) {
      const key = randomBase64Key(32);
      const n = (i % 5) + 3; // 3-7
      const m = Math.max(2, Math.floor(n / 2) + 1);

      const shards = await shamirSplitWithHash(key, n, m);
      const selected = [...shards].sort(() => Math.random() - 0.5).slice(0, m);

      const recovered = await shamirCombine(selected);
      expect(recovered).toBe(key);
    }
  });
});
