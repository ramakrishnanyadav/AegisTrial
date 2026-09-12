/**
 * server.ts — AegisTrial backend entry point.
 *
 * Startup sequence:
 *   1. Load environment variables
 *   2. Initialize Firebase Admin SDK
 *   3. Initialize SQLite database (applies schema)
 *   4. Initialize Lyzr agent registry (provisions/loads agent IDs)
 *   5. Start Express server
 *   6. Start AIMS outbox worker
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { initFirebaseAdmin } from './auth/firebaseAdmin.js';
import { getDb } from './db/database.js';
import { agentRegistry } from './lyzr/index.js';
import { processOutbox } from './aims/outbox.js';

const PORT = parseInt(
  process.env['BACKEND_PORT'] ??
    (process.env['NODE_ENV'] === 'production' ? process.env['PORT'] ?? '3000' : '3001'),
  10,
);

async function main(): Promise<void> {
  console.log('[Server] AegisTrial v4 backend starting...');

  // 1. Firebase Admin
  initFirebaseAdmin();

  // 2. Database
  getDb(); // initializes SQLite + applies schema

  // 3. Lyzr agents
  await agentRegistry.initialize();

  // 4. Start server
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    console.log(`[Server] AIMS endpoint: ${process.env['AIMS_ENDPOINT'] ?? 'http://localhost:${PORT}/api/aims/_mock (built-in)'}`);
  });

  // 5. AIMS outbox worker — polls every 30s
  const outboxInterval = setInterval(async () => {
    try {
      await processOutbox();
    } catch (err) {
      console.error('[AIMS Outbox Worker] Error:', err);
    }
  }, 30_000);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    clearInterval(outboxInterval);
    server.close(() => {
      console.log('[Server] Closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
