"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupGradeDescriptionPayload,
  type UpdateLookupGradeDescriptionPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupGradeDescriptions() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-grade-descriptions", "list"],
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

export function useCreateLookupGradeDescriptionMutation() {
  const invalidate = useInvalidateLookupGradeDescriptions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupGradeDescriptionPayload) =>
      apiClient.createLookupGradeDescription(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupGradeDescriptionMutation() {
  const invalidate = useInvalidateLookupGradeDescriptions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupGradeDescriptionId: number;
      payload: UpdateLookupGradeDescriptionPayload;
    }) =>
      apiClient.updateLookupGradeDescription(
        params.lookupGradeDescriptionId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupGradeDescriptionMutation() {
  const invalidate = useInvalidateLookupGradeDescriptions();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupGradeDescriptionId: number) =>
      apiClient.deleteLookupGradeDescription(lookupGradeDescriptionId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
