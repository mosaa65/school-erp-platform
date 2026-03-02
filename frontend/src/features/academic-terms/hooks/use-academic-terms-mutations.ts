"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateAcademicTermPayload,
  type UpdateAcademicTermPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAcademicTerms() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["academic-terms", "list"],
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

export function useCreateAcademicTermMutation() {
  const invalidate = useInvalidateAcademicTerms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAcademicTermPayload) =>
      apiClient.createAcademicTerm(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAcademicTermMutation() {
  const invalidate = useInvalidateAcademicTerms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      academicTermId: string;
      payload: UpdateAcademicTermPayload;
    }) => apiClient.updateAcademicTerm(params.academicTermId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAcademicTermMutation() {
  const invalidate = useInvalidateAcademicTerms();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (academicTermId: string) => apiClient.deleteAcademicTerm(academicTermId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


