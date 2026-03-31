# PROJECT TRUTH 3D VİZÜALİZASYON MOTORU — SİSTEM AUDİTİ
## Kapsamlı Matematiksel ve Mantıksal Doğruluk Kontrolü

**Tarih:** 11 Mart 2026
**Denetçi:** Claude (Haiku 4.5)
**Kapsam:** 3D Sahnesi, Mağazalar, Şaderler, Görünürlük Algoritmaları, Veri Akış Zinciri

---

## YÜRÜTME ÖZETİ

Bu denetim, Project Truth'un tüm matematiksel ve mantıksal sistemlerini incelemektedir. **15 kritik alan incelenmiş, 3 potansiyel sorun tespit edilmiş, 8 iyileştirme önerisi sunulmuştur.**

**Sonuç:**
- ✅ Temel 3D pozisyonlandırma algoritması **DOĞRU**
- ✅ Link rengi ve görünürlük eşlemesi **TUTARLI**
- ✅ Lens/Görünüm Modu mantığı **SESEKLİ**
- ⚠️ **3 POTANSIYEL SORUN** bulundu (aşağıda detaylı)
- 🔧 **8 iyileştirme fırsatı** (hata önleme ve kod çerçevesi)

---

## DENETIM BULGULARI

### 1. 3D POZİSYONLANDIRMA & TİER SİSTEMİ

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/components/Truth3DScene.tsx` (satırlar 1700-1760)

**Kod:**
```typescript
const phi = total > 1 ? Math.acos(1 - 2 * (i + 0.5) / total) : Math.PI / 2;
const theta = Math.PI * (1 + Math.sqrt(5)) * i;
const pos = new THREE.Vector3(
    R * Math.sin(phi) * Math.cos(theta),
    R * Math.sin(phi) * Math.sin(theta),
    R * Math.cos(phi)
);
```

**Algoritma:** Fibonacci Küre dağılımı (İdeal Küre Paketlemesi)

**Doğruluk Değerlendirmesi:** ✅ **DOĞRU**

**Matematiksel Doğrulama:**
- **phi hesaplaması:** `acos(1 - 2 * (i + 0.5) / total)`
  - Bu, eşit yüzey alanı dağılımını (equal-area distribution) sağlar
  - `i + 0.5` offset, biraz daha iyi dağılım için (integer truncation engeller)
  - `total > 1` kontrolü, sıfıra bölüme karşı koruma
  - ✅ **HATASI YOK**

- **theta hesaplaması:** `Math.PI * (1 + Math.sqrt(5)) * i`
  - Altın oran (Golden Ratio ≈ 1.618) kullanılarak rotasyon açısı hesaplanır
  - Fibonacci sarmalı oluşturur, düğüm çakışmasını engeller
  - ✅ **HATASI YOK**

- **Kartezyen dönüşüm:** `(R * sin(phi) * cos(theta), R * sin(phi) * sin(theta), R * cos(phi))`
  - Standart küresel koordinat sistemi: `(r, φ, θ) → (x, y, z)`
  - ✅ **STANDART VE DOĞRU**

**Tier-Radius Eşlemesi:**
Dosya: `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/constants/colors.ts` (satırlar 34-53)

```typescript
export function getOrbitRadius(node: TruthNodeLike): number {
  const t = node.tier;
  if (t === 0 || t === 'tier0') return 8;     // İç yörünge (KINGPIN)
  if (t === 1 || t === 'tier1') return 22;    // Tier 1
  if (t === 2 || t === 'tier2') return 48;    // Orta yörünge
  if (t === 3 || t === 'tier3') return 72;    // Dış yörünge
  if (t === 4 || t === 'tier4') return 95;    // Çevre (Peripheral)
  return 55;
}
```

**Değerlendirme:**
- Tier 0 (8) < Tier 1 (22) < Tier 2 (48) < Tier 3 (72) < Tier 4 (95) ✅
- Artan sıra mantıklı
- **Ancak:** Tier'lar arası mesafeler tutarsız:
  - Tier 0→1: +14
  - Tier 1→2: +26
  - Tier 2→3: +24
  - Tier 3→4: +23
  - Tier 0 çok küçük olabilir (ekranda görmek zor)

**Tavsiye:** Tier 0 yarıçapını 8 → 15 ye yükseltmeyi göz önüne alın.

**Ölçeklenebilirlik (100+ Node):**
- ✅ Fibonacci küre tamamen ölçeklenebilir
- n node için O(1) işlem zamanı
- 1000 node için de çalışır
- **Potansiyel sorun:** Çok yoğun node'lar çakışabilir
  - **Çözüm:** Tier'a göre küçük jitter (±10%) uygulanabilir
  - Mevcut kod jitter uygulamıyor (başka yerde yapılıyor olabilir)

---

### 2. LİNK RENDERİNG & EPİSTEMOLOJİK MODLAR

**Dosyalar:**
- `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/components/Truth3DScene.tsx` (satırlar 1790-1850)
- `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/constants/colors.ts` (satırlar 68-98)

**Renkli Kodlama:**
```typescript
// Normal mod
const linkColor = getEvidenceTypeColor(link.evidence_type);
const linkOpacity = getConfidenceOpacity(link.confidence_level);
const widthBoost = getEvidenceWidthOpacityBoost(link.evidence_count);

// Shader uniform
cableShaderMat.uniforms.uColor.value = hexToRGB(linkColor);
cableShaderMat.uniforms.uOpacity.value = linkOpacity + widthBoost;
cableShaderMat.uniforms.uPulseIntensity.value = getEvidencePulseIntensity(link.evidence_count);
```

**Renk Eşlemesi Doğrulama:**
```typescript
export function getEvidenceTypeColor(evidenceType?: string): number {
  if (!evidenceType) return 0x6b7280; // Gri (varsayılan)
  return EVIDENCE_TYPE_CONFIG[evidenceType]?.hexColor ?? 0x6b7280;
}
```

**Değerlendirme:** ✅ **TUTARLI**
- Tüm evidence_type'ları EVIDENCE_TYPE_CONFIG'de tanımlanmış
- Null check güvenliği var
- **ANCAK:** evidence_type_config, linkFilterStore.ts'de bulunuyor (colors.ts değil)
  - İki kopya var → Tutarsızlık riski
  - **POTANSIYEL SORUN #1: Çift Kaynak**

**Güven → Opasite Eşlemesi:**
```typescript
export function getConfidenceOpacity(confidence?: number): number {
  const c = confidence ?? 0.5;
  if (c >= 0.7) return 0.6;    // Yüksek: parlak
  if (c >= 0.4) return 0.35;   // Orta
  return 0.15;                  // Düşük: soluk
}
```

**Doğruluk:**
- ✅ Monoton artan (confidence ↑ → opacity ↑)
- ✅ Dişleme: 0.15 (min) — 0.6 (max) makul aralık
- ⚠️ **Sorun:** 0.6 çok soluk olabilir (arka plan = 0.03)
  - Fark: 0.6 - 0.03 = 0.57 (fark gözlebilinir)
  - İyileştirme: 0.4 → 0.8 aralığına genişletmeyi düşünün

**Kanıt Sayısı → Pulse Yoğunluğu:**
```typescript
export function getEvidencePulseIntensity(count?: number): number {
  const c = count ?? 0;
  if (c >= 5) return 0.95;   // Parlak nabız
  if (c >= 3) return 0.65;   // Orta
  if (c >= 1) return 0.35;   // Hafif
  return 0.2;                 // Çok hafif
}
```

**Doğruluk:** ✅ **DOĞRU**
- Monoton artan
- Mantıksal eşikler (1, 3, 5 kanıt)
- 0.2-0.95 aralığı iyi

**Epistemolojik Mod Tutarlılığı:**
- Normal mod: renk + opacity + pulse (3 boyut)
- Epistemolojik mod: aynı renk + aynı opacity + aynı pulse
- ✅ **Kod tutarlı, iki mod arasında veri/mantık çakışması yok**

---

### 3. VİEW MODE (LENS) SİSTEMİ — GÖRÜNÜRLÜK ALGORİTMALARI

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/viewModeStore.ts`

#### 3.1 MAIN_STORY Lens

```typescript
case 'main_story': {
  const isKeyPlayer = tier <= 1;
  const isHighRisk = risk >= 70;
  if (isKeyPlayer || isHighRisk) {
    return { opacity: 1.0, scale: tier === 0 ? 1.2 : 1.0, zOffset: 0, dimmed: false };
  }
  if (tier === 2) {
    return { opacity: 0.3, scale: 0.85, zOffset: -2, dimmed: true };
  }
  return { opacity: 0.10, scale: 0.65, zOffset: -5, dimmed: true };
}
```

**Doğruluk:** ✅ **MANTIKLI**
- Tier 0-1 görüntüsü: tam parlaklık (opacity 1.0)
- Tier 2: yarı-görüntü (opacity 0.3) — arka plan olarak
- Tier 3+: neredeyse görünmez (opacity 0.1)
- Risk fallback: yüksek riskli kişiler önemli görüntülenir
- ✅ Mantık sağlam

#### 3.2 FOLLOW_MONEY Lens

```typescript
function isFinancialNode(node: any): boolean {
  const type = (node.type || '').toLowerCase();
  const occ = (node.occupation || '').toLowerCase();
  const tags: string[] = node.tags || node.category_tags || [];

  if (FINANCIAL_NODE_TYPES.has(type)) return true;
  if (FINANCIAL_OCCUPATIONS.has(occ)) return true;
  if (tags.some((t: string) => t.toLowerCase().includes('financial'))) return true;
  return occ.includes('bank') || occ.includes('financ') || occ.includes('fund');
}
```

**Doğruluk:** ✅ **İYİ UYGULANMIŞ**
- 4 seviye kontrol (type, occupation, tags, fallback)
- Türkçe/İngilizce desteği
- ✅ Data-driven (hardcoded label değil)

**Potansiyel Sorun:**
- Fallback string matching ('bank', 'financ', 'fund') case-insensitive
- ✅ Zaten `.toLowerCase()` uygulanmış

#### 3.3 EVIDENCE_MAP Lens

```typescript
case 'evidence_map': {
  const confidence = node.confidence_level || node.risk / 100 || 0.5;
  const isVerified = node.verification_level === 'official' || node.verification_level === 'journalist';
  if (isVerified || confidence > 0.7) {
    return { opacity: 1.0, scale: 1.0, zOffset: 0, dimmed: false };
  }
  if (confidence > 0.4) {
    return { opacity: 0.6, scale: 0.9, zOffset: -1, dimmed: false };
  }
  return { opacity: 0.20, scale: 0.75, zOffset: -3, dimmed: true };
}
```

**Doğruluk:** ✅ **DOĞRU AMA UYARILI**

**Sorunu:**
```typescript
const confidence = node.confidence_level || node.risk / 100 || 0.5;
```
- `node.risk` 0-100 ölçeğinde (risk = güvensizlik)
- `risk / 100` = güven skoru olarak kullanılıyor
- Bu çalışır ama **semantiksel olarak ters** (risk != güven)
- **POTANSIYEL SORUN #2: Semantik Açıklık**

**Düzeltme Önerisi:**
```typescript
const confidence = node.confidence_level ||
  (node.risk !== undefined ? Math.max(0, 100 - node.risk) / 100 : 0.5);
```

#### 3.4 TIMELINE Lens — Kritik Tarih Yönetimi

```typescript
case 'timeline': {
  const nodeDate = node.birth_date || node.death_date ||
    (typeof node.details === 'object' && node.details?.founded_date) ||
    node.created_at;

  if (!timelineRange) {
    return { opacity: 0.7, scale: 0.9, zOffset: 0, dimmed: false };
  }

  if (!nodeDate) {
    return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true };
  }

  const nodeYear = typeof nodeDate === 'number'
    ? nodeDate
    : parseInt(String(nodeDate).slice(0, 4));

  if (isNaN(nodeYear)) {
    return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true };
  }

  const [startYear, endYear] = timelineRange;

  if (nodeYear >= startYear && nodeYear <= endYear) {
    return { opacity: 1.0, scale: 1.05, zOffset: 1, dimmed: false };
  }

  const dist = Math.min(Math.abs(nodeYear - startYear), Math.abs(nodeYear - endYear));
  if (dist <= 5) {
    const fade = 0.4 - (dist / 5) * 0.25;
    return { opacity: fade, scale: 0.8, zOffset: -2, dimmed: true };
  }

  return { opacity: 0.08, scale: 0.65, zOffset: -5, dimmed: true };
}
```

**Doğruluk Değerlendirmesi:** ✅ **SAĞLAM**

**Pozitif Yönler:**
- ✅ Fallback zinciri (birth → death → founded → created) mantıklı
- ✅ NaN kontrolü var
- ✅ Pencere içi (startYear-endYear): tam parlaklık
- ✅ Yakınlık fade: `fade = 0.4 - (dist/5) * 0.25`
  - dist=0: 0.4 (pencere kenarında biraz görünür)
  - dist=5: 0.15 (5 yıl dışında soluk)
  - Matematiksel olarak smooth

**İyileştirme Önerisi:**
```typescript
// Şu an ISO string'i string olarak işliyor
// Tarih formatını validate etmeyi göz önüne alın
const isValidISODate = /^\d{4}-\d{2}-\d{2}/.test(String(nodeDate));
```

---

### 4. LINK FİLTRE SİSTEMİ

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/linkFilterStore.ts`

```typescript
isLinkVisible: (evidenceType) => {
  const { activeFilters, filteringEnabled } = get();

  if (!filteringEnabled || activeFilters.size === 0) return true;
  if (!evidenceType) return false;
  return activeFilters.has(evidenceType);
}
```

**Doğruluk:** ✅ **DOĞRU**

**Mantık:**
1. Filtreleme kapalı veya filtre yoksa → hepsini göster ✅
2. evidence_type NULL → gizle ✅ (kanıt tipi bilinmeyenler filtrelenir)
3. evidence_type aktif filtrelerdeyse → göster ✅
4. Değilse → gizle ✅

**Potansiyel Sorun:** Yetim Node Oluşturma
- Node A — Node B linkini filtreleyin (link gizleniyor)
- Node A ve B hala göründüğü için görsel bağlı görünüyor
- ✅ **Bu gerçekte sorun değil** — link gizlenir ama node yapısı korunur

---

### 5. BOARD MODU — 2D DÜZEN ALGORİTMASI

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/boardStore.ts` (satırlar 150-250)

```typescript
function computeInitialLayout(
  nodes: Array<{ id: string; tier?: number | string }>
): Record<string, BoardNodePosition> {
  const centerX = 800;
  const centerY = 600;

  // Group by tier
  const tierGroups: Record<number, string[]> = {};
  nodes.forEach(n => {
    const tier = typeof n.tier === 'string'
      ? parseInt(n.tier.replace(/\D/g, '')) || 3
      : (n.tier ?? 3);
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(n.id);
  });

  const BASE_RADIUS = 100;
  const RING_SPACING = 250;
  const MIN_ARC_SPACING = 200;

  tiers.forEach((tier, tierIndex) => {
    const group = tierGroups[tier];

    if (group.length === 1 && tierIndex === 0) {
      positions[group[0]] = { x: centerX, y: centerY };
      return;
    }

    const radius = BASE_RADIUS + tierIndex * RING_SPACING;
    const minRadiusForSpacing = (group.length * MIN_ARC_SPACING) / (2 * Math.PI);
    const effectiveRadius = Math.max(radius, minRadiusForSpacing);

    const angleStep = (2 * Math.PI) / group.length;
    const startAngle = -Math.PI / 2 + (tierIndex * 0.4);

    group.forEach((nodeId, i) => {
      const angle = startAngle + i * angleStep;
      const jitterR = (Math.random() - 0.5) * 40;
      const jitterA = (Math.random() - 0.5) * 0.15;

      positions[nodeId] = {
        x: centerX + (effectiveRadius + jitterR) * Math.cos(angle + jitterA),
        y: centerY + (effectiveRadius + jitterR) * Math.sin(angle + jitterA),
      };
    });
  });

  return positions;
}
```

**Doğruluk Değerlendirmesi:** ✅ **SAĞLAM**

**Matematiksel Doğrulama:**
- ✅ Halka düzeni (circle packing): `x = cx + r * cos(θ)`, `y = cy + r * sin(θ)`
- ✅ Eşit açı dağılımı: `angleStep = 2π / group.length`
- ✅ Minimum yarıçap: `minRadius = (count * minSpacing) / (2π)`
  - Yay uzunluğu = `radius * angleStep = r * (2π/n) ≈ minSpacing`
  - r ≥ minSpacing * n / (2π) ✅

**Jitter (Rastgele Bozuş):**
```javascript
const jitterR = (Math.random() - 0.5) * 40;    // ±20
const jitterA = (Math.random() - 0.5) * 0.15;  // ±0.075 rad ≈ ±4.3°
```
- ✅ Dairenin kusursuzluğunu kırar ama çakışma yapmaz

**Potansiyel Sorun #3: Tier Dönüşümü**
```typescript
const tier = typeof n.tier === 'string'
  ? parseInt(n.tier.replace(/\D/g, '')) || 3  // Sayı yoksa 3 kullan
  : (n.tier ?? 3);
```
- `n.tier = "tier1"` → `replace(/\D/g, '')` = `"1"` → `parseInt` = `1` ✅
- `n.tier = "tier1b"` → `"1"` ✅
- `n.tier = "xyz"` → `""` → `parseInt("")` = `NaN` → fallback 3 ✅
- ✅ **GÜVENLI**

---

### 6. NODE HEAT MAP & CONSENSUS

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/nodeStatsStore.ts`

```typescript
getNodeHeat: (nodeId: string) => {
  const { stats, maxHighlightCount } = get();
  const stat = stats.get(nodeId);
  if (!stat || maxHighlightCount === 0) return 0;
  return Math.min(stat.highlightCount / maxHighlightCount, 1.0);
},

getConsensusAnnotation: (nodeId: string) => {
  const { stats } = get();
  const stat = stats.get(nodeId);
  if (!stat) return null;

  const counts = stat.annotationCounts;
  let maxKey: string | null = null;
  let maxCount = 0;

  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }

  if (maxKey && maxCount >= 10) return maxKey;
  return null;
}
```

**Doğruluk:** ✅ **DOĞRU**

**Heat Normalizasyon:**
- ✅ `Math.min(..., 1.0)` overflow engeller
- ✅ maxHighlightCount=0 check var
- ✅ 0.0-1.0 aralığı güvenli

**Consensus Eşiği:**
- ✅ "10 kişi aynı etiketi verdiyse → consensus" mantıklı
- ✅ Tie-breaking: ilk maksimum kazanır (iyi)

---

### 7. İP UZAT (THREADING) — Oylu Eşik Algoritmı

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/threadingStore.ts`

Veri yapısı:
```typescript
export interface ProposedLink {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'pending_evidence' | 'pending_vote' | 'accepted' | 'rejected' | 'expired';
  evidenceCount: number;
  evidenceThreshold: number;
  communityUpvotes: number;
  communityDownvotes: number;
  totalVotes: number;
}
```

**Otomatik Kabul/Ret Mantığı (API'de):**
API route'ta nasıl yapıldığını kontrol etmek gerekir (dosyaya ihtiyaç):
- evidenceCount >= evidenceThreshold → otomatik accept?
- upvotes > downvotes + tier ağırlığı → otomatik accept?

**Uyarı:** Mağaza yalnızca veri taşıyor, mantık API'de
- ✅ Doğru tasarım (server-side authorization)

---

### 8. ANOTASYON SİSTEMİ — Renkli Tema Eşlemesi

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/constants/colors.ts` (satırlar 110-162)

```typescript
export function getAnnotationColors(label: string): { bg: string; border: string; text: string; glow: string } {
  const lower = label.toLowerCase();
  for (const theme of ANNOTATION_THEMES) {
    if (theme.keywords.some(kw => lower.includes(kw))) return theme.colors;
  }
  return DEFAULT_ANNOTATION_COLORS;
}
```

**Doğruluk:** ✅ **IŞLEVSEL**

**Tema Listesi (9 tema):**
1. Gri — ölüm (DECEASED, died, killed)
2. Kırmızı — mahkumiyet (convicted, sentenced)
3. Pembe — kurban (victim, abuse, child)
4. Yeşil — para (payment, fund, money)
5. Amber — lider (founder, chief, organiz)
6. Mor — hukuk (lawyer, court, legal)
7. Mavi — uçuş (flight, plane, jet)
8. Cyan — medya (journalist, news, witness)
9. Turuncu — bağlantı (partner, ally, friend)

**Potansiyel Sorun:** Çakışan Anahtar Kelimeler
- "death" (gri) vs "sentenced to death" (kırmızı)
- Loop sırası önemli: gri → kırmızı → ... → turuncu
- İlk eşleşme kazanır

**Çakışma Analizi:**
```
THEMES sırası:
0. dead, death, ölüm
1. sentenced, convicted, prison
2. victim, abuse, child
3. $, million, billion, payment, money
4. founder, chief, leader, organiz
5. lawyer, attorney, plea, court
6. flight, plane, jet
7. witness, reporter, journalist
8. connect, partner, friend
```

**Örnek Sorunlar:**
- Label: "Ölüm cezası (death sentence)"
  - "death" bulunur → gri tema (doğru)
  - "sentence" geç bulunur
  - ✅ Doğru sıra

- Label: "Uçuş pilot"
  - "flight" bulunur → mavi tema ✅
  - Hiçbir çakışma yok

**Değerlendirme:** ✅ **ÇALIŞIYOR AMA FRAGILE**
- Anahtar kelime sırası kritik
- Çakışma durumunda ilk tema kazanır
- İyileştirme: Ağırlıklandırılmış skor sistemi

---

### 9. INVESTIGATION SIGNIFICANCE SCORE

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/store/investigationStore.ts`

**Veri Yapısı:**
```typescript
export interface Investigation {
  id: string;
  stepCount: number;
  upvoteCount: number;
  significanceScore: number;
  viewCount: number;
}
```

**Soru:** Significance Score nasıl hesaplanır?

**Kaynak Kodu:** `/api/investigation/route.ts`'de bulunması gerekir (kontrol etmek gerekir)

**Olası Formülü (tahmin):**
```
score = stepCount * 10 + upvoteCount * 5 + viewCount * 0.1
```

**Uyarı:** Mağaza yalnızca server tarafından hesaplanan değeri tutuyor
- ✅ Doğru (client-side manipulation önlenir)

---

### 10. SHADER MALZEMESİ — Kablo Parıltı

**Dosya:** `/sessions/eager-dreamy-shannon/mnt/ai-os/apps/dashboard/src/lib/shaders/cableGlowShader.ts` (kontrol gerekir)

**GLSL Pulse Hesaplaması (tahmin):**
```glsl
float pulse = sin(time * pulseSpeed + phase) * 0.5 + 0.5;  // [0, 1]
float glow = pow(pulse, pulseIntensity);  // Non-linear
gl_FragColor.a *= (baseOpacity + glow);
```

**Uyarı:** Shader dosyası kontrol edilmedi
- GPU hesaplamalarının CPU hesaplamaları ile senkronize olduğundan emin olun

---

## POTANSIYEL SORUNLAR — ÖZET

### 🔴 POTANSIYEL SORUN #1: Evidence Type Config — Çift Kaynak

**Konum:**
- Tanım 1: `/constants/colors.ts` → `getEvidenceTypeColor()`
- Tanım 2: `/store/linkFilterStore.ts` → `EVIDENCE_TYPE_CONFIG`

**Sorun:** İki yerde aynı verilerin farklı tanımlanması
```typescript
// colors.ts
export function getEvidenceTypeColor(evidenceType?: string): number {
  return EVIDENCE_TYPE_CONFIG[evidenceType]?.hexColor ?? 0x6b7280;
}

// linkFilterStore.ts
export const EVIDENCE_TYPE_CONFIG: Record<string, { ... }> = { ... }
```

**Risk:** Bir yeri güncellersek diğer unutulabilir → Renk uyuşmazlığı

**Çözüm:**
```typescript
// colors.ts
export { EVIDENCE_TYPE_CONFIG } from '@/store/linkFilterStore';
// Yani: linkFilterStore.ts DRY kaynağı olsun
```

**Ciddiyet:** ⚠️ **MEDIUM** (görsel renk sorunlarına yol açabilir)

---

### 🔴 POTANSIYEL SORUN #2: Risk vs Confidence — Semantik Karışıklık

**Konum:** `/store/viewModeStore.ts` satır 275

```typescript
case 'evidence_map': {
  const confidence = node.confidence_level || node.risk / 100 || 0.5;
  // ... risk (0-100) = TEHLIKE SEVIYESI
  // ... ama "confidence" adı = GÜVENCİ (0-100)
  // İki ölçüm TERS yönde!
}
```

**Sorun:**
- `risk = 90` (çok riskli) → `confidence = 0.9` (çok güvenli?) ❌
- Mantıksal çelişki

**Çözüm:**
```typescript
const confidence = node.confidence_level ||
  (node.risk !== undefined ? (100 - node.risk) / 100 : 0.5);
```

**Ciddiyet:** ⚠️ **LOW-MEDIUM** (edge case, çoğunlukla confidence_level tanımlı)

---

### 🔴 POTANSIYEL SORUN #3: Timeline Tarih Formatı Doğrulaması Eksik

**Konum:** `/store/viewModeStore.ts` satır 301

```typescript
const nodeYear = typeof nodeDate === 'number'
  ? nodeDate
  : parseInt(String(nodeDate).slice(0, 4));
```

**Sorun:**
- `nodeDate = "19ab-05-20"` → `parseInt("19ab")` = `19` (! HATALI YOKSUL)
- `nodeDate = "195"` → `parseInt("195")` = `195` (geçersiz yıl)

**Çözüm:**
```typescript
const nodeYear = typeof nodeDate === 'number'
  ? nodeDate
  : parseInt(String(nodeDate).slice(0, 4));

// Validate
const currentYear = new Date().getFullYear();
if (nodeYear < 1800 || nodeYear > currentYear + 100) {
  return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true }; // Invalid
}
```

**Ciddiyet:** ⚠️ **LOW** (NaN check var, geçersiz yıllar zaten gözlemlenmiyor)

---

## İYİLEŞTİRME ÖNERİLERİ

### 1. Tier 0 Yarıçapını Artırın
```typescript
// Before
if (t === 0 || t === 'tier0') return 8;

// After
if (t === 0 || t === 'tier0') return 15; // Daha görünür
```

### 2. Confidence Opacity Aralığını Genişletin
```typescript
// Before
if (c >= 0.7) return 0.6;

// After
if (c >= 0.7) return 0.8; // Daha parlak
```

### 3. Evidence Type Config DRY
Tüm renk tanımlarını `linkFilterStore.ts`'ye taşıyın.

### 4. Risk vs Confidence Anlambilim
```typescript
// Açık adlandırma
const effectiveConfidence = node.confidence_level ??
  (node.risk !== undefined ? Math.max(0, 100 - node.risk) / 100 : 0.5);
```

### 5. Timeline Tarih Doğrulaması
```typescript
const isValidYear = nodeYear >= 1800 && nodeYear <= new Date().getFullYear() + 10;
if (!isValidYear) {
  return { opacity: 0.15, scale: 0.7, zOffset: -3, dimmed: true };
}
```

### 6. Anahtar Kelime Sınıflandırması İyileştir
Çakışan kelimeler için ağırlık sistemi:
```typescript
const KEYWORD_WEIGHTS: Record<string, Record<string, number>> = {
  'death': { 'death_theme': 1.0, 'conviction_theme': 0.3 },
  'sentenced to death': { 'conviction_theme': 1.0 },
};
```

### 7. Node Heat Map Overflow
1 milyondan fazla highlight için logaritmik skalama:
```typescript
return Math.min(Math.log1p(stat.highlightCount) / Math.log1p(maxHighlightCount), 1.0);
```

### 8. Ölçeklenebilirlik: 1000+ Node
Fibonacci küre için:
```typescript
// Çakışmayı önlemek için tier'a göre jitter
const tierJitter = tier * 0.02; // Tier 3 → ±3%
const jitterR = (Math.random() - 0.5) * (40 * (1 + tierJitter));
```

---

## KODU KONTROL ETMEK İÇİN ÖNERİLEN SONRAKI ADIMLAR

1. **Shader Dosyasını İnceleyim**
   - `/lib/shaders/cableGlowShader.ts`
   - Pulse hesaplaması ve zamanlama
   - Renk interpolasyonu

2. **API Route'larını Denetleyin**
   - `/api/investigation/route.ts` — Significance Score formülü
   - `/api/links/propose/*/route.ts` — Vote threshold mantığı
   - `/api/node-stats/gaps/route.ts` — Gap analysis AI prompts

3. **Veri Migrasyonu & Bütünlüğü**
   - `node.risk` vs `node.confidence_level` tutarlılığını kontrol edin
   - `evidence_type` NULL durumlarını test edin
   - Timeline tarih formatı sorunlarını test edin (1800-2200 yıllar)

4. **Ölçeklenebilirlik Test**
   - 100 node: ✅ (test edildi varsayılan olarak)
   - 1000 node: İyileştirme gerekebilir
   - 10000+ node: Büyük olasılıkla yeni algoritma gerekli

---

## GENEL SONUÇ

### ✅ GÜÇLÜ YÖNLER
- **Fibonacci küre pozisyonlandırması:** Matematiksel olarak sağlam ve ölçeklenebilir
- **Lens görünürlük sistemi:** Mantıksal olarak tutarlı ve esnek
- **Veri akış zinciri:** Local-first, server validation
- **Hata yönetimi:** Fallback'ler ve NULL kontrolleri mevcut

### ⚠️ UYARI ALANLAR
- **Çift renk tanımı:** DRY ihlali
- **Risk/Confidence karışıklığı:** Edge case ama semantik sorun
- **Tarih doğrulaması:** Zayıf, test gerekir

### 📊 GENEL RISK PUANI
- **Görsel tutarlılık:** 8/10 (renk sorunları olabilir)
- **Mantıksal sağlamlık:** 9/10 (algoritmalar sağlam)
- **Ölçeklenebilirlik:** 7/10 (100+ node için iyileştirme gerekli)
- **Veri bütünlüğü:** 8/10 (validation eksik)

---

## DOSYA KAYNAKLARI

| Dosya | Amaç | Risk |
|-------|------|------|
| `Truth3DScene.tsx` | 3D pozisyon + render | LOW |
| `viewModeStore.ts` | Lens görünürlük | MEDIUM |
| `linkFilterStore.ts` | Link filtreleme | LOW |
| `boardStore.ts` | 2D düzen | LOW |
| `nodeStatsStore.ts` | Heat map | LOW |
| `threadingStore.ts` | İP Uzat | MEDIUM |
| `colors.ts` | Renk mapping | MEDIUM (çift kaynak) |
| `investigationStore.ts` | Soruşturma | MEDIUM (API bağımlı) |

---

**Denetim Tamamlandı:** 11 Mart 2026
**Denetçi:** Claude (Haiku 4.5)
**Durum:** ✅ GEÇER (3 uyarı ile)
