# SPRINT 6C — "KONUŞAN İPLER" (Talking Links)
## Mimari Doküman & Kodlama Rehberi

> "İpler sadece bağlantı göstermiyor — hikaye anlatıyor."

---

## 1. VİZYON

Şu an ipler statik (normal mod) veya elektrik akımı taşıyan (epistemolojik mod) kablolar.
Sprint 6C ile ipler **canlı bilgi kanallarına** dönüşüyor:

- Her akan ışık = **gerçek bir kanıt** (mahkeme kaydı, finansal transfer, tanık ifadesi)
- Işığa tıklayınca = **3D sahne içinde floating panel** açılıyor (HTML pencere DEĞİL)
- İpe tıklayınca = **Kronolojik Koridor modu** — tüm kanıtlar zaman tüneli olarak keşfedilir

```
NORMAL MOD          EPİSTEMOLOJİK MOD         KRONOLOJİK KORİDOR
┌──────────┐        ┌──────────────┐          ┌─────────────────┐
│ Statik   │  →→→   │ Elektrik     │   →→→    │ Zaman Tüneli    │
│ ipler    │        │ akımı        │          │ her ışık=kanıt  │
│ ağ formu │        │ bilgi trafiği│          │ tıkla→panel aç  │
└──────────┘        └──────────────┘          └─────────────────┘
```

---

## 2. MİMARİ KATMANLAR

### Katman 1: Data-Driven Pulse (Sahte → Gerçek)
**Şu an:** Pulse sayısı `evidence_count`'a göre sabit (1-3 arası)
**Hedef:** Her pulse = 1 gerçek evidence_archive kaydı

```typescript
// MEVCUT: sabit pulse sayısı
const pulseCount = evidenceCount >= 5 ? 3 : evidenceCount >= 2 ? 2 : 1;

// YENİ: her evidence bir pulse
interface EvidencePulse {
  evidenceId: string;        // evidence_archive.id
  evidenceType: string;      // court_record, financial_record, vb.
  title: string;             // Kısa başlık
  sourceDate: string | null; // Kronolojik sıralama için
  confidenceLevel: number;   // 0-1 güven skoru
  verificationStatus: string;// verified, pending, disputed
  pulsePosition: number;     // 0-1 arası shader pozisyonu
}
```

**Veri Akışı:**
```
truth/page.tsx
  → /api/truth/link-evidence?sourceId=X&targetId=Y  (YENİ ROUTE)
  → evidence_archive JOIN evidence_provenance
  → linkEvidenceStore.ts  (YENİ ZUSTAND STORE)
  → Truth3DScene props: linkEvidenceMap
  → Shader: uPulseCount = gerçek evidence sayısı
```

### Katman 2: Floating 3D Panel (Uzayda Yüzen Bilgi)
**Yaklaşım:** Three.js `CanvasTexture` on `PlaneGeometry`

HTML overlay DEĞİL. Panel 3D sahnenin parçası olacak — rotate edildiğinde,
zoom yapıldığında sahneyle birlikte hareket edecek.

```
Floating Panel Anatomy:
┌─────────────────────────────────────┐
│  📜 MAHKEME KAYDI                   │  ← Kanıt tipi ikonu + etiket
│  ─────────────────────────────────  │
│  "Epstein v. Edwards Davası"        │  ← Başlık
│  Florida Güney Bölge Mahkemesi      │  ← Kaynak
│  12 Haziran 2008                    │  ← Tarih
│                                     │
│  ██████████░░  %78 Güven            │  ← Confidence bar
│                                     │
│  🏛️ Birincil Kaynak                 │  ← Hiyerarşi
│  ✅ 3 bağımsız doğrulama            │  ← Verification count
│                                     │
│  [Kaynağı Gör] [Provenance Zinciri] │  ← Aksiyon butonları
└─────────────────────────────────────┘
```

**Teknik Implementasyon:**
```typescript
// Canvas → Texture → Plane (3D sahne içi panel)
function createEvidencePanel(evidence: EvidencePulse, position: THREE.Vector3): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;

    // Panel arka plan — koyu, yarı saydam, federal indictment estetiği
    ctx.fillStyle = 'rgba(5, 5, 5, 0.92)';
    roundRect(ctx, 0, 0, 512, 320, 8);
    ctx.fill();

    // Sol kenar çizgisi — kanıt tipine göre renk
    ctx.fillStyle = getEvidenceColor(evidence.evidenceType);
    ctx.fillRect(0, 0, 4, 320);

    // İçerik render (başlık, tarih, güven barı, vb.)
    renderPanelContent(ctx, evidence);

    // Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(8, 5); // Dünya koordinatlarında boyut
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,          // Fade-in ile açılacak
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const panel = new THREE.Mesh(geo, mat);
    panel.position.copy(position);
    panel.lookAt(camera.position); // Billboard — her zaman kameraya bak
    panel.userData = { isEvidencePanel: true, evidenceId: evidence.evidenceId };

    return panel;
}
```

**Açılış Animasyonu:**
```
1. Işık hüzmesine tıkla
2. Işık duraksıyor (pulse freeze)
3. Panel o noktada spawn oluyor (scale: 0 → 1, opacity: 0 → 1)
4. Diğer pulse'lar yavaşlıyor (dikkat odağı)
5. Hafif kamera dolly (yaklaşma)
6. Panel'e Billboard.lookAt(camera) — her açıdan okunabilir
7. Panel dışına tıklayınca: reverse animation → pulse devam
```

### Katman 3: Kronolojik Koridor (Sinematik Keşif)
**Tetiklenme:** İpe tıkla → "Kronolojik Görünüm" butonu → Koridor modu

```
Kronolojik Koridor Modu:

  2006          2008           2010          2012          2015
   │             │              │             │             │
   ◉─────────── ◉ ─────────── ◉ ─────────── ◉ ─────────── ◉
   │             │              │             │             │
 İlk temas    Mahkeme        Anlaşma      Yeni ifade     Son kanıt
               kaydı

 ← Kamera bu hat boyunca ilerliyor, her noktada duraksıyor →
```

**Mimari:**
1. İpin geometrisi korunuyor (source→target pozisyonu)
2. Evidence'lar `sourceDate`'e göre sıralanıyor
3. Her evidence ip üzerinde kronolojik pozisyona yerleşiyor
4. Kamera ipin başından sonuna doğru **ray üzerinde** ilerliyor
5. Her evidence noktasında:
   - Kamera yavaşlıyor
   - Floating panel açılıyor
   - 2-3 saniye duraksıyor (kullanıcı okusun)
   - Sonra bir sonrakine geçiyor
6. Kullanıcı müdahale edebilir:
   - Tıklayarak bir noktada durabilir
   - Sürükleyerek ileri/geri gidebilir
   - ESC ile çıkabilir

**Kamera Matematiği:**
```typescript
// İp vektörü boyunca lerp
const corridorProgress = 0; // 0=ilk kanıt, 1=son kanıt
const pointOnLine = startPos.clone().lerp(endPos, corridorProgress);

// Kamerayı ipin yanına, hafif yüksekte konumlandır
const lineDir = endPos.clone().sub(startPos).normalize();
const up = new THREE.Vector3(0, 1, 0);
const sideOffset = new THREE.Vector3().crossVectors(lineDir, up).normalize().multiplyScalar(8);
const heightOffset = new THREE.Vector3(0, 4, 0);

camera.position.copy(pointOnLine).add(sideOffset).add(heightOffset);
camera.lookAt(pointOnLine);
```

---

## 3. VERİTABANI DEĞİŞİKLİKLERİ

### Yeni Tablo: `link_evidence_timeline`
```sql
CREATE TABLE link_evidence_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    evidence_id UUID REFERENCES evidence_archive(id) ON DELETE CASCADE,

    -- Kronolojik sıralama
    event_date TIMESTAMPTZ,           -- Olayın gerçek tarihi
    date_precision TEXT DEFAULT 'day', -- day/month/year/approximate

    -- Akış yönü (X→Y mi Y→X mi)
    direction TEXT DEFAULT 'bidirectional', -- source_to_target / target_to_source / bidirectional

    -- Görsel ağırlık (3D'de pulse boyutu/hızı)
    visual_weight FLOAT DEFAULT 1.0,  -- 0.1-3.0 (kilit olay=3, rutin=0.5)

    -- Kısa etiket (3D panelde gösterilecek)
    display_label TEXT NOT NULL,       -- "Banka Transferi $4.5M"
    display_summary TEXT,              -- 1-2 cümle özet

    -- Topluluk ağırlığı
    community_votes INT DEFAULT 0,    -- Oylama (kilit olay tespiti)
    is_keystone BOOLEAN DEFAULT FALSE, -- Kilit olay mı? (oy eşiği aşınca TRUE)

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(link_id, evidence_id)
);

-- Performans indeksleri
CREATE INDEX idx_let_link ON link_evidence_timeline(link_id);
CREATE INDEX idx_let_date ON link_evidence_timeline(event_date);
CREATE INDEX idx_let_keystone ON link_evidence_timeline(is_keystone) WHERE is_keystone = TRUE;
```

### Seed Data (Epstein Network)
```sql
-- Örnek: Jeffrey Epstein ↔ Deutsche Bank bağlantısı
INSERT INTO link_evidence_timeline (link_id, evidence_id, event_date, direction, visual_weight, display_label, display_summary)
VALUES
-- Bu INSERT'ler link_id ve evidence_id'leri migration'dan sonra
-- gerçek UUID'lerle doldurulacak. Şablon:
-- ('link_uuid', 'evidence_uuid', '2013-01-15', 'source_to_target', 2.0,
--  'Hesap Açılışı', 'Deutsche Bank Epstein için özel bankacılık hesabı açtı'),
-- ('link_uuid', 'evidence_uuid', '2015-06-20', 'bidirectional', 1.5,
--  'Şüpheli Transfer $2.7M', 'Shell company üzerinden transfer tespit edildi'),
-- ('link_uuid', 'evidence_uuid', '2019-07-08', 'target_to_source', 3.0,
--  'Hesap Kapatma', 'Deutsche Bank tüm Epstein hesaplarını kapattı — basın baskısı'),
```

---

## 4. YENİ API ROUTE'LARI

### GET /api/truth/link-evidence
```typescript
// Bir link'e ait tüm evidence timeline'ı getir
// Query: ?sourceId=X&targetId=Y veya ?linkId=Z
// Response:
{
  link: { sourceId, targetId, sourceLabel, targetLabel, type },
  evidences: EvidencePulse[],  // Kronolojik sıralı
  totalCount: number,
  keystoneCount: number,       // Kilit olay sayısı
  dateRange: { earliest: string, latest: string },
}
```

### POST /api/truth/link-evidence/vote
```typescript
// Kilit olay oylaması
// Body: { evidenceTimelineId, vote: 'keystone' | 'routine' }
// is_keystone eşiği: 5+ keystone oy
```

---

## 5. YENİ ZUSTAND STORE

### `linkEvidenceStore.ts`
```typescript
interface LinkEvidenceState {
  // Aktif link'in evidence verileri
  activeLink: { sourceId: string; targetId: string } | null;
  evidences: EvidencePulse[];
  loading: boolean;

  // Koridor modu
  corridorMode: boolean;
  corridorProgress: number;  // 0-1
  corridorPaused: boolean;
  activeEvidenceIndex: number;

  // 3D panel state
  openPanelId: string | null; // Hangi evidence paneli açık

  // Actions
  fetchLinkEvidence: (sourceId: string, targetId: string) => Promise<void>;
  enterCorridorMode: () => void;
  exitCorridorMode: () => void;
  setCorridorProgress: (progress: number) => void;
  openEvidencePanel: (evidenceId: string) => void;
  closeEvidencePanel: () => void;
}
```

---

## 6. THREE.JS ENTEGRASYON NOKTALARI

### Truth3DScene.tsx Değişiklikler

**Yeni Props:**
```typescript
interface Props {
  // ... mevcut props
  linkEvidenceMap?: Map<string, EvidencePulse[]>;  // linkKey → evidence listesi
  corridorMode?: boolean;
  corridorProgress?: number;
  activeEvidenceId?: string | null;
  onEvidencePulseClick?: (evidenceId: string, linkKey: string) => void;
}
```

**Shader Güncelleme:**
```glsl
// MEVCUT: sabit pulse pozisyonları (fract bazlı)
float pulsePos = fract(uTime * uPulseSpeed + uPhaseOffset + n * (1.0 / uPulseCount));

// YENİ: evidence bazlı pozisyonlar (uniform array)
uniform float uEvidencePositions[10];  // max 10 evidence per link
// Her evidence kendi kronolojik pozisyonunda sabit duruyor
// Pulse o pozisyonda "nefes alıyor" (parlayıp sönüyor)
// Koridor modunda: aktif evidence ekstra parlak
```

**Pulse Tıklama Algılama:**
```typescript
// Mevcut raycaster'a ekleme:
// 1. Link tube'una tıklandığında, tıklama noktasının
//    ip üzerindeki pozisyonunu hesapla (0-1)
// 2. En yakın evidence pulse'ını bul
// 3. onEvidencePulseClick callback'i tetikle

const clickPosOnLine = getPositionAlongLine(hitPoint, startPos, endPos); // 0-1
const nearestEvidence = findNearestEvidence(clickPosOnLine, evidences);
if (nearestEvidence && Math.abs(nearestEvidence.pulsePosition - clickPosOnLine) < 0.05) {
    onEvidencePulseClick(nearestEvidence.evidenceId, linkKey);
}
```

---

## 7. İMPLEMENTASYON FAZLARI

### Faz A: Data-Driven Pulse (2-3 saat)
- [ ] `link_evidence_timeline` tablosu + seed data
- [ ] `/api/truth/link-evidence` route
- [ ] `linkEvidenceStore.ts` Zustand store
- [ ] truth/page.tsx → link tıklandığında evidence fetch
- [ ] Shader'da `uPulseCount`'u gerçek evidence sayısına bağla
- [ ] Her evidence'ın kronolojik pozisyonunu hesapla

### Faz B: Floating 3D Panel (3-4 saat)
- [ ] `createEvidencePanel()` — Canvas → Texture → Plane
- [ ] Panel açılış/kapanış animasyonu (scale + opacity)
- [ ] Billboard sistemi (panel her zaman kameraya baksın)
- [ ] Pulse tıklama algılama (raycaster + pozisyon hesaplama)
- [ ] Panel içerik render (başlık, tarih, güven barı, kaynak)
- [ ] Panel dışına tıklama → kapatma
- [ ] Diğer pulse'ları yavaşlatma (dikkat odağı)

### Faz C: Kronolojik Koridor (4-5 saat)
- [ ] Koridor kamera sistemi (ray üzerinde lerp)
- [ ] Auto-play: kamera otomatik ilerler, her noktada duraksıyor
- [ ] Manuel kontrol: kullanıcı sürükleyerek ileri/geri
- [ ] Her duraksama noktasında panel auto-open
- [ ] Progress bar UI (altta, zaman çizelgesi)
- [ ] ESC ile çıkış + smooth restore
- [ ] Sinematik geçişler (mevcut cinematic system üzerine)

### Faz D: Polish & Entegrasyon (2-3 saat)
- [ ] Kilit olay görseli (büyük pulse, ekstra parlak, farklı renk)
- [ ] Topluluk oylaması (kilit olay tespiti)
- [ ] Koridor modu butonu (LinkTooltip'e veya cinematic panel'e eklenir)
- [ ] Mobil/küçük ekran uyumluluğu
- [ ] Performans optimizasyonu (max 10 panel aynı anda)
- [ ] ChatPanel entegrasyonu ("Bu bağlantıyı kronolojik göster")

---

## 8. PERFORMANS STRATEJİSİ

| Konu | Limit | Strateji |
|------|-------|----------|
| Aynı anda açık panel | Max 3 | Yeni panel açılınca en eskisi kapanır |
| Pulse sayısı per link | Max 10 | 10+ evidence varsa en önemliler seçilir |
| Canvas texture boyutu | 512×320 | Retina'da bile yeterli, GPU dostu |
| Koridor kamera FPS | 60 | Lerp tabanlı, physics yok |
| Evidence fetch | Lazy | Sadece tıklanan link'in evidence'ı çekilir |

---

## 9. UX AKIŞI

```
KULLANICI YOLCULUĞU:

1. Kullanıcı ağı görüyor (normal mod)
   │
2. Epistemolojik mod'u açıyor
   │  → İpler canlanıyor, elektrik akımları başlıyor
   │
3. Bir ipe hover yapıyor
   │  → LinkTooltip: "Deutsche Bank ↔ Epstein | 7 kanıt | %72 güven"
   │  → "📂 Kronolojik Görünüm" butonu görünür
   │
4a. İpe tıklıyor (mevcut davranış)
   │  → Cinematic zoom + side panel
   │  → Akan ışıklar hızlanıyor (dikkat çekme)
   │
4b. Akan ışığa tıklıyor (YENİ)
   │  → Işık duraksar
   │  → 3D panel açılır: "Hesap Kapatma — 8 Temmuz 2019"
   │  → Diğer ışıklar yavaşlar
   │  → Panel dışı tıklama → kapanır, akış devam eder
   │
5. "Kronolojik Görünüm" butonuna tıklıyor
   │  → Koridor moduna geçiş
   │  → Kamera ipin başına gider
   │  → İlk kanıttan son kanıta doğru sinematik geçiş
   │  → Her kanıtta duraksama + panel açılma
   │  → Kullanıcı manuel kontrol edebilir (ileri/geri)
   │
6. ESC veya "Ağa Dön" butonu
   → Smooth restore → normal ağ görünümü
```

---

## 10. BAĞIMLILIKLAR

| Bağımlılık | Durum | Not |
|------------|-------|-----|
| Sprint 6B shader sistemi | ✅ TAMAM | Cable glow + ep mode çalışıyor |
| evidence_archive tablosu | ✅ TAMAM | Migration çalıştırıldı |
| Cinematic camera | ✅ TAMAM | Link tıklama + zoom |
| Evidence API routes | ✅ TAMAM | Submit, resolve, provenance, claimreview |
| Zustand store pattern | ✅ TAMAM | chatStore, badgeStore referans |
| link_evidence_timeline | 🆕 GEREKLİ | Sprint 6C migration'ı |

---

## 11. RİSKLER & MİTİGASYON

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| Canvas texture blurry | Orta | Düşük | 512px + nearest filter |
| Çok fazla panel = FPS drop | Düşük | Orta | Max 3 panel limiti |
| Koridor kamera tutarsız | Orta | Yüksek | Mevcut cinematic system üzerine kur |
| Evidence data yetersiz | Yüksek | Yüksek | Seed data + AI auto-generate |
| Raycaster pulse algılama yanlış | Orta | Orta | Tube mesh üzerinde pozisyon hesapla |

---

**Son Güncelleme:** 7 Mart 2026
**Yazar:** Claude (Stratejist & Lider Geliştirici)
**Durum:** MİMARİ BRIEF — Onay bekliyor
