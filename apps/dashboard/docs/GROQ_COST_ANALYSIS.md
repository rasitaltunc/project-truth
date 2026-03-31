# GROQ MALİYET ANALİZİ — Project Truth Faz 0

> Tarih: 31 Mart 2026
> Model: llama-3.3-70b-versatile
> Analiz: Free Tier yeterliliği + ücretli geçiş senaryoları

---

## 1. MEVCUT GROQ KULLANIM HARİTASI

Project Truth'ta 3 aktif Groq endpoint var:

### A. Chat API (`/api/chat`)
- **Amaç:** Kullanıcı ağı sorgular, AI cevaplar
- **Max tokens:** 1,024 (çıktı)
- **System prompt:** ~6,900 karakter (~1,700 token)
- **Ortalama input:** ~2,500 token (system + context + history + user query)
- **Ortalama output:** ~500 token (JSON yanıt)
- **Toplam/istek:** ~3,000 token
- **Rate limit:** 20/dakika (uygulama tarafı)

### B. Intent Classify (`/api/intent-classify`)
- **Amaç:** Kullanıcı sorgusunu lens moduna eşle
- **Max tokens:** 150 (çıktı)
- **System prompt:** ~770 karakter (~190 token)
- **Ortalama input:** ~300 token
- **Ortalama output:** ~80 token
- **Toplam/istek:** ~380 token
- **Rate limit:** 30/dakika (uygulama tarafı)

### C. Document Scan (`/api/documents/scan` → 3-pass consensus)
- **Amaç:** Belge tarama, entity extraction
- **Max tokens:** 4,096/pass × 3 pass = 12,288 (çıktı max)
- **System prompt:** ~3,300 karakter/pass (~825 token/pass)
- **Ortalama input:** ~4,000 token/pass (belge + önceki sonuçlar)
- **Ortalama output:** ~2,000 token/pass
- **Toplam/istek:** ~18,000 token (3 pass birlikte)
- **Rate limit:** 10/dakika (uygulama tarafı)
- **NOT:** Her scan = 3 ayrı Groq API çağrısı

### D. Daily Question + Gap Analysis
- **Durum:** AI KALDIRILDI (template-based) → 0 Groq çağrısı

---

## 2. GROQ FREE TIER LİMİTLERİ

| Limit | Değer | Birim |
|-------|-------|-------|
| RPM (istek/dakika) | 30 | request |
| RPD (istek/gün) | 1,000 | request |
| TPM (token/dakika) | 12,000 | token |
| TPD (token/gün) | 100,000 | token |

**Önemli:** Cached token'lar rate limit'e sayılmaz.

---

## 3. SENARYO ANALİZİ

### Senaryo A: Tek Geliştirici (Şu an — Raşit)
| Aktivite | İstek/gün | Token/gün |
|----------|-----------|-----------|
| Chat (20 sorgulama) | 20 | 60,000 |
| Intent classify (20 fire-and-forget) | 20 | 7,600 |
| Belge tarama (2 belge) | 6 | 36,000 |
| **TOPLAM** | **46** | **103,600** |

**Sonuç:** RPD (46/1,000) ✅ rahat | TPD (103,600/100,000) ⚠️ SINIRDA
- Chat + intent çok rahat
- 2 belge taraması günlük limiti zorluyor
- **Belge tarama ana darboğaz**

### Senaryo B: Beta Test (50 kullanıcı, hafif kullanım)
| Aktivite | İstek/gün | Token/gün |
|----------|-----------|-----------|
| Chat (50 user × 5 sorgulama) | 250 | 750,000 |
| Intent classify (250 fire-and-forget) | 250 | 95,000 |
| Belge tarama (10 belge) | 30 | 180,000 |
| **TOPLAM** | **530** | **1,025,000** |

**Sonuç:** RPD (530/1,000) ⚠️ YAKIN | TPD (1M/100K) ❌ 10x AŞIM
- **Free tier kesinlikle yetersiz**
- Ücretli plana geçiş zorunlu

### Senaryo C: Launch (500 kullanıcı)
| Aktivite | İstek/gün | Token/gün |
|----------|-----------|-----------|
| Chat (500 user × 3 sorgulama) | 1,500 | 4,500,000 |
| Intent classify (1,500 fire-and-forget) | 1,500 | 570,000 |
| Belge tarama (50 belge) | 150 | 900,000 |
| **TOPLAM** | **3,150** | **5,970,000** |

**Ücretli maliyet:**
- Input: ~4M token × $0.59/M = $2.36/gün
- Output: ~2M token × $0.79/M = $1.58/gün
- **Günlük:** ~$3.94
- **Aylık:** ~$118

---

## 4. ÜCRETLİ FİYATLANDIRMA

| | Input | Output |
|---|---|---|
| llama-3.3-70b-versatile | $0.59/M token | $0.79/M token |

Developer tier = düşük maliyet, yüksek limit. Kredi kartı gerekli.

---

## 5. OPTİMİZASYON STRATEJİLERİ

### Hemen Yapılabilir (Faz 0-1):
1. **Intent classify'ı yerel yap:** Keyword-based classifier zaten var, LLM fallback'i kaldır → günde 250+ istek tasarruf
2. **Chat yanıt cache:** Aynı sorgular için Redis/in-memory cache (5dk TTL) → tekrarlı sorguları sıfırla
3. **Scan token azaltma:** Belge metnini 3,000 karakter ile sınırla (şu an sınırsız) → pass başına token yarıya düşer
4. **Rate limit kullanıcı başına:** Günlük 10 chat + 2 scan limiti (free tier kullanıcılar için)

### Orta Vade (Faz 2-3):
5. **Model downgrade seçeneği:** Hafif sorgular için llama-3.1-8b (daha ucuz, daha hızlı)
6. **Batch processing:** Belge taramalarını gece yap (off-peak)
7. **Prompt compression:** System prompt'ları kısalt (~%30 token tasarruf mümkün)

### Uzun Vade (Faz 4+):
8. **Self-hosted inference:** Groq alternatifi olarak Together.ai, Fireworks.ai, veya kendi GPU
9. **Model fine-tuning:** Küçük model, domain-specific eğitim → daha az token, daha iyi sonuç

---

## 6. TAVSİYE

### Şu An (Geliştirme):
- ✅ Free tier yeterli (belge taramasını günde 2 ile sınırla)
- ✅ Intent classify'ı LLM'siz yap (keyword classifier yeterli)

### Beta Test (Faz 3):
- 💳 Developer tier'a geç (kredi kartı ekle)
- Beklenen maliyet: **$5-15/ay** (50 kullanıcı)

### Launch (Faz 4):
- 💳 Developer tier devam
- Beklenen maliyet: **$100-150/ay** (500 kullanıcı)
- Hibe bütçesine dahil et (NGI Zero başvurusunda belirt)

### 1000+ Kullanıcı:
- Aylık ~$300-500
- Bu noktada Together.ai/Fireworks.ai fiyat karşılaştırması yap
- Self-hosted seçeneği değerlendir

---

## 7. KRİTİK UYARI

**TPM (12,000 token/dakika) en sıkı limit.** Tek bir belge tarama pass'ı ~6,000 token harcıyor.
Yani free tier'da dakikada en fazla 2 tarama pass'ı çalışabilir (1 belge = 3 pass = 1.5 dakika minimum).

**Çözüm:** Scan endpoint'ine pass arası 500ms delay ekle + kullanıcıya "taranıyor..." animasyonu göster.

---

*Analiz: Claude + Raşit, 31 Mart 2026*
*Kaynak: groq.com/pricing, console.groq.com/docs/rate-limits*
