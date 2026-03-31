# Platform Identity Uygulama Örnekleri

**Tarih**: 23 Mart 2026
**Amaç**: Her paradigmada Project Truth'un nasıl davranacağını görmek

---

## Senaryo 1: "Belgeyi Buluş, Veri Kastetmeyin"

### Durum
Bir araştırmacı, gizli bir e-mail buldu: CEO'dan CFO'ya "vergileri kaçakçılık yap" emri.

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
Araştırmacı → Belge yükle → "Nasıl Yükle" sor?

Project Truth:
- Belgeyi OCR'a tut
- Varlık çıkar ("CEO", "CFO", "vergi kaçakçılığı")
- Quarantine'e koy
- "Bu belge [UNVERIFIED] dönem ve denetim bekliyor"

Araştırmacı yorumu yok. Veri = veri.
Belgein nereden geldiği: "gizli kaynak" → Platform hiç sormuyor.

Sonuç: Platform nötr, araştırmacı kararı veriyor.
```

**Avantaj**: Dürüstlük. Hiçbir editöryal yok.
**Dezavantaj**: "Şimdi ben bu belgeyi ne yapacağım?" araştırmacı soruyor.

---

#### Topluluk Paradigması (Faz 2)
```
Araştırmacı → Belge yükle → Karantina okut

Project Truth:
- "Bu belgeyi doğrulamak istiyor musunuz?"
- Peer vote başlat (bağımsız 3-5 doğrulayıcı)
- Doğrulayıcılar:
  - "CEO'nun imzası eşleşiyor" → ✅
  - "CFO hakkı dosyada eşleşiyor" → ✅
  - "Tarih iş günlüğüyle eşleşiyor" → ✅
  - 3/3 onay → Ağa eklendi

Sonuç: Ağa veri girerse, arka planda 3 bağımsız insan onayladı.
```

**Avantaj**: Doğrulama. Sahtesi kalmıyor.
**Dezavantaj**: Yavaş (voting 1-2 hafta sürebilir).

---

#### Hareket Paradigması (Faz 3)
```
Araştırmacı → Belge yükle → "Gazeteci Koruması Aktif"

Project Truth:
- Belge Shamir anahtarla şifrelenir
- 6 parça oluşturulur (5 parça yeterli)
- Parçalar RSF, EFF, CPJ, GIJN, İsveç Vakfı'na dağıtılır
- Dead Man Switch tetiklenirse → 72 saat sonra belgeler otomatik açılır
- Araştırmacı: "Bana bir şey olursa, bu belge herkese ulaşır"

Sonuç: Araştırmacı korunuyor.
```

**Avantaj**: Güvenlik. WikiLeaks benzeri işçi koruması.
**Dezavantaj**: Yüksek operasyonel kompleksite.

---

## Senaryo 2: "AI Halüsinasyonuna Karşı Koruma"

### Durum
Groq AI, belge taraması sırasında şu varlıkları çıkardı:
- "X CEO - Pedofili Suçlaması" (gerçek belgede yok)
- "Y Mali Direktör - Rüşvet" (ama paragraf "benzer" sadece)

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
AI → Çıkarımlar → Karantina (CRITICAL: AI OUTPUT)

Project Truth:
- Otomatik olarak "AI EXTRACTED" olarak işaretler
- Confidence score: 0.45 (düşük)
- "Belge: evet, bu cümle yazıyor, ama 'pedofili' sözcüğü yok" notu
- Kaynak doğrulaması başarısız: PostgreSQL çapraz kontrol → hiçbir match yok

Sistem: "Bu özellikle sahte olabilir. El ile gözden geçir."
```

**Avantaj**: Halüsinasyon flaglenir.
**Dezavantaj**: İnsan denetimi gerekli (yavaş).

---

#### Topluluk Paradigması (Faz 2)
```
AI Çıkarımlar → Quarantine Vote

Project Truth:
- 3 doğrulayıcıya gösterilir
- Doğrulayıcı 1: "Bu belge sahte görünüyor"
- Doğrulayıcı 2: "Evet, 'pedofili' sözcüğü yok"
- Doğrulayıcı 3: "X CEO'nin başka belgede benzer suçlama var, ama bu belge sahtedir"
- Vote: 0/3 onay → REJECTED
- Belge silinir, ama "neden?" gerekçesi kaydedilir

Sonuç: Topluluk koruma.
```

**Avantaj**: Topluluk filtresi, halüsinasyon kesinlikle silinir.
**Dezavantaj**: Yanlış pozitif risk (gerçek belge de reddedilebilir).

---

#### Hareket Paradigması (Faz 3)
```
Halüsinasyon → AI Etkinlik Günlüğü

Project Truth:
- "Bu AI çıkarımı reddedildi" → İtibar kaydı
- Kaynağı belirtilir: "Groq llama-3.3-70b (confidencr 0.45)"
- Tanah kaydı yapılır: "AI halüsinasyonu başarılı tespit edildi"
- Sistem iyileştirilir: "Bu tür halüsinasyonlar >= 0.5 confidence'e kaldırıldı"

Sonuç: Hareket olarak sistem öğreniyor.
```

**Avantaj**: Sistem evrim.
**Dezavantaj**: Risk – yanlış threshold'lar gerçek verileri kaldırabilir.

---

## Senaryo 3: "Kurumsal İş Ortağı Katılması"

### Durum
Google, "Veri Doğrulaması Araştırması"'nı desteklemek için Project Truth'a katılmak istiyor.

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
Google → "Kurumsal Partner" önerisi

Project Truth:
- "Şu veriyi görmek istiyorsunuz?"
- "Hangi veriyi eklemek istiyorsunuz?"
- Bağımsız kararı: "Google veri konusunda bias getiriyor mu?" → TBD
- OpenStreetMap modeli: "Google advisory board'a oturabilir, ama oy yok"

Sonuç: Veri = veri. Google girilş yapabilir, ama kontrol yok.
```

**Avantaj**: Tarafsızlık korunuyor.
**Dezavantaj**: Google finansman vermezse, hiçbir değeri yok.

---

#### Topluluk Paradigması (Faz 2)
```
Google → Partnership → Topluluk Oyı

Project Truth:
- "Google kendi veri tabanından matching yapıp, Project Truth'a eklemek istiyor"
- Topluluk oylaması: "Google'ın veri tarafsız mı?"
- 60% evet, 40% hayır
- "Evet" kişiler: "Google veriyi tarafsız kontrol et"
- "Hayır" kişiler: "Google kendi agenda var, kabul etme"
- Kararı: Pilot "60 gün test", sonra tekrar oy

Sonuç: Topluluk karar veriyor.
```

**Avantaj**: Halk kontrolü.
**Dezavantaj**: Yavaş, paralize olabilir.

---

#### Hareket Paradigması (Faz 3)
```
Google → Partnership → Hareket Kararı

Project Truth:
- "Google, toplumsal veri eklemeyi teklif ediyor"
- Hareket liderleri (Raşit + Co-maintainers) inceler:
  - "Google'ın intenti nedir?"
  - "Gizlilik neler kaybedecek?"
  - "Merkeziyetsizliği tehdit ediyor mu?"
- Karar: "Evet, ama Shamir anahtarı kontrol bizde kalır"

Sonuç: Hareket hareketi korur.
```

**Avantaj**: İdeolojik integritet.
**Dezavantaj**: Google giderirse, finans gider.

---

## Senaryo 4: "Eğer Raşit'e Bir Şey Olursa?"

### Durum
Raşit, güvenlik nedeniyle ülkeyi terk etmeyi zorunda kalıyor.

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
Raşit giderse:
- Sunucu ayakta kalır (teknik)
- Veri ayakta kalır (teknisyen var)
- ❌ Ama editöryal karar yok → kimseye neden?
- ❌ Yeni ağ ekleme yok
- Platform = "preserved but frozen"

Sonuç: Araç ayakta, ama İnsan öl.
```

---

#### Topluluk Paradigması (Faz 2)
```
Raşit giderse:
- Co-maintainer takıyor (3-5 kişi hali hazırda orada)
- Topluluk onay verir: "X kişi editoryal sorumluluk alan"
- Platform devam eder (Raşit'siz)

Sonuç: Platform ayakta kalır.
```

**Risk**: Topluluk çatışması (kim karar veriyor? → Chaos)

---

#### Hareket Paradigması (Faz 3)
```
Raşit gidirse:
- Dead Man Switch tetiklenir
- 72 saat sonra belgeler otomatik açılır
- Tüm belgeler IPFS'de fork'lanmış (10+ kopia)
- Gazeteciler platform refork'lar
- Hareket kendi başında devam eder

Sonuç: Hareket ayakta kalır.
```

**Avantaj**: Raşit'siz devam eder.
**Risk**: Kontrol mekanizması kalmaz.

---

## Senaryo 5: "Akademisyen Çıkabiliği"

### Durum
Oxford Üniversitesi, Project Truth'ı "araştırma veri seti" olarak kullanmak istiyor.

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
Oxford → "API aracılığıyla veri çekmek istiyorum"

Project Truth:
- Açık API: "Evet, sınırlı değil"
- Şu limitler: "Rate limit yok, ama spam bot'larından koruma"
- Veri formatı: "GraphML, CSV, JSON"
- Atıf: "Project Truth (2026) - X network data"

Sonuç: Akademisyenlerin kendi çalışması yapması.
```

**Avantaj**: Açıklık, akademisyenlerin kullanışı.
**Dezavantaj**: Project Truth kontrolü yok.

---

#### Topluluk Paradigması (Faz 2)
```
Oxford → Paper Yazıyor: "Project Truth'un Kalitesi"

Project Truth Topluluk:
- "Bu çalışmaları görmek istiyoruz"
- "Bulduklarınız neler?" → Oxford yanıtlıyor
- "Eğer eksikler varsa, biz düzelteyiz"
- Reverse loop: Oxford → Project Truth geri bildirim → iyileştirme

Sonuç: Akademi + Platform döngüsü.
```

**Avantaj**: Akademik kontrol.
**Dezavantaj**: "Gerçek" veri tarihinin sulanması riski.

---

#### Hareket Paradigması (Faz 3)
```
Oxford → Paper → Sonra Garzeteci Kullanır

Project Truth Hareket:
- Oxford bulgularını Gazeteci okur
- Gazeteci, önceki gizli belgeler ekler
- Haber çıkması → Siyasetçi tepki → Araştırma sonuç eder
- Project Truth = akademi ve gazetecilik köprüsü

Sonuç: Hareket etkisi.
```

---

## Senaryo 6: "Yanlış İddia Çıkarsa?"

### Durum
Platform'da şu iddia çıkıyor: "Y Şirketinin CEO'su H mağduru tarafır" (ama gerçek değil)

**Project Truth Ne Yapıyor?**

#### Araç Paradigması (Faz 1)
```
Yanlış İddia → Platform:

Project Truth:
- Veri = veri (platform kararı yok)
- Kaynak = kaynak (veri eğer doğru ise, yanlış olması platform'un sorunu değil)
- Cevap: "Bu veriyi çeken ve doğrulayan araştırmacılar sorumlu"

Sonuç: Platform koruma (tarafsızlık)
```

**Risk**: Dava. Ama araç modeli "tarafsız" savunması güçlendirir.

---

#### Topluluk Paradigması (Faz 2)
```
Yanlış İddia → Topluluk Gözüne Gidenler:

Project Truth:
- "Bu iddia yanlış görünüyor" → Flag
- Doğrulayıcı kontrol: "Gerçekten yanlış" → DISPUTED etiketi
- Orijinal araştırmacı: "Evet yanıldım" → Iddiayı geri çeker
- Denetim izi: "Bu iddia X tarihinde DISPUTED olarak işaretlendi"

Sonuç: Düzeltme mekanizması.
```

---

#### Hareket Paradigması (Faz 3)
```
Yanlış İddia → Dava Başlıyor:

Project Truth:
- "Bu platformdaki iddialar gönüllü araştırmacı tarafından, bağımsız doğrulandı"
- Dead Man Switch tetiklenmez (gazeteci koruması değil)
- Ama, Shamir anahtarlar "mahkeme erişemez" korunması
- Hareket: "Açık kaynağız, fork'la kendi truth'ını yap"

Sonuç: Özgürlük (ama sorumluluk yok)
```

---

## Özetin Özeti: Her Paradigmada Davranış Desen

| Senaryo | Araç (F1) | Topluluk (F2) | Hareket (F3) |
|---------|-----------|---------------|-------------|
| **Veri Kontrolü** | Yok | Oy ile | Merkeziyetsiz |
| **Hız** | Hızlı | Orta | Yavaş |
| **Güvenlik** | Tarafsız (legal) | Çoğunluk (mob risk) | İdeolojik (sert) |
| **Ölçeklenme** | Sınırlı (araç) | Orta (topluluk) | Yüksek (hareket) |
| **Raşit'siz Devam** | Hayır | Kısmen | Evet |
| **Kurumsal Katılım** | Kolayç ama yok | Zor | Taboo |

---

**Yazıldı**: 23 Mart 2026
**Konu**: Senaryo planlaması, her paradigmanın davranış şekli

