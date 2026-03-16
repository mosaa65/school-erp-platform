"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CalculateMonthlyGradesPayload,
  type CreateMonthlyGradePayload,
  type UpdateMonthlyGradePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateMonthlyGrades() {
  const queryClient = useQueryClient();

  return () => {
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

export function useCreateMonthlyGradeMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateMonthlyGradePayload) => apiClient.createMonthlyGrade(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCalculateMonthlyGradesMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CalculateMonthlyGradesPayload) =>
      apiClient.calculateMonthlyGrades(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateMonthlyGradeMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { monthlyGradeId: string; payload: UpdateMonthlyGradePayload }) =>
      apiClient.updateMonthlyGrade(params.monthlyGradeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useLockMonthlyGradeMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (monthlyGradeId: string) => apiClient.lockMonthlyGrade(monthlyGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUnlockMonthlyGradeMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (monthlyGradeId: string) => apiClient.unlockMonthlyGrade(monthlyGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteMonthlyGradeMutation() {
  const invalidate = useInvalidateMonthlyGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (monthlyGradeId: string) => apiClient.deleteMonthlyGrade(monthlyGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


