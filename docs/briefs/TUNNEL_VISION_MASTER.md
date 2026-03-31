# IP TÜNEL — MASTER VİZYON DOKÜMANI
> Sprint 14A Derin Araştırma Sentezi | 8 Mart 2026

---

## 1. BÜYÜK RESİM: TÜNEL NEDİR?

Tünel = İki kişi/kurum arasındaki ilişkinin **sinematik belgesel deneyimi**.

Kullanıcı bir ipe tıklamıyor — bir hikayeye **giriyor**.

```
KULLANICI SORUSU
     │
     ▼
AI KÜRATÖR (Groq llama-3.3-70b)
├── Niyet Analizi (victims? money? timeline? conspiracy?)
├── Kanıt Seçimi (relevance scoring, max 12 panel)
├── Hikaye Başlığı ("Para İzi", "Kurbanların Sesi", "Gizli Anlaşma")
├── Narratif Arc (setup → build → climax)
└── Tema Otomatik Seçimi (shame/court/finance/press/darkroom/intelligence)
     │
     ▼
TÜNEL DENEYİMİ
├── Fiber optik silindir (canlı wireframe duvarlar)
├── AR holografik paneller (kanıtlar)
├── Spatial audio (HRTF + Tone.js drone)
├── Sinematik kamera (otomatik ilerleme)
└── Detay modu (panel tıklama → büyük AR overlay)
```

---

## 2. AI → TÜNEL AKIŞI (Chat Entegrasyonu)

### Senaryo 1: Kullanıcı Chat'te Soru Soruyor
```
Kullanıcı: "Kurbanlar kimlerdi? Maxwell ne rol oynadı?"
     │
     ▼
AI Cevaplıyor + Ağda highlight yapıyor
     │
     ▼
AI Öneriyor: "Bu soruşturmayı tünel olarak deneyimlemek ister misiniz?"
     │
     ▼
[TÜNELE GİR] butonu → Otomatik tema: "shame" veya "court"
Tünel başlığı: "Kurban Ağının Kuruluşu: 1991-2008"
Sadece kurbanlarla ilgili kanıtlar gösterilir.
```

### Senaryo 2: Kullanıcı Direkt İpe Tıklıyor
```
3D Ağda Epstein ↔ Maxwell ipine tıkla
     │
     ▼
Tünel açılır: tema = "shame" (hepsi), tüm kanıtlar kronolojik
HUD'da tema değiştirme aktif
```

### Senaryo 3: AI Proaktif Öneri
```
Kullanıcı uzun süredir finans soruları soruyor
     │
     ▼
AI: "Bu bağlantıdaki para akışını görselleştirmek ister misiniz?"
     │
     ▼
[TÜNELE GİR] → tema: "finance"
Başlık: "Gizli Para Akışı: Deutsche Bank → JP Morgan"
```

### Groq Küratör Çağrısı
```typescript
// json_schema mode — yapılandırılmış çıktı
const curation = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  temperature: 0.1, // Düşük = tutarlı kürasyon
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "TunnelCuration",
      schema: {
        tunnelTitle: "string",     // "Kurban Ağının Kuruluşu"
        narrativeArc: "string",    // 3 cümle özet
        theme: "string",           // shame|court|finance|press|darkroom|intelligence
        curatedEvidence: [{
          evidenceId: "string",
          relevanceScore: "number", // 0-1
          narrativeRole: "string",  // setup|build|climax|reveal
          panelOrder: "integer"
        }]
      }
    }
  }
});
```

---

## 3. PANEL TIKLAMA → DETAY MODU (AR Focus)

Şu an paneller sadece gösteriliyor. Tıklama sistemi:

### Akış:
```
Kullanıcı panele tıklar
     │
     ▼
Kamera DURUR (otomatik ilerleme pause)
     │
     ▼
Panel'in önünde DETAY PANELİ açılır
(Yolun ortasında, göz seviyesinde, büyük AR overlay)
     │
     ▼
Arka plan %45 karartılır (scrim)
     │
     ▼
Detay panelde:
├── Büyük başlık + tam özet
├── Güven barı (confidence meter: yeşil/sarı/turuncu/kırmızı)
├── Kaynak provenance zinciri
├── Mini timeline (bu kanıtın hikayedeki yeri)
├── İlgili diğer bağlantılar ("Bu kişi X ile de bağlantılı")
└── [İLERİ] [GERİ] navigasyon
     │
     ▼
ESC veya panel dışı tıklama → detay kapanır, kamera devam eder
```

### Detay Panel Boyutu:
- Genişlik: Ekranın %60'ı
- Yükseklik: Dinamik (içeriğe göre)
- Pozisyon: Kameranın 0.5m önünde, merkezde
- Materyal: Glass morphism (%30 opacity + 6px blur + Fresnel kenar glow)

---

## 4. GÖRSEL KALİTE PARAMETRELERİ (Araştırma Sonuçları)

### 4.1 Renk Bilimi — Premium vs Ucuz

| Kullanım | Hex | RGB | Neden |
|----------|-----|-----|-------|
| Ana Kırmızı (wire) | #8C1420 | (140, 20, 32) | Derin bordo — flat değil, premium |
| Accent Glow (bloom) | #FF5959 | (255, 89, 89) | Sıcak, "hot" görünüm |
| Gölge/Derinlik | #3D0A0E | (61, 10, 14) | Derinlik tanımlayan en koyu |
| Ambient Sis | #8B0000 | (139, 0, 0) | Volumetrik sis, detayları yutmaz |

**Kural:** Kontrast oranı parlak:karanlık = 10:1 ila 20:1 (AAA oyun standardı)

### 4.2 Bloom Parametreleri (Premium Glow)

| Parametre | Değer | Neden |
|-----------|-------|-------|
| Threshold | 0.35-0.5 | Sadece en parlak pikseller bloom yapar |
| Blur Passes | 6-8 | Daha fazla = daha yumuşak, rüya gibi |
| Intensity | 0.3-0.6 | 0.5 güvenli varsayılan |
| Sigma | 1.5-2.5px | Gaussian bulanıklık çapı |

**Şu anki sorun:** intensity=1.2, threshold=0.1 → HER ŞEY parlıyor = ucuz
**Çözüm:** intensity=0.5, threshold=0.4 → SADECE wire pulse'ları parlıyor = premium

### 4.3 Pulse/Enerji Dalga Tasarımı

**En iyi kombine: Sine + Triangle (dual-layer)**
```glsl
float sine = sin(z * 3.0 + time * 2.0) * 0.5 + 0.5;
float triangle = 1.0 - abs(2.0 * fract(z * 4.5 + time * 2.0) - 1.0);
float combined = mix(sine, triangle, 0.4); // %60 sine + %40 triangle
```

**Pulse Hızları:**
- Yavaş meditasyon: 1.5 Hz, 1.0 birim/sn (kurban teması)
- Orta immersive: 3.0 Hz, 3.0 birim/sn (genel)
- Hızlı intense: 5.0 Hz, 6.0 birim/sn (para/komplo teması)

**Gaussian Burst (tek seferlik etki):**
```glsl
float burst = exp(-(pow(z - time * speed, 2.0)) / 0.5);
// Her 4 saniyede bir: daha büyük, daha parlak dalga
```

### 4.4 Kamera Parametreleri

| Parametre | Değer | Neden |
|-----------|-------|-------|
| Hız | 1.5 birim/frame @60fps | İmmersif, amaçlı (bulantı riski düşük) |
| FOV | 68-72° | Geniş çevre = daha az bulantı |
| Head bob | ±0.02 birim, 1.5 Hz | Çok hafif (neredeyse hissetmeden) |
| Easing | Cubic Bezier | Başlangıç ease-out, bitiş ease-in |

### 4.5 Tünel Geometri

| Parametre | Değer | Neden |
|-----------|-------|-------|
| Radius | 3.0-3.5 birim | Geniş immersive (Animus stili) |
| Uzunluk:Yarıçap | 8:1 ila 12:1 | "İleriye koşma" hissi |
| Segment | 48-64 | Yeterince pürüzsüz |
| Organik dalga | ±%10 radius | `r = base * (1 + 0.1 * sin(z*0.5 + t*0.3))` |

---

## 5. AR PANEL TASARIMI (Araştırma Sonuçları)

### 5.1 Glass Morphism Parametreleri

| Parametre | Değer | Neden |
|-----------|-------|-------|
| Panel opacity | %15-20 | Arka plan görünsün (AR hissi) |
| Tint | rgba(0,0,0,0.15) + rgba(dc2626, 0.05) | Koyu cam + kırmızı hint |
| Backdrop blur | 4-6px | Okunabilirlik + derinlik dengesi |
| Kenar çizgisi | 1-2px, %20 opacity beyaz | Işık kırılması simülasyonu |
| Fresnel power | 2.0-3.0 | Kenar glow yoğunluğu |
| Fresnel renk | #ff4444, %30 intensity | Kırmızı holografik |

### 5.2 Tipografi

| Seviye | Boyut (1m mesafe) | Renk |
|--------|-------------------|------|
| Başlık | 36-48pt (2.5cm yükseklik) | #e5e5e5 (saf beyaz değil) |
| Gövde | 20-28pt (1.2cm) | #aaaaaa |
| Meta/Tarih | 14-18pt (0.8cm) | #777777 |

**Türkçe:** SDF rendering veya Canvas texture. Inter font ailesi Türkçe destekliyor.

### 5.3 Panel Animasyonları

**Açılış:** Scale 0.6→1.0 + opacity 0→1 + z -0.3→0 (500ms, spring physics)
**Kapanış:** Scale 1.0→0.8 + opacity 1→0 + z 0→-0.2 (300ms)
**Aktif Highlight:** Fresnel pulse (sine, 0.3-0.4 Hz, nefes alma hissi)

---

## 6. SES TASARIMI (Spatial Audio)

### 6.1 Ortam Katmanları

| Katman | Frekans | Amaç | Gain |
|--------|---------|------|------|
| Derin Drone | 32 Hz | Karın altında hissedilen gerilim | -20 dB |
| Gerilim Drone | 72 Hz | Bilişsel uyarı | -40 dB (varsayılan, dinamik) |
| Tünel Tonu | 300 Hz | Boş koridor karakteri | -25 dB |
| Hava Dolaşımı | 800-2000 Hz | Gerçekçilik | -30 dB |

### 6.2 UI Sesleri

| Aksiyon | Süre | Frekans | Gain | Tip |
|---------|------|---------|------|-----|
| Panel açılış | 150ms | 400→600 Hz sweep | -15 dB | Sawtooth |
| Kanıt yükleme | 100ms | 220 + 440 Hz harmoni | -20 dB | Sine |
| Highlight | 100ms | 880 Hz | -18 dB | Sine |
| Panel kapanış | 100ms | 600→400 Hz | -15 dB | Reverse |
| Timeline atlama | 80ms | 1200 Hz | -16 dB | Triangle |

### 6.3 Tema → Ses Eşleştirmesi

| Tema | Base Freq | Reverb | Pulse Rate | Karakter |
|------|-----------|--------|------------|----------|
| Victims/Shame | 52 Hz | 3.2s | 0.08 Hz | Yas, uzun eko |
| Money/Finance | 88 Hz | 1.8s | 0.20 Hz | Keskin, hızlı |
| Timeline | 60 Hz | 1.5s | 0.15 Hz | Metronom gibi |
| Conspiracy | 45 Hz | 4.0s | 0.05 Hz | Paranoya, mağara |

### 6.4 Teknoloji: HRTF + Tone.js
```javascript
// PannerNode — 3D ses konumlandırma
panner.panningModel = 'HRTF';
panner.distanceModel = 'inverse';
panner.rolloffFactor = 1;

// Tone.js — prosedürel drone
const drone = new Tone.Oscillator({ frequency: 32, type: 'sine' });
const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.6 });
const lfo = new Tone.LFO({ frequency: 0.1, min: 0.8, max: 1.2 });
```

---

## 7. SORUŞTURMA HAFıZASI (Case File)

### 4 Katmanlı Hafıza:
```
Katman 1: Çalışma Belleği (mevcut turn)
├── Son soru, aktif highlight'lar, mevcut tünel

Katman 2: Epizodik Bellek (son 10 turn)
├── Sorular, niyetler, keşfedilen node'lar

Katman 3: Olgusal Bellek (kalıcı)
├── Anahtar kişiler, olaylar, bağlantılar, hipotezler

Katman 4: Session Metadata
├── Başlangıç zamanı, ziyaret edilen node'lar, oluşturulan tüneller
```

Uzun konuşmalarda Groq ile eski turn'ler 2 cümleye sıkıştırılır.

---

## 8. İMPLEMENTASYON SIRASI

### Faz A — Mevcut İyileştirmeler (Hemen)
1. [ ] Bloom parametreleri düzelt (intensity 0.5, threshold 0.4)
2. [ ] Panel tıklama + kamera durma
3. [ ] Detay paneli (yolun ortasında, scrim overlay)
4. [ ] Pulse dual-layer (sine + triangle kombine)

### Faz B — AI Entegrasyonu (1-2 hafta)
5. [ ] Groq küratör endpoint (/api/tunnel/curate)
6. [ ] Chat → Tunnel pipeline (chatStore → tunnelStore)
7. [ ] Otomatik tema seçimi (intent → theme mapping)
8. [ ] Tünel başlık jenerasyonu (documentary-style)

### Faz C — Audio (1 hafta)
9. [ ] Tone.js entegrasyonu (ambient drone)
10. [ ] HRTF spatial audio (panel konumlarında ses)
11. [ ] UI sesleri (panel open/close/highlight)
12. [ ] Tema → ses eşleştirmesi

### Faz D — Polish (sürekli)
13. [ ] Fresnel glass shader (panel materyal)
14. [ ] Panel animasyonları (spring physics)
15. [ ] Organik tünel dalgası (radius warping)
16. [ ] Gamification elementleri (confidence meter, keystone marker)

---

## 9. TÜNEL İSİMLENDİRME ÖRNEKLERİ

AI'ın üreteceği belgesel tarzı başlıklar:

| Kullanıcı Sorusu | Tünel Başlığı | Tema |
|-------------------|---------------|------|
| "Kurbanlar kimdi?" | Kurban Ağının Kuruluşu: 1991-2008 | shame |
| "Para nereden geldi?" | Gizli Para Akışı: Deutsche Bank Dosyası | finance |
| "Mahkeme süreçleri?" | Tartışmalı Muafiyet: NPA Anlaşması | court |
| "Maxwell ne rol oynadı?" | Karanlık Yardımcı: Ghislaine Maxwell Dosyası | shame |
| "Uçuş kayıtları?" | Lolita Express: Uçuş Manifestoları | darkroom |
| "Basın nasıl haberleştirdi?" | Sessiz Basın: 15 Yıllık Suskunluk | press |

---

> *"Malzemeler mükemmel. Tarif netleşti. Şimdi lezzetli yemeği yapalım."*
