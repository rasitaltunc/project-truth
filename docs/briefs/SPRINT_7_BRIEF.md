# SPRINT 7: "AKILLI LENS" — Görüş Modları + AI Entegrasyonu

> **Tarih:** 7 Mart 2026
> **Durum:** STRATEJİK BRIEF — Onay Bekliyor
> **Önkoşul:** Sprint 6C tamamlanmış olmalı
> **Araştırma Temeli:** 3 derin araştırma raporu (210+ kaynak, 6 rakip analizi, 52 akademik referans)

---

## 🎯 TEK CÜMLE

**Kullanıcının "ne görmek istediğini" anlayan ve ağı buna göre yeniden şekillendiren akıllı lens sistemi.**

---

## 📊 ARAŞTIRMA ÖZETİ: NEDEN 5 LENS?

### Bilimsel Gerekçe
- **Miller Yasası:** İnsan beyni aynı anda ~7 bilgi parçası tutabilir → 7'den fazla mod = karar felci
- **Hick Yasası:** Seçenek sayısı arttıkça karar süresi logaritmik artar
- **EEG Araştırması:** 50+ node (yoğun) veya 100+ node (seyrek) ağlarda doğruluk %50'nin altına düşüyor
- **Endüstri Standardı:** IBM QRadar 4, Maltego 4 layout, Palantir 4-5 workspace → **4-6 mod optimal**
- **Bizim kararımız: 5 LENS** (sweet spot)

### Rakip Analizi — Ne Eksik?
| Rakip | En Büyük Sorun |
|-------|----------------|
| **Maltego** | Filtreleme yıkıcı — node silersin, spatial hafıza yok olur |
| **Palantir** | Milyonlarca dolar, aylarca kurulum, katı şema |
| **Neo4j Bloom** | Cypher öğrenmek zorundasın |
| **OCCRP/ICIJ** | Metin arama ↔ graf görselleştirme AYRI ortamlar |
| **Gephi** | 2008 arayüzü, menü cehennemi, yıkıcı filtreleme |

### 🏆 HİÇ KİMSENİN YAPMADIĞI 5 ŞEY (BİZİM USP)
1. **Z-Axis Ghosting** — Filtrelenen node'lar silinmez, arkaya itilip soluklaştırılır (3D derinlik avantajı)
2. **Proaktif AI Lens Önerisi** — AI sessizce topolojiyi analiz edip mod öneriyor
3. **Soruşturma State Playback** — Her filtre adımı kaydedilir, slider ile geri sarılır
4. **Doğal Dil Özet** — Filtrelenmiş alt-ağ için AI otomatik özet üretir
5. **Graph-to-Document Symbiosis** — Belge node'una çift tıkla → 3D'de açılır, isim seç → ağ filtrele

---

## 🔭 5 LENS SİSTEMİ

### LENS 1: FULL NETWORK (Tam Ağ) — Varsayılan
```
👤 Herkes için | 🎯 Genel bakış
```
- **Ne gösterir:** Tüm node'lar, tüm ipler, tüm renkler
- **Ne gizler:** Hiçbir şey
- **Kullanım:** İlk açılış, genel gezinme, "büyük resim"
- **Teknik:** Mevcut durum — değişiklik yok

### LENS 2: MAIN STORY (Ana Hikaye)
```
👤 Vatandaş Araştırmacı, Gazeteci | 🎯 "Bu dosya ne anlatıyor?"
```
- **Ne gösterir:**
  - Tier 0-1 node'lar (mastermind + key players) TAM parlak
  - Keystone evidence bağlantıları kalın + parlak
  - Aralarındaki ipler güçlü
- **Ne gizler (ghost):**
  - Tier 3-4 node'lar %15 opacity'ye (silinmez, arka plana itilir)
  - Leaf node'lar (tek bağlantılı) neredeyse görünmez
  - Düşük confidence ipler çok soluk
- **AI entegrasyonu:** "Ana hikayeyi anlat" → otomatik bu moda geçiş + AI özet paneli
- **Tetikleyici sorgular:** "ana aktörler kimler?", "hikayeyi özetle", "kilit oyuncular"

### LENS 3: FOLLOW THE MONEY (Parayı Takip Et)
```
👤 Gazeteci, Kurumsal Analist | 🎯 "Para nereye akıyor?"
```
- **Ne gösterir:**
  - Finansal node'lar (banka, şirket, shell company) TAM parlak
  - Financial link'ler MAVİ renkli + yön okları (para akış yönü)
  - Edge kalınlığı = transfer miktarı
  - Banka/şirket node'ları büyütülmüş
- **Ne gizler (ghost):**
  - Sosyal ilişkiler, aile bağları %10 opacity
  - Fiziksel lokasyonlar soluk
  - Kişi node'ları küçültülmüş (ama silinmemiş)
- **AI entegrasyonu:** "parayı takip et" → moda geçiş + AI para akış analizi
- **Tetikleyici sorgular:** "finansal bağlantılar", "para akışı", "shell company", "banka transferi"

### LENS 4: EVIDENCE MAP (Kanıt Haritası)
```
👤 Gazeteci, Akademisyen, Kurumsal | 🎯 "Neyi kanıtlayabilirim?"
```
- **Ne gösterir:**
  - Node/link rengi = kanıt tipi (mahkeme=kırmızı, resmi belge=sarı, medya=mavi)
  - Node boyutu = confidence level (yüksek güven = büyük)
  - Verified bağlantılar parlak, kalın
  - Sprint 6B epistemolojik shader'ları aktif
- **Ne gizler (ghost):**
  - "Unverified" / "Low Confidence" node'lar %20 opacity
  - Çıkarım (inference) bazlı link'ler noktalı çizgi + çok soluk
- **AI entegrasyonu:** "ne kanıtlanmış?" → moda geçiş + güven analizi
- **Tetikleyici sorgular:** "kanıt", "doğrulanmış", "mahkeme kaydı", "yayınlanabilir"
- **NOT:** Bu mod zaten Sprint 6B epistemolojik modunun evrimleşmiş hali

### LENS 5: TIMELINE (Kronolojik Görünüm)
```
👤 Gazeteci, Kurumsal Analist | 🎯 "Ne zaman ne oldu?"
```
- **Ne gösterir:**
  - Alt kısımda zaman slider'ı (1990–2026)
  - Slider pozisyonuna göre node/link'ler belirip kaybolur
  - Ağ "büyürken" izlenir (kronolojik film gibi)
  - Aktif zaman aralığındaki olaylar parlak
- **Ne gizler:**
  - Seçili zaman aralığı dışındaki node/link'ler tamamen gizli
  - Slider ileri-geri sürüklenince ağ animasyonlu değişir
- **AI entegrasyonu:** "timeline göster" → moda geçiş + dönem analizi
- **Tetikleyici sorgular:** "ne zaman", "kronoloji", "tarih sırası", "1998'de ne oldu"

---

## 🧠 AI ↔ LENS ENTEGRASYONU

### Intent-to-Mode Mapping
```
Kullanıcı sorusu → LLM intent sınıflandırma → JSON payload → Lens değiştir
```

**LLM'e eklenen system prompt:**
```
Kullanıcının sorusunu analiz et. Aşağıdaki intent kategorilerinden birini seç:
- FULL_NETWORK: genel soru, spesifik filtre gerektirmeyen
- MAIN_STORY: ana aktörler, kilit oyuncular, hikaye özeti
- FOLLOW_MONEY: finansal, para akışı, banka, transfer
- EVIDENCE_MAP: kanıt, doğrulama, güven seviyesi, yayınlanabilir
- TIMELINE: kronolojik, tarih, ne zaman, dönem

JSON döndür: { "intent": "FOLLOW_MONEY", "confidence": 0.92, "suggestMode": true }
```

**Confidence eşikleri:**
- **> 0.85:** AI otomatik mod önerir ("Para akışını görmek ister misin?" banner)
- **0.5–0.85:** AI sadece highlight yapar, mod değiştirmez
- **< 0.5:** Normal yanıt, mod önerisi yok

### Progressive Disclosure (Kademeli Açılım)
Araştırmanın en güçlü bulgusu: **ani geçiş yapma, kademeli aç.**

```
Faz 1: Soft Filter (300ms) → İlgisiz node'lar opacity 0.15'e
Faz 2: Highlight (300ms)   → İlgili node'lar parlak + büyük
Faz 3: Augment (300ms)     → Yön okları, kalınlık, renk değişimi
Faz 4: Summary (500ms)     → AI özet paneli açılır
```

**Toplam geçiş: ~1.4 saniye — akıcı, sinematik, spatial hafıza korunur.**

### Proaktif AI Tetikleyiciler
| Tetikleyici | Kullanıcı Davranışı | AI Aksiyonu |
|-------------|---------------------|-------------|
| Sorgu kümelenmesi | 3+ art arda finansal soru | "Follow The Money moduna geçmek ister misin?" |
| Odaklanma tespiti | Aynı alt-kümeye tekrar tekrar zoom | İlgili lens önerisi |
| Tıkanma tespiti | Tekrarlayan sorular, yeni insight yok | Alternatif lens önerisi |

---

## 🖥️ UX MİMARİSİ

### Sol Sidebar (Persistent, Collapsible)
```
┌─────────────────┐
│ 🌐 FULL NETWORK │ ← Aktif lens vurgulu
│ 📖 MAIN STORY   │
│ 💰 FOLLOW MONEY │
│ 🔍 EVIDENCE MAP │
│ ⏳ TIMELINE      │
├─────────────────┤
│ ⚙️ Lens Ayarları│ ← Aktif lense özel filtreler
│   □ Tier 0-1    │    (accordion panel)
│   □ Verified    │
│   ○─────● Conf. │
└─────────────────┘
```

### Geçiş Animasyonu (Spatial Hafıza Koruma)
Araştırmanın kritik bulgusu: **NODE POZİSYONLARI ASLA DEĞİŞMEZ.**

```
1. REMOVAL PHASE  → İlgisiz node'lar fade out (opacity azalır)
2. TRANSFORM PHASE → Kalan node'lar renk/boyut değiştirir
3. ADDITION PHASE  → Yeni görseller (oklar, etiketler) fade in
```

Bu 3 aşamalı sıralama "change blindness"ı tamamen ortadan kaldırır.

### Z-Axis Ghosting (3D USP)
Rakiplerin hiçbirinde olmayan özellik:
```
Aktif node'lar: z=0 (ön plan), opacity=1.0, scale=1.0
Ghost node'lar: z=-5 (arka plan), opacity=0.12, scale=0.7, desaturated
```
3D derinlik = filtreleme boyutu. 2D araçlar bunu yapamaz.

---

## 📐 TEKNİK MİMARİ

### 4 Katmanlı Sistem
```
┌─────────────────────────────────────────┐
│ LAYER 4: SPATIAL RENDERING              │
│ Three.js + Shader + Transition Animator │
│ Z-Axis ghosting, staged transitions     │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│ LAYER 3: STATE MANAGEMENT               │
│ viewModeStore.ts (Zustand)              │
│ Diff calculator, telemetry, snapshots   │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│ LAYER 2: COGNITIVE INTELLIGENCE         │
│ LLM (Groq) + Intent Classifier         │
│ Few-shot prompting, JSON output         │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│ LAYER 1: SEMANTIC & DATA               │
│ Supabase + Node/Link metadata          │
│ evidence_type, tier, confidence, dates  │
└─────────────────────────────────────────┘
```

### Yeni Dosyalar
```
src/store/viewModeStore.ts          — Lens state management
src/components/LensSidebar.tsx      — Sol sidebar UI
src/components/LensTransition.ts    — Animasyon orchestrator
src/components/TimelineSlider.tsx   — Timeline lens slider
src/lib/intentClassifier.ts         — AI intent → lens mapping
```

### viewModeStore.ts Temel Yapı
```typescript
type ViewMode = 'full_network' | 'main_story' | 'follow_money' | 'evidence_map' | 'timeline';

interface ViewModeState {
  activeMode: ViewMode;
  previousMode: ViewMode | null;
  modeHistory: ViewMode[];           // State playback için
  timelineRange: [Date, Date] | null;
  lensFilters: Record<ViewMode, LensFilter>;
  isTransitioning: boolean;
  aiSuggestion: { mode: ViewMode; confidence: number } | null;

  // Actions
  setMode: (mode: ViewMode) => void;
  revertMode: () => void;
  setTimelineRange: (range: [Date, Date]) => void;
  dismissAiSuggestion: () => void;
  acceptAiSuggestion: () => void;
}
```

### Truth3DScene Entegrasyonu
```typescript
// Her lens için node visibility hesaplama
function getNodeVisibility(node, activeMode): { opacity, scale, zOffset, color } {
  switch (activeMode) {
    case 'main_story':
      return node.tier <= 1
        ? { opacity: 1.0, scale: 1.0, zOffset: 0, color: tierColor }
        : { opacity: 0.12, scale: 0.7, zOffset: -5, color: desaturate(tierColor) };
    case 'follow_money':
      return node.type === 'organization' || node.occupation?.includes('bank')
        ? { opacity: 1.0, scale: 1.2, zOffset: 0, color: 0x3b82f6 }
        : { opacity: 0.10, scale: 0.6, zOffset: -5, color: 0x333333 };
    // ...
  }
}
```

---

## 📅 İMPLEMENTASYON PLANI

### Faz A — Store + Sidebar UI (1 sprint)
- [ ] viewModeStore.ts
- [ ] LensSidebar.tsx (5 lens butonu + aktif lens filtre paneli)
- [ ] truth/page.tsx entegrasyonu

### Faz B — 3D Geçiş Motoru (1 sprint)
- [ ] getNodeVisibility() + getLinkVisibility() fonksiyonları
- [ ] Staged transition animator (remove → transform → add)
- [ ] Z-Axis ghosting (3D derinlik filtreleme)
- [ ] Shader uniform güncellemeleri (lens bazlı renk/opacity)

### Faz C — AI Intent Sistemi (1 sprint)
- [ ] intentClassifier.ts (Groq prompt → JSON intent)
- [ ] chatStore.ts → sendMessage() sonrası intent analizi
- [ ] AI suggestion banner (ChatPanel'de veya 3D overlay'de)
- [ ] Progressive disclosure animasyon sıralaması

### Faz D — Timeline Lens (1 sprint)
- [ ] TimelineSlider.tsx (alt panel, drag, play/pause)
- [ ] Temporal filtreleme (event_date bazlı node/link göster/gizle)
- [ ] Animasyonlu ağ büyümesi (kronolojik film)

### Faz E — Polish + USP Özellikleri
- [ ] State playback slider (soruşturma adımlarını geri sar)
- [ ] AI generative summary (filtrelenmiş alt-ağ özeti)
- [ ] Lens bazlı tooltip güncellemeleri

---

## 🎯 BAŞARI KRİTERLERİ

1. ✅ 5 lens arası geçiş < 1.5 saniye (animasyonlu)
2. ✅ Node pozisyonları hiç değişmez (spatial hafıza korunur)
3. ✅ AI %85+ güvenle doğru lens öneriyor
4. ✅ Ghost node'lar görünür ama dikkat dağıtmıyor (opacity 0.10-0.15)
5. ✅ Timeline slider'ı ile ağ kronolojik olarak "büyüyor"
6. ✅ Tek tıkla mod değişimi (sidebar)
7. ✅ AI konuşmada intent algılayıp mod öneriyor

---

## 🌟 BU NİYE ÖNEMLİ?

> "Hiçbir rakip 3D derinliği filtreleme boyutu olarak kullanmıyor.
> Hiçbir rakip AI'ın sessizce topolojiyi analiz edip proaktif lens önerdiği bir sistem sunmuyor.
> Hiçbir rakip soruşturma adımlarını slider ile geri sarma imkanı vermiyor.
> Hiçbir rakip filtrelenmiş alt-ağ için otomatik doğal dil özeti üretmiyor.
>
> Project Truth bu 4'ünü birden yapan ilk platform olacak."

---

**Son Güncelleme:** 7 Mart 2026
**Yazar:** Claude (Stratejist) + Raşit Altunç (Vizyon)
**Araştırma Kaynakları:** 3 derin araştırma raporu, 210+ kaynak, 52 akademik referans
