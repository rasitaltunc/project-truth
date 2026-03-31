# PROJECT TRUTH — AI HALÜSİNASYON SIFIR RİSK SPRİNT PLANI

**Tarih:** 11 Mart 2026
**Hazırlayan:** Claude (her satır gerçek koddan doğrulandı)
**Durum:** Onay Bekliyor

---

## ÖNCEKİ ARAŞTIRMADAN DÜZELTMELER

Önceki araştırmada (ZERO_RISK_AI_SOLUTIONS.md) bazı şişirmeler vardı. Düzeltiyorum:

| Önceki İddia | Gerçek Durum |
|---|---|
| "Semantic entropy — 10x API çağrısı gerekir" | Groq free tier 100K token/gün — 10x çağrı bütçeyi patlatır |
| "Multi-agent debate — 3x cost" | Aynı sebep — Groq limiti zaten dar |
| "NLI model — ayrı HuggingFace modeli gerekir" | Sunucu tarafında çalıştırmak için GPU lazım — yok |
| "30-35 saat iş" | Gerçekçi: 8-12 saat |

**Temel gerçek:** Groq free tier (100K token/gün) ile çok-çağrılı çözümler (semantic entropy, multi-agent debate) pratikte uygulanamaz. Çözümler TEK ÇAĞRI + KURAL BAZLI DOĞRULAMA olmalı.

---

## DOĞRULANMIŞ AI TOUCHPOINT'LER (7 Adet)

### KOD DENETİMİ SONUÇLARI

| # | Touchpoint | Dosya | Satır | Model | Temp | Halüsinasyon Riski | Mevcut Koruma |
|---|-----------|-------|-------|-------|------|-------------------|---------------|
| A1 | Chat Engine | `/api/chat/route.ts` | 324 | llama-3.3-70b | 0 | 🔴 YÜKSEK | ID varlık kontrolü (satır 277-282) — semantik kontrol YOK |
| A2 | Daily Question | `/api/daily-question/route.ts` | 138 | llama-3.3-70b | 0.8 | 🔴 YÜKSEK | Fallback generic soru (satır 88-90) — içerik kontrolü YOK |
| A3 | Document Scan | `/api/documents/scan/route.ts` | 835 | llama-3.3-70b | 0.05 | 🟡 ORTA | Karantina pipeline ✅, confidence 0.5 filter ✅, dedup ✅ — ama placeholder filtering sadece prompt'ta |
| A4 | Gap Analysis | `/api/node-stats/gaps/route.ts` | 125 | llama-3.3-70b | 0.7 | 🟡 ORTA | Array type check (satır 99-103) — içerik kontrolü YOK |
| A5 | Intent Classifier | `/api/intent-classify/route.ts` | 77 | llama-3.3-70b | 0.1 | 🟢 DÜŞÜK | 6 sabit mod + fallback full_network ✅ + rate limit ✅ |
| A6 | Document OCR | `/api/documents/ocr/route.ts` | 160 | Google DocAI | — | 🟢 MİNİMAL | Sadece metin çıkarma, yorum YOK |
| A7 | Vision AI | `/api/documents/vision/route.ts` | 176 | Google Vision | — | 🟢 DÜŞÜK | Label >0.7, Object >0.5 filter ✅ |

---

## HALÜSİNASYON KÖK NEDENLERİ (Koddan Doğrulanmış)

### A1 — Chat Engine: Neden Halüsinasyon Yapıyor?

**Sorun 1: Tüm ağ verisini AI'ya gönderiyor (satır 211-217)**
```typescript
// MEVCUT KOD:
const networkContext = buildNetworkContext(nodes || [], links || []);
// → TÜM nodes + TÜM links AI'ya gidiyor
// → 32+ node × tüm metadata = binlerce token
// → AI ilgisiz node'lar hakkında da "bilgi üretiyor"
```

**Sorun 2: Annotation doğrulaması YOK (satır 284-292)**
```typescript
// MEVCUT KOD:
return NextResponse.json({
  annotations: parsed.annotations || {},  // ← AI ne derse o
  // Hiçbir doğrulama yok:
  // - Annotation metni veritabanıyla uyuşuyor mu? KONTROL YOK
  // - Annotation 25 karakterden kısa mı? KONTROL YOK
  // - Annotation gerçek bilgi mi uydurma mı? KONTROL YOK
});
```

**Sorun 3: System prompt'ta kurallar var ama ENFORCEMENT yok**
- Satır 28: "Sadece verideki gerçekleri konuştur" → ama AI dinlemeyebilir
- Temperature 0 iyi ama deterministic ≠ doğru

### A2 — Daily Question: Neden Tehlikeli?

**Sorun: Temperature 0.8 + sınırsız içerik (satır 72, 77)**
```typescript
temperature: 0.8,  // ← ÇOK YÜKSEK — yaratıcı mod
content: `Bu kişi henüz araştırılmadı: ${target.name}...`
// AI "merak uyandıran" diye tehlikeli imalar yapabilir:
// "X kişisi hangi terör örgütleriyle bağlantılı?" (belgede yok!)
```

### A3 — Document Scan: Hangi Boşluklar Var?

**İyi tarafları (gerçekten çalışıyor):**
- Temperature 0.05 ✅ (çok düşük — satır 578)
- Karantina pipeline ✅ (AI çıktısı → quarantined status, 2 bağımsız onay gerekiyor — satır 727)
- Confidence filtering ✅ (< 0.5 filtreleniyor — satır 653)
- Dedup ✅ (name+type bazlı — satır 398-410)

**Boşluklar:**
1. Placeholder isim filtresi sadece PROMPT'ta (satır 559) — runtime doğrulama YOK
2. Fuzzy matching YOK — "Jean-Luc Brunel" ≠ "JL Brunel" eşleşmiyor
3. Chunking sonrası merge'de cross-chunk hallucination kontrol YOK

---

## ÇÖZÜM FELSEFESİ

**Matematiksel Gerçek:** Sıfır halüsinasyon imkansız (Nature 2024, OpenAI Eylül 2025).

**Pratik Hedef:** Her touchpoint için "halüsinasyonun kullanıcıya ULAŞMASINI" engelle.

**3 Strateji:**

| Strateji | Ne Yapıyor | Hangi Touchpoint |
|----------|-----------|-----------------|
| **AI'yı KaldIr** | AI yerine kural bazlı şablon | A2 (Daily Question), A4 (Gap Analysis) |
| **Veritabanına Zincirle** | AI sadece veritabanındaki bilgiyi kullanabilir, çıktı veritabanıyla doğrulanır | A1 (Chat Engine) |
| **Mevcut Korumayı Güçlendir** | Runtime filtreler ekle, prompt iyileştir | A3 (Document Scan) |

**Dokunulmayacaklar (zaten güvenli):**
- A5 (Intent Classifier) — 6 sabit mod + validation ✅
- A6 (Document OCR) — yorum yok, sadece metin ✅
- A7 (Vision AI) — confidence filter ✅ + bilgi sadece metadata'da ✅

---

## SPRİNT PLANI

### Sprint AI-1 — "Sıfır Risk Touchpoint'ler" (Tahmini: 2-3 saat)

**Hedef:** A2 ve A4'ü AI'dan TAMAMEN kurtararak GERÇEK sıfır riske indirmek.

#### AI-1.1 — Daily Question: AI'yı Kaldır (A2 Düzeltme)

**Dosya:** `src/app/api/daily-question/route.ts` (138 satır)

**Mevcut durum:** Groq'a soru ürettiriyoruz (temp 0.8). Tehlikeli imalar yapabilir.

**Çözüm:** AI çağrısını KALDIR. Şablon bazlı soru üret.

```typescript
// YENİ MANTIK (AI YOK):
const QUESTION_TEMPLATES = [
  '{name} kimdir ve bu ağdaki rolü nedir?',
  '{name} ile diğer kişiler arasındaki bağlantılar nelerdir?',
  '{name} hakkında hangi belgeler mevcut?',
  '{name} bu ağa nasıl dahil oldu?',
  '{name} ile ilgili zaman çizelgesi nasıl görünüyor?',
  '{name} hangi olaylarda yer almış?',
];

// Deterministik seçim (tarih bazlı — her gün farklı şablon):
const dayIndex = new Date().getDate() % QUESTION_TEMPLATES.length;
const question = QUESTION_TEMPLATES[dayIndex].replace('{name}', target.name);
```

**Etki:**
- Halüsinasyon riski: 🔴 YÜKSEK → ✅ SIFIR (AI yok = halüsinasyon imkansız)
- Groq token tasarrufu: ~128 token/gün
- Kod değişikliği: ~30 satır (Groq çağrısını şablonla değiştir)

#### AI-1.2 — Gap Analysis: AI'yı Kaldır (A4 Düzeltme)

**Dosya:** `src/app/api/node-stats/gaps/route.ts` (125 satır)

**Mevcut durum:** Groq'a "merak uyandıran sorular öner" diyoruz (temp 0.7). Var olmayan bağlantılar hakkında soru sorabilir.

**Çözüm:** AI çağrısını KALDIR. Aynı şablon mantığı.

```typescript
// YENİ MANTIK (AI YOK):
const GAP_TEMPLATES = [
  '{name} kimdir ve ağla nasıl bağlantılıdır?',
  '{name} hakkında henüz keşfedilmemiş bağlantılar olabilir mi?',
  '{name} ({connectionCount} bağlantı) daha fazla araştırılmalı mı?',
];

// Her gap node için deterministik soru:
aiSuggestions = enrichedGaps.slice(0, 3).map(
  (g, idx) => GAP_TEMPLATES[idx % GAP_TEMPLATES.length]
    .replace('{name}', g.nodeName)
    .replace('{connectionCount}', String(g.connectionCount))
);
```

**Not:** Mevcut fallback zaten buna benzer (satır 108-111). Sadece AI kısmını sil, fallback'i birincil yap.

**Etki:**
- Halüsinasyon riski: 🟡 ORTA → ✅ SIFIR
- Groq token tasarrufu: ~256 token/10dk
- Kod değişikliği: ~20 satır (try-catch bloğundaki Groq kısmını sil)

---

### Sprint AI-2 — "Veritabanı Zinciri" (Tahmini: 3-4 saat)

**Hedef:** Chat Engine'i veritabanına zincirleyerek annotation halüsinasyonlarını engellemek.

#### AI-2.1 — Annotation Doğrulama Katmanı (A1 Düzeltme — Çıkış Kontrolü)

**Dosya:** `src/app/api/chat/route.ts` — satır 284-292 arası

**Mevcut sorun:** AI ne annotation döndürürse, direkt 3D sahneye yapıştırılıyor.

**Çözüm:** `validateAnnotations()` fonksiyonu ekle — AI çıktısını veritabanıyla karşılaştır.

```typescript
// YENİ FONKSİYON: src/lib/annotationValidator.ts (YENİ DOSYA)
export function validateAnnotations(
  annotations: Record<string, string>,
  nodes: any[]
): Record<string, string> {
  const validated: Record<string, string> = {};
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const [nodeId, label] of Object.entries(annotations)) {
    const node = nodeMap.get(nodeId);
    if (!node) continue; // Node yoksa annotation'ı at

    // KURAL 1: Uzunluk kontrolü (25 karakter max — prompt'ta da yazıyor ama enforce edilmiyor)
    if (label.length > 28) continue;

    // KURAL 2: Ölüm/hayat iddiası kontrolü
    const deathKeywords = ['ÖLDÜ', 'DEAD', 'DECEASED', 'KILLED', 'İNTİHAR', 'SUICIDE'];
    const hasDeathClaim = deathKeywords.some(kw => label.toUpperCase().includes(kw));
    if (hasDeathClaim) {
      // Veritabanında death_date var mı?
      if (!node.death_date && !node.summary?.toLowerCase().includes('death')
          && !node.summary?.toLowerCase().includes('ölüm')) {
        continue; // Veritabanında ölüm kaydı yoksa bu annotation'ı AT
      }
    }

    // KURAL 3: Finansal iddia kontrolü
    const moneyPattern = /\$[\d,.]+[MBK]?/;
    if (moneyPattern.test(label)) {
      // Veritabanında financial bilgi var mı?
      const hasFinancialData = node.summary?.match(moneyPattern)
        || node.occupation?.toLowerCase().includes('financ');
      if (!hasFinancialData) continue; // Veritabanında finansal veri yoksa AT
    }

    // KURAL 4: Yaş iddiası kontrolü
    const agePattern = /AGE\s*\d+|YAŞ\s*\d+/i;
    if (agePattern.test(label) && !node.birth_date) {
      continue; // birth_date yoksa yaş iddiası AT
    }

    validated[nodeId] = label;
  }

  return validated;
}
```

**Entegrasyon (chat/route.ts satır ~285):**
```typescript
import { validateAnnotations } from '@/lib/annotationValidator';

// Mevcut:
// annotations: parsed.annotations || {},

// YENİ:
annotations: validateAnnotations(parsed.annotations || {}, nodes || []),
```

**Etki:**
- Yanlış ölüm etiketleri ("Elon Musk ÖLDÜ") → ENGELLENIR (death_date yok)
- Uydurma finansal rakamlar ("$500M PAYMENT") → ENGELLENIR (summary'de yok)
- Uydurma yaş iddiaları ("AGE 15 RECRUITED") → ENGELLENIR (birth_date yok)
- Halüsinasyon riski: 🔴 YÜKSEK → 🟡 DÜŞÜK-ORTA

#### AI-2.2 — Narrative Güven Rozeti (A1 Düzeltme — Şeffaflık)

**Dosya:** `src/app/api/chat/route.ts` — response'a yeni alan ekle

**Mevcut sorun:** Kullanıcı AI'nın söylediğine körü körüne güveniyor. "Bu bilgi nereden geldi?" belli değil.

**Çözüm:** Her response'a `confidenceLevel` ve `dataSourced` flag'i ekle.

```typescript
// Response'a eklenen yeni alanlar:
{
  narrative: "...",
  // YENİ:
  confidenceLevel: calculateConfidence(parsed, nodes),
  dataSourced: checkDataSourced(parsed, nodes),
  // confidenceLevel: 'high' | 'medium' | 'low'
  // dataSourced: true (tüm bilgi veritabanından) | false (AI yorumu var)
}

// Hesaplama mantığı:
function calculateConfidence(parsed, nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let sourcedCount = 0;
  let totalClaims = 0;

  // Highlight edilen node'ların hepsi gerçekten var mı?
  for (const id of parsed.highlightNodeIds || []) {
    totalClaims++;
    if (nodeMap.has(id)) sourcedCount++;
  }

  // Annotation'lar veritabanıyla uyuşuyor mu?
  for (const [nodeId, label] of Object.entries(parsed.annotations || {})) {
    totalClaims++;
    const node = nodeMap.get(nodeId);
    if (node?.summary?.toLowerCase().includes(label.toLowerCase().slice(0, 10))) {
      sourcedCount++;
    }
  }

  if (totalClaims === 0) return 'medium';
  const ratio = sourcedCount / totalClaims;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}
```

**Frontend entegrasyonu (ChatPanel'de):**
- `high` → yeşil rozet "✓ Veritabanı doğrulamalı"
- `medium` → sarı rozet "⚠ Kısmen doğrulanmış"
- `low` → kırmızı rozet "⚠ AI yorumu — doğrulanmamış"

**Etki:**
- Kullanıcı her zaman bilgi kaynağını görür
- "low" rozetli yanıtlara daha az güvenilir
- Şeffaflık artışı (AI ne bildiğini, ne uyduğunu belli eder)

#### AI-2.3 — Sorguya Özel Node Filtresi (A1 Düzeltme — Giriş Kontrolü)

**Dosya:** `src/app/api/chat/route.ts` — satır 211 civarı

**Mevcut sorun:** buildNetworkContext() TÜM node'ları AI'ya gönderiyor. 32+ node × metadata = gereksiz gürültü.

**Çözüm:** Basit anahtar kelime eşleştirmesi ile sadece İLGİLİ node'ları gönder.

```typescript
// YENİ: Sorguya göre node filtresi
function filterRelevantNodes(nodes: any[], query: string, maxNodes: number = 15): any[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Skor hesapla: isim eşleşmesi + summary eşleşmesi
  const scored = nodes.map(node => {
    let score = 0;
    const nameLower = (node.name || '').toLowerCase();
    const summaryLower = (node.summary || '').toLowerCase();

    for (const word of queryWords) {
      if (nameLower.includes(word)) score += 3;  // İsim eşleşmesi güçlü
      if (summaryLower.includes(word)) score += 1;
    }

    // Tier 1 node'lar her zaman dahil (ana aktörler)
    if (node.tier === 1 || node.tier === 'tier1') score += 2;

    return { node, score };
  });

  // En yüksek skorlu node'ları al
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxNodes)
    .map(s => s.node);
}

// KULLANIM (satır 211 yerine):
const relevantNodes = filterRelevantNodes(nodes || [], message, 15);
const networkContext = buildNetworkContext(relevantNodes, links || []);
```

**Etki:**
- AI'ya giden veri miktarı: ~32 node → ~15 node (yarıya iniyor)
- İlgisiz node'lar hakkında halüsinasyon şansı DÜŞEr
- Token kullanımı azalır (maliyet tasarrufu)
- 15 node yeterli çünkü Epstein ağında çoğu sorgu 5-10 kişi hakkında

---

### Sprint AI-3 — "Belge Tarama Güçlendirmesi" (Tahmini: 2-3 saat)

**Hedef:** Document Scan pipeline'ındaki boşlukları kapatmak.

#### AI-3.1 — Runtime Placeholder Filtresi (A3 Düzeltme)

**Dosya:** `src/app/api/documents/scan/route.ts` — satır ~650 civarı (entity filtering)

**Mevcut sorun:** Placeholder isim filtresi sadece PROMPT'ta (satır 559). AI dinlemeyebilir.

**Çözüm:** Runtime'da entity isimlerini filtrele.

```typescript
// YENİ FONKSİYON: addEntityFilter() — scan route'a eklenecek
const PLACEHOLDER_NAMES = new Set([
  'john smith', 'jane doe', 'john doe', 'jane smith',
  'john michael doe', 'j. doe', 'j. smith',
  'unknown person', 'unnamed individual', 'bilinmeyen kişi',
  'person a', 'person b', 'company a', 'company b',
  'kişi a', 'kişi b', 'şirket a', 'şirket b',
  'test', 'example', 'sample', 'placeholder',
]);

function isPlaceholderName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  if (PLACEHOLDER_NAMES.has(normalized)) return true;
  // Tek karakterli isimler (A, B, X)
  if (normalized.length <= 2) return true;
  // Sadece sayılardan oluşan "isimler"
  if (/^\d+$/.test(normalized)) return true;
  return false;
}

// Entity filtering'e ekle (satır ~653):
// MEVCUT: if (entity.confidence >= 0.5) ...
// YENİ:   if (entity.confidence >= 0.5 && !isPlaceholderName(entity.name)) ...
```

**Etki:**
- Placeholder isim riski: PROMPT → PROMPT + RUNTIME (çift koruma)
- "John Doe" türevleri de yakalanır ("J. Doe", "John Michael Doe")

#### AI-3.2 — Confidence Threshold Yükseltme

**Dosya:** `src/app/api/documents/scan/route.ts`

**Mevcut:** Entity ve relationship threshold 0.5 (satır 653, 675)

**Öneri:** AI extraction için threshold'u 0.6'ya yükselt. Yapısal veri (ICIJ, OpenSanctions) için 0.5 kalabilir.

```typescript
// Kaynak tipine göre dinamik threshold:
const confidenceThreshold = isStructured ? 0.5 : 0.6;

// Entity filtering:
if (entity.confidence >= confidenceThreshold && !isPlaceholderName(entity.name)) {
  // devam...
}
```

**Etki:**
- Düşük güvenilirlikli AI çıktıları filtrelenir
- Yapısal veri etkilenmez (zaten güvenilir kaynaklar)

#### AI-3.3 — Birim Testler: Annotation Validator + Placeholder Filter

**Dosya:** `src/lib/__tests__/annotationValidator.test.ts` (YENİ)

```
Test listesi:
- Ölüm iddiası + death_date VAR → annotation GEÇERLİ
- Ölüm iddiası + death_date YOK → annotation FİLTRELENİR
- Finansal iddia + summary'de dolar VAR → GEÇERLİ
- Finansal iddia + summary'de dolar YOK → FİLTRELENİR
- Yaş iddiası + birth_date VAR → GEÇERLİ
- Yaş iddiası + birth_date YOK → FİLTRELENİR
- 30 karakterden uzun label → FİLTRELENİR
- Olmayan node ID → FİLTRELENİR
```

**Dosya:** `src/lib/__tests__/placeholderFilter.test.ts` (YENİ)

```
Test listesi:
- "John Smith" → true (placeholder)
- "J. Doe" → true
- "Jeffrey Epstein" → false (gerçek isim)
- "A" → true (tek karakter)
- "123" → true (sadece rakam)
- "Ghislaine Maxwell" → false
- "kişi a" → true
```

---

## DOSYA DEĞİŞİKLİK ÖZETİ

| Dosya | İşlem | Sprint |
|-------|-------|--------|
| **YENİ** `src/lib/annotationValidator.ts` | Annotation doğrulama fonksiyonları | AI-2 |
| **YENİ** `src/lib/__tests__/annotationValidator.test.ts` | Annotation testleri | AI-3 |
| **YENİ** `src/lib/__tests__/placeholderFilter.test.ts` | Placeholder testleri | AI-3 |
| `src/app/api/daily-question/route.ts` | Groq çağrısını kaldır → şablon | AI-1 |
| `src/app/api/node-stats/gaps/route.ts` | Groq çağrısını kaldır → şablon | AI-1 |
| `src/app/api/chat/route.ts` | annotationValidator + confidence rozet + node filtresi | AI-2 |
| `src/app/api/documents/scan/route.ts` | Runtime placeholder filtre + threshold yükseltme | AI-3 |

**Toplam yeni dosya:** 3
**Toplam değişen dosya:** 4

---

## ZAMAN TAHMİNİ (Dürüst)

| Sprint | Tahmini Süre | Açıklama |
|--------|-------------|----------|
| AI-1 | 2-3 saat | İki route'tan Groq çağrısını kaldır, şablonla değiştir |
| AI-2 | 3-4 saat | annotationValidator yazılması + chat route entegrasyonu + confidence rozet |
| AI-3 | 2-3 saat | Placeholder runtime filtre + threshold değişikliği + birim testler |
| **TOPLAM** | **7-10 saat** | |

---

## BAĞIMLILIK SIRASI

```
AI-1.1 (Daily Question AI kaldır)      ←── Bağımsız, hemen yapılabilir
AI-1.2 (Gap Analysis AI kaldır)        ←── Bağımsız, paralel yapılabilir
    ↓
AI-2.1 (annotationValidator.ts yazılması)  ←── Bağımsız
AI-2.2 (confidence rozet)                  ←── AI-2.1'e bağlı
AI-2.3 (node filtresi)                     ←── Bağımsız
    ↓
AI-3.1 (placeholder runtime filtre)        ←── Bağımsız
AI-3.2 (threshold yükseltme)               ←── AI-3.1 ile birlikte
AI-3.3 (birim testler)                     ←── AI-2.1 ve AI-3.1'e bağlı
```

**Raşit'in yapması gereken:** Yok — tüm değişiklikler kod tarafında.

---

## SONUÇ TABLOSU: DÜZELTME SONRASI RİSK

| Touchpoint | Düzeltme Öncesi | Düzeltme Sonrası | Yöntem |
|-----------|----------------|------------------|--------|
| A1 Chat Engine | 🔴 YÜKSEK | 🟡 DÜŞÜK | Annotation doğrulama + confidence rozet + node filtresi |
| A2 Daily Question | 🔴 YÜKSEK | ✅ SIFIR | AI tamamen kaldırıldı |
| A3 Document Scan | 🟡 ORTA | 🟢 DÜŞÜK | Runtime placeholder filtre + threshold yükseltme |
| A4 Gap Analysis | 🟡 ORTA | ✅ SIFIR | AI tamamen kaldırıldı |
| A5 Intent Classifier | 🟢 DÜŞÜK | 🟢 DÜŞÜK | Değişiklik yok (zaten güvenli) |
| A6 Document OCR | 🟢 MİNİMAL | 🟢 MİNİMAL | Değişiklik yok (AI yorum yapmıyor) |
| A7 Vision AI | 🟢 DÜŞÜK | 🟢 DÜŞÜK | Değişiklik yok (confidence filter var) |

**Özet:**
- 7 touchpoint'ten 2'si **GERÇEK SIFIR** (AI kaldırıldı — matematiksel imkansızlık)
- 1'i **YÜKSEK → DÜŞÜK** (çok katmanlı doğrulama)
- 1'i **ORTA → DÜŞÜK** (runtime filtre eklendi)
- 3'ü zaten güvenli (dokunulmadı)

---

## "SIFIRA İNDİREMEDİKLERİM" İÇİN DÜRÜST AÇIKLAMA

**A1 (Chat Engine) neden "DÜŞÜK" ve "SIFIR" değil?**

Chat Engine'in görevi YORUM yapmak — veritabanındaki bilgiyi analiz edip insanca anlatmak. Bu görev doğası gereği AI'nın "düşünmesini" gerektiriyor. Ve düşünen her AI halüsinasyon yapabilir (Nature 2024 ispatı).

annotationValidator "Elon Musk ÖLDÜ" gibi somut yanlışları yakalıyor. Ama "Elon Musk'ın Epstein ile ilişkisi sıkıydı" gibi SÜBTİL yanlışları YAKALAMIYOR — çünkü bu bir yorum ve "sıkı" kelimesini doğrulayacak binary veri yok.

**Bunu sıfıra indirmek için ne lazım?**
- AI'yı tamamen kaldırmak (ama o zaman platform değerini kaybeder)
- VEYA: Her AI yanıtını ikinci bir AI ile doğrulamak (Groq limiti yetmez)
- VEYA: İnsan doğrulaması eklemek (ölçeklenmiyor)

**Pratik sonuç:** Chat Engine'de "DÜŞÜK" hedefimiz makul. Confidence rozeti sayesinde kullanıcı BİLİR ki bu bir AI yorumudur.

**A3 (Document Scan) neden "DÜŞÜK" ve "SIFIR" değil?**

Karantina pipeline zaten çok iyi çalışıyor (2 bağımsız onay). Ama karantina'ya GELEN verinin kalitesi AI'ya bağlı. Placeholder filtre ve threshold yükseltme ile "bariz yanlışları" yakalıyoruz. Ama belgeden yanlış çıkarılan bir ilişki (örn: "A şirketi B'ye para gönderdi" ama aslında "A şirketi B'den para aldı") bu filtrelerin kapsamı dışında.

Bu, peer review (karantina sistemi) tarafından yakalanmalı — ve mevcut Sprint 17 sistemi bunu YAPIYOR.

---

## DOĞRULAMA KONTROL LİSTESİ (Her Sprint Sonrası)

```
AI-1 Testleri:
[ ] /api/daily-question → Groq çağrısı YOK, şablon soru dönüyor
[ ] /api/node-stats/gaps → Groq çağrısı YOK, şablon öneriler dönüyor
[ ] Her iki route'ta AI hatası olmuyor (çünkü AI çağrısı yok)

AI-2 Testleri:
[ ] Chat'e "Ölenler kimler?" sor → death_date olmayan node'larda "ÖLDÜ" annotation'ı YOK
[ ] Chat'e "$50M ödeme" sor → summary'de dolar olmayan node'larda finansal annotation YOK
[ ] Response'ta confidenceLevel alanı var → 'high'/'medium'/'low' döndürüyor
[ ] 32 node'luk ağda, soru "Epstein" hakkındaysa → AI'ya giden node sayısı ≤ 15

AI-3 Testleri:
[ ] Document scan sonucu "John Doe" entity → FİLTRELENMİŞ (listede yok)
[ ] Document scan sonucu "J. Smith" entity → FİLTRELENMİŞ
[ ] Document scan sonucu "Jeffrey Epstein" entity → KORUNMUŞ (gerçek isim)
[ ] AI extraction confidence 0.55 entity → FİLTRELENMİŞ (threshold 0.6)
[ ] Yapısal veri confidence 0.55 entity → KORUNMUŞ (threshold 0.5)
[ ] Tüm birim testler geçiyor (annotationValidator + placeholderFilter)
```
