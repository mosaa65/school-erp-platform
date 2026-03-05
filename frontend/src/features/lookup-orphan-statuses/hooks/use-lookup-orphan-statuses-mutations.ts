"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupOrphanStatusPayload,
  type UpdateLookupOrphanStatusPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupOrphanStatuses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-orphan-statuses", "list"],
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

export function useCreateLookupOrphanStatusMutation() {
  const invalidate = useInvalidateLookupOrphanStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupOrphanStatusPayload) =>
      apiClient.createLookupOrphanStatus(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupOrphanStatusMutation() {
  const invalidate = useInvalidateLookupOrphanStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      lookupOrphanStatusId: number;
      payload: UpdateLookupOrphanStatusPayload;
    }) =>
      apiClient.updateLookupOrphanStatus(params.lookupOrphanStatusId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupOrphanStatusMutation() {
  const invalidate = useInvalidateLookupOrphanStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupOrphanStatusId: number) =>
      apiClient.deleteLookupOrphanStatus(lookupOrphanStatusId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


