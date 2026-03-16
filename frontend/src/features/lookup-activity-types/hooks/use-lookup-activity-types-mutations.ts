"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupActivityTypePayload,
  type UpdateLookupActivityTypePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupActivityTypes() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-activity-types", "list"],
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

export function useCreateLookupActivityTypeMutation() {
  const invalidate = useInvalidateLookupActivityTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupActivityTypePayload) =>
      apiClient.createLookupActivityType(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupActivityTypeMutation() {
  const invalidate = useInvalidateLookupActivityTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupActivityTypeId: number;
      payload: UpdateLookupActivityTypePayload;
    }) =>
      apiClient.updateLookupActivityType(params.lookupActivityTypeId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupActivityTypeMutation() {
  const invalidate = useInvalidateLookupActivityTypes();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupActivityTypeId: number) =>
      apiClient.deleteLookupActivityType(lookupActivityTypeId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


