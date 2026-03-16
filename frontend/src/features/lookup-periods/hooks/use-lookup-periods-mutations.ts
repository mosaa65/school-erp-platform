"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateLookupPeriodPayload,
  type UpdateLookupPeriodPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateLookupPeriods() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["lookup-periods", "list"],
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

export function useCreateLookupPeriodMutation() {
  const invalidate = useInvalidateLookupPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateLookupPeriodPayload) => apiClient.createLookupPeriod(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateLookupPeriodMutation() {
  const invalidate = useInvalidateLookupPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { lookupPeriodId: number; payload: UpdateLookupPeriodPayload }) =>
      apiClient.updateLookupPeriod(params.lookupPeriodId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteLookupPeriodMutation() {
  const invalidate = useInvalidateLookupPeriods();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (lookupPeriodId: number) => apiClient.deleteLookupPeriod(lookupPeriodId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


