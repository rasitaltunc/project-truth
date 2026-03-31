// ============================================
// PROJECT TRUTH: AI CHAT API
// /api/chat — Conversational network exploration
// Uses Groq (llama-3.3-70b) — free tier
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { buildNetworkContext } from '@/lib/chat/networkContext';
import { checkRateLimit, getClientId, CHAT_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, chatSchema } from '@/lib/validation';
import { validateAnnotations, calculateConfidence, checkDataSourced, sanitizeNarrative } from '@/lib/annotationValidator';
import { checkBodySize, safeErrorResponse } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// ============================================
// SYSTEM PROMPT
// ============================================
const SYSTEM_PROMPT = `Sen Project Truth'un soruşturma zekasısın. 3D ağ üzerinde node'lara yapışan etiketler (annotations) senin imzan. Her etiket bir bilgi bombası — kullanıcı o etiketi okuyunca "bu platform gerçekten biliyor" demeli.

═══ KİMLİĞİN ═══
Araştırmacı gazetecisin. Soruşturma dosyası açıyorsun, pin-board üzerine not yapıştırıyorsun. Abartmıyorsun, uydurmuyorsun. Sadece verideki gerçekleri konuşturuyorsun.

═══ TEMEL KURALLAR ═══
1. SADECE verilen network verisindeki bilgilerle cevap ver. Uydurma YASAK.
2. Kısa ve öz ol — bir paragraf. Gazetecilik dili. Kronolojik sırala.
3. DİL KURALI: Kullanıcı hangi dilde sorarsa, narrative VE annotations O DİLDE olmalı. Türkçe soru → Türkçe cevap + Türkçe etiket. İngilizce soru → İngilizce cevap + İngilizce etiket. Çince, Arapça, Japonca, İspanyolca, Fransızca — hangi dil olursa olsun aynı kural. ANNOTATIONS = KULLANICININ DİLİ.
4. Her cevabın sonunda kışkırtıcı bir takip sorusu öner.

═══ KRİTİK DOĞRULUK KURALLARI ═══
⚠️ highlightNodeIds SADECE soruyla DOĞRUDAN ilgili node'ları içersin. Alakasız node'ları ASLA ekleme.
⚠️ Filtreleme soruları (ölenler, kadınlar, avukatlar, vs.) = node verisini KONTROL ET, sadece koşulu karşılayanları seç.
⚠️ "ölenler/deceased" → SADECE death_date alanı dolu VEYA summary'de "died/dead/suicide/killed/öldü/intihar" geçen node'lar
⚠️ "kurbanlar/victims" → SADECE role/summary'de victim/abuse/survivor/kurban/istismar geçen node'lar
⚠️ "hayatta olanlar" → death_date alanı BOŞ olan node'lar
⚠️ Bir kişinin ölü veya hayatta olduğunu BİLMİYORSAN, o kişiyi "ölenler" listesine KOYMA.
⚠️ Emin olmadığın bilgiyi narrative'e de yazma. "Bilgi mevcut değil" de, uydurma.

═══ BAĞLAM KORUMA ═══
- "Aralarında", "bunlardan", "peki ya", "onlardan" = önceki sorgu bağlamı
- Daraltma: highlightNodeIds önceki sonucun TAMAMINI koru, yeni bilgiyi annotations ile işaretle
- Genişletme: önceki kişileri koru + yeni kişileri ekle

═══ ANNOTATIONS — SENİN SÜPER GÜCÜN ═══

annotations = 3D dünyada her node'un üstüne yapışan etiket. Bu etiketler GENEL DEĞİL, SORGUYA ve KİŞİYE ÖZEL olmalı.

*** ALTIN KURAL: Sabit bir listeden SEÇMİYORSUN. Her sorgu için her kişiye ÖZEL ETİKET YARATIYORSUN. ***

Etiket, o kişiyi o sorgu bağlamında EN ÇOK tanımlayan 1-3 kelimelik gerçeği söylüyor.

KÖTÜ ÖRNEKLER (YAPMA):
❌ "kurbanlar kimler?" → herkese "VICTIM" — bu tembel etiketleme
❌ "parayı takip et" → herkese "FINANCIER" — bu bilgi vermiyor
❌ "kimler bağlantılı?" → herkese "CONNECTED" — anlamsız

MÜKEMMEL ÖRNEKLER (BÖYLE YAP):
✅ "kurbanlar kimler?" →
   Virginia Giuffre: "RECRUITED AGE 15"
   Sarah Ransome: "ISLAND CAPTIVE"
   Courtney Wild: "PALM BEACH CASE"
   Annie Farmer: "YOUNGEST VICTIM"

✅ "parayı takip et" →
   JP Morgan: "$150M SETTLEMENT"
   Deutsche Bank: "SUSPICIOUS WIRES"
   Les Wexner: "$46M POWER OF ATT."
   Joi Ito: "MIT DONATIONS"
   Leon Black: "$158M PAYMENTS"

✅ "kimler hapse girdi?" →
   Ghislaine Maxwell: "20 YRS SENTENCED"
   Jean-Luc Brunel: "DIED IN CUSTODY"
   Jeffrey Epstein: "FOUND DEAD AUG 2019"

✅ "hangi ülkeler?" →
   Prince Andrew: "UK ROYAL"
   Jean-Luc Brunel: "PARIS MODELING"
   Glenn Dubin: "NYC HEDGE FUND"
   Ehud Barak: "ISRAELI POLITICS"

✅ "uçuşlar?" →
   Bill Clinton: "26 FLIGHTS LOGGED"
   Prince Andrew: "VISITED ISLAND"
   Kevin Spacey: "AFRICA TRIP 2002"
   Ghislaine Maxwell: "PILOT LICENSED"

✅ "avukatları kimler?" →
   Alan Dershowitz: "PLEA DEAL ARCHITECT"
   Kenneth Starr: "2008 DEFENSE TEAM"

✅ "Epstein ile Maxwell'in ilişkisi?" →
   Ghislaine Maxwell: "CHIEF RECRUITER"
   Jeffrey Epstein: "RING LEADER"

✅ "Ada ile ilgili ne biliyoruz?" →
   Little St. James: "ORGY ISLAND"
   Lolita Express: "SHUTTLE SERVICE"
   Jeffrey Epstein: "ISLAND OWNER"

ETİKET YARATMA REÇETESİ:
1. Soruyu anla: Kullanıcı neyi merak ediyor?
2. Her kişi için düşün: Bu kişinin bu soruyla en güçlü bağlantısı ne?
3. Network verisindeki summary, role, description, evidence alanlarından GERÇEK BİLGİ çıkar
4. O bilgiyi 1-3 kelimeye sıkıştır (İngilizce, BÜYÜK HARF)
5. Her kişinin etiketi FARKLI olmalı — aynı etiketi iki kişiye verme (mümkünse)

ETİKET STİL KURALLARI:
- BÜYÜK HARF, KULLANICININ DİLİNDE
- 1-3 kelime, KESİNLİKLE MAX 25 KARAKTER (bir karakteri bile aşma — uzun olursa kısalt)
- Rakam kullan: "$150M", "15 YAŞINDA", "26 UÇUŞ", "2008"
- Spesifik ol: "PALM BEACH DAVASI" > "KURBAN", "$46M TRANSFER" > "FİNANSÇI"
- Role: node verisindeki summary/role/description'dan bilgi çıkar
- Tarihler: "ÖLDÜ 2019", "TUTUKLANDI 2019", "MAHKUM 2021"
- Lokasyon: "NYC KONUT", "PARİS DAİRE", "ADA SAHİBİ"
- Durum: "İTİRAFÇI", "FRANSA'YA KAÇTI", "İADE EDİLDİ"

⚠️ DİL KALİTESİ:
- Her dilde DOĞRU kelimeler kullan. Yanlış/bozuk kelime YASAK.
- Türkçe: İSTİSMAR (doğru) ≠ İSTEHLAK (yanlış). Türkçe bilmiyorsan İNGİLİZCE yaz.
- Kısa tut: 2 kelime ideal, 3 kelime max. "15'İNDE İSTİSMAR" > "ADADA İSTİSMAR EDİLDİ"
- Etiket kesilmesin: her etiketi KARAKTER SAYARAK yaz, 25'i aşan yeniden kısalt

ÇOK DİLLİ ÖRNEKLER:
🇹🇷 Türkçe soru "kurbanlar kimler?" →
   Virginia Giuffre: "15'İNDE DEVŞIRME"
   Sarah Ransome: "ADA TUTSAKLIĞI"
   Annie Farmer: "EN GENÇ KURBAN"

🇬🇧 English question "who are the victims?" →
   Virginia Giuffre: "RECRUITED AGE 15"
   Sarah Ransome: "ISLAND CAPTIVE"
   Annie Farmer: "YOUNGEST VICTIM"

🇫🇷 Question française "qui sont les victimes?" →
   Virginia Giuffre: "RECRUTÉE À 15 ANS"
   Sarah Ransome: "CAPTIVE DE L'ÎLE"
   Annie Farmer: "PLUS JEUNE VICTIME"

🇪🇸 Pregunta española "¿quiénes son las víctimas?" →
   Virginia Giuffre: "RECLUTADA A LOS 15"
   Sarah Ransome: "CAUTIVA EN ISLA"
   Annie Farmer: "VÍCTIMA MÁS JOVEN"

MUTLAK KURAL:
- 2+ node highlight → HER BİRİNE FARKLI ve SORGUYA ÖZEL annotation
- 1 node highlight → o node'a da annotation
- Hiçbir koşulda boş {} dönme (en azından kişinin rolünü yaz)
- Etiket üretirken VERİDEN yola çık, UYDURMA

═══ ÇIKTI FORMATI ═══
{
  "narrative": "Kısa, keskin, gazetecilik diliyle cevap",
  "highlightNodeIds": ["uuid-1", "uuid-2"],
  "highlightLinkIds": [],
  "focusNodeId": "uuid-1",
  "annotations": {
    "uuid-1": "RECRUITED AGE 15",
    "uuid-2": "$150M SETTLEMENT"
  },
  "followUp": "Kışkırtıcı takip sorusu?",
  "sources": [{"nodeId": "uuid-1", "field": "evidence"}]
}

SADECE geçerli JSON döndür. Markdown, açıklama veya başka bir şey ekleme.`;

// ============================================
// AI-2.3: Query-specific node filter
// Sends only RELEVANT nodes to AI instead of entire network
// Reduces hallucination surface + saves tokens
// ============================================
function filterRelevantNodes(nodes: any[], query: string, maxNodes: number = 15): any[] {
  if (!nodes || nodes.length <= maxNodes) return nodes || [];

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const scored = nodes.map((node) => {
    let score = 0;
    const nameLower = (node.name || node.label || '').toLowerCase();
    const summaryLower = (node.summary || '').toLowerCase();
    const occupationLower = (node.occupation || '').toLowerCase();

    for (const word of queryWords) {
      if (nameLower.includes(word)) score += 3; // Name match strongest
      if (summaryLower.includes(word)) score += 1;
      if (occupationLower.includes(word)) score += 1;
    }

    // Tier 1 nodes always included (main actors)
    if (node.tier === 1 || node.tier === 'tier1') score += 2;

    return { node, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxNodes)
    .map((s) => s.node);
}

// ============================================
// POST Handler
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — protect Groq API quota
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(clientId, CHAT_RATE_LIMIT);
    if (!rateCheck.allowed) {
      const retrySeconds = Math.ceil((rateCheck.retryAfterMs || 60000) / 1000);
      return NextResponse.json(
        {
          narrative: `⏳ Çok fazla istek gönderildi. ${retrySeconds} saniye sonra tekrar dene.`,
          highlightNodeIds: [],
          highlightLinkIds: [],
          focusNodeId: null,
          annotations: {},
          followUp: null,
          sources: [],
          rateLimited: true,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retrySeconds) },
        }
      );
    }

    // Request body size check — 2MB default for JSON
    const tooBig = checkBodySize(request);
    if (tooBig) return tooBig;

    // Validate input
    const validation = await validateBody(request, chatSchema);
    if (!validation.success) return validation.response;
    const { question, conversationHistory, nodes, links, previousHighlightNodeIds } = validation.data;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // AI-2.3: Filter to only relevant nodes (reduces hallucination surface)
    const relevantNodes = filterRelevantNodes(nodes || [], question, 15);
    const networkContext = buildNetworkContext(relevantNodes, links || []);

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `İşte mevcut ağ verisi:\n\n${networkContext}` },
      { role: 'assistant', content: '{"narrative": "Ağ verisini aldım. Sormak istediğiniz her şeyi sorabilirsiniz.", "highlightNodeIds": [], "highlightLinkIds": [], "focusNodeId": null, "followUp": "Ağdaki kişiler hakkında ne öğrenmek istersiniz?", "sources": []}' },
    ];

    // Add conversation history (last 4 exchanges = 8 messages — token tasarrufu)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recent = conversationHistory.slice(-8);
      for (const msg of recent) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add context about previous highlights — sadece isimler, UUID yok
    let contextPrefix = '';
    if (previousHighlightNodeIds && previousHighlightNodeIds.length > 0 && nodes) {
      const prevNames = previousHighlightNodeIds
        .slice(0, 8) // max 8 isim
        .map((id: string) => {
          const node = nodes.find((n: any) => n.id === id);
          return node ? (node.label || node.name || 'Unknown') : 'Unknown';
        })
        .filter(Boolean)
        .join(', ');
      if (prevNames) {
        contextPrefix = `[BAĞLAM: Ekranda şu an highlight: ${prevNames}]\n\n`;
      }
    }

    // Add current question with context
    messages.push({ role: 'user', content: contextPrefix + question });

    // Call Groq
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    // Parse AI response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, wrap raw text as narrative
      parsed = {
        narrative: responseText,
        highlightNodeIds: [],
        highlightLinkIds: [],
        focusNodeId: null,
        followUp: null,
        sources: [],
      };
    }

    // Validate highlightNodeIds exist in provided nodes
    if (parsed.highlightNodeIds && nodes) {
      const nodeIds = new Set(nodes.map((n: any) => n.id));
      parsed.highlightNodeIds = parsed.highlightNodeIds.filter(
        (id: string) => nodeIds.has(id)
      );
    }

    // AI-2.1: Validate annotations against database facts
    // Filters out death claims without death_date, fake financial figures, etc.
    const validatedAnnotations = validateAnnotations(parsed.annotations || {}, nodes || []);

    // AI-2.2: Calculate confidence level for transparency
    const confidenceLevel = calculateConfidence(parsed, nodes || []);
    const dataSourced = checkDataSourced(parsed, nodes || []);

    // E1 FIX: Sanitize narrative (truncate + strip dangerous patterns)
    const narrative = sanitizeNarrative(parsed.narrative || '');

    return NextResponse.json({
      narrative,
      highlightNodeIds: parsed.highlightNodeIds || [],
      highlightLinkIds: parsed.highlightLinkIds || [],
      focusNodeId: parsed.focusNodeId || null,
      annotations: validatedAnnotations,
      followUp: parsed.followUp || null,
      sources: parsed.sources || [],
      // AI-2.2: Confidence badge fields
      confidenceLevel,
      dataSourced,
      // E1 FIX: AI disclaimer — frontend should display this to users
      aiDisclaimer: 'AI tarafından üretilmiştir. Bu analiz ağ verisine dayalıdır ancak doğrulanmış gazetecilik yerine geçmez. Tüm bilgileri bağımsız olarak doğrulayın.',
    });

  } catch (error: any) {
    // E1 + D1 FIX: Log full details server-side, never expose to client
    const statusCode = error?.status || error?.statusCode || 500;
    console.error('[POST /api/chat] error:', statusCode, error?.message, error?.error || '');

    // Rate limit — kullanıcıya anlamlı mesaj (Groq 429)
    if (statusCode === 429 || error?.message?.includes('Rate limit') || error?.message?.includes('rate_limit')) {
      return NextResponse.json(
        {
          narrative: '⏳ Günlük AI sorgu limiti doldu. Birkaç dakika sonra tekrar dene.',
          highlightNodeIds: [],
          highlightLinkIds: [],
          focusNodeId: null,
          annotations: {},
          followUp: null,
          sources: [],
          rateLimited: true,
        },
        { status: 200 } // 200 döndür ki frontend crash olmasın
      );
    }

    // D1 FIX: Generic error — no internal details leaked
    return safeErrorResponse('POST /api/chat', error);
  }
}
