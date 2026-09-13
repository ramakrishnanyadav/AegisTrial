/**
 * protocol.ts — Synthetic Clinical Protocol Fixture for AegisTrial tests & UI components.
 * Shared fixture for Phase 3 Type 2 Diabetes & Chronic Kidney Disease Trial protocol.
 */

import { Protocol } from '../../backend/src/domain/types.js';

export const SYNTHETIC_PROTOCOL: Protocol = {
  protocolId: 'PROTO-T2D-CKD-001',
  title: 'Phase 3 Study of Aegis-101 in Adult Patients with Type 2 Diabetes and Moderate Chronic Kidney Disease',
  version: '1.0',
  inclusionCriteria: [
    {
      id: 'INC-01',
      type: 'INCLUSION',
      code: 'AGE_CHECK',
      description: 'Age between 18 and 75 years at time of screening',
      domain: 'demographics',
      field: 'age',
      operator: 'BETWEEN',
      targetValue: [18, 75],
      unit: 'years',
      confidenceThreshold: 0.90,
      isMandatory: true,
    },
    {
      id: 'INC-02',
      type: 'INCLUSION',
      code: 'HBA1C_RANGE',
      description: 'HbA1c between 7.0% and 10.5% inclusive',
      domain: 'labs',
      field: 'hba1c',
      operator: 'BETWEEN',
      targetValue: [7.0, 10.5],
      unit: '%',
      confidenceThreshold: 0.90,
      isMandatory: true,
    },
    {
      id: 'INC-03',
      type: 'INCLUSION',
      code: 'EGFR_RANGE',
      description: 'eGFR between 30 and 60 mL/min/1.73m2',
      domain: 'labs',
      field: 'egfr',
      operator: 'BETWEEN',
      targetValue: [30, 60],
      unit: 'mL/min/1.73m2',
      confidenceThreshold: 0.90,
      isMandatory: true,
    },
  ],
  exclusionCriteria: [
    {
      id: 'EXC-01',
      type: 'EXCLUSION',
      code: 'EXC_ALT_ELEVATION',
      description: 'ALT > 3x Upper Limit of Normal (> 120 U/L)',
      domain: 'labs',
      field: 'alt',
      operator: 'GREATER_THAN',
      targetValue: 120,
      unit: 'U/L',
      confidenceThreshold: 0.90,
      isMandatory: true,
    },
    {
      id: 'EXC-02',
      type: 'EXCLUSION',
      code: 'EXC_DIALYSIS',
      description: 'History of kidney dialysis or end-stage renal disease',
      domain: 'history',
      field: 'dialysis_history',
      operator: 'EQUALS',
      targetValue: true,
      unit: '',
      confidenceThreshold: 0.85,
      isMandatory: true,
    },
  ],
  rawText: `
Protocol: PROTO-T2D-CKD-001
Title: Phase 3 Study of Aegis-101 in Adult Patients with T2D and Moderate CKD

Inclusion Criteria:
1. Adult patients aged 18 to 75 years inclusive at screening.
2. Documented Type 2 Diabetes Mellitus with baseline HbA1c 7.0% to 10.5%.
3. Estimated Glomerular Filtration Rate (eGFR) 30 to 60 mL/min/1.73m2.

Exclusion Criteria:
1. Serum ALT > 3x ULN (>120 U/L) at screening.
2. History of renal replacement therapy (dialysis).
  `.trim(),
};
