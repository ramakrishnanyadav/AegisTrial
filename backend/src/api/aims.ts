/**
 * aims.ts — Router for AIMS Telemetry Stream.
 * Gated by verifyFirebaseToken middleware in app.ts.
 */

import express, { Router } from 'express';
import { listAllOutboxRows } from '../db/repository.js';

export const aimsRouter = Router();

aimsRouter.get('/stream', (_req: express.Request, res: express.Response) => {
  try {
    const rows = listAllOutboxRows(50);
    const events = rows.map((r) => {
      let payload: any = {};
      try {
        payload = JSON.parse(r.event_json);
      } catch {
        payload = {};
      }
      return {
        id: r.id,
        runId: r.run_id,
        eventType: r.event_type,
        status: r.status,
        outboxStatus: r.status,
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
        nextRetryAt: r.next_retry_at,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
        timestamp: r.created_at,
        ...payload,
      };
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: 'STREAM_ERROR', message: err?.message || 'Failed to fetch AIMS stream' });
  }
});
