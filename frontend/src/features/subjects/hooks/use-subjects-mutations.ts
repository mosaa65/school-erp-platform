"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateSubjectPayload,
  type UpdateSubjectPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateSubjects() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["subjects", "list"],
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

export function useCreateSubjectMutation() {
  const invalidate = useInvalidateSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSubjectPayload) => apiClient.createSubject(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateSubjectMutation() {
  const invalidate = useInvalidateSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { subjectId: string; payload: UpdateSubjectPayload }) =>
      apiClient.updateSubject(params.subjectId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteSubjectMutation() {
  const invalidate = useInvalidateSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (subjectId: string) => apiClient.deleteSubject(subjectId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


