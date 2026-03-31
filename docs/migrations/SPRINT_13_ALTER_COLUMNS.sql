-- ============================================================================
-- SPRINT 13: KOLON GENİŞLETME — NODE_ENRICHMENT_SEED öncesi çalıştır
-- ============================================================================
-- nodes tablosundaki varchar(3) kolonları genişletir.
-- Bu olmadan occupation='financier', nationality='American' gibi değerler sığmaz.
-- ============================================================================

-- Önce mevcut kolon tiplerini kontrol et (opsiyonel):
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'nodes'
-- AND character_maximum_length IS NOT NULL
-- ORDER BY character_maximum_length;

-- ═══ KOLON GENİŞLETME ═══

-- occupation: 'financier', 'victim-advocate', 'model agent' gibi değerler
ALTER TABLE public.nodes ALTER COLUMN occupation TYPE TEXT;

-- nationality: 'American', 'British', 'Slovakian-American' gibi değerler
ALTER TABLE public.nodes ALTER COLUMN nationality TYPE TEXT;

-- type: 'person', 'location', 'organization' gibi değerler
ALTER TABLE public.nodes ALTER COLUMN type TYPE TEXT;

-- country_tags: ['USA', 'GBR', 'USVI'] — USVI 4 karakter
-- Eğer varchar(3)[] ise genişlet
ALTER TABLE public.nodes ALTER COLUMN country_tags TYPE TEXT[];

-- ============================================================================
-- Bu SQL'i çalıştırdıktan sonra NODE_ENRICHMENT_SEED.sql çalıştırılabilir.
-- ============================================================================
