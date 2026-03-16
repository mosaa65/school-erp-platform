"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateAnnualStatusPayload,
  type UpdateAnnualStatusPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAnnualStatuses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["annual-statuses", "list"],
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

export function useCreateAnnualStatusMutation() {
  const invalidate = useInvalidateAnnualStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAnnualStatusPayload) => apiClient.createAnnualStatus(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAnnualStatusMutation() {
  const invalidate = useInvalidateAnnualStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { annualStatusId: string; payload: UpdateAnnualStatusPayload }) =>
      apiClient.updateAnnualStatus(params.annualStatusId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAnnualStatusMutation() {
  const invalidate = useInvalidateAnnualStatuses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (annualStatusId: string) => apiClient.deleteAnnualStatus(annualStatusId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


