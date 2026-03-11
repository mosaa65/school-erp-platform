"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGradingPolicyPayload,
  type UpdateGradingPolicyPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGradingPolicies() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["grading-policies", "list"],
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

export function useCreateGradingPolicyMutation() {
  const invalidate = useInvalidateGradingPolicies();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGradingPolicyPayload) => apiClient.createGradingPolicy(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGradingPolicyMutation() {
  const invalidate = useInvalidateGradingPolicies();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { gradingPolicyId: string; payload: UpdateGradingPolicyPayload }) =>
      apiClient.updateGradingPolicy(params.gradingPolicyId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGradingPolicyMutation() {
  const invalidate = useInvalidateGradingPolicies();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (gradingPolicyId: string) => apiClient.deleteGradingPolicy(gradingPolicyId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


