/**
 * decisionProof.ts — Builds and hashes canonical DecisionProof objects.
 *
 * Canonical Serialization Spec (enforced here):
 *   Encoding:       UTF-8
 *   Unicode:        NFC normalization (via unorm)
 *   Object keys:    Sorted lexicographically (recursive)
 *   Array order:    Preserved
 *   Timestamps:     ISO-8601 UTC ("2026-09-12T10:42:50.000Z")
 *   Numbers:        Canonical decimal notation, max 15 significant digits
 *   Null vs omit:   undefined → omitted; explicit null → serialized as null
 *   Whitespace:     No insignificant whitespace
 *   Hash algorithm: SHA-256
 *   Hash encoding:  Lowercase hex, 64 chars
 */

import crypto from 'crypto';
// @ts-ignore
import unorm from 'unorm';
import type { DecisionProof, CriterionEvaluation } from '../domain/types.js';
import { convertUnit } from './unitConverter.js';

// ---------------------------------------------------------------------------
// Canonical JSON serialization
// ---------------------------------------------------------------------------

/** Recursively sort object keys. Preserves array order. */
function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        // undefined → omit (never write undefined as null)
        sorted[key] = sortKeys(v);
      }
    }
    return sorted;
  }
  if (typeof value === 'number') {
    // Canonical decimal notation, max 15 significant digits
    return parseFloat(value.toPrecision(15));
  }
  return value;
}

/**
 * Produce a canonical JSON string from an object.
 * Input is NFC-normalized. Keys are sorted. No whitespace.
 */
export function canonicalJson(obj: unknown): string {
  const sorted = sortKeys(obj);
  const raw = JSON.stringify(sorted);
  // NFC normalization on the output string
  return unorm.nfc(raw);
}

/** Compute SHA-256 of the canonical JSON representation. */
export function sha256Hex(obj: unknown): string {
  const json = canonicalJson(obj);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Build DecisionProof from CriterionEvaluation
// ---------------------------------------------------------------------------

export function buildDecisionProof(
  evaluation: CriterionEvaluation,
  protocolHash: string,
): DecisionProof {
  const { criterion, patientFields, gateResult, result, reasonCode, reasoning } = evaluation;

  // Pick the best matching field value
  const primaryField = patientFields[0];
  const extractedValue = primaryField?.value ?? null;

  // Compute normalized value (after unit conversion)
  let normalizedValue: number | string | null = extractedValue;
  let unitConversionStr: string | undefined;

  if (
    typeof extractedValue === 'number' &&
    primaryField?.unit &&
    criterion.unit
  ) {
    const conv = convertUnit(extractedValue, primaryField.unit, criterion.unit);
    if (conv.compatible && conv.convertedValue !== undefined) {
      normalizedValue = conv.convertedValue;
      unitConversionStr = conv.conversionDescription;
    }
  }

  // Build source refs from matched patient fields
  const sourceRefs = patientFields
    .filter((f) => f.sourceExcerpt)
    .map((f) => ({
      docId: 'patient_ehr',
      textExcerpt: f.sourceExcerpt,
      timestamp: f.timestamp ?? undefined,
    }));

  // Construct the proof object (without artifactHash — we'll add it after)
  const proofWithoutHash: Omit<DecisionProof, 'artifactHash'> = {
    protocolHash,
    criterionId: criterion.criterionId,
    sourceRefs,
    extractedValue,
    normalizedValue,
    ontologyMapping: criterion.field ? `LOINC/SNOMED:${criterion.field}` : undefined,
    unitConversion: unitConversionStr,
    temporalEvaluation: criterion.temporalWindow,
    operator: criterion.operator,
    comparisonResult: result,
    policyResult: gateResult,
    finalResult: result,
    reasonCode,
    reasoning, // comes from template in evidenceResolver.ts — never raw LLM prose
  };

  // Compute hash over the proof (including the hash field name gives a self-referential
  // proof — we use a placeholder approach: hash the proof-without-hash)
  const artifactHash = sha256Hex(proofWithoutHash);

  return { ...proofWithoutHash, artifactHash };
}

/**
 * Build all DecisionProof objects for a screening run.
 * Returns the proofs and a top-level sha256 of the entire array.
 */
export function buildAllDecisionProofs(
  evaluations: CriterionEvaluation[],
  protocolHash: string,
): { proofs: DecisionProof[]; sha256: string } {
  const proofs = evaluations.map((e) => buildDecisionProof(e, protocolHash));
  const sha256 = sha256Hex(proofs);
  return { proofs, sha256 };
}
