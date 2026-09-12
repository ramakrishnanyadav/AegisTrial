# PHI Safety Pipeline

## Why This Is NOT a Lyzr Agent

An LLM must never be the sole gate responsible for redacting the data that an LLM is about to see.

If the PHI scrubber were an agent, a Lyzr failure (timeout, 5xx) would force a choice between:
- Sending unredacted patient data to the inference LLM (unacceptable)
- Aborting the screening (correct, but fragile if the only gate)

By making the pipeline deterministic in tiers 1-2 (regex + NER), PHI is always stripped before any LLM call is even attempted. Tiers 3-4 (Lyzr Safe AI + residual scan) add defense-in-depth.

## 4-Tier Architecture

```
Tier 1: Regex Detection (deterministic, always runs)
  → Compiled regex patterns for all 18 HIPAA Safe Harbor identifiers
  → Replaces matches with typed tokens: [NAME], [DATE], [MRN], etc.
  → Cannot be bypassed

Tier 2: NER Detection (compromise.js, pure JS)
  → Additional person/org/location detection
  → On failure: THROW PhiPipelineError(tier=2) — never continue

Tier 3: Lyzr Safe AI Validation (medical_safety_agent)
  → Validates redacted text for residual identifiers and injection patterns
  → On GUARDRAIL_DENY: POLICY_BLOCK
  → On timeout/5xx: THROW PhiPipelineError(tier=3)

Tier 4: Residual Scan (re-runs Tier 1 regex on Tier 3 output)
  → If any match found: THROW PhiPipelineError(tier=4, PHI_RESIDUAL_DETECTED)
  → Zero matches required to proceed
```

## Fail-Closed Contract

PHI pipeline failure at any tier → throws PhiPipelineError.
The screening pipeline catches this → screening enters REQUIRES_HUMAN_REVIEW.
The LLM (evidence_extraction_agent) is NEVER called unless all 4 tiers complete with zero residual.

## What Is Logged

- Redaction count per tier (e.g., "Tier 1: 3 identifiers redacted")
- Which identifier TYPES were found (e.g., "DATE", "MRN")
- NEVER: the actual redacted values
- NEVER: the original pre-redaction text

## HIPAA Safe Harbor Identifiers Covered (18)

1. Names
2. Geographic data (sub-state level: street, city, county, zip)
3. Dates (except year) — birth, admission, discharge, death
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security Numbers
8. Medical record numbers (MRN)
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers (VIN, plate)
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (finger/voice prints)
17. Full-face photographs
18. Any other unique identifying number/code
