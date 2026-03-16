"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateStudentProblemPayload,
  type UpdateStudentProblemPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateStudentProblems() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["student-problems", "list"],
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

export function useCreateStudentProblemMutation() {
  const invalidate = useInvalidateStudentProblems();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateStudentProblemPayload) =>
      apiClient.createStudentProblem(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateStudentProblemMutation() {
  const invalidate = useInvalidateStudentProblems();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { problemId: string; payload: UpdateStudentProblemPayload }) =>
      apiClient.updateStudentProblem(params.problemId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteStudentProblemMutation() {
  const invalidate = useInvalidateStudentProblems();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (problemId: string) => apiClient.deleteStudentProblem(problemId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
