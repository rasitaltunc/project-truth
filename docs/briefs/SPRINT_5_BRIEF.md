# SPRINT 5 BRIEF — "Kolektif Zeka + Keşif Mekanizması"

> Felsefe: "Bir kişi sorar, herkes öğrenir. Sorulmamış sorular, en tehlikeli boşluklardır."

## DURUM

Sprint 4 ✅ TAMAMLANDI — Investigation sistemi (local-first), publish, replay, fork çalışıyor.
Sprint 5'in amacı: Kullanıcı sorgularını **kolektif zekaya** dönüştürmek. Her soru ağı daha akıllı yapar.

## ÖN KOŞULLAR

`node_query_stats` tablosu Sprint 4 migration'da OLUŞTURULDU ama BOŞ. Bu sprint populate edecek.

```sql
-- ZATen VAR (SPRINT4_SUPABASE_MIGRATION.sql satır 95-102)
CREATE TABLE IF NOT EXISTS node_query_stats (
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE PRIMARY KEY,
  highlight_count INTEGER NOT NULL DEFAULT 0,
  annotation_counts JSONB NOT NULL DEFAULT '{}',
  unique_investigators INTEGER NOT NULL DEFAULT 0,
  last_queried_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## MİMARİ GENEL BAKIŞ

```
Kullanıcı soru sorar → AI cevap verir → highlightNodeIds döner
    ↓
chatStore.sendMessage() zaten investigation step kaydediyor
    ↓ (YENİ)
node_query_stats tablosuna increment (highlight_count, annotation_counts)
    ↓
3D Scene: node boyutu/glow'u = highlight_count'a göre (Heat Map)
    ↓
Gap Analysis: "Bu node hiç sorgulanmadı" → öneri
    ↓
"İlk Keşfeden" rozeti → 0'dan 1'e geçişi tetikler
    ↓
"Günün Sorusu" → AI gap analysis'ten üretir
```

---

## MEVCUT DOSYA HARİTASI (Referans)

### Store'lar
| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `src/store/chatStore.ts` | 231 | Chat state + AI entegrasyonu |
| `src/store/investigationStore.ts` | 371 | Investigation lifecycle, local-first |
| `src/store/truthStore.ts` | ? | Network state (nodes, links) |
| `src/store/useStore.ts` | ? | Archive/UI state |

### API Route'ları
| Dosya | Açıklama |
|-------|----------|
| `src/app/api/chat/route.ts` | Groq AI chat (196 satır) |
| `src/app/api/investigation/route.ts` | Investigation CRUD |
| `src/app/api/investigation/step/route.ts` | Step ekleme |
| `src/app/api/investigation/feed/route.ts` | Published feed |
| `src/app/api/truth/route.ts` | Node/link fetch |

### Components
| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `src/components/Truth3DScene.tsx` | 1752 | 3D engine (highlight, glow, annotation) |
| `src/components/ChatPanel.tsx` | 517 | Sol chat paneli |
| `src/components/InvestigationBanner.tsx` | 390 | Yayınla banner'ı |
| `src/components/StoryPanel.tsx` | ? | Sağ hikaye paneli |

### Lib
| Dosya | Açıklama |
|-------|----------|
| `src/lib/chat/networkContext.ts` | Network → LLM context builder |
| `src/lib/supabaseClient.ts` | Client-side Supabase |
| `src/lib/supabase.ts` | Admin/service role (supabaseAdmin) |

---

## SPRINT 5A — Query-Weight Intelligence Layer (Backend)

### Görev 1: API Route — `/api/node-stats/route.ts` (YENİ)

Bu route node_query_stats tablosunu günceller ve okur.

```typescript
// POST /api/node-stats — Sorgu sonrası node stats güncelle
// Body: { nodeIds: string[], annotations: Record<string, string>, fingerprint: string }
//
// Her nodeId için:
//   1. UPSERT node_query_stats: highlight_count += 1
//   2. annotation_counts JSONB güncelle (her annotation type count++)
//   3. unique_investigators: fingerprint daha önce bu node'u sorgulamadıysa +1
//   4. last_queried_at = now()
//
// GET /api/node-stats — Tüm node stats'ları getir (Heat Map için)
// Response: { stats: NodeQueryStat[] }
//
// GET /api/node-stats/gaps — Hiç sorgulanmamış node'ları getir (Gap Analysis)
// Response: { gaps: { nodeId, nodeName, nodeType, connections }[] }
```

**Dosya:** `src/app/api/node-stats/route.ts` (YENİ)

**Supabase Sorguları:**
```sql
-- UPSERT (POST handler)
INSERT INTO node_query_stats (node_id, highlight_count, annotation_counts, unique_investigators, last_queried_at)
VALUES ($1, 1, $2, 1, now())
ON CONFLICT (node_id) DO UPDATE SET
  highlight_count = node_query_stats.highlight_count + 1,
  annotation_counts = node_query_stats.annotation_counts || $2,  -- JSONB merge
  unique_investigators = CASE
    WHEN NOT EXISTS (SELECT 1 FROM investigation_steps WHERE $3 = ANY(highlight_node_ids) ... )
    THEN node_query_stats.unique_investigators + 1
    ELSE node_query_stats.unique_investigators
  END,
  last_queried_at = now(),
  updated_at = now();

-- GAP ANALYSIS (GET /gaps)
SELECT n.id, n.name, n.type, n.tier
FROM nodes n
LEFT JOIN node_query_stats nqs ON n.id = nqs.node_id
WHERE nqs.node_id IS NULL OR nqs.highlight_count = 0
ORDER BY n.tier ASC;  -- Yüksek tier'dakiler önce (daha önemli ama sorgulanmamış)
```

**⚠️ ÖNEMLİ:** Supabase PostgREST schema cache sorunu var. Eğer direkt `.from('node_query_stats')` çalışmazsa, RPC function yaz:

```sql
-- Supabase SQL Editor'da çalıştır
CREATE OR REPLACE FUNCTION upsert_node_query_stat(
  p_node_id UUID,
  p_annotation_key TEXT DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO node_query_stats (node_id, highlight_count, unique_investigators, last_queried_at)
  VALUES (p_node_id, 1, 1, now())
  ON CONFLICT (node_id) DO UPDATE SET
    highlight_count = node_query_stats.highlight_count + 1,
    last_queried_at = now(),
    updated_at = now();

  -- Annotation count güncelle
  IF p_annotation_key IS NOT NULL THEN
    UPDATE node_query_stats
    SET annotation_counts = jsonb_set(
      COALESCE(annotation_counts, '{}'),
      ARRAY[p_annotation_key],
      to_jsonb(COALESCE((annotation_counts->>p_annotation_key)::int, 0) + 1)
    )
    WHERE node_id = p_node_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_node_query_stats()
RETURNS SETOF node_query_stats AS $$
  SELECT * FROM node_query_stats ORDER BY highlight_count DESC;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_gap_nodes(p_network_id UUID)
RETURNS TABLE(id UUID, name TEXT, type TEXT, tier TEXT) AS $$
  SELECT n.id, n.name, n.type, n.tier
  FROM nodes n
  LEFT JOIN node_query_stats nqs ON n.id = nqs.node_id
  WHERE n.network_id = p_network_id
    AND (nqs.node_id IS NULL OR nqs.highlight_count = 0)
  ORDER BY n.tier ASC;
$$ LANGUAGE sql;
```

### Görev 2: chatStore.ts Entegrasyonu — Stats Güncelleme

`chatStore.ts` → `sendMessage()` fonksiyonunda, AI cevap döndükten SONRA (satır ~176 civarı, investigation step kaydından sonra):

```typescript
// chatStore.ts sendMessage() içine ekle (investigation step kaydından sonra)

// Sprint 5: Node query stats güncelle (arka planda)
if (highlightNodeIds.length > 0) {
  try {
    await fetch('/api/node-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeIds: highlightNodeIds,
        annotations: result.annotations || {},
        fingerprint: useInvestigationStore.getState().fingerprint,
      }),
    });
  } catch (err) {
    // Sessizce devam et — local-first felsefesi
    console.warn('Node stats update failed:', err);
  }
}
```

**Pattern:** Local-first, arka planda fire-and-forget. UI'ı bloklamaz.

### Görev 3: "İlk Keşfeden" Tespit Mekanizması

`/api/node-stats` POST handler'da, eğer node'un highlight_count'u 0'dan 1'e geçiyorsa:

```typescript
// POST handler response'una ekle:
{
  updatedStats: [...],
  firstDiscoveries: [
    { nodeId: "uuid-xxx", nodeName: "Ghislaine Maxwell", discoveredBy: "fp_abc123" }
  ]
}
```

chatStore bu `firstDiscoveries` array'ini alacak ve UI'a event fırlatacak.

---

## SPRINT 5B — Node Heat Map (3D Visualization)

### Görev 4: nodeStatsStore.ts (YENİ Zustand Store)

```typescript
// src/store/nodeStatsStore.ts (YENİ)
import { create } from 'zustand';

interface NodeStat {
  nodeId: string;
  highlightCount: number;
  annotationCounts: Record<string, number>; // {"DECEASED": 5, "CONVICTED": 2}
  uniqueInvestigators: number;
  lastQueriedAt: string;
}

interface NodeStatsState {
  stats: Map<string, NodeStat>;
  gapNodes: { id: string; name: string; type: string; tier: string }[];
  maxHighlightCount: number;
  isLoaded: boolean;

  // Actions
  fetchStats: () => Promise<void>;
  fetchGapNodes: (networkId: string) => Promise<void>;
  getNodeHeat: (nodeId: string) => number; // 0.0 - 1.0 normalized
  getConsensusAnnotation: (nodeId: string) => string | null; // 10+ olunca
  updateLocalStat: (nodeId: string, annotation?: string) => void;
}
```

**`getNodeHeat(nodeId)`:** `highlight_count / maxHighlightCount` → 0.0 ile 1.0 arası normalize.

**`getConsensusAnnotation(nodeId)`:** annotation_counts'ta herhangi bir key 10+ ise o annotation'ı döndür.

### Görev 5: Truth3DScene.tsx — Heat Map Entegrasyonu

Mevcut Truth3DScene.tsx'te node'lar sabit boyutta. Heat map ile:

1. **Node boyutu:** `baseScale + (heat * 0.5)` → en çok sorgulanan node %50 daha büyük
2. **Glow yoğunluğu:** Sıcak node'lar hafif sürekli pulse (highlight olmadan bile)
3. **Renk tonu:** Normal node rengi + heat overlay (opsiyonel, karmaşık olabilir)

```typescript
// Truth3DScene.tsx'e yeni prop:
interface Props {
  // ... mevcut prop'lar
  nodeHeatMap?: Map<string, number>; // nodeId → 0.0-1.0
  consensusAnnotations?: Map<string, string>; // nodeId → "DECEASED"
}

// animate() loop içinde (satır ~632):
// Her node için:
const heat = nodeHeatMap?.get(nodeId) || 0;
const baseScale = tierScale; // mevcut tier-based scale
const heatScale = baseScale * (1 + heat * 0.5); // max %50 büyüme
mesh.scale.setScalar(heatScale);

// Sürekli pulse (highlight aktif DEĞİLKEN):
if (!highlightActive && heat > 0.3) {
  const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.05 * heat;
  mesh.scale.multiplyScalar(pulse);
}
```

**Consensus Annotations:** `consensusAnnotations` map'teki node'lar için kalıcı badge sprite göster (mevcut annotation sistemiyle aynı, ama highlight olmadan da görünür).

### Görev 6: truth/page.tsx — Heat Map Veri Akışı

```typescript
// truth/page.tsx'e ekle:
import { useNodeStatsStore } from '@/store/nodeStatsStore';

// Component içinde:
const { stats, fetchStats, getNodeHeat, getConsensusAnnotation } = useNodeStatsStore();

// useEffect — sayfa yüklenince stats çek:
useEffect(() => {
  fetchStats();
}, []);

// nodeHeatMap oluştur:
const nodeHeatMap = useMemo(() => {
  const map = new Map<string, number>();
  stats.forEach((stat, nodeId) => {
    map.set(nodeId, getNodeHeat(nodeId));
  });
  return map;
}, [stats]);

// Truth3DScene'e prop olarak geç:
<Truth3DScene
  // ... mevcut prop'lar
  nodeHeatMap={nodeHeatMap}
  consensusAnnotations={consensusAnnotationsMap}
/>
```

---

## SPRINT 5C — "İlk Keşfeden" Banner

### Görev 7: FirstDiscoveryBanner.tsx (YENİ Component)

Metin2 boss-kill tarzı tam ekran banner:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│    ⚡ İLK KEŞİF ⚡                                      │
│                                                          │
│    "Ghislaine Maxwell" düğümünü ilk siz sorgulattınız!  │
│                                                          │
│    🏆 Keşif Rozeti Kazandınız                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tasarım:**
- Full-width overlay, `position: fixed`, `z-index: 9999`
- Arka plan: `bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#7f1d1d]`
- Animasyon: `scale(0) → scale(1.1) → scale(1)` bounce, 0.5s
- Auto-dismiss: 4 saniye sonra `opacity → 0` ile kaybolur
- Ses efekti: Opsiyonel (tarayıcı izin gerektirmez sessiz animasyon yeterli)

```typescript
// src/components/FirstDiscoveryBanner.tsx (YENİ)
interface Props {
  nodeName: string;
  onDismiss: () => void;
}

// Kullanım (truth/page.tsx'te):
// chatStore'dan firstDiscovery event gelince:
{firstDiscovery && (
  <FirstDiscoveryBanner
    nodeName={firstDiscovery.nodeName}
    onDismiss={() => setFirstDiscovery(null)}
  />
)}
```

### Görev 8: chatStore — First Discovery Event

chatStore.ts'e yeni state ekle:

```typescript
interface ChatState {
  // ... mevcut state
  firstDiscovery: { nodeId: string; nodeName: string } | null;
  clearFirstDiscovery: () => void;
}
```

`sendMessage()` içinde `/api/node-stats` POST response'unda `firstDiscoveries` varsa:

```typescript
if (statsData.firstDiscoveries?.length > 0) {
  const disc = statsData.firstDiscoveries[0];
  set({ firstDiscovery: { nodeId: disc.nodeId, nodeName: disc.nodeName } });
}
```

---

## SPRINT 5D — Gap Analysis Engine

### Görev 9: Gap Analysis API — `/api/node-stats/gaps/route.ts` (YENİ)

```typescript
// GET /api/node-stats/gaps?networkId=xxx
// Response:
{
  gaps: [
    {
      nodeId: "uuid-xxx",
      nodeName: "Prince Andrew",
      nodeType: "person",
      tier: "tier2",
      connectionCount: 5,  // kaç bağlantısı var
      connectedToQueried: true, // sorgulanan node'lara bağlı mı
    }
  ],
  aiSuggestions: [
    "Prince Andrew'un Epstein ile 8 bağlantısı var ama hiç sorgulanmadı. 'Prince Andrew kimlerle görüşmüş?' deneyin.",
    "Les Wexner finansal bağlantıları hiç araştırılmadı."
  ]
}
```

**AI Suggestions:** Groq'a gap node'ları gönder, "Bu node'lar hakkında kullanıcıların sorabileceği ilginç sorular üret" de.

### Görev 10: Gap Analysis UI — ChatPanel'e Entegre

ChatPanel.tsx'in üst kısmına veya boş durumda (ilk açılışta):

```
┌─────────────────────────┐
│ 🔍 KEŞFET               │
│                         │
│ Bu node'lar hiç         │
│ sorgulanmadı:           │
│                         │
│ ○ Prince Andrew (tier2) │
│   "5 bağlantısı var"   │
│                         │
│ ○ Les Wexner (tier2)   │
│   "Finansal bağlantı"  │
│                         │
│ 💡 Öneri: "Prince       │
│ Andrew kimlerle         │
│ görüşmüş?"             │
│ [Bunu Sor →]            │
└─────────────────────────┘
```

"Bunu Sor →" butonuna tıklayınca suggestion'ı direkt chat input'a yapıştır ve gönder.

**Gösterilme kuralı:**
- İlk açılışta göster (chat boşken)
- Her 5 sorgudan sonra "henüz sorgulanmamış X node var" reminder
- Tüm node'lar en az 1 kez sorgulandıysa: "🏆 Tüm ağ tarandı!" mesajı

---

## SPRINT 5E — Consensus Annotations (Kalıcı Etiketler)

### Görev 11: Consensus Logic

`nodeStatsStore.getConsensusAnnotation()`:

```typescript
getConsensusAnnotation: (nodeId: string) => {
  const stat = get().stats.get(nodeId);
  if (!stat) return null;

  const counts = stat.annotationCounts;
  // En yüksek count'a sahip annotation'ı bul
  let maxKey: string | null = null;
  let maxCount = 0;

  for (const [key, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  }

  // 10+ farklı kullanıcı aynı annotation'ı verdiyse → consensus
  if (maxKey && maxCount >= 10) {
    return maxKey;
  }
  return null;
}
```

### Görev 12: 3D Kalıcı Badge

Truth3DScene.tsx'te mevcut annotation sprite sistemi var (satır ~1538-1624). Şu an sadece AI highlight sırasında görünüyor.

**Değişiklik:** `consensusAnnotations` prop'undaki node'lar için annotation badge'i **her zaman** göster (highlight olmadan da).

```typescript
// Truth3DScene.tsx animate() loop'unda:
// Mevcut: annotation sprite sadece highlightActive iken gösterilir
// Yeni: consensusAnnotations'daki node'lar için her zaman göster

consensusAnnotations?.forEach((annotation, nodeId) => {
  const mesh = nodeMeshes.find(m => m.userData.nodeId === nodeId);
  if (mesh) {
    // Kalıcı badge sprite oluştur/göster (mevcut createAnnotationSprite fonksiyonu)
    // opacity: 0.7 (highlight'taki 1.0'dan biraz düşük)
    // position: node'un üstünde
  }
});
```

---

## SPRINT 5F — "Günün Sorusu" Sistemi

### Görev 13: Daily Question API — `/api/daily-question/route.ts` (YENİ)

```typescript
// GET /api/daily-question?networkId=xxx
// 1. Gap node'ları çek (sorgulanmamış veya az sorgulanmış)
// 2. En ilginç gap'i seç (connectionCount'a göre)
// 3. Groq'a gönder: "Bu node hakkında merak uyandıracak bir soru üret"
// 4. Cache: 24 saat boyunca aynı soruyu döndür (Supabase'de cache tablosu veya basit memory)

// Response:
{
  question: "Ghislaine Maxwell'in Epstein'dan sonra ne yaptığını biliyor musunuz?",
  targetNodeId: "uuid-xxx",
  targetNodeName: "Ghislaine Maxwell",
  expiresAt: "2026-03-02T00:00:00Z",
  answeredCount: 0, // kaç kişi bu soruyu sordu
}
```

### Görev 14: Daily Question UI — truth/page.tsx

Sayfanın üst kısmında veya ChatPanel'in başında küçük bir banner:

```
┌─────────────────────────────────────────────────┐
│ 🔥 GÜNÜN SORUSU                                 │
│ "Maxwell'in Epstein sonrası bağlantıları neler?" │
│ [Bu Soruyu Sor →]           3 kişi sorguladı    │
└─────────────────────────────────────────────────┘
```

Tıklayınca → chat'e soruyu yapıştır ve gönder. `answeredCount++` güncelle.

---

## TEST PLANI

1. Chat'te soru sor → `/api/node-stats` POST çağrıldı mı? (Network tab'da kontrol)
2. Aynı node'u 3 kez sorgula → `highlight_count` 3 oldu mu?
3. 3D'de node boyutu arttı mı? (Heat map görsel kontrol)
4. Hiç sorgulanmamış node var → Gap Analysis öneri gösteriyor mu?
5. "Bunu Sor →" tıkla → soru chat'e gitti mi, cevap geldi mi?
6. Yeni node ilk kez sorgulandı → "İLK KEŞİF" banner çıktı mı?
7. Banner 4 saniye sonra kayboldu mu?
8. 10 farklı annotation aynı node'a → consensus badge kalıcı göründü mü?
9. Günün Sorusu → 24 saat aynı soru mu dönüyor?
10. Günün Sorusunu sor → answeredCount arttı mı?

---

## ÖNCELİK SIRASI

| Sıra | Görev | Sprint | Tahmini |
|------|-------|--------|---------|
| 1 | API Route `/api/node-stats` + RPC functions (Görev 1) | 5A | 1 saat |
| 2 | chatStore entegrasyonu — stats güncelleme (Görev 2) | 5A | 30 dk |
| 3 | nodeStatsStore.ts (Görev 4) | 5B | 45 dk |
| 4 | Truth3DScene heat map (Görev 5) | 5B | 1 saat |
| 5 | truth/page.tsx veri akışı (Görev 6) | 5B | 30 dk |
| 6 | İlk Keşfeden tespit + banner (Görev 3, 7, 8) | 5C | 1 saat |
| 7 | Gap Analysis API + UI (Görev 9, 10) | 5D | 1.5 saat |
| 8 | Consensus annotations (Görev 11, 12) | 5E | 45 dk |
| 9 | Günün Sorusu (Görev 13, 14) | 5F | 1 saat |
| 10 | Test + Polish | — | 30 dk |

**Toplam tahmini:** ~8 saat

---

## KRİTİK UYARILAR (Sonnet İçin)

### 1. Supabase PostgREST Schema Cache Sorunu
`supabaseAdmin.from('node_query_stats')` çalışmayabilir. **RPC function kullan:**
```typescript
const { data, error } = await supabaseAdmin.rpc('upsert_node_query_stat', {
  p_node_id: nodeId,
  p_annotation_key: annotationKey || null,
  p_fingerprint: fingerprint,
});
```

### 2. Local-First Felsefesi
Stats güncelleme ASLA UI'ı bloklamamalı. `try/catch` ile sar, hata olursa sessizce devam et.

### 3. Import Path'leri
```typescript
import { supabaseAdmin } from '@/lib/supabase';          // Server-side (API routes)
import { supabaseClient } from '@/lib/supabaseClient';    // Client-side (stores)
```

### 4. Truth3DScene Dikkat
Bu dosya 1752 satır ve çok hassas. Minimal değişiklik yap:
- Yeni prop ekle (`nodeHeatMap`, `consensusAnnotations`)
- `animate()` loop'unda scale hesaplamasına heat factor ekle
- Consensus badge için mevcut annotation sprite kodunu yeniden kullan
- **ASLA** mevcut highlight/cinematic/glow mantığına dokunma

### 5. Groq Rate Limit
Ücretsiz plan: 100K token/gün, ~14 sorgu (7K token/sorgu).
Gap Analysis ve Günün Sorusu için ek Groq çağrıları olacak. Cache agresif kullan.
Daily question: günde 1 kez üret, 24 saat cache'le.
Gap suggestions: her 10 dakikada 1 kez üret, cache'le.

### 6. Next.js 15 Params
Route handler'larda params Promise:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
```

### 7. TypeScript Strict
Proje strict mode'da. Her yeni dosyada tipleri tam tanımla. `any` kullanma.

---

## DOSYA OLUŞTURMA/GÜNCELLEME LİSTESİ

### YENİ DOSYALAR
| Dosya | Açıklama |
|-------|----------|
| `src/app/api/node-stats/route.ts` | Node query stats CRUD |
| `src/app/api/node-stats/gaps/route.ts` | Gap analysis endpoint |
| `src/app/api/daily-question/route.ts` | Günün sorusu |
| `src/store/nodeStatsStore.ts` | Stats Zustand store |
| `src/components/FirstDiscoveryBanner.tsx` | İlk keşif banner'ı |
| `src/components/GapAnalysisPanel.tsx` | Gap öneri paneli |
| `src/components/DailyQuestionBanner.tsx` | Günün sorusu banner'ı |

### GÜNCELLENEN DOSYALAR
| Dosya | Değişiklik |
|-------|------------|
| `src/store/chatStore.ts` | sendMessage() sonrası stats POST + firstDiscovery event |
| `src/components/Truth3DScene.tsx` | nodeHeatMap prop, scale hesaplama, consensus badge |
| `src/app/truth/page.tsx` | Heat map veri akışı, banner'lar, gap panel entegrasyonu |
| `src/components/ChatPanel.tsx` | Gap analysis önerileri (chat boşken) |

### SUPABASE SQL (Dashboard'da çalıştır)
| İşlem | Açıklama |
|-------|----------|
| `upsert_node_query_stat` function | Node stats UPSERT |
| `get_node_query_stats` function | Tüm stats okuma |
| `get_gap_nodes` function | Sorgulanmamış node'lar |

---

## NOTLAR

- Tüm UI metinleri Türkçe
- Mevcut federal indictment aesthetic'i koru (koyu tema, kırmızı accent'ler)
- Animasyonlar smooth olsun (CSS transition veya requestAnimationFrame)
- Mobile responsive düşünme — desktop-first (mevcut yaklaşım)
- Console.log'lar `🔴` prefix ile (mevcut pattern)
