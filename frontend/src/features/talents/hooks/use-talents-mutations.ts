"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateTalentPayload,
  type UpdateTalentPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateTalents() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["talents", "list"],
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

export function useCreateTalentMutation() {
  const invalidate = useInvalidateTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateTalentPayload) => apiClient.createTalent(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateTalentMutation() {
  const invalidate = useInvalidateTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { talentId: string; payload: UpdateTalentPayload }) =>
      apiClient.updateTalent(params.talentId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteTalentMutation() {
  const invalidate = useInvalidateTalents();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (talentId: string) => apiClient.deleteTalent(talentId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


