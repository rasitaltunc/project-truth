# PROJECT TRUTH — 5 DERİN ARAŞTIRMA PROMPT'U

> Her bir prompt'u ayrı bir Deep Research oturumunda kullan.
> Çıktıları `docs/research/` klasörüne kaydet.
> Tüm araştırmalar tamamlanınca Opus'a sentez yaptıracağız.

---

## ARAŞTIRMA 1: ARAŞTIRMACI GAZETECİLERİN DÜNYASI

### Prompt:

```
Sen bir platform tasarım araştırmacısısın. Amacım, araştırmacı gazetecilerin (investigative journalists) karmaşık güç ağlarını — organize suç, yolsuzluk, insan ticareti, kara para aklama gibi konuları — soruştururken kullandıkları araçları, iş akışlarını ve karşılanmamış ihtiyaçlarını derinlemesine anlamak.

Şu konuları araştır:

**1. Mevcut Araç Ekosistemi**
- Bellingcat, ICIJ (International Consortium of Investigative Journalists), OCCRP (Organized Crime and Corruption Reporting Project) gibi kuruluşlar hangi dijital araçları kullanıyor?
- Maltego, i2 Analyst's Notebook, Palantir Gotham, Linkurious, Neo4j, Gephi — bu araçların her birinin güçlü ve zayıf yönleri nedir?
- Gazeteciler bu araçların hangilerinden memnun, hangilerinden şikayetçi? (Maliyet, öğrenme eğrisi, işbirliği zorluğu, kapalı kaynak olma...)
- ICIJ'nin Datashare ve Linkurious kullanımı nasıl çalışıyor? Panama Papers, Pandora Papers soruşturmalarında hangi teknoloji stack'i kullanıldı?

**2. İş Akışı Analizi**
- Bir araştırmacı gazeteci "sıfırdan" bir güç ağı soruşturmasına nasıl başlar?
- Veri toplama → doğrulama → görselleştirme → yayınlama pipeline'ı nasıl işliyor?
- Takım içi işbirliği nasıl yönetiliyor? (Belge paylaşımı, güvenli iletişim, erişim kontrolü)
- "Güvenli kaynak" (source protection) ve "anonim ihbar" (whistleblowing) mekanizmaları araçlara nasıl entegre ediliyor?

**3. Karşılanmamış İhtiyaçlar ve Acı Noktaları**
- Mevcut araçların en büyük eksiklikleri neler? (Gazeteci forumları, konferans konuşmaları, blog yazılarından örnekler ver)
- "Kolektif soruşturma" (collaborative investigation) konusundaki zorluklar neler? Birden fazla haber kuruluşunun aynı dosya üzerinde çalışması nasıl koordine ediliyor?
- Güvenlik endişeleri: Gazeteciler araçlara ne kadar güveniyor? Veri sızıntısı, meta-data takibi, devlet gözetimi gibi risklere karşı ne tür korumalar bekliyorlar?
- "Dead Man Switch" (gazeteci tutuklanır/öldürülürse verilerin otomatik yayınlanması) gibi mekanizmalara gerçekten ihtiyaç var mı? Bu konsept ne kadar yaygın?

**4. Doğrulama ve Güvenilirlik**
- Gazeteciler bir bilgiyi "doğrulanmış" olarak kabul etmek için hangi kriterleri kullanıyor?
- "On-the-record", "off-the-record", "background" gibi kaynak kategorizasyonları dijital ortama nasıl taşınabilir?
- Bir ağ görselleştirme aracında "bu bağlantı doğrulanmış", "bu iddia doğrulanmamış" gibi güvenilirlik katmanları nasıl tasarlanmalı?
- Doğrulama badge'leri (resmi belge, mahkeme kaydı, sızıntı, tanık ifadesi) gazeteciler için anlamlı mı?

**5. Yayınlama ve Etki**
- Gazeteciler araştırmalarını nasıl görselleştirip yayınlıyor? (İnteraktif web deneyimleri, statik infografikler, video anlatımlar...)
- ICIJ'nin "Offshore Leaks Database" ve "Power Players" gibi interaktif araçları nasıl tasarlandı? Kullanıcı deneyimi nasıl?
- Bir platformun "embed" özelliği (gazeteye entegre edilebilir widget) ne kadar değerli?

**6. Ödeme ve İş Modeli**
- Gazeteciler/haber kuruluşları bu tür araçlara ne kadar ödeme yapıyor?
- Freemium vs. kurumsal lisans modelleri nasıl çalışıyor?
- Açık kaynak araçlar (Aleph, FollowTheMoney) gazeteciler arasında ne kadar yaygın? Avantaj ve dezavantajları?

Çıktı olarak şunu bekliyorum:
- Her konuda 3-5 sayfalık detaylı analiz
- Gerçek dünyadan örnekler ve case study'ler
- Direkt alıntılar ve kaynaklar (makale, konferans, blog, forum)
- Project Truth gibi bir platform için "gazeteci persona"sının özet profili: ne ister, neden gelir, ne zaman gider, ne ödemeye razı olur
```

---

## ARAŞTIRMA 2: OSINT TOPLULUĞU VE KOLEKTİF SORUŞTURMA

### Prompt:

```
Sen bir topluluk dinamikleri ve açık kaynak istihbarat (OSINT) araştırmacısısın. Amacım, OSINT topluluğunun — amatörden profesyonele — kolektif soruşturma yürütürken kullandığı araçları, motivasyonlarını, koordinasyon mekanizmalarını ve kalite kontrol sistemlerini derinlemesine anlamak.

Şu konuları araştır:

**1. OSINT Topluluğunun Anatomisi**
- OSINT topluluğu kimlerden oluşuyor? (Hobi araştırmacıları, eski istihbaratçılar, aktivistler, citizen journalists, akademisyenler...)
- r/OSINT, Trace Labs, Bellingcat Discord, OSINT Framework kullanıcıları — bu toplulukların büyüklüğü, aktivite düzeyi, demografisi nedir?
- "Citizen investigation" hareketi (MH17, Capitol Hill olayları, Rusya-Ukrayna savaşı açık kaynak istihbaratı) nasıl organize oluyor?
- Türkiye'de OSINT topluluğu var mı? Varsa ne kadar aktif? (Teyit.org, Doğruluk Payı, bağımsız araştırmacılar)

**2. Kolektif Soruşturma Mekanizmaları**
- Wikipedia modeli: Anonim katkı + topluluk denetimi + versiyon kontrolü — bu model soruşturma platformuna nasıl uyarlanabilir?
- Reddit "Boston Bomber" fiaskosunu hatırla — kolektif soruşturmanın karanlık tarafı: yanlış suçlamalar, mob justice, linç kültürü. Bu riskleri minimize etmek için hangi mekanizmalar gerekli?
- Bellingcat'in "Check" aracı ve "open verification" metodolojisi nasıl çalışıyor?
- ICIJ'nin 100+ ülkeden 600+ gazeteci koordinasyonu nasıl sağlıyor? Teknoloji, protokoller, güven mekanizmaları neler?

**3. Kalite Kontrolü ve Güven**
- "Herkesin katkı yapabildiği" bir platformda kaliteyi nasıl korursun?
- Stack Overflow'un reputation + moderation sistemi: Upvote/downvote, peer review, trusted user tiers — bunlar soruşturma platformuna nasıl uyarlanabilir?
- Wikipedia'nın "güvenilir kaynak" politikası ve edit war çözüm mekanizmaları
- "Swarming" problemi: Aynı konuya yüzlerce kişinin düzensiz katkı yapması nasıl yönetilir?
- Yanlış bilgi (misinformation) ile mücadele mekanizmaları: Fact-checking pipeline, dispute resolution, kanıt hiyerarşisi

**4. Motivasyon ve Katılım Tasarımı**
- İnsanlar neden bedavaya soruşturmaya katkı yapar? (İçsel motivasyon: adalet duygusu, merak, aktivizm / Dışsal motivasyon: tanınma, rozet, reputation)
- Gamification'ın (oyunlaştırma) ciddi bir soruşturma platformunda yeri var mı? Nerede etkili, nerede zararlı?
- "Dark pattern"lar: Kullanıcıları manipüle etmeden, etik yollarla katılımı artırma stratejileri
- Tükenmişlik (burnout): Travmatik içerikle sürekli uğraşan gönüllü araştırmacıları nasıl korursun?

**5. Araç ve Teknoloji Beklentileri**
- OSINT topluluğu hangi araçları kullanıyor? (Maltego CE, Shodan, Wayback Machine, Google Dorking, Overpass Turbo, social media scrapers...)
- Mevcut araçların entegrasyon eksiklikleri: Neden 10 farklı araç kullanmak zorundalar?
- "Tek platform" hayali: OSINT topluluğu her şeyi yapan bir platform istiyor mu, yoksa best-of-breed entegrasyon mu tercih ediyor?
- API ve veri paylaşımı: Araçlar arası veri akışı, standart formatlar (STIX/TAXII, OpenCTI, MISP)

**6. Hukuki ve Etik Sınırlar**
- OSINT'in yasal sınırları neler? (GDPR, kişisel veri, doxxing riski, mahremiyet hakları)
- "Halk mahkemesi" riski: Platformun kullanıcıları yanlış kişileri hedef alırsa ne olur? Hukuki sorumluluk kime ait?
- Platform olarak "güvenli liman" (safe harbor) koruması: Section 230 (ABD), DSA (AB) — ne tür yasal çerçeveler geçerli?

Çıktı olarak şunu bekliyorum:
- OSINT topluluğunun detaylı profili (kim, neden, nasıl)
- Kolektif soruşturma modelleri karşılaştırması (Wikipedia, Stack Overflow, Bellingcat, ICIJ)
- Kalite kontrol mekanizmaları tasarım önerileri
- Project Truth için "OSINT gönüllüsü persona"sı: motivasyonu, beklentisi, korkusu, platformdan ne zaman ayrılır
```

---

## ARAŞTIRMA 3: DOĞRULAMA KURULUŞLARI VE METODOLOJİ

### Prompt:

```
Sen bir doğrulama (fact-checking) metodolojisi uzmanısın. Amacım, dünya genelindeki fact-checking kuruluşlarının — Teyit.org, Snopes, PolitiFact, Full Fact, AFP Fact Check, Reuters Fact Check — kullandıkları doğrulama metodolojilerini, standartları ve bir platform ile nasıl entegre olabileceklerini derinlemesine anlamak.

Şu konuları araştır:

**1. Doğrulama Metodolojisi**
- IFCN (International Fact-Checking Network) standartları neler? Akredite olmanın koşulları?
- "Doğrulama" ile "soruşturma" arasındaki fark nedir? (Fact-checking vs. investigation — metodolojik farklılıklar)
- Teyit.org'un doğrulama süreci: Bir iddia nasıl alınır, nasıl incelenir, nasıl derecelendirilir?
- Snopes'un kaynak değerlendirme matrisi: Birincil kaynak, ikincil kaynak, üçüncül kaynak ayrımı
- Doğrulama dereceleri: "Doğru / Büyük ölçüde doğru / Karışık / Büyük ölçüde yanlış / Yanlış" — bu skalalar nasıl belirleniyor?

**2. ClaimReview Şeması ve Yapısal Veri**
- Google/Schema.org ClaimReview şeması nedir? Nasıl çalışır?
- Fact-checking kuruluşları ClaimReview'ı nasıl kullanıyor? Google Arama sonuçlarına nasıl entegre oluyor?
- Bir platform olarak ClaimReview üretmek ne anlama gelir? Hangi teknik altyapı gerekir?
- IFCN akreditasyonu almadan ClaimReview üretmek mümkün mü? Etkileri neler?

**3. Doğrulama Kuruluşlarının Platform Beklentileri**
- Fact-checker'lar hangi araçları kullanıyor? (Google Fact Check Tools, CrowdTangle, InVID, WeVerify, Truly Media)
- Mevcut araçların eksiklikleri neler?
- Bir ağ görselleştirme platformundan ne beklerler? (API entegrasyonu, veri export, atıf yapılabilirlik)
- "Otomatik doğrulama" (automated fact-checking) ne kadar ilerledi? NLP/AI ile claim detection ve evidence retrieval
- Doğrulama kuruluşlarının "kitle kaynaklı doğrulama" (crowdsourced verification) yaklaşımı: Bunu destekliyorlar mı, endişeli mi?

**4. Güvenilirlik Katmanları Tasarımı**
- Bir platform üzerindeki bilgiyi nasıl katmanlara ayırmalıyız?
  - Resmi belge (mahkeme kararı, şirket kaydı)
  - Gazetecilik çalışması (yayınlanmış soruşturma)
  - Topluluk katkısı (kullanıcı gönderimi)
  - Doğrulanmamış iddia
- Her katmanın görsel temsili nasıl olmalı? (Renk kodları, ikonlar, badge'ler)
- "Doğrulama zinciri" (chain of verification): Bir bilginin kaynağından platforma kadar izlenebilirliği nasıl sağlanır?
- Çelişkili bilgi yönetimi: Aynı konu hakkında çelişkili doğrulamalar olduğunda ne yapılır?

**5. Türkiye Özelinde Doğrulama Ekosistemi**
- Teyit.org, Doğruluk Payı, Malumatfuruş — Türkiye'deki doğrulama kuruluşlarının çalışma modeli
- Türkiye'deki medya ortamında doğrulama yapmanın zorlukları (basın özgürlüğü, erişim engelleri, siyasi baskı)
- Türk kullanıcıların "doğrulama" kavramına bakışı: Güveniyorlar mı? Teyit.org'a toplumun yaklaşımı?
- "Bağımsız doğrulama" ile "devlet kontrolü" arasındaki gerilim

**6. Entegrasyon ve İşbirliği Modelleri**
- Bir platform, doğrulama kuruluşlarıyla nasıl işbirliği yapabilir?
- API tabanlı entegrasyon: Platform verisi → Doğrulama kuruluşu → Doğrulama sonucu → Platforma geri
- "Doğrulama ortağı" (verification partner) modeli: Platform kullanıcı verisini, kuruluş doğrulama kapasitesini sağlar
- Doğrulama kuruluşlarının "bağımsızlık" hassasiyeti: Bir platformla ortaklık bağımsızlıklarını tehdit eder mi?

Çıktı olarak şunu bekliyorum:
- Doğrulama metodolojisinin kapsamlı bir haritası
- ClaimReview entegrasyon teknik rehberi
- Güvenilirlik katmanları tasarım önerisi (Project Truth'a özgü)
- "Fact-checker persona"sı: platformdan ne bekler, ne tür veri ister, entegrasyona ne kadar açık
```

---

## ARAŞTIRMA 4: AKADEMİSYENLER VE SOSYAL AĞ ANALİZİ

### Prompt:

```
Sen bir sosyal ağ analizi (Social Network Analysis - SNA) ve hesaplamalı sosyal bilimler (computational social science) araştırmacısısın. Amacım, güç ağlarını akademik perspektifle analiz eden araştırmacıların — sosyologlar, siyaset bilimciler, kriminologlar — iş akışlarını, araç beklentilerini ve "akademik ciddiyette" bir platformdan ne beklediklerini anlamak.

Şu konuları araştır:

**1. Sosyal Ağ Analizi (SNA) Ekosistemi**
- Akademisyenler SNA için hangi araçları kullanıyor? (Gephi, NetworkX, NodeXL, UCINET, Pajek, igraph, Cytoscape)
- Her aracın güçlü/zayıf yönleri: Gephi güzel ama ölçeklenmiyor, NetworkX güçlü ama görsel yok, NodeXL erişilebilir ama sınırlı...
- "Kodla analiz" (R/Python) vs. "görsel arayüzle analiz" (Gephi/NodeXL) — akademisyenler hangisini tercih ediyor? Neden?
- Graph veritabanları (Neo4j, TigerGraph, ArangoDB) akademik araştırmada ne kadar kullanılıyor?

**2. Güç Ağı Araştırmalarının Metodolojisi**
- "Elite network analysis", "power structure research", "dark network analysis" — bu alanların temel metodolojileri neler?
- Yolsuzluk ağları, organize suç ağları, terör ağları nasıl modelleniyor? (Valdis Krebs'in 9/11 ağ analizi gibi seminal çalışmalar)
- "İlişki tipi" (relationship type) taksonomisi: Finansal bağ, akrabalık, iş ortaklığı, siyasi ittifak, suç ortaklığı...
- Eksik veri (missing data) problemi: Gizli ağlarda tüm bağlantıları bilmek imkansız — akademisyenler bunu nasıl yönetiyor?
- "Merkezilik" (centrality) ölçütleri: Betweenness, closeness, degree, eigenvector — hangisi güç ağları için en anlamlı?

**3. Akademik Ciddiyette Platform Beklentileri**
- Bir platformun akademisyenler tarafından ciddiye alınması için ne gerekir?
  - Metodolojik şeffaflık (veri nereden geliyor, nasıl doğrulanıyor)
  - Atıf yapılabilirlik (DOI, kalıcı URL, veri setine referans verme)
  - Veri export formatları (GEXF, GraphML, CSV, JSON-LD, RDF)
  - Tekrarlanabilirlik (reproducibility): Aynı sorguyu tekrarlayınca aynı sonucu alabilme
  - Versiyon kontrolü: Ağ verisinin zaman içindeki değişimini izleme
- FAIR prensipleri (Findable, Accessible, Interoperable, Reusable) platformda nasıl uygulanır?
- "Linked Open Data" (LOD) ve Wikidata entegrasyonu ne kadar değerli?

**4. Kriminoloji ve Adli Analiz**
- Emniyet, savcılık, mali istihbarat birimleri (MASAK/FinCEN) ağ analiz araçlarını nasıl kullanıyor?
- i2 Analyst's Notebook ve Palantir'in "gold standard" olmasının sebebi ne? Açık kaynak alternatifleri neden tutmuyor?
- "Kanıt zinciri" (chain of evidence) kavramı: Dijital bir platformdaki veri mahkemede delil olarak kullanılabilir mi? Hangi standartları karşılamalı?
- "Dijital adli bilim" (digital forensics) ve ağ analizi kesişimi

**5. Çapraz Disiplin Potansiyeli**
- Siyaset bilimi: "Oligarşik ağlar", "captured state", "regulatory capture" — bu kavramlar ağ üzerinde nasıl modellenir?
- İktisat: "Beneficial ownership" (nihai faydalanıcı), offshore yapılar, shell company ağları — OpenOwnership ve BODS standardı
- İnsan hakları: Transitional justice, "truth commissions" (hakikat komisyonları) — Güney Afrika, Arjantin örnekleri — bu platformla ne ilgisi var?
- Çevre: Yasadışı madencilik, ormansızlaştırma ağları — Global Witness araştırmaları

**6. Akademik Yayın ve Etki**
- Bir platform, akademik yayınları nasıl destekleyebilir?
- "Data paper" konsepti: Veri setinin kendisinin yayınlanabilir bir akademik çıktı olması
- Akademik konferanslar (INSNA Sunbelt, NetSci, IC2S2) — bu topluluklar bir platformu nasıl keşfeder?

Çıktı olarak şunu bekliyorum:
- SNA araç ekosisteminin karşılaştırmalı analizi
- Güç ağı araştırma metodolojisinin özeti
- "Akademik ciddiyette platform" tasarım gereksinimleri listesi
- "Akademisyen persona"sı: araçtan ne bekler, ne zaman güvenir, ne zaman terk eder
```

---

## ARAŞTIRMA 5: GÜVEN MÜHENDİSLİĞİ VE PLATFORM TASARIMI

### Prompt:

```
Sen bir platform güven mimarisi (trust architecture) ve reputation ekonomisi tasarımcısısın. Amacım, çok taraflı platformlarda (multi-sided platforms) güvenin nasıl inşa edildiğini, reputation sistemlerinin nasıl tasarlandığını ve moderasyon mekanizmalarının en iyi pratiklerini derinlemesine anlamak — özellikle ciddi, yüksek riskli konularda (soruşturmacılık, doğrulama, adalet) çalışan platformlar için.

Bu araştırmayı şu bağlamda yap: Ben "Project Truth" adında bir platform inşa ediyorum. Bu platform, güç ağlarını (organize suç, yolsuzluk, kara para aklama vb.) 3D ağ görselleştirmesi ile haritalıyor. Gazeteciler, OSINT araştırmacıları, akademisyenler ve vatandaşlar katkı yapabiliyor. Platform, kanıt gönderme, doğrulama, peer review ve reputation ekonomisi içeriyor. 4 katmanlı badge sistemi var: Anonim → Platform Kurdu → Gazeteci → Kurumsal.

Şu konuları araştır:

**1. Reputation Ekonomisi Tasarımı**
- Stack Overflow'un reputation sistemi: Nasıl çalışır? Neden başarılı? Kritik tasarım kararları neler? (Jon Skeet problemi, gamification tuzakları, "rep farming")
- Wikipedia'nın "güven modeli": Adminlik, patrolling, semi-protection, full protection — kademeli erişim nasıl çalışıyor?
- Reddit'in karma + moderation + subreddit sistemi: Merkeziyetsiz moderasyonun avantaj ve dezavantajları
- Hacker News'in ranking algoritması ve "karma" sistemi: Basitliğin gücü
- eBay/Airbnb güven modeli: İki taraflı reputation — alıcı ve satıcı aynı anda değerlendirilir
- Kleros merkeziyetsiz yargılama: Schelling Point mekanizması, jüri seçimi, stake-based dispute resolution
- Augur/Polymarket gibi prediction market'ların güven mekanizmaları

**2. Staking ve Slashing Ekonomisi**
- Ethereum Proof-of-Stake'in staking/slashing modeli: Ekonomik güvenlik nasıl sağlanır?
- "Skin in the game" (Taleb): Karar vericilerin riskten pay alması neden kritik?
- Project Truth'un mevcut modeli: Kanıt gönderirken -5 puan yatırma, doğrulanırsa +15, reddedilirse -10. Bu denge doğru mu?
  - Çok cezalandırıcı mı? (İnsanları korkutup katılımı azaltabilir)
  - Yetersiz mi? (Spam'i önlemez)
  - Asimetrik risk: Ödülün cezadan büyük olması doğru mu?
- "Reputation bootstrap" problemi: Yeni kullanıcı sıfır puanla başlıyor — ilk katkıları nasıl teşvik edilir?
- "Wealth inequality" (servet eşitsizliği): Yüksek reputation'lı kullanıcıların aşırı güç kazanması nasıl önlenir?

**3. Moderasyon Mimarisi**
- "Content moderation at scale" problemi: Facebook, YouTube, Twitter/X nasıl yönetiyor? Hataları neler?
- "Distributed moderation": Her kullanıcının moderatör olabildiği model (Wikipedia, Reddit) vs. "centralized moderation" (Facebook)
- "Appeals process" (itiraz mekanizması): Yanlış moderasyon kararlarına karşı ne tür mekanizmalar gerekli?
- "Moderator burnout": Travmatik içerikle uğraşan moderatörlerin tükenmişliği — en iyi pratikler neler?
- AI-assisted moderation: İnsan + makine hibrit moderasyon modelleri. Avantajlar ve riskler.

**4. Anti-Abuse ve Sybil Saldırıları**
- "Sybil attack": Tek kişinin birden fazla hesapla sistemi manipüle etmesi nasıl önlenir?
- "Sockpuppet" detection: Wikipedia ve Stack Overflow'un yöntemleri
- "Coordinated inauthentic behavior" (Facebook'un tanımı): Organize manipülasyon tespit mekanizmaları
- IP fingerprinting, browser fingerprinting, behavioral analysis — etik sınırlar nerede?
- "Proof of personhood" yaklaşımları: Worldcoin iris tarama, BrightID sosyal grafik doğrulama, Idena AI testi

**5. Güven Katmanları ve Erişim Kontrolü**
- "Progressive trust" (kademeli güven) modeli: Kullanıcının zaman içinde daha fazla yetki kazanması
- "Circle of trust" modeli: Güvenilir kullanıcıların kefil olmasıyla yeni kullanıcıların güven kazanması (PGP web of trust'a benzer)
- "Compartmentalization" (bölümlendirme): Hassas bilgilere erişimi farklı güven seviyelerine göre kısıtlama
- "Need to know" prensibi: İstihbarat dünyasından platform tasarımına uyarlama
- "Revocation" (geri alma): Güven kötüye kullanıldığında badge/erişim nasıl geri alınır? İtiraz süreci?

**6. Platformun "Ruhunu" Koruma**
- "Eternal September" fenomeni: Kullanıcı tabanı büyüdüğünde kültürün seyrelmesi nasıl önlenir?
- "Community standards" (topluluk standartları): En etkili topluluk kuralları nasıl yazılır?
- "New user onboarding": İlk deneyimin platform bağlılığına etkisi — en iyi pratikler
- "Expert flight" (uzman kaçışı): Kalabalıklaşan ve kalitesi düşen platformlardan uzmanların ayrılması — Stack Overflow'da yaşananlar
- "Mission drift" (misyon sapması): Platformun amacından uzaklaşması nasıl önlenir?

**7. Hukuki ve Etik Çerçeve**
- Platform sorumluluğu: Kullanıcı içeriği için hukuki sorumluluk kime ait? (Section 230, DSA, Türkiye 5651)
- "Doxxing" riski: Kişisel bilgilerin ifşası — platform bunu nasıl önler?
- "Right to be forgotten" (unutulma hakkı): Bir kişi hakkındaki bilgilerin kaldırılma talebi
- GDPR uyumluluğu: Avrupa kullanıcıları için veri koruma gereksinimleri
- "Disinformation platform" olarak algılanma riski: Platformun kendisinin dezenformasyon aracına dönüşme riski nasıl yönetilir?

Çıktı olarak şunu bekliyorum:
- Reputation ekonomisi karşılaştırma tablosu (Stack Overflow, Wikipedia, Reddit, Kleros, eBay)
- Project Truth'un mevcut staking/slashing modelinin kritik değerlendirmesi ve optimizasyon önerileri
- Moderasyon mimarisi tasarım önerisi (kademeli, hibrit model)
- Anti-abuse mekanizmaları kontrol listesi
- "Platform güven mimarisi" blueprint'i — Project Truth'a özgü
```

---

## KULLANIM KILAVUZU

1. Her prompt'u **ayrı bir Deep Research oturumunda** kullan
2. Araştırma tamamlanınca çıktıyı `docs/research/` altına kaydet:
   - `docs/research/01_investigative_journalists.md`
   - `docs/research/02_osint_community.md`
   - `docs/research/03_fact_checking_methodology.md`
   - `docs/research/04_academic_sna.md`
   - `docs/research/05_trust_engineering.md`
3. 5 araştırma da tamamlanınca **Opus'a sentez yaptır** — tüm bulguları tek bir stratejik dokümanda birleştireceğiz
4. Sentez dokümanı, Sprint 6B ve ötesi için yol haritamız olacak

---

**Hazırlayan:** Opus
**Tarih:** 7 Mart 2026
**Amaç:** Project Truth'un hedef kitlesini — onların gözünden — tam olarak anlamak
