"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupAbilityLevelPayload,
  type UpdateLookupAbilityLevelPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupAbilityLevels() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-ability-levels", "list"],
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

export function useCreateLookupAbilityLevelMutation() {
  const invalidate = useInvalidateLookupAbilityLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupAbilityLevelPayload) =>
      apiClient.createLookupAbilityLevel(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupAbilityLevelMutation() {
  const invalidate = useInvalidateLookupAbilityLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupAbilityLevelId: number;
      payload: UpdateLookupAbilityLevelPayload;
    }) =>
      apiClient.updateLookupAbilityLevel(params.lookupAbilityLevelId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupAbilityLevelMutation() {
  const invalidate = useInvalidateLookupAbilityLevels();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupAbilityLevelId: number) =>
      apiClient.deleteLookupAbilityLevel(lookupAbilityLevelId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


