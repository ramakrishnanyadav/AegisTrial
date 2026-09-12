import { LyzrEnvironment } from './LyzrEnvironment.js';
import { LyzrError } from './errors.js';

const LYZR_BASE_URL = 'https://agent-prod.studio.lyzr.ai';
const AGENT_CACHE_FILE = '.lyzr-agents.json';
const CREATE_TIMEOUT_MS = 30_000;

/**
 * LyzrAgent — represents a provisioned Lyzr agent.
 *
 * This is the "A" in the Environment/Agent/Inference triad.
 * It holds the agent_id, which is assigned by the Lyzr platform upon creation.
 * The agent_id is inspectable and persisted to .lyzr-agents.json.
 */
export class LyzrAgent {
  private _agentId: string | null = null;

  constructor(
    public readonly role: string,
    public readonly name: string,
    public readonly description: string,
    public readonly agentInstructions: string,
    public readonly agentGoal: string,
    public readonly agentContext: string,
    public readonly agentOutput: string,
    public readonly environment: LyzrEnvironment,
    private readonly apiKey: string,
  ) {}

  get agentId(): string {
    if (!this._agentId) {
      throw new Error(`Agent '${this.role}' has not been provisioned yet. Call provision() first.`);
    }
    return this._agentId;
  }

  get isProvisioned(): boolean {
    return this._agentId !== null;
  }

  /** Load a known agent_id (from cache or env). */
  loadId(agentId: string): void {
    this._agentId = agentId;
  }

  /**
   * Provision this agent on the Lyzr platform via POST /v3/agents/.
   * Returns the agent_id. Idempotent if already provisioned.
   */
  async provision(): Promise<string> {
    if (this._agentId) {
      return this._agentId;
    }

    const payload = {
      name: this.name,
      description: this.description,
      agent_role: this.role,
      agent_instructions: this.agentInstructions,
      agent_goal: this.agentGoal,
      agent_context: this.agentContext,
      agent_output: this.agentOutput,
      ...this.environment.toAgentPayloadFields(),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

    try {
      const res = await fetch(`${LYZR_BASE_URL}/v3/agents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 401 || res.status === 403) {
        throw new LyzrError('AUTH_FAILURE', this.role, `Agent provision auth failure: ${res.status}`);
      }
      if (res.status === 429) {
        throw new LyzrError('RATE_LIMIT', this.role, 'Rate limited during agent provision');
      }
      if (res.status >= 500) {
        throw new LyzrError('SERVER_ERROR', this.role, `Server error during agent provision: ${res.status}`, res.status);
      }

      const data = (await res.json()) as { agent_id?: string };
      if (!data.agent_id) {
        throw new LyzrError('EMPTY_RESPONSE', this.role, 'agent_id missing from provision response');
      }

      this._agentId = data.agent_id;
      console.log(`[LyzrAgent] Provisioned agent '${this.role}' → ${this._agentId}`);
      return this._agentId;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof LyzrError) throw err;
      const name = (err as Error).name;
      if (name === 'AbortError') {
        throw new LyzrError('TIMEOUT', this.role, 'Agent provision timed out');
      }
      throw new LyzrError('SERVER_ERROR', this.role, `Provision failed: ${(err as Error).message}`);
    }
  }

  /** Fetch agent details from Lyzr platform. */
  async fetchDetails(): Promise<Record<string, unknown>> {
    const res = await fetch(`${LYZR_BASE_URL}/v3/agents/${this.agentId}`, {
      headers: { 'x-api-key': this.apiKey },
    });
    if (!res.ok) {
      throw new LyzrError('SERVER_ERROR', this.role, `Failed to fetch agent details: ${res.status}`, res.status);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }
}

export { AGENT_CACHE_FILE, LYZR_BASE_URL };
