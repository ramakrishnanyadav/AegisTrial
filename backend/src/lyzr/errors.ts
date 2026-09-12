/**
 * LyzrErrors — Typed error classes for every Lyzr failure mode.
 *
 * Each error maps to a deterministic system state per the failure-state contract:
 *
 * | Failure                | System State          | DecisionReasonCode         |
 * |------------------------|-----------------------|----------------------------|
 * | Timeout (>30s)         | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Rate limit (429)       | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Auth failure (401/403) | SYSTEM_ERROR          | N/A — error propagated     |
 * | Server error (5xx)     | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Malformed JSON         | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Schema validation fail | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Guardrail DENY         | POLICY_BLOCK          | POLICY_BLOCK               |
 * | Empty response         | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 * | Retry exhausted        | REQUIRES_HUMAN_REVIEW | HUMAN_REVIEW_REQUIRED      |
 *
 * AUTH_FAILURE is special: it produces no clinical decision.
 * It is propagated as HTTP 503 with systemError=true.
 */

export type LyzrFailureKind =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH_FAILURE'
  | 'SERVER_ERROR'
  | 'MALFORMED_JSON'
  | 'SCHEMA_FAILURE'
  | 'GUARDRAIL_DENY'
  | 'EMPTY_RESPONSE'
  | 'RETRY_EXHAUSTED';

export class LyzrError extends Error {
  constructor(
    public readonly kind: LyzrFailureKind,
    public readonly agentRole: string,
    message: string,
    public readonly statusCode?: number,
    public readonly rawResponse?: string,
  ) {
    super(`[Lyzr:${agentRole}:${kind}] ${message}`);
    this.name = 'LyzrError';
  }

  /** Returns true when the error should be treated as a system-level fault
   *  (no clinical decision possible, propagate as 503). */
  get isSystemError(): boolean {
    return this.kind === 'AUTH_FAILURE';
  }

  /** Returns true when the error should result in REQUIRES_HUMAN_REVIEW. */
  get isHumanReview(): boolean {
    return (
      this.kind === 'TIMEOUT' ||
      this.kind === 'RATE_LIMIT' ||
      this.kind === 'SERVER_ERROR' ||
      this.kind === 'MALFORMED_JSON' ||
      this.kind === 'SCHEMA_FAILURE' ||
      this.kind === 'EMPTY_RESPONSE' ||
      this.kind === 'RETRY_EXHAUSTED'
    );
  }

  /** Returns true when the error should result in POLICY_BLOCK. */
  get isPolicyBlock(): boolean {
    return this.kind === 'GUARDRAIL_DENY';
  }
}
