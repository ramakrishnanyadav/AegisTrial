/**
 * logging.ts — Structured JSON logging middleware for AegisTrial backend.
 *
 * Enforces zero PHI logging policy:
 * Logs metadata, correlation IDs, execution latencies, status codes, and redaction counts.
 * NEVER logs raw or redacted patient text.
 */

import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

export interface StructuredLogMessage {
  timestamp: string;
  correlationId: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  runId?: string;
  phiRedactionCount?: number;
  verdict?: string;
  agentRole?: string;
  error?: string;
}

export function structuredLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startMs = Date.now();
  const correlationId = (req.headers['x-correlation-id'] as string) || `corr-${uuid()}`;
  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    const latencyMs = Date.now() - startMs;
    const logObj: StructuredLogMessage = {
      timestamp: new Date().toISOString(),
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs,
    };

    if (req.body && typeof req.body === 'object') {
      if (req.body.runId) logObj.runId = req.body.runId;
    }

    if (process.env['NODE_ENV'] !== 'test') {
      console.log(JSON.stringify(logObj));
    }
  });

  next();
}
