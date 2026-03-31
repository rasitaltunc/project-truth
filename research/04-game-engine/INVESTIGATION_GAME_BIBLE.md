# INVESTIGATION GAME BIBLE
## Project Truth — Kolektif Soruşturma Platformu Tasarım Manifestosu

> **"Eğlenirsin ama sistemi kandıramazsın."** — Raşit Altunç, 24 Mart 2026
>
> Bu doküman 14 derin araştırmanın sentezinden doğdu (8 AI + 6 Raşit).
> Her tasarım kararı akademik araştırma, gerçek dünya örnekleri ve etik analizlerle desteklenmektedir.
> **v3 — 24 Mart 2026:** "Platformun Ruhu" araştırması entegre edildi (nörobilim, felsefe,
> fısıldayıcı psikolojisi, kolektif zeka, ahlaki temeller).
> **v4 — 24 Mart 2026:** "Doğa Değiştiren Kararlar" — Güven ağırlığı hesaplama sistemi,
> anti-gaming mimarisi ("saldırgan bile sisteme fayda sağlar"), meta-inceleme hiyerarşisi,
> canlı organizma platform sağlık monitörü, kullanıcı güvenliği (panik kodu / duress mode),
> hukuki konum çerçevesi. 6 yeni bölüm (7-12). Raşit ile kesinleşen mimari kararlar.
> **v5 — 24 Mart 2026:** "Gerçeklik Testi" — Tüm mekanizmalar eleştirel gözle tarandı,
> 10 sorun tespit edildi, çözümleri tasarlandı. 5 yeni bölüm (17-21):
> Katmanlı Mimari (kullanıcı sayısına göre 4 katman), Staking Mekanizması (dereceli mod,
> cold start çözümü, evrensel itiraz sistemi), Şifreli Investigation Path ("biz bile
> bulamamalıyız" — client-side encryption), Kalibrasyon Evreni (4 kategori, topluluk soru
> önerisi, akıllı görev yönlendirme), İleri Oy Mekanizmaları (Quadratic + Conviction Voting,
> dış teşviklere karşı 4 katmanlı savunma). Raşit ile kesinleşen kararlar.

---

## 0. PLATFORMUN RUHU: İNSAN NEDEN SESSİZ KALAMAZ?

> Bu bölüm tüm tasarım kararlarının FELSEFİ TEMELİDİR. XP, streak, leaderboard —
> bunlar araç. Asıl motor burada.

### 0.1 Nörobilim: Ahlaki Öfkenin Beyindeki İzi

Bir insan adaletsizliğe tanık olduğunda, beyninde empati, tiksinme ve eylem devreleri
aynı anda aktive olur. **Ayna nöronlar** diğerinin acısını bize hissettirir — kelimenin
gerçek anlamıyla. **Anterior insula**, çürük yiyeceğe duyduğumuz fiziksel tiksintiyi
ahlaki ihlallere de uygular. Beyin, yolsuzluğu kelimenin tam anlamıyla "kokuşmuş" olarak
işler. **Haksızlık algısı** dorsal anterior insula ve ACC'yi aktive eder; başkasının
haksızlığı üzerine düşünmek perspektif alma bölgelerini (TPJ, DLPFC) devreye sokar.

**Kritik Ayrım — Empatik Endişe vs Empatik Sıkıntı:**
- **Empatik endişe** (diğerine yönelik merhamet) → pozitif duygu + YARDIM davranışı
- **Empatik sıkıntı** (kendine odaklı kaygı) → negatif duygu + DONMA/GERİ ÇEKİLME

**Uygulama:** "Bu belgeyi oku ve üzül" değil → "Bu belgeyi oku ve DOĞRULA."
Pasif tanıklıktan aktif katkıya geçiş — empatik sıkıntıyı empatik endişeye
dönüştüren köprü budur.

### 0.2 Felsefe: Tanıklık Etmenin Ağırlığı

**Hannah Arendt — "Kötülüğün Sıradanlığı":**
Gerçek tehlike canavarlar değil, düşünmeyi bırakan sıradan insanlar. Eichmann
"radikal biçimde düşünme yetisinden yoksundu." Platform DÜŞÜNMEYE ZORLAMALI.

**Simone Weil — "Dikkat En Nadir Cömertliktir":**
Karmaşık bir mahkeme belgesini tam dikkatle okumak, başlı başına radikal bir
cömertlik eylemidir. Kayıtsızlığı kırar. Adaletsizliği kişisel olarak gerçek kılar.

**Emmanuel Levinas — "Ötekinin Yüzü":**
Bir başkasının acısını gerçekten GÖRDÜĞÜNüzde, sonsuz bir sorumluluk doğar.
"Ötekinin yüzü bana der ki: öldürmeyeceksin." Platform bu "görme" anını
yeniden yaratmalı — uzak acıyı yakın hissettiren tasarım.

**Václav Havel — "Hakikat İçinde Yaşamak":**
Yalanlar üzerine kurulu bir sistemde, basitçe doğruyu söylemek devrimci bir
eylemdir. Tek bir kişi doğruyu söylediğinde, herkesin uyumuna dayanan sistem çatlar.
Tek bir yanlışlığı düzeltmek bile bu sistemi sarsar.

### 0.3 Fısıldayıcıların Psikolojisi

Fısıldayıcılar kahraman değil — ikiyüzlülüğe TAHAMMÜL EDEMEYENler.

**Snowden:** "Rahat hayatımı feda etmeye razıyım çünkü vicdanım izin vermiyor."
**FBI fısıldayıcısı:** "Ahlaki ve hukuki puslam başka bir yola izin vermezdi."

Ortak özellikler: güçlü vicdan, içsel kontrol odağı, özgeci değerler, kör sadakat
yerine adalet inancı. Tetikleyici genellikle akut bir ihlal — son damla.

Bedel: %78 tehdit/misilleme, %67 kariyer hasarı, %83 profesyonel danışmanlık.
AMA HEPSİ "YİNE YAPARDIM" DİYOR. Eylem ahlaki yarayı iyileştirir.

### 0.4 Kolektif Efervesans → Kolektif Zeka

**Durkheim:** Bir grup yoğun bir deneyimi paylaştığında, bireylerden daha büyük
bir şey ortaya çıkar. Wikipedia'nın 280.000 editörü neden parasız çalışıyor?
Özgecilik, topluluk kimliği, itibar. Açık kaynak geliştiricilerde: %91 eğlence,
%85 başkalarına yardım. İnsanlar gerçekten işbirlikçi canlılar.

### 0.5 Tehlike Bölgesi: Hakikat Arayışı Ne Zaman Yanlış Gider?

**Robespierre:** Adalet tutkusu terör oldu. **McCarthy:** Soruşturma cadı avına
döndü. **Stanford Deneyi:** Gardiyan rolü verilen öğrenciler günler içinde
zulüm uyguladı. Uyarı: soruşturma ilke yerine süreç olduğunda, bütün grupları
şeytanlaştırdığında, öfke intikama dönüştüğünde → platform müdahale etmeli.

### 0.6 Kutsal Değerler ve Ahlaki Yaralanma

**Haidt'in Ahlaki Temelleri — Platformumuz neleri aktive ediyor:**
- Bakım/Zarar → mağdur hikayeleri (en güçlü itici güç)
- Adalet/Hile → yolsuzluk kanıtları
- Özgürlük/Baskı → sansür ve gazeteci tutuklaması

**Ahlaki yaralanma** (değerlerinize aykırı bir şeye tanık olmak) tedavisi:
terapi + EYLEM. Platform acıyı kolektif çalışmaya kanalize etmeli.

**Viktor Frankl:** "Yaşamak için bir 'neden'i olan, hemen her 'nasıl'a katlanabilir."

### 0.7 TASARIM SONUCU: Öfkeden Yapılandırılmış Empatiye

> **Formül:** Ahlaki öfke = YAKIT. Yapılandırılmış empati = MOTOR.
> Mob vs Hareket — fark YAPI'dır. Mob düşmanı cezalandırır, hareket inşa eder.

**İnsanlar neden puan için değil, GELEMEDEN EDEMEDİKLERİ için gelecek:**
1. Empatik sıkıntıyı empatik endişeye dönüştür (pasif → aktif)
2. Dikkat etmeyi ödüllendir (Weil)
3. Belgelerin arkasındaki gerçek insanları hissettir (Levinas)
4. Her doğrulamayı "hakikat içinde yaşama" eylemi olarak çerçevele (Havel)
5. "Biz birlikte inşa ediyoruz" hissi yarat (Durkheim)
6. Öfke intikama dönüşmeden müdahale et
7. Kutsal misyonu hatırlat: "Bu oyun değil, ahlaki mücadele"

> *Kaynaklar: Arendt, Weil, Levinas, Havel, Frankl, Haidt, Durkheim, Snowden/Haugen/Wigand
> vaka çalışmaları, Stanford Deneyi, nörogörüntüleme (anterior insula, ACC, ayna nöronlar)*

---

## İÇİNDEKİLER

1. [Vizyon: Ne İnşa Ediyoruz?](#1-vizyon)
2. [Temel İlkeler](#2-temel-ilkeler)
3. [RADİKAL ŞEFFAFLIK MİMARİSİ](#3-seffaflik)
4. [Kullanıcı Arketipleri ve Rol Bazlı Deneyimler](#4-roller)
5. [Oyun Modları: Solo / Duo / Multi](#5-modlar)
6. [Görev Tipleri ve İlerleme Sistemi](#6-gorevler)
7. [Güvenlik Mimarisi: Anti-Manipulation + Anti-Gaming](#7-guvenlik)
8. [Güven Ağırlığı Hesaplama Sistemi](#7-guven) ← **YENİ: 24 Mart 2026**
9. [Meta-İnceleme Hiyerarşisi](#8-meta) ← **YENİ: 24 Mart 2026**
10. [Canlı Organizma: Platform Sağlık Monitörü](#9-organizma) ← **YENİ: 24 Mart 2026**
11. [Kullanıcı Güvenliği ve Baskıya Dayanıklılık](#10-guvenlik-kullanici) ← **YENİ: 24 Mart 2026**
12. [Hukuki Konum ve Algı Çerçevesi](#11-hukuki) ← **YENİ: 24 Mart 2026**
13. [Davranış Profilleme ve Akıllı Atama](#12-profilleme)
14. [Atmosfer ve Sinematik Deneyim](#13-atmosfer)
15. [Etik Kırmızı Çizgiler](#14-etik)
16. [Teknik Mimari](#15-teknik)
17. [Uygulama Yol Haritası](#16-yolharitasi)
18. [Katmanlı Mimari: Soyma Yaklaşımı](#17-katmanli) ← **YENİ: v5**
19. [Staking Mekanizması: "Dereceli Mod"](#18-staking) ← **YENİ: v5**
20. [Şifreli Soruşturma Günlüğü](#19-investigation-path) ← **YENİ: v5**
21. [Kalibrasyon Evreni](#20-kalibrasyon) ← **YENİ: v5**
22. [İleri Oy Mekanizmaları](#21-oy) ← **YENİ: v5**

---

## 1. VİZYON: NE İNŞA EDİYORUZ? <a name="1-vizyon"></a>

### Tek Cümle
**"Dünyanın ilk kolektif soruşturma platformu — gerçek belgeler, gerçek kanıtlar, gerçek keşifler."**

### Ne DEĞİLİZ
- Bir oyun değiliz (ama oyun kadar bağımlılık yapıyoruz)
- Bir sosyal medya değiliz (ama topluluk gücü kullanıyoruz)
- Bir conspiracy teorisi platformu değiliz (ama soruşturma estetiği kullanıyoruz)
- QAnon'un tersi: onlar sahte delillerle sahte soruşturma hissi yarattı; biz gerçek delillerle gerçek soruşturma yapıyoruz

### Ne İZ
- Bloomberg Terminal + Duolingo + Dark Souls + Bellingcat + Escape Room
- Profesyonel araç hassasiyeti + oyun bağımlılığı + topluluk zekası
- Bir finansçı baktığında "finans dünyasındayım" hissetmeli
- Bir hukukçu baktığında "duruşma salonundayım" hissetmeli
- FBI analisti baktığında "bu tool benim işime yarıyor" demeli

### Referans Noktaları

| Platform | Ne Aldık | Kaynak |
|----------|----------|--------|
| Bloomberg Terminal | Kompleksliğin statüye dönüşmesi — zor arayüz = profesyonel gurur | Bloomberg UX Research |
| Duolingo | Streak mekaniği, skill tree, günlük ritüel | %55 retention (streak ile %12'den sıçrama) |
| Foldit | Bilimsel katkı motivasyonu — "Bilime yardım ediyorum" en güçlü itici güç | Nature 2010, 57K oyuncu |
| Galaxy Zoo | Calibration questions, progressive difficulty, consensus verification | 11K+ gönüllü, NASA-grade accuracy |
| Dark Souls | Asenkron topluluk — görmediğin insanlarla birlikte mücadele hissi | Kısıtlı iletişim = sıfır toksisite |
| Death Stranding | Strand system — yardım etmek başarıdır, yenmek değil | Strand Contracts, infrastructure building |
| Bellingcat | Açık kaynak soruşturma metodolojisi | 370+ gazeteci, gölge analizi %95 accuracy |
| ICIJ | 400+ gazetecinin koordinasyonu (Panama Papers) | Neo4j + Linkurious + Global i-Hub |
| i2 Analyst's Notebook | POLE+ELP link analizi (People, Objects, Locations, Events) | NATO/FBI/CIA standart aracı |
| Escape Room | Bilgi asimetrisi → zorunlu işbirliği | Championship-level asimetrik tasarım |
| Keep Talking & Nobody Explodes | Birinin bombayı görmesi, diğerinin kılavuzu okuması | Saf bilgi asimetrisi mekaniği |

---

## 2. TEMEL İLKELER <a name="2-temel-ilkeler"></a>

### 2.1 Truth Anayasası Uyumu
Bu oyun, Truth Anayasası'nın (13 Mart 2026) tüm ilkelerine uyar:
- "Her iddia doğrulanabilir kaynak göstermeli"
- "AI kaynak gösteremezse 'bilmiyorum' diyecek"
- "Yanlış veri eksik veriden daha tehlikelidir" (Precision > Recall)

### 2.2 Boston Marathon Dersi: Mimari Hatası, Moderasyon Hatası Değil
> **UYARI:** Bu bölüm platformun EN KRİTİK tasarım kararlarını içerir.

2013'te Reddit'in r/findbostonbombers'da 10.000 kullanıcı, 5 moderatör vardı.
Dakikada düzinelerce kalıcı ban atılıyordu. YİNE DE masum Sunil Tripathi yanlış
teşhis edildi → ailesi tacize uğradı → gazeteciler eve kamera ekipleriyle geldi →
Sunil daha sonra ölü bulundu.

**Kök Neden:** Moderasyon eksikliği DEĞİL, MİMARİ HATASI:
```
Ham veri (sıfır kaynak zinciri)
→ Filtrelenmemiş polis telsizi (doğrulanmış istihbarat gibi muamele)
→ Upvote algoritması (sansasyonel teoriler güçlendirildi)
→ Platformlar arası yayılma (konteynerden kaçış)
→ Gerçek dünya tacizi (gazeteciler eve geldi)
```

**Bizim Mimari Savunmamız:**
1. Veri toplama alanı ≠ Yayın alanı (farklı UI alanları, zorunlu karantina)
2. Soruşturma alanında upvote/like/trending YOK
3. Hipotez yayınlanmadan önce zorunlu peer review
4. Görüntülenme/beğeni sayıları soruşturma sırasında GİZLİ
5. "Bu kişiyi bul" mekaniği ASLA YOK — sadece "bu belgeyi doğrula"

### 2.3 Anti-QAnon Tasarım Prensipleri
QAnon'un başarılı oyun mekaniği + başarısız etiği analiz edildi. Biz aynı mekaniği kullanıp etiği tersine çeviriyoruz:

| QAnon Yaptı | Biz Yapacağız | Neden |
|-------------|---------------|-------|
| Sonsuz tavşan deliği (çözümsüz) | Her soruşturmanın test edilebilir sonucu var | Resolution > endless mystery |
| Tek hipotez (confirmation bias) | Zorunlu rakip hipotez (CIA SAT tekniği) | Çoklu hipotez = rigorous thinking |
| Anonim guru ("Q") | Şeffaf kaynak + credential-based otorite | Transparency > mystery |
| Hızlı duygu döngüsü | Yavaş, kasıtlı değerlendirme | Deliberation > pattern-matching |
| "Sadece akıllılar anlar" elitizmi | Herkes katkı yapabilir, kalite ölçülür | Meritocracy > gatekeeping |
| "Araştırmanı yap" açık uçluluğu | "Bu iddiayı doğrula" sınırlı görevler | Bounded tasks > rabbit holes |

> **KRİTİK QAnon MEKANİĞİ:** "Bireyler gizli gerçekleri pasif olarak tüketmek yerine
> aktif olarak keşfettiklerini hissettiklerinde, anlatıya olan psikolojik yatırımları
> KATLANARAK derinleşir." Bu yüzden gamification SADECE nesnel görevlerde (belge bul,
> tarih doğrula). Öznel yorumlama ASLA oyunlaştırılmaz.

**Savunma:** Araştırmalar "bilimsel zeka"nın (analitik düşünme + nicel akıl yürütme +
ampirik disiplin) komplo düşüncesine karşı sağlam bir bariyer olduğunu gösteriyor.
Platform bu zekayı GELİŞTİRMELİ, bypass etmemeli.

> **CIA Structured Analytic Techniques (SATs):** "İç düşünce süreçlerini sistematik ve şeffaf biçimde
> dışsallaştırır ki başkaları tarafından paylaşılabilsin, üzerine inşa edilebilsin ve kolayca eleştirilebilsin."
> Bu platform SAT prensiplerini oyunlaştırıyor.

### 2.3 Profesyonel Bağımlılık Psikolojisi
Bloomberg Terminal araştırması kritik bir içgörü ortaya çıkardı:

> **"Profesyonel yetişkinler kolaylık değil, ustalık ister."**
> Trader'lar Bloomberg'ün karmaşık arayüzüne GÖNÜLLü 12 saat harcar —
> çünkü kompleksliği yenebilmek statü sembolüdür.

**Csikszentmihalyi'nin Ototelik Deneyim Teorisi:**
- Aktivite kendi başına ödüldür (dışsal motivasyon gerekmez)
- Zorluk seviyesi = beceri seviyesi (ne çok kolay ne çok zor)
- Anında geri bildirim (ilerlemenin görünürlüğü)
- Kontrol hissi (ne yapacağını sen seçiyorsun)
- Zamanın akması (flow state)

**Uygulama:** Platformu "kolaylaştırmayacağız" — farklı zorluk seviyeleri sunacağız.
Kolay mod yeni başlayanlar için, ama asıl deneyim ZORLUĞUN ÖDÜLLENDİRİLMESİ.

### 2.5 Epistemik Merak Döngüsü (v2 — Raşit Araştırması)
> **"Tip-of-the-tongue" efekti:** Kullanıcı küçük bilgi boşluğu hissettiğinde
> obsesif problem çözme tetiklenir. Bu bağımlılığın gerçek motoru — XP değil.

**Information Foraging Theory:** Kullanıcılar avcılar gibi avlanır. Platform
"koku" (visual indicators of value) sağlamalı:
- Heat map'ler: "Bu belge çok sorgulanmış ama kimse çözemedi" → merak
- Boşluk göstergeleri: "Bu iki node arasında bağlantı eksik" → tamamlama dürtüsü
- Anomali işaretçileri: "Bu tarihte bir tutarsızlık var" → dedektif içgüdüsü

### 2.6 Bellingcat 7 Adımlı İş Akışı (v2 — Raşit Araştırması)
> Tüm görevler bu metodolojik sırayı TAKİP ETMELİ:

1. **Anomali Tespiti** — "Burada bir şey yanlış"
2. **Birincil Kaynak** — Doğrudan belge/kanıt
3. **Çapraz Doğrulama** — Bağımsız ikinci kaynak
4. **Zaman Çizelgesi** — Kronolojik tutarlılık
5. **Mekansal Doğrulama** — Coğrafi tutarlılık
6. **Kaynak Zinciri** — Kim, ne zaman, nasıl elde etti
7. **Anlatı** — Tüm kanıtlar tutarlı bir hikaye oluşturuyor mu?

### 2.7 POLE+ELP Çerçevesi (NATO/FBI/CIA Standardı)
> People, Objects, Locations, Events + Links, Evidence, Patterns

Her entity bu çerçeveye uymalı. Mevcut node sistemi (kişi, yer, olay, belge)
POLE'un alt kümesi. ELP kısmı (Links, Evidence, Patterns) epistemolojik katmanla
(Sprint 6B) zaten kısmen var ama formalize edilmeli.

---

## 3. RADİKAL ŞEFFAFLIK MİMARİSİ <a name="3-seffaflik"></a>

> **"Bize güvenme, kendin bak."** — Raşit Altunç, 24 Mart 2026
>
> Bu bölüm 24 Mart 2026'da eklendi. Raşit'in talebi: "Her sonucun sebebinin neden olduğu
> sadece biz tarafından değil herkes tarafından görülsün." Bu, platformun DNA'sıdır.

### 3.1 Temel Felsefe: Epistemik Şeffaflık

Çoğu platform "biz doğruyuz, bize güvenin" der. Biz diyoruz ki: **"Her şey açık, kendin bak."**

Bu sadece "ne biliyoruz" değil — **"nasıl biliyoruz, ne kadar eminiz, kim kontrol etti,
nerede zayıfız"** sorusunun HER ZAMAN cevaplanabilir olması.

Paradoks: Güvenme demek, en çok güven oluşturan yaklaşımdır. Çünkü araştırmacı
senin söylediğine körü körüne güvenmez — kendisi de kontrol etmek ister. Ve sen ona
"buyur, her şey açık" diyebiliyorsan, güven kendiliğinden oluşur. Zorla değil, kanıtla.

### 3.2 Üç Katmanlı Şeffaflık Sistemi

#### Katman 1 — Tam Provenance Trail (Bilginin Hayat Hikayesi)
Her veri parçasının doğum belgesi, okul karnesi, sağlık raporu — hepsi görünür:

```
BİLGİNİN HAYAT HİKAYESİ (her node, link, entity için)
├── DOĞUM: Hangi belgeden çıkarıldı? (sayfa, satır, cümle)
├── ÇIKARIM: Hangi AI modeli? Hangi prompt? Raw output ne?
├── KARANTİNA: Ne zaman girdi? Hangi statüyle?
├── İNCELEME: Kim inceledi? Ne dedi? Kaç kişi baktı?
│   ├── Reviewer #1: fingerprint_abc, "approve", 45 saniye, accuracy %91
│   ├── Reviewer #2: fingerprint_def, "approve", 120 saniye, accuracy %87
│   └── Reviewer #3: fingerprint_ghi, "reject", 90 saniye, sebep: "tarih tutarsız"
├── CONSENSUS: 2/3 onay → ağa eklendi
├── DOĞRULAMA: Confidence score nasıl hesaplandı? (8 sinyal detayı)
├── DEĞİŞİKLİK: Kim ne zaman ne değiştirdi? (append-only log)
└── İTİRAZ GEÇMİŞİ: Kim itiraz etti? Ne oldu?
```

**Kural:** Hiçbir veri "sadece var" olamaz. Her şeyin bir sebebi, kaynağı, doğrulama zinciri
OLMAK ZORUNDA. Yoksa o veri platformda OLMAMALI.

#### Katman 2 — Platform Kendisi de Sorgulanabilir
Bu çoğu platformun yapmadığı şey. Sadece veriler değil, **platformun kararları** da şeffaf:

- **Algoritma şeffaflığı:** Bir node'un risk skoru neden 85? → Hesaplama formülü + girdi değerleri açık
- **Karantina kararları:** Neden 2 onay gerekiyor? Neden bu entity hâlâ karantinada?
- **Kullanıcı oy ağırlığı:** Neden Tier 2 kullanıcı çift oy? → Trust weight hesaplama formülü açık
- **AI davranışı:** AI neden bu entity'yi çıkardı? → Raw prompt + raw response saklanır
- **Görev atama:** Neden bu görev bana geldi? → Atama algoritması açıklaması görünür
- **Consensus sonucu:** 2/3 mü 3/3 mü? Kim ne dedi? Kararın kesinlik seviyesi ne?

#### Katman 3 — Evrensel Geri Bildirim + İtiraz Sistemi
Herkes, her şeye, kolayca itiraz edebilmeli — sadece verilere değil, platformun kendisine de:

**Veri İtirazları:**
- "Bu bilgi yanlış" → Sebep + alternatif kaynak gösterme formu
- "Bu kaynak güvenilmez" → Kaynak güvenilirlik tartışması açılır
- "Bu bağlantı eksik/fazla" → Link düzeltme önerisi (mevcut İP UZAT + yeni)
- "Bu tarih tutarsız" → Zaman çizelgesi çelişki raporu

**Platform İtirazları:**
- "Bu algoritma adaletsiz" → Algoritma inceleme talebi (kamuya açık)
- "Bu özellik yanlış çalışıyor" → Bug report (ama daha fazlası: tasarım eleştirisi de)
- "Bu karar yanlış" → Moderasyon/karantina kararına itiraz
- "Bu kullanıcının ağırlığı çok yüksek/düşük" → Trust weight inceleme talebi

**İtiraz Süreci:**
```
İtiraz geldi → Kamuya açık kayıt oluşur (itiraz eden anonim, içerik açık)
→ İlgili verinin "dispute" bayrağı aktif olur (UI'da görünür)
→ Bağımsız review süreci başlar (itiraz edeni tanımayan kişiler)
→ Sonuç kamuya açık yayınlanır (kabul/red + gerekçe)
→ Tüm süreç provenance trail'e eklenir
```

### 3.3 Biricik Kod Sistemi (Trace ID)

Her hareket, her veri parçası, her karar — platformdaki HER ŞEY takip edilebilir bir kimliğe sahip:

| Nesne | Biricik Kod Formatı | Örnek |
|-------|---------------------|-------|
| Node | `NODE-{short_hash}` | NODE-a3f8 |
| Link | `LINK-{source}-{target}` | LINK-a3f8-b7c2 |
| Belge | `DOC-{hash}` | DOC-7e4a |
| Görev | `TASK-{seq}` | TASK-0042 |
| İnceleme | `REV-{task}-{reviewer}` | REV-0042-abc |
| İtiraz | `DISP-{seq}` | DISP-0017 |
| AI Çıkarım | `AIX-{doc}-{seq}` | AIX-7e4a-003 |
| Provenance | `PROV-{timestamp}` | PROV-20260324T1430 |

**Kural:** Herhangi bir biricik kodu platformda arayabilirsin → o nesnenin tüm hayat hikayesi çıkar.

### 3.4 Şeffaflık UI Prensipleri

Bir node'a tıkladığında görmesi gereken (ArchiveModal genişletmesi):

```
JEFFREY EPSTEIN [NODE-a3f8]
├── Güven: %87 ████████░░ (8 sinyal detayı →)
├── Kaynak: 12 belge, 3 tanık ifadesi, 2 mahkeme kararı (tümünü gör →)
├── İnceleme: 47 kişi inceledi, 43 onay, 2 red, 2 itiraz (detay →)
├── Son güncelleme: 2 gün önce (değişiklik geçmişi →)
├── İtirazlar: 1 açık itiraz (oku →)
└── Provenance: Tam zincir (15 kayıt) (incele →)
```

**Her "→" tıklanabilir.** Her detay bir sonraki katmana açılır. Hiçbir yerde "güven bize" yok —
sadece "bak, hesapla, kendin karar ver" var.

### 3.5 "Geri Alınamaz" Hiçbir Şey Yok (Dispute → Rollback)

- Hiçbir veri kalıcı olarak kesinleşmez — TA Kİ itiraz süresi dolana kadar
- İtiraz süresi: onaydan sonra 30 gün (herkes itiraz edebilir)
- İtiraz geldiğinde: "dispute" bayrağı, bağımsız review, gerekirse rollback
- Rollback cascade: Sahte belge çıkarıldığında bağlı tüm node/link otomatik flaglenir
- Ama rollback bile geri alınabilir — yeni kanıt sunulursa

**Prensip:** Mükemmel olmadan geri dönüşsüz adım ATILMAZ.
Ama mükemmelliğe ulaşıldığında bile, yeni kanıt karşısında geri dönüş HER ZAMAN mümkün.

### 3.6 Kamuya Açık Metrikler

Platform düzeyinde herkesin görebildiği canlı metrikler:

- Toplam incelenen entity sayısı / onay oranı / red oranı
- Ortalama consensus süresi (bir entity kaç saatte onaylanıyor?)
- İtiraz sayısı ve sonuçları (kaç itiraz haklı çıktı?)
- AI doğruluk oranı (çıkarımların kaçı onaylandı?)
- Kullanıcı tier dağılımı (kaç novice, researcher, analyst?)
- En çok tartışılan entityler (transparency > hiding controversy)
- Platform uptime + API response time (teknik sağlık)

> **Neden?** Araştırmacı ne ister? Araştırmak. Araştırabildiği kadar araştırmak.
> Havadaki bilgi, eksik bilgi, yarım bilgi — kaderimizi etkiler.
> O yüzden her şey kaynaklı, her hareket birbirine bağlı, her biricik kod izlenebilir.
> Platform bir kara kutu değil, CAM KUTU.

---

## 4. KULLANICI ARKETİPLERİ VE ROL BAZLI DENEYİMLER <a name="4-roller"></a>

### 4.1 Dört Temel Arketip

Her arketip farklı bir DÜNYAYA girer — sadece farklı veri değil, tamamen farklı atmosfer,
araç seti, terminoloji ve ilerleme yolu.

#### 🏦 FİNANS ARAŞTIRMACISI ("Para İzci")
**Kim:** Forensic accountant, finans gazetecisi, compliance uzmanı, meraklı vatandaş
**Ne Hisseder:** "Bloomberg Terminal'deyim ama suç ağını çözüyorum"
**Atmosfer:** Koyu mavi/yeşil, terminal estetiği, para akış diyagramları
**Araçları:**
- Para akışı takip grafiği (source → offshore → destination)
- Shell company ağaç yapısı (beneficial ownership)
- SWIFT/wire transfer zaman çizelgesi
- Anomali tespiti (ani servet değişimi, olağandışı alıcılar)
**Görev Tipleri:**
- "Bu banka havalesi nereye gitti?" (transaction tracing)
- "Bu şirketin gerçek sahibi kim?" (beneficial ownership)
- "Bu iki hesap arasında bağlantı var mı?" (link analysis)
**Referans:** RICO soruşturma metodolojisi — wire transfer, layering, integration tespit adımları

#### ⚖️ HUKUK ARAŞTIRMACISI ("Dava Avcısı")
**Kim:** Avukat, hukuk öğrencisi, RICO uzmanı, insan hakları aktivisti
**Ne Hisseder:** "Duruşma salonundayım, delil dosyası önümde"
**Atmosfer:** Koyu kırmızı/bordo, serif tipografi, mahkeme esnaları taşıyan formal his
**Araçları:**
- Delil hiyerarşisi (doğrudan vs dolaylı kanıt)
- Tanık çizelgesi (kim ne dedi, ne zaman, nerede)
- Hukuki zaman çizelgesi (suç tarihi → tutuklama → yargılama)
- Çapraz referans (ifade tutarsızlıkları)
**Görev Tipleri:**
- "Bu ifade önceki ifadeyle tutarlı mı?" (cross-examination)
- "Bu belgede hangi suç unsuru var?" (legal element spotting)
- "Bu kanıt mahkemede kabul edilebilir mi?" (admissibility analysis)
**Referans:** Relativity/Everlaw eDiscovery — Storybuilder (belgeleri narratif olarak görme)

#### 📰 GAZETECİ / OSINT ARAŞTIRMACISI ("Hakikat Avcısı")
**Kim:** Araştırmacı gazeteci, OSINT analisti, Bellingcat gönüllüsü, fact-checker
**Ne Hisseder:** "Bellingcat operasyon odasındayım"
**Atmosfer:** Koyu gri/turuncu, monospace, terminal + harita overlay
**Araçları:**
- Fotoğraf/video coğrafi konum belirleme (gölge analizi, landmark)
- Metadata analizi (EXIF, oluşturma tarihi, yazılım)
- Ters görsel arama (TinEye, Google Lens entegrasyonu)
- Kaynak doğrulama zinciri (birincil → ikincil → üçüncül)
**Görev Tipleri:**
- "Bu fotoğraf nerede çekilmiş?" (geolocation)
- "Bu belge gerçek mi sahte mi?" (document forensics)
- "Bu iki olay arasında zaman bağlantısı var mı?" (chronolocation)
**Referans:** Bellingcat gölge analizi (%95 accuracy), ELA manipülasyon tespiti

#### 🔍 VATANDAŞ ARAŞTIRMACI ("Merak Eden")
**Kim:** Öğrenci, meraklı vatandaş, yeni başlayan, herkes
**Ne Hisseder:** "Detektif gibi hissediyorum ve gerçekten bir şeye katkı yapıyorum"
**Atmosfer:** Mevcut Truth estetiği (siyah/kırmızı), daha rehberli arayüz
**Araçları:**
- Basitleştirilmiş entity kartları ("Bu kişi kimdir?")
- Bağlantı onaylama ("Bu iki kişi gerçekten bağlantılı mı?")
- Fotoğraf annotasyonu ("Bu fotoğrafta ne görüyorsun?")
- Tarih doğrulama ("Bu olay ne zaman olmuş?")
**Görev Tipleri:**
- "Bu belgede adı geçen kişileri listele" (entity extraction verification)
- "Bu kişi erkek mi kadın mı?" (basic classification)
- "Bu iki isim aynı kişi mi?" (entity resolution)
**Referans:** Zooniverse progressive difficulty — kolay görevlerden başla, zamanla zorlaştır

### 4.2 Rol Geçişi
- Kullanıcı tek bir role kilitlenmez — her zaman rol değiştirebilir
- Ama sistem davranış profilinden "neyde iyi olduğunu" bilir
- %70 uzmanlık alanı + %30 rastgele karışım (echo chamber önleme)
- Bir vatandaş araştırmacı zamanla finansçı seviyesine çıkabilir (Dreyfus modeli)

---

## 5. OYUN MODLARI: SOLO / DUO / MULTİ <a name="5-modlar"></a>

### 4.1 SOLO MOD — "Dedektif Masası"
**Deneyim:** Karanlık bir odada, masanda belgeler, büyüteç, kırmızı ip
**Mekanik:**
- Sistem rastgele görev atar (kullanıcı seçemez)
- Her görev bağımsız değerlendirilir
- Calibration questions araya serpiştirilir (%20)
- İlerleme: XP + accuracy rating + tier yükseltme
**Kimler İçin:** İlk deneyim, pratik, bireysel araştırma

### 4.2 DUO MOD — "Holmes & Watson"
**Deneyim:** İki kişi aynı davada, farklı perspektiflerden

#### Swift Trust Hızlandırma (5 Mekanizma)
> Araştırma: Yabancılar arasında hızlı güven 5 yapısal hızlandırıcı gerektirir:
1. **Sprint hedefleri** — İlk ortak görev 5-10 dakikada çözülebilmeli (erken zafer = güven temeli)
2. **Sürekli etkileşim** — Sık ping = güven bakımı
3. **Sonuç odaklı** — Gerçek iş ödüllendirilir, meşguliyet değil
4. **Aynı gemide** — Ortak sonuçlar (ikisi de kazanır veya ikisi de kaybeder)
5. **Bütünlük temelli** — Şeffaf, güvenilir sistem > kişisel sempati

#### Bilgi Asimetrisi Tasarımı (4 Boyut)
> "Keep Talking and Nobody Explodes" modeli: Biri bombayı görür, kılavuzu okuyamaz.
> Diğeri kılavuzu okur, bombayı göremez. → Sözlü iletişim ZORUNLU.

Duo görevlerinde 4 asimetri boyutu:
- **Sahiplik:** Kim belgeyi fiziksel olarak görüyor?
- **Fayda:** Kimin ilerlemesi için bu bilgi gerekli?
- **Sahiplik algısı:** Diğerinin neye sahip olduğunu biliyor mu?
- **Fayda algısı:** Bilginin kime lazım olduğunu biliyor mu?

**Örnek:** Player A telefon kaydını (transcript) görür, ağı göremez.
Player B ağ grafiğini görür, transcript'i okuyamaz.
A: "Burada Maxwell, Epstein'a 'uçağı hazırla' diyor, 14 Mart 1998."
B: "Maxwell'in 14-16 Mart'ta Little St. James'e uçuş kaydı var!"
→ **İKİSİ BİRLİKTE** bağlantıyı kuruyor.

**Mekanik — Açık Eşleştirme:**
- Sistem eşleştiriyor (birbirini seçemezler)
- Aynı iki kişi art arda eşleşemez (rotasyon zorunlu)
- İkisi de BAĞIMSIZ değerlendirir önce (birbirinin cevabını görmeden)
- Sonra karşılaştırma: uyuşursa → güçlü sinyal; uyuşmazsa → tartışma modu

**Mekanik — Arkadaş Lobisi:**
- "Hadi beyler Truth yapalım bu akşam!"
- Arkadaş grubu birlikte girer AMA → grubun onayı TEK BİR OY sayılır
- Dışarıdan bağımsız bir kişi de onaylamalı (sistemi kandıramazsın)
- Eğlence + öğrenme modu (rekabet, leaderboard, streak)
- Üniversite etkinlikleri, hackathon tarzı "soruşturma gecesi"

**Assist Mekaniği:**
- Keşfi yapan kişi "gol atan", ama o keşfe zemin hazırlayan kişi "asist yapan"
- Her ikisi de XP kazanır (League of Legends assist sistemi)
- "Bu belgeyi ilk ben taradım ama bağlantıyı sen buldun" → ikimiz de kredi alırız

### 4.3 MULTİ MOD — "Operasyon Odası"
**Deneyim:** FBI savaş odası — harita, ağ, zaman çizelgesi, herkes kendi köşesinde
**Mekanik:**
- 3-6 kişilik takımlar
- Her takım üyesine farklı uzmanlık rolü atanır
- Rol bazlı bilgi erişimi (finansçı finansal belgeleri görür, hukukçu mahkeme dosyalarını)
- Ortak "keşif panosu" (Investigation Board — Sprint 8'den miras)
- Takım leaderboard'u (takım vs takım rekabet)

**Hackathon Modu (Özel Etkinlik):**
- 48 saatlik soruşturma sprintleri
- Belirli bir dava üzerine yoğunlaştırma
- Mentor eşleştirmesi (deneyimli araştırmacılar)
- Sonunda "bulgu sunumu" (en iyi keşifler ödüllendirilir)

### 4.4 Mod Güvenlik Karşılaştırması

| Güvenlik Katmanı | Solo | Duo (Açık) | Duo (Arkadaş) | Multi |
|------------------|------|-----------|---------------|-------|
| Rastgele görev atama | ✅ | ✅ | ✅ | ✅ |
| Eşleştirme kontrolü | N/A | Sistem seçer | Kullanıcı seçer | Sistem + kullanıcı |
| Bağımsız değerlendirme | ✅ | ✅ (önce bağımsız) | ✅ (tek oy sayılır) | ✅ (rol bazlı) |
| Calibration questions | %20 | %15 | %25 (daha yüksek) | %15 |
| Oy ağırlığı | Bireysel | 2× (consensus) | 1× (tek oy) | Rol ağırlıklı |
| Manipülasyon riski | Düşük | Düşük | Orta (tek oy ile azaltılmış) | Orta |

---

## 5. GÖREV TİPLERİ VE İLERLEME SİSTEMİ <a name="5-gorevler"></a>

### 5.1 Görev Kategorileri

#### Kategori A: Entity Doğrulama (Temel)
- "Bu belgede Jeffrey Epstein'ın adı geçiyor mu?" → Evet/Hayır
- "Bu kişinin mesleği nedir?" → Çoktan seçmeli
- "Bu iki isim aynı kişi mi?" → Evet/Hayır/Emin Değilim
- **Zorluk:** ⭐ (Novice)
- **XP:** +5 doğru, -1 yanlış

#### Kategori B: İlişki Bağlama (Orta)
- "Bu iki kişi arasındaki ilişki türü nedir?" → Çoktan seçmeli (iş, arkadaşlık, suç ortağı, aile...)
- "Bu belge bu ilişkiyi kanıtlıyor mu?" → Evet/Kısmen/Hayır + açıklama
- "Bu bağlantının güvenilirlik seviyesi nedir?" → 1-5 scale
- **Zorluk:** ⭐⭐ (Advanced Beginner)
- **XP:** +10 doğru, -3 yanlış

#### Kategori C: Timeline Yerleştirme (Orta-Zor)
- "Bu olay ne zaman olmuş?" → Tarih seçimi + kaynak gösterme
- "Bu iki olay arasında kronolojik bağlantı var mı?" → Analiz
- "Bu zaman çizelgesi mantıklı mı?" → Tutarlılık kontrolü
- **Zorluk:** ⭐⭐⭐ (Competent)
- **XP:** +15 doğru, -5 yanlış

#### Kategori D: Belge Analizi (Zor)
- "Bu belgede hangi varlıklar (kişi/kurum/yer) geçiyor?" → Serbest form listesi
- "Bu fotoğraf nerede çekilmiş?" → Coğrafi konum tahmini
- "Bu mali belgedeki anomali nedir?" → Forensic analiz
- **Zorluk:** ⭐⭐⭐⭐ (Proficient)
- **XP:** +25 doğru, -8 yanlış

#### Kategori E: Hipotez Oluşturma (Uzman)
- "Bu kanıtlara dayanarak ne sonuç çıkarılabilir?" → Yapılandırılmış analiz
- "Rakip hipotez nedir?" → CIA ACH (Analysis of Competing Hypotheses) formatı
- "Bu soruşturmanın sonraki adımı ne olmalı?" → Strateji önerisi
- **Zorluk:** ⭐⭐⭐⭐⭐ (Expert)
- **XP:** +50 doğru, -15 yanlış

#### Kategori F: Görsel/Medya Doğrulama
- "Bu fotoğrafta kim var?" → Kişi tanıma
- "Bu belgenin formatı resmi belgeye uyuyor mu?" → Otantiklik analizi
- "Bu görüntüde manipülasyon var mı?" → ELA analizi değerlendirme
- **Zorluk:** Değişken (⭐ - ⭐⭐⭐⭐)
- **XP:** Zorluğa göre

### 5.2 İlerleme Sistemi (Dreyfus + Karate Kuşağı + Elo)

#### Tier Sistemi (Görünür İlerleme)
```
🔵 ÇAYLAK (0-100 XP)      — Temel görevler, rehberli deneyim
🟢 ARAŞTIRMACI (100-500)   — Orta görevler, daha az rehber
🟡 ANALİST (500-2000)      — Zor görevler, rol bazlı erişim
🟠 UZMAN (2000-5000)       — Tüm görevler, mentor olabilir
🔴 KÜRATÖR (5000+)         — Görev tasarlayabilir, kalite kontrolü yapabilir
```

#### Accuracy Rating (Görünmez Kalite Ölçümü)
- Calibration question'lardaki başarı oranı → gerçek accuracy
- Bu rating kullanıcıya gösterilmez ama oy ağırlığını belirler
- %95+ accuracy = oyu 3× ağırlık
- %80-95 accuracy = oyu 2× ağırlık
- %60-80 accuracy = oyu 1× ağırlık
- %60 altı = görevler kolaylaştırılır (eğitim moduna yönlendir)

#### Streak Sistemi (Duolingo modeli)
- Günlük soruşturma: en az 1 görev tamamla → streak devam eder
- 7 gün streak → Haftalık rozet
- 30 gün streak → Aylık rozet + bonus XP
- Streak kaybetmek = retention düşüşü (Duolingo data: streak %55 retention, streak'siz %12)

#### Uzmanlık Haritası (Skill Tree)
- Her rol için ayrı skill tree (finans, hukuk, gazetecilik, genel)
- Başlangıçta temel dallar açık, ilerleme ile uzmanlaşma dalları açılır
- Cross-training bonus: birden fazla rolde ilerlemek ekstra XP verir
- Skill tree GÖRÜNÜR — kullanıcı neye doğru ilerlediğini bilir

---

## 6. GÜVENLİK MİMARİSİ: ANTİ-MANİPÜLASYON <a name="6-guvenlik"></a>

### 6.1 Temel Prensip
> **"Eğlenirsin ama sistemi kandıramazsın."**
> **"Dürüst davranmak, HER ZAMAN en karlı strateji olmalı."** — Raşit Altunç, 24 Mart 2026
>
> Tüm oyunu bu mantığın üzerine inşa ediyoruz. Güvenlik "ek özellik" değil, oyun tasarımının TEMELİ.
> Ekonomistlerin "incentive compatibility" dediği şey — dürüst olmak HER ZAMAN gaming'den daha kârlı.

### 6.2 Altı Katmanlı Savunma

#### Katman 1: Rastgele Atama
- Kullanıcı görevini SEÇEMEZSİN
- Sistem görev atar (ağırlıklı rastgele: %70 uzmanlık, %30 rastgele)
- Neden %30 rastgele: echo chamber önleme + çapraz kontrol
- Aynı görev birden fazla BAĞIMSIZ kişiye atanır (minimum 2, kritik görevler 3+)

#### Katman 2: Calibration Questions (Gold Standard / Honeypot)
- Her 5 görevden 1'i (%20) cevabı BİLİNEN soru
- Kullanıcı hangisinin calibration olduğunu BİLMEZ
- Doğru cevap → accuracy rating yükselir
- Yanlış cevap → accuracy düşer + görevler kolaylaşır
- Sürekli yanlış → "eğitim modu"na yönlendir (cezalandırma değil, eğitim)
- **Kaynak:** Zooniverse, Amazon Mechanical Turk, Galaxy Zoo — endüstri standardı

#### Katman 3: Davranış Anomali Tespiti
- Her şeye "ONAYLA" diyen → flag (rubber stamping)
- Her şeye "REDDET" diyen → flag (contrarian bias)
- Çok hızlı yanıt veren → flag (görev okumadan tıklıyor)
- Belirli entity'lere sistematik oy veren → flag (agenda-driven)
- Aynı zaman diliminde aynı hedefe yönelen koordineli oylar → flag (Sybil saldırısı)

#### Katman 4: Bağımsız Doğrulama (2+ Kişi Kuralı)
- Hiçbir veri tek kişinin onayıyla ağa GİREMEZ
- Minimum 2 bağımsız onay gerekir (Sprint 17 karantina sistemi)
- "Bağımsız" = farklı IP bloğu, farklı hesap yaşı, farklı davranış profili
- Duo arkadaş modunda: grubun onayı TEK OY sayılır → dışarıdan 1+ onay şart

#### Katman 5: Eşleştirme Güvenliği (Duo/Multi)
- Açık eşleştirmede: birbirini SEÇEMEZLER
- Sistem eşleştirir: farklı coğrafya, farklı tier, farklı davranış profili
- Aynı iki kişi art arda MAX 2 kez eşleşebilir (sonra zorunlu rotasyon)
- Eşleştirilmiş iki kişi önce BAĞIMSIZ değerlendirir, sonra sonuçlar karşılaştırılır
- **Kaynak:** Akademik peer review anti-collusion — double-blind + conflict of interest

#### Katman 6: Zamana Dayalı Güven
- Yeni hesap = düşük oy ağırlığı (0.1×)
- 30 gün aktif = standart (0.5×)
- 90 gün + calibration %80+ = normal (1×)
- 6 ay + peer nomination = güvenilir (2×)
- 12 ay + doğrulanmış uzmanlık = uzman (3×)
- **Kaynak:** Sybil attack research — temporal proof en etkili savunma

### 6.3 ANTİ-GAMİNG MİMARİSİ: "SALDIRGAN BİLE SİSTEME FAYDA SAĞLAR"

> **24 Mart 2026 — Raşit ile kesinleşen karar:**
> "Saldırı için içeri giren bile mecbur topluma fayda sağlamak zorunda kalsın.
> Sistemi dolandırmaya çalışan da mecbur sisteme fayda sağlamalı ve istediğine
> KESİNLİKLE ulaşamaması lazım."

#### 6.3.1 Temel Prensip: Asimetrik Maliyet

Sisteme zarar vermek, sisteme fayda sağlamaktan **HER ZAMAN daha maliyetli** olmalı.

```
DOĞRU DAVRANIŞ MALİYETİ:
  Zaman: 30 saniye/görev × 20 görev/gün = 10 dakika
  Kazanç: +200 XP/gün + güven artışı + yeni görev erişimi

YANLIŞ DAVRANIŞ MALİYETİ:
  Zaman: Aynı süre harcamak ZORUNLU (minimum süreler, soğuma, gerekçe yazma)
  Kazanç: Sıfır veya negatif (kalibrasyon yakalatır, XP düşer, güven erir)
  Bonus: Yaptığın her şey zaten sisteme veri noktası sağlıyor
```

#### 6.3.2 Beş Saldırı Senaryosu ve Savunmaları

**Saldırgan Tipi 1 — XP Kasıcı (Hızlı Onay Makinesi):**
```
Strateji: Hızlı hızlı "onayla" basarak XP kasmak
Savunma:
  → Kalibrasyon soruları yakalatır (%20 oranında, hangisi bilmez)
  → Minimum inceleme süresi (entity=15s, ilişki=45s, belge=90s)
  → Soğuma periyodu (10 görev → 5dk zorunlu mola)
  → Asimetrik XP: doğru=+10, yanlış=-15 (dikkatsizlik NET ZARAR)
  → Gerekçe zorunlu (copy-paste tespit edilir, aynı gerekçe 5 göreve = flag)
Sonuç: Hızlı ama dikkatsiz olmak NET ZARARDÍR — hiçbir kestirme yol kârlı değil
```

**Saldırgan Tipi 2 — Hedefli Manipülatör (Belirli Kişiyi Koru/Zarar Ver):**
```
Strateji: Sürekli belirli bir node'u "yanlış" diye reddetmek (ağdan çıkarmaya çalışmak)
Savunma:
  → 4 bağımsız incelemeci "doğru" diyor, bu kişi sürekli azınlıkta
  → Hedefli davranış deseni anomali tespiti devreye girer
  → Hesap flaglenir ve güven ağırlığı düşer
  → Bu zamana kadar yaptığı her inceleme sisteme veri noktası sağlamış
  → Saldırı verisi paradoksal olarak hedefin güvenilirliğini ARTIRIR
    (saldırı = ilgi = birisi çıkarmak istiyor = önem)
Sonuç: Hedefli saldırı, hedefe FAYDALI. Saldırgan istediğinin TAM TERSİNİ başarır
```

**Saldırgan Tipi 3 — Sybil Ordusu (Çoklu Sahte Hesap):**
```
Strateji: 10 sahte hesap açıp koordineli oy vermek
Savunma:
  → Her hesap AYRI AYRI kalibrasyon geçmişi oluşturmalı (10× iş)
  → Her hesap AYRI AYRI anlamlı gerekçe yazmalı (10× emek)
  → Her hesap AYRI AYRI minimum süre harcamalı (10× zaman)
  → 10 hesap aynı hedeflere oy verirse → ring detection → hepsi flaglenir
  → Yeni hesaplar 0.1× oy ağırlığı (30 gün sonra ancak 0.5×)
  → 10 × 0.1 = 1.0 ağırlık vs tek dürüst kullanıcı 2.0+ ağırlık
Sonuç: 10 kat emek, dürüst bir kullanıcının YARISÍ kadar etki. Net irrasyonel strateji
```

**Saldırgan Tipi 4 — İçeriden Sızan (Yavaş Yükselen Köstebek):**
```
Strateji: 6 ay boyunca dürüst davran, güven kazan, sonra kritik anda manipüle et
Savunma:
  → 6 ay dürüst çalışma = sisteme 6 ay GERÇEK KATKI (zaten fayda sağladı)
  → Ani davranış değişikliği anomali tespiti tetikler
  → Tek kişinin yapabileceği hasar sınırlı (2+ bağımsız onay kuralı)
  → Yüksek güvenli hesabın DÜŞÜŞÜ, düşük güvenli hesabınkinden DAHA SERTTİR
  → 6 ay emek bir günde silinir (asimetrik ceza: uzun yatırım, anında kayıp)
Sonuç: Köstebek stratejisi, 6 ay boyunca sisteme bedava iş gücü verir
```

**Saldırgan Tipi 5 — Kolektif Manipülasyon (Organize Koordineli Saldırı):**
```
Strateji: Gerçek insanlardan oluşan organize grup, aynı anda belirli hedeflere saldırır
Savunma:
  → Zamana yayılmış oy analizi: aynı dakikada aynı hedefe 5+ oy → anomali
  → IP bloğu çeşitlilik kontrolü: aynı /24 subnet'ten gelen oylar flaglenir
  → Davranış benzerlik analizi: %90+ aynı oy deseni gösteren hesaplar → küme
  → Coğrafi çeşitlilik: tek şehirden gelen oylar kritik görevlerde daha düşük ağırlık
  → Graph clustering: nomination/oy zincirleri kümeleşme gösteriyorsa → flag
  → Otomatik soğutma: flaglenen küme'nin oy ağırlığı geçici olarak dondurulur
Sonuç: Organize saldırı, meşru organize çalışmadan DAİMA daha maliyetli
```

#### 6.3.3 Yapısal Akış Sınırlamaları (Rate Limiting Katmanı)

```
ZAMAN KİLİTLERİ:
├── Günlük görev limiti: 20-30 görev/gün (kaliteyi miktarla değiştirmek İMKÂNSIZ)
├── Minimum inceleme süreleri (görev tipine göre):
│   ├── Entity doğrulama: 15 saniye
│   ├── İlişki bağlama: 45 saniye
│   ├── Belge analizi: 90 saniye
│   └── Hipotez oluşturma: 180 saniye
├── 3 saniye altı cevap → otomatik "şüpheli" flag → meta-incelemeye gider
├── Art arda 10 görev → 5 dakika zorunlu soğuma periyodu
│   (Taze zihin = kaliteli karar — bu hem güvenlik hem UX)
├── İtiraz limiti: günde max 5 (spam önleme)
└── Gerekçe zorunluluğu: minimum 10 karakter, copy-paste tespit

GEREKÇE KALİTE KONTROL:
├── Copy-paste tespiti (aynı metin 3+ göreve → flag)
├── Minimum uzunluk (10 karakter) zorunlu
├── Kaynak referansı içeren gerekçeler bonus ağırlık kazanır
│   ("CourtListener dava #X, sayfa Y" >>> "bence doğru")
├── Zamanla AI destekli gerekçe kalite skoru (spesifiklik, kaynak varlığı)
└── Düşük kalite gerekçe → görev tekrar atanabilir (silmek yerine ikinci göz)
```

### 6.4 Wikipedia'dan Alınan Dersler
- 3-revert kuralı: aynı düzenlemeyi 3'ten fazla geri alamazsın (edit war önleme)
- ClueBot NG: otomatik vandalizm tespiti (regex + ML pattern)
- Extended protection: sürekli saldırı altındaki sayfalar kilitlenir
- Counter-Vandalism Unit: uzman gönüllü ekibi

### 6.5 Boston Marathon'dan Alınan Ders
> 2013'te Reddit kullanıcıları yanlış kişiyi "teşhis" etti → masum aile zarar gördü
> Kök neden: sıfır kaynak doğrulaması + fotoğraf benzerliği = kimlik
> Çözümümüz: hipotez yayınlanmadan önce karantina + peer review + calibration

---

## 7. GÜVEN AĞIRLIĞI HESAPLAMA SİSTEMİ <a name="7-guven"></a>

> **24 Mart 2026 — Raşit ile kesinleşen mimari.**
> "Neye göre adam iyi karar veriyor oluyor ki? Arkadaki mantık nasıl çalışacak?"
> Cevap: **Biz bilmiyoruz. Ama matematik biliyor.**

### 7.1 Temel Felsefe: Dolaylı Ölçüm

Çoğu görevin "doğru" cevabı önceden bilinmiyor — karantinadan gelen yeni veri zaten
tartışmalı olduğu için burada. O zaman iyi kararı nasıl ölçeriz?

**Paradoks çözümü:** Cevabı bilinen sorulardan (kalibrasyon), cevabı bilinmeyen sorulardaki
kaliteyi tahmin ederiz. Bir sınavda 20 sorunun cevabı biliniyorsa ve öğrenci bunlarda %90
yapıyorsa, diğer 80 soruda da güvenilirdir. Bu, Galaxy Zoo ve Zooniverse'ün kanıtlanmış
yöntemidir.

### 7.2 Beş Katmanlı Güven Hesaplama

#### Katman 1 — Kalibrasyon Doğruluğu (En Güçlü Sinyal)
```
calibration_accuracy = doğru_kalibrasyon / toplam_kalibrasyon
Ağırlık: %35
```
- Cevabı bilinen görevler %20 oranında serpiştirilir (hangisi olduğu BİLİNMEZ)
- Minimum 10 kalibrasyon sorusu cevaplanana kadar güven ağırlığı başlangıç seviyesinde kalır
- Kalibrasyon soruları zamanla güncellenir (yeni doğrulanmış veriler kalibrasyon havuzuna eklenir)

#### Katman 2 — Çapraz Doğrulama Uyumu (Topluluk Sinyali)
```
consensus_alignment = consensus_ile_uyumlu_oylar / toplam_consensus_görevleri
Ağırlık: %25
```
- Bir görevde 5 kişi "doğru" dedi, 1 kişi "yanlış" — sürekli azınlıkta kalan kişinin uyumu düşük
- AMA: azınlıkta olup HAKLI çıkan kişiler (sonradan consensus dönenler) EKSTRA puan alır
  Bu, Galileo'yu ödüllendiren mekanizma — kalabalık yanılabilir, ama haklı azınlık ödüllendirilmeli

#### Katman 3 — Gerekçe Kalitesi (Derinlik Sinyali)
```
reasoning_quality = kaynak_var_mı(+0.2) + spesifik_mi(+0.15) + uzunluk_yeterli_mi(+0.1)
Ağırlık: %15
```
- "CourtListener #1:20-cv-07867, sayfa 12'de isim geçiyor" = yüksek kalite
- "Bence doğru" = düşük kalite
- Zamanla AI destekli kalite puanlama (kaynak referansı, spesifiklik, mantık zinciri)
- Kalite puanı kullanıcıya GÖSTERİLMEZ (gaming önleme) ama ağırlığı etkiler

#### Katman 4 — Tutarlılık ve Süreklilik (Zaman Sinyali)
```
consistency = streak_bonus(+0.1/7gün) + hesap_yaşı_bonus + davranış_tutarlılığı
Ağırlık: %15
```
- 7 gün streak = +0.1 bonus
- 30 gün streak = +0.3 bonus
- 6 ay kesintisiz aktif = +0.5 bonus
- Ani davranış değişikliği (dürüstten agresife) → bonus geçici olarak dondurulur

#### Katman 5 — Alan Uzmanlığı (Domain Sinyali)
```
domain_expertise = alan_bazlı_kalibrasyon_skoru (her alan ayrı takip edilir)
Ağırlık: %10
```
- Herkes her konuda iyi değil
- Finans belgelerinde %95, hukuk belgelerinde %60 olabilirsin
- Finans görevi geldiğinde güven YÜKSEK, hukuk görevi geldiğinde DÜŞÜK
- Bu da şeffaf — kullanıcı kendi alan profilini görebilir

### 7.3 Toplam Güven Ağırlığı Formülü

```
trust_weight = base(0.1)
  + (calibration_accuracy × 0.35)
  + (consensus_alignment × 0.25)
  + (reasoning_quality × 0.15)
  + (consistency × 0.15)
  + (domain_expertise × 0.10)
  × tier_multiplier
  × anomaly_penalty  (flaglanmışsa 0.1×, normal 1.0×)
```

**Bu formül HERKESE AÇIK.** Her kullanıcı:
- Kendi güven ağırlığını görebilir
- Formülün her bileşenini görebilir
- Neden bu ağırlıkta olduğunu anlayabilir
- Formüle itiraz edebilir (platform itirazı olarak)

### 7.4 Asimetrik XP Ekonomisi

> "Gerçek değeri ödüllendiren, sahte değerin sadece zaman kaybına yol açacağı bir sistem."

```
DOĞRU KARAR ÖDÜLLER:
  Entity doğrulama: +5 XP
  İlişki bağlama: +10 XP
  Timeline yerleştirme: +15 XP
  Belge analizi: +25 XP
  Hipotez oluşturma: +50 XP

YANLIŞ KARAR CEZALAR (1.5× asimetrik):
  Entity doğrulama: -8 XP
  İlişki bağlama: -15 XP
  Timeline yerleştirme: -23 XP
  Belge analizi: -38 XP
  Hipotez oluşturma: -75 XP

BONUS ÇARPANLAR:
  Kalibrasyon doğru: ×1.5 (güveni artırır)
  Haklı azınlık (sonradan doğrulanmış): ×3.0 (cesaret ödülü)
  Yüksek kaliteli gerekçe: ×1.2
  Streak bonusu (7+ gün): ×1.1

CEZA ÇARPANLARI:
  Şüpheli hız (< minimum süre): ×2.0 ceza
  Copy-paste gerekçe: ×1.5 ceza
  Anomali flag aktif: ×3.0 ceza
```

**Neden 1.5× asimetrik?** Dikkatsizliğin bedeli dikkatlilikten BÜYÜK olmalı.
Risk almak cesaret ister ama dikkatsizlik cezalandırılır. Bu, dürüst
ve dikkatli çalışmayı her zaman en kârlı strateji yapar.

---

## 8. META-İNCELEME HİYERARŞİSİ <a name="8-meta"></a>

> **24 Mart 2026 — "Şüphelileri en güvenilir kişiler incelesin."**
> **"Güç yoğunlaşması imkansız olmalı."** — Raşit Altunç

### 8.1 Üç Katmanlı İnceleme Yapısı

#### Katman 1 — Normal İnceleme (Herkes)
- Karantinadan gelen görevleri incele, gerekçe yaz, oyla
- Minimum tier: ÇAYLAK (ama oy ağırlığı düşük)
- Sonuçlar consensus motoruna gider

#### Katman 2 — Kalite Kontrol / Meta-İnceleme (Trusted Reviewers)
- **Erişim:** Tier 3+ (ANALİST), en az 6 ay aktif, %85+ kalibrasyon, 200+ görev
- **Ne incelerler:**
  - 3 saniye altı cevaplar (şüpheli hız flagleri)
  - Davranış anomalisi flagleri (rubber stamping, contrarian, hedefli saldırı)
  - Consensus oluşmayan tartışmalı görevler
  - Düşük kaliteli gerekçeler
- **Yetkileri:** Flag'i onayla (kullanıcı uyarısı), flag'i kaldır (yanlış alarm), görevi yeniden atama
- **Bir nevi editör rolü** — ama KENDİLERİ DE denetlenebilir

#### Katman 3 — Sistem Denetimi / Ombudsman (En Üst Seviye)
- **Erişim:** Tier 5 (KÜRATÖR), doğrulanmış gazeteci/araştırmacı, 12+ ay aktif
- **Ne incelerler:**
  - Algoritma itirazlarını (güven formülü adil mi?)
  - Platform kararlarını (moderasyon kararları doğru mu?)
  - Trust weight inceleme taleplerini
  - Sistemik anomalileri (belirli coğrafyadan gelen oyların deseni)
- **Yetkileri:** Platform parametrelerini ÖNERebilir (ama değiştiremez — değişiklik topluluk oylaması gerektirir)

### 8.2 Güç Yoğunlaşması Önleme

> **"Güç yoğunlaşması imkansız."** — Bu çok önemli, Raşit bunu net söyledi.

```
HİÇBİR KATMAN DENETLENEMEZLİK DEĞİLDİR:
├── Tier 5 (Küratör) → Tier 3 tarafından itiraz edilebilir
├── Tier 3 (Meta-reviewer) → Tier 1 tarafından itiraz edilebilir
├── İtiraz HERKESİN görebildiği şeffaf süreçtir
├── Hiçbir kişi günde 30'dan fazla görev inceleyemez (güç birikimi önleme)
├── Meta-review'lar da kendi aralarında çapraz kontrol edilir
│   (2 meta-reviewer aynı flag'a farklı karar verirse → üst seviye inceleme)
├── Küratörlerin kararları HALKA AÇIK rapor olarak yayınlanır
└── Sistem denetçileri rotasyona tabi (aynı kişi sürekli aynı konuyu inceleyemez)
```

### 8.3 İtiraz Erişilebilirliği

> **"Platform her zaman eleştiriye, öneriye, şikayete açık olmalı. Kolay erişilir ve
> hemen çözümcü olmalıyız. Kulak kapatma lüksümüz yok."** — Raşit Altunç

- Her sayfada "İTİRAZ / GERİ BİLDİRİM" butonu (sabit, her zaman görünür)
- İtiraz formu 3 kategoride:
  1. **Veri hatası:** "Bu bilgi yanlış" → kaynak + düzeltme önerisi
  2. **Platform sorunu:** "Bu özellik yanlış çalışıyor" → açıklama + ekran görüntüsü
  3. **Adalet kaygısı:** "Bu karar/algoritma adaletsiz" → gerekçe + öneri
- Her itiraz 48 saat içinde yanıt alır (meta-reviewer veya ombudsman)
- İtiraz durumu herkes tarafından takip edilebilir (trace ID ile izle)
- Cevaplama süresi metriği halka açık ("ortalama itiraz yanıt süresi: X saat")

---

## 9. CANLI ORGANİZMA: PLATFORM SAĞLIK MONİTÖRÜ <a name="9-organizma"></a>

> **24 Mart 2026 — Raşit'in vizyonu:**
> "Her verinin doğruluk oranının %98'lere çıktığı bir ortam hayal ediyorum.
> Sistem otomatik görecek neresi kanıyor, neresi yaralı, nerede problem var.
> İleri görüşlü olacak. Göstermekle kalmayıp insanları bu problemleri çözmeye
> DAVET eden, canlı bir organizma gibi bir yapı."

### 9.1 Sürekli İzleme Paneli (Herkesin Görebildiği)

Platform sürekli şunları izler ve HERKESE gösterir:

```
📊 VERİ KALİTESİ
├── Genel doğrulama oranı: %94.2 (hedef: %98+)
├── Alan bazlı:
│   ├── Hukuki belgeler: %96.1 ✅ (sağlıklı)
│   ├── Entity doğrulama: %93.8 ✅ (sağlıklı)
│   ├── Finansal belgeler: %72.4 ⚠️ (UZMAN EKSİKLİĞİ — yardım lazım!)
│   ├── Görsel analiz: %81.2 ⚠️ (geliştirilmeli)
│   └── Timeline yerleştirme: %89.5 ✅ (iyi)
├── İtiraz oranı: %3.1 (sağlıklı aralık: %1-5)
├── AI doğruluk oranı: %76.8 (karantinadan geçen AI çıkarımları)
└── Ortalama consensus süresi: 4.2 saat

👥 TOPLULUK SAĞLIĞI
├── Aktif incelemeci: 234
├── Tier dağılımı: 180 çaylak, 38 araştırmacı, 12 analist, 3 uzman, 1 küratör
├── Ortalama kalibrasyon: %82.4
├── Günlük tamamlanan görev: 1,247
├── Streak ortalaması: 8.3 gün
└── Gönüllü memnuniyeti: (anonim anket) %87

⚠️ KANAYAN BÖLGELER (Yardım Lazım!)
├── 🔴 Finansal belgeler: 47 görev bekliyor, sadece 3 finans uzmanı aktif
├── 🟡 Türkçe belgeler: 12 belge çeviri/inceleme bekliyor, 2 Türkçe bilen aktif
├── 🟡 Consensus oluşmayan görevler: 8 görev 72+ saattir kararsız
└── 🟢 Tüm diğer alanlar sağlıklı
```

### 9.2 Akıllı Görev Yönlendirme (Bağışıklık Sistemi)

Platform sadece problemi GÖSTERMEZ — insanları ÇÖZMEYE DAVET EDER:

```
SENARYO: Finansal belgeler %72.4 doğrulama oranında (hedef altı)

SİSTEMİN OTOMATİK TEPK:
1. Finansal görevlerdeki kalibrasyon %85+ olan kullanıcılara:
   "📊 Şu an 14 finansal belge incelemeci bekliyor.
    Finans alanında kalibrasyon skorun %87 — bu alanda uzman sayılırsın.
    Bu görevlere bakmak ister misin? Bonus XP: ×1.5"

2. Finans uzmanı eksikse, yakın alandaki kullanıcılara eğitim sunumu:
   "💡 Finansal belge analizi modülü açıldı!
    3 eğitim görevi tamamla → finans görevlerine erişim kazan
    (Bu alan şu an toplulukta en çok ihtiyaç duyulan alan)"

3. Haftalık etki raporu:
   "Bu hafta senin incelemelerin sayesinde:
    - 3 yanlış bilgi ağa girmeden engellendi
    - 7 doğru bağlantı keşfedildi
    - Finans alanı doğrulama oranı %72 → %78'e yükseldi ← SENİN KATKÍN"
```

### 9.3 İleri Görüşlü Uyarı Sistemi (Prediktif)

Sistem sadece mevcut durumu göstermez — GELECEĞİ de tahmin eder:

- **Darboğaz tahmini:** "Bu hızda giderse 3 gün içinde hukuk alanında görev birikmesi olacak"
- **İncelemeci churn tahmini:** "Son 2 haftada 5 araştırmacı aktifliğini azalttı — retention riski"
- **Kalite düşüş erken uyarısı:** "Yeni katılan 20 kullanıcının kalibrasyon ortalaması %61 — eğitim modülü önerilir"
- **Saldırı erken tespiti:** "Aynı IP bloğundan 8 yeni hesap açıldı — Sybil uyarısı"

### 9.4 Topluluk İyileştirme Görevleri

Sistem "kanayan bölgeleri" görev kartlarına dönüştürür:

```
🩹 İYİLEŞTİRME GÖREVİ (ÖZEL BONUS):
Tip: Topluluk Sağlığı
Alan: Finansal Belge İnceleme
Durum: 47 görev bekliyor, %72.4 doğrulama oranı (hedef: %90+)
Bonus: ×2.0 XP (acil ihtiyaç çarpanı)
Gereksinim: Finans alanında kalibrasyon %75+

[KABUL ET →]
```

Bu yapı organizmayı tamamlar: **acı → sinyal → bağışıklık → iyileşme → daha güçlü.**

---

## 10. KULLANICI GÜVENLİĞİ VE BASKIYA DAYANIKLILIK <a name="10-guvenlik-kullanici"></a>

> **24 Mart 2026 — Raşit'in sözü:**
> "Bize gönül verenleri sonsuz koruma sağlıyoruz. Onların canı bizim canımız.
> Birimiz hepimiz için, hepimiz birimiz için!"
>
> "İnsanlar yarın 'ya başıma bir şey gelirse' diye düşünemeyecek bile,
> o kadar net ve doğru bir inşa olmalı her şey."
>
> "Bu olay doğa değiştirir cinsten, bazı olayların da düzenini değiştirecek şekilde.
> O yüzden biz bize gönül verenleri sonsuz koruma sağlıyoruz."

### 10.1 Kimliksizlik Mimarisi (En Güçlü Kalkan)

```
PLATFORM NE BİLİR:
├── Fingerprint hash (cihaz kimliği — kişi değil)
├── Tier seviyesi
├── Kalibrasyon geçmişi
├── Davranış profili (nasıl incelediğini — KİM olduğunu değil)
└── Pseudonim handle (isteğe bağlı)

PLATFORM NE BİLMEZ:
├── Gerçek isim
├── Konum (IP loglanmaz, özellikle yüksek riskli ülkelerde)
├── Meslek
├── Motivasyon
└── Diğer hesaplarla bağlantı

DIŞARIDAN BAKAN NE GÖRÜR:
├── "REV-a3f7b2-Tier3 bu entity'yi onayladı"
├── Gerekçe metni (anonim)
├── Tier seviyesi
└── Kalibrasyon skoru (genel, kişiyi tanımlamaz)
```

**Prensip:** Bilmediğin şeyi veremezsin. Platform kullanıcının kim olduğunu bilmiyorsa,
mahkeme kararı gelse bile verecek veri yoktur. Bu en güçlü kalkan.

### 10.2 Oy Gizliliği

- Bir kişinin hangi node'a nasıl oy verdiği TOPLU İSTATİSTİKLERDE görünür ama
  BİREYSEL olarak izlenemez
- "Bu node'a 47 kişi baktı, 41'i onayladı" → GÖRÜNÜR
- "41'in kim olduğu" → GÖRÜNMEZ
- Gerekçeler görünür, kimin yazdığı görünmez (sadece tier seviyesi)

### 10.3 Coğrafi Koruma (RSF Endeksi Entegrasyonu)

- RSF Basın Özgürlüğü Endeksi'ne göre yüksek riskli ülkeler (TR, RU, IR, CN, SA):
  - Aktivite desenleri DAHİ loglanmaz
  - VPN/Tor kullanım önerisi gösterilir
  - DMS (Dead Man Switch) otomatik önerilir
  - Check-in aralıkları daha kısa (günlük)
  - Alarm tetikleme eşiği daha düşük (48 saat yerine 36 saat)
- Düşük riskli ülkeler: standart koruma

### 10.4 Temiz Çıkış (Clean Exit)

- Hesap silme isteği → ANINDA işleme alınır
- Silinen hesabın gerekçeleri ve oyları KALIR (şeffaflık için zorunlu)
- AMA hiçbir şekilde eski hesaba bağlanamaz (fingerprint hash silinir, yeni hash üretilir)
- Silme işlemi GERİ ALINMAZ — kullanıcı bunu bilir
- Yeni hesap açılabilir ama sıfırdan başlar (eski güven/XP transfer edilmez)

### 10.5 Baskı Altında Hesap (Duress Mode) — **NET YAPIYORUZ**

> **"Bunu net yapıyoruz."** — Raşit, 24 Mart 2026

Bir kullanıcı zorlama altında hesabına giriş yapmak zorunda kalırsa:

```
NORMAL GİRİŞ:                    PANIK KODU İLE GİRİŞ:
┌─────────────────────┐          ┌─────────────────────┐
│ Gerçek veriler       │          │ SAHTE DASHBOARD      │
│ Gerçek geçmiş        │          │ İnandırıcı sahte     │
│ Gerçek incelemeler   │          │ veri gösterilir       │
│                      │          │ Arka planda:          │
│                      │          │ ⚠️ SİLENT ALARM      │
│                      │          │ → Kefillere bildirim  │
│                      │          │ → Hesap dondurma      │
│                      │          │ → Kanıt güvenliği     │
└─────────────────────┘          └─────────────────────┘
```

**Teknik detay:**
- Kullanıcı hesap oluştururken "panik kodu" belirler (normal şifreden/magic link'ten farklı)
- Panik kodu ile giriş yapıldığında:
  1. Dashboard normal görünür ama tüm veriler SAHTE (inandırıcı ama zararsız)
  2. Arka planda sessiz alarm tetiklenir
  3. Kefillerine (Kolektif Kalkan) bildirim gider
  4. Gerçek inceleme geçmişi anında şifrelenir ve erişilemez hale gelir
  5. Baskı altındaki kişinin "temiz" görünmesi sağlanır
- Zorlayan kişi farkı ANLAYAMAZ — dashboard gerçek gibi görünür

### 10.6 Vicarious Trauma Koruması (Sprint 9'dan miras, genişletilmiş)

- Günde max 2 saat hassas içerik inceleme
- Zorunlu soğuma periyotları (10 görev → 5dk mola)
- "Bu görevi atla" her zaman mümkün (sıfır ceza)
- Haftalık anonim wellness anket
- İçerik önizleme (bulanık) + opt-in gösterim
- Otomatik uyarı: "Bugün 1.5 saat hassas içerik inceledin. Mola zamanı. 🫂"

---

## 11. HUKUKİ KONUM VE ALGI ÇERÇEVESİ <a name="11-hukuki"></a>

> **24 Mart 2026 — Raşit ile kesinleşen hukuki çerçeve:**
> "Bizim hukuki ağırlığını kesinlikle değerlendirmemiz lazım bu olayların.
> Nasıl bakmalıyız olaya, nasıl bir algı çizmeliyiz hem kişisel güvenlik hem
> de kamu güvenliği/sağlığı için?"

### 11.1 Biz Ne DEĞİLİZ (Çok Net)

```
❌ BU PLATFORM BİR MAHKEME DEĞİLDİR.
❌ HİÇBİR ZAMAN "X KİŞİSİ SUÇLUDUR" DEMEZ.
❌ YARGILAMA YAPMAZ.
❌ CEZA VERMEZ.
❌ KİMSEYİ SUÇLAMAZ.
```

### 11.2 Biz Ne İZ (Çok Net)

```
✅ BELGELERİ DÜZENLEYEN BİR ARŞİV
✅ BİLGİYİ DOĞRULAYAN BİR ALTYAPI
✅ HERKESİN ERİŞEBİLDİĞİ BİR KÜTÜPHANE
✅ ŞEFFAF BİR KAYNAK ZİNCİRİ
```

**Analoji:** Elektrik şirketi — ışığı yakıyoruz, ışıkla ne yapılacağına insanlar karar veriyor.
Posta servisi — mektupları taşıyoruz, içerikten sorumlu değiliz, ama karantina sayesinde
"körü körüne yayınlayan" da değiliz.

### 11.3 Neden Bu Platform Gazeteciden DAHA GÜÇLü Kanıt Zinciri Üretir

Tek bir gazetecinin soruşturması:
- Genellikle 1-3 kaynak
- Kişisel yorum içerir
- Editör kontrolü (1-2 kişi)
- Kaynak zinciri genellikle gizli

Bu platformun doğrulanmış verisi:
- Her adım kayıtlı (provenance) → biricik kod ile izlenebilir
- Her karar gerekçeli → gerekçe herkese açık
- Her gerekçe başkaları tarafından denetlenmiş → çapraz kontrol
- Güven seviyesi hesaplanmış ve şeffaf → formül açık
- İtiraz mekanizması açık → düzeltilebilir
- Minimum 2 bağımsız onay → tek kişi yanlılığı yok

**Sonuç:** Bu platformdaki "doğrulanmış" etiketli bir bilgi, dijital kanıt zinciri olarak
gazeteciliğin "anonim kaynağa göre" modelinden çok daha güçlüdür. Mahkemelerde
"dijital kanıt zinciri" standardına yaklaşır.

### 11.4 Yasal Güvenli Dil Politikası

Platform hiçbir yerde şunları KULLANMAZ:
- "X suçludur" → bunun yerine: "X, [belge adı] belgesinde [bağlam] ile geçmektedir"
- "Kanıtlanmıştır" → bunun yerine: "N kaynak tarafından doğrulanmıştır (güven: %XX)"
- "Kesin" → bunun yerine: "Mevcut veriler ışığında"
- "Suç ortağı" → bunun yerine: "Belgelenmiş bağlantı (tür: [tür], kaynak: [kaynak])"

### 11.5 Sorumluluk Beyanı (Her Sayfada Görünür)

> "Bu platform kamusal belgeleri düzenleyen ve topluluk tarafından doğrulanan bir
> araştırma aracıdır. Buradaki bilgiler hukuki yargı niteliği taşımaz. Her veri
> noktasının güven seviyesi, kaynağı ve doğrulama geçmişi şeffaf olarak
> gösterilmektedir. Kullanıcılar kendi değerlendirmelerini yapmaları için
> davet edilmektedir."

### 11.6 Sprint 18 Uyumu

Bu bölüm, Sprint 18'de tamamlanan "Legal Fortress" araştırmasıyla tam uyumludur:
- AI sınırlılık açıklaması (GDPR + yasal savunma) → **yapılacak**
- Kullanıcı hata bildirimi formu → **meta-inceleme ile entegre**
- Olay müdahale planı → **itiraz sistemi ile entegre**
- Sigorta → **Raşit sorumluluğunda, lansman öncesi**
- Yanlılık testi → **kalibrasyon sistemi bunu doğal olarak sağlıyor**

---

## 12. DAVRANIŞ PROFİLLEME VE AKILLI ATAMA <a name="12-profilleme"></a>

### 12.1 Kullanıcı DNA'sı (Sistem Ne Biliyor)
Sistem kullanıcının KİM olduğunu bilmez — ama NASIL davrandığını bilir:

```
Kullanıcı #A7X9:
  accuracy_finance: 0.91      # Finansal görevlerde çok başarılı
  accuracy_legal: 0.67        # Hukuki görevlerde orta
  accuracy_entity: 0.85       # Entity doğrulamada iyi
  accuracy_visual: 0.42       # Görsel analizde zayıf
  response_speed: "deliberate" # Düşünerek cevaplıyor (hızlı tıklamıyor)
  pattern: "balanced"          # Ne sürekli onaylıyor ne sürekli reddediyor
  streak_days: 23             # 23 gündür aktif
  calibration_accuracy: 0.88  # Calibration sorularında %88 doğru
  trust_weight: 2.1           # Oy ağırlığı
```

### 12.2 Akıllı Görev Atama
- Sistem bu profili okuyarak görev atar:
  - Finansal görev → accuracy_finance yüksek olanlara
  - Ama %30 rastgele → zayıf alanlarda da test et (gelişim fırsatı)
  - Zor görevler → yüksek accuracy + yüksek streak olanlara
  - Kritik görevler (hassas belgeler) → sadece uzman tier + yüksek calibration
  - Takılınan belgeler (çoğu kişinin hata yaptığı) → en yüksek accuracy olanlara

### 12.3 "İnce İşleri Ustasına Ver" Prensibi
- Risk seviyesine göre görev dağıtımı:
  - Düşük risk (entity ismi doğrulama) → herkese
  - Orta risk (ilişki türü belirleme) → Analyst+ tier
  - Yüksek risk (hassas belge, mağdur bilgisi) → Expert+ tier, calibration %90+
  - Kritik risk (ağa yeni node ekleme) → Küratör + 2 bağımsız uzman onay

---

## 13. ATMOSFER VE SİNEMATİK DENEYİM <a name="13-atmosfer"></a>

### 13.1 Renk Dili

| Mod/Rol | Ana Renk | Vurgu | His |
|---------|----------|-------|-----|
| Finans | Koyu Mavi (#0a1628) | Yeşil (#22c55e) | Bloomberg Terminal |
| Hukuk | Bordo (#4a0e0e) | Altın (#d4a017) | Mahkeme odası |
| Gazetecilik | Koyu Gri (#1a1a1a) | Turuncu (#f97316) | Newsroom / Bellingcat |
| Genel | Siyah (#030303) | Kırmızı (#dc2626) | Mevcut Truth estetiği |
| Duo/Multi | Koyu Mor (#1a0a2e) | Cyan (#06b6d4) | Operasyon odası |

### 13.2 Tipografi Semiyotiği
- **Courier New (monospace):** "Gizli belge" hissi — tüm platform temel fontu
- **Serif (Georgia/Times):** Hukuki belgeler, resmi kayıtlar — otorite hissi
- **Sans-serif (Inter/System):** Modern analiz, dashboard'lar — temiz profesyonellik

### 13.3 Sinematik Tür Referansları (Rol Bazlı)
> Her rol bir SİNEMA TÜRÜ: atmosfer, tempo, gerilim seviyesi ona göre.

| Rol | Sinema Türü | Referans Film/Dizi | His |
|-----|-------------|-------------------|-----|
| Finans | Film Noir Paranoya | The Big Short, Billions, Ozark | "Herkes yalan söylüyor, parayı takip et" |
| Hukuk | Prosedürel Drama | A Few Good Men, The Wire, Making a Murderer | "Delil konuşur, sabırlı ol" |
| Gazetecilik | Belgesel Grittiness | All the President's Men, Spotlight, Citizenfour | "Kaynağını koru, gerçeği yaz" |
| Vatandaş | Dedektif Macera | Knives Out, Zodiac, Se7en | "İpuçlarını takip et, resmi gör" |

### 13.4 Ses Tasarımı (Gelecek Sprint)
- Ambient drone: düşük frekanslı, tema bazlı (finans = trading floor humu, hukuk = mahkeme sessizliği)
- Keşif anı: kısa, tatmin edici "ping" (Dark Souls bonfire hissi)
- Doğrulama: mekanik "stamp" sesi (Papers, Please onay damgası)
- Alarm: koridor tüneli gibi gerilim artışı (yeni kanıt bulunduğunda)

### 13.5 Çevresel Hikaye Anlatımı
- Return of the Obra Dinn'den: sessiz gemi + canlı flashback kontrastı
- Her belge bir "olay yeri" — açıldığında çevresinde bağlam bilgisi
- Ağdaki her node'un "odası" var — tıkladığında o kişinin dünyasına giriyorsun
- Mevcut Tünel sistemi (Sprint 14A) bu vizyonun prototipi

---

## 14. ETİK KIRMIZI ÇİZGİLER <a name="14-etik"></a>

### 14.1 Mağdur Koruma (EN ÖNCELİKLİ)
- Mağdur isimleri ASLA gösterilmez ("Witness A", "Victim #3")
- Reşit olmayan mağdurlarla ilgili fotoğraflar ASLA platforma girmez
- CSAM tespiti: Thorn/Safer API ile otomatik tespit → anında silme + NCMEC bildirimi
- Bu konu tartışmaya AÇIK DEĞİLDİR — sıfır tolerans

### 14.2 Vicarious Trauma (İkincil Travma)
- Araştırma: İçerik moderatörlerinin %60'ı güvenlik önlemleri olmadan PTSD belirtileri gösteriyor
- Çözümler:
  - Günde max 2 saat hassas içerik inceleme
  - Zorunlu mola hatırlatıcıları
  - Haftalık anonim wellness anket
  - İçerik önizleme (bulanık) + opt-in gösterim
  - "Bu görevi atla" her zaman mümkün (ceza yok)

### 14.3 Doxxing Önleme + Yasal Risk (2026 Güncel)
> **YASAL UYARI:** Section 230 koruması çatlıyor. Meta/YouTube/TikTok "tasarım bazlı davalar"la
> karşı karşıya — platform mimarisi TEKLİFSİZ zarara yol açıyorsa, Section 230 korumaz.
> Eğer platformumuz doxxing'i kolaylaştırıyorsa: ürün sorumluluğu davaları, eyalet sivil
> sorumluluk davaları, federal cezai kovuşturma riski.

**Mimari Önlemler:**
- Platform üzerinden hareket çağrısı YASAK
- "Bu kişiyi bulun" tarzı görevler YOK — sadece "bu belgedeki bilgiyi doğrulayın"
- Kişisel adres, telefon, aile bilgisi gösterilmez
- Araştırma çıktıları kamuya açık bilgilerle sınırlı (mahkeme kaydı, basın haberi)
- Herkese açık profil YOK (anonim handle'lar)
- Kişisel bilgilerin kolay kopyalanması ENGELLENİR
- Belgelerde PII otomatik bulanıklaştırma
- **Illinois Civil Liability for Doxing Act** — mağdurlar dava açabilir
- **Texas** — cezai suçlamalar, özel adres paylaşımı suç
- **Federal** — cyberstalking + nefret suçu yasaları

### 14.4 Conspiracy Weaponization Önleme
- Zorunlu rakip hipotez: tek yönlü sonuç çıkaramazsın
- Güvenilirlik barı: her iddia görünür confidence score taşır
- "Doğrulanmamış" etiketi büyük ve net
- Sonsuz tavşan deliği yok: soruşturmaların test edilebilir sonucu olmalı
- Moderasyon: topluluk tarafından flag'lenen içerik hızlı incelemeye girer

---

## 15. TEKNİK MİMARİ <a name="15-teknik"></a>

### 15.1 Yeni Veritabanı Tabloları (Önerilen)

```sql
-- Görev sistemi
investigation_tasks (
  id UUID PRIMARY KEY,
  task_type TEXT,           -- entity_verify, relationship_link, timeline_place, document_analyze, hypothesis
  difficulty INT,           -- 1-5
  role_affinity TEXT,       -- finance, legal, journalism, general
  source_document_id UUID,  -- Hangi belgeden geldi
  source_quarantine_id UUID,-- Karantinadan mı geldi
  known_answer JSONB,       -- Calibration ise doğru cevap (NULL = gerçek görev)
  assigned_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  consensus_result JSONB,   -- Final consensus
  created_at TIMESTAMPTZ
)

-- Görev atamaları
task_assignments (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES investigation_tasks,
  user_fingerprint TEXT,
  mode TEXT,                -- solo, duo_open, duo_friend, multi
  partner_fingerprint TEXT, -- Duo modunda eşleşen kişi
  response JSONB,           -- Kullanıcının cevabı
  response_time_ms INT,     -- Cevaplama süresi
  is_calibration BOOLEAN,   -- Bu bir calibration sorusu muydu?
  is_correct BOOLEAN,       -- Calibration ise doğru mu?
  created_at TIMESTAMPTZ
)

-- Kullanıcı profili (davranış bazlı, anonim)
investigator_profiles (
  fingerprint TEXT PRIMARY KEY,
  tier TEXT DEFAULT 'novice',
  xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_active_date DATE,
  accuracy_scores JSONB,    -- {finance: 0.91, legal: 0.67, ...}
  calibration_accuracy FLOAT DEFAULT 0.5,
  trust_weight FLOAT DEFAULT 0.1,
  behavior_flags JSONB,     -- {rubber_stamping: false, contrarian: false, ...}
  total_tasks_completed INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  specializations TEXT[],   -- ['finance', 'entity_resolution']
  created_at TIMESTAMPTZ
)

-- Duo eşleştirme geçmişi
duo_match_history (
  id UUID PRIMARY KEY,
  fingerprint_a TEXT,
  fingerprint_b TEXT,
  task_id UUID,
  match_type TEXT,          -- open, friend
  agreement BOOLEAN,        -- İkisi de aynı cevabı mı verdi?
  created_at TIMESTAMPTZ
)

-- Arkadaş lobisi
friend_lobbies (
  id UUID PRIMARY KEY,
  creator_fingerprint TEXT,
  lobby_code TEXT UNIQUE,   -- 6 haneli katılım kodu
  member_fingerprints TEXT[],
  max_members INT DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)
```

### 15.2 Mevcut Sistemlerle Entegrasyon

```
data_quarantine (Sprint 17) ──→ investigation_tasks (otomatik görev üretimi)
document_derived_items (Sprint 16) ──→ investigation_tasks (AI çıkarımları → insan doğrulaması)
badge_tiers (Sprint 6A) ──→ investigator_profiles (tier sistemi)
reputation_transactions (Sprint 6A) ──→ XP sistemi (mevcut itibar = XP'ye dönüşür)
nodes + links (mevcut) ──→ consensus sonrası promote (onaylanan entity → ağa eklenir)
```

### 15.3 Görev Üretim Pipeline'ı

```
1. TARA Protocol → document_derived_items → data_quarantine
2. Quarantine Processor → investigation_tasks üretir:
   - Her entity → "Bu entity doğru mu?" görevi
   - Her relationship → "Bu ilişki gerçek mi?" görevi
   - Her date → "Bu tarih doğru mu?" görevi
3. Calibration Generator → bilinen cevaplı görevler ekler (%20)
4. Task Assigner → kullanıcı profiline göre görev dağıtır
5. Consensus Engine → 2+ bağımsız onay → ağa ekleme
```

---

## 16. UYGULAMA YOL HARİTASI <a name="16-yolharitasi"></a>

### Sprint G1 — "Temel Motor" (2 hafta)
- [ ] investigation_tasks + task_assignments + investigator_profiles tabloları
- [ ] Task generation pipeline (quarantine → tasks)
- [ ] Calibration question generator (bilinen cevaplı görevler)
- [ ] Temel görev kartı UI (entity doğrulama)
- [ ] Solo mod çalışır halde

### Sprint G2 — "Kalite Kontrol" (1 hafta)
- [ ] Calibration accuracy tracking
- [ ] Davranış anomali tespiti (rubber stamping, contrarian, speed check)
- [ ] Accuracy-based trust weight hesaplama
- [ ] XP + streak sistemi
- [ ] Tier ilerleme (novice → researcher → analyst)

### Sprint G3 — "Duo Modu" (2 hafta)
- [ ] Açık eşleştirme sistemi (rastgele, rotasyonlu)
- [ ] Bağımsız değerlendirme + karşılaştırma UI
- [ ] Arkadaş lobisi (lobby code, tek oy kuralı)
- [ ] Assist mekaniği (kredi paylaşımı)
- [ ] Bilgi asimetrisi görevleri (biri belge, diğeri ağ)

### Sprint G4 — "Rol Dünyaları" (2 hafta)
- [ ] 4 rol atmosferi (renk, tipografi, araç seti)
- [ ] Rol bazlı görev dağıtımı (%70/%30 kuralı)
- [ ] Skill tree UI (görsel ilerleme haritası)
- [ ] Cross-training bonus mekaniği

### Sprint G5 — "Multi + Hackathon" (2 hafta)
- [ ] 3-6 kişilik takım sistemi
- [ ] Operasyon odası UI
- [ ] Takım leaderboard
- [ ] Hackathon modu (zamanlı sprint)

### Sprint G6 — "Polish + Beta Test" (1 hafta)
- [ ] Raşit + Claude ilk 2 kullanıcı olarak tüm sistemi test eder
- [ ] 239 quarantine kaydı → gerçek görevlere dönüştürülür
- [ ] Entity resolution sonuçları → ağa promote
- [ ] İlk "soruşturma gecesi" etkinliği

---

## 17. KATMANLI MİMARİ: SOYMA YAKLAŞIMI (Peeling Architecture) <a name="17-katmanli"></a>

> **v5 — 24 Mart 2026:** Bu bölüm "mükemmel güvenlik tuzağı" analizinden doğdu.
> Kök sorun: 1000 kullanıcılık mekanizmalar tasarladık ama 10 kullanıcıyla başlıyoruz.
> Çözüm: Mekanizmaları kullanıcı sayısına göre katmanla. Takvime göre değil, veriye göre aç.

### 17.1 Felsefe: "Arka Plan Mükemmel Güvenlik, Ön Plan Kuş Gibi Su Gibi"

Platform güvenliğini bir buzdağı gibi düşün:
- **Suyun üstü (kullanıcının gördüğü):** Basit, sezgisel, 2 dakikada anlaşılır arayüz
- **Suyun altı (arka plan):** 15+ güvenlik mekanizması sessizce çalışıyor

Kullanıcı hiçbir güvenlik katmanını HİSSETMEMELİ:
- Staking var ama "dereceli mod" diye sunuluyor
- Honeypot var ama kullanıcı hangisinin test olduğunu bilmiyor
- Şifreleme var ama kullanıcı sadece "giriş yap" diyor, gerisini tarayıcı hallediyor
- Sybil tespiti var ama kullanıcı sadece normal görev yapıyor

**En iyi güvenlik görünmez güvenliktir.**

**"50 Kilit Evi" Uyarısı:** Bir evin 50 kilidi, 10 kamerası, dikenli teli var — dünyanın
en güvenli evi. Ama misafir 50 kilidi açmak zorunda. Kimse gelmez.
Aynı şey platform için geçerli: çok adım = çok engel = kimse kullanmaz.
Güvenli ama boş bir platform, güvensiz bir platformdan bile işe yaramaz.

### 17.2 Dört Katman

#### KATMAN 0 — "TOHUM" (0-50 Kullanıcı)

**Aktif Mekanizmalar:**
- Basit çoğunluk oylaması (3 bağımsız review, salt çoğunluk)
- Kalibrasyon soruları (honeypot, %15-20 oranında)
- Etki görünürlüğü ("Senin doğruladığın 3 entity soruşturmada kullanıldı")
- Gerekçe zorunluluğu (boş cevap kabul edilmez)
- Editöryal kontrol (kurucu ekip son söz)

**Devre Dışı:**
- Staking yok — insanları korkutma, motiveli ilerlesinler
- Quadratic voting yok — 10 kişide anlamsız
- Conviction voting yok — topluluk yok ki sabırlı olsun
- Bridging consensus yok — uzmanlık grupları yeterli değil
- Half-life decay yok — herkes zaten yeni
- Sybil detection yok — elle kontrol yeterli

**Güvenlik:** Editöryal kontrol (biz) + honeypot = yeterli.
10-50 kişiyle herkes birbirini tanır, manipülasyon zaten zor.

**Motivasyon Kaynağı:** Puan veya leaderboard DEĞİL.
Araştırma bulgusu: İnsanları en çok motive eden şey "senin çalışman kullanıldı"
görmek (%88 motivasyon oranı — FromThePage araştırması). Etki görünürlüğü bedava
ve güçlü: "Doğruladığın entity Epstein soruşturmasında kullanıldı" (link ile).

**Kullanıcı Deneyimi:** 2 dakikada sistemi anlar. Gör → İncele → Gerekçe yaz → Gönder.

#### KATMAN 1 — "FİLİZ" (50-200 Kullanıcı)

**Yeni Aktif:**
- Opsiyonel staking ("Dereceli Mod" — detay Bölüm 18)
- Trust weight (3 katmanlı basit versiyonu: kalibrasyon + tier + streak)
- Şifreli Investigation Path (client-side — detay Bölüm 19)
- Half-life decay (6 aylık çürüme)
- Temel anomali tespiti (hız, rubber-stamping)

**Kullanıcı Deneyimi:** "Normal Mod"da hiçbir şey değişmez.
"Dereceli Mod" isteyenler stake eder, ağırlıklı oy hakkı kazanır.
Kimse zorlanmaz, ciddi olanlar ödüllendirilir.

#### KATMAN 2 — "AĞAÇ" (200-1000 Kullanıcı)

**Yeni Aktif:**
- Quadratic voting (jeton ekonomisi — detay Bölüm 21)
- Bridging consensus (farklı uzmanlık grupları hemfikir olmalı)
- Sybil detection (coğrafi + temporal + tier çeşitlilik analizi)
- 5 katmanlı trust weight (kalibrasyon %35, çapraz doğrulama %25, gerekçe %15, tutarlılık %15, alan uzmanlığı %10)
- Meta-review hiyerarşisi (Normal → Trusted → Ombudsman)

#### KATMAN 3 — "ORMAN" (1000+ Kullanıcı)

**Yeni Aktif:**
- Conviction voting (zamanla büyüyen oy gücü — detay Bölüm 21)
- Tam anomali algılama (koordineli saldırı, ring detection)
- Federe gazeteci doğrulaması (W3C DID + RSF/CPJ)
- Platform sağlık monitörü tam otonom (bağışıklık sistemi)
- Topluluk kendi kendini yönetecek ölçeğe ulaşmış

### 17.3 Katman Geçiş Kuralları

Katman geçişi TAKVİME GÖRE DEĞİL, VERİYE GÖRE yapılır:

```
KATMAN 0 → 1: 50+ aktif kullanıcı VE 500+ tamamlanan görev VE 30+ gün geçmiş
KATMAN 1 → 2: 200+ aktif kullanıcı VE 5000+ tamamlanan görev VE 3+ ay geçmiş
KATMAN 2 → 3: 1000+ aktif kullanıcı VE 50000+ tamamlanan görev VE 6+ ay geçmiş
```

"Aktif kullanıcı" = son 30 günde en az 1 görev tamamlayan.
Geçiş otomatik ama tersine çevrilebilir — kullanıcı sayısı düşerse katman da düşer.

### 17.4 Neden Bu Sıralama?

| Mekanizma | Neden Erken Değil? |
|-----------|-------------------|
| Staking | Yeni kullanıcıları korkutur, katılım krizi yaratır |
| Quadratic voting | <50 kişide jeton ekonomisi çalışmaz |
| Conviction voting | Topluluk olmadan "sabır" anlamsız |
| Bridging consensus | Uzmanlık grupları yeterli olmadan tek boyutlu kalır |
| Sybil detection | 10 kişide herkes birbirini tanır, gerek yok |
| Half-life decay | İlk 50 kullanıcıda herkes yeni, çürütecek bir şey yok |

---

## 18. STAKİNG MEKANİZMASI: "DERECELİ MOD" <a name="18-staking"></a>

> **v5 — 24 Mart 2026:** Raşit'in "dereceli oyun" konsepti + akademik doğrulama.
> Polymarket: staking → +%20 doğruluk. Stack Overflow: 5000+ rep → %92 doğruluk.
> Ethereum 2.0: slashing → %99.5 validatör dürüstlük. AMA: katılım etkisi ölçülmemiş.
> Çözüm: Staking opsiyonel, Katman 1'de (50+ kullanıcı) devreye girer.

### 18.1 Soğuk Başlangıç Çözümü (Cold Start)

**Problem:** Staking, itibar puanı gerektirir. Yeni kullanıcının itibarı 0.
%10'u = 0. Sıfır stake = skin in the game yok = mekanizma çalışmaz.

**Çözüm — Üç Aşamalı Giriş:**

```
AŞAMA 1 — "EĞİTİM" (İlk 10 görev):
├── Stake yok, kayıp yok
├── 50 başlangıç itibar puanı (güven kredisi)
├── Kalibrasyon ölçülüyor (ama ceza yok)
├── Her görevde gerekçe yazma alışkanlığı kazandırılır
└── Bitişte: "Doğruluk oranın: %82. Tebrikler, eğitimi tamamladın!"

AŞAMA 2 — "ÇIRAKLIK" (10-30. görev):
├── Yumuşak staking: itibarın %5'i
├── Kayıp sadece %30 (tam %70 yerine)
├── Hâlâ öğrenme aşaması
└── İlk gerçek "etki" bildirimleri gelmeye başlar

AŞAMA 3 — "TAM KATILIM" (30+ görev):
├── Normal staking oranları aktif
├── Dereceli mod kullanılabilir
└── Trust weight sistemi tam devrede
```

### 18.2 İki Mod: Normal vs Dereceli

**Normal Mod (Herkes):**
- Stake yok, kayıp yok
- Oy ağırlığı: düşük (temel tier çarpanı)
- Motivasyon: etki görünürlüğü + keşif anları
- Hedef kitle: meraklı, casual katılımcılar

**Dereceli Mod (Opsiyonel):**
- Stake gerekli (tier bazlı)
- Oy ağırlığı: yüksek (stake × trust weight çarpanı)
- Motivasyon: daha ağırlıklı oy + alan uzmanlığı kanıtlama
- Hedef kitle: ciddi araştırmacılar, gazeteciler

**Kullanıcı bu mesajı görür:**
> "Dereceli Mod'a hoş geldin. Burada incelemelerine itibar puanı stake ediyorsun.
> Doğru çıkarsa kazanırsın, yanlış çıkarsa kaybedersin.
> İncelmelerin daha ağırlıklı sayılır. Hazırsan başlayalım."

### 18.3 Tier Bazlı Stake Oranları

| Tier | Stake Oranı | Max Stake | Gerekçe |
|------|------------|-----------|---------|
| Novice (Tier 1) | İtibarın %10'u | 20 puan | Düşük risk, öğrenme aşaması |
| Researcher (Tier 2) | %20 | 100 puan | Orta sorumluluk |
| Analyst (Tier 3) | %25 | 300 puan | Yüksek güç = yüksek sorumluluk |
| Senior (Tier 4) | %30 | 500 puan | Ciddi ağırlık = ciddi kayıp riski |
| Expert (Tier 5) | %30 | 500 puan | Tavan — kimse tüm itibarını stake edemez |

### 18.4 Asimetrik Ödeme Yapısı

```
Doğru çıkarsa:  Stake'in %30'u bonus (+12 puan, 40 stake ise)
Yanlış çıkarsa:  Stake'in %70'i kayıp (-28 puan, 40 stake ise)
Tartışmalı:      Stake dondurulur → itiraz süreci → sonuca göre iade veya kayıp
```

**Matematik — Neden Bu Oranlar?**

```
Dürüst kullanıcı (%80 doğruluk):
  Beklenen değer = 0.80 × (+12) + 0.20 × (-28) = 9.6 - 5.6 = +4.0 puan/görev ✅

Rastgele tahmin (%50 doğruluk):
  Beklenen değer = 0.50 × (+12) + 0.50 × (-28) = 6.0 - 14.0 = -8.0 puan/görev ❌

Kötü niyetli (%30 doğruluk — kasıtlı yanlış):
  Beklenen değer = 0.30 × (+12) + 0.70 × (-28) = 3.6 - 19.6 = -16.0 puan/görev ❌❌
```

**Sonuç:** Dürüst davranmak KAZANDIRIR. Rastgele tahmin BATTIRIR. Kötü niyet ÇÖKERTIR.
Oranlar v4'teki %100 kayıptan %70'e düşürüldü — katılım krizi önlenmesi için.

### 18.5 İtiraz Sistemi: Evrensel ve Adil

**Problem:** "Dürüst hata vs kötü niyet" ayırımı pratikte imkansız.
Akıllı saldırgan mükemmel gerekçe yazabilir. Önceden ayırt etmek çalışmaz.

**Çözüm:** Ayırt etmeye çalışma. Herkese aynı kuralı uygula, itiraz hakkı ver.

```
ADIM 1: Yanlış çıkan herkes aynı cezayı alır (%70 stake kaybı)
ADIM 2: HERKES itiraz hakkına sahip (günde max 3 itiraz)
ADIM 3: İtiraz süreci:
  ├── Kullanıcı şifreli loglarını AÇAR (kendi seçtiği kısımları — Bölüm 19)
  ├── Gerekçesini gösterir: "Bu belgeye dayanarak karar verdim"
  ├── Tier 3+ panel inceler (en az 3 kişi)
  └── Karar: HAKLI → tam iade + %10 bonus | HAKSIZ → itiraz hakkı 30 gün askı
```

**Neden Bu Daha İyi?**
- Dürüst hata yapan: İtiraz eder, loglarında mantıklı gerekçe var → iade alır
- Kötü niyetli: İtiraz eder AMA loglarında tutarsızlık, kaynak yokluğu, pattern var → reddedilir
- **Ayırma işini önceden değil SONRADAN yapıyoruz** — sonradan çok daha kolay çünkü VERİ var

Mahkeme sistemi gibi: herkes aynı yargılanır, ama itiraz hakkın var. Adalet bu.

### 18.6 Galileo Mekanizması (Haklı Azınlık Ödülü)

Çoğunluk yanlış, azınlık haklıysa — ve bu sonradan kanıtlanırsa:

```
Haklı azınlık ödülü: Normal ödülün ×3.0 katı
Koşul: Yeni kanıt/belge ile önceki konsensüs bozulmuş olmalı
```

Bu mekanizma "herkes onaylıyor, ben de onaylayayım" köle zihniyetini kırar.
Bağımsız düşünen ve HAKLI çıkan kişi ödüllendirilir.

---

## 19. ŞİFRELİ SORUŞTURMA GÜNLÜĞÜ (Investigation Path) <a name="19-investigation-path"></a>

> **v5 — 24 Mart 2026:** Raşit'in kesin kararı: "Biz bile bulamamalıyız."
> Bu platformun en güçlü silahı: teknik olarak imkansız olması.
> "Veremeyiz" değil, "VERMEMİZ TEKNİK OLARAK İMKANSIZ."

### 19.1 Felsefe: Biz Bile Kör

Signal modeli: uçtan uca şifreleme. Platform kör. Hükümet gelip veritabanını alsa
gördüğü: `aGVsbG8gd29ybGQ=` — anlamsız baytlar.

Bu hukuki olarak çok güçlü bir pozisyon:
- "Veremiyoruz çünkü politikamız bu" → mahkeme zorlar
- "Veremiyoruz çünkü TEKNİK OLARAK İMKANSIZ" → mahkeme bile zorlayamaz

### 19.2 Teknik Mimari

```
1. Kullanıcı platforma girer
2. Tarayıcıda şifreleme anahtarı üretilir (Web Crypto API — AES-256-GCM)
3. Anahtar SADECE kullanıcının cihazında kalır (localStorage veya IndexedDB)
4. Her soruşturma aksiyonu → şifrelenir → sunucuya şifreli blob gönderilir
5. Sunucu depolar ama OKUYAMAZ
6. Kullanıcı kendi logunu tarayıcıda açar (anahtar cihazda)
```

**Sunucu deposu:**
```json
{
  "user_pseudonym_hash": "sha256(fingerprint)",
  "encrypted_blob": "U2FsdGVkX1+vupppZksvRf...",
  "blob_size": 4821,
  "created_at": "2026-03-24T15:30:00Z"
}
```

Sunucu bildiği: bir kullanıcı var, bir şey kaydetti, ne kadar büyük, ne zaman.
Sunucu BİLMEDİĞİ: ne yaptı, hangi belgeyi inceledi, ne karar verdi, gerekçesi ne.

### 19.3 İtiraz İçin Seçici Paylaşım

İtiraz anında kullanıcı:
1. Kendi cihazında logunu açar (anahtarı kendinde)
2. İLGİLİ kısmı seçer (tüm geçmişini değil, sadece o görevle ilgili kayıtları)
3. Seçtiği kısmı şifresiz olarak itiraz paneline gönderir
4. Panel Tier 3+ üyeler tarafından incelenir

**Kullanıcı KENDİ bilgisinin ne kadarını paylaşacağına KENDİSİ karar verir.**

### 19.4 Anahtar Kaybı Senaryosu

Kullanıcı cihazını kaybederse / tarayıcı verisini silerse:
- Log'a erişim kaybolur (geri dönüşü YOK — bu bir FEATURE, bug değil)
- Yeni cihazda yeni anahtar üretilir, yeni log başlar
- Eski şifreli bloblar sunucuda kalır ama sonsuza kadar okunamaz
- İtiraz hakkı etkilenir: log gösteremezsen gerekçe sunamazsın

Bu bir trade-off: güvenlik > kullanılabilirlik. Bu bilinçli bir karar.

### 19.5 UX Tasarımı: Son Soruşturma Blogu

Kullanıcının profil sayfasında:

```
┌─────────────────────────────────────────────┐
│ 📋 SORUŞTURMA GÜNLÜĞÜM                     │
├─────────────────────────────────────────────┤
│ ▼ Son Soruşturma — 24 Mart 2026            │
│   ├── Görev: "Maxwell-Pilot ilişkisi"       │
│   ├── Kararım: DOĞRULADI ✅                 │
│   ├── Gerekçem: "Uçuş kayıtları, Belge #47"│
│   ├── Sonuç: Topluluk DOĞRULADI (%87)       │
│   ├── Kazanım: +12 itibar                   │
│   └── [İTİRAZ ET] [DETAY]                   │
│                                              │
│ ▶ Önceki — 23 Mart 2026 (3 görev)          │
│ ▶ Önceki — 22 Mart 2026 (5 görev)          │
│ ▶ Önceki — 20 Mart 2026 (2 görev)          │
└─────────────────────────────────────────────┘
```

Tümü şifreli. Sadece kullanıcının cihazında okunabilir.
Başkası profilini görse: "Bu kullanıcı 34 soruşturma tamamladı" — ama ne yaptığını göremez.

---

## 20. KALİBRASYON EVRENİ <a name="20-kalibrasyon"></a>

> **v5 — 24 Mart 2026:** "Sanki bizim sistem için üretilmiş bu sorular kafayı yicem"
> hissini veren kalibrasyon sistemi. Tek vaka önyargısı çözümü: 4 kategori.
> Topluluk soru önerisi: "her soru bir bakış açısıdır."

### 20.1 Dört Kategori, Derin Kapsam

Tek vakadan soru üretmek → alan önyargısı. Çözüm:

| Kategori | Konu | Kaynak Örnekleri |
|----------|------|-----------------|
| Finans Suçları | Para akışı, offshore, yaptırım ihlali | ICIJ Panama/Pandora Papers, OpenSanctions |
| İnsan Ticareti/İstismar | Epstein tipi vakalar, trafficking | Mahkeme tutanakları, PACER, victim depositions |
| Siyasi Yolsuzluk | Rüşvet, kara para, etki ağları | FOIA belgeleri, lobbyist kayıtları |
| Kurumsal Suç | Dolandırıcılık, vergi kaçırma, kartel | SEC filings, whistleblower raporları |

**Başlangıç:** Her kategoriden 25 soru = toplam 100 kalibrasyon sorusu.
**Hedef:** Her kategoriden 100'er soru = toplam 400 (topluluk önerileriyle büyür).

### 20.2 Soru Kalitesi Standartları

Her kalibrasyon sorusu şu kriterleri karşılamalı:

1. **Belgelenmiş cevap:** "Maxwell v. USA, Exhibit GX-1517, Sayfa 3, Satır 12" seviyesinde kaynak
2. **Tek doğru cevap:** Tartışmaya açık olmayan, kanıtlanmış bağlantılar
3. **Mini-soruşturma hissi:** Belge göster → soru sor → kullanıcı incelesin → cevap versin → doğru cevabı aç
4. **Zorluk derecelendirmesi:** 1-5 arası (kolay entity tespiti → karmaşık ilişki analizi)
5. **Niyeti ölçen keskinlik:** Doğru cevap belgede AÇIKÇA var — reddeden ya okumamış ya kötü niyetli

### 20.3 Honeypot Entegrasyonu

Her 6-7 görevden biri gizli kalibrasyon sorusu.
Zooniverse araştırması: honeypot doğruluğu ↔ gerçek veri doğruluğu R² = 0.87 (güçlü korelasyon).

```
Honeypot doğruluğu < %80 → Uyarı + günlük görev limiti 5'e düşer
Honeypot doğruluğu < %60 → Yeniden eğitim modu (10 görev eğitim)
Honeypot doğruluğu < %40 → Dereceli mod askıya alınır
```

### 20.4 Alan Bazlı Yönlendirme (Akıllı Görev Dağıtımı)

Kalibrasyon sadece ölçmez, YÖNLENDİRİR:

```
Kullanıcı Ali:
  - Finans soruları: %95 doğruluk ← Güçlü alan
  - İnsan ticareti: %72 doğruluk
  - Siyasi yolsuzluk: %68 doğruluk
  - Kurumsal suç: %80 doğruluk

Görev dağıtımı: %70 finans + %30 diğer (cross-training bonusu)
```

Zamanla herkes en iyi olduğu alanda çalışır. Sistem hem ölçer hem yönlendirir.

### 20.5 Topluluk Soru Önerisi Sistemi

> Raşit: "Her soru bir bakış açısıdır."

**3 Katmanlı Soru Havuzu:**

```
KATMAN 1 — SORU HAVUZU (Herkes önerebilir):
├── Kullanıcı soru yazar + kaynak gösterir + zorluk önerir
├── Soru otomatik olarak "önerilen sorular" havuzuna düşer
└── Spam filtresi (minimum gerekçe uzunluğu, kaynak zorunlu)

KATMAN 2 — TOPLULUK OYLAMASI:
├── Önerilen sorular topluluk tarafından oylanır
├── "Bu soru iyi mi?" + "Cevap doğrulanabilir mi?" iki eksen
├── En çok oy alanlar yukarı çıkar
└── Ortak alan: "Yeni sorular sisteme girmemiş ama girebilir olanlar"

KATMAN 3 — SİSTEME EKLEME:
├── En yukarıdaki soruları editöryal ekip inceler
├── Kaynak doğrulaması yapılır
├── Zorluk kalibre edilir (test grubu ile)
└── Onaylanan soru sisteme eklenir → öneren kişiye bonus itibar
```

**"Yaratıcı Sorular Evreni":** Bu sadece kalibrasyon değil — topluluk zekasının haritası.
Birisi "Maxwell'in pilotla ilişkisi neydi?" sorusunu öneriyorsa, bu o kişinin ağa
NEREDEN baktığını gösteriyor. Farklı bakış açıları = ağın farklı köşelerinin aydınlanması.

**Fayda döngüsü:** Soru öner → topluluk oyla → editör ekle → sistem iyileşsin →
daha iyi kalibrasyon → daha doğru sonuçlar → daha güçlü platform.
Hem öğretici hem topluluk faydası — herkes kazanır.

---

## 21. İLERİ OY MEKANİZMALARI <a name="21-oy"></a>

> **v5 — 24 Mart 2026:** Quadratic + Conviction Voting — ikisi de onaylandı.
> İkisi birlikte saldırı maliyetini 3-4× artırır. Katman 2-3'te devreye girer.

### 21.1 Quadratic Voting (Karesel Oylama) — Katman 2

**Mekanizma:** Oy gücü lineeer DEĞİL, KARELİ artar.

```
1 oy = 1 jeton
2 oy = 4 jeton
3 oy = 9 jeton
n oy = n² jeton
```

**Neden?** Manipülasyon maliyetini %75 artırır.
- Lineer oylama: Saldırgan $5K harcar → başarılı
- Quadratic: Saldırgan $12.5K harcar → başarısız (2.5× daha pahalı, 4× daha zor)

**Gerçek dünya kanıtı:** Colorado eyaleti 2019'da $10M bütçeyi quadratic ile dağıttı.
Sonuç: daha geniş konsensüs, daha az kutuplaşma, parti-arası iş birliği artışı.

**Aylık jeton bütçesi:**
```
Tier 1: 10 jeton/ay
Tier 2: 20 jeton/ay
Tier 3: 30 jeton/ay
Tier 4: 40 jeton/ay
Tier 5: 50 jeton/ay
```

Güçlü oy = pahalı oy. Kimin neye ne kadar önem verdiğini gerçekten ölçer.

### 21.2 Conviction Voting (İnanç Oylaması) — Katman 3

**Mekanizma:** Oy gücü zamanla büyür.

```
conviction(t) = balance × (1 - (1 - aylik_oran)^t)

2 aylık yarı ömür ile:
Gün 1:  conviction = 100 × 0.50  = 50
Gün 7:  conviction = 100 × 0.75  = 75
Gün 30: conviction = 100 × 0.875 = 87.5
Gün 60: conviction = 100 × 0.984 = 98.4
```

**Neden?** Flash-attack'ları İMKANSIZ kılar.
Saldırgan hızlı sonuç ister ama sistem yavaş hareket eder.
30 gün boyunca koordineli saldırı = lojistik kabus (özellikle pseudonim sistem).

**Gerçek dünya kanıtı:** 1Hive DAO 2 yıldır conviction voting kullanıyor.
Sonuç: **SIFIR başarılı flash-attack.** Sıfır.

### 21.3 Acil Durum İstisnası

**Problem:** Conviction voting sabır ister, gazetecilik HIZLIDIR.
Aktif suç belgesi yüklendiğinde 30 gün beklemek hayat meselesi olabilir.

**Çözüm:** Acil Durum Protokolü:
```
1. Tier 3+ kullanıcı "ACİL" flag'i atar
2. En az 2 Tier 3+ kullanıcı aciliyeti ONAYLAR
3. Conviction voting bypass → hızlı oylama (48 saat)
4. Sonuç: 3+ Tier 3 hemfikirse → VERIFIED (normal süreç atlanır)
5. Suistimal: Sahte acil flag → ciddi itibar cezası
```

### 21.4 Dış Teşviklere Karşı Savunma — "İmkansız Demeliler"

Birisi $1 milyon teklif etse bile başarısız olmasını garanti eden 4 katman:

**Katman 1 — KİMİ BULACAK?**
Kullanıcılar pseudonim. Birbirlerini tanımıyor. Platform da bilmiyor.
"Şu kişiyi satın al" diyemezsin çünkü kim olduğunu bilmiyorsun.

**Katman 2 — BİR KİŞİ YETMEZ:**
Minimum 3 bağımsız review. Farklı coğrafyalardan. Farklı uzmanlık alanlarından.
Tek kişiyi satın almak yetmez — 3'ünü bulman lazım, ama kim olduklarını bilmiyorsun.

**Katman 3 — ZAMANLA MÜCADELE:**
Conviction voting: 30 gün boyunca 3+ kişiyi koordine et, hiçbirinin
kimliğini bilmeden. Lojistik olarak imkansıza yakın.

**Katman 4 — DENETİM İZİ:**
Anomali algılama: "3 kişi aynı 2 saatte aynı entity'yi onayladı" → otomatik flag.
Kalıp tespiti: aynı IP bloğu, aynı saat, aynı hedef → Ombudsman inceleme.

**Saldırganın hesabı:**
Kim olduğunu bilmediğim + nerede olduğunu bilmediğim + beni tanımayan
3+ kişiyi + 30 gün boyunca koordine etmem lazım + sistem anomali algılarsa
hepsi yanar. Başarı oranı: <%5. **Ekonomik olarak anlamsız.**

---

## KAYNAKLAR

### Akademik
- Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience
- Cooper, S. et al. (2010). "Predicting protein structures with a multiplayer online game" Nature 466
- Dreyfus, H. & Dreyfus, S. (1980). "A Five-Stage Model of the Mental Activities Involved in Directed Skill Acquisition"
- Elo, A. (1978). The Rating of Chessplayers, Past and Present

### Platform Analizi
- Bloomberg Terminal UX Research (bloomberg.com/company/stories)
- Bellingcat Online Investigation Toolkit (bellingcat.gitbook.io/toolkit)
- ICIJ Panama Papers Tech Stack (icij.org/investigations/panama-papers)
- Galaxy Zoo Citizen Science (zooniverse.org)
- Foldit Protein Folding Game (fold.it)

### Güvenlik
- CIA Structured Analytic Techniques Tradecraft Primer (cia.gov)
- Wikipedia Anti-Vandalism Systems (en.wikipedia.org/wiki/Wikipedia:Dealing_with_coordinated_vandalism)
- Sybil Attack Prevention (imperva.com/learn/application-security/sybil-attack)
- Boston Marathon Reddit Case Study (cjr.org/analysis)
- QAnon Game Design Analysis (medium.com/curiouserinstitute)

### Oyun Tasarımı
- Dark Souls Asynchronous Multiplayer (timleonard.uk/reverse-engineering-dark-souls-3)
- Death Stranding Social Strand System (deathstranding.fandom.com)
- Keep Talking and Nobody Explodes (keeptalkinggame.com)
- Return of the Obra Dinn Environmental Storytelling
- Escape Room Championship Design (erchamp.com)

### Staking & Oylama (v5)
- Polymarket prediction accuracy with staking (+20% accuracy improvement)
- Stack Overflow reputation-accuracy correlation (rep>5000 → 92% accuracy)
- Ethereum 2.0 slashing economics (99.5% validator honesty)
- Zooniverse speed rewards anti-pattern (-28% accuracy with speed incentives)
- Colorado Quadratic Voting experiment 2019 ($10M budget allocation)
- 1Hive Conviction Voting (2 years, zero successful flash-attacks)
- FromThePage volunteer motivation survey (88% impact-driven, 8% points-driven)
- Wikipedia WikiCup cancellation (gamification → 40% quality decrease)
- Twitter Community Notes pilot (XP removed → 15% accuracy increase)
- Condorcet Jury Theorem (voter accuracy thresholds: p>0.55 for consensus)
- Bayesian Truth Serum — Prelec (2004) subjective evaluation scoring

---

> **Son Söz:**
>
> Bu doküman yaşayan bir belgedir. Her yeni araştırma, her test, her kullanıcı geri bildirimi
> ile güncellenecektir. Ama temel prensip asla değişmeyecek:
>
> **"Eğlenirsin ama sistemi kandıramazsın."**
>
> **"Arka plan mükemmel güvenlik, ön plan kuş gibi su gibi."**
>
> **"Gerçek veriler. Gerçek soruşturma. Gerçek keşifler."**
>
> — Raşit Altunç & Claude, 24 Mart 2026 (v5)
