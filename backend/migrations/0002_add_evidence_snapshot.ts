import type { Database } from 'better-sqlite3';

export const name = '0002_add_evidence_snapshot';

export function up(db: Database): void {
  const columnCheck = db.prepare("PRAGMA table_info(screening_runs)").all() as Array<{ name: string }>;
  const hasCol = columnCheck.some((c) => c.name === 'evidence_snapshot');
  if (!hasCol) {
    db.exec(`ALTER TABLE screening_runs ADD COLUMN evidence_snapshot TEXT;`);
  }
}
