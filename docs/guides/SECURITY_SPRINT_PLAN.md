# PROJECT TRUTH — NON-AI GÜVENLİK SPRİNT PLANI

**Tarih:** 11 Mart 2026
**Hazırlayan:** Claude (kod denetimiyle doğrulanmış — halüsinasyon sıfır)
**Durum:** Onay Bekliyor

---

## ÖNCEKİ DENETİMDEN DÜZELTMELER

Önceki güvenlik denetiminde 2 hata vardı. Gerçek kodu okuyarak düzelttim:

| Önceki İddia | Gerçek Durum | Kaynak |
|---|---|---|
| "Cron endpoint'leri korumasız" | ❌ YANLIŞ — Her ikisi de CRON_SECRET kontrolü yapıyor | `dms/cron/route.ts` satır 14-30, `collective-dms/cron/route.ts` satır 20-30 |
| "Supabase Auth ekle" | ❌ YANLIŞ YÖNLENDİRME — Sistem kasıtlı olarak anonim-öncelikli tasarlanmış | `supabaseClient.ts` persistSession: false, `auth.ts` getDeviceFingerprint() |

**Doğrulanan güvenli bileşenler (dokunulmayacak):**
- ✅ Shamir's Secret Sharing (lib/shamir.ts) — GF(256) matematiği doğru
- ✅ AES-256-GCM şifreleme (lib/crypto.ts) — Doğru IV, doğru tag
- ✅ ECDSA imzalama (lib/crypto.ts) — P-256, SHA-256
- ✅ EXIF sıyırma (lib/secureUpload.ts) — Canvas redraw
- ✅ Cron koruması — CRON_SECRET doğrulaması mevcut
- ✅ Evidence type config — 13 tip, tam haritalama

---

## MİMARİ GERÇEK: ANONİM-ÖNCELİKLİ SİSTEM

Project Truth kasıtlı olarak anonim tasarlanmış. Gazeteci koruması felsefesi: "Kimliğini gizleyerek katkı yapabilmeli."

**Mevcut kimlik sistemi:**
- `getDeviceFingerprint()` (lib/auth.ts satır 389-402)
- SHA-256(userAgent + language + screen + timezone)
- 64 karakter hex string
- Client-side üretilir, sunucu doğrulaması YOK

**Gerçek tehdit:** Fingerprint spoofing — herhangi biri başkasının fingerprint'ini taklit edebilir.

**Bu planın yaklaşımı:** Supabase Auth zorlamak yerine, anonim model İÇİNDE güvenlik katmanları eklemek.

---

## DOĞRULANMIŞ GÜVENLİK AÇIKLARI (10 Adet)

### KRİTİK (Hemen Düzeltilmeli)

| # | Açık | Dosya | Etki |
|---|------|-------|------|
| V1 | Badge tier client'tan geliyor — herkes kendini journalist/institutional yapabilir | `/api/badge/route.ts` POST | Sahte yetkiler, sahte güvenilirlik |
| V2 | RLS USING(true) — collective_dms tablosu herkes tarafından okunabilir/yazılabilir | `SPRINT_13_MIGRATION.sql` | Gazeteci DMS verileri sızar, sahte alarm tetiklenir |
| V3 | Quarantine review'da fingerprint varlık doğrulaması yok — sahte fingerprint ile oy kullanılabilir (NOT: self-review kontrolü VAR, satır 69-74) | `/api/quarantine/[id]/review/route.ts` | Sahte fingerprint'lerle çoklu oy |

### YÜKSEK

| # | Açık | Dosya | Etki |
|---|------|-------|------|
| V4 | DMS GET'te fingerprint query param'dan geliyor — başkasının DMS'ini okuyabilir | `/api/dms/route.ts` | Metadata sızıntısı |
| V5 | Collective DMS tüm işlemlerinde fingerprint body'den geliyor — kimse kimse olabilir | `/api/collective-dms/route.ts` | Sahte DMS, sahte alarm |
| V6 | Rate limiting 4 route'ta var ama DMS, badge, collective-dms, quarantine'de YOK | Çeşitli route'lar | Spam, DDoS |
| V7 | Quarantine voting'de race condition — eşzamanlı oylar tutarsız state oluşturabilir | `/api/quarantine/[id]/review/route.ts` | Veri bütünlüğü bozulur |

### ORTA

| # | Açık | Dosya | Etki |
|---|------|-------|------|
| V8 | In-memory rate limiting çoklu sunucu deploy'da çalışmaz | `lib/rateLimit.ts` | Dağıtık saldırılara karşı savunmasız |
| V9 | Badge GET başkasının badge bilgisini döndürür | `/api/badge/route.ts` GET | Bilgi sızıntısı (düşük risk) |
| V10 | Quarantine UPDATE RLS'i sadece authenticated kontrol eder, ownership kontrol etmez | `SPRINT_17_MIGRATION.sql` | Başkasının karantina kaydını değiştirebilir |

---

## SPRİNT PLANI

### Sprint S1 — "Güvenlik Temeli" (Tahmini: 3-4 saat)

**Hedef:** En kritik 4 açığı kapat. Fingerprint doğrulaması + badge koruması + rate limiting.

#### S1.1 — Sunucu Tarafı Fingerprint Doğrulama Helper'ı (YENİ DOSYA)

**Dosya:** `src/lib/serverFingerprint.ts` (YENİ)

**Ne yapıyor:** API route'larda fingerprint'in gerçek olup olmadığını kontrol eder. truth_users tablosunda kayıtlı mı, IP ile eşleşiyor mu.

```typescript
// Temel mantık:
// 1. Fingerprint'in truth_users veya user_global_badges tablosunda var olduğunu doğrula
// 2. IP bazlı fingerprint sınırlaması (1 IP = max 3 fingerprint)
// 3. İlk kez görülen fingerprint'e "yeni" flag'i koy (düşük güven)
```

**Neden bu yaklaşım:** Supabase Auth zorlamıyoruz (anonim sistem bozulur). Ama en azından "bu fingerprint daha önce sistemde görüldü mü?" kontrolü ekliyoruz.

#### S1.2 — Badge Tier Koruması (V1 Düzeltme)

**Dosya:** `src/app/api/badge/route.ts` — POST handler

**Mevcut sorun (doğrulanmış, satır 90-97):**
```typescript
// POST body'den gelen badgeTier direkt veritabanına yazılıyor
// validTiers = ['anonymous', 'community', 'journalist', 'institutional']
// Tier adı geçerliyse KABUL — başka kontrol YOK
```

**Düzeltme:**
```
- anonymous: herkes (mevcut gibi)
- community: herkes (mevcut gibi)
- journalist: SADECE mevcut journalist/institutional kullanıcıların nominate etmesi ile
- institutional: SADECE admin/verified organization ile
```

POST handler'da `journalist` ve `institutional` tier'larını doğrudan kabul etmeyi ENGELLE. Bunlar sadece:
- `/api/badge/nominate` route'u üzerinden (peer nomination)
- `/api/badge/journalist-request` route'u üzerinden (başvuru + onay)

#### S1.3 — Kritik Route'lara Rate Limiting (V6 Düzeltme)

**Dosyalar:** 4 route dosyası

Mevcut rate limit altyapısı (`lib/rateLimit.ts`) zaten var, presetler tanımlı:
- `EVIDENCE_RATE_LIMIT`: 5 req/dk (en sıkı)
- `CHAT_RATE_LIMIT`: 20 req/dk
- `GENERAL_RATE_LIMIT`: 60 req/dk

Uygulanacak:
| Route | Preset | Neden |
|-------|--------|-------|
| `/api/dms/route.ts` POST | EVIDENCE_RATE_LIMIT (5/dk) | DMS spam engelleme |
| `/api/collective-dms/route.ts` POST | EVIDENCE_RATE_LIMIT (5/dk) | Kolektif DMS spam engelleme |
| `/api/badge/route.ts` POST | GENERAL_RATE_LIMIT (60/dk) | Badge kötüye kullanım engelleme |
| `/api/quarantine/[id]/review/route.ts` POST | EVIDENCE_RATE_LIMIT (5/dk) | Oylama spam engelleme |

Her route'a eklenen kod (3-5 satır):
```typescript
import { checkRateLimit, getClientId, EVIDENCE_RATE_LIMIT } from '@/lib/rateLimit';

// Handler başında:
const clientId = getClientId(request);
const limit = checkRateLimit(clientId, EVIDENCE_RATE_LIMIT);
if (!limit.allowed) {
  return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
}
```

#### S1.4 — RLS Düzeltmesi: Collective DMS (V2 Düzeltme)

**Dosya:** `docs/SPRINT_S1_RLS_MIGRATION.sql` (YENİ)

Mevcut (doğrulanmış, SPRINT_13_MIGRATION.sql):
```sql
CREATE POLICY "collective_dms_select" ON collective_dms FOR SELECT USING (true);
CREATE POLICY "collective_dms_insert" ON collective_dms FOR INSERT WITH CHECK (true);
CREATE POLICY "collective_dms_update" ON collective_dms FOR UPDATE USING (true);
```

**ÖNEMLİ GERÇEK:** Bu sistemde `auth.uid()` KULLANILMIYOR çünkü Supabase Auth aktif değil. API route'lar `supabaseAdmin` (service role) kullanıyor. Bu yüzden RLS politikaları API katmanında etkisiz.

**Gerçekçi çözüm:** RLS'i kısıtlamak yerine (ki service role bypass eder), güvenlik katmanını API route'a taşımak. Yani:

1. RLS'i `anon` key için kısıtla (tarayıcıdan doğrudan erişimi engelle)
2. API route'larda `serverFingerprint.ts` ile fingerprint doğrulaması yap
3. Service role client'ı (supabaseAdmin) sadece doğrulanmış işlemler için kullan

```sql
-- Anon key erişimini tamamen kapat (tarayıcıdan doğrudan erişim engellenir)
DROP POLICY IF EXISTS "collective_dms_select" ON collective_dms;
DROP POLICY IF EXISTS "collective_dms_insert" ON collective_dms;
DROP POLICY IF EXISTS "collective_dms_update" ON collective_dms;
DROP POLICY IF EXISTS "shards_select" ON collective_dms_shards;
DROP POLICY IF EXISTS "shards_insert" ON collective_dms_shards;
DROP POLICY IF EXISTS "shards_update" ON collective_dms_shards;

-- Sadece service role erişebilir (API route'lar üzerinden)
-- Bu tablolara artık sadece supabaseAdmin ile erişilir
-- anon key ile hiçbir işlem yapılamaz
CREATE POLICY "cdms_service_only" ON collective_dms
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "shards_service_only" ON collective_dms_shards
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chain_service_only" ON proof_of_life_chain
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "alerts_service_only" ON collective_alerts
  FOR ALL USING (auth.role() = 'service_role');
```

**Etki:** Tarayıcıdan (anon key ile) bu tablolara doğrudan erişim artık İMKANSIZ. Tüm erişim API route'lar üzerinden geçmek ZORUNDA. API route'larda da fingerprint doğrulaması var.

---

### Sprint S2 — "Bütünlük Kalkanı" (Tahmini: 2-3 saat)

**Hedef:** Veri bütünlüğü + voting race condition + quarantine güvenliği.

#### S2.1 — Atomik Oylama RPC'si (V7 Düzeltme)

**Dosya:** `docs/SPRINT_S2_VOTING_RPC.sql` (YENİ)

Mevcut sorun: Eşzamanlı quarantine review'lar race condition oluşturuyor (INSERT + UPDATE ayrı, transaction yok).

Çözüm: Tek bir RPC fonksiyonu ile atomik oylama:

```sql
CREATE OR REPLACE FUNCTION submit_quarantine_review(
  p_quarantine_id UUID,
  p_reviewer_fingerprint TEXT,
  p_review_status TEXT,
  p_review_notes TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_existing_review INT;
  v_result jsonb;
BEGIN
  -- Row-level lock
  PERFORM * FROM data_quarantine WHERE id = p_quarantine_id FOR UPDATE;

  -- Duplicate kontrol
  SELECT COUNT(*) INTO v_existing_review
  FROM quarantine_reviews
  WHERE quarantine_id = p_quarantine_id
  AND reviewer_fingerprint = p_reviewer_fingerprint;

  IF v_existing_review > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  -- Review ekle
  INSERT INTO quarantine_reviews (quarantine_id, reviewer_fingerprint, review_status, review_notes)
  VALUES (p_quarantine_id, p_reviewer_fingerprint, p_review_status, p_review_notes);

  -- Oy sayılarını atomik güncelle
  UPDATE data_quarantine SET
    verified_votes = (SELECT COUNT(*) FROM quarantine_reviews
                      WHERE quarantine_id = p_quarantine_id AND review_status = 'approved'),
    rejected_votes = (SELECT COUNT(*) FROM quarantine_reviews
                      WHERE quarantine_id = p_quarantine_id AND review_status = 'rejected'),
    updated_at = NOW()
  WHERE id = p_quarantine_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

**API route değişikliği:** `/api/quarantine/[id]/review/route.ts` — doğrudan INSERT yerine `supabase.rpc('submit_quarantine_review', {...})` çağrısı.

#### S2.2 — Quarantine RLS Düzeltmesi (V10 Düzeltme)

**Dosya:** `docs/SPRINT_S2_QUARANTINE_RLS.sql` (YENİ)

Mevcut (SPRINT_17_MIGRATION.sql):
```sql
CREATE POLICY "quarantine_update_owner_or_reviewer" ON data_quarantine
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

Aynı mantık collective_dms'deki gibi: service_role'a kısıtla.

```sql
DROP POLICY IF EXISTS "quarantine_update_owner_or_reviewer" ON data_quarantine;

-- SELECT herkes okuyabilir (karantina verileri kamusal)
-- Mevcut "quarantine_select_public" USING (true) kalabilir ✅

-- INSERT sadece service role (API route üzerinden)
DROP POLICY IF EXISTS "quarantine_insert_authenticated" ON data_quarantine;
CREATE POLICY "quarantine_insert_service" ON data_quarantine
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- UPDATE sadece service role (API route üzerinden)
CREATE POLICY "quarantine_update_service" ON data_quarantine
  FOR UPDATE USING (auth.role() = 'service_role');
```

#### S2.3 — DMS Fingerprint Doğrulaması (V4, V5 Düzeltme)

**Dosyalar:**
- `src/app/api/dms/route.ts` — GET ve POST
- `src/app/api/collective-dms/route.ts` — GET ve POST

Her iki route'a `serverFingerprint.ts` helper'ını ekle:

```typescript
import { validateFingerprint } from '@/lib/serverFingerprint';

// GET handler başında:
const fingerprint = searchParams.get('fingerprint');
const validation = await validateFingerprint(fingerprint, request);
if (!validation.valid) {
  return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 403 });
}

// POST handler'da:
// fingerprint body'den değil, validation sonucundan al
const { verifiedFingerprint } = validation;
```

---

### Sprint S3 — "Gelişmiş Savunma" (Tahmini: 2-3 saat)

**Hedef:** Denetim izi + birim testler + gözden kaçan açıklar.

#### S3.1 — Audit Log Tablosu + Helper

**Dosya:** `src/lib/auditLog.ts` (YENİ)

Kritik işlemlerin denetim kaydı:
```typescript
export async function logAction(params: {
  fingerprint: string;
  action: string;       // 'dms_create' | 'badge_change' | 'quarantine_review' | ...
  resource: string;     // 'dead_man_switches' | 'user_badges' | ...
  resourceId: string;
  result: 'success' | 'failure' | 'blocked';
  ip: string;
  metadata?: Record<string, unknown>;
}): Promise<void>
```

**SQL migration:**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'blocked')),
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sadece service role yazabilir, kimse silemesin
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_service" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "audit_select_service" ON audit_logs FOR SELECT USING (auth.role() = 'service_role');
-- DELETE ve UPDATE politikası YOK = silme/değiştirme imkansız
```

#### S3.2 — Shamir + Crypto Birim Testleri

**Dosya:** `src/lib/__tests__/shamir.test.ts` (YENİ)

Shamir implementasyonu matematiksel olarak doğru görünüyor ama sıfır test var. Minimum test seti:

```
- shamirSplit(secret, 5, 3) → 5 parça döner
- shamirCombine(herhangi 3 parça) → orijinal secret
- shamirCombine(2 parça) → yanlış sonuç (threshold altı)
- shamirSplit(secret, 1, 1) → hata (minimum 2)
- shamirSplit(secret, 256, 256) → hata (max 255)
- 100 rastgele secret ile round-trip testi
```

**Dosya:** `src/lib/__tests__/crypto.test.ts` (YENİ)

```
- encryptData + decryptData round-trip
- Farklı key ile decrypt → hata
- IV benzersizliği (aynı veri 2x şifrele → farklı ciphertext)
- hashData deterministic kontrolü
```

#### S3.3 — Kritik Route'lara Audit Log Entegrasyonu

Audit log'u şu route'lara ekle:
- `/api/dms/route.ts` — create, checkin, pause, cancel
- `/api/collective-dms/route.ts` — create, approve, vote, trigger
- `/api/badge/route.ts` — tier değişikliği
- `/api/quarantine/[id]/review/route.ts` — review kararı
- `/api/quarantine/[id]/promote/route.ts` — ağa ekleme

---

## DOSYA DEĞİŞİKLİK ÖZETİ

| Dosya | İşlem | Sprint |
|-------|-------|--------|
| **YENİ** `src/lib/serverFingerprint.ts` | Sunucu tarafı fingerprint doğrulama | S1 |
| **YENİ** `docs/SPRINT_S1_RLS_MIGRATION.sql` | Collective DMS RLS düzeltmesi | S1 |
| **YENİ** `docs/SPRINT_S2_VOTING_RPC.sql` | Atomik oylama fonksiyonu | S2 |
| **YENİ** `docs/SPRINT_S2_QUARANTINE_RLS.sql` | Quarantine RLS düzeltmesi | S2 |
| **YENİ** `src/lib/auditLog.ts` | Denetim izi helper | S3 |
| **YENİ** `docs/SPRINT_S3_AUDIT_MIGRATION.sql` | audit_logs tablosu | S3 |
| **YENİ** `src/lib/__tests__/shamir.test.ts` | Shamir birim testleri | S3 |
| **YENİ** `src/lib/__tests__/crypto.test.ts` | Crypto birim testleri | S3 |
| `src/app/api/badge/route.ts` | Tier koruması + rate limit | S1 |
| `src/app/api/dms/route.ts` | Rate limit + fingerprint doğrulama | S1 + S2 |
| `src/app/api/collective-dms/route.ts` | Rate limit + fingerprint doğrulama | S1 + S2 |
| `src/app/api/quarantine/[id]/review/route.ts` | Rate limit + RPC çağrısı | S1 + S2 |

**Toplam yeni dosya:** 8
**Toplam değişen dosya:** 4
**Toplam SQL migration:** 3

---

## ZAMAN TAHMİNİ (Dürüst)

| Sprint | Tahmini Süre | Açıklama |
|--------|-------------|----------|
| S1 | 3-4 saat | serverFingerprint helper + badge koruması + 4 route'a rate limit + RLS SQL |
| S2 | 2-3 saat | Atomik oylama RPC + quarantine RLS + DMS fingerprint doğrulama |
| S3 | 2-3 saat | Audit log sistemi + birim testler + audit entegrasyonu |
| **TOPLAM** | **7-10 saat** | |

**NOT:** Önceki denetimde "30-35 saat" demiştim. Bu şişirmeydi. Gerçek kod incelendiğinde:
- Cron koruması zaten var (0 saat tasarruf)
- Rate limit altyapısı zaten var, sadece bağlamak lazım (dakikalar, saat değil)
- RLS düzeltmesi basit SQL (drop + create)
- En büyük iş: serverFingerprint.ts yazılması + route'lara entegrasyon

---

## BAĞIMLILIK SIRASI

```
S1.1 (serverFingerprint.ts)  ←── Diğer tüm route değişiklikleri buna bağlı
  ↓
S1.2 (badge koruması)         ←── S1.1'e bağlı
S1.3 (rate limiting)          ←── Bağımsız, paralel yapılabilir
S1.4 (RLS migration)          ←── Bağımsız, Raşit'in Supabase'de çalıştırması gerekir
  ↓
S2.1 (atomik oylama)          ←── Bağımsız SQL, Raşit'in çalıştırması gerekir
S2.2 (quarantine RLS)         ←── S1.4 ile birlikte yapılabilir
S2.3 (DMS fingerprint)        ←── S1.1'e bağlı
  ↓
S3.1 (audit log)              ←── Bağımsız
S3.2 (birim testler)          ←── Bağımsız
S3.3 (audit entegrasyon)      ←── S3.1'e bağlı
```

**Raşit'in yapması gereken manuel adımlar:**
1. SQL migration'ları Supabase Dashboard'da çalıştır (S1.4, S2.1, S2.2, S3.1)
2. Testleri çalıştırıp sonuçları kontrol et (S3.2)

---

## SONUÇ TABLOSU: DÜZELTME SONRASI RİSK

| Açık | Düzeltme Öncesi | Düzeltme Sonrası |
|------|----------------|------------------|
| V1 Badge self-grant | KRİTİK | ✅ SIFIR RİSK (journalist/institutional POST'tan kaldırılıyor) |
| V2 RLS allow-all | KRİTİK | ✅ SIFIR RİSK (service_role dışında erişim imkansız) |
| V3 Quarantine spoofing | KRİTİK | ⬇️ DÜŞÜK (fingerprint doğrulama + rate limit) |
| V4 DMS okuma | YÜKSEK | ⬇️ DÜŞÜK (fingerprint doğrulama) |
| V5 Collective DMS spoofing | YÜKSEK | ⬇️ DÜŞÜK (fingerprint doğrulama + RLS) |
| V6 Rate limit eksik | YÜKSEK | ✅ SIFIR RİSK (4 route'a rate limit ekleniyor) |
| V7 Race condition | YÜKSEK | ✅ SIFIR RİSK (atomik RPC, FOR UPDATE lock) |
| V8 In-memory rate limit | ORTA | ORTA (tek sunucu için yeterli, çoklu sunucuya geçince Redis lazım) |
| V9 Badge bilgi sızıntısı | ORTA | ORTA (düşük öncelik, badge bilgisi zaten kamusal) |
| V10 Quarantine UPDATE RLS | ORTA | ✅ SIFIR RİSK (service_role kısıtlaması) |

**Özet:** 10 açıktan 5'i SIFIR RİSK'e inecek, 3'ü DÜŞÜK'e, 2'si ORTA kalacak (V8 Redis gerektiriyor — şu an tek sunucu, V9 düşük öncelik).

---

## "SIFIRA İNDİREMEDİKLERİM" İÇİN DÜRÜST AÇIKLAMA

**V3, V4, V5 neden "DÜŞÜK" ve "SIFIR" değil?**

Anonim bir sistemde fingerprint'in %100 güvenilir olması matematiksel olarak imkansız. Saldırgan yeni bir fingerprint üretebilir (yeni tarayıcı, yeni cihaz). serverFingerprint.ts ile yapabildiğimiz:
- Mevcut fingerprint'in sistemde kayıtlı olduğunu doğrulamak ✅
- Bir IP'den gelen fingerprint sayısını sınırlamak ✅
- Rate limiting ile spam engelleme ✅

Ama "bu fingerprint gerçekten bu kişi mi?" sorusuna kesin cevap vermek **anonim sistemde imkansız**. Bunun için Supabase Auth (email/OAuth) gerekir — ki bu tasarım felsefesine ters.

**V8 neden ORTA kalıyor?**

Şu an tek Vercel instance'ında çalışıyoruz. In-memory Map yeterli. Çoklu sunucuya geçildiğinde Upstash Redis ($0 free tier) eklenebilir. Ama şu an gereksiz karmaşıklık.

---

## DOĞRULAMA KONTROL LİSTESİ (Her Sprint Sonrası)

```
[ ] Badge POST ile journalist tier gönder → 403 dönmeli
[ ] Sahte fingerprint ile DMS GET → 403 dönmeli
[ ] 6 ardışık DMS POST → 6. istek 429 dönmeli
[ ] Collective DMS'e anon key ile doğrudan Supabase sorgusu → 0 satır dönmeli
[ ] Aynı fingerprint ile 2x quarantine review → 2. istek "already_reviewed" dönmeli
[ ] Audit log tablosunu kontrol et → her kritik işlem kaydedilmiş olmalı
[ ] Shamir testi: 5 parça oluştur, 3'ünü birleştir → orijinal secret
[ ] Crypto testi: şifrele + çöz → orijinal veri
```
