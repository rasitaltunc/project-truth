# 🔍 PROJECT TRUTH: AI TOUCHPOINT AUDIT
**Eksiksiz Güvenlik Denetimi — Her AI/LLM Kullanım Noktası**

**Tarih:** 11 Mart 2026
**Dil:** Türkçe
**Kapsamı:** `/apps/dashboard/src/` — Tüm AI/LLM/ML entegrasyonları

---

## 📋 ÖZETİ

Project Truth 4 ana AI sistemini kullanmaktadır:

| Sistem | Sağlayıcı | Model | Amaç | Halüsinasyon Riski |
|--------|-----------|-------|------|-------------------|
| **Chat Engine** | Groq | llama-3.3-70b | Soru-cevap, ağ keşfi | **YÜKSEK** |
| **Intent Classifier** | Groq | llama-3.3-70b | Lens türü önerisi | **DÜŞÜK** |
| **Document OCR** | Google Document AI | Custom | Belge metin çıkarma | **DÜŞÜK** |
| **Image Analysis** | Google Vision AI | Custom | Fotoğraf analizi | **ORTA** |
| **Entity Extraction** | Groq | llama-3.3-70b | Belge tarama | **YÜKSEK** |

---

## 🔴 UYARI: KRİTİK HALÜSINASYON RİSK ALANLARI

### ⚠️ Tier 1 — YÜKSEK RİSK (Direkt kullanıcı görüş)

1. **Chat Responses (AI Annotations)**
   - Dönem: `/api/chat` yanıtında dinamik etiketler
   - Risk: Uydurulmuş bilgi 3D sahneye yapıştırılıyor
   - Örnek: "Elon Musk ÖLDÜ 2024" gibi yanlış etiketler

2. **Document Scan Entity Extraction**
   - Dönem: `/api/documents/scan` — Groq JSON çıktısı
   - Risk: Yapay varlık adları, gerçek olmayan ilişkiler
   - Örnek: "John Doe" placeholder isimleri, var olmayan bağlantılar

### ⚠️ Tier 2 — ORTA RİSK (İndirekt etkisi)

1. **Gap Analysis AI Suggestions**
   - Dönem: `/api/node-stats/gaps` — Önerilen soruların içeriği
   - Risk: Yanıltıcı "sorgu" önerileri

2. **Daily Question Generation**
   - Dönem: `/api/daily-question` — Her gün yeni soru üretimi
   - Risk: Var olmayan bağlantılar hakkında sorular

3. **Image Analysis Results**
   - Dönem: `/api/documents/vision` — Vision AI etiketleri
   - Risk: Yanlış nesne algılama

---

## 🎯 DETAYLI TOUCHPOINT KATALOĞU

### **1. CHAT ENGINE — /api/chat**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/chat/route.ts`
**Satırlar:** 1-325

#### **Giriş (Input)**
- **Kaynak:** Kullanıcı soru (ChatPanel)
- **Veri Akışı:**
  ```
  Kullanıcı sorusu
    → conversationHistory (son 4 exchange)
    → nodes array (ağ verisini full send)
    → links array (tüm bağlantılar)
    → previousHighlightNodeIds (bağlam koruma)
  ```
- **Kontrol Mekanizması:**
  - Rate limiting: 100K token/gün Groq free tier
  - Validation: chatSchema (src/lib/validation)

#### **AI İşlemi**
- **Model:** Groq `llama-3.3-70b-versatile`
- **Temperature:** 0 (deterministik)
- **Max Tokens:** 1024
- **Format:** JSON object
- **System Prompt (Satır 22-168):**
  - **Kimlik:** "Araştırmacı gazeteci"
  - **Kritik Kurallar:**
    - SADECE veri tabanlı cevap (Satır 28)
    - Uydurma YASAK (Satır 28)
    - Ölüm/hayat filtreleme kuralları (Satır 36-39)
    - Annotation her kişiye ÖZEL olmalı (Satır 51)
    - Max 25 karakter etiketi (Satır 113)

#### **Çıkış (Output)**
```json
{
  "narrative": "Gazetecilik dili yanıt",
  "highlightNodeIds": ["uuid-1", "uuid-2"],
  "highlightLinkIds": [],
  "focusNodeId": "uuid-1",
  "annotations": {
    "uuid-1": "RECRUITED AGE 15",
    "uuid-2": "$150M SETTLEMENT"
  },
  "followUp": "Takip sorusu",
  "sources": [{nodeId, field}]
}
```

#### **Nereye Gidiyor**
1. **Frontend:** ChatPanel.tsx → ChatMessage cache
2. **3D Sahne:** Truth3DScene.tsx → Canvas sprite badges olarak render
3. **Store:** useChatStore → Zustand state

#### **Halüsinasyon Riski: 🔴 YÜKSEK**

**Neden:**
- AI "emin olmadığında" da cevap veriyor (temp 0 olsa da)
- Sosyal medyada yaygın isimleri ("Elon Musk") ağa eklenirse halüsinasyon yapar
- "Kurbanlar" filtrelemesi buggy olabilir (summary field check eksik)

**Örnekler:**
```
❌ BAD: "Elon Musk" node'u Epstein ağına ekledikten sonra
   Soru: "Ölenler kimler?"
   AI yanıtı: "Elon Musk — ÖLDÜ 2024" (YALANDIR)

❌ BAD: "Jean-Luc Brunel" node'u death_date boş ise
   Soru: "Ölenler kimler?"
   Yanıt: "Jean-Luc Brunel — MAHKUMIYETTEN ÖLDÜ" (summary kontrol yok)
```

**Kontrol Mekanizması:**
- Satır 276-282: highlightNodeIds doğrulama (UUID check)
- Satır 34-40: Ölüm kriterleri açıkça tanımlanmış
- ❌ **EKSIK:** AI'nin kendi uydurmalarını filtrelemek yok

---

### **2. INTENT CLASSIFIER — /api/intent-classify**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/intent-classify/route.ts`
**Satırlar:** 1-77

#### **Giriş**
- **Kaynak:** Kullanıcı sorgusu (chat mesajı)
- **Veri:** Sadece metin string
- **Kontrol:** Validation, rate limiting (INTENT_RATE_LIMIT)

#### **AI İşlemi**
- **Model:** Groq `llama-3.3-70b-versatile`
- **Temperature:** 0.1 (çok deterministik)
- **Max Tokens:** 150
- **Görev:** Hangi "lens" (view mode) gösterilmeli?
  - full_network / main_story / follow_money / evidence_map / timeline / board

#### **Çıkış**
```json
{
  "intent": "main_story",
  "confidence": 0.88,
  "reason": "..."
}
```

#### **Nereye Gidiyor**
- Frontend: useViewModeStore → LensSidebar.tsx
- 3D Sahne: Görünür node'lar filtrelenir

#### **Halüsinasyon Riski: 🟡 DÜŞÜK**

**Neden:**
- Çıktı kısıtlı (6 sabit mod)
- Confidence score da kontrol ediliyor
- fallback: full_network (en güvenli)

**Kontrol Mekanizması (Satır 62-65):**
```typescript
const validModes = ['full_network', 'main_story', 'follow_money', ...];
if (!validModes.includes(result.intent)) {
  result.intent = 'full_network';
}
```

---

### **3. GAP ANALYSIS ENGINE — /api/node-stats/gaps**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/node-stats/gaps/route.ts`
**Satırlar:** 1-126

#### **Giriş**
- **Kaynak:** Sorgulanmamış (gap) node'ların listesi
- **Veri:** Node isimler, bağlantı sayıları
- **Cache:** 10 dakika (maliyet tasarrufu)

#### **AI İşlemi (Satır 69-112)**
- **Model:** Groq `llama-3.3-70b-versatile`
- **Görev:** Her gap node için 1 merak uyandıran soru öner
- **Temperature:** 0.7 (yaratıcı)
- **Format:** JSON array

#### **Çıkış**
```json
{
  "gaps": [
    { "nodeId": "...", "nodeName": "John Smith", "connectionCount": 5 }
  ],
  "aiSuggestions": [
    "John Smith'in Epstein ile nasıl bağlantısı var?",
    "John Smith hangi kurumda çalışıyor?"
  ]
}
```

#### **Nereye Gidiyor**
- Frontend: GapAnalysisPanel.tsx → ChatPanel boş durumda gösterilir
- Kullanıcı → "Bunu Sor" butonu → Chat'e gönderir

#### **Halüsinasyon Riski: 🟡 ORTA**

**Neden:**
- Soru "merak uyandıran" olması için creative prompt
- AI var olmayan bağlantılar hakkında soru sorabilir
- Örnek: "John Smith 'şirket A' ile nasıl bağlantılı?" (belgede yoksa)

**Kontrol Mekanizması:**
- Satır 105-112: Try-catch + fallback
- ❌ **EKSIK:** Oluşturulan soruların doğruluğu kontrol yok

**Fallback (Satır 108-111):**
```typescript
aiSuggestions = enrichedGaps.slice(0, 3).map(
  (g: { nodeName: string; connectionCount: number }) =>
    `${g.nodeName} kimdir ve ağla nasıl bağlantılıdır?`
);
```

---

### **4. GÜNÜN SORUSU — /api/daily-question**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/daily-question/route.ts`
**Satırlar:** 1-139

#### **Giriş**
- **Kaynak:** En bağlantılı ama sorgulanmamış node
- **Veri:** Node ismi, tipi, bağlantı sayısı
- **Cache:** 24 saat

#### **AI İşlemi (Satır 63-90)**
- **Model:** Groq `llama-3.3-70b-versatile`
- **Görev:** "Merak uyandıran" 1 soru üret
- **Temperature:** 0.8 (çok yaratıcı)
- **Max Tokens:** 128

#### **System Prompt (Satır 76-77):**
```
"Bir soruşturma ağındaki henüz araştırılmamış önemli bir isim için
merak uyandıracak, kısa, çarpıcı bir soru yaz."
```

#### **Çıkış**
```json
{
  "question": "Jean-Luc Brunel'in Paris modeling şirketi hangi billionaires'ı temsil etmiş?",
  "targetNodeId": "uuid",
  "targetNodeName": "Jean-Luc Brunel",
  "expiresAt": "2026-03-12T00:00:00Z",
  "answeredCount": 0
}
```

#### **Nereye Gidiyor**
- Frontend: DailyQuestionBanner.tsx (ChatPanel açılırken gösterilir)
- Kullanıcı → soru üzerine tıkla → Chat'e gönderilir

#### **Halüsinasyon Riski: 🔴 YÜKSEK**

**Neden:**
- Temperature 0.8 (çok özgür)
- "Billionaires'ı temsil etmiş?" gibi spesifik iddia yapabiliyor
- Fallback (Satır 38-43) bile yeterince güvenli değil

**Örnek Halüsinasyon:**
```
🔴 Target: "John Smith" (Az bilinen node)
AI: "John Smith hangi terör örgütleriyle bağlantılı?"
(Belgede hiç yok, AI uydurmadı ama ima ediyor)
```

**Kontrol Mekanizması:**
- Satır 88-90: try-catch, fallback generic question
- ❌ **EKSIK:** Soru içeriğinin doğruluk kontrolü yok

---

### **5. DOCUMENT SCAN — /api/documents/scan**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/documents/scan/route.ts`
**Satırlar:** 1-835

#### **Giriş**
- **Kaynak:** Belge metin (OCR veya yapılandırılmış veri)
- **Veri İçeriği:**
  - Metadata (başlık, belge tipi)
  - raw_content (OCR veya API sonucu)
  - extracted_text (manuel OCR)
  - Mevcut ağ node isimleri

#### **AI İşlemi (Satır 540-594)**

**Aşamalı Tarama:**
```
1. Document chunking (uzun belgeler)
2. Her chunk için Groq scan
3. Sonuçları birleştir (dedup)
```

**Groq Call (Satır 575-581):**
```typescript
const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  max_tokens: 2000,
  temperature: 0.05,  // Çok düşük — kesinlik
  response_format: { type: 'json_object' },
  messages: [{ role: 'user', content: groqPrompt }]
});
```

**Prompt (Satır 540-572):**
- Görev: Belgeden entities, relationships, tarihler çıkar
- JSON Format: {entities[], relationships[], summary, keyDates[], confidence}
- Kritik Kurallar (Satır 555-563):
  - SADECE belgedeki BİLGİ
  - ASLA uydurma
  - Placeholder isimler KULLANMA
  - Confidence < 0.5 dahil etme

#### **Çıkış**
```json
{
  "entities": [
    { "name": "John Smith", "type": "person", "confidence": 0.8 }
  ],
  "relationships": [
    { "sourceName": "Smith", "targetName": "Company A", "relationshipType": "employs" }
  ],
  "summary": "...",
  "keyDates": [{ "date": "2020-01-15", "description": "..." }],
  "confidence": 0.75
}
```

#### **Nereye Gidiyor**

1. **database_derived_items** tablosu (beklemede durur)
2. **data_quarantine** tablosu (Sprint 17 — bağımsız doğrulama bekler)
3. Doğrulanınca → nodes/links'e eklenir

#### **Halüsinasyon Riski: 🔴 YÜKSEK**

**Neden:**
- Belge 50+ sayfaysa chunks'a bölünüyor
- Her chunk bağımsız AI call
- Merging logic dedup yapıyor ama hallüsinasyonları değil
- Confidence thresholding (0.5) yetmez

**Kritik Kontrol Boşlukları:**

```typescript
// ❌ PROBLEM 1: Placeholder isim kontrolü yetersiz
// "John Doe" veya "Jane Smith" aranıyor ama türevleri yok:
// - "John Michael Doe" (geçebilir)
// - "Doe, John" (geçebilir)
// - "J. Doe" (geçebilir)

// ❌ PROBLEM 2: Ağdaki isimlerle fuzzy matching yok
// nodeList (Satır 525): exact string match only
// "Jean-Luc Brunel" ≠ "JL Brunel" (confidence boost olmaz)

// ✅ GOOD: Deduplication (Satır 398-427)
// İki chunk aynı entity'yi bulursa, yüksek confidence kazanır

// ✅ GOOD: Confidence filtering (Satır 651-670)
// < 0.5 confidence entities derived_items'a girmiyor
```

**Quarantine Pipeline (Satır 695-783):**
- Yapılandırılmış veri (ICIJ, OpenSanctions): 1 onay yeter
- AI çıktısı: 2 bağımsız onay gerekir
- ✅ GOOD: Yalnızca "pending_review" status

---

### **6. DOCUMENT OCR — /api/documents/ocr**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/documents/ocr/route.ts`
**Satırlar:** 1-160

#### **Giriş**
- **Kaynak:** PDF veya resim dosyası (GCS veya URL)
- **Kontrol:** Yalnızca file download, AI değil

#### **AI İşlemi**
- **Sağlayıcı:** Google Document AI (custom processor)
- **Görev:** OCR — metin çıkarma
- **Veri:** Dosya buffer (base64)
- **Format:** Sayfa bazlı metin + tablolar + form fields

#### **Çıkış**
```json
{
  "success": true,
  "text": "Extracted full text",
  "confidence": 0.95,
  "pageCount": 25,
  "hasTables": true,
  "hasForms": false,
  "language": "en",
  "processingTimeMs": 3200
}
```

#### **Nereye Gidiyor**
1. Document tablosuna kaydedilir (ocr_extracted_text)
2. Scan API'ye input olarak gönderilir

#### **Halüsinasyon Riski: 🟢 DÜŞÜK**

**Neden:**
- Document AI sadece text çıkarıyor, yorum yapmıyor
- Confidence score doğru
- Hiçbir "anlam" üretmiyor

**Kontrol Mekanizması:**
- Satır 82-83: processWithDocumentAI() call
- Satır 100-108: DB güncelleme

---

### **7. VISION AI — /api/documents/vision**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/app/api/documents/vision/route.ts`
**Satırlar:** 1-176

#### **Giriş**
- **Kaynak:** Resim dosyası (GCS veya URL)
- **Kontrol:** Yalnızca file download

#### **AI İşlemi**
- **Sağlayıcı:** Google Cloud Vision AI
- **Görev:** Resim analiz
  - Labels (what's in the photo)
  - Objects (detected items with bounding boxes)
  - Landmarks (location)
  - Text OCR
  - Web entities (similar images)
  - Safe Search (adult/violence detection)

#### **Çıkış**
```json
{
  "labels": [{"description": "person", "score": 0.95}],
  "objects": [{"name": "face", "score": 0.92}],
  "text": "Text found in image",
  "landmarks": [{"description": "Statue of Liberty", "latitude": 40.6892}],
  "webBestGuesses": ["Statue of Liberty"],
  "safeSearch": {"adult": "VERY_UNLIKELY", "violence": "UNLIKELY"}
}
```

#### **Nereye Gidiyor**
1. Document metadata'ya kaydedilir (vision_analysis)
2. raw_content'e eklenir (scan pipeline için)

#### **Halüsinasyon Riski: 🟡 ORTA**

**Neden:**
- Labels/objects yanlış olabilir
- Landmark detection coğrafi hatalar yapabilir
- Web entities yanıltıcı olabilir

**Örnek:**
```
🟡 Eğer "Epstein island" fotoğrafı yüklense:
   Vision: "beach, palm trees, mansion"
   ❌ AI scan sonra: "Epstein'ın özel adası bu"
   ✅ Ama DB'de "vision_analysis" diye marked oluyor
```

**Kontrol Mekanizması:**
- Satır 75-113: Summary oluşturma (top scores filtreli)
- ❌ **EKSIK:** Landmark confidence kontrolü
- ✅ GOOD: Safe search flagları kaydediliyor

---

### **8. ENTITY RESOLUTION — /lib/documentAI.ts (Wrapper)**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/lib/documentAI.ts`
**Satırlar:** 1-219

#### **Giriş**
- **Kaynak:** PDF veya resim file buffer
- **Veri:** Dosya byte'ları

#### **AI İşlemi**
- **Sağlayıcı:** Google Cloud Document AI
- **Processor:** Custom OCR (fe5ed1ca4db790da)
- **Region:** US
- **Model:** Court documents için optimize

#### **Çıkış (Typed)**
```typescript
interface DocumentAIResult {
  text: string;
  confidence: number;
  pageCount: number;
  pages: [{
    pageNumber: number;
    text: string;
    tables?: {headerRows, bodyRows};
    formFields?: {name, value, confidence};
  }];
  language: string | null;
  processingTimeMs: number;
}
```

#### **Halüsinasyon Riski: 🟢 DÜŞÜK**

- Sadece OCR
- Yapılandırılmış output
- Hiçbir "anlam" üretmiyor

---

### **9. VISION AI WRAPPER — /lib/visionAI.ts**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/lib/visionAI.ts`
**Satırlar:** 1-245

#### **Giriş**
- **Kaynak:** Resim file buffer
- **Format:** JPEG, PNG, GIF, WebP, BMP, TIFF

#### **AI İşlemi**
- **Sağlayıcı:** Google Cloud Vision API v1
- **Features:** 6 adet
  - LABEL_DETECTION (max 15)
  - OBJECT_LOCALIZATION (max 20)
  - TEXT_DETECTION
  - LANDMARK_DETECTION (max 10)
  - WEB_DETECTION
  - SAFE_SEARCH_DETECTION

#### **Çıkış (Typed)**
```typescript
interface VisionAnalysisResult {
  labels: VisionLabel[];
  objects: VisionObject[];
  text: string | null;
  landmarks: VisionLandmark[];
  webEntities: VisionWebEntity[];
  webBestGuesses: string[];
  matchingPageUrls: string[];
  safeSearch: {adult, violence, racy};
  processingTimeMs: number;
}
```

#### **Halüsinasyon Riski: 🟡 ORTA**

- Labels yanlış olabilir
- Objects confidence scores kontrol edilmeli
- Landmarks coğrafyası yanılabilir

---

### **10. INTENT CLASSIFIER (CLIENT) — /lib/intentClassifier.ts**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/lib/intentClassifier.ts`
**Satırlar:** 1-150

#### **Giriş**
- **Kaynak:** Kullanıcı sorgusu string
- **Veri:** Sadece metin

#### **İşlem (Hybrid)**

**Faz 1: Keyword Classifier (Satır 46-96)**
- LLM'ye hiç gitmiyor — 100% güvenli
- KEYWORD_MAP: 6 lens → keyword listesi
- Score: Compound phrase > single word

**Faz 2: LLM Fallback (Satır 111-149)**
- Keyword confidence < 0.75 ise Groq çağır
- Groq çağrısı client'tan `/api/intent-classify`'e

#### **Çıkış**
```typescript
interface IntentResult {
  intent: ViewMode;  // full_network | main_story | follow_money | ...
  confidence: number;  // 0.0 - 1.0
  reason: string;
  suggestMode: boolean;  // Kullanıcıya göster?
}
```

#### **Nereye Gidiyor**
1. Client store: useViewModeStore.setAiSuggestion()
2. UI: LensSidebar.tsx → AiSuggestionBanner

#### **Halüsinasyon Riski: 🟢 DÜŞÜK**

**Neden:**
- Keyword classifier fallback (hiç AI = güvenli)
- LLM fallback sadece confidence < 0.75 ise
- 6 sabit mode → input validation trivial

---

### **11. CHAT STORE (Frontend) — /store/chatStore.ts**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/chatStore.ts`
**Satırlar:** 1-250+ (partial)

#### **Giriş (Fetch)**
```typescript
const res = await fetch('/api/chat', {
  body: JSON.stringify({
    question,
    conversationHistory,
    nodes,
    links,
    previousHighlightNodeIds
  })
});
```

#### **İşlem**
1. API yanıtı JSON parse
2. nodeNames map oluştur (UUID → display name)
3. ChatMessage object'e dönüştür
4. Zustand store'a yazılır

#### **Çıkış (Store)**
```typescript
messages: ChatMessage[] = [{
  role: 'assistant',
  content: data.narrative,
  highlightNodeIds,
  highlightLinkIds,
  focusNodeId,
  annotations,
  followUp,
  sources
}]
```

#### **Nereye Gidiyor**
1. **ChatPanel.tsx:** Message render
2. **Truth3DScene.tsx:** Annotations canvas'a çizilir
3. **Persistent:** localStorage'a cache'lenebilir

#### **Halüsinasyon Riski: 🔴 YÜKSEK** (indirekt)

- Burada API yanıtı sadece tutturuluyor
- AI halüsinasyonu API'de olursa, buraya da gelir
- Render kontrol yok (tüm annotations gösterilir)

---

### **12. CHAT PANEL (Frontend) — /components/ChatPanel.tsx**

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/components/ChatPanel.tsx`
**Satırlar:** 1-200+ (partial)

#### **Giriş**
```typescript
interface ChatPanelProps {
  nodes: any[];
  links: any[];
  networkId?: string;
}
```

#### **İşlem**
1. Kullanıcı input al
2. sendMessage(question, nodes, links) çağır
3. Yanıtı render et

#### **AI Annotations Render (Implicit)**
- Message.annotations dict → 3D canvas'a gider
- Node click → setHighlights()

#### **Halüsinasyon Riski: 🔴 YÜKSEK** (indirekt)

- UI tamamen API yanıtına güveniyor
- Validation yok

---

## 📊 HALÜSINASYON RİSK MATRİSİ

| Touchpoint | Model | Risk | Input Control | Output Control | Persistence |
|-----------|-------|------|----------------|-----------------|-------------|
| `/api/chat` | Groq 70b | 🔴 HIGH | ✅ Good | ❌ None | ✅ Quarantine* |
| `/api/intent-classify` | Groq 70b | 🟢 LOW | ✅ Good | ✅ Fixed modes | ✅ Temporary |
| `/api/daily-question` | Groq 70b | 🔴 HIGH | ✅ Good | ❌ None | ✅ 24h cache |
| `/api/node-stats/gaps` | Groq 70b | 🟡 MEDIUM | ✅ Good | ❌ None | ✅ 10m cache |
| `/api/documents/scan` | Groq 70b | 🔴 HIGH | ✅ Good | 🟡 Confidence | ✅ Quarantine |
| `/api/documents/ocr` | DocAI | 🟢 LOW | ✅ Good | ✅ Structural | ✅ DB |
| `/api/documents/vision` | VisionAI | 🟡 MEDIUM | ✅ Good | 🟡 Scored | ✅ DB metadata |

*Quarantine = Sprint 17 — 2+ peer review önce ağa girmez

---

## 🛡️ KONTROL MEKANİZMALARI

### Tier 1: Input Validation

| Endpoint | Kontrol |
|----------|---------|
| /api/chat | chatSchema validation ✅ |
| /api/intent-classify | intentClassifySchema ✅ |
| /api/documents/scan | documentId check ✅, rate limit ✅ |

### Tier 2: Rate Limiting

| System | Limit | Duration |
|--------|-------|----------|
| Chat | Groq quota (100K token/gün) | Global |
| Intent | INTENT_RATE_LIMIT | Per client |
| Gaps | 10 dakika cache | Global |
| Daily | 24 saat cache | Per network |

### Tier 3: Output Control

```
🔴 NONE (Chat):
   - AI annotations directly → canvas
   - No validation of content
   - No fallback if hallucinated

🟡 PARTIAL (Documents):
   - Confidence < 0.5 filtered
   - Quarantine pending review
   - But AI still generates false entities

🟢 FULL (Intent, OCR):
   - Fixed modes whitelist
   - Structured output
   - No freeform generation
```

---

## ⚠️ KRİTİK SORUNLAR

### SORUN #1: Chat Annotations Doğruluğu Kontrolsüz

**Location:** `/api/chat/route.ts` line 160-162
**Problem:** AI tarafından üretilen etiketler doğrudan 3D canvas'a çiziliyor

```typescript
annotations: {
  "uuid-1": "RECRUITED AGE 15",  // ← Uydurulmuş olabilir
  "uuid-2": "$150M SETTLEMENT"   // ← Veri kaynaklı olabilir
}
```

**Risk:** Yanlış bilgi kullanıcı raporlarında kullanılabilir

**Çözüm:**
- Annotation confidence score ekleme
- "⚠️ AI tarafından üretilen" flag'i
- User feedback mechanism

---

### SORUN #2: Daily Question Var Olmayan Bağlantılar Hakkında Soru Sorabilir

**Location:** `/api/daily-question/route.ts` line 63-90
**Problem:** Temperature 0.8 + creative prompt

```
AI: "Jean-Luc Brunel hangi terör örgütleriyle bağlantılı?"
❌ Belgede hiç yok, ama user bu soruyu araştırırsa
    yanlış yön izler
```

**Risk:** Topluluk zamanını boşa harcattırabilir

**Çözüm:**
- Temperature 0.2'ye düşür
- "Bu kişi hakkında daha neler bilebiliriz?" gibi genel sorular
- Var olan bağlantılara dayalı soru üret

---

### SORUN #3: Entity Extraction Placeholder Isimleri Kontrol Etmiyor

**Location:** `/api/documents/scan/route.ts` line 555-563
**Problem:** "John Doe" varyasyonları filtreli değil

```
Belgede: "John M. Doe, representing..."
AI: {name: "John M. Doe", type: "person", confidence: 0.8}
❌ Placeholder name olabilir, kontrol yok
```

**Risk:** Ağa gerçek olmayan "kişiler" girmesi

**Çözüm:**
- Placeholder list'i genişlet (John Doe, Jane Smith, vb.)
- Fuzzy matching: "John*" patterns
- Kontrol regex: `^[A-Z][a-z]+ [A-Z][a-z]+$` benzeri

---

### SORUN #4: Fuzzy Name Matching Yok

**Location:** `/api/documents/scan/route.ts` line 524-525
**Problem:** Ağdaki isimler exact match gerekiyor

```
Belgede: "Jean Luc Brunel"
Ağda: "Jean-Luc Brunel"
❌ Match olmaz, yeni node oluşturulabilir
```

**Risk:** Duplicate nodes, data quality

**Çözüm:**
- Jaro-Winkler distance (0.85+ = match)
- Türkçe karakter normalizasyonu
- RPC function: entity_resolution.ts

---

### SORUN #5: Vision AI Web Entities Yanıltıcı Olabilir

**Location:** `/api/documents/vision/route.ts` line 110-111
**Problem:** Web best guesses kötü eşleşmeler

```
Fotoğraf: Generic villa
Vision: "Epstein island", "Mar-a-Lago" (random guesses)
❌ İlişkisiz location tag'leri
```

**Risk:** Görsel yanlış ilişkilendirme

**Çözüm:**
- Web entities confidence > 0.8 only
- Landmark detection ülke/bölge kontrol (lat/long)
- Manual override mechanism

---

## 🔍 KONTROLLİ YENIDEN TEST ADAYLARI

### Test 1: Chat Hallucination Tespiti

```
Setup: Epstein ağı
Query: "Ölenler kimler?"
Expected: death_date dolu veya summary'de ölüm kelimesi
Not Allowed: Hayır, AI çıkarım

Node: "Jane Smith" (death_date = NULL, summary = "friend")
AI says: "Jane Smith ÖLDÜ 2019"
❌ FAIL — Hallucination
```

### Test 2: Entity Extraction Placeholder Kontrolü

```
Document: "Sample Letter: Dear John Doe..."
Expected: entities = []
Actual: entities = [{name: "John Doe", type: "person", confidence: 0.3}]
❌ FAIL — Filtered should be
```

### Test 3: Intent Classification Edge Cases

```
Query: "x" (çok kısa)
Expected: full_network (default)
Actual: ✅ full_network

Query: "para" (tek kelime)
Expected: full_network (confidence < 0.6, suggestMode: false)
Actual: ✅ Correct per code line 79-86
```

---

## 📋 REMEDIATION CHECKLIST

### Immediate (Critical)

- [ ] Chat API annotations'a source field ekleme
- [ ] Daily question generation temperature 0.2'ye düşürme
- [ ] Entity extraction "John Doe" list'ini genişletme
- [ ] Vision AI web entities > 0.8 confidence filter

### Short Term (1-2 Sprints)

- [ ] Fuzzy name matching (Jaro-Winkler)
- [ ] Entity resolution RPC optimize
- [ ] Annotation confidence scores
- [ ] User feedback mechanism (false positive reporting)

### Long Term (3+ Sprints)

- [ ] Claude Opus integration (hallucination awareness)
- [ ] Peer review UI improvements
- [ ] Automated fact-checking pipeline
- [ ] Knowledge graph consistency checker

---

## 📞 CRITICAL CONTACTS

| Role | Task |
|------|------|
| **Claude (AI)** | Hallucination detection, prompt refinement |
| **Raşit (PO)** | Remediation prioritization, test data |
| **QA Lead** | Test execution, regression prevention |

---

## 🎯 ÖZETİ

Project Truth **11 AI touchpoint** kullanıyor, bunlardan **3 tanesi YÜKSEK halüsinasyon riski taşıyor:**

1. **Chat Engine** — Annotations doğruluksuz ⚠️
2. **Document Scan** — Entity extraction halüsinasyon ⚠️
3. **Daily Question** — Var olmayan bağlantılar ⚠️

**Mevcut Kontrol:** Quarantine sistem (Sprint 17) + rate limiting + input validation
**Eksik Kontrol:** Output validation, confidence filtering, fallback mechanisms

**Kritik Soru:** "Bu platform bilgi kaynağı mı, yoksa keşif aracı mı?"
- Eğer **kaynaksa** → Peer review mastery
- Eğer **aracsa** → Warning labels + exploratory, not factual flagging

---

**Son Güncelleme:** 11 Mart 2026, 14:30 UTC
**Denetim Durum:** COMPLETE — All 11 touchpoints documented
**Next Review:** Sprint 18 sonrası (Remediation tamamlandıktan sonra)
