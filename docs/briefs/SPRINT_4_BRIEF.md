# SPRINT 4 BRIEF — "Soruşturma Dosyası" (Investigation System)

> Felsefe: "Sorgu yolculuğunun kendisi değerli. Her araştırma bir dosya, her dosya bir ışık."

## DURUM
Sprint 3.5 ✅ TAMAMLANDI — Sinematik highlight, annotation, context preservation çalışıyor.
Sprint 4'ün amacı: Kullanıcının chat sorgularını otomatik kaydeden, yayınlanabilir, forklanabilir bir Investigation sistemi kurmak.

## MİMARİ GENEL BAKIŞ

```
Kullanıcı sorgu yapar
    ↓
ChatPanel → API → AI cevap verir
    ↓
investigation_steps tablosuna otomatik kayıt (query, response, highlight_node_ids, annotations)
    ↓
"Bu Soruşturmayı Yayınla" butonu
    ↓
Investigation Feed (herkes görebilir)
    ↓
"Devam Et" (Fork) butonu → başkası kaldığı yerden devam eder
```

## SPRINT 4A — Backend (Supabase + API)

### Görev 1: Supabase Tabloları

```sql
-- Soruşturma dosyaları
CREATE TABLE investigations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id UUID REFERENCES networks(id),
  author_name TEXT NOT NULL DEFAULT 'Anonim Araştırmacı',
  author_fingerprint TEXT, -- browser fingerprint (anonim)
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft | published | archived
  parent_id UUID REFERENCES investigations(id), -- fork için
  fork_count INTEGER DEFAULT 0,
  step_count INTEGER DEFAULT 0,
  significance_score FLOAT DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Soruşturma adımları (her chat etkileşimi)
CREATE TABLE investigation_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  query TEXT NOT NULL, -- kullanıcının sorusu
  response TEXT NOT NULL, -- AI'ın cevabı
  highlight_node_ids TEXT[], -- parlayan node'lar
  highlight_link_ids TEXT[], -- parlayan link'ler
  annotations JSONB DEFAULT '{}', -- {"node-id": "DECEASED"}
  node_names TEXT[], -- highlight edilen node isimleri (UI için)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Oylar
CREATE TABLE investigation_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL DEFAULT 'upvote', -- upvote | spotlight
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investigation_id, voter_fingerprint)
);

-- Node sorgu istatistikleri (Query-Weight Intelligence Layer)
CREATE TABLE node_query_stats (
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE PRIMARY KEY,
  highlight_count INTEGER DEFAULT 0,
  annotation_counts JSONB DEFAULT '{}', -- {"DECEASED": 45, "RECRUITER": 80}
  unique_investigators INTEGER DEFAULT 0,
  last_queried_at TIMESTAMPTZ DEFAULT now()
);
```

### Görev 2: RLS (Row Level Security) Policies
- investigations: SELECT herkes (published olanlar), INSERT/UPDATE sadece author_fingerprint eşleşen
- investigation_steps: SELECT herkes (parent investigation published ise), INSERT sadece investigation sahibi
- investigation_votes: SELECT herkes, INSERT herkes (fingerprint unique), DELETE sadece kendi oyu

### Görev 3: API Route — /api/investigation/route.ts
Endpoints:
- POST /api/investigation — yeni investigation başlat (draft)
- PATCH /api/investigation — güncelle (title, description, status)
- POST /api/investigation/step — adım ekle
- GET /api/investigation/[id] — detay getir (steps dahil)
- GET /api/investigation/feed — published investigation listesi (significance_score'a göre sıralı)
- POST /api/investigation/vote — oy ver
- POST /api/investigation/fork — fork et (parent_id ile yeni investigation + mevcut steps'i kopyala)

### Görev 4: Significance Score Hesaplama
```
significance_score = (step_count * 2) + (fork_count * 5) + (upvote_count * 1) + (unique_node_count * 0.5) + (view_count * 0.1)
```
Supabase function veya API'da hesaplanır, her vote/fork/view'da güncellenir.

## SPRINT 4B — Frontend (React + Zustand + 3D)

### Görev 5: investigationStore.ts (Zustand)
```typescript
interface InvestigationState {
  currentInvestigation: Investigation | null;
  isRecording: boolean; // otomatik true olmalı chat başlayınca
  steps: InvestigationStep[];

  // Actions
  startInvestigation: (networkId: string) => Promise<void>;
  addStep: (step: Omit<InvestigationStep, 'id'>) => Promise<void>;
  publishInvestigation: (title: string, description: string) => Promise<void>;
  forkInvestigation: (investigationId: string) => Promise<void>;
}
```

### Görev 6: ChatPanel Entegrasyonu
- chatStore.sendMessage başarılı olduktan sonra, investigation store'a otomatik step ekle
- Her step: query, response (kısa özet), highlight_node_ids, annotations, node_names
- İlk mesajda otomatik investigation başlat (draft olarak)

### Görev 7: "Bu Soruşturmayı Yayınla" UI
- ChatPanel'in altında veya yanında küçük bir banner
- "3 adımlık soruşturmanız hazır. Yayınla?"
- Tıklayınca modal: başlık, kısa açıklama gir
- Yayınla butonu → status: 'published'

### Görev 8: Investigation Feed Sayfası — /truth/investigations
- Route: /truth/investigations (veya /truth sayfasında tab olarak)
- Kart listesi: başlık, yazar, adım sayısı, oy sayısı, tarih
- Sıralama: significance_score (varsayılan), en yeni, en çok forklanan
- Her kartta: "İncele" ve "Devam Et" (fork) butonları

### Görev 9: Investigation Replay (MVP)
- Investigation detay sayfası: /truth/investigations/[id]
- Sol panel: adım listesi (1. "kurbanlar kimler?" 2. "ölenler?" ...)
- Sağ panel: 3D sahne
- Adıma tıklayınca → o adımın highlight'larını ve annotation'larını 3D'de göster
- Otomatik replay modu: adımları 3 saniye arayla otomatik oynat

### Görev 10: "Devam Et" (Fork) Butonu
- Tıklayınca: mevcut investigation'ın tüm step'leri kopyalanır
- Son adımın highlight'ları 3D'de gösterilir
- Chat açılır, kullanıcı kaldığı yerden devam eder
- Yeni step'ler fork'un altına eklenir

## TEST PLANI
1. Chat'te 3 soru sor → investigation otomatik oluştu mu?
2. "Yayınla" → feed'de göründü mü?
3. Feed'den bir investigation'a tıkla → replay çalışıyor mu?
4. "Devam Et" → fork oluştu mu, son adımdan devam edebiliyor musun?
5. Oy ver → significance_score güncellendi mi?
6. Aynı fingerprint ile 2 kez oy → engellendi mi?

## ÖNCELİK SIRASI
1. Supabase tabloları + RLS (Görev 1-2) — ÖNCE BU
2. API route (Görev 3-4)
3. investigationStore + ChatPanel entegrasyonu (Görev 5-6) — otomatik kayıt
4. Yayınla UI (Görev 7)
5. Feed sayfası (Görev 8)
6. Replay (Görev 9)
7. Fork (Görev 10)

## NOTLAR
- node_query_stats tablosu Sprint 4'te oluşturulur ama populate etmek Sprint 5'e kalabilir
- Gap Analysis Engine (hiç sorulmamış sorular) Sprint 5'te
- Dead man switch, encryption Sprint 6+'da
- Fingerprint için basit browser fingerprint yeterli (FingerprintJS free tier)
- Tüm metinler Türkçe, UI dili sonra i18n ile çözülür
