/**
 * patients.ts — Synthetic Patient EHR Fixtures for AegisTrial tests & attack suite.
 * Re-exports canonical fixtures from shared/fixtures/patients.ts
 */

export {
  PATIENT_01_ELIGIBLE,
  PATIENT_02_CONTRADICTORY_TIMELINE,
  PATIENT_03_INJECTION,
  PATIENT_04_UNIT_MISMATCH,
  PATIENT_05_PHI_LEAK,
  PATIENT_06_TEMPORAL_MISSING,
  PATIENT_07_INJECTION_ADVANCED,
  PATIENT_08_ZERO_CRITERIA,
  DEMO_PATIENTS,
  type PatientRecordFixture,
} from '../../../shared/fixtures/patients.js';
