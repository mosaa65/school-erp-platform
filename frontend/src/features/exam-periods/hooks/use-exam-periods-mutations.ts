"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateExamPeriodPayload,
  type UpdateExamPeriodPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateExamPeriods() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["exam-periods", "list"],
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

export function useCreateExamPeriodMutation() {
  const invalidate = useInvalidateExamPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateExamPeriodPayload) => apiClient.createExamPeriod(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateExamPeriodMutation() {
  const invalidate = useInvalidateExamPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { examPeriodId: string; payload: UpdateExamPeriodPayload }) =>
      apiClient.updateExamPeriod(params.examPeriodId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteExamPeriodMutation() {
  const invalidate = useInvalidateExamPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (examPeriodId: string) => apiClient.deleteExamPeriod(examPeriodId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


