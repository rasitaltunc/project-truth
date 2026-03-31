# FAZ 0 STRATEJİK DEĞERLENDİRME — "Bir Adım Geriye"

> Tarih: 31 Mart 2026
> Soru: "Milyar dolarlık bir şirkete hizmet sağlayan bir stratejist bu işi böyle mi yapardı?"

---

## DURUM TESPİTİ: Neredeyiz?

### Sayılarla Platform
- **355 TypeScript dosyası** (src/ altında)
- **85 API route** (src/app/api/)
- **17+ sprint** tamamlandı (Ocak → Mart 2026)
- **520+ unit test** (Vitest)
- **18 E2E test** (Playwright)
- **1 aktif ağ** (Epstein, 15 node + 19 link)
- **0 production deploy** ← ⚠️ BU

### Ne İnşa Ettik
```
[x] 3D Görselleştirme Motoru (Three.js + R3F)
[x] AI Sohbet (Groq llama-3.3-70b)
[x] Belge Tarama (3-pass consensus, karantina)
[x] Epistemolojik Katman (kanıt güven seviyeleri)
[x] Soruşturma Sistemi (açma, adım, replay)
[x] Badge/Reputation Sistemi
[x] Gazeteci Kalkanı (DMS + Kolektif)
[x] Tünel Deneyimi (3D koridor)
[x] i18n (EN + TR)
[x] Landing Page (scrollytelling)
[x] Test Altyapısı (unit + E2E + mock + Sentry)
```

### Ne İnşa ETMEDİK
```
[ ] Production build → Hiç denenmedi
[ ] Gerçek kullanıcı → 0 kişi gördü
[ ] Mobil deneyim → Muhtemelen kırık
[ ] Performance ölçümü → Bilinmiyor
[ ] CI/CD pipeline → Yok
[ ] Vercel deploy → Hiç yapılmadı
```

---

## STRATEJİK SORU: Doğru mu yapıyoruz?

### Endişe 1: "Feature Zenginliği Tuzağı"
85 API route, 355 dosya — ama hiç production'da test edilmedi.
Bir stratejist şunu sorardı: "Bu karmaşıklığın ne kadarı launch'ta gerekli?"

**Mega Yol Haritası Karar 5** zaten bunu söylüyor:
> "Launch'ta SADECE 3 özellik: (1) 3D ağı gör, (2) node'a tıkla, (3) AI'a sor"

Ama 85 route'un çoğu bu 3 özelliğin dışında. Board, DMS, kolektif kalkan,
belge arşivi, game engine, reputation — hepsi progressive disclosure'ın arkasında.

**Soru:** Bu route'lar production build'i patlatabilir mi?
**Cevap:** Evet. Kullanılmayan import, eksik env var, type hatası — herhangi biri.

### Endişe 2: "Production Build Bilinmezliği"
`npm run build` hiç çalıştırılmadı. Bu, bir uçak tasarlamak ama hiç uçurmamak gibi.
Build başarısız olursa, hataların sayısı bilinmiyor. 5 olabilir, 50 olabilir.

**Risk:** Build hataları genelde zincirleme. Bir dosyayı düzeltirsen başka biri kırılır.
Buna "build whack-a-mole" denir. Ne kadar erken başlarsan o kadar az acı.

### Endişe 3: "Temel Eksiklikleri"
- Vercel'e hiç deploy etmedik → deploy config doğru mu bilmiyoruz
- Environment variables Vercel'de ayarlanmadı
- CSP headers production'da farklı davranabilir
- Supabase connection pooling → concurrent user'da kırılabilir mi?

---

## DOĞRU SIRALAMA: Bir Stratejist Ne Yapardı?

### Prensip: "Uçağı önce uçur, sonra boyama yap"

Şu an 17 sprint boyunca muhteşem bir uçak inşa ettik.
Motor var, kanatlar var, kokpit var, yolcu kabini bile var.
Ama pistte duruyor. Hiç havalanmadı.

**Doğru sıralama:**
1. ✅ **Temel test** (Hafta 1 — TAMAMLANDI) — unit test, E2E, Sentry
2. 🎯 **Uçuşa hazırlık** (Hafta 2) — production build, deploy, performans
3. 🎯 **Kabin sadeleştirme** (Hafta 3) — progressive disclosure, feature gating
4. 🎯 **İlk uçuş** (Hafta 4) — Vercel'de canlı, private URL

### Hafta 2 Planı: "Production Reality Check"

**Adım 1 — Build Testi (EN KRİTİK)**
```
npm run build
```
Bu tek komut bize 50 saatlik bilgi verecek.
Kaç hata? Hangi dosyalar? Unused imports? Type sorunları?

**Adım 2 — Build Temizliği**
Çıkan hataları düzelt. Kullanılmayan route'ları disable et (comment out veya env flag).
Launch'ta gerekli olmayan route'ları `FEATURE_FLAGS` arkasına al.

**Adım 3 — Vercel Deploy (Hobby Plan, Ücretsiz)**
İlk deploy. Çalışıyor mu? Supabase bağlanıyor mu? 3D render ediliyor mu?
Bu deploy private — sadece sen göreceksin.

**Adım 4 — Performans Baseline**
Lighthouse skorları. First Contentful Paint. 3D yükleme süresi.
Bunları bilmeden optimizasyon yapılamaz.

---

## BU HAMLE NEDEN DOĞRU?

1. **Risk azaltma:** Build patlarsa ŞIMDI öğreniriz, launch gününde değil
2. **Gerçeklik kontrolü:** 85 route'luk bir proje production'da nasıl davranır?
3. **Motivasyon:** Canlı URL = somut ilerleme = enerji
4. **Feedback döngüsü:** Canlı görmeden UX kararı vermek spekülasyon
5. **Mega Yol Haritası uyumu:** Faz 0 = "sigorta, DB FK fix, güvenlik"
   → Production build = en büyük sigorta

---

## YAPILMAYACAK OLAN

- ❌ Yeni feature ekleme (Faz 1'e ait)
- ❌ Landing page redesign (Faz 1'e ait)
- ❌ Yeni sprint açma
- ❌ "Şunu da ekleyelim" (kapsam kayması alarm zili)

---

*"Uçağı önce uçur. Boyama, koltuk kılıfı, ikram menüsü sonra gelir."*
*— Faz 0 Stratejik İlke*
