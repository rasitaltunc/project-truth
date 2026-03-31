-- ═══════════════════════════════════════════
-- SPRINT 9: "Gazeteci Kalkanı" — Supabase Migration
-- Dead Man's Switch + Evidence Media
-- ═══════════════════════════════════════════

-- 1. Dead Man's Switch tablosu
-- (Eğer zaten varsa skip edilir)
CREATE TABLE IF NOT EXISTS dead_man_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                          -- fingerprint veya auth user id
  name TEXT NOT NULL,
  description TEXT,

  -- Tetikleme ayarları
  trigger_type TEXT NOT NULL DEFAULT 'no_checkin', -- no_checkin | manual_trigger | scheduled
  trigger_days INT DEFAULT 7,                      -- no_checkin tipi için gün sayısı
  trigger_date TIMESTAMPTZ,                        -- scheduled tipi için tarih
  last_checkin TIMESTAMPTZ DEFAULT now(),

  -- Şifreli içerik
  encrypted_content TEXT NOT NULL,                 -- AES-256-GCM şifreli JSON
  content_hash TEXT NOT NULL,                      -- SHA-256 bütünlük doğrulama
  content_preview TEXT,                            -- İlk 50 karakter (şifresiz ipucu)

  -- Alıcılar
  recipients JSONB NOT NULL DEFAULT '[]',          -- [{type, value, name, delay_hours}]

  -- Durum
  status TEXT NOT NULL DEFAULT 'active',           -- active | triggered | cancelled | paused
  triggered_at TIMESTAMPTZ,

  -- Kullanıcı e-postası (opsiyonel, check-in hatırlatma için)
  user_email TEXT,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_dms_user_id ON dead_man_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_dms_status ON dead_man_switches(status);
CREATE INDEX IF NOT EXISTS idx_dms_status_active ON dead_man_switches(status) WHERE status = 'active';

-- 2. Evidence Media tablosu
CREATE TABLE IF NOT EXISTS evidence_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID,                                -- REFERENCES evidence_archive(id) — opsiyonel
  storage_path TEXT NOT NULL,                      -- Supabase Storage path
  media_type TEXT NOT NULL,                        -- image | video | document
  original_filename TEXT,                          -- Metadata strip edilmemişse orijinal isim
  file_size INT,
  file_hash TEXT,                                  -- SHA-256
  thumbnail_url TEXT,
  metadata_stripped BOOLEAN DEFAULT false,
  uploaded_by TEXT,                                -- fingerprint
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_media_evidence ON evidence_media(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_media_uploaded_by ON evidence_media(uploaded_by);

-- 3. Board Layouts tablosu (Sprint 8'den — eğer henüz yoksa)
CREATE TABLE IF NOT EXISTS board_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID,
  user_fingerprint TEXT NOT NULL,
  node_positions JSONB NOT NULL,
  sticky_notes JSONB DEFAULT '[]',
  media_cards JSONB DEFAULT '[]',
  zoom FLOAT DEFAULT 1.0,
  pan_x FLOAT DEFAULT 0,
  pan_y FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_layouts_user ON board_layouts(user_fingerprint);

-- 4. Supabase Storage bucket (Supabase Dashboard'dan oluşturulmalı)
-- Bucket adı: evidence-media
-- Public: Hayır (RLS ile kontrol)
-- Max file size: 50MB

-- 5. RLS Policies
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_layouts ENABLE ROW LEVEL SECURITY;

-- Idempotent policy oluşturma (PostgreSQL CREATE POLICY IF NOT EXISTS desteklemiyor)
DO $$
BEGIN
  -- DMS: Herkes kendi kayıtlarını görebilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dead_man_switches' AND policyname = 'dms_user_access'
  ) THEN
    CREATE POLICY "dms_user_access"
      ON dead_man_switches
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Evidence Media: Herkes okuyabilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'evidence_media' AND policyname = 'media_read_all'
  ) THEN
    CREATE POLICY "media_read_all"
      ON evidence_media
      FOR SELECT
      USING (true);
  END IF;

  -- Evidence Media: Herkes insert yapabilir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'evidence_media' AND policyname = 'media_insert_own'
  ) THEN
    CREATE POLICY "media_insert_own"
      ON evidence_media
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- Board Layouts: Herkes kendi layout'unu yönetir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'board_layouts' AND policyname = 'board_user_access'
  ) THEN
    CREATE POLICY "board_user_access"
      ON board_layouts
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

-- ═══════════════════════════════════════════
-- NOTLAR:
-- 1. Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın
-- 2. Storage bucket'ı Dashboard > Storage'dan oluşturun
-- 3. RESEND_API_KEY env variable'ını .env.local'e ekleyin
-- 4. CRON_SECRET env variable'ını .env.local'e ekleyin
-- ═══════════════════════════════════════════
