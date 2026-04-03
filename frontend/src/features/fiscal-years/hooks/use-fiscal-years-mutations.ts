"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateFiscalYearPayload,
  type UpdateFiscalYearPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateFiscalYears() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["fiscal-years", "list"],
    });
  };
}

export function useCreateFiscalYearMutation() {
  const invalidate = useInvalidateFiscalYears();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateFiscalYearPayload) => apiClient.createFiscalYear(payload),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useUpdateFiscalYearMutation() {
  const invalidate = useInvalidateFiscalYears();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { fiscalYearId: number; payload: UpdateFiscalYearPayload }) =>
      apiClient.updateFiscalYear(String(params.fiscalYearId), params.payload),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}

export function useDeleteFiscalYearMutation() {
  const invalidate = useInvalidateFiscalYears();
  const auth = useAuth();

  return useMutation({
    mutationFn: (fiscalYearId: number) => apiClient.deleteFiscalYear(String(fiscalYearId)),
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
  });
}
