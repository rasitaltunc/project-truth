# IP TÜNEL V2 — YENİDEN DOĞUŞ
> Yaşayan Dosya Konsepti | 8 Mart 2026
> Önceki: TUNNEL_VISION_MASTER.md (panel-duvar yaklaşımı → arşivlendi)
> Bu doküman: Raşit + Claude yaratıcı oturumu — mutabık kalınan nihai vizyon

---

## FELSEFE: PANEL DEĞİL, DENEYİM

Eski yaklaşım: Wireframe tünel + duvarlara asılı AR paneller = **dijital müze koridoru**.
Sorun: Gözlemleyici kalıyorsun. Paneli okuyorsun, geçiyorsun. Pasif.

Yeni yaklaşım: Tünelin kendisi veri. Wireframe = yüklenmemiş gerçeklik. Tıklama = gerçekliğin yüklenmesi.
Sonuç: **Yaşayan bir dosya**. Yürüdükçe hissediyorsun, durunca okuyorsun, tıklayınca dalıyorsun.

> *"Paneller gözlemlenir. Bu deneyimlenir."*

---

## MİMARİ: ÜÇ KATMAN

```
┌─────────────────────────────────────────────────────────┐
│                  KATMAN 1: NEFES ALAN GEOMETRİ          │
│         Tünelin bedeni — daralan, genişleyen koridor     │
│         Genişlik = ilişki yoğunluğu over time            │
│         Doku = kanıt tipi                                │
├─────────────────────────────────────────────────────────┤
│                  KATMAN 2: HALKA PORTALLER               │
│         Tünelin nabız noktaları — neon çerçeveli AR      │
│         Kanıt yoğunluğu zirvelerinde konumlanır          │
│         Yaklaşınca açılır, içinden geçilebilir           │
├─────────────────────────────────────────────────────────┤
│                  KATMAN 3: GERÇEKLİĞİN YÜKLENMESİ      │
│         Wireframe → Solid → Doku → İçerik               │
│         Tıklama = red pill anı                           │
│         İz bırakır, tünel seni hatırlar                  │
└─────────────────────────────────────────────────────────┘
```

---

## KATMAN 1: NEFES ALAN GEOMETRİ

Tünel statik bir boru değil. İlişkinin kronolojik yoğunluğuna göre daralan, genişleyen, kıvrılan bir organizma.

### Genişlik = İlişki Yoğunluğu

```
ZAMAN AKIŞI →

  ╭─────╮                          ╭───────────────╮
  │     │    ╭──╮     ╭───╮       │               │     ╭──╮
──╯     ╰────╯  ╰─────╯   ╰───────╯               ╰─────╯  ╰──
  1991    1995   1998  2002  2005     2008-2015      2018  2019
  Tanışma  Sessiz  Yakınlaşma        Ortak yaşam     Tutuklama
  (dar)    (dar)   (genişleme)       (en geniş)      (patlama)
```

**Epstein ↔ Maxwell Örneği:**
- **1991** — İnce koridor. Tanışma. İş ilişkisi. Tünel dar, duvarlar düz.
- **1995-2000** — Koridor genişliyor. Ortak bağlantılar, ortak mekanlar, ortak kurbanlar artıyor.
- **2005-2008** — En geniş nokta. İlişki zirvede. Tünel neredeyse salon.
- **2008** — Ani daralma. İlk tutuklama. İlişki gizlenmeye çalışılıyor. Tünel sıkışıyor.
- **2019** — Patlama. Federal iddianame. Duvarlar çatlıyor, ışık sızıyor.

**Teknik:**
```glsl
// Radius = base * (1 + evidenceDensity * sin(z * warp))
float dynamicRadius = baseRadius * (1.0 + densityAtZ * 0.6);
```

### Madde Değişimi = Kanıt Tipi

Tünel boyunca yürürken duvar dokusu baskın kanıt tipine göre değişir:

| Kanıt Tipi | Duvar Dokusu | Hissiyat |
|------------|--------------|----------|
| Mahkeme belgeleri | Taş, granit | Ağır, sert, kazınmış yazılar, çatlaklardan kırmızı ışık |
| Finansal kayıtlar | Altın damarlar | Sayılar su gibi akıyor, metalik yansıma |
| Tanıklık | Yarı saydam cam | Arkasında bulanık siluetler, fısıltı hissi |
| Sızıntı belgeleri | Islak duvar | Damla dokusu, mürekkep lekesi gibi yayılan metin |
| Sosyal medya | Parlak, pop-art | Yapışkan renkler ama hemen soluyor — geçiciliğin geçiciliği |
| Resmi belgeler | Çelik | Soğuk, düzgün, bürokrasi ağırlığı |

**Geçişler:** Duvar dokusu anlık değişmez — sıvı gibi bir dokdan diğerine geçiş yapar. Taş → altın damarlı taş → altın → altın cam → cam. Her geçiş 2-3 wireframe segment sürer.

---

## KATMAN 2: HALKA PORTALLER (Nabız Noktaları)

Tünel boyunca düzenli aralıklarla değil, **kanıt yoğunluğunun zirve yaptığı noktalarda** parlayan halkalar beliriyor.

### Konumlandırma Mantığı

```
Kanıt yoğunluğu grafiği:

    ▲
    │    ●                        ●
    │   ╱╲          ●            ╱╲●
    │  ╱  ╲   ●   ╱╲           ╱  ╲
    │ ╱    ╲ ╱ ╲ ╱  ╲    ●    ╱    ╲
────┴──────────────────────────────────→ z (tünel mesafesi)
    H1     H2  H3     H4  H5  H6   H7

    H = Halka (evidence peak noktasında)

    Bazen iki halka arasında uzun boşluk → sessiz dönem, tünel daralıyor
    Bazen üst üste 3 halka → patlama dönemi, tünel genişliyor
```

### Halkanın Anatomisi

```
         ╭───── Neon dış çerçeve (tema rengi, pulse animasyonlu) ─────╮
         │                                                             │
         │    ╭── İç halka (daha parlak, yoğun glow) ──╮             │
         │    │                                          │             │
         │    │      ┌─────────────────────┐            │             │
         │    │      │   AR PANEL İÇERİĞİ  │            │             │
         │    │      │   (başlık + özet +   │            │             │
         │    │      │    güven barı)       │            │             │
         │    │      └─────────────────────┘            │             │
         │    │                                          │             │
         │    ╰──────────────────────────────────────────╯             │
         │                                                             │
         ╰─────────────────────────────────────────────────────────────╯
```

### Yaklaşma Davranışı

1. **Uzaktan (>10m):** Halka hafif parlıyor. Neon çerçeve nabız atıyor. Merak uyandırıyor.
2. **Yaklaştıkça (5-10m):** AR panel belirmeye başlıyor. Başlık ve kısa özet okunabilir.
3. **Yanına gelince (2-5m):** Panel tamamen açık. Güven barı, tarih, kaynak görünür. Tıklanabilir.
4. **Tıklamazsan:** İçinden geçersin. Halka etrafından akarken kısa bir özet fısıltısı (ses) + metin yanından geçer. AR hissi — içinden geçilebilen hologram.
5. **Tıklarsan:** → KATMAN 3 aktive olur.

### Panel İçeriği = Bulunduğu Ortamın Dili

Panel generic bir kart değil. Duvar dokusuna göre şekilleniyor:

- **Taş bölgede** → Mahkeme belgesi paneli: sert serif font, granit çerçeve, kırmızı mühür
- **Altın damar bölgesinde** → Finans paneli: sayılar akıyor, yeşil/kırmızı ok, metalik çerçeve
- **Saydam bölgede** → Tanıklık paneli: bulanık yüz, ses dalgası görseli, italik metin
- **Islak bölgede** → Sızıntı paneli: damla efekti, redakte çizgileri, el yazısı font

---

## KATMAN 3: GERÇEKLİĞİN YÜKLENMESİ

Bu tünelin en güçlü anı. Wireframe = "henüz yüklenmemiş gerçeklik". Tıklama = gerçekliğin Matrix'ten çıkması.

### Wireframe'in Metaforu

```
WIREFRAME DURUMU              →    YÜKLENEN GERÇEKLİK
─────────────────                  ─────────────────────
İskelet                            Et ve kemik
Potansiyel                         Gerçeklik
Matrix kodu                        Red pill sonrası
Simülasyonun ızgarası              Dolu dünya
Keşfedilmemiş                     Keşfedilmiş
```

Wireframe sanki realitynin gelişmesini bekleyen bir teknoloji ağı. Bir sonraki seviyeye geçmek için kullanıcının dokunuşu gerekiyor.

### 4 Fazlı Yükleme Sekansı (2-3 saniye toplam)

**FAZ 1 — TİTREŞİM (0-0.5s)**
```
Tıklama anı → wireframe çizgileri titremeye başlıyor
Elektrik verilmiş gibi
Tıklama noktasından dışarı doğru nabız dalgası yayılıyor
Ses: kısa elektrik çatırtısı (100ms)
```

**FAZ 2 — KALKINLAŞMA (0.5-1.2s)**
```
Wireframe çizgiler kalınlaşıyor
Üçgenler arası boşluklar dolmaya başlıyor
İskelet etle kaplanıyor — ama hala siyah, hala boş
Yüzeyler oluşuyor ama henüz dokusuz
Ses: düşük frekanslı uğultu crescendo (72 Hz → 150 Hz)
```

**FAZ 3 — DOKU YAYILIMI (1.2-2.0s)**
```
Tıklama noktasından DALGA HALİNDE doku yayılıyor
Sıvının yayılması gibi — tüm duvarlar aynı anda değil
Kanıt tipine göre: taş, cam, metal, ekran
Tavan ve zemin de dönüşüyor
Ses: texture'a göre (taş = çatırdama, cam = kristal tını, metal = yankı)
```

**FAZ 4 — İÇERİK BELİRMESİ (2.0-2.8s)**
```
Videolar oynamaya başlıyor (duvar = ekran)
Metinler duvarlara kazınıyor / yansıyor
Fotoğraflar netleşiyor (bulanık → keskin)
İLK KEZ tünelde gerçek ses var:
  - Mahkeme: duruşma kaydı
  - Tanıklık: fısıltı, ses kaydı
  - Finans: klavye tıkırtısı, para sayma
  - Sızıntı: yazıcı sesi, kağıt hışırtısı
```

### Gerçekliğin İçinde Olma

Yüklenme tamamlandığında, kullanıcı artık wireframe tünelde değil — **o kanıtın dünyasında**. Tüm wireframe yapı, duvarlar, tavan, zemin: videoların oynatıldığı, dosyaların açılacağı, incelenebileceği bir ortama dönüşmüş durumda.

- Video varsa → duvar ekrana dönmüş, oynuyor
- Mahkeme belgesi varsa → duvar taş olmuş, metin kazınmış
- Fotoğraf varsa → duvar galeri olmuş, çerçevelenmiş
- PDF varsa → duvar kağıt gibi, sayfalar dönebilir

Bu sadece o bir halkanın alanı değil — tünelin o bölgesinin **tamamı** dönüşüyor.

### Geri Çıkış + İz

```
ESC veya geri adım → ters yükleme (2s)
  FAZ 4 → İçerik soluyor
  FAZ 3 → Doku çekiliyor (sıvının geri çekilmesi)
  FAZ 2 → Yüzeyler wireframe'e dönüyor
  FAZ 1 → Titreşim durur

AMA: Tam wireframe'e dönmüyor!
O bölge artık hafif bir IZ taşıyor:
  - Soluk bir doku rengi (wireframe'in %10-15 tint'i)
  - Hafif kalınlaşmış çizgiler
  - "Burayı keşfettin" diyor

Tünel seni hatırlıyor.
```

### Keşif Durumu

```
İLK GİRİŞ:      Tüm wireframe — boş, potansiyel, karanlık
YARIM KEŞİF:     Bazı bölgeler izli, bazıları hala wireframe
TAM KEŞİF:       Tünel artık wireframe değil — dolu, yaşayan bir koridor
                  Geriye baktığında gördüğün şey bir "dosya" — tüm kanıtlar yerli yerinde
```

---

## TEMA SİSTEMİ (Miras — V1'den)

5 tema aynen korunur, ama artık sadece neon rengi değil — **duvar doku paleti** de tema ile değişir:

| Tema | Neon Renk | Duvar Paleti | Ses Karakteri |
|------|-----------|--------------|---------------|
| shame | Kırmızı #dc2626 | Soğuk taş + kırık cam | Ağır, eko, yas |
| finance | Altın #f59e0b | Altın damar + çelik | Keskin, hızlı tick |
| court | Mavi #3b82f6 | Mermer + granit | Tokmak, ciddi |
| intelligence | Yeşil #10b981 | Karbon fiber + cam | Elektronik, steril |
| media | Beyaz #e5e5e5 | Kağıt + ekran | Daktifo, flaş |

---

## COMING SOON KONSEPTI

Tünel henüz tam geliştirilmeden kullanıcıya "hype" yaratmak için:

### Akış:

```
Kullanıcı ipe tıklar
     │
     ▼
Boot Sequence oynar (mevcut terminal animasyonu)
"SIMULATION READY" mesajı
     │
     ▼
Tünel açılır — wireframe, halkalar görünür
Giriş jeneriği (utanç koridoru başlığı)
     │
     ▼
İlk birkaç metre yürünür (atmosfer hissedilir)
İlk halkaya yaklaşılır...
     │
     ▼
Tam tıklayacakken/geçecekken:
Zarif "YAKINDA" ekranı belirir
     │
     ▼
Typewriter efekti ile mesaj:
"Bu koridor henüz inşa aşamasında.
 Gerçeklik yüklenmeyi bekliyor."
     │
     ▼
[GERİ DÖN] butonu + beklenti yaratıcı görsel
(wireframe'den gerçekliğe geçişin 1 saniyelik teaser'ı)
```

### "YAKINDA" Ekranının Verdiği Mesaj:

İnsanlar o wireframe'den gerçekliğe geçiş anını **merak eder**. "O halkaların arkasında ne var?" sorusu kafalarında kalır. Bu bilinçli bir tasarım kararıdır — merak motoru.

---

## AI KÜRATÖR (Gelecek — V1'den Miras)

Groq llama-3.3-70b ile:
- Kanıt kürasyon (hangi halkalar, hangi sırada)
- Tema otomatik seçimi (intent → tema)
- Hikaye başlığı jenerasyonu ("Kurban Ağının Kuruluşu: 1991-2008")
- Chat → Tünel pipeline ("Bu bağlantıyı göster" → tünel açılır)
- Narratif arc (setup → build → climax) halka sıralaması

---

## SES TASARIMI (Gelecek — V1'den Miras)

Tone.js + HRTF spatial audio:
- Tema bazlı ambient drone (her tema kendi frekans paleti)
- Halka yaklaştıkça ses yoğunlaşır
- Gerçeklik yüklendiğinde ilk kez "gerçek ses" duyulur
- Çıkışta ses soluyor → wireframe sessizliği geri geliyor

(Detaylı parametreler: TUNNEL_VISION_MASTER.md §6)

---

## TEKNİK NOTLAR

### Mevcut Altyapı (Sprint 14A Faz A)
- tunnelStore.ts — Zustand faz yönetimi (çalışıyor)
- TunnelScene.tsx — R3F 3D sahne (wireframe zaten var)
- tunnelShaders.ts — GLSL dual-layer pulse (çalışıyor)
- TunnelBootSequence.tsx — Terminal açılış (çalışıyor)
- TunnelHUD.tsx — HUD overlay (çalışıyor)
- 5 tema sistemi (çalışıyor)

### Gerekli Yeni Geliştirmeler
1. **Nefes alan geometri:** Radius'u kanıt yoğunluğuna bağla (shader uniform)
2. **Halka portaller:** Torus geometri + neon shader + proximity trigger
3. **Yükleme sekansı:** wireframe → solid transition shader (MeshStandardMaterial lerp)
4. **Duvar doku sistemi:** Texture atlas + kanıt tipine göre UV mapping
5. **Video texture:** Three.js VideoTexture → duvar mesh'e map
6. **İz sistemi:** LocalStorage'da keşfedilen bölgeleri tut

### Feasibility Notu
- Wireframe → solid geçiş: `material.wireframe` toggle + lerp opacity (Three.js native)
- Video texture: `THREE.VideoTexture(videoElement)` — proven, performant
- Proximity trigger: raycaster veya mesafe hesabı (mevcut sistemde var)
- Neon halka: `THREE.TorusGeometry` + custom ShaderMaterial (mevcut shader altyapısı uyumlu)

---

## İMPLEMENTASYON SIRASI

### Adım 1: Coming Soon (Hemen)
- Boot sequence → wireframe tünel → halkalar görünür → "YAKINDA" ekranı
- Mevcut kodun %90'ı kullanılır, sadece son aşamada dur + overlay

### Adım 2: Halka Portal Sistemi (Sprint 16-17)
- Torus geometri + neon shader
- Proximity-based panel açılma
- İçinden geçme fiziği

### Adım 3: Yükleme Sekansı (Sprint 17-18)
- 4 fazlı wireframe → reality transition
- Shader-based doku yayılımı
- Video texture entegrasyonu

### Adım 4: Nefes Alan Geometri (Sprint 18-19)
- Kanıt yoğunluğu → radius mapping
- Kronolojik daralan/genişleyen koridor
- Madde değişim geçişleri

### Adım 5: Ses + AI Küratör (Sprint 19-20)
- Tone.js spatial audio
- Groq kürasyon endpoint
- Chat → Tunnel pipeline

---

## SÖZLER

> *"Wireframe = keşfedilmemiş potansiyel. Tıklama = gerçekliğin yüklenmesi. Red pill anı."*

> *"Paneller gözlemlenir. Bu deneyimlenir."*

> *"O sıvının yayılması gibi — tıklama noktasından dalga halinde doku yayılıyor."*

> *"Tünel seni hatırlıyor."*

---

**Doküman Tarihi:** 8 Mart 2026
**Yazarlar:** Raşit Altunç + Claude (yaratıcı oturum)
**Durum:** Mutabık kalınan nihai vizyon — implementasyon bekliyor
**Önceki versiyon:** TUNNEL_VISION_MASTER.md (teknik parametreler hala geçerli, konsept güncellendi)
