/**
 * PhiPipelineError — typed error for PHI pipeline failures.
 *
 * tier: which tier failed (1=regex, 2=NER, 3=Lyzr Safe AI, 4=residual scan)
 * reason: machine-readable failure code
 *
 * Callers MUST catch this and route to REQUIRES_HUMAN_REVIEW.
 * Never swallow and continue — that would send unredacted PHI to the LLM.
 */

export type PhiFailureReason =
  | 'NER_UNAVAILABLE'           // Tier 2: compromise.js failed to load
  | 'LYZR_SAFETY_TIMEOUT'       // Tier 3: Lyzr call timed out
  | 'LYZR_SAFETY_ERROR'         // Tier 3: Lyzr returned 5xx
  | 'LYZR_SAFETY_AUTH_FAILURE'  // Tier 3: Lyzr auth failure
  | 'GUARDRAIL_DENY'            // Tier 3: Safe AI guardrail triggered
  | 'PHI_RESIDUAL_DETECTED'     // Tier 4: Residual scan found identifiers post-redaction
  | 'INJECTION_DETECTED';       // Tier 3: Prompt injection pattern found

export class PhiPipelineError extends Error {
  constructor(
    public readonly tier: 1 | 2 | 3 | 4,
    public readonly reason: PhiFailureReason,
    message: string,
  ) {
    super(`[PHI Pipeline Tier ${tier}:${reason}] ${message}`);
    this.name = 'PhiPipelineError';
  }

  get isPolicyBlock(): boolean {
    return this.reason === 'GUARDRAIL_DENY' || this.reason === 'INJECTION_DETECTED';
  }

  get isHumanReview(): boolean {
    return !this.isPolicyBlock;
  }
}
