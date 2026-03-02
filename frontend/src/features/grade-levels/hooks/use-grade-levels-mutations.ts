"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGradeLevelPayload,
  type UpdateGradeLevelPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGradeLevels() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["grade-levels", "list"],
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

export function useCreateGradeLevelMutation() {
  const invalidate = useInvalidateGradeLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGradeLevelPayload) =>
      apiClient.createGradeLevel(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGradeLevelMutation() {
  const invalidate = useInvalidateGradeLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      gradeLevelId: string;
      payload: UpdateGradeLevelPayload;
    }) => apiClient.updateGradeLevel(params.gradeLevelId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGradeLevelMutation() {
  const invalidate = useInvalidateGradeLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (gradeLevelId: string) => apiClient.deleteGradeLevel(gradeLevelId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


