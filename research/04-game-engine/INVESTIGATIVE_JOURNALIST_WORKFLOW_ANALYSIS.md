# İNVESTİGATİF GAZETECİ İŞ AKIŞI: Belgeler Nasıl Doğrulanır?

**Tarih:** Mart 2026
**Format:** Profesyonel İstihbarat Brifing
**Dil:** Türkçe
**Kapsamı:** Gerçek araştırmalar, gerçek araçlar, gerçek vaka çalışmaları

---

## ÖZET YÖNETİCİ (EXECUTIVE SUMMARY)

İnvestigatif gazeteciliğin temel paradoksu şudur: **Hız ile doğruluk ters orantılıdır.** Bir belgeyi tam olarak doğrulamak 2-6 hafta alabilirken, bir haber başka medya kuruluşuna gidiş hızı 2-6 saattir. Bu rapor, dünyada en güvenilir haber kuruluşlarının (ICIJ, Bellingcat, New York Times, Guardian, Reuters) bu paradoksu nasıl çözdüğünü, hangi araçları kullandığını ve neden birçok "buluş" başarısız olduğunu analiz eder.

**Ana Bulgu:** Günümüzün araştırmacı gazetecileri, belge doğrulaması için "tek araç" stratejisine sahip değildir. Bunun yerine, 6-12 ayrı platform arasında geçiş yaparak veri toplarlar. Bu, kaynaklar için **bilişsel yük ve akış kırması** yaratır. Project Truth gibi bir platform, bu akışı birleştirerek gazetecilik kalitesini ve hızını aynı anda iyileştirme potansiyeline sahiptir.

---

## 1. ARAŞTIRMACI GAZETECİNİN GÜNLÜK İŞ AKIŞI

### 1.1 Sabah Rutini (06:00-09:00)

Araştırmacı gazetecilik, genellikle **tip veya pattern tespiti** ile başlar. Sabah rutin şöyledir:

**06:30 — Bilgi Toplayıcı Araçlar (Alarm Sistemi)**
- **Signal/Telegram:** Haber kaynakları, muhabirler, ihbarcılar ile gizli iletişim
  - ICIJ'deki pratik: Haber kaynakları, Panama Papers sırasında, yalnızca Signal üzerinden iletişim kurmaya ikna edildi
  - Reuters: Rohingya belgeselleri için WhatsApp grup, şifreli kanallı Slack alternatiği
- **Email (Proton Mail/Gmail):** Resmi yazışmalar, FOIA taleplerine cevaplar, mahkeme belgeleri
  - Bellingcat: Gelen kutusu "haftalık şüpheli dosyaların" akışıyla dolar — her dosya bir ipucu olabilir
- **RSS Feeds / Google Alerts:** İsim, kuruluş veya dava hakkında otomatik bildirimler
  - 10-15 temel uyarı ayarlanır: hedef şirket + yöneticileri, mahkeme dosyaları, mülkiyet kayıtları

**07:00 — Veri Tabanı Kontrolleri (İşletim Sistemleri)**
- **PACER (ABD Mahkeme Sistemi):** Günlük yeni dosya kontrolü — davalı kişiler hakkında
  - Maliyet: $0.05-0.25 per document view, aylık $200-500 işletme bütçesi
  - Dokümenter yöntemi: PACER botları tarafından taranan veriler, pacer.uscourts.gov'dan indirilir
- **CourtListener (Free PACER Mirror):** PACER'a alternatif, başında biçim hatalar olabilir ama özgür
  - 1.7 milyon dava dosyası, 500 milyon sayfa (2026 itibariyle)
- **OpenSanctions:** Yaptırım listeleri, PEP (Politically Exposed Persons) veritabanı
  - Haftalık güncelleme, OFAC + EU + UN + nakliye kaydı kontrolleri
- **Land Records / Corporate Registries:** Emlak kayıtları, şirket kuruluşları
  - ABD'de eyalet başına farklı sistem → otomatikleştirme zor

**07:30 — Medya Taraması (Rakip Denetimi)**
- **Google News Alerts:** Aynı konu hakkında kimler yazdı? Hangi açıdan?
- **Press Reader / Factiva:** Arşiv arama, arka plan kontrolü
- **Podcast İndeks:** Podcast'ler için de patternler var — haber kaynakları sesli de konuşabiliyor

**08:00 — İnceleme Başlama (Günün Planı)**
- Dün nereye kadar gelmişti?
- Bugün neye ihtiyaç var?
- Hangi kaynaklar erişilebilir?

**Zaman Yönetimi Not:** Paralellik önemlidir. Bir muhabir, hukuk yapısının ("bu şirket A'ya ait, A de B'ye ait") kontrol edilmesi için **3-4 saat seri araştırmaya** ihtiyaç duyabilir. Buna **"kurulum süresi" (setup time)** denir.

### 1.2 Belge Alınışı: Beş Yaygın Senaryo

#### Senaryo 1: Sızan Belge (Leak)
```
İhbarcı → Signal mesajı → "Bunu inceleyebilir misin?"
  → Muhabir: ZIP dosyası indir (250MB)
  → Dosya kontrolü: İçinde ne var? PDF mi, Excel mi, CSV mi?
  → Virüs taraması: VirusTotal.com üzerinden kontrol
  → İlk 10 belge okuma: Konusu nedir? Ne kadar eski?
  → Büyüklük analizi: 100 belge mi, 10.000 belge mi?
    → Eğer 10.000+ → DocumentCloud'a yükle, AI clustering yap
    → Eğer 100 → Elle kategorize et, annotatione başla
```

**Gerçek Vaka:** ICIJ - Panama Papers (2015)
- Küşad Zaman (ICIJ koordinatörü), bir gazeteciden sızan dosya aldı
- 11.5 milyon sayfa PDF, dokümantasyon + veritabanı dosyası
- Hemen bulundu: "Bu çok büyük. Tek başıma yapamayız."
- Adım: 370 gazeteci, 100+ kaynağa bölüştürüldü
- Araç: DocumentCloud (sıradan versiyonu yeterli değildi) + Datashare (ICIJ'nin özel aracı)
- Süre: İlk 2 hafta = "Bu sızıntı meşru mi?" kontrolü (meta-verifikasyon)

#### Senaryo 2: FOIA Talebi (Özgür Bilgi Talebii)
```
Muhabir → Freedom of Information Act (FOIA) talebii gönder
  → 20-180 gün bekleme (genellikle 60 gün)
  → Tepki gelmediğinde: Özel avukat veya ACLU/CATO ile dava
  → Belge geldi (email ekinde PDF)
    → Adım 1: "Sansürlenmişim mi?" — siyah çizgiler arıyoruz (redaction)
    → Adım 2: "Sansürlü alanları açabilir miyim?" — hukuk analizi
    → Adım 3: Belgenin "imza tarihi" kontrolü vs "üretim tarihi"
```

**Gerçek Vaka:** ProPublica - FBI'ın Mobil Surveillance Vans (2015)
- ProPublica, FBI'ın "Stingray" cihazları hakkında FOIA talebii gönderdi
- Cevap: "Bu güvenlik açısından tehlikelidir, açıklamayız"
- Sonuç: Mahkeme başvurusu (tüm sürece 18 ay)
- Elde edilen: 1.500 sayfa, çoğu sansürlü
- Verifier görev: Redacted alanlardan İNTİY çıkarma
  - Örn: "Bu ... cihazı", "Bu ... frekansında" → teknik detaylar sızıyor

#### Senaryo 3: Mahkeme Dosyası (Court Record)
```
Muhabir → Dava numarası biliyor
  → PACER'a giriş (para gerekli veya CourtListener'dan ücretsiz)
  → Tüm belgeleri indir (5-50 belge olabilir)
  → Sıralama: "İddia" → "Cevap" → "Keşif" → "Karar"
    → İddia: Savcı/davacı ne iddia ediyor?
    → Cevap: Sanık ne diyor?
    → Karar: Hakim ne karar verdi?
  → Tüm sürüyü oku (hayati belgeler 200+ sayfa olabilir)
```

**Gerçek Vaka:** ICIJ - Luanda Leaks (2020)
- Angola'nın eski başkanı José Eduardo dos Santos'un çocuğu hakkında soruşturma
- Davanın temeli: ABD Mahkemesi dosyası + Angola iç mahkeme dosyaları
- Verifyerler: Mülkiyet kayıtlarından, şirket kuruluşlarından paranın izini çıkardılar
- İvme: "Bu 40 milyon dolarlık gayrimenkul New York'ta kimin adına?"
  → Şirket kurucusu saklı → Lobici kimse?
  → Lobici → Eğer A'nın temsilcisiyse → A'ya bağlantı kanıtı

#### Senaryo 4: Öz-Oluşturma (Generated Data)
```
Muhabir → Destek seçeneği yok, kendi toplamanız lazım
  → "İnsan Kaynakları Çalışması": Yüzlerce kişiye röportaj
    → Ses kaydı tut, transkript yap, annotate et
  → "Veritabanı Kurması": İstatistiksel kümeler
    → Excel spreadsheet, SQL, Python scripts
  → "Zaman Çizelgesi": Olaylar arka planda bağlantılı mı?
```

**Gerçek Vaka:** New York Times - "The Cost of Living in America" (2019)
- Amerika'da yaşam maliyeti soruşturması
- Yöntem: 100+ şehirde fiyat araştırması (kira, yemek, tıp, eğitim)
- Veri kaynağı: Zillow, BLS (Bureau of Labor Statistics), kurumsal raporlar
- Doğrulama: Her sayıyı karşılaştırmak, çelişki varsa kaynağa geri dönmek
- İşgücü: 6 muhabir × 4 ay = 24 muhabir-ay

#### Senaryo 5: OSINT (Open Source Intelligence)
```
Muhabir → Resmi kaynağa erişim yok
  → Sosyal medya, kuruluş web siteleri, eski bloglar taranır
  → Google'ın "cache:" operatörü: site.com'un eski versiyonu
  → İnternet Archive (archive.org): 20+ yıl önceki web sayfaları
  → Uydu görüntüleri: Google Earth Pro, Sentinel Hub (free)
  → Yolcu listeleri: Kolaylık sınırlı ama hava lineslerinin arşivleri var
```

**Gerçek Vaka:** Bellingcat - MH17 Douma Saldırısı (2014-2018)
- Bellingcat, Malaysian Airlines Flight 17'nin düşürüldüğünü kanıtlamak istedi
- Aracı: Açık kaynak — sosyal medya vidyoları, uydu haritaları, hava durumu kayıtları
- Yöntem:
  1. Reddit/4chan'de bulduğu video
  2. Videodaki binanın gölge açısı → saati belirle (güneş pozisyonu)
  3. Gölge açısı + GPS koordinatı = belgenin saati ve yeri kesin
  4. Kurşun geçiş yolu haritası çıkar → hangi yönden gelmiş?
  5. Sosyal medyada "Buk" füze sisteminin fotoğrafı
  6. Bu fotoğraf = Rusya tarafından transfer
- Sonuç: Uluslararası Suçlar Mahkemesi (ICC) kanıt olarak kabul etti

**Zaman Analizi:** Bellingcat'in MH17 araştırması 3 yıl sürdü (2015-2018). İlk ipucu sosyal medyada idi. Final kanıt, ICC tarafından kabul edildi.

### 1.3 Soruşturmanın Ortalama Süre Haritası

Araştırmacı gazetecilikte tipik zaman gereksinimleri:

| Araştırma Türü | Kurulum | Doğrulama | Yazı | TOPLAM |
|---|---|---|---|---|
| **Basit (1 kaynak, 1 tema)** | 2-3 gün | 1-2 hafta | 3-5 gün | 3-4 hafta |
| **Orta (3-5 kaynak, 2-3 tema)** | 1 hafta | 3-4 hafta | 2 hafta | 2-3 ay |
| **Kompleks (10+ kaynak, network)** | 2-4 hafta | 8-16 hafta | 3 hafta | 4-6 ay |
| **Mega (100+ belge, uluslararası)** | 1-2 ay | 4-8 ay | 4-8 hafta | 6-18 ay |

**Gerçek Veri:**
- Panama Papers: 11.5M belge, 370 gazeteç, 18 ay → **9,630 gazeteçi-gün işgücü**
- Pandora Papers (2021): 12M belge, 600+ gazeteçi, 2 yıl → **288,000 gazeteçi-gün**
- ICIJ ortalama soruşturma: **6 ay**
- Bellingcat ortalama soruşturma: **3-6 ay** (video doğrulaması hızlandırıyor)
- NYT soruşturma ortalaması: **4-8 ay**

---

## 2. BELGE OTANTİKLİK VERİFİKASYON SÜRECİ

### 2.1 Fiziksel Belge Analizi (Kağıt Belgeler)

Belge elle veya fotoğrafla geldiğinde, fiziksel özellikleri kontrol edilir:

#### 2.1.1 Temel Kontroller

**Kağıt Kalitesi ve Yaş**
- İyi bir sahte, genellikle yanlış kağıt kullanır
- Gerçek mahkeme belgesi: Ofis kağıdı (20lb bond), beyaz/krem
- Sahte: Oftalmik kağıt, çok beyaz (optik beyazlatıcı)
- Test: Ultraviyole ışık altında gerçek vs sahte farkı görülür
- Örnek: Killian Documents (2004) — CBS, Vietnam Savaşı belgelerini yayınladı
  - **Kontrol:** Sanal kuşak belgesi, 1973'te yazıldığı iddia edildi
  - **Hata:** Proportional font (Times New Roman) kullanılmış — 1973'te askeri makineler serif font yapamıyor
  - **Sonuç:** Belge 2004'te yazılmıştı, CBS'in saygınlığı 2 hafta içinde yok oldu

**Fizikte ve Tipografide Tutarsızlık**
- Font ailesi: Antik belgeler serif (Courier, Times) kullanır; modern Bold/Arial az
- Satır aralığı: Otomatik yazıcılar vs elle yazılan belgeler fark gösterir
- Harf Aralığı: Proportional vs monospace → detektörler varsa belki
- Tinta: Çelik kalem vs modern toner — yaş belirlemede ipucu

**Damga ve İmza**
- Gerçek damga: Çıkıntı oluşturur (3D görünüm), elle bastırıldığında mürekkep sıçraması
- Sahte: Düzleştirilmiş (PDF olarak eklenmiş), mürekkep düzgün
- İmza analizi: Grafolog (suç analisti) kontrol — el sallanışı, tutarlılık, motor kontrol
  - Bazı belgelerde imza tamamen aynı → fotokopi veya değişim

#### 2.1.2 Yüksek Teknoloji Analizi

**ELA (Error Level Analysis) — Görsel Dosya Analizi**
- Fotoğraflanmış belgenin **JPEG sıkışma anomalileri** keşfeder
- Gerçek belge: Tutarlı sıkışma seviyesi
- Manipüle belge (Photoshop): Onarılan alanlar farklı sıkışma gösterir
- Tool: FotoForensics.com (ücretsiz)
- Sınırlamalar: Gerçekten tutarlı manipülasyon varsa tutamaz

**Metadata Çıkarma**
- PDF metadata: Üretim yazılımı, oluşturma tarihi, düzenleme tarihi, yazar
- Örn: Sahte belge, "Microsoft Word 2023" ile oluşturulmuş ama 1995 tarihli
- Tool: ExifTool (komut satırı), Jeffrey's Exif Viewer (web)

**Ses/Video Analizi (Deepfake Tespiti)**
- Konuşma modeli analizi: Yapay ses, cümle mantığında boşluklar
- Dudak senkronizasyonu: Video vs ses eşleşme yok
- Tool: InVID / WeVerify (Chrome plugin), MediaWise (Stanford)

### 2.2 Dijital Belge Doğrulaması

Çoğu sızıntı, dijital olarak gelir. PDF, Excel, metin dosyası.

#### 2.2.1 PDF Metadata

```
Örnek: Sızıntı PDF'si "sekreter_rapor_2023.pdf"
```

| Metadata Alan | Gerçek Değer | Sahte Işareti |
|---|---|---|
| **Producer** | "Adobe Acrobat 11.0" | "iText 5.0" (pirat sürüm) |
| **CreationDate** | "D:20231201120000" (2023-12-01) | "D:20181201" (eski belge?) |
| **ModDate** | "D:20240115" | CreationDate'den sonra (değiştirildi) |
| **Creator** | "Microsoft Word" | "Ghostscript" (PDF-ye çevirme) |
| **Subject/Author** | "John Smith / State Dept" | Boş veya generic |
| **Encrypted** | Yok veya AES-256 | Garip şifre ayarları |

**Gerçek Vaka: Reality Winner Gözaltısı (2017)**
- NSA çalışanı Reality Winner, Rusya'nın ABD seçimlerini hackleme belgesi sızdırdı
- **Catch:** Basılı belge, yazıcının "tracking dots"ı (görünmez nokta deseni)
- **Teknik:** Yazıcılar, her sayfa kopyası benzersiz şekilde "işaret eder" (anti-sahte mekanizması)
- **Sonuç:** Yazıcı kalıbı = NSA fakülte, Reality Winner'ın yazıcısı eşleşti
- **Ders:** Dijital belgeden bastırdığında, teknolojik iz bırakır

#### 2.2.2 Çapraz Kaynak Doğrulaması

Belgedeki iddiaları bağımsız kaynaklar ile karşılaştırma:

```
Sahne: "Bu belge diyor ki, Acme Corp A'nın %51'ine sahiptir"

Doğrulama Zinciri:
1. Corporate Registry (şirket kurulu kaydı)
   → Acme Corp hissedarları: ABC Fund %51

2. SEC EDGAR (halka açık şirket veritabanı)
   → ABC Fund holdings: "Acme Corp, %51" (eşleşti ✓)

3. Bloomberg Terminal (ücretli, finans uzmanları için)
   → Acme Corp yapısı: Doğru mı?

4. LinkedIn Verification
   → Acme Corp CEO: "ABC Fund'ın CEO'suna rapor verir" (eşleşti ✓)
```

**Eşleşme Yüzdesi:** Belge doğru sayılırsa, 3/4 kaynakta eşleşme beklenir (75%+).

#### 2.2.3 Çift Kaynak Kuralı (Two Source Rule)

Gazeteciliğin altın kuralı: **Hiçbir iddia, tek kaynak ile yayınlanmaz.**

```
İddia: "CEO, rüşvet aldı"

Kaynak 1: Gizli tanık
Kaynak 2: Mahkeme Belgesi (public)
Kaynak 3: Banka Kaydı (sızıntı)

→ Üç kaynak eşleşirse → yayınla
→ İki kaynak eşleşirse → "dikkat" ama yayınlanabilir
→ Bir kaynak → ASLA yayınlama
```

**Pratik Sınırlamalar:**
- Bazı belgelerde 2. kaynak imkansız (üst gizli belge)
- Çözüm: "Belgeler, [kaynağı açıklamayan] bir kaynaktan elde edildi" cümlesi
- Mahkemede bu kanıt olabilir mi? Dokument kaynağının kimliği biliniyorsa evet

### 2.3 İddia-Kanıt Eşleştirmesi: Sistematik Kontrol

Araştırmacı gazeteçi, her iddiaya karşı **5 katmanlı doğrulama** yapar:

#### Katman 1: Temel Gerçekler
```
İddia: "Bina New York'ta, 5. Cadde'de, 42. Sokak"

Kontrol: Google Maps
- Koordinat: 40.75° N, 73.97° W (eşleşti ✓)
- İmage tarihi: 2022 (iddia 2023 — bina var mı? Evet)
- Binanın ismi: "Crown Building" vs iddia "Tower A" (tutarsızlık!)
```

**Hata Tespiti:** Bina adı yanlış → Belgeyi tekrar oku → Cümle yeniden analiz

#### Katman 2: Tarih Kontrolü
```
İddia: "CEO, 2019'da Londra'da görüştü"

Kontrol Noktaları:
1. CEO'nun pasaport hareketleri (ulaşamıyabiliriz)
2. CEO'nun LinkedIn: "2019-05-15 Londra'da konferans"
3. Konferans davetiye: "2019-05-10 to 2019-05-17, London Tech Summit"
4. Görüşme tarih: 2019-05-14 iddia etti
   → CEO 2019-05-10 ile 2019-05-17 arası Londra'da (eşleşti ✓)
```

#### Katman 3: Kimlik Doğrulaması
```
İddia: "John Smith, Acme Corp CEO"

Kontrol:
1. Mühür/İmza: CEO imzası PDF'de var mı?
2. Şirket Kaydı: John Smith, resmi olarak CEO mi?
3. LinkedIn Profil: Makul mı? (Spoof profiller var)
4. Telefon Kontağı: Bağımsız kişi, "Evet bu John Smith" dedi mi?
5. Video Konferans: Görüştü mü? (Deepfake kontrolü)
```

**Sınırlamalar:** LinkedIn profilleri kolayca taklit edilebilir. Video konferans Zoom bombing'e açık.

#### Katman 4: Finansal Doğrulama
```
İddia: "Acme Corp, ABC Şirket'e 50 milyon dolar gönderdi"

Kontrol:
1. Bank Kaydı (sızıntı belge): 50M dolar transfer, 2023-01-15
2. İtibaren: Acme Corp hesabı (hesap numarası müsait)
3. Verilen: ABC Şirket hesabı (varlık mı?)
4. Miktar: 50M USD (tutarı kontrol) — gerçekçi mi?
5. Dış Verifikasyon: Bloomberg Terminal / SEC EDGAR
   → ABC Fund para akışları raporu (eşleşti ✓)
```

**Zorluk:** Banka kayıtları sıranını bulunmaz. Sızmış emailler + banka intranet'i birlikte gerekli.

#### Katman 5: Bağlantı Analizi
```
İddia: "CEO ve Komiser, ortak görevde"

Kontrol:
1. Biyografik Veri:
   - CEO: 2010-2020, Company X
   - Komiser: 2010-2020, Agency Y

2. Sosyal Ağ:
   - Aynı konferansta mı? (LinkedIn)
   - Aynı iş kulübünde mı? (Üyelik listeleri)
   - Aynı üniversite mi? (Mezun listeleri)

3. Metin Analizi:
   - Email içinde ikisi de değişiyor mi?
   - Ortak projeler? (Alıntılar, konuşmalar)
```

**Pratik:** Bellingcat'in MH17 soruşturmasında, "Buk" füze sistemini kullanan askeri birliğin üyeleri sosyal medyada kendilerini "öz-dost" olarak etikettedi — bu, Rusya ordusunun daha da kanıtlandı.

---

## 3. ARAŞTIRMACI GAZETECİLERİN ARAÇLARI

### 3.1 Temel Araçlar (Hemen hemen her gazeteçi kullanır)

#### DocumentCloud
- **Kurulum:** documentcloud.org'a git, hesap aç, belge yükle
- **İşlev:** PDF upload → otomatik OCR → tam metin arama → annotate → embed web sitesinde
- **Kullanıcı Sayısı:** 3.000+ newsroom (AP, Guardian, NYT, Reuters, BBC)
- **Fiyat:** $600-1200/yıl
- **Neden iyidir:**
  - OCR (optik karakter tanıma) otomatik
  - Bulut tabanlı, ekip işbirliği yapılabilir
  - Web'e gömülebilir (haber okuyucu bir belgeyi makale içinde görebilir)
  - Metadata çıkarma ve arama

**Kusurları:**
- Depolama sınırı (pro plan bile 100GB)
- Büyük PDF'ler (1000+ sayfa) yavaş
- OCR, elle yazı veya kötü baskı için zayıf
- Fiyat, bağımsız muhabir için pahalı

**Gerçek Kullanım:** Guardian, Pandora Papers için 12M belgeyi DocumentCloud'a organize etti (kendi sunucularında "Datashare" özel versiyonunu geliştirdiler çünkü belgeler çok büyüktü).

#### Google Sheets + SQL Scripts
- **Kurulum:** Spreadsheet aç, veri format et
- **İşlev:** Belge veritabanı, pivot table, filtering, VLOOKUP ile link analizi
- **Fiyat:** Ücretsiz
- **Neden iyidir:**
  - Anlaşılması kolay
  - Ekip işbirliği (real-time)
  - Veri denetim izi (kim ne değiştirdi, ne zaman)

**Kusurları:**
- 1 milyon+ satırı yönetmek zorlaşır (Pandora Papers 12M belge + 200K varlık)
- SQL query'si yok (Python / R ile harici analiz gerekir)
- Şifreleme yoktur (bulut tabanlı, hassas veri)

#### DocumentCloud Alternatifi: Overview (AP)
- **Mühendislik:** Associated Press'in geliştirdiği ML-based clustering tool
- **İşlev:** Belgeleri otomatik kategorize et (100+ belge PDF'yi "kim kimin ilişkisi" olarak grupla)
- **Fiyat:** Açık kaynak (https://github.com/aesquivel/overview-server)
- **Durumu:** Aktif geliştirilmedi (son update 2018), ama hala işlev görüyor

#### Signal / ProtonMail
- **Kurulum:** Signal indirYap (ücretsiz)
- **İşlev:** Kaynaklar ile şifreli iletişim
- **Şifreleme:** End-to-end (Signal), sunucu bile mesajı okuyamaz
- **Neden kritik:** Kaynak anonymity
- **Uyarı:** Telefon numarası gerekir (SIM card hijacking riski)

**ProtonMail Alternatifi:** Tutanota, email şifreleme için daha güvenli (hatta sağlayıcı domain'i de gizleyebilir)

#### PACER / CourtListener
- **PACER:** ABD Mahkeme Sistemi
  - Fiyat: $0.05-0.25 per document
  - Erişim: pacer.uscourts.gov
  - Hız: Bazen sunucular yavaş (yüksek trafikte)
- **CourtListener:** PACER'ın açık kaynak mirror'ı
  - Fiyat: Ücretsiz
  - Hız: Daha hızlı (kırmızı sebepler daha az)
  - Kusurunun: Sınıflandırma bazen yanlış, metadata eksik

#### OpenSanctions
- **Kurulum:** opensanctions.org, CSV indir veya API'yi çağır
- **İçerik:** OFAC (ABD yaptırımlar), EU blacklist, UN, PEP (Politically Exposed Persons)
- **Güncelleme:** Günlük
- **Neden: Şirket veya kişi sanırsa, hemen bulunur
- **API:** XML/JSON format, real-time sorgulanabilir

#### Maltego
- **Kurulum:** maltego.com, hesap aç, Transform Market'ten ekle
- **İşlev:** Link analysis ve OSINT visualization
- **Fiyat:** Ücretsiz (Community) ya da Pro ($2000+/yıl)
- **Özellik:** Alet, A'nın bağlandığı B'yi, B'nin bağlandığı C'yi otomatik keşfeder
- **Sınırlamalar:** Kaynaklar API'ye bağlı (Wikipedia, Twitter API'sı 2023'te kapandı)

#### Datashare (ICIJ'nin Araçları)
- **Kurulum:** github.com/ICIJ/datashare — kendi sunucuna kurulur
- **İşlev:** Yerel belge işleme, çevrimdışı (air-gapped)
- **Hız:** DocumentCloud'dan daha hızlı (yerel sunucuda)
- **Güvenlik:** Kendi sunucunda — sızıntı riski azaltılır
- **Sınırlamalar:** Kurulumu zor (DevOps bilgisi gerekir)

**Gerçek Kullanım:** ICIJ, Panama Papers sonra Datashare'i geliştirdi. Pandora Papers için Datashare kullanıldı (çünkü belgeler ICIJ sunucularında korundu, cloud'da değil).

### 3.2 İleri Araçlar (Uzmanlar)

#### Aleph (OCCRP)
- **Şirketi:** Organized Crime and Corruption Reporting Project
- **İşlev:** Korporatif ilişki grafı, yaptırımlar, siyasi ilişkiler
- **Veri:** 500M+ kuruluş, 200M+ ilişki
- **API:** JSON REST API, reklam almayan
- **Fiyat:** Ücretsiz
- **Özellikler:**
  - "Person A'nın bağlantıları" — tüm kuruluşlar, firmalar, kişiler
  - Yaptırım kontrolleri otomatik
  - PEP (Politically Exposed Persons) tanımlaması

**Sınırlamalar:** API yavaş olabilir, GUI bazen yanıt vermez

#### Google Earth Pro
- **İndirme:** earth.google.com/download-pro (ücretsiz)
- **İşlev:** Uydu görüntüleri, 3D görünüm, zaman çizelgesi (eski fotoğraflar)
- **Hız:** Anında
- **Gerçek Vaka:** Bellingcat, uydu görüntüleri ile Douma saldırısını zamanladı
  - Saldırı öncesi foto: "Savaş alanı sakin"
  - Saldırı sonrası foto: "Dümü yok, hastane tahrip"
  - Saatler arası uydu fotoğrafı = saldırı kesin doğru

#### Sentinel Hub (ESA)
- **Kurulum:** sentinelhub.com, hesap aç
- **İşlev:** Uydu verisi, infrared, termal (meteorolojik ek analiz)
- **Fiyat:** Ücretsiz (günlük 100 free requests)
- **Özellikler:**
  - Günlük uydu fotoğrafları (Google Earth her ay, bunu her gün)
  - Infrared: "Bu alan son 24 saatte ısındı mı?" (yangın tespiti)
  - Tarımsal verim analizi (tarihsel alet sonra tahmin)

#### Hunchly
- **Kurulum:** hunchly.com, Chrome extension
- **İşlev:** Web capture tool — sosyal medya ekran görüntüleri, tamamen otomatik metadata
- **Fiyat:** $99/ay
- **Neden:** Twitter, Reddit, Facebook'ta "bunu sonra silebilir" endişesi
  - Hunchly otomatik screenshot alır, URL+zaman+context kaydeder
  - Mahkeme kanıtı olarak geçerli (metadata tampon)

**Gerçek Vaka:** ProPublica, Facebook'ta bir grupla ilgili araştırma yaptığında, Hunchly ile 50+ post'u korudu. Yapıyı 2 ay sonra sildi, ama kanıt kalmıştı.

#### InVID / WeVerify (Video Verification)
- **Kurulum:** Chrome extension, ücretsiz
- **İşlev:** Video metadata çıkarma, tersine görüntü araması, sahte video tespiti
- **Özellikler:**
  - YouTube video: "İlk upload ne zaman?" "Kimin kanalı?" otomatik
  - TikTok/Instagram video: QR kod ile orijinal kontrol
  - Deepfake göstergesi: Dudak senkronizasyonu kontrolü

#### ExifTool
- **Kurulum:** exiftool.org, komut satırı (Windows/Mac/Linux)
- **İşlev:** Fotoğraf + PDF metadata çıkarma
- **Öğrenme Eğrisi:** Komut satırı bilgisi gerekir (muhabirler zorlanır)
- **Alternatif GUI:** Metadata Anonymization Toolkit (MAT2)

**Kullanım:**
```bash
exiftool -a document.pdf | grep -i "author\|create\|modify"
```

Çıktı:
```
Creator: John Smith
CreationDate: 2023-01-15 10:30:00
ModifyDate: 2024-02-20 14:30:00
```

#### OCCRP API
- **Kurulum:** aleph.occrp.org API dokümantasyonu
- **İşlev:** Korporatif açmaca, yaptırımlar otomatik çekme
- **Ortak Sorgular:**
  ```
  /entities?q=John+Smith  → Tüm John Smith'ler (KYC)
  /sanctions?person=...   → Yaptırım listesi
  /relationships?entity=X → X'in tüm bağlantıları
  ```

### 3.3 Gazetecilerin ASLA Kullanmadığı Araçlar (Niçin)

#### Blockchair / Blockchain Explorers
- **Neden:** Kripto para işlemleri takibi nadir, muhabir bilgisi gerekir
- **Sınırlamalar:** Blockchain anonimdir, kimlikle bağlanması zor
- **Örnek:** Ransomware atağında, suçlu kripto talep etti — para akışını Blockchair'de izleyen sayılı muhabir var

#### Shodan (IP Araştırması)
- **Neden:** İnternet infrastrüktürü soruşturması (derin teknik)
- **Sınırlamalar:** Siber güvenlik ekipleri için, gazetecilik az

---

## 4. GAZETECİLERİN İHTİYAÇ DUYDUGU AMA OLMAYAN ARAÇLAR

Araştırmacı gazeteçi, idealinde bu araçlara ihtiyaç duyar:

### 4.1 Birleştirilmiş Belge Karantinası

**Sorun:** Sızıntı belgesi alındığında, virüs mü diye kontrol etmek zor
- VirusTotal kullanırlar (malwarescan), ama
- Belgenin hassasiyeti nedeniyle upload etmek risklidir (Google'a gider)
- Masaüstü antivirus yetersiz (0-day exploitler)

**İdeal Çözüm:** Offline malware scanning, "kimse bilmiyor" garantisi
- Şimdiki: Muhabir, belgeyi "güvenli olmayan" bilgisayarda açar (ağdan ayrılı)
- Gelecek: Project Truth gibi, belge sandbox'ta temizlenebilir

### 4.2 Çapraz Belge Varlık Eşleştirmesi

**Sorun:** 10.000 belgeniz var, hepsi farklı "John Smith" söyle
- Hangisi aynı kişi? Hangisi farklı?
- Elle karşılaştırma: 3-4 hafta işgücü kaybı
- Fuzzy matching algoritmaları: DocumentCloud'a yok

**İdeal Çözüm:** "Bu tüm belgelerde geçen kişi mi?" otomatik Yanıt
- Şimdiki: Python + Levenshtein algartması, illa takım yazar
- Gelecek: Project Truth, tüm varlıkları otomatik bağlar

### 4.3 Zaman Çizelgesi Otomatik Oluşturma

**Sorun:** "Bu olaylar nereden bağlantılı?"
- A olayı 2015'de
- B olayı 2017'de
- C olayı 2019'de
- Eğer karşı A'da yazanlar C'de olanlarla aynıysa → konneksiyon kanıtı

**İdeal Çözüm:** "Tarihsel olayları dönemleştir" — sistem otomatik gösterir
- Şimdiki: Elle spreadsheet
- Gelecek: Project Truth, timeline otomatik

### 4.4 Şüpheli Mali Akışı Tespiti

**Sorun:** "Bu para nereden geldi, nereye gitti?"
- 50 banka dosyası, 200+ transfer
- Hangileri şüpheli? (ülkenin yasak listesi, terör finansmanı, vb)

**İdeal Çözüm:** FATF (Financial Action Task Force) kurallarına otomatik kontrol
- Şimdiki: Finans uzmanı, elle kontrol
- Gelecek: AI sistem, otomatik kırmızı bayrak

### 4.5 Güvenli İşbirliği Platformu

**Sorun:** Yapılandırılmış Veriye erişmeleri engellemeli, ama döktürmeli
- Team GoogleDocs: Şifrelemesiz, Google biliyor
- Team Signal: Sadece mesajlaşma, dosya yönetimi zayıf

**İdeal Çözüm:** "DocumentCloud + Signal + Datashare" birleştirme
- Şimdiki: Gazeteçi, 3-4 alet arasında geçiş yapar (verimlilik kaybı)
- Gelecek: Tek platform, tüm işlevler

### 4.6 Otomatik Kaynak Doğrulaması (Confidence Scoring)

**Sorun:** "Bu belgenin güvenilirliği yüzde kaç?"
- Eski mi? (metadata)
- Sansürlü mi? (redaction)
- Çakışan kaynak var mı? (triangulation)
- Çelişkiler var mı?

**İdeal Çözüm:** AI, güvenilirlik skoru otomatik ver
- Senaryo: DocumentCloud, PDF yükledin
  - Sistem: "Bu belge 87% güvenilir (eski, 2 çapraz kaynak)"
  - Muhabir: "Neden?" → Sistem, açıklamayı gösterir

---

## 5. GAZETECİNİN İLK 30 SANİYESİ: NE KALIYOR?

Yeni bir araç bulduğunda, gazeteçi şunu sorar:

### 5.1 "Bu Kim?"

- **Yazılımı Kimin Geliştirdi?** Open source mu? Ticari mi?
  - Ticari: Hangi yatırımcı finanse ediyor? (çıkar çatışması?)
  - Open source: Kimler contributes ediyor? Active mi?
- **Basın Yayını Nedir?** Hangi medya kuruluşları kullanıyor?
  - NYT kullanıyorsa: Iyi, test edilmiş
  - Başkası kullanmıyorsa: Endişe, neden?
- **Müşteri Destek:** Cevap veriyor mu? Hızlı mı?
  - Email yanıt: 48 saat içinde
  - Telefon: Vardır mı?
  - Slack/Discord: Topluluk var mı?

### 5.2 "Bunu Yapabilir mi?"

- **İş Akışı:** Kâğıt belgeyi → Dijitalleştir → Ara → Annotat → Paylaş
  - 5 adımın hepsi tek araçta olmalı
- **İş Gücü:** 2 saat kurulumdan sonra,muhabir işe başlayabilmeli
  - CSV import: 5 dakika
  - Eğitim: 30 dakika
  - İş: 30 dakika sonra yapacak
- **Entegrasyon:** Diğer araçlarla bağlanabiliyor mu?
  - DocumentCloud → Google Sheets
  - Aleph → PACER
  - Slack → Alert gelmeli

### 5.3 "Güvenilir mi?"

- **Gizlilik:** Belgelerime kimse erişebilir mi?
  - Yerel sunucu: Iyidir
  - AWS/Azure: İyidir ama şirket biliyor
  - Google Cloud: Endişeli (Google, hassas belge görebilir)
- **Açık Kaynak:** Kaynak kodu kontrol edilebilir mi?
  - Gizilenmiş kaynak: Kara kutu → Endişeli
  - GitHub: Bağımsız audit mümkün → Güvenilir
- **Kanuni:** Belgelerim mahkeme kanıtı olabilir mi?
  - Metadata tam kayıtlanıyor mu? (tamper-proof)
  - Denetim izi var mı? (kim değiştirdi)
  - İzin sistemi var mı? (kimin erişimi var)

### 5.4 "Neye Kadar Çalışır?"

- **Ölçeklenme:** 10 belge mi? 1 milyon belge mi?
  - 1000 belge: Hepsi çalışır
  - 1M belge: Sadece Datashare/Aleph
  - 100M belge: Custom setup (Pandora Papers için)
- **Otomasyon:** 100 belgeyi elle annotate edeyim mi?
  - Evet → Beş gün işgücü
  - Hayır → OCR + AI clustering araştır

### 5.5 DocumentCloud Neden Başarısız Olmuş Diğer Araçlar

**Alternatives Neden Başarısız:**

| Araç | Başarısızlık | Sebep |
|---|---|---|
| **NewsDiffs** | Kapandı | Kısa vadeli (tek proje için) |
| **EveryPolitician** | Kapandı | Veritabanı güncelleme yükü |
| **Pushshift (Reddit)** | Kapandı | Reddit API değişikliği + dava |
| **Factiva** | Pahalı | $1500+/yıl muhabir başına |
| **LexisNexis** | Pahalı | Avukatlar için (gazeteçi değil) |

**DocumentCloud Neden Başarılı:**
1. Muhabirler ile eş-tasarım (participatory design)
2. Ucuz (gazeteçi para var)
3. Açık API (integrasyonlar yazılır)
4. Basit UX (5 dakikada kullan)
5. Yasal destek: AP, Guardian gibi başlatmalar başladı

---

## 6. GAZETEÇI ARAÇLARI İÇİN GÜVENLİK GEREKSİNİMLERİ

### 6.1 Tehdit Modeli

Araştırmacı gazeteçinin tehditleri:

| Tehdit | Oyuncu | Amaç | Mühendislik |
|---|---|---|---|
| **Kaynak Tanımlama** | İstihbarat Teşkilatı | Fısıldayıcıyı bulmak | Metadata analizi, IP logging |
| **Doküman Ele Geçirme** | Hükümet | Neyi biliyorlar kontrol | Subpoena, mahkeme emri |
| **Hesap Hackleme** | Suçlular | Belgeleri görmek | Brute force, phishing |
| **Markalama** | Otoriter Hükümet | Silmek/baskı | DMCA notice, site kaldırma |
| **DDoS** | İlgililer | Yayını durdurmak | Sunucu çöktürme |
| **Dava** | İddia altında kişi | Zarar talebi | SLAPP (Strateji Davası) |

### 6.2 Teknik Savunmalar

#### Kaynak Koruma

**Senaryo:** Muhabir, kimliği gizlenmiş kaynak ile Signal'de konuşuyor

```
Tehdit: Hükümet, muhabirerin telefon sinyallerini takip ediyor
Savunma Katmanları:
1. Telefon: Apple iPhone (şifreli)
2. Uygulama: Signal (end-to-end encryption)
3. VPN: ProtonVPN (IP maskeleme)
4. Lokasyon: Kahve dükkanı (ev değil)
5. Zaman: Rasgele (her gün değil, gözlemci pattern kırıyor)
6. Protokol: "Yalnızca Signal, e-posta değil" (email interceptible)
```

**Gerçek Vaka:** Hong Kong, 2020
- Apple Daily gazetecileri, Pekin hükümeti tarafından takip ediliyordu
- Araçları: VPN + Tor + Signal
- Sonuç: 6 ay sürdü, ama nihayet yakalarıldılar (AI facial recognition + tele)
- Ders: Dijital güvenlik, fiziksel güvenlikten geçemez

#### Belge Koruma

**Senaryo:** Muhabir, sızıntı belgesini yerel bilgisayarda açıyor

```
Tehdit: Malware, belgeyi çalmak
Savunma:
1. Bilgisayar: Eski laptop (gündelik işlerden ayrı)
2. İşletim Sistemi: Linux (Windows'tan daha güvenli)
3. Erişim: Biometrik şifre (brute force yavaş)
4. Ağ: Ağdan ayrılı (offline mode)
5. Başta gözdengeçirme: VirusTotal (belge upload riskli ama yapılır)
6. Yedek: USB drive (şifreli, safe'de tutulur)
```

**Gerçek Vaka:** Reality Winner (2017)
- NSA çalışanı, belge bastırdı
- **Catch:** Yazıcının izleme noktaları (görünmez desen)
- **Ders:** Dijital → Fiziksel: Teknoloji, toz gibi iz bırakır

#### Platform Koruma

**Senaryo:** Gazeteci, DocumentCloud'a belge yüklüyor

```
Tehdit: Belge sızdı, yüklendikten 24 saat sonra hacker erişti
Savunma:
1. DocumentCloud: AWS regional (şifrelenmiş)
2. Erişim: OAuth + 2FA (parolamı çal bile sonuçsuz)
3. Paylaşım: Link = random UUID (tahmin edemez)
4. Denetim: Sistem, "kim indir yaptı" kaydeder
5. Hukuki: DocumentCloud, subpoena için direniş aracı (bazen başarılı)
```

#### Gazeteci Koruma

**Senaryo:** Yayın yapıldı, hukumetin avukatından mektup geldi

```
"Bu makale şirketimizi haksız yere bozgunça uğrattı, 10M dolar istiyoruz"
↓
Gazetecinin Savunmalar:
1. Doğruluk (truth): Belge gerçek, yüksek sesle söyledim
2. Fikri: "Bu benim yorumum" — fikir serbest
3. Ayrıcalık: Gazeteci-kaynak gizliliği (Şaman privilege)
   → Hukuk: Bazı ülkelerde var (İngiltere), bazında yok (ABD sınırlı)
4. Kamu Yararı: "Bu çok önemliydi, kamuya söylemek gerekiyordu"
5. Retraction: Yanılmışsanız, düzeltme yayınla (zararı azalt)
```

**Shield Law Varyasyonları:**
- **Güçlü (İngiltere, Kanada):** "Gazeteci, kaynak asla açmaz" (hukuk da zorlayamaz)
- **Orta (ABD):** "Federal mahkemede kaynağı açmak zorunlu değil" (koşullu)
- **Zayıf (Türkiye):** "Milli güvenlik" bahanesi ile kaynak açtırılabilir

### 6.3 SecureDrop Metodolojisi

En güvenli belge alışı: **SecureDrop**

```
İhbarcı → Tor Browser (anonim)
  → Gazeteçinin SecureDrop sunucusu (haber sitesinin .onion adresi)
  → Belge + İleti
  → Gazeteci, tor üzerinden indirir
  → Kaynakın IP'si asla bilinmez
```

**SecureDrop'u Kullanan:**
- New York Times
- Washington Post
- Guardian
- BBC
- AP
- ProPublica
- Der Spiegel

**Sınırlamalar:**
1. İhbarcı, Tor kurmayı bilmeli (teknik bilgi gerekir)
2. Gazeteci, tor-compatible sunucu ayarlamalı (sistem yöneticisi gerekir)
3. El yazısı belge: Scan gerekir (dijital olmalı)
4. Çok yavaş: Büyük dosya (500MB+) indirmek 2-3 saat

**Alternatif: Tezc (Open Source SecureDrop)**
- Açık kaynak, kendi sunucuya kurulur
- Basit kurulum (Docker)
- Tor + Clearnet seçeneği

---

## 7. GAZETECILER NASIL BAŞARISIZ OLUR?

### 7.1 Yaygın Hatalar

#### Hata 1: Tek Kaynağa Güven
- **Senaryo:** "CEO bana dedi ki..." (ve başka kaynak yok)
- **Sonuç:** Yalan çıksa, gazeteçiye dava
- **Örnek:** Rolling Stone / UVA rape story (2014)
  - Kurban "katıştı" (composite character)
  - Gazeteç, ek kaynak kontrol etmedi
  - Sonuç: 175M dolar uzlaştırma (RS kurtuluş)
  - Ders: "She said" kafidir, "corroborate" gerekir

#### Hata 2: Metadata Karşılaştırması Yapılmadı
- **Senaryo:** "Bu belge 1970'de yazıldı" (ama metadata 2023 gösterir)
- **Sonuç:** Belgeler sahte
- **Örnek:** Killian Documents (2004)
  - CBS, belgeler proportional fontla yazılmış olmasına rağmen yayınladı
  - Doğru: 1973 fontlar monospace (Courier)
  - Teknoloji: Proportional font 1980'lerde yazılımda
  - Sonuç: CBS'in itibarı yok oldu, 270M dolar kaybetti

#### Hata 3: Coğrafi Doğrulama Yapılmadı
- **Senaryo:** "Bu binanın fotoğrafı New York'ta çekildi" (ama başka yerde)
- **Sonuç:** Belge yanlış bağlamda sunuldu
- **Örnek:** Syria fake videos
  - Gazeteciler, Suriye'deki videolara kışkırtma atfetti
  - Ama video, 2 yıl önceki başka ülkede çekilmişti
  - Kontrol: Google Maps / Street View
  - Ders: Gölge açısı + yer işareti = coğrafi doğruluk

#### Hata 4: Deepfake Video / Sesine Güvenme
- **Senaryo:** "Video bunu kanıtlıyor" (ama deepfake)
- **Sonuç:** Yanlış suçlama
- **Kontrol:** InVID / WeVerify, dudak senkronizasyonu, ses analizi
- **Şimdiki Durum:** Deepfake'ler iyileşiyor, doğrulama zor

#### Hata 5: Arşiv (Internet Archive) Kullanmadığında
- **Senaryo:** "Bu web sayfası 2010'da şöyle yazıyordu" (ama site silindi)
- **Çözüm:** web.archive.org, sayfa snapshot'ı var
- **Ders:** Gazeteci, eski haber kaynağı kaybetse bile, arşivde arama yapabilir

### 7.2 Çelik Duvarlar (Kanuni Yapılar)

#### SLAPP (Strateji Davası)
- **Tanım:** Gazeteçiyi susturmak için dava açılması
- **Mekanizm:** "Bu yazı yalan, 50M dolar istiyorum"
  - Dava zor, ama müdafi maliyeti yüksek (100K-500K)
  - Gazeteç, bu maliyeti karşılayamıyor → sessiz kalıyor
- **Savunma:** Shield Law + Medya Sigorası
  - ABD: Anti-SLAPP kanunları (iki yönde hareket)
  - EU: Hukuk daha gazeteçi lehine

#### Mahkeme Emri (Subpoena)
- **Tanım:** "Belgelerinizi mahkemeye verin"
  - Gazeteci: "Hayır, kaynağını korumam gerekiyor" → Ceza hapis
- **Tarihçe:** Daniel Pearl, Valerie Plame (suçlu bulundu ama gazeteci cezalandırıldı)
- **Savunma:** Shield Law, "qualified privilege"
  - 50 US states'in 49'u shield law var (ama Alabama'nın yok!)
  - Federal mahkemede: Başlangıç ve Sonuna Testi (başa çıkılmış)

#### Libel / Defamation (İtham / İtibar Kırma)
- **Eşik (Threshold):** Belge yanlış + gazeteç "hakikaten inanmadı"
- **Savunmalar:**
  - Doğruluk: "Bu gerçek, bunu kanıtlarım"
  - Fikir: "Bu benim editoryal yorum" (Opinions're protected)
  - Ayrıcalık: "Adli karardan alıntı" (judicial privilege) → imkansız susturma
- **Zararlar:** Presume = hızlı karar, Actual = kanıt lazım (zor)

---

## 8. SONUÇ: GAZETECİLERE SORU

Project Truth, araştırmacı gazeteçilerin eksik ihtiyaçlarını analiz ederken, şu sorular ortaya çıkar:

### Platform Tasarım Soruları

**S1: "Belge Karantinası Ne Kadar Güvenilir?"**
- Cevap: Gazeteçi, kendine yeterli olmayacak
- İdeal: Peer-reviewed sistem (başka gazeteci onaylıyor)
- Risik: False positive (yanlış belge kabul edilir) vs false negative (doğru belge reddedilir)
- Kural: Yanlış belge reddedilmesi > doğru belge kabul edilmesi (precision > recall)

**S2: "AI Hallüsinasyonuna Karşı Savunma?"**
- Cevap: Confidence scoring, sadece 70%+ göster
- Sınır: AI'nın güvenliği "biliyor mu biliyor mu" dilemması
- İdeal: İnsan override sistemi (gazeteci, AI'nın kararını çevirebilir)

**S3: "Hukuki Sorumluluk Kimin?"**
- Platform mi? Muhabir mi?
- Cevap: Muhabir yayınlarsa, muhabir sorumlu
- Platform: Okulunun sorumluluğu gibi (negligent if didn't warn)

**S4: "Gazetecinin İlk 30 Saniyesi?"**
- Soru: "Bunu 30 saniyede yapabilir miyim?"
- Yanıt: DocumentCloud, 5 saniye
- Amaç: Project Truth, 10 saniyeden az

**S5: "Büyük Medya vs Küçük Medya?"**
- NYT: 500+ gazeteci, 1M dolar/soruşturma bütçesi
- Yerel haber: 5 gazeteci, 50K dolar/yıl bütçe
- İhtiyaç: Her ikisine de güvenli, uygun fiyatlı araç

---

## SON NOT: "BELGESİ OLMAYAN GAZETECİ"

Araştırmacı gazeteciliğin paradoksu şu: **En iyi soruşturmalar, en az belgeyle başlanır.**

```
Başlangıç: "CEO rüşvet aldı" (kaynak söy, kanıt yok)
↓
Hipotez: "Eğer rüşvet aldıysa, banka kaydında iz olur"
↓
Arama: "Bu bankadan bu şirkete para geçti mi?"
↓
Bulma: "Evet, 10M dolar, 3 transfer"
↓
Doğrulama: "Bu paranın adalet sebebi nedir?"
↓
Bulma: "Hiç sebebi yok, gizli para"
↓
Yayın: "CEO'yu rüşvet aldığı kanıtlandı"
```

Bu akışı hızlandıran platform = gazeteciliğin geleceği.

**Project Truth'un Potansiyeli:** Adımı 3 haftadan 3 güne indirmek. Bu da demektir:
- Bir muhabir, paralel 10 soruşturma yapabilir
- Yerel haber, NYT'nin yapabileceğini yapabilir
- Küçük ülke, kendi dosyalarını çözmek için sahip olduğunu oluştur.

