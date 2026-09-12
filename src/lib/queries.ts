/**
 * queries.ts — React Query Hooks for AegisTrial Server State.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  runScreening,
  getScreeningRun,
  listRecentScreenings,
  verifyScreeningRun,
  runAttack,
  getAimsEvents,
  listProtocols,
  ingestProtocol,
  type PerformScreeningParams,
} from './api.js';

export function useScreeningRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['screening', runId],
    queryFn: () => getScreeningRun(runId!),
    enabled: Boolean(runId),
  });
}

export function useRecentScreenings() {
  return useQuery({
    queryKey: ['screenings'],
    queryFn: () => listRecentScreenings(),
    refetchInterval: 5000,
  });
}

export function useVerifyRun(runId: string | undefined) {
  return useQuery({
    queryKey: ['verify', runId],
    queryFn: () => verifyScreeningRun(runId!),
    enabled: Boolean(runId),
  });
}

export function useRunScreeningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: PerformScreeningParams) => runScreening(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['screenings'] });
      if (data.runId) {
        queryClient.setQueryData(['screening', data.runId], data);
      }
    },
  });
}

export function useRunAttackMutation() {
  return useMutation({
    mutationFn: (attackId: string) => runAttack(attackId),
  });
}

export function useAimsEvents() {
  return useQuery({
    queryKey: ['aimsEvents'],
    queryFn: () => getAimsEvents(),
    refetchInterval: 5000,
  });
}

export function useProtocols() {
  return useQuery({
    queryKey: ['protocols'],
    queryFn: () => listProtocols(),
  });
}

export function useIngestProtocolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ protocolText, protocolId, name }: { protocolText: string; protocolId?: string; name?: string }) =>
      ingestProtocol(protocolText, protocolId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });
}
