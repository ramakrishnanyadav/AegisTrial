# AegisTrial — Data Architecture & Migration Plan

This document details the database architecture, versioned migration tooling, and the migration path from SQLite to PostgreSQL.

---

## 1. Database Architecture & Audit Logging

AegisTrial uses SQLite with `better-sqlite3` in WAL mode for synchronous, zero-latency transaction guarantees.

```
                    ┌─────────────────────────┐
                    │    SQLite (aegistrial)  │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
    ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
    │  protocols   │     │screening_runs│     │  aims_outbox    │
    └──────────────┘     └──────────────┘     └─────────────────┘
```

Every screening execution atomically writes the `ScreeningRun` and an `aims_outbox` telemetry event inside a single `db.transaction()`.

---

## 2. Versioned Migration Tooling

Schema modifications are managed via versioned migration files located in `backend/migrations/`:

```
backend/migrations/
├── 0001_initial_schema.ts
├── 0002_add_evidence_snapshot.ts
└── 0003_add_protocol_artifact_hash.ts
```

### Applying Migrations
Migrations are applied automatically on backend startup via `runMigrations()` in `backend/src/db/migrator.ts` or manually via:

```bash
npm run migrate --prefix backend
```

Applied migrations are tracked in the `schema_migrations` table.

---

## 3. SQLite $\rightarrow$ PostgreSQL Cutover Specification

When AegisTrial transitions to multi-region cloud deployment:

1. **ORM / Driver Cutover**:
   - `better-sqlite3` transactions map directly to PostgreSQL `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
   - Migration files in `backend/migrations/` translate cleanly to SQL files compatible with `node-pg-migrate` or `Knex`.

2. **JSON Data Column Types**:
   - SQLite `TEXT` columns storing `proofs_json`, `criteria_json`, and `evidence_snapshot` map to PostgreSQL `jsonb` column types.

3. **Concurrency & Telemetry**:
   - `aims_outbox` table pattern maps to PostgreSQL LISTEN/NOTIFY or PG-boss queues for background telemetry streaming.
