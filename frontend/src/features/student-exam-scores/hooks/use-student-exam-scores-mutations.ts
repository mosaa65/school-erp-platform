"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentExamScorePayload,
  type UpdateStudentExamScorePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentExamScores() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-exam-scores", "list"],
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

export function useCreateStudentExamScoreMutation() {
  const invalidate = useInvalidateStudentExamScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentExamScorePayload) =>
      apiClient.createStudentExamScore(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentExamScoreMutation() {
  const invalidate = useInvalidateStudentExamScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      studentExamScoreId: string;
      payload: UpdateStudentExamScorePayload;
    }) => apiClient.updateStudentExamScore(params.studentExamScoreId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentExamScoreMutation() {
  const invalidate = useInvalidateStudentExamScores();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (studentExamScoreId: string) =>
      apiClient.deleteStudentExamScore(studentExamScoreId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


