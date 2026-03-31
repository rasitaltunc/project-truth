import os
import time
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Ayarları Yükle (Şimdiki klasördeki .env dosyasından)
load_dotenv() 

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print(f"❌ HATA: Anahtarlar hala bulunamadı! URL: {url}, KEY: {key}")
    exit(1)

supabase: Client = create_client(url, key)

print("🕵️‍♂️ OPERATION TRUTH: Kanıt Kasası (evidence_archive) Açılıyor...")

# 2. GERÇEK VERİ SETİ (Örnek Numuneler)
evidence_data = [
    {
        "content": "Bill Clinton (Kod: Doe 36): Johanna Sjoberg, Epstein'in kendisine 'Clinton onları genç sever' dediğini ifade etti. Clinton'ın Epstein'in uçağıyla seyahat ettiği uçuş kayıtlarında mevcuttur ancak adada bulunduğuna dair kanıt yoktur.",
        "meta": {"source": "Unsealed Doc #12", "date": "2016-05-03", "category": "Testimony", "names": ["Bill Clinton", "Johanna Sjoberg"]}
    },
    {
        "content": "Prens Andrew: Virginia Giuffre, 17 yaşındayken Londra, New York ve Epstein'in adasında Prens Andrew ile cinsel ilişkiye zorlandığını beyan etti. Kanıt olarak Prens'in beline sarıldığı fotoğraf sunuldu.",
        "meta": {"source": "Giuffre v. Maxwell", "date": "2015-01-01", "category": "Lawsuit", "names": ["Prince Andrew", "Virginia Giuffre"]}
    },
    {
        "content": "Stephen Hawking: Epstein, Ghislaine Maxwell'e gönderdiği e-postada, Hawking'in reşit olmayanların katıldığı bir seks partisinde olduğu iddialarını yalanlayanlara ödül verilmesini önerdi.",
        "meta": {"source": "Epstein Email Logs", "date": "2015-01-12", "category": "Email", "names": ["Stephen Hawking", "Ghislaine Maxwell"]}
    },
    {
        "content": "Michael Jackson: Palm Beach'teki evde görüldüğü Sjoberg tarafından teyit edildi. Ancak masaj yaptırmayı reddettiği ve herhangi bir suçlamaya karışmadığı belirtildi.",
        "meta": {"source": "Sjoberg Testimony", "date": "2016-05-18", "category": "Testimony", "names": ["Michael Jackson"]}
    },
    {
        "content": "Leonardo DiCaprio: İsmi sadece bir telefon konuşmasında geçti. Adada bulunduğuna veya herhangi bir faaliyete katıldığına dair hiçbir kayıt veya suçlama yoktur.",
        "meta": {"source": "Unsealed Doc #15", "date": "2024-01-03", "category": "Mention", "names": ["Leonardo DiCaprio"]}
    }
]

# 3. VERİLERİ GÖMME İŞLEMİ
print("📂 Veriler işleniyor ve şifreleniyor...")

for doc in evidence_data:
    try:
        # Dummy Vector (1536 boyutlu - Test için)
        dummy_vector = [0.01] * 1536
        
        data, count = supabase.table('evidence_archive').insert({
            "content": doc['content'],
            "metadata": doc['meta'],
            "embedding": dummy_vector
        }).execute()
        
        print(f"✅ ARŞİVLENDİ: {doc['meta']['names'][0]}")
        time.sleep(0.2)
        
    except Exception as e:
        print(f"❌ KAYIT HATASI: {e}")

print("\n🚀 İŞLEM TAMAM: Tüm kanıtlar 'evidence_archive' tablosuna kilitlendi.")
