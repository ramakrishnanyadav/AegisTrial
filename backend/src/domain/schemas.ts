/**
 * AegisTrial v4 — AJV JSON Schemas
 * Used to validate Lyzr agent output at the API boundary.
 * Schema failure → bounded retry → REQUIRES_HUMAN_REVIEW (never silent drop).
 */

// Criterion output from protocol_criteria_agent
export const CRITERIA_OUTPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object' as const,
  required: ['criteria'],
  additionalProperties: false,
  properties: {
    criteria: {
      type: 'array' as const,
      minItems: 1,
      items: {
        type: 'object' as const,
        required: ['criterionId', 'type', 'field', 'operator', 'threshold', 'unit', 'sourceRef'],
        additionalProperties: false,
        properties: {
          criterionId: { type: 'string', pattern: '^(IC|EC|AMB)-[0-9]{2,4}$' },
          type: { type: 'string', enum: ['INCLUSION', 'EXCLUSION', 'AMBIGUOUS'] },
          field: { type: 'string', minLength: 1 },
          operator: {
            type: 'string',
            enum: ['>=', '<=', '>', '<', '==', '!=', 'IN', 'NOT_IN', 'PRESENT', 'ABSENT'],
          },
          threshold: {},
          unit: { type: 'string' },
          temporalWindow: { type: 'string' },
          sourceRef: {
            type: 'object' as const,
            required: ['docId', 'textExcerpt'],
            properties: {
              docId: { type: 'string' },
              page: { type: 'number' },
              paragraph: { type: 'string' },
              textExcerpt: { type: 'string', minLength: 10 },
            },
          },
        },
      },
    },
  },
};

// PatientField[] output from evidence_extraction_agent
export const EVIDENCE_OUTPUT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object' as const,
  required: ['fields'],
  additionalProperties: false,
  properties: {
    fields: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['field', 'value', 'unit', 'timestamp', 'confidence', 'sourceExcerpt'],
        additionalProperties: false,
        properties: {
          field: { type: 'string', minLength: 1 },
          value: {},
          unit: { type: 'string' },
          timestamp: { type: ['string', 'null'] as const },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sourceExcerpt: { type: 'string', minLength: 5 },
        },
      },
    },
  },
};

// Output from medical_safety_agent (PHI pipeline Tier 3)
export const SAFETY_CHECK_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object' as const,
  required: ['clean', 'violations', 'injectionDetected'],
  additionalProperties: false,
  properties: {
    clean: { type: 'boolean' as const },
    violations: { type: 'array' as const, items: { type: 'string' as const } },
    injectionDetected: { type: 'boolean' as const },
  },
};

// Output from ontology_mapping_agent
export const ONTOLOGY_MAPPING_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object' as const,
  required: ['mapped', 'mappedTerm', 'confidence', 'reasoning'],
  additionalProperties: false,
  properties: {
    mapped: { type: 'boolean' as const },
    mappedTerm: { type: ['string', 'null'] as const },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reasoning: { type: 'string' as const },
  },
};
