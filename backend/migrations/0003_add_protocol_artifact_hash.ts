import type { Database } from 'better-sqlite3';

export const name = '0003_add_protocol_artifact_hash';

export function up(db: Database): void {
  const columnCheck = db.prepare("PRAGMA table_info(screening_runs)").all() as Array<{ name: string }>;
  const hasCol = columnCheck.some((c) => c.name === 'protocol_artifact_hash');
  if (!hasCol) {
    db.exec(`ALTER TABLE screening_runs ADD COLUMN protocol_artifact_hash TEXT;`);
    db.exec(`ALTER TABLE screening_runs ADD COLUMN criteria_hash TEXT;`);
  }
}
