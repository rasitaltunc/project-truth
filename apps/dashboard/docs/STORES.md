# Store Mimarisi — Project Truth Dashboard

> 17 Zustand store, 4 kategori, Sprint 18 "Çelik İskelet" kapsamında belgelenmiştir.

## Kategori Haritası

```
┌────────────────────────────────────────────────────────────┐
│                        CORE DATA                           │
│  truthStore · chatStore · investigationStore · useStore     │
├────────────────────────────────────────────────────────────┤
│                        UI STATE                            │
│  viewModeStore · boardStore · cinematicStore                │
│  guidedTourStore · tunnelStore · linkFilterStore            │
├────────────────────────────────────────────────────────────┤
│                     FEATURE DATA                           │
│  badgeStore · nodeStatsStore · linkEvidenceStore            │
│  threadingStore · documentStore · quarantineStore           │
│  collectiveShieldStore                                     │
└────────────────────────────────────────────────────────────┘
```

## Store Envanteri

### Core Data

| Store | Dosya | Amaç | Persist |
|-------|-------|------|---------|
| `useStore` | useStore.ts | ArchiveModal açma/kapama + aktif node | — |
| `useTruthStore` | truthStore.ts | Ağ verileri (nodes, links, stats, realtime) | — |
| `useChatStore` | chatStore.ts | AI chat, highlights, annotations, first discovery | — |
| `useInvestigationStore` | investigationStore.ts | Soruşturma draft + yayınlama | localStorage |

### UI State

| Store | Dosya | Amaç | Persist |
|-------|-------|------|---------|
| `useViewModeStore` | viewModeStore.ts | 6 lens modu + timeline + AI önerisi | — |
| `useBoardStore` | boardStore.ts | 2D soruşturma panosu (zoom, pan, undo) | localStorage |
| `useCinematicStore` | cinematicStore.ts | 10s açılış sekansı faz yönetimi | localStorage |
| `useGuidedTourStore` | guidedTourStore.ts | Post-cinematic adım adım tur | localStorage |
| `useTunnelStore` | tunnelStore.ts | 3D tünel deneyimi faz yönetimi | — |
| `useLinkFilterStore` | linkFilterStore.ts | 13 kanıt tipi filtre (evidence_type) | — |

### Feature Data

| Store | Dosya | Amaç | Persist |
|-------|-------|------|---------|
| `useBadgeStore` | badgeStore.ts | Güven katmanı (tier, reputation, nominations) | localStorage |
| `useNodeStatsStore` | nodeStatsStore.ts | Heat map, consensus, gap analizi | — |
| `useLinkEvidenceStore` | linkEvidenceStore.ts | Link evidence timeline + koridor modu | — |
| `useThreadingStore` | threadingStore.ts | İP UZAT (ghost link öneri sistemi) | — |
| `useDocumentStore` | documentStore.ts | Belge arşivi + TARA protokolü | — |
| `useQuarantineStore` | quarantineStore.ts | Sıfır halüsinasyon karantina pipeline'ı | — |
| `useCollectiveShieldStore` | collectiveShieldStore.ts | Kolektif kalkan (Shamir's Secret Sharing) | — |

## Çapraz Bağımlılık Haritası

```
chatStore ─────────→ investigationStore  (sendMessage → addStep)
chatStore ─────────→ viewModeStore       (intent classification okuma)
tunnelStore ───────→ linkEvidenceStore   (LinkEvidenceData tipi)
documentStore ·····→ quarantineStore     (tarama sonrası karantina)
```

> Kural: Store'lar birbirini **minimum** seviyede import eder.
> Cross-store iletişim genellikle component katmanında (truth/page.tsx) yapılır.

## Kullanım Alanları

| Alan | Store'lar |
|------|-----------|
| 3D Sahne | truthStore, nodeStatsStore, viewModeStore, linkFilterStore, cinematicStore, tunnelStore, linkEvidenceStore |
| Chat/AI | chatStore, investigationStore, nodeStatsStore |
| UI Panel'leri | badgeStore, boardStore, threadingStore, collectiveShieldStore, quarantineStore, documentStore |
| Modal/Arşiv | useStore, badgeStore |
| Onboarding | cinematicStore, guidedTourStore |

## Middleware Kullanımı

| Middleware | Store'lar |
|-----------|-----------|
| `devtools` | truthStore, chatStore, investigationStore, badgeStore, boardStore, cinematicStore, threadingStore, quarantineStore, documentStore |
| `persist` | investigationStore, badgeStore, boardStore |
| Manuel localStorage | cinematicStore (`truth-cinematic-seen`), guidedTourStore (`truth-guided-tour-seen`) |

---

*Son güncelleme: Sprint 18 "Çelik İskelet" — 9 Mart 2026*
