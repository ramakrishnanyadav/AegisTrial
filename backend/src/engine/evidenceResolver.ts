/**
 * evidenceResolver.ts — Deterministic mapping of PatientField[] → Criterion matches.
 *
 * This is pure, deterministic code. Zero LLM calls, zero network calls.
 * Given identical inputs, output is always identical.
 *
 * Responsibilities:
 *   1. Find PatientField entries matching each Criterion's field name
 *   2. Detect conflicts (same field, multiple values in temporal window)
 *   3. Detect missing evidence (field required but not found)
 *   4. Apply ontology mapping when field names don't match directly
 *
 * The result flows directly into the rule engine.
 */

import type { Criterion, PatientField, CriterionEvaluation } from '../domain/types.js';
import { DecisionReasonCode, CriterionType } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Scoped Vocabulary — Clinical field aliases
// ---------------------------------------------------------------------------
// Maps alternative field names found in EHR text to canonical criterion field names.
// This is intentionally scoped — not SNOMED/ICD-10/LOINC.
// When the ontology_mapping_agent is used for complex cases, it updates this table.

const FIELD_ALIASES: Record<string, string[]> = {
  anc: ['absolute neutrophil count', 'neutrophil count', 'abs neutrophil', 'anc'],
  egfr: ['egfr', 'estimated gfr', 'glomerular filtration rate', 'creatinine clearance', 'crcl'],
  alt: ['alt', 'alanine aminotransferase', 'alanine transaminase', 'sgpt'],
  ast: ['ast', 'aspartate aminotransferase', 'aspartate transaminase', 'sgot'],
  bilirubin: ['bilirubin', 'total bilirubin', 'tbili', 'tbil'],
  hemoglobin: ['hemoglobin', 'hgb', 'hb'],
  platelet_count: ['platelet count', 'platelets', 'plt'],
  ecog_status: ['ecog', 'ecog status', 'performance status', 'ecog ps', 'ps'],
  age: ['age', 'patient age', 'years old'],
  weight_kg: ['weight', 'body weight', 'wt', 'kg'],
  bmi: ['bmi', 'body mass index'],
  creatinine: ['creatinine', 'serum creatinine', 'scr'],
  glucose: ['glucose', 'blood glucose', 'fasting glucose', 'bg'],
  wbc: ['wbc', 'white blood cell count', 'white blood cells', 'leukocytes'],
};

/** Canonical field name lookup using the scoped alias table. */
function resolveFieldAlias(rawField: string): string {
  const normalized = rawField.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized; // pass-through if no alias found
}

// ---------------------------------------------------------------------------
// Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Returns true if two PatientField entries for the same field represent
 * conflicting evidence within the same temporal window.
 *
 * Conflict = same field, both have numeric values, and the values straddle
 * the criterion threshold (one above, one below). Both readings within 24h.
 */
function hasConflictingEvidence(
  fields: PatientField[],
  threshold: number | string,
): boolean {
  if (fields.length < 2) return false;
  if (typeof threshold !== 'number') return false;

  const numeric = fields.filter((f) => typeof f.value === 'number') as (PatientField & { value: number })[];
  if (numeric.length < 2) return false;

  // Check if readings are within 24h of each other
  const timestamped = numeric.filter((f) => f.timestamp !== null);
  if (timestamped.length >= 2) {
    const times = timestamped.map((f) => new Date(f.timestamp!).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const within24h = maxTime - minTime < 24 * 60 * 60 * 1000;

    if (!within24h) return false; // Different time windows, not conflicting
  }

  // Values straddle the threshold → conflicting
  const values = numeric.map((f) => f.value);
  const above = values.some((v) => v >= threshold);
  const below = values.some((v) => v < threshold);
  return above && below;
}

// ---------------------------------------------------------------------------
// Main Resolution Logic
// ---------------------------------------------------------------------------

export interface ResolvedEvidence {
  criterion: Criterion;
  matchedFields: PatientField[];
  canonicalField: string;
  hasConflict: boolean;
  isMissing: boolean;
  requiresOntologyMapping: boolean;
}

/**
 * Resolve patient fields against a single criterion.
 * Returns a ResolvedEvidence object that the rule engine can evaluate.
 */
export function resolveEvidence(
  criterion: Criterion,
  patientFields: PatientField[],
): ResolvedEvidence {
  const canonicalCriterionField = resolveFieldAlias(criterion.field);

  // Find patient fields matching this criterion
  const matchedFields = patientFields.filter((pf) => {
    const canonicalPatientField = resolveFieldAlias(pf.field);
    return canonicalPatientField === canonicalCriterionField;
  });

  const isMissing = matchedFields.length === 0;
  const hasConflict = hasConflictingEvidence(matchedFields, criterion.threshold);

  // If we have fields but the canonical names differ from the raw names,
  // it means ontology mapping was used — flag for transparency in DecisionProof
  const requiresOntologyMapping = matchedFields.some(
    (mf) => mf.field.toLowerCase().trim() !== criterion.field.toLowerCase().trim(),
  );

  return {
    criterion,
    matchedFields,
    canonicalField: canonicalCriterionField,
    hasConflict,
    isMissing,
    requiresOntologyMapping,
  };
}

/**
 * Resolve all criteria against available patient fields.
 * Returns an ordered array of ResolvedEvidence, one per criterion.
 */
export function resolveAllEvidence(
  criteria: Criterion[],
  patientFields: PatientField[],
): ResolvedEvidence[] {
  return criteria.map((criterion) => resolveEvidence(criterion, patientFields));
}

// ---------------------------------------------------------------------------
// Reasoning templates — never raw LLM prose
// ---------------------------------------------------------------------------

export function buildReasoningText(
  criterion: Criterion,
  reasonCode: DecisionReasonCode,
  extractedValue: number | string | null,
): string {
  switch (reasonCode) {
    case DecisionReasonCode.MISSING_REQUIRED_EVIDENCE:
      return `Required field '${criterion.field}' was not found in the patient record. Manual review required.`;
    case DecisionReasonCode.AMBIGUOUS_ONTOLOGY:
      return `Field '${criterion.field}' could not be mapped to a unique criterion term. Manual review required.`;
    case DecisionReasonCode.UNIT_INCOMPATIBLE:
      return `Unit mismatch for field '${criterion.field}': protocol requires '${criterion.unit}', extracted value cannot be converted.`;
    case DecisionReasonCode.CONFLICTING_EVIDENCE:
      return `Conflicting values found for field '${criterion.field}' within the temporal window. Manual review required.`;
    case DecisionReasonCode.POLICY_BLOCK:
      return `Criterion '${criterion.criterionId}' was blocked by the PHI safety policy. No clinical decision was made.`;
    case DecisionReasonCode.TEMPORAL_FAILURE:
      return `Field '${criterion.field}' value was outside the required temporal window (${criterion.temporalWindow ?? 'unspecified'}).`;
    case DecisionReasonCode.INCLUSION_CRITERION_MET:
      return `Inclusion criterion ${criterion.criterionId}: ${criterion.field} = ${extractedValue} ${criterion.unit} satisfies ${criterion.operator} ${criterion.threshold} ${criterion.unit}.`;
    case DecisionReasonCode.INCLUSION_CRITERION_NOT_MET:
      return `Inclusion criterion ${criterion.criterionId}: ${criterion.field} = ${extractedValue} ${criterion.unit} does not satisfy ${criterion.operator} ${criterion.threshold} ${criterion.unit}.`;
    case DecisionReasonCode.EXCLUSION_CRITERION_MET:
      return `Exclusion criterion ${criterion.criterionId} was met: ${criterion.field} = ${extractedValue} ${criterion.unit} triggers ${criterion.operator} ${criterion.threshold} ${criterion.unit}.`;
    case DecisionReasonCode.EXCLUSION_CRITERION_NOT_MET:
      return `Exclusion criterion ${criterion.criterionId} was not met: ${criterion.field} = ${extractedValue} ${criterion.unit} does not trigger exclusion ${criterion.operator} ${criterion.threshold} ${criterion.unit}.`;
    case DecisionReasonCode.HUMAN_REVIEW_REQUIRED:
      return `Manual review required for criterion ${criterion.criterionId}. System encountered an unresolvable condition.`;
    default:
      return `Criterion ${criterion.criterionId} evaluated.`;
  }
}
