"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateExamAssessmentPayload,
  type UpdateExamAssessmentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateExamAssessments() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["exam-assessments", "list"],
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

export function useCreateExamAssessmentMutation() {
  const invalidate = useInvalidateExamAssessments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateExamAssessmentPayload) =>
      apiClient.createExamAssessment(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateExamAssessmentMutation() {
  const invalidate = useInvalidateExamAssessments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      examAssessmentId: string;
      payload: UpdateExamAssessmentPayload;
    }) => apiClient.updateExamAssessment(params.examAssessmentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteExamAssessmentMutation() {
  const invalidate = useInvalidateExamAssessments();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (examAssessmentId: string) =>
      apiClient.deleteExamAssessment(examAssessmentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


