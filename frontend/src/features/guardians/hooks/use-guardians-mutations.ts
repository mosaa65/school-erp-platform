"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateGuardianPayload,
  type UpdateGuardianPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateGuardians() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["guardians", "list"],
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

export function useCreateGuardianMutation() {
  const invalidate = useInvalidateGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateGuardianPayload) => apiClient.createGuardian(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateGuardianMutation() {
  const invalidate = useInvalidateGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { guardianId: string; payload: UpdateGuardianPayload }) =>
      apiClient.updateGuardian(params.guardianId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteGuardianMutation() {
  const invalidate = useInvalidateGuardians();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (guardianId: string) => apiClient.deleteGuardian(guardianId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


