/**
 * mockSink.ts — Simulated AIMS-compatible event sink.
 *
 * This is a LOCAL DEMO ENDPOINT. It is NOT connected to any FDA system.
 * It simulates what an AIMS-compatible event receiver would do.
 *
 * Behavior:
 *   - AIMS_SIMULATE_503=false (default): accepts events, returns 200
 *   - AIMS_SIMULATE_503=true: returns 503 (used by Attack 6 demo)
 */

import { Router, type Request, type Response } from 'express';

export const aimsMockRouter = Router();

const receivedEvents: unknown[] = [];

aimsMockRouter.post('/', (req: Request, res: Response) => {
  if (process.env['AIMS_SIMULATE_503'] === 'true') {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Simulated AIMS outage (AIMS_SIMULATE_503=true)' });
    return;
  }

  const event = req.body as unknown;
  receivedEvents.push(event);
  console.log(`[AIMS Mock Sink] Event received. Total: ${receivedEvents.length}`);
  res.status(200).json({ acknowledged: true, eventCount: receivedEvents.length });
});

// Inspection endpoint (demo only)
aimsMockRouter.get('/events', (_req: Request, res: Response) => {
  res.json({ events: receivedEvents, count: receivedEvents.length });
});

aimsMockRouter.delete('/events', (_req: Request, res: Response) => {
  receivedEvents.length = 0;
  res.json({ cleared: true });
});
