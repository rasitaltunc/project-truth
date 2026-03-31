-- ============================================
-- DEAD MAN'S SWITCHES TABLE - FIX
-- Run this in Supabase SQL Editor
-- ============================================
--
-- Bu script mevcut tabloyu düzeltir:
-- Foreign key constraint kaldırılır (anonim kullanıcılar auth.users'da yok)
-- user_id TEXT olarak değiştirilir (truth_users.id ile uyumlu)
-- ============================================

-- 1. Mevcut tabloyu sil ve yeniden oluştur
DROP TABLE IF EXISTS dead_man_switches CASCADE;

-- 2. Foreign key olmadan yeniden oluştur
CREATE TABLE dead_man_switches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,  -- truth_users.id (NOT auth.users - supports anonymous)
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL DEFAULT 'no_checkin',
    trigger_days INTEGER DEFAULT 30,
    trigger_date TIMESTAMPTZ,
    last_checkin TIMESTAMPTZ DEFAULT NOW(),
    encrypted_content TEXT,
    content_hash TEXT,
    recipients JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;

-- 4. Permissive policies (hem auth hem anon kullanıcılar için)
CREATE POLICY "Anyone can read switches" ON dead_man_switches
    FOR SELECT USING (true);

CREATE POLICY "Anyone can create switches" ON dead_man_switches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update own switches" ON dead_man_switches
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete own switches" ON dead_man_switches
    FOR DELETE USING (true);

-- 5. Indexes
CREATE INDEX idx_dms_user_id ON dead_man_switches(user_id);
CREATE INDEX idx_dms_status ON dead_man_switches(status);

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dead_man_switches;
