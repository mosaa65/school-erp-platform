"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateAcademicMonthPayload,
  type UpdateAcademicMonthPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAcademicMonths() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["academic-months", "list"],
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

export function useCreateAcademicMonthMutation() {
  const invalidate = useInvalidateAcademicMonths();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAcademicMonthPayload) => apiClient.createAcademicMonth(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAcademicMonthMutation() {
  const invalidate = useInvalidateAcademicMonths();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: { academicMonthId: string; payload: UpdateAcademicMonthPayload }) =>
      apiClient.updateAcademicMonth(params.academicMonthId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAcademicMonthMutation() {
  const invalidate = useInvalidateAcademicMonths();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (academicMonthId: string) => apiClient.deleteAcademicMonth(academicMonthId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


