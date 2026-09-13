# AegisTrial — Software Testing & Quality Assurance Documentation

This document defines the Software Testing & Quality Assurance (STQA) framework for AegisTrial — an architecture designed to guarantee that clinical screening verdicts and audit trails remain provable, deterministic, and safe against adversarial conditions.

---

## 1. Risk-Based Testing Strategy

In regulated clinical environments, test coverage metrics alone are insufficient. AegisTrial uses a **risk-based test taxonomy** where every safety invariant is backed by executable tests that attempt to break system constraints.

```
                  ┌────────────────────────┐
                  │    Security & Chaos    │  (Fault-injection, AIMS Outage, Prompt Injection)
               ┌──┴────────────────────────┴──┐
               │    Contract & Parity Tests   │  (Schema Parity, Error Envelopes, Enum Parity)
            ┌──┴──────────────────────────────┴──┐
            │     PHI Redaction Suite (18 Cat)   │  (Regex, compromise.js NER, Residual Scans)
         ┌──┴────────────────────────────────────┴──┐
         │     Architecture Invariants (20 Tests)   │  (Determinism, Unit Normalization, Replay)
      └──┴──────────────────────────────────────────┴──┘
```

---

## 2. STQA Traceability Matrix

| Risk Tier | Category | Claim / Invariant | Executable Test | Location | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | Patient Safety | LLM prose cannot set or override eligibility verdict | `test_llm_cannot_return_final_verdict` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Unit conversions must use deterministic lookup tables | `test_unit_engine_requires_deterministic_conversion` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Missing mandatory evidence cannot yield ELIGIBLE | `test_missing_evidence_cannot_return_eligible` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Ambiguous ontology mappings trigger human review | `test_ambiguous_ontology_cannot_return_eligible` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Conflicting lab readings within window force review | `test_conflicting_lab_values_cannot_return_eligible` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Policy blocks cannot be overridden downstream | `test_policy_cannot_override_unit_block` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Exclusion-not-met never generates inclusion reason codes | `test_exclusion_not_met_never_returns_inclusion_reason_code` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Empty criteria set forces human review | `test_empty_criteria_set_returns_requires_human_review` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Omitted timestamp on temporal window forces review | `test_missing_timestamp_temporal_criterion_requires_review` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 0** | Patient Safety | Conflict detection operates on unit-normalized values | `test_conflict_detection_operates_on_normalized_units` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 1** | Data Protection | PHI pipeline guarantees zero residual identifiers | `test_phi_pipeline_zero_residual_identifiers` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 1** | Data Protection | 4-tier redaction correctly redacts 18 Safe Harbor types | `phi.test.ts` (16 test cases) | `backend/tests/phi.test.ts` | ✅ PASS |
| **Tier 2** | Auditability | AI-free audit replay executes with 0 LLM calls | `test_replay_does_not_call_llm` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 2** | Auditability | Replay evaluates independent evidence snapshot | `test_replay_uses_independent_evidence_snapshot...` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 2** | Auditability | Duplicate idempotency key returns cached screening run | `test_duplicate_idempotency_key_returns_same_run` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 2** | Auditability | Protocol artifact hash is distinct from criteria hash | `test_protocol_artifact_hash_differs_from_criteria_hash` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 3** | Resilience | AIMS telemetry outage does not affect local verdict | `test_aims_failure_does_not_fail_screening` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 3** | Resilience | AIMS 503 outage preserves COMPLETED state + outbox | `test_aims_503_outage_preserves_screening_completed` | `backend/tests/chaos/` | ✅ PASS |
| **Tier 3** | Resilience | Lyzr error classification (Timeout / Auth / Rate Limit) | `test_lyzr_error_classification` | `backend/tests/chaos/` | ✅ PASS |
| **Tier 4** | Access Control | `AUTH_MODE=development` forbidden under `NODE_ENV=production` | `test_auth_mode_development_cannot_start_with...` | `backend/tests/invariants/` | ✅ PASS |
| **Tier 4** | Access Control | RBAC: Coordinator role cannot perform PI sign-off | `test_coordinator_cannot_pi_signoff` | `backend/tests/invariants/auth.test.ts` | ✅ PASS |
| **Tier 5** | Product Parity | Screening request Zod schema validation parity | `test_screening_request_contract` | `backend/tests/contracts/` | ✅ PASS |
| **Tier 5** | Product Parity | Canonical attack ID enum parity across frontend/backend | `test_attack_id_enum_parity` | `backend/tests/contracts/` | ✅ PASS |
| **Tier 5** | Product Parity | `DecisionProof` shape parity across UI/PDF/JSON renderers | `test_decision_proof_shape_parity` | `backend/tests/contracts/` | ✅ PASS |
| **Tier 5** | Product Parity | Standardized error envelope schema parity | `test_error_envelope_shape_parity` | `backend/tests/contracts/` | ✅ PASS |

---

## 3. Synthetic Patient Fixtures Matrix

Canonical test fixtures are located in `shared/fixtures/patients.ts` and `backend/tests/fixtures/patients.ts`:

| Fixture ID | Patient Profile & Target Vector | Expected Verdict / System Behavior |
| :--- | :--- | :--- |
| `PAT-001` | Standard eligible patient (T2D + moderate CKD) | `ELIGIBLE` |
| `PAT-002` | Omitted eGFR laboratory reading | `REQUIRES_HUMAN_REVIEW` (Missing mandatory evidence) |
| `PAT-003` | HbA1c in UK NHS units (`mmol/mol`) vs US protocol (`%`) | `ELIGIBLE` (Converted via deterministic unit table) |
| `PAT-004` | Conflicting serum creatinine readings within 24h window | `REQUIRES_HUMAN_REVIEW` (Conflicting evidence) |
| `PAT-005` | EHR containing raw HIPAA PHI (Name, SSN, MRN, Address) | Redacted post-PHI scan, zero leaked PHI |
| `PAT-006` | Lab reading with missing timestamp on temporal criterion | `REQUIRES_HUMAN_REVIEW` (Temporal evaluation failure) |
| `PAT-007` | Prompt injection payload attempting system role override | Neutralized; text treated as inert patient narrative |
| `PAT-008` | Zero criteria protocol definition | `REQUIRES_HUMAN_REVIEW` (Empty criteria set error) |

---

## 4. Defect Severity & Response SLAs

| Severity Tier | Definition & Impact | SLA Target | CI Policy |
| :--- | :--- | :--- | :--- |
| **Sev 0 — Safety** | Violation of eligibility rule safety or PHI leakage | Immediate (Block Release) | Mandatory Invariant Test |
| **Sev 1 — Critical** | Auditability failure, hash mismatch, or contract drift | 24 Hours | Mandatory Contract Test |
| **Sev 2 — Major** | Degraded performance or non-blocking API fault | 48 Hours | Integration Test |
| **Sev 3 — Minor** | UI formatting or non-clinical copy issue | Next Sprint | Unit / Component Test |

---

## 5. Verification Commands

Run the complete verification pipeline locally:

```bash
# Execute full backend invariant & unit test suite (47/47 tests)
npm test --prefix backend

# Execute TypeScript static type analysis
npm run lint

# Perform secret scan across repository tree
npm run check-secrets

# Build clean distribution archive from explicit allowlist
npm run package
```
