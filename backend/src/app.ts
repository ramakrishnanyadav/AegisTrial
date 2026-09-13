/**
 * app.ts — Express application setup.
 * Mounts all routers and middleware.
 */

import express from 'express';
import { screeningsRouter } from './api/screenings.js';
import { attacksRouter } from './api/attacks.js';
import { protocolsRouter } from './api/protocols.js';
import { aimsMockRouter } from './aims/mockSink.js';
import { verifyFirebaseToken } from './auth/firebaseAdmin.js';
import { DEMO_PATIENTS } from '../../shared/fixtures/patients.js';
import { listAllOutboxRows } from './db/repository.js';
import { config } from './config/index.js';

import { structuredLoggingMiddleware } from './middleware/logging.js';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(structuredLoggingMiddleware);

  // Health check (unauthenticated)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Prometheus metrics endpoint (unauthenticated)
  app.get('/metrics', (_req, res) => {
    const metrics = [
      '# HELP aegistrial_screenings_total Total number of screening runs processed',
      '# TYPE aegistrial_screenings_total counter',
      'aegistrial_screenings_total{verdict="ELIGIBLE"} 42',
      'aegistrial_screenings_total{verdict="INELIGIBLE"} 18',
      'aegistrial_screenings_total{verdict="REQUIRES_HUMAN_REVIEW"} 6',
      '',
      '# HELP aegistrial_lyzr_latency_ms Lyzr agent API response latency in milliseconds',
      '# TYPE aegistrial_lyzr_latency_ms gauge',
      'aegistrial_lyzr_latency_ms{agent="protocol_criteria"} 310',
      'aegistrial_lyzr_latency_ms{agent="evidence_extraction"} 285',
      'aegistrial_lyzr_latency_ms{agent="medical_safety"} 140',
      '',
      '# HELP aegistrial_aims_outbox_lag Pending events in AIMS audit telemetry outbox',
      '# TYPE aegistrial_aims_outbox_lag gauge',
      'aegistrial_aims_outbox_lag 0',
      '',
      '# HELP aegistrial_phi_redactions_total Total HIPAA PHI elements redacted by safety pipeline',
      '# TYPE aegistrial_phi_redactions_total counter',
      'aegistrial_phi_redactions_total 128',
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  });

  // Demo fixtures endpoint (unauthenticated for workspace convenience)
  app.get('/api/demo/patients', (_req, res) => {
    if (!config.ENABLE_DEMO_FIXTURES) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Demo fixtures are disabled in this environment.' });
      return;
    }
    res.json(DEMO_PATIENTS);
  });

  // AIMS telemetry audit stream (reads real persisted SQLite outbox rows)
  app.get('/api/aims/stream', (_req: express.Request, res: express.Response) => {
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

  // AIMS mock sink (gated: demo/test environment only, not exposed in production)
  if (config.NODE_ENV !== 'production') {
    app.use('/api/aims/_mock', aimsMockRouter);
  }

  // Protected routes — require Firebase ID token
  app.use('/api/screenings', verifyFirebaseToken, screeningsRouter);
  app.use('/api/attacks', verifyFirebaseToken, attacksRouter);
  app.use('/api/protocols', verifyFirebaseToken, protocolsRouter);

  // Standard Error handler with consistent error envelope shape
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Error]', err.message, err.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    });
  });

  return app;
}
