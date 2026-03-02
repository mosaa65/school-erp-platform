"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateTermSubjectOfferingPayload,
  type UpdateTermSubjectOfferingPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateTermSubjectOfferings() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["term-subject-offerings", "list"],
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

export function useCreateTermSubjectOfferingMutation() {
  const invalidate = useInvalidateTermSubjectOfferings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateTermSubjectOfferingPayload) =>
      apiClient.createTermSubjectOffering(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateTermSubjectOfferingMutation() {
  const invalidate = useInvalidateTermSubjectOfferings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      offeringId: string;
      payload: UpdateTermSubjectOfferingPayload;
    }) => apiClient.updateTermSubjectOffering(params.offeringId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteTermSubjectOfferingMutation() {
  const invalidate = useInvalidateTermSubjectOfferings();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (offeringId: string) => apiClient.deleteTermSubjectOffering(offeringId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


