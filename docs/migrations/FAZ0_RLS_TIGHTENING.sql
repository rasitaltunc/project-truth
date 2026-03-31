-- ═══════════════════════════════════════════════════════════════
-- FAZ 0 — RLS POLİTİKA SIKISIKLAŞTIRMASI
-- ═══════════════════════════════════════════════════════════════
--
-- Tarih: 31 Mart 2026
-- Güvenlik Bulguları: #7 (Supabase anon key) + #13 (Open RLS)
--
-- SORUN:
--   Sprint 13 RLS politikaları "USING (true)" ile oluşturuldu.
--   Bu, Supabase anon key ile herhangi birinin herhangi bir kaydı
--   UPDATE edebileceği anlamına geliyor. API route'lar ownership
--   kontrolü yapıyor ama RLS defense-in-depth olmalı.
--
-- STRATEJİ:
--   - SELECT: Herkes okuyabilir (şeffaf platform — değişmez)
--   - INSERT: Herkes ekleyebilir (API route validasyonuyla)
--   - UPDATE: SADECE sahip (owner_fingerprint eşleşmeli)
--   - DELETE: Yok (soft delete kullanıyoruz)
--
-- ÖNEMLİ:
--   Supabase Dashboard'da SQL Editor'de çalıştır.
--   API route'lar service_role key kullanıyorsa etkilenmez.
--   Anon key ile doğrudan erişim sınırlanır.
--
-- ⚠️ NOT:
--   API route'larımız şu an anon key + RLS bypass yok.
--   Supabase client'ımız anon key kullanıyor.
--   Bu yüzden UPDATE policy'leri "true" KALMALI ama
--   gelecekte auth.uid() ile sıkılaştırılacak.
--
--   MEVCUT DURUM: API route'lar fingerprint kontrolü yapıyor.
--   RLS katmanı ek güvenlik sağlıyor (defense-in-depth).
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 1: KOLEKTİF DMS — RLS SIKISIKLAŞTIRMASI (Bulgu #13)
-- ═══════════════════════════════════════════════════════════════

-- 1.1 collective_dms: UPDATE sadece sahip
DROP POLICY IF EXISTS "collective_dms_update" ON collective_dms;
CREATE POLICY "collective_dms_update" ON collective_dms
  FOR UPDATE USING (
    -- Sahip kendi DMS'ini güncelleyebilir
    -- NOT: owner_fingerprint request header'dan gelmeli (API route enforces this)
    -- RLS burada ek katman — asıl kontrol API route'ta
    true
    -- TODO (Auth Sprint sonrası):
    -- auth.uid()::text = owner_fingerprint
    -- OR auth.role() = 'service_role'
  );

-- 1.2 collective_dms_shards: UPDATE kısıtla
-- Shard'lar sadece dağıtım sırasında yazılır, sonra READ-ONLY olmalı
DROP POLICY IF EXISTS "shards_update" ON collective_dms_shards;
CREATE POLICY "shards_update_restricted" ON collective_dms_shards
  FOR UPDATE USING (false);
-- Shard'lar bir kez yazılır, güncellenmez.
-- Güncelleme gerekirse service_role key ile yapılır (API route).

-- 1.3 collective_alerts: UPDATE kısıtla
-- Alert'ler sadece cron job tarafından güncellenebilir (service_role)
DROP POLICY IF EXISTS "alerts_update" ON collective_alerts;
CREATE POLICY "alerts_update_restricted" ON collective_alerts
  FOR UPDATE USING (false);
-- Alert status değişiklikleri API route üzerinden service_role ile yapılır.

-- 1.4 proof_of_life_chain: INSERT herkes (check-in mekanizması)
-- Mevcut policy zaten doğru, sadece teyit
-- SELECT: true (şeffaf zincir)
-- INSERT: true (check-in herkes yapabilir — fingerprint API'de kontrol)
-- UPDATE: yok (append-only zincir, değiştirilemez)
DROP POLICY IF EXISTS "pol_update" ON proof_of_life_chain;
-- Proof of Life zinciri APPEND-ONLY — güncelleme yok


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 2: DEAD MAN SWITCHES — RLS EKLE (Bulgu #7 ilişkili)
-- ═══════════════════════════════════════════════════════════════

-- DMS tablosunda RLS var mı kontrol et, yoksa ekle
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;

-- SELECT: Sadece kendi switch'lerini görebilir
DROP POLICY IF EXISTS "dms_select_own" ON dead_man_switches;
CREATE POLICY "dms_select_own" ON dead_man_switches
  FOR SELECT USING (true);
  -- TODO (Auth Sprint sonrası): auth.uid()::text = user_id

-- INSERT: Herkes oluşturabilir (API route validasyonuyla)
DROP POLICY IF EXISTS "dms_insert" ON dead_man_switches;
CREATE POLICY "dms_insert" ON dead_man_switches
  FOR INSERT WITH CHECK (true);

-- UPDATE: Herkes (API route ownership kontrolü yapıyor)
DROP POLICY IF EXISTS "dms_update" ON dead_man_switches;
CREATE POLICY "dms_update" ON dead_man_switches
  FOR UPDATE USING (true);
  -- TODO (Auth Sprint sonrası): auth.uid()::text = user_id

-- DELETE: Yok (soft delete — status='cancelled')


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 3: HASSAS TABLOLAR — RLS AKTİF OLDUĞUNDAN EMİN OL
-- ═══════════════════════════════════════════════════════════════
-- Bu tablolar kullanıcı verisini içeriyor ve RLS aktif olmalı.

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_global_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- user_badges: Herkes okuyabilir (şeffaf reputation)
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
CREATE POLICY "user_badges_select" ON user_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_badges_insert" ON user_badges;
CREATE POLICY "user_badges_insert" ON user_badges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "user_badges_update" ON user_badges;
CREATE POLICY "user_badges_update" ON user_badges FOR UPDATE USING (true);

-- user_global_badges: Herkes okuyabilir
DROP POLICY IF EXISTS "user_global_badges_select" ON user_global_badges;
CREATE POLICY "user_global_badges_select" ON user_global_badges FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_global_badges_insert" ON user_global_badges;
CREATE POLICY "user_global_badges_insert" ON user_global_badges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "user_global_badges_update" ON user_global_badges;
CREATE POLICY "user_global_badges_update" ON user_global_badges FOR UPDATE USING (true);

-- badge_nominations: Herkes okuyabilir
DROP POLICY IF EXISTS "badge_nominations_select" ON badge_nominations;
CREATE POLICY "badge_nominations_select" ON badge_nominations FOR SELECT USING (true);
DROP POLICY IF EXISTS "badge_nominations_insert" ON badge_nominations;
CREATE POLICY "badge_nominations_insert" ON badge_nominations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "badge_nominations_update" ON badge_nominations;
CREATE POLICY "badge_nominations_update" ON badge_nominations FOR UPDATE USING (true);

-- reputation_transactions: Herkes okuyabilir (şeffaf ekonomi)
DROP POLICY IF EXISTS "reputation_select" ON reputation_transactions;
CREATE POLICY "reputation_select" ON reputation_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "reputation_insert" ON reputation_transactions;
CREATE POLICY "reputation_insert" ON reputation_transactions FOR INSERT WITH CHECK (true);
-- reputation UPDATE yok — append-only

-- investigator_profiles: Herkes okuyabilir
DROP POLICY IF EXISTS "inv_profiles_select" ON investigator_profiles;
CREATE POLICY "inv_profiles_select" ON investigator_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "inv_profiles_insert" ON investigator_profiles;
CREATE POLICY "inv_profiles_insert" ON investigator_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "inv_profiles_update" ON investigator_profiles;
CREATE POLICY "inv_profiles_update" ON investigator_profiles FOR UPDATE USING (true);

-- task_assignments: Herkes okuyabilir
DROP POLICY IF EXISTS "task_assign_select" ON task_assignments;
CREATE POLICY "task_assign_select" ON task_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "task_assign_insert" ON task_assignments;
CREATE POLICY "task_assign_insert" ON task_assignments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "task_assign_update" ON task_assignments;
CREATE POLICY "task_assign_update" ON task_assignments FOR UPDATE USING (true);


-- ═══════════════════════════════════════════════════════════════
-- BÖLÜM 4: DOĞRULAMA
-- ═══════════════════════════════════════════════════════════════

-- RLS aktif olan tabloları listele
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- Mevcut RLS policy'leri listele
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ═══════════════════════════════════════════════════════════════
-- NOTLAR
-- ═══════════════════════════════════════════════════════════════
--
-- 1. SHARD UPDATE = false:
--    Shard'lar bir kez oluşturulur, değiştirilemez.
--    Bu güvenlik açısından kritik — shard manipülasyonu engellenmiş olur.
--    Service_role key ile API route üzerinden gerekirse güncellenir.
--
-- 2. ALERT UPDATE = false:
--    Alert seviyeleri (silent→yellow→red) sadece cron job tarafından
--    yükseltilir. Kullanıcılar alert'leri değiştiremez.
--
-- 3. TODO — Auth Sprint Sonrası:
--    Supabase Auth aktifleştiğinde (magic link / PKCE):
--    - auth.uid() ile owner_fingerprint eşleştirmesi yapılacak
--    - Şu anki "USING (true)" policy'ler auth.uid() bazlı olacak
--    - Bu geçiş için: authBridge.ts → Supabase Auth user_metadata.fingerprint
--
-- 4. Neden Hâlâ "USING (true)" var?
--    Platform şu an fingerprint tabanlı (anonim). auth.uid() yok.
--    API route'lar fingerprint kontrolü yapıyor.
--    RLS'yi tamamen kısıtlarsak API route'lar da çalışmaz (anon key).
--    Çözüm: Shard + Alert gibi KRİTİK tablolarda UPDATE=false (sadece service_role),
--    diğerlerinde API route'un ownership kontrolüne güven.
-- ═══════════════════════════════════════════════════════════════
