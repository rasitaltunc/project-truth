-- ============================================
-- Migration 006: TRUTH PROTOCOL - User System
-- Anonim ama doğrulanmış kimlik sistemi
-- ============================================

-- ============================================
-- 1. USERS (Kullanıcılar)
-- Supabase Auth ile entegre
-- ============================================

CREATE TABLE IF NOT EXISTS truth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Supabase Auth bağlantısı (opsiyonel - anonim kullanıcılar için null)
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Anonim Kimlik (Cryptographic Pseudonym)
    anonymous_id VARCHAR(64) UNIQUE NOT NULL,  -- "WITNESS_7f3d2a1b"
    display_name VARCHAR(100),                  -- Kullanıcının seçtiği takma ad

    -- Güven Seviyeleri
    trust_level INT DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 4),
    -- 0: Anonim Ziyaretçi
    -- 1: Doğrulanmış İnsan (CAPTCHA + device)
    -- 2: Doğrulanmış Tanık (proof of presence)
    -- 3: Doğrulanmış İçeriden (institutional access)
    -- 4: İsimli Kaynak (public identity)

    -- İtibar Sistemi
    reputation_score INT DEFAULT 0,
    contributions_count INT DEFAULT 0,
    verified_contributions INT DEFAULT 0,
    false_contributions INT DEFAULT 0,

    -- Güvenlik
    public_key TEXT,                    -- Cryptographic public key
    last_active_at TIMESTAMPTZ,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,

    -- Metadata
    preferred_language VARCHAR(5) DEFAULT 'tr',
    country_code VARCHAR(3),            -- Opsiyonel, sadece istatistik için
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER_VERIFICATIONS (Kullanıcı Doğrulamaları)
-- Her doğrulama adımı kaydedilir
-- ============================================

CREATE TABLE IF NOT EXISTS user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,

    -- Doğrulama Türü
    verification_type VARCHAR(50) NOT NULL,
    -- 'human_captcha': CAPTCHA geçti
    -- 'phone_verified': Telefon doğrulandı
    -- 'email_verified': Email doğrulandı
    -- 'device_unique': Unique device ID
    -- 'location_proof': Lokasyon kanıtı
    -- 'institutional_proof': Kurum erişim kanıtı
    -- 'identity_revealed': Gerçek kimlik açıklandı

    -- Doğrulama Detayları
    verification_data JSONB,            -- Şifrelenmiş doğrulama verisi
    verification_hash VARCHAR(64),      -- Doğrulama hash'i (geri dönülemez)

    -- Durum
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected, expired
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. USER_CONTRIBUTIONS (Kullanıcı Katkıları)
-- Tüm katkıları takip et
-- ============================================

CREATE TABLE IF NOT EXISTS user_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,

    -- Katkı Türü
    contribution_type VARCHAR(50) NOT NULL,
    -- 'evidence_submit': Kanıt gönderdi
    -- 'timeline_event': Timeline olayı ekledi
    -- 'verification_vote': Doğrulama oyladı
    -- 'cross_reference': Çapraz referans buldu
    -- 'correction': Düzeltme önerdi

    -- Referans
    reference_table VARCHAR(50),        -- 'evidence_archive', 'timeline_events', etc.
    reference_id UUID,

    -- Durum
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES truth_users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Etki
    impact_score INT DEFAULT 0,         -- Bu katkının etkisi

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. DEAD_MAN_SWITCHES (Ölü Adam Anahtarları)
-- Koruma mekanizması
-- ============================================

CREATE TABLE IF NOT EXISTS dead_man_switches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES truth_users(id) ON DELETE CASCADE,

    -- Anahtar Ayarları
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Tetikleme Koşulları
    trigger_type VARCHAR(50) NOT NULL,
    -- 'no_checkin': X gün check-in yapmazsa
    -- 'manual_trigger': Manuel tetikleme
    -- 'scheduled': Belirli tarihte

    trigger_days INT,                   -- no_checkin için gün sayısı
    trigger_date TIMESTAMPTZ,           -- scheduled için tarih
    last_checkin TIMESTAMPTZ DEFAULT NOW(),

    -- İçerik
    encrypted_content TEXT NOT NULL,    -- AES-256 şifreli içerik
    content_hash VARCHAR(64),           -- İçerik doğrulama hash'i

    -- Alıcılar
    recipients JSONB NOT NULL,          -- [{type: 'email', value: '...'}, {type: 'public'}]

    -- Durum
    status VARCHAR(20) DEFAULT 'active', -- active, triggered, cancelled
    triggered_at TIMESTAMPTZ,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SECURE_MESSAGES (Güvenli Mesajlar)
-- Kaynak ile iletişim
-- ============================================

CREATE TABLE IF NOT EXISTS secure_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Taraflar (anonim ID'ler)
    sender_id UUID NOT NULL REFERENCES truth_users(id),
    recipient_id UUID NOT NULL REFERENCES truth_users(id),

    -- İçerik (E2E şifreli)
    encrypted_content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text, file, voice

    -- Durum
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Güvenlik
    self_destruct_at TIMESTAMPTZ,       -- Otomatik silme zamanı
    is_destroyed BOOLEAN DEFAULT false,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_anonymous ON truth_users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_users_trust ON truth_users(trust_level);
CREATE INDEX IF NOT EXISTS idx_users_reputation ON truth_users(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON user_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON user_contributions(status);
CREATE INDEX IF NOT EXISTS idx_dms_user ON dead_man_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_dms_checkin ON dead_man_switches(last_checkin) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON secure_messages(recipient_id, is_read);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE truth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_man_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure_messages ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi profillerini görebilir (anonim ID hariç)
CREATE POLICY "users_read_own" ON truth_users
    FOR SELECT USING (
        auth.uid() = auth_id OR
        -- Public fields herkes görebilir
        TRUE
    );

-- Kullanıcılar sadece kendi katkılarını görebilir
CREATE POLICY "contributions_read_own" ON user_contributions
    FOR SELECT USING (
        user_id IN (SELECT id FROM truth_users WHERE auth_id = auth.uid())
    );

-- Dead man switch sadece sahibi görebilir
CREATE POLICY "dms_read_own" ON dead_man_switches
    FOR SELECT USING (
        user_id IN (SELECT id FROM truth_users WHERE auth_id = auth.uid())
    );

-- Mesajlar sadece gönderen ve alıcı görebilir
CREATE POLICY "messages_read_own" ON secure_messages
    FOR SELECT USING (
        sender_id IN (SELECT id FROM truth_users WHERE auth_id = auth.uid()) OR
        recipient_id IN (SELECT id FROM truth_users WHERE auth_id = auth.uid())
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Anonim ID oluştur
CREATE OR REPLACE FUNCTION generate_anonymous_id()
RETURNS VARCHAR(64) AS $$
DECLARE
    prefixes TEXT[] := ARRAY['WITNESS', 'SOURCE', 'GUARDIAN', 'SEEKER', 'TRUTH', 'LIGHT', 'SHADOW', 'VOICE'];
    prefix TEXT;
    suffix TEXT;
BEGIN
    prefix := prefixes[floor(random() * array_length(prefixes, 1) + 1)];
    suffix := encode(gen_random_bytes(4), 'hex');
    RETURN prefix || '_' || suffix;
END;
$$ LANGUAGE plpgsql;

-- Yeni kullanıcı oluştur
CREATE OR REPLACE FUNCTION create_truth_user(
    p_auth_id UUID DEFAULT NULL,
    p_display_name VARCHAR(100) DEFAULT NULL
)
RETURNS truth_users AS $$
DECLARE
    new_user truth_users;
    new_anon_id VARCHAR(64);
BEGIN
    -- Unique anonim ID oluştur
    LOOP
        new_anon_id := generate_anonymous_id();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM truth_users WHERE anonymous_id = new_anon_id);
    END LOOP;

    INSERT INTO truth_users (auth_id, anonymous_id, display_name, trust_level)
    VALUES (p_auth_id, new_anon_id, COALESCE(p_display_name, new_anon_id), 0)
    RETURNING * INTO new_user;

    RETURN new_user;
END;
$$ LANGUAGE plpgsql;

-- İtibar güncelle
CREATE OR REPLACE FUNCTION update_reputation(
    p_user_id UUID,
    p_contribution_verified BOOLEAN
)
RETURNS void AS $$
BEGIN
    IF p_contribution_verified THEN
        UPDATE truth_users SET
            verified_contributions = verified_contributions + 1,
            contributions_count = contributions_count + 1,
            reputation_score = reputation_score + 10,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        UPDATE truth_users SET
            false_contributions = false_contributions + 1,
            contributions_count = contributions_count + 1,
            reputation_score = GREATEST(0, reputation_score - 20),
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EVIDENCE TABLOSUNA USER BAĞLANTISI EKLE
-- ============================================

ALTER TABLE evidence_archive
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES truth_users(id),
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES truth_users(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- ============================================
-- DONE
-- ============================================

SELECT 'Migration 006: User System completed!' as status;
