# R3: Kuruluş Adı Eşleştirme ve Kurumsal Varlık Çözünürlüğü Stratejisi

**Araştırma Tarihi:** 10 Mart 2026
**Hedef Proje:** Project Truth - 3D Soruşturma Ağı Görselleştirmesi
**Kritik Sorun:** Aynı kuruluşu ifade eden farklı adları eşleştirmek

---

## İÇİNDEKİLER

1. [Özet](#özet)
2. [Temel Algoritmalar](#temel-algoritmalar)
3. [Kurumsal Kayıtlar Sistemi](#kurumsal-kayıtlar-sistemi)
4. [Yasal Varlık Tanımlayıcıları (LEI)](#yasal-varlık-tanımlayıcıları-lei)
5. [NLP Teknikleri](#nlp-teknikleri)
6. [Finansal Uyum Araçları](#finansal-uyum-araçları)
7. [Sahte Kuruluşlar ve Gizleme Desenleri](#sahte-kuruluşlar-ve-gizleme-desenleri)
8. [ICIJ Metodolojisi](#icij-metodolojisi)
9. [Açık Kaynak Araçları](#açık-kaynak-araçları)
10. [Embedding ve Anlambilim](#embedding-ve-anlambilim)
11. [Adres ve Yargı Ayrımcılığı](#adres-ve-yargı-ayrımcılığı)
12. [Denizaşırı Desenleri](#denizaşırı-desenleri)
13. [Uygulama Mimarisi](#uygulama-mimarisi)
14. [Önerilen Çözüm Yığını](#önerilen-çözüm-yığını)
15. [Kaynaklar](#kaynaklar)

---

## ÖZET

Kuruluş adı eşleştirmesi, kişi adı eşleştirmesinden temelde farklıdır. Kurumsal varlıklar:
- Yasal sonek ve ön ekler (LLC, Ltd, GmbH, AG, Inc, Corp) taşırlar
- Kısaltmalar ve akronim varyasyonları içerirler
- Coğrafi yargı alanlarında farklılaştırılırlar
- Kasten gizlemek için yeniden adlandırılabilirler (sahte kuruluşlar, nominal sahiplikler)
- Zaman içinde birden fazla ad altında faaliyet gösterebilirler

**Örnek Karışıklığı:**
```
"JPMorgan Chase" (ticari ad)
"JP Morgan" (gayri resmi)
"J.P. Morgan & Co." (tarihi)
"JPMorgan Chase Bank, N.A." (yasal tam ad)
→ TÜM AYNI VARLIKTIR
```

Project Truth'un Epstein ağı gibi karmaşık soruşturmalar için bir denetim-sürü mimarisi gerekir:
1. **Otomatik eşleştirme** (hızlı, ön-eleme)
2. **İnsan doğrulama** (kesin, güvenilebilir)
3. **Denetim izi** (kanun müşaviri onayı)

---

## TEMEL ALGORITMALAR

### 1. Karakter Tabanlı Uzaklık Metrikleri

#### Levenshtein Mesafesi
- **Tanım:** İki dize arasındaki minimum düzenle mesafesi (ekleme, silme, değiştirme)
- **Puanlandırma:** 0 (özdeş) → ∞ (tamamen farklı)
- **Uygun:** Şirket adlarında KONUM fark etmiş (her konum eşit değer)

**Örnek:**
```
"Southern Trust Company" vs "Southern Trust Co. Inc"
Levenshtein = 6 (3 karakter + "Company" → "Co. Inc")
```

#### Jaro-Winkler Benzerliği
- **Tanım:** Başlangıç eşleşmesini vurgulayan Jaro modifikasyonu
- **Puanlandırma:** 0.0 (tamamen farklı) → 1.0 (özdeş)
- **Uygun:** ÖN EK değişimleri için (ABD vs AB yazımı)

**Karşılaştırma Tablosu:**

| Çifti | Levenshtein | Jaro-Winkler | Yorum |
|------|------------|-------------|--------|
| "Thompson" vs "Shompson" | 1 | 0.92 | JW ön eki vurgular |
| "JPMorgan" vs "JP Morgan" | 1 | 0.95 | Başlangıç aynı → yüksek JW |
| "Deutsche Bank AG" vs "Deutsche Bank" | 5 | 0.92 | Sonek farklı → düşük Levenshtein |

**Tavsiye:** AML/KYC uygulamaları için **Levenshtein** (karmaşık kurumsal adlar), gerçek zamanlı tarama için **Jaro-Winkler** (bireysel adlar).

### 2. Token Tabanlı Metrikler

#### Cosine Benzerliği (TF-IDF)
- **Mantık:** Adı kelime çantasına dönüştür → Vektör alan benzerliği hesapla
- **Uygun:** Çok sözcüklü adlar, yeniden sıralaşmış adlar

**Örnek:**
```
"International Business Machines" vs "IBM International Business"
Token overlay: {international, business} = 2/4 = 0.5 cosine
```

#### Jaccard Benzerliği
- **Mantık:** Kesişim / Birleşim oranı
- **Formül:** |A ∩ B| / |A ∪ B|
- **Uygun:** Kısaltmayı sona erdirilmiş adlar

```python
def jaccard_similarity(set_a, set_b):
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0

tokens_1 = {"southern", "trust", "company"}
tokens_2 = {"southern", "trust", "co"}
score = jaccard_similarity(tokens_1, tokens_2)  # 2/4 = 0.50
```

### 3. Fonetik Kodlama

#### Soundex
- **Amaç:** Seslenişe benzer adları bulma
- **Uygun:** Çevirme hataları, lehçe farklılıkları

```
"Mueller" vs "Muller" (Almanca)
Soundex: M400 vs M400 → Eşleşir
```

#### Metaphone
- Soundex'ten daha karmaşık, İngiltere/ABD farklılıklarını barındırır

---

## KURUMSAL KAYITLAR SİSTEMİ

### OpenCorporates API

**Kurulum:**
- **Kapsam:** 140+ yargı alanından resmi kayıtlar
- **Lisans:** Açık Veri Lisansı (AGPL uyumlu)
- **Maliyet:** Açık projeler için ÜCRETSIZ

**Anahtar Özellikler:**

1. **Kesin Adlandırma Standartları**
   - Her kuruluş resmi kaydı ile eşleştirilir
   - Yasal ad, kısaltılmış ad, eski adlar saklanır
   - Kuruluş durumu (aktif/fesih/serbest) izlenir

2. **Reconciliation API (OpenRefine Uyumlu)**
   ```
   GET /reconcile
   ?query={"query": "Southern Trust Company"}

   Yanıt:
   {
     "results": [
       {
         "id": "us_fl_123456",
         "name": "Southern Trust Company, Inc.",
         "jurisdiction": "Florida, USA",
         "type": "company",
         "match": true,
         "score": 0.95
       }
     ]
   }
   ```

3. **İlişkiler Dosyası**
   - Yöneticiler, ortaklar, hissedarlar arasında bağlantılar
   - Aynı yöneticiye sahip kuruluşları izlemek için kritik
   - Sahte kuruluş ağlarını ortaya çıkarmak için kullanılır

**Project Truth Entegrasyonu:**

```typescript
// API anahtarı gerektirmez (açık proje)
const searchOrganization = async (name: string) => {
  const response = await fetch(
    `https://api.opencorporates.com/v0.4/companies/search?q=${name}`
  );
  const { companies } = await response.json();

  // OpenCorporates resmi kaydı → DB'ye kaydet
  return companies.map(c => ({
    opencorporates_id: c.company_number,
    jurisdiction: c.jurisdiction_code,
    incorporation_date: c.incorporation_date,
    dissolution_date: c.dissolution_date,
    status: c.company_status,
    canonical_name: c.name,
    aliases: extractAliases(c.name)
  }));
};
```

---

## YASAL VARLIK TANÎMLAYICILARI (LEI)

### ISO 17442 Standard

**Tanım:** Global Financial Reporting için benzersiz, belirsiz olmayan 20 haneli alfanümerik tanımlayıcı.

**Yapı:**
```
A1B2CD3EF4GH5IJK6LMN7OP
│└─ LOU (4 haneli)    │
│                     └─ Düzeneyenin atadığı (14)
└───────────────────────┘
                        └─ Checksum (2 haneli, MOD-97-10)
```

**Avantajlar:**
- Finans kurumları tarafından ZORUNLU (45+ ülke)
- Mükerrer olmayan, asla geri dönüşümlü değil
- Açık erişim, ÜCRETSIZ

**Sınırlamalar:**
- Yalnızca finansal operatörler için geçerli
- Küçük işletmeler, özel şirketler kapsanmayabilir
- Epstein ağındaki çoğu sahte kuruluşun LEI'si yok

**GLEIF (Global Legal Entity Identifier Foundation) Araştırması:**

```bash
# LEI Bulma
curl "https://www.gleif.org/en/about-lei/introducing-the-legal-entity-identifier-lei"

# Örnek: JPMorgan Chase
LEI: 549300LRUVSF8PQFVX02
```

**Uygulama:**
```typescript
// Project Truth'ta LEI isteğe bağlı güven artırıcı
interface Entity {
  canonical_name: string;
  opencorporates_id?: string;
  lei?: string;  // Bulunduğunda güven skoru +0.3
  registration_number?: string;
}
```

---

## NLP TEKNÎKLERI

### 1. Ad Normalizasyonu

Eşleştirmeden ÖNCE, adları "kanonik" forma getir:

```typescript
function normalizeCompanyName(name: string): string {
  // Türkçe karakterleri temizle (fuzzy match için)
  const normalized = name
    .toLowerCase()
    .normalize('NFD')  // ğ→g, ü→u, ö→o, ç→c, ş→s, ı→i
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Yasal sonek kaldır
  const suffixes = [
    'inc.?', 'corp.?', 'corporation', 'ltd.?', 'limited',
    'llc', 'llp', 'gmbh', 'ag', 'sa', 'as', 'oy',
    'b.v.', 'n.a.', 'p.l.c.', 'plc'
  ];

  let clean = normalized;
  for (const suffix of suffixes) {
    clean = clean.replace(new RegExp(`\\s+${suffix}$`), '');
  }

  // Yaygın kısaltmalar geri açılmıştır
  const abbreviations = {
    'co\\.?': 'company',
    'intnl': 'international',
    'mgmt': 'management',
    'fin\\.?': 'financial',
    'nat\\.?': 'national'
  };

  Object.entries(abbreviations).forEach(([abbr, full]) => {
    clean = clean.replace(new RegExp(abbr, 'gi'), full);
  });

  return clean;
}

// Örnekler:
normalizeCompanyName("JPMorgan Chase & Co.")
  → "jpmorgan chase"

normalizeCompanyName("Deutsche Bank AG")
  → "deutsche bank"

normalizeCompanyName("Southern Trust Comp., Inc.")
  → "southern trust company"
```

### 2. Named Entity Recognition (NER)

**Amaç:** Belge içinden kuruluş adlarını otomatik çıkarma

```python
import spacy
from presidio_analyzer import AnalyzerEngine

nlp = spacy.load("en_core_web_sm")
analyzer = AnalyzerEngine()

text = """
Southern Trust Company, Inc. made a transfer to Deutsche Bank AG
on behalf of International Business Machines (IBM).
"""

doc = nlp(text)
organizations = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
# → ["Southern Trust Company, Inc.", "Deutsche Bank AG", "IBM"]
```

### 3. Entity Linking (Wikidata/DBpedia)

Çıkarılan adları bilgi tabanlarına bağla:

```python
import requests

def link_to_wikidata(company_name: str):
    """Şirket adını Wikidata'ya bağla"""
    params = {
        "language": "en",
        "search": company_name,
        "type": "item",
        "limit": 1
    }

    response = requests.get(
        "https://www.wikidata.org/w/api.php",
        params=params
    )

    results = response.json()["search"]
    if results:
        return {
            "wikidata_id": results[0]["id"],
            "label": results[0]["label"],
            "match_score": calculate_similarity(company_name, results[0]["label"])
        }
```

### 4. Çok-Dilli Eşleştirme

```typescript
// Epstein dosyası: İspanyol, İtalyan, Fransız, Almanca adlar içeriyor
const multilingualNormalize = (name: string, language: string) => {
  const rules: Record<string, Record<string, string>> = {
    "de": { "gmbh": "gesellschaft mit beschraenkter haftung", "ag": "aktiengesellschaft" },
    "fr": { "sarl": "societe a responsabilite limitee", "sa": "societe anonyme" },
    "es": { "s.l.": "sociedad limitada", "s.a.": "sociedad anonima" },
    "it": { "srl": "societa a responsabilita limitata", "spa": "societa per azioni" }
  };

  let normalized = normalizeCompanyName(name);

  if (rules[language]) {
    Object.entries(rules[language]).forEach(([abbr, full]) => {
      normalized = normalized.replace(new RegExp(abbr, 'gi'), full);
    });
  }

  return normalized;
};
```

---

## FINANSAL UYUM ARAÇLARI

### AML/KYC Sektörü Uygulamaları

Refinitiv (World-Check), Dow Jones, LexisNexis gibi kurumsal araçlar özel algoritmaları kullanır:

**1. Weighted Ensemble Matching**
- Levenshtein (0.35 ağırlık)
- Jaro-Winkler (0.30 ağırlık)
- TF-IDF Cosine (0.20 ağırlık)
- Phonetic match (0.15 ağırlık)
- **Toplam puan = 0-1 arasında**

```typescript
function ensembleMatchScore(
  candidate: string,
  reference: string
): number {
  const candidates_norm = normalizeCompanyName(candidate);
  const reference_norm = normalizeCompanyName(reference);

  const levenshtein = 1 - (levenshteinDistance(candidates_norm, reference_norm) /
    Math.max(candidates_norm.length, reference_norm.length));

  const jaroWinkler = jaroWinklerSimilarity(candidates_norm, reference_norm);
  const cosineTF = cosineSimilarity(
    tfidf(candidates_norm.split(' ')),
    tfidf(reference_norm.split(' '))
  );
  const phonetic = soundexMatch(candidates_norm, reference_norm) ? 0.95 : 0.0;

  const score =
    0.35 * levenshtein +
    0.30 * jaroWinkler +
    0.20 * cosineTF +
    0.15 * phonetic;

  return Math.min(1.0, score);  // 0-1 aralığında sınırla
}

// Örnek
ensembleMatchScore("J.P. Morgan & Co.", "JPMorgan Chase Bank, N.A.")
// → 0.87 (eşikten ÜSTÜ → uyarı bayrağı)
```

**2. Yaratıcı Kısaltma Haritaları**

```typescript
const knownAbbreviations = {
  "JPMorgan": [
    "JP Morgan",
    "J.P. Morgan",
    "JPMorgan Chase",
    "JP Morgan & Co.",
    "Chase Manhattan Bank"  // Tarihi birleşme
  ],
  "Deutsche Bank": [
    "DB",
    "Deutsche Bank AG",
    "Deutsche-Bank",
    "DB AG"
  ]
};

// Bulma
const findKnownVariants = (name: string) => {
  const normalized = normalizeCompanyName(name);

  for (const [canonical, variants] of Object.entries(knownAbbreviations)) {
    if (variants.some(v =>
      normalizeCompanyName(v) === normalized
    )) {
      return canonical;
    }
  }

  return null;
};
```

**3. Rate-Limiting ve Dynamik Eşikleme**

```typescript
// Agresif eşik küçük, muhafazakar büyük fakat
const getMatchingThreshold = (
  source: "official" | "leaked" | "deposition" | "inferred"
): number => {
  switch(source) {
    case "official": return 0.92;  // SEC EDGAR, gov kayıtları
    case "leaked": return 0.88;     // Panama Papers, vb.
    case "deposition": return 0.85; // Mahkeme belgeleri
    case "inferred": return 0.80;   // AI çıkarımı
    default: return 0.90;
  }
};
```

---

## SAHTE KURULUŞLAR VE GİZLEME DESENLERI

### Epstein Ağında Gözlemlenen Modeller

#### 1. Nominal Direktörlük

```
Şirket A (Cayman)
├─ Yönetici: John Smith (nominal, asil sahip değil)
│
Şirket B (BVI)
└─ Yönetici: John Smith (aynı kişi, farklı yargı)

→ Veri Tablosu: İlişkiler tablosu bu bağlantıyı gösterir
→ Uyarı: Aynı yönetici, çok fazla kuruluş = "kapa sahipliği"
```

#### 2. Coğrafi Katmanlaştırma

```
1. Operasyonel: "Southern Trust Company" (Nassau, Bahamas)
2. Holding: "Southern Trust Ltd." (Grand Cayman)
3. Hukuki Başvuru: "Southern Trust Investments, Inc." (Nevis)

Kasten Kafa karıştırıcı adlandırma:
- Her biri AYNI varlığa aittir
- Her biri farklı yargı kurallarından yararlanır
- OpenCorporates 3 ayrı kayıt gösterir
```

#### 3. Erişilmesi Zor Ad Değişiklikleri

```
Orijinal: "Coastal Finance Limited"
↓ (2015)
"Coastal Financial Services Limited"
↓ (2017)
"Coastal Capital Management Ltd"
↓ (2019, Fesih)
Gözden kayboluyor

Bulma: coğrafi + yönetici yolu kullanılır
```

#### 4. Kaldırılmış Varlıklar

```
Veri hiyerarşisi:
- OpenCorporates: fesih tarihi kayıt eder
- Panama Papers: kesin tarihli bağlantılar
- Mahkeme kayıtları: hukuki referanslar

→ "Şirket X 2014'te feshedildi AMA Epstein 2015'te bunun hesabında para var"
```

### Algılama Algoritması

```typescript
interface SuspiciousPattern {
  name: string;
  red_flags: number;
  jurisdictions: string[];
  shared_directors: string[];
  unusual_transactions: boolean;
}

function calculateSuspicion(entity: Entity): SuspiciousPattern {
  const flags: string[] = [];
  let score = 0;

  // Bayrağı 1: High-Risk Yargı
  const highRiskJurisdictions = ["BVI", "Cayman", "Panama", "Seychelles"];
  if (highRiskJurisdictions.includes(entity.jurisdiction)) {
    flags.push("high_risk_jurisdiction");
    score += 0.15;
  }

  // Bayrağı 2: Nominal Direktörlük Deseni
  if (entity.directors?.length === 1 && entity.directors[0].is_nominee) {
    flags.push("single_nominee_director");
    score += 0.20;
  }

  // Bayrağı 3: Çoklu Ad Varyasyonu
  if (entity.aliases && entity.aliases.length > 3) {
    flags.push("excessive_naming_variations");
    score += 0.10;
  }

  // Bayrağı 4: Gizli İşletme (resmi vergi yok)
  if (entity.filing_frequency === "none") {
    flags.push("no_financial_reporting");
    score += 0.15;
  }

  // Bayrağı 5: Kısa Ömür
  if (entity.active_years < 2) {
    flags.push("short_operational_lifespan");
    score += 0.10;
  }

  return {
    name: entity.name,
    red_flags: score,
    jurisdictions: entity.jurisdictions || [],
    shared_directors: entity.shared_directors || [],
    unusual_transactions: score > 0.50
  };
}
```

---

## ICIJ METODOLOJİSİ

### Panama/Paradise/Pandora Kağıtları Vaka Çalışması

**Ölçek:**
- 2.9 TB bilgi
- 11.9 milyon belge
- 1.5 milyon kayıt
- ~5 milyon takma ad
- 380+ gazeteci, 45+ ülke

### Teknoloji Yığını

```
Panama Papers (2016)
└─ Toplama: Apache Solr + Tika (metadata çıkarma)
   └─ Depolama: Neo4j Graph Database
      └─ Sorgu: Blacklight (web portal)
         └─ Keşif: Approximate String Matching (fuzzy)
            └─ İşbirliği: GitHub + Wiki (veri paylaşımı)
```

### Entity Resolution İş Akışı

**FAZE 1: NER Çıkarma**
```
Belge → Apache Tika → Metin çıkarımı
          ↓
       Spacy NLP → ORG, PERSON, LOC varlıkları
          ↓
       Tıkayıcı: Tanınan adlar depolanır
```

**FAZE 2: Bağlantı Analizi**
```
Varlıklar → OpenCorporates API çağrıları
     ↓
Kısaltma yöneticisi bağlantıları
     ↓
Neo4j: İlişki grafiği oluştur
     ↓
Merkezi çizgi algoritmaları: Anahtar oyuncuları belirle
```

**FAZE 3: Gazeteci Doğrulaması**
```
Otomatik eşleşmeler → "Olası bağlantı" bayrağı
          ↓
Gazeteciye: "Bu eşleştirilmiş mi?"
          ↓
Doğrulandı: Grafiğe kilitlendi
Reddedildi: False positive kalıpları ML'yi eğitir
```

**ICIJ Başarı Metrikleri:**
- 4000+ muhabir tarafından 150+ yayına sahip hikayeler
- 700+ siyasi ve hükümet yetkilisinin ortaya çıkarılması
- 1 milyar dolarlık vergi kaçakçılığı bulunması

---

## AÇIK KAYNAK ARAÇLARI

### 1. OpenRefine + OpenCorporates Reconciliation

**Kurulum:**
```bash
# OpenRefine indirme: https://openrefine.org/
unzip openrefine-linux-3.7.3.tar.gz
./refine -p 3333

# Tarayıcıya git: http://localhost:3333
```

**Reconciliation Yapılandırması:**
```
1. Veri yükle (CSV: company_name sütunu)
2. Başlık seç → Reconcile → Başka hizmet kullan
3. URL gir: https://api.opencorporates.com/v0.4/reconcile
4. Reconciliation başla (otomatik fuzzy match)
5. Sonuçları gözden geçir + onayını
```

**Avantajlar:**
- Ücretsiz, açık kaynak
- OpenCorporates ile doğrudan entegrasyon
- 10K+ kayıt hızlı işlenebilir

**Sınırlamalar:**
- 100K+ kayıt yavaş (batch boyutu sınırı)
- ML yetenekleri yok
- Önceden kurulmuş ağırlık vektörleri yok

### 2. FuzzyWuzzy (Python)

```python
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Basit eşleştirme
ratio = fuzz.token_sort_ratio(
    "JPMorgan Chase Bank, N.A.",
    "JP Morgan & Co."
)
print(f"Benzerlik: {ratio}%")  # ≈ 75%

# Birden fazla adaydan en iyi eşleşmeyi bulma
choices = [
    "JPMorgan Chase Bank, N.A.",
    "JP Morgan & Co.",
    "J.P. Morgan International",
    "Morgan Stanley Bank"
]

best_match = process.extractOne(
    "JPMorgan Chase",
    choices,
    scorer=fuzz.token_set_ratio
)
print(best_match)
# → ('JPMorgan Chase Bank, N.A.', 95)
```

### 3. RapidFuzz (FuzzyWuzzy'den 10x Hızlı)

```python
from rapidfuzz import fuzz, process

# Ölçeklenebilir matching
companies = ["Deutsche Bank AG", "DB AG", "Deutsche-Bank AG", ...]

matcher = process.cdist(
    "Deutsche Bank",
    companies,
    scorer=fuzz.token_sort_ratio,
    processor=None,
    score_cutoff=0.8
)
# → Liste halinde tüm eşleşmeler
```

### 4. PolyFuzz (Makine Öğrenme Destekli)

```python
from polyfuzz import PolyFuzzer
from polyfuzz.models import EditDistance, TfidfVectorizer

# Ensemble matching
model = PolyFuzzer([
    EditDistance(),
    TfidfVectorizer()
])

company_names = ["JPMorgan Chase", "Deutsche Bank AG", ...]
company_reference = ["JP Morgan", "DB AG", ...]

matches = model.match(company_names, company_reference)
matches.get_matches()
```

### 5. Fuzzymatcher (Pandas DataFrame Bağlama)

```python
from fuzzymatcher import link_table, fuzzy_left_join

# İki DataFrame'i fuzzy bağla
df_suspects = pd.read_csv("suspect_orgs.csv")
df_registry = pd.read_csv("opencorporates_export.csv")

# Fuzzy eşleştirme
linked = fuzzy_left_join(
    df_suspects,
    df_registry,
    left_on="org_name",
    right_on="company_name"
)

print(linked[["org_name", "company_name", "match_score"]])
```

---

## EMBEDDING VE ANLAMBILIM

### CompanyName2Vec Yaklaşımı

**İdea:** Şirket adlarını anlambilim vektörlerine dönüştür (Word2Vec benzeri):

```python
from gensim.models import Word2Vec
import numpy as np

# Eğitim verisi: Bilinen şirket çiftleri
training_pairs = [
    ["JPMorgan", "Chase"],
    ["Deutsche", "Bank"],
    ["Southern", "Trust", "Company"],
    ...
]

# Model eğit
model = Word2Vec(
    training_pairs,
    vector_size=100,
    window=5,
    min_count=1,
    workers=4
)

# Benzerlik hesapla
def company_similarity(name1, name2):
    """Şirket adlarının anlambilim benzerliğini hesapla"""
    tokens1 = name1.lower().split()
    tokens2 = name2.lower().split()

    # Her token için vektör al
    vec1 = np.mean([model.wv[t] for t in tokens1 if t in model.wv], axis=0)
    vec2 = np.mean([model.wv[t] for t in tokens2 if t in model.wv], axis=0)

    # Cosine benzerliği
    from sklearn.metrics.pairwise import cosine_similarity
    return cosine_similarity([vec1], [vec2])[0][0]

# Test
print(company_similarity("J.P. Morgan", "JPMorgan Chase"))
# → 0.87 (vektör tabanlı benzerlik)
```

### Kontekst Duyarlı Embedding (BERT)

Daha karmaşık veri seti için:

```python
from sentence_transformers import SentenceTransformer, util

# Ön-eğitilmiş model yükle
model = SentenceTransformer('all-MiniLM-L6-v2')

# Şirket adlarını embed et
companies = [
    "JPMorgan Chase Bank, N.A.",
    "JP Morgan & Co.",
    "Deutsche Bank AG"
]

embeddings = model.encode(companies, convert_to_tensor=True)

# Benzerlik matrisi
similarities = util.pytorch_cos_sim(embeddings, embeddings)
print(similarities)

# Çıktı:
# tensor([
#   [1.0000, 0.92, 0.15],   # JP Morgan benzerler
#   [0.92,   1.0000, 0.14],
#   [0.15,   0.14,   1.0000]
# ])
```

---

## ADRES VE YARGÎ AYRIMCILIĞI

### Problem

```
"Trust Company A" → Florida, USA (SEC kayıtlı)
"Trust Company A" → Cayman Islands (offshore)

AYNI AD, FAKİ KURUMLAR → Biçim ayırımcılığı gerekli
```

### Çözüm

```typescript
interface DisambiguatedEntity {
  canonical_name: string;
  jurisdiction: string;
  registered_address: string;
  incorporation_date: Date;
  opencorporates_id: string;
  // Composite unique key:
  unique_key: string;  // "canonical_name + jurisdiction + reg_address"
}

function createUniqueKey(entity: DisambiguatedEntity): string {
  // 3 seviye ayırımcılık
  const normalized_name = normalizeCompanyName(entity.canonical_name);
  const jurisdiction_code = entity.jurisdiction.substring(0, 2).toUpperCase();
  const address_hash = sha256(entity.registered_address).substring(0, 8);

  return `${normalized_name}|${jurisdiction_code}|${address_hash}`;
}

// Örnek:
// "Trust Company A" (Florida)
// → "trust company a|us|a1b2c3d4"
//
// "Trust Company A" (Cayman)
// → "trust company a|ky|x9y8z7w6"
//
// AYNI AD FAKAT FARKLI VARLIQ
```

### Adres Doğrulama

```typescript
function validateAddressFormat(address: string, jurisdiction: string): boolean {
  const rules: Record<string, RegExp> = {
    "US": /^\d+\s[\w\s]+,\s[A-Z]{2}\s\d{5}$/,  // 123 Main St, CA 90210
    "GB": /^[A-Z]{1,2}\d{1,2}\s\d[A-Z]{2}$/,   // SW1A 1AA
    "DE": /^\d{5}\s[\w\s]+$/,                    // 10115 Berlin
    "KY": /^KY\d{5}$|^[A-Z]{2}\d{3}$/          // Cayman postcode
  };

  const rule = rules[jurisdiction.substring(0, 2).toUpperCase()];
  return rule ? rule.test(address) : true;  // Fallback: kabul et
}

// Şüpheli: Cayman şirketi Florida adresinde
if (entity.jurisdiction === "KY" && address.includes("Florida")) {
  flagSuspicious("jurisdiction_mismatch_address");
}
```

---

## DENİZAŞIRI DESENLERI

### Tipik Struktur: Epstein Benzeri

```
Seviye 1: Operasyon
├─ "Southern Trust Company" (Nassau, Bahamas)
│  - Gerçek muhasebeci ve bankaya bağlı
│  - Tüm belgeleri buradan geçer
│  - Yönetici: Nominal A, Nominal B

Seviye 2: Tutma
├─ "Southern Trust Cayman Holdings" (Cayman Islands)
│  - Seviye 1'in sahibi
│  - Varlıkları Cayman kanununun altında tutar
│  - Yönetici: Nominal C (farklı ülke)

Seviye 3: Gizleme
├─ "Southern Trust Investments, Inc." (Nevis)
│  - Seviye 2'nin sahibi
│  - Hukuki başvuru için - Nevis'in sıkı gizlilik kuralları
│  - Yönetici: Nominal D (üçüncü ülke)

Kökleri:
└─ Asıl malık: [Yardımcı Adlar Gereken]
```

### Benzetim Analizi

```typescript
const jurisdictionRiskScore: Record<string, number> = {
  "US": 0.1,
  "GB": 0.15,
  "DE": 0.2,
  "KY": 0.8,      // Cayman - yüksek risk
  "PA": 0.9,      // Panama - çok yüksek risk
  "BV": 0.85,     // BVI - yüksek risk
  "SC": 0.8,      // Seychelles - yüksek risk
  "NV": 0.75      // Nevis - yüksek risk
};

function analyzeOffshoreStructure(entities: Entity[]): Analysis {
  // Multi-level seviyelerini algıla
  const groupedByDirector = _.groupBy(entities, 'director');

  for (const [director, subs] of Object.entries(groupedByDirector)) {
    if (subs.length > 3) {
      const jurisdictions = subs.map(s => s.jurisdiction);
      const riskScores = jurisdictions.map(j => jurisdictionRiskScore[j]);
      const avgRisk = _.mean(riskScores);

      if (avgRisk > 0.7) {
        return {
          pattern: "potential_offshore_chain",
          shared_director: director,
          entity_count: subs.length,
          jurisdictions,
          risk_score: avgRisk,
          recommendation: "INSAN DOĞRULAMASI GEREKLI"
        };
      }
    }
  }
}
```

### Nominal Direktörlük Tespiti

```typescript
interface DirectorProfile {
  name: string;
  entity_count: number;
  jurisdictions: Set<string>;
  is_nominee: boolean;
  red_flags: string[];
}

function analyzeDirector(director: string, entities: Entity[]): DirectorProfile {
  const directorEntities = entities.filter(e => e.director === director);

  const flags: string[] = [];

  // Bayrak: Çok fazla kuruluş aynı yöneticide
  if (directorEntities.length > 5) {
    flags.push("controls_excessive_entities");
  }

  // Bayrak: Birden fazla yargı
  const jurisdictions = new Set(directorEntities.map(e => e.jurisdiction));
  if (jurisdictions.size > 3) {
    flags.push("multi_jurisdiction_control");
  }

  // Bayrak: Yaygın nominal adlar
  const nominalNames = ["John Smith", "Jane Doe", "Manager", "Director"];
  if (nominalNames.includes(director)) {
    flags.push("generic_nominal_name");
  }

  // Bayrak: Hiç kişisel belge yok (sosyal medya, haberler, vb.)
  if (!hasPersonalFootprint(director)) {
    flags.push("no_personal_footprint");
  }

  return {
    name: director,
    entity_count: directorEntities.length,
    jurisdictions,
    is_nominee: flags.length > 2,
    red_flags: flags
  };
}
```

---

## UYGULAMA MİMARİSİ

### Denetim-Sürü Tasarımı

Project Truth için önerilen **3 seviyeli** eşleştirme:

```
Kullanıcı: Yeni kuruluş adı giriş
    ↓
[FAZE 1] OTOMATİK ESLEŞTİRME (< 100ms)
├─ Yerel cache kontrolü
├─ OpenCorporates API çağrısı
├─ Ensemble scoring (4 algoritma)
└─ 0.85+ skor → Otomatik onay, < 0.85 → Faze 2

    ↓
[FAZE 2] SEMİ-OTOMATİK (Gazeteci Doğrulaması)
├─ Aday listesi göster (top 3)
├─ "Bu mı?" sorusu sor
├─ Gazeteci seçim yap
└─ Doğrulanmış varlık → Denetim izi kaydı

    ↓
[FAZE 3] İNSAN DOĞRULMASI (Şüpheli Durumlar)
├─ Hukuk müşaviri koşul-incelemesi
├─ Sahte kuruluş bayrakları (5+ risk bayrağı)
├─ Denizaşırı zincirleri (multi-level)
└─ Karar: Ağa ekle / Karantinaya al / Reddet
```

### Veritabanı Şeması

```sql
-- Ana tablo
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  -- Kanonik form
  canonical_name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,  -- Fuzzy match için

  -- Kaynaklar
  opencorporates_id TEXT UNIQUE,
  lei TEXT UNIQUE,
  sec_cik TEXT,

  -- Coğrafya
  jurisdiction VARCHAR(2),
  registered_address TEXT,
  country_code VARCHAR(2),

  -- Durumlar
  status VARCHAR(20),  -- active / dissolved / suspended
  incorporation_date DATE,
  dissolution_date DATE,

  -- Meta
  entity_type VARCHAR(50),  -- company / foundation / trust / fund
  confidence_score FLOAT,  -- 0-1 eşleştirme skoru
  verification_level VARCHAR(20),  -- official / documented / inferred

  -- Denetim
  verification_source TEXT,  -- gazeteci ID veya "auto"
  verification_notes TEXT,

  CONSTRAINT check_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- İlişkiler
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY,
  parent_entity_id UUID REFERENCES entities(id),
  child_entity_id UUID REFERENCES entities(id),
  relationship_type VARCHAR(50),  -- director_of / subsidiary_of / etc
  source VARCHAR(50),  -- opencorporates / panama_papers / icij
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yöneticiler (Nominal Tespiti)
CREATE TABLE entity_directors (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  director_name TEXT NOT NULL,
  director_normalized TEXT NOT NULL,
  is_nominee BOOLEAN,
  appointed_date DATE,
  removed_date DATE,
  nationality TEXT,
  red_flags TEXT[]  -- ["generic_name", "multi_jurisdiction", ...]
);

-- Denetim Izi
CREATE TABLE entity_audit_log (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  action VARCHAR(50),  -- created / matched / verified / rejected
  actor_type VARCHAR(20),  -- system / journalist / lawyer
  actor_id TEXT,
  notes TEXT,
  source_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_entities_normalized ON entities(name_normalized);
CREATE INDEX idx_entities_jurisdiction ON entities(jurisdiction);
CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_relationships_parent ON entity_relationships(parent_entity_id);
CREATE INDEX idx_directors_entity ON entity_directors(entity_id);
```

### API Endpoint'leri

```typescript
// POST /api/entities/resolve
// Giriş: { name: string }
// Çıktı: { candidates: [...], confidence: number, verified: boolean }

interface ResolveRequest {
  name: string;
  jurisdiction?: string;  // İsteğe bağlı ipucu
  context?: {
    related_entities?: string[];
    transaction_amount?: number;
    transaction_date?: Date;
  };
}

interface ResolveResponse {
  candidates: Array<{
    entity_id: string;
    canonical_name: string;
    opencorporates_id?: string;
    jurisdiction: string;
    score: number;
    verification_level: "official" | "documented" | "inferred";
    red_flags: string[];
  }>;
  matching_method: "exact" | "fuzzy_autocorp" | "ensemble" | "manual";
  confidence: number;  // 0-1
  requires_human_verification: boolean;
}

// POST /api/entities/{id}/verify
// Doğrulama işlemi (gazeteci/avukat)

interface VerifyRequest {
  verified: boolean;  // true = ağa ekle, false = reddet
  notes?: string;
  verifier_id: string;
  verifier_role: "journalist" | "lawyer" | "admin";
}

// GET /api/entities/{id}/relationships
// Belirtilen varlığa bağlı tüm ilişkileri getir

interface RelationshipsResponse {
  entity: Entity;
  upstream: Entity[];   // Sahipleri / Holding şirketler
  downstream: Entity[]; // Subsidiaries / Kontrol ettikleri
  lateral: Entity[];    // Aynı yöneticide kuruluşlar
}
```

---

## ÖNERILEN ÇÖZÜM YIĞINI

### Tier 1: MVP (Week 1-2)

```
✓ Fuzzy Matching Altyapısı
├─ FuzzyWuzzy + Levenshtein entegrasyonu
├─ Ad normalizasyonu (sonek kaldırma, kısaltma)
├─ Basit Ensemble (2 algoritma)
└─ Eşik: 0.85+ otomatik, < 0.85 manuel

✓ OpenCorporates Entegrasyonu
├─ API anahtarı kurulumu
├─ Batch arama yapacak istemci
└─ Sonuç ön-filtrelemesi

✓ UI: Doğrulama Paneli
├─ Adaylar listesi + radyo butonları
├─ "Doğru değil, manuel gir" seçeneği
└─ Denetim izi (kim, ne zaman doğruladı)
```

### Tier 2: Gelişmiş Matching (Week 3-4)

```
✓ Ensemble Scoring
├─ 4 algoritma (Levenshtein, JW, TF-IDF, Phonetic)
├─ Ağırlık vektörleri: kaynağa göre dinamik
└─ Çıktı: 0-1 güven skoru

✓ Adres + Yargı Ayırımcılığı
├─ Coğrafi eşleşme doğrulaması
├─ İlişkiler tablosu → nominal direktörlük tespiti
└─ Red flag skoru (0-1)

✓ Entity Linking
├─ Wikidata bağlantıları (resmi şirketler)
├─ Wikipedia cross-referencing
└─ İtibaren boost (+0.2 if Wikidata'da)
```

### Tier 3: AI-Destekli Doğrulama (Week 5-6)

```
✓ LLM Doğru Mu Sorusu
├─ Groq LLama-3.3-70b ile contextual matching
├─ "Bu JPMorgan Chase ve JP Morgan aynı mı?" → AI yanıtı
└─ Gazeteci onayı ile yapılmış sorguların fine-tuning

✓ Embedding Benzerlikleri
├─ Word2Vec veya BERT üzerine Şirket adları
├─ Anlambilim benzerliği (0-1)
└─ Ensemble'a katılma (0.10 ağırlık)

✓ Denizaşırı Struktur Tespiti
├─ Multi-level algılama
├─ Nominal direktörlük otomatik bayrak
└─ Hukuk müşaviri eskalasyonu
```

### Tech Stack Özeti

```
Frontend:
- React + TypeScript
- TanStack Query (API state)
- Zustand (UI state)
- Shadcn UI (components)

Backend:
- Next.js 16 API Routes
- Supabase PostgreSQL
- Groq LLM API

Matching Altyapısı:
- FuzzyWuzzy / RapidFuzz (Python / Node.js)
- scikit-learn (TF-IDF, cosine)
- OpenCorporates API (kayıt)
- Neo4j (ilişki grafikleri)

DevOps:
- GitHub Actions (CI/CD)
- Vercel (Frontend deploy)
- Docker (Python matching microservice)
```

---

## KAYNAKLAR

### Algoritmalar ve Benzerlik Metrikleri

1. [AWS Entity Resolution](https://aws.amazon.com/entity-resolution/)
2. [Name Matching Model for Entity Resolution (Medium, December 2025)](https://medium.com/@vietexob/name-matching-model-for-entity-resolution-part-1-2d8362a5ed05)
3. [Jaro-Winkler vs. Levenshtein in AML Screening](https://www.flagright.com/post/jaro-winkler-vs-levenshtein-choosing-the-right-algorithm-for-aml-screening)
4. [Comparison of String Distance Metrics for Name-Matching Tasks (CMU)](https://www.cs.cmu.edu/~wcohen/postscript/ijcai-ws-2003.pdf)
5. [Fuzzy Matching Algorithms (Tilores)](https://tilores.io/fuzzy-matching-algorithms)

### Kurumsal Kayıtlar ve Başvuru

6. [OpenCorporates API Reference v0.4.8](https://api.opencorporates.com/documentation/API-Reference)
7. [Following the Money with OpenCorporates API (Bellingcat, August 2023)](https://www.bellingcat.com/resources/2023/08/24/following-the-money-a-beginners-guide-to-using-the-opencorporates-api/)
8. [OpenCorporates Blog: Entity Verification (November 2024)](https://blog.opencorporates.com/2024/11/28/opencorporates-data-in-entity-verification/)
9. [OpenCorporates Knowledge Base: Fetching a Company](https://knowledge.opencorporates.com/knowledge-base/fetching-a-company/)

### Yasal Varlık Tanımlayıcıları

10. [ISO 17442: The Global Standard - GLEIF](https://www.gleif.org/en/organizational-identity/introducing-the-legal-entity-identifier-lei/iso-17442-the-lei-code-structure)
11. [Legal Entity Identifier (Wikipedia)](https://en.wikipedia.org/wiki/Legal_Entity_Identifier)
12. [Office of Financial Research: LEI FAQs](https://www.financialresearch.gov/data/legal-entity-identifier/faqs/)

### NLP ve Entity Linking

13. [Entity Linking (Wikipedia)](https://en.wikipedia.org/wiki/Entity_linking)
14. [Entity Linking Progress (NLP-progress)](http://nlpprogress.com/english/entity_linking.html)
15. [SEC EDGAR Company Name Normalization (John Snow Labs)](https://nlp.johnsnowlabs.com/2022/08/30/legel_edgar_company_name_en.html)
16. [Using Entity Linking to Turn Your Graph into a Knowledge Graph (Ontotext)](https://www.ontotext.com/blog/using-entity-linking-to-turn-your-graph-into-a-knowledge-graph/)

### Finansal Uyum

17. [Best AML Software Solutions 2025 (ComplyAdvantage)](https://complyadvantage.com/insights/best-aml-software-in-us/)
18. [Top KYC AML Platforms 2025 (Cascade AML)](https://cascade.lu/resources/top-kyc-aml-platforms-2025/)
19. [LexisNexis: KYC AML Compliance](https://risk.lexisnexis.co.uk/see-what-matters/kyc-aml-compliance)

### Sahte Kuruluşlar ve Denizaşırı

20. [Finding Shell Companies: Global Geography (Bahamas AML Conference, March 2024)](https://bahamasamlconference.centralbankbahamas.com/documents/2024-03-26-15-05-30-Session-1---Mapping-the-Global-Geography-of-Shell-Companies.pdf)
21. [Tracking Shell Companies to Their Secret Owners (GIJN)](https://gijn.org/stories/tracking-shell-companies-secret-owners/)
22. [ICIJ Offshore Leaks Database](https://offshoreleaks.icij.org/)
23. [Shell Companies and Money Laundering (ComplyAdvantage)](https://complyadvantage.com/insights/aml-carribbean-ubos-shell-companies/)
24. [Understanding the Role of Nominee Directors in Offshore Companies (Uniwide)](https://www.uniwide.com/articles/understanding-the-role-of-a-nominee-director-in-offshore-companies/)

### ICIJ Metodolojisi

25. [Panama Papers Investigation Using Entity Resolution (guitton.co)](https://guitton.co/posts/entity-resolution-entity-linking)
26. [ICIJ Panama Papers with Linkurious (Linkurious Blog)](https://linkurious.com/blog/panama-papers-how-linkurious-enables-icij-to-investigate-the-massive-mossack-fonseca-leaks/)
27. [ICIJ Case Study: Graph Database & Analytics (Neo4j)](https://neo4j.com/case-studies/the-international-consortium-of-investigative-journalists-icij/)
28. [How ICIJ Deals with Data Dumps (DataJournalism.com)](https://datajournalism.com/read/handbook/two/working-with-data/how-icij-deals-with-huge-data-dumps-like-the-panama-and-paradise-papers)

### Açık Kaynak Araçları

29. [OpenRefine Reconciliation Manual](https://openrefine.org/docs/manual/reconciling)
30. [ROR OpenRefine Reconciler](https://ror.readme.io/docs/openrefine-reconciler)
31. [FuzzyWuzzy GitHub (Cheukting)](https://github.com/Cheukting/fuzzy-match-company-name)
32. [Fuzzy Name Matching in Python (Medium)](https://medium.com/@ammubharatram/fuzzy-name-matching-comparing-customer-names-with-watchlist-entities-as-part-of-name-sanctions-fed922b3f772)
33. [Python Tools for Record Linking (Practical Business Python)](https://pbpython.com/record-linking.html)

### Graph Veritabanları

34. [Combating Money Laundering with Neo4j AML Algorithms](https://neo4j.com/blog/fraud-detection/combating-money-laundering-aml-graph-algorithms/)
35. [Entity Resolution with Neo4j](https://neo4j.com/developer/industry-use-cases/finserv/retail-banking/entity-resolution/)
36. [How to Improve AML Investigation Using Neo4j](https://go.neo4j.com/how-to-improve-anti-money-laundering-investigation-using-neo4j-lp.html)

### OSINT Araçları

37. [ShadowDragon OSINT Platform](https://shadowdragon.io/)
38. [Maltego Platform for OSINT](https://www.maltego.com/)
39. [OSINT Techniques: Complete List 2026 (ShadowDragon)](https://shadowdragon.io/blog/osint-techniques/)

### Embedding ve Anlambilim

40. [CompanyName2Vec: Company Entity Matching Based on Job Ads (arXiv)](https://arxiv.org/pdf/2201.04687)
41. [Word Embeddings for Fuzzy Matching (Babel Street)](https://www.babelstreet.com/blog/word-embeddings-for-fuzzy-matching-of-organization-names/)
42. [TF-IDF and Cosine Similarity (Chan's Jupyter)](https://goodboychan.github.io/python/datacamp/natural_language_processing/2020/07/17/04-TF-IDF-and-similarity-scores.html)
43. [Cosine Similarity and TF-IDF (Medium)](https://medium.com/web-mining-is688-spring-2021/cosine-similarity-and-tfidf-c2a7079e13fa)

### Adres ve Yargı Ayrımcılığı

44. [Address Formats by Country (Geoapify)](https://www.geoapify.com/address-formats-by-country-json/)
45. [5 Commonly Used Terms in International Address Validation (ServiceObjects)](https://www.serviceobjects.com/blog/five-commonly-used-terms-and-definitions-in-international-address-validation-systems)

---

## SONUÇ VE TAVSIYELERI

### Kısa Vadeli Öneriler (Aylar)

1. **MVP: OpenCorporates + FuzzyWuzzy**
   - Minimum 0.85 eşik, < 0.85 gazeteci doğrulaması
   - Veri kaynağı: ICIJ Offshore Leaks, Panama Papers
   - İlk hedef: 100+ Epstein ağı kuruluşu eşleştir

2. **Denetim Izi Tutulması**
   - Her eşleştirme: kim, ne zaman, ne skor ile
   - Hukuk müşaviri onayı 50+ entity için
   - İdeal: Davalar için kanit olacak kalite

3. **Açık Kaynak Ekosisteminden Faydalan**
   - OpenCorporates: Ücretsiz resmi kaydı
   - RapidFuzz: FuzzyWuzzy'den 10x hızlı
   - OpenRefine: Toplu işlem için

### Orta Vadeli Öneriler (3-6 Ay)

4. **Ensemble Scoring**
   - 4+ algoritmanın ağırlıklı kombinasyonu
   - Kaynağa göre dinamik eşikler (SEC vs Panama Papers)
   - Denetim izi: hangi algoritma neyi eşleştirdi?

5. **Denizaşırı Struktur Tespiti**
   - Multi-level algılama (3+ seviye)
   - Nominal direktörlük otomatik bayrak
   - Risk skoru: BVI/Panama > USA > EU

6. **Graph Veritabanı (Neo4j)**
   - İlişkiler, yöneticiler, nominal sahiplikler
   - Merkezi çizgi algoritmaları: anahtar oyuncu tespiti
   - Soruşturma görselleştirmesi

### Uzun Vadeli Vizyon (6-12 Ay)

7. **AI-Destekli Doğrulama**
   - Groq LLM ile kontekstual matching
   - Fine-tuning: gazeteci doğrulamaları → öğren
   - Embedding benzerlikleri (BERT tabanlı)

8. **Otonom Tarama**
   - Yeni belgeler → NER çıkarma → fuzzy match
   - ICIJ, OpenSanctions, CourtListener otomatik senkronizasyonu
   - Topluluk doğrulaması ekonomisi

9. **Merkezi Olmayan Doğrulama**
   - Katılımcı ağı: gazeteciler, hukuk müşavirleri, araştırmacılar
   - Reputation sistemi: doğru eşleştirmeler = kazanç
   - Sonuç: Serbest, denetim-denetçili, kanun uyumlu eşleştirme altyapısı

---

**Son Güncelleme:** 10 Mart 2026 (R3 Araştırması Tamamlandı)

