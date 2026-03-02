"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupOwnershipTypePayload,
  type UpdateLookupOwnershipTypePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupOwnershipTypes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-ownership-types", "list"],
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

export function useCreateLookupOwnershipTypeMutation() {
  const invalidate = useInvalidateLookupOwnershipTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupOwnershipTypePayload) =>
      apiClient.createLookupOwnershipType(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupOwnershipTypeMutation() {
  const invalidate = useInvalidateLookupOwnershipTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupOwnershipTypeId: number;
      payload: UpdateLookupOwnershipTypePayload;
    }) =>
      apiClient.updateLookupOwnershipType(
        params.lookupOwnershipTypeId,
        params.payload,
      ),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupOwnershipTypeMutation() {
  const invalidate = useInvalidateLookupOwnershipTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupOwnershipTypeId: number) =>
      apiClient.deleteLookupOwnershipType(lookupOwnershipTypeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


