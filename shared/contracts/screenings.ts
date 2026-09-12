import { z } from 'zod';

/** PerformScreeningParams — contract for screening requests sent from UI to backend */
export interface PerformScreeningParams {
  idempotencyKey: string;
  patientId: string;
  protocolId: string;
  patientText: string;
}

export const PerformScreeningSchema = z.object({
  idempotencyKey: z.string().min(1, 'idempotencyKey is required'),
  patientId: z.string().min(1, 'patientId is required'),
  protocolId: z.string().min(1, 'protocolId is required'),
  patientText: z.string().min(1, 'patientText is required'),
});

/** AsyncResult<T> — Single shared result state machine across all async action UI components */
export type AsyncResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'failed'; error: { code: string; message: string; details?: unknown } };

/** ApiErrorResponse — Standard API error envelope shape */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
