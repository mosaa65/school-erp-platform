"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateSectionPayload,
  type UpdateSectionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateSections() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["sections", "list"],
    });
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

export function useCreateSectionMutation() {
  const invalidate = useInvalidateSections();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateSectionPayload) => apiClient.createSection(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateSectionMutation() {
  const invalidate = useInvalidateSections();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { sectionId: string; payload: UpdateSectionPayload }) =>
      apiClient.updateSection(params.sectionId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteSectionMutation() {
  const invalidate = useInvalidateSections();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (sectionId: string) => apiClient.deleteSection(sectionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


