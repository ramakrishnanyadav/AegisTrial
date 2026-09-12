import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { agentRegistry } from '../lyzr/index.js';
import { upsertProtocol, getProtocol, listProtocols } from '../db/repository.js';
import { Criterion } from '../domain/types.js';

export const protocolsRouter = Router();

export function canonicalSerializeCriteria(criteria: Criterion[]): string {
  // Sort criteria by criterionId deterministically
  const sorted = [...criteria].sort((a, b) => a.criterionId.localeCompare(b.criterionId));
  return JSON.stringify(sorted);
}

/**
 * POST /api/protocols/ingest
 * Ingest raw protocol text via the Lyzr Criteria Extractor Agent.
 * Validates schema output, computes sha256 protocolHash, and persists versioned protocol row.
 */
protocolsRouter.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  try {
    const { protocolText, protocolId: requestedId, name: requestedName } = req.body as {
      protocolText?: string;
      protocolId?: string;
      name?: string;
    };

    if (!protocolText || typeof protocolText !== 'string' || protocolText.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'protocolText string is required for ingestion.',
        },
      });
      return;
    }

    const protocolId = requestedId || `PROT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const name = requestedName || `Clinical Trial Protocol ${protocolId}`;

    // Invoke Lyzr Criteria Agent with bounded retries (up to 2 retries)
    const inference = agentRegistry.createInference('protocol_criteria');
    const sessionId = `ingest-${protocolId}-${Date.now()}`;
    
    let criteria: Criterion[] = [];
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await inference.run<{ criteria: Criterion[] }>(
          `Extract eligibility criteria for protocol ${name}:\n\n${protocolText}`,
          sessionId,
        );

        if (result && Array.isArray(result.criteria) && result.criteria.length > 0) {
          criteria = result.criteria;
          break;
        } else {
          throw new Error('Lyzr criteria agent produced invalid or empty criteria array.');
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Protocol Ingest] Attempt ${attempts}/${maxAttempts} failed:`, lastError.message);
      }
    }

    if (criteria.length === 0) {
      res.status(422).json({
        error: {
          code: 'CRITERIA_EXTRACTION_FAILED',
          message: `Failed to extract valid criteria after ${maxAttempts} attempts: ${lastError?.message || 'Empty result'}`,
        },
      });
      return;
    }

    // Compute dual hashes: protocolArtifactHash (raw source text) & criteriaHash (criteria json)
    const protocolArtifactHash = crypto.createHash('sha256').update(protocolText).digest('hex');
    const canonicalStr = canonicalSerializeCriteria(criteria);
    const criteriaHash = crypto.createHash('sha256').update(canonicalStr).digest('hex');

    // Persist in SQLite repository
    upsertProtocol(protocolId, name, criteriaHash, criteria, protocolText, protocolArtifactHash, criteriaHash);

    res.json({
      protocolId,
      protocolArtifactHash,
      criteriaHash,
      protocolHash: criteriaHash,
      name,
      criteria,
      ingestedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Protocol Ingest Error]', message);
    res.status(500).json({
      error: {
        code: 'INGESTION_ERROR',
        message: `Protocol ingestion failed: ${message}`,
      },
    });
  }
});

/**
 * GET /api/protocols
 * List all ingested trial protocols
 */
protocolsRouter.get('/', (_req: Request, res: Response): void => {
  const protocols = listProtocols();
  const result = protocols.map((row) => ({
    protocolId: row.id,
    protocolArtifactHash: row.protocol_artifact_hash || row.hash,
    criteriaHash: row.criteria_hash || row.hash,
    protocolHash: row.hash,
    name: row.name,
    criteria: JSON.parse(row.criteria_json),
    ingestedAt: row.ingested_at,
  }));
  res.json(result);
});

/**
 * GET /api/protocols/:id
 * Retrieve ingested protocol by ID
 */
protocolsRouter.get('/:id', (req: Request, res: Response): void => {
  const row = getProtocol(req.params.id!);
  if (!row) {
    res.status(404).json({
      error: {
        code: 'PROTOCOL_NOT_FOUND',
        message: `Protocol '${req.params.id}' was not found.`,
      },
    });
    return;
  }

  res.json({
    protocolId: row.id,
    protocolArtifactHash: row.protocol_artifact_hash || row.hash,
    criteriaHash: row.criteria_hash || row.hash,
    protocolHash: row.hash,
    name: row.name,
    criteria: JSON.parse(row.criteria_json),
    ingestedAt: row.ingested_at,
  });
});
