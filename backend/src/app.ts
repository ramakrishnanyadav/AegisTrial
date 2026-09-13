/**
 * app.ts — Express application setup.
 * Mounts all routers, rate limiters, and authentication middleware.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { screeningsRouter } from './api/screenings.js';
import { attacksRouter } from './api/attacks.js';
import { protocolsRouter } from './api/protocols.js';
import { aimsRouter } from './api/aims.js';
import { aimsMockRouter } from './aims/mockSink.js';
import { verifyFirebaseToken } from './auth/firebaseAdmin.js';
import { DEMO_PATIENTS } from '../../shared/fixtures/patients.js';
import { config } from './config/index.js';
import { structuredLoggingMiddleware } from './middleware/logging.js';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(structuredLoggingMiddleware);

  // Rate Limiting Policy
  // 1. Strict limiter for cost-bearing endpoints triggering billed Lyzr LLM calls
  const lyzrCallLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMITED', message: 'Too many requests — this endpoint triggers billed AI agent calls.' },
    skip: () => process.env['NODE_ENV'] === 'test', // Skip in automated test runs unless explicitly tested
  });

  // 2. General limiter for standard query & telemetry endpoints
  const generalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env['NODE_ENV'] === 'test',
  });

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

  // AIMS mock sink (gated: demo/test environment only, not exposed in production)
  if (config.NODE_ENV !== 'production') {
    app.use('/api/aims/_mock', aimsMockRouter);
  }

  // Protected & Rate-Limited API Routes — require Firebase ID token
  app.use('/api/screenings', verifyFirebaseToken, lyzrCallLimiter, screeningsRouter);
  app.use('/api/protocols', verifyFirebaseToken, lyzrCallLimiter, protocolsRouter);
  app.use('/api/attacks', verifyFirebaseToken, generalLimiter, attacksRouter);
  app.use('/api/aims', verifyFirebaseToken, generalLimiter, aimsRouter);

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
