"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateAnnualGradePayload,
  type UpdateAnnualGradePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAnnualGrades() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["annual-grades", "list"],
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

export function useCreateAnnualGradeMutation() {
  const invalidate = useInvalidateAnnualGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAnnualGradePayload) => apiClient.createAnnualGrade(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAnnualGradeMutation() {
  const invalidate = useInvalidateAnnualGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { annualGradeId: string; payload: UpdateAnnualGradePayload }) =>
      apiClient.updateAnnualGrade(params.annualGradeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useLockAnnualGradeMutation() {
  const invalidate = useInvalidateAnnualGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualGradeId: string) => apiClient.lockAnnualGrade(annualGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUnlockAnnualGradeMutation() {
  const invalidate = useInvalidateAnnualGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualGradeId: string) => apiClient.unlockAnnualGrade(annualGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAnnualGradeMutation() {
  const invalidate = useInvalidateAnnualGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualGradeId: string) => apiClient.deleteAnnualGrade(annualGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


