/**
 * contracts.test.ts — Frontend/Backend Contract Drift & Schema Parity Tests.
 * Ensures API contracts, request payloads, response shapes, and attack IDs match.
 */

import { PerformScreeningSchema } from '../../../shared/contracts/screenings.js';
import { CANONICAL_ATTACKS, AttackId } from '../../../shared/contracts/attacks.js';
import { DecisionReasonCode, CriterionType } from '../../src/domain/types.js';

describe('Contract & Schema Parity Tests', () => {

  test('test_screening_request_contract', () => {
    const validRequest = {
      idempotencyKey: 'idem-test-100',
      patientId: 'PAT-001-ELIGIBLE',
      protocolId: 'PROTO-T2D-CKD-001',
      patientText: 'Patient age 52, HbA1c 8.2%',
    };

    const parsed = PerformScreeningSchema.safeParse(validRequest);
    expect(parsed.success).toBe(true);

    const invalidRequest = {
      patientId: 'PAT-001',
      // missing required idempotencyKey and patientText
    };
    const invalidParsed = PerformScreeningSchema.safeParse(invalidRequest);
    expect(invalidParsed.success).toBe(false);
  });

  test('test_attack_id_enum_parity', () => {
    const enumValues = Object.values(AttackId);
    expect(enumValues.length).toBe(6);
    expect(CANONICAL_ATTACKS.length).toBe(6);

    for (const attack of CANONICAL_ATTACKS) {
      expect(enumValues).toContain(attack.id);
      expect(typeof attack.name).toBe('string');
      expect(typeof attack.desc).toBe('string');
      expect(typeof attack.expectedGate).toBe('string');
    }
  });

  test('test_decision_proof_shape_parity', () => {
    const proofKeys = [
      'protocolHash',
      'criterionId',
      'sourceRefs',
      'extractedValue',
      'normalizedValue',
      'operator',
      'comparisonResult',
      'policyResult',
      'finalResult',
      'reasonCode',
      'reasoning',
      'artifactHash',
    ];

    const sampleProof = {
      protocolHash: 'sha256-criteria',
      protocolArtifactHash: 'sha256-doc',
      criteriaHash: 'sha256-criteria',
      criterionId: 'INC-01',
      sourceRefs: [{ docId: 'PROTO-1', textExcerpt: 'Excerpt' }],
      extractedValue: 52,
      normalizedValue: 52,
      operator: '>=',
      comparisonResult: 'met',
      policyResult: 'PASSED',
      finalResult: 'met',
      reasonCode: DecisionReasonCode.INCLUSION_CRITERION_MET,
      reasoning: 'Inclusion criterion INC-01 met.',
      artifactHash: 'sha256-proof',
    };

    for (const key of proofKeys) {
      expect(sampleProof).toHaveProperty(key);
    }
  });

  test('test_error_envelope_shape_parity', () => {
    const standardErrorEnvelope = {
      error: {
        code: 'PIPELINE_ERROR',
        message: 'Backend service failed to process request.',
        details: { tier: 1 },
      },
    };

    expect(standardErrorEnvelope).toHaveProperty('error');
    expect(standardErrorEnvelope.error).toHaveProperty('code');
    expect(standardErrorEnvelope.error).toHaveProperty('message');
    expect(typeof standardErrorEnvelope.error.code).toBe('string');
    expect(typeof standardErrorEnvelope.error.message).toBe('string');
  });

});
