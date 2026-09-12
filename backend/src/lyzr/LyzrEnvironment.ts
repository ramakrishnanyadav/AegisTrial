/**
 * LyzrEnvironment — The runtime configuration envelope for a Lyzr agent.
 *
 * Corresponds to the agent creation config fields:
 * features, tool_configs, llm_credential_id, provider_id, model, temperature, response_format.
 *
 * This is the "E" in the Environment/Agent/Inference triad.
 * It is a separate, inspectable object — not collapsed into a single API call.
 */
export interface LyzrEnvironmentConfig {
  providerIdOverride?: string;
  modelOverride?: string;
  temperature?: number;
  features?: string[];
  responseFormat?: Record<string, unknown>;
  maxIterations?: number;
  storeMessages?: boolean;
}

export class LyzrEnvironment {
  readonly providerId: string;
  readonly model: string;
  readonly temperature: number;
  readonly features: string[];
  readonly responseFormat: Record<string, unknown>;
  readonly maxIterations: number;
  readonly storeMessages: boolean;

  constructor(agentConfig: Record<string, unknown>, overrides: LyzrEnvironmentConfig = {}) {
    this.providerId = (overrides.providerIdOverride ?? agentConfig['provider_id'] ?? 'openai') as string;
    this.model = (overrides.modelOverride ?? agentConfig['model'] ?? 'gpt-4o') as string;
    this.temperature = overrides.temperature ?? (agentConfig['temperature'] as number) ?? 0;
    this.features = overrides.features ?? (agentConfig['features'] as string[] | undefined) ?? [];
    this.responseFormat =
      overrides.responseFormat ??
      (agentConfig['response_format'] as Record<string, unknown> | undefined) ??
      {};
    this.maxIterations = overrides.maxIterations ?? (agentConfig['max_iterations'] as number | undefined) ?? 1;
    this.storeMessages = overrides.storeMessages ?? (agentConfig['store_messages'] as boolean | undefined) ?? true;
  }

  /** Returns the fields that are sent in the Lyzr agent creation payload. */
  toAgentPayloadFields(): Record<string, unknown> {
    return {
      provider_id: this.providerId,
      model: this.model,
      temperature: this.temperature,
      features: this.features,
      response_format: Object.keys(this.responseFormat).length > 0 ? this.responseFormat : undefined,
      max_iterations: this.maxIterations,
      store_messages: this.storeMessages,
    };
  }
}
