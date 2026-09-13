# AegisTrial — System Threat Model (STRIDE Framework)

This document formalizes the threat landscape for AegisTrial using the STRIDE classification model. It identifies threat vectors, existing security controls, residual risk ratings, and mandatory regression tests.

---

## Threat Matrix

| STRIDE Category | Concrete Threat Vector in AegisTrial | Current Architectural Mitigation | Executable Verification / Test | Residual Risk Rating |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | A malicious client claims a Firebase identity or UID it does not possess | Backend verifies Firebase ID tokens via `firebase-admin` on all protected routes (`backend/src/auth/firebaseAdmin.ts`) | `test_forged_uid_is_rejected` in `auth.test.ts` | **LOW** |
| **Tampering** | Direct client write to Firestore or RTDB bypassing backend RBAC and rule engine | `firestore.rules` sets `allow write: if false` on `screenings` and `audit_logs`. `users/{userId}` is strictly field-scoped | `firestore.rules` unit tests | **LOW** |
| **Repudiation** | Principal Investigator or Coordinator denies authorizing a screening verdict | Every evaluation generates a canonical, NFC-normalized, sorted JSON `DecisionProof.artifactHash` stored immutably | `test_decision_proof_is_the_only_render_source` in `invariants.test.ts` | **LOW** |
| **Information Disclosure** | Unredacted PHI reaches external LLM inference endpoints or system log streams | 4-tier fail-closed PHI pipeline (Regex $\rightarrow$ `compromise.js` NER $\rightarrow$ Lyzr Safety Agent $\rightarrow$ Residual Regex Scan) | `test_phi_pipeline_zero_residual_identifiers` & 16 tests in `phi.test.ts` | **LOW** |
| **Information Disclosure** | Live API key or OAuth secret is exposed inside exported distribution archives | Packaging allowlist in `scripts/package.ts` structurally excludes `.env`, `node_modules`, and `.git`. Secret scanner in `check-secrets.ts` | `npm run check-secrets` & `npm run package` CI gate | **LOW** |
| **Denial of Service** | Lyzr API outage, AIMS telemetry failure, or API request-volume abuse draining LLM quota | Bounded exponential backoff on Lyzr client (`errors.ts`), transactional AIMS outbox isolation, and tiered `express-rate-limit` middleware (10 req/min on cost-bearing `/api/screenings` & `/api/protocols`, 60 req/min on query endpoints) | `test_aims_failure_does_not_fail_screening`, `test_aims_503_outage_preserves_screening_completed`, & `test_rate_limiting_enforces_429_past_threshold` | **LOW** |
| **Elevation of Privilege** | Coordinator role attempts to sign off on PI-restricted clinical screening runs | Backend RBAC middleware (`backend/src/auth/rbac.ts`) enforces role hierarchy (`pi` > `coordinator` > `auditor`) | `test_coordinator_cannot_pi_signoff` in `auth.test.ts` | **LOW** |

---

## Maintenance Policy

This threat model is a living document. Any pull request adding a new API endpoint, agent integration, or database collection must update this matrix and add a corresponding invariant regression test before merging to `main`.
