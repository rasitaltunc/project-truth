# SPRINT 6B BRIEF — Görsel Ontoloji + Kaynak Provenance + ClaimReview
## "Epistemolojik Katman" — The Evidence Layer

**Project:** Project Truth (ai-os monorepo)
**App:** `apps/dashboard` (Next.js 16 + React 19 + Three.js + Supabase)
**Sprint Goal:** Ağdaki bağlantıları "var/yok" ikili sisteminden, kanıt gücünü ve belirsizliği görsel olarak ifade eden bir epistemolojik katmana dönüştürmek. ClaimReview ile Google indeksleme altyapısını kurmak.
**Kaynak:** STRATEGY_MASTER_BRIEF.md (6 araştırma dokümanı sentezi)
**Öncelik:** Bu sprint, araştırma dokümanlarında tespit edilen en büyük farklılaştırıcıyı (görsel ontoloji) ve en güçlü büyüme kanalını (ClaimReview/Google) hayata geçirir.

---

## 1. CONTEXT & MEVCUT KOD

### Zaten Var Olan Altyapı

```
✅ TruthLink interface — source_id, target_id, relationship_type, strength,
   description, evidence_summary, start_date, end_date, verification_status, source_count
✅ Evidence interface — evidence_type, title, content, file_url, source_name,
   verification_status, ai_extracted_entities, ai_summary
✅ evidence_archive tablosu (Supabase)
✅ community_evidence tablosu + oylama sistemi
✅ Truth3DScene.tsx — 3D render engine, highlight API, glow ring sistemi
✅ ChatPanel.tsx — Groq AI chat, highlight → 3D pipeline
✅ ArchiveModal.tsx — 4 tab (Özet/Bağlantılar/Kanıtlar/Timeline)
✅ reputation_transactions tablosu + staking altyapısı (Sprint 6A)
✅ badgeStore.ts — Zustand, fingerprint bazlı badge yönetimi
✅ /api/evidence/submit, /api/evidence/resolve, /api/evidence/pending
```

### Sprint 6B'de Yapılacak Değişiklikler

Araştırma dokümanlarının net sonucu: **Hiçbir rakip epistemolojik belirsizliği görselleştirmiyor.** Bu, Project Truth'un en büyük farklılaştırıcısı. Ayrıca ClaimReview/JSON-LD entegrasyonu sıfır maliyetli organik büyüme sağlar.

---

## 2. VERİTABANI DEĞİŞİKLİKLERİ

### 2A. Links Tablosu Genişletme

```sql
-- SPRINT_6B_MIGRATION.sql

-- Bağlantılara epistemolojik metadata ekle
ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_type TEXT
  DEFAULT 'inference'
  CHECK (evidence_type IN (
    'court_record',       -- Mahkeme kaydı (en güçlü)
    'official_document',  -- Resmi belge
    'leaked_document',    -- Sızdırılmış belge
    'financial_record',   -- Finansal kayıt
    'witness_testimony',  -- Tanık ifadesi
    'news_major',         -- Ana akım medya haberi
    'news_minor',         -- Yerel/küçük medya
    'social_media',       -- Sosyal medya
    'academic_paper',     -- Akademik makale
    'rumor',              -- Söylenti
    'inference'           -- AI/kullanıcı çıkarımı
  ));

ALTER TABLE links ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(3,2)
  DEFAULT 0.50
  CHECK (confidence_level BETWEEN 0.00 AND 1.00);
  -- 0.00 = tamamen belirsiz, 1.00 = kesin kanıt
  -- 3D'de: 0.0-0.3 = kesikli çizgi, 0.3-0.7 = yarı saydam, 0.7-1.0 = solid parlak

ALTER TABLE links ADD COLUMN IF NOT EXISTS source_hierarchy TEXT
  DEFAULT 'tertiary'
  CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary'));
  -- Snopes kaynak hiyerarşisi

ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;
  -- Bu bağlantıyı destekleyen kanıt sayısı (kalınlık çarpanı)
```

### 2B. Evidence Provenance Tablosu (Yeni)

```sql
CREATE TABLE IF NOT EXISTS evidence_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL,
  evidence_table TEXT NOT NULL
    CHECK (evidence_table IN ('evidence_archive', 'community_evidence')),

  -- Kaynak bilgisi
  source_type TEXT NOT NULL
    CHECK (source_type IN (
      'court_record', 'official_document', 'leaked_document',
      'financial_record', 'witness_testimony', 'news_major',
      'news_minor', 'social_media', 'academic_paper', 'rumor'
    )),
  source_hierarchy TEXT NOT NULL DEFAULT 'tertiary'
    CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary')),

  -- Doğrulama zinciri
  source_url TEXT,
  source_archive_url TEXT,     -- Web Archive snapshot URL
  source_hash TEXT,            -- SHA-256 of original document
  verification_chain JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "user_id": "...", "action": "verify|dispute", "timestamp": "...", "method": "..." }]

  metadata_stripped BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_provenance_evidence ON evidence_provenance(evidence_id);
CREATE INDEX IF NOT EXISTS idx_provenance_type ON evidence_provenance(source_type);
CREATE INDEX IF NOT EXISTS idx_provenance_hierarchy ON evidence_provenance(source_hierarchy);

-- RLS
ALTER TABLE evidence_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read provenance" ON evidence_provenance FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON evidence_provenance FOR INSERT WITH CHECK (true);
```

### 2C. Evidence Archive Genişletme (ClaimReview)

```sql
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_json JSONB;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_published BOOLEAN DEFAULT false;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rating TEXT
  CHECK (ifcn_rating IN (
    'true', 'mostly_true', 'half_true',
    'mostly_false', 'false', 'pants_on_fire',
    'missing_context', 'unverifiable'
  ));
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rating_date TIMESTAMPTZ;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rated_by TEXT; -- user fingerprint
```

### 2D. RPC Functions

```sql
-- Bağlantı confidence güncelle (kanıt eklendiğinde otomatik)
CREATE OR REPLACE FUNCTION recalculate_link_confidence(p_link_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_confidence NUMERIC;
  v_evidence_count INTEGER;
BEGIN
  -- Bağlantıya ait kanıtların ağırlıklı ortalaması
  SELECT
    COALESCE(AVG(
      CASE ep.source_hierarchy
        WHEN 'primary' THEN 0.9
        WHEN 'secondary' THEN 0.6
        WHEN 'tertiary' THEN 0.3
      END *
      CASE ep.source_type
        WHEN 'court_record' THEN 1.0
        WHEN 'official_document' THEN 0.9
        WHEN 'leaked_document' THEN 0.8
        WHEN 'financial_record' THEN 0.85
        WHEN 'witness_testimony' THEN 0.7
        WHEN 'news_major' THEN 0.65
        WHEN 'news_minor' THEN 0.5
        WHEN 'academic_paper' THEN 0.75
        WHEN 'social_media' THEN 0.3
        WHEN 'rumor' THEN 0.15
        ELSE 0.2
      END
    ), 0.5),
    COUNT(*)
  INTO v_confidence, v_evidence_count
  FROM evidence_archive ea
  JOIN evidence_provenance ep ON ep.evidence_id = ea.id
  WHERE ea.link_id = p_link_id;

  UPDATE links
  SET confidence_level = v_confidence,
      evidence_count = v_evidence_count
  WHERE id = p_link_id;

  RETURN v_confidence;
END;
$$ LANGUAGE plpgsql;

-- ClaimReview JSON üret
CREATE OR REPLACE FUNCTION generate_claim_review(p_evidence_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_evidence RECORD;
  v_claim_review JSONB;
BEGIN
  SELECT * INTO v_evidence FROM evidence_archive WHERE id = p_evidence_id;

  IF v_evidence IS NULL OR v_evidence.ifcn_rating IS NULL THEN
    RETURN NULL;
  END IF;

  v_claim_review := jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'ClaimReview',
    'datePublished', v_evidence.ifcn_rating_date,
    'claimReviewed', v_evidence.title,
    'reviewRating', jsonb_build_object(
      '@type', 'Rating',
      'ratingValue', CASE v_evidence.ifcn_rating
        WHEN 'true' THEN 5
        WHEN 'mostly_true' THEN 4
        WHEN 'half_true' THEN 3
        WHEN 'mostly_false' THEN 2
        WHEN 'false' THEN 1
        WHEN 'pants_on_fire' THEN 0
        WHEN 'missing_context' THEN 3
        WHEN 'unverifiable' THEN 2
        ELSE 2
      END,
      'bestRating', 5,
      'worstRating', 0,
      'alternateName', v_evidence.ifcn_rating
    ),
    'author', jsonb_build_object(
      '@type', 'Organization',
      'name', 'Project Truth',
      'url', 'https://projecttruth.org'
    )
  );

  UPDATE evidence_archive
  SET claim_review_json = v_claim_review,
      claim_review_published = true
  WHERE id = p_evidence_id;

  RETURN v_claim_review;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. GÖRSEL ONTOLOJİ — 3D SCENE DEĞİŞİKLİKLERİ

### 3A. Truth3DScene.tsx — Link Render Güncellemesi

Mevcut durum: Tüm linkler aynı kalınlıkta, aynı opacity'de çiziliyor.
Hedef: Her link'in `evidence_type`, `confidence_level` ve `evidence_count`'una göre farklı görsel ifade.

```typescript
// Truth3DScene.tsx'e eklenecek yardımcı fonksiyonlar

// Kanıt tipine göre renk
function getEvidenceColor(evidenceType: string): string {
  const colors: Record<string, string> = {
    court_record: '#22c55e',      // Yeşil — en güçlü
    official_document: '#3b82f6', // Mavi
    leaked_document: '#f59e0b',   // Amber
    financial_record: '#8b5cf6',  // Mor
    witness_testimony: '#06b6d4', // Cyan
    news_major: '#e5e5e5',        // Beyaz
    news_minor: '#a3a3a3',        // Gri
    academic_paper: '#6366f1',    // İndigo
    social_media: '#737373',      // Koyu gri
    rumor: '#525252',             // Çok koyu gri, kesikli
    inference: '#404040',         // En koyu
  };
  return colors[evidenceType] || '#404040';
}

// Confidence → opacity + dash pattern
function getConfidenceVisual(confidence: number): { opacity: number; dashArray?: string } {
  if (confidence >= 0.7) return { opacity: 0.9 };                    // Solid, parlak
  if (confidence >= 0.4) return { opacity: 0.5, dashArray: '8 4' };  // Yarı saydam, uzun kesik
  return { opacity: 0.25, dashArray: '4 8' };                        // Soluk, kısa kesik
}

// Evidence count → kalınlık
function getEvidenceThickness(count: number): number {
  if (count >= 5) return 3.0;    // Çok kanıtlı: kalın
  if (count >= 3) return 2.0;    // Orta
  if (count >= 1) return 1.2;    // Az
  return 0.6;                     // Kanıtsız: ince
}
```

**Uygulama noktası:** Truth3DScene.tsx'te link çizim döngüsünde, her link için bu fonksiyonları çağırarak `lineWidth`, `opacity`, `color` ve `dashArray` dinamik ayarlanacak. Three.js'te `LineDashedMaterial` kullanılacak.

### 3B. Link Üstü İkon/Badge Sistemi

Her link'in ortasında, kanıt tipini gösteren küçük bir ikon (sprite):

```
📜 court_record      — Mahkeme
📄 official_document — Resmi belge
🔓 leaked_document   — Sızıntı
💰 financial_record  — Para
👤 witness_testimony — Tanık
📰 news_major        — Haber
📱 social_media      — Sosyal medya
❓ rumor             — Söylenti
🔬 academic_paper    — Akademik
💭 inference         — Çıkarım
```

Sprite, link'in orta noktasında (`midpoint = (source + target) / 2`) yerleştirilecek. Hover'da tooltip: "{evidence_type} — Confidence: {confidence_level}%"

### 3C. Legend (Gösterge Paneli)

Sahnenin sol alt köşesinde küçük bir HTML overlay:
- Çizgi kalınlığı açıklaması (ince → kalın = az kanıt → çok kanıt)
- Çizgi stili açıklaması (kesikli → solid = düşük güven → yüksek güven)
- Renk açıklaması (kanıt tipi renkleri)
- Toggle: "Epistemolojik mod" açma/kapama

---

## 4. API ROUTE'LARI

### 4A. `/api/evidence/provenance/route.ts` (YENİ)

```typescript
// GET: Bir kanıtın provenance zinciri
// POST: Yeni provenance kaydı ekle

GET /api/evidence/provenance?evidence_id=uuid
→ evidence_provenance kayıtları, verification_chain dahil

POST /api/evidence/provenance
{
  evidence_id: string,
  evidence_table: 'evidence_archive' | 'community_evidence',
  source_type: string,
  source_hierarchy: 'primary' | 'secondary' | 'tertiary',
  source_url?: string,
  source_hash?: string,
  language?: string
}
→ Yeni provenance kaydı + bağlı link'in confidence otomatik güncelleme
```

### 4B. `/api/evidence/[id]/claimreview/route.ts` (YENİ)

```typescript
// GET: Bir kanıtın ClaimReview JSON-LD çıktısı
// POST: IFCN rating ekle/güncelle (Tier 3+ yetki gerekli)

GET /api/evidence/{id}/claimreview
→ ClaimReview JSON-LD (Schema.org formatı)
→ Content-Type: application/ld+json

POST /api/evidence/{id}/claimreview
{
  ifcn_rating: 'true' | 'mostly_true' | ... ,
  rated_by: string // user fingerprint
}
→ ifcn_rating güncelle + claim_review_json otomatik üret
→ Yetki: badge tier >= 3 (Gazeteci)
```

### 4C. `/api/links/confidence/route.ts` (YENİ)

```typescript
// POST: Bir link'in confidence seviyesini yeniden hesapla
// GET: Tüm linklerin confidence haritası (3D scene için)

GET /api/links/confidence
→ { links: [{ id, confidence_level, evidence_type, evidence_count, source_hierarchy }] }

POST /api/links/confidence
{ link_id: string }
→ recalculate_link_confidence RPC çağır → güncel confidence döndür
```

### 4D. `/api/export/graphml/route.ts` (YENİ)

```typescript
// GET: Mevcut ağı GraphML formatında dışa aktar

GET /api/export/graphml?network_id=uuid
→ Content-Type: application/xml
→ GraphML dosyası (node attributes + link attributes + evidence metadata)

// Akademik kullanıcılar için: Gephi, networkx, igraph uyumlu
```

---

## 5. STORE DEĞİŞİKLİKLERİ

### 5A. truthStore.ts — Link Metadata Genişletme

```typescript
// TruthLink interface genişletme (supabaseClient.ts'te)
export interface TruthLink {
  // ... mevcut alanlar ...
  evidence_type?: string;
  confidence_level?: number;
  source_hierarchy?: 'primary' | 'secondary' | 'tertiary';
  evidence_count?: number;
}
```

### 5B. Yeni evidenceStore.ts (veya mevcut store genişletme)

```typescript
interface EvidenceState {
  // Provenance
  provenanceMap: Record<string, EvidenceProvenance[]>;
  fetchProvenance(evidenceId: string): Promise<void>;
  addProvenance(data: NewProvenance): Promise<void>;

  // ClaimReview
  claimReviews: Record<string, ClaimReview>;
  fetchClaimReview(evidenceId: string): Promise<void>;
  submitIfcnRating(evidenceId: string, rating: string): Promise<void>;

  // Link Confidence
  linkConfidenceMap: Record<string, LinkConfidence>;
  fetchAllConfidences(): Promise<void>;
  recalculateConfidence(linkId: string): Promise<void>;

  // Visual Ontology toggle
  epistemologicalMode: boolean;
  toggleEpistemologicalMode(): void;
}
```

---

## 6. UI BİLEŞENLERİ

### 6A. EpistemologicalLegend.tsx (YENİ)

Sol alt köşe overlay. İçerik:
- Çizgi kalınlığı skalası (kanıt sayısı)
- Çizgi stili skalası (confidence seviyesi)
- Renk anahtarı (kanıt tipleri)
- Toggle switch: "Epistemolojik Mod"
- Kapalıyken: tüm linkler mevcut görünüm (basit)
- Açıkken: tam ontoloji görselleştirme

### 6B. ProvenancePanel.tsx (YENİ)

ArchiveModal'ın "Kanıtlar" tabında, her kanıtın altında açılır provenance detayı:
- Kaynak tipi badge'i (ikon + renk)
- Kaynak hiyerarşisi (birincil/ikincil/üçüncül)
- Doğrulama zinciri (kim, ne zaman, nasıl)
- Orijinal kaynak linki + arşiv snapshot linki
- SHA-256 hash (belge bütünlüğü kanıtı)

### 6C. ClaimReviewBadge.tsx (YENİ)

Kanıt kartlarının köşesinde küçük IFCN rating badge'i:
- Renge göre daire: Yeşil (true) → Kırmızı (false)
- Tooltip: Detaylı açıklama + değerlendiren kişi + tarih
- Tıklanınca: JSON-LD çıktısını göster (geliştirici modu)

### 6D. ArchiveModal.tsx — Güncelleme

"Kanıtlar" tabına ekleme:
- Her kanıtın yanında kaynak hiyerarşisi ikonu (🏛️ birincil / 📰 ikincil / 💬 üçüncül)
- Provenance açılır detay
- ClaimReview badge (varsa)
- "IFCN Rating Ekle" butonu (Tier 3+ kullanıcılar için)

### 6E. LinkDetailTooltip.tsx (YENİ)

3D'de link hover'da gösterilecek tooltip:
- Bağlantı açıklaması
- Kanıt tipi + confidence yüzdesi
- Kaynak hiyerarşisi
- Destekleyen kanıt sayısı
- "Detayları gör" butonu → ArchiveModal aç

---

## 7. DİNAMİK STAKİNG MODELİ GÜNCELLEMESİ

### 7A. Mevcut Sabit Modeli Değiştir

Mevcut (`/api/evidence/submit/route.ts`):
```
Deposit: -5 (sabit)
Approved: +15 (sabit)
Rejected: -10 (sabit)
```

Yeni:
```typescript
// lib/reputation.ts güncellemesi

function calculateStake(userReputation: number, stakePercent: number): number {
  // Kullanıcı itibarının %1-10'u arasında seçer
  return Math.floor(userReputation * (stakePercent / 100));
}

function calculateReward(stake: number, evidenceType: string): number {
  const multipliers: Record<string, number> = {
    court_record: 2.0,
    official_document: 1.8,
    leaked_document: 1.6,
    financial_record: 1.7,
    witness_testimony: 1.3,
    news_major: 1.2,
    news_minor: 1.0,
    academic_paper: 1.4,
    social_media: 0.8,
    rumor: 0.5,
  };
  return Math.floor(stake * (multipliers[evidenceType] || 1.0));
}

function calculateSlash(
  stake: number,
  severity: 'good_faith' | 'misleading' | 'malicious',
  consecutiveRejects: number
): number {
  const severityMultiplier = { good_faith: 0.5, misleading: 1.0, malicious: 2.0 };
  const correlationPenalty = Math.pow(1.5, Math.min(consecutiveRejects, 4));
  return Math.floor(stake * severityMultiplier[severity] * correlationPenalty);
}

function applyHalfLifeDecay(reputation: number, daysInactive: number): number {
  // Her 60 günde %50 azalma
  return Math.floor(reputation * Math.pow(0.5, daysInactive / 60));
}
```

### 7B. API Güncellemesi

`/api/evidence/submit/route.ts` → dinamik stake kabul etsin:
```typescript
// Request body genişletme:
{
  // ... mevcut alanlar ...
  stake_percent: number,   // 1-10 arası
  source_type: string,     // provenance kaynak tipi
  source_hierarchy: string // birincil/ikincil/üçüncül
}
```

`/api/evidence/resolve/route.ts` → dinamik slashing:
```typescript
// Severity parametresi ekle:
{
  // ... mevcut alanlar ...
  severity: 'good_faith' | 'misleading' | 'malicious'
}
```

---

## 8. KRİTİK DOSYALAR

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `SPRINT_6B_MIGRATION.sql` | YENİ | DB migration (links genişletme, provenance, ClaimReview) |
| `components/EpistemologicalLegend.tsx` | YENİ | 3D görsel ontoloji göstergesi |
| `components/ProvenancePanel.tsx` | YENİ | Kanıt provenance detay paneli |
| `components/ClaimReviewBadge.tsx` | YENİ | IFCN rating badge'i |
| `components/LinkDetailTooltip.tsx` | YENİ | 3D link hover tooltip |
| `app/api/evidence/provenance/route.ts` | YENİ | Provenance CRUD |
| `app/api/evidence/[id]/claimreview/route.ts` | YENİ | ClaimReview JSON-LD |
| `app/api/links/confidence/route.ts` | YENİ | Link confidence hesaplama |
| `app/api/export/graphml/route.ts` | YENİ | Akademik GraphML dışa aktarım |
| `lib/supabaseClient.ts` | GÜNCELLE | TruthLink interface genişletme |
| `lib/reputation.ts` | GÜNCELLE | Dinamik staking fonksiyonları |
| `store/truthStore.ts` | GÜNCELLE | Link metadata state |
| `components/Truth3DScene.tsx` | GÜNCELLE | Görsel ontoloji render |
| `components/ArchiveModal.tsx` | GÜNCELLE | Provenance + ClaimReview UI |
| `app/api/evidence/submit/route.ts` | GÜNCELLE | Dinamik stake |
| `app/api/evidence/resolve/route.ts` | GÜNCELLE | Dinamik slashing |
| `app/truth/page.tsx` | GÜNCELLE | Legend + tooltip entegrasyonu |

---

## 9. UYGULAMA SIRASI

| Sıra | İş | Dosyalar | Tahmini |
|------|----|----------|---------|
| 1 | DB Migration (SQL) | SPRINT_6B_MIGRATION.sql | 30 dk |
| 2 | supabaseClient.ts interface güncelle | lib/supabaseClient.ts | 15 dk |
| 3 | Provenance API + store | api/evidence/provenance, store | 45 dk |
| 4 | ClaimReview API | api/evidence/[id]/claimreview | 45 dk |
| 5 | Link confidence API | api/links/confidence | 30 dk |
| 6 | reputation.ts dinamik staking | lib/reputation.ts | 30 dk |
| 7 | evidence/submit + resolve güncelle | api/evidence/* | 30 dk |
| 8 | Truth3DScene görsel ontoloji | components/Truth3DScene.tsx | 1.5 saat |
| 9 | EpistemologicalLegend.tsx | components/ | 30 dk |
| 10 | ProvenancePanel.tsx | components/ | 30 dk |
| 11 | ClaimReviewBadge.tsx | components/ | 20 dk |
| 12 | LinkDetailTooltip.tsx | components/ | 20 dk |
| 13 | ArchiveModal güncelle | components/ArchiveModal.tsx | 30 dk |
| 14 | truth/page.tsx entegrasyon | app/truth/page.tsx | 20 dk |
| 15 | GraphML export API | api/export/graphml | 30 dk |
| 16 | Mevcut linklere seed data | SQL seed script | 20 dk |
| 17 | Test + polish | Tüm dosyalar | 45 dk |

**Toplam tahmini: ~8.5 saat**

---

## 10. DOĞRULAMA (Verification)

Test akışı:
1. `/truth` sayfası aç → Linkler farklı kalınlıkta mı? (evidence_count bazlı)
2. Düşük confidence link → kesikli çizgi mi? Yüksek confidence → solid mi?
3. Farklı evidence_type linkler → farklı renklerde mi?
4. Link hover → tooltip gösteriyor mu? (tip, confidence, kaynak sayısı)
5. Epistemolojik Mod toggle → açınca/kapayınca görünüm değişiyor mu?
6. ArchiveModal'da kanıt → provenance detayı açılıyor mu?
7. Tier 3 kullanıcı → "IFCN Rating Ekle" butonu görünüyor mu?
8. IFCN rating eklendi → ClaimReview badge görünüyor mu?
9. `/api/evidence/{id}/claimreview` → geçerli JSON-LD dönüyor mu?
10. Dinamik staking → stake_percent parametresi çalışıyor mu?
11. Ardışık red → correlation penalty artıyor mu?
12. `/api/export/graphml` → Gephi'de açılıyor mu?
13. Mevcut Epstein ağı → seed data ile renkli/kalın linkler oluştu mu?

---

## 11. SEED DATA ÖRNEĞİ (Epstein Ağı)

```sql
-- Epstein → Ghislaine Maxwell: Mahkeme kayıtlı, çok kanıtlı
UPDATE links SET
  evidence_type = 'court_record',
  confidence_level = 0.95,
  source_hierarchy = 'primary',
  evidence_count = 12
WHERE description ILIKE '%Maxwell%' OR description ILIKE '%Ghislaine%';

-- Epstein → Prince Andrew: Tanık ifadeleri + haberler
UPDATE links SET
  evidence_type = 'witness_testimony',
  confidence_level = 0.72,
  source_hierarchy = 'secondary',
  evidence_count = 6
WHERE description ILIKE '%Prince%Andrew%' OR description ILIKE '%Andrew%';

-- Epstein → Hawking: Sosyal medya + söylenti, düşük güven
UPDATE links SET
  evidence_type = 'social_media',
  confidence_level = 0.30,
  source_hierarchy = 'tertiary',
  evidence_count = 2
WHERE description ILIKE '%Hawking%';
```

---

**Son Güncelleme:** 7 Mart 2026
**Referans:** STRATEGY_MASTER_BRIEF.md, SPRINT_6A_BRIEF.md
