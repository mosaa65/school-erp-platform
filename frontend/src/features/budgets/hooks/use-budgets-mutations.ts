"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth/providers/auth-provider";

function useInvalidateBudgets() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["budgets", "list"] });
  };
}

export function useApproveBudgetMutation() {
  const invalidate = useInvalidateBudgets();
  const auth = useAuth();

  return useMutation({
    mutationFn: (budgetId: number) => apiClient.approveBudget(budgetId),
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
