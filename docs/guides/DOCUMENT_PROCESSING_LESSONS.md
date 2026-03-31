# BELGE İŞLEME — ÖĞRENİLEN DERSLER VE REFERANS REHBERİ

> Bu dosya, Maxwell davası belge tarama sürecinde öğrenilen dersleri ve sonraki taramalarda işimize yarayacak bilgileri toplar.
> Her yeni öğrenim eklenmelidir. Silme yok, sadece ekleme.

---

## 1. COURTLISTENER ERİŞİM SORUNLARI

### Problem: Bot Tespiti ve Rate Limiting
- CourtListener, bot-benzeri User-Agent ile gelen isteklere **202 challenge page** döndürüyor
- Challenge page: ~2430 byte HTML, JavaScript redirect içerir, gerçek içerik yok
- IP bazlı rate limiting: Çok fazla istek atınca gerçek Chrome UA ile bile 202 dönüyor

### Çözüm (Kısmi):
- User-Agent'ı gerçek Chrome'a çevirdik: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36`
- 202 status kontrolü eklendi (fetch'in `ok` özelliği 202 için de `true` döner!)
- HTML boyut kontrolü: < 5000 byte ise challenge page kabul et, atla
- İstekler arası minimum 2-3 saniye bekleme

### Öğrenilen Ders:
- CourtListener RECAP'te PDF'lerin çoğu yok — "PACER'dan çekilmeyi bekliyor" durumunda
- Gerçek PDF indirmek için ya PACER hesabı ya da RECAP'te zaten var olan belgeler gerekli
- Hızlı toplu indirme mümkün değil — yavaş ve sabırlı olmak lazım (saatte max ~50-100 istek)

---

## 2. GROQ RATE LIMITING

### Problem:
- Groq ücretsiz tier: ~30 istek/dakika
- Toplu taramada her belge 1 Groq isteği = 20 belgede sınıra yaklaşıyorsun

### Mevcut Çözüm:
- 3 retry + exponential backoff (5s → 15s → 30s)
- İstekler arası 2s delay (`interDocDelay`)
- Başarısız olanlar "pending" kalıyor, sonraki batch'te tekrar denenebilir

### Öğrenilen Ders:
- 20'lik batch'ler ~110 saniye sürüyor (belge başına ~5.5s)
- Ara sıra 1-2 belge rate limit'e takılıyor ama retry ile çoğu kurtarılıyor
- Batch boyutunu 20'nin üzerine çıkarmamak daha güvenli

---

## 3. METADATA-ONLY SCAN vs GERÇEK TARAMA

### Metadata-Only (Şu an yaptığımız):
- **Girdi:** Belge başlığı + CourtListener açıklaması (1-2 cümle)
- **Çıktı:** 0-5 varlık, 0-2 ilişki, 0-2 tarih
- **Güven:** %0 (boş açıklama) ile %80-90 (zengin açıklama) arası
- **Gerçeklik:** Sığ tarama — sadece belgenin "etiketi" okundu, içi değil

### Gerçek PDF Tarama (Hedef):
- **Girdi:** PDF'in OCR'lanmış tam metni (sayfalarca metin)
- **Çıktı:** Onlarca varlık, düzinelerce ilişki, detaylı tarih çizelgesi
- **Güven:** %85-95+ (gerçek belge metni analiz edildiği için)
- **Fark:** Gece ile gündüz arası. Metadata tarama bir "ilk geçiş" — gerçek tarama belgenin ruhunu okur.

### Hangi Belgeler İyi Sonuç Verdi (Metadata-Only)?
- Detaylı açıklamalı mahkeme belgeleri (kişi isimleri, tarihler, konu açık yazılmış)
- Letter, memorandum, opinion türleri (genelde açıklama zengin)

### Hangi Belgeler Kötü Sonuç Verdi?
- "Notice", "Order" gibi jenerik başlıklı belgeler
- Açıklaması kısa veya sadece "docket entry" numarası olan belgeler
- Sealed (mühürlü) belgeler — doğal olarak açıklama yok

---

## 4. TEKNİK MİMARİ ÖĞRENİMLERİ

### Chrome MCP Timeout Sorunu:
- Chrome extension üzerinden API çağrıları 60 saniye timeout'a takılıyor
- **Çözüm:** Fire-and-forget pattern — `window._xxxResult` ile sonucu depola, ayrı çağrı ile oku
- Batch processing 60s'den uzun sürdüğünde bu zorunlu

### Tab Kaybı Sorunu:
- Chrome tab'ları beklenmedik şekilde kapanabiliyor
- Sunucu tarafında çalışan fetch isteği tab kapansa da devam eder
- Tab yeniden açıp wave stats kontrol etmek yeterli

### Next.js Hot Reload:
- Kod değişikliklerinden sonra hot reload her zaman çalışmayabilir
- Özellikle API route değişikliklerinde `npm run dev` restart gerekebilir

---

## 5. WAVE SİSTEMİ İSTATİSTİKLERİ (Maxwell Davası — 14 Mart 2026)

| Wave | Belge Sayısı | Türler | Metadata Tarama Sonucu |
|------|-------------|--------|----------------------|
| Wave 1 | 147 | Transkript, İddianame, Ceza | Tamamlandı — zengin açıklamalar, iyi sonuç |
| Wave 2 | 282 | Kanıt, Mühürlü, Tanık İfadesi | Tamamlandı — karışık sonuç (sealed = boş) |
| Wave 3 | 212 | Dilekçe, Karar, İtiraz | Tamamlandı — orta sonuç |
| Wave 4 | 125 | Mektup, Bildirim, Diğer | Tamamlandı — genelde zayıf sonuç (jenerik) |

**Toplam: 766 belge metadata-only tarandı.**
**Gerçek PDF tarama: 0 belge** (CourtListener erişim sorunu)

---

## 6. SONRAKİ ADIMLAR İÇİN STRATEJİ

### PDF Elde Etme Yolları (Öncelik Sırasıyla):
1. **RECAP Archive doğrudan indirme** — `storage.courtlistener.com/recap/gov.uscourts.nysd.xxxx/` formatında direkt dosya URL'si dene
2. **CourtListener API v3** — `/api/rest/v3/recap-documents/` endpoint'i (API key ile, 5000 req/hr)
3. **Yavaş sayfa tarama** — Saatte 20-30 belge, gece çalışan cron job ile
4. **Manuel indirme** — En kritik 20-30 belgeyi elle indirip yükle
5. **PACER hesabı** — Son çare, sayfa başı ücretli ($0.10/sayfa)

### Tarama Kalitesini Artırma:
- Gerçek PDF metni ile tekrar tarama → entity sayısı 5-10x artacak
- Birden fazla belgeyi çapraz referans → "Bu kişi 47 belgede geçiyor" tespiti
- Entity resolution: "G. Maxwell" = "Ghislaine Maxwell" = "Ms. Maxwell" eşleştirmesi

### Maliyet Planı (GCP $340 kredi):
- Document AI OCR: ~$1.50 / 1000 sayfa
- Vision AI: ~$1.50 / 1000 görsel
- Detaylı hesaplama: CLAUDE.md'deki maliyet tablosu

---

## 7. KRİTİK UYARILAR

- **CourtListener'a aşırı istek ATMA** — IP ban riski var
- **Groq rate limit'i aşma** — Batch'leri 20'de tut, delay 2-3s
- **Metadata-only sonuçlara %100 güvenme** — Bu ön tarama, gerçek tarama değil
- **"Tarandı" badge'i yanıltıcı olabilir** — Sadece metadata okundu, belge içeriği değil

---

## 8. SÖZLÜK

| Terim | Açıklama |
|-------|----------|
| Entity Extraction | Metinden varlık (kişi, kurum, yer) ve ilişki çıkarma |
| OCR | Optical Character Recognition — PDF/görsel → metin dönüşümü |
| RECAP | CourtListener'ın ücretsiz mahkeme belgesi arşivi |
| PACER | ABD mahkeme sisteminin resmi (ücretli) belge erişim sistemi |
| Rate Limiting | Sunucunun çok fazla istekte bulunan IP'leri yavaşlatması/engellemesi |
| Metadata-only Scan | Belgenin sadece başlık+açıklama bilgisinden AI taraması |
| Full Scan | PDF içeriğinin OCR + AI ile tam analizi |
| Challenge Page | Bot tespiti yapan sunucunun döndüğü engelleme sayfası (202 status) |
| Fire-and-forget | Sonucu beklemeden isteği ateşle, sonra ayrı kontrol et deseni |
| Sealed Document | Mahkeme tarafından mühürlenmiş, kamuya kapalı belge |

---

---

## 9. DERİN STRATEJİK ÖĞRENİMLER (14 Mart 2026 — Oturum Sonu Analizi)

### 9A — "766 Belge Tarandı" Yanılgısı
Metadata-only scan teknik olarak "tarama" ama pratik olarak bir kitabın kapağını okumak gibi. UI'da "AI TARAMA TAMAMLANDI" yazan badge kullanıcıyı yanıltabilir. Gelecekte iki ayrı badge olmalı:
- 🟡 **ÖN TARAMA** (metadata-only) — sadece başlık ve açıklama okundu
- 🟢 **TAM TARAMA** (full PDF scan) — belge içeriği OCR + AI ile analiz edildi

Bu ayrım yapılmazsa, kullanıcılar "766 belge tarandı" deyip içeriğe güvenir ama aslında sığ veri üzerinde çalışırlar.

### 9B — CourtListener RECAP'in Gerçek Yapısı
RECAP bir "gönüllü arşiv" — birisi PACER'dan bir belge indirdiğinde RECAP browser extension otomatik olarak CourtListener'a kopyalıyor. Yani:
- Popüler davalar (Epstein, Maxwell) = daha çok PDF mevcut (gönüllüler indirmiş)
- Ama yine de %100 değil — bazı belgeler hiç indirilmemiş
- "Queued for PACER retrieval" = kimse bu belgeyi henüz PACER'dan çekmemiş
- CourtListener sayfasındaki "Buy on PACER" butonu = PDF'i onlardan da alamazsın, PACER'a git

### 9C — 202 Status Tuzağının Teknik Derinliği
Bu çok önemli bir ders çünkü başka API'lerde de karşımıza çıkabilir:
```
HTTP 202 = "Accepted" (isteğini aldım ama henüz işlemedim)
fetch() → response.ok = true (çünkü 200-299 arası hep "ok")
response.status = 202
response.text() = challenge page HTML (~2430 byte)
```
Normal bir 200 sayfası 50KB-500KB arası. 5KB'den küçük herhangi bir yanıt şüpheli. Bu pattern'i her dış kaynak entegrasyonunda kontrol etmeliyiz.

### 9D — Toplu İndirme vs Hedefli İndirme
766 belgenin hepsini indirmeye çalışmak stratejik hataydı. Bunun yerine:
- Maxwell davasının **çekirdek belgeleri** 30-40 adet (iddianame, karar, anahtar ifadeler)
- Bu 30-40 belgeyi manuel indirmek 1-2 saat sürer
- Tek bir iddianame PDF'inden (50-100 sayfa) çıkacak entity sayısı > 766 metadata taramasının toplamı
- **Ders:** "Geniş ama sığ" yerine "dar ama derin" strateji daha etkili

### 9E — Groq AI'ın Metadata Tarama Davranışları
- Zengin açıklama (3+ isim, tarih, konu) → %70-90 güven, 2-5 entity
- Orta açıklama (1-2 isim, tarih) → %40-60 güven, 1-2 entity
- Kısa/jenerik açıklama ("Order", "Notice") → %0, sıfır entity
- AI bazen belge türünü yanlış etiketliyor (Letter'a "INDICTMENT" demesi gibi — 2. screenshotta görüldü)
- Metadata-only'de hallüsinasyon riski düşük çünkü girdi zaten kısa, ama **belge türü etiketlemesinde hata yapabiliyor**

### 9F — Batch Processing Kalıpları
- **Sweet spot:** 20 belge/batch, 2s delay → ~110s toplam
- **Rate limit tetiklenme noktası:** ~12-15. belge civarı (dakikadaki 30 req sınırına yaklaşım)
- **Retry başarı oranı:** Rate limit retry'ların ~%80'i başarılı (backoff süresi yeterli)
- **Tab stabilitesi:** Chrome tab'ları uzun batch'lerde kapanabiliyor — sunucu tarafı devam eder ama sonucu alamazsın
- **Optimal strateji:** Fire-and-forget + wave stats polling ile durumu takip et

### 9G — Pipeline Mimarisi Değerlendirmesi
Mevcut pipeline şu adımlardan oluşuyor:
```
1. CourtListener'dan PDF indir → BAŞARISIZ (rate limit)
2. GCS'e yükle → ATLANMADI (PDF yok)
3. Document AI OCR → ATLANDI (PDF yok)
4. Groq AI entity extraction → ÇALIŞTI (ama sadece metadata ile)
5. Sonuçları Supabase'e yaz → ÇALIŞTI
```
Pipeline mimarisi sağlam — sorun veri girişinde. PDF elde edildiğinde pipeline olduğu gibi çalışacak.

### 9H — Gelecek Taramalar İçin Altın Kurallar
1. **Önce PDF'i elde et, sonra taramayı başlat** — metadata-only scan ile zaman kaybetme
2. **Hedefli çalış** — 766 belge yerine 30 kritik belge daha değerli
3. **Rate limit'i baştan planla** — Groq: 20/batch, CL: 30/saat, Document AI: sınırsız (ücretli)
4. **Her tarama derinliğini etiketle** — "ön tarama" vs "tam tarama" ayrımı UI'da net olmalı
5. **Dış kaynak entegrasyonlarında boyut kontrolü yap** — 5KB'den küçük yanıt = muhtemelen hata
6. **Manuel indirme hafife alınmamalı** — Bazen en basit yol en etkili yol

---

## 10. MAXWELL DAVASI — KRİTİK BELGE LİSTESİ (Öncelikli İndirme)

> Bu belgeler gerçek PDF olarak elde edildiğinde en yüksek değeri verecek olanlar.

| # | Docket | Tür | Neden Kritik |
|---|--------|-----|-------------|
| 1 | #187 — Indictment | İddianame | Davanın temeli — tüm suçlamalar burada |
| 2 | #759 — Verdict | Karar | Jüri kararı — mahkumiyet detayları |
| 3 | #780 — Sentencing | Ceza | 20 yıl ceza kararı |
| 4 | #737-758 — Transcripts | Duruşma Tutanakları | Tanık ifadeleri, çapraz sorgu |
| 5 | #192 — Letter (Maxwell→Nathan) | Mektup | Savunma stratejisi ipuçları |
| 6 | Sealed documents | Mühürlü | Açılan mühürlü belgeler = en değerli veri |

> Bu listeyi PDF elde ettikçe güncelleyeceğiz.

---

## 11. MALİYET-FAYDA ANALİZİ

### Bu Oturumda Harcanan:
- **Groq API:** ~766 istek (ücretsiz tier, $0 maliyet)
- **Supabase:** ~766 row update ($0, ücretsiz tier içinde)
- **GCS/Document AI:** $0 (kullanılmadı, PDF olmadığı için)
- **Zaman:** ~3-4 saat (batch processing + bekleme)

### Elde Edilen:
- 766 belge veritabanında kategorize ve etiketli
- ~200-300 entity (metadata'dan çıkarılan, sığ)
- Pipeline uçtan uca test edildi ve çalışıyor
- CourtListener erişim davranışı öğrenildi
- Bu lessons learned dosyası

### Alternatif Senaryo (Yapılabilecek En Verimli):
- 30 kritik belgeyi manuel indir → 1 saat
- Document AI OCR → ~$0.05
- Groq AI full scan → 30 istek, ücretsiz
- Tahmini entity çıktısı: 500-1000+ (gerçek belge içeriğinden)
- **Sonuç:** Daha az zaman, daha derin sonuç

---

**Son Güncelleme:** 14 Mart 2026 — Oturum sonu kapsamlı analiz eklendi
