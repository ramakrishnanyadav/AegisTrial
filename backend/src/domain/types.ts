/**
 * AegisTrial v4 — Canonical Domain Types
 * Single source of truth: UI, PDF, JSON export, and /verify all derive from these types.
 * 21 CFR Part 11 / GCP compliant audit model.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum DecisionReasonCode {
  INCLUSION_CRITERION_MET = 'inclusion_criterion_met',
  INCLUSION_CRITERION_NOT_MET = 'inclusion_criterion_not_met',
  EXCLUSION_CRITERION_MET = 'exclusion_criterion_met',
  EXCLUSION_CRITERION_NOT_MET = 'exclusion_criterion_not_met',
  MISSING_REQUIRED_EVIDENCE = 'missing_required_evidence',
  AMBIGUOUS_ONTOLOGY = 'ambiguous_ontology',
  UNIT_INCOMPATIBLE = 'unit_incompatible',
  TEMPORAL_FAILURE = 'temporal_failure',
  CONFLICTING_EVIDENCE = 'conflicting_evidence',
  POLICY_BLOCK = 'policy_block',
  HUMAN_REVIEW_REQUIRED = 'human_review_required',
}

export enum CriterionType {
  INCLUSION = 'INCLUSION',
  EXCLUSION = 'EXCLUSION',
  AMBIGUOUS = 'AMBIGUOUS',
}

export type ComparisonOperator = '>=' | '<=' | '>' | '<' | '==' | '!=' | 'IN' | 'NOT_IN' | 'PRESENT' | 'ABSENT';

export type ComparisonResult = 'met' | 'not_met' | 'insufficient_data';

export type GateResult = 'PASSED' | 'BLOCKED' | 'REQUIRES_REVIEW';

export type VerificationVerdict = 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_HUMAN_REVIEW';

/**
 * Screening status — represents the LOCAL processing state.
 * NEVER conflated with aimsDeliveryStatus.
 */
export enum ScreeningStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  REQUIRES_HUMAN_REVIEW = 'REQUIRES_HUMAN_REVIEW',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

/**
 * AIMS delivery status — represents the EXTERNAL telemetry state.
 * AIMS failure never changes screeningStatus.
 */
export enum AimsDeliveryStatus {
  DELIVERED = 'DELIVERED',
  PENDING = 'PENDING',
  RETRYING = 'RETRYING',
  FAILED = 'FAILED',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}

// ---------------------------------------------------------------------------
// Source References & Evidence
// ---------------------------------------------------------------------------

export interface SourceRef {
  docId: string;
  docTitle?: string | undefined;
  page?: number | undefined;
  paragraph?: string | undefined;
  charSpan?: [number, number] | undefined;
  textExcerpt: string;
  timestamp?: string | undefined; // ISO-8601 UTC
}

/**
 * A single measurable field extracted from a protocol criterion.
 * Created by the Protocol Criteria Agent.
 */
export interface Criterion {
  criterionId: string;           // e.g. "IC-01", "EC-03"
  type: CriterionType;
  field: string;                 // e.g. "anc", "egfr", "age", "ecog_status"
  operator: ComparisonOperator;
  threshold: number | string;
  unit: string;
  temporalWindow?: string | undefined;  // e.g. "within 28 days"
  sourceRef: SourceRef;
}

export interface ProtocolCriterion {
  id: string;
  type: 'INCLUSION' | 'EXCLUSION';
  code: string;
  description: string;
  domain: string;
  field: string;
  operator: string;
  targetValue: any;
  unit: string;
  confidenceThreshold: number;
  isMandatory: boolean;
}

export interface Protocol {
  protocolId: string;
  title: string;
  version: string;
  inclusionCriteria: ProtocolCriterion[];
  exclusionCriteria: ProtocolCriterion[];
  rawText: string;
  protocolArtifactHash?: string;
  criteriaHash?: string;
}

export interface PatientRecord {
  patientId: string;
  rawEhrText: string;
  demographics: { age: number; gender: string };
  labs: Array<{ code: string; name: string; value: number; unit: string; date: string }>;
  history: Array<{ condition: string; value: boolean; onsetDate: string }>;
}

/**
 * A single field value extracted from patient EHR.
 * Created by the Evidence Extraction Agent (from de-identified text).
 * Multiple entries for the same field are allowed — required for conflict detection.
 */
export interface PatientField {
  field: string;
  value: number | string | null;
  unit: string;
  timestamp: string | null;     // ISO-8601 UTC or null
  confidence: number;           // 0.0 - 1.0
  sourceExcerpt: string;
}

// ---------------------------------------------------------------------------
// Decision Proof — The Single Source of Truth
// ---------------------------------------------------------------------------

/**
 * DecisionProof is the canonical, immutable audit artifact for ONE criterion evaluation.
 *
 * Serialization spec (for artifactHash):
 *   - Encoding:         UTF-8
 *   - Unicode:          NFC normalization
 *   - Object keys:      Sorted lexicographically (recursive)
 *   - Array order:      Preserved
 *   - Timestamps:       ISO-8601 UTC ("2026-09-12T10:42:50.000Z")
 *   - Numbers:          Canonical decimal notation, max 15 significant digits
 *   - Null vs omit:     undefined fields omitted; explicit null serialized as null
 *   - Whitespace:       No insignificant whitespace
 *   - Hash algorithm:   SHA-256
 *   - Hash encoding:    Lowercase hex, 64 chars
 *
 * Powers: UI "Why?" drawer, PDF dossier, JSON export, /verify endpoint.
 * If you find yourself building a second shape for any of these, stop and refactor.
 */
export interface DecisionProof {
  protocolHash: string; // legacy criteria hash key
  protocolArtifactHash?: string; // sha256 of raw protocol text/PDF artifact
  criteriaHash?: string;         // sha256 of extracted criteria JSON
  criterionId: string;
  sourceRefs: SourceRef[];
  extractedValue: number | string | null;
  normalizedValue: number | string | null;
  ontologyMapping?: string | undefined;
  unitConversion?: string | undefined;
  temporalEvaluation?: string | undefined;
  operator: ComparisonOperator;
  comparisonResult: ComparisonResult;
  policyResult: GateResult;
  finalResult: ComparisonResult;
  reasonCode: DecisionReasonCode;
  reasoning: string; // Rendered from reasonCode template — NEVER raw LLM prose
  artifactHash: string; // sha256 of canonical serialization of this object
}

// ---------------------------------------------------------------------------
// Criterion Evaluation (intermediate, not stored — rebuilt into DecisionProof)
// ---------------------------------------------------------------------------

export interface CriterionEvaluation {
  criterion: Criterion;
  patientFields: PatientField[];   // all instances of the matching field
  gateResult: GateResult;
  result: ComparisonResult;
  reasonCode: DecisionReasonCode;
  reasoning: string;               // from template
  rawLlmExtraction?: string | undefined; // stored for reproducibility audit
}

// ---------------------------------------------------------------------------
// Screening Run
// ---------------------------------------------------------------------------

/**
 * A completed (or failed) screening run.
 * screeningStatus and aimsDeliveryStatus are independent state machines.
 * AIMS failure NEVER changes screeningStatus.
 */
export interface ScreeningRun {
  runId: string;
  idempotencyKey: string;
  patientId: string;
  protocolId: string;
  protocolHash: string;
  protocolArtifactHash?: string;
  criteriaHash?: string;
  evidenceSnapshot?: PatientField[];
  verdict: VerificationVerdict;
  screeningStatus: ScreeningStatus;          // local processing state
  aimsDeliveryStatus: AimsDeliveryStatus;    // external telemetry state
  decisionProof: DecisionProof[];            // one per criterion — THE single source
  sha256: string;                            // sha256 of full DecisionProof[] canonical JSON
  timestampUtc: string;                      // ISO-8601 UTC
  lyzrCriteriaSessionId: string;
  lyzrEvidenceSessionId: string;
  phiRedactionCount: number;
}

// ---------------------------------------------------------------------------
// Stored LLM Artifact (for reproducibility)
// ---------------------------------------------------------------------------

export interface StoredLlmArtifact {
  id: string;
  runId: string;
  agentRole: 'protocol_criteria' | 'evidence_extraction' | 'ontology_mapping' | 'dossier';
  agentId: string;
  sessionId: string;
  rawOutput: string;         // verbatim LLM response string
  schemaValid: boolean;
  timestampUtc: string;
}

// ---------------------------------------------------------------------------
// AIMS Event
// ---------------------------------------------------------------------------

export type AimsEventType =
  | 'SCREENING_INITIATED'
  | 'PHI_MASKED'
  | 'EVIDENCE_RESOLVED'
  | 'DETERMINISTIC_GATE_EVAL'
  | 'PROOF_CANONICALIZED'
  | 'DOSSIER_COMMITTED';

export interface AimsEvent {
  eventId: string;
  screeningRunId: string;
  timestamp: string;           // ISO-8601 UTC
  eventType: AimsEventType;
  outboxStatus: AimsDeliveryStatus;
  payloadChecksum: string;     // sha256:hex of event payload
  aimsEndpoint: string;
  details: string;
  attempts: number;
  nextRetryAt: string | null;  // ISO-8601 UTC
}

// ---------------------------------------------------------------------------
// API Response Shapes (what the frontend consumes)
// ---------------------------------------------------------------------------

/**
 * Backend response for POST /api/screenings and GET /api/screenings/:runId
 * The frontend NEVER independently reconstructs reasoning from this data.
 * decisionProof[] powers: Why drawer, PDF, JSON export, /verify.
 */
export interface ScreeningRunResponse {
  runId: string;
  patientId: string;
  protocolId: string;
  protocolArtifactHash?: string;
  criteriaHash?: string;
  verdict: VerificationVerdict;
  screeningStatus: ScreeningStatus;
  aimsDeliveryStatus: AimsDeliveryStatus;
  decisionProof: DecisionProof[];
  sha256: string;
  timestampUtc: string;
  phiRedactionCount: number;
}

export interface VerifyResponse {
  runId: string;
  verified: boolean;
  llmCallsMade: 0;             // always 0 — enforced by verify handler
  storedHash: string;
  replayedHash: string;
  hashMatch: boolean;
  storedVerdict: VerificationVerdict;
  replayedVerdict: VerificationVerdict;
  verdictMatch: boolean;
  executionMs: number;
}

export interface IdempotencyConflictError {
  error: 'IDEMPOTENCY_KEY_REUSED';
  message: string;
  originalRunId: string;
  conflictingField: 'patientId' | 'protocolId';
}
