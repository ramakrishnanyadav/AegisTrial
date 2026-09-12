/**
 * outbox.ts — AIMS transactional outbox.
 *
 * INVARIANT: The outbox row is ALWAYS written in the same SQLite transaction
 * as the screening_run row (enforced in repository.ts createScreeningRun).
 * AIMS delivery failure NEVER changes screeningStatus.
 *
 * Delivery statuses:
 *   PENDING   → queued, not yet attempted
 *   RETRYING  → delivery failed, will retry with exponential backoff
 *   DELIVERED → successfully delivered
 *   FAILED    → exhausted max_attempts
 */

import { getPendingOutboxRows, markOutboxDelivered, markOutboxRetry, updateAimsDeliveryStatus } from '../db/repository.js';
import { AimsDeliveryStatus } from '../domain/types.js';

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000; // 1s base, doubles each attempt

function getAimsEndpoint(): string {
  return process.env['AIMS_ENDPOINT'] ?? 'http://localhost:3000/api/aims/_mock';
}

async function deliverEvent(eventJson: string): Promise<void> {
  const endpoint = getAimsEndpoint();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: eventJson,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`AIMS endpoint returned ${res.status}`);
  }
}

export async function processOutbox(): Promise<void> {
  const pending = getPendingOutboxRows(20);
  if (pending.length === 0) return;

  console.log(`[AIMS Outbox] Processing ${pending.length} pending event(s)`);

  for (const row of pending) {
    try {
      await deliverEvent(row.event_json);
      markOutboxDelivered(row.id);
      updateAimsDeliveryStatus(row.run_id, AimsDeliveryStatus.DELIVERED);
      console.log(`[AIMS Outbox] Delivered event ${row.id} for run ${row.run_id}`);
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      const exhausted = nextAttempts >= MAX_ATTEMPTS;
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, nextAttempts - 1);
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();

      markOutboxRetry(row.id, nextRetry, exhausted);
      if (exhausted) {
        updateAimsDeliveryStatus(row.run_id, AimsDeliveryStatus.FAILED);
        console.warn(`[AIMS Outbox] Event ${row.id} exhausted retries. aimsDeliveryStatus=FAILED. screeningStatus unchanged.`);
      } else {
        updateAimsDeliveryStatus(row.run_id, AimsDeliveryStatus.RETRYING);
        console.warn(`[AIMS Outbox] Event ${row.id} failed (attempt ${nextAttempts}/${MAX_ATTEMPTS}). Retry at ${nextRetry}. Error: ${(err as Error).message}`);
      }
    }
  }
}
