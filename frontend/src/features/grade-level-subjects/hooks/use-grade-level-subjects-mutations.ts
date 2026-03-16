"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGradeLevelSubjectPayload,
  type UpdateGradeLevelSubjectPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGradeLevelSubjects() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["grade-level-subjects", "list"],
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

export function useCreateGradeLevelSubjectMutation() {
  const invalidate = useInvalidateGradeLevelSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGradeLevelSubjectPayload) =>
      apiClient.createGradeLevelSubject(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGradeLevelSubjectMutation() {
  const invalidate = useInvalidateGradeLevelSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      mappingId: string;
      payload: UpdateGradeLevelSubjectPayload;
    }) => apiClient.updateGradeLevelSubject(params.mappingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGradeLevelSubjectMutation() {
  const invalidate = useInvalidateGradeLevelSubjects();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (mappingId: string) => apiClient.deleteGradeLevelSubject(mappingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


