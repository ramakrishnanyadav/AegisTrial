# AegisTrial — System Observability Specification

## Overview

AegisTrial implements a zero-PHI, high-fidelity observability architecture designed for production clinical trial screening environments. Because clinical data and screening decisions are subject to strict regulatory oversight (HIPAA, FDA 21 CFR Part 11, SOC 2), the system enforces clear boundaries between operational telemetry, security events, and patient confidentiality.

---

## 1. Structured Logging Architecture

All HTTP API requests and background outbox workers generate structured JSON log messages. Free-form string interpolation and `console.log` statements are prohibited in production paths.

### Zero-PHI Logging Policy
- **Strict Prohibition**: Raw or redacted clinical text, patient names, dates of birth, MRNs, or clinical narrative notes MUST NEVER be logged.
- **Quantified Redactions Only**: Log lines capture numerical redaction counts (`phiRedactionCount`) emitted by Tier 1 regex patterns, Tier 2 compromise detectors, and Tier 3 deterministic scanners (Note: Microsoft Presidio is NOT used in this architecture).

### JSON Log Line Schema

Every request produces a single-line JSON log object matching the `StructuredLogMessage` interface:

```json
{
  "timestamp": "2026-09-13T18:30:00.123Z",
  "correlationId": "corr-f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "method": "POST",
  "path": "/api/screenings/run",
  "statusCode": 200,
  "latencyMs": 482,
  "runId": "run-98a4f12e",
  "verdict": "ELIGIBLE",
  "phiRedactionCount": 3
}
```

### Correlation Tracing (`x-correlation-id`)
- Every HTTP request accepts an incoming `x-correlation-id` header or autogenerates a UUID version 4 prefixed with `corr-`.
- The correlation ID is attached to the response header `x-correlation-id` and propagated to all downstream AIMS telemetry outbox events and Lyzr API calls.

---

## 2. Metrics Specification (`GET /metrics`)

AegisTrial exposes an unauthenticated Prometheus-formatted endpoint at `GET /metrics` for scraper collection (OpenTelemetry Collector, Prometheus Server, Datadog Agent).

### Metric Definitions

| Metric Name | Type | Description | Labels |
|---|---|---|---|
| `aegistrial_screenings_total` | Counter | Total number of patient screening runs executed | `verdict` (`ELIGIBLE`, `INELIGIBLE`, `REQUIRES_HUMAN_REVIEW`) |
| `aegistrial_lyzr_latency_ms` | Gauge | Execution latency of Lyzr agent micro-services in ms | `agent` (`protocol_criteria`, `evidence_extraction`, `medical_safety`) |
| `aegistrial_aims_outbox_lag` | Gauge | Count of pending audit events in SQLite outbox awaiting delivery | None |
| `aegistrial_phi_redactions_total` | Counter | Total HIPAA PHI elements redacted by multi-tier safety pipeline | None |

### Prometheus Sample Output
```prometheus
# HELP aegistrial_screenings_total Total number of screening runs processed
# TYPE aegistrial_screenings_total counter
aegistrial_screenings_total{verdict="ELIGIBLE"} 42
aegistrial_screenings_total{verdict="INELIGIBLE"} 18
aegistrial_screenings_total{verdict="REQUIRES_HUMAN_REVIEW"} 6

# HELP aegistrial_lyzr_latency_ms Lyzr agent API response latency in milliseconds
# TYPE aegistrial_lyzr_latency_ms gauge
aegistrial_lyzr_latency_ms{agent="protocol_criteria"} 310
aegistrial_lyzr_latency_ms{agent="evidence_extraction"} 285
aegistrial_lyzr_latency_ms{agent="medical_safety"} 140

# HELP aegistrial_aims_outbox_lag Pending events in AIMS audit telemetry outbox
# TYPE aegistrial_aims_outbox_lag gauge
aegistrial_aims_outbox_lag 0

# HELP aegistrial_phi_redactions_total Total HIPAA PHI elements redacted by safety pipeline
# TYPE aegistrial_phi_redactions_total counter
aegistrial_phi_redactions_total 128
```

---

## 3. Error Tracking & Exception Categorization

AegisTrial explicitly differentiates expected clinical workflow outcomes from infrastructure runtime exceptions.

### Distinction Matrix

| Event Type | System Action | Error Sink (Sentry/Datadog) | Log Severity |
|---|---|---|---|
| `REQUIRES_HUMAN_REVIEW` | Fail-closed clinical safety trigger (ambiguous criteria, PHI override) | Ignored / Informational Counter | `INFO` |
| `LYZR_API_TIMEOUT` | Lyzr agent unreachable or rate-limited; fallback to human review | Captured as `LyzrServiceError` | `WARN` / `ERROR` |
| `AIMS_OUTBOX_RETRIES_EXCEEDED` | Audit event max attempts (5) exceeded | Captured as `AimsTelemetryError` | `ERROR` / `CRITICAL` |
| `UNHANDLED_EXPRESSION_CRASH` | Unexpected JS runtime exception or DB connection failure | Captured as `UnhandledServerError` | `CRITICAL` |

---

## 4. Operational Alerting Thresholds

The following manual and automated alert thresholds are established for on-call site reliability engineers:

1. **AIMS Outbox Delivery Lag**:
   - **Threshold**: `aegistrial_aims_outbox_lag > 10` for more than 5 minutes.
   - **Meaning**: AIMS outbox worker is stalled or downstream telemetry collector is unresponsive.
   - **Action**: Check network connectivity to AIMS receiver and verify SQLite lock status.

2. **Lyzr Agent Latency Spike**:
   - **Threshold**: `aegistrial_lyzr_latency_ms{agent="..."} > 5000ms` (p95).
   - **Meaning**: Remote Lyzr agent endpoint degradation.
   - **Action**: Verify API key quotas and agent endpoint health.

3. **High Human Review Rate**:
   - **Threshold**: `REQUIRES_HUMAN_REVIEW` ratio exceeds 30% of total screening runs over 1 hour.
   - **Meaning**: Potential prompt drift, protocol rule ambiguity, or raw PHI scanner over-redaction.
   - **Action**: Inspect redact count logs and conduct audit review of protocol eligibility definitions.
