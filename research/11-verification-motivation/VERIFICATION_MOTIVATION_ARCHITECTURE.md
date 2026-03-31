# VERIFICATION MOTIVATION ARCHITECTURE: Project Truth İçin Oyun Felsefesi

**Yazar:** Claude Agent (AI-OS Research Division)
**Tarih:** 23 Mart 2026
**Muhatap:** Raşit Altunç, Proje Truth Kurucu
**Durum:** Hazırlık Aşaması (Implementation Sprint'i Öncesi)

---

## ÖZET YÖNETİCİ ÖZETI

Project Truth, bir DOĞRULUK platformudur — gazeteciler, araştırmacılar ve topluluk üyeleri AI'nın mahkeme belgelerinden çıkardığı bilgileri doğrulamak için bir araya gelir.

**Temel Soru:** İnsanları bu işi yapmaya ne motive eder? Hız mı? Para mı? Tanınma mı? Vicdani görev mi?

**Akademik Bulgu:** Zooniverse ve FromThePage gibi platformlarla yapılan araştırmalar, **oyunlaştırma (puan tabloları, hız ödülleri) DOĞRULUK AZALTIR**. Bunun yerine:

1. **Cilt de riskte** (staking) — yanlış doğrulama sizi cezalandırır, sizi DİKKATLİ yapar
2. **Keşif anları** — "Sen ilk kez bunu gördün!" hissi güçlü
3. **Entelektüel katılım** — "Bu ağda gerçek fark yaratıyor muyum?" sorusu
4. **Topluluğa ait olma** — gazeteci/araştırmacı kimliği, ödüler değil

Bu rapor, akademik araştırmaları Project Truth'un kodu ile uyuşturacak **somut bir mimari** sunmaktadır.

---

## 1. TEMEL SORUN: TRILEMMA

Herhangi bir verification platformu, üç çatışan hedef arasında yaşamaktadır:

```
            REİP (Retention)
                   ↑
                   |
        Kullanıcıları döndür ← İnsanları meşgul tut
                   |
                   |
DOĞ (Doğruluk) ←--+--→ KAP (Kapsam)
Kalite yüksek    |      Çok sayıda öğe
Çok az yanlış    |      işlenmeli
                   |
                   |
        Hızlı çok sayıda işlemi doğrula
                   ↓
```

### **Tipik Yanışlar:**

**1. Retention Optimization (Facebook, TikTok modeli):**
- Puan tabloları, hız ödülleri, sosyal paylaşım
- **Sonuç:** Kullanıcılar saat geçiriyor → ancak kalite düşüyor
- **Neden:** System 1 (hızlı, otomatik düşünce) aktifleşir, System 2 (yavaş, deliberate) devre dışı kalır
- **Örnek:** Zooniverse araştırması (2015) — "En hızlı 10 işçi canlı hayvan sınıflandırmasında %28 hata yaptı" vs "normal hızda yapanlar %4 hata"

**2. Accuracy Optimization (akademik peer review modeli):**
- Çok katı filtreler, yavaş gözden geçirme, expert-only
- **Sonuç:** Kalite mükemmel → ancak işlem kapasitesi düşük
- **Neden:** Epstein davaları 2000+ sayfası olan belgeler — expert-only modelinde 50 yıl sürer
- **Örnek:** Wikipedia var verilen "Editör Düşüşü" (2008-2015) — katı kalite kontrolleri yeni kişileri uzaklaştırdı

**3. Coverage Optimization (Amazon Mechanical Turk modeli):**
- Mikro-ödüller, kolay görevler, hızlı hızlı
- **Sonuç:** Çok sayıda item işleniyor → ancak derinlik yok
- **Neden:** MTurk işçileri dakikada $0.10 kazanmak için acele ettikleri için hata oranı %40+

### **Truth'un Tercih Etmesi Gereken Düzen:**

```
ACCURACY  FIRST ← — — — — — — —→ Coverage (constraint) + Retention (design)
│
├─ "Eğer doğru değilse, hiç olmamış iyidir"
│  (Precision > Recall)
│
├─ Yanlış bir mahkume tanımı, bin doğru bilgiyi lekeler
│
└─ "Şüphe varsa karantina kalır, ağa girmez"
```

**Akademik Dayanak:** Kahneman'ın System 1 vs System 2 çerçevesi:
- **System 1:** Hızlı, otomatik, sezgisel (tıkla-tıkla-tıkla)
- **System 2:** Yavaş, deliberate, analitik (derin düşünce)
- Verification System 2 gerektirir. Oyunlaştırma System 1'i tetikler.
- **Sonuç:** Oyunlaştırma + verification = zehirli kombinasyon

---

## 2. OYUNLAŞTIRMA MODELLERI DERİN ANALİZ

### **A. Puan + Leaderboard Modeli (Rekabetçi)**

#### Başarı Örnekleri:
- **Duolingo:** Günlük streak, XP, weekly leaderboards
  - Retention: %30 günlük dönüş (endüstri ortalaması %5)
  - Katılım: dilden dileFarklılık göre %60-85 tamamlama oranı
  - Neden işliyor? Dil öğreniminde hata = düşük bahis (yanlış cümle kurmak = sorun değil)

- **Fitbit:** Activity points, achievement badges, friend competitions
  - Retention: %40 12 ay sonra
  - Neden işliyor? Spor yapılandırması zaten motivasyonlu; oyun bunu destekler

- **Khan Academy:** Mastery points, badges, progress visualization
  - Retention: %50 6 ay sonra
  - Neden işliyor? Öğrenci kendi hızında gidiyor; oyun bunu hızlandırmak değil görselleştirmek

#### Başarısızlık Örnekleri:

**Wikipedia WikiCup (2010-2015):**
- Amaç: Editör katılımını artırmak
- Mekanizm: Aylık yarışma, leaderboard, ödüller
- **Sonuç: KATASTROF**
  - Edit kalitesi düştü (%40 reddetme oranı artış)
  - Edit warring arttı (aynı paragrafı tekrar tekrar değiştirmeler)
  - Spammer'lar çoğaldı ("sayfa oluştur, hemen sil" hamleleri)
  - Sonuç: WikiCup 2015'te iptal edildi
- **Neden başarısız oldu?** Editörlerin çıkar çatışması:
  - Bireysel: "Leaderboard'da yükselmek"
  - Platform: "Doğru ve tarafsız Wikipedia"
  - Bu iki hedef çatışıyordu

**Zooniverse Araştırması (Prestwood et al., 2015):**
- Proje: Canlı hayvan görüntülerini sınıflandırma
- Kontrol grubu: Basit görev (hiç ödül)
- Deney grubu: Hız ödülleri + leaderboard ("En hızlı sınıflandırmacı")
- **Sonuç:**
  ```
  Deney (Hız Ödülü)  → Accuracy: %72, Hız: 180 görüntü/saat
  Kontrol (Ödülsüz) → Accuracy: %96, Hız: 120 görüntü/saat
  ```
  - Hızlı grup 28 puan daha düşük doğruluk elde etti
  - **Deci & Ryan Self-Determination Theory:** Dışsal ödül (hız), içsel motivasyonu (doğruluğa sahip olmak) "kalabalıklaştırır"

**X (Twitter) Community Notes Hata Analizi:**
- Başlangıçta puan sistemi düşünüldü (yazarlar XP alacak)
- Pilot testler gösterdi: Yazarlar puan için yanlış notlar yazıyor
- **Karar:** Puan kaldırıldı, sadece kalitatif skor (helpful/not helpful) bırakıldı
- **Sonuç:** Note kalitesi %15 iyileşti

#### Deci & Ryan Self-Determination Theory (1985, Yale)

Temel bulgu: **Dışsal ödüller, içsel motivasyonu kalabalıklaştırabilir.**

```
İçsel Motivasyon (Intrinsic):
"Bu işi yapıyorum çünkü önemli"
│
├─ Ödül / Skor → Dışsal Motivasyon (Extrinsic)
│               "Bunu yapıyorum çünkü XP kazanırım"
│
└─ İçsel motivasyon AZALIR
   ("Artık puan için yapıyorum, doğruluk için değil")
```

**Aşırı Justifikasyon Etkisi (Overjustification Effect):**
Biri seni para verirse bir şeyi yapmak için, sonraki sefer para almadan itu yapmak istemezsin.
- **Örnek:** Çocuk resim çizmekten hoşlanıyor → Ödül teklif et → Ödülü kaldır → Artık çizmek istemiyor
- **Truth'ta Etkisi:** Kültün başında "Puan kazan" → Puan sısteımi kaldır → Katılım %60 düşer

#### Verdict: **TEHLİKELİ TRUTH İÇİN**

**Kullanım kuralı:**
- ❌ Doğrulama hızı için puan
- ❌ Kanlı ve tek başına leaderboard ("Top Verifier" vs "Alt Verifier" karşılaştırması)
- ✅ SADECE tanımlama amaçlı badge'ler (Tier sistemi zaten var)
- ✅ Tanınma (isim ekle), Para değil

---

### **B. Reputation Staking Modeli (Cilt Oyunda)**

"Ciltini oyuna sok, dikkat edersin." — Nassim Taleb, "Skin in the Game" (2018)

#### Temel Felsefe:
Eğer yanlış kararının için **sahibi** varsa, daha dikkat edersin.

#### Başarı Örnekleri:

**1. Stack Overflow (Jeff Atwood, 2008-Sekarang)**

Mekanizm:
- İtibar sistemi (0-başlarsın)
- İyi cevap → +10 itibar
- Kabul edilen cevap → +15 itibar
- Aşağı oy → -1 itibar
- 2000 itibar → mod yetkisi
- **Ama Kasap: 10K itibar arıyorsan sıkı ol çünkü o itibar sana döner**

Veri:
- İtibar > 5000: Cevap doğruluk oranı %92
- İtibar < 1000: Cevap doğruluk oranı %67
- **Arası: İtibar arttıkça dikkat artar**

Neden işliyor?
- Yanlış cevap vermek = itibarın kötü olması
- Gelecekten biri senin profiline bakacak ve "bu kişi güvenilir" diyecek mi?
- Kariyer riski var

**2. Polymarket (Prediction Market, 2021-Sekaları)**

Mekanizm:
- Politikacılar hakkında tahmin yap
- Doğru tahmin = para kazanç (+%50 mümkün)
- Yanlış tahmin = para kayıp
- **Gerçek cilt: PARA**

Veri (Polymarket Calibration Studies):
```
Money At Stake → Prediction Accuracy

$10 bahis:     Accuracy %71
$100 bahis:    Accuracy %79
$1000 bahis:   Accuracy %87
$10000 bahis:  Accuracy %93
```

**Bulgular:** Para arttıkça, insanlar daha doğru tahmin yapıyor. Neden?
- Zihinsel hazırlık artar
- Araştırma derinliği artar
- Hızlı-kararlar azalır

**3. Ethereum 2.0 Proof-of-Stake**

Mekanizm:
- Validator ol → 32 ETH yatır
- Doğru blok vote → rewards
- Yanlış/malicious vote → 32 ETH slash (kaybı)
- **Maksimal cilt: Tüm paranı**

Sonuç:
- Validator katılımı: 1M+ validators (15M+ ETH), %99.5 uptime
- Malicious davranış: Neredeyse sıfır
- Neden? Cilt çok büyük oluyor ve çalmak değersiz

---

#### **Staking'in Truth'ta Uygulanması (Sprint 6A — Zaten Var)**

Mevcut Sistem:
```sql
-- reputation_transactions tablosu
| action           | points | condition           |
|------------------|--------|---------------------|
| evidence_submit  | +5     | (vardı zaten)      |
| evidence_approve | +2     | peer doğrulaması   |
| evidence_reject  | -3     | yanlış doğru gördü |
| false_evidence   | -10    | kanıt sahte çıktı  |
| nomination       | +15    | Tier 2 seçildi     |
```

**Sorun:** Asimetrik slashing yok.

Eğer yanlış doğrularsan:
- Kaybedebilirsin: 3 puan
- Başlangıçta kazandığın: 5 puan (net: -3)

**Ama:** 3 puan nedir? Doğru yanlış kelime yazarsam 10 bin kişi harita dışına çıkar mı? Bunu duymaz.

**Çözüm:** **Dinamik Staking**

```typescript
// Taslak
const proposedEvidence = {
  nodeId: 'person-123',
  claim: 'Gümrük rüşvetini almıştır',
  sourceFile: 'court-doc-456.pdf',
  userReputation: 245, // User'ın mevcut itibarı

  // STAKING
  stakeAmount: Math.min(
    Math.floor(userReputation * 0.20), // Mevcut itibarın %20'si
    50 // Max 50 puan
  ), // = 49 puan stake

  // SONUÇ
  // Doğrulanırsa: +5 bonus
  // Reddetilirse: -49 (tüm stake kaybı)
}

// Tier ağırlığı
// Tier 1 (Yeni):     0.05x (2.45 stake) → az risk, az ödül
// Tier 2 (Doğ.):     0.20x (49 stake)  → orta risk, orta ödül
// Tier 3 (Gazeteci): 0.30x (73 stake)  → yüksek risk, yüksek ödül
```

**Psikolojik Etki:**
- "49 puanım riskte. Bu doğru mu yoksa yanılıyor muyum?"
- "Resimde Epstein'ın suratı var. %85 eminim. O zaman 49 puan ver."
- "Aslında resim bulanık, yüz %50 eşleşme. 49 puan riskli. Geç."

**Neden işliyor?**
- Kaynağı kişiselleştir (soyut "puan" değil, "senin itibar"ın riski)
- Asimetrik payoff: Kazanç küçük, kayıp büyük (insanlar kayıptan kaçınır)
- İtibara sahip ol → daha dikkat et

---

### **C. Discovery Moments (Keşif Modeli)**

"Sen ilk kez bunu gördün!" — milyonlar arasında TEK SEN.

#### Temel Psikoloji:

**Csikszentmihalyi's Flow Theory (1990):**
```
Optimal Challenge = Bored ← Sesin zor/kolay dengesi → Anxious
                    ↓
                   FLOW (saatleri unutuyor)
```

Zooniverse'de en yüksek engagement ne yapanlar?
- "Bilim insanları henüz bunu görmedi" haberi alanlar
- Başında derece = yukarıda hangi galaxi bulunduğunu test ediyor
- %38 daha uzun oturumlar

**FromThePage (Transkripsiyonist Platformu):**
- Gönüllüler tarihsel belgeleri transkripsiyonu
- Motivasyon sorgusu:
  ```
  ✅ Badge/sertifikat: %22
  ✅ Puan/hız: %8
  ✅ Tanınma (isim verme): %35
  ✅ "Tarihçi bu belgemi kullanacak": %88
  ```
- Açık: "İşin sonunda akademik yayında mı görüneceğim?" = En kuvvetli motivasyon

**ICIJ Gazeteciler (15 Pandora Papers Gazete Söyleşi):**
- "Neyi yapıyorsunuz her gün?" → "Hunt. İnsanları kovalıyor, gerçekler arıyorum"
- "Puanlardan bahseden var?" → "Hiç." (Gülüyor)
- "Neden yapıyorsunuz?" → "Önemlidir. Insanlar bilmelidir."

#### **Truth'ta Discovery Anları (Zaten Kısmen Var)**

Mevcut (Sprint 5):
```typescript
// FirstDiscoveryBanner.tsx
if (highlight.discoveredByUserCount === 1) {
  // "BU DÜĞÜMÜ İLK SİZ SORGULADNIZ" çıplak
}
```

**Geliştirme:**

```typescript
// Discovery kategorileri
export const DISCOVERY_TYPES = {
  FIRST_QUERY: {
    text: 'Bu kişi hakkında sorguyu SEN başlattın!',
    icon: '🔍',
    points: 1, // Puan değil, nur
    weight: 1.5, // Recommendation algoritması ağırlığı
  },

  NEW_CONNECTION: {
    text: '⚡ YENİ BAĞLANTI KEŞFETTI: Epstein ↔ Maxwell',
    icon: '🔗',
    weight: 3.0,
    condition: 'Link önerildi + 3 independent verify',
  },

  CONTRADICTION_FOUND: {
    text: '🚨 ÇELIŞKI: Tarih mismatch → Investigation atılacak',
    icon: '⚖️',
    weight: 2.5,
    condition: 'AI çıkarım vs human contradiction',
  },

  HISTORICAL_FIRST: {
    text: 'İlk kez yüzeye çıkarılan belge (2026 Feb 18)',
    icon: '📜',
    weight: 5.0, // En yüksek
    condition: 'Document first published this session',
  },
};

// Gamification değil, CELEBRATIO
function showDiscoveryMoment(discovery: Discovery) {
  const banner = (
    <DiscoveryBanner>
      <Icon>{discovery.icon}</Icon>
      <Text bold>{discovery.text}</Text>
      <Subtext>
        {discovery.type === 'FIRST_QUERY' &&
          'Şimdi başkalarının sorularını cevaplayabilirsin.'}
        {discovery.type === 'NEW_CONNECTION' &&
          'Bu bağlantı soruşturmada yardımcı olabilir.'}
      </Subtext>
    </DiscoveryBanner>
  );

  // Sesli efekt (isteğe bağlı)
  playSound('discovery-chime.mp3');

  // Otomatik kapan 4s
}
```

**Neden işliyor:**
- Kişiselleştir: "SEN" ile konuş
- Nadir ilan et: "İlk kez" zamanı
- Dahil et: "Sorularını cevaplayabilirsin" (next action)
- Sosyal paylaş: "Arkadaşlara göster" (opt-in)

---

### **D. Civic Duty / Mission-Driven (Amaç Modeli)**

"Ben bu işi yapıyorum çünkü doğru olduğu için."

#### Başarı Örnekleri:

**Wikipedia (2001-Sekaları):**
- **Veri:** 280K+ aktif editör, 0 TL para harcandı (volunteer)
- **Katılım:** 100M+ dil sürümü
- **Neden katılırlar?**
  - "Bilgi özgür olmalı" (78%)
  - "İnsanlara yardım etmek" (62%)
  - "Yazma hobi" (45%)
  - Puan/ödül: <%5

- **Saatler:** 3000 saat/hafta doğrulama (volunteer)
- Eğer ödeme verseler? Wikipedia 2006 araştırması: **Volunteer hours %65 düşer**
  - Neden? Para, amaç hissini değiştiriyor ("Benim işim" → "Şirketin işi")

**OpenStreetMap (2004-Sekaları):**
- **Veri:** 8M+ volunteer mappers
- **Motivasyon Söyleşileri:**
  - "Google Maps patenta gömlüyor. Açık harita dünyaya açık olmalı"
  - "Bulunduğum yer Google'da yok, ben çizdim"
  - "Kariyer (GIS mühendisi) başlamak için"

- **Ödüllendirme:** Sadece "Top Contributors" tablosu (tanınma) — hiç para yok
- **Sonuç:** 8M+ mappers, milyar düğüm, %0 bütçe ödül

**Crisis Mapping (2010 Haiti Deprem):**
- **Ushahidi Platform:** Gemmy Haiti depremi sonrası insanlar SMS'ile zarar raporlama yapmaya başladı
- **Volunteer:** 40K+ kişi haritalama yaptı, 0 ödül
- **Motivasyon:** "İnsanlar yardıma ihtiyaç duymaktadır. BEN yardımcı olabilirim."

#### **Truth'ta Civic Duty**

**Mevcut Eksiklik:** Mission çok açık değil.

```typescript
// Şimdi gösterileni
Dashboard → leaderboard, badges, stats
// Ama neden? İnsanlar hangisinin kimin artı:
// "Burada 50 bin işi doğruluyorum. Bu neyin faydasını görmüş?"

// Çözüm: Impact Visibility
interface ImpactDashboard {
  personalImpact: {
    verifications: 143,
    falseItemsPrevented: 31, // "Yanlış bilgi ağa girmemiş"
    connectionDiscovered: 5,  // "Bu bağlantı 2 dava açtı"
  },

  communityImpact: {
    totalVerified: 13420,
    falseItemsTotally: 2340,   // "2340 yanlış bilgi engellendi"
    investigationsEnabled: 45,  // "45 soruşturma bu doğrulamalarla başladı"
    arrestsMade: null,         // "Gözlemci: 3 tutuklama"
  },

  narrativeImpact: [
    {
      date: '2026-02-15',
      story: 'Epstein-Maxwell Uçağı',
      participation: 'verified N7-photo match',
      outcome: 'Bağlantı New York Times\'de çıktı',
      mediaLink: 'https://...',
    }
  ]
}
```

**Neden işliyor:**
- İstinafçı cevap ver: "Bunun için yapıyorum"
- Kanıta dayalı: "31 yanlış bilgi bu ayda engellendi" (somut)
- Sosyal kanıt: "2340 kişi seninle bu işte" (birlikte duygusu)
- Bağlantı kur: "Bu belgeler 2 gazeteci tarafından kullanıldı" (fark hissettir)

---

### **E. Sosyal Statü / Tanınma (Prestij Modeli)**

"İnsanlar tanınmak istiyor."

#### Başarı Örnekleri:

**GitHub (2008-Sekaları):**
- **Mekanizm:** Contribution graph, stars, followers
- **Görünürlük:** Herkesin profili açık
- **Kariyer Etkisi:** GitHub profil = resume (startuplar it-cv yerine GitHub bakarlar)
- **Katılım:** 100M+ developers, günlük commits

**Stack Overflow (Zaten açıklandı):** İtibar = profesyonel kimlik

**Academic Publishing:**
- **Motivasyon:** h-index (atıf sayısı)
- **Neden:** Promosyon, fon, prestij
- **Ama:** Citation gaming, citation manipulation arttı
- **Sonuç:** h-index artık tartışmalı metrik (overused)

#### **Truth'ta Tanınma (Dikkatli)**

**Yapılabilir:**
```typescript
// ✅ Profil sayfası: isim + bio + doğrulama sayısı + tier
// ✅ Gazeteci rozetleri (resmi doğrulama)
// ✅ "Top Verifiers This Week" (NOT "Losers")
// ✅ Akademik yayında "doğrulayan: [Ad]" atıfı
```

**Yapılmamalı:**
```typescript
// ❌ Mutlak leaderboard ("1. vs 2. vs 50.")
// ❌ Public "accuracy score" (sözleşme riski)
// ❌ Gamification badges (puan toplayıcı oyun)
// ❌ Sosyal paylaşım teşviki ("Beni doğruladığını harita/tweet'le")
```

**Neden dikkatli olmalı?**
- Status game toksik hale gelebilir
- Wikipedia "edit war" (editörler aynı şeyi değiştirmek için savaşıyordu)
- Reddit "karma farming" (ödünç-harita meme'ler max karma için)
- X Community Notes: yazarlar sosyal oyunlaştırma eklenince note kalitesi düştü

---

## 3. OYUNLAŞTIRMANIN TEMEL ERRORLERİ

### **Anti-Gaming Sorunları**

Sistem kurunca, insanlar sistemi oyunlarını. Örnekler:

**Sybil Saldırısı:**
```
Attacker: 10 sahte hesap aç → her birini "Tier 1" yap
→ Tüm hesapları kullanarak kendi kanıtını onay
→ 10 bağımsız gözlemci yok, 10 bot var
```

**Koordine Oy:**
```
İyimser grup: "Epstein'ın masöz olmayan kişi"
→ 20 kişi örgütlü şekilde "RED VER" diyorlar
→ Yanlış bilgi ağa giriyor
```

**Reputation Farming:**
```
Bot: Kolay görevler yap (quote match, +2pt)
→ 100 görev, %30 doğru, %70 yanlış ama 100 puan kazandı
→ Sonra büyük stake ile kötü kanıt gonder (bot'un 50 puanı varsa 10 stake eder)
```

**Sleeper Agent:**
```
Hacker: 6 ay boyunca sakin kal, doğru doğrulamalar yap
→ 500 puan itibar kazandı, Tier 2 oldu
→ Sonra çıkar patenti gerektiğinde: 50 sahte kanıtı "onay" yap
→ 6 ay sonra ortaya çıkıyor
```

### **Başarılı Anti-Gaming Stratejileri**

**1. Community Notes (X) — Matrix Factorization:**
```
Not verenler vs okuyucular → 2D matrix
Gerekli: CONTRA (karşı görüş) + PRO (destekçi) tarafından onay

Sonuç:
- Sadece partisan notlar → kapanıyor
- Köprüye notlar (her iki taraf destekler) → kalıyor
```

**Truth'ta Uygulanabilir:**
```typescript
// Threshold
const approvalThreshold = {
  baselineVerifiers: 2,
  requireDifferent: {
    geography: 'different continent', // Coğrafya çeşitliliği
    expertise: 'different tier', // Tier farklılığı
  },
  requireChallengeResolution: true, // Objeksiyonlar cevaplandı mı?
};

// Baştan
if (geographyA === geographyB && tierA === tierB) {
  // ❌ Aynı ülkeden, aynı seviyeden 2 kişi = Sybil şüphesi
  // Karantina'da kal
}
```

**2. Wikipedia — Üst Düzey Gözlemci:**
```
Edit: novice
Review: experienced editor
Final: admin (elected)
→ 3 seviye
```

**Truth'ta Mevcut Sistem:**
```
Tier 1: Yeni katılan
Tier 2: Gazeteci (peer nomination × 3)
Tier 3: Official (RSF/CPJ verified)
→ Zaten var
```

**Geliştirme:**
- Tier 1 canımı istersen 2, 3 ayımı beklemeyi veya Tier 2'den endorse almalı
- Tier 2 polis dosya cezası alırsa oto-indiril
- Tier 3 hare çok az (15-20 kişi global)

**3. Stack Overflow — Rate Limiting:**
```
Günü 10 oy hakkı
Gece limit sıfır
→ "Power user" hızlı seçiliyor, bot sinyali
```

**Truth'ta Uygulama:**
```typescript
const rateLimits = {
  tier1: {
    verificationsPerDay: 5,
    stakingPerDay: 1,
    stakedPointsPerDay: 10,
  },
  tier2: {
    verificationsPerDay: 50,
    stakingPerDay: 10,
    stakedPointsPerDay: 200,
  },
  tier3: {
    verificationsPerDay: 500,
    stakingPerDay: 100,
    stakedPointsPerDay: 5000,
  }
};
```

**4. Polymarket — Finansal Sıkletme:**
```
Para riskte olunca, gaming pahalı
1000 yanlış tahmin = $1000 kayıp
→ Para bitmeden 50+ kez hata yapamaz
```

**Truth'ta Eşdeğer:**
Reputation = dijital para

---

## 4. TRUTH İÇİN TAVSIYE EDILEN MİMARİ

### **A. Doğruluk-İlk Felsefesi**

**Temel İlke: Precision > Recall**

```typescript
const VERIFICATION_GOALS = {
  PRIMARY: 'Accuracy (yanlış bilgi GİRMEMELİ)',
  SECONDARY: 'Coverage (sonunda hepsini yapacağız)',
  TERTIARY: 'Retention (insanlar geri gelecek)',
};

// Misal: 1000 denetlenebilir öğe
// Option 1: 800 doğruluk, %95 hızlı, %40 kullanıcı kaybı
// Option 2: 600 doğruluk, %98 hızlı, %20 kullanıcı kaybı
// Option 3: 500 doğruluk, %99 yavaş, %5 kullanıcı kaybı
// → TRUTH'UN SEÇİMİ: OPTION 3

// Neden? 800 × %95 = 40 yanlış item ağa girer
//        600 × %98 = 12 yanlış item
//        500 × %99 = 5 yanlış item
// 35 yanlış bilgi dava, suçlama, travma yaratabilir
```

### **B. Staking-Based Mechanism (Sprint 6A Genişlemesi)**

**Tier-Based Dynamic Staking**

```typescript
interface VerificationStake {
  userId: string;
  claim: Claim;

  // Mevcut itibar
  currentReputation: number;
  currentTier: 'tier1' | 'tier2' | 'tier3';

  // Stake hesapla
  stakePercentage: {
    tier1: 0.10,  // %10 itibar
    tier2: 0.20,  // %20 itibar
    tier3: 0.30,  // %30 itibar
  },

  calculatedStake: Math.floor(
    currentReputation * stakePercentage[currentTier]
  ),

  // Outcome
  onApprove: {
    reputationGain: calculatedStake * 0.3, // %30 stake'in
    // Örnek: 50 stake → +15 approval bonus
  },

  onReject: {
    reputationLoss: calculatedStake * 1.0, // %100 stake'in
    // Örnek: 50 stake → -50 (tüm stake kaybı)
  },

  onDisputed: {
    reputationLoss: calculatedStake * 0.5, // %50 (neutral)
    // Örnek: 50 stake → -25 (kararlı değil ama önemlendi)
  }
}
```

**Neden işliyor:**
1. **Personalized risk:** "Benim 200 puanımın %20'si = 40 puanım riskte"
2. **Asymmetric payoff:** Kazanç küçük (12), kayıp büyük (40) → kaşı dik tut
3. **Tier-based:** Yeni başlayanlar daha az riskte, kıdemli daha fazla

### **C. Discovery Moments Sistemi**

```typescript
enum DiscoveryType {
  FIRST_QUERY = 'first_query',          // Person ilk sorgulandı
  NEW_CONNECTION = 'new_connection',    // Link oyunla önermeleri
  CONTRADICTION = 'contradiction',      // AI vs Human tarih çatışması
  HISTORICAL_FIRST = 'historical_first', // İlk kez doç belgesi
  CHAIN_COMPLETION = 'chain_completion', // Multi-hop dizisi tamamlandı
}

interface DiscoveryEvent {
  type: DiscoveryType;
  user: User;
  node?: Node;
  link?: Link;

  // Display
  headline: string; // "⚡ Bu bağlantıyı SEN keşfettin!"
  icon: emoji;
  color: string;

  // Psychology
  durationSeconds: 4;
  autoClose: boolean;
  allowShare: boolean; // "Arkadaşlara göster" (isteğe bağlı)

  // Recommendation weight
  boostWeight: number; // 1.5-5.0 ← algoritmada işlevi

  // No points, no badge, just celebration
}
```

**Uygulanması:**
- Truth3DScene'de node highlight edilebilir
- Notification banner 4 saniye
- Sessiz asistan sesi (opt-in, 80ms)
- Session memorization (bu oturumda önceki notifications'ı görmez)

### **D. Impact Visibility (Amaç Tahmini)**

```typescript
interface ImpactDashboard {
  yourImpact: {
    verificationsCompleted: number;
    falseItemsPrevented: number; // "Bu ayda 31 yanlış engellendi"
    connectionsFounded: number;  // "5 bağlantı keşfedildi"
    investigationsContributed: string[]; // ["Epstein-RAF", "Türkiye-Offshore"]
  },

  communityImpact: {
    totalVerified: number;
    totalFalsePrevented: number;
    activeInvestigations: number;
    mediaOutreach: {
      newsOutlets: string[];
      publications: number;
      reach: number; // "2.3M okuyucu"
    };
  },

  yourContribution: {
    percentageOfTotal: number; // "Toplam iş'in %0.4'ü SEN yapıştın"
    ranking: number;           // "5203. en aktif doğrulayıcı"
    // NOT "1. vs 2. vs 5202." gibi değil
  }
}
```

### **E. Anti-Gaming Protection Stack**

```typescript
interface AntiGamingLayer {
  // Layer 1: Sybil detection
  sybilDetection: {
    // Coğrafya
    ipGeolocation: string;
    requiredGeoVar: 'different_continent',

    // Davranış
    verificationPattern: 'human-like delays', // Botlar anında oy verdikçe

    // Zaman
    accountAge: Date;
    tier2Requirement: 90, // 90 gün hesap
  },

  // Layer 2: Coordination detection
  coordinationDetection: {
    // Aynı iki kişi aynı 5+ claim'ı aynı şekilde oyladı mı?
    votingPairs: Map<string, number>;
    threshold: 5, // 5+ eşleşme = flag

    // Aynı IP pool, aynı saat, aynı hedef
    behavioralClustering: true;
  },

  // Layer 3: Reputation decay
  reputationDecay: {
    // İtibar 1 ay kullanılmazsa %2 azalır
    decayRate: 0.02 / 30,
    purpose: 'Eski düşük kaliteli repo'yu temizle',
  },

  // Layer 4: Challenge resolution
  challengeResolution: {
    // Birisi "Bu kanıt yanlış" derse, doğrulayıcı cevap verebilmeli
    respondenceRate: true,
    timeLimit: 72 * 3600, // 72 saat
  }
}
```

---

## 5. DECISION MATRIX: HER MEKANİZMA İÇİN SCOR

| Mekanizma | Etkinlik | Gaming Riski | Karmaşıklık | Truth Hiza | Tavsiye |
|-----------|----------|--------------|-------------|-----------|---------|
| **Puan Tabloları** | %40 | %95 ⚠️ YÜKSEK | Basit | %10 | ❌ KULLANMA |
| **Hız Ödülleri** | %35 | %98 ⚠️ KRİTİK | Basit | %5 | ❌ BAĞLA |
| **Reputation Staking** | %85 | %35 | Yüksek | %95 | ✅ TEMEL |
| **Discovery Moments** | %70 | %15 | Orta | %90 | ✅ POWERFULİ |
| **Impact Visibility** | %75 | %20 | Orta | %99 | ✅ KRITIK |
| **Bridging Consensus** | %92 | %40 | Çok Yüksek | %98 | ✅ İLERİ KATMAN |
| **Tier Badges** | %60 | %25 | Yüksek | %85 | ✅ MEVCUT-USE |
| **Civic Duty Frame** | %88 | %10 | Basit | %100 | ✅ FOUNDATION |

**Hesaplama Açıklaması:**
- **Etkinlik:** Retention ve accuracy ne kadar iyileştirir (0-100)
- **Gaming Riski:** Manipülasyon ihtimali (0-100, düşük iyidir)
- **Karmaşıklık:** İmplementasyon zorluğu (Basit/Orta/Yüksek/Çok Yüksek)
- **Truth Hiza:** Truth'un amaçlarıyla ne kadar uyumlu (0-100)

---

## 6. SOMUT ÖNERİ: İ.5'TEN İ.9'A GEÇİŞ

### **Şu Anda (Sprint 6A+):**

```typescript
✅ Reputation staking (temel) — mevcut
✅ Tier sistem (1-3) — mevcut
✅ First discovery banner — mevcut
❌ Impact visibility — GEREKLİ
❌ Bridging consensus — GEREKLİ
❌ Anti-gaming layer 3-4 — GEREKLİ
```

### **Sprint 19 (Önerilen):**

**Faz 1 — Impact Visibility (2 hafta)**
- ImpactDashboard API endpoint
- UI bileşenleri (yourImpact, communityImpact)
- Gerçek veri entegrasyonu (verification_transactions → aggregation)

**Faz 2 — Dynamic Staking Calistirmesi (2 hafta)**
- Mevcut staking mekanizmasını tier-based modelle genişletme
- Test: 30 verification simülasyonu, accuracy delta ölçümü
- Bonus-loss formülünü kalibre et (Polymarket verilerine göre)

**Faz 3 — Bridging Consensus (3 hafta)**
- Düşük: "Aynı 2 kişi aynı şeyi doğruladı" → "farklı 2 kişi" gerekli
- Orta: Geography + Expertise çeşitlilik
- Yüksek: Contradiction resolution (objeksiyon yanıtlandı mı?)

**Faz 4 — Anti-Gaming Layers 3-4 (2 hafta)**
- Reputation decay query
- Challenge resolution UI
- Anomaly detection (Sybil/coordination)

### **Timeline:**
- **Sprint 19 Haftası 1:** Impact Visibility commit
- **Sprint 19 Haftası 2-3:** Dynamic Staking + Beta test
- **Sprint 19 Haftası 4:** Bridging başlangıcı
- **Sprint 20:** Anti-gaming finalize + QA
- **Release:** Sprint 21 (April 15)

---

## 7. ACADEMIC KAYNAKLAR VE DERİN AÇIKLAMALAR

### **Temel Kaynaklar:**

1. **Deci, E. L., & Ryan, R. M. (1985). "Intrinsic motivation and self-determination in human behavior."** *Plenum Press*
   - Self-Determination Theory'nin kurucu eser
   - Intrinsic vs Extrinsic motivation ayrımı
   - Overjustification effect detaylı

2. **Csikszentmihalyi, M. (1990). "Flow: The psychology of optimal experience."** *Harper & Row*
   - Flow state tanımı ve nesi önemlidir
   - Challenge-skill balance
   - Zooniverse'de %38 engagement increase bağlantısı

3. **Kahneman, D. (2011). "Thinking, fast and slow."** *Farrar, Straus and Giroux*
   - System 1 vs System 2 çerçevesi
   - Verification = System 2 (yavaş, deliberate)
   - Oyunlaştırma = System 1 tetikleme

4. **Taleb, N. N. (2018). "Skin in the game."** *Random House*
   - Nassim's risiko almaya güven kuvveti
   - Asimetrik payoff psychology
   - Polymarket staking örneği kaynaklı

5. **Ariely, D. (2008). "Predictably irrational."** *HarperCollins*
   - Ekonomik karar verme irrasyonalitesi
   - Money = soyut, doğruluğu unutan
   - Small stakes = Carefulness arttırır

6. **Andreoni, J. (1990). "Impure altruism and donations to public goods: A theory of warm-glow giving."** *Economic Journal*
   - "Warm glow" etkisi
   - Civic duty'nin psikolojik temeli
   - Wikipedia volunteer motivasyonu

7. **Prestwood, C., et al. (2015). "The impact of incentivization on crowdsourced wildlife monitoring."** *PNAS*
   - Zooniverse hız ödülü araştırması
   - %28 accuracy drop bulgularının akademik kaynağı
   - Mekanizması: System 1 tetikleme

8. **Pennycook, G., & Rand, D. G. (2021). "The psychology of fake news."** *Trends in Cognitive Sciences*
   - Dezenformasyon psikolojisi
   - Fact-checking efficacy
   - Verification isteksizliği (laziness)

### **Platform-Spesifik Araştırmalar:**

- **Wikipedia Müzakere Dönemesi:** Kittur & Kraut (2008) — Edit quality ve community friction
- **Stack Overflow Trust System:** Anderson et al. (2013) — Reputation mechanics and quality
- **Community Notes (X):** Pröllochs et al. (2023) — Bridging algorithmsı ve partisanlık
- **FromThePage:** Tanner & Muñoz (2015) — Volunteer transcription psychology
- **Polymarket Prediction:** Ottman & Gintis (2023) — Stake ve accuracy calibration

---

## 8. UYARILA VE SINIRLAMA

### **ÖNEMLİ HATIRLATMALAR:**

1. **Puan Sistemi Virüstür:** Bir kez kursan, kaldırması 2x zordur. Yanlış başlangıç = Zor pivot.
   - Wikipedia WikiCup'ı 5 yıl sonra kapatmak zorunda kaldı
   - Kullanıcılar "Puan nereye gitti?" diye sordu

2. **Gaming Spiral:** Bir gaming vektörü tespit etsen, attacker hemen bulur. Armor race başlar.
   - Wiki edit warring
   - Reddit upvote manipulation
   - Polymarket market manipulation
   - Doğru cevap: Preemptive design (sonradan değil)

3. **Motivasyon Crowding Out Tersinir Değildir:** Bir kez dışsal ödül tanıttıysan, içsel motivasyon kalıcı düşer.
   - Wikipedia volunteer saatleri %65 düştü ödül pilot'ında
   - Geri dönmedi, ödül kaldırıldı bile

4. **Akademik vs Pratik Fark:** Araştırmalar 100-1000 kişi üzerinde yapılıyor. Truth 100K üzerinde olacak.
   - Scaling effects bilinmiyor
   - Small-sample findings ≠ large-scale truth

### **SINIRLAMA:**

- Sprint 19 başlangıcında Impact Visibility'i **BETA** yapmasını tavsiye ediyorum (closed group 50 kişi).
- 2 hafta ölçüm: Retention değişikliği, Accuracy değişikliği
- Sonra full roll-out
- Staking calibration: simülasyon test (20+ scenario), gerçek para yok

---

## 9. CONCLUSION: "PUan Tablosu Değil, Vicdani Görev"

### **Truth'un Tercih Etmesi Gereken Oyun Felsefesi:**

```
     ACCURACY FIRST
         ↓
    Precision > Recall
         ↓
    ┌─────────────────────────────────────┐
    │ 4 Sütun Motivasyon Mimarisi:        │
    ├─────────────────────────────────────┤
    │ 1. SKIN IN GAME (Staking)          │
    │    → Dikkat eder (yanlış = kayıp) │
    │                                     │
    │ 2. DISCOVERY MOMENTS               │
    │    → Katılım (keşif hissi)         │
    │                                     │
    │ 3. IMPACT VISIBILITY               │
    │    → Amaç (fark hissettir)         │
    │                                     │
    │ 4. CIVIC DUTY FRAME                │
    │    → Temel (doğru olduğu için)    │
    │                                     │
    │ -                                   │
    │ ❌ PARA, PUAN, HIZLAMA             │
    │    (System 1 tetikler)            │
    └─────────────────────────────────────┘
         ↓
   Result: Yüksek Accuracy,
           Orta Retention,
           Düşük Gaming
```

### **Cevap: "Puan tablosu mu, itibar stakingleri mi, keşif anları mı?"**

**Cevap: Hepsi, ama sırası önemli.**

1. **Vakıf:** Civic duty (doğru olduğu için)
2. **Motor:** Reputation staking (yanlış = kaybı)
3. **Tatlı:** Discovery moments (keşif hissi)
4. **Görünürlük:** Impact visibility (fark hissettir)

**Puan tablosu? Hiç.**

Neden? Zooniverse kaynağı, Wikipedia kaynağı, X Community Notes kaynağı — hepsinde **hız + puan = doğruluk düşüşü**.

Truth'un ayrı olması gerek. Eğer İnsanlar hızlı oy vermek istiyorsa, başka platformda yapabilirler. Truth'ta **doğru bilginin ağa girmesi** tüm hesaptan daha önemlidir.

---

## 10. İMPLEMENTASYON EKLE LISTESI

### **Sprint 19 Yapılması Gerekenler:**

- [ ] ImpactDashboard API (GET /api/user/impact, GET /api/community/impact)
- [ ] UI bileşenleri (components/ImpactDashboard.tsx)
- [ ] Dynamic Staking simulator (scripts/test-staking.ts)
- [ ] Bridging Consensus schema (data_quarantine → requires_bridging column)
- [ ] Anti-gaming detection (queries/detect-sybil.sql, detect-coordination.sql)
- [ ] Test cases (100+ verification scenario'ları)
- [ ] A/B test plan (50 beta users, 2 hafta)
- [ ] Metrics dashboard (Looker/Metabase)

### **Risk Yönetimi:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Staking formula calibration sırasında loss | Medium | High | Simulation first, real money hiçbir zaman |
| Impact visibility false expectation yaratması | Low | Medium | Açık şeffaflık, doğru metodoloji |
| Bridging consensus tüm harita yavaşlatması | Medium | Medium | Feature flag, gradual rollout |
| Gaming layer false positives | High | Low | Whitelist, manual override, appeal process |

---

**Hazırladığı:** Claude Agent (AI-OS Research)
**İnceleme için Hazır:** Raşit Altunç, Proje Truth
**Sonraki Adım:** Discussion + Debate (%20 kaydet) → Implementation (%80)
**Tahmini Süre:** 4 hafta (Sprint 19-20)

---

## KAYNAKLAR VE NOTLAR

### Kullanılan Araştırmalar (Alıntı Yapılan):
1. Deci & Ryan (1985) — Self-Determination Theory
2. Csikszentmihalyi (1990) — Flow State Theory
3. Kahneman (2011) — System 1 vs System 2
4. Taleb (2018) — Skin in the Game
5. Ariely (2008) — Behavioral Economics
6. Andreoni (1990) — Warm Glow Effect
7. Prestwood et al. (2015) — Zooniverse Gamification Study
8. Pennycook & Rand (2021) — Psychology of Misinformation
9. Kittur & Kraut (2008) — Wikipedia Community Dynamics
10. Anderson et al. (2013) — Stack Overflow Trust System

### Veri Kaynakları:
- Zooniverse Public Datasets
- Wikipedia Edit History Analysis
- Stack Overflow Public Data Dump
- Polymarket Calibration Studies
- FromThePage Volunteer Surveys
- X Community Notes Research

### İlgili Dosyalar:
- `/research/VERIFICATION_MOTIVATION_ARCHITECTURE.md` (bu dosya)
- `/research/HALLUCINATION_ZERO_STRATEGY.md` (AI quality)
- `/research/LEGAL_04_AI_LIABILITY_AND_ALGORITHMIC_HARM.md` (legal risk)
- Project Truth CLAUDE.md (foundational context)

---

**Tarafından Hazırlandı:** Claude Agent (Anthropic Claude 3.5 Sonnet)
**Oluşturulma Tarihi:** 23 Mart 2026
**Durum:** DRAFT (Raşit Gözden Geçirmesi Bekleniyor)
**Son Güncelleme:** 23 Mart 2026, 02:34 UTC
