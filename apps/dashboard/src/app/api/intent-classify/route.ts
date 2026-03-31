import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { checkRateLimit, getClientId, INTENT_RATE_LIMIT } from '@/lib/rateLimit';
import { validateBody, intentClassifySchema } from '@/lib/validation';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ═══════════════════════════════════════════
// INTENT CLASSIFY API — Sprint 7
// LLM-powered intent → ViewMode classification
// ═══════════════════════════════════════════

const SYSTEM_PROMPT = `Sen bir OSINT soruşturma platformunun AI asistanısın.
Kullanıcının sorgusunun arkasındaki "lens intent"ini belirliyorsun.

Mevcut view modları:
- full_network: Genel soru, spesifik filtre yok, tüm ağ görünsün
- main_story: Ana aktörler, kilit oyuncular, hikaye özeti, kim bunlar, özetle
- follow_money: Finansal bağlantılar, para akışı, banka transferi, offshore, shell company
- evidence_map: Kanıt doğrulama, güven seviyesi, mahkeme kaydı, resmi belge, yayınlanabilir mi
- timeline: Tarih sırası, kronoloji, ne zaman oldu, hangi dönem
- board: 2D soruşturma panosu, dedektif tahtası, sürükle-bırak düzeni, pinboard, layout

SADECE JSON döndür:
{
  "intent": "main_story",
  "confidence": 0.88,
  "reason": "Kullanıcı ana aktörleri sormak istiyor"
}

Emin değilsen full_network seç.`;

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(clientId, INTENT_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json({ intent: 'full_network', confidence: 0.5, reason: 'rate_limited' });
    }

    const validation = await validateBody(request, intentClassifySchema);
    if (!validation.success) {
      return NextResponse.json({ intent: 'full_network', confidence: 0.5, reason: 'validation_failed' });
    }
    const { query } = validation.data;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Sorgu: "${query}"` },
      ],
      temperature: 0.1,  // Deterministik — tutarlı sınıflandırma
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(text);

    const validModes = ['full_network', 'main_story', 'follow_money', 'evidence_map', 'timeline', 'board'];
    if (!validModes.includes(result.intent)) {
      result.intent = 'full_network';
    }

    return NextResponse.json({
      intent: result.intent,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      reason: result.reason || '',
    });
  } catch (e) {
    console.error('Intent classify error:', e);
    return NextResponse.json({ intent: 'full_network', confidence: 0.5, reason: '' });
  }
}
