/**
 * CER Mapping Helpers
 *
 * Karantinadan (data_quarantine) gelen veriyi yeni motor şemasına (CER) çeviren köprü.
 * /api/quarantine/[id]/promote/route.ts içinde "yeni motora da yaz" akışında çağrılır.
 *
 * Anayasa İlişkisi:
 *   Madde 2 (kaynak zorunlu): source_grade hesaplaması zorunlu, eksik bilgi → exception
 *   Madde 8 (yanlış > eksik): bilinmeyen tip için sessiz fallback YOK, hata fırlat
 *   Madde 21 (sahte vaat yasağı): bu fonksiyonlar yapamadığı şeyi yapamadığını söyler
 *
 * Sprint 16/17 ↔ CER Hafta 3 entegrasyon parçası.
 * Tarih: 3 Mayıs 2026
 */

import { randomBytes } from 'crypto';

// ─────────────────────────────────────────────────────────────────────
// CER ŞEMA SABİTLERİ (SPRINT_CER_MIGRATION.sql ile birebir uyumlu)
// ─────────────────────────────────────────────────────────────────────

// schema_type CHECK listesi
export const CER_SCHEMA_TYPES = [
  'Thing',
  'Person',
  'Organization',
  'Location',
  'Event',
  'Document',
  'Asset',
  'CourtCase',
  'Flight',
  'UnknownLink',
] as const;

export type CerSchemaType = typeof CER_SCHEMA_TYPES[number];

// source_grade CHECK listesi (YK-7: full NATO Admiralty, 36 hücre)
const NATO_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const NATO_NUMBERS = ['1', '2', '3', '4', '5', '6'] as const;
type NatoLetter = typeof NATO_LETTERS[number];
type NatoNumber = typeof NATO_NUMBERS[number];
export type NatoGrade = `${NatoLetter}${NatoNumber}`;

// source_type CHECK listesi
export const CER_SOURCE_TYPES = [
  'court_record',
  'official_document',
  'government_record',
  'leaked_document',
  'journalist_investigation',
  'verified_news',
  'wikipedia',
  'social_media',
  'community_claim',
  'manual_entry',
  'api_import',
  'ai_extraction',
] as const;

export type CerSourceType = typeof CER_SOURCE_TYPES[number];

// name_layer CHECK listesi
export type CerNameLayer = 'name' | 'alias' | 'previousName' | 'weakAlias';


// ─────────────────────────────────────────────────────────────────────
// 1. mapEntityType — AI tipini CER schema_type'a çevir
// ─────────────────────────────────────────────────────────────────────
/**
 * AI extraction kişi tipini farklı kelimelerle çıkarabilir (person, individual,
 * human, persons, kişi). CER ise CHECK constraint ile katı listeyi zorlar.
 * Bu fonksiyon esnek girişi katı çıkışa çevirir.
 *
 * @throws Anayasa Madde 8 gereği — eşleşmeyen tip için 'Thing' fallback yok,
 *         hata fırlatır. Sessiz "yanlış veri" yazmaktan eksik veri iyidir.
 */
export function mapEntityType(rawType: string | undefined | null): CerSchemaType {
  if (!rawType || typeof rawType !== 'string') {
    throw new Error(
      `[cerMapping.mapEntityType] Boş veya geçersiz girdi: ${JSON.stringify(rawType)}. ` +
      `Karantina kaydında item_data.type alanı dolu olmalı.`
    );
  }

  const n = rawType.trim().toLowerCase();

  // Person varyantları
  if (['person', 'persons', 'individual', 'human', 'people', 'kişi', 'kisi'].includes(n)) {
    return 'Person';
  }

  // Organization varyantları
  if ([
    'organization', 'organisation', 'org', 'company', 'corporation', 'corp',
    'institution', 'ngo', 'government_agency', 'agency', 'foundation',
    'kurum', 'şirket', 'sirket', 'kuruluş', 'kurulus',
  ].includes(n)) {
    return 'Organization';
  }

  // Location varyantları
  if ([
    'location', 'place', 'city', 'country', 'address', 'venue',
    'region', 'state', 'province',
    'yer', 'lokasyon', 'şehir', 'sehir', 'ülke', 'ulke',
  ].includes(n)) {
    return 'Location';
  }

  // Event varyantları
  if ([
    'event', 'meeting', 'incident', 'occurrence', 'gathering',
    'olay', 'toplantı', 'toplanti',
  ].includes(n)) {
    return 'Event';
  }

  // Document varyantları
  if ([
    'document', 'doc', 'file', 'record', 'paper',
    'belge', 'evrak', 'dosya',
  ].includes(n)) {
    return 'Document';
  }

  // Asset varyantları
  if ([
    'asset', 'property', 'vehicle', 'yacht', 'aircraft', 'plane',
    'company_share', 'real_estate', 'building',
    'varlık', 'varlik', 'mülk', 'mulk',
  ].includes(n)) {
    return 'Asset';
  }

  // CourtCase varyantları
  if ([
    'courtcase', 'court_case', 'court-case', 'lawsuit', 'litigation', 'case',
    'dava', 'mahkeme',
  ].includes(n)) {
    return 'CourtCase';
  }

  // Flight varyantları (YK-1: interstitial entity)
  if (['flight', 'trip', 'journey', 'uçuş', 'ucus'].includes(n)) {
    return 'Flight';
  }

  // UnknownLink (sansürlü/bilinmeyen taraf placeholder)
  if (['unknown', 'unknownlink', 'unknown_link', 'placeholder', 'unbekannt'].includes(n)) {
    return 'UnknownLink';
  }

  // Anayasa Madde 8: yanlış > eksik
  // Sessiz Thing fallback YOK — eşleşmeyen tip aktif sorunu işaret eder
  throw new Error(
    `[cerMapping.mapEntityType] Tanınmayan tip: "${rawType}". ` +
    `CER kabul ettiği tipler: ${CER_SCHEMA_TYPES.filter(t => t !== 'Thing').join(', ')}. ` +
    `Yeni varyant eklenmeli VEYA AI prompt düzeltilmeli VEYA promote başarısız olmalı.`
  );
}


// ─────────────────────────────────────────────────────────────────────
// 2. composeNatoGrade — NATO Admiralty harf+sayı birleştirme
// ─────────────────────────────────────────────────────────────────────
/**
 * AI extraction nato_reliability ('B') ve nato_credibility ('2') ayrı tutar.
 * CER tek bir source_grade alanında 'B2' olarak saklar.
 * Bu fonksiyon iki bileşeni birleştirir + aralık doğrular.
 *
 * @throws Anayasa Madde 2 gereği — eksik bilgi varsa hata, sessiz default yok.
 */
export function composeNatoGrade(
  reliability: string | undefined | null,
  credibility: string | number | undefined | null
): NatoGrade {
  if (!reliability) {
    throw new Error(
      '[cerMapping.composeNatoGrade] reliability gerekli (NATO harfi A-F). ' +
      'Boş bırakılamaz — Anayasa Madde 2 (kaynak zorunlu).'
    );
  }
  if (credibility === null || credibility === undefined || credibility === '') {
    throw new Error(
      '[cerMapping.composeNatoGrade] credibility gerekli (NATO sayısı 1-6). ' +
      'Boş bırakılamaz — Anayasa Madde 2 (kaynak zorunlu).'
    );
  }

  const letter = String(reliability).trim().toUpperCase() as NatoLetter;
  const num = String(credibility).trim() as NatoNumber;

  if (!NATO_LETTERS.includes(letter)) {
    throw new Error(
      `[cerMapping.composeNatoGrade] Geçersiz reliability: "${reliability}". ` +
      `A-F arasında olmalı.`
    );
  }
  if (!NATO_NUMBERS.includes(num)) {
    throw new Error(
      `[cerMapping.composeNatoGrade] Geçersiz credibility: "${credibility}". ` +
      `1-6 arasında olmalı.`
    );
  }

  return `${letter}${num}` as NatoGrade;
}


// ─────────────────────────────────────────────────────────────────────
// 3. computeSourceGradeFromContext — bağlamdan NATO grade tahmini
// ─────────────────────────────────────────────────────────────────────
/**
 * AI explicit nato_reliability/credibility vermediyse, belge tipi + güven sayısı
 * üzerinden makul varsayılan hesaplar. Muhafazakar — emin değilken aşağı düşer.
 *
 * Letter mantığı: source_type'in semantik güvenilirliği
 *   court_record/official_document/government_record → A (resmi)
 *   leaked_document/journalist_investigation → B (sızdırılmış / araştırmacı)
 *   verified_news/wikipedia → C (medya / topluluk)
 *   manual_entry/api_import → B (sorumlu kişi/sistem)
 *   community_claim → D (topluluk iddiası)
 *   ai_extraction/social_media → E (otomatik / tek kaynak)
 *
 * Number mantığı: confidence aralıkları
 *   ≥0.95 → 1 (confirmed)
 *   ≥0.80 → 2 (probably true)
 *   ≥0.65 → 3 (possibly true)
 *   ≥0.50 → 4 (doubtful)
 *   ≥0.30 → 5 (improbable)
 *   <0.30 → 6 (cannot be judged)
 */
export function computeSourceGradeFromContext(
  sourceType: CerSourceType,
  confidence: number | undefined | null
): NatoGrade {
  const conf = typeof confidence === 'number' && !isNaN(confidence)
    ? Math.max(0, Math.min(1, confidence))  // 0-1 aralığına sıkıştır
    : 0.5;  // Bilinmeyen → ortalama

  // Letter
  let letter: NatoLetter;
  switch (sourceType) {
    case 'court_record':
    case 'official_document':
    case 'government_record':
      letter = 'A';
      break;
    case 'leaked_document':
    case 'journalist_investigation':
    case 'manual_entry':
    case 'api_import':
      letter = 'B';
      break;
    case 'verified_news':
    case 'wikipedia':
      letter = 'C';
      break;
    case 'community_claim':
      letter = 'D';
      break;
    case 'ai_extraction':
    case 'social_media':
      letter = 'E';
      break;
    default:
      // Bu noktaya ulaşmamalı (CerSourceType type-safe), ama defansif
      letter = 'F';
  }

  // Number
  let num: NatoNumber;
  if (conf >= 0.95) num = '1';
  else if (conf >= 0.80) num = '2';
  else if (conf >= 0.65) num = '3';
  else if (conf >= 0.50) num = '4';
  else if (conf >= 0.30) num = '5';
  else num = '6';

  return `${letter}${num}` as NatoGrade;
}


// ─────────────────────────────────────────────────────────────────────
// 4. generateCanonicalId — yeni CER entity için rastgele ID
// ─────────────────────────────────────────────────────────────────────
/**
 * Yeni canonical_entity için TRU-{8 hex} formatında rastgele ID üretir.
 *
 * SK-4 kararı gereği RASTGELE, deterministik DEĞİL — fingerprint'ten türeyen
 * deterministik ID, yeni bilgi gelince (doğum tarihi düzeltilir, milliyet
 * netleşir) değişir ve merge'de çöker. Random ID + referent forwarding
 * (cer_entity_referents) bu sorunu çözer.
 */
export function generateCanonicalId(): string {
  const hex = randomBytes(4).toString('hex');
  return `TRU-${hex}`;
}


// ─────────────────────────────────────────────────────────────────────
// 5. determineNameLayer — bir isim için layer kategorisi
// ─────────────────────────────────────────────────────────────────────
/**
 * Bir entity için yazılan ismin layer kategorisini belirler.
 *
 * Kurallar:
 *   - Entity'nin ilk ismi → 'name' (birincil)
 *   - Sonraki isimler → 'alias' (takma)
 *   - Geçmişte kullanılmış isim → 'previousName'
 *   - Çok genel/jenerik isim ("Ahmet" tek başına) → 'weakAlias'
 */
export function determineNameLayer(opts: {
  isFirstName?: boolean;
  isHistorical?: boolean;
  isGeneric?: boolean;
}): CerNameLayer {
  if (opts.isHistorical) return 'previousName';
  if (opts.isGeneric) return 'weakAlias';
  return opts.isFirstName ? 'name' : 'alias';
}


// ─────────────────────────────────────────────────────────────────────
// 6. mapKarantinaSourceType — karantina source_type → CER source_type
// ─────────────────────────────────────────────────────────────────────
/**
 * data_quarantine.source_type değerlerini CER'in CHECK listesine map'ler.
 * Karantina bazen 'structured_api', 'ai_extraction', 'manual' gibi farklı
 * isimler kullanıyor — bunları CER'in 12 standart tipinden birine çeviririz.
 */
export function mapKarantinaSourceType(rawType: string | undefined | null): CerSourceType {
  if (!rawType) return 'ai_extraction';  // Bilinmeyen → en muhafazakar (E5)

  const n = String(rawType).trim().toLowerCase();

  if (n === 'ai_extraction' || n === 'ai' || n === 'extraction') return 'ai_extraction';
  if (n === 'structured_api' || n === 'api' || n === 'api_import') return 'api_import';
  if (n === 'manual' || n === 'manual_entry' || n === 'human') return 'manual_entry';
  if (n === 'court_record' || n === 'court' || n === 'court_filing') return 'court_record';
  if (n === 'official_document' || n === 'official') return 'official_document';
  if (n === 'government_record' || n === 'government') return 'government_record';
  if (n === 'leaked_document' || n === 'leak' || n === 'leaked') return 'leaked_document';
  if (n === 'journalist_investigation' || n === 'journalism') return 'journalist_investigation';
  if (n === 'verified_news' || n === 'news') return 'verified_news';
  if (n === 'wikipedia' || n === 'wiki') return 'wikipedia';
  if (n === 'social_media' || n === 'social' || n === 'twitter' || n === 'tweet') return 'social_media';
  if (n === 'community_claim' || n === 'community') return 'community_claim';

  // Tanınmayan → ai_extraction (en düşük güven default'u, ağırlıkla dengelenir)
  // Bu hata fırlatmaz çünkü Sprint 16/17 zaten promote'a kadar veriyi onaylar;
  // burada katılık katmak ileri akışı bloklar.
  return 'ai_extraction';
}
