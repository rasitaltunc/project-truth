# **Yüksek Güvenlikli Kimlik Doğrulama Mimarileri ve Kriptografik Protokol Analizi**

Modern web, mobil ve merkeziyetsiz uygulamalarda kimlik doğrulama (authentication) mimarileri, yalnızca yetkisiz erişimi engellemekle kalmayıp, aynı zamanda kullanıcı mahremiyetini sıfır bilgi (zero-knowledge) prensipleriyle korumak zorundadır. Geleneksel parola tabanlı sistemlerin kaba kuvvet (brute-force), oltalama (phishing) ve ortadaki adam (man-in-the-middle) saldırılarına karşı gösterdiği zafiyetler, endüstriyi uçtan uca şifreleme (E2EE), donanım destekli asimetrik anahtarlar ve kısa ömürlü yetkilendirme sertifikalarına yöneltmiştir.1 Araştırmalar, ağ güvenliği alanında geleneksel çevre tabanlı (perimeter-based) modellerin yerini hızla Sıfır Güven (Zero Trust) mimarilerine bıraktığını ve kimlik doğrulamanın her bir mikro hizmet ve ağ isteği için bağımsız olarak yapılması gerektiğini göstermektedir.3

Bu kapsamlı araştırma raporunda, dünyanın en katı güvenlik gereksinimlerine sahip sekiz platformunun (Signal, ProtonMail, 1Password/Bitwarden, Cloudflare Access, FIDO2/WebAuthn, Matrix/Element, Tor Project ve Supabase Auth) kimlik doğrulama mimarileri, kriptografik tercihleri, sistem zayıflıkları ve geçmişte karşılaştıkları güvenlik olayları derinlemesine incelenmektedir. Her bir platform için mimari veri akışları yapılandırılmış tablolar aracılığıyla modellenmiş olup, sistem tasarımlarından çıkarılacak stratejik dersler analiz edilmiştir.

## **A. Signal: Mahremiyet Odaklı İletişim ve Güvenli Değer Kurtarma**

Signal mimarisi, sunucuların minimum veri tutması prensibi üzerine inşa edilmiştir. Kullanıcının sosyal grafiği, iletişim listesi, mesaj metadataları, grup üyelikleri veya profil bilgileri sunucularda hiçbir zaman düz metin (plaintext) olarak saklanmaz.5 Sistem, telefon numarası tabanlı geleneksel bir kayıt sürecini, kriptografik olarak körleştirilmiş protokollerle destekleyerek anonimleştirmeye çalışmaktadır.

### **Mimari Diyagram ve Veri Akışı**

Signal'in kimlik doğrulama ve iletişim başlatma süreci aşağıdaki tabloda yapısal bir diyagram olarak ifade edilmiştir:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Kayıt | SMS / Sesli Arama | Kullanıcı telefon numarasını doğrular ve istemci yerel bir cihaz anahtarı üretir. | Geçici OTP doğrulaması.7 |
| 2\. Veri Kurtarma | Secure Value Recovery | Kullanıcı en az 4 haneli bir PIN belirler. Profil ve kişi grafiği şifrelenir. | Sunucunun çözemeyeceği, PIN tabanlı şifreli veri paketi.7 |
| 3\. Kişi Keşfi | Intel SGX Enclave | Rehberdeki numaraların SHA256 özetleri oluşturulur ve güvenli tünele gönderilir. | Sunucu hafızasında iz bırakmayan, sadece kesişim kümesini döndüren yalıtılmış eşleştirme.9 |
| 4\. İletişim | Sealed Sender | Gönderici, mesaj zarfına sadece alıcının kimliğini yazar ve teslimat token'ı ekler. | Sunucunun "kimden" geldiğini bilmediği (metadata gizliliği sağlayan) şifreli zarf.5 |

### **Kriptografik Kararlar ve Mimari Analiz**

Signal'in kimlik doğrulama sistemi telefon numarası ve SMS doğrulamasının üzerine inşa edilmiş bir PIN sistemi ile desteklenmektedir. Eski sürümlerde telefonun kaybedilmesi tüm profil ve grup verilerinin yok olması anlamına gelirken, Signal "Secure Value Recovery" (SVR) mimarisini geliştirerek verileri sunucuda kör bir şekilde saklamaya başlamıştır.7 Sunucular PIN'i bilmez ve sıfırlayamaz. Kayıt kilidi (Registration Lock) aktif edildiğinde, hesabı ele geçiren bir saldırgan PIN'i bilmediği sürece hesabı başka bir cihaza taşıyamaz ve sistem saldırganı 7 gün boyunca bloke eder.7

Kişi Keşfi (Contact Discovery) protokolü, geleneksel uygulamaların rehberi düz metin olarak sunucuya aktarması sorununu çözmektedir. Signal istemcisi, cihazdaki telefon numaralarının kesilmiş (truncated) SHA256 özetlerini hesaplar ve bu özetleri donanımsal olarak izole edilmiş Intel SGX (Software Guard Extensions) yerleşim alanına (enclave) güvenli bir tünel üzerinden iletir.9 İstemci, uzak doğrulama (remote attestation) yaparak enclave içinde çalışan kodun açık kaynaklı Signal kodu ile aynı olduğundan emin olur.9

Metadata gizliliği için "Sealed Sender" (Mühürlü Gönderici) mimarisi kullanılır. Gönderici, mesajı uçtan uca şifreledikten sonra, zarfın içine kendi sertifikasını ekler ve bu zarfı alıcının açık anahtarı ile şifreler.5 Zarf, Signal sunucusuna herhangi bir kimlik doğrulama bilgisi olmadan, sadece alıcının teslimat token'ı (delivery token) ile iletilir.5 Bu sayede sunucu mesajın kime gittiğini bilir, ancak kimden geldiğini göremez ve iletişim grafiği gizli kalır.10

### **Güçlü Yanları**

Ağ analizi ve trafik korelasyonuna karşı Sealed Sender mimarisi, iletişim metadatasını gizleyerek eşsiz bir koruma sağlar.5 Sunucu operatörlerinin dahi eşleştirme işlemine müdahale edememesini sağlayan Intel SGX kullanımı, mahremiyet standartlarını donanım seviyesine taşır.9 Ek olarak, kayıt kilidi mekanizması, telekomünikasyon altyapısındaki zafiyetleri ve SIM kopyalama (SIM-swap) saldırılarını yüksek oranda bertaraf eder.11

### **Zayıf Yanları**

Intel SGX donanım mimarisinde geçmişte keşfedilen yan kanal (side-channel) saldırıları, teorik düzeyde de olsa hangi numaraların sorgulandığını açığa çıkarabilme potansiyeline sahiptir.11 Temel bir zayıflık olarak telefon numarası zorunluluğu, tamamen anonim bir kimlik doğrulamasını engellemektedir. Ayrıca göndericinin kimliği Sealed Sender ile gizlendiği için platform içi spam ve kötüye kullanım koruması zorlaşmış; bu durum, profil anahtarından türetilen 96-bitlik kısa ömürlü teslimat token'ları ile çözülmeye çalışılmıştır.13

### **Bilinen Güvenlik Olayları**

Kimlik doğrulama sistemini hedef alan en büyük kriz, 2022 yazında yaşanmıştır. Signal'in SMS doğrulama sağlayıcısı Twilio'nun oltalama saldırısı ile hacklenmesi sonucu, yaklaşık 1900 kullanıcının numarası ifşa olmuş ve saldırganlar SMS doğrulama kodlarını ele geçirerek bu numaraları kendi cihazlarına kaydetmeye çalışmıştır.14 Bu olay, SMS tabanlı doğrulamanın dışa bağımlı ne kadar kırılgan bir yapı olduğunu kanıtlamıştır.15 Bunun yanı sıra, Daniel adında bir güvenlik araştırmacısı (2025), Cloudflare'in önbellekleme (caching) mimarisi ve cf-cache-status HTTP başlıklarını istismar ederek, Signal kullanıcılarının lokasyonunu 250 millik bir çap içinde tespit edebilen bir sıfır tıklama (zero-click) saldırısı yayımlamıştır.16 Saldırganın gönderdiği arka plan push bildirimi, kullanıcının cihazının CDN'den veri çekmesine ve en yakın veri merkezinde bir önbellek izi bırakmasına neden olmaktadır.18 Masaüstü istemcilerde ise CVE-2023-24069 ve CVE-2023-24068 zafiyetleri ile gönderilen dosyaların yerel olarak doğrulanmadan düz metin olarak saklandığı tespit edilmiştir.20

### **Bizim Platform İçin Uygulanabilir Dersler**

Telefon veya e-posta tabanlı dış doğrulama mekanizmaları mutlaka platform içi ikincil bir PIN veya şifre ile (Kayıt Kilidi benzeri) desteklenmelidir. Üçüncü parti servislerin (SMS sağlayıcıları veya CDN hizmetleri) altyapı zafiyetleri göz önünde bulundurulmalı; önbellek, zamanlama (timing) ve HTTP başlık sızıntılarına karşı metadata koruma stratejileri (örneğin rastgele gecikmeler eklenmesi veya proxy kullanımı) sistem mimarisine entegre edilmelidir.

## **B. ProtonMail: Sıfır Bilgi İspatı ve Çift Parola Mimarisi**

ProtonMail, kimlik doğrulama süreçlerinde kullanıcının parolasını sunucuya hiçbir zaman açık veya basit bir özet (hash) halinde iletmeyen "Sıfır Bilgi" (Zero-Knowledge) yaklaşımını en katı şekilde uygulayan e-posta sağlayıcısıdır.21

### **Mimari Diyagram ve Veri Akışı**

ProtonMail'in çift parola ve şifreleme anahtarı yönetimi aşağıdaki tabloda açıklanmıştır:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Kimlik Doğrulama | SRP Protokolü | İstemci ve sunucu karşılıklı kriptografik bir bulmaca çözer. Parola ağa çıkmaz. | Parola eşdeğeri veri sızdırmadan oluşturulan güvenli oturum anahtarı.21 |
| 2\. Anahtar Koruma | Çift Parola Sistemi | Kullanıcı asimetrik anahtarı (User Key), Bcrypt ile cihazda yerel olarak şifrelenir. | Kaba kuvvet saldırılarına dayanıklı, cihazda çözülen özel anahtar (Private Key).22 |
| 3\. Veri Çözme | Mailbox Password | İstemci, sunucudan şifreli posta kutusu anahtarını çeker ve yerel olarak çözer. | Uçtan uca şifreli e-postaların istemcide açılması.22 |
| 4\. İki Faktörlü Doğrulama | Authenticator Key | 32-byte Authenticator Key, Kullanıcı Anahtarı ile şifrelenir ve imzalanır. | 256-bit AES-GCM kullanılarak korunan yerel 2FA girişleri.22 |

### **Kriptografik Kararlar ve Mimari Analiz**

ProtonMail, Ortadaki Adam (MITM) saldırılarına karşı güçlendirilmiş **Secure Remote Password (SRP)** protokolünü kullanmaktadır.22 SRP, tarafların birbirine parolayı veya parolaya eşdeğer bir bilgiyi göndermeden kimlik doğrulamasını sağlayan, PAKE (Password-Authenticated Key Agreement) tabanlı yaygın bir standarttır.21 İstemci ve sunucu karmaşık matematiksel işlemler yaparak ortak bir oturum anahtarı (session key) üzerinde uzlaşır. Bu implementasyon sayesinde, bir saldırgan Proton sunucularını ele geçirse veya ağ trafiğini tamamen manipüle etse bile, her bir kimlik doğrulama denemesinde yalnızca tek bir parola tahmini yapabilir; yani kaba kuvvet saldırıları ağ seviyesinde matematiksel olarak sınırlandırılır.22

ProtonMail'in "Çift Parola" (Multiple Account Passwords) sistemi mimarinin temel taşıdır. Geleneksel sistemlerde sunucu, kullanıcının hem hesabını açar hem de verisini sunar. ProtonMail'de ise "Giriş Parolası" (Login Password) sadece SRP ile kimliği doğrular. Verileri (e-postaları) çözmek için gereken asimetrik Özel Anahtar (Private Key) ise sunucuda "Posta Kutusu Parolası" (Mailbox Password) veya hesap tuzu (salt) kullanılarak AES-256 seviyesinde şifrelenmiş olarak tutulur. İstemci bu anahtarı indirir ve ancak kullanıcının girdiği ikinci parola (veya arka planda Bcrypt ile türetilen anahtar) ile cihazında yerel olarak çözer.22 Bu işlem, veritabanı sızıntılarında verilerin şifreli kalmasını garanti eder.

### **Güçlü Yanları**

Sistemin en belirgin gücü, sunucu uzlaşmasına (server compromise) karşı gösterdiği tam dirençtir. ProtonMail sunucuları fiziksel veya siber olarak hacklense bile, kullanıcı parolaları ve verileri çalınamaz.22 SRP protokolünün matematiksel doğası gereği, kimlik doğrulama verilerinin kopyalanarak tekrar edilmesi (replay attacks) ve aktif manipülasyonlar imkansız hale getirilmiştir.21

### **Zayıf Yanları**

Kriptografik güvenliğin getirdiği en büyük zayıflık, hesap kurtarma süreçlerinin acımasızlığıdır. Kullanıcı parolasını unuttuğunda önceki iletişimlerin şifresi kesinlikle çözülemez, çünkü şifreleme anahtarları sunucuda değil kullanıcının zihninde barınmaktadır. Ek olarak, SRP ve asimetrik anahtar çözme süreçleri, istemci tarafındaki (özellikle web tarayıcılarındaki JavaScript motorlarında) işlemci kullanımını ve bellek tüketimini artırarak düşük donanımlı cihazlarda performans kaybına yol açmaktadır.

### **Bilinen Güvenlik Olayları**

Eylül 2021'de patlak veren İsviçre Mahkemesi IP Günlüğü Krizi, kriptografik mimarinin yasal regülasyonlara karşı nasıl yenik düşebileceğinin tarihi bir kanıtıdır. Fransa'da iklim aktivisti olan bir kullanıcının IP adresi, Europol üzerinden İsviçre makamlarına iletilen yasal bir talep doğrultusunda ProtonMail tarafından kaydedilerek yetkililere teslim edilmiştir.25 O dönemde gizlilik politikasında varsayılan olarak IP günlüğü (log) tutmadığını belirten platform, yasal emir (court order) geldiğinde belirli bir hesap için IP dinlemeye başlamak zorunda kalmıştır.25

Bu olayın ardından ProtonMail gizlilik politikasındaki "hiçbir IP kaydı tutulmaz" ibaresini değiştirerek yasal zorunlulukları netleştirmiştir.25 Şirketin başlattığı hukuk mücadelesi sonucunda, İsviçre Federal İdare Mahkemesi e-posta servislerinin telekomünikasyon sağlayıcısı sayılamayacağına hükmederek, veri tutma zorunluluklarını e-posta sağlayıcıları lehine hafifletmiştir.28 Bu kriz, sistemin şifreli içeriğe erişemese bile (e-postalar güvende kalmıştır), metadata (IP, zaman damgası) sızıntılarının kimlik ifşası için yeterli olabileceğini göstermiştir.

### **Bizim Platform İçin Uygulanabilir Dersler**

Kullanıcıların asıl verilerini (mesajlar, dosyalar) şifreleyen anahtarların yönetimi, kimlik doğrulama (auth) sisteminden tamamen izole edilmelidir. SRP veya benzeri PAKE protokolleri kullanılarak, olası veri tabanı sızıntılarında (data breach) parolaların tehlikeye girmesi engellenmelidir. Ayrıca sistemin gizlilik politikalarında ve mimarisinde, yasal zorunluluklar altındaki metadata izleme süreçleri dürüstçe açıklanmalı, metadata gizliliğini artırmak için ek ağ katmanları (örneğin Tor ağı entegrasyonu) desteklenmelidir.

## **C. 1Password ve Bitwarden: Sıfır Bilgi Kasa Mimarileri ve Acil Durum Erişimi**

Parola yöneticilerinin temel güvenlik modeli, sunucunun yalnızca anlamsız şifrelenmiş paketleri (vaults) sakladığı, içeriği çözebilecek hiçbir anahtar veya türev bilgiye sahip olmadığı bir sıfır bilgi mimarisidir.30 1Password ve Bitwarden, bu radikal güvenlik gereksinimini karşılamak için farklı anahtar türetme ve asimetrik veri paylaşım mekanizmaları seçmiştir.32

### **Mimari Diyagram ve Veri Akışı**

İki platformun kimlik doğrulama ve kasa açma süreçlerinin karşılaştırmalı veri akışı aşağıdaki tabloda özetlenmiştir:

| Aşama | 1Password Mimarisi | Bitwarden Mimarisi | Kriptografik Sonuç |
| :---- | :---- | :---- | :---- |
| 1\. Anahtar Türetme | Master Parola \+ 128-bit cihazda üretilen Secret Key birleştirilir.34 | Master Parola \+ E-posta tuzu ile PBKDF2 (veya Argon2id) üzerinden 600.000 iterasyon.35 | 256-bit Master Key üretimi (İstemci tarafında).35 |
| 2\. Sunucu Doğrulaması | SRP \+ HKDF ile sunucuya parola özeti gönderilir. | Master Key tekrar hashlenir, sunucuya iletilir. Sunucu veritabanı ile eşleştirir.36 | Sunucuya ana parola gitmeden kimlik kanıtlaması (Zero-Knowledge).31 |
| 3\. Kasa Şifresi Çözümü | AES-256 ile şifrelenmiş kasa yerel cihazda Secret Key yardımıyla açılır.30 | İstemci tarafındaki Master Key, HKDF ile 512-bite genişletilerek kasa çözülür.36 | Kasa verilerinin düz metin olarak sadece kullanıcının belleğinde var olması.36 |
| 4\. Acil Durum Erişimi | Asimetrik RSA paylaşımları ve özel kurtarma kitleri.38 | Grantor'un simetrik anahtarı, Grantee'nin RSA Açık Anahtarı ile şifrelenip sunucuda bekletilir.36 | Veri paylaşımında dahi sunucunun şifreyi çözememesi.39 |

### **Kriptografik Kararlar ve Mimari Analiz**

1Password ile Bitwarden arasındaki en temel felsefi ve mimari fark, anahtar türetme (Key Derivation) mekanizmasındadır.34 1Password, zayıf ana parolaların getirdiği kaba kuvvet riskini ortadan kaldırmak için, cihazda ilk kurulumda rastgele üretilen ve sadece kullanıcının sahip olduğu 128-bitlik bir "Secret Key" (Gizli Anahtar) zorunluluğu getirmiştir.32 Ana parola ile bu Gizli Anahtar birleştirilerek şifreleme anahtarları türetilir. Kasa verileri sunucudan sızdırılsa bile, saldırgan fiziksel cihazdaki Secret Key'i bilmediği için bulut tabanlı bir kaba kuvvet saldırısı matematiksel olarak imkansızdır.32

Açık kaynaklı Bitwarden mimarisinde ise, master parolanın hiçbir şekilde sunucuya gitmediği daha standart ancak sağlam bir iş akışı vardır.33 Kullanıcının parolası, e-posta adresi tuz (salt) olarak kullanılarak PBKDF2 algoritmasından (veya yeni nesil Argon2id) yüz binlerce kez geçirilerek 256-bit "Master Key" oluşturulur.35 Bu anahtardan bir kimlik doğrulama özeti türetilip sunucuya gönderilir; sunucu bu özeti kendi tarafında tekrar hashleyerek kimlik doğrular.36 Eş zamanlı olarak istemci, Master Key'i HKDF kullanarak 512-bite genişletir ve sunucudan indirdiği şifreli kasanın kilidini cihazda çözer.36

Sıfır bilgi mimarisinde en büyük zorluk, hesabın sahibine bir şey olduğunda verilerin başkasına nasıl aktarılacağıdır. Bitwarden Acil Durum Erişimi (Emergency Access) bu sorunu devasa bir asimetrik RSA şifreleme senkronizasyonu ile çözer.36 Erişim izni veren kullanıcı (Grantor), güvendiği kişiyi (Grantee) davet eder. Grantee kendi RSA Açık Anahtarını (Public Key) oluşturur. Grantor'un cihazı, kasayı açan "Kullanıcı Simetrik Anahtarını" alır ve Grantee'nin RSA Açık Anahtarı ile şifrelererek Bitwarden sunucularına yükler.36 Acil durum gerçekleşip bekleme süresi dolduğunda, sunucu bu şifreli paketi Grantee'ye iletir. Grantee kendi cihazındaki RSA Gizli Anahtarını (Private Key) kullanarak paketi çözer ve kasaya erişim sağlar.36 Sunucu bu süreçte hiçbir zaman düz metin anahtara dokunmaz.39

### **Güçlü Yanları**

1Password'un Secret Key mimarisi, zayıf insan parolalarından kaynaklanan güvenlik açıklarını yapısal olarak yamalamakta ve off-line kırılma (cracking) riskini sıfıra indirmektedir.34 Bitwarden'ın tamamen açık kaynak kodlu yapısı, bağımsız güvenlik araştırmacılarının kriptografik akışı denetlemesine olanak tanır ve RSA tabanlı Acil Durum Erişimi özelliği benzersiz bir güven modellemesi sunar.33

### **Zayıf Yanları**

Bitwarden modelinde, Master Parola zayıfsa ve kasa verileri çevrimdışı bir saldırganın eline geçerse, sadece PBKDF2/Argon2id fonksiyonlarının donanımsal kırma maliyetlerine (direncine) güvenilir; 1Password'de olduğu gibi ikincil bir Secret Key engeli bulunmamaktadır.32 Öte yandan 1Password'un kapalı kaynak yapısı, kurumsal şeffaflık açısından bazı soru işaretleri barındırmaktadır.

### **Bilinen Güvenlik Olayları**

Her iki platform da doğrudan çekirdek kriptografik mimarilerinin kırıldığı bir güvenlik zafiyeti veya büyük ölçekli bir kasa sızıntısı (LastPass olayında olduğu gibi) yaşamamıştır. Ancak Bitwarden ekosisteminde, açık kaynaklı istemcilerin modifiye edilerek sahte eklentilerle kullanıcılara sunulduğu oltalama saldırıları gözlemlenmiştir. Parola yöneticileri hedeflendiğinde genellikle cihaz seviyesindeki zararlı yazılımlar (infostealers) etkili olmaktadır, zira veriler cihazda çözülmüş halde bulunmaktadır.

### **Bizim Platform İçin Uygulanabilir Dersler**

Kritik kullanıcı verilerinin şifrelendiği sistemlerde (özellikle kasa veya cüzdan mimarilerinde), sunucunun şifre çözme yeteneğine tamamen kör bırakılması mutlak bir standart olmalıdır. Hesap kurtarma ve acil durum erişimi gibi işlemler, sunucunun anahtarı sıfırlamasıyla değil, asimetrik şifreleme (RSA / Eliptik Eğri) kullanılarak kullanıcıların cihazları arasında gerçekleşen güvenli anahtar değişimleriyle (Key Exchange) tasarlanmalıdır.36 İstemci tarafında parola tabanlı anahtar türetilecekse, GPU saldırılarına karşı bellek zorlu (memory-hard) Argon2id algoritması tercih edilmelidir.32

## **D. Cloudflare Access: Sıfır Güven (Zero Trust) Mimarisi ve Kısa Ömürlü Sertifikalar**

Cloudflare Access, geleneksel Sanal Özel Ağların (VPN) yerini alan, kimlik doğrulamasını ağ çevresi (network perimeter) seviyesinde değil, doğrudan kimlik ve cihaz bağlamı (context) bazında yapan modern bir Sıfır Güven (Zero Trust) mimarisidir.41

### **Mimari Diyagram ve Veri Akışı**

Erişim isteklerinin her birinin proxy üzerinden geçirildiği Cloudflare mimarisi aşağıdaki tabloda özetlenmiştir:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Doğrulama | IdP Entegrasyonu (Okta vb.) | Kullanıcı merkezi sağlayıcıda doğrulanır (SSO \+ MFA). | Cihaz sağlık durumunu da içeren bağlamsal yetkilendirme kararı.42 |
| 2\. İletişim | mTLS (Mutual TLS) | İstemci ve Cloudflare karşılıklı sertifika sunar. | Sadece doğrulanmış kurumsal cihazların API'lere erişebilmesi.44 |
| 3\. Yetkilendirme | SSH Certificate Authority | Başarılı giriş sonrası CA, 3 dakika ömürlü bir SSH sertifikası imzalar. | Statik parolaların veya uzun ömürlü SSH anahtarlarının ortadan kalkması.41 |
| 4\. Oturum İzleme | Identity-Aware Proxy | Proxy, kullanıcı ile kendisi ve sunucu arasında iki ayrı bağlantı açar. | Komut loglarının müşteri genel anahtarı ile şifrelenerek saklanması.41 |

### **Kriptografik Kararlar ve Mimari Analiz**

Cloudflare Access, BastionZero teknolojisinin entegre edilmesiyle geliştirilen "Access for Infrastructure" altyapısıyla kullanıcının hedef makineye doğrudan bağlanmasını engeller.41 Proxy, kullanıcı ile kendisi arasında bir SSH oturumu ve kendisi ile hedef sunucu arasında ayrı bir SSH oturumu açarak ortada (man-in-the-middle) yasal ve kontrollü bir denetim noktası oluşturur.41 Ağ trafiği bu proxy üzerinden gerçek zamanlı olarak izlenir ve tüm geliştirici komutları kayıt altına alınır. Kayıtlar, müşterinin sağladığı bir açık anahtar (Public Key) ile şifrelendiği için Cloudflare personeli bile bu logları okuyamaz.41 Servisler arası (machine-to-machine) otomatik iletişim için Service Tokens ve mTLS (Mutual TLS) istemci sertifikaları kullanılır, böylece her bağlantı asimetrik kriptografi ile doğrulanır.44

Mimariyi devrimsel kılan detay, Kısa Ömürlü Sertifikalar (Short-lived Certificates) uygulamasıdır. Geleneksel sistemlerde sunuculara yüklenen statik SSH açık anahtarları (public keys) aylarca veya yıllarca değiştirilmeden kalır, bu da sızma durumunda kalıcı erişim sağlar.43 Cloudflare Access, statik anahtarlar yerine, bulut tabanlı bir Certificate Authority (CA) kullanarak sadece **3 dakika** geçerliliği olan kısa ömürlü sertifikalar üretir.41 İstemci başarılı şekilde doğrulandığında üretilen bu sertifikada valid\_principals alanı bulunur ve hangi Linux kullanıcısının (örn: root, ubuntu) yetkilerinin alınacağı belirlenir.41 Sertifika 3 dakika içinde süresini doldurur ancak aktif SSH oturumu devam edebilir.

### **Güçlü Yanları**

Uzun ömürlü anahtar yönetimi yükü ortadan kalkar ve çalınan anahtarlarla ileriye dönük sızma (lateral movement) riskleri tamamen sıfırlanır.41 mTLS sayesinde, kurumsal ağa dahil olmayan hiçbir yetkisiz cihaz kritik sistemlere ulaşamaz.44 Uçtan uca komut günlüğü izleme ve şifreleme özelliği, iç tehdit (insider threat) risklerini güvenilir bir şekilde denetlenebilir kılar.41

### **Zayıf Yanları**

Mimaride bulut tabanlı merkezi bir CA (Certificate Authority) kullanılması, Cloudflare altyapısında yaşanabilecek bölgesel veya global bir çökme durumunda (Single Point of Failure) şirketlerin kendi sunucularına erişimini tamamen kesebilir. Proxy tabanlı araya girme (interception) işlemleri ise ağ iletişimindeki karmaşıklığı artırır ve gecikme sürelerine (latency) doğrudan etki eder.41

### **Bizim Platform İçin Uygulanabilir Dersler**

Veritabanlarına, iç sunuculara veya kritik API'lere yönetimsel erişim kesinlikle uzun ömürlü token'lar, statik SSH anahtarları veya kalıcı parolalar üzerinden yapılmamalıdır. Bunun yerine, kimlik doğrulamanın hemen ardından saniyeler/dakikalar içinde süresi dolan "kısa ömürlü (ephemeral) sertifikalar" üretilerek oturumlar açılmalı, yetki sızması (privilege creep) donanımsal/sertifikasal seviyede engellenmelidir.41 Servisler arası iletişimde mTLS standart haline getirilmelidir.

## **E. FIDO2 ve WebAuthn: Parolasız ve Oltalama Korumalı Standart**

Web Authentication API (WebAuthn), parolaların veya geleneksel SMS/OTP kodlarının yerini alan, World Wide Web Consortium (W3C) ve FIDO Alliance tarafından geliştirilen asimetrik (açık anahtarlı) kriptografi standardıdır.46 Bu mimarinin temel gayesi, oltalama (phishing) saldırılarını matematiksel düzeyde imkansız hale getirmektir.46

### **Mimari Diyagram ve Veri Akışı**

FIDO2 standardı, Attestation (Kayıt) ve Assertion (Giriş) olmak üzere iki katı fazdan oluşur 46:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Kayıt (Attestation) | Donanım (Authenticator) | Sunucu bir "challenge" gönderir. Cihaz yeni bir anahtar çifti üretir ve bunu üretici sertifikasıyla imzalar. | Cihazın sahte olmadığını kanıtlayan ve kök alan adına (origin) bağlanan Public Key.46 |
| 2\. Giriş (Assertion) | Donanım \+ İstemci | Sunucunun rastgele "challenge" verisi, cihazdaki özel anahtar (Private Key) ile imzalanır. | Ağ üzerinden hiçbir şifre gönderilmeden, kimlik ispatı (Proof of Possession) sağlanır.46 |
| 3\. Resident Keys | Passkeys Ekosistemi | Özel anahtar ve sunucu (Relying Party) bilgileri cihazda saklanır. | Kullanıcı adı girmeye gerek kalmadan (Autofill UI) tek dokunuşla giriş.46 |
| 4\. Non-Resident Keys | Sunucu Tarafı Depolama | Veriler cihazın ana anahtarı ile şifrelenip sunucuda "Credential ID" olarak tutulur. | Donanım kapasitesini aşan sonsuz sayıda kimlik saklama imkanı.46 |

### **Kriptografik Kararlar ve Mimari Analiz**

WebAuthn'in oltalama korumasının temelinde yatan karar, "Origin Binding" (Köken Bağlama) işlemidir.46 Üretilen anahtar çifti, kaydın yapıldığı web sitesinin kök alan adıyla (Relying Party ID) sıkı sıkıya kriptografik olarak birbirine bağlanır. Bir saldırgan google.com yerine g00gle.com gibi sahte bir giriş sayfası hazırlasa bile, tarayıcı API'si alan adının farklı olduğunu donanıma bildirir. Donanım (YubiKey veya Apple/Google Passkey altyapısı), farklı bir köken için imzalama yapmayı reddeder.46 Bu nedenle kullanıcı kandırılsa bile saldırı başarısız olur.

Cihaz doğrulama sırasında (Attestation), cihaz modelini ve üretici sertifikasını açığa çıkardığı için kullanıcıların internet üzerinde izlenmesine (tracking) neden olabilecek mahremiyet endişeleri doğmuştur. FIDO2 bu durumu çözmek için "Batch Attestation" (Grup Doğrulaması) stratejisini zorunlu kılar; üreticiler aynı sertifikayı en az 100.000 cihaza paylaştırarak spesifik bir kullanıcının kimliğinin belirlenmesini anonimleştirir.49 Keşfedilebilir (Discoverable) kimlik bilgileri olan Passkeys (Resident Keys), kullanıcının bir platformda kullanıcı adı bile girmesine gerek kalmadan, sadece biyometrik doğrulama ile hesapları listelemesini (Autofill UI) sağlayan modern bir yaklaşımdır.46

### **Güçlü Yanları**

Sistemin en büyük avantajı, Ortadaki Adam (MITM), oltalama (phishing) ve daha önceden çalınmış şifrelerin denenmesi (credential stuffing) saldırılarına karşı mutlak bir bağışıklık (immunity) sağlamasıdır.46 Passkeys teknolojisinin yaygınlaşması, biyometrik koruma ile donanım destekli asimetrik güvenliği birleştirerek kullanıcı deneyiminde (UX) muazzam bir akıcılık sunmaktadır.46 Sunucu sızıntılarında sadece açık anahtarların (public key) bulunması sızıntının etki alanını sıfırlar.46

### **Zayıf Yanları**

Büyük teknoloji şirketlerinin (Apple, Google, Microsoft) Passkey ekosistemleri, özel anahtarları kendi bulutlarında senkronize ettiği için (Synced passkeys) kullanıcıları belirli donanım veya yazılım ekosistemlerine kilitleme (vendor lock-in) eğilimi yaratmaktadır.47 Diğer bir kritik zayıflık, donanımsal anahtarların kaybedilmesi durumunda yaşanacak erişim kaybıdır; e-posta gibi geleneksel hesap kurtarma yöntemleri sisteme eklendiğinde FIDO2'nin sağladığı yüksek güvenlik duvarı tamamen bypass edilebilir bir arka kapıya dönüşmektedir.

### **Bizim Platform İçin Uygulanabilir Dersler**

Sistem mimarisinde parola kullanımı kademeli olarak sonlandırılmalı veya yüksek yetki gerektiren kritik işlemlerde (yönetici paneli, finansal transferler) WebAuthn kesinlikle zorunlu tutulmalıdır. Platform, Passkey (Resident Key) desteğini birinci sınıf bir özellik olarak sunmalı ve sosyal mühendislik / oltalama vektörlerini ağ seviyesinde kökünden çözmelidir.46

## **F. Matrix / Element: Dağıtık Kimlik, Çapraz İmzalama ve Federasyon**

Matrix, WhatsApp veya Signal gibi merkezi bir yapıdan farklı olarak, gerçek zamanlı iletişim için merkeziyetsiz (federated) bir protokoldür. XMPP'ye benzer şekilde sunucuların iletişim kurduğu bu yapıda, veri senkronizasyonu HTTPS üzerinden yapılırken, mahremiyet için Olm/Megolm şifreleme katmanları eklenmiştir.51

### **Mimari Diyagram ve Veri Akışı**

Cihazlar arası güven ve mesaj şifreleme süreci aşağıdaki tabloda yapılandırılmıştır:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Şifreleme (E2EE) | Olm & Megolm | Curve25519 ve Ed25519 anahtar çiftleri üretilir. Birebir için Olm, gruplar için Megolm. | AES-256 ve HMAC-SHA-256 ile korunan, her mesajda dönen ileri gizlilik (ratcheting).53 |
| 2\. Güven İnşası | Çapraz İmzalama | Master key, Self-signing key ve User-signing key üretilir. Cihazlar birbiriyle imzalanır. | Yeni eklenen cihazın tüm ağda otomatik güvenilir kabul edilmesi.54 |
| 3\. Doğrulama | SAS (Kısa Doğrulama) | İstemciler arası Emoji veya QR kod karşılaştırması yapılır. | ECDH üzerinden ortak anahtar ve MAC değişimi ile kanıtlanmış kimlik.54 |
| 4\. Veri Senkronu | SSSS | Çapraz imzalama anahtarları cihazda şifrelenip sunucuya atılır. | Sunucunun çözemediği yedekler (Secure Secret Storage).54 |
| 5\. Federasyon | MAS / OIDC | Sunucular arası HTTPS ve git-stili imza. İstemci auth işlemleri için OIDC geçişi. | Matrix Authentication Service (MAS) ile modern kimlik federasyonu.52 |

### **Kriptografik Kararlar ve Mimari Analiz**

Matrix mimarisi, kullanıcının cihaz bazında (per-device) şifrelenmesine dayanır.51 Uçtan Uca Şifreleme (E2EE) için birebir iletişimde **Olm** protokolü, grup mesajlaşmalarında ise performans artışı sağlamak için **Megolm** protokolü kullanılır.51 Her cihaz bir Curve25519 kimlik anahtarı (Identity key) ve tek kullanımlık iletişim anahtarları üretir.53 Megolm, grup mesajları için HMAC-SHA-256 ve AES-256 kullanarak her mesajda anahtarın hashini alarak bir sonrakini türetir (forward secrecy ratcheting).53

Çapraz İmzalama (Cross-signing) ve Cihaz Doğrulama, Matrix'in en devrimci mimarilerinden biridir. Geleneksel E2EE mimarilerinde her yeni cihaz eklendiğinde karşı tarafın manuel olarak bu cihazı onaylaması gerekirdi. Matrix sisteminde kullanıcı üç farklı Ed25519 anahtarı üretir (Master, Self-signing, User-signing).54 Kullanıcı SAS (Short Authentication String) mekanizmasıyla emojileri karşılaştırıp yeni cihazını kendi onayladığında, bu güvenilir imza durumu tüm ağa otomatik olarak yayılır.54 Cihaz kaybedilirse, SSSS (Secure Secret Storage and Sharing) protokolü devreye girer. Kullanıcının çapraz imzalama anahtarları yerel bir parola veya kurtarma anahtarı ile cihazda şifrelenir ve Matrix sunucusunda kör bir şekilde saklanır.54

Kimlik yönetimi ve federasyon tarafında, Matrix 2.0 vizyonu ile geleneksel ve hantal yapı terkedilmiş, endüstri standardı olan OAuth 2.0 ve OpenID Connect (OIDC) temelli Matrix Authentication Service (MAS) devreye sokulmuştur.57 MAS sayesinde hesap yönetimi ana mesajlaşma sunucusundan (Synapse) izole edilmiş ve kurumsal SSO/SAML entegrasyonları kusursuz hale getirilmiştir.57 Sunucular (homeservers) birbiriyle iletişim kurarken veriyi HTTPS ile şifreler ve kendi özel anahtarlarıyla git benzeri bir protokolle imzalayarak veri sahteciliğini önler.52

### **Güçlü Yanları**

Cihaz başına (per-device) bağımsız şifreleme mantığı, bir kullanıcının eski cihazı ele geçirilse bile ileriye dönük üretilen anahtarların güvende kalmasını sağlar.51 Sistemin merkeziyetsiz doğası sayesinde, ana sunucunun çökmesi durumunda bile katılımcı diğer sunucular eksik veri senkronizasyonunu tamamlayarak ağın yaşamaya devam etmesini sağlar.52 MAS ile OIDC geçişi, kurumsal entegrasyonlar için benzersiz bir esneklik sunmuştur.57

### **Zayıf Yanları**

Kriptografik ve mimari karmaşıklık had safhadadır. Olm, Megolm, Çapraz imzalama, SAS, SSSS, cihaz doğrulama, anahtar rotasyonu ve yedekleme mekanizmalarının tümünü destekleyen güvenli istemciler (clients) geliştirmek ve denetlemek muazzam zordur.54 Federasyon mimarisinin getirdiği temel dezavantaj ise metadata sızıntısıdır. Hangi sunucuların hangi odalara dahil olduğu ve kullanıcıların kimlerle etkileşime girdiği bilgisi, mesaj içerikleri okunamasa bile federasyona dahil olan diğer sunucular arasında açığa çıkmaktadır.61

### **Bizim Platform İçin Uygulanabilir Dersler**

Çoklu cihaz senkronizasyonunda uçtan uca şifrelemeyi kırmadan yetki aktarımı yapabilmek için Matrix'in "Çapraz İmzalama" (Cross-signing) konseptinden feyz alınmalıdır.54 Kritik güvenlik anahtarlarının bulutta yedeklenmesi elzemse, SSSS modelindeki gibi sadece kullanıcının yerel olarak çözebileceği AES paketleri olarak iletilmelidir.54 Sistemler arası entegrasyon ve hesap yetkilendirmelerinde Matrix 2.0 (MAS) mimarisinde olduğu gibi doğrudan OIDC / OAuth 2.0 standartlarına bağlı kalınmalıdır.58

## **G. Tor Project:.onion Hizmetleri ve İstemci Yetkilendirmesi**

Tor ağı, IP adreslerini gizleyerek hem istemcinin hem de sunucunun anonim kalmasını sağlayan, internet katmanının üzerinde çalışan bir ağdır.62 Versiyon 3 (v3) onion hizmetleri, önceki nesillerin kriptografik zayıflıklarını gidermiş devasa bir güvenlik atılımıdır.

### **Mimari Diyagram ve Veri Akışı**

Tor ağında sunucuların anonimliğini sağlayan mimari aşağıdaki tabloda gösterilmiştir:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Adres Üretimi | v3 Onion Adresleri | Sunucu, 256-bit ed25519 anahtar çifti oluşturur. Adres aslında anahtarın base32 halidir. | IP adresi yerine geçen, kendi kendini doğrulayan kimlik uzayı (![][image1]).62 |
| 2\. İstemci Kaydı | x25519 Kimlik Bilgileri | İstemci x25519 anahtar çifti üretir ve açık anahtarını sunucu yöneticisine .auth olarak verir. | Servisin dış dünyaya tamamen kapatılması (Client Authorization).64 |
| 3\. Ağ Erişimi | Descriptor Çözümü | İstemci, servisin ağdaki tanıtıcısını kendi özel anahtarıyla çözer ve imzalar. | Ağ katmanında şifreli kimlik kanıtı, yetkisiz node'ların reddi.64 |
| 4\. Özel Adresler | Vanity / Brute-Force | Kısmen anlamlı adres (örn: mysitename) elde edene kadar Shallot gibi araçlarla hash aranır. | Hatırlanabilirliği artıran ancak uzayı küçültmeyen kriptografik adresler.67 |

### **Kriptografik Kararlar ve Mimari Analiz**

Tor ağında bir gizli sunucunun (Onion Service) bilinen bir IP adresi yoktur, bunun yerine asimetrik bir açık anahtar (Public Key) ile kendisini ağa tanıtır.62 Geleneksel HTTP trafiğinde alan adları DNS üzerinden çözümlenirken ve merkezi sertifika otoriteleri (CA) kullanılırken, Tor ağında .onion adresinin kendisi aslında sunucunun 256-bitlik **ed25519** açık anahtarıdır.63 İstemci bu adrese bağlandığında ağ içi devreler (circuits) üzerinden rastgele randevu (rendezvous) noktaları kurulur, tüm iletişim uçtan uca şifrelenir ve NAT/Firewall sorunları aşılarak dışarıya doğrudan güvenli tünel açılır.62 Tor istemcileri ed25519 anahtarlarının torsiyon (torsion) bileşenlerini reddedecek şekilde tasarlanmıştır; bu, saldırganların aynı anahtara yönlendiren birden fazla oltalama amaçlı eşdeğer adres yaratmasını matematiksel olarak engeller.63 V3 adres uzayı ![][image1] büyüklüğünde devasa bir kapasiteye sahiptir ve ağa katılarak gizli hizmetleri listelemek (enumerating) olanaksızlaştırılmıştır.63

İstemci Yetkilendirmesi (Client Authorization), yalnızca adresi bilenlerin değil, kriptografik olarak sunucu tarafından izin verilmiş kişilerin servise ulaşmasını sağlayan çok güçlü bir ağ seviyesi yalıtım mekanizmasıdır.64 İstemci bir **x25519** anahtar çifti oluşturur.64 Açık anahtarını (Public Key), base32 formatına dönüştürerek sunucu yöneticisine iletir ve sunucu bu dosyayı authorized\_clients dizinine yerleştirir.65 İstemci servise bağlanmak istediğinde, kendi özel anahtarını kullanarak servisin ağdaki descriptor (tanımlayıcı) paketini çözer ve imzalar.64 Bu sayede kimlik doğrulama, daha HTTP veya uygulama katmanına ulaşmadan, doğrudan Tor'un anonimleştirme katmanının üzerinde gerçekleşir ve yetkisiz tarayıcılara karşı servis tamamen görünmez (dark) kalır.

Kullanıcı deneyimini artırmak için adresin baş harflerini anlamlı kelimelere (örneğin mysitename...onion) dönüştürmek amacıyla Vanity (Brute-force) adresler üretilir.67 Bu işlem Shallot veya Onionbalance gibi araçlarla arzulanan karakter dizisi çıkana kadar donanımsal brute-force uygulanarak yapılır.68 Kriptografik açıdan üretilen anahtarın güvenliği zayıflamaz ve aynı güvenlik direncini korur; sadece brute-force arama uzayı spesifik bir alan için harcanmış olur.68

### **Güçlü Yanları**

Geleneksel mimarilerin aksine IP adresini, konumu ve sunucu topolojisini hem istemci hem de hedefler için tamamen gizler (Location hiding).62 İstemci yetkilendirmesi, hedef sistemin dış dünyaya (tarayıcılara veya ağ güvenlik botlarına) tamamen görünmez olmasını sağlar ve DDoS saldırılarını uygulama katmanına inmeden keser.64 Merkezi bir sertifika otoritesine (CA) ihtiyaç duymayan "adres \= açık anahtar" prensibi ile siber zorbalığı ve sansürü temelden yok eder.69

### **Zayıf Yanları**

Kriptografik 56 karakterli adreslerin ezberlenmesi imkansızdır; bu da kopyala-yapıştır veya Vanity adres üretimleri üzerinden oltalama (phishing/typosquatting) risklerini tırmandırır.67 Tor ağındaki çoklu röle (relay) zıplamaları, gecikme süresi (latency) ve bant genişliği sınırlamaları nedeniyle modern web uygulamaları (örneğin video konferans veya gerçek zamanlı iletişim) için performansı çok düşük kılmaktadır.

### **Bizim Platform İçin Uygulanabilir Dersler**

Ağa erişimin gizliliğinin hayati önem taşıdığı, sansüre dirençli uygulamalarda (örneğin ihbar hatları, güvenlik gazeteciliği ağları) kimlik doğrulama sadece uygulama katmanında değil, doğrudan bağlantı katmanında asimetrik x25519 anahtarları kullanılarak (Tor Client Authorization benzeri) tasarlanmalıdır.65 Bu, saldırganların güvenlik zafiyeti arayacağı uygulama sunucusunun IP adresini gizleyerek "görünmez altyapılar" yaratmak için eşsiz bir yöntemdir.

## **H. Supabase Auth: JWT Ekosistemi, Veritabanı Entegrasyonu ve OTP Mekanizması**

Supabase Auth, Netlify'ın GoTrue sunucusundan dallanmış (fork) ve Supabase'in PostgreSQL merkezli ürün ekosistemine derinlemesine entegre edilmiş, Go dili ile yazılmış açık kaynaklı bir kimlik doğrulama API sunucusudur.72 Kimlik doğrulama işlemlerini doğrudan PostgreSQL'in Row Level Security (RLS) özellikleri ile birleştirerek, "middleware" yükünü hafifletip güvenliği veritabanı satırı (row) seviyesine indirir.73

### **Mimari Diyagram ve Veri Akışı**

Sistemin oturum yönetimi ve veritabanı yetkilendirme akışı aşağıdaki tabloda modellenmiştir:

| Aşama | Bileşen | Aksiyon ve Veri Akışı | Kriptografik Çıktı ve Koruma |
| :---- | :---- | :---- | :---- |
| 1\. Kimlik Oluşturma | GoTrue (Auth) | Kong API Gateway arkasında çalışan sunucu, PostgreSQL auth şemasını yönetir. | Harici API'lere kapalı güvenli kimlik veritabanı yalıtımı.73 |
| 2\. Oturum | JWT (JSON Web Token) | Başarılı giriş sonrası kısa ömürlü Access Token ve uzun ömürlü Refresh Token üretilir. | Merkezi sunucu onayı gerektirmeyen, durumu (state) içinde taşıyan kriptografik token.75 |
| 3\. Rotasyon | Refresh Token Rotation | Token yenilenirken eski token iptal edilir, çalınma girişimi (reuse) tespit edilirse tüm zincir iptal edilir. | XSS veya sızıntı durumlarında hesabın tamamen kaybedilmesini engelleyen otomatik savunma.77 |
| 4\. Parolasız Giriş | Magic Link / OTP & PKCE | Kullanıcı e-postasına 6 haneli kod veya URL gönderilir. İstek PKCE ile doğrulanır. | Kötü niyetli bağlantı tıklamalarını engelleyen URL şifre takası.78 |
| 5\. Veri Erişimi | Row Level Security (RLS) | İstemciden gelen JWT'nin içindeki sub veya role PostgreSQL tarafından analiz edilir. | Sorguların kimlik doğrultusunda doğrudan veritabanı motoru tarafından kısıtlanması.73 |

### **Kriptografik Kararlar ve Mimari Analiz**

Supabase Auth, oturum yönetimini ölçeklenebilirlik, esneklik ve maliyet optimizasyonu nedenleriyle tamamen JSON Web Token (JWT) temeline dayandırmaktadır.74 Auth sunucusu (GoTrue) kimlik bilgilerini doğruladığında, kısa ömürlü Erişim Token'ları (Access Token) ve uzun ömürlü Yenileme Token'ları (Refresh Token) üretir.75 Mimarinin merkezindeki karar, API istekleri geldiğinde bu isteklerin veritabanında doğrudan Row Level Security (RLS) mekanizmalarınca denetlenmesidir. JWT içindeki sub (kullanıcı ID) veya rol (role) talepleri (claims) SQL sorgularına entegre edilerek veri filtrelemesi yapılır, böylelikle yetkilendirme (authorization) veri katmanında çözülmüş olur.73

JWT'lerin statik yapısı gereği süresi dolana kadar iptal edilememeleri (statelessness), sistem tasarımında güvenlik riskleri oluşturmaktadır.83 Supabase bu riski aşmak için "Refresh Token Rotation" (Yenileme Token'ı Rotasyonu) uygular.76 Rotasyon aktif edildiğinde, bir istemci yeni bir token aldığında eski refresh token iptal edilir. Eğer kötü niyetli bir saldırgan, önceden sızdırılmış ve iptal edilmiş bir yenileme token'ını tekrar kullanmaya kalkarsa (Reuse detection), GoTrue sunucusu bu yetkisiz girişimi anında algılar ve o ihlal edilen token soyundan (descended) gelen tüm token ailesini anında iptal ederek kullanıcının oturumunu tamamen sonlandırır.77

Parolasız (passwordless) doğrulama süreçleri için Magic Link veya Email OTP yöntemleri kullanılır.79 Supabase bu süreçte Server-Side Rendering (SSR) kullanan web çerçeveleri (Next.js, SvelteKit vb.) için güvenlik katmanı olarak **PKCE (Proof Key for Code Exchange)** akışını zorunlu tutar.76 PKCE sayesinde, e-posta bağlantısını ağ üzerinde ele geçiren bir saldırganın URL'den kimlik kodunu çalıp kendi tarayıcısında oturum açması engellenir; çünkü şifre değişimi sadece ilk başta yerel tarayıcıda rastgele kod üreticisi (code verifier) olan asıl istemci tarafından gerçekleştirilebilir.78 Rate limiting kuralları sistemin güvenliği için sıkı tutulmuştur; bir kullanıcı 60 saniyelik pencerelerle saatte en fazla 30 OTP talebinde bulunabilir.79 OTP'lerin varsayılan geçerlilik süresi kaba kuvvet saldırılarına zemin hazırlamaması amacıyla 1 saatle sınırlandırılmış ve maksimum 24 saat olarak kilitlenmiştir.79

### **Güçlü Yanları**

PostgreSQL RLS ile yaratılan entegrasyon, sistemdeki aracı katmanlarda (middleware) yapılan geleneksel yetki kontrollerindeki yazılım hatalarını baypas ederek, doğrudan veritabanı seviyesinde kırılması imkansıza yakın bir güvenlik (zero-trust database tier) sağlar.73 Refresh Token Rotation özelliği, tarayıcılarda yaşanabilecek XSS veya yerel depolama token çalınması durumunda hesabın tamamen ve süresiz ele geçirilmesini engeller.77 PKCE entegrasyonu, Magic Link kullanımında MITM ve URL dinleme saldırılarını kriptografik olarak kırar.78

### **Zayıf Yanları**

Parolasız e-posta bağlantılarında en büyük mimari zaaf, **E-posta Ön Okuma (Email Prefetching)** sorunudur. Birçok kurumsal güvenlik duvarı ve e-posta filtresi (örneğin Microsoft Defender), zararlı yazılım tespiti için gelen kutusuna düşen bağlantılara arka planda botlarla tıklar. Supabase'in OTP altyapısında bu bağlantılar tek kullanımlık (one-time) olduğu için, bağlantı bot tarafından anında tüketilir ve gerçek kullanıcı tıklamak istediğinde "403 Forbidden" veya otp\_expired hatalarıyla karşılaşır.85 Diğer bir zayıflık ise, SSR mimarilerinde JWT ve çerez (cookie) yönetiminin getirdiği karmaşıklıktır; yükün büyük oranda ön yüze (front-end) yıkılması uygulama geliştiricilerin güvenlik açıklarına neden olmasına yol açabilmektedir.78

### **Bilinen Güvenlik Olayları**

Supabase Auth (GoTrue), tarihi boyunca mimari açıklarla karşılaşmış ve bunları yamalamıştır:

* **ID Token Taklidi / OIDC Zafiyeti (CVE / GHSA-v36f-qvww-8w8m):** Bir saldırganın, kendi kontrolündeki bir OIDC (OpenID Connect) sağlayıcısından, Apple veya Azure SSO kullanan bir kurbanın e-posta adresini içeren asimetrik imzalı geçerli bir ID Token ürettiği tespit edilmiştir. Bu sahte token, Supabase Auth token uç noktasına iletildiğinde, sistem issuer (sağlayıcı) doğrulaması yapmadan mağdurun gerçek hesabına saldırganı bağlayabilmiştir (Versiyon 2.185.0 ile yama yapılmıştır).89  
* **X-Forwarded-Host Enjeksiyonu (GHSA-3529-5m8x-rpv3):** Auth sunucusuna gönderilen HTTP başlıklarında (X-Forwarded-Host ve X-Forwarded-Proto) manipülasyon yapılarak, sistemin gönderdiği parola sıfırlama veya sihirli bağlantı e-postalarındaki yönlendirme URL'lerinin saldırganın kontrolündeki sunuculara yönlendirilebildiği bir açık keşfedilmiştir. Bağlantıya tıklayan kullanıcılar yetkilendirme kodlarını farkında olmadan saldırgana teslim etmiş, Supabase bu açığı yüksek kritiklik (CVSS: 7.3) seviyesiyle kapatmıştır.91

### **Bizim Platform İçin Uygulanabilir Dersler**

Sistemimizde JWT mimarisi tercih edilecekse, token hırsızlığını engellemek için Supabase örneğindeki gibi Yenileme Token'ı Rotasyonu (Refresh Token Rotation) ve yeniden kullanım tespit (Reuse Detection) mekanizması kesinlikle implemente edilmelidir.77 Parolasız sistemler (Magic Links) kullanılacaksa, e-posta prefetch botlarının tıklamalarını tüketmemesi için HTTP GET üzerinden sistemi değiştiren (state-changing) talepler yerine, bağlantı tıklandığında istemci tarayıcısında bir sayfa açıp ardından kullanıcı etkileşimiyle (bir butona tıklayarak) HTTP POST veya PKCE şifre takası gerçekleştiren akışlar tasarlanmalıdır.79 Ayrıca, Dış kimlik sağlayıcılarla (OIDC/SSO) yapılan entegrasyonlarda, token veren kaynağın (issuer validation) kimlik doğrulama listeleri son derece sıkı denetlenmeli ve HTTP header enjeksiyonlarına karşı reverse proxy katmanı sanitize edilmelidir.90

## **Genel Sonuç ve Mimari Sentez**

Modern kimlik doğrulama sistemleri üzerine yapılan bu kapsamlı mimari analiz, güvenlik kavramının sadece şifreleme algoritmaları seçmekten ibaret olmadığını; veritabanı şemalarından ağ protokollerine, istemci donanımlarından hukuki veri yönetimi zorunluluklarına kadar uzanan çok boyutlu bir sistem mühendisliği (Zero Trust, Zero-Knowledge) tasarımı gerektirdiğini açıkça göstermektedir.

Farklı platformların tasarımları incelendiğinde öne çıkan devrimsel mimari geçişler ve endüstri standartları şu prensipler altında birleşmektedir:

1. **Donanımsal İzolasyon ve Oltalama Bağışıklığı (WebAuthn ve Matrix/Bitwarden Yaklaşımı):** Kullanıcıyı sosyal mühendislik ve oltalama (phishing) saldırılarından korumanın yegane yolu, güven zincirini insanın bilişsel zafiyetlerinden çıkarıp doğrudan cihaz donanımına ve asimetrik kriptografiye teslim etmektir. WebAuthn'in getirdiği Origin Binding (köken bağlama) mekanizması, internet dünyasında parola hırsızlığını tamamen ortadan kaldıran en büyük adımdır.46 İkincil olarak, sunucunun asla kullanıcı verilerini çözecek anahtara sahip olmaması prensibi (Bitwarden ve ProtonMail örneği), sistemin acil durum erişimi (Emergency Access) veya veri kurtarma gibi istisnai senaryolarda dahi RSA / PAKE asimetrik anahtar değişimleriyle (Key Exchange) güvende kalmasını sağlar.22  
2. **Statik Varlıkların Yok Edilmesi ve Sıfır Güven (Cloudflare Access ve Supabase Modeli):** Uzun ömürlü parolalar ve statik API/SSH anahtarları modern siber güvenlik krizlerinin merkezindedir. Cloudflare'in kimlik bazlı 3 dakikalık geçici sertifikaları (ephemeral certificates) 41 ve Supabase'in PKCE tabanlı rotasyonlu token sistemleri 77, yetkilendirme işlemini statik bir sır (secret) ifşasından çıkarıp dinamik, izlenebilir ve otomatik olarak kendini imha eden bir oturum politikasına dönüştürmüştür.  
3. **Metadata ve Bağlam Gizliliği (Signal ve Tor Modeli):** ProtonMail'in İsviçre yasaları önünde şifreli e-postaları koruyabilmesine rağmen aktivistin IP adresi ve giriş saatleri gibi metadatalarını teslim etmek zorunda kalması 25, uçtan uca şifrelemenin (E2EE) metadata gizliliği olmadan tek başına eksik bir mimari olduğunu tarihsel olarak kanıtlamıştır. Signal'in Sealed Sender (Mühürlü Gönderici) mimarisi ile gönderici kimliğini sunucu işlemcilerinden bile saklaması 5 veya Tor ağının v3 onion istemci yetkilendirmesi (Client Authorization) ile ağ adreslerini tamamen ortadan kaldırması 62, en yüksek güvenlik gereksinimli sistemlerin hedeflemesi gereken "Ağ Katmanında Sıfır Bilgi" paradigmasının ulaşılması gereken en üst noktasıdır.

Sistem tasarımları gerçekleştirilirken, dış tehditler kadar iç sızıntıların (insider threats) da gözetilmesi gerektiği; veri şifreleme ve kimlik doğrulama süreçlerinin birbirinden bağımsız yürütülerek, güvenliğin çok katmanlı, donanım destekli ve merkeziyetsiz bir mimaride şekillendirilmesi gerektiği anlaşılmaktadır. Bu yaklaşım, sadece günümüz siber saldırılarını değil, gelecekte ortaya çıkabilecek yasal dayatmaları ve altyapı çöküşlerini de (resilience) hesaba katan dayanıklı sistemler inşa etmenin yegane formülüdür.

#### **Alıntılanan çalışmalar**

1. Exploring Modern Web App Architectures: Trends and Best Practices for 2026 \- Techstack Ltd, erişim tarihi Mart 19, 2026, [https://tech-stack.com/blog/modern-application-development/](https://tech-stack.com/blog/modern-application-development/)  
2. Ultimate Guide to Modern Web App Architecture | Antler Digital, erişim tarihi Mart 19, 2026, [https://antler.digital/blog/ultimate-guide-to-modern-web-app-architecture](https://antler.digital/blog/ultimate-guide-to-modern-web-app-architecture)  
3. A Review and Comparative Analysis of Relevant Approaches of Zero Trust Network Model, erişim tarihi Mart 19, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC10892953/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10892953/)  
4. Authentication Challenges and Solutions in Microservice Architectures \- MDPI, erişim tarihi Mart 19, 2026, [https://www.mdpi.com/2076-3417/15/22/12088](https://www.mdpi.com/2076-3417/15/22/12088)  
5. Technology preview: Sealed sender for Signal, erişim tarihi Mart 18, 2026, [https://signal.org/blog/sealed-sender/](https://signal.org/blog/sealed-sender/)  
6. Signal \>\> Blog, erişim tarihi Mart 19, 2026, [https://signal.org/blog/](https://signal.org/blog/)  
7. Signal PIN, erişim tarihi Mart 18, 2026, [https://support.signal.org/hc/en-us/articles/360007059792-Signal-PIN](https://support.signal.org/hc/en-us/articles/360007059792-Signal-PIN)  
8. Signal \>\> Blog \>\> Introducing Signal PINs, erişim tarihi Mart 18, 2026, [https://signal.org/blog/signal-pins/](https://signal.org/blog/signal-pins/)  
9. Technology preview: Private contact discovery for Signal, erişim tarihi Mart 19, 2026, [https://signal.org/blog/private-contact-discovery/](https://signal.org/blog/private-contact-discovery/)  
10. What does sealed sender do and what are the optimal settings for security? : r/signal, erişim tarihi Mart 18, 2026, [https://www.reddit.com/r/signal/comments/1iyvef8/what\_does\_sealed\_sender\_do\_and\_what\_are\_the/](https://www.reddit.com/r/signal/comments/1iyvef8/what_does_sealed_sender_do_and_what_are_the/)  
11. Is Signal safe? What to know about this encrypted messaging app \- Proton, erişim tarihi Mart 19, 2026, [https://proton.me/blog/is-signal-safe](https://proton.me/blog/is-signal-safe)  
12. Technical Question: How does signal NOT track the sender and recipient (and thereby track social graph metadata)? (Recipient identity token) \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/signal/comments/1dzlece/technical\_question\_how\_does\_signal\_not\_track\_the/](https://www.reddit.com/r/signal/comments/1dzlece/technical_question_how_does_signal_not_track_the/)  
13. Improving Signal's Sealed Sender \- Network and Distributed System Security (NDSS) Symposium, erişim tarihi Mart 18, 2026, [https://www.ndss-symposium.org/wp-content/uploads/ndss2021\_1C-4\_24180\_paper.pdf](https://www.ndss-symposium.org/wp-content/uploads/ndss2021_1C-4_24180_paper.pdf)  
14. Twilio Incident: What Signal Users Need to Know, erişim tarihi Mart 19, 2026, [https://support.signal.org/hc/en-us/articles/4850133017242-Twilio-Incident-What-Signal-Users-Need-to-Know](https://support.signal.org/hc/en-us/articles/4850133017242-Twilio-Incident-What-Signal-Users-Need-to-Know)  
15. Signal and WhatsApp accounts targeted in phishing campaign \- Malwarebytes, erişim tarihi Mart 19, 2026, [https://www.malwarebytes.com/blog/news/2026/03/signal-and-whatsapp-accounts-targeted-in-phishing-campaign](https://www.malwarebytes.com/blog/news/2026/03/signal-and-whatsapp-accounts-targeted-in-phishing-campaign)  
16. 0click Social Media De-Anonymization with Push Notifications, Emojis, Avatars \- Reddit, erişim tarihi Mart 18, 2026, [https://www.reddit.com/r/cybersecurity/comments/1p0kfrf/0click\_social\_media\_deanonymization\_with\_push/](https://www.reddit.com/r/cybersecurity/comments/1p0kfrf/0click_social_media_deanonymization_with_push/)  
17. New 0-Click Attack Can Geolocate Signal and Discord Users \- CyberInsider, erişim tarihi Mart 19, 2026, [https://cyberinsider.com/new-0-click-attack-can-geolocate-signal-and-discord-users/](https://cyberinsider.com/new-0-click-attack-can-geolocate-signal-and-discord-users/)  
18. Unique 0-click deanonymization attack targeting Signal, Discord and hundreds of platform, erişim tarihi Mart 18, 2026, [https://gist.github.com/igorjs/7910e70b12a7e68921c0b59a75cc3422](https://gist.github.com/igorjs/7910e70b12a7e68921c0b59a75cc3422)  
19. Cloudflare CDN Bug Outs User Locations on Signal, Discord \- Dark Reading, erişim tarihi Mart 18, 2026, [https://www.darkreading.com/threat-intelligence/cloudflare-cdn-bug-outs-user-locations-signal-discord](https://www.darkreading.com/threat-intelligence/cloudflare-cdn-bug-outs-user-locations-signal-discord)  
20. How dangerous are Signal vulnerabilities? | Kaspersky official blog, erişim tarihi Mart 19, 2026, [https://www.kaspersky.com/blog/signal-desktop-file-vulnerabilities/46978/](https://www.kaspersky.com/blog/signal-desktop-file-vulnerabilities/46978/)  
21. How data recovery works with end-to-end encryption | Proton, erişim tarihi Mart 18, 2026, [https://proton.me/blog/data-recovery-end-to-end-encryption](https://proton.me/blog/data-recovery-end-to-end-encryption)  
22. The Proton Authenticator security model | Proton, erişim tarihi Mart 18, 2026, [https://proton.me/blog/authenticator-security-model](https://proton.me/blog/authenticator-security-model)  
23. The Proton Pass security model, erişim tarihi Mart 18, 2026, [https://proton.me/blog/proton-pass-security-model](https://proton.me/blog/proton-pass-security-model)  
24. Improved Authentication for Email Encryption and Security | Proton, erişim tarihi Mart 18, 2026, [https://proton.me/blog/encrypted-email-authentication](https://proton.me/blog/encrypted-email-authentication)  
25. ProtonMail forced to log user's IP address after order from Swiss authorities, erişim tarihi Mart 18, 2026, [https://www.welivesecurity.com/2021/09/07/protonmail-log-users-ip-address/](https://www.welivesecurity.com/2021/09/07/protonmail-log-users-ip-address/)  
26. ProtonMail said Swiss court order left no choice but to log activist's IP address | CyberScoop, erişim tarihi Mart 18, 2026, [https://cyberscoop.com/protonmail-swiss-court-ip-france/](https://cyberscoop.com/protonmail-swiss-court-ip-france/)  
27. ProtonMail Logs Activist's IP Address With Authorities After Swiss Court Order, erişim tarihi Mart 18, 2026, [https://thehackernews.com/2021/09/protonmail-shares-activists-ip-address.html](https://thehackernews.com/2021/09/protonmail-shares-activists-ip-address.html)  
28. Impact of Swiss surveillance laws on secure email \- Proton, erişim tarihi Mart 18, 2026, [https://proton.me/blog/swiss-surveillance-law](https://proton.me/blog/swiss-surveillance-law)  
29. Swiss court ruling strengthens privacy for email providers | Proton, erişim tarihi Mart 18, 2026, [https://proton.me/blog/court-strengthens-email-privacy](https://proton.me/blog/court-strengthens-email-privacy)  
30. Bitwarden vs. 1Password: Which password manager is right for you?, erişim tarihi Mart 18, 2026, [https://1password.com/blog/bitwarden-vs-1password](https://1password.com/blog/bitwarden-vs-1password)  
31. Bitwarden security fundamentals and multifactor encryption, erişim tarihi Mart 18, 2026, [https://bitwarden.com/blog/bitwarden-security-fundamentals-and-multifactor-encryption/](https://bitwarden.com/blog/bitwarden-security-fundamentals-and-multifactor-encryption/)  
32. Bitwarden vs 1Password: How Much Does the Secret Key Matter? \- Reddit, erişim tarihi Mart 18, 2026, [https://www.reddit.com/r/Bitwarden/comments/1rf8oqv/bitwarden\_vs\_1password\_how\_much\_does\_the\_secret/](https://www.reddit.com/r/Bitwarden/comments/1rf8oqv/bitwarden_vs_1password_how_much_does_the_secret/)  
33. Understanding Bitwarden architecture, erişim tarihi Mart 18, 2026, [https://bitwarden.com/blog/understanding-bitwarden-architecture/](https://bitwarden.com/blog/understanding-bitwarden-architecture/)  
34. 1Password vs Bitwarden | Password Manager Comparison, erişim tarihi Mart 19, 2026, [https://1password.com/compare/bitwarden-vs-1password](https://1password.com/compare/bitwarden-vs-1password)  
35. Bitwarden Security Whitepaper, erişim tarihi Mart 18, 2026, [https://www.avangate.it/wp-content/uploads/2024/04/help-bitwarden-security-white-paper.pdf](https://www.avangate.it/wp-content/uploads/2024/04/help-bitwarden-security-white-paper.pdf)  
36. Bitwarden Security Whitepaper, erişim tarihi Mart 19, 2026, [https://bitwarden.com/help/bitwarden-security-white-paper/](https://bitwarden.com/help/bitwarden-security-white-paper/)  
37. Security FAQs \- Bitwarden, erişim tarihi Mart 18, 2026, [https://bitwarden.com/help/security-faqs/](https://bitwarden.com/help/security-faqs/)  
38. Bitwarden vs. 1Password \- Security.org, erişim tarihi Mart 19, 2026, [https://www.security.org/password-manager/bitwarden-vs-1password/](https://www.security.org/password-manager/bitwarden-vs-1password/)  
39. How does Emergency Access work? : r/Bitwarden \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/Bitwarden/comments/1cwrqwa/how\_does\_emergency\_access\_work/](https://www.reddit.com/r/Bitwarden/comments/1cwrqwa/how_does_emergency_access_work/)  
40. Log In With Emergency Access \- Bitwarden, erişim tarihi Mart 19, 2026, [https://bitwarden.com/help/emergency-access/](https://bitwarden.com/help/emergency-access/)  
41. Fearless SSH: short-lived certificates bring Zero Trust to infrastructure, erişim tarihi Mart 18, 2026, [https://blog.cloudflare.com/intro-access-for-infrastructure-ssh/](https://blog.cloudflare.com/intro-access-for-infrastructure-ssh/)  
42. Designing ZTNA access policies for Cloudflare Access, erişim tarihi Mart 18, 2026, [https://developers.cloudflare.com/reference-architecture/design-guides/designing-ztna-access-policies/](https://developers.cloudflare.com/reference-architecture/design-guides/designing-ztna-access-policies/)  
43. Short-lived certificates (legacy) · Cloudflare One docs, erişim tarihi Mart 18, 2026, [https://developers.cloudflare.com/cloudflare-one/access-controls/applications/non-http/short-lived-certificates-legacy/](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/non-http/short-lived-certificates-legacy/)  
44. Mutual TLS · Cloudflare One docs, erişim tarihi Mart 18, 2026, [https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/mutual-tls-authentication/](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/mutual-tls-authentication/)  
45. Cloudflare API | Zero Trust › Access › Certificates › List M TLS Certificates, erişim tarihi Mart 18, 2026, [https://developers.cloudflare.com/api/resources/zero\_trust/subresources/access/subresources/certificates/methods/list/](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/certificates/methods/list/)  
46. Web Authentication API \- Web APIs | MDN, erişim tarihi Mart 18, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/Web\_Authentication\_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)  
47. WebAuthn \- Wikipedia, erişim tarihi Mart 18, 2026, [https://en.wikipedia.org/wiki/WebAuthn](https://en.wikipedia.org/wiki/WebAuthn)  
48. White Paper: FIDO Attestation: Enhancing Trust, Privacy, and Interoperability in Passwordless Authentication, erişim tarihi Mart 18, 2026, [https://fidoalliance.org/fido-attestation-enhancing-trust-privacy-and-interoperability-in-passwordless-authentication/](https://fidoalliance.org/fido-attestation-enhancing-trust-privacy-and-interoperability-in-passwordless-authentication/)  
49. Web Authentication: An API for accessing Public Key Credentials \- Level 2 \- W3C, erişim tarihi Mart 18, 2026, [https://www.w3.org/TR/webauthn-2/](https://www.w3.org/TR/webauthn-2/)  
50. Terms \- passkeys.dev, erişim tarihi Mart 18, 2026, [https://passkeys.dev/docs/reference/terms/](https://passkeys.dev/docs/reference/terms/)  
51. End-to-end encryption (E2EE) | Collaboration and messaging \- Element, erişim tarihi Mart 18, 2026, [https://element.io/features/end-to-end-encryption](https://element.io/features/end-to-end-encryption)  
52. Matrix (protocol) \- Wikipedia, erişim tarihi Mart 19, 2026, [https://en.wikipedia.org/wiki/Matrix\_(protocol)](https://en.wikipedia.org/wiki/Matrix_\(protocol\))  
53. End-to-End Encryption implementation guide \- Matrix.org, erişim tarihi Mart 18, 2026, [https://matrix.org/docs/matrix-concepts/end-to-end-encryption/](https://matrix.org/docs/matrix-concepts/end-to-end-encryption/)  
54. Implementing more advanced e2ee features, such as ... \- Matrix.org, erişim tarihi Mart 18, 2026, [https://matrix.org/docs/guides/implementing-more-advanced-e-2-ee-features-such-as-cross-signing/](https://matrix.org/docs/guides/implementing-more-advanced-e-2-ee-features-such-as-cross-signing/)  
55. Cross-signed device verification | Secure messaging \- Element, erişim tarihi Mart 18, 2026, [https://element.io/features/device-verification](https://element.io/features/device-verification)  
56. Use SSSS for new key backups · Issue \#11209 · element-hq/element-web \- GitHub, erişim tarihi Mart 18, 2026, [https://github.com/vector-im/riot-web/issues/11209?ref=element.io](https://github.com/vector-im/riot-web/issues/11209?ref=element.io)  
57. About this documentation \- Matrix Authentication Service, erişim tarihi Mart 19, 2026, [https://element-hq.github.io/matrix-authentication-service/](https://element-hq.github.io/matrix-authentication-service/)  
58. Better authentication, session management and permissions in Matrix, erişim tarihi Mart 19, 2026, [https://matrix.org/blog/2023/09/better-auth/](https://matrix.org/blog/2023/09/better-auth/)  
59. Client-Server API \- Matrix Specification, erişim tarihi Mart 19, 2026, [https://spec.matrix.org/latest/client-server-api/](https://spec.matrix.org/latest/client-server-api/)  
60. Authentication changes on Matrix.org, erişim tarihi Mart 19, 2026, [https://matrix.org/blog/2025/01/06/authentication-changes/](https://matrix.org/blog/2025/01/06/authentication-changes/)  
61. Federation without metadata track · Issue \#2188 · matrix-org/synapse \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/matrix-org/synapse/issues/2188](https://github.com/matrix-org/synapse/issues/2188)  
62. How do Onion Services work? \- Join the Tor Community, erişim tarihi Mart 19, 2026, [https://community.torproject.org/onion-services/overview/](https://community.torproject.org/onion-services/overview/)  
63. Properties \- The Onion Services Ecosystem, erişim tarihi Mart 19, 2026, [https://onionservices.torproject.org/technology/properties/](https://onionservices.torproject.org/technology/properties/)  
64. Client Authorization \- Onion Services \- Join the Tor Community, erişim tarihi Mart 18, 2026, [https://community.torproject.org/onion-services/advanced/client-auth/](https://community.torproject.org/onion-services/advanced/client-auth/)  
65. Appendix G: Managing authorized client data \[RESTRICTED-DISCOVERY-MGMT\], erişim tarihi Mart 18, 2026, [https://spec.torproject.org/rend-spec/restricted-discovery.html](https://spec.torproject.org/rend-spec/restricted-discovery.html)  
66. How does client authorization in onion v3 services work? : r/TOR \- Reddit, erişim tarihi Mart 18, 2026, [https://www.reddit.com/r/TOR/comments/sl5qrz/how\_does\_client\_authorization\_in\_onion\_v3/](https://www.reddit.com/r/TOR/comments/sl5qrz/how_does_client_authorization_in_onion_v3/)  
67. Tor Project | Vanity Addresses, erişim tarihi Mart 19, 2026, [https://community.torproject.org/onion-services/advanced/vanity-addresses/](https://community.torproject.org/onion-services/advanced/vanity-addresses/)  
68. How do you get a specific .onion address for your hidden service?, erişim tarihi Mart 19, 2026, [https://security.stackexchange.com/questions/29772/how-do-you-get-a-specific-onion-address-for-your-hidden-service](https://security.stackexchange.com/questions/29772/how-do-you-get-a-specific-onion-address-for-your-hidden-service)  
69. HTTPS for your Onion Service \- Join the Tor Community, erişim tarihi Mart 18, 2026, [https://community.torproject.org/onion-services/advanced/https/](https://community.torproject.org/onion-services/advanced/https/)  
70. How to setup Client Authorization for v3 Onion Services \- Tor Stack Exchange, erişim tarihi Mart 18, 2026, [https://tor.stackexchange.com/questions/19221/how-to-setup-client-authorization-for-v3-onion-services](https://tor.stackexchange.com/questions/19221/how-to-setup-client-authorization-for-v3-onion-services)  
71. Onionmine: security of vanity address generation \- The Onion Services Ecosystem, erişim tarihi Mart 19, 2026, [https://onionservices.torproject.org/apps/base/onionmine/security/](https://onionservices.torproject.org/apps/base/onionmine/security/)  
72. GitHub \- supabase/auth: A JWT based API for managing users and issuing JWT tokens, erişim tarihi Mart 18, 2026, [https://github.com/supabase/auth](https://github.com/supabase/auth)  
73. Auth architecture | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/architecture](https://supabase.com/docs/guides/auth/architecture)  
74. Auth | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)  
75. JSON Web Token (JWT) | Supabase Docs, erişim tarihi Mart 18, 2026, [https://supabase.com/docs/guides/auth/jwts](https://supabase.com/docs/guides/auth/jwts)  
76. User sessions | Supabase Docs, erişim tarihi Mart 18, 2026, [https://supabase.com/docs/guides/auth/sessions](https://supabase.com/docs/guides/auth/sessions)  
77. supabase/auth: A JWT based API for managing users and issuing JWT tokens \- GitHub, erişim tarihi Mart 18, 2026, [https://github.com/supabase/gotrue?adobe\_mc=MCMID%3D72000414905405683995335849378418609464%7CMCORGID%3DA8833BC75245AF9E0A490D4D%2540AdobeOrg%7CTS%3D1766966400](https://github.com/supabase/gotrue?adobe_mc=MCMID%3D72000414905405683995335849378418609464%7CMCORGID%3DA8833BC75245AF9E0A490D4D%2540AdobeOrg%7CTS%3D1766966400)  
78. Advanced guide | Supabase Docs, erişim tarihi Mart 18, 2026, [https://supabase.com/docs/guides/auth/server-side/advanced-guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)  
79. Passwordless email logins | Supabase Docs, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/auth/auth-email-passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless)  
80. Passwordless login via Magic Links | Supabase Features, erişim tarihi Mart 19, 2026, [https://supabase.com/features/passwordless-login-via-magicklink](https://supabase.com/features/passwordless-login-via-magicklink)  
81. erişim tarihi Ocak 1, 1970, [https://supabase.com/docs/guides/auth/passwords/email-magic-link](https://supabase.com/docs/guides/auth/passwords/email-magic-link)  
82. Token Security and Row Level Security | Supabase Docs, erişim tarihi Mart 18, 2026, [https://supabase.com/docs/guides/auth/oauth-server/token-security](https://supabase.com/docs/guides/auth/oauth-server/token-security)  
83. Can someone please explain to me how the refresh token works on the Supabase JS client, and how it is secure? \- Reddit, erişim tarihi Mart 18, 2026, [https://www.reddit.com/r/Supabase/comments/159mbic/can\_someone\_please\_explain\_to\_me\_how\_the\_refresh/](https://www.reddit.com/r/Supabase/comments/159mbic/can_someone_please_explain_to_me_how_the_refresh/)  
84. Rate limits | Supabase Docs, erişim tarihi Mart 18, 2026, [https://supabase.com/docs/guides/auth/rate-limits](https://supabase.com/docs/guides/auth/rate-limits)  
85. 'OTP Verification Failures: 'token has expired' or 'otp\_expired' errors' \- Supabase, erişim tarihi Mart 19, 2026, [https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp\_expired-errors-5ee4d0](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0)  
86. Users are receiving expired OTPs · supabase · Discussion \#29686 \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/orgs/supabase/discussions/29686](https://github.com/orgs/supabase/discussions/29686)  
87. trying to implement magic link sign up but supabase keeps sending the confirmation email instead \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/Supabase/comments/1dti2ks/trying\_to\_implement\_magic\_link\_sign\_up\_but/](https://www.reddit.com/r/Supabase/comments/1dti2ks/trying_to_implement_magic_link_sign_up_but/)  
88. supabase is amazing, but there are some problems about security and front-end, how do you guys resolve this? \- Reddit, erişim tarihi Mart 19, 2026, [https://www.reddit.com/r/Supabase/comments/1em5ifd/supabase\_is\_amazing\_but\_there\_are\_some\_problems/](https://www.reddit.com/r/Supabase/comments/1em5ifd/supabase_is_amazing_but_there_are_some_problems/)  
89. Auth CVEs and Security Vulnerabilities \- OpenCVE, erişim tarihi Mart 19, 2026, [https://app.opencve.io/cve/?vendor=supabase\&product=auth](https://app.opencve.io/cve/?vendor=supabase&product=auth)  
90. Insecure Apple and Azure authentication with ID tokens · Advisory · supabase/auth \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/supabase/auth/security/advisories/GHSA-v36f-qvww-8w8m](https://github.com/supabase/auth/security/advisories/GHSA-v36f-qvww-8w8m)  
91. Email link poisoning vulnerability · Advisory · supabase/auth \- GitHub, erişim tarihi Mart 19, 2026, [https://github.com/supabase/auth/security/advisories/GHSA-3529-5m8x-rpv3](https://github.com/supabase/auth/security/advisories/GHSA-3529-5m8x-rpv3)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAXCAYAAADz/ZRUAAABsElEQVR4Xu2UPyjFURTHj/JvkDARpZSkJKXIIMkiRSEDk1gwYBFhEAYLISHZZLAwUCSDQRarmCgipbCh/P2ed8/PO+889BKv1PvUp3fuOb/3u/d3fvf+iP4Ro3AFFpl8NyyH2XAMFgaWfeNxCv5fyBTABlgJ32C/qu1Ijp2A0ao2B7fJLe5a5UMmCj6SezJmidxE3AlmS34tvOAOiVNhr6oF0Q4nYR2MM7UhGCMxT8qT98l4U34tXbAYJsFYU/uAW3Wqxgfkbl6lchqu8bv3WCfXHeYBlkh8BJclroXPEgfwChvVOA3ew1sYr/JMAtww+QwV88J2Jb6CFRKnSC0Ib7NoeiTHXfFYUOMschuwhtzTetzAF4nXYLrE3HY7h499eGxyA+QuHla5QRW3wk7YQoHt5PhQYq7lS/zlk1uS4R08IXdseNVP5O+QZ6Zc3wZH4Dz5d7fHObmOXcAmU/uUKXI3L7OFb+DNWW2T5E4Nv55EW/gKfko2rPAO3oOlthAOVuGlGufAXDX+M/hbzedbcwbrTe7XaSa3wWbgNJyFi5LL81/2N9gj5Kk/uREiRPgx71PLXZq9W5AgAAAAAElFTkSuQmCC>