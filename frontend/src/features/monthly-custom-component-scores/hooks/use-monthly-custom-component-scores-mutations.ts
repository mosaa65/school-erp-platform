"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateMonthlyCustomComponentScorePayload,
  type UpdateMonthlyCustomComponentScorePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateMonthlyCustomComponentScores() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["monthly-custom-component-scores", "list"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["monthly-grades", "list"],
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

export function useCreateMonthlyCustomComponentScoreMutation() {
  const invalidate = useInvalidateMonthlyCustomComponentScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateMonthlyCustomComponentScorePayload) =>
      apiClient.createMonthlyCustomComponentScore(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateMonthlyCustomComponentScoreMutation() {
  const invalidate = useInvalidateMonthlyCustomComponentScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      monthlyCustomComponentScoreId: string;
      payload: UpdateMonthlyCustomComponentScorePayload;
    }) =>
      apiClient.updateMonthlyCustomComponentScore(
        params.monthlyCustomComponentScoreId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteMonthlyCustomComponentScoreMutation() {
  const invalidate = useInvalidateMonthlyCustomComponentScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (monthlyCustomComponentScoreId: string) =>
      apiClient.deleteMonthlyCustomComponentScore(monthlyCustomComponentScoreId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


