# Changelog

All notable changes to the AegisTrial platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-13

### Safety & Security
- **Multi-Tier PHI Redaction Pipeline**: Implemented 4-tier fail-closed PHI defense (regex, compromise rules, Presidio, deterministic hashing) guaranteeing zero raw PHI reaches downstream LLM contexts or logs.
- **Fail-Closed Gate Evaluation**: Ensured any missing clinical criteria, unparseable responses, or ambiguous protocol rules default to `REQUIRES_HUMAN_REVIEW` rather than permissive approval.
- **Role-Based Access Control (RBAC)**: Enforced strict privilege boundaries in backend API routes preventing Coordinators from executing PI-only trial sign-off operations (`test_coordinator_cannot_pi_signoff`).
- **Deterministic Secret Elimination**: Integrated `scripts/check-secrets.ts` pre-commit scanner and explicit allowlist packaging (`scripts/package.ts`) to structurally prevent live API keys or OAuth secrets from bundling.
- **STRIDE Threat Model**: Formalized system threat mitigations and residual risks in [`docs/THREAT_MODEL.md`](file:///c:/Users/Ramakrishna/OneDrive/Pictures/java/Documents/Projects/Lyzr/aegistrial/docs/THREAT_MODEL.md).

### Feature
- **Proof-of-Eligibility Verification**: Added cryptographic sha256 decision hashes (`DecisionProof.artifactHash`) and sign-off attestation flows.
- **Public Verification Endpoint**: Exposed unauthenticated `/api/public/verify/:artifactHash` allowing third-party audit of decision proofs without revealing patient identity.
- **FHIR R4 Patient Fixtures**: Added `/api/fixtures/fhir/:patientId` endpoint serving standardized FHIR R4 Bundle resources for integration testing.
- **HITL Webhook Receptor**: Built `/api/webhooks/hitl` webhook receiver with HMAC signature verification for human-in-the-loop sign-off events.
- **Prometheus Metrics**: Added `/metrics` endpoint serving real-time telemetry on screening counts, Lyzr latencies, AIMS outbox lag, and PHI redaction counts.

### Fix
- **SQLite Schema Migration Engine**: Added idempotent file-based migration runner (`backend/src/db/migrator.ts`) handling versioned DB migrations (`0001` to `0003`) cleanly on startup.
- **AIMS Telemetry Outbox**: Wired transactional outbox pattern preventing audit log data loss during transient network partitions or AIMS receiver outages.
- **Structured JSON Logging**: Implemented `structuredLoggingMiddleware` injecting `x-correlation-id` and eliminating free-form string logging across all routes.

### Governance
- **Secret Exposure Postmortem**: Published formal incident analysis in [`docs/postmortems/2026-09-secret-exposure.md`](file:///c:/Users/Ramakrishna/OneDrive/Pictures/java/Documents/Projects/Lyzr/aegistrial/docs/postmortems/2026-09-secret-exposure.md) documenting root causes and 3 verified structural controls.
- **CI/CD Integration**: Configured GitHub Actions workflows (`ci.yml` and `nightly.yml`) enforcing secret scanning, invariant test suites (47/47 passing), TypeScript verification, and clean artifact builds on every PR.
