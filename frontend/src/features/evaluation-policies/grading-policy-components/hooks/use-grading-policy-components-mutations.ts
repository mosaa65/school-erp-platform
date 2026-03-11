"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGradingPolicyComponentPayload,
  type UpdateGradingPolicyComponentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGradingPolicyComponents() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["grading-policy-components"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["grading-policies"],
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

export function useCreateGradingPolicyComponentMutation() {
  const invalidate = useInvalidateGradingPolicyComponents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGradingPolicyComponentPayload) =>
      apiClient.createGradingPolicyComponent(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGradingPolicyComponentMutation() {
  const invalidate = useInvalidateGradingPolicyComponents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      gradingPolicyComponentId: string;
      payload: UpdateGradingPolicyComponentPayload;
    }) =>
      apiClient.updateGradingPolicyComponent(
        params.gradingPolicyComponentId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGradingPolicyComponentMutation() {
  const invalidate = useInvalidateGradingPolicyComponents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (gradingPolicyComponentId: string) =>
      apiClient.deleteGradingPolicyComponent(gradingPolicyComponentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
