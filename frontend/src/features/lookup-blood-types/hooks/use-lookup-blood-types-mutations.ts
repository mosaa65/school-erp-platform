"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupBloodTypePayload,
  type UpdateLookupBloodTypePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupBloodTypes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-blood-types", "list"],
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

export function useCreateLookupBloodTypeMutation() {
  const invalidate = useInvalidateLookupBloodTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupBloodTypePayload) =>
      apiClient.createLookupBloodType(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupBloodTypeMutation() {
  const invalidate = useInvalidateLookupBloodTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupBloodTypeId: number;
      payload: UpdateLookupBloodTypePayload;
    }) =>
      apiClient.updateLookupBloodType(
        params.lookupBloodTypeId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupBloodTypeMutation() {
  const invalidate = useInvalidateLookupBloodTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupBloodTypeId: number) =>
      apiClient.deleteLookupBloodType(lookupBloodTypeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


