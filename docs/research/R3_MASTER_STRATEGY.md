# R3 CEPHANE - Master Strategy Document
## Project Truth: Belge Taraması ve Ağ Zenginleştirme Haritası

**Hazırlayan:** Claude (Araştırma Sentezi)
**Tarih:** 10 Mart 2026
**Durum:** Operasyonel Strateji — 6 haftalık yol haritası

**Özet:** Bu dokument, 4 araştırma raporunun sentezinden oluşan, Epstein mahkeme belgelerini CourtListener'dan çekerek Project Truth ağını 15 düğümden 100+ düğüme çıkaran operasyonel savaş planıdır.

---

## YÖNETİCİ ÖZETİ

### Durum Raporu
- **Mevcut ağ:** 15 düğüm, 19 bağlantı, manuel veri
- **Hedef ağ:** 100+ düğüm, 300+ bağlantı, kanıt tarafından desteklenen
- **Zaman çerçevesi:** 6 hafta (Mart 2026 — Nisan 2026)
- **Bütçe:** $340 GCP kredisi (Document AI OCR + Vision + Storage)

### Kritik Başarı Faktörleri
| Metrik | Hedef | Yöntemi |
|--------|-------|--------|
| **Varlık Çıkarım Doğruluğu** | %88+ | Multi-layer validation + Groq consensus |
| **Hallucination Oranı** | <%5 | Quarantine + peer review (Sprint 17) |
| **Belge Tarama Kapsamı** | 500+ mahkeme belgesi | CourtListener API + GCS storage |
| **Network Reproducibility** | 85%+ | Aynı belgeler → aynı çekirdek ağ |
| **GCP Credit Burn** | <$300 | OCR cost optimization (tablo algılama) |

### Teknik Mimarı (High-Level)

```
┌─────────────────────────────────────────────────────────┐
│                  ÇIKARIM MOTORU (R3 Cephane)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  KATMAN 1: BELGE BESLEME                              │
│  ├─ CourtListener API (mahkeme kararları)             │
│  ├─ GCS Storage (private bucket)                       │
│  └─ Document AI OCR (sayfa → metin, tablo, form)      │
│                                                         │
│  KATMAN 2: VARLIK ÇIKARIMI                            │
│  ├─ Groq llama-3.3-70b (temperature=0.1)             │
│  ├─ Structured JSON output (token-level constraint)   │
│  ├─ CoT + Explicit Evidence (her varlık belgede mi?)  │
│  └─ Confidence Scoring (log probability + semantic)   │
│                                                         │
│  KATMAN 3: AI KONSENSÜS                               │
│  ├─ 3 bağımsız Groq çıkarımı                         │
│  ├─ Kesişim alma (union > intersection)               │
│  └─ Çok-oy mekanizması (2/3 consensus)                │
│                                                         │
│  KATMAN 4: ENTITY RESOLUTION                          │
│  ├─ Blocking (faster pre-filtering)                   │
│  ├─ Syntactic (Levenshtein, Jaro-Winkler)            │
│  ├─ Semantic (embeddings, danışman entity matching)   │
│  └─ Graph-based (ağ yapısından bağlantı çıkarımı)     │
│                                                         │
│  KATMAN 5: KARANTINA + DOĞRULAMA                      │
│  ├─ Yapısal veri → pending_review (1 onay yeter)      │
│  ├─ AI çıkarımı → quarantined (2 bağımsız onay)      │
│  ├─ Peer review queue (Tier 2+)                       │
│  └─ Ağa ekleme (verified_organizations check)         │
│                                                         │
│  KATMAN 6: ÇAPRAZ REFERANS                            │
│  ├─ ICIJ offshore leaks eşleştirmesi                  │
│  ├─ Flight logs (uçuş kayıtları)                      │
│  └─ Financial flows (para akışı bağlantıları)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## BÖLÜM 1: MEVCUT DURUM ANALİZİ

### Sprint 16-17 Altyapısı (Hazır Durum)
✅ **Şu anda çalışan:**
- TARA protokolü (Sprint 16) — belgelerden otomatik AI çıkarımı
- Sıfır Hallüsinasyon Katmanı (Sprint 17) — karantina + doğrulama
- GCS Storage — private bucket (truth-evidence-files)
- Document AI — OCR processor (US region, fe5ed1ca4db790da)
- Vision AI — görsel analiz yetenekleri

✅ **Database tabloları hazır:**
- `documents` — belge deposu
- `data_quarantine` — AI çıkarımları karantina
- `quarantine_reviews` — peer review mekanizması
- `document_derived_items` — AI önerileri
- `data_provenance` — denetim izi

### Mevcut Ağ Analizi
**Durum:** 15 düğüm (Epstein ağı skeleton), 19 bağlantı
**Sorun:**
- Manuel veri (doğru ama eksik)
- Hiçbir mahkeme belgesi desteği yok
- Aynı-düğüm tanıyabilirlik zayıf (isim varyasyonları)
- Finansal akış bağlantıları yok

**Çözüm:** Belge tabanlı otomatik ağ zenginleştirmesi

### GCP Bütçe Durumu
- **Toplam:** $340
- **Tahmin harcaması (worst-case):**
  - Document AI OCR: 500 belge × 50 sayfa × $0.15 = $3,750 ❌ YÜKSEKSEKİ
  - Optimizasyon gerekli (tablo detekt → selective OCR)
- **Yeni bütçe stratejisi:** Aşağıya bakınız

---

## BÖLÜM 2: STRATEJİK HEDEFİ

### Nihai Vizyon
> "Epstein dosyasının **kanıt tarafından desteklenen 3D soruşturma ağı.** Her düğüm mahkeme belgesi, her bağlantı ısıl enerjiye sahip (güven, kanıt sayısı, tarih, tip)."

### Nicel Hedefler

| Hedef | T1 (3 hafta) | T2 (6 hafta) | Yöntemi |
|--------|------------|------------|---------|
| **Düğüm Sayısı** | 50 | 100+ | Belge taraması + ICIJ |
| **Bağlantı Sayısı** | 150 | 300+ | İlişki çıkarımı + cross-doc |
| **Kanıt Desteği** | 70% | 95%+ | Her link ≥1 kanıt |
| **Hallucination** | <%8 | <%3 | Quarantine + consensus |
| **Doğrulama Oranı** | 60% | 85%+ | Peer review velocity |

### Nitesel Hedefler
- **Reproducibility:** Aynı belge seti → aynı ağ kerigimi (%85+)
- **Şeffaflık:** Her düğüm/bağlantı için "kanıt zinciri" görünür
- **Şirket Tanınırlığı:** "Southern Trust" vs "S.T.C." vs "Southern Trust Co." = 1 düğüm
- **Seçicilik:** Sahte bağlantı oranı < %5

---

## BÖLÜM 3: ÜÇ DALGA STRATEJİSİ

### DALGA 1: İskelet Kurma (Hafta 1-2)
**Hedef:** 30-40 çekirdek Epstein ağı kişisi, manuel doğrulanmış

**Kaynaklar:**
- Wikipedia Epstein maddesinden kişi listesi (verified)
- Açık mahkeme belgeleri (RECAP archive)
- Gazeteci araştırmaları (ProPublica, New York Times)

**İş:**
1. 30 anahtar kişiyi belirle (Epstein, Maxwell, Dershowitz, Weinstein, Prince Andrew, vb.)
2. Her kişi için başlangıç CSV oluştur (isim, ülke, doğum tarihi, tipi)
3. nodes tablosuna manuel insert
4. Git commit: "Wave 1: Core Epstein network skeleton"

**Çıktı:** `core_epstein_network.csv` (30 kişi, temel özellikler)

**Neden manual?**
- Kalite garantisi (çekirdek ağ hatasız olmalı)
- Çabuk (otomatik pipelining 3 hafta sürer)
- Sonrası dalga 2/3'ü bu iskeletin üzerine yapıştırırız

### DALGA 2: Belge Taraması (Hafta 2-4)
**Hedef:** CourtListener'dan 500+ mahkeme belgesi, OCR + AI çıkarımı

**Altyapı:**
1. CourtListener API (rate limit: 5000/saat)
2. Document AI OCR → metin/tablo çıkarımı
3. Groq llama-3.3-70b → entity + relationship extraction
4. Quarantine → peer review → verified_organizations check → ağa ekleme

**4-Katmanlı Çıkarım Motoru:**

#### Katman A: Belgeler API'den
```bash
CourtListener.search(
  q="Epstein",
  court="all",
  filed_after="1990-01-01",
  filed_before="2030-12-31"
) → 500+ belge
```

**Optimizasyon:** Duplikasyon tespit et (aynı belge farklı mahkemeler), score'a göre sor (şiddet = relevance)

#### Katman B: OCR via Document AI
```typescript
// documentAI.ts processWithDocumentAI()
// Sayfa → Metin + Tablo + Form alanları
// Seçici OCR: Tamamını yapmak pahalı

// OPTIMIZASYON STRATEJISI:
if (page.hasTable()) {
  // Tablo sayfası → full OCR ($0.15)
} else if (page.hasForm()) {
  // Form sayfası → full OCR ($0.15)
} else {
  // Metin sayfası → lightweight detection ($0.05)
  // Sadece ilgili kelimeler çıkar
}

// Bütçe: 500 belge × 10 sayfa avg × 0.08 mixed-rate = $400
// Overbudget! → Sınırla: 250 belge × 10 sayfa × 0.08 = $200 ✓
```

#### Katman C: Entity + Relationship Extraction

**Prompt yapısı (CoT + Explicit Evidence):**

```
GÖREV: Hukuki belgelerden varlık ve ilişki çıkar

BELGEDE KIŞILER: [belgeden geçen tüm kişi isimlerini çıkar]
- [İsim]: "[tam metin belgede]" (sayfa: N, satır: M)

BELGEDE KURULUŞLAR:
- [Ad]: "[tam metin belgede]"

İLİŞKİLER: Her bağlantı için belirtilmelidir:
- KIM: [Kaynak varlık]
- NE: [directorship | ownership | payment | family_relation | etc.]
- KİME: [Hedef varlık]
- KANIT: "[belgede tam cümle]"

ÇEKİŞME: Aynı kişi/kurum farklı adlarla geçiyorsa belirt

ÇIKTI: JSON
```

**Groq Ayarları:**
```typescript
const groqResponse = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,  // Legal = deterministic
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "legal_extraction",
      schema: {
        // Structured output schema
      }
    }
  },
  messages: [...]
});
```

**Maliyet:** 500 belge × avg 2KB metin × tokenization = ~500K token
- Groq: $0.05 per 1M = **$0.025** (!!çok ucuz)

#### Katman D: Consensus + Confidence

**Groq Consensus Mekanizması:**
```
Aynı belge 3 farklı temperature'da çalışma:
- Run 1: temperature=0.1 (deterministik)
- Run 2: temperature=0.2 (biraz varyans)
- Run 3: temperature=0.3 (daha varyans)

Kesişim alma (intersection):
- Entity eğer 3/3 çıktıda geçiyorsa → confidence=HIGH (0.95)
- Entity eğer 2/3 geçiyorsa → confidence=MEDIUM (0.70)
- Entity eğer 1/3 geçiyorsa → confidence=LOW (0.40) → quarantine

Relationship:
- 2/3 onay → quarantine (doğrulama bekleme)
- 3/3 onay + evidence cited → pending_review
```

**Maliyet:** 3 runs × $0.025 = $0.075 per document
- 500 docs × $0.075 = **$37.50** (kabul edilebilir)

### DALGA 3: Çapraz Bağlantılar (Hafta 4-6)
**Hedef:** ICIJ + flight logs + financial networks ile ağı genişlet

#### 3A: ICIJ Offshore Leaks
```typescript
// /api/documents/import
await importFromICIJ(
  dataset: "panama_papers | paradise_papers | pandora_papers",
  entities: extractedNodesFromWave2,
  matchThreshold: 0.85  // Fuzzy matching
);

// Entity resolution:
// "Epstein Trust" (mahkeme belgesi) → "Epstein Trust" (ICIJ)
// "J. Epstein Holdings" → "Jeffrey Epstein Holdings"
// → Aynı kuruluş
```

#### 3B: Uçuş Kayıtları
```typescript
// Lolita Express uçuş günlüklerinden yolcu çıkarımı
// (açık kaynak: https://www.documentcloud.org/documents/1507315)

const flightRecords = [
  { date: "1999-03-15", from: "NYC", to: "Palm Beach", passengers: [...] },
  ...
];

// Ağda kişi eğer uçuşta beraber ise → "CO_TRAVELED" bağlantısı ekle
// Confidence = date-grounded, medium (ortak seyahat = bağlantı ama nedenini bilmiyoruz)
```

#### 3C: Finansal Akışlar
```typescript
// Structured data: OpenSanctions (PEP listeleri, yaptırımlı kişiler)
// Enrichment: Epstein varlıkları → kime transfer edildi?

const sanctions = await openSanctions.search("Epstein");
// Kaynaklar: US Treasury, UN, OFAC vb.

// Ağa ekle: "financial_connection", confidence=HIGH
```

### Dalga Özet Tablosu

| Dalga | Zaman | Giriş | İş | Çıktı | Hata Toleransı |
|-------|-------|-------|-----|-------|----------------|
| **1** | Hf 1-2 | Wikipedia, açık kaynak | Manuel seçme | 30-40 çekirdek | 0% |
| **2** | Hf 2-4 | CourtListener | OCR + Groq + consensus | 50-100 yeni düğüm | <%8 |
| **3** | Hf 4-6 | ICIJ, OpenSanctions | Fuzzy match + Entity res. | 50-100 yeni bağlantı | <%5 |

---

## BÖLÜM 4: TEKNİK MİMARİ: ÇIKARIM MOTORU

### 4.1 Yapılandırılmış Çıktı (Structured Output)

**Groq tarafından destekleniyor:** https://console.groq.com/docs/structured-outputs

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "enum": ["PERSON", "ORGANIZATION", "LOCATION", "DATE", "AMOUNT"] },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "source_quote": { "type": "string" },
          "page_number": { "type": "integer" },
          "notes": { "type": "string" }
        },
        "required": ["name", "type", "confidence", "source_quote"]
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_entity": { "type": "string" },
          "target_entity": { "type": "string" },
          "relationship_type": {
            "enum": ["directorship", "ownership", "payment", "family_relation",
                     "employment", "co_traveled", "defendant_plaintiff", "financial_transfer"]
          },
          "evidence": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "date": { "type": "string", "format": "date" }
        },
        "required": ["source_entity", "target_entity", "relationship_type", "evidence", "confidence"]
      }
    },
    "ambiguities": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["entities", "relationships", "ambiguities"]
}
```

**Faydalar:**
- Token-level constraint: Model uyumsuz JSON üretemez
- Success rate: 99.5%+ (vs. 85-90 post-hoc validation olmaksızın)
- Parsing hataları ortadan kalkar

### 4.2 Chain-of-Thought + Explicit Evidence

**Prompt Yapısı:**

```
SİZ, hukuki belgelerde varlık ve ilişki çıkarmada uzman bir AI'sınız.
Kurallar:
1. SADECE belgede açıkça belirtilen varlıkları çıkar
2. Her varlık için belgeden tam alıntı
3. Muğlak ilişkileri "AMBIGUOUS" olarak işaretle
4. Hiç bir varlık veya ilişki uydu

BELGE ÖZET [belgeden 3-5 cümlelik özet]

AŞAMA 1: AÇIK KANIT ÇIKARIMI
Aşağıdaki her varlık türü için belgeden tam doğru alıntıları listele:

KİŞİLER:
- [İsim]: "[Belgede tam metin]" (sayfa: N)

KURULUŞLAR:
- [Ad]: "[Belgede tam metin]" (sayfa: N)

AŞAMA 2: İLİŞKİ KANITI
Her bağlantı için:
- KIM (kaynak): [İsim]
- NE (ilişki): [directorship | ownership | vb.]
- KİME (hedef): [İsim]
- KANIT: "[Belgede tam cümle]"
- ZAMAN: [YYYY-MM-DD eğer varsa]
- GÜVEN: [HIGH | MEDIUM | LOW] ve NEDEN

AŞAMA 3: ÇAKIŞMA KONTROLÜ
Aynı kişi/kurum farklı adlarla geçiyor mu?
- [Ad 1] vs [Ad 2]: Aynı mı? EVET/HAYIR neden?

SON: JSON ÇIKTI
```

**Avantaj:** Hallucinated varlıklar filtrelenebilir (belgede referans yok)

### 4.3 Groq Consensus Mekanizması

**Algoritma:**

```typescript
async function extractWithConsensus(
  documentText: string,
  documentId: string
) {
  // 3 runs, different temperatures for variance
  const runs = await Promise.all([
    groqExtract(documentText, 0.1),
    groqExtract(documentText, 0.2),
    groqExtract(documentText, 0.3),
  ]);

  // Entity consensus
  const entityConsensus = buildConsensus(
    runs.map(r => r.entities),
    threshold: 2  // 2/3 unanimity
  );

  // Relationship consensus
  const relationshipConsensus = buildConsensus(
    runs.map(r => r.relationships),
    threshold: 2
  );

  // Confidence scoring
  entityConsensus.forEach(entity => {
    const appearances = runs.filter(r =>
      r.entities.some(e => e.name === entity.name)
    ).length;

    entity.consensus_confidence = appearances / 3;  // 0.33 | 0.67 | 1.0
  });

  // Quarantine rules
  return {
    high_confidence: entities.filter(e => e.confidence >= 0.8),
    medium_confidence: entities.filter(e => 0.5 <= e.confidence < 0.8),
    low_confidence: entities.filter(e => e.confidence < 0.5),
    // low_confidence → karantina
  };
}
```

**Consensus Skoru:**
- **3/3 match:** confidence = 1.0 (çekirdek ağa direkt, peer review atla)
- **2/3 match:** confidence = 0.7 (pending_review, 1 onay yeter)
- **1/3 match:** confidence = 0.33 (quarantined, 2 onay gerekli)

### 4.4 Entity Resolution Mimarisi

**4-Tier Hybrid Sistem (ER SOTA raporundan):**

#### Tier 1: Blocking (Hızlı pre-filtering)
```typescript
function blocking(newEntity, existingEntities) {
  // Aynı ilk 3 harfi olanları filtrele
  return existingEntities.filter(e =>
    e.name.substring(0, 3) === newEntity.name.substring(0, 3)
  );
}
// N² complexity → N × (k/50) olur (50 kovalık varsayılmış k = avg candidates)
```

#### Tier 2: Syntactic (Yazı tabanı)
```typescript
function syntacticMatch(name1: string, name2: string): number {
  // Türkçe karakterler normalize et
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/ş/g, 's').replace(/ı/g, 'i');

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Jaro-Winkler mesafesi
  const jaroWinkler = jw(n1, n2);

  // Levenshtein mesafesi
  const levenshtein = lev(n1, n2) / Math.max(n1.length, n2.length);

  // Weighted average
  return 0.6 * jaroWinkler + 0.4 * (1 - levenshtein);
  // Threshold: 0.85
}
```

**Sonek Kaldırma (önemli kurumsal ER için):**
```typescript
const LEGAL_SUFFIXES = [
  ' LLC', ' Ltd', ' Inc', ' Corp', ' Corporation',
  ' GmbH', ' AG', ' SA', ' SAS', ' BV',
  ', Inc.', ', Ltd.', ' Co.', ' Co', ' Company',
  ' Trust', ' Trustees', ' Foundation'
];

function stripSuffixes(orgName: string): string {
  for (const suffix of LEGAL_SUFFIXES) {
    if (orgName.endsWith(suffix)) {
      return orgName.slice(0, -suffix.length).trim();
    }
  }
  return orgName;
}

// "JPMorgan Chase & Co." → "JPMorgan Chase"
// "JP Morgan" ile eşleştir
```

#### Tier 3: Semantic (Anlam tabanı)
```typescript
async function semanticMatch(
  name1: string,
  name2: string,
  context1?: string,
  context2?: string
): Promise<number> {
  // OpenAI embeddings yerine, daha ucuz: MiniLM
  const embedding1 = await smallEmbedding.embed(
    `${name1} ${context1 || ''}`
  );
  const embedding2 = await smallEmbedding.embed(
    `${name2} ${context2 || ''}`
  );

  // Cosine similarity
  return cosineSimilarity(embedding1, embedding2);
  // Threshold: 0.75
}
```

#### Tier 4: Graph-based (Ağ tabanı)
```typescript
function graphBasedMatch(
  entity1: Node,
  entity2: Node,
  graph: NetworkGraph
): number {
  // Eğer her iki entity'nin aynı neighbors'ları varsa → muhtemelen aynı
  const neighbors1 = graph.getNeighbors(entity1);
  const neighbors2 = graph.getNeighbors(entity2);

  const commonNeighbors = neighbors1.filter(n =>
    neighbors2.some(n2 => n2.id === n.id)
  );

  const similarity =
    2 * commonNeighbors.length / (neighbors1.length + neighbors2.length);

  return similarity;
  // Threshold: 0.5
}
```

**Entity Resolution Pipeline:**

```typescript
async function resolveEntity(newEntity, existingEntities) {
  const blocked = blocking(newEntity, existingEntities);

  for (const candidate of blocked) {
    const scores = {
      syntactic: syntacticMatch(newEntity.name, candidate.name),
      semantic: await semanticMatch(
        newEntity.name, candidate.name,
        newEntity.context, candidate.context
      ),
      graph: graphBasedMatch(newEntity, candidate, currentGraph)
    };

    const finalScore =
      0.4 * scores.syntactic +
      0.35 * scores.semantic +
      0.25 * scores.graph;

    if (finalScore > 0.80) {
      return { match: candidate, confidence: finalScore };
    }
  }

  return { match: null, confidence: 0 };  // Yeni entity
}
```

### 4.5 Offshore Entity Patterns (ICIJ Metodolojisi)

```typescript
// ICIJ Offshore Leaks'ten öğrenilen desenler

const OFFSHORE_PATTERNS = {
  // Kargo kuruluşları (shell companies)
  shell_companies: [
    /^(.*) Holdings? (Ltd|LLC|Inc|Corp|BV)$/i,
    /^(.*) Trust (Company)?$/i,
    /^(.*) Foundation$/i,
  ],

  // Tahvil bölgesi ülkeleri
  tax_haven_jurisdictions: [
    'BVI', 'Cayman Islands', 'Panama', 'Malta', 'Cyprus',
    'Seychelles', 'Isle of Man', 'Mauritius', 'Dubai'
  ],

  // Nominal sahiplik (façade)
  facade_indicators: [
    'nominee director',
    'nominee shareholder',
    'bearer shares',
    'shelf company'
  ]
};

function detectOffshoreEntity(org, jurisdiction) {
  const indicators = [];

  if (OFFSHORE_PATTERNS.shell_companies.some(p => p.test(org.name))) {
    indicators.push('likely_shell');
  }

  if (OFFSHORE_PATTERNS.tax_haven_jurisdictions.includes(jurisdiction)) {
    indicators.push('tax_haven_jurisdiction');
  }

  return indicators.length > 0
    ? { risk: 'offshore_entity', confidence: indicators.length }
    : null;
}
```

### 4.6 Multilingual Entity Resolution

```typescript
const LANGUAGE_RULES = {
  turkish: {
    normalize: (s) => s.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/ş/g, 's').replace(/ı/g, 'i'),
    stopwords: ['ve', 'la', 'le', 'şti', 'şti'],
  },
  english: {
    normalize: (s) => s.toLowerCase(),
    stopwords: ['the', 'and', 'a', 'an'],
  },
  russian: {
    normalize: (s) => s.toLowerCase(),
    stopwords: ['и', 'или', 'в', 'на'],
  }
};

function multilingualMatch(name1, name2, lang1, lang2) {
  const normalized1 = LANGUAGE_RULES[lang1].normalize(name1);
  const normalized2 = LANGUAGE_RULES[lang2].normalize(name2);

  // Suffix removal (multilingual)
  const cleaned1 = removeSuffixes(normalized1, lang1);
  const cleaned2 = removeSuffixes(normalized2, lang2);

  return syntacticMatch(cleaned1, cleaned2);
}
```

---

## BÖLÜM 5: GÜVENİLİRLİK KATMANLARI

### Katman 1: Yapılandırılmış JSON Output
✅ **Status:** Groq tarafından desteklenen, token-level constraint decoding
- Hallucination tarafından neden olunan JSON hataları = 0
- Success rate: 99.5%

### Katman 2: Multi-Prompt Consensus
✅ **Status:** 3 runs, kesişim alma
- 3/3: HIGH confidence (1.0)
- 2/3: MEDIUM confidence (0.7)
- 1/3: LOW confidence (0.33) → karantina

**Bütçe impact:** 3x çalışma, ama Groq hızlı ($0.075 per doc)

### Katman 3: Constitutional Extraction Principles
✅ **Status:** Prompt'ta kodlanmış, CoT akıl yürütme ile
- "SADECE belgede açıkça belirtilenleri çıkar"
- "Her varlık için belgeden tam alıntı"
- "Muğlak ilişkileri AMBIGUOUS olarak işaretle"

### Katman 4: Karantina + Peer Review (Sprint 17)
✅ **Status:** Altyapı hazır
- Yapısal veri (ICIJ) → pending_review (1 onay)
- AI çıkarımı → quarantined (2 bağımsız onay)
- Tier 2+ kullanıcıları doğrulayabilir
- Ağa ekleme → verified_organizations check (tekrar sahtecilik)

### Katman 5: Cross-Document Validation
🟡 **Status:** Yapılması gerekli
- Aynı varlık 5+ belgede geçiyorsa → confidence boost
- Aynı ilişki 3+ belgede → HIGH
- Çelişkili bilgiler detekt et (entity A, iki belgede farklı tarihte born)

**Pseudo-kod:**

```typescript
function validateAcrossDocuments(
  entity: Entity,
  documentsContainingEntity: Document[]
) {
  const mentions = [];

  for (const doc of documentsContainingEntity) {
    const mention = doc.extracted_entities.find(e =>
      entityMatch(e, entity) > 0.8
    );
    if (mention) mentions.push(mention);
  }

  // Çelişki tespiti
  const birthDates = mentions
    .map(m => m.birth_date)
    .filter(d => d !== null);

  if (new Set(birthDates).size > 1) {
    console.warn(`Conflict: ${entity.name} has ${new Set(birthDates).size} birth dates`);
    entity.conflict_flag = true;
  }

  // Confidence boost
  entity.cross_doc_mentions = mentions.length;
  entity.cross_doc_confidence = Math.min(1.0, mentions.length * 0.2);

  return entity;
}
```

### Katman 6: HalluGraph-Style Knowledge Graph Validation
🟡 **Status:** Yapılması gerekli
- Her çıkarılan varlık belge'de ground mi? (entity grounding)
- Her ilişki belgede kanıt bulmuş mu? (relation preservation)

```typescript
function detectHallucinations(source_doc: string, extracted_kg: KG) {
  const hallucinations = [];

  for (const entity of extracted_kg.entities) {
    if (!source_doc.includes(entity.name)) {
      hallucinations.push({
        type: 'entity_hallucination',
        entity: entity.name,
        reason: 'Not found in source document'
      });
    }
  }

  for (const relation of extracted_kg.relationships) {
    const evidence_context = source_doc.substring(
      relation.evidence_span_start,
      relation.evidence_span_end
    );

    const has_source = evidence_context.includes(relation.source_entity);
    const has_target = evidence_context.includes(relation.target_entity);

    if (!has_source || !has_target) {
      hallucinations.push({
        type: 'relation_hallucination',
        relation: `${relation.source}-${relation.type}-${relation.target}`,
        reason: 'Relation not grounded in evidence'
      });
    }
  }

  return hallucinations;
}
```

---

## BÖLÜM 6: MALİYET ANALİZİ DETAYLI

### GCP $340 Bütçe Dağılımı

#### Document AI OCR (büyük gider)
```
Scenario 1 (FULL OCR - Overbudget):
500 docs × 50 pages avg × $0.15/page = $3,750 ❌

Scenario 2 (SELECTIVE OCR - Optimized):
- Belge tipi algılaması (Vision API, ucuz)
- Tabloları içeren sayfalar → full OCR
- Saf metin sayfaları → lightweight extraction

Tahmini:
500 docs:
  - 40% table-heavy (200 docs) × 30 pages × $0.15 = $900
  - 60% text-only (300 docs) × 20 pages × $0.05 = $300

Subtotal: $1,200 ❌ HALA OVERBUDGET

Scenario 3 (FOCUSED SAMPLING - Realistic):
250 docs (çekirdek ağ etkinliği):
  - 40% table-heavy (100 docs) × 30 pages × $0.15 = $450
  - 60% text-only (150 docs) × 20 pages × $0.05 = $150

Subtotal: $600

Vision API (ön dokümanlama):
500 docs × 10 pages × $0.001/image = $50

Subtotal: $600 + $50 = $650 ❌ HALA FAZLA

Scenario 4 (SMART SAMPLING):
- CourtListener search: Epstein mentions, filed_after=1995
- Sadece relevance score > 0.8
- ~150 belge (high-value)

150 docs:
  - 50% table-heavy (75 docs) × 30 pages × $0.15 = $337.50
  - 50% text-only (75 docs) × 20 pages × $0.05 = $75

Subtotal: $412.50

Vision API: 150 × 10 × $0.001 = $15

Groq Extraction (3 runs × 500K tokens × $0.05/1M): $125

Google Storage: $5

TOTAL: $557.50 ❌ Still over

Scenario 5 (FINAL OPTIMIZED):
1. CourtListener smart filter → top 100 high-relevance docs
2. Document AI selective OCR → 70% success
3. Fallback to Vision API for non-OCR → 30% gapfill

100 docs:
  - Vision-first assessment: 100 × 5 images × $0.001 = $0.50
  - OCR for high-value pages only (est. 50 pages): $7.50
  - Manual OCR fallback (est. 20 pages, student labor): $0

Groq Extraction: 3 runs × 250K tokens × $0.05/1M = $37.50

Total: ~$50 + management overhead = $100-150

FINAL BUDGET:
- Document AI/Vision: $100
- Groq Extraction: $150
- Storage/Misc: $50
- Management: $40
TOTAL: $340 ✓
```

### Dalga Başına Maliyet

| Dalga | İş | Maliyet | Kat |
|-------|-----|--------|-----|
| **1** | Manuel 30-40 node | $0 | Zaman (Raşit 4 saat) |
| **2** | 100 belge + OCR + Groq | $130 | OCR $50, Groq $80 |
| **3** | ICIJ + OpenSanctions matching | $50 | API + embedding + manual |
| **Buffer** | Contingency | $60 | Tahmin edilen overrun |

### Cost Optimization Stratejileri

1. **Belge Sampling:** Top 100 relevant docs, quality > quantity
2. **Batch Processing:** 10 doc chunks, single Groq call (context window 8K)
3. **Vision-First:** $0.001/image << $0.15/OCR page (for quick relevance)
4. **Student Labor:** Manual OCR fallback (çok az gerekli)
5. **Cache Results:** Aynı belge → tekrar OCR etme

---

## BÖLÜM 7: RİSK YÖNETİMİ VE MİTİGASYON

### Risk 1: Hallucination Rate > 5%
**Olaslılık:** Orta (Groq, CoT, consensus olmadan %15-20 olabilir)
**Etki:** Ağa yanlış varlık/ilişki eklenir → kredibilite zarar

**Mitigation:**
- ✅ Structured output (99.5% başarı)
- ✅ 3-run consensus (2/3 threshold)
- ✅ Karantina (2 onay gerekli)
- ✅ Cross-doc validation
- **Metrik:** Quarantine tarafından reddedilen oranını takip et
- **Target:** <3% hallucination (%5 quarantine → %3 final)

### Risk 2: GCP Credit Overrun
**Olaslılık:** Yüksek (OCR pahalı, kestirim zor)
**Etki:** Belge taraması yarım kalır

**Mitigation:**
- ✅ Scenario 5 (Smart Sampling) implementasyonu
- ✅ Vision API pre-filtering (ucuz)
- ✅ Belge relevance scoring (hedef-odaklı seçim)
- **Kontrol:** Her gün GCP console'da cost tracking
- **Threshold:** Harcama $250'ye ulaştığında durdur, durum raporu yaz

### Risk 3: Entity Resolution Yavaş
**Olaslılık:** Düşük (4-tier system optimize edilmiş)
**Etki:** Matching sonuçları Dalga 3'e geç kalabilir

**Mitigation:**
- ✅ Blocking (N² → N × k/50 karmaşıklık)
- ✅ Batch processing (100 entity/batch)
- **Alternatif:** Tier 2/3 skip et, sadece Tier 1+4 kullan (hızlı ama kaba)

### Risk 4: Benzersiz Varlıklar Birleştirilmesi (False Positive)
**Olaslılık:** Düşük (0.85 threshold + cross-doc validation)
**Etki:** "Jeffrey Epstein" + "Jeffrey Epstein Foundation" = 1 node (YANLIŞ)

**Mitigation:**
- ✅ Type checking (PERSON vs ORGANIZATION)
- ✅ Context preservation (entity.context)
- ✅ Manual review (high-value entities)
- **Flag:** confidence > 0.9 ama type/context fark → manuel review

### Risk 5: Belge Tarama Eksik (Coverage)
**Olaslılık:** Yüksek (CourtListener tüm belgeleri indekslemez)
**Etki:** Ağ = eksik ve yanlı (ne belgeler tarandıysa, onu tercih et)

**Mitigation:**
- ✅ Çoklu kaynak (CourtListener + ICIJ + OpenSanctions)
- ✅ Curation (en yüksek-impact belgeleri seç)
- **Reproducibility:** Aynı belgeler → aynı ağ (coverage yok ama consistency var)
- **Dokümantasyon:** "Hangi belgeler tarandıydı" kaydını tut

### Risk 6: Hassas Bilgiler (Kurban Kimliği)
**Olaslılık:** Yüksek (mahkeme belgeleri kurban identitesi içerebilir)
**Etki:** "Jane Doe" kurban adı yanlışlıkla leak

**Mitigation:**
- ✅ PII filtering (redacted pattern tespiti)
- ✅ Guidance (Raşit: kurban bilgisi taramanın dışında tutuluyor)
- **Kural:** "Jane Doe" gibi placeholder → ağa ekleme
- **Auditori:** Gazeteci/etik denetmen (çıkışta kontrol)

---

## BÖLÜM 8: ENTITY RESOLUTION ÖZETİ (ER RAPORU KÖPRÜSÜ)

### State-of-the-Art Algoritmaları (2025-2026)

#### LLM-Based ER (En Yeni)
- **Groq llama-3.3-70b:** "Name1 ve Name2 aynı varlık mı? Sebep?"
- **Avantaj:** Bağlamsal, zero-shot yetenekleri
- **Dezavantaj:** Yavaş (50 entity/dakika), hallucination riski

#### Graph Neural Networks
- **Deep-ER:** Bağlantı yapısından ER (node embedding)
- **Avantaj:** Hızlı, ölçeklenebilir
- **Dezavantaj:** Training data gerekli, cold-start problem

#### Hybrid (Tavsiye Edilen)
- **Blocking:** Syntactic pre-filtering
- **Matching:** Jaro-Winkler + semantic embeddings
- **Verification:** LLM confidence check

### Açık Kaynak Araçları

| Tool | Kullanım | Advantage |
|------|----------|-----------|
| **Spacy** | NER + coreference | Hızlı, Türkçe dil |
| **Dedupe** | Record linkage | Unsupervised learning |
| **Lingam** | Causal structure | İlişki directionality |
| **NetworkX** | Graph analysis | ER validation |

### Recommendation for Project Truth

```
BLOCKING → SYNTACTIC → SEMANTIC → GRAPH → MANUAL REVIEW

Tier 1: Suffix removal + first 3 chars
Tier 2: Jaro-Winkler 0.85
Tier 3: Embedding similarity 0.75
Tier 4: Neighbor overlap > 0.5
Manual: Confidence 0.70-0.85 ∧ high-impact entity
```

---

## BÖLÜM 9: ÇIKARIM STRATEJİSİNİN ANI

### Consensus Mekanizması (Detailed)

**Neden 3 runs?**
- 1 run = lucky hit (hallucination mask edilebilir)
- 2 runs = maybe (yüksek hata oranı)
- 3 runs = robust signal (kesişim = true positive)

**Temperature farklılığı neden?**
```
Temperature 0.1 → deterministik, tekrarlı, ya doğru ya yanlış
Temperature 0.3 → varyasyon, hallucinations yüksek ama novel patterns yakalayabilir

Kesişim:
- Hem deterministik hem varyant çıkarımda geçiyorsa → REAL
- Sadece varyant'ta geçiyorsa → HALLUCINATION
```

**Confidence Mapping:**
```
3/3 runs match: confidence = 1.0
  → Doğrudan ağa ekle (quarantine atla)

2/3 runs match: confidence = 0.7
  → pending_review (1 peer onay)
  → Tier 2+ kullanıcı "evet bu varlık doğru" derse ağa ekle

1/3 runs match: confidence = 0.3
  → quarantined (2 bağımsız onay)
  → 2 peer reddederse ağa ekleme
  → 2 peer onaylarsa → pending_review → threshold 1
```

**Cost Optimization:**
- 1 Groq token = $0.05 per 1M
- 500 docs × avg 2KB = 1M tokens → $50
- 3 runs × $50 = $150 (kabul edilebilir)

---

## BÖLÜM 10: UYGULAMA PLANI (6 HAFTA)

### Hafta 1-2: Dalga 1 — İskelet

**Görevler:**
1. Wikipedia Epstein maddesinden 30+ kişi çıkar
2. Açık kaynak belgeleri (RECAP, ProPublica) taraması
3. CSV oluştur: isim, ülke, doğum tarihi, tip
4. Manual doğrulama (Raşit)
5. `nodes` tablosuna bulk insert
6. Git commit

**Kaynaklar:**
- https://en.wikipedia.org/wiki/Jeffrey_Epstein
- https://www.documentcloud.org/ (ProPublica belgeleri)
- https://www.recap.org/ (açık mahkeme belgeleri)

**Deliverable:** `core_epstein_network.csv` (30 kişi, 100% doğru)

---

### Hafta 2-4: Dalga 2 — Belge Taraması

**Hafta 2-3A: Setup**
1. CourtListener API entegrasyonu (`/api/courtlistener/search`)
   - Query: "Epstein", relevance > 0.8
   - Result: ~100-150 belge

2. Document AI pipeline:
   - Vision API pre-check (table detection)
   - Selective OCR implementation
   - GCS upload

3. Groq extraction pipeline:
   - JSON schema finalization
   - CoT prompt template
   - 3-run consensus loop

4. Quarantine integration:
   - data_quarantine insert
   - confidence_score mapping

**Hafta 3B-4: Execution**

Belge tabanlı döngü (50 belge/gün):
```
CourtListener search
   ↓
Vision API pre-assessment
   ↓
Document AI OCR (selective)
   ↓
GCS storage
   ↓
Groq 3-run extraction
   ↓
Consensus + confidence
   ↓
Quarantine insert
   ↓
Karantina dashboardı (QA)
```

**Quality gates:**
- Hallucination oranı < 8% (monitoring via quarantine reject %)
- GCP cost < $150/haftada
- Throughput: 50 docs/gün

**Deliverable:**
- 100+ yeni düğüm
- 200+ yeni bağlantı
- Quarantine queue (peer review için hazır)

---

### Hafta 4-5: Dalga 3 — Çapraz Bağlantılar

**Hafta 4: ICIJ Özel**
1. Offshore Leaks dataset yükle (açık kaynak)
2. Entity resolution (Epstein ağından isimler + ICIJ)
   - Fuzzy matching (0.85 threshold)
   - Organization-specific rules (suffix removal)
3. Cross-referenced entities ağa ekle
4. New relationships (financial_connection, offshore_holder)

**Hafta 5: Flight + Financial**
1. Lolita Express flight logs (DocumentCloud açık belgeleri)
   - Tarih + yolcular çıkar
   - Co-travel relationships oluştur

2. OpenSanctions enrichment
   - PEP listeleri (Politically Exposed Persons)
   - Yaptırımlar

3. Manual curation (yüksek-kaliteli bağlantılar)

**Deliverable:**
- 50-100 yeni düğüm (ICIJ + offshore)
- 100-150 yeni bağlantı (finansal + seyahat)

---

### Hafta 5-6: Testing + Refinement

**Hafta 5B-6A: Karantina Açısı**
- Peer review backlog reduce
- Hallucination analysis
- False positive/negative rates

**Hafta 6B: Network Validation**
- Cross-document consistency
- Conflict detection
- High-impact entity manual review

**Hafta 6C: Documentation**
- "Bu belgeleri taradık" meta-data
- Entity resolution decisions log
- Confidence score distributions

**Deliverable:**
- QA raporu (accuracy, coverage, reproducibility)
- Network stats (100+ düğüm, 300+ link, %95 verified)

---

## BÖLÜM 11: BAŞARI METRİKLERİ

### KPI Tablosu

| Metrik | T0 | T1 (Hf 3) | T2 (Hf 6) | Target | Yöntemi |
|--------|-------|-----------|-----------|---------|---------|
| **Düğüm Sayısı** | 15 | 50 | 100+ | 120 | Network tab size |
| **Bağlantı Sayısı** | 19 | 150 | 300+ | 350 | Links table count |
| **Kanıt/Bağlantı** | 0.2 avg | 1.5 avg | 2.5 avg | 3+ | evidence_count |
| **Hallucination %** | N/A | <8 | <5 | <3 | Quarantine reject % |
| **Peer Review %** | N/A | 40% | 80%+ | 95%+ | Approved entity % |
| **GCP Cost Used** | $0 | $150 | $300 | $340 max | GCP console |
| **Reproducibility** | 0% | 60% | 85%+ | 90%+ | Same docs → same core % |

### Doğruluk Metrikları

**Validation Set:** 20 randomly sampled belge
- Manual extraction by human
- Groq extraction
- Compare: F1 score, precision, recall

```
Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F1 = 2 * (Precision * Recall) / (Precision + Recall)

Target: F1 > 0.85
```

### Network Quality

```
Reproducibility =
  (Common nodes in Run 1 vs Run 2) /
  (Total unique nodes in Run 1 or Run 2)

Target: > 0.85 (same docs → 85% same core network)

Explanation: Farklı temperature/runs → biraz varyans normal,
ama "çekirdek" varlıklar (high degree nodes) konsisten olmalı
```

### Throughput Tracking

```
Week 1-2: 1-2 docs/day (setup)
Week 2-3: 50 docs/day (ramp up)
Week 3-4: 70 docs/day (peak)
Week 4-6: 30 docs/day (ICIJ + manual)

Total: 100+ docs processed
```

---

## BÖLÜM 12: KAYNAKLAR

### AI Extraction Quality
1. HalluGraph: Legal RAG için Hallucination Tespiti
   - https://arxiv.org/pdf/2512.01659
2. Hallucination-Free? Legal AI Tools Assessment
   - https://arxiv.org/html/2405.20362v1
3. CoT Explicit Evidence Reasoning
   - https://aclanthology.org/2023.findings-emnlp.153/
4. LexNLP: Hukuki Metinler İçin NER
   - https://arxiv.org/abs/1806.03688

### Entity Resolution SOTA
1. Groq Structured Outputs
   - https://console.groq.com/docs/structured-outputs
2. SOTA Comparison 2025
   - [ER SOTA Raporu]
3. Turkish Character Handling
   - Unicode normalization standards
4. Organization Name Matching
   - [Org Matching Raporu]

### AI Consensus Mechanisms
1. LLM-as-a-Judge Pattern
   - [Consensus Raporu]
2. Multi-Model Voting
   - Ensemble learning best practices
3. Constitutional AI
   - https://arxiv.org/abs/2212.04037

### Tools & Libraries
- **Groq:** llama-3.3-70b, structured outputs
- **Google Cloud:** Document AI, Vision, Storage
- **spaCy:** NLP pipeline, coreference
- **NetworkX:** Graph analysis
- **Supabase:** PostgreSQL backend

### External Data Sources
- **CourtListener:** Court records via RECAP
  - https://www.courtlistener.com/ (API)
- **ICIJ Offshore Leaks:** Panama/Paradise/Pandora Papers
  - https://offshoreleaks.icij.org/
- **OpenSanctions:** PEP lists, sanctions
  - https://www.opensanctions.org/ (API)
- **DocumentCloud:** ProPublica documents
  - https://www.documentcloud.org/

---

## SONUÇ

### Operasyonel Özet
Bu strateji, Project Truth'u 6 hafta içinde **amatör bir ağdan (15 düğüm) -> profesyonel bir soruşturma ağına (100+ düğüm, kanıt-tarafından-desteklenen)** yükseltir.

Başarı faktörleri:
1. ✅ **Groq Consensus** — hallucination <5%
2. ✅ **Entity Resolution 4-Tier** — aynı-düğüm tanıma >85%
3. ✅ **Karantina Integration** — peer review = final gate
4. ✅ **Cost Optimization** — $340 budgeting
5. ✅ **Multi-Source Validation** — reproducibility

### Next Steps
1. **Hafta 1:** Dalga 1 başla (İskelet)
2. **Hafta 2:** Dalga 2 setup tamamla
3. **Hafta 2-4:** Belge taraması (dailies)
4. **Hafta 4-5:** Dalga 3 (ICIJ + flight)
5. **Hafta 5-6:** QA + refinement

### Vizyonel Kontekst
> "Project Truth'u 100+ düğümle fırlatırız. Ağ o kadar güçlü, o kadar güvenilir olur ki, gazeteciler ve araştırmacılar onu Epstein, Panama Papers, Türkiye'deki yolsuzluk networks için kullanacaklar. Biz sadece bir proof-of-concept yapıyoruz — sistem, kendi momentum'unu kazanacak."

**Başarı tanımı:** Halka açılış sonrası, ilk ay içinde 10+ bağımsız soruşturmacı ağa katkı yapıyorsa, o zaman "Cephane" başarılı olmuş demektir.
