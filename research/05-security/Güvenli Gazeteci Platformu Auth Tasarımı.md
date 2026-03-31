# **Sıfır Hata ve Sıfır Risk Felsefesiyle Gazeteci Koruma ve İhbarcı Platformu Kimlik Doğrulama Mimarisi**

Devlet destekli siber casusluk faaliyetlerinin, gelişmiş kalıcı tehditlerin (APT) ve yargısız dijital gözetimin eşi görülmemiş bir boyuta ulaştığı günümüz tehdit ortamında, yüksek risk altındaki gazetecileri ve ihbarcıları korumak, geleneksel siber güvenlik paradigmalarının ötesine geçen bir yaklaşım gerektirmektedir. İsveç anayasası ve ilgili yasal çerçeveler tarafından güvence altına alınan kaynak koruma prensibi (*meddelarskydd*), ihbarcıların anonimliğini yasal olarak garanti altına alırken, bu yasal güvencenin kriptografik ve mimari bir gerçekliğe dönüştürülmesi zorunludur.1 Supabase, Next.js ve TypeScript teknolojileri üzerine inşa edilen bu platform; sıfır müsamaha, sıfır risk ve sıfır güven (Zero Trust) felsefesiyle tasarlanmış, uçtan uca savunma (defense-in-depth) stratejilerini uygulayan hibrit bir kimlik doğrulama ve yetkilendirme mimarisi sunmaktadır.

Sistem mimarisi, kimlik doğrulamayı yalnızca bir erişim kapısı olarak değil, her bir isteğin, her bir donanımın ve her bir veri paketinin sürekli olarak sorgulandığı dinamik bir yaşam döngüsü olarak ele almaktadır. Bu bağlamda, platformun üç ana kullanıcı katmanı olan anonim gözlemciler, pseudonim (takma adlı) hesaplar ve doğrulanmış gazeteciler için izole edilmiş, asimetrik şifreleme ve donanım tabanlı güvenlik kontrolleri içeren spesifik kimlik doğrulama akışları kurgulanmıştır.

## **A. Kimlik Doğrulama (Auth) Akışı**

Kullanıcı katmanlarının doğası gereği, platformun kimlik doğrulama akışı, tehdit yüzeyini en aza indirmek üzere hiyerarşik olarak yapılandırılmıştır. Anonim gözlemciler için hiçbir kimlik doğrulama süreci işletilmezken, platforma veri sağlayacak pseudonim hesaplar ve editoryal yetkilere sahip doğrulanmış gazeteciler için Parolasız (Passwordless) ve Kod Değişimi için Kanıt Anahtarı (PKCE) destekli Magic Link akışları ile donanım destekli WebAuthn mekanizmaları entegre edilmiştir.3 Geleneksel parolaların sistemden tamamen çıkarılması, kimlik bilgisi doldurma (credential stuffing) ve kaba kuvvet (brute force) saldırılarını tasarım aşamasında ortadan kaldırmaktadır.5

Platformun mimari diyagramı ve katmanlı erişim modeli, farklı kullanıcı tiplerinin sistemle nasıl etkileşime girdiğini açıkça tanımlar. Bu yapı, veri akışının her bir düğümünde uygulanan güvenlik politikalarının temelini oluşturur.

| Kullanıcı Katmanı | Kimlik Doğrulama Metodu | Erişim Seviyesi | Mimari Akış ve Karar Noktaları |
| :---- | :---- | :---- | :---- |
| Anonim Gözlemci | Kimlik Doğrulama Yok | Salt Okunur (Public) | Next.js App Router üzerinden statik/önbelleğe alınmış verilere erişim. Supabase GoTrue API'si tetiklenmez. Veritabanında anon rolü ile eşleşir. |
| Pseudonim Hesap | E-posta \+ Magic Link (PKCE) | Okuma / Sınırlı Katkı (Oy/Yorum) | İstemci code\_verifier üretir. Sunucu tek seferlik token gönderir. Tıklama sonrası Next.js Route Handler üzerinden JWT oluşturulur. |
| Doğrulanmış Gazeteci | E-posta \+ Magic Link \+ WebAuthn (FIDO2) \+ ZKP | Editoryal Yönetim / Hassas Veri | Çok Faktörlü Doğrulama (MFA). Donanım anahtarı (TPM/Secure Enclave) ile cihaz bağlama (Device Binding) zorunludur.6 |

### **Veri Akışı ve Magic Link PKCE Mekanizması**

Supabase GoTrue mimarisi üzerinde yapılandırılan Magic Link akışı, Man-in-the-Middle (MitM) ve oturum çalma saldırılarını engellemek için PKCE (Proof Key for Code Exchange) protokolünü zorunlu kılar.4 İstemci uygulaması, kimlik doğrulama sürecini başlatmadan önce yerel ortamda kriptografik olarak güvenli, rastgele bir code\_verifier dizgesi oluşturur. Bu dizge SHA-256 algoritması ile özetlenerek (hash) code\_challenge değerine dönüştürülür ve oturum açma isteği ile birlikte Supabase'e iletilir. Supabase, bu code\_challenge değerini geçici olarak kaydeder ve kullanıcının e-posta adresine tek kullanımlık, kısa ömürlü bir bağlantı (Magic Link) gönderir. Kullanıcı bağlantıya tıkladığında, Next.js sunucu bileşenleri devreye girer. İstemci, başlangıçta ürettiği şifrelenmemiş code\_verifier değerini sunucuya gönderir. Supabase, bu code\_verifier değerinin özetini alarak sistemde kayıtlı code\_challenge ile karşılaştırır. Eşleşme başarılı olursa, Access Token ve Refresh Token çifti oluşturularak güvenli bir HTTP çerezi (cookie) aracılığıyla istemciye teslim edilir.

### **Güvenlik Kontrolleri, Uç Durumlar ve Test Senaryoları**

Platformun dışa açık uç noktaları, hesap numaralandırma (account enumeration) saldırılarına karşı katı kontrollerle donatılmıştır. Bir saldırganın sistemde hangi e-posta adreslerinin kayıtlı olduğunu tespit etmesini engellemek amacıyla, Supabase GoTrue API'si, e-postanın veritabanında bulunup bulunmamasına bakılmaksızın sabit bir HTTP 200 OK yanıtı döndürür ve işlem süreleri rastgele gecikmeler (jitter) eklenerek eşitlenir.7 Böylece zamanlama (timing) analizi ile veri sızdırılması imkansız hale getirilir.

Buna ek olarak, kimlik doğrulama uç noktaları üç kademeli bir hız sınırlandırma (rate limiting) stratejisi ile korunur. Global seviyede Cloudflare Web Application Firewall (WAF) kuralları işletilirken, IP bazında Cloudflare Turnstile (Managed Challenge) devreye girerek otomatize bot ağlarını filtreler.8 Hesap bazında ise Supabase'in yerleşik hız sınırlayıcıları kullanılarak, belirli bir e-posta adresi için saatlik token üretim limiti uygulanır.

| Parametre | Olası Senaryo (Edge Case) | Sistemin Yanıtı ve Güvenlik Aksiyonu | Test ve Dayanıklılık Analizi |
| :---- | :---- | :---- | :---- |
| Eşzamanlı İstekler | Kullanıcının peş peşe 5 kez Magic Link talep etmesi. | Son talep dışındaki tüm token'lar geçersiz kılınır (Invalidation). Spama karşı IP bazlı hız sınırı (rate limit) uygulanır. | Otomatize komut dosyaları ile API'ye saniyede 100 istek atılır. WAF'ın IP'yi bloklaması ve sadece son token'ın geçerliliği doğrulanır. |
| Farklı Cihazdan Erişim | Bilgisayardan istenen Magic Link'in akıllı telefondan tıklanması. | PKCE akışı kullanıldığı için, akıllı telefonda orijinal code\_verifier bulunmaz. Doğrulama reddedilir, işlem iptal edilir.4 | Çapraz cihaz token değişimi testi. MitM saldırganı linki çalsa bile doğrulama aşamasını geçemediği kanıtlanır. |
| Hesap Numaralandırma | Saldırganın binlerce rastgele e-posta ile API'yi sorgulaması. | API her zaman aynı standart mesajı ve rastgele gecikmeli (jitter) yanıt süresini döner.7 | Zamanlama analizi (Timing Attack) araçlarıyla yanıt sürelerinin istatistiksel dağılımı ölçülür. P-value \< 0.05 hedeflenir. |

## **B. Session (Oturum) Yönetimi**

Bir gazetecinin veya ihbarcının cihazındaki oturum verisinin ele geçirilmesi, fiziksel güvenlik risklerine yol açabilecek kritik bir zafiyettir. Bu nedenle platform, yerel depolama (localStorage) veya oturum depolama (sessionStorage) mekanizmalarını tamamen reddederek, oturum yönetimini sunucu tarafı kontrollerle şifrelenmiş HTTP çerezlerine (cookies) devreder.4 Bu strateji, Çapraz Site Betik Çalıştırma (XSS) saldırılarını yapısal olarak etkisiz hale getirir.

### **Mimari Diyagram ve Token Stratejisi**

Oturum mimarisi, kimlik kanıtı için JSON Web Token (JWT) ve oturum yenileme için Opaque (Opak) Token kullanımını birleştiren çift token'lı bir sistemdir. JWT (Access Token), kullanıcının kimlik ve yetki verilerini (claims) barındıran ve her API isteğinde sunucu tarafından kriptografik olarak doğrulanan durumsuz (stateless) bir araçtır.11 Veritabanı sorgularından tasarruf etmek için JWT'nin ömrü kasıtlı olarak çok kısa (örneğin 15 dakika) tutulur. Opak Token (Refresh Token) ise kendi başına anlam ifade etmeyen, ancak veritabanındaki auth.sessions tablosunda karşılığı bulunan, uzun ömürlü (örneğin 7 gün) bir referans token'dır.

Token depolama stratejisinde, Next.js App Router mimarisi üzerinden ayarlanan çerezler mutlak surette httpOnly, Secure ve SameSite=Strict bayraklarına (flags) sahiptir.10 httpOnly bayrağı, istemci tarafındaki JavaScript kodlarının token'a erişimini tamamen engellerken, Secure bayrağı token'ın yalnızca HTTPS üzerinden iletilmesini garanti eder. SameSite=Strict ise, token'ın üçüncü taraf sitelerden gelen Çapraz Site İstek Sahteciliği (CSRF) isteklerinde tarayıcı tarafından gönderilmesini önler.12

### **Veri Akışı ve Refresh Token Rotasyonu**

Oturumun devamlılığı, Refresh Token Rotasyonu (Refresh Token Rotation) mekanizması ile sağlanır. Kısa ömürlü Access Token'ın süresi dolduğunda, Next.js Middleware veya Server Action, mevcut Refresh Token'ı Supabase'e gönderir. Sistem bu talebi aldığında eski Refresh Token'ı veritabanında kalıcı olarak geçersiz (revoked) kılar ve kullanıcıya tamamen yeni bir Access ve Refresh Token çifti verir.11

Eğer bir saldırgan bir şekilde Refresh Token'ı ele geçirir ve kullanmaya çalışırsa, sistem Token Hırsızlığı Tespiti (Token Theft Detection) algoritmasını devreye sokar. Kullanılmış (iptal edilmiş) bir Refresh Token ile tekrar yenileme talebi geldiğinde, Supabase bu durumu bir güvenlik ihlali olarak algılar ve o token ailesine (token family) ait tüm aktif oturumları anında sonlandırır.13 Asıl kullanıcı da sistemden atılır ve yeniden kimlik doğrulaması yapmaya zorlanır, böylece saldırganın erişimi anında kesilir.

### **Güvenlik Kontrolleri, Uç Durumlar ve Test Senaryoları**

Sistem, eşzamanlı oturum limitleri (concurrent session limits) konusunda sıfır tolerans politikası izler. Doğrulanmış bir gazetecinin aynı anda yalnızca tek bir cihazda aktif oturumu olabilir. Yeni bir oturum başlatıldığında, Supabase üzerindeki özel bir tetikleyici (Postgres Trigger), auth.sessions tablosunu tarayarak aynı user\_id'ye sahip önceki tüm oturumları tespit eder ve geçersiz kılar.14 Oturum sonlandırma stratejisi, sadece çıkış (logout) işlemiyle sınırlı değildir. Parola değişikliği, yetki seviyesinin güncellenmesi veya IP adresinin radikal bir şekilde değişmesi gibi anomali durumlarında, auth.sessions tablosundaki ilgili satırlar derhal silinerek mutlak oturum iptali (absolute session invalidation) sağlanır.15

| Oturum Politikası | Uygulama Mekanizması ve Kriterler | Güvenlik Dayanıklılık Analizi |
| :---- | :---- | :---- |
| Expiration (Süre Aşımı) Stratejisi | Pseudonimler için *Sliding Expiration* (etkileşim oldukça uzar). Gazeteciler için *Absolute Expiration* (maksimum 12 saat, etkileşime bakılmaksızın zorunlu MFA tekrarı).11 | Absolute Expiration, uykuya bırakılmış ve açık unutulmuş cihazların ele geçirilmesi riskini minimize eder. |
| Concurrent Session (Eşzamanlı Oturum) | Yeni oturum açıldığında veritabanındaki eski oturum kayıtlarının silinmesi (Trigger ile otomatik temizlik).11 | Hesap paylaşımını ve çalınan kimlik bilgileriyle sessizce arka planda bekleyen saldırganları anında engeller. |
| Ağ Kopması Uç Durumu (Edge Case) | Refresh token değişimi anında bağlantı koparsa istemci yeni token'ı alamaz. | Eski token'ın tekrar kullanımına birkaç saniyelik tolerans tanınmaz. Güvenlik için kullanıcı oturumdan düşürülür (Fail Secure).13 |

## **C. Yetkilendirme (Authorization) Mimarisi**

Kimlik doğrulama, kullanıcının kim olduğunu tespit ederken, yetkilendirme bu kullanıcının sistem içinde hangi verilere erişebileceğini ve hangi eylemleri gerçekleştirebileceğini belirler. Medya kuruluşları ve bağımsız platformlar için veri sızıntılarının en yaygın nedeni Bozuk Erişim Kontrolü (Broken Access Control) zafiyetleridir. Bu zafiyetleri ortadan kaldırmak için sistem, yetki denetimlerini uygulama katmanından (Middleware/Route) çıkararak doğrudan veritabanı katmanına, Postgres Satır Bazı Güvenlik (Row Level Security \- RLS) yapısına entegre etmiştir.16

### **Mimari Diyagram: RBAC ve ABAC Entegrasyonu**

Platform, hiyerarşik yapıları yönetmek için Rol Tabanlı Erişim Kontrolü (RBAC) ile bağlamsal ve çok boyutlu kuralları uygulamak için Nitelik Tabanlı Erişim Kontrolünü (ABAC) birleştirir.17 Sadece bir kullanıcının "Gazeteci" rolüne sahip olması (RBAC), her belgeye erişebileceği anlamına gelmez. ABAC sayesinde, bir belgeye erişim talebi geldiğinde veritabanı; kullanıcının çalıştığı bölge, clearance (gizlilik) seviyesi, belgenin sınıflandırması ve hatta o an kullanılan cihazın güvenilirlik durumu gibi öznitelikleri (attributes) çapraz olarak değerlendirir.

Supabase Auth Hooks kullanılarak, kimlik doğrulama esnasında bu dinamik nitelikler özel talepler (custom claims) olarak JWT'nin app\_metadata bölümüne şifrelenerek yerleştirilir.17 RLS politikaları, bu JWT içeriğini eşzamanlı olarak çözümler ve sorguları süzgeçten geçirir.

### **Veri Akışı ve RLS ile Kırılmaz Erişim Kontrolü**

İstemciden (Next.js) gelen bir veri talebi Supabase API'sine ulaştığında, PostgreSQL arka planda RLS politikalarını devreye sokar. Örneğin, bir ihbar dosyasının görüntülenmesi işlemi için şu adımlar işlenir:

1. İstemci, belirli bir UUID'ye sahip ihbar kaydı için GET isteği gönderir.  
2. JWT, PostgreSQL bağlamında doğrulanır ve auth.jwt() fonksiyonu ile token içindeki JSON verisi çıkarılır.21  
3. RLS politikası şu şekilde çalışır: USING (auth.uid() \= assigned\_journalist\_id AND (auth.jwt() \-\> 'app\_metadata' \-\>\> 'clearance\_level')::int \>= required\_clearance).  
4. Eğer koşullar sağlanmazsa, PostgreSQL hata döndürmez; sorgu sanki veritabanında öyle bir kayıt hiç yokmuş gibi 0 satır döndürür. Bu durum, saldırganların var olan ancak erişilemeyen verileri numaralandırmasını (enumeration) engeller.

### **Güvenlik Kontrolleri, Uç Durumlar ve Test Senaryoları**

Bu mimari, Güvensiz Doğrudan Nesne Başvurusu (IDOR) ve Toplu Atama (Mass Assignment) gibi kritik zafiyetlere karşı matematiksel bir koruma sağlar.16 Bir saldırgan, API isteğindeki report\_id=123 parametresini report\_id=124 olarak değiştirerek başka birinin ihbarını okumaya çalıştığında, uygulama katmanındaki hiçbir kontrol aşılsa dahi RLS politikası veriyi döndürmeyecektir. RLS, son savunma hattı değil, mutlak savunma hattıdır.

| Zafiyet Türü | Geleneksel Mimari Zayıflığı | Platformun Mimari Çözümü (RLS & ABAC) | Test Senaryosu ve Sonuç |
| :---- | :---- | :---- | :---- |
| IDOR (Güvensiz Nesne Başvurusu) | API uç noktasında parametre manipülasyonu ile veri çekilmesi. | RLS where auth.uid() \= data.owner\_id koşulunu veritabanı seviyesinde uygular.16 API manipülasyonu etkisizdir. | Kullanıcı A'nın token'ı ile Kullanıcı B'nin belgesi için API çağrısı yapılır. Sonuç: 0 satır döner. |
| Mass Assignment (Toplu Atama) | İstemcinin JSON payload'una role: "admin" ekleyerek yetki yükseltmesi. | Hassas sütunlar RLS WITH CHECK koşullarıyla veya Salt Okunur (Read-Only) ayarlanır.22 Yetki alanları sadece yetkili tetikleyicilerle güncellenir. | Profil güncelleme isteğine is\_verified: true parametresi eklenir. Veritabanı bu sütunu reddeder/görmezden gelir. |
| Middleware Bypass (CVE-2025-29927) | Sahte x-middleware-subrequest başlıklarıyla Next.js ara katmanının aşılması.23 | Middleware sadece yönlendirme yapar. Nihai yetki onayı Supabase Postgres RLS içindedir. Ara katman çökse bile veri sızmaz. | Zafiyetli Next.js sürümü simüle edilir, başlık manipüle edilir. RLS, JWT claim'lerini bulamayacağı için erişimi reddeder. |

## **D. Sıfır Bilgi (Zero-Knowledge) Mimarisi**

İsveç yasaları bağlamında *meddelarskydd*, kaynakların ifşa edilmesini anayasal olarak yasaklar ve gazetecilere kaynaklarını koruma yükümlülüğü getirir.1 Dijital bir platformun bu yasal yükümlülüğü yerine getirebilmesinin tek yolu, "veritabanı ele geçirilse bile kaynağın kimliğinin tespit edilememesi" ilkesine, yani Sıfır Bilgi (Zero-Knowledge) mimarisine dayanmasıdır. Sunucu, kullanıcıların kimliğine dair yalnızca bilmesi gereken minimum veriyi (data minimization) depolar.

### **Şifre Hashing Stratejisi: Bcrypt yerine Argon2id**

Supabase varsayılan olarak kullanıcı şifrelerini bcrypt algoritması ile özetler (hash).5 Bcrypt geçmişte güvenli kabul edilse de, modern tehdit aktörlerinin (özellikle devlet destekli yapıların) sahip olduğu devasa GPU ve ASIC (Özel Uygulamaya Yönelik Tümleşik Devre) farm'larına karşı zayıftır, çünkü CPU yoğunlukludur ancak bellek yoğunluklu (memory-hard) değildir.26

Bu platformda, şifre gerektiren ekstrem yöneticiler veya özel pseudonimler için OWASP'ın altın standardı olan Argon2id algoritması kullanılmaktadır.27 Supabase'in varsayılan şifreleme mekanizmasını aşmak için password\_verification\_attempt adlı Auth Hook (Postgres Function) entegre edilmiştir.29 Bu yapı, şifre doğrulamalarını özel bir GoTrue eklentisi veya Edge Function üzerinden geçirerek Argon2id kullanımını zorunlu kılar.

Argon2id uygulamasında Kriptografik Tuz (Salt) ve Karabiber (Pepper) stratejisi uygulanır. Her kullanıcı için benzersiz olan rastgele Salt veritabanında tutulurken, Pepper (karabiber) adı verilen evrensel ve gizli anahtar yalnızca uygulamanın çevresel değişkenlerinde (Environment Variables) veya AWS KMS gibi izole donanımsal anahtar yönetim sistemlerinde saklanır. Veritabanı bir SQL Injection veya sunucu zafiyeti ile tamamen sızdırılsa dahi, saldırgan KMS içindeki Pepper'a sahip olmadığı için devasa sözlük (dictionary) ve gökkuşağı tablosu (rainbow table) saldırıları tamamen geçersiz kalacaktır.

### **Zero-Knowledge Identity (Sıfır Bilgi Kimlik İspatı)**

Platformun en kritik yeniliklerinden biri, gazetecilerin Sınır Tanımayan Gazeteciler (RSF), Gazetecileri Koruma Komitesi (CPJ) veya Küresel Araştırmacı Gazetecilik Ağı (GIJN) gibi kurumlar tarafından doğrulanmış olduğunu kanıtlarken, kimliklerini ve PII verilerini platformla paylaşmak zorunda olmamalarıdır.32 Bu, Verifiable Credentials (Doğrulanabilir Kimlik Bilgileri) ve Zero-Knowledge Proofs (ZKP \- Sıfır Bilgi İspatı) kullanılarak gerçekleştirilir.33

| Adım | İşlem Tipi | Açıklama ve Kriptografik Temel |
| :---- | :---- | :---- |
| 1\. Talep | Akreditasyon | Gazeteci, RSF'den W3C Verifiable Credentials (VC) formatında dijital bir akreditasyon belgesi (JSON-LD veya SD-JWT formatında) alır.35 |
| 2\. İspat Üretimi | Prover (İstemci) | İstemci cihazındaki tarayıcı, zk-SNARK veya zk-STARK matematiğini kullanarak yerel bir kanıt (proof) üretir.34 Bu kanıt, "Sahibinin adı/e-postası gizlidir ancak RSF tarafından verilen geçerli bir gazeteci sertifikasına sahiptir" matematiksel kesinliğini taşır. |
| 3\. Doğrulama | Verifier (Sunucu) | Sunucu, bu kanıtı saniyeden çok daha kısa bir sürede doğrular. Doğrulamadan sadece "True" veya "False" sonucu çıkar.36 |
| 4\. Sonuç | Veri Saklama | Veritabanına gazetecinin adı veya kurumu kaydedilmez. Yalnızca rastgele oluşturulmuş bir UUID ve "ZKP\_Verified: True" bayrağı işlenir. |

Bu sayede, platformun veritabanı devlet yetkilileri tarafından yasal yollarla talep edilse (Subpoena) veya fiziksel olarak ele geçirilse bile, sistemin gazetecilerin gerçek kimliklerini teslim etmesi teknik olarak imkansızdır (Plausible Deniability \- Makul İnkâr Edilebilirlik). Yasal olarak verilebilecek bir PII mevcut değildir.

## **E. Cihaz Ele Geçirilmiş (Pegasus) Senaryosu**

Hedefli gözetim yazılımlarının zirvesi kabul edilen NSO Group'un Pegasus'u ve benzeri Advanced Persistent Threat (APT) yazılımları, WhatsApp veya iMessage üzerinden gönderilen ve kullanıcının tıklamasına dahi gerek kalmadan cihazın işletim sistemini köklendiren (rooting/jailbreaking) "Zero-Click" (sıfır tıklama) açıklarını (örn. CVE-2023-41064 WebP açığı, CoreGraphics istismarları) kullanır.37 Bir gazetecinin telefonu Pegasus ile ele geçirildiğinde, cihazın kamerası, mikrofonu, ekran görüntüleri ve bellek içi (in-memory) verileri saldırganın kontrolüne geçer.41 Bu senaryoda geleneksel uçtan uca şifreleme (E2EE) anlamsızlaşır, çünkü mesajlar cihaz ekranında okunabilir durumdayken metin olarak çalınır.

Sistem mimarisi, bu karamsar senaryoyu kabullenerek, hasarı en aza indirecek bir "Blast Radius Containment" (Patlama Etki Alanı Sınırlandırma) yaklaşımı benimser.

### **Mimari Diyagram ve Cihaz Bağlama (Device Binding)**

Eğer bir saldırgan cihazdaki oturum çerezlerini (cookies) ağ üzerinden veya dosya sisteminden kopyalayıp (Session Hijacking) kendi uzak cihazında kullanmaya çalışırsa, bu girişim WebAuthn (FIDO2) ve Device Bound Session Credentials (DBSC) entegrasyonu ile durdurulur.6

DBSC mimarisinde, Next.js uygulaması oturum çerezlerini donanımsal bir asimetrik anahtar çiftine bağlar.42 Kimlik doğrulama sırasında cihazın Güvenli Platform Modülü (TPM) veya Secure Enclave yongasında fiziksel olarak çıkarılamaz (non-exportable) bir özel anahtar (private key) oluşturulur. Sunucu, kısa ömürlü oturum çerezlerini yenilemeden önce, istemciden bu TPM içindeki özel anahtarla imzalanmış kriptografik bir kanıt talep eder.6 Pegasus, işletim sistemini köklendirse dahi, TPM'in donanımsal izolasyonu nedeniyle bu özel anahtarı dışa aktaramaz. Çalınan çerezler, orijinal cihaz dışında kullanıldığında doğrulama anında çöker ve erişim reddedilir.

### **Bilinmesi Gerekenler Prensibi (Need-to-Know) ve Bellek İzolasyonu**

Cihaz aktif olarak kullanılırken ekrandan veri çalınmasını zorlaştırmak için Ephemeral Data (Geçici Veri) ve Need-to-Know (Bilinmesi Gereken) prensipleri uygulanır. Bir gazeteci panele girdiğinde, tüm ihbarlar veya kaynaklar tek seferde yüklenmez. Uygulama sadece başlıkların özetlenmiş meta verilerini çeker. Belirli bir belge açıldığında, veri tarayıcı belleğinde geçici olarak (ephemeral state) tutulur ve sekme değiştirildiğinde veya belirli bir süre etkileşim olmadığında RAM'den silinir (Garbage Collection tetiklenmesi). Ekrandaki metinler parçalanmış DOM elementleri olarak render edilir ve işletim sistemi seviyesindeki pano (clipboard) kopyalama işlevleri API düzeyinde kısıtlanarak veri hırsızlığı yavaşlatılır.

### **Gelişmiş Anomali Tespiti ve Davranışsal Analiz**

Cihaz fiziksel olarak ele geçirilmişse veya ekran aktif olarak yansıtılıyorsa, sistem bunu teknik olarak bilemeyebilir. Ancak bu durumu tespit etmek için davranışsal anomali tespiti (behavioral anomaly detection) kurgulanmıştır.

* **Hız ve Kalıp Farklılıkları:** Bir kullanıcının normalde saatte okuduğu belge sayısı bellidir. Pegasus üzerinden cihazı kontrol eden bir script, tüm belgeleri hızla dışa aktarmaya çalışırsa, sistem bu veri çekme hızındaki anomalilik (velocity check) nedeniyle hesabı anında dondurur ve yeniden WebAuthn onayı (örneğin Face ID / YubiKey dokunuşu) ister.43  
* **İmkansız Seyahat (Impossible Travel):** Token çalınarak bir VPN üzerinden farklı bir ülkeden giriş denenirse, mevcut oturumun cihaz parmak izi ve ağ özelliklerindeki keskin değişiklikler anında fark edilerek erişim kesilir.

## **F. Anonim İhbar Kanalı (Sıfır Log, Sıfır Meta Veri)**

Sıfır risk felsefesi, ihbarcının kimliğinin yalnızca uygulama katmanında değil, ağ katmanında da (Network Layer) tamamen silinmesini gerektirir. Klasik web mimarisinde Vercel veya Cloudflare gibi servis sağlayıcılar, DDoS koruması ve telemetri amacıyla gelen her HTTP isteğinin IP adresini, User-Agent bilgisini ve zaman damgasını (timestamp) kaydeder.45 Telemetri kapatılabilse bile 46, servis sağlayıcının ağ donanımlarına sıfır güven esastır. Bu sorunu çözmek için platform çift kollu, paralel bir ağ mimarisi kullanır.

### **OHTTP (Oblivious HTTP) Relay ve Tor.onion Entegrasyonu**

Vercel ve Cloudflare logları sorununu aşmak için Cloudflare Privacy Gateway (OHTTP Relay) kullanılır.47 Oblivious HTTP standardı (RFC 9458), istemci ile sunucu arasına bir röle (relay) yerleştirir. İhbarcı uygulaması, ihbar verisini hedef Next.js sunucusunun public anahtarı (HPKE \- Hybrid Public Key Encryption) ile şifreler. Şifrelenmiş bu paket Cloudflare Relay'e gönderilir.

* **Cloudflare'in Gördüğü:** İhbarcının IP adresi ve tamamen şifrelenmiş, anlamsız bir veri paketi. Hedefi bilir, içeriği bilemez.  
* **Platform Sunucusunun (Next.js) Gördüğü:** Cloudflare'den gelen şifresi çözülmüş ihbar içeriği. Ancak IP adresi Cloudflare'e ait olduğu için, ihbarcının gerçek IP'si sunucu tarafından asla görülmez.  
* **Sonuç:** Hiçbir parti (Cloudflare veya Platform), ihbarcının hem kimliğini (IP) hem de ihbar içeriğini aynı anda göremez.

Daha ekstrem risk profiline sahip ihbarcılar için, OHTTP'ye ek olarak Tor Hidden Service (v3.onion) üzerinden hizmet veren tamamen ayrı bir uç nokta oluşturulur.49 Vercel bu aşamada tamamen devreden çıkarılır ve Next.js uygulaması bağımsız bir sunucuda (Standalone) çalıştırılarak sadece Tor ağına bağlanır. Bu sayede trafik asla açık internete (clearnet) çıkmaz, Tor ağının uçtan uca soğan yönlendirmesi (onion routing) sayesinde IP adresi kavramı ağ katmanında yok edilmiş olur.51

### **Zamanlama Korelasyonu (Timing Correlation) Saldırılarını Önleme**

Gelişmiş bir istihbarat kurumu, OHTTP veya Tor ağına rağmen, bir ihbarcının cihazından çıkan veri paketinin boyutu ile platform sunucusuna giren veri paketinin boyutunu ve tam saniyesini eşleştirerek (traffic correlation analysis) ihbarcının kimliğini tespit edebilir.51 Bunu engellemek için ihbar uygulaması, dosyayı yüklerken **Dolgu (Padding)** ve **Sahte Trafik (Cover Traffic)** tekniklerini uygular. 100 KB'lık bir metin belgesi ile 4 MB'lık bir video dosyası, anlamsız şifrelenmiş baytlar eklenerek her zaman sabit boyutlu parçalara (örneğin 5 MB'lık chunk'lara) dönüştürülerek gönderilir. Ağ dinleyicisi için tüm ihbarlar aynı boyuttaymış gibi görünür. Ayrıca, uygulama arka planda düzenli aralıklarla tamamen boş ihbar istekleri (sahte trafik) göndererek gürültü oluşturur.52 Sunucu bu talepleri işlerken, gelen geçerli ihbarlar veritabanına anında yazılmaz; kasıtlı ve rastgele bir zaman gecikmesi (jitter) ile saatler veya dakikalar sonra kuyruktan çıkarılarak işlenir. Bu sayede ağdaki zamanlama ile veritabanı yazım zamanı arasındaki korelasyon tamamen koparılır.

## **G. Monitoring ve Anomaly Detection (İzleme ve Anomali Tespiti)**

İhbarcıların tam anonimliğini korurken, platformu kullanan gazeteci ve pseudonim hesapların güvenliğini sağlamak için agresif ve mahremiyet odaklı bir izleme mimarisi (Monitoring & Anomaly Detection) işletilir.

### **Mimari ve Tamper-Proof (Değiştirilemez) Audit Loglar**

Uygulamanın erişim ve hata logları (Vercel Serverless Function Logs), sıradan veritabanlarında değil, doğrudan Write-Once-Read-Many (WORM) prensibiyle çalışan bir güvenlik bilgi ve olay yönetimi (SIEM) sistemine (örneğin Elastic SIEM veya AWS S3 Object Lock) entegre Cloudflare Logpush aracılığıyla yönlendirilir.53 Bir saldırgan veritabanına sızıp izlerini silmeye çalışsa dahi, WORM depolamadaki audit (denetim) logları fiziksel olarak silinemez veya değiştirilemez.54 Tüm kritik eylemler (giriş denemeleri, yetki değişiklikleri, başarısız RLS erişimleri) bu havuza akıtılır.

### **Güvenlik Kontrolleri ve Olay Müdahale (Incident Response) Playbook'u**

Sistem, tanımlanmış güvenlik ihlali kalıplarını (pattern) sürekli tarar ve otomatik reaksiyonlar üretir:

| Tespit Edilen Anomali | Tespit Algoritması / Mantığı | Olay Müdahale (Playbook) Aksiyonu |
| :---- | :---- | :---- |
| Brute Force / Credential Stuffing | Belirli bir hesap için kısa sürede farklı Tor çıkış düğümlerinden veya proxy IP'lerinden gelen başarısız Magic Link / JWT doğrulama talepleri.55 | Kullanıcı hesabına geçici lockout (kilitleme) uygulanır. Cloudflare WAF üzerinden ilgili IP/ASN bloklarına 'Managed Challenge' atılır.9 |
| Impossible Travel (İmkansız Seyahat) | Oturum token'ı saat 10:00'da İsveç IP'sinden, 10:15'te Rusya IP'sinden kullanılması. Ağ geçiş süresinin fiziksel seyahat hızıyla uyuşmaması. | Söz konusu JWT Access Token geçersiz kılınır. Refresh Token rotasyonu derhal durdurulur ve kullanıcının tüm oturumları veritabanı düzeyinde silinir.15 |
| Privilege Escalation Attempt | Kullanıcının Next.js Client üzerinden payload içine {"role":"admin"} ekleyerek kısıtlı bir API ucuna POST isteği atması (Mass Assignment denemesi).22 | Supabase RLS politikası bu isteği yetki dışı kabul edip 403 döner.16 SIEM, bu RLS ihlalini yakalar ve uyarı (Alert) üretir. Yönetici bilgilendirilir. |

## **H. Disaster Recovery (Felaket Kurtarma ve Süreklilik)**

Bir güvenlik mimarisinin gücü, her şey yolundayken değil, sistem çöktüğünde (Fail Secure / Fail Safe) ne kadar dayanıklı olduğuyla ölçülür. Merkeziyetçi yapıların barındırdığı tek nokta hata (Single Point of Failure) risklerini minimize etmek için katı bir Felaket Kurtarma senaryosu işletilir.

### **Kimlik Doğrulama Veritabanı (Supabase) Çökmesi / Veri Bozulması**

Eğer Supabase veritabanı bir ransomware (fidyeyazılımı), donanım arızası veya içeriden bir saldırı sonucu bozulursa (corruption), veri kaybını sıfıra indirmek için Supabase Point-in-Time Recovery (PITR \- Zamanda Belirli Bir Noktaya Kurtarma) mimarisi kullanılır.56 PITR, günlük veya saatlik devasa yedekler (snapshots) almak yerine, veritabanına yazılan her işlemi (Write-Ahead Logging \- WAL) eşzamanlı olarak harici, izole bir depolamaya kopyalar. Felaket anında, veritabanı saniyeler öncesindeki tamamen sağlam durumuna saniyeler içinde geri döndürülebilir.56

### **Kriptografik Anahtar Rotasyonu (Key Rotation) ve İptali**

Sistemin kalbini oluşturan JWT İmzalama Anahtarı (JWT Signing Secret) veya Supabase Hizmet Rolü (Service Role) anahtarlarından birinin sızdırıldığı tespit edilirse, derhal "Key Rotation" prosedürü devreye sokulur.57 Supabase yönetim panelinden yeni bir anahtar üretildiği anda, eski anahtar (Previously used key) manuel olarak tamamen iptal (Revoke) edilir.57

* **Edge Case:** İptal işlemi, o saniyeye kadar sızdırılmış anahtarla üretilmiş tüm geçerli Access Token ve Refresh Token'ları, süreleri dolmamış olsa bile anında çöpe çevirir. Tüm kullanıcıların (gazeteciler dahil) oturumları düşer. Kötü niyetli aktör, çaldığı anahtarla sahte (forged) JWT'ler üreterek sistemde gezinemez. Sistem meşru kullanıcıları mağdur etme pahasına güvenliği seçer (Fail Secure).

### **Supabase Altyapısının Çökmesi Durumunda Yedek Doğrulama (Backup Auth)**

Eğer Supabase GoTrue Auth sunucusu geniş çaplı bir altyapı kesintisi (Outage) yaşarsa, platformun anayasal bir güvence olan ihbar kanalını ve acil durum gazeteci arşivini erişilebilir (Available) tutması gerekir.

* **Mekanizma:** Asimetrik JWT doğrulama altyapısı bu sorunu çözer. Access Token'lar önceden asimetrik olarak (özel anahtarla imzalanıp, genel anahtarla doğrulanarak) oluşturulduğu için, merkezi auth sunucusu çökse dahi, Cloudflare Workers veya Vercel Edge fonksiyonları, kendilerinde bulunan Public Key (Genel Anahtar) aracılığıyla gazetecilerin ellerindeki JWT'leri doğrulamaya devam edebilir.58 Merkezi sistem çevrimdışı olsa dahi, mevcut oturuma sahip kullanıcılar salt okunur (read-only) verilere erişimini kesintisiz sürdürür.

Bu mimari bütünlük, platformun gazeteciler ve ihbarcılar için bir sığınak olmasını sağlarken; şifrelemeden ağ yönlendirmesine, donanımsal güvenlik modüllerinden veri tabanı sorgularına kadar her noktada mutlak bir anayasal koruma ve sıfır güven (Zero Trust) doktrinini matematiksel bir kesinlikle hayata geçirmektedir.

#### **Alıntılanan çalışmalar**

1. Implementation of the EU Whistleblowing Directive Sweden \- TwoBirds, erişim tarihi Mart 19, 2026, [https://www.twobirds.com/en/trending-topics/the-eu-whistleblowing-directive/implementation-status/sweden](https://www.twobirds.com/en/trending-topics/the-eu-whistleblowing-directive/implementation-status/sweden)  
2. What an employer should know about the New Whistleblowing Act | vinge.se, erişim tarihi Mart 19, 2026, [https://www.vinge.se/en/news/what-an-employer-should-know-about-the-new-whistleblowing-act/](https://www.vinge.se/en/news/what-an-employer-should-know-about-the-new-whistleblowing-act/)  
3. Password-based Auth | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/passwords](https://supabase.com/docs/guides/auth/passwords)  
4. Advanced guide | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/server-side/advanced-guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)  
5. Password security | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/password-security](https://supabase.com/docs/guides/auth/password-security)  
6. Device Bound Session Credentials \- W3C, erişim tarihi Mart 19, 2026, [https://www.w3.org/TR/dbsc/](https://www.w3.org/TR/dbsc/)  
7. Security Overview · supabase/supabase-js \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/supabase/supabase-js/security](https://github.com/supabase/supabase-js/security)  
8. Resources | Cloudflare Docs, erişim tarihi Mart 19, 2026, [https://developers.cloudflare.com/resources/](https://developers.cloudflare.com/resources/)  
9. How to add security deception features (nextjs and cloudflare) Help \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/CloudFlare/comments/1nwbplf/how\_to\_add\_security\_deception\_features\_nextjs\_and/](https://www.reddit.com/r/CloudFlare/comments/1nwbplf/how_to_add_security_deception_features_nextjs_and/)  
10. Next.js \+ Supabase Cookie-Based Auth Workflow: The Best Auth Solution (2025 Guide) | by shubham kumar | Medium, erişim tarihi Mart 19, 2026, [https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1](https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1)  
11. User sessions | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/sessions](https://supabase.com/docs/guides/auth/sessions)  
12. Authentication in Next.js: Complete Guide with Auth.js & Supabase \- Vladimir Siedykh, erişim tarihi Mart 19, 2026, [https://vladimirsiedykh.com/blog/nextjs-authentication-complete-guide-authjs-supabase](https://vladimirsiedykh.com/blog/nextjs-authentication-complete-guide-authjs-supabase)  
13. Multi-Session Authentication Bug: Local Logout Invalidates All Sessions · Issue \#2036 · supabase/auth \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/supabase/auth/issues/2036](https://github.com/supabase/auth/issues/2036)  
14. Self Hosted single session per user \- Supabase \- Answer Overflow, erişim tarihi Mart 19, 2026, [https://www.answeroverflow.com/m/1414662505011085413](https://www.answeroverflow.com/m/1414662505011085413)  
15. Invalidate a session from database · supabase · Discussion \#13941 \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/orgs/supabase/discussions/13941](https://github.com/orgs/supabase/discussions/13941)  
16. Row Level Security | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)  
17. Custom Claims & Role-based Access Control (RBAC) | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)  
18. Do I Really Need Custom Claims for RBAC in Supabase? \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/Supabase/comments/1jxcrto/do\_i\_really\_need\_custom\_claims\_for\_rbac\_in/](https://www.reddit.com/r/Supabase/comments/1jxcrto/do_i_really_need_custom_claims_for_rbac_in/)  
19. Authorization via Row Level Security | Supabase Features, erişim tarihi Mart 19, 2026, [https://supabase.com/features/row-level-security](https://supabase.com/features/row-level-security)  
20. Auth Hooks | Supabase Features, erişim tarihi Mart 19, 2026, [https://supabase.com/features/auth-hooks](https://supabase.com/features/auth-hooks)  
21. Token Security and Row Level Security | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/oauth-server/token-security](https://supabase.com/docs/guides/auth/oauth-server/token-security)  
22. Understanding API keys | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/api/api-keys](https://supabase.com/docs/guides/api/api-keys)  
23. The Architect's Journey: Navigating Next.js Security as a Living System \- DEV Community, erişim tarihi Mart 19, 2026, [https://dev.to/alex\_aslam/the-architects-journey-navigating-nextjs-security-as-a-living-system-4bk6](https://dev.to/alex_aslam/the-architects-journey-navigating-nextjs-security-as-a-living-system-4bk6)  
24. CVE-2025-29927: Next.js Middleware Authorization Bypass \- OffSec, erişim tarihi Mart 19, 2026, [https://www.offsec.com/blog/cve-2025-29927/](https://www.offsec.com/blog/cve-2025-29927/)  
25. https://lup.lub.lu.se/student-papers/oai?verb=ListRecords\&set=SocialBehaviourLaw\&metadataPrefix=oai\_dc, erişim tarihi Mart 19, 2026, [https://lup.lub.lu.se/student-papers/oai?verb=ListRecords\&set=SocialBehaviourLaw\&metadataPrefix=oai\_dc](https://lup.lub.lu.se/student-papers/oai?verb=ListRecords&set=SocialBehaviourLaw&metadataPrefix=oai_dc)  
26. Argon2 vs Bcrypt: The Modern Standard for Secure Passwords | by Lastgigs | Medium, erişim tarihi Mart 19, 2026, [https://medium.com/@lastgigin0/argon2-vs-bcrypt-the-modern-standard-for-secure-passwords-6d19911485c5](https://medium.com/@lastgigin0/argon2-vs-bcrypt-the-modern-standard-for-secure-passwords-6d19911485c5)  
27. bcrypt vs Argon2 | Compare Top Cryptographic Hashing Algorithms \- MojoAuth, erişim tarihi Mart 19, 2026, [https://mojoauth.com/compare-hashing-algorithms/bcrypt-vs-argon2](https://mojoauth.com/compare-hashing-algorithms/bcrypt-vs-argon2)  
28. Is Argon2 Better Than bcrypt? \- ThatSoftwareDude.com, erişim tarihi Mart 19, 2026, [https://www.thatsoftwaredude.com/content/14031/is-argon2-better-than-bcrypt](https://www.thatsoftwaredude.com/content/14031/is-argon2-better-than-bcrypt)  
29. Building Custom Provider-Based Authentication with Supabase | by Erez Carmel | Israeli Tech Radar | Medium, erişim tarihi Mart 19, 2026, [https://medium.com/israeli-tech-radar/building-custom-provider-based-authentication-with-supabase-bb40af6b5d78](https://medium.com/israeli-tech-radar/building-custom-provider-based-authentication-with-supabase-bb40af6b5d78)  
30. Auth Hooks | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/auth-hooks](https://supabase.com/docs/guides/auth/auth-hooks)  
31. Argon2id Password Hashing · supabase · Discussion \#13130 \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/orgs/supabase/discussions/13130](https://github.com/orgs/supabase/discussions/13130)  
32. API \[beta\] \- Committee to Protect Journalists, erişim tarihi Mart 19, 2026, [https://cpj.org/data-api/](https://cpj.org/data-api/)  
33. Zero-Knowledge Proofs for Verifiable Credential Issuance. \- Didit, erişim tarihi Mart 19, 2026, [https://didit.me/blog/zero-knowledge-proofs-for-verifiable-credential-issuance/](https://didit.me/blog/zero-knowledge-proofs-for-verifiable-credential-issuance/)  
34. \[2510.09715\] A Scalable, Privacy-Preserving Decentralized Identity and Verifiable Data Sharing Framework based on Zero-Knowledge Proofs \- arXiv, erişim tarihi Mart 19, 2026, [https://arxiv.org/abs/2510.09715](https://arxiv.org/abs/2510.09715)  
35. W3C Digital Credentials API publication: the next step to privacy-preserving identities on the web | 2025 | Blog, erişim tarihi Mart 19, 2026, [https://www.w3.org/blog/2025/w3c-digital-credentials-api-publication-the-next-step-to-privacy-preserving-identities-on-the-web/](https://www.w3.org/blog/2025/w3c-digital-credentials-api-publication-the-next-step-to-privacy-preserving-identities-on-the-web/)  
36. Zero-knowledge proofs explained in 3 examples \- Circularise, erişim tarihi Mart 19, 2026, [https://www.circularise.com/blogs/zero-knowledge-proofs-explained-in-3-examples](https://www.circularise.com/blogs/zero-knowledge-proofs-explained-in-3-examples)  
37. Pegasus (spyware) \- Wikipedia, erişim tarihi Mart 19, 2026, [https://en.wikipedia.org/wiki/Pegasus\_(spyware)](https://en.wikipedia.org/wiki/Pegasus_\(spyware\))  
38. What is Pegasus spyware, and how to detect and remove it \- Norton, erişim tarihi Mart 19, 2026, [https://us.norton.com/blog/emerging-threats/pegasus-spyware](https://us.norton.com/blog/emerging-threats/pegasus-spyware)  
39. Pegasus Spyware \- Any thoughts on ways to protect devices against it? : r/MobileSecurity, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/MobileSecurity/comments/otif6k/pegasus\_spyware\_any\_thoughts\_on\_ways\_to\_protect/](https://www.reddit.com/r/MobileSecurity/comments/otif6k/pegasus_spyware_any_thoughts_on_ways_to_protect/)  
40. Pegasus spyware exploited a WebP vulnerability \- ThreatDown by Malwarebytes, erişim tarihi Mart 19, 2026, [https://www.threatdown.com/blog/pegasus-spyware-and-how-it-exploited-a-webp-vulnerability/](https://www.threatdown.com/blog/pegasus-spyware-and-how-it-exploited-a-webp-vulnerability/)  
41. Technical Analysis of Pegasus Spyware \- Lookout, erişim tarihi Mart 19, 2026, [https://info.lookout.com/rs/051-ESQ-475/images/lookout-pegasus-technical-analysis.pdf](https://info.lookout.com/rs/051-ESQ-475/images/lookout-pegasus-technical-analysis.pdf)  
42. Device Bound Session Credentials (DBSC) | Web Platform \- Chrome for Developers, erişim tarihi Mart 19, 2026, [https://developer.chrome.com/docs/web-platform/device-bound-session-credentials](https://developer.chrome.com/docs/web-platform/device-bound-session-credentials)  
43. Integrate Biometric Authentication—Next.js & WebAuthn—Part 1 \- Telerik.com, erişim tarihi Mart 19, 2026, [https://www.telerik.com/blogs/integrate-biometric-authentication-nextjs-app-simplewebauthn-package-part-1](https://www.telerik.com/blogs/integrate-biometric-authentication-nextjs-app-simplewebauthn-package-part-1)  
44. WebAuthn, passwordless and FIDO2 explained \- Cisco Duo, erişim tarihi Mart 19, 2026, [https://duo.com/blog/webauthn-passwordless-fido2-explained-componens-passwordless-architecture](https://duo.com/blog/webauthn-passwordless-fido2-explained-componens-passwordless-architecture)  
45. Blocking traffic from a specific IP address. | Vercel Knowledge Base, erişim tarihi Mart 19, 2026, [https://vercel.com/kb/guide/traffic-spikes](https://vercel.com/kb/guide/traffic-spikes)  
46. Telemetry | Next.js by Vercel \- The React Framework, erişim tarihi Mart 19, 2026, [https://nextjs.org/telemetry](https://nextjs.org/telemetry)  
47. Overview · Cloudflare Privacy Gateway docs, erişim tarihi Mart 19, 2026, [https://developers.cloudflare.com/privacy-gateway/](https://developers.cloudflare.com/privacy-gateway/)  
48. Privacy Gateway: a privacy preserving proxy built on Internet standards, erişim tarihi Mart 19, 2026, [https://blog.cloudflare.com/building-privacy-into-internet-standards-and-how-to-make-your-app-more-private-today/](https://blog.cloudflare.com/building-privacy-into-internet-standards-and-how-to-make-your-app-more-private-today/)  
49. Tor Project | Set up Your Onion Service, erişim tarihi Mart 19, 2026, [https://community.torproject.org/onion-services/setup/](https://community.torproject.org/onion-services/setup/)  
50. \# Hosting a Next.js Application on the Tor Network using WSL: A Complete Guide | by Kundansingh | Medium, erişim tarihi Mart 19, 2026, [https://medium.com/@kundansingh045450/hosting-a-next-js-application-on-the-tor-network-using-wsl-a-complete-guide-dc18b0fe7e77](https://medium.com/@kundansingh045450/hosting-a-next-js-application-on-the-tor-network-using-wsl-a-complete-guide-dc18b0fe7e77)  
51. Tor (network) \- Wikipedia, erişim tarihi Mart 19, 2026, [https://en.wikipedia.org/wiki/Tor\_(network)](https://en.wikipedia.org/wiki/Tor_\(network\))  
52. Reality Check for Tor Website Fingerprinting in the Open World \- arXiv, erişim tarihi Mart 19, 2026, [https://arxiv.org/html/2603.07412v1](https://arxiv.org/html/2603.07412v1)  
53. How to Monitor Vercel Application Logs: A Step-by-Step Guide \- OpenObserve, erişim tarihi Mart 19, 2026, [https://openobserve.ai/blog/monitor-vercel-application-logs-guide/](https://openobserve.ai/blog/monitor-vercel-application-logs-guide/)  
54. Enhancing security analysis with Cloudflare Zero Trust logs and Elastic SIEM, erişim tarihi Mart 19, 2026, [https://blog.cloudflare.com/enhancing-security-analysis-with-cloudflare-zero-trust-logs-and-elastic-siem/](https://blog.cloudflare.com/enhancing-security-analysis-with-cloudflare-zero-trust-logs-and-elastic-siem/)  
55. Zero Trust logs · Cloudflare One docs, erişim tarihi Mart 19, 2026, [https://developers.cloudflare.com/cloudflare-one/insights/logs/](https://developers.cloudflare.com/cloudflare-one/insights/logs/)  
56. Database Backups | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/platform/backups](https://supabase.com/docs/guides/platform/backups)  
57. Troubleshooting | Rotating Anon, Service, and JWT Secrets \- Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd)  
58. Supabase Security Retro: 2025, erişim tarihi Mart 19, 2026, [https://supabase.com/blog/supabase-security-2025-retro](https://supabase.com/blog/supabase-security-2025-retro)