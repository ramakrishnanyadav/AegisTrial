/**
 * screenings.ts — POST /api/screenings and GET /api/screenings/:runId/verify
 *
 * POST /api/screenings — Full P0-A pipeline:
 *   1. Idempotency check
 *   2. Load protocol criteria (from DB or re-parse via Lyzr)
 *   3. PHI pipeline: redact patient text (4-tier, fail-closed)
 *   4. LyzrInference (evidence_extraction_agent): extract patient fields
 *   5. Evidence resolution: map patient fields → criteria
 *   6. Rule engine: evaluate criteria → CriterionEvaluation[]
 *   7. Build DecisionProof[] (one per criterion)
 *   8. Compute final verdict
 *   9. Write ScreeningRun + AIMS outbox row (same DB transaction)
 *  10. Return ScreeningRunResponse
 *
 * GET /api/screenings/:runId/verify — AI-free replay:
 *   - Load stored ScreeningRun from SQLite
 *   - Re-run evidence resolution + rule engine only (zero LLM calls)
 *   - Assert bitwise-identical verdict + sha256
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuid } from 'uuid';
import { agentRegistry } from '../lyzr/index.js';
import { LyzrError } from '../lyzr/errors.js';
import { redactAndValidate } from '../phi/phiPipeline.js';
import { PhiPipelineError } from '../phi/PhiPipelineError.js';
import { resolveAllEvidence } from '../engine/evidenceResolver.js';
import { evaluateCriterion, computeVerdict } from '../engine/ruleEngine.js';
import { buildAllDecisionProofs, sha256Hex } from '../engine/decisionProof.js';
import {
  getIdempotencyKey,
  getScreeningRun,
  listRecentScreeningRuns,
  getCriteriaForProtocol,
  createScreeningRun,
  saveArtifact,
} from '../db/repository.js';
import type {
  Criterion,
  PatientField,
  ScreeningRun,
  ScreeningRunResponse,
  VerifyResponse,
  IdempotencyConflictError,
  StoredLlmArtifact,
} from '../domain/types.js';
import { ScreeningStatus, AimsDeliveryStatus } from '../domain/types.js';
import { EVIDENCE_OUTPUT_SCHEMA } from '../domain/schemas.js';

import { PerformScreeningSchema } from '../../../shared/contracts/screenings.js';

export const screeningsRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/screenings
// ---------------------------------------------------------------------------
screeningsRouter.post('/', async (req: Request, res: Response) => {
  const parseResult = PerformScreeningSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid screening request payload.',
        details: parseResult.error.flatten(),
      },
    });
    return;
  }

  const { patientId, protocolId, patientText, idempotencyKey } = parseResult.data;

  // ── Idempotency check ────────────────────────────────────────────────────
  const existing = getIdempotencyKey(idempotencyKey);
  if (existing) {
    if (existing.patient_id !== patientId) {
      const conflict: IdempotencyConflictError = {
        error: 'IDEMPOTENCY_KEY_REUSED',
        message: `Idempotency key '${idempotencyKey}' was previously used with a different patientId`,
        originalRunId: existing.run_id,
        conflictingField: 'patientId',
      };
      res.status(409).json(conflict);
      return;
    }
    if (existing.protocol_id !== protocolId) {
      const conflict: IdempotencyConflictError = {
        error: 'IDEMPOTENCY_KEY_REUSED',
        message: `Idempotency key '${idempotencyKey}' was previously used with a different protocolId`,
        originalRunId: existing.run_id,
        conflictingField: 'protocolId',
      };
      res.status(409).json(conflict);
      return;
    }
    // Same payload → return original run
    const originalRun = getScreeningRun(existing.run_id);
    if (originalRun) {
      res.status(200).json(toResponse(originalRun));
      return;
    }
  }

  // ── Load criteria ────────────────────────────────────────────────────────
  const criteria = getCriteriaForProtocol(protocolId);
  if (criteria.length === 0) {
    res.status(404).json({ error: 'PROTOCOL_NOT_FOUND', message: `Protocol '${protocolId}' not found or has no criteria` });
    return;
  }

  const protocolHash = sha256Hex(criteria);
  const runId = `RUN-${uuid().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  // ── PHI Pipeline ─────────────────────────────────────────────────────────
  let redactionResult: Awaited<ReturnType<typeof redactAndValidate>>;
  try {
    redactionResult = await redactAndValidate(patientText);
  } catch (err) {
    if (err instanceof PhiPipelineError) {
      const screeningStatus = err.isPolicyBlock ? ScreeningStatus.REQUIRES_HUMAN_REVIEW : ScreeningStatus.REQUIRES_HUMAN_REVIEW;
      // Never let PHI failure produce an ELIGIBLE verdict
      const run: ScreeningRun = {
        runId,
        idempotencyKey,
        patientId,
        protocolId,
        protocolHash,
        verdict: 'REQUIRES_HUMAN_REVIEW',
        screeningStatus,
        aimsDeliveryStatus: AimsDeliveryStatus.NOT_CONFIGURED,
        decisionProof: [],
        sha256: '',
        phiRedactionCount: 0,
        lyzrCriteriaSessionId: '',
        lyzrEvidenceSessionId: '',
        timestampUtc: now,
      };
      createScreeningRun({ run, aimsEventJson: buildAimsEvent(run, 'PHI_PIPELINE_FAILED') });
      res.status(200).json(toResponse(run));
      return;
    }
    throw err;
  }

  // ── Evidence Extraction (Lyzr) ───────────────────────────────────────────
  const evidenceInference = agentRegistry.createInference('evidence_extraction');
  const evidenceSessionId = `ev-${runId}`;
  let patientFields: PatientField[] = [];

  try {
    const extracted = await evidenceInference.run<{ fields: PatientField[] }>(
      `Extract all measurable clinical field values from the following de-identified patient record:\n\n${redactionResult.redactedText}`,
      evidenceSessionId,
    );
    patientFields = extracted.fields ?? [];
  } catch (err) {
    if (err instanceof LyzrError) {
      const screeningStatus = err.isSystemError ? ScreeningStatus.SYSTEM_ERROR : ScreeningStatus.REQUIRES_HUMAN_REVIEW;
      if (err.isSystemError) {
        res.status(503).json({ error: 'SYSTEM_ERROR', message: err.message, systemError: true });
        return;
      }
      const run: ScreeningRun = buildRun({
        runId, idempotencyKey, patientId, protocolId, protocolHash, now,
        verdict: 'REQUIRES_HUMAN_REVIEW',
        screeningStatus,
        aimsDeliveryStatus: AimsDeliveryStatus.PENDING,
        decisionProof: [],
        sha256: '',
        phiRedactionCount: redactionResult.redactionCount,
        criteriaSessionId: '',
        evidenceSessionId,
      });
      createScreeningRun({ run, aimsEventJson: buildAimsEvent(run, 'EVIDENCE_EXTRACTION_FAILED') });
      res.status(200).json(toResponse(run));
      return;
    }
    throw err;
  }

  // Save evidence extraction artifact for reproducibility
  if (evidenceInference.lastRawOutput) {
    saveArtifact({
      id: uuid(),
      runId,
      agentRole: 'evidence_extraction',
      agentId: evidenceInference.lastAgentId ?? '',
      sessionId: evidenceSessionId,
      rawOutput: evidenceInference.lastRawOutput,
      schemaValid: true,
      timestampUtc: now,
    } as StoredLlmArtifact);
  }

  // ── Evidence Resolution ──────────────────────────────────────────────────
  const resolved = resolveAllEvidence(criteria, patientFields);

  // ── Rule Engine ──────────────────────────────────────────────────────────
  const evaluations = resolved.map((r) => evaluateCriterion(r, false));

  // ── DecisionProof[] ──────────────────────────────────────────────────────
  const { proofs, sha256 } = buildAllDecisionProofs(evaluations, protocolHash);

  // ── Verdict ──────────────────────────────────────────────────────────────
  const verdict = computeVerdict(evaluations);

  // ── Persist ──────────────────────────────────────────────────────────────
  const run: ScreeningRun = buildRun({
    runId, idempotencyKey, patientId, protocolId, protocolHash, now,
    verdict,
    screeningStatus: ScreeningStatus.COMPLETED,
    aimsDeliveryStatus: AimsDeliveryStatus.PENDING,
    decisionProof: proofs,
    sha256,
    phiRedactionCount: redactionResult.redactionCount,
    criteriaSessionId: '',
    evidenceSessionId,
    evidenceSnapshot: patientFields,
  });

  createScreeningRun({ run, aimsEventJson: buildAimsEvent(run, 'SCREENING_INITIATED') });

  res.status(201).json(toResponse(run));
});

// ---------------------------------------------------------------------------
// GET /api/screenings — List recent screening runs
// ---------------------------------------------------------------------------
screeningsRouter.get('/', (_req: Request, res: Response) => {
  const runs = listRecentScreeningRuns(50);
  res.json(runs.map(toResponse));
});

// ---------------------------------------------------------------------------
// GET /api/screenings/:runId
// ---------------------------------------------------------------------------
screeningsRouter.get('/:runId', (req: Request, res: Response) => {
  const run = getScreeningRun(req.params['runId'] ?? '');
  if (!run) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json(toResponse(run));
});

/**
 * Replays screening verification directly from stored independent evidence_snapshot (ZERO LLM calls).
 */
export async function performVerify(runId: string): Promise<VerifyResponse | null> {
  const startMs = Date.now();
  const run = getScreeningRun(runId);
  if (!run) {
    return null;
  }

  const criteria = getCriteriaForProtocol(run.protocolId);
  const evidenceSnapshot: PatientField[] = run.evidenceSnapshot ?? [];

  const resolved = resolveAllEvidence(criteria, evidenceSnapshot);
  const evaluations = resolved.map((r) => evaluateCriterion(r, false));
  const { sha256: replayedHash } = buildAllDecisionProofs(evaluations, run.protocolHash);
  const replayedVerdict = computeVerdict(evaluations);

  const hashMatch = replayedHash === run.sha256;
  const verdictMatch = replayedVerdict === run.verdict;

  return {
    runId: run.runId,
    verified: hashMatch && verdictMatch,
    llmCallsMade: 0, // enforced — no LLM calls in this path
    storedHash: run.sha256,
    replayedHash,
    hashMatch,
    storedVerdict: run.verdict,
    replayedVerdict,
    verdictMatch,
    executionMs: Date.now() - startMs,
  };
}

// ---------------------------------------------------------------------------
// GET /api/screenings/:runId/verify — AI-free replay
// ---------------------------------------------------------------------------
screeningsRouter.get('/:runId/verify', async (req: Request, res: Response) => {
  const result = await performVerify(req.params['runId'] ?? '');
  if (!result) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }
  res.json(result);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toResponse(run: ScreeningRun): ScreeningRunResponse {
  return {
    runId: run.runId,
    patientId: run.patientId,
    protocolId: run.protocolId,
    protocolArtifactHash: run.protocolArtifactHash || run.protocolHash,
    criteriaHash: run.criteriaHash || run.protocolHash,
    verdict: run.verdict,
    screeningStatus: run.screeningStatus,
    aimsDeliveryStatus: run.aimsDeliveryStatus,
    decisionProof: run.decisionProof,
    sha256: run.sha256,
    timestampUtc: run.timestampUtc,
    phiRedactionCount: run.phiRedactionCount,
  };
}

function buildAimsEvent(run: ScreeningRun, eventType: string): string {
  return JSON.stringify({
    eventId: `evt-${uuid()}`,
    screeningRunId: run.runId,
    timestamp: run.timestampUtc,
    eventType,
    outboxStatus: run.aimsDeliveryStatus,
    payloadChecksum: `sha256:${sha256Hex(run.decisionProof)}`,
    aimsEndpoint: process.env['AIMS_ENDPOINT'] ?? 'http://localhost:3000/api/aims/_mock',
    details: `Verdict: ${run.verdict}`,
    attempts: 0,
    nextRetryAt: null,
  });
}

interface BuildRunParams {
  runId: string; idempotencyKey: string; patientId: string; protocolId: string;
  protocolHash: string; now: string; verdict: ScreeningRun['verdict'];
  screeningStatus: ScreeningStatus; aimsDeliveryStatus: AimsDeliveryStatus;
  decisionProof: ScreeningRun['decisionProof']; sha256: string;
  phiRedactionCount: number; criteriaSessionId: string; evidenceSessionId: string;
  evidenceSnapshot?: PatientField[];
}

function buildRun(p: BuildRunParams): ScreeningRun {
  return {
    runId: p.runId, idempotencyKey: p.idempotencyKey, patientId: p.patientId,
    protocolId: p.protocolId, protocolHash: p.protocolHash, verdict: p.verdict,
    screeningStatus: p.screeningStatus, aimsDeliveryStatus: p.aimsDeliveryStatus,
    decisionProof: p.decisionProof, sha256: p.sha256,
    phiRedactionCount: p.phiRedactionCount,
    lyzrCriteriaSessionId: p.criteriaSessionId, lyzrEvidenceSessionId: p.evidenceSessionId,
    timestampUtc: p.now,
    evidenceSnapshot: p.evidenceSnapshot || [],
  };
}
