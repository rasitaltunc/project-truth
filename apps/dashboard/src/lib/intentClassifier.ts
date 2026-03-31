// ═══════════════════════════════════════════
// INTENT CLASSIFIER — Sprint 7 "Akıllı Lens"
// Kullanıcı sorgusundan lens intent'i çıkarır
// Client-safe: sadece Groq API'yi çağırır
// ═══════════════════════════════════════════

import type { ViewMode } from '@/store/viewModeStore';

export interface IntentResult {
  intent: ViewMode;
  confidence: number;      // 0.0 - 1.0
  reason: string;          // Neden bu mod önerildi
  suggestMode: boolean;    // Kullanıcıya öneri göster?
}

// ─── Basit keyword-based classifier (LLM'den önce çalışır, hızlı + ücretsiz) ───
const KEYWORD_MAP: Record<ViewMode, string[]> = {
  full_network: ['herkes', 'tümü', 'hepsi', 'genel', 'tüm ağ', 'full', 'overview', 'genel bakış'],
  main_story: [
    'ana hikaye', 'kilit', 'ana aktör', 'önemli', 'merkez', 'kim bunlar', 'anlat',
    'özetle', 'ana karakterler', 'başrol', 'key players', 'main', 'hikaye', 'özet',
    'en önemli', 'mastermind', 'lider', 'baş aktör',
  ],
  follow_money: [
    'para', 'mali', 'finansal', 'banka', 'transfer', 'hesap', 'ödeme', 'gelir',
    'servet', 'zengin', 'fon', 'yatırım', 'offshore', 'shell', 'holding', 'vergi',
    'money', 'financial', 'fund', 'payment', 'bank', 'account', 'follow the money',
    'parayı takip', 'kara para', 'aklaması', 'finansman',
  ],
  evidence_map: [
    'kanıt', 'doğrulama', 'kaynak', 'belge', 'güven', 'ispat', 'mahkeme',
    'ispatla', 'kanıtla', 'doğrula', 'güvenilir', 'evidence', 'proof', 'verified',
    'yayınlanabilir', 'basın', 'court', 'official', 'resmi', 'teyit',
  ],
  timeline: [
    'zaman', 'tarih', 'ne zaman', 'kronoloji', 'sıralama', 'önce', 'sonra',
    'hangi yıl', 'kaçında', 'geçmiş', 'tarihsel', 'timeline', 'kronolojik',
    'chronological', 'when', 'history', 'yıl', 'dönem', 'periyot',
  ],
  board: [
    'pano', 'board', 'dedektif', 'soruşturma panosu', '2d', 'sürükle', 'pin',
    'investigation board', '2d görünüm', 'layout', 'düzen', 'hazırlama', 'planlama',
  ],
};

function keywordClassify(query: string): IntentResult | null {
  const q = query.toLowerCase();
  const scores: Record<ViewMode, number> = {
    full_network: 0, main_story: 0, follow_money: 0, evidence_map: 0, timeline: 0, board: 0,
  };
  const matchCounts: Record<ViewMode, number> = {
    full_network: 0, main_story: 0, follow_money: 0, evidence_map: 0, timeline: 0, board: 0,
  };

  for (const [mode, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        const wordCount = kw.split(' ').length;
        // Çok kelimeli ifadeler (compound phrases) daha güvenilir sinyal
        // Tek kelime: +1, iki kelime: +3, üç kelime: +5
        scores[mode as ViewMode] += wordCount === 1 ? 1 : wordCount * 2 - 1;
        matchCounts[mode as ViewMode]++;
      }
    }
  }

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  const [bestMode, bestScore] = best;

  if (bestScore === 0) return null;

  // full_network dışında bir şey kazandıysa öner
  if (bestMode === 'full_network') return null;

  // FALSE-POSITIVE AZALTMA:
  // Tek kelimelik tek eşleşme ("para", "tarih" gibi) → çok düşük güven
  // En az 2 eşleşme veya 1 compound phrase gerekli
  const matchCount = matchCounts[bestMode as ViewMode];
  if (matchCount === 1 && bestScore <= 1) {
    // Tek kelime tek eşleşme → confidence çok düşük, öneri gösterme
    return {
      intent: bestMode as ViewMode,
      confidence: 0.35,
      reason: getModeReason(bestMode as ViewMode, query),
      suggestMode: false, // LLM'e yönlendir, direkt önerme
    };
  }

  const confidence = Math.min(0.95, 0.45 + bestScore * 0.06);
  return {
    intent: bestMode as ViewMode,
    confidence,
    reason: getModeReason(bestMode as ViewMode, query),
    suggestMode: confidence > 0.6,
  };
}

function getModeReason(mode: ViewMode, query: string): string {
  const reasons: Record<ViewMode, string> = {
    full_network: 'To show the full network.',
    main_story: `"${query.slice(0, 30)}..." — Main Story mode highlights key actors.`,
    follow_money: `"${query.slice(0, 30)}..." — Switch to Follow The Money mode to see money flow.`,
    evidence_map: `"${query.slice(0, 30)}..." — Switch to Evidence Map mode to see evidence confidence.`,
    timeline: `"${query.slice(0, 30)}..." — Switch to Timeline mode for chronological view.`,
    board: `"${query.slice(0, 30)}..." — Switch to 2D Investigation Board mode to arrange nodes.`,
  };
  return reasons[mode] || '';
}

// ─── LLM-Based classifier (yüksek güven gerektiğinde) ───
export async function classifyIntent(query: string): Promise<IntentResult | null> {
  // 1. Önce hızlı keyword check
  const keywordResult = keywordClassify(query);

  // Çok kısa veya genel sorgular için LLM'e gitme
  if (query.length < 10) return null;

  // Keyword result yeterliyse LLM'e gitme (maliyet tasarrufu)
  if (keywordResult && keywordResult.confidence >= 0.75) {
    return keywordResult;
  }

  // 2. LLM intent classification (API route üzerinden)
  try {
    const res = await fetch('/api/intent-classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return keywordResult; // LLM başarısız olursa keyword result kullan
    }

    const data = await res.json();
    if (data.intent && data.confidence) {
      return {
        intent: data.intent as ViewMode,
        confidence: data.confidence,
        reason: data.reason || getModeReason(data.intent, query),
        suggestMode: data.confidence >= 0.75 && data.intent !== 'full_network',
      };
    }
  } catch {
    // LLM başarısız → keyword fallback
  }

  return keywordResult;
}
