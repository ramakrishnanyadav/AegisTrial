/**
 * migrator.ts — Versioned, forward-only SQLite database migration runner.
 * Satisfies Production Directive C.2 & 21 CFR Part 11 database management requirements.
 */

import type { Database } from 'better-sqlite3';
import { getDb } from './database.js';
import * as m1 from '../../migrations/0001_initial_schema.js';
import * as m2 from '../../migrations/0002_add_evidence_snapshot.js';
import * as m3 from '../../migrations/0003_add_protocol_artifact_hash.js';

interface MigrationModule {
  name: string;
  up: (db: Database) => void;
}

const MIGRATIONS: MigrationModule[] = [m1, m2, m3];

export function runMigrations(db: Database = getDb()): void {
  // Ensure schema_migrations exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: string }>;
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.name)) {
      console.log(`[Migrator] Applying database migration: ${migration.name}...`);
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
          migration.name,
          new Date().toISOString(),
        );
      })();
      console.log(`[Migrator] ✅ Migration ${migration.name} applied successfully.`);
    }
  }
}

if (process.argv[1]?.endsWith('migrator.ts') || process.argv[1]?.endsWith('migrator.js')) {
  runMigrations();
}
