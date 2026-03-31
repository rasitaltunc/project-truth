# Groq Yük Testi & Maliyet Raporu

**Tarih:** 31 Mart 2026
**Model:** llama-3.3-70b-versatile
**Fiyatlandırma:** $0.59/M input token, $0.79/M output token
**Free Tier:** Günlük 14,400 istek / dakikada 30 istek / 6,000 token/dk

---

## Groq Kullanım Noktaları

| Endpoint | max_tokens | Tahmini Input | Tahmini Output | Rate Limit | Cache |
|----------|-----------|---------------|----------------|------------|-------|
| `/api/chat` | 1024 | ~2000 token | ~800 token | 20/dk | Yok |
| `/api/intent-classify` | 150 | ~300 token | ~100 token | 30/dk | Keyword pre-filter (%75 azaltma) |
| `/api/documents/scan` | 4096×3 pass | ~3000×3 token | ~3000×3 token | 10/dk | Yok |

---

## Senaryo Analizi

### Senaryo 1 — 10 Eşzamanlı Kullanıcı (Beta Test, Faz 3)

| Metrik | Chat | Intent | Scan | Toplam |
|--------|------|--------|------|--------|
| İstek/saat | 200 | 50 (keyword sonrası) | 5 | 255 |
| Input token/saat | 400K | 15K | 45K | 460K |
| Output token/saat | 160K | 5K | 45K | 210K |
| **Maliyet/saat** | $0.36 | $0.01 | $0.06 | **$0.43** |
| **Maliyet/gün (8 saat)** | | | | **$3.44** |
| **Maliyet/ay** | | | | **~$103** |

**Free tier yeterli mi?** 255 istek/saat × 8 saat = 2,040 istek/gün → 14,400 limitin altında. **EVET, free tier yeterli.**

### Senaryo 2 — 50 Eşzamanlı Kullanıcı (Launch, Faz 4)

| Metrik | Chat | Intent | Scan | Toplam |
|--------|------|--------|------|--------|
| İstek/saat | 1,000 | 250 | 25 | 1,275 |
| Input token/saat | 2M | 75K | 225K | 2.3M |
| Output token/saat | 800K | 25K | 225K | 1.05M |
| **Maliyet/saat** | $1.99 | $0.06 | $0.31 | **$2.36** |
| **Maliyet/gün (12 saat)** | | | | **$28.3** |
| **Maliyet/ay** | | | | **~$849** |

**Free tier yeterli mi?** 1,275 × 12 = 15,300 istek/gün → 14,400 limiti **AŞAR**. Ücretli plana geçiş gerekli.

### Senaryo 3 — 200 Eşzamanlı Kullanıcı (Büyüme, Faz 5)

| Metrik | Chat | Intent | Scan | Toplam |
|--------|------|--------|------|--------|
| İstek/saat | 4,000 | 1,000 | 100 | 5,100 |
| **Maliyet/gün (16 saat)** | | | | **~$190** |
| **Maliyet/ay** | | | | **~$5,700** |

**Dakika limiti sorunu:** 30 istek/dk Groq limiti. 200 kullanıcı = potansiyel 40+ istek/dk → **429 hatası.**

---

## Darboğaz Analizi

### 1. Dakika Rate Limiti (En Kritik)
- Groq free tier: **30 istek/dakika**
- 10 kullanıcı aynı anda sorgu = 10 istek → OK
- 30+ kullanıcı aynı anda = **429 hatası**
- **Çözüm:** İstek kuyruğu (queue) + exponential backoff + kullanıcıya "meşgul" mesajı

### 2. Token/Dakika Limiti
- Groq free tier: **6,000 token/dakika**
- Chat API tek istek: ~2,800 token (input+output)
- 3 eşzamanlı chat = 8,400 token → **6,000 limitini aşar**
- **Çözüm:** Token bucket algoritması + istek önceliklendirme

### 3. Scan Pipeline Tıkanması
- 3 pass × 4096 max_tokens = tek scan ~18,000 output token
- Scan sırasında chat istekleri gecikebilir
- **Çözüm:** Scan isteklerini düşük öncelikli kuyruğa al

---

## Mevcut Savunma Mekanizmaları ✅

| Mekanizma | Durum | Etkinlik |
|-----------|-------|----------|
| Per-route rate limiting (in-memory) | ✅ Var | İyi — kullanıcı bazlı kontrol |
| Keyword pre-filter (intent) | ✅ Var | %75 Groq çağrısı azalması |
| Template-based daily question | ✅ Var | Sıfır Groq maliyeti |
| Template-based gap analysis | ✅ Var | Sıfır Groq maliyeti |
| Chat history limit (8 mesaj) | ✅ Var | Token tüketimi sınırlı |
| 429 graceful handling | ✅ Var | Kullanıcıya uyarı |

## Eksik Savunma Mekanizmaları ⚠️

| Mekanizma | Öncelik | Etki |
|-----------|---------|------|
| Global Groq istek kuyruğu | 🔴 Yüksek | 50+ kullanıcıda 429 önleme |
| Chat response cache (aynı sorgu) | 🟡 Orta | %20-30 maliyet azaltma |
| Token budget per user/hour | 🟡 Orta | Token abuse önleme |
| Scan job queue (background) | 🟡 Orta | Scan ↔ Chat çakışma önleme |
| Groq API key rotation (birden fazla key) | 🟢 Düşük | Rate limit dağıtma |

---

## Öneriler

### Beta Test (Faz 3, 10 kullanıcı):
- Mevcut sistem **yeterli**. Free tier dahilinde kalınır.
- Sadece monitoring ekle: her Groq çağrısının süresini + token sayısını logla.

### Launch (Faz 4, 50 kullanıcı):
- **Global istek kuyruğu** gerekli (429 yağmurunu önlemek için).
- Groq ücretli plana geçiş (Developer: $0.59/$0.79/M token, dakika limiti artırılır).
- Chat response cache ekle (aynı ağda aynı soruyu soran kullanıcılar).

### Büyüme (Faz 5, 200+ kullanıcı):
- Scan işlemlerini background job'a taşı (cron veya queue).
- Birden fazla Groq API key ile round-robin.
- Alternatif model değerlendirmesi (llama-3.1-8b hızlı sorular için, 70b sadece scan için).

---

## Sonuç

**Faz 3 (Beta) için risk: DÜŞÜK.** Free tier yeterli, mevcut rate limiting çalışır.

**Faz 4 (Launch) için risk: ORTA.** Ücretli plan + global queue gerekli. Tahmini maliyet $30-50/gün.

**Faz 5 (Büyüme) için risk: YÜKSEK.** Mimari değişiklik gerekli (queue, multi-key, model routing). Maliyet $150-200/gün → hibe/bağış ile karşılanmalı.

> "Şu an endişelenmeye gerek yok. Beta'ya kadar free tier yeter. Launch öncesi ücretli plana geç, queue ekle." — Pragmatik yaklaşım.
