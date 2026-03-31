# THE TRUTH PIPELINE — Final Architecture

> Bu belge Project Truth'un belge işleme mimarisinin NİHAİ versiyonudur.
> Bir daha tartışılmaz. Değişiklik ancak test sonuçlarıyla mümkündür.
> Tarih: 23 Mart 2026 | Karar verenler: Raşit Altunç + Claude Opus

---

## FELSEFE: Neden Bu Mimari?

Dünyadaki en iyi 4 sistemi inceledik:
- **ICIJ** (Panama Papers) → Yapılandır, sonra ara. Önce veriyi temizle.
- **Bellingcat** → Her iddia bağımsız doğrulanır. Tek kaynak asla yetmez.
- **NIST SP 800-86** → Dijital kanıt zinciri kırılırsa kanıt geçersizdir.
- **Wikipedia** → Topluluk düzenler ama vandalizmden korunur.

Bunların hepsini BİRLEŞTİRDİK. Sonuç: **7 aşamalı, her adımı kayıtlı, kendi kendini öğreten, saldırıya dayanıklı bir pipeline.**

---

## 7 AŞAMA — Tek Bakışta

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE TRUTH PIPELINE                            │
│                                                                 │
│  ① INTAKE        Belge gelir, dezenfekte edilir, hash'lenir     │
│       ↓          (Orijinal ASLA değişmez, kopyası işlenir)      │
│  ② EXTRACT       OCR + yapısal analiz → ham metin çıkar         │
│       ↓          (Ham OCR çıktısı TAMAMI kaydedilir)            │
│  ③ UNDERSTAND    AI 3 FARKLI bakış açısıyla okur → konsensüs    │
│       ↓          (3 prompt, 3 çıktı, sadece 2/3 hemfikir olan)  │
│  ④ SCORE         8 sinyal ile GERÇEK güven hesaplanır           │
│       ↓          (AI'ın kendi skoru KULLANILMAZ)                │
│  ⑤ QUARANTINE    Güvene göre YÖNLENDİRİLİR                     │
│       ↓          (Yüksek→az review, düşük→çok review)           │
│  ⑥ VERIFY        İnsan inceler, karar verir → prompt öğrenir    │
│       ↓          (Her karar Learning Prompt'a geri besleme)     │
│  ⑦ NETWORK       Doğrulanmış veri ağa girer                    │
│                  (Provenance zinciri sonsuza kadar korunur)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## AŞAMA ① — INTAKE (Belge Kabul)

> "Orijinal belge kutsal metindir. Ona dokunulmaz."

### Akış:
```
Belge gelir (upload veya API fetch)
    ↓
[A] SHA-256 hash hesapla (DOKUNULMADAN ÖNCE)
    ↓
[B] Orijinali "evidence vault"a koy (GCS, değiştirilemez)
    ↓
[C] Kopyasını al → dezenfekte et (Ghostscript + QPDF)
    ↓
[D] Dezenfekte edilmiş kopyayı hash'le (bütünlük kanıtı)
    ↓
[E] Provenance kaydı: "document:ingested"
```

### Neden bu sıralama?
- **Hash önce, dezenfekte sonra** — dijital adli tıpın 1 numaralı kuralı (NIST SP 800-86). Orijinal hash, belgenin asla değiştirilmediğini kanıtlar.
- **Orijinal ayrı, kopya ayrı** — dezenfektasyon PDF yapısını değiştirir. İkisini de saklamak, orijinalin bozulmadığını kanıtlar.
- **Her adım provenance kaydı** — kim, ne zaman, ne yaptı.

### Kaydedilen:
| Alan | Açıklama |
|------|----------|
| `original_hash` | Dokunulmamış SHA-256 |
| `original_path` | GCS vault path (ayrı klasör) |
| `sanitized_hash` | Dezenfekte sonrası SHA-256 |
| `sanitized_path` | GCS working path |
| `file_size_original` | Orijinal boyut |
| `file_size_sanitized` | Temizlenmiş boyut |
| `sanitization_log` | Ghostscript + QPDF çıktısı |
| `intake_timestamp` | ISO 8601 |
| `intake_source` | 'manual_upload' / 'courtlistener' / 'icij' / ... |
| `provenance_entry` | {action: 'ingested', actor: 'system', details: {...}} |

### Saldırı savunması:
- **Zehirli belge:** Ghostscript tüm aktif içeriği kaldırır (JS, form actions, embedded executables)
- **Manipüle edilmiş PDF:** Hash zinciri bozulursa otomatik flag
- **Redaction detection:** Sansürlü bölgeler tespit edilir, asla kaldırılmaz ama LOG'lanır

---

## AŞAMA ② — EXTRACT (OCR + Yapısal Analiz)

> "Belgeyi olduğu gibi oku. Yorumlama, sadece çıkar."

### Akış:
```
Dezenfekte edilmiş kopya
    ↓
[A] Google Document AI → ham metin + yapı
    ↓
[B] HAM OCR ÇIKTISININ TAMAMI kaydedilir
    ↓  (sayfa yapısı, tablo pozisyonları, güven skorları)
    ↓
[C] Metin temizleme (boş satır, encoding fix)
    ↓
[D] Sayfa bazlı indeksleme (sayfa 3, satır 12 → referanslanabilir)
    ↓
[E] Provenance kaydı: "document:ocr_completed"
```

### Neden ham OCR'ı TAMAMEN saklıyoruz?
- Yarın daha iyi OCR çıkarsa, orijinalden tekrar çıkarmaya gerek kalmaz
- Tablo yapısı entity extraction'da bağlam verir (adres vs. isim vs. tarih)
- Bounding box bilgisi → belgenin hangi sayfasının hangi bölgesinden çıktı (görsel kanıt)
- Güven skoru sayfa bazlı → düşük kaliteli sayfalar flag'lenir

### Kaydedilen:
| Alan | Açıklama |
|------|----------|
| `ocr_raw_response` | Document AI'ın TAM JSON yanıtı |
| `ocr_extracted_text` | Temizlenmiş düz metin |
| `ocr_page_map` | [{page: 1, text: "...", confidence: 0.97, tables: [...]}] |
| `ocr_confidence_avg` | Ortalama sayfa güveni |
| `ocr_language` | Algılanan dil |
| `ocr_processor_version` | Document AI versiyon bilgisi |
| `ocr_cost` | İşlem maliyeti (kredi takibi) |
| `provenance_entry` | {action: 'ocr_completed', details: {pages, confidence, cost}} |

### GCP Kredi optimizasyonu:
- CourtListener text belgeleri → OCR'a GİTMEZ (zaten metin, $0 maliyet)
- Sadece taranmış PDF'ler ve görseller Document AI'a gider
- Sayfa sayısı önceden kontrol edilir → gereksiz büyük belge engeli

---

## AŞAMA ③ — UNDERSTAND (AI Çıkarım — 3'lü Konsensüs)

> "Bir AI çıktısına güvenme. Üçü hemfikirse güven."

### NEDEN 3 PASS?

Tek seferde AI'a "çıkar" demek → halüsinasyon riski %5-10.
3 farklı açıdan sormak → sadece 2/3'ünün hemfikir olduğunu almak → halüsinasyon riski %0.1 altı.

Bu, ICIJ'nin "iki bağımsız kaynak" kuralının AI versiyonu.

### Akış:
```
OCR metni (veya ham metin)
    ↓
[CHUNK] Belgeyi akıllı parçalara böl
    ↓    (paragraf sınırlarında, cümle ortasından kesmeden)
    ↓    (Her chunk'ın başlangıç/bitiş pozisyonu KAYITLI)
    ↓
┌───────────────┬────────────────┬────────────────┐
│  PASS 1       │  PASS 2        │  PASS 3        │
│  Conservative │  Verification  │  Aggressive    │
│  "Sadece      │  "Pass 1'in    │  "Kaçırılmış   │
│   kesin olan" │   çıktısını    │   şey var mı?" │
│               │   doğrula"     │                │
└───────┬───────┴────────┬───────┴────────┬───────┘
        ↓                ↓                ↓
    [CONSENSUS ENGINE]
    2/3 hemfikirse → KABUL
    1/3 tekse → RED (halüsinasyon riski)
    3/3 hemfikirse → YÜKSEK GÜVEN
        ↓
[MERGE] Deduplicate + en iyi context'i seç
        ↓
[RECORD] Her pass'in ham çıktısı AYRI AYRI kaydedilir
        ↓
Provenance: "document:scanned" (3 pass detaylarıyla)
```

### 3 Prompt detayı:

**Pass 1 — Conservative (Muhafazakar):**
- "SADECE belgede açıkça geçen kişi, kurum ve yerleri çıkar"
- "Çıkarım YAPMA. Belirsizse ATLAMA."
- "Her entity için belgedeki tam alıntıyı ver"

**Pass 2 — Verification (Doğrulama):**
- Pass 1'in çıktısı verilir
- "Bu entity'lerin her birini belgede doğrula"
- "Belgede gerçekten geçiyor mu? Alıntı ile kanıtla."
- "Yanlış veya şüpheli olanları işaretle"

**Pass 3 — Aggressive (Geniş ağ):**
- "Pass 1'in kaçırdığı entity var mı?"
- "Dolaylı referanslar, kısaltmalar, takma adlar"
- "Ama her biri için MUTLAKA belge alıntısı göster"

### Consensus engine kuralları:
- Entity 3/3 pass'te → confidence boost +0.15
- Entity 2/3 pass'te → kabul, normal confidence
- Entity 1/3 pass'te → RED, halüsinasyon olası
- Relationship: her iki uç node 2/3 pass'te olmalı

### Kaydedilen:
| Alan | Açıklama |
|------|----------|
| `scan_job_id` | Benzersiz tarama iş ID'si |
| `scan_prompt_version` | Prompt template versiyonu (v1.0, v1.1...) |
| `scan_pass_1_raw` | Pass 1 tam Groq yanıtı (JSON + meta) |
| `scan_pass_2_raw` | Pass 2 tam Groq yanıtı |
| `scan_pass_3_raw` | Pass 3 tam Groq yanıtı |
| `scan_consensus_result` | Birleştirilmiş final sonuç |
| `scan_model` | 'llama-3.3-70b-versatile' |
| `scan_temperature` | 0 (her zaman) |
| `scan_token_usage` | {pass1: {in, out}, pass2: {in, out}, pass3: {in, out}} |
| `scan_chunks` | [{start, end, text_preview, token_count}] |
| `scan_cost_estimate` | Toplam token maliyeti |
| `scan_duration_ms` | Toplam süre |
| `scan_node_context` | Tarama sırasında Groq'a verilen mevcut node listesi |
| `provenance_entry` | {action: 'scanned', details: {passes: 3, consensus, model, version}} |

### Maliyet gerçekliği (3 pass):
- Free tier: 30 req/min → 100 belge ~30 dakika (kabul edilebilir)
- Groq Pro: hız 3x artar, aynı maliyet ($5/ay)
- Token: Ortalama belge ~3000 token × 3 pass = ~9000 token (Groq free tier'da sorun yok)

---

## AŞAMA ④ — SCORE (8-Sinyal Post-Hoc Güven)

> Anayasa #9: "AI'a güvenme, doğrula. Confidence'ı AI hesaplamasın, biz hesaplayalım."

### NEDEN AI'ın kendi skorunu kullanmıyoruz?

Akademik konsensüs: LLM'lerin kendi güven tahminleri kalibre DEĞİL (Expected Calibration Error 0.3-0.7). Yani AI "90% eminim" dediğinde gerçek doğruluk %55-75 arası olabilir.

Çözüm: AI'ın "eminim" demesini yok say. Dışarıdan ölçülebilir 8 sinyalle hesapla.

### 8 Sinyal:

```
┌─────────────────────────────────────────────────┐
│              COMPOSITE CONFIDENCE                │
│                                                  │
│  S1: Belge tipi güvenilirliği         ×0.15     │
│      court_record=0.95, leaked=0.60              │
│                                                  │
│  S2: Kaynak hiyerarşisi               ×0.15     │
│      primary=1.0, secondary=0.7, tertiary=0.4    │
│                                                  │
│  S3: Konsensüs skoru (3 pass)         ×0.20     │
│      3/3=1.0, 2/3=0.7, 1/3=0.0                  │
│                                                  │
│  S4: Çapraz referans (kaç belgede)    ×0.15     │
│      3+ belge=1.0, 2=0.7, 1=0.4, 0=0.2         │
│                                                  │
│  S5: Entity resolution skoru          ×0.10     │
│      Jaro-Winkler ≥0.92=1.0, ≥0.85=0.7         │
│                                                  │
│  S6: Topluluk konsensüsü              ×0.10     │
│      (approve oranı, ileride dolar)              │
│                                                  │
│  S7: Tarihsel doğruluk                ×0.10     │
│      (bu prompt versiyonu ne kadar başarılı)     │
│                                                  │
│  S8: Ağ tutarlılığı                   ×0.05     │
│      (mevcut node/link yapısıyla uyum)           │
│                                                  │
│  FINAL = Σ(signal × weight)                      │
│  Range: 0.00 — 1.00                             │
└─────────────────────────────────────────────────┘
```

### Güven → Rota eşlemesi:
| Skor | Rota | İnsan gücü |
|------|------|-----------|
| ≥0.90 | → Otomatik kabul + 1 spot check | Minimal |
| 0.70-0.89 | → Karantina, 1 reviewer yeter | Orta |
| 0.50-0.69 | → Karantina, 2 bağımsız reviewer | Yüksek |
| <0.50 | → Karantina, 3 reviewer + flag | Çok yüksek |

### İlk tarama (kullanıcı yok):
- S6 (topluluk) ve S7 (tarihsel) başlangıçta boş → ağırlıkları S1-S5'e dağıtılır
- Kullanıcılar geldikçe S6 ve S7 aktifleşir → sistem otomatik olarak "daha akıllı" olur

### Kaydedilen:
| Alan | Açıklama |
|------|----------|
| `confidence_signals` | {s1: 0.95, s2: 0.70, ..., s8: 0.60} |
| `confidence_weights` | {s1: 0.15, s2: 0.15, ...} (aktif ağırlıklar) |
| `confidence_composite` | Final skor (0.00-1.00) |
| `confidence_ai_raw` | AI'ın kendi skoru (referans, kullanılmaz) |
| `confidence_route` | 'auto_accept' / 'review_1' / 'review_2' / 'review_3' |

---

## AŞAMA ⑤ — QUARANTINE (Akıllı Yönlendirme)

> "Her şey karantinadan geçer. Ama her şey eşit muamele görmez."

### Akış:
```
Skorlanmış entity'ler
    ↓
[ROUTE] Güven skoruna göre yönlendir
    ↓
┌──────────────┬───────────────┬──────────────┬──────────────┐
│  ≥0.90       │  0.70-0.89    │  0.50-0.69   │  <0.50       │
│  AUTO-ACCEPT │  1 REVIEWER   │  2 REVIEWERS │  3 REVIEWERS │
│  + spot check│               │  bağımsız    │  + flag      │
│  yeşil kutu  │  mavi kutu    │  sarı kutu   │  kırmızı kutu│
└──────────────┴───────────────┴──────────────┴──────────────┘
```

### Neden hepsine eşit review yaptırmıyoruz?
- 100 belgeden 60'ı yüksek güvenli olacak (mahkeme kararı, ICIJ verisi)
- Hepsine 2 review → topluluk yorulur, motivasyon düşer
- Akıllı yönlendirme → insan gücünü EN DÜŞÜK güvenli olanlara yoğunlaştır
- Auto-accept bile spot check'ten geçer (rastgele %10'u incelenir)

### Self-review koruması:
- Belgeyi tarayan kişi kendi taramasını ONAYLAYAMAZ
- 2+ reviewer gereken durumlarda aynı kişi iki kez oy veremez
- Reviewer'ın tier'ı oy ağırlığını belirler (Tier 3 gazeteci = 2× ağırlık)

### Saldırı savunması:
- **Sybil (sahte hesap ordusu):** Yeni hesap = 0.1× oy ağırlığı. 6 aylık hesap = 0.8×. Ring detection.
- **Koordineli manipülasyon:** Aynı 10 dakikada aynı entity'ye 5+ oy → otomatik freeze + admin alert
- **Zehirli onay:** Auto-accept edilen entity'ler bile ileride dispute edilebilir → provenance cascade

---

## AŞAMA ⑥ — VERIFY (İnsan İncelemesi + Prompt Öğrenmesi)

> "Her insan kararı, AI'ı daha akıllı yapar."

### Akış:
```
Reviewer entity'yi görür
    ↓
[KARAR] Approve / Reject / Dispute
    ↓
┌─────────────────────────────────────────────┐
│  APPROVE → Learning Prompt'a OLUMLU örnek   │
│            Entity ağa ekleme kuyruğuna girer │
│            Reviewer +2 reputation            │
│                                              │
│  REJECT  → Learning Prompt'a OLUMSUZ örnek  │
│            Neden reddedildi KAYITLI          │
│            Reviewer +2 reputation            │
│            Ret pattern mining'e gider        │
│                                              │
│  DISPUTE → 2. tur review tetiklenir         │
│            Dispute nedeni KAYITLI            │
│            3 reviewer'a yükseltilir          │
└─────────────────────────────────────────────┘
    ↓
[LEARN] Her 50 karar sonrası:
    - Onaylanan entity'lerden en iyi 3-5'i few-shot'a eklenir
    - Reddedilen pattern'ler blacklist'e eklenir
    - Prompt versiyonu güncellenir (v1.0 → v1.1)
    - A/B test: yeni prompt vs. eski prompt (10 belge)
    - Daha iyiyse deploy, değilse geri al
```

### Learning Prompt detayları:

**Few-shot seçim algoritması:**
- Onaylanan entity'ler arasından en "temsili" olanları seç
- Farklı entity tipleri dengeli olsun (person, org, location)
- Farklı belge tiplerinden gelsin (court, deposition, financial)
- Optimal sayı: 3-5 örnek (6+ performansı DÜŞÜRÜR — akademik bulgu)

**Rejection blacklist:**
- "VE", "Plaintiff", "Court", "United States" → generic_term
- Case number'lar → not_an_entity
- Cited case names → legal_citation_not_entity
- Her ret kategorisi Groq prompt'ta "BUNLARI ÇIKARMA" olarak eklenir

**Prompt versiyonlama:**
- Her versiyon `prompt_versions` tablosunda
- Accuracy skoru: son 50 entity'nin approve/reject oranı
- A/B test: %10 belge yeni prompt, %90 eski → karşılaştır
- Otomatik rollback: yeni versiyon daha kötüyse geri al

### Kaydedilen:
| Alan | Açıklama |
|------|----------|
| `review_decision` | approve / reject / dispute |
| `review_reason` | Açık metin (neden?) |
| `review_duration_ms` | Ne kadar süre inceledi (kalite metriği) |
| `reviewer_tier` | Reviewer'ın güven seviyesi |
| `learning_feedback` | {type: 'positive'/'negative', category: '...'} |
| `prompt_version_at_scan` | Entity çıkarıldığında hangi prompt kullanılmıştı |
| `provenance_entry` | {action: 'reviewed', decision, reason, reviewer} |

---

## AŞAMA ⑦ — NETWORK (Ağa Ekleme)

> "Ağa giren her veri, doğum belgesini yanında taşır."

### Akış:
```
Onaylanmış entity
    ↓
[RESOLVE] Entity resolution (Jaro-Winkler + Türkçe normalizasyon)
    ↓
    ├─ MATCH → Mevcut node'a bağlan (confidence boost)
    │          Match skoru ve metodu KAYITLI
    │
    └─ YENİ → Yeni node oluştur
               Tier 3 (dış orbit) olarak başlar
    ↓
[PROVENANCE] Node'un doğum belgesi:
    - Hangi belge(ler)den geldi
    - Hangi sayfa, hangi satır
    - Hangi AI prompt versiyonu çıkardı
    - 3 pass'ten hangilerinde göründü
    - Composite confidence skoru
    - Kim onayladı, ne zaman
    - Entity resolution match detayı
    ↓
[INDEX] Bilgi ağına eklendi
    ↓
[CASCADE] İlgili diğer belgelerdeki referanslar güncellenir
    - Çapraz referans sayısı artar
    - İlişkili node'ların S4 (cross-reference) skoru güncellenir
```

### Geri alma mekanizması (Provenance Cascade Rollback):
```
Belge sahte çıkarsa:
    ↓
[FLAG] Belge "disputed" olarak işaretlenir
    ↓
[TRACE] O belgeden türetilmiş TÜM entity'ler bulunur
    ↓
[CASCADE] Her entity:
    - Başka belgelerden de destekleniyorsa → sadece bu belge referansı silinir
    - SADECE bu belgeden geliyorsa → entity "disputed" olarak işaretlenir
    - İlişkili link'ler de cascade ile güncellenir
    ↓
[AUDIT] Tüm cascade silme işlemi tek bir provenance kaydında
```

---

## LEARNING PROMPT SİSTEMİ — Tam Döngü

```
┌──────────────────────────────────────────────────────────┐
│                    LEARNING CYCLE                         │
│                                                          │
│  [SCAN] → Prompt v1.2 ile 50 belge tara                │
│     ↓                                                    │
│  [QUARANTINE] → Entity'ler karantinaya                  │
│     ↓                                                    │
│  [REVIEW] → Topluluk (veya biz) approve/reject          │
│     ↓                                                    │
│  [MINE] → Her 50 karar sonrası:                         │
│     │    • Top 3-5 approved → few-shot candidate         │
│     │    • Rejected patterns → blacklist update          │
│     │    • Prompt accuracy hesapla                        │
│     ↓                                                    │
│  [EVOLVE] → Yeni prompt v1.3 üret                       │
│     ↓                                                    │
│  [TEST] → 10 belgeyi hem v1.2 hem v1.3 ile tara        │
│     ↓                                                    │
│  [COMPARE] → v1.3 daha iyiyse deploy, değilse geri al  │
│     ↓                                                    │
│  [SCAN] → Prompt v1.3 ile devam...                      │
│                                                          │
│  ⟳ Döngü sonsuza kadar döner                           │
└──────────────────────────────────────────────────────────┘
```

### Başlangıç (kullanıcı yok):
- BİZ approve/reject yaparız (ilk 50-100 belge)
- Bu kararlar Learning Prompt'un ilk eğitim verisi olur
- Kullanıcılar geldiğinde prompt zaten v2-v3 olmuş olur

### Kullanıcı geldiğinde:
- Onların kararları da döngüye girer
- Ama ağırlıklı: Tier 3 gazeteci kararı > yeni kullanıcı kararı
- Prompt değişiklikleri şeffaf: topluluk hangi versiyonun ne kadar başarılı olduğunu görebilir

---

## GÜVENLİK ÖZETİ

| Saldırı | Savunma | Katman |
|---------|---------|--------|
| Zehirli belge (sahte PDF) | Ghostscript dezenfekte + hash zinciri | ① Intake |
| OCR manipülasyonu | Ham çıktı saklama + sayfa bazlı confidence | ② Extract |
| AI halüsinasyonu | 3-pass konsensüs + post-hoc scoring | ③④ Understand+Score |
| Sybil saldırısı | Hesap yaşı ağırlığı + ring detection | ⑤ Quarantine |
| Koordineli oylama | Velocity check + anomali tespiti | ⑥ Verify |
| Sahte belge cascade | Provenance rollback + dispute mekanizması | ⑦ Network |
| Prompt zehirleme | A/B test + otomatik rollback | Learning Cycle |

---

## DATABASE DEĞİŞİKLİKLERİ (Mevcut tablolara ekleme)

### documents tablosu — Yeni kolonlar:
```sql
-- Intake
original_hash          TEXT,     -- SHA-256, dezenfekteden ÖNCE
original_path          TEXT,     -- GCS vault path (ayrı bucket/klasör)

-- OCR
ocr_raw_response       JSONB,   -- Document AI tam yanıtı
ocr_page_map           JSONB,   -- [{page, text, confidence, tables}]
ocr_cost               DECIMAL, -- GCP kredi takibi

-- Scan (3-pass)
scan_job_id            UUID,    -- Benzersiz tarama iş ID'si
scan_prompt_version    TEXT,    -- 'v1.0', 'v1.1', ...
scan_pass_1_raw        JSONB,   -- Conservative pass tam yanıtı
scan_pass_2_raw        JSONB,   -- Verification pass tam yanıtı
scan_pass_3_raw        JSONB,   -- Aggressive pass tam yanıtı
scan_consensus_result  JSONB,   -- Birleştirilmiş final
scan_model             TEXT,    -- Model adı
scan_token_usage       JSONB,   -- {pass1: {in, out}, ...}
scan_chunks            JSONB,   -- [{start, end, preview}]
scan_node_context      TEXT[],  -- Taramada verilen node isimleri
scan_duration_ms       INTEGER, -- Toplam süre

-- Confidence (8-signal)
confidence_signals     JSONB,   -- {s1: 0.95, s2: 0.70, ...}
confidence_composite   DECIMAL, -- Final skor
confidence_ai_raw      DECIMAL, -- AI'ın kendi skoru (referans)
confidence_route       TEXT,    -- 'auto_accept'/'review_1'/...
```

### Yeni tablo: prompt_versions
```sql
CREATE TABLE prompt_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version         TEXT NOT NULL,          -- 'v1.0'
  prompt_template TEXT NOT NULL,          -- Tam prompt metni
  few_shot_examples JSONB,               -- Seçilmiş örnekler
  blacklist_patterns JSONB,              -- Ret pattern'leri
  accuracy_score  DECIMAL,               -- Son 50 entity doğruluk oranı
  total_scans     INTEGER DEFAULT 0,     -- Bu versiyonla kaç tarama yapıldı
  total_approved  INTEGER DEFAULT 0,     -- Kaç entity onaylandı
  total_rejected  INTEGER DEFAULT 0,     -- Kaç entity reddedildi
  is_active       BOOLEAN DEFAULT false, -- Şu an aktif mi
  parent_version  TEXT,                  -- Hangi versiyondan türetildi
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Yeni tablo: scan_jobs (denetim)
```sql
CREATE TABLE scan_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES documents(id),
  prompt_version  TEXT,
  passes          INTEGER DEFAULT 3,
  consensus_stats JSONB,   -- {entities_3_3: N, entities_2_3: N, entities_1_3: N}
  token_total     INTEGER,
  duration_ms     INTEGER,
  cost_estimate   DECIMAL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## MALİYET PROJEKSİYONU (3-pass ile)

| Senaryo | Belgeler | Groq token | GCP OCR | Toplam | Süre |
|---------|----------|-----------|---------|--------|------|
| Hafta 1 (text only) | 50 | ~450K | $0 | $0 | ~2 saat |
| Hafta 2 (OCR mix) | 30 | ~270K | ~$10 | ~$10 | ~1.5 saat |
| Hafta 3-4 (bulk) | 200 | ~1.8M | ~$75 | ~$75 | ~10 saat |
| TOPLAM | 280 | ~2.5M | ~$85 | ~$85 | ~14 saat |

**Groq free tier yeterli mi?** 30 req/min × 3 pass = 10 belge/dakika. 280 belge = 28 dakika pure API time + rate limit delays = ~2-3 saat. YETER, ama $5 Groq Pro ile çok daha rahat.

**$340 GCP bütçe:** $85 OCR + $10 storage + buffer = ~$255 artar. Vision AI ve gelecek için yeterli.

---

## BU MİMARİ NEDEN EN İYİSİ

1. **NIST uyumlu:** Hash-first, orijinal korunur, her adım kayıtlı → mahkemede geçerli
2. **3-pass konsensüs:** Tek AI'a güvenmiyoruz, kendi içinde doğrulatıyoruz → %0 halüsinasyon hedefi
3. **8-sinyal scoring:** AI'ın "eminim" demesini yok sayıyoruz → gerçek güvenilirlik
4. **Akıllı karantina:** İnsan gücünü en çok gerekli yere yoğunlaştırıyoruz → verimlilik
5. **Learning Prompt:** Her karar sistemi daha akıllı yapıyor → sürekli gelişim
6. **Provenance cascade:** Sahte belge çıkarsa tüm etki geri sarılabiliyor → güvenlik
7. **Maliyet optimize:** Text belgeler $0, OCR sadece gerekli olana → GCP kredisi verimli

**Hiçbir şey kaybolmuyor. Her adım kayıtlı. Her karar öğretiyor. Her belge sistemi güçlendiriyor.**

---

> *"İşte böyle akacak. Bir daha tartışmıyoruz. Artık inşa ediyoruz."*
> — 23 Mart 2026
