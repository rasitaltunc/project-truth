# SOKRATİK DÖNGÜ — 5 ARAŞTIRMA SENTEZİ
## Gamified Expert Verification + Zero-Knowledge + Natural Selection + Multi-Role Analysis + Translation
### 22 Mart 2026

---

## 1. GAMİFİED VERİFİKASYON SİSTEMLERİ

### Kanıtlanmış Başarılar
- **Foldit:** 57K oyuncu, 15 yıllık protein problemini 10 günde çözdü
- **Galaxy Zoo:** Vatandaş bilim insanları 10+ oy birleştiğinde %90 doğruluk = profesyonel astronoma eşdeğer
- **Duolingo Immersion:** Kitle çevirileri "profesyonel kadar iyi" bulundu
- **reCAPTCHA:** 200M+ kitap kelimesi günlük, %99.1 doğruluk iki bağımsız oyla

### Kritik Metrikler
- **Optimal gözden geçirici sayısı:** 3-5 (5'ten sonra marjinal fayda ≈ 0)
- **Altın standart soruları:** Görevlerin %20'si cevabı bilinen → düşük kaliteyi %40-60 yakalama
- **Fleiss' Kappa ≥ 0.60:** Kabul edilebilir topluluk konsensüsü
- **Maliyet:** Uzman $10/görev vs. kitle $0.30/görev (33x fark)

### Truth İçin Uygulama
- Her AI çıkarımı = doğrulama görevi kartı
- %20 altın standart soruları (ground truth'u bilinen entity'ler)
- 3-5 bağımsız gözden geçirici minimum
- Fleiss' Kappa hesaplaması → konsensüs kalitesi ölçümü

---

## 2. ZERO-KNOWLEDGE MESLEKİ DOĞRULAMA

### Production-Ready Teknolojiler
| Teknoloji | Durum | Kullanım |
|-----------|-------|----------|
| W3C Verifiable Credentials 2.0 | Standart | Sertifika formatı |
| Polygon ID | Production | zk-proof doğrulama |
| Hyperledger Aries | Production | Credential alışverişi |
| IRMA | Production | Seçici ifşa |
| Idena | Production | Proof-of-personhood (biometriksiz) |
| Semaphore | Production | Anonim grup üyeliği kanıtı |

### Minimum Veri Mimarisi
- Platform sadece **credential proof hash** saklar
- İsim yok, email yok, IP yok
- Mahkeme celbi gelse bile verecek veri yok (teknik olarak imkansız)
- SecureDrop modeli: 60+ haber kuruluşu kullanıyor

### Gazeteci Doğrulaması Akışı
```
RSF/CPJ üyelik sertifikası
  → W3C VC formatında dijital sertifika
    → zk-SNARK ile "bu kişi geçerli basın kartı sahibidir" kanıtı
      → Platform kimliği BİLMEZ
        → Kullanıcı gazeteci paneline erişir
```

---

## 3. DOĞAL SELEKSİYON MEKANİZMALARI

### Derecelendirme Sistemleri
- **Glicko-2:** Beceri (μ) + belirsizlik (σ) ayrı modelleme, 4-6 haftada yakınsama
- **Item Response Theory (IRT):** Soru zorluğu + test alan yeteneği eşzamanlı kalibrasyon
- **Quora modeli:** 5 özelliğin ensemble'ı → %97 uzman tespiti

### Başarısızlık Vakaları
- **Stack Overflow:** Kullanıcıların %12'si itibarlarının >%50'sini 1-2 cevaptan aldı → tek metrik oynanabilir
- **Goodhart Yasası:** "Bir ölçü hedefe dönüşünce ölçü olmaktan çıkar"

### Anti-Manipülasyon Savunmaları
1. **Metrik rotasyonu:** Aynı metriği sürekli kullanma
2. **Çok boyutlu skorlama:** Tek sayı yerine rol bazlı profil
3. **Bal küpü soruları:** Cevabı yanlış olan sorular → kasıtlı yanlış yapanları yakalar
4. **Inter-rater reliability:** Kullanıcılar arası tutarlılık ölçümü
5. **Progressive difficulty:** ELO/Glicko-2 ile zorluk ayarlama

### Truth İçin Uygulama
- Kullanıcıları tek "doğruluk puanı" DEĞİL, rol bazlı çok boyutlu profillerle değerlendir
- Glicko-2 ile her rolde ayrı beceri + belirsizlik takibi
- Altın standart soruları ile sürekli kalibrasyon
- 4-6 haftalık "ısınma dönemi" yeni kullanıcılar için

---

## 4. ÇOKLU BAKIŞ AÇISI ANALİZİ

### Akademik Kanıt
- **Çeşitli takımlar:** %87 doğruluk vs. homojen takımlar %58 doğruluk (%25-30 iyileşme)
- **Optimal perspektif sayısı:** 3-5 (6'dan sonra <%1 ek fayda)
- **Prediction markets:** Anketleri %74 oranında yendi, %91 doğruluk

### Kanıtlanmış Modeller
| Model | Alan | Mekanizma |
|-------|------|-----------|
| CIA Red Teams | İstihbarat | Karşıt argüman zorunluluğu |
| Tümör Konseyleri | Tıp | 8+ uzmanlık dalı konsensüsü |
| Çekişmeli Hukuk | Hukuk | Savcı + savunma zorunlu çatışması |
| Delphi Metodu | Tahmin | Anonim turlu konsensüs |

### Güven Paradoksu
> Çeşitli gruplar %87 doğru ama %45 güven bildiriyor.
> Homojen gruplar %58 doğru ama %72 güven bildiriyor.
> **En doğru grup kendinden en az emin olan.**

### Truth'un 6 Rol Sistemi (Sokratik Döngü)
1. **Savcı** — Suçlama perspektifi, bağlantı kanıtı arar
2. **Savunma Avukatı (Şeytan'ın Avukatı)** — Karşıt argüman, alternatif açıklama
3. **İstihbarat Analisti** — Pattern analizi, ağ topolojisi, anomali tespiti
4. **Araştırmacı Gazeteci** — Kaynak doğrulama, iki kaynak kuralı, bağlam
5. **Veri Bilimci** — İstatistiksel analiz, korelasyon vs. nedensellik, sapma tespiti
6. **İnsan Hakları Gözlemcisi** — Mağdur perspektifi, uluslararası hukuk, etik
7. **Tercüman** (ek rol) — Çeviri doğrulama, bağlam kontrolü, terminoloji

---

## 5. ÇEVİRİ DOĞRULAMA

### En Uygun Model: Unbabel AI+İnsan Döngüsü
```
AI çevirisi → İnsan post-edit → Kalite değerlendirme → Geri bildirim → AI iyileşir
```

### Kalite Metrikleri: MQM (7 Boyut)
1. Terminoloji doğruluğu
2. Dilbilgisi
3. Stil
4. Yerelleştirme
5. Doğruluk
6. Akıcılık
7. Biçimlendirme

### Türkçe Hukuk Çevirisi Zorlukları
- Eklemeli morfoloji (tek kelime = tam cümle)
- Osmanlıca miras terminoloji
- Batı hukuki terimlerinin tam karşılığı her zaman yok
- Bağlam-duyarlı çeviri gerekliliği yüksek

### Stilometri Riski
> ~2000-3000 kelime bir çevirmenin tarzını parmak izi gibi tanımlar.
> Düzenli çeviri yapan gazeteci, çeviri tarzından kimliği ifşa olabilir.

**Savunma Mekanizmaları:**
1. Parça katkısı — her çevirmen sadece küçük parça çevirir
2. Post-edit only modu — AI çevirir, insan düzeltir (tarz AI'a ait)
3. Stil eşitleme — çıktının tek bir "platform stili"ne normalize edilmesi
4. Karışık atama — rastgele parça dağıtımı (pattern oluşturmaz)

---

## KRİTİK SAYILAR ÖZETİ

| Metrik | Değer | Kaynak |
|--------|-------|--------|
| Optimal gözden geçirici | 3-5 kişi | Galaxy Zoo, reCAPTCHA |
| Altın standart soru oranı | %20 | Crowdsourcing literatürü |
| Çoklu perspektif doğruluk artışı | %25-30 | Akademik çalışmalar |
| Glicko-2 yakınsama süresi | 4-6 hafta | Rating sistemi literatürü |
| Uzman tespit doğruluğu | %97 | Quora ensemble modeli |
| Kitle çevirisi doğruluğu | %92-96 | 30+ gözden geçirici ile |
| Stilometri riski eşiği | 2000-3000 kelime | Forensic linguistics |
| Kabul edilebilir konsensüs | Fleiss' Kappa ≥ 0.60 | İstatistik standardı |

---

## TRUTH İÇİN BİRLEŞİK MİMARİ ÖNERİSİ

```
SOKRATİK DÖNGÜ
├── ROLLER (6+1)
│   ├── Her rol kendi soru bankası
│   ├── AI ajanları rol-bazlı soru üretir
│   └── Kullanıcılar rol seçip cevaplar
│
├── DEĞERLENDİRME
│   ├── Glicko-2 rol-bazlı beceri takibi
│   ├── %20 altın standart kalibrasyon
│   ├── Çok boyutlu profil (tek sayı DEĞİL)
│   └── Fleiss' Kappa konsensüs ölçümü
│
├── GÜVENİLİRLİK
│   ├── W3C VC + zk-SNARK gazeteci doğrulaması
│   ├── Idena proof-of-personhood (Sybil direnci)
│   ├── Bal küpü soruları (manipülasyon tespiti)
│   └── Metrik rotasyonu (Goodhart savunması)
│
├── ÇEVİRİ
│   ├── AI+insan post-edit döngüsü
│   ├── MQM 7 boyutlu kalite ölçümü
│   ├── Stilometri koruması (parça katkı + stil eşitleme)
│   └── Türkçe özel terminoloji bankası
│
└── ÇIKTI → 5 KATMANLI GÜVEN FORMÜLÜ (v2)
    ├── GRADE → NATO → Berkeley → ACH → Transparency
    └── Sokratik cevaplar formülü besler
```

---

**Araştırma Tarihi:** 22 Mart 2026
**Araştırma Ajanları:** 5 paralel Claude Opus ajanı
**Toplam Veri:** ~500KB, 100+ akademik kaynak
**Durum:** Sentez tamamlandı, uygulama planı bekliyor
