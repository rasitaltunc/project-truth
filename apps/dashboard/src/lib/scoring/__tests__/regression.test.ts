/**
 * REGRESSION TEST — 5-Layer Confidence Scoring Engine
 * ====================================================
 * Validates TypeScript implementation against Python reference results.
 * Document 10 (FBI FOIA Report) — 42 entities, 42/42 Python calibration.
 *
 * Tolerance: ±0.001 per entity (Decimal.js should match exactly,
 * but allowing micro-tolerance for rounding differences).
 */

import { scoreEntity, scoreEntityBatch, getBandDistribution } from '../confidenceCalculator';
import type { ScoringEntity } from '../confidenceCalculator';

// ============================================================================
// DOCUMENT 10 ENTITIES (FBI FOIA Report — fbi_report baseline 0.82)
// ============================================================================

const DOC10_ENTITIES: ScoringEntity[] = [
  // Core subject
  { name: "Jeffrey Epstein", type: "person", mentions: 1205, role: "accused_subject",
    evidence_types: ["police_record", "sworn_testimony", "fbi_302", "court_record", "physical_evidence"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "sworn_affidavit+police_reports+fbi_302+newspaper" },

  // Law enforcement
  { name: "Det. Joseph Recarey", type: "person", mentions: 85, role: "lead_detective",
    evidence_types: ["sworn_testimony", "police_record"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "sworn_affidavit+police_reports" },
  { name: "Michael Reiter", type: "person", mentions: 18, role: "police_chief",
    evidence_types: ["police_record", "court_record"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "newspaper+police_reports" },

  // Key witnesses
  { name: "Haley Robson", type: "person", mentions: 28, role: "recruiter_witness",
    evidence_types: ["sworn_testimony", "police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit+police_reports+newspaper" },
  { name: "Janusz Banasiak", type: "person", mentions: 12, role: "employee_witness",
    evidence_types: ["police_record", "sworn_testimony"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit+police_reports" },
  { name: "Jose Alessi", type: "person", mentions: 8, role: "employee_witness",
    evidence_types: ["sworn_testimony"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit" },
  { name: "Alfredo Rodriguez", type: "person", mentions: 22, role: "employee_witness",
    evidence_types: ["sworn_testimony", "police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit+police_reports" },

  // Defense attorneys
  { name: "Jack Goldberger", type: "person", mentions: 32, role: "defense_attorney",
    evidence_types: ["court_record", "police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit+newspaper+police_reports" },
  { name: "Alan Dershowitz", type: "person", mentions: 8, role: "defense_attorney",
    evidence_types: ["police_record", "court_record"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper+police_reports" },
  { name: "Roy Black", type: "person", mentions: 3, role: "defense_attorney",
    evidence_types: ["police_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Guy Fronstein", type: "person", mentions: 2, role: "defense_attorney",
    evidence_types: ["police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "police_reports" },

  // Prosecution / Judiciary
  { name: "Barry Krischer", type: "person", mentions: 8, role: "state_attorney",
    evidence_types: ["court_record", "police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "newspaper+police_reports" },
  { name: "Laura Johnson", type: "person", mentions: 3, role: "circuit_judge",
    evidence_types: ["court_record"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "police_reports+court_order" },
  { name: "Daliah Weiss", type: "person", mentions: 2, role: "assistant_state_attorney",
    evidence_types: ["court_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "court_order+police_reports" },

  // Employees
  { name: "Mark Zeff", type: "person", mentions: 5, role: "interior_designer",
    evidence_types: ["police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "police_reports" },
  { name: "Douglas Schoettle", type: "person", mentions: 4, role: "architect",
    evidence_types: ["police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "police_reports" },

  // Newspaper-only associates (B3/C3)
  { name: "Donald Trump", type: "person", mentions: 4, role: "associate_newspaper",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Bill Clinton", type: "person", mentions: 4, role: "associate_newspaper",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Kevin Spacey", type: "person", mentions: 3, role: "associate_newspaper",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Lawrence Summers", type: "person", mentions: 2, role: "associate_newspaper",
    evidence_types: ["credible_journalism"],
    nato_reliability: "C", nato_credibility: "3", sub_source: "newspaper" },

  // Political figures (B2/B3 newspaper + financial)
  { name: "Eliot Spitzer", type: "person", mentions: 3, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Mark Green", type: "person", mentions: 2, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Hillary Clinton", type: "person", mentions: 1, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Joe Lieberman", type: "person", mentions: 1, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Christopher Dodd", type: "person", mentions: 1, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Charles Schumer", type: "person", mentions: 1, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "John Kerry", type: "person", mentions: 1, role: "political_figure",
    evidence_types: ["credible_journalism", "financial_record"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },

  // Journalists
  { name: "Nicole Janok", type: "person", mentions: 2, role: "journalist",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Larry Keller", type: "person", mentions: 5, role: "journalist",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },

  // Miscellaneous
  { name: "Mike Edmondson", type: "person", mentions: 6, role: "sa_spokesman",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Bob Dekle", type: "person", mentions: 6, role: "legal_expert",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Betty Resch", type: "person", mentions: 2, role: "legal_expert",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "3", sub_source: "newspaper" },
  { name: "Dan Mores", type: "person", mentions: 2, role: "publicist",
    evidence_types: ["credible_journalism"],
    nato_reliability: "C", nato_credibility: "3", sub_source: "newspaper" },

  // Institutions
  { name: "Palm Beach Police Department", type: "institution", mentions: 120, role: "investigating_agency",
    evidence_types: ["police_record", "sworn_testimony"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "police_reports+sworn_affidavit+newspaper" },
  { name: "Federal Bureau of Investigation", type: "institution", mentions: 45, role: "federal_investigating_agency",
    evidence_types: ["fbi_report", "police_record"],
    nato_reliability: "A", nato_credibility: "1", sub_source: "fbi_ec+fbi_302+police_reports" },
  { name: "State Attorney's Office (Palm Beach County)", type: "institution", mentions: 25, role: "prosecution",
    evidence_types: ["court_record", "police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "newspaper+police_reports" },
  { name: "J Epstein & Co", type: "institution", mentions: 3, role: "business",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Jet Aviation", type: "institution", mentions: 2, role: "aviation_records",
    evidence_types: ["sworn_testimony", "financial_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit" },
  { name: "Dollar Rent-a-Car", type: "institution", mentions: 4, role: "business",
    evidence_types: ["police_record", "financial_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "sworn_affidavit+police_reports" },
  { name: "Palm Beach Post", type: "institution", mentions: 15, role: "media",
    evidence_types: ["credible_journalism"],
    nato_reliability: "B", nato_credibility: "2", sub_source: "newspaper" },
  { name: "Cingular Wireless", type: "institution", mentions: 8, role: "telecommunications",
    evidence_types: ["police_record"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "police_reports+fbi_ec" },
  { name: "Ten Thousand Waves Day Spa", type: "institution", mentions: 1, role: "business",
    evidence_types: ["fbi_report"],
    nato_reliability: "A", nato_credibility: "2", sub_source: "fbi_302" },
];

// Python reference results (from test_document10.py execution)
const PYTHON_REFERENCE: Record<string, { score: number; band: string }> = {
  "Jeffrey Epstein":          { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Det. Joseph Recarey":      { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Michael Reiter":           { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Haley Robson":             { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Janusz Banasiak":          { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Jose Alessi":              { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Alfredo Rodriguez":        { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Jack Goldberger":          { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Alan Dershowitz":          { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Barry Krischer":           { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Laura Johnson":            { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Daliah Weiss":             { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Guy Fronstein":            { score: 0.9150, band: "HIGHLY_PROBABLE" },
  "Mark Zeff":                { score: 0.9150, band: "HIGHLY_PROBABLE" },
  "Douglas Schoettle":        { score: 0.9150, band: "HIGHLY_PROBABLE" },
  "Roy Black":                { score: 0.8050, band: "HIGHLY_PROBABLE" },
  "Eliot Spitzer":            { score: 0.8250, band: "HIGHLY_PROBABLE" },
  "Nicole Janok":             { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Larry Keller":             { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Mike Edmondson":           { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Bob Dekle":                { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Donald Trump":             { score: 0.7700, band: "PROBABLE" },
  "Bill Clinton":             { score: 0.7700, band: "PROBABLE" },
  "Kevin Spacey":             { score: 0.7700, band: "PROBABLE" },
  "Lawrence Summers":         { score: 0.7600, band: "PROBABLE" },
  "Mark Green":               { score: 0.7950, band: "PROBABLE" },
  "Hillary Clinton":          { score: 0.7950, band: "PROBABLE" },
  "Joe Lieberman":            { score: 0.7950, band: "PROBABLE" },
  "Christopher Dodd":         { score: 0.7950, band: "PROBABLE" },
  "Charles Schumer":          { score: 0.7950, band: "PROBABLE" },
  "John Kerry":               { score: 0.7950, band: "PROBABLE" },
  "Betty Resch":              { score: 0.7700, band: "PROBABLE" },
  "Dan Mores":                { score: 0.7600, band: "PROBABLE" },
  // Institutions
  "Palm Beach Police Department":       { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Federal Bureau of Investigation":    { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "State Attorney's Office (Palm Beach County)": { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "J Epstein & Co":                     { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Jet Aviation":                       { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Dollar Rent-a-Car":                  { score: 0.9200, band: "HIGHLY_PROBABLE" },
  "Palm Beach Post":                    { score: 0.8000, band: "HIGHLY_PROBABLE" },
  "Cingular Wireless":                  { score: 0.9150, band: "HIGHLY_PROBABLE" },
  "Ten Thousand Waves Day Spa":         { score: 0.9000, band: "HIGHLY_PROBABLE" },
};

// ============================================================================
// TESTS
// ============================================================================

const TOLERANCE = 0.001;

describe('5-Layer Confidence Scoring Engine — Document 10 Regression', () => {

  test('All 42 entities score within ±0.001 of Python reference', () => {
    const mismatches: string[] = [];

    for (const entity of DOC10_ENTITIES) {
      const result = scoreEntity(entity, 'fbi_report');
      const ref = PYTHON_REFERENCE[entity.name];

      if (!ref) {
        mismatches.push(`${entity.name}: NO REFERENCE FOUND`);
        continue;
      }

      const scoreDiff = Math.abs(result.final_confidence - ref.score);
      if (scoreDiff > TOLERANCE) {
        mismatches.push(
          `${entity.name}: TS=${result.final_confidence.toFixed(4)} vs PY=${ref.score.toFixed(4)} (diff=${scoreDiff.toFixed(4)})`
        );
      }

      if (result.band !== ref.band) {
        mismatches.push(
          `${entity.name}: BAND TS=${result.band} vs PY=${ref.band}`
        );
      }
    }

    if (mismatches.length > 0) {
      console.error('MISMATCHES:\n' + mismatches.join('\n'));
    }

    expect(mismatches).toEqual([]);
  });

  test('Band distribution matches: 30 HIGHLY_PROBABLE, 12 PROBABLE', () => {
    const { results } = scoreEntityBatch(DOC10_ENTITIES, 'fbi_report', 'DOC10');
    const dist = getBandDistribution(results);

    expect(dist.HIGHLY_PROBABLE).toBe(30);
    expect(dist.PROBABLE).toBe(12);
    expect(dist.CONFIRMED).toBe(0);
    expect(dist.POSSIBLE).toBe(0);
    expect(dist.UNVERIFIED).toBe(0);
  });

  test('Calibration rate: 42/42 (100%)', () => {
    let correct = 0;
    for (const entity of DOC10_ENTITIES) {
      const result = scoreEntity(entity, 'fbi_report');
      const ref = PYTHON_REFERENCE[entity.name];
      if (ref && result.band === ref.band) correct++;
    }
    expect(correct).toBe(42);
  });

  test('Ceiling enforcement: no score exceeds 0.92 for fbi_report', () => {
    for (const entity of DOC10_ENTITIES) {
      const result = scoreEntity(entity, 'fbi_report');
      expect(result.final_confidence).toBeLessThanOrEqual(0.92);
    }
  });

  test('B3 newspaper-only political figures score PROBABLE (< 0.80)', () => {
    const b3Politicians = ['Mark Green', 'Hillary Clinton', 'Joe Lieberman',
      'Christopher Dodd', 'Charles Schumer', 'John Kerry'];

    for (const name of b3Politicians) {
      const entity = DOC10_ENTITIES.find(e => e.name === name)!;
      const result = scoreEntity(entity, 'fbi_report');
      expect(result.band).toBe('PROBABLE');
      expect(result.final_confidence).toBeLessThan(0.80);
    }
  });

  test('Roy Black (B3, verifiable attorney) scores HIGHLY_PROBABLE', () => {
    const roy = DOC10_ENTITIES.find(e => e.name === 'Roy Black')!;
    const result = scoreEntity(roy, 'fbi_report');
    expect(result.band).toBe('HIGHLY_PROBABLE');
    expect(result.final_confidence).toBeGreaterThanOrEqual(0.80);
  });

  test('Layer breakdown is present and non-negative for grade', () => {
    for (const entity of DOC10_ENTITIES) {
      const result = scoreEntity(entity, 'fbi_report');
      expect(result.layers.grade).toBeGreaterThan(0);
      expect(result.layers.nato).toBeDefined();
      expect(result.layers.berkeley).toBeDefined();
      expect(result.layers.ach).toBeDefined();
      expect(result.layers.transparency).toBeDefined();
    }
  });

  test('Batch scoring produces audit entries', () => {
    const { results, audit } = scoreEntityBatch(DOC10_ENTITIES, 'fbi_report', 'DOC10');
    expect(results.length).toBe(42);
    expect(audit.length).toBe(42);
    expect(audit[0].config_version).toBe('1.0.0');
    expect(audit[0].document_type).toBe('fbi_report');
    expect(audit[0].scored_at).toBeDefined();
  });

  test('Results are sorted by confidence descending', () => {
    const { results } = scoreEntityBatch(DOC10_ENTITIES, 'fbi_report');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].final_confidence).toBeGreaterThanOrEqual(results[i].final_confidence);
    }
  });

  test('Unknown document type throws error', () => {
    const entity = DOC10_ENTITIES[0];
    expect(() => scoreEntity(entity, 'unknown_type')).toThrow('Unknown document type');
  });
});
