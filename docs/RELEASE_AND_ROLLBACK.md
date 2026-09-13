# AegisTrial — Release & Rollback Discipline Guide

## 1. Versioning Standard

AegisTrial strictly enforces [Semantic Versioning 2.0.0](https://semver.org/):
- **MAJOR** (`vX.0.0`): Incompatible API changes, DB schema migrations requiring downtime, or safety policy changes that break existing client contracts.
- **MINOR** (`v1.X.0`): Backwards-compatible new features, new agent evaluations, or optional telemetry endpoints.
- **PATCH** (`v1.0.X`): Backwards-compatible bug fixes, security patches, or documentation updates.

Every release must update `package.json`, `backend/package.json`, and `CHANGELOG.md` simultaneously.

---

## 2. Release & Tagging Workflow

### Step 1: Pre-Release Verification
Before tagging any commit, the full quality gate must pass on the local workstation:

```bash
# 1. Run all backend invariant and unit tests
npm test --prefix backend

# 2. Run deterministic secret scanner
npm run check-secrets

# 3. Verify TypeScript build
npm run build

# 4. Build clean allowlist release artifact
npm run package
```

### Step 2: Git Tagging
Releases are built ONLY from tagged commits. Uncommitted working trees or untagged commits are prohibited from production distribution.

```bash
# Commit final release changes
git add .
git commit -m "chore(release): prepare v1.0.0 release"

# Tag the commit
git tag -a v1.0.0 -m "AegisTrial v1.0.0 Production-Grade Release"

# Push commit and tag to GitHub
git push origin main
git push origin v1.0.0
```

### Step 3: CI Artifact Verification
The GitHub Actions `ci.yml` pipeline automatically builds the `aegistrial.zip` package upon tag push, verifies that 0 secrets exist, runs the 47 invariant tests, and attaches `aegistrial.zip` to the GitHub Release.

---

## 3. Rollback Procedure

Because AegisTrial utilizes an **Idempotent Transactional Outbox Pattern** and **Backward-Compatible SQLite Schema Migrations**, rolling back a release does not corrupt in-flight patient screening runs or telemetry audit logs.

### Outbox & Idempotency Safety During Rollback
1. **In-Flight Screening Runs**: Screening runs store their deterministic `runId` and state in SQLite. If a deployment rolls back from `v1.0.1` to `v1.0.0`, any pending screening run with status `IN_PROGRESS` or `REQUIRES_HUMAN_REVIEW` can be safely resumed by `v1.0.0` without duplicate processing.
2. **AIMS Telemetry Outbox Events**: Outbox events recorded by `v1.0.1` use JSON payloads with schema-version headers. `v1.0.0` outbox workers continue to deliver existing outbox rows because outbox database rows are append-only.

### Rollback Steps

1. **Revert Git Deployment**:
   ```bash
   # Checkout previous known-good tag
   git checkout v1.0.0
   ```

2. **Database Schema Verification**:
   The SQLite database migration engine (`backend/src/db/migrator.ts`) uses schema version tracking table `schema_migrations`. Migrations are additive (`0001_initial.sql`, `0002_add_hash.sql`). Reverting backend code to `v1.0.0` requires no destructive DB rollback because new columns permit `NULL` or have default values.

3. **Restart Backend Service**:
   ```bash
   npm run start --prefix backend
   ```

4. **Verify Telemetry & Health**:
   - Check `GET /health` returns `200 OK`.
   - Check `GET /metrics` shows `aegistrial_aims_outbox_lag == 0`.
   - Run backend test suite `npm test --prefix backend` to confirm zero regression.
