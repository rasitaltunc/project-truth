// ═══════════════════════════════════════════════════════
// SPRINT 13: KOLEKTİF KALKAN PROTOKOLÜ — API Routes
// ═══════════════════════════════════════════════════════
// POST actions: create, checkin, approve_guarantor, vote, pause, resume, cancel
// GET: kullanıcının kolektif DMS'leri + tuttuğu shard'lar
//
// SECURITY SPRINT S1+S2: Rate limiting + fingerprint validation + audit
//
// ⚠️ SECURITY TODO B6: Guarantor Identity Verification
// Şu an kefalet sistemi fingerprint tabanlı. Bir saldırgan birden fazla fingerprint
// oluşturup sahte kefaletler verebilir. Gelecek iyileştirme:
//   1. Email doğrulama (approve_guarantor sırasında email OTP)
//   2. Idena Proof of Personhood entegrasyonu (Sprint 13B+ ile)
//   3. Doğrulanmış kuruluş (RSF/CPJ) sertifikası ile kefalet
// Öncelik: Yüksek (release öncesi en az email doğrulama ekle)
//
// ⚠️ SECURITY TODO B7: Sybil Attack Resistance on Voting
// Alarm oylaması fingerprint bazlı — aynı kişi birden fazla oy kullanabilir.
// Kısa vadeli: Aynı IP'den gelen oyları sınırla (hali hazırda rate limit var)
// Orta vadeli: Email-verified oy gereksinimi
// Uzun vadeli: Idena/BrightID gibi proof-of-personhood (Sprint 13B+)
// Öncelik: Orta (mevcut tier+kefalet bariyeri kısmen koruyucu)
//
// ═══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientId, EVIDENCE_RATE_LIMIT, DMS_CRITICAL_RATE_LIMIT } from '@/lib/rateLimit';
import { quickValidateFingerprint } from '@/lib/serverFingerprint';
import { logAuditActionFromRequest } from '@/lib/auditLog';
import { createProofOfLifeHash } from '@/lib/shamir';
import { validateSession } from '@/lib/sessionValidator';
import { safeErrorResponse, checkBodySize } from '@/lib/errorHandler';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY B1: Server-side Shard Encryption for Storage
// ═══════════════════════════════════════════════════════════════════════════
// Encrypts individual Shamir shards before storing in Supabase to prevent
// database-level exposure. Uses AES-256-GCM with server-side key derivation.
//
// ⚠️ SECURITY TODO CD2: HKDF Key Derivation
// Şu an HMAC-SHA256 çıktısı doğrudan AES key olarak kullanılıyor.
// Endüstri standardı: crypto.subtle.deriveKey() ile HKDF kullanılmalı.
// HMAC çıktısı 256-bit pseudorandom data olduğundan mevcut durum kırık değil,
// ama HKDF salt+info parametreleri ile daha güçlü key isolation sağlanır.
// Öncelik: Düşük (mevcut HMAC-SHA256 yeterli, HKDF iyileştirme)
//

/**
 * Derive a server-side encryption key from environment variables
 * Uses HMAC-SHA256 to generate a consistent key from SHARD_ENCRYPTION_KEY or SESSION_SECRET
 */
async function deriveShardEncryptionKey(): Promise<CryptoKey> {
  // SECURITY CD1: Hardcoded 'fallback_key' KALDIRILDI.
  // Shard şifreleme anahtarı ENV VAR'dan gelmek ZORUNDA.
  // Gazetecilerin belge parçaları bu anahtarla şifreleniyor — zayıf anahtar kabul edilemez.
  const baseKey = process.env.SHARD_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!baseKey) {
    throw new Error(
      'CRITICAL: SHARD_ENCRYPTION_KEY veya SESSION_SECRET environment variable set edilmemiş. ' +
      'Shard şifreleme anahtarı olmadan kolektif kalkan çalıştırılamaz.'
    );
  }
  if (baseKey.length < 32) {
    throw new Error(
      'CRITICAL: SHARD_ENCRYPTION_KEY çok kısa (min 32 karakter). ' +
      'Güçlü bir anahtar kullanın: openssl rand -hex 32'
    );
  }

  // Import the base key as HMAC key
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(baseKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Derive key: HMAC-SHA256(baseKey, 'shard_encryption_v1')
  const derivedKey = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    new TextEncoder().encode('shard_encryption_v1')
  );

  // Import the derived key as AES-256-GCM key
  return await crypto.subtle.importKey(
    'raw',
    derivedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt shard data (hex string) before storing in database
 * @param shardData Hex-encoded shard data (from Shamir split)
 * @returns Base64-encoded encrypted data with IV prepended (IV:ciphertext format)
 */
async function encryptShardForStorage(shardData: string): Promise<string> {
  const key = await deriveShardEncryptionKey();

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Convert shard hex to bytes
  const shardBuffer = new TextEncoder().encode(shardData);

  // Encrypt with AES-256-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    shardBuffer
  );

  // Combine IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt shard data from storage
 * @param encryptedData Base64-encoded data with IV prepended
 * @returns Hex-encoded shard data
 */
async function decryptShardFromStorage(encryptedData: string): Promise<string> {
  const key = await deriveShardEncryptionKey();

  // Decode base64
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract IV (first 12 bytes)
  const iv = new Uint8Array(combined.slice(0, 12));
  const ciphertext = new Uint8Array(combined.slice(12));

  // Decrypt with AES-256-GCM
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  // Convert back to hex string
  return new TextDecoder().decode(decrypted);
}

// EXPORTS: These functions are exported for use in other API routes
// (e.g., collective-dms/cron for red alarm reconstruction, voice API for Shamir combine)
// Usage: import { decryptShardFromStorage } from '@/app/api/collective-dms/route'
export { decryptShardFromStorage, deriveShardEncryptionKey };

// ─── GET: Kullanıcının kolektif DMS verileri ────────────
// SECURITY A1+B5: Session validation (cookie ↔ header fingerprint match)
export async function GET(req: NextRequest) {
  try {
    // SECURITY B5: Validate session
    const session = await validateSession(req);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }
    const fingerprint = session.fingerprint;
    if (!fingerprint) {
      return NextResponse.json({ error: 'Geçerli fingerprint gerekli' }, { status: 400 });
    }

    // Paralel sorgular
    const [ownDmsRes, heldShardsRes, chainLengthRes] = await Promise.all([
      // Kendi DMS'leri
      supabase
        .from('collective_dms')
        .select('id, name, description, status, total_shards, threshold, checkin_interval_hours, last_checkin, approved_guarantors, required_guarantors, country_code, risk_score, created_at, updated_at, triggered_at, silent_alarm_at, yellow_alarm_at, red_alarm_at')
        .eq('owner_fingerprint', fingerprint)
        .order('created_at', { ascending: false }),

      // Tuttuğu shard'lar (başkalarının DMS'leri)
      supabase.rpc('get_user_held_shards', { p_fingerprint: fingerprint }),

      // Canlılık zinciri uzunluğu
      supabase.rpc('get_chain_length', { p_fingerprint: fingerprint }),
    ]);

    // Aktif alarmları getir (kullanıcının DMS'lerine ait)
    const dmsIds = (ownDmsRes.data || []).map((d: any) => d.id);
    let alerts: any[] = [];
    if (dmsIds.length > 0) {
      // SECURITY A2: Explicit select — excludes triggerer_fingerprint and other sensitive fields
      const alertsRes = await supabase
        .from('collective_alerts')
        .select('id, collective_dms_id, alert_level, status, triggered_at, escalated_at, resolved_at, created_at')
        .in('collective_dms_id', dmsIds)
        .in('alert_level', ['silent', 'yellow', 'red'])
        .order('created_at', { ascending: false });
      alerts = alertsRes.data || [];
    }

    return NextResponse.json({
      own_dms: ownDmsRes.data || [],
      held_shards: heldShardsRes.data || [],
      chain_length: chainLengthRes.data || 0,
      active_alerts: alerts,
    });
  } catch (err: any) {
    // Tablo yoksa boş dön (graceful degradation)
    if (err?.code === '42P01') {
      return NextResponse.json({ own_dms: [], held_shards: [], chain_length: 0, active_alerts: [] });
    }
    return safeErrorResponse('GET /api/collective-dms', err);
  }
}

// ─── POST: Aksiyonlar ───────────────────────────────────
// SECURITY B5: Session validation + B8: per-fingerprint rate limiting
export async function POST(req: NextRequest) {
  try {
    // SECURITY B5: Validate session first
    const session = await validateSession(req);
    if (!session.valid) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting — IP-based (general)
    const clientId = getClientId(req);
    const rateCheck = checkRateLimit(clientId, EVIDENCE_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Rate limit aşıldı. Lütfen bekleyin.' }, { status: 429 });
    }

    // Request body size check — 2MB default for JSON
    const tooBig = checkBodySize(req);
    if (tooBig) return tooBig;

    const body = await req.json();
    const { action } = body;
    // SECURITY B5: Use session fingerprint, not body fingerprint (prevents impersonation)
    const fingerprint = session.fingerprint!;

    if (!action) {
      return NextResponse.json({ error: 'action gerekli' }, { status: 400 });
    }

    // SECURITY B8: Per-fingerprint rate limit for critical actions
    const CRITICAL_ACTIONS = ['create', 'vote', 'approve_guarantor'];
    if (CRITICAL_ACTIONS.includes(action)) {
      const fpRateCheck = checkRateLimit(`fp:cdms:${fingerprint}`, DMS_CRITICAL_RATE_LIMIT);
      if (!fpRateCheck.allowed) {
        return NextResponse.json(
          { error: 'Bu işlem için çok sık istekte bulunuyorsunuz.' },
          { status: 429 }
        );
      }
    }

    switch (action) {
      // ═══ CREATE: Yeni kolektif DMS oluştur ═══
      case 'create': {
        const {
          encrypted_content,
          content_hash,
          name,
          description,
          display_name,
          total_shards = 10,
          threshold = 6,
          checkin_interval_hours = 168,
          country_code,
          risk_score,
          network_id,
          guarantor_fingerprints, // string[] — kefil fingerprint'leri
          shard_distribution,      // Array<{ fingerprint, display_name, shard_x, shard_data, is_guarantor }>
        } = body;

        if (!encrypted_content || !content_hash) {
          return NextResponse.json({ error: 'encrypted_content ve content_hash gerekli' }, { status: 400 });
        }

        // SECURITY B-N1: Validate shard parameters
        if (total_shards < 3 || total_shards > 50) {
          return NextResponse.json({ error: 'total_shards 3-50 arasında olmalı' }, { status: 400 });
        }
        if (threshold < 2 || threshold > total_shards) {
          return NextResponse.json({ error: 'threshold 2 ile total_shards arasında olmalı' }, { status: 400 });
        }
        if (!shard_distribution || shard_distribution.length < total_shards) {
          return NextResponse.json({ error: `${total_shards} shard dağıtımı gerekli` }, { status: 400 });
        }
        if (shard_distribution.length > 50) {
          return NextResponse.json({ error: 'Maksimum 50 shard dağıtılabilir' }, { status: 400 });
        }
        if (!guarantor_fingerprints || guarantor_fingerprints.length < 3) {
          return NextResponse.json({ error: 'En az 3 kefil gerekli' }, { status: 400 });
        }

        // SECURITY B-N1: Validate individual shards
        const seenX = new Set<number>();
        for (const s of shard_distribution) {
          if (!s.shard_x || s.shard_x < 1 || s.shard_x > 255) {
            return NextResponse.json({ error: `Geçersiz shard_x değeri: ${s.shard_x}` }, { status: 400 });
          }
          if (seenX.has(s.shard_x)) {
            return NextResponse.json({ error: `Tekrar eden shard_x değeri: ${s.shard_x}` }, { status: 400 });
          }
          seenX.add(s.shard_x);
          if (!s.shard_data || typeof s.shard_data !== 'string' || s.shard_data.length > 1024) {
            return NextResponse.json({ error: 'Shard verisi geçersiz veya çok büyük (max 1024 hex karakter)' }, { status: 400 });
          }
          if (!/^[0-9a-fA-F]+$/.test(s.shard_data)) {
            return NextResponse.json({ error: 'Shard verisi geçerli hex formatında olmalı' }, { status: 400 });
          }
          if (!s.fingerprint || !quickValidateFingerprint(s.fingerprint)) {
            return NextResponse.json({ error: 'Her shard için geçerli fingerprint gerekli' }, { status: 400 });
          }
        }

        // DMS oluştur
        const { data: dms, error: dmsError } = await supabase
          .from('collective_dms')
          .insert({
            owner_fingerprint: fingerprint,
            owner_display_name: display_name,
            encrypted_content,
            content_hash,
            name: name || 'Kolektif Kalkan',
            description,
            total_shards,
            threshold,
            checkin_interval_hours,
            country_code,
            risk_score: risk_score ?? 50,
            network_id,
            required_guarantors: guarantor_fingerprints.length,
            status: 'pending_guarantors',
          })
          .select()
          .single();

        if (dmsError) throw dmsError;

        // Shard'ları dağıt (SECURITY B1: encrypt shard_data before storage)
        const shardInserts = await Promise.all(
          shard_distribution.map(async (s: any) => ({
            collective_dms_id: dms.id,
            holder_fingerprint: s.fingerprint,
            holder_display_name: s.display_name,
            shard_x: s.shard_x,
            shard_data: await encryptShardForStorage(s.shard_data), // Encrypt before storage
            is_guarantor: guarantor_fingerprints.includes(s.fingerprint),
            status: 'distributed',
          }))
        );

        const { error: shardError } = await supabase
          .from('collective_dms_shards')
          .insert(shardInserts);

        if (shardError) throw shardError;

        // Genesis bloğu oluştur (canlılık zinciri başlangıcı)
        const { error: polError } = await supabase
          .from('proof_of_life_chain')
          .insert({
            user_fingerprint: fingerprint,
            collective_dms_id: dms.id,
            block_index: 0,
            block_hash: content_hash, // İlk blok = içerik hash'i
            prev_hash: 'genesis',
            checkin_method: 'manual',
          });

        if (polError) throw polError;

        // Audit log
        logAuditActionFromRequest(req, {
          fingerprint,
          action: 'collective_dms_create',
          resource: 'collective_dms',
          resourceId: dms.id,
          result: 'success',
          metadata: { total_shards, threshold, guarantor_count: guarantor_fingerprints.length },
        });

        return NextResponse.json({
          success: true,
          dms_id: dms.id,
          status: 'pending_guarantors',
          required_guarantors: guarantor_fingerprints.length,
          message: `Kolektif Kalkan oluşturuldu. ${guarantor_fingerprints.length} kefilin onayı bekleniyor.`,
        });
      }

      // ═══ CHECK-IN: Canlılık kanıtı ═══
      case 'checkin': {
        const { dms_id, block_hash, prev_hash } = body;

        if (!dms_id) {
          return NextResponse.json({ error: 'dms_id gerekli' }, { status: 400 });
        }

        // SECURITY B-N2: Verify DMS exists, belongs to user, and is in valid status for check-in
        const { data: dmsRecord, error: dmsLookupError } = await supabase
          .from('collective_dms')
          .select('id, status, owner_fingerprint')
          .eq('id', dms_id)
          .eq('owner_fingerprint', fingerprint)
          .single();

        if (dmsLookupError || !dmsRecord) {
          return NextResponse.json({ error: 'DMS bulunamadı veya erişim yetkiniz yok' }, { status: 404 });
        }

        const CHECKIN_ALLOWED_STATUSES = ['active', 'silent_alarm', 'yellow_alarm'];
        if (!CHECKIN_ALLOWED_STATUSES.includes(dmsRecord.status)) {
          return NextResponse.json(
            { error: `Bu DMS durumunda check-in yapılamaz: ${dmsRecord.status}` },
            { status: 400 }
          );
        }

        // SECURITY CD7: Proof-of-Life zinciri TAMAMEN server-side yönetilir.
        // Client block_hash ve prev_hash GÖNDERMİYOR — server:
        // 1. Son bloğu DB'den çeker
        // 2. prev_hash olarak son bloğun hash'ini kullanır
        // 3. Yeni block_hash'i SHA-256 ile hesaplar
        // 4. Zincir bütünlüğü %100 server-controlled
        {
          // Son bloğu al
          const { data: lastBlock } = await supabase
            .from('proof_of_life_chain')
            .select('block_index, block_hash')
            .eq('user_fingerprint', fingerprint)
            .eq('collective_dms_id', dms_id)
            .order('block_index', { ascending: false })
            .limit(1);

          const actualLastHash = lastBlock && lastBlock.length > 0
            ? lastBlock[0].block_hash
            : 'genesis';
          const nextIndex = lastBlock && lastBlock.length > 0
            ? lastBlock[0].block_index + 1
            : 1;

          // Server-side hash hesapla
          const now = new Date().toISOString();
          const serverBlockHash = await createProofOfLifeHash(fingerprint, actualLastHash, now);

          // Zincire ekle
          const { error: chainError } = await supabase.from('proof_of_life_chain').insert({
            user_fingerprint: fingerprint,
            collective_dms_id: dms_id,
            block_index: nextIndex,
            block_hash: serverBlockHash,
            prev_hash: actualLastHash,
            checkin_method: 'manual',
          });

          if (chainError) {
            console.error('PoL chain insert error:', chainError.code);
            // Chain hatası check-in'i engellemez ama loglanır
          }
        }

        // DMS'i güncelle
        const { error: updateError } = await supabase
          .from('collective_dms')
          .update({ last_checkin: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', dms_id)
          .eq('owner_fingerprint', fingerprint);

        if (updateError) throw updateError;

        // Eğer alarm aktifse → çöz
        const { data: activeAlerts } = await supabase
          .from('collective_alerts')
          .select('id')
          .eq('collective_dms_id', dms_id)
          .in('alert_level', ['silent', 'yellow'])
          .limit(1);

        if (activeAlerts && activeAlerts.length > 0) {
          await supabase
            .from('collective_alerts')
            .update({
              alert_level: 'resolved',
              resolved_at: new Date().toISOString(),
              resolution: 'owner_checkin',
            })
            .eq('id', activeAlerts[0].id);

          // DMS'i aktife döndür
          await supabase
            .from('collective_dms')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', dms_id);
        }

        // Audit log
        logAuditActionFromRequest(req, {
          fingerprint,
          action: 'collective_dms_checkin',
          resource: 'collective_dms',
          resourceId: dms_id,
          result: 'success',
        });

        return NextResponse.json({ success: true, message: 'Check-in başarılı. Zincir güncellendi.' });
      }

      // ═══ APPROVE_GUARANTOR: Kefil onayı ═══
      case 'approve_guarantor': {
        const { dms_id } = body;
        if (!dms_id) {
          return NextResponse.json({ error: 'dms_id gerekli' }, { status: 400 });
        }

        const { data, error } = await supabase.rpc('approve_guarantor', {
          p_dms_id: dms_id,
          p_fingerprint: fingerprint,
        });

        if (error) throw error;

        // Audit log
        logAuditActionFromRequest(req, {
          fingerprint,
          action: 'collective_dms_approve',
          resource: 'collective_dms',
          resourceId: dms_id,
          result: 'success',
        });

        return NextResponse.json(data);
      }

      // ═══ VOTE: Alarm oyu ═══
      case 'vote': {
        const { alert_id, vote } = body;
        if (!alert_id || !vote) {
          return NextResponse.json({ error: 'alert_id ve vote gerekli' }, { status: 400 });
        }
        if (!['unreachable', 'safe'].includes(vote)) {
          return NextResponse.json({ error: 'vote: unreachable veya safe olmalı' }, { status: 400 });
        }

        const { data, error } = await supabase.rpc('vote_on_alert', {
          p_alert_id: alert_id,
          p_fingerprint: fingerprint,
          p_vote: vote,
        });

        if (error) throw error;

        // Audit log
        logAuditActionFromRequest(req, {
          fingerprint,
          action: 'collective_dms_vote',
          resource: 'collective_alerts',
          resourceId: alert_id,
          result: 'success',
          metadata: { vote },
        });

        return NextResponse.json(data);
      }

      // ═══ PAUSE / RESUME / CANCEL ═══
      case 'pause':
      case 'resume':
      case 'cancel': {
        const { dms_id } = body;
        if (!dms_id) {
          return NextResponse.json({ error: 'dms_id gerekli' }, { status: 400 });
        }

        const statusMap: Record<string, string> = {
          pause: 'paused',
          resume: 'active',
          cancel: 'cancelled',
        };
        const newStatus = statusMap[action];
        const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
        if (action === 'resume') updates.last_checkin = new Date().toISOString();

        const { error } = await supabase
          .from('collective_dms')
          .update(updates)
          .eq('id', dms_id)
          .eq('owner_fingerprint', fingerprint);

        if (error) throw error;
        return NextResponse.json({ success: true, status: newStatus });
      }

      // ═══ VERIFY_CONTENT: Kefil belge doğrulaması ═══
      case 'verify_content': {
        const { dms_id } = body;
        if (!dms_id) {
          return NextResponse.json({ error: 'dms_id gerekli' }, { status: 400 });
        }

        const { error } = await supabase
          .from('collective_dms_shards')
          .update({ has_verified_content: true })
          .eq('collective_dms_id', dms_id)
          .eq('holder_fingerprint', fingerprint)
          .eq('is_guarantor', true);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Belge doğrulaması kaydedildi.' });
      }

      default:
        return NextResponse.json({ error: `Bilinmeyen action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    if (err?.code === '42P01') {
      return NextResponse.json({ error: 'Tablo henüz oluşturulmadı. Migration çalıştırın.' }, { status: 503 });
    }
    return safeErrorResponse('POST /api/collective-dms', err);
  }
}
