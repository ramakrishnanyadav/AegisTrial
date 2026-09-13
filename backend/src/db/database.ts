/**
 * database.ts — SQLite database initialization and default protocol seeding.
 * Uses better-sqlite3 (synchronous API — makes "same transaction" trivial to reason about).
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Criterion, CriterionType } from '../domain/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env['AEGIS_DB_PATH'] ?? path.resolve(process.cwd(), 'aegistrial.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let _db: Database.Database | null = null;

function seedDefaultProtocols(db: Database.Database): void {
  const check = db.prepare('SELECT COUNT(*) as count FROM protocols').get() as { count: number };
  if (check && check.count > 0) {
    return; // Protocols already seeded
  }

  console.log('[DB] Seeding default clinical trial protocols into SQLite...');

  const t2dCriteria: Criterion[] = [
    {
      criterionId: 'INC-01',
      type: CriterionType.INCLUSION,
      field: 'age',
      operator: '>=',
      threshold: 18,
      unit: 'years',
      sourceRef: { docId: 'PROTO-T2D-CKD-001', textExcerpt: 'Adult patients aged 18 to 75 years inclusive at screening.' },
    },
    {
      criterionId: 'INC-02',
      type: CriterionType.INCLUSION,
      field: 'hba1c',
      operator: '>=',
      threshold: 7.0,
      unit: '%',
      sourceRef: { docId: 'PROTO-T2D-CKD-001', textExcerpt: 'Documented Type 2 Diabetes Mellitus with baseline HbA1c 7.0% to 10.5%.' },
    },
    {
      criterionId: 'INC-03',
      type: CriterionType.INCLUSION,
      field: 'egfr',
      operator: '>=',
      threshold: 30,
      unit: 'mL/min/1.73m2',
      sourceRef: { docId: 'PROTO-T2D-CKD-001', textExcerpt: 'Estimated Glomerular Filtration Rate (eGFR) 30 to 60 mL/min/1.73m2.' },
    },
    {
      criterionId: 'EXC-01',
      type: CriterionType.EXCLUSION,
      field: 'alt',
      operator: '>',
      threshold: 120,
      unit: 'U/L',
      sourceRef: { docId: 'PROTO-T2D-CKD-001', textExcerpt: 'Serum ALT > 3x ULN (>120 U/L) at screening.' },
    },
  ];

  const nsclcCriteria: Criterion[] = [
    {
      criterionId: 'IC-01',
      type: CriterionType.INCLUSION,
      field: 'anc',
      operator: '>=',
      threshold: 1500,
      unit: 'cells/μL',
      temporalWindow: 'within 28 days',
      sourceRef: { docId: 'NCT04821', textExcerpt: 'ANC ≥ 1,500 cells/μL within 28 days prior to enrollment' },
    },
    {
      criterionId: 'IC-02',
      type: CriterionType.INCLUSION,
      field: 'egfr',
      operator: '>=',
      threshold: 60,
      unit: 'mL/min/1.73m²',
      temporalWindow: 'within 28 days',
      sourceRef: { docId: 'NCT04821', textExcerpt: 'eGFR ≥ 60 mL/min/1.73m² within 28 days prior to enrollment' },
    },
    {
      criterionId: 'EC-01',
      type: CriterionType.EXCLUSION,
      field: 'alt',
      operator: '>',
      threshold: 3.0,
      unit: 'x_uln',
      sourceRef: { docId: 'NCT04821', textExcerpt: 'ALT > 3.0 × ULN at screening' },
    },
  ];

  const stmt = db.prepare(
    `INSERT OR REPLACE INTO protocols (id, hash, protocol_artifact_hash, criteria_hash, name, criteria_json, raw_text, ingested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const now = new Date().toISOString();

  const t2dRawText = `Phase 3 Study of Aegis-101 in Adult Patients with Type 2 Diabetes and Moderate Chronic Kidney Disease. Adult patients aged 18 to 75 years inclusive at screening with documented HbA1c 7.0% to 10.5% and eGFR 30 to 60 mL/min/1.73m2. Exclusion: Serum ALT > 3x ULN (>120 U/L).`;
  const t2dArtifactHash = crypto.createHash('sha256').update(t2dRawText).digest('hex');
  const t2dCriteriaHash = crypto.createHash('sha256').update(JSON.stringify(t2dCriteria)).digest('hex');
  stmt.run('PROTO-T2D-CKD-001', t2dCriteriaHash, t2dArtifactHash, t2dCriteriaHash, 'Phase 3 Type 2 Diabetes & CKD Trial', JSON.stringify(t2dCriteria), t2dRawText, now);

  const nsclcRawText = `Phase 3 NSCLC Trial Protocol. ANC >= 1,500 cells/uL within 28 days prior to enrollment. eGFR >= 60 mL/min/1.73m2 within 28 days prior to enrollment. Exclusion: ALT > 3.0 x ULN at screening.`;
  const nsclcArtifactHash = crypto.createHash('sha256').update(nsclcRawText).digest('hex');
  const nsclcCriteriaHash = crypto.createHash('sha256').update(JSON.stringify(nsclcCriteria)).digest('hex');
  stmt.run('NCT04821', nsclcCriteriaHash, nsclcArtifactHash, nsclcCriteriaHash, 'Phase 3 NSCLC Trial Protocol', JSON.stringify(nsclcCriteria), nsclcRawText, now);

  console.log('[DB] Seeding default protocols completed.');
}

import { runMigrations } from './migrator.js';

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { verbose: process.env['NODE_ENV'] === 'development' ? console.log : undefined });

    // Apply schema via versioned migrations
    runMigrations(_db);

    // Apply legacy schema sync for existing table compatibility
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    _db.exec(schema);

    // Seed default protocol criteria
    seedDefaultProtocols(_db);

    console.log(`[DB] SQLite initialized at ${DB_PATH}`);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
