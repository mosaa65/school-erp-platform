"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateCurrencyExchangeRatePayload,
  type UpdateCurrencyExchangeRatePayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateExchangeRates() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["currency-exchange-rates", "list"],
    });
  };
}

export function useCreateCurrencyExchangeRateMutation() {
  const invalidate = useInvalidateExchangeRates();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateCurrencyExchangeRatePayload) =>
      apiClient.createCurrencyExchangeRate(payload),
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

export function useUpdateCurrencyExchangeRateMutation() {
  const invalidate = useInvalidateExchangeRates();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: {
      rateId: number;
      payload: UpdateCurrencyExchangeRatePayload;
    }) => apiClient.updateCurrencyExchangeRate(String(params.rateId), params.payload),
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

export function useDeleteCurrencyExchangeRateMutation() {
  const invalidate = useInvalidateExchangeRates();
  const auth = useAuth();

  return useMutation({
    mutationFn: (rateId: number) => apiClient.deleteCurrencyExchangeRate(String(rateId)),
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
