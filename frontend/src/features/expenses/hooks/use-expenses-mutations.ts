"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { financeRequest } from "@/features/finance/shared/finance-request";

function useInvalidateExpenses() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", "list"] });
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

export function useApproveExpenseMutation() {
  const invalidate = useInvalidateExpenses();
  const handleAuthFailure = useHandleAuthFailure();

  return useMutation({
    mutationFn: (expenseId: number) =>
      financeRequest(`/finance/expenses/${expenseId}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      invalidate();
    },
    onError: handleAuthFailure,
  });
}
