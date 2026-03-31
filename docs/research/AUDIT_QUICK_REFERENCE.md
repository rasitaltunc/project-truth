# PROJECT TRUTH 3D MOTOR AUDİTİ — HIZLI REFERANS

**Tam Rapor:** `SYSTEM_AUDIT_3D_ENGINE.md` (827 satır)
**Tarih:** 11 Mart 2026

---

## KRITIK BULGULAR (3/10)

### 🔴 #1: Evidence Type Config — DRY İhlali
**Ciddiyet:** MEDIUM
**Dosyalar:** `colors.ts` + `linkFilterStore.ts` (çift tanım)
**Etki:** Renk uyuşmazlığı riski
**Çözüm:** Tek tanımı linkFilterStore.ts'ye taşıyın

### 🟡 #2: Risk vs Confidence — Semantik Hata
**Ciddiyet:** LOW-MEDIUM
**Dosya:** `viewModeStore.ts` satır 275
**Sorun:** `risk = 90` → `confidence = 0.9` (ters!)
**Çözüm:** `confidence = (100 - risk) / 100`

### 🟡 #3: Timeline Tarih Doğrulaması
**Ciddiyet:** LOW
**Dosya:** `viewModeStore.ts` satır 301
**Sorun:** `parseInt("19ab")` = 19 (başarısız doğrulama)
**Çözüm:** Yıl 1800-2100 aralığını kontrol edin

---

## ALGORITMALAR DENETIMI

| Sistem | Dosya | Doğruluk | Ölçeklenme | Notlar |
|--------|-------|----------|-----------|--------|
| **3D Pozisyon** | Truth3DScene.tsx:1700-1760 | ✅ | ✅ (1000+) | Fibonacci küre sağlam |
| **Lens Visibility** | viewModeStore.ts | ✅ | ✅ | 5 modun mantığı tutarlı |
| **Link Filter** | linkFilterStore.ts | ✅ | ✅ | NULL check var |
| **Board Düzen** | boardStore.ts | ✅ | ✅ | Halka layout matematiksel |
| **Heat Map** | nodeStatsStore.ts | ✅ | ⚠️ | 1M+ için logaritmik gerekli |
| **Anotasyon Renk** | colors.ts | ⚠️ | ✅ | Anahtar kelime çakışması |
| **Timeline Tarih** | viewModeStore.ts | ⚠️ | ✅ | Format doğrulaması eksik |

---

## ÖNERİLEN DÜZELTMELER (8)

### ACIL (P0)
1. **Risk/Confidence semantiği fix** — viewModeStore.ts:275
   ```typescript
   const confidence = node.confidence_level ??
     (node.risk !== undefined ? (100 - node.risk) / 100 : 0.5);
   ```

### YAKINDA (P1)
2. **Evidence Type Config DRY** — colors.ts + linkFilterStore.ts entegrasyonu
3. **Timeline tarih doğrulaması** — 1800-2100 aralığı kontrolü
4. **Tier 0 görünürlüğü** — yarıçapı 8 → 15 artırın
5. **Confidence opacity** — 0.6 → 0.8 aralığını genişletin

### SONRA (P2)
6. **Heat map logaritmik skalama** — 1M+ highlight'lar için
7. **Anahtar kelime ağırlıklandırması** — çakışma çözümü
8. **1000+ node jitter** — tier'a göre adaptif jitter

---

## TEST PLANI

```bash
# 100 node (mevcut)
✅ Pozisyon: Fibonacci küre çalışıyor
✅ Linkler: Renk eşlemesi tutarlı
✅ Lens: Tüm 5 mod görüntülenebilir

# 1000 node (planlanmış)
⚠️ Çakışma kontrolü gerekir
⚠️ Performans profili gerekir

# 10000+ node (vizyoner)
🔴 Yeni algoritma gerekli (LOD sistemi)
```

---

## DOSYA YAPISI

```
apps/dashboard/src/
├── components/
│   └── Truth3DScene.tsx              [3D engine - RİSK: LOW]
├── constants/
│   └── colors.ts                      [Renkler - RİSK: MEDIUM]
├── store/
│   ├── viewModeStore.ts               [Lens - RİSK: MEDIUM]
│   ├── linkFilterStore.ts             [Filter - RİSK: LOW]
│   ├── boardStore.ts                  [2D - RİSK: LOW]
│   ├── nodeStatsStore.ts              [Stats - RİSK: LOW]
│   ├── threadingStore.ts              [İP Uzat - RİSK: MEDIUM]
│   └── investigationStore.ts          [Soruşturma - RİSK: MEDIUM]
└── lib/3d/
    └── utils.ts                       [Utils - RİSK: LOW]
```

---

## SONUÇ

**Genel Durum:** ✅ **GEÇER** (3 uyarı ile)

**Risk Puanları:**
- Görsel Tutarlılık: 8/10
- Mantıksal Sağlamlık: 9/10
- Ölçeklenebilirlik: 7/10
- Veri Bütünlüğü: 8/10

**Denetim Yapısı:**
1. ✅ Fibonacci küre = Doğru matematik
2. ✅ Lens sistemi = Tutarlı mantık
3. ✅ Hata yönetimi = İyi fallback'ler
4. ⚠️ Çift tanımlar = DRY sorunu
5. ⚠️ Semantik = Bazı karışıklıklar

**Sonraki Adım:** `SYSTEM_AUDIT_3D_ENGINE.md`'nin bölüm 3-10'u ayrıntılı olarak inceleyim ve P0 düzeltmeleri yapın.
