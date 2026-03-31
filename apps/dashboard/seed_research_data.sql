
-- 🦁 AI OS RESEARCH DATA SEED 🦁
-- Bu script, analiz edilen araştırma dosyalarından (Atlas, Moltbot, Hiyerarşi)
-- elde edilen verileri veritabanına işler.

-- 1. Önce eski verileri temizle (Temiz sayfa)
TRUNCATE TABLE links CASCADE;
TRUNCATE TABLE nodes CASCADE;

-- 2. NODES EKLEME (Atlas, Antigravity, Moltbot ve Alt Ajanlar)
INSERT INTO nodes (name, type, role, tier, risk, summary, verification_level, image_url, is_alive, details) VALUES
-- TIER 0: STRATEJİK ZEKA (BEYİN)
(
    'Atlas', 
    'AI Persona', 
    'Stratejik Zeka & Orkestrasyon', 
    0, 
    0, 
    'Sistemin beyni. Llama 3.3 70B ve Groq üzerinde çalışan, Taktiksel Empati ve Mizah yeteneğine sahip yönetici zeka.', 
    'official',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Atlas&backgroundColor=transparent', 
    true,
    '{"model": "Llama 3.3 70B", "hardware": "Groq LPU", "philosophy": "Tactical Empathy", "capabilities": ["Goal Decomposition", "Resource Management"]}'
),

-- TIER 1: OPERASYONEL ZEKA (ELLER)
(
    'Antigravity', 
    'System Core', 
    'Operasyonel Zeka Merkezi', 
    1, 
    0, 
    'Atlasın emirlerini uygulayan, araç kullanan ve alt ajanları yöneten operasyonel çekirdek.', 
    'official',
    'https://api.dicebear.com/7.x/shapes/svg?seed=Antigravity&backgroundColor=0a0a0a', 
    true,
    '{"framework": "LangGraph", "role": "Execution Coordinatior", "protocol": "JIAP"}'
),

-- TIER 2: UYGULAMA AJANLARI
(
    'Moltbot', 
    'AI Agent', 
    'Yerel Ağ Geçidi & Otonom Asistan', 
    2, 
    80, 
    'Eski adıyla Clawdbot. Bilgisayar üzerinde dosya sistemi ve terminal erişimi olan, baharatlı (spicy) güvenlik riskleri taşıyan otonom asistan.', 
    'community',
    'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Moltbot', 
    true,
    '{"origin": "Clawdbot", "capabilities": ["Local FS", "Terminal", "WhatsApp/Telegram"], "security_risk": "High"}'
),
(
    'ToolSmith', 
    'AI Worker', 
    'Araç Üreticisi', 
    2, 
    40, 
    'İhtiyaç duyulan yeni araçları (Python scriptleri) anlık olarak yazan ve sisteme entegre eden ajan.', 
    'system',
    'https://api.dicebear.com/7.x/identicon/svg?seed=ToolSmith', 
    true,
    '{"function": "Dynamic Tool Synthesis", "output": "Python Scripts"}'
),
(
    'Reviewer', 
    'AI Worker', 
    'Kalite Kontrol & Denetim', 
    2, 
    10, 
    'Antigravitynin ürettiği çıktıları ve ToolSmithin kodlarını denetleyen eleştirmen ajan.', 
    'system',
    'https://api.dicebear.com/7.x/identicon/svg?seed=Reviewer', 
    true,
    '{"function": "Quality Assurance", "method": "Reflexion Loop"}'
);

-- 3. LINKS EKLEME (Hiyerarşik Bağlantılar)
WITH 
    atlas AS (SELECT id FROM nodes WHERE name = 'Atlas'),
    antigravity AS (SELECT id FROM nodes WHERE name = 'Antigravity'),
    moltbot AS (SELECT id FROM nodes WHERE name = 'Moltbot'),
    toolsmith AS (SELECT id FROM nodes WHERE name = 'ToolSmith'),
    reviewer AS (SELECT id FROM nodes WHERE name = 'Reviewer')

INSERT INTO links (source_id, target_id, relationship_type, strength, description) VALUES
    ((SELECT id FROM atlas), (SELECT id FROM antigravity), 'cornmands', 1.0, 'Stratejik emir ve görev ataması'),
    ((SELECT id FROM antigravity), (SELECT id FROM moltbot), 'orchestrates', 0.9, 'Yerel görevlerin yürütülmesi'),
    ((SELECT id FROM antigravity), (SELECT id FROM toolsmith), 'delegates', 0.8, 'Araç üretim talebi'),
    ((SELECT id FROM antigravity), (SELECT id FROM reviewer), 'verifies', 0.8, 'Çıktı denetimi'),
    ((SELECT id FROM reviewer), (SELECT id FROM toolsmith), 'audits', 0.7, 'Kod güvenlik taraması'),
    ((SELECT id FROM moltbot), (SELECT id FROM toolsmith), 'uses', 0.6, 'Üretilen araçların kullanımı');
