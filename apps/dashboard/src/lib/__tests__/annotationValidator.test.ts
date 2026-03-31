/**
 * Unit Tests: Annotation Validator + Placeholder Filter
 * Security Sprint AI-2 + AI-3
 *
 * Run: npx jest src/lib/__tests__/annotationValidator.test.ts
 * Or:  npx vitest src/lib/__tests__/annotationValidator.test.ts
 */

import { validateAnnotations, calculateConfidence, isPlaceholderName } from '../annotationValidator';

// ═══ Mock Nodes ═══
const mockNodes = [
  {
    id: 'node-1',
    name: 'Jeffrey Epstein',
    summary: 'American financier convicted sex offender. Found dead August 10, 2019 in Metropolitan Correctional Center.',
    death_date: '2019-08-10',
    birth_date: '1953-01-20',
    occupation: 'Financier',
    tier: 1,
  },
  {
    id: 'node-2',
    name: 'Ghislaine Maxwell',
    summary: 'British socialite convicted of sex trafficking. Sentenced to 20 years.',
    death_date: null,
    birth_date: '1961-12-25',
    occupation: 'Socialite',
    tier: 1,
  },
  {
    id: 'node-3',
    name: 'Virginia Giuffre',
    summary: 'Victim and accuser who was recruited at age 15. Filed lawsuit against Prince Andrew.',
    death_date: null,
    birth_date: '1983-08-09',
    occupation: null,
    tier: 2,
  },
  {
    id: 'node-4',
    name: 'JP Morgan',
    summary: 'Bank that maintained Epstein accounts. $290M settlement.',
    death_date: null,
    birth_date: null,
    occupation: 'Financial institution',
    tier: 2,
  },
  {
    id: 'node-5',
    name: 'Elon Musk',
    summary: 'Tech entrepreneur. Appeared in Epstein contact book.',
    death_date: null,
    birth_date: '1971-06-28',
    occupation: 'CEO',
    tier: 3,
  },
];

// ═══ validateAnnotations Tests ═══

describe('validateAnnotations', () => {
  test('filters out annotations for non-existent nodes', () => {
    const result = validateAnnotations(
      { 'node-999': 'SOME LABEL' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  test('keeps valid annotations for existing nodes', () => {
    const result = validateAnnotations(
      { 'node-1': 'RING LEADER' },
      mockNodes
    );
    expect(result).toEqual({ 'node-1': 'RING LEADER' });
  });

  test('filters out labels longer than 28 characters', () => {
    const result = validateAnnotations(
      { 'node-1': 'THIS IS A VERY LONG LABEL THAT EXCEEDS MAXIMUM' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  test('keeps labels exactly 28 characters', () => {
    const label = 'A'.repeat(28);
    const result = validateAnnotations(
      { 'node-1': label },
      mockNodes
    );
    expect(result).toEqual({ 'node-1': label });
  });

  // Death claim tests
  test('allows death claim when death_date exists', () => {
    const result = validateAnnotations(
      { 'node-1': 'FOUND DEAD AUG 2019' },
      mockNodes
    );
    expect(result).toHaveProperty('node-1');
  });

  test('filters death claim when no death_date', () => {
    const result = validateAnnotations(
      { 'node-5': 'DECEASED 2025' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  test('filters ÖLDÜ claim for living person', () => {
    const result = validateAnnotations(
      { 'node-2': 'ÖLDÜ 2024' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  test('filters SUICIDE claim without death evidence', () => {
    const result = validateAnnotations(
      { 'node-5': 'SUICIDE 2025' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  // Financial claim tests
  test('allows financial claim when node has financial data', () => {
    const result = validateAnnotations(
      { 'node-4': '$290M SETTLEMENT' },
      mockNodes
    );
    expect(result).toHaveProperty('node-4');
  });

  test('filters financial claim without financial data', () => {
    const result = validateAnnotations(
      { 'node-3': '$500M PAYMENT' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  // Age claim tests
  test('allows age claim when birth_date exists', () => {
    const result = validateAnnotations(
      { 'node-3': 'RECRUITED AGE 15' },
      mockNodes
    );
    expect(result).toHaveProperty('node-3');
  });

  test('filters age claim without birth_date', () => {
    const result = validateAnnotations(
      { 'node-4': 'AGE 150 FOUNDED' },
      mockNodes
    );
    expect(result).toEqual({});
  });

  // Multiple annotations
  test('validates multiple annotations independently', () => {
    const result = validateAnnotations(
      {
        'node-1': 'FOUND DEAD AUG 2019',  // valid (death_date exists)
        'node-5': 'DECEASED 2025',          // filtered (no death_date)
        'node-2': 'CHIEF RECRUITER',        // valid (no special claim)
        'node-999': 'GHOST',                // filtered (node doesn't exist)
      },
      mockNodes
    );
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('node-1');
    expect(result).toHaveProperty('node-2');
  });

  // Edge cases
  test('returns empty for null/undefined annotations', () => {
    expect(validateAnnotations(null as any, mockNodes)).toEqual({});
    expect(validateAnnotations(undefined as any, mockNodes)).toEqual({});
  });

  test('returns empty for empty nodes array', () => {
    expect(validateAnnotations({ 'node-1': 'TEST' }, [])).toEqual({});
  });

  test('filters empty string labels', () => {
    expect(validateAnnotations({ 'node-1': '' }, mockNodes)).toEqual({});
    expect(validateAnnotations({ 'node-1': '   ' }, mockNodes)).toEqual({});
  });
});

// ═══ calculateConfidence Tests ═══

describe('calculateConfidence', () => {
  test('returns high when all highlights exist', () => {
    const result = calculateConfidence(
      { highlightNodeIds: ['node-1', 'node-2'], annotations: {} },
      mockNodes
    );
    expect(result).toBe('high');
  });

  test('returns low when highlights don\'t exist', () => {
    const result = calculateConfidence(
      { highlightNodeIds: ['node-999', 'node-888'], annotations: {} },
      mockNodes
    );
    expect(result).toBe('low');
  });

  test('returns medium for empty claims', () => {
    const result = calculateConfidence(
      { highlightNodeIds: [], annotations: {} },
      mockNodes
    );
    expect(result).toBe('medium');
  });
});

// ═══ isPlaceholderName Tests ═══

describe('isPlaceholderName', () => {
  test('identifies common placeholder names', () => {
    expect(isPlaceholderName('John Smith')).toBe(true);
    expect(isPlaceholderName('Jane Doe')).toBe(true);
    expect(isPlaceholderName('J. Doe')).toBe(true);
    expect(isPlaceholderName('john doe')).toBe(true);
    expect(isPlaceholderName('JOHN DOE')).toBe(true);
  });

  test('identifies Turkish placeholders', () => {
    expect(isPlaceholderName('kişi a')).toBe(true);
    expect(isPlaceholderName('şirket b')).toBe(true);
    expect(isPlaceholderName('bilinmeyen kişi')).toBe(true);
  });

  test('identifies generic placeholders', () => {
    expect(isPlaceholderName('test')).toBe(true);
    expect(isPlaceholderName('example')).toBe(true);
    expect(isPlaceholderName('placeholder')).toBe(true);
    expect(isPlaceholderName('unknown')).toBe(true);
    expect(isPlaceholderName('n/a')).toBe(true);
  });

  test('identifies single character names but allows 2-char real names', () => {
    expect(isPlaceholderName('A')).toBe(true);
    expect(isPlaceholderName('X')).toBe(true);
    // 2-char names like Li, Wu, Xi are real — should NOT be blocked
    expect(isPlaceholderName('Li')).toBe(false);
    expect(isPlaceholderName('Wu')).toBe(false);
  });

  test('identifies number-only names', () => {
    expect(isPlaceholderName('123')).toBe(true);
    expect(isPlaceholderName('456789')).toBe(true);
  });

  test('allows real names', () => {
    expect(isPlaceholderName('Jeffrey Epstein')).toBe(false);
    expect(isPlaceholderName('Ghislaine Maxwell')).toBe(false);
    expect(isPlaceholderName('Virginia Giuffre')).toBe(false);
    expect(isPlaceholderName('JP Morgan')).toBe(false);
    expect(isPlaceholderName('Alan Dershowitz')).toBe(false);
  });

  test('handles edge cases', () => {
    expect(isPlaceholderName('')).toBe(true);
    expect(isPlaceholderName(null as any)).toBe(true);
    expect(isPlaceholderName(undefined as any)).toBe(true);
  });
});
