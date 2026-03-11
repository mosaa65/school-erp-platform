"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGradingOutcomeRulePayload,
  type UpdateGradingOutcomeRulePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGradingOutcomeRules() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["grading-outcome-rules", "list"],
    });
  };
}

function useHandleAuthFailure() {
  const auth = useAuth();

  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      auth.signOut();
    }
  };
}

export function useCreateGradingOutcomeRuleMutation() {
  const invalidate = useInvalidateGradingOutcomeRules();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGradingOutcomeRulePayload) =>
      apiClient.createGradingOutcomeRule(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGradingOutcomeRuleMutation() {
  const invalidate = useInvalidateGradingOutcomeRules();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      gradingOutcomeRuleId: string;
      payload: UpdateGradingOutcomeRulePayload;
    }) => apiClient.updateGradingOutcomeRule(params.gradingOutcomeRuleId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGradingOutcomeRuleMutation() {
  const invalidate = useInvalidateGradingOutcomeRules();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (gradingOutcomeRuleId: string) =>
      apiClient.deleteGradingOutcomeRule(gradingOutcomeRuleId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


