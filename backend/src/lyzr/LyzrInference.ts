import Ajv, { type ValidateFunction } from 'ajv';
import { LyzrAgent, LYZR_BASE_URL } from './LyzrAgent.js';
import { LyzrError } from './errors.js';

const INFERENCE_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

const ajv = new Ajv({ allErrors: true });

/**
 * LyzrInference — executes a single inference call against a provisioned agent.
 *
 * This is the "I" in the Environment/Agent/Inference triad.
 * It is a separate, inspectable object. It records:
 *   - The raw LLM output (for reproducibility)
 *   - The session_id (for Lyzr conversation tracing)
 *   - The agent_id + agentRole (for audit)
 *
 * Failure mapping (see errors.ts):
 *   TIMEOUT       → LyzrError(TIMEOUT)
 *   RATE_LIMIT    → LyzrError(RATE_LIMIT)
 *   AUTH_FAILURE  → LyzrError(AUTH_FAILURE)   — SYSTEM_ERROR, propagated
 *   5xx           → LyzrError(SERVER_ERROR)
 *   Malformed JSON→ LyzrError(MALFORMED_JSON)
 *   Schema fail   → LyzrError(SCHEMA_FAILURE)
 *   Guardrail DENY→ LyzrError(GUARDRAIL_DENY)
 *   Empty response→ LyzrError(EMPTY_RESPONSE)
 *   Retry exhaust → LyzrError(RETRY_EXHAUSTED)
 */
export class LyzrInference {
  private readonly validator: ValidateFunction | null;

  // Populated after a successful call — inspectable for audit
  lastRawOutput: string | null = null;
  lastSessionId: string | null = null;
  lastAgentId: string | null = null;
  llmCallCount = 0; // used by tests to assert AI-free replay

  constructor(
    private readonly agent: LyzrAgent,
    private readonly apiKey: string,
    private readonly userId: string,
    outputSchema?: Record<string, unknown>,
  ) {
    this.validator = outputSchema ? ajv.compile(outputSchema) : null;
  }

  /**
   * Run inference. Returns the parsed, schema-validated JSON output.
   * Retries up to MAX_RETRIES times before throwing LyzrError(RETRY_EXHAUSTED).
   *
   * @param message      The user message to send to the agent.
   * @param sessionId    Unique session identifier for this screening run.
   */
  async run<T = unknown>(message: string, sessionId: string): Promise<T> {
    let lastErr: LyzrError | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.callOnce<T>(message, sessionId);
        return result;
      } catch (err) {
        if (err instanceof LyzrError) {
          if (err.kind === 'AUTH_FAILURE') throw err; // never retry auth failures
          if (err.kind === 'GUARDRAIL_DENY') throw err; // never retry policy blocks
          lastErr = err;
          if (attempt < MAX_RETRIES) {
            const backoffMs = attempt * 1000;
            console.warn(
              `[LyzrInference:${this.agent.role}] Attempt ${attempt} failed (${err.kind}). Retrying in ${backoffMs}ms...`,
            );
            await new Promise((r) => setTimeout(r, backoffMs));
          }
        } else {
          throw err;
        }
      }
    }

    throw new LyzrError(
      'RETRY_EXHAUSTED',
      this.agent.role,
      `All ${MAX_RETRIES} attempts failed. Last error: ${lastErr?.message}`,
    );
  }

  private async callOnce<T>(message: string, sessionId: string): Promise<T> {
    this.llmCallCount++;

    const payload = {
      user_id: this.userId,
      agent_id: this.agent.agentId,
      session_id: sessionId,
      message,
      filter_variables: {},
      features: [],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

    let rawBody = '';
    try {
      const res = await fetch(`${LYZR_BASE_URL}/v3/inference/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);
      rawBody = await res.text();

      if (res.status === 401 || res.status === 403) {
        throw new LyzrError('AUTH_FAILURE', this.agent.role, `Inference auth failure: ${res.status}`, res.status, rawBody);
      }
      if (res.status === 429) {
        throw new LyzrError('RATE_LIMIT', this.agent.role, 'Rate limited during inference', 429, rawBody);
      }
      if (res.status >= 500) {
        throw new LyzrError('SERVER_ERROR', this.agent.role, `Inference server error: ${res.status}`, res.status, rawBody);
      }

      // The Lyzr inference API returns { response: string }
      let envelope: { response?: string };
      try {
        envelope = JSON.parse(rawBody) as { response?: string };
      } catch {
        throw new LyzrError('MALFORMED_JSON', this.agent.role, 'Could not parse inference envelope', undefined, rawBody);
      }

      const responseText = envelope.response ?? '';
      if (!responseText.trim()) {
        throw new LyzrError('EMPTY_RESPONSE', this.agent.role, 'Inference returned empty response', undefined, rawBody);
      }

      // Check for guardrail deny signals in the response
      if (
        responseText.includes('GUARDRAIL_DENY') ||
        responseText.includes('policy violation') ||
        responseText.includes('I cannot process')
      ) {
        this.lastRawOutput = responseText;
        throw new LyzrError('GUARDRAIL_DENY', this.agent.role, 'Safe AI guardrail triggered', undefined, responseText);
      }

      // Parse the response content as JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new LyzrError('MALFORMED_JSON', this.agent.role, 'Agent response is not valid JSON', undefined, responseText);
      }

      // Schema validation (if a schema was provided)
      if (this.validator && !this.validator(parsed)) {
        const errors = JSON.stringify(this.validator.errors);
        throw new LyzrError('SCHEMA_FAILURE', this.agent.role, `Schema validation failed: ${errors}`, undefined, responseText);
      }

      // Persist for reproducibility audit
      this.lastRawOutput = responseText;
      this.lastSessionId = sessionId;
      this.lastAgentId = this.agent.agentId;

      return parsed as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof LyzrError) throw err;
      const name = (err as Error).name;
      if (name === 'AbortError') {
        throw new LyzrError('TIMEOUT', this.agent.role, 'Inference timed out after 30s', undefined, rawBody);
      }
      throw new LyzrError('SERVER_ERROR', this.agent.role, `Inference failed: ${(err as Error).message}`, undefined, rawBody);
    }
  }
}
