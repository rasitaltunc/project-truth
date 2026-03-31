# PROJECT TRUTH — MASTER STRATEGY BRIEF
## Araştırma Sentezi ve Stratejik Yol Haritası

**Proje:** Project Truth (ai-os monorepo)
**Kurucu:** Raşit Altunç
**Tarih:** 7 Mart 2026
**Kaynak:** 6 araştırma dokümanı (1.300+ satır stratejik analiz)
**Durum:** Sprint 6A tamamlandı → Sprint 6B ve ötesi için yol haritası

---

## 1. YÖNETİCİ ÖZETİ

6 araştırma dokümanı şu alanları kapsıyor: araştırmacı gazetecilik araçları, güven mimarisi ve itibar ekonomisi, doğrulama metodolojisi, güç ağları akademik analizi, ve OSINT topluluğu dinamikleri. Bu brief, tüm bulguları tek bir çatı altında birleştirip Project Truth'un sonraki fazları için uygulanabilir bir strateji sunuyor.

### Kritik Bulgular

**1. Mevcut Staking Modeli Kırılgan**
Sabit -5/+15/-10 modeli davranışsal ekonomi açısından sorunlu. Kahneman'ın kayıp kaçınması (loss aversion) ilkesine göre insanlar kayıpları kazançların 2 katı şiddetinde hisseder. Sonuç: Yeni kullanıcılar kanıt göndermekten kaçınır, veri akışı kurur.

**2. Görsel Ontoloji En Büyük Farklılaştırıcı**
Hiçbir rakip (Palantir, Maltego, Linkurious, Gephi) epistemolojik belirsizliği görselleştirmiyor. Çizgi kalınlığı = kanıt gücü, renk doygunluğu = kesinlik seviyesi, bağlantı üstü ikonlar = kanıt tipi. Bu, Project Truth'u "güzel grafik" olmaktan çıkarıp "bilgi aracı" yapan şey.

**3. ClaimReview/JSON-LD Organik Büyüme Kanalı**
Schema.org yapılandırılmış veri standardı sayesinde Google, platformdaki doğrulamaları indeksleyebilir. Sıfır reklam bütçesiyle organik keşfedilebilirlik.

**4. Gazeteci Koruma Üçlü Caydırıcı Model**
Dead Man Switch (Shamir's Secret Sharing + Sarcophagus blockchain) + canlı topluluk paralel soruşturma + tekrarlanabilir metodoloji = gazeteciye dokunmanın maliyetini astronomik yapan sistem.

**5. Rol Bazlı UX Zorunlu**
Vatandaş araştırmacı, gazeteci, akademisyen ve kurumsal kullanıcının ihtiyaçları birbirinden radikal olarak farklı. Tek UX herkesi mutsuz eder.

---

## 2. REKABET ANALİZİ

### Doğrudan Rakipler ve Konumlanma

| Platform | Güçlü Yanı | Zayıf Yanı | PT Farkı |
|----------|-----------|-----------|----------|
| **Palantir Gotham** | Devlet düzeyi analitik | Kapalı, pahalı ($M+), etik sorunlar | Açık kaynak, topluluk odaklı |
| **Maltego** | OSINT transformları, otomasyon | Pahalı ($999/y), tekil kullanıcı | İşbirlikçi, ücretsiz community tier |
| **Linkurious** | Web tabanlı, sezgisel UI | Sadece görselleştirme, doğrulama yok | Doğrulama + itibar entegre |
| **Aleph (ICIJ)** | Belge işleme, OCR | Kapalı ekosistem, yalnızca konsorsiyum | Açık katılım |
| **Datashare** | P2P mimari | İtibar sistemi yok | Güven ekonomisi |
| **Gephi** | Akademik standart | Statik, işbirliği yok | 3D + realtime + AI |
| **Neo4j** | Veritabanı gücü | Araç değil platform değil | Uçtan uca çözüm |

### Project Truth'un Benzersiz Değer Önerisi

```
Hiçbir rakipte AYNI ANDA bulunmayan 5 özellik:
1. 3D interaktif görselleştirme + epistemolojik belirsizlik gösterimi
2. Topluluk tabanlı güven ekonomisi (staking/slashing)
3. AI sorgulama (ağla konuş)
4. Açık kaynak + federatif doğrulama
5. Gazeteci koruma altyapısı (DMS + topluluk)
```

---

## 3. DÖRT KULLANICI ROLÜ VE UX GEREKSİNİMLERİ

### 3A. Vatandaş Araştırmacı (Anonim + Platform Kurdu)

**Profil:** Meraklı vatandaş, gazetecilik eğitimi yok, ama doğruyu arıyor. Bellingcat'in açık çağrılarına katılan kitle.

**UX İlkeleri:**
- **Mikro-görev mimarisi:** Büyük soruşturmayı parçalara böl. "Bu fotoğraftaki binayı tespit et", "Bu belgedeki imzayı doğrula" gibi atomik işler.
- **Oyunlaştırma ama etik:** Trace Labs CTF modeli (iyi), Dark Pattern değil. Badge ≠ oyuncak. Her badge bir yetkinliğe karşılık gelmeli.
- **Travma koruma:** Otomatik blur, sessiz ses, zorunlu mola (30dk'da bir "ara ver" uyarısı). İçerik maruziyet takibi.
- **Kompartmantalizasyon:** Vatandaş yalnızca kendi mikro-görevini görür, tam ağ topolojisini görmez. Kötü aktörlerin ağı haritalandırması engellenir.
- **Sandbox:** İlk 5 katkı "eğitim modu"nda — gerçek ağa girmez, deneyim kazandırır.

**Tetikleyici Akış:**
```
Kullanıcı ilk giriş → OSINT simülasyonu (coğrafi konum, metadata okuma)
→ Başarı: "Platform Kurdu" adaylığı açılır
→ Mikro-görevler sunulur (AI tarafından dekompoze edilmiş)
→ Her başarılı görev: İtibar + İlk Keşfeden banner
→ 50+ doğrulanmış katkı + %80 doğruluk + 3 peer nomination → Tier 2
```

### 3B. Araştırmacı Gazeteci (Gazeteci Tier)

**Profil:** ICIJ, OCCRP, Teyit.org gibi kuruluşlarda çalışan veya bağımsız muhabir. Aleph ve Datashare kullanmış, Gephi bilir ama kodlama yapmaz.

**UX İlkeleri:**
- **Linkurious basitliği + Aleph derinliği:** Web tabanlı, sürükle-bırak, ama altında güçlü sorgu motoru.
- **P2P paylaşım:** DatashareNetwork modelinde — merkezi sunucu olmadan gazeteciler arası güvenli paylaşım. Şifreli kanallar.
- **Ambargo sistemi:** Yayın tarihi belirle, o tarihe kadar kimse göremez. ICIJ modeli.
- **Kaynak koruma:** Metadata otomatik sıyırma (EXIF, GPS). Anonimleştirme araçları yerleşik.
- **Dead Man Switch:** Gazeteci ölürse/kaybolursa soruşturma otomatik yayınlanır. Shamir'in Gizli Paylaşım Şeması + Sarcophagus smart contract.
- **Doğrulama iş akışı:** Teyit.org 4 aşamalı süreci entegre (İddia tespit → Araştırma → Karar → Yayın).

**Tetikleyici Akış:**
```
Gazeteci başvuru → Portföy inceleme (JTI üyeliği VEYA manuel review)
→ Onay: Tier 3 badge + ağ oluşturma yetkisi
→ Soruşturma başlat → Ekip davet (şifreli kanal)
→ Kanıt topla (drag-drop, OCR, AI sınıflandırma)
→ Ambargo ayarla → Doğrulama süreci → Yayın
→ Dead Man Switch: "Eğer 72 saat giriş yapmazsam → otomatik yayınla"
```

### 3C. Akademisyen (Araştırmacı)

**Profil:** SNA (Sosyal Ağ Analizi) araştırmacısı, networkx/igraph kullanır, R veya Python bilir, FAIR ilkelerine uyum bekler.

**UX İlkeleri:**
- **Tekrarlanabilirlik:** Her analiz adımı kayıtlı, audit trail mevcut. "Bu ağı nasıl oluşturdunuz?" sorusuna yanıt verebilmeli.
- **FAIR veri:** Findable (metadata + DOI), Accessible (açık lisans), Interoperable (GraphML, GexF, JSON-LD), Reusable (provenance).
- **Dışa aktarım:** GraphML, GexF, JSON-LD, CSV, BibTeX/APA/Chicago atıf formatları.
- **Analitik araçlar:** Merkeziyet hesaplamaları (degree, betweenness, closeness, eigenvector), topluluk tespiti (Louvain, Girvan-Newman), zamansal analiz.
- **Cypher/SPARQL:** İleri kullanıcılar için sorgu arayüzü (Neo4j tarzı).
- **Depo entegrasyonu:** Tek tıkla Zenodo, OSF, GitHub'a aktar.

**Tetikleyici Akış:**
```
Akademisyen kayıt → Kurumsal email doğrulama (opsiyonel)
→ Mevcut ağları keşfet → Veri seti indir (GraphML + metadata)
→ Analiz araçları (merkeziyet, topluluk tespiti, temporal)
→ Kendi ağını oluştur / mevcut ağa katkı yap
→ Atıf oluştur → Yayın referansı
```

### 3D. Kurumsal Kullanıcı (Tier 4)

**Profil:** Medya kuruluşu, doğrulama organizasyonu (Teyit.org, Snopes, AFP), sivil toplum, araştırma enstitüsü.

**UX İlkeleri:**
- **OAuth 2.0 entegrasyonu:** Google Workspace / Azure AD ile kurumsal kimlik.
- **RBAC (Role-Based Access Control):** Kurum içi roller (admin, editor, viewer). İzin granülaritesi.
- **Embed/API:** Ağları kendi sitelerine gömme. iframe + API erişimi.
- **ClaimReview çıktısı:** Google'ın indeksleyeceği yapılandırılmış veri otomatik üretimi.
- **Ambargo yönetimi:** Kurum genelinde yayın takvimi.
- **Transparency Center:** Tüm moderasyon kararları, itiraz süreçleri, doğrulama istatistikleri halka açık.
- **SLA:** Uptime garantisi, dedicated destek, özel altyapı (gelecek).

**Tetikleyici Akış:**
```
Kurum başvuru → OAuth entegrasyonu + alan adı doğrulama
→ Onay: Tier 4 badge + tam yetki seti
→ Kurumsal ağ oluştur → Ekip yönetimi (RBAC)
→ Moderasyon kuyruğu (pending evidence review)
→ ClaimReview yayınla → Google indeksle
→ Transparency Center: Kamuya açık moderasyon raporu
```

---

## 4. GELİŞTİRİLMİŞ GÜVEN EKONOMİSİ

### 4A. Dinamik Staking Modeli (Mevcut Sabit Modelin Yerine)

**Sorun:** Mevcut -5/+15/-10 sabit model davranışsal olarak kırılgan.

**Çözüm:**

```
STAKE: Kullanıcı itibarının %1-10'u (kullanıcı seçer)
  → Yüksek stake = yüksek ödül potansiyeli (Taleb asimetrik model)
  → Düşük stake = düşük risk, düşük ödül

ONAY (Approved):
  → Ödül = Stake × Confidence_Multiplier × Tier_Bonus
  → Confidence_Multiplier: Kanıt tipi ağırlığı
    - court_record: 2.0x
    - official_document: 1.8x
    - news_major: 1.5x
    - witness_testimony: 1.2x
    - social_media: 0.8x
    - rumor: 0.5x

RED (Rejected):
  → Kayıp = Stake × Severity_Multiplier
  → Severity: İyi niyetli hata (0.5x) vs. kasıtlı yanlış bilgi (2.0x)
  → Correlation Penalty: Seri başarısızlıklarda üstel artış
    - 1. red: 1.0x
    - 2. ardışık red: 1.5x
    - 3. ardışık red: 2.5x
    - 4+: Geçici askıya alma

YAŞLANMA (Half-Life Decay):
  → İtibar her 60 günde %50 azalır (katkı yoksa)
  → Formül: reputation_effective = reputation_base × (0.5 ^ (days_inactive / 60))
  → Neden: "Jon Skeet sorunu" — birikmiş devasa itibarla hareketsiz ama güçlü hesaplar
```

### 4B. Sybil Direnci

**Önerilen Model: Idena (Proof of Personhood)**

- Eşzamanlı küresel mantık bulmacaları (FLIP testleri)
- Tek bir insan = tek bir hesap, sockpuppet imkansız
- IP/biyometrik/konum verisi gerektirmez → gazeteci güvenliği korunur

**Kaçınılacak Modeller:**
- IP logging → doxxing riski
- Biyometrik → gizlilik kabusu
- BrightID → hala izlenebilir
- Telefon doğrulama → SIM swap saldırısı

### 4C. Katmanlı Moderasyon Mimarisi

```
┌──────────────────────────────────────────────┐
│ KATMAN 1: AI Ön Tarama                       │
│ (Doğruluk yargısı YOK — sadece metadata)     │
│ → Deepfake tespit, metadata tutarsızlık,     │
│   CIB (Coordinated Inauthentic Behavior)     │
│ → Risk Skoru: 0-100                          │
├──────────────────────────────────────────────┤
│ KATMAN 2: Dağıtık Jüri (Platform Kurdu)      │
│ → Rastgele seçim, Schelling Point oylama     │
│ → İtibar stake'li (cilt oyunda)              │
│ → %80+ konsensüs eşiği                      │
│ → Kompartmantalize: Jüri yalnızca kendi      │
│   görevini görür, tam ağı görmez             │
├──────────────────────────────────────────────┤
│ KATMAN 3: Editöryal İnceleme (Gazeteci+)     │
│ → Yüksek riskli vakalar                      │
│ → Gazetecilik standartları (çapraz kontrol)  │
│ → Çoklu kaynak doğrulama                     │
├──────────────────────────────────────────────┤
│ KATMAN 4: İtiraz Mekanizması                  │
│ → Kullanıcı itirazı → Bağımsız panel        │
│ → "Kurumsal" tier incelemesi                 │
│ → Transparency Center'da yayınlanır          │
└──────────────────────────────────────────────┘
```

---

## 5. DOĞRULAMA METODOLOJİSİ VE ENTEGRASYON

### 5A. Kaynak Hiyerarşisi (Snopes Modeli)

```
BİRİNCİL (En Yüksek Güven):
  → Orijinal belgeler, mahkeme kayıtları
  → Görgü tanığı ifadeleri
  → Birincil araştırma verileri
  → Resmi kurum açıklamaları

İKİNCİL (Orta Güven):
  → Birincil kaynaklara atıfta bulunan haberler
  → Akademik kitaplar ve makaleler
  → Uzman analizleri

ÜÇÜNCÜl (Düşük Güven):
  → Wikipedia, ansiklopediler
  → Haber toplayıcıları
  → Sosyal medya paylaşımları
  → Anonim kaynaklar
```

### 5B. ClaimReview/JSON-LD Teknik Entegrasyon

```json
{
  "@context": "https://schema.org",
  "@type": "ClaimReview",
  "claimReviewed": "Jeffrey Epstein visited Location X on Date Y",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": 4,
    "bestRating": 5,
    "worstRating": 1,
    "alternateName": "Mostly True"
  },
  "itemReviewed": {
    "@type": "Claim",
    "author": { "@type": "Organization", "name": "Source" },
    "datePublished": "2024-01-15"
  },
  "author": {
    "@type": "Organization",
    "name": "Project Truth Community",
    "url": "https://projecttruth.org"
  },
  "reviewRating": {
    "ratingExplanation": "Verified by 3 primary sources..."
  }
}
```

**Uygulama:** Her `evidence_archive` kaydı için otomatik ClaimReview JSON-LD üretimi. `/api/evidence/[id]/claimreview` endpoint'i.

### 5C. IFCN 5 Temel İlke Uyumu

1. **Tarafsızlık:** Platform ağ oluşturmaz, topluluk oluşturur. Editoryal karar algoritmik değil, topluluk bazlı.
2. **Standartlar:** Her doğrulama adımı kayıtlı, tekrarlanabilir.
3. **Finansman şeffaflığı:** Kim finanse ediyor, kamuya açık.
4. **Metodoloji şeffaflığı:** Nasıl doğruluyoruz, kamuya açık.
5. **Düzeltme politikası:** Hatalı doğrulamalar düzeltilebilir, düzeltme geçmişi görünür.

---

## 6. VERİTABANI ŞEMA GENİŞLETMELERİ

### 6A. Görsel Ontoloji (links tablosu genişletme)

```sql
ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_type TEXT
  CHECK (evidence_type IN (
    'court_record', 'official_document', 'leaked_document',
    'financial_record', 'witness_testimony', 'news_major',
    'news_minor', 'social_media', 'rumor', 'inference'
  ));

ALTER TABLE links ADD COLUMN IF NOT EXISTS confidence_level NUMERIC(3,2)
  DEFAULT 0.5 CHECK (confidence_level BETWEEN 0 AND 1);
  -- 0.0 = tamamen belirsiz, 1.0 = kesin kanıt

ALTER TABLE links ADD COLUMN IF NOT EXISTS source_hierarchy TEXT
  DEFAULT 'tertiary'
  CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary'));

ALTER TABLE links ADD COLUMN IF NOT EXISTS evidence_weight NUMERIC(5,2)
  DEFAULT 1.0;
  -- Görsel kalınlık çarpanı (0.1 = ince kesikli, 5.0 = kalın solid)
```

### 6B. ClaimReview Desteği (evidence_archive genişletme)

```sql
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_json JSONB;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS claim_review_published BOOLEAN DEFAULT false;
ALTER TABLE evidence_archive ADD COLUMN IF NOT EXISTS ifcn_rating TEXT
  CHECK (ifcn_rating IN (
    'true', 'mostly_true', 'half_true', 'mostly_false',
    'false', 'pants_on_fire', 'missing_context', 'unverifiable'
  ));
```

### 6C. Dead Man Switch (yeni tablo)

```sql
CREATE TABLE IF NOT EXISTS dead_man_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  network_id UUID REFERENCES networks(id),
  investigation_id UUID REFERENCES investigations(id),
  trigger_hours INTEGER NOT NULL DEFAULT 72,
  last_checkin TIMESTAMPTZ DEFAULT now(),
  shares_total INTEGER NOT NULL DEFAULT 5,
  shares_threshold INTEGER NOT NULL DEFAULT 3,
  encrypted_payload TEXT, -- Shamir share (kullanıcının payı)
  trustee_emails TEXT[], -- Paylaşım sahipleri
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6D. Kaynak Provenance (yeni tablo)

```sql
CREATE TABLE IF NOT EXISTS evidence_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL, -- evidence_archive veya community_evidence referansı
  evidence_table TEXT NOT NULL CHECK (evidence_table IN ('evidence_archive', 'community_evidence')),
  source_type TEXT NOT NULL CHECK (source_type IN (
    'court_record', 'official_document', 'leaked_document',
    'financial_record', 'witness_testimony', 'news_major',
    'news_minor', 'social_media', 'academic_paper', 'rumor'
  )),
  source_hierarchy TEXT NOT NULL DEFAULT 'tertiary'
    CHECK (source_hierarchy IN ('primary', 'secondary', 'tertiary')),
  source_url TEXT,
  source_archive_url TEXT, -- Internet Archive snapshot
  source_hash TEXT, -- SHA-256 hash of original document
  verification_chain JSONB, -- Kim doğruladı, ne zaman, hangi yöntemle
  metadata_stripped BOOLEAN DEFAULT false, -- EXIF/GPS temizlendi mi
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. GAZETECİ KORUMA MİMARİSİ

### 7A. Üçlü Caydırıcı Model

```
┌─────────────────────────────────────────────────────┐
│            ÜÇLÜ CAYDIRICI SİSTEM                     │
│                                                       │
│  1. DEAD MAN SWITCH                                   │
│     → Gazeteci X saat giriş yapmazsa                 │
│     → Soruşturma otomatik yayınlanır                 │
│     → Shamir's Secret Sharing (5 parça, 3 eşik)     │
│     → Blockchain timestamp (Sarcophagus)             │
│                                                       │
│  2. CANLI TOPLULUK PARALELİ                          │
│     → Soruşturma başladığında topluluk da bilir      │
│     → Gazeteciye bir şey olursa 1000 göz izliyor    │
│     → Bilgi artık tek bir noktada değil              │
│                                                       │
│  3. TEKRARLANABİLİR METODOLOJİ                      │
│     → Her adım kayıtlı, her kanıt arşivli           │
│     → Gazeteciyi susturmak soruşturmayı durdurmaz   │
│     → Başka bir araştırmacı kaldığı yerden devam     │
│     → Streisand etkisi: baskı = daha fazla ilgi     │
└─────────────────────────────────────────────────────┘
```

### 7B. Teknik Uygulama Yol Haritası

**Faz 1 (Sprint 7):** Basit check-in sistemi. Gazeteci 72 saatte bir "hayattayım" butonu. Timeout → seçili kişilere email uyarı.

**Faz 2 (Sprint 9+):** Shamir's Secret Sharing implementasyonu. Soruşturma şifrelenerek N parçaya bölünür, M parça bir araya gelince açılır.

**Faz 3 (Sprint 12+):** Blockchain timestamp. Sarcophagus smart contract ile otomatik yayınlama. Merkezi sunucu gerektirmez.

---

## 8. TEKNİK STANDARTLAR VE ENTEGRASYONLAR

### 8A. Veri Formatları

| Format | Kullanım | Hedef Kitle |
|--------|----------|-------------|
| JSON-LD | Semantik web, Google indexleme | Kurumsal, SEO |
| GraphML | Ağ dışa aktarım | Akademisyen (Gephi, networkx) |
| GexF | Ağ dışa aktarım | Akademisyen (Gephi) |
| CSV | Düz tablo | Herkes |
| BibTeX | Atıf | Akademisyen |
| ClaimReview | Doğrulama yapılandırılmış verisi | Google, fact-checkers |
| STIX/TAXII | Tehdit istihbaratı paylaşımı | Kurumsal, güvenlik |

### 8B. FAIR Uyumu Kontrol Listesi

- [ ] **Findable:** Her ağın benzersiz URI'si, metadata, aranabilir katalog
- [ ] **Accessible:** Açık API, net lisans (CC-BY-SA önerisi), HTTP erişim
- [ ] **Interoperable:** GraphML + JSON-LD + CSV dışa aktarım, standart ontoloji
- [ ] **Reusable:** Provenance kaydı, metodoloji dokümantasyonu, versiyon geçmişi

### 8C. Hukuki Çerçeve

| Yargı Alanı | Yasa | Etki | Strateji |
|-------------|------|------|----------|
| ABD | Section 230 | Platform sorumsuzluğu | Birincil koruma |
| AB | Digital Services Act | Moderasyon yükümlülüğü | Transparency Center |
| Türkiye | 5651 sayılı kanun | İçerik kaldırma | CDN + yedek domainler |
| Genel | GDPR | Kişisel veri | Gazeteci muafiyeti (Madde 85) |

**Öneri:** Tüzel kişiliği yüksek basın özgürlüğü endeksli ülkede kur (İzlanda, İsviçre, Norveç). IPFS tabanlı sansür direnci. Çoklu domain stratejisi.

---

## 9. UYGULAMA ÖNCELİKLENDİRME

### Sprint 6B — "Profesyonel Katman" (Sonraki Sprint)

**Kapsam:**
1. Görsel ontoloji (link kalınlığı, renk doygunluğu, kanıt tipi ikonu)
2. Kaynak provenance sistemi (evidence_provenance tablosu + UI)
3. ClaimReview JSON-LD çıktısı (/api/evidence/[id]/claimreview)
4. Dinamik staking modeli (sabit modelin yerine)
5. Akademik dışa aktarım (GraphML + metadata)

### Sprint 7 — "Gazeteci Kalkanı"
1. Dead Man Switch v1 (check-in + email uyarı)
2. Şifreli kanal (P2P paylaşım altyapısı)
3. Metadata sıyırma (EXIF/GPS otomatik temizleme)
4. Ambargo sistemi v1

### Sprint 8 — "Çoklu Evren"
1. Çoklu ağ oluşturma UI
2. Cross-network keşif motoru
3. Ağlar arası çapraz referans UI
4. Kurumsal onboarding (OAuth)

### Sprint 9+ — "Merkezi Olmayan Gelecek"
1. Shamir's Secret Sharing implementasyonu
2. IPFS entegrasyonu
3. Idena Proof of Personhood
4. Blockchain timestamp
5. P2P federasyon

---

## 10. METRİKLER VE BAŞARI KRİTERLERİ

### Platform Sağlığı

| Metrik | Hedef | Neden |
|--------|-------|-------|
| Günlük aktif sorgulayıcı | 100+ (6 ay) | Ağ etkisi başlangıcı |
| Kanıt gönderim oranı | Aktif kullanıcıların %20'si | Veri akışı sürdürülebilirliği |
| Doğrulama tamamlanma süresi | <48 saat (ortalama) | Güncellik |
| Yanlış pozitif oranı | <%5 | Güvenilirlik |
| Gazeteci retention | %60+ (3 ay) | Temel kullanıcı bağlılığı |
| ClaimReview indeksleme | Google'da 50+ sonuç (6 ay) | Organik büyüme |

### Güven Ekonomisi Sağlığı

| Metrik | Sağlıklı Aralık | Alarm |
|--------|-----------------|-------|
| Gini katsayısı (itibar dağılımı) | <0.4 | >0.6 = oligarşi |
| Yeni kullanıcı kanıt gönderim oranı | >%30 | <%10 = kayıp kaçınması |
| İtiraz oranı | %5-15 | >%30 = sistem güven kaybı |
| Jüri katılım oranı | >%40 | <%20 = apati |

---

## 11. GELİR MODELİ (Uzun Vade)

**Maltego Modeli Adaptasyonu:**

| Tier | Fiyat | İçerik |
|------|-------|--------|
| **Community** | Ücretsiz | Sorgulama, temel katkı, 1 ağ izleme |
| **Pro** | $29/ay | Sınırsız ağ, gelişmiş analitik, API erişimi, GraphML export |
| **Enterprise** | $199/ay | OAuth, RBAC, embed, SLA, özel destek, ClaimReview otomatik |
| **Newsroom** | Özel | Konsorsiyum lisansı, şifreli kanal, ambargo, DMS |

**İlke:** Community katmanı sonsuza kadar ücretsiz. Para profesyonel araçlardan ve kurumsal özelliklerden gelir. Bilgiye erişim ücretsiz, güçlü araçlar ücretli.

---

## 12. SONUÇ

Bu 6 araştırma dokümanının sentezi net bir sonuç veriyor: Project Truth, teknik olarak güçlü bir 3D görselleştirme motoru üzerine kurulmuş durumda (Sprint 1-6A). Şimdi sıra bu motoru **güvenilir bir bilgi altyapısına** dönüştürmekte.

Öncelik sırası:
1. **Görsel ontoloji** — Epistemolojik belirsizliği göster (hiçbir rakip yapmıyor)
2. **Dinamik staking** — Sabit modelin davranışsal sorunlarını çöz
3. **ClaimReview** — Google indeksleme = ücretsiz büyüme
4. **Kaynak provenance** — Güvenilirliğin teknik temeli
5. **Gazeteci koruma** — En büyük farklılaştırıcı ve toplumsal etki

> *"Zamanla gazeteciden araştırmacıya, doğrulama kuruluşlarından kamu kurumlarına kadar herkes 'Meğer ihtiyacımız olan platform buymuş' diyecektir."*

---

**Son Güncelleme:** 7 Mart 2026
**Yazar:** Claude (Stratejik Analiz) + Raşit Altunç (Vizyon & Araştırma)
**Kaynak Dokümanlar:** 6 araştırma dosyası (araştırmacı gazetecilik, güven mimarisi, doğrulama metodolojisi, güç ağları, OSINT topluluk dinamikleri)
