# 🔬 DOĞRULAMA MASASI v2 — "CANLI AĞ"
## Master Implementation Plan

> **Felsefe:** "İki panel. Referans + Oyun. Üç katman. Sıfır bias."
> **Tarih:** 25 Mart 2026
> **Durum:** PLAN — Raşit onayı sonrası implemente edilecek

---

## 1. MİMARİ VİZYON

### Eski Sistem (v1) — Neden Öldü
```
┌──────────────┬──────────────┬────────────┐
│  ORİJİNAL PDF │  OCR + KALEM  │   GÖREV    │
│  (referans)  │  (fosforlu)  │  (sorular)  │
│  dokunulmaz  │  çizilebilir │  rehber     │
└──────────────┴──────────────┴────────────┘
```
- ❌ Split panel = dikkat dağılıyor
- ❌ Fosforlu kalem çizgileri anlamsız (ne için çiziyoruz?)
- ❌ UI ruhsuz — gri kutular, sıkıcı formlar
- ❌ Tek seferlik doğrulama — veri ağa girince unutuluyor
- ❌ AI çıkarımı gösteriliyor → anchoring bias

### Yeni Sistem (v2) — Canlı Ağ (Split Panel: Referans + Oyun)

> **Raşit'in Eureka Anı:** "Orijinal belge hep oluyor bir tarafta abi. Biz diğer oynanacak olan
> üzerinde takılcaz full. Efektler onda, oyunlar onda."

**Neden Split Panel (v1'den FARKLI amaç):**
- v1: 3 panel (orijinal + OCR kalem + görev) → dikkat dağılıyordu
- v2: 2 panel (orijinal referans + interaktif oyun) → bağlam koruması
- Sol panel = orijinal belge, dokunulmaz, her an referans alınabilir
- Sağ panel = spotlight, scanner, efektler, görev kartı, tüm etkileşim
- Honeypot spotlight sağ panelde yanlış bölge → kullanıcı sola bakıp "yanlış yer" der = gerçekten okuyor
- Manipülasyon riski düşer: spotlight yönlendirse bile orijinal her an yanında

```
┌───────────────────────────────────┬───────────────────────────────────┐
│        SOL — ORİJİNAL BELGE       │       SAĞ — İNTERAKTİF SAHNE     │
│        (dokunulmaz referans)       │      (spotlight + görev + oyun)   │
│                                   │                                   │
│  Tam belge, scroll edilebilir     │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Hiçbir efekt yok                 │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Hiçbir karartma yok              │  ████████████████████████████████  │ ← Spotlight
│  Her zaman erişilebilir           │  ████ İLGİLİ PARAGRAF BURADA ███  │
│  Bağlamı korur                    │  ████████████████████████████████  │
│  Kullanıcı istediği an            │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  orijinale dönebilir              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                   │                                   │
│  ── sayfa: 3/47 ──────────────   │  ┌─────────────────────────────┐  │
│                                   │  │    GÖREV KARTI (CLASSIFIED)  │  │
│                                   │  │  Soru + Seçenek + Gerekçe   │  │
│                                   │  └─────────────────────────────┘  │
└───────────────────────────────────┴───────────────────────────────────┘
```

**Teknik Mimari:**
- Sol: `<OriginalDocViewer>` — react-pdf, basit scroll, sayfa navigasyonu
- Sağ: `<InteractivePane>` — SpotlightViewer + ScannerAnimation + TaskCard
- Sync: Sağ panelde spotlight sayfasına scroll → Sol panel aynı sayfaya oto-scroll (opsiyonel)
- Responsive: Mobilde tab geçişi (Orijinal | Görev), masaüstünde yan yana

---

## 2. ANTİ-BIAS 3 KATMANLI AKIŞ

### Katman 1 — "ÖNCE SEN OKU" (Blind Review)
```
┌──────────────────────────────────────────────┐
│  📄 BELGE — Spotlight aktif                   │
│  ═══════════════════════════════════════════  │
│                                               │
│  [Aydınlatılmış paragraf/satır]               │
│                                               │
│  ────────────────────────────────────────────│
│  GÖREV: "Bu belgede hangi kişileri            │
│          tespit ediyorsunuz?"                 │
│                                               │
│  [Metin giriş alanı — kendi cevabın]          │
│  [GÖNDER →]                                   │
└──────────────────────────────────────────────┘
```
- AI çıkarımı GÖSTERİLMEZ
- İnsan kendi gözüyle okur, kendi kararını verir
- Bu "WAIT A MINUTE!" anını yaratır
- Spotlight sadece ilgili bölgeyi aydınlatır

### Katman 2 — "ŞİMDİ KARŞILAŞTIR" (Reveal & Compare)
```
┌──────────────────────────────────────────────┐
│  📊 KARŞILAŞTIRMA                             │
│  ═══════════════════════════════════════════  │
│                                               │
│  SENİN CEVABIN          AI ÇIKARIMI           │
│  ┌──────────┐          ┌──────────┐          │
│  │ "pilot"  │    ✅    │ "pilot"  │  UYUM    │
│  └──────────┘          └──────────┘          │
│  ┌──────────┐          ┌──────────┐          │
│  │ "avukat" │    ⚠️    │"muhasebe"│ UYUMSUZ  │
│  └──────────┘          └──────────┘          │
│                                               │
│  [ONAYLA] [DÜZELT] [İTİRAZ ET]               │
└──────────────────────────────────────────────┘
```
- AI çıkarımı ANCAK insan cevabını verdikten sonra gösterilir
- Uyum/uyumsuzluk görsel olarak net
- Uyumsuzluk → ekstra inceleme tetiklenir
- AI kalite ölçümü otomatik: her karşılaştırma = veri noktası

### Katman 3 — "KAYNAK DOĞRULA" (Source Verification)
```
┌──────────────────────────────────────────────┐
│  🔍 KAYNAK DOĞRULAMA                          │
│  ═══════════════════════════════════════════  │
│                                               │
│  AI bu çıkarımı şu cümleden yaptı:           │
│  ┌──────────────────────────────────────────┐│
│  │ "Captain Larry Visoski testified that he  ││
│  │  flew Epstein's plane from 1991 to 2019" ││
│  └──────────────────────────────────────────┘│
│        ↑ Belgede spotlight ile aydınlatılmış  │
│                                               │
│  Bu cümle belgede var mı?  [EVET] [HAYIR]    │
│  Doğru yorumlanmış mı?    [EVET] [HAYIR]    │
└──────────────────────────────────────────────┘
```
- Bias'a karşı bağışık — artık yorum yok
- Sadece "bu cümle belgede var mı?" sorusu
- Hızlı (20 saniye), odaklı, kesin

---

## 3. GÖREV ŞABLONLARI (3 TEMPLATE)

### Şablon 1: BİLGİ DOĞRULAMA (Entity + Date + Claim)
> "Bu belgede ne yazıyor?"

**Ne doğruluyoruz:** Kişi adı, tarih, iddia, meslek, lokasyon
**Akış:**
1. Spotlight ilgili paragrafı aydınlatır
2. Kullanıcı soruyu cevaplar (açık uçlu veya çoktan seçmeli)
3. AI cevabı gösterilir → karşılaştırma
4. Kaynak cümlesi gösterilir → doğrulama

**Örnek görev kartları:**
```
─── DOSYA #TASK-1711268567 ────────────────────
BİLGİ DOĞRULAMA · Zorluk ██░░░ · İZ: TASK-a1b2

Bu belgede bahsedilen kişinin mesleği nedir?

[Belge bölümü spotlight ile aydınlatılmış]

Cevabınız: [________________]

⚡ İPUCU: Belgenin altı çizili bölümüne dikkat edin
───────────────────────────────────────────────
```

**Kapsadığı veri tipleri:**
- entity_verification (kişi, kurum adı)
- date_verification (tarih doğruluğu)
- claim_verification (iddia doğruluğu)
- source_verification (kaynak güvenilirliği)

---

### Şablon 2: KİMLİK EŞLEŞTİRME (Entity Resolution)
> "Bu iki kayıt aynı kişi mi?"

**Ne doğruluyoruz:** Farklı belgelerdeki entity'lerin aynı kişi/kurum olup olmadığı
**Akış:**
1. İki kayıt yan yana gösterilir (kart formatında)
2. Kullanıcı benzerlik/farklılık işaretler
3. Sistem Jaro-Winkler skoru gösterir → karşılaştırma
4. Her iki kaynağın belge bölümleri gösterilir

**Örnek görev kartları:**
```
─── DOSYA #TASK-1711269000 ────────────────────
KİMLİK EŞLEŞTİRME · Zorluk ███░░ · İZ: TASK-c3d4

Bu iki kayıt aynı kişiyi mi tanımlıyor?

┌─────────────────┐  ┌─────────────────┐
│ KAYIT A          │  │ KAYIT B          │
│ "L. Visoski"     │  │ "Larry Visoski"  │
│ Pilot            │  │ Chief Pilot      │
│ Kaynak: Uçuş     │  │ Kaynak: İfade    │
│ Kaydı p.12       │  │ Tutanağı p.3     │
└─────────────────┘  └─────────────────┘

[AYNI KİŞİ] [FARKLI KİŞİ] [EMİN DEĞİLİM]
───────────────────────────────────────────────
```

**Kapsadığı veri tipleri:**
- entity_resolution (fuzzy matching doğrulaması)
- Biricik kod sistemiyle entegre (SHA256 fingerprint)

---

### Şablon 3: BAĞLANTI DOĞRULAMA + SINIFLANDIRMA
> "Bu iki kişi/kurum arasında belgelenmiş bir ilişki var mı? Ne tür?"

**Ne doğruluyoruz:** İlişki varlığı, türü ve yönü
**Akış:**
1. İki entity gösterilir (isim, tip, mevcut bilgiler)
2. Belgedeki ilgili bölüm spotlight ile aydınlatılır
3. Kullanıcı ilişki olup olmadığını belirler
4. Varsa: ilişki türünü seçer (13 evidence_type'dan)
5. AI karşılaştırması gösterilir

**Örnek görev kartları:**
```
─── DOSYA #TASK-1711270000 ────────────────────
BAĞLANTI ANALİZİ · Zorluk ████░ · İZ: TASK-e5f6

Bu iki kişi arasında belgelenmiş bir bağlantı
tespit edebiliyor musunuz?

┌──────────┐          ┌──────────┐
│ Jeffrey  │──── ? ───│ Ghislaine│
│ Epstein  │          │ Maxwell  │
│ FİNANSÇI │          │ SOSYALİT │
└──────────┘          └──────────┘

[Belge bölümü spotlight ile aydınlatılmış]

İlişki var mı?  [EVET] [HAYIR] [BELİRSİZ]

İlişki türü: [▼ Seç ────────────────────]
  · Mahkeme kaydı (court_record)
  · Tanık ifadesi (witness_testimony)
  · Finansal bağlantı (financial_record)
  · Sosyal bağlantı (social_connection)
  · ...

Gerekçe: [________________________________]
───────────────────────────────────────────────
```

**Kapsadığı veri tipleri:**
- relationship_verification
- evidence_type sınıflandırması
- confidence_level belirleme
- source_hierarchy (primary/secondary/tertiary)

---

## 4. SPOTLİGHT / SCANNER GÖRSEL SİSTEMİ

### Konsept
Belgenin tamamı hafif karartılmış (%15 opacity).
İlgili paragraf/satır tam aydınlatılmış (%100).
Geçiş bölgesi yumuşak gradient (feathered edge).

### Teknik Uygulama
```typescript
// SpotlightOverlay.tsx
interface SpotlightProps {
  documentHeight: number;
  targetY: number;      // Hedef satırın Y koordinatı (0-1 normalized)
  targetHeight: number; // Hedef bölgenin yüksekliği (0-1 normalized)
  isScanning: boolean;  // Tarama animasyonu aktif mi
}

// CSS: Overlay iki parça
// Üst karanlık bölge: 0 → targetY (opacity 0.85)
// Alt karanlık bölge: targetY + targetHeight → 1 (opacity 0.85)
// Aydınlık bölge: targetY → targetY + targetHeight (opacity 0)
// Kenar geçişleri: 30px gradient feather

// Scanner animasyonu (ilk gösterimde):
// Işık çizgisi yukarıdan aşağı tarar (2s)
// Hedef bölgeye ulaşınca durur ve genişler
// "KAYNAK TESPİT EDİLDİ" flash efekti
```

### Scanner Girişi Animasyon Sekansı
```
0.0s — Belge tam karanlık görünür
0.2s — İnce ışık çizgisi (2px, kırmızı) üstten başlar
0.2-1.5s — Çizgi aşağı doğru tarar (easeInOut)
1.5s — Çizgi hedef bölgeye ulaşır
1.5-2.0s — Çizgi genişler → bölge aydınlanır
2.0s — "BÖLGE TESPİT EDİLDİ" flash (0.3s)
2.3s — Spotlight sabit kalır, görev kartı belirir
```

### Veri Kaynağı
- AI tarama sırasında Document AI'dan gelen bounding box koordinatları
- Her entity/relationship çıkarımı yanında kaynak satır/paragraf pozisyonu
- `data_quarantine.item_data.source_location` alanı:
```json
{
  "page": 3,
  "paragraph_index": 7,
  "bounding_box": {
    "x": 0.05, "y": 0.42,
    "w": 0.90, "h": 0.08
  },
  "source_sentence": "Captain Larry Visoski testified..."
}
```

---

## 5. AI KAYNAK ALINTI SİSTEMİ (Source Citation Pipeline)

### Mevcut Durum
AI entity çıkarıyor ama kaynak cümleyi KAYDETMÝYOR.
```
// Mevcut: Groq'a giden prompt
"Bu belgeden entity'leri çıkar: ..."
→ AI: [{name: "Larry Visoski", type: "person", role: "pilot"}]
// Kaynak cümle YOK
```

### Yeni Sistem
```
// Yeni: Groq'a giden prompt (güncellenmiş)
"Bu belgeden entity'leri çıkar. HER entity için:
 1. İsim
 2. Tip
 3. Rol/ilişki
 4. KAYNAK CÜMLE (belgeden birebir alıntı)
 5. Sayfa numarası
 6. Yaklaşık satır pozisyonu"

→ AI: [{
  name: "Larry Visoski",
  type: "person",
  role: "pilot",
  source_sentence: "Captain Larry Visoski testified that he flew...",
  source_page: 3,
  source_position: 0.42  // normalized Y position
}]
```

### Değişecek Dosyalar
1. **`/api/documents/scan/route.ts`** — Groq prompt güncelleme
   - Entity çıkarma prompt'una source_sentence zorunluluğu ekle
   - source_page ve source_position alanları

2. **`data_quarantine` tablosu** — `item_data` JSONB'ye ek alanlar
   - `source_sentence`: string
   - `source_page`: number
   - `source_location`: {x, y, w, h} bounding box

3. **`/api/game/generate/route.ts`** — Task oluştururken source bilgisini taşı
   - `task_data.source_sentence` → spotlight koordinatı
   - `task_data.source_location` → scanner hedef bölgesi

4. **`/api/game/tasks/route.ts`** — Task dönerken belge context'ini zenginleştir
   - `documentContext.highlight_region` → spotlight için

---

## 6. SÜREKLİ YENİDEN DOĞRULAMA MEKANİZMASI

### Felsefe
> "Veri ağa girince ölmez — sonsuza kadar canlı kalır."

Ağa giren her veri noktası periyodik olarak yeniden doğrulama kuyruğuna girer.

### Kademeli Frekans
```
İlk doğrulama (karantina → ağ):
  → Katman 1 + 2 + 3 tam uygulanır
  → 2-3 bağımsız reviewer gerekli
  → Yavaş ama sağlam

Yeniden doğrulama (ağda mevcut):
  → Sadece Katman 3 (kaynak doğrulama)
  → 1 reviewer yeterli
  → Hızlı (20 saniye)
  → Periyod: Her yeni belge eklendiğinde + rastgele
```

### Tetikleyiciler
1. **Yeni belge eklendi** — mevcut entity/relationship ile ilgili yeni kanıt
2. **Zaman bazlı** — 30/60/90 gün döngüsünde rastgele seçim
3. **İtiraz sonrası** — dispute edilen veri otomatik yeniden kuyruğa
4. **Topluluk sinyali** — bağlı node'larda tutarsızlık tespit edildiğinde

### Teknik Uygulama
```sql
-- Yeni tablo: reverification_queue
CREATE TABLE reverification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL, -- 'node' veya 'link'
  target_id UUID NOT NULL,
  trigger_type TEXT NOT NULL, -- 'new_evidence', 'periodic', 'dispute', 'inconsistency'
  trigger_source UUID, -- tetikleyen belge/itiraz ID
  priority INTEGER DEFAULT 5, -- 1=acil, 10=düşük
  verification_count INTEGER DEFAULT 0, -- toplam kaç kez doğrulanmış
  last_verified_at TIMESTAMPTZ,
  next_verification_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, assigned, verified, flagged
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cron job: günlük 50 rastgele node/link seç → kuyruğa ekle
-- Cron job: yeni belge → ilgili entity'leri kuyruğa ekle
```

### Re-verification Görev Kartı (Hızlı)
```
─── YENİDEN DOĞRULAMA · Hızlı Kontrol ────────
KAYNAK: United States v. Epstein, p.3

AI alıntısı:
"Captain Larry Visoski testified that he
 flew Epstein's plane from 1991 to 2019"

Bu cümle belgede var mı?    [✓ EVET] [✗ HAYIR]
Doğru yorumlanmış mı?       [✓ EVET] [✗ HAYIR]
───────────────────────────────────────────────
⏱ Tahmini süre: 20 saniye
🔄 Bu veri 47 kez doğrulandı · Son: 3 gün önce
```

---

## 7. UI TASARIM SİSTEMİ — "CLASSIFIED AESTHETIC"

### Temel Prensipler
ArchiveModal + Landing page'den devralınan ruh:
1. Her element bir **anlam** taşır (renk → tehlike seviyesi)
2. Her geçiş **koreografik** (staggered, spring physics)
3. Her kart bir **dosya** gibi hissettir (CLASSIFIED, trace ID, damga)
4. Typography = **otorite** (monospace labels, serif başlıklar)

### Renk Sistemi (Görev Tipine Göre)
```
BİLGİ DOĞRULAMA:     #3b82f6 (mavi — soruşturma)
KİMLİK EŞLEŞTİRME:  #10b981 (yeşil — eşleştirme)
BAĞLANTI ANALİZİ:    #8b5cf6 (mor — bağlantı)

Doğrulama durumu:
  DOĞRULANDI:         #22c55e (yeşil)
  REDDEDİLDİ:         #ef4444 (kırmızı)
  İTİRAZ:             #f59e0b (amber)
  BEKLİYOR:           #6b7280 (gri)

Spotlight:
  Aydınlık bölge:     rgba(220, 38, 38, 0.05) — çok hafif kırmızı
  Karanlık bölge:      rgba(0, 0, 0, 0.85) — neredeyse siyah
  Scanner çizgisi:     #dc2626 → #ef4444 gradient
```

### Görev Kartı Anatomisi
```
┌─────────────────────────────────────────────────┐
│  ● DOSYA #TASK-a1b2c3d4   ──────   CLASSIFIED  │ ← Üst banner
│─────────────────────────────────────────────────│   (gradient bg)
│                                                  │
│  📋 BİLGİ DOĞRULAMA                              │ ← Görev tipi
│  Zorluk ███░░  ·  İZ: TASK-a1b2  ·  2/3 İNCELEME│   (renkli etiket)
│                                                  │
│  ─── DOSYA İÇERİĞİ ───────────────────────────  │
│                                                  │
│  [Görev sorusu — net, odaklı, tek soru]          │ ← Ana soru
│                                                  │
│  ─── KAYNAK BELGE ─────────────────────────────  │
│  📄 United States v. Epstein · SDNY · 2019       │ ← Belge referansı
│  Sayfa 3 · Birincil kaynak · Resmi belge         │
│                                                  │
│  [Spotlight belge görüntüleyici]                  │ ← İnline belge
│                                                  │
│  ─── CEVABINIZ ────────────────────────────────  │
│  [                                          ]    │ ← Cevap alanı
│                                                  │
│  GEREKÇENİZ (zorunlu):                          │
│  [                                          ]    │ ← Min 10 karakter
│                                                  │
│  GÜVENİNİZ: ████████░░░░░░ 65%                  │ ← Slider
│                                                  │
│  [  ✓ DOĞRULA  ] [  ✗ REDDET  ] [  ⚠ İTİRAZ  ] │ ← Damga butonları
│                                                  │
│  ─── DENETIM İZİ ──────────────────────────────  │
│  ○ Oluşturuldu · PROV-20260325 · AI çıkarma     │ ← Provenance
│  ○ İnceleme 1 · REV-a1b2-c3d4 · DOĞRULANDI     │
│  ● Sıra sizde                                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Rol Kartları Entegrasyonu
Landing page'deki Hukukçu/Analist/Gazeteci/Vatandaş kartlarından esinlenme:

```
Görev kartında, üst köşede:
┌────────────────────────┐
│ ⚖ HUKUK GÖREVİ        │ ← Rol rengiyle üst border
│  Bu görev hukuki       │
│  uzmanlık gerektirir   │
└────────────────────────┘

Renk mapping:
  Hukukçu:  #3b82f6 (mavi) — "İddianameyi okur"
  Analist:  #10b981 (yeşil) — "Parayı takip eder"
  Gazeteci: #8b5cf6 (mor) — "Hikayeyi anlatır"
  Vatandaş: #f59e0b (amber) — "Bu yanlış der"
```

---

## 8. OTOMATİK KONSENSÜS → PROMOTE PIPELINE

### Mevcut Sorun
Konsensüs'a ulaşıldıktan sonra birinin `/api/quarantine/[id]/promote` çağırması gerekiyor.
Bu insan darboğazı = editör kapısı. Topluluk-odaklı değil.

### Yeni Akış: Otomatik Pipeline
```
Kullanıcı A cevabını verir → completed_count 1/2
Kullanıcı B cevabını verir → completed_count 2/2
  → RPC: calculate_task_consensus → "approved" (confidence 0.95)
  → OTOMATİK: promote_to_network()
    → data_quarantine.status = 'verified'
    → Node/Link oluşturulur (nodes/links tablosu)
    → data_provenance kaydı eklenir
    → reverification_queue'ya eklenir (30 gün sonra ilk re-check)
    → transparency_log kaydı
  → Bildirim: "✅ Topluluk onayladı — ağa eklendi!"
```

### Güvenlik Katmanları (Otomatik Promote'ta)
1. **Minimum confidence threshold:** %80 altı otomatik promote edilmez → insan inceleme
2. **Dispute varsa:** Hiçbir zaman otomatik promote — dispute resolution gerekli
3. **İlk kez görülen entity:** Mevcut ağda eşleşme yoksa → entity_resolution görevi de oluştur
4. **Yüksek riskli alan:** "suçlu" veya "mağdur" etiketli çıkarımlar → 3 reviewer gerekli (2 değil)

---

## 9. DOSYA DEĞİŞİKLİK LİSTESİ

### Yeni Dosyalar
```
components/InvestigationGame/
  ├── VerificationDesk.tsx          — Ana split-panel masası (v2)
  ├── components/
  │   ├── OriginalDocViewer.tsx     — SOL PANEL: Orijinal belge (react-pdf, saf, efektsiz)
  │   ├── InteractivePane.tsx       — SAĞ PANEL: Spotlight + görev + etkileşim konteyner
  │   ├── SpotlightViewer.tsx       — Belge + spotlight overlay (sağ panel içinde)
  │   ├── ScannerAnimation.tsx      — İlk giriş tarama efekti
  │   ├── BlindReviewPhase.tsx      — Katman 1: "Önce sen oku"
  │   ├── CompareRevealPhase.tsx    — Katman 2: "Karşılaştır"
  │   ├── SourceVerifyPhase.tsx     — Katman 3: "Kaynak doğrula"
  │   ├── TaskFileCard.tsx          — CLASSIFIED estetik görev kartı
  │   ├── EntityMatchCard.tsx       — Kimlik eşleştirme ikili kart
  │   ├── ConnectionAnalysis.tsx    — Bağlantı analiz kartı
  │   ├── ReVerificationCard.tsx    — Hızlı yeniden doğrulama kartı
  │   └── PanelSyncController.tsx   — Sol↔Sağ sayfa senkronizasyonu
  └── templates/
      ├── InfoVerificationTemplate.tsx   — Şablon 1
      ├── IdentityMatchTemplate.tsx      — Şablon 2
      └── ConnectionVerifyTemplate.tsx   — Şablon 3
```

### Değişecek Dosyalar
```
store/investigationGameStore.ts    — Yeni fazlar (blind→compare→verify)
app/api/game/tasks/route.ts        — source_location döndürme
app/api/game/submit/route.ts       — 3 katmanlı cevap yapısı + auto-promote
app/api/game/generate/route.ts     — re-verification görev üretimi
app/api/documents/scan/route.ts    — AI source citation ekleme
components/InvestigationGame/
  InvestigationGamePanel.tsx        — v2 desk'e yönlendirme
  InvestigationRoom.tsx             — Spotlight entegrasyonu
```

### Yeni Migration
```
docs/SPRINT_VERIFICATION_V2_MIGRATION.sql
  — reverification_queue tablosu
  — investigation_tasks'a source_location alanı
  — task_assignments'a phase_responses JSONB (3 katman cevapları)
  — auto_promote_to_network() RPC fonksiyonu
  — schedule_reverification() RPC fonksiyonu
```

---

## 10. ~~UYGULAMA SIRASI (Eski)~~ — OBSOLETE

> ⚠️ **Bu bölüm geçersizdir.** Güncel uygulama sırası → **Bölüm 13**
> Stres testi, araştırma bulguları ve split panel kararı sonrası güncellendi.

### EVRİMLEŞTİRME STRATEJİSİ (Sorun 1 Çözümü)
> Mevcut kodda `DocumentVerificationDesk.tsx` (27KB) zaten split-panel react-pdf yapıyor.
> Sıfırdan yazmak yerine bu dosyayı evrimleştireceğiz:
> - Sol panel (react-pdf) → `OriginalDocViewer` olarak refactor
> - Sağ panel (AI extraction) → `InteractivePane` olarak dönüştür (spotlight + 3 katman)
> - FosforluKalem → kaldırılacak (v2'de yok, spotlight sistemiyle değişti)
> - Mevcut synced pagination → `PanelSyncController` olarak genelleştir

---

## 11. BAŞARI KRİTERLERİ

- [ ] Split panel çalışıyor: sol orijinal belge, sağ interaktif spotlight+görev
- [ ] Sol↔sağ sayfa senkronizasyonu çalışıyor (opsiyonel toggle)
- [ ] Mobilde tab geçişi (Orijinal | Görev) düzgün render
- [ ] AI çıkarımı SADECE kullanıcı cevabını verdikten sonra görünüyor
- [ ] 3 şablon tüm ağ veri tiplerini kapsıyor
- [ ] Spotlight dağılımı: %50 normal, %20 honeypot, %30 spotlight-yok
- [ ] Honeypot tespiti sessiz çalışıyor (kullanıcı fark etmiyor)
- [ ] Honeypot başarı oranı → trust_weight'e yansıyor
- [ ] Konsensüs'a ulaşan veri otomatik olarak ağa giriyor
- [ ] Yüksek riskli iddialar: 48 saat + 3 reviewer + "alleged" etiketi
- [ ] Entity resolution tip-spesifik eşikler (PERSON=0.90, ORG=0.85, vb.)
- [ ] Re-verification kuyruğu çalışıyor
- [ ] Multi-model çapraz kontrol yüksek riskli görevlerde aktif
- [ ] UI ArchiveModal kalitesinde hissettiriyor
- [ ] Scanner giriş animasyonu sinematik
- [ ] TypeScript sıfır hata

---

> **"Bir ağ, ancak her düğümü sürekli doğrulanıyorsa canlıdır."**
> **"AI bir yardımcıdır, hakim değil. İnsan gözü son sözdür."**

---

## 12. STRES TESTİ BULGULARI (25 Mart 2026)

> 6 açıdan inceleme yapıldı. 16 bulgu, 0 plan kırıcı, 16 ekleme gerekli.

### 12.1 HUKUKİ UYUMLULUK (Sprint 18 Legal Fortress)

| # | Bulgu | Öncelik | Çözüm |
|---|-------|---------|-------|
| H1 | Hata bildirme formu yok — dışarıdan biri yanlış veriyi nasıl bildirecek? | KRİTİK | Her node/link'e "Bu bilgi yanlış" butonu. Hesapsız erişilebilir. |
| H2 | AI sınırlamaları açıklaması yok | YÜKSEK | Doğrulama masasında "AI hata yapabilir" kısa disclaimer |
| H3 | "Suçlu" gibi kesin yargı ifadeleri otomatik promote'ta | YÜKSEK | Otomatik "iddia edilen" (alleged) etiketi. Asla "suçlu" değil "belgelenmiş bağlantı" |

### 12.2 GÜVENLİK AÇIKLARI

| # | Bulgu | Öncelik | Çözüm |
|---|-------|---------|-------|
| G1 | Spotlight = AI yönlendirmesi → "nereye bak" bias'ı | YÜKSEK | Görevlerin %20'sinde spotlight kasıtlı YANLIŞ bölgeyi aydınlatsın (honeypot). "Bu bölgede istenen bilgi yok" seçeneği olmalı. |
| G2 | 2 yeni hesap anlaşıp her şeyi approve edebilir | YÜKSEK | 30 günden yeni hesaplar otomatik promote tetikleyemez. Aynı zaman+hedef+karar deseni → otomatik flag. |
| G3 | Reasoning alanına XSS injection riski | ORTA | Her metin girişi HTML sanitize. DOMPurify kullanımı. |

### 12.3 VERİ KALİTESİ VE İZLENEBİLİRLİK

| # | Bulgu | Öncelik | Çözüm |
|---|-------|---------|-------|
| V1 | Katman 2 "DÜZELT" seçeneği belirsiz — düzeltme nereye gidiyor? | YÜKSEK | Düzeltme ayrı `correction` kaydı → provenance'a. Düzeltme DE ayrıca doğrulanmalı. |
| V2 | AI source_sentence belgede olmayan cümle uydurabilir | YÜKSEK | Bir taramadaki halüsinasyon oranı %20'yi geçerse → o taramanın TAMAMI "güvenilmez" olarak işaretlenir. |
| V3 | Re-verification sonucu eski doğrulamayı geçersiz kılmalı | ORTA | 47 kez doğrulanmış veri bile yeni çelişen kanıtla "disputed" olabilmeli. Cascade mekanizması. |

### 12.4 KULLANICI HAKLARI

| # | Bulgu | Öncelik | Çözüm |
|---|-------|---------|-------|
| K1 | Görev içinden "bu görev sorunlu" deme imkânı yok | YÜKSEK | "🚩 Görev Sorunlu" butonu (belge yüklenmiyor, soru anlamsız, spotlight yanlış, dil sorunu) |
| K2 | Platform geri bildirim kanalı yok | ORTA | Görev kartı altında "💬 Geri Bildirim" linki |
| K3 | İtiraz sürecinin görünürlüğü eksik | ORTA | "İtirazlarım" sekmesi (profil altı): açık → inceleniyor → kabul/red |
| K4 | Kararını değiştirme hakkı yok | YÜKSEK | Katman 2'de "kararımı düzeltmek istiyorum" seçeneği. İlk cevap + düzeltme = daha zengin veri. |

### 12.5 EDGE CASES & FAILURE MODES

| # | Bulgu | Öncelik | Çözüm |
|---|-------|---------|-------|
| E1 | source_location olmayan eski karantina verileri | YÜKSEK | Fallback: spotlight kullanılmaz, belge tamamı gösterilir. "AI kaynak konumu belirtmedi" uyarısı. |
| E2 | Belge erişilemez (CourtListener kapalı, rate limit) | ORTA | Graceful degradation: OCR metni göster. OCR de yoksa → görev "ertelenmiş" |
| E3 | Katman 1 açık uçlu cevap karşılaştırması ("pilot" vs "uçak pilotu") | YÜKSEK | Fuzzy matching (Jaro-Winkler + semantic). 0.85+=uyum, 0.60-0.85=benzer, <0.60=uyumsuz |
| E4 | Çok uzun belgeler (500+ sayfa) | ORTA | Lazy page loading: sadece spotlight sayfası + ±2 sayfa render. |
| E5 | Blind review'da önceki reviewer cevapları bias yaratır | KRİTİK | Katman 1'de existing_reviews GÖSTERİLMEZ. Sadece tüm katmanlar bittikten sonra özet bilgi. |
| E6 | Kullanıcı 3 katmanın ortasında sayfayı kapatır | ORTA | Partial save: her katman cevabı anında sunucuya. Geri dönünce kaldığı yerden devam. |

### 12.6 TRUTH ANAYASASI UYUMLULUĞU

| # | Madde | Bulgu | Çözüm |
|---|-------|-------|-------|
| A1 | Madde 3: "AI kaynak gösteremezse bilmiyorum diyecek" | AI source_sentence üretemezse ne olur? | "kaynak_eksik" etiketi + zorluk artışı + uzman görev |
| A2 | Madde 5: "Doğrulanmamış çıkarımları ÖNERİ olarak işaretle" | Ağdaki veri doğrulama sayısını göstermiyor | UI'da doğrulama sayısı + confidence skoru her node/link'te görünür |
| A3 | Madde 9: "Confidence'ı AI hesaplamasın, BİZ hesaplayalım" | Confidence hesabı belirsiz | Composite skor: belge tipi ağırlığı + kaynak hiyerarşisi + doğrulama sayısı + reviewer trust_weight ortalaması. AI confidence'ı → sadece ilk referans, son skor BİZDE |

---

## 13. GÜNCELLENMIŞ UYGULAMA SIRASI

Stres testi bulguları dahil edilmiş versiyon:

### Faz A — Temel Altyapı + Split Panel Temeli (2-3 gün)
1. SQL migration (reverification_queue + source_location + phase_responses + composite_confidence + spotlight_mode + spotlight_resistance kolonları)
2. AI scan pipeline güncelleme (source_sentence zorunlu, üretemezse "kaynak_eksik" etiketi)
3. Game generate/tasks API güncelleme (source_location, existing_reviews gizleme, spotlight_mode atama: %50 normal / %20 honeypot / %30 none)
4. investigationGameStore'a yeni fazlar + partial save
5. Input sanitization (DOMPurify, XSS koruması)
6. Hesap yaşı bazlı oy ağırlığı entegrasyonu
7. VerificationDesk.tsx iskelet — split panel layout (sol OriginalDocViewer + sağ InteractivePane)

### Faz B — Split Panel + Spotlight Sistemi (2-3 gün)
1. OriginalDocViewer (sol panel — react-pdf, saf, efektsiz, scroll)
2. InteractivePane (sağ panel — spotlight + görev konteyner)
3. PanelSyncController (sayfa senkronizasyonu, opsiyonel toggle)
4. SpotlightViewer + fallback (source_location yoksa tam belge)
5. ScannerAnimation
6. Lazy page loading (spotlight sayfası + ±2)
7. Honeypot spotlight atama sistemi (sessiz, kullanıcı fark etmez)
8. Mobil responsive: tab geçişi (Orijinal | Görev)

### Faz C — Görev Şablonları + Anti-Bias (2-3 gün)
1. TaskFileCard (CLASSIFIED estetik)
2. BlindReviewPhase (existing_reviews gizli, "bilgi yok" seçeneği)
3. CompareRevealPhase (fuzzy matching, "kararımı düzelt" seçeneği, "DÜZELT" → correction kaydı)
4. SourceVerifyPhase (halüsinasyon tespiti → tarama güvenilirlik kontrolü)
5. 3 template + ReVerificationCard
6. "🚩 Görev Sorunlu" + "💬 Geri Bildirim" butonları

### Faz D — Otomatik Pipeline + Honeypot Intelligence + Güvenlik (1-2 gün)
1. auto_promote_to_network() RPC (composite confidence, alleged etiketi)
2. Yüksek riskli iddia tespiti → 48 saat gecikmeli konsensüs + 3 reviewer
3. Multi-model çapraz kontrol (yüksek riskli görevlerde 2. model)
4. Koordineli saldırı tespiti (hesap yaşı + zaman/hedef/karar deseni + <5dk timing)
5. calculateSpotlightResistance() → trust_weight güncelleme (sessiz)
6. Honeypot sonuç değerlendirme (rejected_spotlight, found_correct_section)
7. Re-verification cron + cascade mekanizması
8. Halüsinasyon oranı kontrolü (>%20 → tarama güvenilmez)
9. Entity resolution tip-spesifik eşikler (PERSON=0.90, ORG=0.85, vb.)

### Faz E — UI Polish + Kullanıcı Hakları (1-2 gün)
1. "Bu bilgi yanlış" butonu (hesapsız erişilebilir)
2. AI disclaimer
3. İtirazlarım sekmesi
4. Doğrulama sayısı + confidence gösterimi (node/link UI)
5. ArchiveModal estetik + animasyonlar
6. Split panel sürüklenebilir bölücü (masaüstü)

---

## 14. KAPSAMLILIK KONTROLÜ (Checklist)

### Hukuki ✅
- [x] Hata bildirme formu (H1)
- [x] AI sınırlamaları açıklaması (H2)
- [x] "Alleged" etiketi zorunluluğu (H3)
- [x] Denetim izi (provenance + transparency_log)
- [x] Zorunlu gerekçe (reasoning)

### Güvenlik ✅
- [x] Anti-bias 3 katman (blind → compare → verify)
- [x] Honeypot spotlight (%20) (G1)
- [x] Koordineli saldırı tespiti (G2)
- [x] XSS sanitization (G3)
- [x] Hesap yaşı bazlı oy ağırlığı

### Veri Kalitesi ✅
- [x] Kaynak alıntı zorunluluğu (source_sentence)
- [x] Düzeltme kaydı (V1)
- [x] Halüsinasyon oranı kontrolü (V2)
- [x] Cascade re-verification (V3)
- [x] Composite confidence hesabı (A3)

### Kullanıcı Hakları ✅
- [x] "Görev sorunlu" butonu (K1)
- [x] Geri bildirim kanalı (K2)
- [x] İtiraz takibi (K3)
- [x] Kararını değiştirme hakkı (K4)
- [x] Doğrulama sayısı görünürlüğü (A2)

### Edge Cases ✅
- [x] source_location fallback (E1)
- [x] Belge erişilemez graceful degradation (E2)
- [x] Fuzzy matching karşılaştırma (E3)
- [x] Lazy page loading (E4)
- [x] Blind review'da existing_reviews gizleme (E5)
- [x] Partial save (E6)

### Truth Anayasası ✅
- [x] source_sentence zorunlu, yoksa "kaynak_eksik" (A1)
- [x] Doğrulama sayısı her yerde görünür (A2)
- [x] Composite confidence, AI hesaplamasın (A3)

> **Sonuç: 16 bulgu, hepsi çözümlenmiş. Plan uygulamaya hazır.**

---

## 15. ARAŞTIRMA ARŞİVİ YENİDEN İNCELEME BULGULARI (25 Mart 2026)

> 362 dosya, v2 gözlüğüyle yeniden okundu. 3 kör nokta, 3 çatışma tespit edildi.

### 15.1 KÖR NOKTALAR (Plana Eklenmesi Gereken)

| # | Kör Nokta | Kaynak | Çözüm |
|---|-----------|--------|-------|
| KN1 | **Auto-promote manipülasyonu** — Sybil savunması mevcut ama Verification Desk v2 bağlamında "2 reviewer yeterli" kuralı hâlâ risk. Voting ring'ler 2 hesapla görev geçirebilir. | DEEP_07_MANIPULATION_PROOF, Game Bible Bölüm 6.3 | Minimum 3 bağımsız reviewer (2 değil). Timing analizi: <5dk arayla aynı karara varan 2+ reviewer → otomatik flag. Hesap yaşı <30 gün → oy ağırlığı 0.1x (mevcut auth stratejisi). |
| KN2 | **Entity resolution eşik değerleri** — Mevcut tek global eşik (0.85) PERSON tipi için tehlikeli. "John Smith" vs "Joan Smith" → Jaro-Winkler 0.95 → false merge → iftira riski. | ENTITY_RESOLUTION_COMPREHENSIVE_RESEARCH | Tip-spesifik eşikler: PERSON=0.90, ORG=0.85, LOCATION=0.75, CASE=1.0 (tam eşleşme). 4 aşamalı blokaj: fonetik (Soundex) + metin (JW) + semantik (FastText) + bağlam (belge tipi). Türkçe normalizasyon (ğ→g, ü→u, ö→o) zaten var, ama fonetik katman EKSİK. |
| KN3 | **Blind review tam kör değil** — Katman 1'de spotlight bölgesi = AI'ın "buraya bak" demesi. Bu bile bir bias. Honeypot %20 ile azaltılıyor ama spotlight'ın kendisi bir yönlendirme. | Stres testi G1 genişletmesi | Blind review'da spotlight YOK seçeneği: görevlerin %30'unda belge tamamı gösterilir, kullanıcı kendi ilgili bölgeyi bulur. Bu görevler kalibrasyon honeypot ile birleştirilebilir. Spotlight olan görevlerde "Bu bölgede aradığım bilgi yok" seçeneği ZORUNLU. |

### 15.2 ÇATIŞMALAR VE KARARLAR

| # | Çatışma | Plan Pozisyonu | Araştırma Pozisyonu | KARAR |
|---|---------|----------------|---------------------|-------|
| Ç1 | **Tek AI modeli mi, çoklu model mi?** | Tek model (Groq llama-3.3-70b) | Multi-model consensus %40 halüsinasyon azaltır (3x re-prompt, farklı modeller) | **ÇOKLU MODEL** — ama bütçe farkında. Başlangıç: Groq (ucuz, hızlı) tüm görevler. Yüksek riskli (suç iddiası, mağdur tanımı): 2. model (Claude Haiku veya Gemini Flash) ile çapraz kontrol. Maliyeti minimize et: sadece yüksek riskli görevlerde 2. model. |
| Ç2 | **Anlık vs gecikmeli konsensüs** (yüksek riskli ilişki iddiaları) | Auto-promote, safety threshold | Delayed consensus daha güvenli | **GECİKMELİ KONSENSÜS** — Yüksek riskli iddialar (suç, mağduriyet, ölüm) için 48 saat bekleme + 3 bağımsız reviewer. Nedeni: Legal Fortress "defamation is per se for criminal accusations" — anında onay = hukuki risk. Normal ilişkiler (iş ilişkisi, tanışıklık) → standart auto-promote (2 reviewer, anlık). Risk sınıflandırması: `evidence_type` + anahtar kelime analizi (kill, murder, trafficking, abuse → yüksek risk). |
| Ç3 | **Tek panel mi, split panel mi?** | Tek panel (spotlight + görev kartı) | v1'de 3 panel başarısız olmuştu | **SPLİT PANEL (v2 MİMARİ)** — Raşit'in eureka anı: orijinal belge sol tarafta dokunulmaz referans, sağ tarafta interaktif spotlight + efektler + görev. v1'den FARKLI: v1 3 paneldi (referans+OCR+görev), v2 2 panel (referans+interaktif). Orijinal belgenin sürekli görünür olması: (1) bağlam koruması, (2) honeypot doğrulama kolaylığı, (3) manipülasyon direnci, (4) gazeteci alışkanlığıyla uyum. |

### 15.3 GÜÇLENDİRME NOKTALARI (Araştırmadan Plana Eklenen)

1. **Timing analizi** (DEEP_07): Koordineli saldırı tespiti için sadece "aynı karar" değil, <5dk zaman penceresi + aynı IP bloğu + aynı hedef üçlüsü → otomatik flag + soğuma periyodu
2. **Reviewer doğruluk takibi** (Game Bible): Her reviewer'ın doğruluk oranı izlenir. <%70 → oy ağırlığı yarıya düşer. <%50 → görev ataması durdurulur + re-kalibrasyon zorunlu.
3. **Adaptif confidence eşikleri** (CONSENSUS_SCORING): Sabit %80 yerine ±%8 varyasyon. Yeni veri alanı (ilk kez bu tip belge) → eşik %88'e çıkar. Olgun alan → eşik %72'ye düşebilir.
4. **Fonetik eşleştirme** (ENTITY_RESOLUTION): Soundex + Double Metaphone Türkçe adaptasyonu. "Mehmet" vs "Memet" → fonetik eşleşme → entity resolution görevine düşer.
5. **OCR güven katmanları** (COURT_DOCUMENT_ANALYSIS): OCR confidence <0.80 → spotlight'ta uyarı. <0.60 → görev oluşturulmaz, belge "düşük kalite" olarak işaretlenir.

---

## 16. KESİNLEŞMİŞ MİMARİ KARARLAR (25 Mart 2026)

> Bu kararlar Raşit ile birlikte alındı. Plana son şeklini veren kararlar.

### 16.1 Split Panel Mimarisi ✅ KESİN
```
┌──────────────────────┬──────────────────────┐
│   SOL — ORİJİNAL     │   SAĞ — İNTERAKTİF   │
│   (react-pdf)        │   (canvas + overlay)  │
│   Dokunulmaz          │   Spotlight aktif      │
│   Scroll senkron      │   Scanner animation    │
│   Her an erişilebilir │   Görev kartı          │
│   Efekt YOK           │   Tüm etkileşim       │
└──────────────────────┴──────────────────────┘
```
- Mobil: Tab geçişi (Orijinal | Görev)
- Masaüstü: Yan yana (50/50 veya sürüklenebilir bölücü)
- Sync: Sağda sayfa değişince → sol aynı sayfaya scroll (opsiyonel toggle)

### 16.2 Multi-Model Stratejisi ✅ KESİN
```
Normal görevler:
  → Groq llama-3.3-70b (ucuz, hızlı, yeterli)

Yüksek riskli görevler (suç, mağduriyet, ölüm iddiası):
  → Groq + 2. model çapraz kontrol
  → 2. model seçenekleri: Claude Haiku ($0.25/1M), Gemini Flash (ücretsiz tier)
  → İki model uyuşmazlığı → otomatik 3. reviewer atama

Risk tespiti:
  → evidence_type: court_record, criminal_accusation, victim_identification
  → Anahtar kelime: kill, murder, trafficking, abuse, mağdur, suç, ölüm
  → Tier 1 node'lar (Masterminds) → her zaman yüksek risk
```

### 16.3 Konsensüs Stratejisi ✅ KESİN
```
STANDART İLİŞKİLER (iş, tanışıklık, aile, sosyal):
  → 2 reviewer + %80 confidence → anlık auto-promote
  → Standart akış

YÜKSEK RİSKLİ İDDİALAR (suç, mağduriyet, ölüm, istismar):
  → 3 reviewer ZORUNLU
  → 48 saat bekleme süresi (cooling period)
  → %85 confidence minimum (standarttan yüksek)
  → "İddia edilen" (alleged) etiketi ZORUNLU
  → Auto-promote sonrası bile reverification kuyruğuna hızlı döngü (7 gün)
  → Legal Fortress uyumlu: per se defamation koruması
```

### 16.4 Entity Resolution Eşikleri ✅ KESİN
```
PERSON:   0.90 (en yüksek — iftira riski)
ORG:      0.85 (kurumsal)
LOCATION: 0.75 (lokasyon isim varyasyonları fazla)
CASE:     1.00 (tam eşleşme zorunlu — dava numarası)
EVENT:    0.85 (tarih + lokasyon çapraz kontrol)

Ek katmanlar:
  → Fonetik (Soundex/Double Metaphone) — Türkçe adapteli
  → Semantik (FastText vektör benzerliği) — gelecek sprint
  → Bağlam (aynı belge/aynı dava) — bonus +0.05
```

### 16.5 Blind Review Spotlight Politikası ✅ KESİN
```
Görevlerin dağılımı:
  %50 — Normal spotlight (AI'ın önerdiği bölge aydınlatılır)
  %20 — Honeypot spotlight (kasıtlı YANLIŞ bölge — dikkat testi)
  %30 — Spotlight YOK (belge tamamı gösterilir — kullanıcı kendi bulur)

Tüm görevlerde:
  → "Bu bölgede aradığım bilgi yok" seçeneği ZORUNLU
  → Honeypot + spotlight-yok görevleri kalibrasyon verisi olarak kullanılır
```

### 16.6 Honeypot → Trust Weight Mekanizması ✅ KESİN (Raşit Kararı)

> **Felsefe:** "Sistem dikkati, zekayı ve karakteri ödüllendirmeli."
> Kullanıcı honeypot'un varlığından ASLA haberdar olmamalı. Sistem sessizce ölçer.

**Temel Prensip:**
- Honeypot = gizli dikkat/zeka testi
- Kullanıcı "honeypotu fark ettim" DEMEMELİ
- Sistem otomatik algılar: "Bu kişi yanlış spotlight'a kanmadı"
- Sonuç: trust_weight doğal olarak yükselir

**Nasıl Çalışır (Görünmez Mekanizma):**
```
Honeypot görev atanır (kullanıcı bilmez):
  → Spotlight YANLIŞ bölgeyi aydınlatır
  → Kullanıcı A: "Pilot ifadesi burada yazıyor" → spotlight'a güvendi → BAŞARISIZ
  → Kullanıcı B: "Bu bölgede aradığım bilgi yok" → sol panele baktı → BAŞARILI
  → Kullanıcı C: Kendi bulduğu doğru cevabı yazar → sol panelden buldu → BAŞARILI+

Spotlight-yok görev (kullanıcı bilmez):
  → Belge tamamı gösterilir
  → Kullanıcı doğru bölgeyi kendi bulursa → DERİN DİKKAT
  → Bulamazsa → NORMAL (ceza yok, sadece veri noktası)
```

**Trust Weight Formülüne Eklenen 6. Sinyal:**
```
trust_weight = (
  kalibrasyon_doğruluğu × 0.30 +     // Mevcut: honeypot sorular (Game Bible)
  çapraz_doğrulama_oranı × 0.20 +    // Mevcut: diğer reviewer'larla uyum
  gerekçe_kalitesi × 0.15 +          // Mevcut: reasoning uzunluk + kaynak ref
  tutarlılık × 0.10 +                // Mevcut: benzer görevlerde tutarlı karar
  alan_uzmanlığı × 0.10 +            // Mevcut: finans/hukuk/istihbarat doğruluğu
  spotlight_direnci × 0.15            // YENİ: honeypot + spotlight-yok performansı
)
```

**spotlight_direnci Hesaplama:**
```typescript
function calculateSpotlightResistance(reviewer: ReviewerProfile): number {
  const honeypotTasks = reviewer.tasks.filter(t => t.is_honeypot);
  const noSpotlightTasks = reviewer.tasks.filter(t => t.spotlight_mode === 'none');

  // Honeypot'ta doğru tespit oranı (yanlış bölgeyi reddetme)
  const honeypotScore = honeypotTasks.length > 0
    ? honeypotTasks.filter(t => t.rejected_spotlight).length / honeypotTasks.length
    : 0.5; // Yeterli veri yoksa nötr

  // Spotlight-yok görevlerde doğru bölgeyi bulma oranı
  const noSpotlightScore = noSpotlightTasks.length > 0
    ? noSpotlightTasks.filter(t => t.found_correct_section).length / noSpotlightTasks.length
    : 0.5; // Yeterli veri yoksa nötr

  // Ağırlıklı: honeypot reddi daha değerli (aktif direnç > pasif buluş)
  return honeypotScore * 0.6 + noSpotlightScore * 0.4;
}
```

**Ödül Kademesi (Sessiz, Görünmez):**
```
spotlight_direnci < 0.3 → trust_weight düşer (körü körüne güveniyor)
spotlight_direnci 0.3-0.7 → trust_weight değişmez (ortalama dikkat)
spotlight_direnci > 0.7 → trust_weight yükselir (eleştirel düşünür)
spotlight_direnci > 0.9 → KALKINMA ADAYI (Tier yükseltme sinyali)

Minimum veri: En az 5 honeypot + 5 spotlight-yok görev tamamlanmadan hesaplanmaz
Cold start: İlk 10 görev → spotlight_direnci = 0.5 (nötr)
```

**Neden Sessiz:**
- Kullanıcı "honeypot var, dikkatli olayım" derse zaten hep dikkatli olur → test anlamsızlaşır
- Ama gerçek dikkat = organik davranış. Bunu ölçmek için kullanıcı bilmemeli.
- Sonuç olarak kullanıcı sadece şunu fark eder: "Dürüst ve dikkatli çalıştıkça oyum daha ağır basıyor"
- Bu tam olarak Truth Anayasası ruhu: "Dürüstlük HER ZAMAN en kârlı strateji"

**DB Değişiklikleri:**
```sql
-- investigation_tasks tablosuna:
ALTER TABLE investigation_tasks ADD COLUMN spotlight_mode TEXT DEFAULT 'normal';
  -- 'normal' | 'honeypot' | 'none'
ALTER TABLE investigation_tasks ADD COLUMN honeypot_target_section JSONB;
  -- honeypot modunda: doğru bölgenin koordinatları (yanlış bölge task_data.source_location'da)

-- task_assignments tablosuna:
ALTER TABLE task_assignments ADD COLUMN rejected_spotlight BOOLEAN DEFAULT FALSE;
  -- Kullanıcı "bu bölgede bilgi yok" dediyse TRUE
ALTER TABLE task_assignments ADD COLUMN found_correct_section BOOLEAN DEFAULT FALSE;
  -- spotlight-yok modunda doğru bölgeyi bulduysa TRUE

-- investigator_profiles tablosuna:
ALTER TABLE investigator_profiles ADD COLUMN spotlight_resistance FLOAT DEFAULT 0.5;
  -- 0.0-1.0, her honeypot/spotlight-yok sonrası güncellenir
ALTER TABLE investigator_profiles ADD COLUMN honeypot_completed INTEGER DEFAULT 0;
ALTER TABLE investigator_profiles ADD COLUMN no_spotlight_completed INTEGER DEFAULT 0;
```
