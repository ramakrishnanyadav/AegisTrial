-- AegisTrial v4 — SQLite Schema
-- 
-- NOTE: SQLite provides transactional ACID semantics sufficient for the
-- single-instance P0 demo. PostgreSQL remains the intended production
-- persistence layer. No design decisions prevent migration.
--
-- CRITICAL: The screening_runs and aims_outbox tables MUST be written
-- in the SAME transaction so that a screening is never "COMPLETED"
-- without a corresponding outbox row, and vice versa.

PRAGMA journal_mode=WAL;     -- Write-Ahead Logging for better concurrency
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;   -- Safe for WAL mode

-- ---------------------------------------------------------------------------
-- Protocols
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocols (
  id                      TEXT PRIMARY KEY,                  -- e.g. "NCT04821"
  hash                    TEXT NOT NULL,                     -- legacy criteria hash
  protocol_artifact_hash  TEXT,                              -- sha256 of raw protocol document/text
  criteria_hash           TEXT,                              -- sha256 of criteria_json
  name                    TEXT NOT NULL,
  criteria_json           TEXT NOT NULL,                     -- JSON: Criterion[]
  raw_text                TEXT NOT NULL DEFAULT '',
  ingested_at             TEXT NOT NULL                      -- ISO-8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_protocols_hash ON protocols(hash);

-- ---------------------------------------------------------------------------
-- Idempotency Keys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key             TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL,
  patient_id      TEXT NOT NULL,
  protocol_id     TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Screening Runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screening_runs (
  run_id                   TEXT PRIMARY KEY,
  idempotency_key          TEXT NOT NULL UNIQUE REFERENCES idempotency_keys(key),
  patient_id               TEXT NOT NULL,
  protocol_id              TEXT NOT NULL REFERENCES protocols(id),
  protocol_hash            TEXT NOT NULL,
  protocol_artifact_hash   TEXT,
  criteria_hash            TEXT,
  evidence_snapshot        TEXT NOT NULL DEFAULT '[]',-- JSON: PatientField[] independent snapshot
  verdict                  TEXT NOT NULL CHECK(verdict IN ('ELIGIBLE','INELIGIBLE','REQUIRES_HUMAN_REVIEW')),
  screening_status         TEXT NOT NULL CHECK(screening_status IN ('PENDING','RUNNING','COMPLETED','REQUIRES_HUMAN_REVIEW','SYSTEM_ERROR')),
  aims_delivery_status     TEXT NOT NULL CHECK(aims_delivery_status IN ('DELIVERED','PENDING','RETRYING','FAILED','NOT_CONFIGURED')),
  proofs_json              TEXT NOT NULL,            -- JSON: DecisionProof[]
  sha256                   TEXT NOT NULL,
  phi_redaction_count      INTEGER NOT NULL DEFAULT 0,
  lyzr_criteria_session_id TEXT NOT NULL DEFAULT '',
  lyzr_evidence_session_id TEXT NOT NULL DEFAULT '',
  created_at               TEXT NOT NULL             -- ISO-8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_runs_patient ON screening_runs(patient_id);
CREATE INDEX IF NOT EXISTS idx_runs_protocol ON screening_runs(protocol_id);
CREATE INDEX IF NOT EXISTS idx_runs_verdict ON screening_runs(verdict);

-- ---------------------------------------------------------------------------
-- Stored LLM Artifacts (for reproducibility)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stored_artifacts (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES screening_runs(run_id),
  agent_role      TEXT NOT NULL,
  agent_id        TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  raw_output      TEXT NOT NULL,                     -- verbatim LLM response
  schema_valid    INTEGER NOT NULL DEFAULT 1,        -- 1=true, 0=false
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run ON stored_artifacts(run_id);

-- ---------------------------------------------------------------------------
-- AIMS Outbox
-- ---------------------------------------------------------------------------
-- INVARIANT: aims_delivery_status in screening_runs tracks AIMS status.
-- The outbox row is written in the SAME transaction as the screening_run row.
-- AIMS failure NEVER changes screening_status.

CREATE TABLE IF NOT EXISTS aims_outbox (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES screening_runs(run_id),
  event_type      TEXT NOT NULL,
  event_json      TEXT NOT NULL,                     -- JSON: AimsEvent
  status          TEXT NOT NULL CHECK(status IN ('PENDING','RETRYING','DELIVERED','FAILED')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  next_retry_at   TEXT,                              -- ISO-8601 UTC
  delivered_at    TEXT,                              -- ISO-8601 UTC
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON aims_outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_retry  ON aims_outbox(next_retry_at) WHERE status IN ('PENDING','RETRYING');
