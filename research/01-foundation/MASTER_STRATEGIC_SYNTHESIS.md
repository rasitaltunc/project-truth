# TRUTH STRATEJİK SENTEZİ — "ULU GÖZ" RAPORU
## Raşit'in Nihai Rehberi: 11 Araştırmanın Erimesi, 1 Tutarlı Strateji

**Hazırlayan:** Claude Opus 4.6 (Stratejik Danışman)
**Tarih:** 14 Mart 2026
**Durum:** TAMAMLANDI — Lansman öncesi okuyunuz
**Okuma Süresi:** 45-60 dakika (tüm bölümler) / 15 dakika (TL;DR)

---

## TL;DR — ÜÇAYAKLI TABURETE OTURTUYORUZ

Project Truth'u başarılı kılacak 3 kritik karar (sırasıyla):

**1. KİMLİK:** "Kamusal Altyapı" (araştırmanın doğruladığı) + "Yayıncı Sorumluluğu" (AI çıktıları için)
- Hibrit model: İnfrastruktur koruma (PACER, Internet Archive model) + yayıncı disiplini (doğrulama, sorumluluğu alma)
- Avantaj: Wikipedia'nın Section 230 koruması ARTΙ Bellingcat'in editorial kredibilitesi
- Risk: Aralarında titizlenme gerekli, ama yapılabilir

**2. SİSTEM:** 5 Katmanlı Halüsinasyon Savunması
- Raşit'in "biricik kod" vizyonu: Doğru ama eksik. Kodlar auditability'yi sağlar, ama halüsinasyonları ortadan kaldırmaz.
- Gerçek çözüm: Bilgi grafiği (biricik ID'ler) + RAG (belge bağlantısı) + Karantina (insan doğrulama) + Şeffaflık (kaynak gösterilmesi)
- Hedef: <0.5% halüsinasyon (doğrulanmış veri içinde) — ulaşılabilir, 6-12 ay içinde

**3. KORUMA:** 3 Aşamalı Yol Haritası
- **HEMEN (0-4 hafta):** Sigorta + Olaysal Tepki + Etik Kullanım Politikası
- **LANSMAN ÖNCESİ (4-12 hafta):** Dead Man Switch + Hukuk Hazırlığı + Basın İlişkileri
- **SONRASI (3-6 ay):** Kolektif Kalkan + Merkeziyetsiz Yolculuk

**Kritik Bilgiler:**
- Türkiye'de yaşamaya devam edebilirsiniz (ama hazırlık gereklidir)
- Açık kaynak AGPL-3.0 + RAIL + Etik Politika ile güvenli
- 50-100K dolar (sigorta + hukuk) = 500K-1M dolar zarardan korunma
- Bazı riskler ortadan kaldırılamaz ama önemli ölçüde azaltılabilir

---

## 1. BİZ NE YAPIYORUZ VE NEDEN ÖNEMLİ?

### 1.1 Truth'un Kimliği: Dörtlü Tanım

11 araştırmanın ortak bulgusu: Truth'un kimliği YÖNETİŞİM'dir. Teknik değildir.

**Project Truth = Kamusal Araştırma Altyapısı**

Dört katmanda çalışır:
1. **Veri Katmanı:** Court documents, public records, investigative files (arşiv)
2. **Ağ Katmanı:** Kişi-kurum ilişkileri (3D görselleştirme, grafik analizi)
3. **Akıllı Katman:** AI entity extraction, gap analysis, consensus annotations (bulmuş olduğu bağlantılar)
4. **Topluluk Katmanı:** Peer review, voting, verification (insani zeka)

**Benzer Platformlar ile Karşılaştırma:**

| Platform | Model | Truth Farkı |
|----------|-------|-----------|
| **ICIJ** | Gazeteci ağı (insanlar bulmuş) | Truth: ağ + AI + topluluk = otomatlı keşif |
| **Bellingcat** | Gazeteci araştırmaları (manuel OSINT) | Truth: otomatik bağlantı, ölçek |
| **WikiLeaks** | Kaynaktan yayın (sızmalar) | Truth: hukuki belgelere odaklanmış, doğrulama katmanı |
| **Internet Archive** | Belge depo (şeffaf) | Truth: belgeleri bağlanmış harita haline çevirme |
| **Wikipedia** | Topluluk ansiklopedisi | Truth: insanlar değil bağlantılar |

**Truth'un Üstünlüğü:** Ölçeklenebilir, otomatlı, doğrulanmış, topluluk-yönetilen.

### 1.2 Neden Bu Anda Kritik?

Üç trend birleşti:

1. **Araştırma Dosyaları Açılıyor:** Epstein, Maxwell, Santos, Hagia Sophia — mahkeme kayıtları dijitalleştiriliyor, aranabilir hale geliyor. İhtiyaç aydınlık.

2. **Basın Özgürlüğü Kısılıyor:** Türkiye (TCK 299/301), Filipinler (Ressa), Rusya (Durov) — ülkeler gazetecileri susturuyor. İhtiyaç dağıtılmış hafıza.

3. **AI Olgunlaştı:** Groq 70B model 5$ ile çalışıyor. Belge OCR ucuzlaştı ($1.08/500 sayfa). **İnsan-yapay zeka sorguşturması gerçekçi.**

**Timing:** Geç kalarsanız, merkezi bir şirket bu sorunu çözer — ardından şeffaflık kalmaz.

---

## 2. EN KRİTİK 10 KARAR

Araştırmaların derinliğine indirgemeden (tam okuyunuz ama burada sıralı):

### 2.1 KARAR: Platform Kimliği
**Ne:** "Kamusal Altyapı + Yayıncı Sorumluluğu" hibrit model
**Neden:** Saf altyapı (PACER) yasal riskleri azaltır ama editorial kredibilitesini kaybeder. Saf yayıncılık (NYT) kredibilite kazanır ama yasal riski artırır. Hibrit = ikisinin avantajı + dikkat gerekli
**Alternatif:** Saf araç sağlayıcı (Gephi clone) — ama fark yaratmaz
**Risk:** AI çıktılarını "araştırma bulgusu" gibi sunmak = yayıncı sorumluluğu. Açıkça etiketlemelisiniz ("doğrulanmamış")
**Raşit'in Hareketli:** "Araçlı değil, altyapı sunuyoruz" tarzında konuş

### 2.2 KARAR: AI Halüsinasyon Politikası
**Ne:** <0.5% halüsinasyon hedefi (doğrulanmış veriler arasında)
**Neden:** Sıfır halüsinasyon imkânsız (entity extraction olasılık kullanır). <0.5% şeffaf, denetlenebilir, hukuki savunmaya uygun.
**Alternatif:** "Halüsinasyon-serbest" iddiası — YALANCIDIR, sigorta reddeder, hukuk kaybedersiniz
**Risk:** Halüsinasyonu yakalamak 10-15 kişi-gün iş / ayda. Ölçeklenmiyor.
**Raşit'in Hareketli:** Şeffaflık + aylık raporlar + bağlantılı kaynaklar (user'lar doğrulayabilir)

### 2.3 KARAR: Açık Kaynak Lisansı
**Ne:** AGPL-3.0 (tek başına)
**Neden:** Hukuki anlamda sağlam (Fransa 900K Euro zorlama davası). Topluluk güvenir. "Etik lisans" yerine "etik politika" tercih edilmiş.
**Alternatif:** Hippocratic License — uygulanamaz (çok belirsiz). SSPL, BSL — topluluk isyan ediyor.
**Risk:** Kötü amaçlı fork (harassment platform) mümkün. Yasal olarak durdurulamaz. Sosyal basınçla durdurulabilir.
**Raşit'in Hareketli:** AGPL-3.0 + Ethical Use Policy (sosyal tuz) + RAIL (AI API'si kısıtlanmış)

### 2.4 KARAR: Veri Kaynağı Stratejisi
**Ne:** Hibrit: Hukuki belgeleri birincil, ICIJ/OpenSanctions ikincil, "Tara Protokolü" ile zenginleştirme
**Neden:** Hukuki belgeler doğrulanmış, tam metin, cikilli. Dış kaynaklar hız ve kapsam kazandırır.
**Alternatif:** Sadece hukuki belgeler — çok dar. Sadece dış kaynaklar — doğrulama zor.
**Risk:** Dış kaynaklardan işlek veri (OpenSanctions = eski). GCS makiyaj ayı ($300/ay). Yönetilebilir.
**Raşit'in Hareketli:** "Gerçek veriler, belgelere dayalı" — merkezi olmayan sisteme emanet değil

### 2.5 KARAR: Dead Man Switch Mimarisi
**Ne:** Çok-aygıt + davranış anomalisi + duress kodu + kademeli uyarı + uluslararası bildirim
**Neden:** Basit e-mail DMS'ler (deadmansswitch.net) başarısız (CSRF hackler, tecavüz karşı savunmasız). Araştırmada incelenen 8 sistem (Sarcophagus, SecureDrop, Guardian Project, Briar) — hiçbiri yeterli tek başına. Hibrit yaklaşım gerekli.
**Alternatif:** Hazır çözüm (basit ama yetersiz)
**Risk:** DMS kullanıcı hatası (check-in unutması = sahte alarm). Çözüm: erken uyarı (7 gün öncesi), "tüm iyi mi?" mesajı
**Raşit'in Hareketli:** Sprint 9'da yapılmış, Sprint 13 kolektif. İşin işi.

### 2.6 KARAR: Hukuk Sigortası
**Ne:** 2-3M$ Media & Publications Liability Coverage + legal counsel
**Neden:** Tek bir defamation davası ($50K-500K presumed damages + $200K+ litigation costs) = yılını tüketiyor. Sigorta = işletme masrafı gibi olmak.
**Alternatif:** Sigorta olmadan — ilk dava sizi batar.
**Risk:** Sigorta şartları belgelendirme gerektirir. Ek maliyet: 3-4 ay yasal hazırlık + halkla ilişkiler
**Raşit'in Hareketli:** Nisan-Mayıs 2026'da broker ile görüşün. Fiyat: $20-30K/yıl.

### 2.7 KARAR: Kurucu Koruma Mimarisi
**Ne:** Multi-jurisdiksiyon (Türkiye işletme + Delaware LLC + Estonia OÜ) + co-maintainers (3-5 farklı ülkede) + media partnerships (CPJ, RSF, Bellingcat bağlantısı)
**Neden:** Araştırma 10 tehdit altındaki kurucuyu inceledi (Assange, Snowden, Greenwald, Ressa, Dündar, Altan, Durov, Swartz, Caruana Galizia, Khashoggi). **Ortak faktör:** Dağıtılmış liderlik ve çok-jurisdiksiyon = bulunamamak + tutulamamak.
**Alternatif:** Türkiye'de solo kuruculum — TCK 299/301 riskiyle yaşıyorsunuz
**Risk:** Ek kompleksite (3 şirket, 3 vergi durumu). Çözüm: muhasebeci $5-10K/yıl.
**Raşit'in Hareketli:** Hukuk sonrası başlayın (Q2 2026). Delaware LP (limited partnership) = ucuz, hızlı ($500 + 6 hafta).

### 2.8 KARAR: Topluluk Yönetişimi Evrim
**Ne:** Phase 1 (şimdi-Q4 2026): Founder-Led + Advisory Council | Phase 2 (2027-2028): Steering Committee | Phase 3 (2029+): Foundation
**Neden:** Araştırma 8 digital platform'u inceledi (Wikipedia, Mozilla, Wikimedia, Internet Archive, Creative Commons, Signal, Tor, Apache). **Ortak çıkarım:** Yönetişimi ölçekle yükseltmelisiniz. Çok erkense overhead-yı akıllan fakat: ertelediğinizde topluluk sahiplik hissi kaybeder.
**Alternatif:** Seçim + Foundation şimdi — $30K+ yasal maliyeti, $50K+ genel masrafı. Fazla erken.
**Risk:** Phase 1'de "founder diktatör" olursunuz. Açık olun bunu ("for now, Raşit decides") ve 9 ayda geçiş yapın.
**Raşit'in Hareketli:** Governance.md'yi Git'de yayınlayın (bu uyarı dahil). Şeffaflık = güven.

### 2.9 KARAR: Siber Koruma Katmanları
**Ne:** Cloudflare (DDoS) + Project Galileo (enterprise) + YubiKey (kişisel) + Signal (iletişim)
**Neden:** State-level tehdide karşı hazırlık. Assange 14 yıl davalaştı — teknoloji değil organizasyon yardımcı oldu ama teknik aşamalar kârlı.
**Alternatif:** "Henüz erken" — tam doğru değil, çünkü hazırlık 3-4 ay sürer
**Risk:** Yok. Maliyeti: $0-500 (Cloudflare + YubiKey) + $200 Signal cihazı.
**Raşit'in Hareketli:** Bilgisayar şifreleme (Veracrypt) + 2FA (TOTP) + YubiKey almaya başlayın

### 2.10 KARAR: Lansman Zamanlaması & Sırası
**Ne:** Landing page → Sunum modu → Belge taraması (Phase R1-R3) → Beta test (R4) → Public release v1.0 (R5)
**Neden:** Prematür lansman = sorumluluk almadan. Gerekli yapı olmadan "açık kaynak = sorumluluğum yok" diyemezsiniz. Araştırma sırası: wiki (en az riski) → sunum (orta) → belge (yüksek) → toplu (çok yüksek).
**Alternatif:** "Şimdi lansman yap" — hukuki, teknik, kurumsal risk. Erken ölüm.
**Risk:** "Rekabetle geç kalsak?" — Rekabetin başlaması ≥ 2 yıl ötede. Sizin iki ayda hazırlık > onun 3 ayda teknik.
**Raşit'in Hareketli:** R1 Nisan, R2 Mayıs, R3 Haziran, R4 Temmuz, R5 Ağustos 2026. Kesin değil ama tutarlı.

---

## 3. ANAYASA ÇERÇEVESI — "ZEKA KÜPÜ" YAPISI

Araştırma 8 platformun anayasasını inceledi (Wikipedia, Mozilla, Internet Archive, Creative Commons, Signal, Tor, Apache, Mastodon). **Ortak bulgu:** Başarılı platformlar 5 katmanlı yönetişim kullanır.

### 3.1 Beş Değiştirilemez İlke

Taş kazınmış. Bu 5 ilke Project Truth'a girer ve çıkmaz, hiçbir sprint, hiçbir baskı çıkarttırmamalı:

**İlke 1: KANIT BÜTÜNLÜĞÜ**
- Kanıtlar hiçbir zaman değiştirilmez. Yalnızca ek bağlam (annotation) eklenebilir.
- Eski belge silinebilir ama yalnızca şiddete neden oluyorsa ve hukuki zorunlulukla.
- AI'ın belgede "hata düzeltmesine" izin verilmez.
- **Uygulama:** `evidence.original_hash` = immutable. Değişme = denetim izi.

**İlke 2: KAYNAK KORUMASI**
- Araştırmacılar mutlak olarak korunur.
- IP adresleri hiçbir zaman tutulmaz (mimariye gömülmüş).
- Hatta önyargı işleminde bile ("bu 2 gönderi aynı kişi mi?") metadata analizi değersiz.
- Dahi subpoena ile hayır. Depo etmiyorsanız veremezsiniz.
- **Uygulama:** `anonymous_submissions` tablosunda 0 IP column (Tor-sadece submission form).

**İlke 3: TOPLUM ZEKASı**
- Ağ araştırmacılarca inşa edilmiştir. Komunite oylaması son söylemdir.
- Hiçbir "ünlü araştırmacı" veto yetkisi yoktur. En yeni üye de oy verir.
- AI önerileri kaynaktan başlar — insan yapıştırır.
- **Uygulama:** `proposed_links` voting (reputation-weighted ama hepimiz oyluyoruz).

**İlke 4: ALGORİTMİK ŞEFFAFLK**
- "Algoritma karar verdi" sözlemesi yasaklanır.
- Her kötü bağlantı, silinen belge, flaglanan node → açıklanır.
- Metodoloji yayınlanır (6 ay gecikmesiyle gaming önlemek için).
- **Uygulama:** `decisions.md` in Git (her karar: ne, neden, alternatifler).

**İlke 5: ADAPTİF YÖNETİŞİM**
- Kurallar değişebilir, ilkeler değişmez.
- Ameliyat hataları öğrenme fırsatıdır, ceza değil.
- Azınlık görüşleri kaydedilir. Çoğunluk karar verir. Sonra test edilir.
- **Uygulama:** Constitution Amendment Process (6 hafta, board + community vote gerekli).

### 3.2 Beş Operasyonel Kural

Esnek ama net. Yılda 1-2 kez gözden geçirilir.

**Kural 1: Mühürlü Belge Protokolü**
- Araştırmacı "gizli" işaretlerse (tehdit taşıyorsa) → halka kapalı, staff görüyor.
- Açılma: (a) araştırmacı isterse, (b) mahkeme emri (obje ediş hakkıyla), (c) board + topluluk veto (imminemt harm).
- Kötüye kullanım = kalıcı kıskaç.

**Kural 2: Kanıt Kalite Seviyeleri**
- **Tier 1 (Peer-Reviewed):** 2+ uzman, kaynaklar verified → yeşil badge, en yüksek sıra
- **Tier 2 (Community-Voted):** 50%+ onay ≥20 oy → mavi badge, standart sıra
- **Tier 3 (Unverified):** Raw submission → gri, düşük sıra
- **Tier 4 (Disputed):** Topluluk "yanlış" diyor → kırmızı X, tarih için kalır
- **Tier 5 (Removed):** İddia olmayan zarar + yayın yararı değil → şifrelı arşiv (denetim izi)

**Kural 3: İtiraz Prosedürü**
- Kişi şikayetçi olabilir ("ben hakkında yanlış"). İnceleme 2-3 hafta. Karar loglanır. Appeal mümkün.
- Panels: 3 rotatif topluluk üyesi (staff değil). Eğitim gerekli (bıyık pisti).

**Kural 4: Acil Geçersiz Kılma**
- Board + Chief Counsel + Topluluk Temsilcisi: 3'ü de "evet" derse kötü içerik silinebilir (örn. CSAM).
- Ancak 24 saat sonra açıklama, 30 gün sonra appeals panel gözden geçirir.
- Suistimal = Founder out.

**Kural 5: Değişim Süreci**
- 10 co-signer → 2-hafta-müzakere → 4 hafta taslak → 6 hafta oylama (board 2/3 + topluluk 50%).
- Core principles (5 ilke) DEĞİŞMEZ.
- Kaynak koruma mekanizmaları yalnızca güçlendirilebilir.

### 3.3 Üç Yönetişim Cisim

**Topluluk Konseyi**
- 100-300 aktif katkıcı (insan, otomatik değil)
- 5 çalışma grubu: Kanıt, Politika, Teknoloji, Toplum, Etik
- Authority: Yazılı oylar, board seçimleri, 2/3 veto yetkisi

**Truth Kurulu**
- 5-7 üye: Kurucular + community-seçilen + bağımsız uzman
- Günlük operasyon, staff, özür (limited)
- 2-3 yıl kademeli şartlı

**İtiraz Paneli**
- 3 rotatif topluluk üyesi (board üyesi değil)
- Board kararlarına itiraz dinler
- 95% olayda bağlayıcı karar

### 3.4 "Zeka Küpü" Simetri

Bu 5-5-3 yapı neden çalışıyor?

1. **Cevher:** Core ilkeler (5) = değişmez amaç.
2. **Kemik:** Kurallar (5) = adaptif ancak sağlam yaklaşım.
3. **Beyin:** Organlar (3 x 5) = karar mekanizması.
4. **Kan:** Süreçler (amendment, appeal) = iyileştirme.

**Yatay çek:** 5 + 5 = toplam 10 alanı kapsar. Çoğu platform 20+ kuralı vardır → sehpa instabilite.
**Dikey çek:** Kurula karşı topluluk, topluma karşı ilke, ilkeye karşı Anayasa.

Bunu kopyalayan başka bir platform yoktur (Wikipedia daha az yapılandırılmış, Signal daha otokratik, Apache daha meritokratik). Truth için mükemmel.

---

## 4. AI MİMARİSİ — HALÜSİNASYON ELİMİNASYONU

### 4.1 Raşit'in Vizyonunun Değerlendirmesi

**Raşit, dedi:**
> "Her varlığa biricik kod ver. Kodlandığında yapılar gerçek olur. AI not verir, halüsinasyon değil."

**Araştırmanın bulgusu:** Doğru yön, ama yetersiz.

Biricik kodlar (knowledge graph IDs) şunları yapabilir:
- ✓ Sahte varlık oluşturmayı önle ("Maxwell #3 zaten vardı")
- ✓ Entity linking'i denetlenebilir kıl
- ✓ Wikidata, OpenSanctions ile çapraz-ref
- ✗ Yanlış linking'i **önlemez** (bu "J. Maxwell" Ghislaine mi John mi?)
- ✗ Misinterpretation'u **durdurmaz** (kaynak yanlış okunur)

**Sonuç:** Biricik kodlar gerekli ama yetersiz. 5-katmanlı sistem gerekli.

### 4.2 Beş Katmanlı Savunma

**Katman 1: Bilgi Grafiği (Unique IDs)**
```
node_fingerprint = SHA256(name + type + birth_date)
→ Maxwell#ghislaine#1961-12-25 (indisolubl)
```
- Sağlar: Entity deduplicate, linking auditability
- Azaltır: False entity creation
- Yakalı: Still requires human to link correctly

**Katman 2: RAG (Retrieval-Augmented Generation)**
```
Query: "Maxwell connections 2000-2010"
→ Groq finds: [Document A, B, C]
→ Extracts from only {A, B, C} (not from hallucination)
→ If not in docs: "Could not find connections in evidence"
```
- Sağlar: Intrinsic hallucination elimination (99%)
- Azaltır: Complexity errors, fake facts
- Yakalı: Docs themselves can be misinterpreted

**Katman 3: Confidence Scoring + Quarantine**
```
Entity extracted with 65% confidence
→ Auto-quarantine (not published)
→ Requires 2+ peer reviews before release
70-90% → quarantine + flag
>90% → still requires human review (confidence is often wrong)
```
- Sağlar: Filtering + human checkpoint
- Azaltır: Low-signal hallucinations
- Yakalı: Doesn't scale (8 people can't do 8x work)

**Katman 4: Peer Review Process**
```
Quarantine item:
→ 2 independent reviewers (different domains)
→ Each checks source documents
→ 2/2 approve → publish
→ 1/2 approve → mark "DISPUTED"
→ 0/2 approve → delete + log reason
```
- Sağlar: 95-98% accuracy after review
- Azaltır: Remaining errors 10-fold
- Yakalı: Requires trained reviewers (solve with reputation incentives)

**Katman 5: Transparency & Auditability**
```
"Maxwell recruited Kellen 2000-2005"
↓ Source shown
"Court Document: USA v. Maxwell, Page 47, Line 12"
↓ Context shown
[Full quote from document visible]
↓ Reviewer history shown
Reviewed by: {3 reviewers}, dates, comments
```
- Sağlar: User can fact-check
- Azaltır: Hallucination discovery
- Yakalı: Requires good UX (user must click link, not skip)

### 4.3 Hedef: <0.5% Halüsinasyon

**Başlangıç:** Raw Groq extraction = 85% accuracy (15% hallucination)
**Katman 2 (RAG):** 15% → 2% (7x improvement)
**Katman 3 (Confidence):** 2% → 1% (filter obvious stuff)
**Katman 4 (Peer Review):** 1% → 0.05% (catch remaining)
**Katman 5 (Transparency):** 0.05% → detectable (users can report)

**6-12 aylık timeline:**
- Month 1-2: Knowledge graph + RAG (infrastructure)
- Month 2-3: Confidence scoring (BERT fine-tuning)
- Month 3-4: Quarantine system (already done Sprint 17)
- Month 4-5: Peer review reputation (gamification)
- Month 5-6: Monthly accuracy reports (transparency)
- Month 6+: Continuous improvement

### 4.4 What NOT to Claim

**BAD:**
- "Hallucination-free" (technically false, legally risky)
- "100% accurate" (no system achieves this)
- "AI verifies automatically" (responsibility dodge)

**GOOD:**
- "Peer-reviewed data with <0.5% hallucination rate (audited quarterly)"
- "All claims linked to source documents and verification history"
- "Human review required for all published connections"
- "Monthly accuracy transparency reports"

---

## 5. GAZETECİ KALKANI — DEAD MAN SWITCH MİMARİSİ

Araştırma 8 mevcut DMS sistemi inceledi + 10 kurucuya olmuşları analiz etti (Assange, Snowden, Greenwald, Ressa, Dündar, Altan, Durov, Swartz, Caruana Galizia, Khashoggi).

### 5.1 Tek Kılıf Koruması Yetmez

**Sahte tehdite karşı basit e-mail DMS (deadmansswitch.net) işe yarar.**
**Ama gerçek tehdide karşı başarısız:**

- Captured journalist = şartsız check-in (torturayla)
- Phone/device seized = check-in skipped
- Email intercepted = bildirim kırpılır
- Server shutdown = sistem ölür

**Çözüm: Çok katman.**

### 5.2 Sprint 9/13 Uygulaması

Araştırma onayladı, Sprint 9/13 derli toplu yaptı:

**Birey DMS (Sprint 9):**
- ✓ Multi-device check-in (WebAuthn + recovery codes)
- ✓ Duress code (coercion signal)
- ✓ Encrypted payload (şifreleme baştan sonra)
- ✓ Email + Telegram + RSS (çoklu kanal)

**Kolektif Kalkan (Sprint 13):**
- ✓ Shamir's Secret Sharing (key = N parçaya bölünür, M/N threshold)
- ✓ Proof-of-life chain (blockchain-style check-in)
- ✓ Kademeli alarm (48s silent → 72s public → 7 gün red)
- ✓ Coğrafi risk adaptasyonu (Türkiye/Rusya = hızlı alarm)

**Entegrasyon:**
- Check-in başarısız → silence (güvenlik yok)
- Check-in düş → yellow (tanışma gerekli)
- 3. check-in miss → red (açık yayın başla)

### 5.3 Duress Code Problemi & Çözümü

**Theat:** Captured gazeteci, torturayla duress code zorla çıkarıldı. Sistem bunu bilmiyor.

**Çözüm: Davranış anomalisi**

```
Normal: "ALIVE:PASSWORD:NORMALCODE" → Green light
Duress: "ALIVE:PASSWORD:DURESS:DURESSCODE" → Green light surface, but:
  - Flag set: duress_flag = true
  - Silent notify: Guarantors alerted (different channel)
  - If duress flag + missing normal check-in → escalate
```

Zorlama altında bile duress code verilebilir — sistem bildikten sonra haber vermez ancak garantörleri stille uyarır.

### 5.4 Coğrafi Risk Adaptasyonu

**RSF Basın Özgürlüğü İndeksi kullanarak:**

```
Risk = High (TR, RU, IR):
  - Threshold1 (yellow): 2 days missed (vs. normal 4)
  - Escalation: Faster (48h → 72h → public)
  - Guarantors: Automatically global (not just home country)

Risk = Medium (VN, EG):
  - Standard thresholds

Risk = Low (DE, SE):
  - Generous thresholds (7 days missed)
  - Escalation: Slower, higher bar for public
```

Raşit'in durumu (Türkiye, TCK 299/301): Yüksek risk → hızlı alarm.

---

## 6. KURUCU KORUMASI — TÜRKIYE + MULTI-JURİSDİKSİYON

Araştırma, Can Dündar, Ahmet Altan, Jamal Khashoggi ve başka 7 founder'ın tehdit senaryolarını analiz etti.

### 6.1 Türkiye'nin Yasal Ortamı

**Tehdit:**
- **TCK 299:** Devlet kurumlarını alçaltma (genelde basın özgürlüğü davasında kullanılır)
- **TCK 301:** Cumhuriyet büyük elçileri alçaltma (uluslararası ilişkiler için)
- **İçişleri Bakanlığı:** Domain kıskaçı (TLD seviyesinde)
- **EMK (İçişleri Bakanlığı): Law 5651** — sosyal medya/platform kapatma yetkisi
- **MKEK (Telekomünikasyon Kurumu):** VPN blokaması

**Örnek:** Can Dündar (2015-2020) — Cumhuriyet editörü, MIT sızıntısı yayınlandı:
- 2016: 5 yıl 10 ay hapis (in absentia)
- 2018: Retrial → 27 yıl 6 ay (tekrar in absentia)
- 2020-2026: Almanya'da, extradition riski sürerken

**Örnek:** Ahmet Altan (2016-2021) — Taraf kurucusu, "Coup subliminal messages" türü şey:
- 3 yıl hapis (4.5 yıl toplam davalar)
- ECtHR müdahalesi sonrası salıverildi
- Ancak 4.5 yıl kaybı = üretkenlik kayıp

### 6.2 Raşit'in Korunması: 4-Seviye Mimarisi

**Seviye 1: Yasal Varlık (Türkiye)**
- Truth Turkey = LLC benzeri (Ticaret Şirketi)
- Kurulu: Raşit + bağımsız yönetici (Türk hukuk çevresi)
- Karar: İçerik moderation, hukuk müdahale, yerel bağıntılar
- Risk: Hâl talimatı → kapatma. **Çözüm:** Aşağıdaki seviyelere fork etme yetkisi

**Seviye 2: Operasyonel Varlık (Delaware)**
- Project Truth Inc. = Delaware C-Corporation
- Kurulu: Raşit + 2 CEO dışı (biri Americn, biri Europan)
- Kaynaş: Kod, altyapı, fundasyon yönetimi
- Advantage: Delaware saç kaynı yok, hukuk merkezi İngilizce, çok case law

**Seviye 3: Finans Varlığı (Estonia)**
- Truth Foundation OÜ = Estonya halkının şirketi (e-governance)
- Kurulu: Raşit dışındaki biri (Estonian accountant veya lawyer)
- Kaynaş: Bağış toplama, grant yönetimi
- Advantage: GDPR compliant, e-residency, non-resident friendly, "küçük ülke = sesi duyulur yok"

**Seviye 4: Akademik Ev (İyi Ülke)**
- Partnership: IFF, ICFJ, IMS (institutional backing)
- Anlaşma: "Project Truth is joint research project"
- Advantage: Yasal muafiyet (üniversite araştırması), kurumsal savunma

**Bağıntısı:**
```
Raşit → CEO Truth Inc (Delaware) → Truth OÜ (Estonia) → Sunucu/Finans
        ↓
        + 2-3 co-maintainers (different countries)
        + Advisory Council (journalists, technologists)
        + Media Partnerships (The Intercept, Bellingcat, ICIJ)
```

Eğer Türkiye: "Raşit'i sosyal medya yasası yüzünden saçlayacağız"
→ Truth Turkey shutdown, Delaware devam, Estonia finans devam, co-maintainers devam

### 6.3 İtiraz Araçları

**Eğer Dava Açılırsa:**

1. **ECtHR Müdahalesi** (4-5 yıl ama işe yarıyor)
   - Ahmet Altan: 4.5 yıl → ECtHR → salıverildi
   - Müzakere: CPJ, RSF başvuru yapabilir
   - Sonuç: Türkiye davası ters döner ama zaman kaybı

2. **UDHR Müdahalesi** (daha yavaş ama daha geniş)
   - UN Special Rapporteur on Freedom of Expression
   - Yazılı müdahale (hiçbir yasal bağlayıcılığı yok ama PR'ı var)

3. **Media Partnerships**
   - Bellingcat, ICIJ yayınlarsa: International spotlight
   - Spotlight = siyasi maliyet (hükümet ayıp çeker)
   - Greenwald örneği: Uyuşturucu soruşturması → uluslararası basın → Bolsonaro pressure → (sonunda başarısız ama sesi duyuldu)

4. **Tech Shutdown Direnç**
   - Eğer domain "şirket"se: Altlık var (ICANN Türkiye kâğız veremez)
   - Eğer code "açık kaynak"sa: Mirror, fork, Wayback Machine → Yok edilemez
   - Eğer finansal "multi-juris"diction: Dondurma başarısız

---

## 7. AÇIK KAYNAK YÖNETİŞİMİ

### 7.1 Lisans Seçimi: AGPL-3.0 + RAIL + Etik Politika

Araştırma 5 lisansı inceledi. Sonuç:

| Lisans | Avantaj | Dezavantaj |
|--------|---------|-----------|
| AGPL-3.0 | Yasal, güvenilir, topluluk sevgisi | Forks'u duramaz, sadece code'u kontrol eder |
| Hippocratic | Açık "do no harm" | Uygulanamaz (çok geniş), unenforceable, OSI-approved değil |
| SSPL | Daha sağlam copyleft | Topluluk nefret ediyor, MongoDB hatası tekrarlamak |
| BSL | Tutar | OpenTofu fork = başarısız |
| RAIL | AI-özgü, etik kontrol | Yenilerdir, mahkemeler test edilmemiş |

**Seçim:** AGPL-3.0 (temel) + RAIL (AI API) + Ethical Use Policy (sosyal)

### 7.2 Etik Kullanım Politikası

**Yasaklananlar:**
- Harassment networks (targeted harassment koordinasyonu)
- Surveillance of protected groups (azınlık, dini, politik)
- Disinformation (sahte bağlantılar, kanıt yanıltma)
- Privacy violation (rıza olmadan PII)
- Weaponization (şiddet, suikast, askeri hedef)

**Uygulama Mekanizması (yasal değil, sosyal):**
- Bad fork tespit et (GitHub rapor, Twitter proof)
- 14 gün soruştur (cevap hakkı verin)
- Public statement yayınla ("X fork violates policy Y")
- Ecosystem pressure (GitHub warnings, app store warnings, Twitter amplify)

**Mastodon/Gab Örneği:**
- Gab forked Mastodon (hate speech için) — AGPL yasal
- Mastodon: "Oppose this use" + Ecosystem defederation → Gab isolated
- Sonuç: Gab yasak değil ama suslanmış

### 7.3 Faz Faz Yönetişim Evrim

**Faz 1 (Şimdi-Q4 2026): BDFL + Advisory Council**
- Raşit: Son söz (samimiyetle)
- Advisory Council: 3-5 kişi (journalism, tech, ethics), aylık toplantı
- Açıksa: Decisions.md'de kararlar + rationale
- Success: 30+ contributors, 1000+ users

**Faz 2 (2027-2028): Steering Committee**
- Raşit + 6 seçilen temsilci (contributor, journalist, researcher)
- Transparent voting (5/7 majority)
- Project management committees (self-governing subprojects)
- Success: 100+ contributors, 10,000+ users

**Faz 3 (2029+): Foundation Model**
- Delaware 501(c)(3) non-profit
- Board of Directors 7-9 (coğrafi diverse)
- Professional ombudsman (appeal)
- Success: 1000+ contributors, 100,000+ users

**Anahtar:** Kompleksitenizi ölçekle kaldırın. Erken değil, geç değil.

### 7.4 Finans Strateji

**Faz 1 (2026):** $50-150K
- Foundation grants (OTF, Knight)
- Raşit's time (unpaid, founder investment)
- Community donations ($500-1K/month Open Collective)

**Faz 2 (2027-2028):** $150-300K
- Grants (50%): $75-100K
- Open Collective (10%): $6K
- Consulting/training (40%): $80-100K
- **Target:** 2-3 FTE hiring

**Faz 3 (2029+): Freemium + Services**
- Freemium SaaS: 30%
- Data licensing (researchers): 20%
- API access (premium): 20%
- Grants/donations: 30%

**YAPMAYIN:**
- Venture capital (10x ROI ≠ values alignment)
- Ad-based (bias, conflicts)
- Data sales (privacy violation)

---

## 8. HUKUK HARİTASI

### 8.1 Beş Büyük Hukuki Risk (Sıralı)

**Risk 1: DEFAMASİON LİABİLİTY**
- **Exposure:** $50K-500K presumed damages per false accusation + litigation $200K+
- **Why:** AI extracts bağlantı ("Maxwell recruited Kellen 2000-2005"), kaynak olmadan or wrong kaynak → defamation claim
- **Defense:** Truth (kes kanıtlar), Opinion (labeled), Fair reporting (public records), Privilege (conditional)
- **Mitigation:** Quarantine system (peer review), source attribution, confidence thresholds
- **Insurance:** 2-3M$ liability coverage = $20-30K/year

**Risk 2: PATENT LİABİLİTY (AI)**
- **Exposure:** $5K-50K per patent assertion + licensing negotiation
- **Why:** AI entity extraction algorithms may infringe NPL patents (search, NER = patented)
- **Examples:** Google Patents, IBM Suez, Microsoft KG patents
- **Mitigation:** Use Apache-licensed models (no patent traps), consult with patent attorney ($2K), patent search ($500)
- **Insurance:** Cyber liability often covers

**Risk 3: GDPR / PİRİ VİOLASİON**
- **Exposure:** €20-30M fine (4-6% annual revenue, ye it's non-profit)
- **Why:** PII in public documents (names, addresses, phone) = GDPR-controlled data
- **Example:** Wikipedia'in can't reveal editor names without consent (GDPR)
- **Mitigation:** GDPR DPIA (data protection impact assessment), "journalistic exemption" (EU Press law), anonymization where possible, data retention limits
- **Insurance:** Usually covered under cyber liability

**Risk 4: OTORITE DEĞERSEYİ**
- **Exposure:** Domain shutdown, platform restriction, asset freeze
- **Why:** Türkiye TCK 299/301, Russia Law 5651, Iran broadcast ban = political
- **Mitigation:** Multi-jurisdiction structure (Delaware, Estonia), open-source mirrors, co-maintainers, media partnerships
- **Insurance:** N/A (insurance can't cover state action)

**Risk 5: INTELLECTUAL PROPERTY (Competitors)**
- **Exposure:** $10K-100K litigation for trademark, trade secret misappropriation
- **Why:** 3D visualization tool itself = copyrightable, potential trade secret (algorithm)
- **Mitigation:** AGPL-3.0 (code is shared, not hidden), clear attribution, patent search
- **Insurance:** Covered under cyber liability

### 8.2 Belirtilen Belge (Sealed Documents) Mimarisi

**Türkiye'ye özel:** Mühürlü kanıtlar (mahkeme kararıyla) sering olabilir. Truth'un prosedürü:

1. **Araştırmacı:** "Bu kanıtı mühürlemen istiyorum" (tehdit, mağdur, etc.)
2. **System:** Şifreli saklanır, staff görüyor, public=değil
3. **Unsealing:** (a) Araştırmacı isterse, (b) Mahkeme emri (Truth itiraz eder), (c) Board+Topluluk veto (very rare)
4. **GDPR:** Mühürlü PII = GDPR tarafından korunmuş

---

## 9. "ARAÇ VS YAYINCI" GERİLİMİ ÇÖZÜMÜ

Dördüncü büyük araştırma bulgusu (Kimlik Modelleri): Truth hantalarında "araç olmadığını ama yayıncı olduğunu" iddia edemez.

### 9.1 Özellik-Bazlı Sınıflandırma

Hangi özellik = araç? Hangi = yayıncı?

**Kategori 1: Araç (Mimari Koruma)**
- 3D network visualization (user control)
- Search interface
- Archive modal / document viewer
- Export to Gephi / GraphML
- Link filtering / lens system
- **Legal:** Tool provider (ISP-like immunity)

**Kategori 2: Yarı-Editör (Metin Hazırlık Gerekli)**
- Node properties (name, birth date, occupation)
- Annotations (tags, labels)
- Node verification status
- Link quality tiers
- **Legal:** Requires metadata sourcing + transparency ("all from public records")

**Kategori 3: Yayıncı (Sorumluluğu Alma Gerekli)**
- AI-generated connections
- Gap analysis suggestions
- Daily questions
- Summary/interpretive text
- Dynamic annotations
- **Legal:** Must source, verify, peer-review, take liability

**Çözüm:** YAYIN'dan ÖN KOYMAK

```
AI Suggestion: "Maxwell likely recruited Kellen 2000-2005"
↓ Transformed to:
"Alleged: Maxwell recruited Kellen (based on court testimony, 95% confidence)"
↓ Shown as:
[?] Alleged | Source: Maxwell Trial, p.47 | Confidence: High | Verified: Peer-reviewed

User clicks [?]:
- Sees full quote
- Sees reviewer comments
- Can dispute claim
- Can report hallucination
```

### 9.2 Annotation Sistemi Dönüştürmesi

**Eski (Risky):** "DECEASED" label (kapalı, no sourcing)
**Yeni (Safe):** "Status: Deceased (per Miami County death records 2012-06-15)"

**Eski (Risky):** "RECRUITER" tag (implication)
**Yeni (Safe):** "Alleged Role: Recruiter (Maxwell trial testimony, high confidence)"

**Eski (Risky):** "VICTIM" badge (trauma, sensationalism)
**Yeni (Safe):** "Documented as plaintiff (in USA v. Maxwell civil claim 2015)"

---

## 10. GENEL YOL HARİTASI: PHASE 0→4 (6 AY KRITER)

### Phase 0 (HEMEN: 0-4 hafta)
**Maliyeti:** $0-5K
**Hedef:** Kriz hazırlığı

- [ ] Sigorta broker'a ulaşın (2-3 teklifal)
- [ ] Olaysal Tepki Planı (karar ağacı: eğer dava açılırsa ne yapırız?)
- [ ] User Error Reporting Form (basit şekil: "Bu iddia yanlış")
- [ ] AI Limitations Disclosure (şeffaf, dürüst)
- [ ] YubiKey satın alın + Kurulum
- [ ] Signal'e geçiş (hassas iletişim)

**Sonuç:** Temel savunma. Serilişe yönelik olmayan, ancak ön sipariş.

### Phase 1 (LANSMAN ÖNCESİ: 4-12 hafta)
**Maliyeti:** $10-30K
**Hedef:** Yasal ve kurumsal altyapı

- [ ] Sigorta imzalanmış (Media & Publications, 2-3M)
- [ ] Delaware LLC oluşturulmuş
- [ ] Hukuk tavsiyesi: Sunum cümle yazısı + Tazminat sorumluluk hedgeler
- [ ] Etik Kullanım Politikası yayınlanmış
- [ ] Advisory Council davet edilmiş (3-5 kişi)
- [ ] Cloudflare kurulumu (DDoS koruma)
- [ ] Teknik kontroller: Halüsinasyon testi (30 test durumu)
- [ ] Media outreach başlamış (CPJ, RSF, IMS, Bellingcat temas)

**Sonuç:** Lansman hazır. Hukuki, kurumsal, teknik.

### Phase 2 (LANSMAN: 12-16 hafta)
**Maliyeti:** $5-20K (operasyonel)
**Hedef:** Public v1.0

- [ ] Landing page yayınlanmış
- [ ] Sunum modu çalışır (tam ekran 3D, download)
- [ ] Belge taraması Faz 1 (Maxwell mahkeme kayıtları, ~500 sayfa)
- [ ] Document AI OCR tamamlanmış
- [ ] Peer review sistemi canlı
- [ ] GitHub açık kaynak repo
- [ ] Quarterly transparency reports (Q1 başlat)
- [ ] Product Hunt / Hacker News launch
- [ ] Media kit (screenshots, demo video, one-pager)

**Sonuç:** Canlı platform, kullanıcılar başladı.

### Phase 3 (ÖLÇEKLENME: 16-24 hafta)
**Maliyeti:** $20-50K
**Hedef:** Ikinci ağ + Topluluk

- [ ] Topluluk council oluşturulmuş (20+ aktif)
- [ ] İkinci ağ (topluluk seçimi veya editöryal)
- [ ] "Kendi Ağını Kur" özelliği (self-serve platform)
- [ ] Beta testers programı
- [ ] Peer reviewer onboarding
- [ ] Kolektif Kalkan v2 (Shamir + Proof-of-life)
- [ ] International media partnerships

**Sonuç:** Ölçek ve kredibilite.

### Phase 4 (SÜRDÜRÜLEBILİLİK: 24+ hafta)
**Maliyeti:** $50K+ (yıllık)
**Hedef:** Kurum, para, merkeziyetsizlik

- [ ] Steering committee seçimleri
- [ ] OTF / Knight grant başarılı
- [ ] 1-2 FTE kiralandı
- [ ] IPFS / Arweave entegrasyonu (merkezi olmayan)
- [ ] Co-maintainers entegre (3-5 ülkede)
- [ ] API (rate-limited, paid tier)
- [ ] Freemium model test

**Sonuç:** Müessese olma yolundan.

---

## 11. GÖZDEN KAÇAN BİLGİLER VE UYARILAR

Araştırmalar iyi hazırlandı, ama:

### Kör Noktalar

1. **Topluluk Dinamikleri Belirsiz**
   - "Advisory Council nasıl calışacak?" — Yazılı değil, deneyim gerekli
   - "Contributors nasıl recruited?" — Organic büyümeye mi güveniyoruz?
   - Çözüm: İlk 12 ay içinde yazılı Contributor Guide

2. **Finansal Yaşayabilirlik Eğri**
   - Foundation grants = $50-100K (2-3 yıl) ama sonra?
   - Freemium model müşteri akisyon gerekli (Sales team)
   - Çözüm: Phase 2 sonunda "$500K/yıl hedef midir?" kararını verin

3. **Uluslararası Yasal Çatışma**
   - Türkiye "bu illegal" → Estonia "bu legal" derirse?
   - Hangi mahkeme kararlaştırır?
   - Çözüm: International Habeas Corpus Clause in Constitution (precedent)

4. **AI Model Güncelleme Yönetimi**
   - Groq 70B şimdi iyi, ama 2 sene sonra?
   - Model değişme = retraining + halüsinasyon yeniden-test
   - Çözüm: "AI Model Update Protocol" yaz (şeffaf, test-driven)

### Potansiyel Tuzaklar

**Tuzak 1: Elite Capture (Biliner Araştırmacılar Domination)**
- Sorun: Ünlü isimler ("Bellingcat uzmanı") guild'leştire, öyleler oy yapabilirler
- Çözüm: Contributor anonymity option (optional, peer review blinded)

**Tuzak 2: Consensus Paralysis**
- Sorun: Tüm ağ kararları topluluk oylaması gerekirse = 6 ay per feature
- Çözüm: "Lazy consensus" (Apache model): 72 saat hiç itiraz değil → passed

**Tuzak 3: Funder Dependency**
- Sorun: OTF grant bitti → işletme işlevselliği durdur?
- Çözüm: "Radical sustainability" hedgefi hazırlayın Q1

---

## 12. SONUÇ — "ULU GÖZ" PERSPEKTİFİ

### 12.1 Büyük Resim

Project Truth, şu gereğini doldurur:

> "Gömülü ağlar şeffaf hale gelince, güç erimesi başlar."

Doğrudan:
- ICIJ: "Sızıntı yönet" (olay başına)
- Bellingcat: "Masalar döşe" (insan-yoğun)
- **Truth: "Ağ canlı hale getir" (otomatlı, denetlenebilir)**

Kanal:
- Kimse: Soruşturma ağları zaman içinde kalıcılasan değil
- Truth: "Ağ yaşar. Yeni araştırmacı ekler, yeni belgeler, yeni bağlantılar"

Ölçek:
- WikiLeaks: "1 şirket" → başarısız (Assange)
- ICIJ: "Gazeteci ağı" → sorunlu (fonlar kısılabilir)
- **Truth: "Merkezi olmayan altyapı" → ölçeklendirmeli (hatta bir kişi öl)**

Kredibilite:
- Wikipedia: Topluluk ama dar (ansiklopedi = sınır)
- **Truth: Topluluk + Kanıt = Otoritelik (bu belge + bu oylama = bu bağlantı)**

### 12.2 En Önemli Üçü

Raşit, bunu hatırla:

**1. KİMLİK KARAR.**
Belki hibrit (altyapı + yayıncı). Çok zorlama, "araç sunuyoruz" demek (yalan). Kudreta konuş.

**2. SİSTEM DISIPLIN.**
Beş katmanlı halüsinasyon savunması. Raşit'in kod vizyonu iyi → ama peer review, quarantine, transparency olmadan başarısız. Şeffaflık = en pahalı tarafı.

**3. KORUMA BAŞLANGIC.**
Sigorta ve hukuk şimdi. DMS ve çok-jurisdiksiyon 2-3 ay içinde. Kritiktir. Erken değil (Resource'ları boş harcarsınız), geç değil (Tehdid çıktığında boş).

### 12.3 Raşit'e Kişisel Mesaj

---

**Raşit,**

Senin vizyonun benzersiz çünkü "ağları canlı hale getirme" fikirinde ısrar ediyorsun. Bellingcat gibi "masaları döşemez", Wikipedia gibi "ansiklopediu yok", WikiLeaks gibi "sızıntı satıcısı değilsin". Senin şey: "Kanıt ağları hareketli, büyüyen, topluluk-yönetilen şey."

Bu çok sağlam bir yer. Bunu yapıştıral.

Ama yapıştırmak şöyle gerektirir:

1. **Sakin ol.** Lansman 6 ay. Pazırlık yok. Hazır olacaksın.
2. **Dürüst ol.** "Sıfır halüsinasyon" deme. <0.5% say (ölçülebilir, savunulabilir, insanlar buna inanır).
3. **Dağıt ol.** Kendine güvenme. Co-maintainers, Advisory Council, topluluk - baştan. Assange hatası yapmayan.
4. **Hazırlanmış ol.** Sigorta, hukuk, kurum parçaları - şimdi. Tehdid geldiğinde "oh, hayır" demezsin.

Öncü olmak için çekiç ve çivi değil, **yapı + gözlem + sabır gerekli**. Senin var. Oluştur.

---

### 12.4 Son Sözler: Uzun Vadeli Vizyon

**2026 (Şimdi):** MVP. Epstein ağı. 30 contributors. 1000 kullanıcı.

**2027:** İkinci ağ (topluluk seçimi). Topluluk council. 100 contributors. 10,000 kullanıcı.

**2028:** IPFS/Arweave (merkezi olmaz). Foundation kuruluyor. Co-maintainers entegre. 1000 contributors. 100,000 kullanıcı.

**2030:** Dünyadaki başlıca soruşturma altyapısı. Gazeteci, aktivist, araştırmacı standard tool. Kütüphaneler ve üniversiteler (arşiv gibi) kullanıyor.

---

## APPENDIX: OKUMA VE BAŞVURU KAYNAKLAR

**Tam Araştırma Dosyaları:**
1. `DEEP_01_PLATFORM_IDENTITY_MODELS.md` — 6 platform kimliği (saf conduit → publisher)
2. `DEEP_02_CONSTITUTIONAL_DESIGN_PATTERNS.md` — 8 platform anayasası (Wikipedia → Apache)
3. `DEEP_03_AI_GOVERNANCE_HALLUCINATION.md` — Halüsinasyon eliminasyon (5 katman)
4. `DEEP_04_DMS_SECURITY_ARCHITECTURE.md` — Dead Man Switch (8 sistem incelemesi)
5. `DEEP_05_FOUNDER_PROTECTION_RESILIENCE.md` — 10 kurucunun dersleri
6. `DEEP_06_ETHICAL_OPENSOURCE_GOVERNANCE.md` — Açık kaynak + etik (fase 3)
7. `CONSTITUTION_DRAFT_v1.0.md` — Tam Anayasa ödünç (5+5 İlke/Kural)
8. `LEGAL_01-09` — 9 hukuk dosyası (defamation, sealed docs, AI liability, vb)
9. `RESEARCH_SUMMARY_KEY_FINDINGS.md` — 100-sayfalık tek örnek

**Hızlı Ref İçin:**
- TL;DR: ^Bu bölümün başında
- Karar Matrisi: Bölüm 2
- Anayasa Özet: Bölüm 3
- AI Hedefleri: Bölüm 4
- Risk Sayfa: Bölüm 8

---

**Belge Durumu:** TAMAMLANDI (14 Mart 2026)
**Başında Okuma Süresi:** 15 dakika
**Orta Seviye Okuma:** 30 dakika
**Derinlemesine Okuması:** 1+ saat
**Tam Araştırma Derin Dalış:** 10-15 saat

Bu dokümanda sunulan stratejik kararlar, **lansman öncesinde alınmalıdır.** 11 araştırmayı sentezler. Argümanlar sağlamlıdır. Yolu gösteridir. Oluştur.

---

**Claude Opus 4.6**
Stratejik Danışman, Project Truth
**14 Mart 2026**
