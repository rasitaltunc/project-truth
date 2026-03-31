# 🎯 RELEASE MASTER PLAN — Project Truth v1.0

> **Tarih:** 23 Mart 2026
> **Hedef:** Minimum ama kaliteli release. Yarım yamalak değil, ama her şey de değil.
> **Felsefe:** "Ship etmeden önce acele etme, ama ship etmemek için bahane de üretme."
> **Karar Veren:** Raşit Altunç + Claude

---

## 🏗️ 3 PARALEL HAT

```
HAT 1 — MOTOR                   HAT 2 — YÜZ                    HAT 3 — KALKAN
(Veri + Learning Prompt)         (Landing + UX + Demo)           (Güvenlik + Vakıf + Test)
═══════════════════════         ═══════════════════════         ═══════════════════════
CourtListener bulk fetch        Landing page redesign           Feature testing (DMS, Shield...)
Learning Prompt Phase 1         Gamified verification UX        Security audit
Bulk scan + verify              Presentation mode               Sweden foundation
Build 50-80 node network        Beta test prep                  Legal compliance check
```

**Release = 3 hat birleştiğinde.** Biri eksikse çıkmıyoruz.

---

## HAT 1 — MOTOR (Veri Pipeline + Learning Prompt)

> "Her taranan belge prompt'u eğitir, her eğitilen prompt daha iyi tarar."

### 1A — CourtListener Bulk Fetch Pipeline
**Hedef:** Epstein davasıyla ilgili top 50-100 mahkeme belgesi
**Durum:** 🟡 Pipeline var, bulk automation lazım

**Adımlar:**
1. CourtListener API'den Epstein-ilişkili cluster'ları listele
2. Opinion text çıkarma (cluster → sub_opinions → opinion chain)
3. Belgeleri `documents` tablosuna kaydet (source: courtlistener)
4. Batch download scripti (rate limit: 5000 req/hr, API key var)

**Çıktı:** 50-100 gerçek mahkeme belgesi, taranmaya hazır

### 1B — Learning Prompt Phase 1
**Hedef:** Prompt kendini geliştiren bir sistem olacak
**Durum:** 🟡 Araştırma tamamlandı, implementasyon bekliyor
**Referans:** `research/LEARNING_PROMPT_SYSTEM_RESEARCH.md`

**Adımlar:**
1. **Few-shot selection engine:** Onaylanmış entity'lerden en kaliteli 3-5 örneği seç
   - `document_derived_items` WHERE `status = 'approved'` → semantic similarity ile seç
   - Her belge tipi için ayrı example pool (court_record, deposition, financial...)
2. **Rejection blacklist:** Reddedilen entity pattern'lerini topla
   - "VE", "Plaintiff", "Court" gibi generic terimler → exclusion list
   - Case number'lar "organization" olarak etiketlenmemeli → type correction rules
3. **8-signal post-hoc confidence scoring:** AI'ın kendi confidence'ını KULLANMA
   - Signal 1: Document type reliability (court_record > leaked_document)
   - Signal 2: Source hierarchy (primary > secondary > tertiary)
   - Signal 3: Cross-reference count (kaç belgede geçiyor)
   - Signal 4: Entity name frequency in known databases
   - Signal 5: Entity resolution match score (Jaro-Winkler)
   - Signal 6: Community consensus (approve/reject ratio)
   - Signal 7: Historical accuracy (bu prompt versiyonu ne kadar doğru çıkardı)
   - Signal 8: Network consistency (mevcut ağla tutarlılık)
4. **Prompt versioning:** Her prompt değişikliği versiyonlanır, A/B test edilir
5. **prompt_versions tablosu:** version_id, prompt_text, accuracy_score, created_at

**Çıktı:** Prompt her scan'de daha iyi çalışır. Kullanıcılar geldiğinde sistem zaten öğrenmiş.

### 1C — Bulk Scan + Network Building
**Hedef:** 50-80 doğrulanmış node ile gerçek ağ
**Durum:** 🔴 Başlamadı (1A + 1B'ye bağımlı)

**Adımlar:**
1. Tüm belgeleri improved prompt ile tara
2. Entity resolution ile duplicate'ları birleştir
3. Quarantine → manual review → approve/reject
4. Her approve/reject → Learning Prompt'a geri besleme
5. Doğrulanmış entity'leri ağa ekle
6. İlk tarama sonu: prompt accuracy raporu

**GCP Kredi Planı ($340):**
- Phase 1 (MVP): ~500 sayfa = $1.08
- Phase 2 (Core): ~5,000 sayfa = $7.74
- Phase 3 (Deep): ~50,000 sayfa = $75.86
- **Toplam budget:** max $85 (kalan $255 Vision AI + gelecek için)

**Çıktı:** Gerçek verilerle dolu, ciddiye alınır bir ağ.

---

## HAT 2 — YÜZ (Landing Page + UX + Demo)

> "Dışarıya çıkacak ilk izlenim bu. Bunu güzel yaparsak, geri kalan her şey anlam kazanır."

### 2A — Landing Page Redesign
**Hedef:** "Vay be" dedirten, profesyonel, scrollytelling deneyim
**Durum:** 🔴 Başlamadı

**Gereksinimler:**
1. Sinematik hero section (CLASSIFIED estetiği ama daha modern)
2. 3D demo embed veya interaktif preview (ağı canlı göster)
3. Problem → Çözüm hikayesi (scrollytelling)
4. Feature showcase (en etkileyici 4-5 özellik)
5. Open source CTA + GitHub badge'leri
6. Mobil uyumluluk (responsive)
7. Hız optimizasyonu (LCP < 2.5s)
8. i18n (EN primary, TR secondary)

**Referans Modeller:** The Pudding, Stripe, Linear, Arc Browser

### 2B — Gamified Document Verification UX
**Hedef:** İnsanlar belge doğrularken oyun oynuyor gibi hissetsin
**Durum:** 🔴 Başlamadı (konsept araştırması var)
**Referans:** `research/` klasöründeki verification game araştırması

**Gereksinimler:**
1. Split-panel UX: Sol = belge, Sağ = AI çıkarımları
2. Swipe/approve/reject mekanizması (hızlı, sezgisel)
3. XP kazanma, streak sistemi, leaderboard
4. Her approve/reject → Learning Prompt'a feedback
5. Mikro-tutorial (ilk 3 belge rehberli)
6. "İlk Keşfeden" rozeti (mevcut sistemi güçlendir)

### 2C — Presentation Mode
**Hedef:** Beta test + gazeteci demoları için tam ekran deneyim
**Durum:** 🔴 Başlamadı

**Gereksinimler:**
1. Tam ekran 3D görünüm (HUD gizli, sinematik)
2. Adım adım anlatım kontrolleri (ileri/geri/zoom/highlight)
3. Paylaşılabilir link + OG metadata
4. Embed widget (iframe gömülebilir)

---

## HAT 3 — KALKAN (Güvenlik + Vakıf + Test)

> "Gazetecilerin önüne gerçekten çalıştığı, test edilmiş sistemle çıkacağız."

### 3A — Feature Testing Marathon
**Hedef:** Her mevcut özelliği uçtan uca test et
**Durum:** 🔴 Başlamadı

**Test listesi:**
1. Dead Man Switch (DMS) — oluştur, check-in, trigger, email
2. Collective Shield — oluştur, kefalet, alarm, Shamir birleştirme
3. Tunnel Mode — link tıkla, tünel gir, panel gez, çık
4. Epistemo Layer — kanıt tipi renkleri, confidence görünümü
5. Chat → 3D Pipeline — soru sor, node'lar parlasın
6. Investigation System — soruşturma aç, adım ekle, yayınla
7. Document Archive — yükle, tara, karantina, onayla
8. Badge/Reputation — tier yükselt, nomination, leaderboard
9. Proposed Links — ip uzat, oyla, otomatik kabul/red
10. View Modes (5 lens + board) — her birini test et

### 3B — Security Audit
**Hedef:** Sprint 19A'da bulunan 4 medium + 4 low bulguyu kapat
**Durum:** 🟡 Kritik fixler yapıldı, kalan 8 bulgu bekliyor
**Referans:** Sprint 19A (CLAUDE.md'de detaylar)

**Ek güvenlik:**
1. Rate limiting tüm API'larda (mevcut: kısmen var)
2. Input sanitization audit (inputSanitizer.ts genişletme)
3. CORS politikası sıkılaştırma
4. Error message'lardan bilgi sızıntısı kontrolü

### 3C — Sweden Foundation
**Hedef:** ideell förening registration
**Orijinal hedef:** 4 Nisan 2026 (12 gün kaldı)
**Durum:** 🟡 Araştırma tamam, aksiyon Raşit'te

**Gerekli:**
1. 3 kurucu belirleme (Raşit + 2 kişi)
2. Tüzük hazırlama (stadgar)
3. Kurucu toplantısı (protokoll)
4. Skatteverket'e başvuru
5. Banka hesabı açma

---

## 📅 TIMELINE (Tahmini)

```
HAFTA 1 (23-30 Mart):
  Hat 1: CourtListener bulk fetch + Learning Prompt Phase 1 başla
  Hat 2: Landing page araştırma + wireframe
  Hat 3: Feature test planı + vakıf tüzüğü

HAFTA 2 (30 Mart - 6 Nisan):
  Hat 1: Bulk scan başla, ilk 20-30 belge
  Hat 2: Landing page implementasyon
  Hat 3: Feature test marathon + vakıf başvurusu

HAFTA 3 (6-13 Nisan):
  Hat 1: Kalan belgeler + network building (50+ node)
  Hat 2: Gamified verification UX
  Hat 3: Security audit kalan bulgular

HAFTA 4 (13-20 Nisan):
  Hat 1: Prompt accuracy raporu + fine-tuning
  Hat 2: Presentation mode
  Hat 3: Son güvenlik kontrolleri

HAFTA 5 (20-27 Nisan):
  → Tüm hatlar birleşir → Beta test (5-10 kişi)
  → Feedback toplama → Son düzeltmeler

HAFTA 6+ (Mayıs):
  → Public release v1.0
```

---

## ✅ RELEASE CHECKLIST (Tümü ✓ olmadan çıkılmaz)

### Motor
- [ ] 50+ doğrulanmış node (gerçek mahkeme belgelerinden)
- [ ] 100+ doğrulanmış link (kanıt tipli, confidence'lı)
- [ ] Learning Prompt en az 50 belge ile eğitilmiş
- [ ] Scan accuracy > %80 (precision, recall ölç)
- [ ] Zero hallucination tolerance (yanlış veri ağa GİREMEZ)

### Yüz
- [ ] Landing page "vay be" seviyesinde
- [ ] Mobil uyumlu
- [ ] 3D demo veya interaktif preview çalışıyor
- [ ] Belge doğrulama UX'i sezgisel ve gamified
- [ ] Sunum modu demo yapılabilir durumda
- [ ] i18n (EN + TR) çalışıyor

### Kalkan
- [ ] DMS uçtan uca test edilmiş (email gerçekten gidiyor)
- [ ] Güvenlik audit 0 kritik/high bulgu
- [ ] Vakıf kurulmuş veya süreçte
- [ ] Privacy policy + Terms of Service hazır
- [ ] AI limitations disclosure sayfası var
- [ ] Error reporting formu var ("Report false information")

---

## 🔑 BAĞIMLILIKLAR

```
1A (bulk fetch) ──→ 1C (bulk scan)
1B (learning prompt) ──→ 1C (bulk scan kalitesi)
1C (network) ──→ 2A (landing page demo verisi)
2B (gamified UX) ──→ 1B (feedback → learning prompt)
3A (feature test) ──→ 3B (security fix)
3C (vakıf) ──→ Release (hukuki zemin)
```

---

## 💡 KRİTİK KURALLAR

1. **Anayasa #8:** "Yanlış veri, eksik veriden tehlikelidir." → Precision over recall. 40 doğru node > 100 karışık node.
2. **Anayasa #9:** "AI'a güvenme, doğrula." → Post-hoc scoring, AI confidence kullanılmaz.
3. **Test before build:** Her sistem 1000x test edilir, "çalışıyor gibi" yetmez.
4. **Discuss then build:** Her büyük karar tartışılır, tek taraflı execute edilmez.
5. **Topluluk karar verir:** Moderation, weights, verification = community-driven. Backend manipulation yok.

---

**Bu plan yaşayan bir belgedir.** Her sprint sonunda güncellenir.

> *"Az kaldı brom. Güzelce başlayalım, planlı temiz tertipli ilerleyelim."* — Raşit, 23 Mart 2026
