"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CalculateSemesterGradesPayload,
  type CreateSemesterGradePayload,
  type FillSemesterFinalExamScoresPayload,
  type UpdateSemesterGradePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateSemesterGrades() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["semester-grades", "list"],
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

export function useCreateSemesterGradeMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSemesterGradePayload) =>
      apiClient.createSemesterGrade(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useCalculateSemesterGradesMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CalculateSemesterGradesPayload) =>
      apiClient.calculateSemesterGrades(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useFillSemesterFinalExamScoresMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: FillSemesterFinalExamScoresPayload) =>
      apiClient.fillSemesterFinalExamScores(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateSemesterGradeMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { semesterGradeId: string; payload: UpdateSemesterGradePayload }) =>
      apiClient.updateSemesterGrade(params.semesterGradeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useLockSemesterGradeMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (semesterGradeId: string) => apiClient.lockSemesterGrade(semesterGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUnlockSemesterGradeMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (semesterGradeId: string) => apiClient.unlockSemesterGrade(semesterGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteSemesterGradeMutation() {
  const invalidate = useInvalidateSemesterGrades();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (semesterGradeId: string) => apiClient.deleteSemesterGrade(semesterGradeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


