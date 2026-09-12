/**
 * api.ts — AegisTrial Backend REST API Client.
 * Connects to backend Express routes with error handling and shared contract typing.
 */

import { auth } from '../auth/firebase.js';
import type { PerformScreeningParams } from '../../shared/contracts/screenings.js';
import type { AttackExecutionResult } from '../../shared/contracts/attacks.js';

export type { PerformScreeningParams };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // JSON parse fallback
    }
    const code = errorData.error?.code || errorData.error || `HTTP_${response.status}`;
    const message = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(message) as Error & { code?: string; details?: unknown };
    err.code = code;
    err.details = errorData.error?.details;
    throw err;
  }

  return response.json() as Promise<T>;
}

/** Execute a full patient screening run through backend governance pipeline */
export async function runScreening(params: PerformScreeningParams) {
  return fetchApi<any>('/api/screenings', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** List all trial protocols */
export async function listProtocols() {
  return fetchApi<any[]>('/api/protocols');
}

/** Ingest raw protocol text via the Lyzr Criteria Extractor Agent */
export async function ingestProtocol(protocolText: string, protocolId?: string, name?: string) {
  return fetchApi<{
    protocolId: string;
    protocolArtifactHash?: string;
    criteriaHash?: string;
    protocolHash: string;
    name: string;
    criteria: any[];
    ingestedAt: string;
  }>('/api/protocols/ingest', {
    method: 'POST',
    body: JSON.stringify({ protocolText, protocolId, name }),
  });
}

/** Retrieve an existing screening run by ID */
export async function getScreeningRun(runId: string) {
  return fetchApi<any>(`/api/screenings/${runId}`);
}

/** List all recent screening runs */
export async function listRecentScreenings() {
  return fetchApi<any[]>('/api/screenings');
}

/** Execute AI-free replay verification of a stored screening run */
export async function verifyScreeningRun(runId: string) {
  return fetchApi<any>(`/api/screenings/${runId}/verify`);
}

/** Execute an adversarial security attack against backend pipeline */
export async function runAttack(attackId: string) {
  return fetchApi<AttackExecutionResult>(`/api/attacks/${attackId}/run`, {
    method: 'POST',
  });
}

/** Fetch AIMS audit events telemetry stream */
export async function getAimsEvents() {
  return fetchApi<any[]>('/api/aims/stream');
}
