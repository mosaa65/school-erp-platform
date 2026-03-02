"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeePerformanceEvaluationPayload,
  type UpdateEmployeePerformanceEvaluationPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeePerformanceEvaluations() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-performance-evaluations", "list"],
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

export function useCreateEmployeePerformanceEvaluationMutation() {
  const invalidate = useInvalidateEmployeePerformanceEvaluations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeePerformanceEvaluationPayload) =>
      apiClient.createEmployeePerformanceEvaluation(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeePerformanceEvaluationMutation() {
  const invalidate = useInvalidateEmployeePerformanceEvaluations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      evaluationId: string;
      payload: UpdateEmployeePerformanceEvaluationPayload;
    }) =>
      apiClient.updateEmployeePerformanceEvaluation(
        params.evaluationId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeePerformanceEvaluationMutation() {
  const invalidate = useInvalidateEmployeePerformanceEvaluations();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (evaluationId: string) =>
      apiClient.deleteEmployeePerformanceEvaluation(evaluationId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


