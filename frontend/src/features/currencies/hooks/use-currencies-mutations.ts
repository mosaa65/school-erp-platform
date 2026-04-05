"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateCurrencyPayload,
  type UpdateCurrencyPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateCurrencies() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["currencies", "list"],
    });
  };
}

export function useCreateCurrencyMutation() {
  const invalidate = useInvalidateCurrencies();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateCurrencyPayload) => apiClient.createCurrency(payload),
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

export function useUpdateCurrencyMutation() {
  const invalidate = useInvalidateCurrencies();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { currencyId: number; payload: UpdateCurrencyPayload }) =>
      apiClient.updateCurrency(String(params.currencyId), params.payload),
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

export function useDeleteCurrencyMutation() {
  const invalidate = useInvalidateCurrencies();
  const auth = useAuth();

  return useMutation({
    mutationFn: (currencyId: number) => apiClient.deleteCurrency(String(currencyId)),
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
