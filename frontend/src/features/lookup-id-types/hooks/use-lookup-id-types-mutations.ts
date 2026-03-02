"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupIdTypePayload,
  type UpdateLookupIdTypePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupIdTypes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-id-types", "list"],
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

export function useCreateLookupIdTypeMutation() {
  const invalidate = useInvalidateLookupIdTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupIdTypePayload) =>
      apiClient.createLookupIdType(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupIdTypeMutation() {
  const invalidate = useInvalidateLookupIdTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupIdTypeId: number;
      payload: UpdateLookupIdTypePayload;
    }) =>
      apiClient.updateLookupIdType(params.lookupIdTypeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupIdTypeMutation() {
  const invalidate = useInvalidateLookupIdTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupIdTypeId: number) =>
      apiClient.deleteLookupIdType(lookupIdTypeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


