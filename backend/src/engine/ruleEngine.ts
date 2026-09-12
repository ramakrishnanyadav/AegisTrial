/**
 * ruleEngine.ts — Deterministic clinical trial eligibility rule engine.
 *
 * PURE FUNCTIONS ONLY: Zero network calls. Zero LLM calls. Zero randomness.
 * Given identical inputs, output is always bit-identical.
 *
 * Gate priority (hard, short-circuit left-to-right):
 *   Gate 1: Missing evidence    → REQUIRES_HUMAN_REVIEW / MISSING_REQUIRED_EVIDENCE
 *   Gate 2: Ambiguous ontology  → REQUIRES_HUMAN_REVIEW / AMBIGUOUS_ONTOLOGY
 *   Gate 3: Unit incompatible   → BLOCK / UNIT_INCOMPATIBLE
 *   Gate 4: Conflicting evidence→ REQUIRES_HUMAN_REVIEW / CONFLICTING_EVIDENCE
 *   Gate 5: Policy block        → BLOCK / POLICY_BLOCK (cannot be cleared downstream)
 *   Gate 6: Numeric/temporal comparison → met / not_met
 *
 * A gate on the right is NEVER evaluated if an earlier gate fires.
 */

import {
  DecisionReasonCode,
  CriterionType,
  type Criterion,
  type PatientField,
  type CriterionEvaluation,
} from '../domain/types.js';
import { convertUnit, unitsAreCompatible } from './unitConverter.js';
import type { ResolvedEvidence } from './evidenceResolver.js';
import { buildReasoningText } from './evidenceResolver.js';

// ---------------------------------------------------------------------------
// Temporal window validation
// ---------------------------------------------------------------------------

/** Parse a temporal window string (e.g. "within 28 days") into milliseconds. */
function parseTemporalWindowMs(window?: string): number | null {
  if (!window) return null;
  const match = window.match(/within\s+(\d+)\s+(day|week|month)/i);
  if (!match) return null;
  const count = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  if (unit === 'day') return count * 24 * 60 * 60 * 1000;
  if (unit === 'week') return count * 7 * 24 * 60 * 60 * 1000;
  if (unit === 'month') return count * 30 * 24 * 60 * 60 * 1000;
  return null;
}

/** Filter patient fields to those within the criterion's temporal window. Strictly requires timestamp when window is specified. */
function filterByTemporalWindow<T extends PatientField>(
  fields: T[],
  window?: string,
): T[] {
  const windowMs = parseTemporalWindowMs(window);
  if (!windowMs) return fields; // no temporal constraint

  const now = Date.now();
  return fields.filter((f) => {
    // Missing timestamp on a temporal criterion MUST NOT pass implicitly
    if (!f.timestamp) return false;
    const ts = new Date(f.timestamp).getTime();
    return now - ts <= windowMs;
  });
}

// ---------------------------------------------------------------------------
// Comparison logic
// ---------------------------------------------------------------------------

function compareValues(
  value: number,
  operator: string,
  threshold: number | string,
): boolean {
  const thresh = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  if (isNaN(thresh)) return false;

  switch (operator) {
    case '>=': return value >= thresh;
    case '<=': return value <= thresh;
    case '>':  return value > thresh;
    case '<':  return value < thresh;
    case '==': return value === thresh;
    case '!=': return value !== thresh;
    default:   return false;
  }
}

// ---------------------------------------------------------------------------
// Main evaluation function
// ---------------------------------------------------------------------------

/**
 * Evaluate a single ResolvedEvidence item against its criterion.
 * Pipeline Order:
 *   Gate 1: Missing evidence
 *   Gate 2: Ambiguous ontology
 *   Gate 3: Unit compatibility check & deterministic conversion to normalized values
 *   Gate 4: Conflict detection on unit-normalized values
 *   Gate 5: Policy block
 *   Gate 6: Temporal window filter (strict timestamp check)
 *   Numeric / categorical comparison on normalized values
 */
export function evaluateCriterion(
  resolved: ResolvedEvidence,
  isPolicyBlocked: boolean = false,
): CriterionEvaluation {
  const { criterion, matchedFields, isMissing } = resolved;

  // ── Gate 1: Missing evidence ────────────────────────────────────────────
  if (isMissing || matchedFields.length === 0) {
    return {
      criterion,
      patientFields: [],
      gateResult: 'REQUIRES_REVIEW',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.MISSING_REQUIRED_EVIDENCE,
      reasoning: buildReasoningText(criterion, DecisionReasonCode.MISSING_REQUIRED_EVIDENCE, null),
    };
  }

  // ── Gate 2: Ambiguous ontology ──────────────────────────────────────────
  if (resolved.requiresOntologyMapping && matchedFields.every((f) => f.confidence < 0.5)) {
    return {
      criterion,
      patientFields: matchedFields,
      gateResult: 'REQUIRES_REVIEW',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.AMBIGUOUS_ONTOLOGY,
      reasoning: buildReasoningText(criterion, DecisionReasonCode.AMBIGUOUS_ONTOLOGY, null),
    };
  }

  // ── Gate 3: Unit compatibility check & deterministic normalization ───────
  const normalizedFields: Array<PatientField & { convertedValue?: number }> = [];
  for (const field of matchedFields) {
    if (typeof criterion.threshold === 'number' && typeof field.value === 'number') {
      const fieldUnit = field.unit ?? criterion.unit;
      const targetUnit = criterion.unit;
      if (fieldUnit && targetUnit && !unitsAreCompatible(fieldUnit, targetUnit)) {
        return {
          criterion,
          patientFields: matchedFields,
          gateResult: 'BLOCKED',
          result: 'insufficient_data',
          reasonCode: DecisionReasonCode.UNIT_INCOMPATIBLE,
          reasoning: buildReasoningText(criterion, DecisionReasonCode.UNIT_INCOMPATIBLE, field.value),
        };
      }

      const conversion = convertUnit(field.value, fieldUnit, targetUnit);
      if (!conversion.compatible || conversion.convertedValue === undefined) {
        return {
          criterion,
          patientFields: matchedFields,
          gateResult: 'BLOCKED',
          result: 'insufficient_data',
          reasonCode: DecisionReasonCode.UNIT_INCOMPATIBLE,
          reasoning: buildReasoningText(criterion, DecisionReasonCode.UNIT_INCOMPATIBLE, field.value),
        };
      }
      normalizedFields.push({ ...field, convertedValue: conversion.convertedValue });
    } else {
      normalizedFields.push(field);
    }
  }

  const firstField = normalizedFields[0]!;
  const firstValue = firstField.convertedValue ?? firstField.value;

  // ── Gate 4: Conflicting evidence (evaluated on unit-normalized values) ─
  const hasNormalizedConflict =
    typeof criterion.threshold === 'number' &&
    normalizedFields.length >= 2 &&
    normalizedFields.some((f) => (f.convertedValue ?? (typeof f.value === 'number' ? f.value : NaN)) >= (criterion.threshold as number)) &&
    normalizedFields.some((f) => (f.convertedValue ?? (typeof f.value === 'number' ? f.value : NaN)) < (criterion.threshold as number));

  if (resolved.hasConflict || hasNormalizedConflict) {
    return {
      criterion,
      patientFields: matchedFields,
      gateResult: 'REQUIRES_REVIEW',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.CONFLICTING_EVIDENCE,
      reasoning: buildReasoningText(criterion, DecisionReasonCode.CONFLICTING_EVIDENCE, firstValue),
    };
  }

  // ── Gate 5: Policy block (PHI pipeline block) ──────────────────────────
  if (isPolicyBlocked) {
    return {
      criterion,
      patientFields: matchedFields,
      gateResult: 'BLOCKED',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.POLICY_BLOCK,
      reasoning: buildReasoningText(criterion, DecisionReasonCode.POLICY_BLOCK, null),
    };
  }

  // ── Gate 6: Temporal window (strictly requires timestamp if window set) ─
  const temporalFields = filterByTemporalWindow(normalizedFields, criterion.temporalWindow);
  if (temporalFields.length === 0) {
    return {
      criterion,
      patientFields: matchedFields,
      gateResult: 'REQUIRES_REVIEW',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.TEMPORAL_FAILURE,
      reasoning: buildReasoningText(criterion, DecisionReasonCode.TEMPORAL_FAILURE, firstValue),
    };
  }

  // ── Numeric / categorical comparison on normalized values ──────────────
  const evalField = temporalFields[0]!;
  const evalValue = evalField.convertedValue ?? evalField.value;

  // Handle PRESENT / ABSENT operators
  if (criterion.operator === 'PRESENT') {
    const reasonCode =
      criterion.type === CriterionType.EXCLUSION
        ? DecisionReasonCode.EXCLUSION_CRITERION_MET
        : DecisionReasonCode.INCLUSION_CRITERION_MET;
    return {
      criterion,
      patientFields: temporalFields,
      gateResult: 'PASSED',
      result: 'met',
      reasonCode,
      reasoning: buildReasoningText(criterion, reasonCode, evalValue),
    };
  }
  if (criterion.operator === 'ABSENT') {
    const reasonCode = DecisionReasonCode.EXCLUSION_CRITERION_MET;
    return {
      criterion,
      patientFields: temporalFields,
      gateResult: 'PASSED',
      result: criterion.type === CriterionType.EXCLUSION ? 'met' : 'not_met',
      reasonCode,
      reasoning: buildReasoningText(criterion, reasonCode, evalValue),
    };
  }

  // Numeric comparison
  if (typeof evalValue !== 'number') {
    return {
      criterion,
      patientFields: temporalFields,
      gateResult: 'REQUIRES_REVIEW',
      result: 'insufficient_data',
      reasonCode: DecisionReasonCode.HUMAN_REVIEW_REQUIRED,
      reasoning: `Field '${criterion.field}' value is not numeric. Cannot compare to threshold ${criterion.threshold}.`,
    };
  }

  const comparisonPassed = compareValues(evalValue, criterion.operator, criterion.threshold);

  const reasonCode = comparisonPassed
    ? criterion.type === CriterionType.EXCLUSION
      ? DecisionReasonCode.EXCLUSION_CRITERION_MET
      : DecisionReasonCode.INCLUSION_CRITERION_MET
    : criterion.type === CriterionType.EXCLUSION
    ? DecisionReasonCode.EXCLUSION_CRITERION_NOT_MET
    : DecisionReasonCode.INCLUSION_CRITERION_NOT_MET;

  const finalResult: 'met' | 'not_met' = comparisonPassed ? 'met' : 'not_met';

  return {
    criterion,
    patientFields: temporalFields,
    gateResult: 'PASSED',
    result: finalResult,
    reasonCode,
    reasoning: buildReasoningText(criterion, reasonCode, evalValue),
    rawLlmExtraction: undefined,
  };
}

// ---------------------------------------------------------------------------
// Verdict computation
// ---------------------------------------------------------------------------

import type { VerificationVerdict } from '../domain/types.js';

/**
 * Compute the final screening verdict from all criterion evaluations.
 *
 * C.1: Empty criteria set (evaluations.length === 0) → REQUIRES_HUMAN_REVIEW.
 * ELIGIBLE only if:
 *   - ALL inclusion criteria → result: 'met'
 *   - ZERO exclusion criteria → result: 'met'
 *   - No criterion in REQUIRES_REVIEW or BLOCKED state
 */
export function computeVerdict(evaluations: CriterionEvaluation[]): VerificationVerdict {
  if (!evaluations || evaluations.length === 0) {
    return 'REQUIRES_HUMAN_REVIEW';
  }

  const hasReview = evaluations.some((e) => e.result === 'insufficient_data');
  const hasBlocked = evaluations.some((e) => e.gateResult === 'BLOCKED');

  if (hasReview || hasBlocked) return 'REQUIRES_HUMAN_REVIEW';

  const inclusionFailed = evaluations.some(
    (e) =>
      e.criterion.type === CriterionType.INCLUSION &&
      e.result === 'not_met',
  );
  if (inclusionFailed) return 'INELIGIBLE';

  const exclusionMet = evaluations.some(
    (e) =>
      e.criterion.type === CriterionType.EXCLUSION &&
      e.result === 'met',
  );
  if (exclusionMet) return 'INELIGIBLE';

  return 'ELIGIBLE';
}
