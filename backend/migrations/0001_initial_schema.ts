import type { Database } from 'better-sqlite3';

export const name = '0001_initial_schema';

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS protocols (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      protocol_artifact_hash TEXT,
      criteria_hash TEXT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screening_runs (
      run_id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      protocol_id TEXT NOT NULL,
      protocol_hash TEXT NOT NULL,
      protocol_artifact_hash TEXT,
      criteria_hash TEXT,
      evidence_snapshot TEXT,
      verdict TEXT NOT NULL,
      screening_status TEXT NOT NULL,
      aims_delivery_status TEXT NOT NULL,
      proofs_json TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      phi_redaction_count INTEGER DEFAULT 0,
      lyzr_criteria_session_id TEXT,
      lyzr_evidence_session_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stored_artifacts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      raw_output TEXT NOT NULL,
      schema_valid INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aims_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE NOT NULL,
      screening_run_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      outbox_status TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      next_retry_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
}
