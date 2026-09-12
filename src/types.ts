/**
 * AegisTrial - Governed Clinical Trial Patient Screening & Regulatory Audit Agent
 * Master Spec v3 Architecture & 21 CFR Part 11 / GCP Deterministic Types
 */

export type NavigationTab =
  | 'overview'
  | 'screening'
  | 'attacks'
  | 'protocols'
  | 'audit'
  | 'landing'
  | 'dashboard'
  | 'tests';

export type VerificationVerdict = 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_HUMAN_REVIEW' | 'REVIEW';

export type DecisionReasonCode =
  | 'INCLUSION_CRITERION_MET'
  | 'INCLUSION_CRITERION_NOT_MET'
  | 'EXCLUSION_CRITERION_MET'
  | 'MISSING_REQUIRED_EVIDENCE'
  | 'AMBIGUOUS_ONTOLOGY'
  | 'UNIT_INCOMPATIBLE'
  | 'TEMPORAL_FAILURE'
  | 'CONFLICTING_EVIDENCE'
  | 'POLICY_BLOCK'
  | 'HUMAN_REVIEW_REQUIRED';

export interface SourceRef {
  docId: string;
  docTitle?: string;
  page?: number;
  paragraph?: string;
  pacsUid?: string;
  charSpan?: [number, number];
  textExcerpt: string;
  timestamp?: string;
}

export interface DecisionProofDetails {
  protocolHash: string;
  criterionId: string;
  sourceRefs: SourceRef[];
  extractedValue: string | number;
  normalizedValue: string | number;
  ontologyMapping?: string;
  unitConversion?: string;
  temporalEvaluation?: string;
  operator: string;
  comparisonResult: 'met' | 'not_met' | 'insufficient_data';
  policyResult: 'PASSED' | 'BLOCKED' | 'REQUIRES_REVIEW';
  finalResult: 'met' | 'not_met' | 'insufficient_data';
  artifactHash: string;
  reasonCode: DecisionReasonCode;
  reasoning: string;
  // UI helper fields for SVG render
  rawExtraction: string;
  rawLabel: string;
  ruleLabel: string;
  threshold: string;
  assertion: string;
  delta: string;
  pacsUid?: string;
  citationProvenance: string;
  citationText: string;
}

export interface CriterionEvaluation {
  code: string; // e.g. 'IC-01', 'IC-02', 'EC-01'
  type: 'INCLUSION' | 'EXCLUSION';
  title: string;
  plainTitle?: string; // Plain human explanation
  status: 'MET' | 'UNMET' | 'EXCLUDED_PASSED' | 'EXCLUDED_FAILED' | 'INSUFFICIENT_DATA';
  statusLabel: string;
  extractionEvidence: string;
  plainEvidence?: string; // Plain human text
  sourceDoc: string;
  verifiedBy: string;
  reasonCode?: DecisionReasonCode;
  templatedReasoning?: string;
  hasDecisionProof?: boolean;
  decisionProof?: DecisionProofDetails;
}

export interface PatientCandidate {
  id: string; // e.g. 'SYN-004', 'SYN-003', 'SYN-005', 'SYN-006', 'SYN-007'
  nameMasked: string; // e.g. 'ANON-PT-90142'
  displayName?: string; // Friendly name for easy non-tech reading (e.g. 'David Miller')
  conditionSummary?: string; // e.g. 'Metastatic Non-Small Cell Lung Cancer (EGFR L858R)'
  avatarUrl?: string;
  cohortCategory: 'clean-eligible' | 'clean-ineligible' | 'ambiguous' | 'missing-evidence' | 'conflicting-evidence';
  friendlyBadgeText?: string;
  runId: string; // e.g. 'RUN-2291'
  age: number;
  stage: string; // e.g. 'Stg IIIB'
  protocolId: string; // e.g. 'NCT-04821'
  protocolName: string;
  verdict: VerificationVerdict;
  plainVerdictSummary?: string; // e.g. 'Fully eligible. All lab counts and tumor dimensions pass protocol criteria.'
  inclusionMet: number;
  inclusionTotal: number;
  exclusionFound: number;
  biomarker: string;
  anc: string;
  sha256: string;
  timestampUtc: string;
  ineligibilityReason?: string;
  criteria: CriterionEvaluation[];
  isSigned?: boolean;
  signedTimestamp?: string;
  signedBy?: string;
}

export interface PipelineStage {
  step: number;
  name: string;
  plainDescription?: string;
  tag: string;
  tagStyle?: string;
  metaKey1: string;
  metaVal1: string;
  metaKey2: string;
  metaVal2: string;
  isComplete: boolean;
  isHighlight?: boolean;
}

export interface SignerInfo {
  name: string;
  title: string;
  institution?: string;
  npiNumber?: string;
  protocolId: string;
  certificateAuthority: string;
  keyFingerprint: string;
  timeOfSigning: string;
  regulationNotice: string;
}

export interface ElectronicDossier {
  uuid: string;
  merkleRoot: string;
  runTimestampUtc: string;
  attestationMode: string;
  chainValidationId: string;
  revision: string;
  signer: SignerInfo;
  pipelineStages: PipelineStage[];
  archiveBlob: string;
  retentionMandate: string;
  systemValidationProtocol: string;
}

export interface ClinicalProtocol {
  id: string; // e.g. 'NCT-04821'
  title: string;
  phase: string;
  targetIndication: string;
  cohort: string;
  confidence: number;
  pointsMatched: number;
  pointsTotal: number;
  approved: boolean;
  criteriaCount: {
    inclusion: number;
    exclusion: number;
  };
  summary: string;
  plainExplanation?: string;
}

export interface BenchmarkAccuracyMetric {
  id: string;
  category: string;
  title: string;
  tier: string;
  percentage: number;
  highlightLabel: string;
  description: string;
  deltaBaseline: string;
  footerKey: string;
  footerVal: string;
  subStats?: { label: string; val: string }[];
}

export interface AdversarialEvaluationResult {
  vectorNeutralized: boolean;
  latencyMs: number;
  trapCaughtText: string;
  disqualificationCriterion: string;
  offsetSha: string;
  confidencePercent: number;
}

export interface AuthUser {
  id: string;
  name: string;
  role: 'PI' | 'AUDITOR' | 'CRC' | 'MONITOR' | 'BIOSTATISTICIAN' | 'SPONSOR';
  roleTitle: string;
  institution: string;
  npiNumber?: string;
  keyFingerprint: string;
  token: string;
  authenticated: boolean;
  email: string;
  avatarLetter: string;
  avatarUrl?: string;
  provider?: 'google' | 'github' | 'chrome' | 'institutional' | 'password';
  githubUsername?: string;
}

export interface SixAttackVector {
  id: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  attackName: string;
  plainName: string; // Layman friendly title e.g. "Prompt Hacking Attack"
  category: string;
  plainDescription: string; // Layman explanation
  attackPayload: string;
  controlMechanism: string;
  expectedVerdict: string;
  failureModePrevented: string;
  status: 'IDLE' | 'EXECUTING' | 'NEUTRALIZED' | 'BLOCKED' | 'VERIFIED' | 'PASS';
  latencyMs?: number;
  auditEvidence?: string;
  details?: string;
}

export interface ArchitectureInvariantTest {
  id: string;
  functionName: string;
  title: string;
  description: string;
  invariantRule: string;
  status: 'PASS' | 'RUNNING' | 'FAIL';
  executionTimeMs: number;
  assertionDetail: string;
}

export interface AimsEventLog {
  eventId: string;
  screeningRunId: string;
  timestamp: string;
  eventType: 'SCREENING_INITIATED' | 'PHI_MASKED' | 'EVIDENCE_RESOLVED' | 'DETERMINISTIC_GATE_EVAL' | 'PROOF_CANONICALIZED' | 'DOSSIER_COMMITTED';
  outboxStatus: 'DELIVERED' | 'PENDING_OUTBOX' | 'RETRYING';
  payloadChecksum: string;
  aimsEndpoint: string;
  details: string;
}

export type ScreeningRun = PatientCandidate;
export type AuditTrailLog = AimsEventLog;
export type UserSession = AuthUser;

