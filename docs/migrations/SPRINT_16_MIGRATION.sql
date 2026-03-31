-- ═══════════════════════════════════════════════════════════════
-- SPRINT 16: "TARA PROTOKOLü" — Belge Arşivi + AI Tarama Sistemi
-- Tarih: Mart 2026
-- 5 yeni tablo + RLS + İndeksler
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TABLO 1: documents — Ana belge deposu
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES networks(id),
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'other',
    -- 'court_record','foia','leaked','financial','deposition',
    -- 'indictment','correspondence','media','academic','other'
  source_type TEXT NOT NULL DEFAULT 'manual',
    -- 'manual','courtlistener','icij','opensanctions','documentcloud','community'
  external_id TEXT,           -- Dış kaynak ID (CourtListener docket_id, ICIJ entity_id, vb.)
  external_url TEXT,          -- Orijinal kaynak URL
  file_path TEXT,             -- Supabase Storage path
  file_size BIGINT,
  file_type TEXT,             -- 'pdf','docx','txt','html','image'
  language TEXT DEFAULT 'en',
  country_tags TEXT[] DEFAULT '{}',
  date_filed DATE,            -- Belgenin asıl tarihi
  date_uploaded TIMESTAMPTZ DEFAULT now(),
  uploaded_by TEXT,            -- fingerprint
  scan_status TEXT DEFAULT 'pending',
    -- 'pending','scanning','scanned','failed','needs_review'
  scan_result JSONB,          -- AI tarama sonucu (entities, relationships, confidence, summary)
  scanned_by TEXT,            -- Tarayan kişinin fingerprint'i
  scanned_at TIMESTAMPTZ,
  review_count INT DEFAULT 0,
  quality_score FLOAT DEFAULT 0, -- Topluluk kalite puanı (0-1)
  is_public BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Ek bilgiler (court_name, judge, case_number, vb.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE documents IS 'Sprint 16: Ana belge deposu — mahkeme kayıtları, FOIA, sızıntılar, finansal belgeler';
COMMENT ON COLUMN documents.scan_result IS 'AI tarama sonucu: { entities: [], relationships: [], summary: "", confidence: 0.0 }';

-- ═══════════════════════════════════════════
-- TABLO 2: document_network_mappings
-- Bir belge birden fazla ağda geçerli olabilir
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_network_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  network_id UUID REFERENCES networks(id),
  relevance_score FLOAT DEFAULT 0.5,
  added_by TEXT,              -- fingerprint
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, network_id)
);

COMMENT ON TABLE document_network_mappings IS 'Sprint 16: Belge ↔ Ağ çoklu eşleştirmesi';

-- ═══════════════════════════════════════════
-- TABLO 3: document_derived_items
-- Belgeden AI ile çıkarılan öğeler
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_derived_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
    -- 'proposed_node','proposed_link','evidence','timeline_event'
  item_data JSONB NOT NULL,
    -- proposed_node: { name, type, tier, risk, description, country_tags }
    -- proposed_link: { source_name, target_name, relationship_type, evidence_type, description }
    -- evidence: { title, evidence_type, source_url, confidence }
    -- timeline_event: { date, title, description, importance }
  status TEXT DEFAULT 'pending',
    -- 'pending','approved','rejected','merged'
  approved_by TEXT,
  merged_entity_id UUID,      -- Eğer mevcut bir node/link ile birleştirildiyse
  confidence FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE document_derived_items IS 'Sprint 16: Belgeden AI ile çıkarılan kişi/kurum/ilişki önerileri';

-- ═══════════════════════════════════════════
-- TABLO 4: document_scan_queue
-- Topluluk tarama kuyruğu
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_scan_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  assigned_to TEXT,            -- fingerprint (NULL = açık görev)
  assigned_at TIMESTAMPTZ,
  priority INT DEFAULT 0,      -- Yüksek = önce
  deadline TIMESTAMPTZ,        -- Atama süresi (30 dk)
  status TEXT DEFAULT 'open',
    -- 'open','assigned','completed','expired'
  scan_result JSONB,
  reputation_earned FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE document_scan_queue IS 'Sprint 16: Topluluk belge tarama kuyruğu (gamification)';

-- ═══════════════════════════════════════════
-- TABLO 5: external_document_sources
-- Dış kaynak konfigürasyonu
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS external_document_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
    -- 'courtlistener','icij','opensanctions','documentcloud'
  display_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_env TEXT,            -- ENV variable adı (örn: 'COURTLISTENER_API_KEY')
  rate_limit_per_hour INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_cursor JSONB,           -- Son sync noktası (sayfa, tarih, vb.)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE external_document_sources IS 'Sprint 16: Dış belge kaynakları konfigürasyonu';

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_network_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_derived_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_document_sources ENABLE ROW LEVEL SECURITY;

-- Herkes public belgeleri okuyabilir
CREATE POLICY "documents_select_public" ON documents
  FOR SELECT USING (is_public = true);

CREATE POLICY "documents_insert_all" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "documents_update_owner" ON documents
  FOR UPDATE USING (true);

-- Eşleştirmeler herkese açık
CREATE POLICY "doc_mappings_select" ON document_network_mappings
  FOR SELECT USING (true);

CREATE POLICY "doc_mappings_insert" ON document_network_mappings
  FOR INSERT WITH CHECK (true);

-- Derived items herkese açık
CREATE POLICY "derived_items_select" ON document_derived_items
  FOR SELECT USING (true);

CREATE POLICY "derived_items_insert" ON document_derived_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "derived_items_update" ON document_derived_items
  FOR UPDATE USING (true);

-- Scan queue herkese açık
CREATE POLICY "scan_queue_select" ON document_scan_queue
  FOR SELECT USING (true);

CREATE POLICY "scan_queue_insert" ON document_scan_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "scan_queue_update" ON document_scan_queue
  FOR UPDATE USING (true);

-- External sources sadece okuma
CREATE POLICY "ext_sources_select" ON external_document_sources
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════
-- İNDEKSLER
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_documents_network ON documents(network_id);
CREATE INDEX IF NOT EXISTS idx_documents_scan_status ON documents(scan_status);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_external ON documents(source_type, external_id);
CREATE INDEX IF NOT EXISTS idx_documents_date_filed ON documents(date_filed DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_doc_mappings_document ON document_network_mappings(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_mappings_network ON document_network_mappings(network_id);

CREATE INDEX IF NOT EXISTS idx_derived_items_document ON document_derived_items(document_id);
CREATE INDEX IF NOT EXISTS idx_derived_items_status ON document_derived_items(status);
CREATE INDEX IF NOT EXISTS idx_derived_items_type ON document_derived_items(item_type);

CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON document_scan_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_scan_queue_document ON document_scan_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_scan_queue_assigned ON document_scan_queue(assigned_to);

-- ═══════════════════════════════════════════
-- SEED DATA: Dış kaynaklar
-- ═══════════════════════════════════════════
INSERT INTO external_document_sources (provider, display_name, base_url, rate_limit_per_hour, is_active, metadata)
VALUES
  ('icij', 'ICIJ Offshore Leaks', 'https://offshoreleaks.icij.org/api/v1', 1000, true,
   '{"description": "Panama Papers, Paradise Papers, Pandora Papers — offshore şirketler, aracılar, adresler", "auth_required": false}'::jsonb),
  ('opensanctions', 'OpenSanctions', 'https://api.opensanctions.org', 1000, true,
   '{"description": "PEP listeleri, yaptırım listeleri, şirket sahiplikleri — 300K+ varlık", "auth_required": false}'::jsonb),
  ('courtlistener', 'CourtListener (RECAP)', 'https://www.courtlistener.com/api/rest/v4', 5000, true,
   '{"description": "ABD federal/eyalet mahkeme kararları, docket dosyaları", "auth_required": true, "env_key": "COURTLISTENER_API_KEY"}'::jsonb),
  ('documentcloud', 'DocumentCloud', 'https://api.www.documentcloud.org/api', 1000, false,
   '{"description": "Gazeteci belgeleri, FOIA yanıtları — MuckRock ortaklığı", "auth_required": true, "env_key": "DOCUMENTCLOUD_API_KEY"}'::jsonb)
ON CONFLICT (provider) DO NOTHING;

-- ═══════════════════════════════════════════
-- RPC: Belge istatistikleri
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_document_stats(p_network_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_documents', COUNT(*),
    'scanned_documents', COUNT(*) FILTER (WHERE scan_status = 'scanned'),
    'pending_scan', COUNT(*) FILTER (WHERE scan_status = 'pending'),
    'total_derived_items', (SELECT COUNT(*) FROM document_derived_items di
                            JOIN documents d ON di.document_id = d.id
                            WHERE (p_network_id IS NULL OR d.network_id = p_network_id)),
    'approved_items', (SELECT COUNT(*) FROM document_derived_items di
                       JOIN documents d ON di.document_id = d.id
                       WHERE di.status = 'approved'
                       AND (p_network_id IS NULL OR d.network_id = p_network_id)),
    'source_breakdown', (SELECT jsonb_object_agg(source_type, cnt)
                         FROM (SELECT source_type, COUNT(*) as cnt
                               FROM documents
                               WHERE (p_network_id IS NULL OR network_id = p_network_id)
                               GROUP BY source_type) sub)
  ) INTO result
  FROM documents
  WHERE (p_network_id IS NULL OR network_id = p_network_id);

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
