-- ============================================================
-- FAZ0 RLS POLICY CLEANUP — Çakışan Eski Policy'leri Kaldır
-- Tarih: 31 Mart 2026
-- Neden: PERMISSIVE policy'ler OR mantığıyla çalışır.
--        Eski "USING (true)" policy'ler yeni kısıtlayıcı policy'leri
--        tamamen etkisiz kılıyor. Güvenlik açığı.
-- ============================================================

-- ┌─────────────────────────────────────────────────────┐
-- │  BÖLÜM 1: collective_dms — Eski Açık Policy'ler    │
-- │  Sorun: collective_dms_update (true) →              │
-- │         cdms_service_only_update etkisiz            │
-- └─────────────────────────────────────────────────────┘

-- Eski UPDATE policy'yi kaldır (true → herkes update edebiliyordu)
DROP POLICY IF EXISTS "collective_dms_update" ON collective_dms;

-- Eski INSERT policy'yi kaldır (true → herkes insert edebiliyordu)
-- Yeni cdms_service_only_insert zaten var
DROP POLICY IF EXISTS "collective_dms_insert" ON collective_dms;

-- ┌─────────────────────────────────────────────────────┐
-- │  BÖLÜM 2: collective_dms_shards — Eski Policy'ler  │
-- │  Sorun: Eski select/insert (true) açık              │
-- └─────────────────────────────────────────────────────┘

-- Eski SELECT policy (true → herkes shard okuyabiliyordu)
DROP POLICY IF EXISTS "shards_select" ON collective_dms_shards;

-- Eski INSERT policy (true → herkes shard ekleyebiliyordu)
DROP POLICY IF EXISTS "shards_insert" ON collective_dms_shards;

-- Yeni kısıtlayıcı SELECT: sadece service_role
CREATE POLICY "shards_service_select" ON collective_dms_shards
  FOR SELECT USING (auth.role() = 'service_role');

-- Yeni kısıtlayıcı INSERT: sadece service_role
CREATE POLICY "shards_service_insert" ON collective_dms_shards
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ┌─────────────────────────────────────────────────────┐
-- │  BÖLÜM 3: collective_alerts — Eski Policy'ler      │
-- │  Sorun: alerts_select (true) + alerts_insert (true) │
-- └─────────────────────────────────────────────────────┘

-- Eski SELECT policy (true)
DROP POLICY IF EXISTS "alerts_select" ON collective_alerts;

-- Eski INSERT policy (true)
DROP POLICY IF EXISTS "alerts_insert" ON collective_alerts;

-- Yeni kısıtlayıcı SELECT: sadece service_role
CREATE POLICY "alerts_service_select" ON collective_alerts
  FOR SELECT USING (auth.role() = 'service_role');

-- Yeni kısıtlayıcı INSERT: sadece service_role
CREATE POLICY "alerts_service_insert" ON collective_alerts
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ┌─────────────────────────────────────────────────────┐
-- │  BÖLÜM 4: proof_of_life_chain — Eski Policy'ler    │
-- │  Sorun: pol_select (true) + pol_insert (true)       │
-- └─────────────────────────────────────────────────────┘

-- Eski SELECT policy (true)
DROP POLICY IF EXISTS "pol_select" ON proof_of_life_chain;

-- Eski INSERT policy (true)
DROP POLICY IF EXISTS "pol_insert" ON proof_of_life_chain;

-- Yeni kısıtlayıcı SELECT: sadece service_role
CREATE POLICY "pol_service_select" ON proof_of_life_chain
  FOR SELECT USING (auth.role() = 'service_role');

-- Yeni kısıtlayıcı INSERT: sadece service_role (append-only chain)
CREATE POLICY "pol_service_insert" ON proof_of_life_chain
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ┌─────────────────────────────────────────────────────┐
-- │  BÖLÜM 5: dead_man_switches — SELECT açık kalmalı   │
-- │  Ama UPDATE/INSERT sadece service_role               │
-- └─────────────────────────────────────────────────────┘

-- Eski geniş UPDATE policy'yi kaldır (eğer varsa)
DROP POLICY IF EXISTS "dms_update" ON dead_man_switches;
DROP POLICY IF EXISTS "dead_man_switches_update" ON dead_man_switches;

-- Eski geniş INSERT policy'yi kaldır (eğer varsa)
DROP POLICY IF EXISTS "dms_insert" ON dead_man_switches;
DROP POLICY IF EXISTS "dead_man_switches_insert" ON dead_man_switches;

-- SELECT herkes okuyabilir (API route ownership check yapar)
-- Bu zaten var: dms_select_all veya dead_man_switches_select
-- Dokunmuyoruz.

-- UPDATE sadece service_role (API route güvenliği yeterli)
CREATE POLICY "dms_service_update" ON dead_man_switches
  FOR UPDATE USING (auth.role() = 'service_role');

-- INSERT sadece service_role
CREATE POLICY "dms_service_insert" ON dead_man_switches
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- DOĞRULAMA: Temizlik sonrası kontrol
-- ============================================================

-- Tüm policy'leri listele (çakışma kalmadığını doğrula)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'collective_dms',
    'collective_dms_shards',
    'collective_alerts',
    'proof_of_life_chain',
    'dead_man_switches'
  )
ORDER BY tablename, cmd, policyname;
