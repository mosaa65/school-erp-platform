"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateEmployeeTalentPayload,
  type UpdateEmployeeTalentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateEmployeeTalents() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["employee-talents", "list"],
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

export function useCreateEmployeeTalentMutation() {
  const invalidate = useInvalidateEmployeeTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateEmployeeTalentPayload) =>
      apiClient.createEmployeeTalent(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateEmployeeTalentMutation() {
  const invalidate = useInvalidateEmployeeTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { mappingId: string; payload: UpdateEmployeeTalentPayload }) =>
      apiClient.updateEmployeeTalent(params.mappingId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteEmployeeTalentMutation() {
  const invalidate = useInvalidateEmployeeTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (mappingId: string) => apiClient.deleteEmployeeTalent(mappingId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


