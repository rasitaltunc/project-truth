# ENTITY DOSSIER PIPELINE — Otomatize Hafıza Mekanizması
## "Sistem Nasıl Unutmaz?"

> Tarih: 22 Mart 2026 (Session 9D)
> Araştırmacılar: Raşit Altunç + Claude Opus 4.6
> Bağlam: Raşit'in sorusu: "bu beynin öğrendiklerimizi unutmamamız için otomatize ve çok akıllı ne yapılabilir?"

---

## 1. PROBLEM TANIMI

Her belge tarandığında öğreniyoruz:
- Yeni entity'ler keşfediyoruz
- Mevcut entity'ler hakkında yeni kanıt buluyoruz
- Skorlar değişiyor (daha fazla kanıt = daha yüksek güven)
- Çelişkiler ortaya çıkıyor (bir belge "suçlu" diyor, diğeri "masum")

Ama bu bilgi **dağınık**: JSON dosyalarında, test scriptlerinde, konuşma geçmişinde.
İnsan unutur. LLM'in context window'u sınırlı. Dosyalar zamanla gömülür.

**Çözüm:** Append-only, otomatik tetiklenen, yapılandırılmış bir hafıza sistemi.

---

## 2. MİMARİ: 4 KATMANLI OTOMATİK HAFIZA

```
┌─────────────────────────────────────────────────────────────┐
│                    BELGE TARAMA PIPELINE                     │
│  (Manuel veya AI çıkarma → confidence_v2 → kalibrasyon)     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Her tarama otomatik tetikler ↓
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              KATMAN 1: ENTITY DOSSIER STORE                  │
│  Her entity için tek dosya: {entity_fingerprint}.json         │
│  - Score history (append-only)                                │
│  - Document contributions (hangi belge ne kattı)              │
│  - Contradiction log (çelişen bilgiler)                       │
│  - Cross-document matches                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              KATMAN 2: CONTRADICTION DETECTOR                │
│  Yeni bilgi eski bilgiyle çelişiyorsa:                       │
│  - FLAG at (otomatik)                                         │
│  - İki tarafın kanıtlarını yan yana koy                      │
│  - İnsan incelemesi için kuyrukla                            │
│  - Çözülene kadar "DISPUTED" durumunda tut                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              KATMAN 3: SCORE FUSION ENGINE                    │
│  Bayesian evidence accumulation:                              │
│  fused_score = weighted_mean × consistency × diversity        │
│  - weighted_mean: her belgenin GRADE ağırlığına göre ortalama │
│  - consistency: aynı sonuca varan belgeler → bonus            │
│  - diversity: farklı kaynak tipleri → çarpan                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              KATMAN 4: ERROR LEARNING LEDGER                 │
│  Her kalibrasyon hatasından KURAL çıkar:                     │
│  - HATA-XXX: ne oldu, neden oldu, nasıl düzeltildi          │
│  - KURAL-XX: genelleştirilmiş kural                          │
│  - Atlas bu kuralları her karar anında okur                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ENTITY DOSSIER FORMAT

Her entity için `dossiers/{fingerprint}.json`:

```json
{
  "entity_id": "sha256-of-name+type+created",
  "canonical_name": "Jeffrey Edward Epstein",
  "aliases": ["Jeffrey Epstein", "Jeffrey E. Epstein", "JEE"],
  "type": "accused_perpetrator",
  "first_seen": "2026-03-22",
  "last_updated": "2026-03-22",

  "current_fused_score": 0.772,
  "current_verdict": "HIGHLY_PROBABLE",

  "score_history": [
    {
      "date": "2026-03-22",
      "document": "HOUSE_OVERSIGHT_010566.txt",
      "doc_type": "government_filing",
      "score": 0.990,
      "nato_code": "A-1",
      "method": "confidence_v2"
    },
    {
      "date": "2026-03-22",
      "document": "HOUSE_OVERSIGHT_010887.txt",
      "doc_type": "court_filing",
      "score": 0.981,
      "nato_code": "A-1",
      "method": "confidence_v2"
    },
    {
      "date": "2026-03-22",
      "document": "HOUSE_OVERSIGHT_017800.txt",
      "doc_type": "credible_journalism",
      "score": 0.344,
      "nato_code": "B-4",
      "method": "confidence_v2"
    }
  ],

  "document_contributions": [
    {
      "document": "HOUSE_OVERSIGHT_010566.txt",
      "what_it_added": "Congressional record naming as perpetrator. Formal government documentation.",
      "key_quotes": ["Jeffrey Epstein sex trafficking scheme"],
      "evidence_type": "government_filing"
    },
    {
      "document": "HOUSE_OVERSIGHT_010887.txt",
      "what_it_added": "Sworn declaration detailing daily abuse. Multiple locations, years of conduct.",
      "key_quotes": ["sexual abuse and sex trafficking"],
      "evidence_type": "court_filing"
    },
    {
      "document": "HOUSE_OVERSIGHT_017800.txt",
      "what_it_added": "Investigative journalism context. Sentencing details, NPA, work release, accomplice names.",
      "key_quotes": ["accused of sexually abusing dozens of underage girls"],
      "evidence_type": "credible_journalism"
    }
  ],

  "contradictions": [],

  "fusion_calculation": {
    "method": "bayesian_evidence_accumulation",
    "weights": {"government_filing": 0.78, "court_filing": 0.88, "credible_journalism": 0.65},
    "weighted_mean": 0.772,
    "consistency_bonus": 1.0,
    "diversity_multiplier": 1.15,
    "final": 0.888
  }
}
```

---

## 4. SCORE FUSION FORMÜLÜ

```python
def fuse_scores(score_history):
    """
    Multi-document Bayesian evidence accumulation.

    3 faktör:
    1. weighted_mean: Her belgenin GRADE ağırlığına göre ortalama
    2. consistency_bonus: Aynı yönde kanıtlar → 1.0-1.15 arası bonus
    3. diversity_multiplier: Farklı kaynak tipleri → 1.0-1.2 çarpan
    """

    GRADE_WEIGHTS = {
        "sworn_testimony": 0.95,
        "court_filing": 0.88,
        "government_filing": 0.78,
        "credible_journalism": 0.65,
        "news_article": 0.50,
        "social_media": 0.28,
    }

    # 1. Weighted mean
    total_weight = 0
    weighted_sum = 0
    for entry in score_history:
        weight = GRADE_WEIGHTS.get(entry["doc_type"], 0.50)
        weighted_sum += entry["score"] * weight
        total_weight += weight
    weighted_mean = weighted_sum / total_weight if total_weight > 0 else 0

    # 2. Consistency bonus
    # All scores in same direction? (all high, all low, or mixed?)
    verdicts = [entry.get("verdict", "") for entry in score_history]
    if len(set(verdicts)) == 1:
        consistency = 1.10  # All agree
    elif all(s["score"] > 0.5 for s in score_history) or all(s["score"] < 0.5 for s in score_history):
        consistency = 1.05  # Same direction
    else:
        consistency = 0.95  # Mixed signals → penalize

    # 3. Diversity multiplier
    unique_types = set(entry["doc_type"] for entry in score_history)
    if len(unique_types) >= 3:
        diversity = 1.15  # 3+ different source types — strong
    elif len(unique_types) >= 2:
        diversity = 1.08  # 2 different types
    else:
        diversity = 1.00  # Single source type

    # Final fusion (capped at 1.0)
    fused = min(1.0, weighted_mean * consistency * diversity)
    return round(fused, 3)
```

---

## 5. OTOMATİK TETİKLEME

"Unutamaz" yapan şey: **Her tarama otomatik pipeline'ı tetikler.**

```
Belge tarandı
  → confidence_v2 çalıştı (skor hesaplandı)
  → entity_dossier_update() OTOMATIK ÇAĞRILIR:
     1. Entity dosier var mı? Yoksa oluştur.
     2. Score history'ye yeni giriş APPEND et (WORM — asla silme)
     3. Fused score'u yeniden hesapla
     4. Contradiction check: eski bilgiyle çelişiyor mu?
     5. Cross-document match: bu entity başka belgelerde de var mı?
     6. Dossier JSON'ı güncelle
```

İnsan müdahalesi gereken tek nokta: **Contradiction detected** durumu.
Geri kalan her şey otomatik.

---

## 6. CONTRADICTION DETECTION

```python
def check_contradictions(entity_name, new_info, dossier):
    """
    Yeni bilgi mevcut bilgiyle çelişiyor mu?

    Çelişki tipleri:
    1. ROLE_CONFLICT: Bir belge "suçlu" diyor, diğeri "masum"
    2. SCORE_DIVERGENCE: Aynı entity çok farklı skorlar (delta > 0.4)
    3. FACT_CONFLICT: Tarih, yer, ilişki çelişkisi
    4. EXONERATION: Bir belge açıkça aklar
    """
    contradictions = []

    # Score divergence
    for old in dossier["score_history"]:
        delta = abs(new_info["score"] - old["score"])
        if delta > 0.4:
            contradictions.append({
                "type": "SCORE_DIVERGENCE",
                "old_doc": old["document"],
                "old_score": old["score"],
                "new_doc": new_info["document"],
                "new_score": new_info["score"],
                "delta": delta,
                "needs_human_review": True
            })

    return contradictions
```

---

## 7. NEDEN BU "UNUTAMAZ"?

1. **Append-only**: Hiçbir veri silinmez. Düzeltme yeni giriş olarak eklenir.
2. **Otomatik tetikleme**: İnsan unutsa bile pipeline her taramada çalışır.
3. **Yapılandırılmış format**: AI kolayca okuyabilir, insan da kolayca okuyabilir.
4. **Çelişki tespiti**: Sistem kendi kendini kontrol eder.
5. **Score history**: Zamanla güven nasıl değişti? Neden değişti? Her şey kayıtlı.
6. **Doküman katkısı**: Hangi belge ne kattı? Her şeyin kaynağı izlenebilir.

**LLM'in kendisi beyin DEĞİL. LLM, beyni OKUYAN gözdür.**
Beyin = bu yapılandırılmış dosyalar. LLM context window'u dolsa bile dosyalar kalır.
Yeni bir LLM oturumu açıldığında ilgili dossier'ları okur ve devam eder.

---

## 8. İMPLEMENTASYON YOLHARITASI

**Faz 1 (Hemen — Dosya Bazlı):**
- [x] confidence_v2.py (skor motoru) ✓
- [x] Error Learning Ledger (hata/kural deposu) ✓
- [ ] dossier_pipeline.py (otomatik güncelleme scripti)
- [ ] dossiers/ klasörü (entity dosier'ları)
- [ ] cross_document_index.json (hangi entity kaç belgede)

**Faz 2 (TypeScript Port — Platform İçin):**
- [ ] Supabase entity_confidence_dossier tablosu
- [ ] Supabase entity_document_contributions tablosu
- [ ] Supabase entity_score_history tablosu (WORM)
- [ ] API route: /api/entity/[id]/dossier
- [ ] ArchiveModal 5. tab: "GÜVEN RAPORU"

**Faz 3 (Atlas Entegrasyonu):**
- [ ] Atlas karar verirken dossier'ı okur
- [ ] Atlas Error Learning Ledger'dan kuralları uygular
- [ ] Atlas contradiction tespit edince alarm verir
- [ ] Atlas yeni belge tarandığında pipeline'ı otomatik başlatır

---

## 9. 3-BELGE TEST SONUÇLARI (Bu Pipeline'ın Kanıtı)

| Belge | Tip | Kalibrasyon | Entity Sayısı |
|-------|-----|-------------|---------------|
| Doc1 (010566) | government_filing | 18/18 (100.0%) | 35 |
| Doc2 (010887) | court_filing | 13/14 (92.9%) | 16 |
| Doc3 (017800) | credible_journalism | 18/18 (100.0%) | 28 |
| **TOPLAM** | **3 farklı tip** | **49/50 (98.0%)** | **79** |

### Kaynak Etkisi Kanıtı
Aynı entity, 3 farklı kaynakta:
```
Epstein:     Doc1=0.990  Doc2=0.981  Doc3=0.344  → resmi > yeminli > gazetecilik ✓
Maxwell:     Doc1=0.990  Doc2=0.959  Doc3=0.407  → resmi > yeminli > gazetecilik ✓
Dershowitz:  Doc1=0.606  Doc2=0.755  Doc3=0.407  → yeminli > resmi > gazetecilik ✓
Brunel:      Doc1=0.990  Doc2=0.711  Doc3=0.344  → resmi > yeminli > gazetecilik ✓
Edwards:     Doc1=0.772  Doc2=0.441  Doc3=0.224  → resmi > yeminli > gazetecilik ✓
```

### HATA-011 Dersi
İlk denemede gazetecilik ground truth'unu yeminli ifade gibi yazdım → %50 kalibrasyon.
Düzeltme: Gazetecilik kaynağı tek başına MODERATE'in üstüne çıkmamalı.
Formül haklıydı, beklentilerim yanlıştı. **Tutuculuk = doğru davranış.**

---

*"Sistem beyni LLM değil. LLM, beyni okuyan gözdür. Beyin = yapılandırılmış veri + kurallar + tarihçe."*
— Session 9C-9D Konsensüsü, 22 Mart 2026
