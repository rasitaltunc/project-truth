// ============================================
// THE TRUTH ENGINE - Local Entity Extractor
// FREE, No AI Cost - Pattern & Rule Based
// ============================================
// Bu modül, AI kullanmadan temel entity extraction yapar.
// Maliyet: $0.00 - Sınırsız kullanım
// ============================================

import { EntityType, ExtractedEntity, ExtractedRelationship, RelationshipType } from './types';

// ============================================
// PATTERN DEFINITIONS
// ============================================

// Kişi isimleri için regex patterns
const PERSON_PATTERNS = [
  // Western names: "John Smith", "Dr. Jane Doe"
  /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sir|Lord|Lady)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
  // Names with middle initial: "John F. Kennedy"
  /\b([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)\b/g,
  // Turkish names
  /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)+)\b/g,
];

// Organizasyon patterns
const ORGANIZATION_PATTERNS = [
  // Companies with suffixes
  /\b([A-Z][A-Za-z\s&]+(?:Inc\.|Corp\.|LLC|Ltd\.|Co\.|Company|Corporation|Foundation|Institute|Association|Bank|Group|Holdings))\b/g,
  // "The X Organization"
  /\bThe\s+([A-Z][A-Za-z\s]+(?:Foundation|Institute|Association|Organization|Society|Trust|Fund))\b/g,
  // All caps organizations
  /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g,
];

// Location patterns
const LOCATION_PATTERNS = [
  // Cities, Countries
  /\bin\s+([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*)\b/g,
  /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  // Addresses
  /\b(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.|Lane|Ln\.)))\b/g,
  // Named places
  /\b([A-Z][a-z]+\s+(?:Island|Islands|Beach|Airport|Hotel|Resort|Estate|Mansion|Villa))\b/g,
];

// Date patterns
const DATE_PATTERNS = [
  // ISO format: 2024-01-15
  /\b(\d{4}-\d{2}-\d{2})\b/g,
  // US format: January 15, 2024
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/g,
  // Short format: Jan 15, 2024
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})\b/g,
  // European format: 15 January 2024
  /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/g,
];

// Money patterns
const MONEY_PATTERNS = [
  // USD: $1,000,000 or $1.5 million
  /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|trillion|M|B))?/gi,
  // Written amounts: 1.5 million dollars
  /[\d.]+\s*(?:million|billion|trillion)\s*(?:dollars?|USD)?/gi,
];

// Email patterns
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// URL patterns
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

// Flight/Registration patterns (for assets like planes)
const REGISTRATION_PATTERNS = [
  // Aircraft registration: N123AB
  /\b(N\d{1,5}[A-Z]{0,2})\b/g,
  // Generic registration numbers
  /\b([A-Z]{2,3}-[A-Z0-9]{3,5})\b/g,
];

// Crypto Wallet Patterns
const CRYPTO_PATTERNS = [
  // BTC (Legacy, Segwit, Bech32)
  /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g,
  // ETH (0x...)
  /\b0x[a-fA-F0-9]{40}\b/g,
];

// Passport / ID Patterns
const PASSPORT_PATTERNS = [
  // US/UK/EU Passport format (approximate)
  /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
];

// Redaction Patterns (Intelligence vibe)
const REDACTION_PATTERNS = [
  // [REDACTED], [CLASSIFIED]
  /\[(?:REDACTED|CLASSIFIED|DELETED|SECRET)\]/g,
  // Black bars (unicode block characters)
  /█{3,}/g,
];

// ============================================
// KNOWN ENTITIES DATABASE
// ============================================

// Bu liste zamanla büyüyecek - en bilinen entity'ler
const KNOWN_ENTITIES: Record<string, { type: EntityType; aliases: string[] }> = {
  // Epstein Case - Core
  'jeffrey epstein': { type: 'person', aliases: ['Jeff Epstein', 'J. Epstein'] },
  'ghislaine maxwell': { type: 'person', aliases: ['G. Maxwell', 'Ghislaine'] },
  'les wexner': { type: 'person', aliases: ['Leslie Wexner', 'L. Wexner'] },
  'jean-luc brunel': { type: 'person', aliases: ['Jean Luc Brunel', 'JL Brunel'] },

  // Organizations
  'jpmorgan chase': { type: 'organization', aliases: ['JP Morgan', 'JPMorgan', 'Chase Bank'] },
  'deutsche bank': { type: 'organization', aliases: ['DB', 'Deutsche'] },
  'victoria\'s secret': { type: 'organization', aliases: ['VS', "Victoria's Secret"] },
  'l brands': { type: 'organization', aliases: ['L Brands', 'Limited Brands'] },

  // Locations
  'little st. james': { type: 'location', aliases: ['Little Saint James', 'Epstein Island', 'Pedophile Island'] },
  'great st. james': { type: 'location', aliases: ['Great Saint James'] },
  'zorro ranch': { type: 'location', aliases: ['Zorro Ranch New Mexico'] },

  // Assets
  'lolita express': { type: 'asset', aliases: ['N908JE', 'Boeing 727'] },
};

// ============================================
// RELATIONSHIP KEYWORDS
// ============================================

const RELATIONSHIP_KEYWORDS: Record<string, RelationshipType[]> = {
  // Family
  'father': ['family'],
  'mother': ['family'],
  'son': ['family'],
  'daughter': ['family'],
  'brother': ['family'],
  'sister': ['family'],
  'wife': ['family', 'romantic'],
  'husband': ['family', 'romantic'],
  'married': ['romantic'],
  'divorced': ['romantic'],

  // Professional
  'ceo': ['employer', 'board_member'],
  'founder': ['founder'],
  'employee': ['employee'],
  'worked for': ['employee'],
  'worked at': ['employee', 'worked_at'],
  'director': ['board_member'],
  'board member': ['board_member'],
  'invested': ['investor'],
  'funded': ['funded'],
  'donated': ['funded'],

  // Connection
  'friend': ['friend'],
  'associate': ['associate'],
  'met with': ['associate'],
  'seen with': ['associate'],
  'traveled with': ['associate'],

  // Location
  'visited': ['visited'],
  'flew to': ['visited'],
  'stayed at': ['visited'],
  'lives in': ['lives_at'],
  'based in': ['headquartered'],

  // Events
  'attended': ['attended'],
  'hosted': ['organized'],
  'witnessed': ['witnessed'],
};

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Ana extraction fonksiyonu - metni analiz eder
 */
export function extractEntitiesLocal(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  // 1. Önce bilinen entity'leri ara
  for (const [name, info] of Object.entries(KNOWN_ENTITIES)) {
    const normalizedText = text.toLowerCase();
    const allNames = [name, ...info.aliases.map(a => a.toLowerCase())];

    for (const searchName of allNames) {
      const index = normalizedText.indexOf(searchName);
      if (index !== -1 && !seen.has(name)) {
        seen.add(name);

        // Context'i çıkar (önce ve sonra 100 karakter)
        const contextStart = Math.max(0, index - 100);
        const contextEnd = Math.min(text.length, index + searchName.length + 100);
        const context = text.substring(contextStart, contextEnd);

        entities.push({
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          type: info.type,
          aliases: info.aliases,
          confidence: 95, // Known entities have high confidence
          context,
          startIndex: index,
          endIndex: index + searchName.length,
          isNewEntity: false,
          extractionReason: 'Known entity match'
        });
        break;
      }
    }
  }

  // 2. Pattern-based extraction
  entities.push(...extractByPatterns(text, PERSON_PATTERNS, 'person', seen));
  entities.push(...extractByPatterns(text, ORGANIZATION_PATTERNS, 'organization', seen));
  entities.push(...extractByPatterns(text, LOCATION_PATTERNS, 'location', seen));

  // 3. Email extraction
  const emails = text.match(EMAIL_PATTERN) || [];
  for (const email of emails) {
    if (!seen.has(email.toLowerCase())) {
      seen.add(email.toLowerCase());
      entities.push({
        name: email,
        type: 'communication',
        confidence: 90,
        context: getContext(text, text.indexOf(email)),
        isNewEntity: true,
        extractionReason: 'Email pattern match'
      });
    }
  }

  // 4. Money amounts
  const amounts: string[] = [];
  for (const pattern of MONEY_PATTERNS) {
    const matches = text.match(pattern) || [];
    amounts.push(...matches);
  }
  for (const amount of amounts) {
    if (!seen.has(amount)) {
      seen.add(amount);
      entities.push({
        name: amount,
        type: 'financial',
        confidence: 85,
        context: getContext(text, text.indexOf(amount)),
        isNewEntity: true,
        extractionReason: 'Financial amount pattern'
      });
    }
  }

  // 5. Aircraft registrations
  const registrations = text.match(REGISTRATION_PATTERNS[0]) || [];
  for (const reg of registrations) {
    if (!seen.has(reg)) {
      seen.add(reg);
      entities.push({
        name: reg,
        type: 'asset',
        confidence: 80,
        context: getContext(text, text.indexOf(reg)),
        isNewEntity: true,
        extractionReason: 'Aircraft registration pattern'
      });
    }
  }

  // 6. Crypto Wallets
  const cryptoWallets: string[] = [];
  for (const pattern of CRYPTO_PATTERNS) {
    const matches = text.match(pattern) || [];
    cryptoWallets.push(...matches);
  }
  for (const wallet of cryptoWallets) {
    if (!seen.has(wallet)) {
      seen.add(wallet);
      entities.push({
        name: wallet.substring(0, 6) + '...' + wallet.substring(wallet.length - 4),
        type: 'financial', // Crypto is financial
        confidence: 95, // High confidence for regex match
        context: getContext(text, text.indexOf(wallet)),
        isNewEntity: true,
        extractionReason: 'Crypto wallet pattern'
      });
    }
  }

  // 7. Redactions
  const redactions: string[] = [];
  for (const pattern of REDACTION_PATTERNS) {
    const matches = text.match(pattern) || [];
    redactions.push(...matches);
  }
  for (const redaction of redactions) {
    // Don't add to seen to allow multiple redactions
    entities.push({
      name: 'REDACTED CONTENT',
      type: 'event', // Treat as an event/anomaly
      confidence: 100,
      context: getContext(text, text.indexOf(redaction)),
      isNewEntity: true,
      extractionReason: 'Redaction marker found'
    });
  }

  return entities;
}

/**
 * Pattern-based entity extraction helper
 */
function extractByPatterns(
  text: string,
  patterns: RegExp[],
  type: EntityType,
  seen: Set<string>
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const pattern of patterns) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1] || match[0];
      const normalizedName = name.toLowerCase().trim();

      // Skip if already seen or too short
      if (seen.has(normalizedName) || name.length < 3) continue;

      // Skip common words
      if (isCommonWord(name)) continue;

      seen.add(normalizedName);

      entities.push({
        name: name.trim(),
        type,
        confidence: calculatePatternConfidence(name, type),
        context: getContext(text, match.index),
        startIndex: match.index,
        endIndex: match.index + name.length,
        isNewEntity: true,
        extractionReason: `Pattern match: ${type}`
      });
    }
  }

  return entities;
}

/**
 * İlişki çıkarma - basit keyword-based
 */
export function extractRelationshipsLocal(
  text: string,
  entities: ExtractedEntity[]
): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];

  // Her entity çifti için
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];

      // Aynı cümlede mi?
      const sentence = findSentenceContaining(text, entity1.name, entity2.name);
      if (!sentence) continue;

      // İlişki keyword'ü var mı?
      const relType = findRelationshipType(sentence, entity1, entity2);
      if (relType) {
        relationships.push({
          sourceEntityName: entity1.name,
          targetEntityName: entity2.name,
          relationshipType: relType.type,
          confidence: relType.confidence,
          evidence: sentence,
          reasoning: `Found keyword "${relType.keyword}" in sentence`
        });
      }
    }
  }

  return relationships;
}

/**
 * İki entity'yi içeren cümleyi bul
 */
function findSentenceContaining(text: string, name1: string, name2: string): string | null {
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (lower.includes(name1.toLowerCase()) && lower.includes(name2.toLowerCase())) {
      return sentence.trim();
    }
  }

  return null;
}

/**
 * Cümlede ilişki keyword'ü ara
 */
function findRelationshipType(
  sentence: string,
  entity1: ExtractedEntity,
  entity2: ExtractedEntity
): { type: RelationshipType; keyword: string; confidence: number } | null {
  const lower = sentence.toLowerCase();

  for (const [keyword, types] of Object.entries(RELATIONSHIP_KEYWORDS)) {
    if (lower.includes(keyword)) {
      // Entity türlerine göre en uygun ilişki tipini seç
      const appropriateType = types.find(t => isAppropriateRelationship(t, entity1.type, entity2.type));

      if (appropriateType) {
        return {
          type: appropriateType,
          keyword,
          confidence: 60 // Keyword-based extraction has moderate confidence
        };
      }
    }
  }

  // Eğer aynı cümledeler ama keyword yoksa, generic bağlantı
  return {
    type: 'connected_to',
    keyword: 'co-occurrence',
    confidence: 40
  };
}

/**
 * İlişki tipi entity türleri için uygun mu?
 */
function isAppropriateRelationship(
  relType: RelationshipType,
  type1: EntityType,
  type2: EntityType
): boolean {
  const rules: Record<RelationshipType, [EntityType[], EntityType[]]> = {
    'family': [['person'], ['person']],
    'friend': [['person'], ['person']],
    'romantic': [['person'], ['person']],
    'associate': [['person'], ['person', 'organization']],
    'employer': [['organization'], ['person']],
    'employee': [['person'], ['organization']],
    'board_member': [['person'], ['organization']],
    'founder': [['person'], ['organization']],
    'investor': [['person', 'organization'], ['organization']],
    'advisor': [['person'], ['organization', 'person']],
    'client': [['person', 'organization'], ['organization']],
    'partner': [['organization'], ['organization']],
    'funded': [['person', 'organization'], ['organization', 'person']],
    'received_funds': [['organization', 'person'], ['person', 'organization']],
    'owns': [['person', 'organization'], ['asset', 'organization']],
    'owned_by': [['asset', 'organization'], ['person', 'organization']],
    'transaction': [['person', 'organization'], ['person', 'organization']],
    'visited': [['person'], ['location']],
    'lives_at': [['person'], ['location']],
    'worked_at': [['person'], ['location', 'organization']],
    'headquartered': [['organization'], ['location']],
    'attended': [['person'], ['event']],
    'organized': [['person', 'organization'], ['event']],
    'witnessed': [['person'], ['event']],
    'mentioned_in': [['person', 'organization'], ['document', 'media']],
    'authored': [['person'], ['document']],
    'signed': [['person'], ['document']],
    'appears_in': [['person'], ['media']],
    'referenced_in': [['person', 'organization'], ['document']],
    'connected_to': [['person', 'organization', 'location', 'asset'], ['person', 'organization', 'location', 'asset']],
    'same_as': [['person', 'organization'], ['person', 'organization']],
  };

  const rule = rules[relType];
  if (!rule) return true; // Unknown relationship types are always allowed

  return rule[0].includes(type1) && rule[1].includes(type2);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getContext(text: string, index: number, contextSize: number = 100): string {
  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + contextSize);
  return text.substring(start, end).trim();
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'it', 'its',
    'new', 'old', 'first', 'last', 'next', 'same',
    'all', 'any', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    // Turkish common words
    've', 'ile', 'için', 'bu', 'şu', 'o', 'bir', 'de', 'da', 'ki',
  ]);

  return commonWords.has(word.toLowerCase());
}

function calculatePatternConfidence(name: string, type: EntityType): number {
  let confidence = 50; // Base confidence

  // Longer names are more likely to be real entities
  if (name.length > 15) confidence += 10;
  if (name.length > 25) confidence += 10;

  // Multiple words increase confidence
  const words = name.split(/\s+/);
  if (words.length >= 2) confidence += 15;
  if (words.length >= 3) confidence += 10;

  // Type-specific adjustments
  if (type === 'organization' && name.match(/Inc\.|Corp\.|LLC|Ltd\./)) {
    confidence += 20;
  }

  return Math.min(confidence, 85); // Cap at 85 for pattern-based extraction
}

// ============================================
// TEXT PREPROCESSING
// ============================================

/**
 * Metni analiz için hazırla
 */
export function preprocessText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove excessive punctuation
    .replace(/([.!?]){2,}/g, '$1')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Trim
    .trim();
}

/**
 * Metin istatistikleri
 */
export function getTextStats(text: string): {
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  estimatedReadTime: number;
} {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    characterCount: text.length,
    estimatedReadTime: Math.ceil(words.length / 200) // ~200 words per minute
  };
}

// ============================================
// EXPORTS
// ============================================

export const LocalExtractor = {
  extractEntities: extractEntitiesLocal,
  extractRelationships: extractRelationshipsLocal,
  preprocessText,
  getTextStats,
  KNOWN_ENTITIES,
  RELATIONSHIP_KEYWORDS,
};

export default LocalExtractor;
