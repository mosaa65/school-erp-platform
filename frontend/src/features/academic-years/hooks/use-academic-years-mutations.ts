"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateAcademicYearPayload,
  type UpdateAcademicYearPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateAcademicYears() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["academic-years", "list"],
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

export function useCreateAcademicYearMutation() {
  const invalidate = useInvalidateAcademicYears();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (payload: CreateAcademicYearPayload) =>
      apiClient.createAcademicYear(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useUpdateAcademicYearMutation() {
  const invalidate = useInvalidateAcademicYears();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (params: {
      academicYearId: string;
      payload: UpdateAcademicYearPayload;
    }) => apiClient.updateAcademicYear(params.academicYearId, params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}

export function useDeleteAcademicYearMutation() {
  const invalidate = useInvalidateAcademicYears();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (academicYearId: string) => apiClient.deleteAcademicYear(academicYearId),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}


