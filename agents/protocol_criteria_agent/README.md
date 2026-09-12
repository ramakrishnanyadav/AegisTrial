# Protocol Criteria Agent

## Role
Extracts structured `Criterion[]` objects from raw clinical trial protocol text.

## Input
Raw protocol PDF text (chunked). **Contains no PHI** — protocol documents describe eligibility rules, not patient data. The PHI pipeline is NOT applied to protocol text.

## Output
Schema-validated `Criterion[]` array. Every criterion must pass AJV schema validation before entering the pipeline. On repeated schema failure (2 attempts), the protocol is marked `NEEDS_MANUAL_REVIEW`.

## Lyzr Configuration
See `config.json`.

## What This Agent Does NOT Do
- It does NOT extract patient field values. That is the `evidence_extraction_agent`.
- It does NOT produce eligibility verdicts. That is the deterministic rule engine.
- It does NOT see patient EHR text. Ever.
