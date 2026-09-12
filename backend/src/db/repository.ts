/**
 * repository.ts — Typed repository functions for all database operations.
 * All writes that must be atomic use db.transaction() (better-sqlite3 feature).
 */

import type { Database } from 'better-sqlite3';
import type {
  ScreeningRun,
  Criterion,
  PatientField,
  StoredLlmArtifact,
  AimsEvent,
  AimsDeliveryStatus,
} from '../domain/types.js';
import { getDb } from './database.js';

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

export interface ProtocolRow {
  id: string;
  hash: string;
  protocol_artifact_hash?: string;
  criteria_hash?: string;
  name: string;
  criteria_json: string;
  raw_text?: string;
  ingested_at: string;
}

export function upsertProtocol(
  id: string,
  name: string,
  hash: string,
  criteria: Criterion[],
  rawText = '',
  protocolArtifactHash = '',
  criteriaHash = '',
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO protocols (id, hash, protocol_artifact_hash, criteria_hash, name, criteria_json, raw_text, ingested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       hash=excluded.hash,
       protocol_artifact_hash=excluded.protocol_artifact_hash,
       criteria_hash=excluded.criteria_hash,
       name=excluded.name,
       criteria_json=excluded.criteria_json,
       raw_text=excluded.raw_text`,
  ).run(id, hash, protocolArtifactHash || hash, criteriaHash || hash, name, JSON.stringify(criteria), rawText, new Date().toISOString());
}

export function listProtocols(): ProtocolRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM protocols ORDER BY ingested_at DESC').all() as ProtocolRow[];
}

export function getProtocol(id: string): ProtocolRow | null {
  const db = getDb();
  return db.prepare('SELECT * FROM protocols WHERE id = ?').get(id) as ProtocolRow | null;
}

export function getProtocolByHash(hash: string): ProtocolRow | null {
  const db = getDb();
  return db.prepare('SELECT * FROM protocols WHERE hash = ? OR criteria_hash = ? OR protocol_artifact_hash = ?').get(hash, hash, hash) as ProtocolRow | null;
}

export function getCriteriaForProtocol(id: string): Criterion[] {
  const row = getProtocol(id);
  if (!row) return [];
  return JSON.parse(row.criteria_json) as Criterion[];
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

export interface IdempotencyRow {
  key: string;
  run_id: string;
  patient_id: string;
  protocol_id: string;
  created_at: string;
}

export function getIdempotencyKey(key: string): IdempotencyRow | null {
  const db = getDb();
  return db.prepare('SELECT * FROM idempotency_keys WHERE key = ?').get(key) as IdempotencyRow | null;
}

// ---------------------------------------------------------------------------
// Screening Runs (atomic write: run + idempotency + outbox in same txn)
// ---------------------------------------------------------------------------

export interface CreateRunParams {
  run: ScreeningRun;
  aimsEventJson: string;
}

export function createScreeningRun(params: CreateRunParams): void {
  const db = getDb();
  const { run } = params;

  const insert = db.transaction(() => {
    // 1. Idempotency key
    db.prepare(
      `INSERT INTO idempotency_keys (key, run_id, patient_id, protocol_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(run.idempotencyKey, run.runId, run.patientId, run.protocolId, run.timestampUtc);

    // 2. Screening run
    db.prepare(
      `INSERT INTO screening_runs
       (run_id, idempotency_key, patient_id, protocol_id, protocol_hash,
        protocol_artifact_hash, criteria_hash, evidence_snapshot,
        verdict, screening_status, aims_delivery_status, proofs_json, sha256,
        phi_redaction_count, lyzr_criteria_session_id, lyzr_evidence_session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      run.runId,
      run.idempotencyKey,
      run.patientId,
      run.protocolId,
      run.protocolHash,
      run.protocolArtifactHash || run.protocolHash,
      run.criteriaHash || run.protocolHash,
      JSON.stringify(run.evidenceSnapshot || []),
      run.verdict,
      run.screeningStatus,
      run.aimsDeliveryStatus,
      JSON.stringify(run.decisionProof),
      run.sha256,
      run.phiRedactionCount,
      run.lyzrCriteriaSessionId,
      run.lyzrEvidenceSessionId,
      run.timestampUtc,
    );

    // 3. AIMS outbox row — same transaction, non-negotiable
    if (params.aimsEventJson) {
      const eventId = `evt-${run.runId}`;
      db.prepare(
        `INSERT INTO aims_outbox (id, run_id, event_type, event_json, status, attempts, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', 0, ?)`,
      ).run(eventId, run.runId, 'SCREENING_INITIATED', params.aimsEventJson, run.timestampUtc);
    }
  });

  insert();
}

export function getScreeningRun(runId: string): ScreeningRun | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM screening_runs WHERE run_id = ?').get(runId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return dbRowToScreeningRun(row);
}

export function listRecentScreeningRuns(limit = 50): ScreeningRun[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM screening_runs ORDER BY created_at DESC LIMIT ?').all(limit) as Record<string, unknown>[];
  return rows.map(dbRowToScreeningRun);
}

export function updateAimsDeliveryStatus(runId: string, status: AimsDeliveryStatus): void {
  const db = getDb();
  db.prepare('UPDATE screening_runs SET aims_delivery_status = ? WHERE run_id = ?').run(status, runId);
}

function dbRowToScreeningRun(row: Record<string, unknown>): ScreeningRun {
  let evidenceSnapshot: PatientField[] = [];
  if (row['evidence_snapshot']) {
    try {
      evidenceSnapshot = JSON.parse(row['evidence_snapshot'] as string);
    } catch {
      evidenceSnapshot = [];
    }
  }

  return {
    runId: row['run_id'] as string,
    idempotencyKey: row['idempotency_key'] as string,
    patientId: row['patient_id'] as string,
    protocolId: row['protocol_id'] as string,
    protocolHash: row['protocol_hash'] as string,
    protocolArtifactHash: (row['protocol_artifact_hash'] as string) || (row['protocol_hash'] as string),
    criteriaHash: (row['criteria_hash'] as string) || (row['protocol_hash'] as string),
    evidenceSnapshot,
    verdict: row['verdict'] as ScreeningRun['verdict'],
    screeningStatus: row['screening_status'] as ScreeningRun['screeningStatus'],
    aimsDeliveryStatus: row['aims_delivery_status'] as ScreeningRun['aimsDeliveryStatus'],
    decisionProof: JSON.parse(row['proofs_json'] as string) as ScreeningRun['decisionProof'],
    sha256: row['sha256'] as string,
    phiRedactionCount: row['phi_redaction_count'] as number,
    lyzrCriteriaSessionId: row['lyzr_criteria_session_id'] as string,
    lyzrEvidenceSessionId: row['lyzr_evidence_session_id'] as string,
    timestampUtc: row['created_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// Stored Artifacts
// ---------------------------------------------------------------------------

export function saveArtifact(artifact: StoredLlmArtifact): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO stored_artifacts
     (id, run_id, agent_role, agent_id, session_id, raw_output, schema_valid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    artifact.id,
    artifact.runId,
    artifact.agentRole,
    artifact.agentId,
    artifact.sessionId,
    artifact.rawOutput,
    artifact.schemaValid ? 1 : 0,
    artifact.timestampUtc,
  );
}

export function getArtifactsForRun(runId: string): StoredLlmArtifact[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM stored_artifacts WHERE run_id = ?').all(runId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r['id'] as string,
    runId: r['run_id'] as string,
    agentRole: r['agent_role'] as StoredLlmArtifact['agentRole'],
    agentId: r['agent_id'] as string,
    sessionId: r['session_id'] as string,
    rawOutput: r['raw_output'] as string,
    schemaValid: (r['schema_valid'] as number) === 1,
    timestampUtc: r['created_at'] as string,
  }));
}

// ---------------------------------------------------------------------------
// AIMS Outbox
// ---------------------------------------------------------------------------

export interface OutboxRow {
  id: string;
  run_id: string;
  event_type: string;
  event_json: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export function getPendingOutboxRows(limit = 20): OutboxRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM aims_outbox
       WHERE status IN ('PENDING','RETRYING')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
       LIMIT ?`,
    )
    .all(new Date().toISOString(), limit) as OutboxRow[];
}

export function markOutboxDelivered(id: string): void {
  const db = getDb();
  const db2 = db as Database;
  db2.prepare(
    `UPDATE aims_outbox SET status='DELIVERED', delivered_at=?, attempts=attempts+1 WHERE id=?`,
  ).run(new Date().toISOString(), id);
}

export function markOutboxRetry(id: string, nextRetryAt: string, failed: boolean): void {
  const db = getDb();
  const status = failed ? 'FAILED' : 'RETRYING';
  db.prepare(
    `UPDATE aims_outbox SET status=?, next_retry_at=?, attempts=attempts+1 WHERE id=?`,
  ).run(status, nextRetryAt, id);
}

export function listAllOutboxRows(limit = 50): OutboxRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM aims_outbox ORDER BY created_at DESC LIMIT ?').all(limit) as OutboxRow[];
}
