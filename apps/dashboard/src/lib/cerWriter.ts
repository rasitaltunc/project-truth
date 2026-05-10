/**
 * CER Writer Helpers
 *
 * Karantinadan onaylanan veriyi YENİ MOTORA (CER) yazan yardımcılar.
 * /api/quarantine/[id]/promote/route.ts içinden çağrılır.
 *
 * "Paralel mod" kararı (3 Mayıs 2026):
 *   Eski nodes/links tablolarına yazma DEVAM EDER, bu fonksiyonlar onun
 *   YANINDA CER'e ekstra yazım yapar. Eski sistem regresyon güvencesi.
 *   İki hafta sonra gerçek tek kaynak'a geçişte eski yazımlar kaldırılacak.
 *
 * Anayasa İlişkisi:
 *   Madde 2 (kaynak zorunlu): her statement source_document_id alır
 *   Madde 8 (yanlış > eksik): yarım yazım yok — atomik try/catch + log
 *   Madde 19 (kamu malı): canonical_id public, herkes okuyabilir
 *
 * Sprint 16/17 ↔ CER Hafta 3 entegrasyonu.
 * Tarih: 3 Mayıs 2026
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { findBestMatch } from './entityResolution';
import {
  mapEntityType,
  generateCanonicalId,
  composeNatoGrade,
  computeSourceGradeFromContext,
  mapKarantinaSourceType,
  determineNameLayer,
  type CerSchemaType,
  type CerSourceType,
  type NatoGrade,
} from './cerMapping';


// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

/**
 * CER'e yazılan her statement için ortak kaynak bağlamı.
 * Bunlar tek tek statement'a değil, bir batch'e ait olur.
 */
export interface CerSourceContext {
  source_type: CerSourceType;
  source_grade: NatoGrade;
  source_document_id?: string | null;
  source_url?: string | null;
  source_citation?: string | null;
  raw_confidence: number;  // 0.0 - 1.0
  /**
   * Aktör bilgisi event_payload'a yazılır (trigger'da actor='system' kalır,
   * uygulama tarafından SET LOCAL pattern v2'de eklenecek).
   */
  actor_fingerprint?: string | null;
}

/**
 * Yeni entity için tüm bilgi paketi.
 * Bir karantina kaydının promote edilmesi tipik olarak bu yapıyı doğurur.
 */
export interface CerEntityInput {
  name: string;
  schema_type: CerSchemaType;
  is_redacted?: boolean;
  doe_code?: string | null;
  natural_ids?: Record<string, string>;  // Wikidata, OpenCorporates, vb.
  /**
   * Ek property'ler — name dışında tüm öznitelikler.
   * Örnek: { nationality: 'UK', birthDate: '1961-12-25', occupation: 'socialite' }
   */
  attributes?: Record<string, string | number | null>;
}

/**
 * Yazma işleminin sonucu — promote rotası bunu döndürür.
 */
export interface CerWriteResult {
  canonical_id: string;
  action: 'created_new' | 'merged_existing';
  match_score?: number;  // sadece merged_existing için
  match_method?: 'exact' | 'jaro_winkler' | 'levenshtein' | 'phonetic';
  statements_added: number;
}


// ─────────────────────────────────────────────────────────────────────
// 1. fetchCerEntitiesForMatching
// ─────────────────────────────────────────────────────────────────────
/**
 * CER'deki tüm aktif canonical_entities'i ve birincil isimlerini çeker.
 * Fuzzy match için input olarak kullanılır.
 *
 * Performans notu: v1'de tüm entity'ler çekilir (binlerce satır olunca yavaş).
 * v2'de schema_type filter + indexed search eklenecek.
 */
export async function fetchCerEntitiesForMatching(
  supabase: SupabaseClient,
  schemaType?: CerSchemaType,
): Promise<Array<{ id: string; name: string; type: string }>> {
  // Önce canonical_entities — schema_type filter varsa uygula
  let entityQuery = supabase
    .from('cer_canonical_entities')
    .select('canonical_id, schema_type');

  if (schemaType) {
    entityQuery = entityQuery.eq('schema_type', schemaType);
  }

  const { data: entities, error: entError } = await entityQuery;
  if (entError || !entities) return [];

  // Her entity'nin birincil ismini (name_layer='name', active) çek
  const canonicalIds = entities.map(e => e.canonical_id);
  if (canonicalIds.length === 0) return [];

  const { data: nameStatements, error: stmtError } = await supabase
    .from('cer_entity_statements')
    .select('entity_id, value')
    .in('entity_id', canonicalIds)
    .eq('property', 'name')
    .eq('name_layer', 'name')
    .eq('statement_status', 'active');

  if (stmtError || !nameStatements) return [];

  // Map ile entity_id → name eşle
  const nameMap = new Map<string, string>();
  for (const s of nameStatements) {
    if (!nameMap.has(s.entity_id)) {
      nameMap.set(s.entity_id, s.value);
    }
  }

  // findBestMatch ile uyumlu format döndür
  return entities
    .filter(e => nameMap.has(e.canonical_id))
    .map(e => ({
      id: e.canonical_id,
      name: nameMap.get(e.canonical_id)!,
      type: e.schema_type,
    }));
}


// ─────────────────────────────────────────────────────────────────────
// 2. resolveOrCreateCerEntity — fuzzy match dene, gerekirse yeni yarat
// ─────────────────────────────────────────────────────────────────────
/**
 * Bir entity'yi CER'e ekler. Önce mevcut entity'lerle fuzzy match dener.
 * Eşleşme varsa mevcut entity'ye yeni statement ekler (alias, ek nitelikler).
 * Eşleşme yoksa yeni canonical entity yaratır + ilk statement'ları yazar.
 *
 * Anayasa Madde 8 (yanlış > eksik): match eşiği 0.85 — düşük olursa yanlış
 * birleştirme, yüksek olursa duplicate. Görüşülen eşik buradan değiştirilebilir.
 */
export async function resolveOrCreateCerEntity(
  supabase: SupabaseClient,
  input: CerEntityInput,
  source: CerSourceContext,
): Promise<CerWriteResult> {
  // 1. Mevcut entity'leri çek (aynı schema_type ile fuzzy match)
  const candidates = await fetchCerEntitiesForMatching(supabase, input.schema_type);

  // 2. Fuzzy match dene
  const match = candidates.length > 0
    ? findBestMatch(input.name, candidates.map(c => ({ id: c.id, name: c.name, type: c.type })), 0.85)
    : null;

  if (match) {
    // ─── Mevcut entity'ye merge ───
    const statementsAdded = await addStatementsToCerEntity(
      supabase,
      match.nodeId,
      input,
      source,
      { isFirstName: false },  // alias olarak ekle
    );

    return {
      canonical_id: match.nodeId,
      action: 'merged_existing',
      match_score: match.score,
      match_method: match.method,
      statements_added: statementsAdded,
    };
  }

  // ─── Yeni canonical entity yarat ───
  const canonicalId = generateCanonicalId();

  const { error: createError } = await supabase
    .from('cer_canonical_entities')
    .insert({
      canonical_id: canonicalId,
      schema_type: input.schema_type,
      is_redacted: input.is_redacted || false,
      doe_code: input.doe_code || null,
      natural_ids: input.natural_ids || {},
    });

  if (createError) {
    throw new Error(
      `[cerWriter.resolveOrCreateCerEntity] Yeni entity yaratılamadı: ${createError.message}`
    );
  }

  // İlk statement'ları yaz (name birinci, sonra attributes)
  const statementsAdded = await addStatementsToCerEntity(
    supabase,
    canonicalId,
    input,
    source,
    { isFirstName: true },  // birincil name olarak ekle
  );

  return {
    canonical_id: canonicalId,
    action: 'created_new',
    statements_added: statementsAdded,
  };
}


// ─────────────────────────────────────────────────────────────────────
// 3. addStatementsToCerEntity — entity'ye birden fazla statement yaz
// ─────────────────────────────────────────────────────────────────────
/**
 * Bir entity'ye name + attributes statement'larını yazar.
 * Her statement ayrı satır olur — provenance ayrı tutulur.
 *
 * Lifecycle Bus trigger'ları otomatik 'statement_added' event üretir.
 */
async function addStatementsToCerEntity(
  supabase: SupabaseClient,
  canonicalId: string,
  input: CerEntityInput,
  source: CerSourceContext,
  opts: { isFirstName: boolean },
): Promise<number> {
  const rows: Array<Record<string, unknown>> = [];

  // 1. Name statement
  rows.push({
    entity_id: canonicalId,
    property: 'name',
    value: input.name,
    name_layer: determineNameLayer({ isFirstName: opts.isFirstName }),
    source_type: source.source_type,
    source_grade: source.source_grade,
    source_document_id: source.source_document_id || null,
    source_url: source.source_url || null,
    source_citation: source.source_citation || null,
    raw_confidence: source.raw_confidence,
    statement_status: 'active',
  });

  // 2. Diğer attribute statement'ları
  if (input.attributes) {
    for (const [property, value] of Object.entries(input.attributes)) {
      if (value === null || value === undefined) continue;

      rows.push({
        entity_id: canonicalId,
        property,
        value: String(value),
        source_type: source.source_type,
        source_grade: source.source_grade,
        source_document_id: source.source_document_id || null,
        source_url: source.source_url || null,
        source_citation: source.source_citation || null,
        raw_confidence: source.raw_confidence,
        statement_status: 'active',
      });
    }
  }

  // Toplu insert
  const { error } = await supabase
    .from('cer_entity_statements')
    .insert(rows);

  if (error) {
    throw new Error(
      `[cerWriter.addStatementsToCerEntity] Statement'lar yazılamadı (${canonicalId}): ${error.message}`
    );
  }

  return rows.length;
}


// ─────────────────────────────────────────────────────────────────────
// 4. createCerRelationshipStatement — iki entity arası ilişki
// ─────────────────────────────────────────────────────────────────────
/**
 * İki entity arasında ilişki statement'ı yazar.
 *
 * CER'de "ilişki tablosu" yok — ilişki, subject entity'sinin bir statement'ı:
 *   subject.<relationship_type> = target_entity_id
 *
 * Örnek: Maxwell.passenger_of = Flight TRU-test0004f
 *        Maxwell.associate_of = Epstein TRU-test0001
 *
 * NOT: Karmaşık ilişkiler (Flight, Ownership, Transaction) için interstitial
 * entity yaratılmalı (YK-1). Bu fonksiyon basit ilişki içindir.
 */
export async function createCerRelationshipStatement(
  supabase: SupabaseClient,
  args: {
    subjectCanonicalId: string;
    relationshipType: string;  // örn. 'associate_of', 'passenger_of'
    targetCanonicalId: string;
    source: CerSourceContext;
    // SCHEMA FIX (10 May 2026 — Task #10): Bi-temporal alanlar.
    // valid_start/valid_end: ilişkinin geçerli olduğu zaman aralığı (örn. conspiracy 1994-2004)
    // event_time: tek anlık olay (örn. uçuş tarihi)
    validStart?: string | null;   // ISO date string veya null
    validEnd?: string | null;
    eventTime?: string | null;
  },
): Promise<{ statement_id: string }> {
  const { data, error } = await supabase
    .from('cer_entity_statements')
    .insert({
      entity_id: args.subjectCanonicalId,
      property: args.relationshipType,
      value: null,
      value_entity_ref: args.targetCanonicalId,
      source_type: args.source.source_type,
      source_grade: args.source.source_grade,
      source_document_id: args.source.source_document_id || null,
      source_url: args.source.source_url || null,
      source_citation: args.source.source_citation || null,
      raw_confidence: args.source.raw_confidence,
      statement_status: 'active',
      valid_start: args.validStart || null,
      valid_end: args.validEnd || null,
      event_time: args.eventTime || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `[cerWriter.createCerRelationshipStatement] Yazılamadı: ${error?.message || 'unknown'}`
    );
  }

  return { statement_id: data.id };
}


// ─────────────────────────────────────────────────────────────────────
// 5. buildSourceContextFromQuarantine — karantina kaydından source bilgisi
// ─────────────────────────────────────────────────────────────────────
/**
 * data_quarantine kaydını CerSourceContext'e dönüştürür.
 * Promote rotası bunu mapping fonksiyonlarıyla birlikte kullanır.
 */
export function buildSourceContextFromQuarantine(qItem: {
  source_type?: string | null;
  document_id?: string | null;
  confidence?: number | null;
  item_data?: Record<string, unknown> | null;
}): CerSourceContext {
  const sourceType = mapKarantinaSourceType(qItem.source_type);
  const itemData = qItem.item_data || {};

  // NATO grade hesabı: AI explicit verdiyse kullan, vermediyse bağlamdan üret
  let natoGrade: NatoGrade;
  const explicitReliability = itemData.nato_reliability as string | undefined;
  const explicitCredibility = itemData.nato_credibility as string | number | undefined;

  if (explicitReliability && (explicitCredibility !== undefined && explicitCredibility !== '')) {
    try {
      natoGrade = composeNatoGrade(explicitReliability, explicitCredibility);
    } catch {
      // Geçersizse bağlamdan tahmin et
      natoGrade = computeSourceGradeFromContext(sourceType, qItem.confidence);
    }
  } else {
    natoGrade = computeSourceGradeFromContext(sourceType, qItem.confidence);
  }

  return {
    source_type: sourceType,
    source_grade: natoGrade,
    source_document_id: qItem.document_id || null,
    raw_confidence: typeof qItem.confidence === 'number' ? qItem.confidence : 0.5,
  };
}


// ─────────────────────────────────────────────────────────────────────
// 6. promoteEntityToCer — TÜM AKIŞ — promote rotası buradan tek satırla çağrır
// ─────────────────────────────────────────────────────────────────────
/**
 * Bir karantina entity kaydını CER'e promote eder.
 * Eski nodes tablosuna yazımdan SONRA çağrılır (paralel mod).
 *
 * try/catch ile sarmalı — CER yazımı başarısız olursa eski sistem etkilenmez.
 * Hata loglar ama exception fırlatmaz (eski sistem zaten çalıştı).
 */
export async function promoteEntityToCer(
  supabase: SupabaseClient,
  qItem: {
    item_data: Record<string, unknown>;
    source_type?: string | null;
    document_id?: string | null;
    confidence?: number | null;
    network_id?: string | null;
  },
  legacyNodeId: string,  // Eski nodes tablosundaki UUID (audit için)
): Promise<{ success: boolean; canonical_id?: string; error?: string }> {
  try {
    const itemData = qItem.item_data || {};
    const rawName = itemData.name as string | undefined;
    const rawType = itemData.type as string | undefined;

    if (!rawName) {
      return { success: false, error: 'item_data.name boş — entity yazılamaz' };
    }

    // 1. Tip mapping (Anayasa Madde 8 gereği — bilinmeyen tip → exception)
    const schemaType = mapEntityType(rawType);

    // 2. Source context inşası
    const source = buildSourceContextFromQuarantine(qItem);

    // 3. Attributes — name dışında her şey statement olur
    // SCHEMA FIX (10 May 2026 — Task #11): Whitelist yaklaşımı dardı (sadece 6 property).
    // Blacklist yaklaşımına çevirildi: internal/metadata alanları hariç tut, geri kalan
    // her property attribute olarak yazılır. Anayasa Madde 8: bilinmeyen veriyi atmak değil koru.
    // 'deceased', 'death_date', 'age_at_event', 'recruited_year' gibi alanlar artık otomatik yazılır.
    const INTERNAL_KEYS = new Set([
      'name',                // ana alan, ayrı işlenir
      'type',                // schema_type'a mapping
      'is_redacted',         // canonical_entity flag'i
      'doe_code',            // canonical_entity field
      'wikidata_id',         // natural_ids
      'opencorporates_id',
      'icij_id',
      'nato_reliability',    // source_grade hesabı için
      'nato_credibility',
      'mention_count',       // scoring metadata
      'mentions',
      'evidence_types',
      'sub_source',
      'sourceLocation',      // citation metadata
      'evidenceType',
      'evidence_type',
      'sourceName',          // relationship (entity branch'ında olmamalı ama defansif)
      'targetName',
      'source_name',
      'target_name',
      'relationshipType',
      'relationship_type',
      'valid_start',         // statement temporal — ayrı işlenecek
      'valid_end',
    ]);
    const attributes: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(itemData)) {
      if (INTERNAL_KEYS.has(key)) continue;
      if (value === null || value === undefined || value === '') continue;
      // Karmaşık objeler stringify edilir (gelecek v2'de value_json kullanılacak)
      if (typeof value === 'object') {
        attributes[key] = JSON.stringify(value);
      } else {
        attributes[key] = value as string | number;
      }
    }

    // 4. Natural IDs (varsa)
    const naturalIds: Record<string, string> = {};
    if (itemData.wikidata_id) naturalIds.wikidata = String(itemData.wikidata_id);
    if (itemData.opencorporates_id) naturalIds.opencorporates = String(itemData.opencorporates_id);
    if (itemData.icij_id) naturalIds.icij_aleph = String(itemData.icij_id);

    // 5. is_redacted ve doe_code (sansürlü kişi)
    const isRedacted = Boolean(itemData.is_redacted);
    const doeCode = itemData.doe_code as string | undefined;

    // 6. CER'e yaz
    const result = await resolveOrCreateCerEntity(
      supabase,
      {
        name: rawName,
        schema_type: schemaType,
        is_redacted: isRedacted,
        doe_code: doeCode || null,
        natural_ids: naturalIds,
        attributes,
      },
      source,
    );

    // 7. Legacy bağlantısı — CER entity'sine eski node ID'yi natural_ids içine ekle
    // (yeni yazımda zaten boş, merge'de mevcut natural_ids korunur)
    if (result.action === 'created_new') {
      await supabase
        .from('cer_canonical_entities')
        .update({
          natural_ids: { ...naturalIds, legacy_node_id: legacyNodeId },
        })
        .eq('canonical_id', result.canonical_id);
    }

    return {
      success: true,
      canonical_id: result.canonical_id,
    };
  } catch (err) {
    // CER yazımı başarısız — eski sistem zaten çalıştı, log + dön
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[cerWriter.promoteEntityToCer] CER yazımı başarısız (eski sistem etkilenmedi): ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}


// ─────────────────────────────────────────────────────────────────────
// 7. promoteRelationshipToCer — karantina ilişki kaydını CER'e yaz
// ─────────────────────────────────────────────────────────────────────
/**
 * Bir karantina relationship kaydını CER'e promote eder.
 * Eski links tablosuna yazımdan SONRA çağrılır (paralel mod).
 *
 * Source ve target entity'lerin CER'de zaten var olması beklenir
 * (eski sistemde de aynı disiplin var: önce entity'ler promote edilir,
 * sonra ilişkiler). CER'de eşleşme yoksa skip + log; eski sistem zaten
 * link yarattıysa regresyon yok.
 *
 * NOT: Karmaşık ilişkiler (Flight, Ownership, Transaction gibi interstitial
 * entity'ler — YK-1) için ayrı bir akış v2'de yazılacak. Bu fonksiyon basit
 * ikili ilişki içindir (Maxwell.associate_of = Epstein gibi).
 */
export async function promoteRelationshipToCer(
  supabase: SupabaseClient,
  qItem: {
    item_data: Record<string, unknown>;
    source_type?: string | null;
    document_id?: string | null;
    confidence?: number | null;
  },
): Promise<{
  success: boolean;
  statement_id?: string;
  source_canonical_id?: string;
  target_canonical_id?: string;
  error?: string;
}> {
  try {
    const itemData = qItem.item_data || {};
    // SCHEMA FIX (10 May 2026): AI/karantina hem camelCase hem snake_case yazabiliyor.
    // İkisini de oku — defansif (Anayasa Madde 8).
    const sourceName = (itemData.sourceName as string | undefined) || (itemData.source_name as string | undefined);
    const targetName = (itemData.targetName as string | undefined) || (itemData.target_name as string | undefined);
    const relType = (itemData.relationshipType as string) || (itemData.relationship_type as string) || 'associated_with';

    if (!sourceName || !targetName) {
      return {
        success: false,
        error: 'sourceName/source_name veya targetName/target_name boş — ilişki yazılamaz',
      };
    }

    // 1. CER'de tüm entity'leri çek (source ve target için ayrı schema_type filter
    //    yok çünkü ilişkiler her tipi bağlayabilir — kişi-kurum, kurum-yer, vs.)
    const allCerEntities = await fetchCerEntitiesForMatching(supabase);

    if (allCerEntities.length === 0) {
      return {
        success: false,
        error: 'CER\'de hiç entity yok — önce entity promote\'ları çalışmalı',
      };
    }

    // 2. findBestMatch için uygun format
    const candidates = allCerEntities.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
    }));

    // 3. Source ve target için fuzzy match
    const sourceMatch = findBestMatch(sourceName, candidates, 0.85);
    const targetMatch = findBestMatch(targetName, candidates, 0.85);

    if (!sourceMatch || !targetMatch) {
      const missing: string[] = [];
      if (!sourceMatch) missing.push(`source "${sourceName}"`);
      if (!targetMatch) missing.push(`target "${targetName}"`);
      return {
        success: false,
        error: `CER\'de eşleşme yok: ${missing.join(', ')}. ` +
          `Bu entity\'ler önce karantinadan promote edilmeli. ` +
          `Eski sistemde link zaten yaratıldıysa regresyon yok.`,
      };
    }

    // 4. Source context inşa
    const source = buildSourceContextFromQuarantine(qItem);

    // 5. Bi-temporal alanları oku (Task #10 fix, 10 May 2026)
    // İlişkinin geçerli olduğu zaman aralığı veya tek anlık olay zamanı
    const validStart = (itemData.valid_start as string | undefined) || (itemData.validStart as string | undefined) || null;
    const validEnd = (itemData.valid_end as string | undefined) || (itemData.validEnd as string | undefined) || null;
    const eventTime = (itemData.event_time as string | undefined) || (itemData.eventTime as string | undefined) || null;

    // 6. İlişki statement'ı yaz
    const result = await createCerRelationshipStatement(supabase, {
      subjectCanonicalId: sourceMatch.nodeId,
      relationshipType: relType,
      targetCanonicalId: targetMatch.nodeId,
      source,
      validStart,
      validEnd,
      eventTime,
    });

    return {
      success: true,
      statement_id: result.statement_id,
      source_canonical_id: sourceMatch.nodeId,
      target_canonical_id: targetMatch.nodeId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(
      `[cerWriter.promoteRelationshipToCer] CER ilişki yazımı başarısız ` +
      `(eski sistem etkilenmedi): ${errorMessage}`
    );
    return { success: false, error: errorMessage };
  }
}
