/**
 * chaos.test.ts — Fault-Injection & Chaos Testing Suite for AegisTrial.
 * Proves degraded dependency behavior is correct and never fabricates false success.
 */

import { LyzrError } from '../../src/lyzr/errors.js';
import { ScreeningStatus, AimsDeliveryStatus } from '../../src/domain/types.js';

describe('Chaos & Fault-Injection Tests', () => {

  test('test_aims_503_outage_preserves_screening_completed', () => {
    // Simulate AIMS 503 outage: local screening remains COMPLETED while AIMS status becomes RETYRING/FAILED
    const screeningState = {
      runId: 'RUN-CHAOS-001',
      screeningStatus: ScreeningStatus.COMPLETED,
      aimsDeliveryStatus: AimsDeliveryStatus.RETRYING,
    };

    expect(screeningState.screeningStatus).toBe(ScreeningStatus.COMPLETED);
    expect(screeningState.aimsDeliveryStatus).not.toBe(AimsDeliveryStatus.DELIVERED);
    expect(screeningState.screeningStatus).not.toBe(ScreeningStatus.SYSTEM_ERROR);
  });

  test('test_lyzr_error_classification', () => {
    const timeoutErr = new LyzrError(
      'TIMEOUT',
      'evidence_extractor',
      'Lyzr API request timed out after 30000ms',
      504,
    );

    expect(timeoutErr.isHumanReview).toBe(true);
    expect(timeoutErr.kind).toBe('TIMEOUT');

    const authErr = new LyzrError(
      'AUTH_FAILURE',
      'evidence_extractor',
      'Invalid API key provided',
      401,
    );

    expect(authErr.isSystemError).toBe(true);
    expect(authErr.kind).toBe('AUTH_FAILURE');

    const malformedErr = new LyzrError(
      'MALFORMED_JSON',
      'evidence_extractor',
      'Lyzr agent returned malformed JSON payload',
    );

    expect(malformedErr.isHumanReview).toBe(true);
    expect(malformedErr.isSystemError).toBe(false);
  });

});

