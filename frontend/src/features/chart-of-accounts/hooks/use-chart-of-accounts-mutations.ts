"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  apiClient,
  type CreateChartOfAccountPayload,
  type UpdateChartOfAccountPayload,
} from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateChartOfAccounts() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["chart-of-accounts", "list"],
    });
  };
}

export function useCreateChartOfAccountMutation() {
  const invalidate = useInvalidateChartOfAccounts();
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: CreateChartOfAccountPayload) => apiClient.createChartOfAccount(payload),
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

export function useUpdateChartOfAccountMutation() {
  const invalidate = useInvalidateChartOfAccounts();
  const auth = useAuth();

  return useMutation({
    mutationFn: (params: { accountId: number; payload: UpdateChartOfAccountPayload }) =>
      apiClient.updateChartOfAccount(String(params.accountId), params.payload),
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

export function useDeleteChartOfAccountMutation() {
  const invalidate = useInvalidateChartOfAccounts();
  const auth = useAuth();

  return useMutation({
    mutationFn: (accountId: number) => apiClient.deleteChartOfAccount(String(accountId)),
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
