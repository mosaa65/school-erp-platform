"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateFiscalPeriodPayload,
  type UpdateFiscalPeriodPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateFiscalPeriods() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["fiscal-periods", "list"],
    });
  };
}

export function useCreateFiscalPeriodMutation() {
  const invalidate = useInvalidateFiscalPeriods();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateFiscalPeriodPayload) => apiClient.createFiscalPeriod(payload),
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

export function useUpdateFiscalPeriodMutation() {
  const invalidate = useInvalidateFiscalPeriods();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { fiscalPeriodId: number; payload: UpdateFiscalPeriodPayload }) =>
      apiClient.updateFiscalPeriod(String(params.fiscalPeriodId), params.payload),
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

export function useDeleteFiscalPeriodMutation() {
  const invalidate = useInvalidateFiscalPeriods();
  const auth = useAuth();

  return useMutation({
    mutationFn: (fiscalPeriodId: number) =>
      apiClient.deleteFiscalPeriod(String(fiscalPeriodId)),
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
